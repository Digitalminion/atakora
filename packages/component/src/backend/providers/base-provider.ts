import type { Construct } from '@atakora/cdk';

/**
 * Resource requirement interface for providers.
 * This will be replaced with the actual interface from backend/interfaces.ts once available.
 */
export interface IResourceRequirement {
  /** Type of resource needed (e.g., 'cosmos', 'storage', 'functions') */
  readonly resourceType: string;

  /** Unique key for deduplication */
  readonly requirementKey: string;

  /** Configuration requirements */
  readonly config: any;

  /** Priority for conflict resolution (higher wins) */
  readonly priority?: number;
}

/**
 * Resource provider interface.
 * This will be replaced with the actual interface from backend/interfaces.ts once available.
 */
export interface IResourceProvider {
  /** Provider identifier */
  readonly providerId: string;

  /** Resource types this provider can handle */
  readonly supportedTypes: ReadonlyArray<string>;

  /** Check if provider can handle requirement */
  canProvide(requirement: IResourceRequirement): boolean;

  /** Create or get existing resource */
  provideResource(
    requirement: IResourceRequirement,
    scope: Construct,
    context: ProviderContext
  ): any;

  /** Merge multiple requirements into one */
  mergeRequirements(
    requirements: ReadonlyArray<IResourceRequirement>
  ): IResourceRequirement;
}

/**
 * Context provided to resource providers.
 */
export interface ProviderContext {
  readonly backend: any; // IBackend - will be defined in interfaces.ts
  readonly naming: NamingConvention;
  readonly tags: Record<string, string>;
  readonly existingResources: ReadonlyMap<string, any>;
}

/**
 * Naming convention interface for resource naming.
 */
export interface NamingConvention {
  formatResourceName(
    resourceType: string,
    backendId: string,
    suffix?: string
  ): string;
}

/**
 * Configuration merger result.
 */
export interface MergeResult<TConfig = any> {
  /** Merged configuration */
  readonly config: TConfig;

  /** Warnings about merge decisions */
  readonly warnings?: ReadonlyArray<string>;

  /** Whether requirements can be satisfied by a single resource */
  readonly canMerge: boolean;

  /** If splitting is needed, this contains the split strategy */
  readonly splitStrategy?: SplitStrategy;
}

/**
 * Strategy for splitting resources when limits are exceeded.
 */
export interface SplitStrategy {
  /** Number of resources needed */
  readonly resourceCount: number;

  /** How requirements are distributed */
  readonly distribution: Map<number, IResourceRequirement[]>;

  /** Reason for splitting */
  readonly reason: string;
}

/**
 * Validation result for provider configurations.
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;

  /** Validation errors */
  readonly errors?: ReadonlyArray<string>;

  /** Validation warnings */
  readonly warnings?: ReadonlyArray<string>;
}

/**
 * Error class for provider-specific errors.
 */
export class ProviderError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly code: string,
    message: string,
    public readonly details?: any
  ) {
    super(`[${providerId}] ${code}: ${message}`);
    this.name = 'ProviderError';
  }
}

/**
 * Abstract base class for resource providers.
 *
 * @remarks
 * Provides common functionality for all resource providers including:
 * - Configuration validation
 * - Requirement merging logic
 * - Resource limit handling
 * - Error handling utilities
 *
 * Concrete providers must implement:
 * - canMerge(): Determine if requirements can be merged
 * - merge(): Merge multiple requirements into one
 * - provision(): Create the actual Azure resource
 *
 * @example
 * ```typescript
 * class CosmosProvider extends BaseProvider<CosmosConfig, DatabaseAccounts> {
 *   readonly resourceType = 'cosmos';
 *   readonly providerId = 'cosmos-provider';
 *   readonly supportedTypes = ['cosmos'] as const;
 *
 *   canMerge(req1: CosmosConfig, req2: CosmosConfig): boolean {
 *     return req1.consistency === req2.consistency;
 *   }
 *
 *   merge(requirements: IResourceRequirement[]): CosmosConfig {
 *     // Merge logic here
 *   }
 *
 *   provision(scope: Construct, config: CosmosConfig): DatabaseAccounts {
 *     return new DatabaseAccounts(scope, 'CosmosDB', config);
 *   }
 * }
 * ```
 */
export abstract class BaseProvider<TConfig = any, TResource = any> implements IResourceProvider {
  /**
   * Unique identifier for this provider.
   */
  abstract readonly providerId: string;

  /**
   * Resource type this provider handles (e.g., 'cosmos', 'functions', 'storage').
   */
  abstract readonly resourceType: string;

  /**
   * Resource types this provider supports.
   */
  abstract readonly supportedTypes: ReadonlyArray<string>;

  /**
   * Maximum number of resources this provider will create before splitting.
   * Override in concrete providers to set resource limits.
   */
  protected readonly resourceLimit?: number;

  /**
   * Check if this provider can handle the given requirement.
   *
   * @param requirement - The resource requirement to check
   * @returns True if this provider can handle the requirement
   */
  canProvide(requirement: IResourceRequirement): boolean {
    return this.supportedTypes.includes(requirement.resourceType);
  }

  /**
   * Check if two configurations can be merged into a single resource.
   *
   * @param config1 - First configuration
   * @param config2 - Second configuration
   * @returns True if configurations can be merged
   */
  protected abstract canMerge(config1: TConfig, config2: TConfig): boolean;

  /**
   * Merge multiple requirements into a single configuration.
   *
   * @param requirements - Array of requirements to merge
   * @returns Merged configuration
   * @throws {ProviderError} If requirements cannot be merged
   */
  protected abstract merge(requirements: ReadonlyArray<IResourceRequirement>): TConfig;

  /**
   * Provision the actual Azure resource.
   *
   * @param scope - The construct scope
   * @param id - Unique identifier for the resource
   * @param config - Merged configuration
   * @param context - Provider context
   * @returns The created resource
   */
  protected abstract provision(
    scope: Construct,
    id: string,
    config: TConfig,
    context: ProviderContext
  ): TResource;

  /**
   * Validate a configuration before provisioning.
   *
   * @param config - Configuration to validate
   * @returns Validation result
   */
  protected validate(config: TConfig): ValidationResult {
    // Default implementation - override in concrete providers for specific validation
    return { valid: true };
  }

  /**
   * Merge multiple requirements into one.
   * This is the main entry point called by the backend orchestrator.
   *
   * @param requirements - Array of requirements to merge
   * @returns Single merged requirement
   * @throws {ProviderError} If requirements cannot be merged
   */
  mergeRequirements(
    requirements: ReadonlyArray<IResourceRequirement>
  ): IResourceRequirement {
    if (requirements.length === 0) {
      throw this.createError(
        'EMPTY_REQUIREMENTS',
        'Cannot merge empty requirements array'
      );
    }

    if (requirements.length === 1) {
      return requirements[0];
    }

    // Check resource limits
    if (this.resourceLimit && requirements.length > this.resourceLimit) {
      throw this.createError(
        'RESOURCE_LIMIT_EXCEEDED',
        `Cannot merge ${requirements.length} requirements. Limit is ${this.resourceLimit}.`,
        { limit: this.resourceLimit, actual: requirements.length }
      );
    }

    // Validate all requirements are for the same resource type
    const resourceType = requirements[0].resourceType;
    for (const req of requirements) {
      if (req.resourceType !== resourceType) {
        throw this.createError(
          'MIXED_RESOURCE_TYPES',
          `Cannot merge requirements with different resource types: ${resourceType} and ${req.resourceType}`
        );
      }
    }

    // Check if all requirements can be merged
    const mergeResult = this.analyzeMergeability(requirements);
    if (!mergeResult.canMerge) {
      throw this.createError(
        'CANNOT_MERGE',
        'Requirements cannot be merged due to incompatible configurations',
        { warnings: mergeResult.warnings }
      );
    }

    // Perform the merge
    const mergedConfig = this.merge(requirements);

    // Validate merged configuration
    const validation = this.validate(mergedConfig);
    if (!validation.valid) {
      throw this.createError(
        'INVALID_MERGED_CONFIG',
        'Merged configuration is invalid',
        { errors: validation.errors }
      );
    }

    // Use the first requirement as a template and override config
    const firstReq = requirements[0];
    return {
      resourceType: firstReq.resourceType,
      requirementKey: firstReq.requirementKey,
      config: mergedConfig,
      priority: Math.max(...requirements.map(r => r.priority ?? 10)),
    };
  }

  /**
   * Provide a resource based on the requirement.
   *
   * @param requirement - The resource requirement
   * @param scope - The construct scope
   * @param context - Provider context
   * @returns The created or retrieved resource
   */
  provideResource(
    requirement: IResourceRequirement,
    scope: Construct,
    context: ProviderContext
  ): TResource {
    // Check if resource already exists
    const key = `${requirement.resourceType}:${requirement.requirementKey}`;
    const existing = context.existingResources.get(key);
    if (existing) {
      return existing as TResource;
    }

    // Validate configuration
    const validation = this.validate(requirement.config);
    if (!validation.valid) {
      throw this.createError(
        'INVALID_CONFIG',
        'Configuration validation failed',
        { errors: validation.errors }
      );
    }

    // Generate resource name
    const resourceName = context.naming.formatResourceName(
      this.resourceType,
      context.backend.backendId,
      requirement.requirementKey
    );

    // Provision the resource
    try {
      return this.provision(scope, resourceName, requirement.config, context);
    } catch (error) {
      throw this.createError(
        'PROVISION_FAILED',
        `Failed to provision ${this.resourceType} resource`,
        { originalError: error, requirement }
      );
    }
  }

  /**
   * Analyze whether multiple requirements can be merged.
   *
   * @param requirements - Requirements to analyze
   * @returns Merge analysis result
   */
  protected analyzeMergeability(
    requirements: ReadonlyArray<IResourceRequirement>
  ): MergeResult {
    const warnings: string[] = [];

    // Check pairwise compatibility
    for (let i = 0; i < requirements.length; i++) {
      for (let j = i + 1; j < requirements.length; j++) {
        const req1 = requirements[i].config;
        const req2 = requirements[j].config;

        if (!this.canMerge(req1, req2)) {
          return {
            config: null,
            canMerge: false,
            warnings: [
              `Requirements ${i} and ${j} are incompatible and cannot be merged`
            ],
          };
        }
      }
    }

    return {
      config: null as any, // Config will be created during actual merge
      canMerge: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Split requirements into multiple groups when resource limits are exceeded.
   *
   * @param requirements - Requirements to split
   * @param limit - Maximum items per resource
   * @returns Split strategy
   */
  protected splitRequirements(
    requirements: ReadonlyArray<IResourceRequirement>,
    limit: number
  ): SplitStrategy {
    const resourceCount = Math.ceil(requirements.length / limit);
    const distribution = new Map<number, IResourceRequirement[]>();

    // Distribute requirements evenly across resources
    for (let i = 0; i < requirements.length; i++) {
      const resourceIndex = Math.floor(i / limit);
      const group = distribution.get(resourceIndex) ?? [];
      group.push(requirements[i]);
      distribution.set(resourceIndex, group);
    }

    return {
      resourceCount,
      distribution,
      reason: `Exceeded resource limit of ${limit} items per resource`,
    };
  }

  /**
   * Create a provider-specific error.
   *
   * @param code - Error code
   * @param message - Error message
   * @param details - Additional error details
   * @returns ProviderError instance
   */
  protected createError(code: string, message: string, details?: any): ProviderError {
    return new ProviderError(this.providerId, code, message, details);
  }

  /**
   * Merge two configuration objects using priority-based strategy.
   * Higher priority wins conflicts.
   *
   * @param config1 - First configuration
   * @param config2 - Second configuration
   * @param priority1 - Priority of first config
   * @param priority2 - Priority of second config
   * @returns Merged configuration
   */
  protected mergePriorityBased<T extends Record<string, any>>(
    config1: T,
    config2: T,
    priority1: number = 10,
    priority2: number = 10
  ): T {
    const result: any = { ...config1 };

    for (const key in config2) {
      if (!(key in result)) {
        // New key, just add it
        result[key] = config2[key];
      } else if (result[key] !== config2[key]) {
        // Conflict - use priority
        if (priority2 > priority1) {
          result[key] = config2[key];
        }
      }
    }

    return result as T;
  }

  /**
   * Merge two configuration objects using union strategy.
   * Arrays are concatenated, objects are merged recursively.
   *
   * @param config1 - First configuration
   * @param config2 - Second configuration
   * @returns Merged configuration
   */
  protected mergeUnion<T extends Record<string, any>>(config1: T, config2: T): T {
    const result: any = { ...config1 };

    for (const key in config2) {
      if (!(key in result)) {
        result[key] = config2[key];
      } else if (Array.isArray(result[key]) && Array.isArray(config2[key])) {
        // Concatenate arrays
        result[key] = [...result[key], ...config2[key]];
      } else if (
        typeof result[key] === 'object' &&
        result[key] !== null &&
        typeof config2[key] === 'object' &&
        config2[key] !== null
      ) {
        // Recursively merge objects
        result[key] = this.mergeUnion(result[key], config2[key]);
      }
      // Primitives from config1 take precedence (already in result)
    }

    return result as T;
  }

  /**
   * Merge two configuration objects using maximum strategy.
   * Takes the maximum value for numeric properties.
   *
   * @param config1 - First configuration
   * @param config2 - Second configuration
   * @returns Merged configuration
   */
  protected mergeMaximum<T extends Record<string, any>>(config1: T, config2: T): T {
    const result: any = { ...config1 };

    for (const key in config2) {
      if (!(key in result)) {
        result[key] = config2[key];
      } else if (typeof result[key] === 'number' && typeof config2[key] === 'number') {
        result[key] = Math.max(result[key] as number, config2[key] as number);
      }
    }

    return result as T;
  }
}
