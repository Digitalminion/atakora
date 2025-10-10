import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type {
  ArmFunctionAppProps,
  FunctionRuntime,
  FunctionAppSiteConfig,
  NameValuePair,
} from './function-app-types';
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
export class ArmFunctionApp extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Web/sites';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-01-01';

  /**
   * Deployment scope for Function Apps.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the Function App.
   */
  public readonly siteName: string;

  /**
   * Resource name (same as siteName).
   */
  public readonly name: string;

  /**
   * Azure region where the Function App is located.
   */
  public readonly location: string;

  /**
   * App Service Plan resource ID.
   */
  public readonly serverFarmId: string;

  /**
   * Kind of Function App.
   */
  public readonly kind: 'functionapp' | 'functionapp,linux';

  /**
   * Storage account connection string.
   */
  public readonly storageAccountConnectionString: string;

  /**
   * Function runtime.
   */
  public readonly runtime?: FunctionRuntime;

  /**
   * Runtime version.
   */
  public readonly runtimeVersion?: string;

  /**
   * Managed service identity.
   */
  public readonly identity?: ManagedServiceIdentity;

  /**
   * Site configuration.
   */
  public readonly siteConfig?: FunctionAppSiteConfig;

  /**
   * Virtual network subnet ID.
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
   * Daily memory time quota.
   */
  public readonly dailyMemoryTimeQuota?: number;

  /**
   * Tags applied to the Function App.
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
   * Function App resource ID (alias for resourceId).
   */
  public readonly functionAppId: string;

  /**
   * Default hostname of the Function App.
   *
   * @remarks
   * Format: {siteName}.azurewebsites.net
   */
  public readonly defaultHostName: string;

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
  constructor(scope: Construct, id: string, props: ArmFunctionAppProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.siteName = props.siteName;
    this.name = props.siteName;
    this.location = props.location;
    this.serverFarmId = props.serverFarmId;
    this.kind = props.kind;
    this.storageAccountConnectionString = props.storageAccountConnectionString;
    this.runtime = props.runtime;
    this.runtimeVersion = props.runtimeVersion;
    this.identity = props.identity;
    this.siteConfig = props.siteConfig;
    this.virtualNetworkSubnetId = props.virtualNetworkSubnetId;
    this.httpsOnly = props.httpsOnly;
    this.clientAffinityEnabled = props.clientAffinityEnabled;
    this.keyVaultReferenceIdentity = props.keyVaultReferenceIdentity;
    this.dailyMemoryTimeQuota = props.dailyMemoryTimeQuota;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/${this.siteName}`;
    this.functionAppId = this.resourceId;
    this.defaultHostName = `${this.siteName}.azurewebsites.net`;
  }

  /**
   * Validates Function App properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  protected validateProps(props: ArmFunctionAppProps): void {
    // Validate site name
    if (!props.siteName || props.siteName.trim() === '') {
      throw new Error('Function App name cannot be empty');
    }

    if (props.siteName.length < 2 || props.siteName.length > 60) {
      throw new Error(
        `Function App name must be 2-60 characters (got ${props.siteName.length})`
      );
    }

    // Validate name pattern: ^[a-zA-Z0-9][a-zA-Z0-9-]{0,58}[a-zA-Z0-9]$
    const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,58}[a-zA-Z0-9]$/;
    if (!namePattern.test(props.siteName)) {
      throw new Error(
        `Function App name must start and end with alphanumeric characters and contain only alphanumeric characters and hyphens (got: ${props.siteName})`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate server farm ID
    if (!props.serverFarmId || props.serverFarmId.trim() === '') {
      throw new Error('Server farm ID cannot be empty');
    }

    // Validate storage account connection string
    if (!props.storageAccountConnectionString || props.storageAccountConnectionString.trim() === '') {
      throw new Error('Storage account connection string cannot be empty');
    }
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): ArmResource {
    const properties: any = {
      serverFarmId: this.serverFarmId,
    };

    // Add site config
    const siteConfig: any = {};

    // Always add storage account connection string for Function Apps
    const appSettings: NameValuePair[] = [
      {
        name: 'AzureWebJobsStorage',
        value: this.storageAccountConnectionString,
      },
      {
        name: 'FUNCTIONS_EXTENSION_VERSION',
        value: '~4',
      },
    ];

    // Add runtime configuration
    if (this.runtime) {
      appSettings.push({
        name: 'FUNCTIONS_WORKER_RUNTIME',
        value: this.runtime,
      });
    }

    // Merge with user-provided app settings
    if (this.siteConfig?.appSettings) {
      appSettings.push(...this.siteConfig.appSettings);
    }

    siteConfig.appSettings = appSettings;

    // Add other site config properties
    if (this.siteConfig?.alwaysOn !== undefined) {
      siteConfig.alwaysOn = this.siteConfig.alwaysOn;
    }

    if (this.siteConfig?.http20Enabled !== undefined) {
      siteConfig.http20Enabled = this.siteConfig.http20Enabled;
    }

    if (this.siteConfig?.ftpsState) {
      siteConfig.ftpsState = this.siteConfig.ftpsState;
    }

    if (this.siteConfig?.minTlsVersion) {
      siteConfig.minTlsVersion = this.siteConfig.minTlsVersion;
    }

    if (this.siteConfig?.cors) {
      siteConfig.cors = this.siteConfig.cors;
    }

    if (this.siteConfig?.vnetRouteAllEnabled !== undefined) {
      siteConfig.vnetRouteAllEnabled = this.siteConfig.vnetRouteAllEnabled;
    }

    if (this.siteConfig?.httpLoggingEnabled !== undefined) {
      siteConfig.httpLoggingEnabled = this.siteConfig.httpLoggingEnabled;
    }

    if (this.siteConfig?.use32BitWorkerProcess !== undefined) {
      siteConfig.use32BitWorkerProcess = this.siteConfig.use32BitWorkerProcess;
    }

    if (this.siteConfig?.webSocketsEnabled !== undefined) {
      siteConfig.webSocketsEnabled = this.siteConfig.webSocketsEnabled;
    }

    if (this.siteConfig?.healthCheckPath) {
      siteConfig.healthCheckPath = this.siteConfig.healthCheckPath;
    }

    properties.siteConfig = siteConfig;

    // Add optional properties
    if (this.virtualNetworkSubnetId) {
      properties.virtualNetworkSubnetId = this.virtualNetworkSubnetId;
    }

    if (this.httpsOnly !== undefined) {
      properties.httpsOnly = this.httpsOnly;
    }

    if (this.clientAffinityEnabled !== undefined) {
      properties.clientAffinityEnabled = this.clientAffinityEnabled;
    }

    if (this.keyVaultReferenceIdentity) {
      properties.keyVaultReferenceIdentity = this.keyVaultReferenceIdentity;
    }

    if (this.dailyMemoryTimeQuota !== undefined) {
      properties.dailyMemoryTimeQuota = this.dailyMemoryTimeQuota;
    }

    // Build base template
    const template: any = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.siteName,
      location: this.location,
      kind: this.kind,
      properties,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    };

    // Add identity if provided
    if (this.identity) {
      template.identity = this.identity;
    }

    return template;
  }
}
