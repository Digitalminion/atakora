/**
 * Base Default Configuration Types
 *
 * This file defines the foundational types and interfaces for backend defaults.
 * These defaults provide smart, environment-aware configurations that enable
 * the "30 lines of code" backend definition experience.
 *
 * @module @atakora/component/backend/defaults
 */

/**
 * Environment types supported by the backend system.
 * Each environment has different default configurations optimized for its use case.
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Storage SKU types for Azure Storage Accounts.
 * - LRS: Locally redundant storage (single datacenter)
 * - ZRS: Zone redundant storage (multiple datacenters in region)
 * - GRS: Geo-redundant storage (cross-region replication)
 * - RAGRS: Read-access geo-redundant storage
 */
export type StorageSku = 'Standard_LRS' | 'Standard_ZRS' | 'Standard_GRS' | 'Standard_RAGRS';

/**
 * Storage access tiers for cost optimization.
 * - Hot: Optimized for frequent access
 * - Cool: Optimized for infrequent access (lower storage cost, higher access cost)
 */
export type StorageTier = 'Hot' | 'Cool';

/**
 * Cosmos DB consistency levels.
 * @see https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels
 */
export type ConsistencyLevel =
  | 'Eventual'
  | 'ConsistentPrefix'
  | 'Session'
  | 'BoundedStaleness'
  | 'Strong';

/**
 * Cosmos DB capacity modes.
 * - Serverless: Pay per request (best for dev/low traffic)
 * - Autoscale: Auto-scales between min/max RU/s
 * - Provisioned: Fixed RU/s allocation
 */
export type CosmosMode = 'Serverless' | 'Autoscale' | 'Provisioned';

/**
 * Cosmos DB backup types.
 * - Periodic: Scheduled backups
 * - Continuous: Point-in-time restore capability
 */
export type BackupType = 'Periodic' | 'Continuous';

/**
 * Function App hosting plans.
 * - Consumption: Serverless, pay per execution
 * - Premium: Enhanced features, always-on capability
 * - Dedicated: Runs on dedicated App Service Plan
 */
export type FunctionAppPlan = 'Consumption' | 'Premium' | 'Dedicated';

/**
 * Premium plan SKUs (when using Premium plan).
 */
export type PremiumSku = 'EP1' | 'EP2' | 'EP3';

/**
 * Function runtime types.
 */
export type FunctionRuntime = 'node' | 'dotnet' | 'python' | 'java';

/**
 * Storage account default configuration.
 */
export interface StorageAccountDefaults {
  /** Storage account SKU for redundancy */
  readonly sku: StorageSku;

  /** Access tier for cost optimization */
  readonly tier: StorageTier;

  /** Enable HTTPS-only traffic */
  readonly httpsOnly?: boolean;

  /** Enable hierarchical namespace (Data Lake) */
  readonly enableHierarchicalNamespace?: boolean;

  /** Minimum TLS version */
  readonly minimumTlsVersion?: '1.0' | '1.1' | '1.2';
}

/**
 * Cosmos DB backup configuration.
 */
export interface BackupDefaults {
  /** Enable backups */
  readonly enabled: boolean;

  /** Backup type */
  readonly type?: BackupType;

  /** Retention period in days */
  readonly retentionDays?: number;

  /** Backup interval in minutes (for periodic backups) */
  readonly intervalMinutes?: number;
}

/**
 * Cosmos DB throughput configuration.
 */
export interface ThroughputDefaults {
  /** Minimum RU/s (for Autoscale) */
  readonly min?: number;

  /** Maximum RU/s (for Autoscale/Provisioned) */
  readonly max?: number;
}

/**
 * Cosmos DB default configuration.
 */
export interface CosmosDbDefaults {
  /** Capacity mode */
  readonly mode: CosmosMode;

  /** Consistency level */
  readonly consistency: ConsistencyLevel;

  /** Backup configuration */
  readonly backup: BackupDefaults;

  /** Throughput settings (if not serverless) */
  readonly throughput?: ThroughputDefaults;

  /** Enable multi-region writes */
  readonly multiRegion?: boolean;

  /** Additional regions for replication */
  readonly regions?: readonly string[];

  /** Enable analytical store */
  readonly analyticalStore?: boolean;
}

/**
 * Storage defaults (account + database).
 */
export interface StorageDefaults {
  /** Storage account defaults */
  readonly account: StorageAccountDefaults;

  /** Cosmos DB defaults */
  readonly database: CosmosDbDefaults;
}

/**
 * Function App scaling configuration.
 */
export interface ScalingDefaults {
  /** Minimum instance count */
  readonly minInstances?: number;

  /** Maximum instance count */
  readonly maxInstances?: number;

  /** Enable always-on */
  readonly alwaysOn: boolean;
}

/**
 * Function App default configuration.
 */
export interface FunctionAppDefaults {
  /** Hosting plan */
  readonly plan: FunctionAppPlan;

  /** Premium SKU (if using Premium plan) */
  readonly sku?: PremiumSku;

  /** Runtime language */
  readonly runtime: FunctionRuntime;

  /** Runtime version */
  readonly runtimeVersion: string;

  /** Scaling configuration */
  readonly scaling: ScalingDefaults;

  /** Health check endpoint */
  readonly healthCheck?: string;
}

/**
 * Compute defaults (function apps, etc.).
 */
export interface ComputeDefaults {
  /** Function App defaults */
  readonly functionApp: FunctionAppDefaults;
}

/**
 * Virtual Network configuration.
 */
export interface VNetDefaults {
  /** Enable VNet integration */
  readonly enabled: boolean;

  /** Address space (CIDR) */
  readonly addressSpace?: string;

  /** Subnet configurations */
  readonly subnets?: readonly SubnetDefaults[];
}

/**
 * Subnet configuration.
 */
export interface SubnetDefaults {
  /** Subnet name */
  readonly name: string;

  /** Address range (CIDR) */
  readonly addressRange: string;

  /** Enable service endpoints */
  readonly serviceEndpoints?: readonly string[];
}

/**
 * Web Application Firewall configuration.
 */
export interface WafDefaults {
  /** Enable WAF */
  readonly enabled: boolean;

  /** WAF mode */
  readonly mode?: 'Detection' | 'Prevention';

  /** Rule set to use */
  readonly ruleSet?: 'OWASP';

  /** Rule set version */
  readonly ruleSetVersion?: string;
}

/**
 * DDoS Protection configuration.
 */
export interface DdosDefaults {
  /** Enable DDoS protection */
  readonly enabled: boolean;

  /** DDoS protection plan */
  readonly plan?: 'Standard';
}

/**
 * Network defaults (optional - only in staging/prod).
 */
export interface NetworkDefaults {
  /** Virtual Network configuration */
  readonly vnet: VNetDefaults;

  /** Web Application Firewall */
  readonly waf: WafDefaults;

  /** DDoS Protection */
  readonly ddos: DdosDefaults;
}

/**
 * Application Insights configuration.
 */
export interface AppInsightsDefaults {
  /** Enable Application Insights */
  readonly enabled: boolean;

  /** Sampling percentage (0-100) */
  readonly samplingPercentage: number;

  /** Retention period in days */
  readonly retentionDays?: number;

  /** Enable live metrics */
  readonly liveMetrics?: boolean;

  /** Enable profiler */
  readonly profiler?: boolean;
}

/**
 * Log Analytics configuration.
 */
export interface LogAnalyticsDefaults {
  /** Enable Log Analytics */
  readonly enabled: boolean;

  /** Retention period in days */
  readonly retentionDays?: number;

  /** SKU/Tier */
  readonly sku?: 'PerGB2018' | 'Free';
}

/**
 * Alert threshold configuration.
 */
export interface AlertThreshold {
  /** Warning threshold */
  readonly warning?: number;

  /** Critical threshold */
  readonly critical?: number;
}

/**
 * Alerts configuration.
 */
export interface AlertsDefaults {
  /** Response time thresholds (ms) */
  readonly responseTime?: AlertThreshold;

  /** Error rate thresholds (%) */
  readonly errorRate?: AlertThreshold;

  /** Availability thresholds (%) */
  readonly availability?: AlertThreshold;
}

/**
 * Monitoring defaults (optional - minimal in dev, full in prod).
 */
export interface MonitoringDefaults {
  /** Application Insights */
  readonly appInsights: AppInsightsDefaults;

  /** Log Analytics */
  readonly logAnalytics?: LogAnalyticsDefaults;

  /** Alerts */
  readonly alerts?: AlertsDefaults;
}

/**
 * CDN configuration.
 */
export interface CdnDefaults {
  /** Enable CDN */
  readonly enabled: boolean;

  /** CDN profile SKU */
  readonly profile?: 'Standard_Microsoft' | 'Standard_Akamai' | 'Standard_Verizon';

  /** Caching policy */
  readonly caching?: 'Standard' | 'Premium';

  /** Enable compression */
  readonly compression?: boolean;
}

/**
 * Cache configuration (Redis).
 */
export interface CacheDefaults {
  /** Enable cache */
  readonly enabled: boolean;

  /** Cache SKU */
  readonly sku?: 'Basic' | 'Standard' | 'Premium';

  /** SKU family and capacity */
  readonly capacity?: 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

  /** Eviction policy */
  readonly evictionPolicy?: 'LRU' | 'LFU' | 'Random' | 'TTL';
}

/**
 * Rate limiting configuration.
 */
export interface RateLimitDefaults {
  /** Enable rate limiting */
  readonly enabled: boolean;

  /** Requests per minute */
  readonly requestsPerMinute?: number;

  /** Burst size */
  readonly burstSize?: number;
}

/**
 * Performance defaults (optional - only in prod).
 */
export interface PerformanceDefaults {
  /** CDN configuration */
  readonly cdn: CdnDefaults;

  /** Cache configuration */
  readonly cache: CacheDefaults;

  /** Rate limiting */
  readonly rateLimit: RateLimitDefaults;
}

/**
 * Complete backend defaults for an environment.
 * This is the main configuration structure returned by environment-specific
 * default functions.
 */
export interface BackendDefaults {
  /** Storage defaults (required) */
  readonly storage: StorageDefaults;

  /** Compute defaults (required) */
  readonly compute: ComputeDefaults;

  /** Network defaults (optional - only in staging/prod) */
  readonly network?: NetworkDefaults;

  /** Monitoring defaults (optional - minimal in dev, full in prod) */
  readonly monitoring?: MonitoringDefaults;

  /** Performance defaults (optional - only in prod) */
  readonly performance?: PerformanceDefaults;
}
