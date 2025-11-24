/**
 * Storage Attachment System
 *
 * Provides attachment point logic for storage resources including:
 * - Storage accounts
 * - Cosmos DB databases
 * - Storage queues
 * - Blob containers
 *
 * @module @atakora/component/backend/attachments/storage
 */

/**
 * Storage account SKU types
 */
export type StorageSku =
  | 'Standard_LRS'
  | 'Standard_ZRS'
  | 'Standard_GRS'
  | 'Standard_RAGRS'
  | 'Premium_LRS';

/**
 * Storage account tier types
 */
export type StorageTier = 'Hot' | 'Cool' | 'Archive';

/**
 * Cosmos DB consistency levels
 */
export type CosmosConsistency =
  | 'Eventual'
  | 'ConsistentPrefix'
  | 'Session'
  | 'BoundedStaleness'
  | 'Strong';

/**
 * Cosmos DB mode
 */
export type CosmosMode = 'Serverless' | 'Provisioned' | 'Autoscale';

/**
 * Storage account configuration
 */
export interface StorageAccountConfig {
  /**
   * Storage account name (must be globally unique)
   */
  readonly name?: string;

  /**
   * Storage SKU
   */
  readonly sku: StorageSku;

  /**
   * Access tier
   */
  readonly tier: StorageTier;

  /**
   * Enable HTTPS only
   */
  readonly httpsOnly?: boolean;

  /**
   * Enable hierarchical namespace (for Data Lake Gen2)
   */
  readonly enableHierarchicalNamespace?: boolean;

  /**
   * Minimum TLS version
   */
  readonly minimumTlsVersion?: '1.0' | '1.1' | '1.2';

  /**
   * Allow blob public access
   */
  readonly allowBlobPublicAccess?: boolean;

  /**
   * Network rules
   */
  readonly networkRules?: StorageNetworkRules;

  /**
   * Blob containers to create
   */
  readonly containers?: ReadonlyArray<BlobContainerConfig>;

  /**
   * Queues to create
   */
  readonly queues?: ReadonlyArray<string>;

  /**
   * Tags
   */
  readonly tags?: Record<string, string>;
}

/**
 * Storage network rules configuration
 */
export interface StorageNetworkRules {
  /**
   * Default action when no rules match
   */
  readonly defaultAction: 'Allow' | 'Deny';

  /**
   * Allow Azure services to bypass network rules
   */
  readonly allowAzureServices?: boolean;

  /**
   * IP rules (CIDR blocks)
   */
  readonly ipRules?: ReadonlyArray<string>;

  /**
   * Virtual network subnet IDs
   */
  readonly virtualNetworkRules?: ReadonlyArray<string>;
}

/**
 * Blob container configuration
 */
export interface BlobContainerConfig {
  /**
   * Container name
   */
  readonly name: string;

  /**
   * Public access level
   */
  readonly publicAccess?: 'None' | 'Blob' | 'Container';

  /**
   * Metadata
   */
  readonly metadata?: Record<string, string>;
}

/**
 * Cosmos DB database configuration
 */
export interface DatabaseConfig {
  /**
   * Database account name (must be globally unique)
   */
  readonly accountName?: string;

  /**
   * Cosmos DB mode
   */
  readonly mode: CosmosMode;

  /**
   * Consistency level
   */
  readonly consistency?: CosmosConsistency;

  /**
   * Throughput settings (for Provisioned/Autoscale)
   */
  readonly throughput?: DatabaseThroughput;

  /**
   * Enable multi-region writes
   */
  readonly enableMultiRegion?: boolean;

  /**
   * Regions for multi-region deployment
   */
  readonly regions?: ReadonlyArray<string>;

  /**
   * Backup configuration
   */
  readonly backup?: DatabaseBackupConfig;

  /**
   * Enable analytical storage
   */
  readonly enableAnalyticalStore?: boolean;

  /**
   * Network rules
   */
  readonly networkRules?: DatabaseNetworkRules;

  /**
   * Databases to create
   */
  readonly databases?: ReadonlyArray<CosmosDatabase>;

  /**
   * Tags
   */
  readonly tags?: Record<string, string>;
}

/**
 * Database throughput configuration
 */
export interface DatabaseThroughput {
  /**
   * Minimum RU/s (for Autoscale) or fixed RU/s (for Provisioned)
   */
  readonly min: number;

  /**
   * Maximum RU/s (for Autoscale only)
   */
  readonly max?: number;
}

/**
 * Database backup configuration
 */
export interface DatabaseBackupConfig {
  /**
   * Enable backups
   */
  readonly enabled: boolean;

  /**
   * Backup type
   */
  readonly type?: 'Periodic' | 'Continuous';

  /**
   * Retention in days (for Periodic backups)
   */
  readonly retentionDays?: number;

  /**
   * Backup interval in minutes (for Periodic backups)
   */
  readonly intervalMinutes?: number;
}

/**
 * Database network rules
 */
export interface DatabaseNetworkRules {
  /**
   * Enable public network access
   */
  readonly publicNetworkAccess?: 'Enabled' | 'Disabled';

  /**
   * IP rules (CIDR blocks)
   */
  readonly ipRules?: ReadonlyArray<string>;

  /**
   * Virtual network rules
   */
  readonly virtualNetworkRules?: ReadonlyArray<string>;
}

/**
 * Cosmos DB database within account
 */
export interface CosmosDatabase {
  /**
   * Database name
   */
  readonly name: string;

  /**
   * Database-level throughput (optional, can be set on containers instead)
   */
  readonly throughput?: DatabaseThroughput;

  /**
   * Containers within database
   */
  readonly containers?: ReadonlyArray<CosmosContainer>;
}

/**
 * Cosmos DB container configuration
 */
export interface CosmosContainer {
  /**
   * Container name
   */
  readonly name: string;

  /**
   * Partition key path (e.g., '/id', '/tenantId')
   */
  readonly partitionKey: string;

  /**
   * Container-level throughput (overrides database throughput)
   */
  readonly throughput?: DatabaseThroughput;

  /**
   * Time-to-live in seconds (-1 for no expiration, 0 to disable)
   */
  readonly ttl?: number;

  /**
   * Unique keys
   */
  readonly uniqueKeys?: ReadonlyArray<string>;

  /**
   * Indexing policy
   */
  readonly indexingPolicy?: IndexingPolicy;
}

/**
 * Cosmos DB indexing policy
 */
export interface IndexingPolicy {
  /**
   * Enable automatic indexing
   */
  readonly automatic?: boolean;

  /**
   * Indexing mode
   */
  readonly indexingMode?: 'Consistent' | 'None';

  /**
   * Paths to include in index
   */
  readonly includedPaths?: ReadonlyArray<string>;

  /**
   * Paths to exclude from index
   */
  readonly excludedPaths?: ReadonlyArray<string>;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  /**
   * Queue name
   */
  readonly name: string;

  /**
   * Message visibility timeout in seconds
   */
  readonly visibilityTimeout?: number;

  /**
   * Maximum delivery count before moving to dead letter queue
   */
  readonly maxDeliveryCount?: number;

  /**
   * Message time-to-live in seconds
   */
  readonly messageTtl?: number;

  /**
   * Metadata
   */
  readonly metadata?: Record<string, string>;
}

/**
 * Storage attachment validation errors
 */
export class StorageAttachmentError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'StorageAttachmentError';
  }
}

/**
 * Validate storage account configuration.
 *
 * Ensures configuration meets Azure requirements and best practices.
 *
 * @param config - Storage account configuration
 * @returns Validation errors (empty if valid)
 *
 * @example
 * ```typescript
 * const config: StorageAccountConfig = {
 *   name: 'myaccount',
 *   sku: 'Standard_LRS',
 *   tier: 'Hot'
 * };
 *
 * const errors = validateStorageAccountConfig(config);
 * if (errors.length > 0) {
 *   console.error('Invalid config:', errors);
 * }
 * ```
 */
export function validateStorageAccountConfig(config: StorageAccountConfig): string[] {
  const errors: string[] = [];

  // Validate name
  if (config.name) {
    if (config.name.length < 3 || config.name.length > 24) {
      errors.push('Storage account name must be between 3 and 24 characters');
    }

    if (!/^[a-z0-9]+$/.test(config.name)) {
      errors.push('Storage account name must contain only lowercase letters and numbers');
    }
  }

  // Validate SKU and tier combinations
  if (config.sku === 'Premium_LRS' && config.tier !== 'Hot') {
    errors.push('Premium_LRS SKU only supports Hot tier');
  }

  // Validate network rules
  if (config.networkRules) {
    if (config.networkRules.defaultAction === 'Deny' && !config.networkRules.allowAzureServices) {
      errors.push('When default action is Deny, consider allowing Azure services');
    }
  }

  // Validate containers
  if (config.containers) {
    for (const container of config.containers) {
      if (container.name.length < 3 || container.name.length > 63) {
        errors.push(`Container "${container.name}" name must be between 3 and 63 characters`);
      }

      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(container.name)) {
        errors.push(
          `Container "${container.name}" name must start/end with letter or number, contain only lowercase letters, numbers, and hyphens`
        );
      }
    }
  }

  return errors;
}

/**
 * Validate Cosmos DB database configuration.
 *
 * @param config - Database configuration
 * @returns Validation errors (empty if valid)
 */
export function validateDatabaseConfig(config: DatabaseConfig): string[] {
  const errors: string[] = [];

  // Validate account name
  if (config.accountName) {
    if (config.accountName.length < 3 || config.accountName.length > 44) {
      errors.push('Cosmos DB account name must be between 3 and 44 characters');
    }

    if (!/^[a-z0-9-]+$/.test(config.accountName)) {
      errors.push(
        'Cosmos DB account name must contain only lowercase letters, numbers, and hyphens'
      );
    }
  }

  // Validate throughput
  if (config.throughput) {
    if (config.mode === 'Serverless') {
      errors.push('Throughput cannot be specified for Serverless mode');
    }

    if (config.mode === 'Provisioned' && config.throughput.max) {
      errors.push('Provisioned mode does not support max throughput (use min only)');
    }

    if (config.mode === 'Autoscale' && !config.throughput.max) {
      errors.push('Autoscale mode requires both min and max throughput');
    }

    if (config.throughput.min < 400) {
      errors.push('Minimum throughput must be at least 400 RU/s');
    }

    if (config.throughput.max && config.throughput.max < config.throughput.min) {
      errors.push('Maximum throughput must be greater than minimum');
    }
  }

  // Validate multi-region
  if (config.enableMultiRegion && (!config.regions || config.regions.length < 2)) {
    errors.push('Multi-region requires at least 2 regions');
  }

  // Validate backup
  if (config.backup?.enabled) {
    if (config.backup.type === 'Periodic') {
      if (
        config.backup.retentionDays &&
        (config.backup.retentionDays < 1 || config.backup.retentionDays > 720)
      ) {
        errors.push('Periodic backup retention must be between 1 and 720 days');
      }

      if (
        config.backup.intervalMinutes &&
        (config.backup.intervalMinutes < 60 || config.backup.intervalMinutes > 1440)
      ) {
        errors.push('Periodic backup interval must be between 60 and 1440 minutes');
      }
    }
  }

  // Validate databases and containers
  if (config.databases) {
    for (const database of config.databases) {
      if (!database.name) {
        errors.push('Database name is required');
      }

      if (database.containers) {
        for (const container of database.containers) {
          if (!container.name) {
            errors.push('Container name is required');
          }

          if (!container.partitionKey) {
            errors.push(`Container "${container.name}" must have a partition key`);
          }

          if (container.partitionKey && !container.partitionKey.startsWith('/')) {
            errors.push(`Container "${container.name}" partition key must start with /`);
          }

          if (container.ttl !== undefined && container.ttl < -1) {
            errors.push(
              `Container "${container.name}" TTL must be -1 (no expiration), 0 (disabled), or positive number`
            );
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Validate queue configuration.
 *
 * @param config - Queue configuration
 * @returns Validation errors (empty if valid)
 */
export function validateQueueConfig(config: QueueConfig): string[] {
  const errors: string[] = [];

  if (!config.name) {
    errors.push('Queue name is required');
  }

  if (config.name && (config.name.length < 3 || config.name.length > 63)) {
    errors.push('Queue name must be between 3 and 63 characters');
  }

  if (config.name && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(config.name)) {
    errors.push(
      'Queue name must start/end with letter or number, contain only lowercase letters, numbers, and hyphens'
    );
  }

  if (
    config.visibilityTimeout !== undefined &&
    (config.visibilityTimeout < 1 || config.visibilityTimeout > 604800)
  ) {
    errors.push('Visibility timeout must be between 1 second and 7 days');
  }

  if (config.maxDeliveryCount !== undefined && config.maxDeliveryCount < 1) {
    errors.push('Max delivery count must be at least 1');
  }

  if (config.messageTtl !== undefined && (config.messageTtl < 1 || config.messageTtl > 604800)) {
    errors.push('Message TTL must be between 1 second and 7 days');
  }

  return errors;
}

/**
 * Create default storage account configuration for environment.
 *
 * @param env - Environment type
 * @param overrides - Configuration overrides
 * @returns Storage account configuration
 */
export function createDefaultStorageConfig(
  env: 'development' | 'staging' | 'production',
  overrides?: Partial<StorageAccountConfig>
): StorageAccountConfig {
  const networkRules: StorageNetworkRules | undefined =
    env === 'production' || env === 'staging'
      ? {
          defaultAction: 'Deny',
          allowAzureServices: true,
        }
      : undefined;

  return {
    sku: env === 'development' ? 'Standard_LRS' : 'Standard_ZRS',
    tier: 'Hot',
    httpsOnly: true,
    minimumTlsVersion: '1.2',
    allowBlobPublicAccess: env === 'development',
    ...(networkRules && { networkRules }),
    ...overrides,
  };
}

/**
 * Create default database configuration for environment.
 *
 * @param env - Environment type
 * @param overrides - Configuration overrides
 * @returns Database configuration
 */
export function createDefaultDatabaseConfig(
  env: 'development' | 'staging' | 'production',
  overrides?: Partial<DatabaseConfig>
): DatabaseConfig {
  let baseConfig: DatabaseConfig;

  if (env === 'development') {
    baseConfig = {
      mode: 'Serverless',
      consistency: 'Session',
    };
  } else if (env === 'staging') {
    baseConfig = {
      mode: 'Autoscale',
      consistency: 'Session',
      throughput: {
        min: 1000,
        max: 10000,
      },
      backup: {
        enabled: true,
        type: 'Periodic',
        retentionDays: 30,
        intervalMinutes: 240,
      },
    };
  } else {
    // production
    baseConfig = {
      mode: 'Autoscale',
      consistency: 'Session',
      throughput: {
        min: 4000,
        max: 40000,
      },
      enableMultiRegion: true,
      regions: ['eastus', 'westus'],
      backup: {
        enabled: true,
        type: 'Continuous',
      },
      enableAnalyticalStore: true,
    };
  }

  return {
    ...baseConfig,
    ...overrides,
  };
}

// ============================================================================
// Storage Builder API (Stub Implementation)
// ============================================================================

/**
 * TODO: Full implementation of storage builder API
 * This is a stub to allow example code to compile.
 * The actual builder pattern with fluent methods needs to be implemented.
 */

/**
 * Storage account builder (stub)
 * @internal
 */
export class StorageAccountBuilder {
  private config: any = {};

  name(name: string): this {
    this.config.name = name;
    return this;
  }

  redundancy(redundancy: 'LRS' | 'ZRS' | 'GRS' | 'RAGRS'): this {
    this.config.redundancy = redundancy;
    return this;
  }

  tier(tier: 'Standard' | 'Premium'): this {
    this.config.tier = tier;
    return this;
  }

  performance(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  container(name: string, callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  when(condition: boolean, callback: (builder: this) => any): this {
    if (condition) {
      callback(this);
    }
    return this;
  }

  fileShare(name: string, callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  encryption(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  network(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  softDelete(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  versioning(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  changeFeed(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  _build(): any {
    return this.config;
  }
}

/**
 * Cosmos DB builder (stub)
 * @internal
 */
export class CosmosDbBuilder {
  private config: any = {};

  name(name: string): this {
    this.config.name = name;
    return this;
  }

  mode(mode: 'Serverless' | 'Provisioned' | 'Autoscale'): this {
    this.config.mode = mode;
    return this;
  }

  throughput(min: number, max: number): this {
    this.config.throughput = { min, max };
    return this;
  }

  consistency(level: string): this {
    this.config.consistency = level;
    return this;
  }

  multiRegion(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  backup(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  analyticalStorage(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  network(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  encryption(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  freeTier(enabled: boolean): this {
    this.config.freeTier = enabled;
    return this;
  }

  performance(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  when(condition: boolean, callback: (builder: this) => any): this {
    if (condition) {
      callback(this);
    }
    return this;
  }

  _build(): any {
    return this.config;
  }
}

/**
 * Storage namespace with builder factory methods
 */
export const storage = {
  /**
   * Create a storage account builder
   */
  account(): StorageAccountBuilder {
    return new StorageAccountBuilder();
  },

  /**
   * Create a Cosmos DB builder
   */
  cosmosDb(): CosmosDbBuilder {
    return new CosmosDbBuilder();
  },
};

/**
 * Define storage configuration
 *
 * @param configs - Storage configuration builders
 * @returns Storage configuration
 */
export function defineStorage(configs: Record<string, any>): any {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(configs)) {
    if (value && typeof value === 'object' && '_build' in value) {
      result[key] = value._build();
    } else {
      result[key] = value;
    }
  }

  return result;
}
