import { Construct, GrantableResource } from '@atakora/lib';
import type { IGrantable, IGrantResult } from '@atakora/lib';
import type { FunctionAppProps, IFunctionApp, CorsSettings, VNetConfiguration } from './function-app-types';
import { FunctionRuntime } from './types';
/**
 * L2 construct for Azure Function App.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience for creating Function Apps.
 *
 * **Features**:
 * - Auto-generates function app name using naming conventions
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Secure defaults: HTTPS only, managed identity support
 * - Integrates with App Service Plan and Storage Account
 *
 * **ARM Resource Type**: `Microsoft.Web/sites` (kind: functionapp)
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage:
 * ```typescript
 * import { FunctionApp } from '@atakora/cdk/functions';
 *
 * const functionApp = new FunctionApp(resourceGroup, 'Api', {
 *   plan: appServicePlan,
 *   storageAccount: storage
 * });
 * ```
 *
 * @example
 * With custom configuration:
 * ```typescript
 * const functionApp = new FunctionApp(resourceGroup, 'Api', {
 *   plan: appServicePlan,
 *   storageAccount: storage,
 *   runtime: FunctionRuntime.NODE,
 *   runtimeVersion: '18',
 *   environment: {
 *     NODE_ENV: 'production',
 *     LOG_LEVEL: 'info'
 *   },
 *   identity: {
 *     type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
 *   }
 * });
 * ```
 */
export declare class FunctionApp extends GrantableResource implements IFunctionApp {
    /**
     * ARM resource type.
     */
    readonly resourceType = "Microsoft.Web/sites";
    /**
     * API version for the resource.
     */
    readonly apiVersion = "2023-01-01";
    /**
     * Resource name (same as functionAppName).
     */
    readonly name: string;
    /**
     * Full resource ID.
     */
    readonly resourceId: string;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the Function App.
     */
    readonly functionAppName: string;
    /**
     * Resource ID of the Function App (alias for resourceId).
     */
    readonly functionAppId: string;
    /**
     * Default hostname of the Function App.
     */
    readonly defaultHostName: string;
    /**
     * Location of the Function App.
     */
    readonly location: string;
    /**
     * Resource group name where the Function App is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Runtime configuration.
     */
    readonly runtime: FunctionRuntime;
    /**
     * Runtime version.
     */
    readonly runtimeVersion: string;
    /**
     * App Service Plan ID.
     */
    readonly serverFarmId: string;
    /**
     * Storage Account name.
     */
    readonly storageAccountName: string;
    /**
     * Global environment variables.
     */
    readonly environment: Record<string, string>;
    /**
     * Tags applied to the Function App (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * CORS settings (if configured).
     */
    readonly cors?: CorsSettings;
    /**
     * VNet configuration (if configured).
     */
    readonly vnetConfig?: VNetConfiguration;
    /**
     * Creates a new FunctionApp construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Function App properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     * @throws {Error} If plan or storageAccount is not provided
     *
     * @example
     * ```typescript
     * const functionApp = new FunctionApp(resourceGroup, 'Api', {
     *   plan: appServicePlan,
     *   storageAccount: storage,
     *   runtime: FunctionRuntime.NODE,
     *   runtimeVersion: '18'
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props: FunctionAppProps);
    /**
     * Validates constructor properties.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     *
     * @internal
     */
    protected validateProps(props: FunctionAppProps): void;
    /**
     * Transforms this resource to ARM template JSON representation.
     *
     * @returns ARM template resource object
     *
     * @remarks
     * This is a stub implementation. Full ARM template generation
     * will be implemented when synthesis is added.
     */
    toArmTemplate(): any;
    /**
     * Converts ManagedServiceIdentityType to ManagedIdentityType.
     *
     * @param type - Function app identity type
     * @returns Core identity type
     *
     * @internal
     */
    private convertIdentityType;
    /**
     * Gets the parent ResourceGroup from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The resource group interface
     * @throws {Error} If parent is not or doesn't contain a ResourceGroup
     */
    private getParentResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroup properties
     */
    private isResourceGroup;
    /**
     * Gets tags from parent construct hierarchy.
     *
     * @param scope - Parent construct
     * @returns Tags object (empty if no tags found)
     */
    private getParentTags;
    /**
     * Resolves the function app name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Function App properties
     * @returns Resolved function app name
     *
     * @remarks
     * Function app names have constraints:
     * - 2-60 characters
     * - Alphanumeric and hyphens only
     * - Globally unique across Azure
     *
     * Auto-generated naming convention:
     * - Format: func-{org}-{project}-{purpose}-{env}-{geo}-{instance}
     * - Example: func-dp-authr-api-np-eus-01
     */
    private resolveFunctionAppName;
    /**
     * Gets the SubscriptionStack from the construct tree.
     *
     * @returns SubscriptionStack or undefined if not found
     */
    private getSubscriptionStack;
    /**
     * Converts construct ID to purpose identifier for naming.
     *
     * @param id - Construct ID
     * @returns Purpose string for naming
     */
    private constructIdToPurpose;
    /**
     * Adds a global environment variable to the Function App.
     *
     * @param key - Environment variable name
     * @param value - Environment variable value
     *
     * @remarks
     * This environment variable will be available to all functions in the app.
     * Individual functions can override this value.
     *
     * @example
     * ```typescript
     * functionApp.addEnvironmentVariable('LOG_LEVEL', 'debug');
     * functionApp.addEnvironmentVariable('API_VERSION', 'v2');
     * ```
     */
    addEnvironmentVariable(key: string, value: string): void;
    /**
     * Adds multiple environment variables to the Function App.
     *
     * @param variables - Record of environment variables
     *
     * @example
     * ```typescript
     * functionApp.addEnvironmentVariables({
     *   LOG_LEVEL: 'debug',
     *   API_VERSION: 'v2',
     *   ENABLE_CACHING: 'true'
     * });
     * ```
     */
    addEnvironmentVariables(variables: Record<string, string>): void;
    /**
     * Grant permission to invoke this Function App.
     *
     * @remarks
     * Grants the Website Contributor role, which allows:
     * - Invoking function endpoints
     * - Reading function app configuration
     * - Managing function app settings
     *
     * This is typically used to grant API Management or other services
     * permission to call functions using managed identity authentication.
     *
     * **Security Note**: This uses RBAC-based authentication. For defense in depth,
     * combine with function keys (both are evaluated).
     *
     * @param grantable - Identity to grant invoke permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant API Management permission to invoke functions:
     * ```typescript
     * const apimService = new ApiManagementService(stack, 'APIM', {
     *   identity: {
     *     type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
     *   }
     * });
     *
     * const functionApp = new FunctionApp(stack, 'Api', {
     *   plan: appServicePlan,
     *   storageAccount: storage,
     *   identity: {
     *     type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
     *   }
     * });
     *
     * // Grant APIM permission to invoke the function (RBAC)
     * functionApp.grantInvoke(apimService);
     * ```
     */
    grantInvoke(grantable: IGrantable): IGrantResult;
    /**
     * Imports an existing Function App by name.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for the imported construct
     * @param functionAppName - Name of the existing Function App
     * @param location - Location of the Function App
     * @returns Function App interface
     *
     * @example
     * ```typescript
     * const existingApp = FunctionApp.fromFunctionAppName(
     *   scope,
     *   'ExistingApi',
     *   'func-dp-authr-api-np-eus-01',
     *   'eastus'
     * );
     * ```
     */
    static fromFunctionAppName(scope: Construct, id: string, functionAppName: string, location: string): IFunctionApp;
}
//# sourceMappingURL=function-app.d.ts.map