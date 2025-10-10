/**
 * Type definitions for Azure Functions constructs.
 *
 * @packageDocumentation
 */

import type { IServerFarm } from './server-farm-types';
import type { ManagedServiceIdentity } from '@atakora/lib';

/**
 * Function runtime for Azure Functions.
 */
export enum FunctionRuntime {
  NODE = 'node',
  PYTHON = 'python',
  DOTNET = 'dotnet',
  JAVA = 'java',
  POWERSHELL = 'powershell',
  CUSTOM = 'custom',
}

/**
 * Authentication level for HTTP triggers.
 */
export enum AuthLevel {
  ANONYMOUS = 'anonymous',
  FUNCTION = 'function',
  ADMIN = 'admin',
}

/**
 * HTTP methods.
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

/**
 * FTPS state for the Function App.
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
 * HTTP trigger configuration.
 */
export interface HttpTriggerConfig {
  readonly type: 'http';

  /**
   * API route template.
   *
   * @remarks
   * Example: 'api/users/{userId}'
   */
  readonly route?: string;

  /**
   * Allowed HTTP methods.
   *
   * @remarks
   * Defaults to all methods if not specified.
   */
  readonly methods?: HttpMethod[];

  /**
   * Authentication level.
   *
   * @remarks
   * Defaults to AuthLevel.FUNCTION.
   */
  readonly authLevel?: AuthLevel;

  /**
   * Webhook type.
   */
  readonly webHookType?: string;
}

/**
 * Timer trigger configuration.
 */
export interface TimerTriggerConfig {
  readonly type: 'timer';

  /**
   * CRON expression or TimeSpan format.
   *
   * @remarks
   * CRON format: {second} {minute} {hour} {day} {month} {day-of-week}
   * Example: '0 */5 * * * *' (every 5 minutes)
   *
   * TimeSpan format: hh:mm:ss
   * Example: '00:05:00' (every 5 minutes)
   */
  readonly schedule: string;

  /**
   * Run on startup.
   *
   * @remarks
   * If true, function runs immediately when deployed.
   * Defaults to false.
   */
  readonly runOnStartup?: boolean;

  /**
   * Use monitor for schedule status.
   *
   * @remarks
   * Defaults to true.
   */
  readonly useMonitor?: boolean;
}

/**
 * Union type for all trigger configurations.
 */
export type TriggerConfig = HttpTriggerConfig | TimerTriggerConfig;

/**
 * Function App site configuration.
 */
export interface FunctionAppSiteConfig {
  /**
   * App settings (name-value pairs).
   */
  readonly appSettings?: NameValuePair[];

  /**
   * Always on feature enabled.
   *
   * @remarks
   * Keeps the app loaded even when there's no traffic.
   * Not available in Consumption tier.
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
}

/**
 * Properties for ArmFunctionApp (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Web/sites ARM resource with kind='functionapp'.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-01-01
 *
 * @example
 * ```typescript
 * const props: ArmFunctionAppProps = {
 *   siteName: 'func-app-001',
 *   location: 'eastus',
 *   serverFarmId: '/subscriptions/.../serverfarms/asp-001',
 *   kind: 'functionapp',
 *   storageAccountConnectionString: 'DefaultEndpointsProtocol=https;...',
 *   runtime: FunctionRuntime.NODE,
 *   runtimeVersion: '18'
 * };
 * ```
 */
export interface ArmFunctionAppProps {
  /**
   * Function App (site) name.
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
   * Azure region where the Function App will be created.
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
   * Kind of Function App.
   *
   * @remarks
   * - 'functionapp' for Windows Function App
   * - 'functionapp,linux' for Linux Function App
   */
  readonly kind: 'functionapp' | 'functionapp,linux';

  /**
   * Storage account connection string.
   *
   * @remarks
   * Required for Azure Functions. Used for storing function metadata and state.
   */
  readonly storageAccountConnectionString: string;

  /**
   * Function runtime.
   *
   * @remarks
   * Determines the language runtime for functions.
   */
  readonly runtime?: FunctionRuntime;

  /**
   * Runtime version.
   *
   * @remarks
   * Version of the runtime (e.g., '18' for Node.js 18).
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
   * Daily memory time quota.
   *
   * @remarks
   * Only applicable to Consumption plan.
   * Value in MB-seconds.
   */
  readonly dailyMemoryTimeQuota?: number;

  /**
   * Tags to apply to the Function App.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for individual Azure Function (L1 construct).
 *
 * @remarks
 * Maps to Microsoft.Web/sites/functions ARM sub-resource.
 *
 * ARM API Version: 2023-01-01
 */
export interface ArmFunctionProps {
  /**
   * Function name.
   *
   * @remarks
   * Must be unique within the Function App.
   */
  readonly functionName: string;

  /**
   * Trigger configuration.
   */
  readonly trigger: TriggerConfig;

  /**
   * Function code (inline).
   *
   * @remarks
   * For inline deployment, this contains the Base64-encoded function code.
   * Must be less than 4KB when encoded.
   */
  readonly inlineCode?: string;

  /**
   * Package URI.
   *
   * @remarks
   * For external deployment, this points to the function package location.
   * Typically a SAS URL to a zip file in blob storage.
   */
  readonly packageUri?: string;

  /**
   * function.json configuration.
   *
   * @remarks
   * Direct ARM representation of the function configuration.
   */
  readonly config?: Record<string, any>;
}

/**
 * Interface for Function App reference.
 *
 * @remarks
 * Allows resources to reference a Function App without depending on the construct class.
 */
export interface IFunctionApp {
  /**
   * Name of the Function App.
   */
  readonly functionAppName: string;

  /**
   * Location of the Function App.
   */
  readonly location: string;

  /**
   * Resource ID of the Function App.
   */
  readonly functionAppId: string;

  /**
   * Default hostname of the Function App.
   */
  readonly defaultHostName: string;
}

/**
 * Interface for individual Azure Function reference.
 */
export interface IAzureFunction {
  /**
   * Name of the function.
   */
  readonly functionName: string;

  /**
   * Resource ID of the function.
   */
  readonly functionId: string;

  /**
   * Trigger URL (for HTTP triggers).
   */
  readonly triggerUrl?: string;
}
