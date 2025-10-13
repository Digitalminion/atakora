import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmFunctionAppProps, FunctionRuntime, FunctionAppSiteConfig } from './function-app-types';
import type { ManagedServiceIdentity } from '@atakora/lib';
/**
 * L1 construct for Azure Function App.
 *
 * @remarks
 * Direct mapping to Microsoft.Web/sites ARM resource with kind='functionapp'.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Web/sites`
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the L2 FunctionApp construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmFunctionApp, FunctionRuntime } from '@atakora/cdk/web';
 *
 * const functionApp = new ArmFunctionApp(resourceGroup, 'FunctionApp', {
 *   siteName: 'func-app-001',
 *   location: 'eastus',
 *   serverFarmId: plan.planId,
 *   kind: 'functionapp',
 *   storageAccountConnectionString: 'DefaultEndpointsProtocol=https;...',
 *   runtime: FunctionRuntime.NODE,
 *   runtimeVersion: '18'
 * });
 * ```
 */
export declare class ArmFunctionApp extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for Function Apps.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the Function App.
     */
    readonly siteName: string;
    /**
     * Resource name (same as siteName).
     */
    readonly name: string;
    /**
     * Azure region where the Function App is located.
     */
    readonly location: string;
    /**
     * App Service Plan resource ID.
     */
    readonly serverFarmId: string;
    /**
     * Kind of Function App.
     */
    readonly kind: 'functionapp' | 'functionapp,linux';
    /**
     * Storage account connection string.
     */
    readonly storageAccountConnectionString: string;
    /**
     * Function runtime.
     */
    readonly runtime?: FunctionRuntime;
    /**
     * Runtime version.
     */
    readonly runtimeVersion?: string;
    /**
     * Managed service identity.
     */
    readonly identity?: ManagedServiceIdentity;
    /**
     * Site configuration.
     */
    readonly siteConfig?: FunctionAppSiteConfig;
    /**
     * Virtual network subnet ID.
     */
    readonly virtualNetworkSubnetId?: string;
    /**
     * HTTPS only enabled.
     */
    readonly httpsOnly?: boolean;
    /**
     * Client affinity enabled.
     */
    readonly clientAffinityEnabled?: boolean;
    /**
     * Key Vault reference identity.
     */
    readonly keyVaultReferenceIdentity?: string;
    /**
     * Daily memory time quota.
     */
    readonly dailyMemoryTimeQuota?: number;
    /**
     * Tags applied to the Function App.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{siteName}`
     */
    readonly resourceId: string;
    /**
     * Function App resource ID (alias for resourceId).
     */
    readonly functionAppId: string;
    /**
     * Default hostname of the Function App.
     *
     * @remarks
     * Format: {siteName}.azurewebsites.net
     */
    readonly defaultHostName: string;
    /**
     * Creates a new ArmFunctionApp construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Function App properties
     *
     * @throws {Error} If siteName is invalid
     * @throws {Error} If location is empty
     * @throws {Error} If serverFarmId is empty
     * @throws {Error} If storageAccountConnectionString is empty
     */
    constructor(scope: Construct, id: string, props: ArmFunctionAppProps);
    /**
     * Validates Function App properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmFunctionAppProps): void;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=function-app-arm.d.ts.map