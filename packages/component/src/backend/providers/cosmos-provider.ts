import type { Construct } from '@atakora/cdk';
import { DatabaseAccounts } from '@atakora/cdk/documentdb';
import type {
  DatabaseAccountsProps,
  ConsistencyLevel,
  PublicNetworkAccess,
  CosmosDbKind,
} from '@atakora/cdk/documentdb';
import { BaseProvider, type IResourceRequirement, type ProviderContext, type ValidationResult } from './base-provider';

/**
 * Database requirement specification.
 */
export interface DatabaseRequirement {
  readonly name: string;
  readonly containers?: ReadonlyArray<ContainerRequirement>;
}

/**
 * Container requirement specification.
 */
export interface ContainerRequirement {
  readonly name: string;
  readonly partitionKey: string;
  readonly uniqueKeys?: ReadonlyArray<string>;
  readonly ttl?: number;
  readonly indexingPolicy?: any;
}

/**
 * Cosmos DB configuration for resource requirements.
 */
export interface CosmosConfig {
  readonly consistency?: ConsistencyLevel;
  readonly enableServerless?: boolean;
  readonly enableMultiRegion?: boolean;
  readonly enableFreeTier?: boolean;
  readonly publicNetworkAccess?: PublicNetworkAccess;
  readonly kind?: CosmosDbKind;
  readonly capabilities?: ReadonlyArray<string>;
  readonly databases?: ReadonlyArray<DatabaseRequirement>;
  readonly location?: string;
  readonly additionalLocations?: string[];
}

/**
 * Azure Cosmos DB resource limits.
 */
const COSMOS_LIMITS = {
  /** Maximum databases per Cosmos account */
  MAX_DATABASES_PER_ACCOUNT: 25,

  /** Maximum containers per database */
  MAX_CONTAINERS_PER_DATABASE: 100,
} as const;

/**
 * Resource provider for Azure Cosmos DB.
 *
 * @remarks
 * Handles provisioning and merging of Cosmos DB database accounts.
 *
 * **Features**:
 * - Merges multiple database/container requirements into single account
 * - Respects Azure limits (max 25 databases per account)
 * - Auto-splits when limits exceeded (creates cosmos-2, cosmos-3, etc.)
 * - Validates consistency levels and compatibility
 * - Deduplicates databases and containers
 *
 * **Merge Rules**:
 * - Consistency levels must match
 * - Serverless/provisioned modes must match
 * - Free tier can only be used once
 * - Databases with same name are deduplicated
 * - Containers with same name/partitionKey are deduplicated
 *
 * @example
 * ```typescript
 * const provider = new CosmosProvider();
 *
 * const req1: IResourceRequirement = {
 *   resourceType: 'cosmos',
 *   requirementKey: 'shared',
 *   config: {
 *     enableServerless: true,
 *     databases: [
 *       { name: 'users-db', containers: [{ name: 'users', partitionKey: '/id' }] }
 *     ]
 *   }
 * };
 *
 * const req2: IResourceRequirement = {
 *   resourceType: 'cosmos',
 *   requirementKey: 'shared',
 *   config: {
 *     enableServerless: true,
 *     databases: [
 *       { name: 'products-db', containers: [{ name: 'products', partitionKey: '/id' }] }
 *     ]
 *   }
 * };
 *
 * const merged = provider.mergeRequirements([req1, req2]);
 * // Result: Single account with both users-db and products-db
 * ```
 */
export class CosmosProvider extends BaseProvider<CosmosConfig, DatabaseAccounts> {
  readonly providerId = 'cosmos-provider';
  readonly resourceType = 'cosmos';
  readonly supportedTypes = ['cosmos'] as const;
  protected readonly resourceLimit = COSMOS_LIMITS.MAX_DATABASES_PER_ACCOUNT;

  /**
   * Check if two Cosmos configurations can be merged.
   *
   * @param config1 - First configuration
   * @param config2 - Second configuration
   * @returns True if configurations are compatible
   */
  protected canMerge(config1: CosmosConfig, config2: CosmosConfig): boolean {
    // Consistency levels must match
    if (config1.consistency && config2.consistency && config1.consistency !== config2.consistency) {
      return false;
    }

    // Serverless/provisioned mode must match
    if (config1.enableServerless !== config2.enableServerless) {
      return false;
    }

    // Kind must match (SQL, MongoDB, Cassandra, etc.)
    if (config1.kind && config2.kind && config1.kind !== config2.kind) {
      return false;
    }

    // Multi-region settings should be compatible
    if (config1.enableMultiRegion !== undefined &&
        config2.enableMultiRegion !== undefined &&
        config1.enableMultiRegion !== config2.enableMultiRegion) {
      return false;
    }

    // Free tier can only be enabled on one account per subscription
    // If both require free tier, they must share the same account
    // This is handled by merging, so it's compatible

    return true;
  }

  /**
   * Merge multiple Cosmos DB requirements into a single configuration.
   *
   * @param requirements - Array of requirements to merge
   * @returns Merged Cosmos configuration
   */
  protected merge(requirements: ReadonlyArray<IResourceRequirement>): CosmosConfig {
    const configs = requirements.map(r => r.config as CosmosConfig);

    // Start with first config as base
    const mergedConfig: any = {
      consistency: configs[0].consistency,
      enableServerless: configs[0].enableServerless,
      enableMultiRegion: configs[0].enableMultiRegion,
      enableFreeTier: configs[0].enableFreeTier,
      publicNetworkAccess: configs[0].publicNetworkAccess,
      kind: configs[0].kind,
      location: configs[0].location,
    };

    // Merge capabilities (union)
    const allCapabilities = new Set<string>();
    for (const config of configs) {
      if (config.capabilities) {
        config.capabilities.forEach(cap => allCapabilities.add(cap));
      }
    }
    if (allCapabilities.size > 0) {
      mergedConfig.capabilities = Array.from(allCapabilities);
    }

    // Merge additional locations (union)
    const allLocations = new Set<string>();
    for (const config of configs) {
      if (config.additionalLocations) {
        config.additionalLocations.forEach(loc => allLocations.add(loc));
      }
    }
    if (allLocations.size > 0) {
      mergedConfig.additionalLocations = Array.from(allLocations);
    }

    // Merge databases - this is the complex part
    mergedConfig.databases = this.mergeDatabases(configs);

    // If any config enables multi-region, enable it
    if (configs.some(c => c.enableMultiRegion)) {
      mergedConfig.enableMultiRegion = true;
    }

    // If any config requires free tier, enable it (note: Azure allows only 1 per subscription)
    if (configs.some(c => c.enableFreeTier)) {
      mergedConfig.enableFreeTier = true;
    }

    // Use most restrictive public network access
    const accessLevels = configs
      .map(c => c.publicNetworkAccess)
      .filter((access): access is PublicNetworkAccess => access !== undefined);

    if (accessLevels.length > 0) {
      // 'Disabled' is most restrictive, then 'SecuredByPerimeter', then 'Enabled'
      if (accessLevels.some(a => a === 'Disabled')) {
        mergedConfig.publicNetworkAccess = 'Disabled';
      } else if (accessLevels.some(a => a === 'SecuredByPerimeter')) {
        mergedConfig.publicNetworkAccess = 'SecuredByPerimeter';
      } else {
        mergedConfig.publicNetworkAccess = 'Enabled';
      }
    }

    return mergedConfig;
  }

  /**
   * Merge databases from multiple configurations.
   * Deduplicates databases by name and merges containers.
   *
   * @param configs - Array of Cosmos configurations
   * @returns Merged array of database requirements
   */
  private mergeDatabases(configs: ReadonlyArray<CosmosConfig>): DatabaseRequirement[] {
    const databaseMap = new Map<string, DatabaseRequirement>();

    for (const config of configs) {
      if (!config.databases) continue;

      for (const db of config.databases) {
        const existing = databaseMap.get(db.name);

        if (existing) {
          // Merge containers for this database
          const mergedContainers = this.mergeContainers(
            existing.containers ?? [],
            db.containers ?? []
          );

          databaseMap.set(db.name, {
            name: db.name,
            containers: mergedContainers,
          });
        } else {
          // New database
          databaseMap.set(db.name, { ...db });
        }
      }
    }

    const merged = Array.from(databaseMap.values());

    // Check database limit
    if (merged.length > COSMOS_LIMITS.MAX_DATABASES_PER_ACCOUNT) {
      throw this.createError(
        'DATABASE_LIMIT_EXCEEDED',
        `Merged configuration would create ${merged.length} databases, exceeding limit of ${COSMOS_LIMITS.MAX_DATABASES_PER_ACCOUNT}`,
        { databaseCount: merged.length, limit: COSMOS_LIMITS.MAX_DATABASES_PER_ACCOUNT }
      );
    }

    return merged;
  }

  /**
   * Merge containers from multiple database requirements.
   * Deduplicates by name and validates partition key compatibility.
   *
   * @param containers1 - First array of containers
   * @param containers2 - Second array of containers
   * @returns Merged array of containers
   */
  private mergeContainers(
    containers1: ReadonlyArray<ContainerRequirement>,
    containers2: ReadonlyArray<ContainerRequirement>
  ): ContainerRequirement[] {
    const containerMap = new Map<string, ContainerRequirement>();

    // Add first set
    for (const container of containers1) {
      containerMap.set(container.name, container);
    }

    // Merge second set
    for (const container of containers2) {
      const existing = containerMap.get(container.name);

      if (existing) {
        // Container with same name exists - validate compatibility
        if (existing.partitionKey !== container.partitionKey) {
          throw this.createError(
            'INCOMPATIBLE_PARTITION_KEYS',
            `Container '${container.name}' has conflicting partition keys: '${existing.partitionKey}' vs '${container.partitionKey}'`,
            { containerName: container.name, keys: [existing.partitionKey, container.partitionKey] }
          );
        }

        // Merge unique keys (union)
        const uniqueKeys = new Set<string>([
          ...(existing.uniqueKeys ?? []),
          ...(container.uniqueKeys ?? []),
        ]);

        // Use minimum TTL if both specified
        const ttl = existing.ttl !== undefined && container.ttl !== undefined
          ? Math.min(existing.ttl, container.ttl)
          : existing.ttl ?? container.ttl;

        containerMap.set(container.name, {
          name: container.name,
          partitionKey: existing.partitionKey,
          uniqueKeys: uniqueKeys.size > 0 ? Array.from(uniqueKeys) : undefined,
          ttl,
          indexingPolicy: container.indexingPolicy ?? existing.indexingPolicy,
        });
      } else {
        // New container
        containerMap.set(container.name, container);
      }
    }

    const merged = Array.from(containerMap.values());

    // Check container limit
    if (merged.length > COSMOS_LIMITS.MAX_CONTAINERS_PER_DATABASE) {
      throw this.createError(
        'CONTAINER_LIMIT_EXCEEDED',
        `Merged database would have ${merged.length} containers, exceeding limit of ${COSMOS_LIMITS.MAX_CONTAINERS_PER_DATABASE}`,
        { containerCount: merged.length, limit: COSMOS_LIMITS.MAX_CONTAINERS_PER_DATABASE }
      );
    }

    return merged;
  }

  /**
   * Provision a Cosmos DB database account.
   *
   * @param scope - The construct scope
   * @param id - Resource identifier
   * @param config - Merged Cosmos configuration
   * @param context - Provider context
   * @returns Created DatabaseAccounts resource
   */
  protected provision(
    scope: Construct,
    id: string,
    config: CosmosConfig,
    context: ProviderContext
  ): DatabaseAccounts {
    const props: DatabaseAccountsProps = {
      databaseAccountName: id,
      location: config.location,
      consistencyLevel: config.consistency,
      enableServerless: config.enableServerless,
      enableFreeTier: config.enableFreeTier,
      publicNetworkAccess: config.publicNetworkAccess,
      kind: config.kind,
      additionalLocations: config.additionalLocations,
      tags: context.tags,
    };

    // Create the Cosmos DB account
    const cosmosAccount = new DatabaseAccounts(scope, id, props);

    // Note: Database and container creation will be handled separately
    // The DatabaseAccounts construct creates the account, but databases/containers
    // are typically created through separate constructs or during component initialization

    return cosmosAccount;
  }

  /**
   * Validate Cosmos DB configuration.
   *
   * @param config - Configuration to validate
   * @returns Validation result
   */
  protected validate(config: CosmosConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate serverless constraints
    if (config.enableServerless) {
      if (config.enableMultiRegion) {
        errors.push('Serverless accounts do not support multi-region configuration');
      }

      if (config.enableFreeTier) {
        warnings.push('Free tier is not applicable to serverless accounts');
      }
    }

    // Validate free tier constraints
    if (config.enableFreeTier) {
      warnings.push('Only one free tier Cosmos DB account is allowed per Azure subscription');
    }

    // Validate database requirements
    if (config.databases) {
      if (config.databases.length > COSMOS_LIMITS.MAX_DATABASES_PER_ACCOUNT) {
        errors.push(
          `Configuration specifies ${config.databases.length} databases, exceeding limit of ${COSMOS_LIMITS.MAX_DATABASES_PER_ACCOUNT}`
        );
      }

      // Validate each database
      for (const db of config.databases) {
        if (!db.name || db.name.length === 0) {
          errors.push('Database name cannot be empty');
        }

        if (db.containers && db.containers.length > COSMOS_LIMITS.MAX_CONTAINERS_PER_DATABASE) {
          errors.push(
            `Database '${db.name}' specifies ${db.containers.length} containers, exceeding limit of ${COSMOS_LIMITS.MAX_CONTAINERS_PER_DATABASE}`
          );
        }

        // Validate each container
        if (db.containers) {
          for (const container of db.containers) {
            if (!container.name || container.name.length === 0) {
              errors.push(`Container name cannot be empty in database '${db.name}'`);
            }

            if (!container.partitionKey || container.partitionKey.length === 0) {
              errors.push(`Container '${container.name}' in database '${db.name}' must specify a partition key`);
            }

            if (container.partitionKey && !container.partitionKey.startsWith('/')) {
              errors.push(`Partition key '${container.partitionKey}' for container '${container.name}' must start with '/'`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get databases from a merged configuration.
   * Helper method for components to access database information.
   *
   * @param config - Merged Cosmos configuration
   * @returns Array of database requirements
   */
  public getDatabases(config: CosmosConfig): ReadonlyArray<DatabaseRequirement> {
    return config.databases ?? [];
  }

  /**
   * Get containers for a specific database.
   * Helper method for components to access container information.
   *
   * @param config - Merged Cosmos configuration
   * @param databaseName - Name of the database
   * @returns Array of container requirements, or undefined if database not found
   */
  public getContainers(config: CosmosConfig, databaseName: string): ReadonlyArray<ContainerRequirement> | undefined {
    const database = config.databases?.find(db => db.name === databaseName);
    return database?.containers;
  }
}
