import { Construct } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { AzureFunctionProps, IAzureFunction, IResourceReference } from './azure-function-types';
import type { FunctionConfig, TriggerConfig } from './types';

/**
 * L2 construct for individual Azure Function.
 *
 * @remarks
 * Represents a single function within a Function App.
 * Follows the Amplify Gen 2 pattern with separate handler.ts and resource.ts files.
 *
 * **Key Features**:
 * - Type-safe configuration from resource.ts
 * - Environment variable placeholder resolution
 * - Build integration for TypeScript/JavaScript code
 * - Support for multiple trigger types
 * - Input/output bindings
 * - Cross-resource references
 *
 * **ARM Resource Type**: `Microsoft.Web/sites/functions`
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: Site (Function App)
 *
 * @example
 * HTTP function with resource.ts:
 * ```typescript
 * import { AzureFunction } from '@atakora/cdk/functions';
 *
 * const apiFunction = new AzureFunction(functionApp, 'ApiEndpoint', {
 *   handler: './functions/api/handler.ts',
 *   resource: './functions/api/resource.ts',
 *   environment: {
 *     COSMOS_ENDPOINT: cosmosDb.endpoint,
 *     API_KEY: keyVault.secret('api-key')
 *   }
 * });
 * ```
 *
 * @example
 * Timer function with inline config:
 * ```typescript
 * const cleanupFunction = new AzureFunction(functionApp, 'Cleanup', {
 *   handler: './functions/cleanup/handler.ts',
 *   inlineConfig: {
 *     trigger: {
 *       type: 'timer',
 *       schedule: '0 0 2 * * *'  // 2 AM daily
 *     },
 *     timeout: { minutes: 10 }
 *   }
 * });
 * ```
 */
export class AzureFunction extends Construct implements IAzureFunction {
  /**
   * Name of the function.
   */
  public readonly functionName: string;

  /**
   * Resource ID of the function.
   */
  public readonly functionId: string;

  /**
   * Path to handler.ts file.
   */
  public readonly handlerPath: string;

  /**
   * Path to resource.ts file (if provided).
   */
  public readonly resourcePath?: string;

  /**
   * Function configuration.
   */
  public readonly config: FunctionConfig;

  /**
   * Trigger URL (for HTTP triggers).
   */
  public readonly triggerUrl?: string;

  /**
   * Function key (for secured functions).
   */
  public readonly functionKey?: string;

  /**
   * Environment variables for this function.
   */
  public readonly environment: Record<string, string>;

  /**
   * Parent Function App name.
   */
  private readonly functionAppName: string;

  /**
   * Creates a new AzureFunction construct.
   *
   * @param scope - Parent construct (must be a FunctionApp)
   * @param id - Unique identifier for this construct
   * @param props - Function properties
   *
   * @throws {Error} If scope is not a FunctionApp
   * @throws {Error} If handler is not provided
   * @throws {Error} If neither resource nor inlineConfig is provided
   * @throws {Error} If both resource and inlineConfig are provided
   *
   * @example
   * ```typescript
   * const myFunction = new AzureFunction(functionApp, 'MyFunction', {
   *   handler: './functions/myFunc/handler.ts',
   *   resource: './functions/myFunc/resource.ts',
   *   environment: {
   *     TABLE_NAME: cosmosDb.tableName
   *   }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: AzureFunctionProps) {
    super(scope, id);

    // Validate required properties
    if (!props.handler) {
      throw new Error('AzureFunction requires a handler path');
    }

    if (!props.resource && !props.inlineConfig) {
      throw new Error('AzureFunction requires either resource or inlineConfig');
    }

    if (props.resource && props.inlineConfig) {
      throw new Error('AzureFunction cannot have both resource and inlineConfig');
    }

    // Get parent Function App
    const functionApp = this.getParentFunctionApp(scope);
    this.functionAppName = functionApp.functionAppName;

    // Set handler path
    this.handlerPath = props.handler;

    // Set resource path
    this.resourcePath = props.resource;

    // Resolve function name
    this.functionName = props.functionName ?? this.resolveFunctionName(id);

    // TODO: Load configuration from resource.ts if provided
    // For now, use inlineConfig or create a default config
    if (props.inlineConfig) {
      this.config = props.inlineConfig;
    } else {
      // Default HTTP trigger config (will be replaced by resource.ts loader)
      this.config = {
        trigger: {
          type: 'http',
          authLevel: 'function',
        } as TriggerConfig,
        environment: {},
        timeout: { seconds: 300 },
      };
    }

    // Merge environment variables
    this.environment = {
      ...functionApp.environment,
      ...this.config.environment,
      ...this.resolveEnvironmentVariables(props.environment ?? {}),
    };

    // Construct resource ID
    this.functionId = `${functionApp.functionAppId}/functions/${this.functionName}`;

    // Set trigger URL for HTTP triggers
    if (this.config.trigger.type === 'http') {
      const route = (this.config.trigger as any).route ?? this.functionName;
      this.triggerUrl = `https://${functionApp.defaultHostName}/api/${route}`;
    }

    // Note: Function key generation would happen during deployment
    // For now, we'll leave it undefined
  }

  /**
   * Gets the parent FunctionApp from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The Function App
   * @throws {Error} If parent is not a FunctionApp
   */
  private getParentFunctionApp(scope: Construct): any {
    // Check if scope is a FunctionApp using duck typing
    if (
      scope &&
      typeof (scope as any).functionAppName === 'string' &&
      typeof (scope as any).functionAppId === 'string'
    ) {
      return scope;
    }

    throw new Error(
      'AzureFunction must be created within a FunctionApp. ' +
        'Ensure the parent scope is a FunctionApp construct.'
    );
  }

  /**
   * Resolves the function name from the construct ID.
   *
   * @param id - Construct ID
   * @returns Function name
   *
   * @remarks
   * Function names:
   * - Must be valid JavaScript identifiers
   * - Should be PascalCase or camelCase
   * - Are used in URLs for HTTP triggers
   */
  private resolveFunctionName(id: string): string {
    // Convert construct ID to a valid function name
    // Remove special characters and ensure it's a valid identifier
    return id.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Resolves environment variables, converting resource references to ARM expressions.
   *
   * @param env - Environment variables with possible resource references
   * @returns Resolved environment variables as strings
   */
  private resolveEnvironmentVariables(
    env: Record<string, string | IResourceReference>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string') {
        resolved[key] = value;
      } else {
        // Convert resource reference to ARM expression
        resolved[key] = this.toArmReference(value);
      }
    }

    return resolved;
  }

  /**
   * Converts a resource reference to an ARM expression.
   *
   * @param ref - Resource reference
   * @returns ARM expression string
   *
   * @remarks
   * Generates appropriate ARM template functions based on resource type.
   * Examples:
   * - Cosmos DB: `[reference(resourceId(...)).endpoint]`
   * - Storage Account: `[listKeys(resourceId(...)).keys[0].value]`
   * - Key Vault: `[@Microsoft.KeyVault(SecretUri=...)]`
   */
  private toArmReference(ref: IResourceReference): string {
    const resourceId = `resourceId('${ref.resourceType}', '${ref.resourceName}')`;

    // Generate appropriate ARM function based on resource type
    switch (ref.resourceType) {
      case 'Microsoft.DocumentDB/databaseAccounts':
        return `[reference(${resourceId}).documentEndpoint]`;
      case 'Microsoft.Storage/storageAccounts':
        return `[concat('DefaultEndpointsProtocol=https;AccountName=${ref.resourceName};AccountKey=', listKeys(${resourceId}, '2023-01-01').keys[0].value)]`;
      case 'Microsoft.KeyVault/vaults':
        // Key Vault references use special syntax
        return `@Microsoft.KeyVault(SecretUri=https://${ref.resourceName}.vault.azure.net/secrets/)`;
      default:
        // Generic reference
        return `[reference(${resourceId})]`;
    }
  }

  /**
   * Generates ARM template representation of this function.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   * Converts the function configuration to ARM resource format.
   *
   * @returns ARM template resource object
   *
   * @example
   * Generated ARM template structure:
   * ```json
   * {
   *   "type": "Microsoft.Web/sites/functions",
   *   "apiVersion": "2023-01-01",
   *   "name": "[concat(parameters('functionAppName'), '/', 'MyFunction')]",
   *   "properties": {
   *     "config": {
   *       "bindings": [...]
   *     },
   *     "files": {
   *       "index.js": "[base64(variables('functionCode'))]"
   *     }
   *   }
   * }
   * ```
   */
  public toArmTemplate(): ArmResource {
    // Generate bindings array from trigger and bindings config
    const bindings: any[] = [];

    // Add trigger binding
    bindings.push(this.triggerToBinding(this.config.trigger));

    // Add input bindings
    if (this.config.inputBindings) {
      this.config.inputBindings.forEach(binding => {
        bindings.push(binding);
      });
    }

    // Add output bindings
    if (this.config.outputBindings) {
      this.config.outputBindings.forEach(binding => {
        bindings.push(binding);
      });
    }

    return {
      type: 'Microsoft.Web/sites/functions',
      apiVersion: '2023-01-01',
      name: `[concat(parameters('functionAppName'), '/', '${this.functionName}')]`,
      properties: {
        config: {
          bindings,
        },
        // Code deployment will be handled by build pipeline
        // This is a placeholder structure
        files: {
          'function.json': JSON.stringify({
            bindings,
          }),
        },
      },
    } as ArmResource;
  }

  /**
   * Converts trigger config to ARM binding format.
   *
   * @param trigger - Trigger configuration
   * @returns ARM binding object
   *
   * @internal
   */
  private triggerToBinding(trigger: TriggerConfig): any {
    const binding: any = {
      type: `${trigger.type}Trigger`,
      direction: 'in',
      name: trigger.name ?? 'trigger',
    };

    // Add trigger-specific properties
    switch (trigger.type) {
      case 'http':
        const httpTrigger = trigger as any;
        if (httpTrigger.route) binding.route = httpTrigger.route;
        if (httpTrigger.methods) binding.methods = httpTrigger.methods;
        if (httpTrigger.authLevel) binding.authLevel = httpTrigger.authLevel;
        break;

      case 'timer':
        const timerTrigger = trigger as any;
        binding.schedule = timerTrigger.schedule;
        if (timerTrigger.runOnStartup !== undefined) {
          binding.runOnStartup = timerTrigger.runOnStartup;
        }
        if (timerTrigger.useMonitor !== undefined) {
          binding.useMonitor = timerTrigger.useMonitor;
        }
        break;

      case 'queue':
        const queueTrigger = trigger as any;
        binding.queueName = queueTrigger.queueName;
        binding.connection = queueTrigger.connection;
        if (queueTrigger.batchSize) binding.batchSize = queueTrigger.batchSize;
        break;

      case 'serviceBus':
        const sbTrigger = trigger as any;
        if (sbTrigger.queueName) binding.queueName = sbTrigger.queueName;
        if (sbTrigger.topicName) binding.topicName = sbTrigger.topicName;
        if (sbTrigger.subscriptionName) binding.subscriptionName = sbTrigger.subscriptionName;
        binding.connection = sbTrigger.connection;
        break;

      case 'cosmosDb':
        const cosmosTrigger = trigger as any;
        binding.databaseName = cosmosTrigger.databaseName;
        binding.collectionName = cosmosTrigger.collectionName;
        binding.connection = cosmosTrigger.connection;
        if (cosmosTrigger.leaseCollectionName) {
          binding.leaseCollectionName = cosmosTrigger.leaseCollectionName;
        }
        break;

      case 'eventHub':
        const ehTrigger = trigger as any;
        binding.eventHubName = ehTrigger.eventHubName;
        binding.connection = ehTrigger.connection;
        if (ehTrigger.consumerGroup) binding.consumerGroup = ehTrigger.consumerGroup;
        break;

      case 'blob':
        const blobTrigger = trigger as any;
        binding.path = blobTrigger.path;
        binding.connection = blobTrigger.connection;
        break;
    }

    return binding;
  }

  /**
   * Grants invoke permission to a principal.
   *
   * @param principal - Principal to grant permission to
   *
   * @remarks
   * This would create a role assignment allowing the principal to invoke this function.
   * Implementation depends on the IAM system.
   *
   * @example
   * ```typescript
   * myFunction.grantInvoke(servicePrincipal);
   * ```
   */
  public grantInvoke(principal: any): void {
    // TODO: Implement IAM role assignment
    // This would create a role assignment granting the principal permission to invoke
    console.warn('grantInvoke not yet implemented');
  }
}
