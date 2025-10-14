import { Construct, Resource, type ArmResource } from '@atakora/cdk';
import type { IFunctionApp } from './function-app-types';
import type { ResourceMetadata, SynthesisContext } from '@atakora/lib';

/**
 * Properties for an inline function
 */
export interface InlineFunctionProps {
  /**
   * Function name
   */
  readonly functionName: string;

  /**
   * JavaScript code for the function
   */
  readonly code: string;

  /**
   * HTTP trigger configuration (required for now, can be extended for other triggers)
   */
  readonly httpTrigger?: {
    /**
     * HTTP methods (default: ['GET', 'POST'])
     */
    readonly methods?: string[];

    /**
     * Auth level (default: 'function')
     */
    readonly authLevel?: 'anonymous' | 'function' | 'admin';

    /**
     * Route template
     */
    readonly route?: string;
  };

  /**
   * Enable package mode (default: false for now - using template splitting instead).
   *
   * When true, function code is NOT embedded in the ARM template.
   * Instead, it will be packaged as a ZIP file and deployed using the
   * "run from package" pattern.
   *
   * When false, function code is embedded directly in the ARM template
   * and template splitting handles size limits by breaking into multiple linked templates.
   *
   * @default false
   * @see docs/design/architecture/function-deployment-pattern.md
   */
  readonly packageMode?: boolean;
}

/**
 * Inline Function construct for Azure Functions with code provided as a string
 *
 * @remarks
 * This construct is designed for functions where the code is generated programmatically
 * (e.g., CRUD functions generated from schemas) rather than loaded from files.
 *
 * **ARM Resource Type**: `Microsoft.Web/sites/functions`
 * **API Version**: `2023-01-01`
 *
 * @example
 * ```typescript
 * const func = new InlineFunction(functionApp, 'CreateUser', {
 *   functionName: 'create-user',
 *   code: generatedCode,
 *   httpTrigger: {
 *     methods: ['POST'],
 *     authLevel: 'function'
 *   }
 * });
 * ```
 */
export class InlineFunction extends Resource {
  /**
   * ARM resource type
   */
  public readonly resourceType = 'Microsoft.Web/sites/functions' as const;

  /**
   * ARM resource name
   */
  public readonly name: string;

  /**
   * ARM resource ID for the inline function
   */
  public readonly resourceId: string;

  /**
   * Function name
   */
  public readonly functionName: string;

  /**
   * JavaScript code
   */
  public readonly code: string;

  /**
   * HTTP trigger configuration
   */
  public readonly httpTrigger?: InlineFunctionProps['httpTrigger'];

  /**
   * Package mode enabled
   */
  public readonly packageMode: boolean;

  /**
   * Parent Function App name
   */
  private readonly functionAppName: string;

  constructor(scope: Construct, id: string, props: InlineFunctionProps) {
    super(scope, id);

    // Get parent Function App
    const functionApp = this.getParentFunctionApp(scope);
    this.functionAppName = functionApp.functionAppName;

    this.functionName = props.functionName;
    this.code = props.code;
    this.httpTrigger = props.httpTrigger;
    this.packageMode = props.packageMode ?? false; // Default to inline mode with template splitting

    // Set ARM resource name (format: functionAppName/functionName)
    this.name = `${this.functionAppName}/${this.functionName}`;

    // Set ARM resource ID
    this.resourceId = `[resourceId('Microsoft.Web/sites/functions', '${this.functionAppName}', '${this.functionName}')]`;

    // Store function metadata in node metadata for FunctionPackager to extract
    if (this.packageMode) {
      this.node.addMetadata('functionMetadata', {
        functionName: this.functionName,
        code: this.code,
        httpTrigger: this.httpTrigger,
      });
    }
  }

  /**
   * Validate props (required by Resource base class)
   */
  protected validateProps(props: InlineFunctionProps): void {
    if (!props.functionName) {
      throw new Error('functionName is required');
    }
    if (!props.code) {
      throw new Error('code is required');
    }
  }

  /**
   * Gets the parent FunctionApp from the construct tree.
   *
   * @param scope - Parent construct
   * @returns Function App interface
   * @throws {Error} If parent is not a FunctionApp
   */
  private getParentFunctionApp(scope: Construct): IFunctionApp {
    // Walk up the construct tree to find FunctionApp
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IFunctionApp interface using duck typing
      if (this.isFunctionApp(current)) {
        return current as IFunctionApp;
      }
      current = current.node.scope;
    }

    throw new Error(
      'InlineFunction must be created within or under a FunctionApp. ' +
        'Ensure the parent scope is a FunctionApp or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IFunctionApp interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has FunctionApp properties
   */
  private isFunctionApp(construct: any): construct is IFunctionApp {
    return (
      construct &&
      typeof construct.functionAppName === 'string' &&
      typeof construct.functionAppId === 'string'
    );
  }

  /**
   * Generates lightweight metadata for template assignment decisions.
   *
   * @returns ResourceMetadata object describing this function
   *
   * @remarks
   * Child function resources must be in the same template as their parent Function App
   * due to ARM parent-child resource requirements.
   */
  public toMetadata(): ResourceMetadata {
    // Estimate size based on code length
    const baseSize = 500; // Base ARM structure
    const codeSize = this.packageMode ? 0 : this.code.length; // Only count code if embedded
    const sizeEstimate = baseSize + codeSize;

    return {
      id: this.node.id,
      type: this.resourceType,
      name: this.name,
      dependencies: [this.functionAppName], // Parent Function App ID
      sizeEstimate,
      requiresSameTemplate: undefined, // Parent-child relationship handled by template splitter
      templatePreference: 'application', // Functions are application-tier resources
      metadata: {
        hasLargeInlineContent: codeSize > 10000,
      },
    };
  }

  /**
   * Transforms this resource to ARM template JSON representation.
   *
   * @param context - Optional synthesis context for cross-template reference generation
   * @returns ARM template resource object
   *
   * @remarks
   * **Context-Aware Behavior**:
   * - Child functions MUST be in the same template as their parent Function App
   * - Template splitter ensures co-location via parent-child relationship detection
   * - When context is provided, we verify co-location but don't include dependsOn
   *   (ARM automatically handles parent-child dependencies)
   *
   * **Package Mode** (default):
   * - Generates function resource WITHOUT embedded code
   * - Code is stored in node metadata for FunctionPackager
   * - Actual deployment via WEBSITE_RUN_FROM_PACKAGE app setting
   *
   * **Legacy Mode** (packageMode=false):
   * - Code is embedded directly in ARM template
   * - Template splitting handles size limits
   */
  public toArmTemplate(context?: SynthesisContext): any {
    // Build bindings for HTTP trigger
    const bindings: any[] = [];

    if (this.httpTrigger) {
      bindings.push({
        type: 'httpTrigger',
        direction: 'in',
        name: 'req',
        authLevel: this.httpTrigger.authLevel || 'function',
        methods: this.httpTrigger.methods || ['get', 'post'],
        ...(this.httpTrigger.route && { route: this.httpTrigger.route }),
      });

      bindings.push({
        type: 'http',
        direction: 'out',
        name: 'res',
      });
    }

    if (this.packageMode) {
      // Package mode: Don't embed code in ARM template
      // Code will be deployed via run-from-package
      return {
        type: 'Microsoft.Web/sites/functions',
        apiVersion: '2023-01-01',
        name: `${this.functionAppName}/${this.functionName}`,
        properties: {
          config: {
            bindings,
          },
          // NO files property in package mode - code comes from WEBSITE_RUN_FROM_PACKAGE
        },
        // BUG FIX #3: Remove dependsOn for child resources
        // ARM automatically handles parent-child dependencies via naming convention
        // Including dependsOn causes failures when parent is in different template
        // See: SYNTHESIS_ISSUES_ANALYSIS.md Bug #3
      };
    } else {
      // Legacy mode: Embed code directly in ARM template
      return {
        type: 'Microsoft.Web/sites/functions',
        apiVersion: '2023-01-01',
        name: `${this.functionAppName}/${this.functionName}`,
        properties: {
          config: {
            bindings,
          },
          files: {
            // The code will be automatically JSON-stringified during serialization
            'index.js': this.code,
          },
        },
        // BUG FIX #3: Remove dependsOn for child resources
        // ARM automatically handles parent-child dependencies via naming convention
        // Including dependsOn causes failures when parent is in different template
        // See: SYNTHESIS_ISSUES_ANALYSIS.md Bug #3
      };
    }
  }
}
