/**
 * Performance Attachment Logic
 *
 * Provides attachment point functionality for performance resources including
 * CDN, Redis cache, and rate limiting. These are optional performance enhancements
 * that can be customized based on application requirements.
 *
 * @module @atakora/component/backend/attachments
 */

import type {
  CdnConfig,
  CdnProfile,
  CachingBehavior,
  CacheConfig,
  CacheSkuFamily,
  CacheSkuCapacity,
  EvictionPolicy,
  RateLimitConfig,
} from '../defaults/types';

/**
 * Validation result for performance attachments
 */
export interface PerformanceAttachmentValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

// ============================================================================
// CDN Attachment
// ============================================================================

/**
 * CDN attachment builder
 *
 * Provides fluent API for building CDN configurations
 * that can be attached to backend performance resources.
 *
 * @example
 * ```typescript
 * const customCdn = cdn()
 *   .enable(true)
 *   .profile('Premium_Verizon')
 *   .caching('Override')
 *   .compression(true)
 *   .queryStringCaching('UseQueryString')
 *   .build();
 *
 * backend.performance.cdn.attach(customCdn);
 * ```
 */
export class CdnAttachmentBuilder {
  private config: Partial<CdnConfig> = {
    enabled: true,
  };

  /**
   * Enable or disable CDN
   *
   * @param enable - Whether to enable CDN
   * @returns Builder for chaining
   */
  public enable(enable: boolean): this {
    this.config = { ...this.config, enabled: enable };
    return this;
  }

  /**
   * Set CDN profile
   *
   * @param profile - CDN profile type
   * @returns Builder for chaining
   *
   * @example
   * ```typescript
   * // Standard profiles
   * builder.profile('Standard_Microsoft')
   * builder.profile('Standard_Akamai')
   *
   * // Premium profile for advanced features
   * builder.profile('Premium_Verizon')
   * ```
   */
  public profile(profile: CdnProfile): this {
    this.config = { ...this.config, profile };
    return this;
  }

  /**
   * Set caching behavior
   *
   * @param behavior - Caching behavior
   * @returns Builder for chaining
   */
  public caching(behavior: CachingBehavior): this {
    this.config = { ...this.config, caching: behavior };
    return this;
  }

  /**
   * Enable or disable compression
   *
   * Compression reduces bandwidth and improves load times for
   * compressible content (HTML, CSS, JS, JSON).
   *
   * @param enable - Whether to enable compression
   * @returns Builder for chaining
   */
  public compression(enable: boolean): this {
    this.config = { ...this.config, compression: enable };
    return this;
  }

  /**
   * Set query string caching behavior
   *
   * @param behavior - Query string caching behavior
   * @returns Builder for chaining
   */
  public queryStringCaching(behavior: 'IgnoreQueryString' | 'UseQueryString' | 'NotSet'): this {
    this.config = { ...this.config, queryStringCaching: behavior };
    return this;
  }

  /**
   * Build the CDN configuration
   *
   * @returns Complete CDN configuration
   * @throws Error if required fields are missing
   */
  public build(): CdnConfig {
    if (!this.config.profile) {
      throw new Error('CDN profile is required');
    }

    if (!this.config.caching) {
      throw new Error('CDN caching behavior is required');
    }

    return this.config as CdnConfig;
  }
}

/**
 * Create a new CDN attachment builder
 *
 * @returns CDN attachment builder
 */
export function cdn(): CdnAttachmentBuilder {
  return new CdnAttachmentBuilder();
}

/**
 * Validate CDN configuration
 *
 * @param config - CDN configuration to validate
 * @returns Validation result with errors and warnings
 */
export function validateCdnAttachment(config: CdnConfig): PerformanceAttachmentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.enabled) {
    // Validate profile
    if (!config.profile) {
      errors.push('CDN profile is required when CDN is enabled');
    }

    // Validate caching
    if (!config.caching) {
      errors.push('CDN caching behavior is required when CDN is enabled');
    }

    // Warnings for performance
    if (!config.compression) {
      warnings.push('Compression is recommended for better CDN performance');
    }

    if (config.profile === 'Standard_Akamai' && config.caching === 'Override') {
      warnings.push('Override caching may not be fully supported on Standard_Akamai profile');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Cache Attachment
// ============================================================================

/**
 * Cache attachment builder
 *
 * Provides fluent API for building Redis cache configurations
 * that can be attached to backend performance resources.
 *
 * @example
 * ```typescript
 * const customCache = cache()
 *   .enable(true)
 *   .sku('Premium', 'P', '1')
 *   .evictionPolicy('allkeys-lfu')
 *   .enableNonSslPort(false)
 *   .minimumTlsVersion('1.2')
 *   .build();
 *
 * backend.performance.cache.attach(customCache);
 * ```
 */
export class CacheAttachmentBuilder {
  private config: Partial<CacheConfig> = {
    enabled: true,
  };

  /**
   * Enable or disable cache
   *
   * @param enable - Whether to enable cache
   * @returns Builder for chaining
   */
  public enable(enable: boolean): this {
    this.config = { ...this.config, enabled: enable };
    return this;
  }

  /**
   * Set cache SKU
   *
   * @param tier - Cache tier (Basic, Standard, Premium)
   * @param family - SKU family (C for Basic/Standard, P for Premium)
   * @param capacity - SKU capacity (0-6)
   * @returns Builder for chaining
   *
   * @example
   * ```typescript
   * // Standard C1 (1GB)
   * builder.sku('Standard', 'C', '1')
   *
   * // Premium P1 (6GB) with clustering and persistence
   * builder.sku('Premium', 'P', '1')
   * ```
   */
  public sku(
    tier: 'Basic' | 'Standard' | 'Premium',
    family: CacheSkuFamily,
    capacity: CacheSkuCapacity
  ): this {
    this.config = {
      ...this.config,
      sku: { tier, family, capacity },
    };
    return this;
  }

  /**
   * Set eviction policy
   *
   * Controls how Redis evicts keys when memory limit is reached.
   *
   * @param policy - Eviction policy
   * @returns Builder for chaining
   *
   * @example
   * ```typescript
   * // LRU eviction (recommended for most cases)
   * builder.evictionPolicy('allkeys-lru')
   *
   * // LFU eviction (better for stable workloads)
   * builder.evictionPolicy('allkeys-lfu')
   *
   * // No eviction (returns errors when full)
   * builder.evictionPolicy('noeviction')
   * ```
   */
  public evictionPolicy(policy: EvictionPolicy): this {
    this.config = { ...this.config, evictionPolicy: policy };
    return this;
  }

  /**
   * Enable or disable non-SSL port
   *
   * @param enable - Whether to enable non-SSL port (6379)
   * @returns Builder for chaining
   */
  public enableNonSslPort(enable: boolean): this {
    this.config = { ...this.config, enableNonSslPort: enable };
    return this;
  }

  /**
   * Set minimum TLS version
   *
   * @param version - Minimum TLS version
   * @returns Builder for chaining
   */
  public minimumTlsVersion(version: '1.0' | '1.1' | '1.2'): this {
    this.config = { ...this.config, minimumTlsVersion: version };
    return this;
  }

  /**
   * Build the cache configuration
   *
   * @returns Complete cache configuration
   * @throws Error if required fields are missing
   */
  public build(): CacheConfig {
    if (!this.config.sku) {
      throw new Error('Cache SKU is required');
    }

    if (!this.config.evictionPolicy) {
      throw new Error('Cache eviction policy is required');
    }

    return this.config as CacheConfig;
  }
}

/**
 * Create a new cache attachment builder
 *
 * @returns Cache attachment builder
 */
export function cache(): CacheAttachmentBuilder {
  return new CacheAttachmentBuilder();
}

/**
 * Validate cache configuration
 *
 * @param config - Cache configuration to validate
 * @returns Validation result with errors and warnings
 */
export function validateCacheAttachment(config: CacheConfig): PerformanceAttachmentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.enabled) {
    // Validate SKU
    if (!config.sku) {
      errors.push('Cache SKU is required when cache is enabled');
    } else {
      // Validate SKU family matches tier
      if (
        (config.sku.tier === 'Basic' || config.sku.tier === 'Standard') &&
        config.sku.family !== 'C'
      ) {
        errors.push('Basic and Standard tiers must use C family');
      }

      if (config.sku.tier === 'Premium' && config.sku.family !== 'P') {
        errors.push('Premium tier must use P family');
      }

      // Check capacity range
      const capacity = parseInt(config.sku.capacity);
      if (isNaN(capacity) || capacity < 0 || capacity > 6) {
        errors.push('Cache capacity must be between 0 and 6');
      }
    }

    // Security warnings
    if (config.enableNonSslPort) {
      warnings.push('Non-SSL port is enabled. This is not recommended for production');
    }

    if (config.minimumTlsVersion && config.minimumTlsVersion !== '1.2') {
      warnings.push('TLS 1.2 is recommended for production workloads');
    }

    // Eviction policy warnings
    if (config.evictionPolicy === 'noeviction') {
      warnings.push('No eviction policy may cause errors when cache is full');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Rate Limit Attachment
// ============================================================================

/**
 * Rate limit attachment builder
 *
 * Provides fluent API for building rate limiting configurations
 * that can be attached to backend performance resources.
 *
 * @example
 * ```typescript
 * const customRateLimit = rateLimit()
 *   .enable(true)
 *   .requestsPerMinute(5000)
 *   .burstSize(500)
 *   .enablePerClientLimits(true)
 *   .blockDuration(600)
 *   .build();
 *
 * backend.performance.rateLimit.attach(customRateLimit);
 * ```
 */
export class RateLimitAttachmentBuilder {
  private config: Partial<RateLimitConfig> = {
    enabled: true,
  };

  /**
   * Enable or disable rate limiting
   *
   * @param enable - Whether to enable rate limiting
   * @returns Builder for chaining
   */
  public enable(enable: boolean): this {
    this.config = { ...this.config, enabled: enable };
    return this;
  }

  /**
   * Set requests per minute limit
   *
   * @param limit - Maximum requests per minute
   * @returns Builder for chaining
   */
  public requestsPerMinute(limit: number): this {
    this.config = { ...this.config, requestsPerMinute: limit };
    return this;
  }

  /**
   * Set burst size
   *
   * Burst size allows temporary spikes above the base rate limit.
   *
   * @param size - Burst size
   * @returns Builder for chaining
   */
  public burstSize(size: number): this {
    this.config = { ...this.config, burstSize: size };
    return this;
  }

  /**
   * Enable or disable per-client limits
   *
   * Per-client limits track and enforce limits per IP or API key.
   *
   * @param enable - Whether to enable per-client limits
   * @returns Builder for chaining
   */
  public enablePerClientLimits(enable: boolean): this {
    this.config = { ...this.config, enablePerClientLimits: enable };
    return this;
  }

  /**
   * Set block duration for rate limit violations
   *
   * @param seconds - Block duration in seconds
   * @returns Builder for chaining
   */
  public blockDuration(seconds: number): this {
    this.config = { ...this.config, blockDuration: seconds };
    return this;
  }

  /**
   * Build the rate limit configuration
   *
   * @returns Complete rate limit configuration
   * @throws Error if required fields are missing
   */
  public build(): RateLimitConfig {
    if (this.config.requestsPerMinute === undefined) {
      throw new Error('Requests per minute is required');
    }

    if (this.config.burstSize === undefined) {
      throw new Error('Burst size is required');
    }

    return this.config as RateLimitConfig;
  }
}

/**
 * Create a new rate limit attachment builder
 *
 * @returns Rate limit attachment builder
 */
export function rateLimit(): RateLimitAttachmentBuilder {
  return new RateLimitAttachmentBuilder();
}

/**
 * Validate rate limit configuration
 *
 * @param config - Rate limit configuration to validate
 * @returns Validation result with errors and warnings
 */
export function validateRateLimitAttachment(
  config: RateLimitConfig
): PerformanceAttachmentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.enabled) {
    // Validate requests per minute
    if (config.requestsPerMinute <= 0) {
      errors.push('Requests per minute must be greater than 0');
    }

    if (config.requestsPerMinute < 60) {
      warnings.push('Very low rate limit (< 1 req/sec). This may block legitimate traffic');
    }

    // Validate burst size
    if (config.burstSize <= 0) {
      errors.push('Burst size must be greater than 0');
    }

    if (config.burstSize > config.requestsPerMinute) {
      warnings.push('Burst size exceeds rate limit. Consider reducing burst size');
    }

    // Validate block duration
    if (config.blockDuration !== undefined) {
      if (config.blockDuration < 0) {
        errors.push('Block duration cannot be negative');
      }

      if (config.blockDuration > 3600) {
        warnings.push('Block duration exceeds 1 hour. This may be too aggressive');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Attachment Points
// ============================================================================

/**
 * Generic performance attachment point
 */
export class PerformanceAttachmentPoint<T> {
  private attachedConfig?: T;

  constructor(
    private readonly defaultConfig: T | undefined,
    private readonly validator: (config: T) => PerformanceAttachmentValidation
  ) {}

  /**
   * Attach custom configuration
   *
   * @param config - Custom configuration to attach
   * @throws Error if validation fails
   */
  public attach(config: T): void {
    const validation = this.validator(config);

    if (!validation.valid) {
      throw new Error(`Performance attachment validation failed:\n${validation.errors.join('\n')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('Performance attachment warnings:', validation.warnings);
    }

    this.attachedConfig = config;
  }

  /**
   * Check if custom configuration is attached
   */
  public isAttached(): boolean {
    return this.attachedConfig !== undefined;
  }

  /**
   * Get current configuration (attached or default)
   */
  public getConfig(): T | undefined {
    return this.attachedConfig ?? this.defaultConfig;
  }

  /**
   * Reset to default configuration
   */
  public reset(): void {
    this.attachedConfig = undefined;
  }
}

/**
 * Create attachment points for performance features
 *
 * @param defaults - Default performance configurations
 * @returns Object with attachment points for each performance feature
 */
export function createPerformanceAttachmentPoints(defaults?: {
  readonly cdn?: CdnConfig;
  readonly cache?: CacheConfig;
  readonly rateLimit?: RateLimitConfig;
}) {
  return {
    cdn: new PerformanceAttachmentPoint(defaults?.cdn, validateCdnAttachment),
    cache: new PerformanceAttachmentPoint(defaults?.cache, validateCacheAttachment),
    rateLimit: new PerformanceAttachmentPoint(defaults?.rateLimit, validateRateLimitAttachment),
  };
}

// ============================================================================
// Performance Builder API (Stub Implementation)
// ============================================================================

/**
 * TODO: Full implementation of performance builder API
 * This is a stub to allow example code to compile.
 */

/**
 * Performance builder stub
 * @internal
 */
export interface PerformanceResourceBuilder {
  when(condition: boolean, callback: (builder: this) => any): this;
  _build(): any;
  // Allow any method for fluent API
  [key: string]: any;
}

class PerformanceResourceBuilderImpl implements PerformanceResourceBuilder {
  private config: any = {};

  constructor() {
    // Return a proxy that accepts any method call
    return new Proxy(this, {
      get(target, prop: string) {
        if (prop === '_build') {
          return () => target.config;
        }
        if (prop === 'when') {
          return (condition: boolean, callback: (builder: any) => any) => {
            if (condition) callback(target);
            return target;
          };
        }
        // Any other method call returns the builder for chaining
        return (...args: any[]) => {
          target.config[prop] = args;
          return target;
        };
      },
    }) as any;
  }

  when(condition: boolean, callback: (builder: any) => any): this {
    if (condition) callback(this);
    return this;
  }

  _build(): any {
    return this.config;
  }

  [key: string]: any;
}

/**
 * Performance namespace with builder factory methods
 */
export const perf = {
  /**
   * Create a CDN builder (stub)
   */
  cdn(): PerformanceResourceBuilder {
    return new PerformanceResourceBuilderImpl();
  },

  /**
   * Create a Redis cache builder (stub)
   */
  redis(): PerformanceResourceBuilder {
    return new PerformanceResourceBuilderImpl();
  },

  /**
   * Create a rate limiter builder (stub)
   */
  rateLimiter(): PerformanceResourceBuilder {
    return new PerformanceResourceBuilderImpl();
  },

  /**
   * Create a compression builder (stub)
   */
  compression(): PerformanceResourceBuilder {
    return new PerformanceResourceBuilderImpl();
  },
};

/**
 * Define performance configuration
 *
 * @param configs - Performance configuration
 * @returns Performance configuration
 */
export function definePerformance(configs: Record<string, any>): any {
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
