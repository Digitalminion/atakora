/**
 * Cache Service
 *
 * @remarks
 * Caching abstraction that can be implemented with different backends
 * (Redis, in-memory, Azure Cache for Redis, etc.)
 *
 * @packageDocumentation
 */

/**
 * Cache entry
 *
 * @public
 */
export interface CacheEntry<T> {
  /**
   * Cached value
   */
  readonly value: T;

  /**
   * Expiration time (milliseconds since epoch)
   */
  readonly expiresAt: number;

  /**
   * Whether the entry has expired
   */
  readonly isExpired: boolean;
}

/**
 * Cache options
 *
 * @public
 */
export interface CacheOptions {
  /**
   * Time-to-live in milliseconds
   */
  readonly ttl?: number;

  /**
   * Whether to refresh TTL on get
   */
  readonly refreshOnGet?: boolean;
}

/**
 * Cache service interface
 *
 * @remarks
 * Abstract interface for caching.
 * Implement this interface with your preferred caching backend.
 *
 * @example
 * ```typescript
 * // In backend configuration
 * services: {
 *   cache: singleton(() => new InMemoryCacheService()),
 * }
 *
 * // In function handler
 * const cachedData = await context.services.cache.get<UserData>('user:123');
 * if (!cachedData) {
 *   const data = await fetchUserData('123');
 *   await context.services.cache.set('user:123', data, { ttl: 60000 });
 * }
 * ```
 *
 * @public
 */
export interface CacheService {
  /**
   * Get a value from cache
   *
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options (TTL, etc.)
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * Delete a value from cache
   *
   * @param key - Cache key
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a key exists in cache
   *
   * @param key - Cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): Promise<boolean>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics
   */
  getStats?(): Promise<ServiceCacheStats>;
}

/**
 * Cache statistics
 *
 * @public
 */
export interface ServiceCacheStats {
  /**
   * Number of entries in cache
   */
  readonly size: number;

  /**
   * Cache hit rate (0-1)
   */
  readonly hitRate?: number;

  /**
   * Number of cache hits
   */
  readonly hits?: number;

  /**
   * Number of cache misses
   */
  readonly misses?: number;
}

/**
 * In-memory cache service
 *
 * @remarks
 * Simple in-memory cache implementation.
 * Suitable for development and single-instance deployments.
 * For production, use Redis or Azure Cache for Redis.
 *
 * @public
 */
export class InMemoryCacheService implements CacheService {
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTtl: number;
  private hits = 0;
  private misses = 0;

  /**
   * Create an in-memory cache service
   *
   * @param options - Service options
   */
  constructor(
    options: {
      defaultTtl?: number;
    } = {}
  ) {
    this.defaultTtl = options.defaultTtl ?? 300000; // 5 minutes default
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl ?? this.defaultTtl;
    const expiresAt = Date.now() + ttl;

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      get isExpired() {
        return this.expiresAt < Date.now();
      },
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Check if a key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<ServiceCacheStats> {
    // Clean up expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < Date.now()) {
        this.cache.delete(key);
      }
    }

    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      size: this.cache.size,
      hitRate,
      hits: this.hits,
      misses: this.misses,
    };
  }
}
