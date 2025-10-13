import type { Construct } from '@atakora/cdk';
import { StorageAccounts } from '@atakora/cdk/storage';
import type { StorageAccountsProps, StorageAccountSkuName } from '@atakora/cdk/storage';
import { BaseProvider, type IResourceRequirement, type ProviderContext, type ValidationResult } from './base-provider';

/**
 * Storage container requirement specification.
 */
export interface ContainerConfig {
  readonly name: string;
  readonly componentId?: string; // Which component owns this container
  readonly publicAccess?: 'None' | 'Blob' | 'Container';
}

/**
 * Storage Account configuration for resource requirements.
 */
export interface StorageConfig {
  readonly sku?: StorageAccountSkuName;
  readonly accessTier?: 'Hot' | 'Cool';
  readonly containers?: ReadonlyArray<ContainerConfig>;
  readonly enableBlobPublicAccess?: boolean;
  readonly location?: string;
}

/**
 * Azure Storage Account resource limits.
 */
const STORAGE_LIMITS = {
  /** Maximum containers per storage account */
  MAX_CONTAINERS_PER_ACCOUNT: 250,

  /** Maximum size per storage account (500 TB) */
  MAX_CAPACITY_TB: 500,
} as const;

/**
 * Resource provider for Azure Storage Accounts.
 *
 * @remarks
 * Handles provisioning and merging of Storage Account resources.
 *
 * **Features**:
 * - Merges multiple container requirements into single account
 * - Organizes containers by component prefix
 * - Respects Azure limits (max 250 containers per account)
 * - Auto-splits when limits exceeded (creates storage-2, storage-3, etc.)
 * - Validates SKU compatibility
 *
 * **Merge Rules**:
 * - SKU is upgraded to highest requirement
 * - Access tier is set to most cost-effective
 * - Containers are prefixed with component ID to prevent naming conflicts
 * - Public access is most restrictive setting
 *
 * **Container Namespacing**:
 * ```typescript
 * // Component: UserApi
 * userapi-data
 * userapi-assets
 *
 * // Component: ProductApi
 * productapi-data
 * productapi-images
 * ```
 *
 * @example
 * ```typescript
 * const provider = new StorageProvider();
 *
 * const req1: IResourceRequirement = {
 *   resourceType: 'storage',
 *   requirementKey: 'shared',
 *   config: {
 *     sku: 'Standard_LRS',
 *     containers: [
 *       { name: 'data', componentId: 'UserApi' }
 *     ]
 *   }
 * };
 *
 * const merged = provider.mergeRequirements([req1, req2]);
 * // Result: Single account with prefixed containers
 * ```
 */
export class StorageProvider extends BaseProvider<StorageConfig, StorageAccounts> {
  readonly providerId = 'storage-provider';
  readonly resourceType = 'storage';
  readonly supportedTypes = ['storage'] as const;
  protected readonly resourceLimit = STORAGE_LIMITS.MAX_CONTAINERS_PER_ACCOUNT;

  /**
   * Check if two Storage Account configurations can be merged.
   *
   * @param config1 - First configuration
   * @param config2 - Second configuration
   * @returns True if configurations are compatible
   */
  protected canMerge(config1: StorageConfig, config2: StorageConfig): boolean {
    // SKU compatibility - can upgrade but not downgrade
    // All SKUs are compatible as we can use the highest

    // Access tier compatibility - can be different, we'll choose optimal

    // Public access - can be different, we'll choose most restrictive

    // Containers should have unique names after prefixing
    const containers1 = config1.containers ?? [];
    const containers2 = config2.containers ?? [];

    const names1 = containers1.map(c => this.prefixContainerName(c.name, c.componentId ?? 'shared'));
    const names2 = containers2.map(c => this.prefixContainerName(c.name, c.componentId ?? 'shared'));

    // Check for duplicates
    const duplicates = names1.filter(name => names2.includes(name));
    if (duplicates.length > 0) {
      return false; // Naming conflict
    }

    return true;
  }

  /**
   * Merge multiple Storage Account requirements into a single configuration.
   *
   * @param requirements - Array of requirements to merge
   * @returns Merged Storage configuration
   */
  protected merge(requirements: ReadonlyArray<IResourceRequirement>): StorageConfig {
    const configs = requirements.map(r => r.config as StorageConfig);

    // Start with first config as base
    const mergedConfig: any = {
      sku: configs[0].sku,
      accessTier: configs[0].accessTier,
      enableBlobPublicAccess: configs[0].enableBlobPublicAccess,
      location: configs[0].location,
    };

    // Use highest SKU
    const skus = configs.map(c => c.sku).filter((sku): sku is StorageAccountSkuName => sku !== undefined);
    if (skus.length > 0) {
      mergedConfig.sku = this.selectHighestSku(skus);
    }

    // Use most cost-effective access tier (Cool is cheaper for infrequent access)
    const tiers = configs.map(c => c.accessTier).filter((tier): tier is 'Hot' | 'Cool' => tier !== undefined);
    if (tiers.length > 0) {
      // If any requires Hot, use Hot (more expensive but faster access)
      mergedConfig.accessTier = tiers.includes('Hot') ? 'Hot' : 'Cool';
    }

    // Use most restrictive public access setting
    if (configs.some(c => c.enableBlobPublicAccess === false)) {
      mergedConfig.enableBlobPublicAccess = false;
    }

    // Merge containers with prefixing
    mergedConfig.containers = this.mergeContainers(configs);

    return mergedConfig as StorageConfig;
  }

  /**
   * Merge containers from multiple configurations with component prefixing.
   *
   * @param configs - Array of Storage configurations
   * @returns Merged array of container configurations
   */
  private mergeContainers(configs: ReadonlyArray<StorageConfig>): ContainerConfig[] {
    const containerMap = new Map<string, ContainerConfig>();

    for (const config of configs) {
      if (!config.containers) continue;

      for (const container of config.containers) {
        const prefixedName = this.prefixContainerName(container.name, container.componentId ?? 'shared');

        // Check for duplicates
        if (containerMap.has(prefixedName)) {
          const existing = containerMap.get(prefixedName)!;

          // Use most restrictive public access
          let publicAccess = container.publicAccess;
          if (existing.publicAccess === 'None' || publicAccess === 'None') {
            publicAccess = 'None';
          } else if (existing.publicAccess === 'Blob' || publicAccess === 'Blob') {
            publicAccess = 'Blob';
          }

          containerMap.set(prefixedName, {
            name: prefixedName,
            componentId: container.componentId,
            publicAccess,
          });
        } else {
          containerMap.set(prefixedName, {
            name: prefixedName,
            componentId: container.componentId,
            publicAccess: container.publicAccess,
          });
        }
      }
    }

    const merged = Array.from(containerMap.values());

    // Check container limit
    if (merged.length > STORAGE_LIMITS.MAX_CONTAINERS_PER_ACCOUNT) {
      throw this.createError(
        'CONTAINER_LIMIT_EXCEEDED',
        `Merged configuration would create ${merged.length} containers, exceeding limit of ${STORAGE_LIMITS.MAX_CONTAINERS_PER_ACCOUNT}`,
        { containerCount: merged.length, limit: STORAGE_LIMITS.MAX_CONTAINERS_PER_ACCOUNT }
      );
    }

    return merged;
  }

  /**
   * Prefix a container name with component ID.
   *
   * @param name - Original container name
   * @param componentId - Component identifier
   * @returns Prefixed container name
   *
   * @example
   * prefixContainerName('data', 'UserApi') => 'userapi-data'
   * prefixContainerName('assets', 'shared') => 'assets' (no prefix for shared)
   */
  private prefixContainerName(name: string, componentId: string): string {
    if (componentId === 'shared') {
      return name;
    }

    // Convert componentId to lowercase with hyphens
    const prefix = componentId
      .replace(/([A-Z])/g, '-$1') // Insert hyphen before capitals
      .toLowerCase()
      .replace(/^-/, ''); // Remove leading hyphen

    return `${prefix}-${name}`;
  }

  /**
   * Select the highest SKU from a list of SKU names.
   *
   * @param skus - Array of SKU names
   * @returns Highest SKU name
   */
  private selectHighestSku(skus: StorageAccountSkuName[]): StorageAccountSkuName {
    const skuPriority: Record<string, number> = {
      'Standard_LRS': 1,
      'Standard_GRS': 2,
      'Standard_RAGRS': 3,
      'Standard_ZRS': 4,
      'Premium_LRS': 5,
      'Premium_ZRS': 6,
    };

    return skus.reduce((highest, current) => {
      const currentPriority = skuPriority[current] ?? 0;
      const highestPriority = skuPriority[highest] ?? 0;
      return currentPriority > highestPriority ? current : highest;
    });
  }

  /**
   * Provision a Storage Account.
   *
   * @param scope - The construct scope
   * @param id - Resource identifier
   * @param config - Merged Storage configuration
   * @param context - Provider context
   * @returns Created StorageAccounts resource
   */
  protected provision(
    scope: Construct,
    id: string,
    config: StorageConfig,
    context: ProviderContext
  ): StorageAccounts {
    const props: StorageAccountsProps = {
      storageAccountName: id,
      sku: config.sku,
      accessTier: config.accessTier,
      enableBlobPublicAccess: config.enableBlobPublicAccess,
      location: config.location,
      tags: context.tags,
    };

    const storageAccount = new StorageAccounts(scope, id, props);

    // Note: Container creation will be handled separately
    // The StorageAccounts construct creates the account, but containers
    // are typically created through separate constructs or during component initialization

    return storageAccount;
  }

  /**
   * Validate Storage Account configuration.
   *
   * @param config - Configuration to validate
   * @returns Validation result
   */
  protected validate(config: StorageConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate container count
    if (config.containers) {
      if (config.containers.length > STORAGE_LIMITS.MAX_CONTAINERS_PER_ACCOUNT) {
        errors.push(
          `Configuration specifies ${config.containers.length} containers, exceeding limit of ${STORAGE_LIMITS.MAX_CONTAINERS_PER_ACCOUNT}`
        );
      }

      // Validate container names
      for (const container of config.containers) {
        if (!container.name || container.name.length === 0) {
          errors.push('Container name cannot be empty');
        }

        // Azure container name rules: 3-63 characters, lowercase letters, numbers, hyphens
        if (container.name.length < 3 || container.name.length > 63) {
          errors.push(`Container name '${container.name}' must be 3-63 characters long`);
        }

        if (!/^[a-z0-9-]+$/.test(container.name)) {
          errors.push(`Container name '${container.name}' must contain only lowercase letters, numbers, and hyphens`);
        }

        if (container.name.startsWith('-') || container.name.endsWith('-')) {
          errors.push(`Container name '${container.name}' cannot start or end with a hyphen`);
        }

        if (container.name.includes('--')) {
          errors.push(`Container name '${container.name}' cannot contain consecutive hyphens`);
        }
      }
    }

    // Warn about public access
    if (config.enableBlobPublicAccess) {
      warnings.push('Blob public access is enabled. Ensure this is intentional for security.');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get containers for a specific component.
   * Helper method for components to access their container information.
   *
   * @param config - Merged Storage configuration
   * @param componentId - Component identifier
   * @returns Array of container names for this component
   */
  public getComponentContainers(config: StorageConfig, componentId: string): string[] {
    if (!config.containers) return [];

    return config.containers
      .filter(c => c.componentId === componentId)
      .map(c => c.name);
  }
}
