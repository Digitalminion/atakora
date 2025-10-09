/**
 * Type definitions for App Service (Web App) constructs.
 *
 * @packageDocumentation
 */

import type { IServerFarm } from './server-farm-types';
import type { ManagedServiceIdentity } from '@atakora/lib';
import { ManagedIdentityType } from '@atakora/lib';

/**
 * Kind of App Service.
 */
export enum AppServiceKind {
  APP = 'app',
  FUNCTIONAPP = 'functionapp',
  API = 'api',
}

/**
 * Managed service identity type.
 * @deprecated Use ManagedIdentityType from '@atakora/lib' instead
 */
export { ManagedIdentityType };

/**
 * FTPS state for the App Service.
 */
export enum FtpsState {
  ALL_ALLOWED = 'AllAllowed',
  FTPS_ONLY = 'FtpsOnly',
  DISABLED = 'Disabled',
}

/**
 * Minimum TLS version.
 */
export enum MinTlsVersion {
  TLS_1_0 = '1.0',
  TLS_1_1 = '1.1',
  TLS_1_2 = '1.2',
  TLS_1_3 = '1.3',
}

/**
 * Connection string type.
 */
export enum ConnectionStringType {
  MYSQL = 'MySql',
  SQL_SERVER = 'SQLServer',
  SQL_AZURE = 'SQLAzure',
  CUSTOM = 'Custom',
  NOTIFICATION_HUB = 'NotificationHub',
  SERVICE_BUS = 'ServiceBus',
  EVENT_HUB = 'EventHub',
  API_HUB = 'ApiHub',
  DOC_DB = 'DocDb',
  REDIS_CACHE = 'RedisCache',
  POSTGRESQL = 'PostgreSQL',
}

/**
 * Managed service identity configuration.
 * @deprecated Use ManagedServiceIdentity from '@atakora/lib' instead
 */
export type { ManagedServiceIdentity };

/**
 * Name-value pair for app settings.
 */
export interface NameValuePair {
  /**
   * Setting name.
   */
  readonly name: string;

  /**
   * Setting value.
   */
  readonly value: string;
}

/**
 * Connection string information.
 */
export interface ConnectionStringInfo {
  /**
   * Connection string name.
   */
  readonly name: string;

  /**
   * Connection string value.
   */
  readonly value: string;

  /**
   * Connection string type.
   */
  readonly type: ConnectionStringType;
}

/**
 * Virtual network subnet resource ID for VNet integration.
 */
export interface VirtualNetworkSubnetResourceId {
  /**
   * Subnet resource ID.
   */
  readonly id: string;
}

/**
 * CORS configuration.
 */
export interface CorsSettings {
  /**
   * List of allowed origins.
   */
  readonly allowedOrigins?: string[];

  /**
   * Whether to support credentials.
   */
  readonly supportCredentials?: boolean;
}

/**
 * IP security restriction.
 */
export interface IpSecurityRestriction {
  /**
   * IP address or CIDR range.
   */
  readonly ipAddress?: string;

  /**
   * Subnet resource ID.
   */
  readonly vnetSubnetResourceId?: string;

  /**
   * Action (Allow or Deny).
   */
  readonly action?: string;

  /**
   * Priority.
   */
  readonly priority?: number;

  /**
   * Rule name.
   */
  readonly name?: string;

  /**
   * Description.
   */
  readonly description?: string;
}

/**
 * Site configuration.
 */
export interface SiteConfig {
  /**
   * .NET Framework version.
   *
   * @remarks
   * Example: 'v4.0', 'v6.0'
   */
  readonly netFrameworkVersion?: string;

  /**
   * Linux FX version.
   *
   * @remarks
   * Example: 'PYTHON|3.11', 'NODE|18-lts', 'DOTNETCORE|7.0'
   */
  readonly linuxFxVersion?: string;

  /**
   * Windows FX version.
   */
  readonly windowsFxVersion?: string;

  /**
   * App settings (name-value pairs).
   */
  readonly appSettings?: NameValuePair[];

  /**
   * Connection strings.
   */
  readonly connectionStrings?: ConnectionStringInfo[];

  /**
   * Always on feature enabled.
   *
   * @remarks
   * Keeps the app loaded even when there's no traffic.
   * Not available in Free or Shared tiers.
   */
  readonly alwaysOn?: boolean;

  /**
   * HTTP 2.0 enabled.
   */
  readonly http20Enabled?: boolean;

  /**
   * FTPS state.
   */
  readonly ftpsState?: FtpsState;

  /**
   * Minimum TLS version.
   */
  readonly minTlsVersion?: MinTlsVersion;

  /**
   * CORS settings.
   */
  readonly cors?: CorsSettings;

  /**
   * VNet route all enabled.
   *
   * @remarks
   * Routes all outbound traffic through the VNet.
   */
  readonly vnetRouteAllEnabled?: boolean;

  /**
   * HTTP logging enabled.
   */
  readonly httpLoggingEnabled?: boolean;

  /**
   * Detailed error logging enabled.
   */
  readonly detailedErrorLoggingEnabled?: boolean;

  /**
   * IP security restrictions.
   */
  readonly ipSecurityRestrictions?: IpSecurityRestriction[];

  /**
   * SCM IP security restrictions.
   */
  readonly scmIpSecurityRestrictions?: IpSecurityRestriction[];

  /**
   * Use 32-bit worker process.
   */
  readonly use32BitWorkerProcess?: boolean;

  /**
   * Web sockets enabled.
   */
  readonly webSocketsEnabled?: boolean;

  /**
   * Health check path.
   */
  readonly healthCheckPath?: string;

  /**
   * Public network access.
   */
  readonly publicNetworkAccess?: string;
}

/**
 * Properties for ArmSites (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Web/sites ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-01-01
 *
 * @example
 * ```typescript
 * const props: ArmSitesProps = {
 *   siteName: 'app-authr-001',
 *   location: 'eastus',
 *   serverFarmId: '/subscriptions/.../serverfarms/asp-001',
 *   kind: AppServiceKind.APP,
 *   identity: {
 *     type: ManagedIdentityType.SYSTEM_ASSIGNED
 *   },
 *   httpsOnly: true
 * };
 * ```
 */
export interface ArmSitesProps {
  /**
   * App Service (site) name.
   *
   * @remarks
   * - Must be 2-60 characters
   * - Alphanumeric and hyphens only
   * - Cannot start or end with hyphen
   * - Must be globally unique (for azurewebsites.net domain)
   * - Pattern: ^[a-zA-Z0-9][a-zA-Z0-9-]{0,58}[a-zA-Z0-9]$
   */
  readonly siteName: string;

  /**
   * Azure region where the App Service will be created.
   */
  readonly location: string;

  /**
   * App Service Plan resource ID.
   *
   * @remarks
   * Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/serverfarms/{planName}
   */
  readonly serverFarmId: string;

  /**
   * Kind of App Service.
   *
   * @remarks
   * - 'app' for Web App
   * - 'functionapp' for Function App
   * - 'api' for API App
   * - Can be combined with 'linux' (e.g., 'app,linux')
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
   *
   * @remarks
   * Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}/subnets/{subnetName}
   */
  readonly virtualNetworkSubnetId?: string;

  /**
   * HTTPS only enabled.
   *
   * @remarks
   * Redirects all HTTP traffic to HTTPS.
   * Recommended to be true for production apps.
   */
  readonly httpsOnly?: boolean;

  /**
   * Client affinity enabled.
   */
  readonly clientAffinityEnabled?: boolean;

  /**
   * Key Vault reference identity.
   *
   * @remarks
   * Identity to use for Key Vault references.
   * Can be 'SystemAssigned' or a user-assigned identity resource ID.
   */
  readonly keyVaultReferenceIdentity?: string;

  /**
   * Storage account required.
   */
  readonly storageAccountRequired?: boolean;

  /**
   * Tags to apply to the App Service.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for Sites (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const app = new Sites(resourceGroup, 'WebApp', {
 *   serverFarmId: plan.planId
 * });
 *
 * // With custom properties
 * const app = new Sites(resourceGroup, 'WebApp', {
 *   siteName: 'my-web-app',
 *   serverFarmId: plan.planId,
 *   linuxFxVersion: 'PYTHON|3.11',
 *   httpsOnly: true
 * });
 * ```
 */
export interface SitesProps {
  /**
   * App Service (site) name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   * - Format: `app-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `app-dp-authr-api-np-eus-01`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly siteName?: string;

  /**
   * Azure region where the App Service will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * App Service Plan reference or resource ID.
   *
   * @remarks
   * Can be:
   * - IServerFarm interface (from ServerFarms construct)
   * - String resource ID
   */
  readonly serverFarmId: IServerFarm | string;

  /**
   * Kind of App Service.
   *
   * @remarks
   * Defaults to 'app' (Web App).
   */
  readonly kind?: AppServiceKind;

  /**
   * Managed service identity.
   *
   * @remarks
   * Defaults to { type: ManagedIdentityType.SYSTEM_ASSIGNED }.
   */
  readonly identity?: ManagedServiceIdentity;

  /**
   * Linux FX version.
   *
   * @remarks
   * Example: 'PYTHON|3.11', 'NODE|18-lts', 'DOTNETCORE|7.0'
   */
  readonly linuxFxVersion?: string;

  /**
   * .NET Framework version.
   */
  readonly netFrameworkVersion?: string;

  /**
   * Windows FX version.
   */
  readonly windowsFxVersion?: string;

  /**
   * App settings (name-value pairs).
   */
  readonly appSettings?: NameValuePair[];

  /**
   * Connection strings.
   */
  readonly connectionStrings?: ConnectionStringInfo[];

  /**
   * Always on feature enabled.
   *
   * @remarks
   * Defaults to false.
   * Set to true for production apps.
   */
  readonly alwaysOn?: boolean;

  /**
   * HTTP 2.0 enabled.
   *
   * @remarks
   * Defaults to true.
   */
  readonly http20Enabled?: boolean;

  /**
   * FTPS state.
   *
   * @remarks
   * Defaults to FtpsState.DISABLED.
   */
  readonly ftpsState?: FtpsState;

  /**
   * Minimum TLS version.
   *
   * @remarks
   * Defaults to MinTlsVersion.TLS_1_2.
   */
  readonly minTlsVersion?: MinTlsVersion;

  /**
   * CORS settings.
   */
  readonly cors?: CorsSettings;

  /**
   * VNet route all enabled.
   */
  readonly vnetRouteAllEnabled?: boolean;

  /**
   * Virtual network subnet ID for VNet integration.
   */
  readonly virtualNetworkSubnetId?: string;

  /**
   * HTTPS only enabled.
   *
   * @remarks
   * Defaults to true.
   */
  readonly httpsOnly?: boolean;

  /**
   * HTTP logging enabled.
   */
  readonly httpLoggingEnabled?: boolean;

  /**
   * Detailed error logging enabled.
   */
  readonly detailedErrorLoggingEnabled?: boolean;

  /**
   * IP security restrictions.
   */
  readonly ipSecurityRestrictions?: IpSecurityRestriction[];

  /**
   * SCM IP security restrictions.
   */
  readonly scmIpSecurityRestrictions?: IpSecurityRestriction[];

  /**
   * Health check path.
   */
  readonly healthCheckPath?: string;

  /**
   * Public network access.
   */
  readonly publicNetworkAccess?: string;

  /**
   * Key Vault reference identity.
   */
  readonly keyVaultReferenceIdentity?: string;

  /**
   * Tags to apply to the App Service.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for App Service reference.
 *
 * @remarks
 * Allows resources to reference an App Service without depending on the construct class.
 */
export interface ISite {
  /**
   * Name of the App Service.
   */
  readonly siteName: string;

  /**
   * Location of the App Service.
   */
  readonly location: string;

  /**
   * Resource ID of the App Service.
   */
  readonly siteId: string;

  /**
   * Default hostname of the App Service.
   */
  readonly defaultHostName: string;
}
