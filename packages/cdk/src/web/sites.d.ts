import { Construct } from '@atakora/lib';
import type { SitesProps, ISite, ManagedServiceIdentity, ConnectionStringType } from './site-types';
/**
 * L2 construct for Azure App Service (Web App).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates App Service name
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Defaults to 'app' kind (Web App)
 * - Defaults to HTTPS only
 * - Defaults to System-Assigned managed identity
 * - Helper methods for app settings, connection strings, and VNet integration
 *
 * **ARM Resource Type**: `Microsoft.Web/sites`
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { Sites } from '@atakora/cdk/web';
 *
 * const app = new Sites(resourceGroup, 'WebApp', {
 *   serverFarmId: plan.planId
 * });
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const app = new Sites(resourceGroup, 'WebApp', {
 *   siteName: 'my-web-app',
 *   serverFarmId: plan,
 *   linuxFxVersion: 'PYTHON|3.11',
 *   httpsOnly: true,
 *   alwaysOn: true
 * });
 *
 * // Add app settings
 * app.addAppSetting('ENVIRONMENT', 'production');
 * app.addAppSetting('API_KEY', '@Microsoft.KeyVault(SecretUri=...)');
 *
 * // Add connection string
 * app.addConnectionString('Database', 'Server=...', ConnectionStringType.SQL_AZURE);
 *
 * // Enable VNet integration
 * app.enableVNetIntegration('/subscriptions/.../subnets/app-subnet');
 * ```
 */
export declare class Sites extends Construct implements ISite {
    /**
     * Underlying L1 construct.
     */
    private readonly armSite;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the App Service.
     */
    readonly siteName: string;
    /**
     * Location of the App Service.
     */
    readonly location: string;
    /**
     * Resource group name where the App Service is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the App Service.
     */
    readonly siteId: string;
    /**
     * Default hostname of the App Service.
     */
    readonly defaultHostName: string;
    /**
     * Tags applied to the App Service (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * App Service Plan ID.
     */
    readonly serverFarmId: string;
    /**
     * Kind of App Service.
     */
    readonly kind: string;
    /**
     * Managed service identity.
     */
    readonly identity: ManagedServiceIdentity;
    /**
     * HTTPS only enabled.
     */
    readonly httpsOnly: boolean;
    /**
     * Mutable app settings list.
     */
    private appSettings;
    /**
     * Mutable connection strings list.
     */
    private connectionStrings;
    /**
     * Virtual network subnet ID for VNet integration.
     */
    private vnetSubnetId?;
    /**
     * Site configuration.
     */
    private siteConfigSettings;
    /**
     * Creates a new Sites construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - App Service properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     *
     * @example
     * ```typescript
     * const app = new Sites(resourceGroup, 'WebApp', {
     *   serverFarmId: plan.planId,
     *   linuxFxVersion: 'PYTHON|3.11',
     *   tags: { purpose: 'api-hosting' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props: SitesProps);
    /**
     * Adds an app setting to the App Service.
     *
     * @param name - Setting name
     * @param value - Setting value
     *
     * @example
     * ```typescript
     * app.addAppSetting('ENVIRONMENT', 'production');
     * app.addAppSetting('API_KEY', '@Microsoft.KeyVault(SecretUri=https://...)');
     * ```
     */
    addAppSetting(name: string, value: string): void;
    /**
     * Adds a connection string to the App Service.
     *
     * @param name - Connection string name
     * @param value - Connection string value
     * @param type - Connection string type
     *
     * @example
     * ```typescript
     * app.addConnectionString(
     *   'Database',
     *   'Server=tcp:...;Database=...;',
     *   ConnectionStringType.SQL_AZURE
     * );
     * app.addConnectionString(
     *   'Redis',
     *   '@Microsoft.KeyVault(SecretUri=...)',
     *   ConnectionStringType.REDIS_CACHE
     * );
     * ```
     */
    addConnectionString(name: string, value: string, type: ConnectionStringType): void;
    /**
     * Enables VNet integration for the App Service.
     *
     * @param subnetId - Subnet resource ID
     *
     * @example
     * ```typescript
     * app.enableVNetIntegration(
     *   '/subscriptions/.../resourceGroups/.../providers/Microsoft.Network/virtualNetworks/vnet/subnets/app-subnet'
     * );
     * ```
     */
    enableVNetIntegration(subnetId: string): void;
    /**
     * Creates an App Service reference from an existing site ID.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for this reference
     * @param siteId - Resource ID of the existing App Service
     * @returns App Service reference
     *
     * @example
     * ```typescript
     * const app = Sites.fromSiteId(
     *   resourceGroup,
     *   'ExistingApp',
     *   '/subscriptions/.../resourceGroups/.../providers/Microsoft.Web/sites/app-existing'
     * );
     * ```
     */
    static fromSiteId(scope: Construct, id: string, siteId: string): ISite;
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
     * Resolves the App Service site name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - App Service properties
     * @returns Resolved site name
     *
     * @remarks
     * App Service names have constraints:
     * - 2-60 characters
     * - Alphanumeric and hyphens
     * - Globally unique across Azure (for azurewebsites.net URL)
     *
     * New naming convention for global uniqueness:
     * - Format: appsrv-<project>-<instance>-<8-char-hash>
     * - Hash is generated from full resource name to ensure uniqueness
     * - Example: appsrv-authr-03-a1b2c3d4
     */
    private resolveSiteName;
    /**
     * Resolves the serverFarmId from IServerFarm or string.
     *
     * @param serverFarmId - App Service Plan reference or ID
     * @returns Server farm ID string
     */
    private resolveServerFarmId;
    /**
     * Builds an App Service Plan reference for ARM templates.
     * Extracts the plan name from the resource ID and creates a full resource ID expression.
     *
     * @param planId - Full resource ID of the App Service Plan
     * @returns ARM concat() expression building full resource ID
     */
    private buildAppServicePlanReference;
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
}
//# sourceMappingURL=sites.d.ts.map