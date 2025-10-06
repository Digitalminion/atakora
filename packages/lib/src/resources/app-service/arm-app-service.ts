import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type {
  ArmAppServiceProps,
  ManagedServiceIdentity,
  SiteConfig,
} from './types';

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
 * auto-naming and defaults, use the {@link AppService} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmAppService, AppServiceKind, ManagedIdentityType } from '@atakora/lib';
 *
 * const app = new ArmAppService(resourceGroup, 'WebApp', {
 *   siteName: 'app-colorai-001',
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
export class ArmAppService extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Web/sites';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-01-01';

  /**
   * Deployment scope for App Services.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the App Service.
   */
  public readonly siteName: string;

  /**
   * Resource name (same as siteName).
   */
  public readonly name: string;

  /**
   * Azure region where the App Service is located.
   */
  public readonly location: string;

  /**
   * App Service Plan resource ID.
   */
  public readonly serverFarmId: string;

  /**
   * Kind of App Service.
   */
  public readonly kind?: string;

  /**
   * Managed service identity.
   */
  public readonly identity?: ManagedServiceIdentity;

  /**
   * Site configuration.
   */
  public readonly siteConfig?: SiteConfig;

  /**
   * Virtual network subnet ID for VNet integration.
   */
  public readonly virtualNetworkSubnetId?: string;

  /**
   * HTTPS only enabled.
   */
  public readonly httpsOnly?: boolean;

  /**
   * Client affinity enabled.
   */
  public readonly clientAffinityEnabled?: boolean;

  /**
   * Key Vault reference identity.
   */
  public readonly keyVaultReferenceIdentity?: string;

  /**
   * Storage account required.
   */
  public readonly storageAccountRequired?: boolean;

  /**
   * Tags applied to the App Service.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{siteName}`
   */
  public readonly resourceId: string;

  /**
   * App Service resource ID (alias for resourceId).
   */
  public readonly siteId: string;

  /**
   * Default hostname of the App Service.
   *
   * @remarks
   * Format: `{siteName}.azurewebsites.net`
   */
  public readonly defaultHostName: string;

  /**
   * Creates a new ArmAppService construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - App Service properties
   *
   * @throws {Error} If siteName is invalid
   * @throws {Error} If location is empty
   * @throws {Error} If serverFarmId is empty
   */
  constructor(scope: Construct, id: string, props: ArmAppServiceProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.siteName = props.siteName;
    this.name = props.siteName;
    this.location = props.location;
    this.serverFarmId = props.serverFarmId;
    this.kind = props.kind;
    this.identity = props.identity;
    this.siteConfig = props.siteConfig;
    this.virtualNetworkSubnetId = props.virtualNetworkSubnetId;
    this.httpsOnly = props.httpsOnly;
    this.clientAffinityEnabled = props.clientAffinityEnabled;
    this.keyVaultReferenceIdentity = props.keyVaultReferenceIdentity;
    this.storageAccountRequired = props.storageAccountRequired;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/${this.siteName}`;
    this.siteId = this.resourceId;

    // Construct default hostname
    this.defaultHostName = `${this.siteName}.azurewebsites.net`;
  }

  /**
   * Validates App Service properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmAppServiceProps): void {
    // Validate site name
    if (!props.siteName || props.siteName.trim() === '') {
      throw new Error('App Service name cannot be empty');
    }

    if (props.siteName.length < 2 || props.siteName.length > 60) {
      throw new Error(
        `App Service name must be 2-60 characters (got ${props.siteName.length})`
      );
    }

    // Validate name pattern: must start and end with alphanumeric, can contain hyphens
    // Pattern: ^[a-zA-Z0-9][a-zA-Z0-9-]{0,58}[a-zA-Z0-9]$
    const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,58}[a-zA-Z0-9]$/;
    if (!namePattern.test(props.siteName)) {
      throw new Error(
        `App Service name must start and end with alphanumeric characters and can contain hyphens (got: ${props.siteName})`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate serverFarmId
    if (!props.serverFarmId || props.serverFarmId.trim() === '') {
      throw new Error('App Service Plan ID (serverFarmId) cannot be empty');
    }
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   * This will be implemented by Grace's synthesis pipeline.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): object {
    const properties: any = {
      serverFarmId: this.serverFarmId,
    };

    // Add site config if provided
    if (this.siteConfig) {
      properties.siteConfig = this.buildSiteConfig(this.siteConfig);
    }

    // Add VNet integration
    if (this.virtualNetworkSubnetId) {
      properties.virtualNetworkSubnetId = this.virtualNetworkSubnetId;
    }

    // Add httpsOnly
    if (this.httpsOnly !== undefined) {
      properties.httpsOnly = this.httpsOnly;
    }

    // Add clientAffinityEnabled
    if (this.clientAffinityEnabled !== undefined) {
      properties.clientAffinityEnabled = this.clientAffinityEnabled;
    }

    // Add keyVaultReferenceIdentity
    if (this.keyVaultReferenceIdentity !== undefined) {
      properties.keyVaultReferenceIdentity = this.keyVaultReferenceIdentity;
    }

    // Add storageAccountRequired
    if (this.storageAccountRequired !== undefined) {
      properties.storageAccountRequired = this.storageAccountRequired;
    }

    // Build base template
    const template: any = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.siteName,
      location: this.location,
      properties,
    };

    // Add kind if provided
    if (this.kind) {
      template.kind = this.kind;
    }

    // Add identity if provided
    if (this.identity) {
      template.identity = this.buildIdentity(this.identity);
    }

    // Add tags if provided
    if (Object.keys(this.tags).length > 0) {
      template.tags = this.tags;
    }

    return template;
  }

  /**
   * Builds the identity object for ARM template.
   *
   * @param identity - Managed service identity
   * @returns Identity object
   */
  private buildIdentity(identity: ManagedServiceIdentity): object {
    const identityObj: any = {
      type: identity.type,
    };

    if (identity.userAssignedIdentities) {
      identityObj.userAssignedIdentities = identity.userAssignedIdentities;
    }

    return identityObj;
  }

  /**
   * Builds the site config object for ARM template.
   *
   * @param config - Site configuration
   * @returns Site config object
   */
  private buildSiteConfig(config: SiteConfig): object {
    const siteConfigObj: any = {};

    // Add all optional properties if they exist
    if (config.netFrameworkVersion !== undefined) {
      siteConfigObj.netFrameworkVersion = config.netFrameworkVersion;
    }

    if (config.linuxFxVersion !== undefined) {
      siteConfigObj.linuxFxVersion = config.linuxFxVersion;
    }

    if (config.windowsFxVersion !== undefined) {
      siteConfigObj.windowsFxVersion = config.windowsFxVersion;
    }

    if (config.appSettings !== undefined) {
      siteConfigObj.appSettings = config.appSettings;
    }

    if (config.connectionStrings !== undefined) {
      siteConfigObj.connectionStrings = config.connectionStrings;
    }

    if (config.alwaysOn !== undefined) {
      siteConfigObj.alwaysOn = config.alwaysOn;
    }

    if (config.http20Enabled !== undefined) {
      siteConfigObj.http20Enabled = config.http20Enabled;
    }

    if (config.ftpsState !== undefined) {
      siteConfigObj.ftpsState = config.ftpsState;
    }

    if (config.minTlsVersion !== undefined) {
      siteConfigObj.minTlsVersion = config.minTlsVersion;
    }

    if (config.cors !== undefined) {
      siteConfigObj.cors = config.cors;
    }

    if (config.vnetRouteAllEnabled !== undefined) {
      siteConfigObj.vnetRouteAllEnabled = config.vnetRouteAllEnabled;
    }

    if (config.httpLoggingEnabled !== undefined) {
      siteConfigObj.httpLoggingEnabled = config.httpLoggingEnabled;
    }

    if (config.detailedErrorLoggingEnabled !== undefined) {
      siteConfigObj.detailedErrorLoggingEnabled = config.detailedErrorLoggingEnabled;
    }

    if (config.ipSecurityRestrictions !== undefined) {
      siteConfigObj.ipSecurityRestrictions = config.ipSecurityRestrictions;
    }

    if (config.scmIpSecurityRestrictions !== undefined) {
      siteConfigObj.scmIpSecurityRestrictions = config.scmIpSecurityRestrictions;
    }

    if (config.use32BitWorkerProcess !== undefined) {
      siteConfigObj.use32BitWorkerProcess = config.use32BitWorkerProcess;
    }

    if (config.webSocketsEnabled !== undefined) {
      siteConfigObj.webSocketsEnabled = config.webSocketsEnabled;
    }

    if (config.healthCheckPath !== undefined) {
      siteConfigObj.healthCheckPath = config.healthCheckPath;
    }

    if (config.publicNetworkAccess !== undefined) {
      siteConfigObj.publicNetworkAccess = config.publicNetworkAccess;
    }

    return siteConfigObj;
  }
}
