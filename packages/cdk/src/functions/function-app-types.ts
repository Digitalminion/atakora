/**
 * Type definitions for Function App constructs.
 *
 * @packageDocumentation
 */

import type { FunctionRuntime } from './types';

/**
 * Managed service identity types.
 */
export enum ManagedServiceIdentityType {
  NONE = 'None',
  SYSTEM_ASSIGNED = 'SystemAssigned',
  USER_ASSIGNED = 'UserAssigned',
  SYSTEM_ASSIGNED_USER_ASSIGNED = 'SystemAssigned,UserAssigned',
}

/**
 * Managed service identity configuration.
 */
export interface ManagedServiceIdentity {
  readonly type: ManagedServiceIdentityType;
  readonly userAssignedIdentities?: Record<string, {}>;
}

/**
 * CORS settings for Function App.
 */
export interface CorsSettings {
  readonly allowedOrigins: string[];
  readonly allowCredentials?: boolean;
  readonly allowedHeaders?: string[];
  readonly exposedHeaders?: string[];
  readonly maxAge?: number;
}

/**
 * VNet configuration for Function App.
 */
export interface VNetConfiguration {
  readonly virtualNetworkSubnetId: string;
  readonly swiftSupported?: boolean;
}

/**
 * Function App site configuration.
 */
export interface FunctionAppSiteConfig {
  readonly alwaysOn?: boolean;
  readonly cors?: CorsSettings;
  readonly http20Enabled?: boolean;
  readonly minTlsVersion?: string;
  readonly ftpsState?: 'AllAllowed' | 'FtpsOnly' | 'Disabled';
  readonly use32BitWorkerProcess?: boolean;
  readonly webSocketsEnabled?: boolean;
  readonly appSettings?: Array<{ name: string; value: string }>;
}

/**
 * Function App runtime configuration.
 */
export interface FunctionAppRuntime {
  readonly name: FunctionRuntime;
  readonly version: string;
  readonly isLinux?: boolean;
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
 *   siteName: 'func-authr-001',
 *   location: 'eastus',
 *   serverFarmId: '/subscriptions/.../serverfarms/asp-authr-001',
 *   kind: 'functionapp',
 *   storageAccountConnectionString: 'DefaultEndpointsProtocol=https;...',
 *   runtime: { name: FunctionRuntime.NODE, version: '18' }
 * };
 * ```
 */
export interface ArmFunctionAppProps {
  /**
   * Function App site name.
   *
   * @remarks
   * - Must be 2-60 characters
   * - Alphanumeric and hyphens only
   * - Must be globally unique across Azure
   * - Pattern: ^[a-zA-Z0-9-]{2,60}$
   */
  readonly siteName: string;

  /**
   * Azure region where the Function App will be created.
   */
  readonly location: string;

  /**
   * Resource ID of the App Service Plan.
   */
  readonly serverFarmId: string;

  /**
   * Kind of site.
   *
   * @remarks
   * - 'functionapp' for Windows-based Function App
   * - 'functionapp,linux' for Linux-based Function App
   */
  readonly kind: 'functionapp' | 'functionapp,linux';

  /**
   * Storage account connection string.
   *
   * @remarks
   * Required for Azure Functions. Used for state management and logging.
   */
  readonly storageAccountConnectionString: string;

  /**
   * Runtime configuration.
   */
  readonly runtime?: FunctionAppRuntime;

  /**
   * Runtime version.
   *
   * @remarks
   * Depends on the runtime (e.g., '18' for Node.js 18).
   */
  readonly runtimeVersion?: string;

  /**
   * Managed service identity configuration.
   */
  readonly identity?: ManagedServiceIdentity;

  /**
   * Site configuration.
   */
  readonly siteConfig?: FunctionAppSiteConfig;

  /**
   * Virtual network subnet ID for VNet integration.
   */
  readonly virtualNetworkSubnetId?: string;

  /**
   * Enable HTTPS only.
   *
   * @remarks
   * Defaults to true for security.
   */
  readonly httpsOnly?: boolean;

  /**
   * Client affinity enabled.
   */
  readonly clientAffinityEnabled?: boolean;

  /**
   * Tags to apply to the Function App.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for FunctionApp (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - requires plan and storage
 * const functionApp = new FunctionApp(resourceGroup, 'Api', {
 *   plan: appServicePlan,
 *   storageAccount: storage
 * });
 *
 * // With custom properties
 * const functionApp = new FunctionApp(resourceGroup, 'Api', {
 *   plan: appServicePlan,
 *   storageAccount: storage,
 *   runtime: FunctionRuntime.NODE,
 *   runtimeVersion: '18',
 *   environment: {
 *     NODE_ENV: 'production'
 *   }
 * });
 * ```
 */
export interface FunctionAppProps {
  /**
   * Function App name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   * - Format: `func-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `func-dp-authr-api-np-eus-01`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly functionAppName?: string;

  /**
   * App Service Plan reference.
   *
   * @remarks
   * Required. The Function App will be hosted on this plan.
   */
  readonly plan: { readonly planId: string; readonly location: string };

  /**
   * Storage Account reference.
   *
   * @remarks
   * Required for Azure Functions. Used for state management and logging.
   */
  readonly storageAccount: { readonly storageAccountId: string; readonly storageAccountName: string };

  /**
   * Runtime.
   *
   * @remarks
   * Defaults to NODE.
   */
  readonly runtime?: FunctionRuntime;

  /**
   * Runtime version.
   *
   * @remarks
   * Defaults to '18' for Node.js.
   */
  readonly runtimeVersion?: string;

  /**
   * Azure region where the Function App will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * Global environment variables.
   *
   * @remarks
   * These environment variables apply to all functions in the app.
   * Individual functions can add or override these values.
   */
  readonly environment?: Record<string, string>;

  /**
   * Managed service identity configuration.
   */
  readonly identity?: ManagedServiceIdentity;

  /**
   * VNet configuration for private networking.
   */
  readonly vnetConfig?: VNetConfiguration;

  /**
   * Daily memory time quota (MB-seconds).
   *
   * @remarks
   * Only applies to Consumption plan. Set to 0 for unlimited (on Premium/Dedicated).
   */
  readonly dailyMemoryTimeQuota?: number;

  /**
   * Pre-warmed instance count.
   *
   * @remarks
   * Only applies to Premium plan. Number of instances to keep warm.
   */
  readonly preWarmedInstanceCount?: number;

  /**
   * Maximum elastic worker count.
   *
   * @remarks
   * Maximum number of instances for auto-scaling.
   */
  readonly maximumElasticWorkerCount?: number;

  /**
   * Global function timeout.
   *
   * @remarks
   * Applies to all functions unless overridden per function.
   */
  readonly functionTimeout?: { readonly seconds: number };

  /**
   * Health check path.
   *
   * @remarks
   * Path for health check endpoint (e.g., '/api/health').
   */
  readonly healthCheckPath?: string;

  /**
   * CORS settings.
   */
  readonly cors?: CorsSettings;

  /**
   * Tags to apply to the Function App.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
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
   * Resource ID of the Function App.
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
   * Managed service identity (if enabled).
   *
   * @remarks
   * FunctionApp extends GrantableResource which provides identity management.
   * Access the identity through the class, not this interface property.
   * This property is omitted from the interface to avoid conflicts with
   * the protected identity property inherited from GrantableResource.
   */
  // readonly identity?: ManagedServiceIdentity; // Commented out - provided by GrantableResource
}
