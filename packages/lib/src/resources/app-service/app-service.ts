import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import type { IAppServicePlan } from '../app-service-plan/types';
import { ArmAppService } from './arm-app-service';
import type {
  AppServiceProps,
  IAppService,
  AppServiceKind,
  ManagedServiceIdentity,
  ManagedIdentityType,
  NameValuePair,
  ConnectionStringInfo,
  ConnectionStringType,
  FtpsState,
  MinTlsVersion,
  SiteConfig,
} from './types';

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
 * import { AppService } from '@atakora/lib';
 *
 * const app = new AppService(resourceGroup, 'WebApp', {
 *   serverFarmId: plan.planId
 * });
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const app = new AppService(resourceGroup, 'WebApp', {
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
export class AppService extends Construct implements IAppService {
  /**
   * Underlying L1 construct.
   */
  private readonly armAppService: ArmAppService;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the App Service.
   */
  public readonly siteName: string;

  /**
   * Location of the App Service.
   */
  public readonly location: string;

  /**
   * Resource group name where the App Service is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the App Service.
   */
  public readonly siteId: string;

  /**
   * Default hostname of the App Service.
   */
  public readonly defaultHostName: string;

  /**
   * Tags applied to the App Service (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * App Service Plan ID.
   */
  public readonly serverFarmId: string;

  /**
   * Kind of App Service.
   */
  public readonly kind: string;

  /**
   * Managed service identity.
   */
  public readonly identity: ManagedServiceIdentity;

  /**
   * HTTPS only enabled.
   */
  public readonly httpsOnly: boolean;

  /**
   * Mutable app settings list.
   */
  private appSettings: NameValuePair[];

  /**
   * Mutable connection strings list.
   */
  private connectionStrings: ConnectionStringInfo[];

  /**
   * Virtual network subnet ID for VNet integration.
   */
  private vnetSubnetId?: string;

  /**
   * Site configuration.
   */
  private siteConfigSettings: Partial<{
    -readonly [K in keyof SiteConfig]: SiteConfig[K];
  }>;

  /**
   * Creates a new AppService construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - App Service properties
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   *
   * @example
   * ```typescript
   * const app = new AppService(resourceGroup, 'WebApp', {
   *   serverFarmId: plan.planId,
   *   linuxFxVersion: 'PYTHON|3.11',
   *   tags: { purpose: 'api-hosting' }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: AppServiceProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided site name
    this.siteName = this.resolveSiteName(id, props);

    // Default location to resource group's location or use provided
    this.location = props.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Resolve serverFarmId from IAppServicePlan or string
    this.serverFarmId = this.resolveServerFarmId(props.serverFarmId);

    // Default kind to 'app'
    this.kind = props.kind ?? ('app' as AppServiceKind);

    // Default identity to SystemAssigned
    this.identity = props.identity ?? {
      type: 'SystemAssigned' as ManagedIdentityType,
    };

    // Default httpsOnly to true
    this.httpsOnly = props.httpsOnly ?? true;

    // Initialize mutable collections
    this.appSettings = [...(props.appSettings ?? [])];
    this.connectionStrings = [...(props.connectionStrings ?? [])];
    this.vnetSubnetId = props.virtualNetworkSubnetId;

    // Initialize site config settings
    this.siteConfigSettings = {
      linuxFxVersion: props.linuxFxVersion,
      netFrameworkVersion: props.netFrameworkVersion,
      windowsFxVersion: props.windowsFxVersion,
      alwaysOn: props.alwaysOn ?? false,
      http20Enabled: props.http20Enabled ?? true,
      ftpsState: props.ftpsState ?? ('Disabled' as FtpsState),
      minTlsVersion: props.minTlsVersion ?? ('1.2' as MinTlsVersion),
      cors: props.cors,
      vnetRouteAllEnabled: props.vnetRouteAllEnabled,
      httpLoggingEnabled: props.httpLoggingEnabled,
      detailedErrorLoggingEnabled: props.detailedErrorLoggingEnabled,
      ipSecurityRestrictions: props.ipSecurityRestrictions,
      scmIpSecurityRestrictions: props.scmIpSecurityRestrictions,
      healthCheckPath: props.healthCheckPath,
      publicNetworkAccess: props.publicNetworkAccess,
    };

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props.tags,
    };

    // Build complete site config
    const siteConfig: SiteConfig = {
      ...this.siteConfigSettings,
      appSettings: this.appSettings,
      connectionStrings: this.connectionStrings,
    };

    // Create underlying L1 resource
    this.armAppService = new ArmAppService(scope, `${id}-Resource`, {
      siteName: this.siteName,
      location: this.location,
      serverFarmId: this.serverFarmId,
      kind: this.kind,
      identity: this.identity,
      siteConfig,
      virtualNetworkSubnetId: this.vnetSubnetId,
      httpsOnly: this.httpsOnly,
      keyVaultReferenceIdentity: props.keyVaultReferenceIdentity,
      tags: this.tags,
    });

    // Get resource ID and hostname from L1
    this.siteId = this.armAppService.siteId;
    this.defaultHostName = this.armAppService.defaultHostName;
  }

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
  public addAppSetting(name: string, value: string): void {
    // Check if setting already exists
    const existingIndex = this.appSettings.findIndex((s) => s.name === name);

    if (existingIndex >= 0) {
      // Update existing setting
      this.appSettings[existingIndex] = { name, value };
    } else {
      // Add new setting
      this.appSettings.push({ name, value });
    }
  }

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
  public addConnectionString(name: string, value: string, type: ConnectionStringType): void {
    // Check if connection string already exists
    const existingIndex = this.connectionStrings.findIndex((c) => c.name === name);

    if (existingIndex >= 0) {
      // Update existing connection string
      this.connectionStrings[existingIndex] = { name, value, type };
    } else {
      // Add new connection string
      this.connectionStrings.push({ name, value, type });
    }
  }

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
  public enableVNetIntegration(subnetId: string): void {
    this.vnetSubnetId = subnetId;
    this.siteConfigSettings.vnetRouteAllEnabled = true;
  }

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
   * const app = AppService.fromSiteId(
   *   resourceGroup,
   *   'ExistingApp',
   *   '/subscriptions/.../resourceGroups/.../providers/Microsoft.Web/sites/app-existing'
   * );
   * ```
   */
  public static fromSiteId(scope: Construct, id: string, siteId: string): IAppService {
    // Extract site name from resource ID
    const siteNameMatch = siteId.match(/\/sites\/([^/]+)$/);
    if (!siteNameMatch) {
      throw new Error(`Invalid App Service resource ID: ${siteId}`);
    }

    const siteName = siteNameMatch[1];

    // Extract location from parent resource group if available
    let location = 'unknown';
    let current: Construct | undefined = scope;
    while (current) {
      const candidate = current as unknown as { location?: string };
      if (candidate.location) {
        location = candidate.location;
        break;
      }
      current = current.node.scope;
    }

    // Construct default hostname
    const defaultHostName = `${siteName}.azurewebsites.net`;

    return {
      siteName,
      location,
      siteId,
      defaultHostName,
    };
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'AppService must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: unknown): construct is IResourceGroup {
    const candidate = construct as { resourceGroupName?: unknown; location?: unknown };
    return (
      construct !== null &&
      typeof construct === 'object' &&
      typeof candidate.resourceGroupName === 'string' &&
      typeof candidate.location === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as unknown as { tags?: Record<string, string> };
    if (parent && typeof parent.tags === 'object' && parent.tags) {
      return parent.tags;
    }
    return {};
  }

  /**
   * Resolves the App Service name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - App Service properties
   * @returns Resolved site name
   */
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
  private resolveSiteName(id: string, props: AppServiceProps): string {
    // If name provided explicitly, use it
    if (props.siteName) {
      return props.siteName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);

      // New format: appsrv-<project>-<instance>-<hash>
      // Use NamingService for truly unique hash per synthesis
      const stackData = subscriptionStack as {
        project?: { resourceName?: string };
        instance?: { resourceName?: string };
        namingService?: { getResourceHash: (length: number) => string };
      };

      const project = stackData.project?.resourceName || 'unknown';
      const instance = stackData.instance?.resourceName || 'unknown';
      const hash = stackData.namingService?.getResourceHash(8) || 'unknown';

      const generatedName = `appsrv-${project}-${instance}-${hash}`;

      // Ensure it fits within 60 characters
      if (generatedName.length > 60) {
        // Truncate project name if needed
        const maxProjectLen = 60 - 19; // 60 - (7 + 1 + 2 + 1 + 1 + 8 + 1) = 41
        const truncatedProject = project.substring(0, maxProjectLen);
        return `appsrv-${truncatedProject}-${instance}-${hash}`.substring(0, 60);
      }

      return generatedName;
    }

    // Fallback: construct a basic name from ID (ensure max 60 chars)
    const fallbackName = `appsrv-${id.toLowerCase()}`;
    return fallbackName.substring(0, 60);
  }

  /**
   * Resolves the serverFarmId from IAppServicePlan or string.
   *
   * @param serverFarmId - App Service Plan reference or ID
   * @returns Server farm ID string
   */
  private resolveServerFarmId(serverFarmId: IAppServicePlan | string): string {
    if (typeof serverFarmId === 'string') {
      return serverFarmId;
    }

    // It's an IAppServicePlan interface - convert to ARM resourceId() expression
    return this.buildAppServicePlanReference(serverFarmId.planId);
  }

  /**
   * Builds an App Service Plan reference for ARM templates.
   * Extracts the plan name from the resource ID and creates a full resource ID expression.
   *
   * @param planId - Full resource ID of the App Service Plan
   * @returns ARM concat() expression building full resource ID
   */
  private buildAppServicePlanReference(planId: string): string {
    // Extract plan name from resource ID
    // Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}
    const parts = planId.split('/');
    const planName = parts[parts.length - 1];

    // Build full resource ID using concat() to ensure correct subscription and resource group
    return `[concat(subscription().id, '/resourceGroups/', resourceGroup().name, '/providers/Microsoft.Web/serverfarms/', '${planName}')]`;
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): unknown {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      const candidate = current as unknown as {
        generateResourceName?: unknown;
        subscriptionId?: unknown;
      };
      if (
        current &&
        typeof candidate.generateResourceName === 'function' &&
        typeof candidate.subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }
}
