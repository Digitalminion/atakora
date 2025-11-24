/**
 * Type definitions for backend defaults system
 *
 * Defines the structure of default configurations for different environments
 * and the builder patterns for infrastructure components.
 *
 * @module @atakora/component/backend/defaults
 */

/**
 * Environment types supported by the backend system
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Complete backend defaults structure
 * Contains all infrastructure component defaults
 */
export interface BackendDefaults {
  readonly storage: StorageDefaults;
  readonly compute: ComputeDefaults;
  readonly network?: NetworkDefaults;
  readonly monitoring?: MonitoringDefaults;
  readonly performance?: PerformanceDefaults;
}

/**
 * Storage component defaults
 */
export interface StorageDefaults {
  readonly account: StorageAccountConfig;
  readonly database: DatabaseConfig;
}

/**
 * Compute component defaults
 */
export interface ComputeDefaults {
  readonly functionApp: FunctionAppConfig;
}

/**
 * Network component defaults (optional)
 */
export interface NetworkDefaults {
  readonly vnet: VNetConfig;
  readonly waf?: WafConfig;
  readonly ddos?: DdosConfig;
}

/**
 * Monitoring component defaults (optional)
 */
export interface MonitoringDefaults {
  readonly appInsights: AppInsightsConfig;
  readonly logAnalytics?: LogAnalyticsConfig;
  readonly alerts?: AlertsConfig;
}

/**
 * Performance component defaults (optional)
 */
export interface PerformanceDefaults {
  readonly cdn?: CdnConfig;
  readonly cache?: CacheConfig;
  readonly rateLimit?: RateLimitConfig;
}

// ============================================================================
// Storage Configurations
// ============================================================================

/**
 * Storage Account SKU types
 */
export type StorageSkuType =
  | 'Standard_LRS' // Locally redundant storage
  | 'Standard_GRS' // Geo-redundant storage
  | 'Standard_RAGRS' // Read-access geo-redundant storage
  | 'Standard_ZRS' // Zone-redundant storage
  | 'Premium_LRS'; // Premium locally redundant storage

/**
 * Storage Account tier
 */
export type StorageTier = 'Hot' | 'Cool' | 'Archive';

/**
 * Storage Account configuration
 */
export interface StorageAccountConfig {
  readonly name?: string;
  readonly sku: StorageSkuType;
  readonly tier: StorageTier;
  readonly encryption?: 'Microsoft.Storage' | 'Microsoft.KeyVault';
  readonly networkRules?: NetworkRulesConfig;
  readonly enableHttpsOnly?: boolean;
  readonly minimumTlsVersion?: '1.0' | '1.1' | '1.2';
}

/**
 * Network rules for storage account
 */
export interface NetworkRulesConfig {
  readonly defaultAction: 'Allow' | 'Deny';
  readonly allowAzureServices: boolean;
  readonly ipRules?: readonly string[];
  readonly virtualNetworkRules?: readonly string[];
}

/**
 * Cosmos DB throughput modes
 */
export type ThroughputMode = 'Serverless' | 'Provisioned' | 'Autoscale';

/**
 * Cosmos DB consistency levels
 */
export type ConsistencyLevel =
  | 'Eventual'
  | 'ConsistentPrefix'
  | 'Session'
  | 'BoundedStaleness'
  | 'Strong';

/**
 * Database (Cosmos DB) configuration
 */
export interface DatabaseConfig {
  readonly name?: string;
  readonly mode: ThroughputMode;
  readonly throughput?: ThroughputConfig;
  readonly consistency: ConsistencyLevel;
  readonly backup?: BackupConfig;
  readonly multiRegion?: readonly string[];
  readonly enableAnalyticalStore?: boolean;
  readonly publicNetworkAccess?: 'Enabled' | 'Disabled';
}

/**
 * Throughput configuration for Cosmos DB
 */
export interface ThroughputConfig {
  readonly min?: number;
  readonly max?: number;
  readonly default?: number;
}

/**
 * Backup configuration
 */
export interface BackupConfig {
  readonly enabled: boolean;
  readonly type?: 'Periodic' | 'Continuous';
  readonly retention?: number; // days
  readonly interval?: number; // hours
}

// ============================================================================
// Compute Configurations
// ============================================================================

/**
 * Function App hosting plan types
 */
export type FunctionPlanType = 'Consumption' | 'Premium' | 'Dedicated';

/**
 * Premium plan SKU sizes
 */
export type PremiumPlanSku = 'EP1' | 'EP2' | 'EP3';

/**
 * Dedicated plan SKU sizes
 */
export type DedicatedPlanSku = 'B1' | 'B2' | 'B3' | 'S1' | 'S2' | 'S3' | 'P1v2' | 'P2v2' | 'P3v2';

/**
 * Function runtime types
 */
export type FunctionRuntime = 'node' | 'dotnet' | 'python' | 'java' | 'powershell';

/**
 * Function App configuration
 */
export interface FunctionAppConfig {
  readonly name?: string;
  readonly plan: FunctionPlanConfig;
  readonly runtime: RuntimeConfig;
  readonly alwaysOn: boolean;
  readonly minInstances?: number;
  readonly maxInstances?: number;
  readonly healthCheck?: string;
  readonly cors?: CorsConfig;
}

/**
 * Function plan configuration
 */
export interface FunctionPlanConfig {
  readonly type: FunctionPlanType;
  readonly sku?: PremiumPlanSku | DedicatedPlanSku;
}

/**
 * Runtime configuration
 */
export interface RuntimeConfig {
  readonly runtime: FunctionRuntime;
  readonly version: string;
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  readonly allowedOrigins: readonly string[];
  readonly supportCredentials?: boolean;
}

// ============================================================================
// Network Configurations
// ============================================================================

/**
 * Virtual Network configuration
 */
export interface VNetConfig {
  readonly name?: string;
  readonly addressSpace: string;
  readonly subnets: readonly SubnetConfig[];
  readonly enableDdosProtection?: boolean;
}

/**
 * Subnet configuration
 */
export interface SubnetConfig {
  readonly name: string;
  readonly range: string;
  readonly serviceEndpoints?: readonly string[];
}

/**
 * Web Application Firewall mode
 */
export type WafMode = 'Detection' | 'Prevention';

/**
 * WAF configuration
 */
export interface WafConfig {
  readonly enabled: boolean;
  readonly mode: WafMode;
  readonly ruleSet: WafRuleSetConfig;
}

/**
 * WAF rule set configuration
 */
export interface WafRuleSetConfig {
  readonly type: 'OWASP' | 'Microsoft_BotManagerRuleSet';
  readonly version: string;
}

/**
 * DDoS protection configuration
 */
export interface DdosConfig {
  readonly enabled: boolean;
  readonly plan: 'Basic' | 'Standard';
}

// ============================================================================
// Monitoring Configurations
// ============================================================================

/**
 * Application Insights configuration
 */
export interface AppInsightsConfig {
  readonly name?: string;
  readonly samplingPercentage: number;
  readonly retentionDays?: number;
  readonly enableLiveMetrics?: boolean;
  readonly enableProfiler?: boolean;
  readonly enableSnapshotDebugger?: boolean;
}

/**
 * Log Analytics workspace SKU
 */
export type LogAnalyticsSku = 'Free' | 'PerNode' | 'PerGB2018' | 'Standalone' | 'Premium';

/**
 * Log Analytics configuration
 */
export interface LogAnalyticsConfig {
  readonly name?: string;
  readonly sku: LogAnalyticsSku;
  readonly retentionDays: number;
}

/**
 * Alerts configuration
 */
export interface AlertsConfig {
  readonly responseTime?: ThresholdConfig;
  readonly errorRate?: ThresholdConfig;
  readonly availability?: ThresholdConfig;
  readonly customMetrics?: readonly CustomMetricAlertConfig[];
}

/**
 * Threshold configuration for alerts
 */
export interface ThresholdConfig {
  readonly warning: number;
  readonly critical: number;
}

/**
 * Custom metric alert configuration
 */
export interface CustomMetricAlertConfig {
  readonly name: string;
  readonly metric: string;
  readonly threshold: ThresholdConfig;
  readonly aggregation: 'Average' | 'Minimum' | 'Maximum' | 'Total' | 'Count';
}

// ============================================================================
// Performance Configurations
// ============================================================================

/**
 * CDN profile types
 */
export type CdnProfile =
  | 'Standard_Microsoft'
  | 'Standard_Akamai'
  | 'Standard_Verizon'
  | 'Premium_Verizon';

/**
 * CDN caching behavior
 */
export type CachingBehavior = 'BypassCache' | 'Override' | 'SetIfMissing' | 'Standard';

/**
 * CDN configuration
 */
export interface CdnConfig {
  readonly enabled: boolean;
  readonly profile: CdnProfile;
  readonly caching: CachingBehavior;
  readonly compression?: boolean;
  readonly queryStringCaching?: 'IgnoreQueryString' | 'UseQueryString' | 'NotSet';
}

/**
 * Redis cache SKU family
 */
export type CacheSkuFamily = 'C' | 'P';

/**
 * Redis cache SKU capacity
 */
export type CacheSkuCapacity = '0' | '1' | '2' | '3' | '4' | '5' | '6';

/**
 * Cache eviction policy
 */
export type EvictionPolicy =
  | 'noeviction'
  | 'allkeys-lru'
  | 'allkeys-lfu'
  | 'allkeys-random'
  | 'volatile-lru'
  | 'volatile-lfu'
  | 'volatile-random'
  | 'volatile-ttl';

/**
 * Cache (Redis) configuration
 */
export interface CacheConfig {
  readonly enabled: boolean;
  readonly sku: CacheSkuConfig;
  readonly evictionPolicy: EvictionPolicy;
  readonly enableNonSslPort?: boolean;
  readonly minimumTlsVersion?: '1.0' | '1.1' | '1.2';
}

/**
 * Cache SKU configuration
 */
export interface CacheSkuConfig {
  readonly tier: 'Basic' | 'Standard' | 'Premium';
  readonly family: CacheSkuFamily;
  readonly capacity: CacheSkuCapacity;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  readonly enabled: boolean;
  readonly requestsPerMinute: number;
  readonly burstSize: number;
  readonly enablePerClientLimits?: boolean;
  readonly blockDuration?: number; // seconds
}

// ============================================================================
// Builder Interfaces (for fluent API)
// ============================================================================

/**
 * Storage account builder interface
 * Provides fluent API for configuring storage accounts
 */
export interface StorageAccountBuilder {
  name(name: string): StorageAccountBuilder;
  sku(sku: StorageSkuType): StorageAccountBuilder;
  tier(tier: StorageTier): StorageAccountBuilder;
  encryption(provider: 'Microsoft.Storage' | 'Microsoft.KeyVault'): StorageAccountBuilder;
  networkRules(
    config: (builder: NetworkRulesBuilder) => NetworkRulesBuilder
  ): StorageAccountBuilder;
  enableHttpsOnly(enable: boolean): StorageAccountBuilder;
  minimumTlsVersion(version: '1.0' | '1.1' | '1.2'): StorageAccountBuilder;
  build(): StorageAccountConfig;
}

/**
 * Network rules builder interface
 */
export interface NetworkRulesBuilder {
  defaultAction(action: 'Allow' | 'Deny'): NetworkRulesBuilder;
  allowAzureServices(allow: boolean): NetworkRulesBuilder;
  ipRules(rules: readonly string[]): NetworkRulesBuilder;
  virtualNetworkRules(rules: readonly string[]): NetworkRulesBuilder;
  build(): NetworkRulesConfig;
}

/**
 * Database builder interface
 */
export interface DatabaseBuilder {
  name(name: string): DatabaseBuilder;
  mode(mode: ThroughputMode): DatabaseBuilder;
  throughput(min: number, max: number): DatabaseBuilder;
  consistency(level: ConsistencyLevel): DatabaseBuilder;
  backup(config: (builder: BackupBuilder) => BackupBuilder): DatabaseBuilder;
  multiRegion(regions: readonly string[]): DatabaseBuilder;
  enableAnalyticalStore(enable: boolean): DatabaseBuilder;
  publicNetworkAccess(access: 'Enabled' | 'Disabled'): DatabaseBuilder;
  build(): DatabaseConfig;
}

/**
 * Backup builder interface
 */
export interface BackupBuilder {
  enable(enabled: boolean): BackupBuilder;
  type(type: 'Periodic' | 'Continuous'): BackupBuilder;
  retention(days: number): BackupBuilder;
  interval(hours: number): BackupBuilder;
  build(): BackupConfig;
}

/**
 * Function app builder interface
 */
export interface FunctionAppBuilder {
  name(name: string): FunctionAppBuilder;
  plan(type: FunctionPlanType, sku?: PremiumPlanSku | DedicatedPlanSku): FunctionAppBuilder;
  runtime(runtime: FunctionRuntime, version: string): FunctionAppBuilder;
  alwaysOn(enable: boolean): FunctionAppBuilder;
  minInstances(count: number): FunctionAppBuilder;
  maxInstances(count: number): FunctionAppBuilder;
  healthCheck(path: string): FunctionAppBuilder;
  cors(config: (builder: CorsBuilder) => CorsBuilder): FunctionAppBuilder;
  build(): FunctionAppConfig;
}

/**
 * CORS builder interface
 */
export interface CorsBuilder {
  allowedOrigins(origins: readonly string[]): CorsBuilder;
  supportCredentials(support: boolean): CorsBuilder;
  build(): CorsConfig;
}
