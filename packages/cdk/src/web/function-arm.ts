import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type {
  ArmFunctionProps,
  TriggerConfig,
  HttpTriggerConfig,
  TimerTriggerConfig,
} from './function-app-types';

/**
 * L1 construct for individual Azure Function.
 *
 * @remarks
 * Direct mapping to Microsoft.Web/sites/functions ARM sub-resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Web/sites/functions`
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: ResourceGroup (nested under Function App)
 *
 * This is a low-level construct for maximum control. Individual functions are typically
 * auto-discovered in the L2 pattern, but this construct allows manual function definition.
 *
 * @example
 * Basic HTTP trigger function:
 * ```typescript
 * import { ArmFunction, AuthLevel, HttpMethod } from '@atakora/cdk/web';
 *
 * const httpFunction = new ArmFunction(functionApp, 'HttpApi', {
 *   functionName: 'HttpTrigger1',
 *   trigger: {
 *     type: 'http',
 *     route: 'api/users/{userId}',
 *     methods: [HttpMethod.GET, HttpMethod.POST],
 *     authLevel: AuthLevel.FUNCTION
 *   },
 *   inlineCode: 'base64EncodedCode...'
 * });
 * ```
 *
 * @example
 * Timer trigger function:
 * ```typescript
 * const timerFunction = new ArmFunction(functionApp, 'TimerJob', {
 *   functionName: 'TimerTrigger1',
 *   trigger: {
 *     type: 'timer',
 *     schedule: '0 *\/5 * * * *', // Every 5 minutes
 *     runOnStartup: false
 *   },
 *   packageUri: 'https://storage.blob.core.windows.net/...'
 * });
 * ```
 */
export class ArmFunction extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Web/sites/functions';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-01-01';

  /**
   * Deployment scope for Functions.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the function.
   */
  public readonly functionName: string;

  /**
   * Resource name (same as functionName).
   */
  public readonly name: string;

  /**
   * Trigger configuration.
   */
  public readonly trigger: TriggerConfig;

  /**
   * Inline function code (Base64-encoded).
   */
  public readonly inlineCode?: string;

  /**
   * Package URI for external deployment.
   */
  public readonly packageUri?: string;

  /**
   * Custom function.json configuration.
   */
  public readonly config?: Record<string, any>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{siteName}/functions/{functionName}`
   */
  public readonly resourceId: string;

  /**
   * Function resource ID (alias for resourceId).
   */
  public readonly functionId: string;

  /**
   * Trigger URL for HTTP triggers.
   */
  public readonly triggerUrl?: string;

  /**
   * Creates a new ArmFunction construct.
   *
   * @param scope - Parent construct (typically an ArmFunctionApp)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Function properties
   *
   * @throws {Error} If functionName is invalid
   * @throws {Error} If neither inlineCode nor packageUri is provided
   * @throws {Error} If both inlineCode and packageUri are provided
   */
  constructor(scope: Construct, id: string, props: ArmFunctionProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.functionName = props.functionName;
    this.name = props.functionName;
    this.trigger = props.trigger;
    this.inlineCode = props.inlineCode;
    this.packageUri = props.packageUri;
    this.config = props.config;

    // Construct resource ID (will be completed during synthesis with actual site name)
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{siteName}/functions/${this.functionName}`;
    this.functionId = this.resourceId;

    // Generate trigger URL for HTTP triggers
    if (this.trigger.type === 'http') {
      const httpTrigger = this.trigger as HttpTriggerConfig;
      const route = httpTrigger.route || this.functionName;
      this.triggerUrl = `https://{siteName}.azurewebsites.net/${route}`;
    }
  }

  /**
   * Validates Function properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  protected validateProps(props: ArmFunctionProps): void {
    // Validate function name
    if (!props.functionName || props.functionName.trim() === '') {
      throw new Error('Function name cannot be empty');
    }

    // Validate name pattern: alphanumeric and hyphens, underscores
    const namePattern = /^[a-zA-Z0-9_-]+$/;
    if (!namePattern.test(props.functionName)) {
      throw new Error(
        `Function name must contain only alphanumeric characters, hyphens, and underscores (got: ${props.functionName})`
      );
    }

    // Validate deployment method (must have either inline code or package URI, but not both)
    const hasInlineCode = props.inlineCode && props.inlineCode.trim() !== '';
    const hasPackageUri = props.packageUri && props.packageUri.trim() !== '';

    if (!hasInlineCode && !hasPackageUri) {
      throw new Error('Function must have either inlineCode or packageUri');
    }

    if (hasInlineCode && hasPackageUri) {
      throw new Error('Function cannot have both inlineCode and packageUri');
    }

    // Validate inline code size (ARM template property limit is 4KB)
    if (hasInlineCode && props.inlineCode!.length > 4096) {
      throw new Error(
        `Inline code must be less than 4KB (got ${props.inlineCode!.length} bytes). Use packageUri for larger functions.`
      );
    }
  }

  /**
   * Builds function.json configuration from trigger configuration.
   *
   * @remarks
   * Converts the TypeScript trigger configuration to the Azure Functions function.json format.
   *
   * @returns function.json configuration object
   */
  protected buildFunctionConfig(): Record<string, any> {
    // Use custom config if provided
    if (this.config) {
      return this.config;
    }

    // Build bindings array
    const bindings: any[] = [];

    // Add trigger binding based on type
    if (this.trigger.type === 'http') {
      const httpTrigger = this.trigger as HttpTriggerConfig;
      bindings.push({
        type: 'httpTrigger',
        direction: 'in',
        name: 'req',
        authLevel: httpTrigger.authLevel || 'function',
        methods: httpTrigger.methods || ['GET', 'POST'],
        route: httpTrigger.route,
        webHookType: httpTrigger.webHookType,
      });

      // Add HTTP output binding
      bindings.push({
        type: 'http',
        direction: 'out',
        name: '$return',
      });
    } else if (this.trigger.type === 'timer') {
      const timerTrigger = this.trigger as TimerTriggerConfig;
      bindings.push({
        type: 'timerTrigger',
        direction: 'in',
        name: 'timer',
        schedule: timerTrigger.schedule,
        runOnStartup: timerTrigger.runOnStartup ?? false,
        useMonitor: timerTrigger.useMonitor ?? true,
      });
    }

    return {
      bindings,
      disabled: false,
    };
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   * For Functions, this generates a nested resource under the Function App.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): ArmResource {
    const properties: any = {
      config: this.buildFunctionConfig(),
    };

    // Add deployment configuration
    if (this.inlineCode) {
      properties.files = {
        'index.js': this.inlineCode,
      };
    }

    if (this.packageUri) {
      properties.config.packageUri = this.packageUri;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.functionName,
      properties,
    };
  }
}
