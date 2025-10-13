import { Construct } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { AzureFunctionProps, IAzureFunction } from './azure-function-types';
import type { FunctionConfig } from './types';
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
export declare class AzureFunction extends Construct implements IAzureFunction {
    /**
     * Name of the function.
     */
    readonly functionName: string;
    /**
     * Resource ID of the function.
     */
    readonly functionId: string;
    /**
     * Path to handler.ts file.
     */
    readonly handlerPath: string;
    /**
     * Path to resource.ts file (if provided).
     */
    readonly resourcePath?: string;
    /**
     * Function configuration.
     */
    readonly config: FunctionConfig;
    /**
     * Trigger URL (for HTTP triggers).
     */
    readonly triggerUrl?: string;
    /**
     * Function key (for secured functions).
     */
    readonly functionKey?: string;
    /**
     * Environment variables for this function.
     */
    readonly environment: Record<string, string>;
    /**
     * Parent Function App name.
     */
    private readonly functionAppName;
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
    constructor(scope: Construct, id: string, props: AzureFunctionProps);
    /**
     * Gets the parent FunctionApp from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The Function App
     * @throws {Error} If parent is not a FunctionApp
     */
    private getParentFunctionApp;
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
    private resolveFunctionName;
    /**
     * Resolves environment variables, converting resource references to ARM expressions.
     *
     * @param env - Environment variables with possible resource references
     * @returns Resolved environment variables as strings
     */
    private resolveEnvironmentVariables;
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
    private toArmReference;
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
    toArmTemplate(): ArmResource;
    /**
     * Converts trigger config to ARM binding format.
     *
     * @param trigger - Trigger configuration
     * @returns ARM binding object
     *
     * @internal
     */
    private triggerToBinding;
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
    grantInvoke(principal: any): void;
}
//# sourceMappingURL=azure-function.d.ts.map