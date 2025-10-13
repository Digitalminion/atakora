import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmSitesProps, ManagedServiceIdentity, SiteConfig } from './site-types';
/**
 * L1 construct for Azure App Service (Web App).
 *
 * @remarks
 * Direct mapping to Microsoft.Web/sites ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Web/sites`
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link Sites} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmSites, AppServiceKind, ManagedIdentityType } from '@atakora/cdk/web';
 *
 * const app = new ArmSites(resourceGroup, 'WebApp', {
 *   siteName: 'app-authr-001',
 *   location: 'eastus',
 *   serverFarmId: '/subscriptions/.../serverfarms/asp-001',
 *   kind: 'app',
 *   identity: {
 *     type: ManagedIdentityType.SYSTEM_ASSIGNED
 *   },
 *   httpsOnly: true
 * });
 * ```
 */
export declare class ArmSites extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for App Services.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the App Service.
     */
    readonly siteName: string;
    /**
     * Resource name (same as siteName).
     */
    readonly name: string;
    /**
     * Azure region where the App Service is located.
     */
    readonly location: string;
    /**
     * App Service Plan resource ID.
     */
    readonly serverFarmId: string;
    /**
     * Kind of App Service.
     */
    readonly kind?: string;
    /**
     * Managed service identity.
     */
    readonly identity?: ManagedServiceIdentity;
    /**
     * Site configuration.
     */
    readonly siteConfig?: SiteConfig;
    /**
     * Virtual network subnet ID for VNet integration.
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
     * Storage account required.
     */
    readonly storageAccountRequired?: boolean;
    /**
     * Tags applied to the App Service.
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
     * App Service resource ID (alias for resourceId).
     */
    readonly siteId: string;
    /**
     * Default hostname of the App Service.
     *
     * @remarks
     * Format: `{siteName}.azurewebsites.net`
     */
    readonly defaultHostName: string;
    /**
     * Creates a new ArmSites construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - App Service properties
     *
     * @throws {Error} If siteName is invalid
     * @throws {Error} If location is empty
     * @throws {Error} If serverFarmId is empty
     */
    constructor(scope: Construct, id: string, props: ArmSitesProps);
    /**
     * Validates App Service properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmSitesProps): void;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     * This will be implemented by Grace's synthesis pipeline.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
    /**
     * Builds a subnet reference for ARM templates.
     * Converts a subnet resource ID to a resourceId() expression.
     *
     * @param subnetId - Full resource ID of the subnet
     * @returns ARM resourceId() expression
     */
    private buildSubnetReference;
    /**
     * Builds the identity object for ARM template.
     *
     * @param identity - Managed service identity
     * @returns Identity object
     */
    private buildIdentity;
    /**
     * Builds the site config object for ARM template.
     *
     * @param config - Site configuration
     * @returns Site config object
     */
    private buildSiteConfig;
}
//# sourceMappingURL=site-arm.d.ts.map