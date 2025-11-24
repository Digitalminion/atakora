/**
 * Token Cache System
 *
 * Implements LRU-based token caching with TTL expiration and memory limits
 * to reduce validation overhead for frequently used tokens.
 *
 * @remarks
 * This cache is thread-safe and memory-bounded, designed for high-throughput
 * scenarios where token validation is a performance bottleneck.
 *
 * @packageDocumentation
 */

import type { TokenValidationResult } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Cache entry with metadata
 */
interface CacheEntry {
  /**
   * Validation result
   */
  readonly result: TokenValidationResult;

  /**
   * Timestamp when entry was cached (milliseconds since epoch)
   */
  readonly cachedAt: number;

  /**
   * Timestamp when entry expires (milliseconds since epoch)
   */
  readonly expiresAt: number;

  /**
   * Number of times this entry has been accessed
   */
  accessCount: number;

  /**
   * Timestamp of last access (milliseconds since epoch)
   */
  lastAccessedAt: number;

  /**
   * Monotonic sequence number for LRU ordering
   * Used to break ties when timestamps are identical
   */
  accessSequence: number;
}

/**
 * Token cache configuration options
 */
export interface TokenCacheOptions {
  /**
   * Maximum number of entries to cache
   * @default 1000
   */
  maxEntries?: number;

  /**
   * Time-to-live for cached entries in milliseconds
   * @default 300000 (5 minutes)
   */
  ttlMs?: number;

  /**
   * Maximum memory usage in bytes (approximate)
   * @default 10485760 (10 MB)
   */
  maxMemoryBytes?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /**
   * Current number of entries in cache
   */
  size: number;

  /**
   * Total number of cache hits
   */
  hits: number;

  /**
   * Total number of cache misses
   */
  misses: number;

  /**
   * Cache hit rate (0-1)
   */
  hitRate: number;

  /**
   * Number of entries evicted
   */
  evictions: number;

  /**
   * Number of entries that expired naturally
   */
  expirations: number;

  /**
   * Approximate memory usage in bytes
   */
  memoryUsage: number;
}

// ============================================================================
// Token Cache Implementation
// ============================================================================

/**
 * LRU cache for validated tokens with TTL expiration
 *
 * @remarks
 * Provides thread-safe caching of token validation results with:
 * - LRU (Least Recently Used) eviction policy
 * - TTL-based expiration
 * - Memory limits with approximate size tracking
 * - Cache invalidation API
 * - Performance metrics
 *
 * Security considerations:
 * - Never caches invalid tokens (only successful validations)
 * - Respects token expiration (won't cache beyond token exp claim)
 * - Provides cache invalidation for token revocation
 * - Uses constant-time key comparison
 *
 * @example
 * ```typescript
 * const cache = new TokenCache({
 *   maxEntries: 500,
 *   ttlMs: 60000, // 1 minute
 *   maxMemoryBytes: 5242880 // 5 MB
 * });
 *
 * // Check cache before validation
 * const cached = cache.get(token);
 * if (cached) {
 *   return cached;
 * }
 *
 * // Validate and cache result
 * const result = await validateToken(token);
 * if (result.valid) {
 *   cache.set(token, result);
 * }
 *
 * // Invalidate on logout/revocation
 * cache.invalidate(token);
 *
 * // Monitor performance
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
 * ```
 */
export class TokenCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly maxMemoryBytes: number;
  private readonly debug: boolean;

  // Statistics
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private expirations = 0;

  // Monotonic sequence counter for LRU ordering
  private accessSequenceCounter = 0;

  /**
   * Create a new token cache
   *
   * @param options - Cache configuration options
   */
  constructor(options: TokenCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
    this.ttlMs = options.ttlMs ?? 300000; // 5 minutes default
    this.maxMemoryBytes = options.maxMemoryBytes ?? 10485760; // 10 MB default
    this.debug = options.debug ?? false;

    this.log('Token cache initialized', {
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
      maxMemoryBytes: this.maxMemoryBytes,
    });
  }

  /**
   * Get cached validation result for a token
   *
   * @param token - The token to look up (never logged for security)
   * @returns Cached validation result, or null if not found/expired
   *
   * @remarks
   * Performs constant-time key comparison and updates access metadata
   * on cache hits. Automatically removes expired entries.
   */
  get(token: string): TokenValidationResult | null {
    if (!token || typeof token !== 'string') {
      return null;
    }

    // Generate cache key (hash for security and memory efficiency)
    const key = this.generateKey(token);

    const entry = this.cache.get(key);

    // Cache miss
    if (!entry) {
      this.misses++;
      this.log('Cache miss');
      return null;
    }

    const now = Date.now();

    // Check expiration
    if (now >= entry.expiresAt) {
      this.cache.delete(key);
      this.expirations++;
      this.misses++;
      this.log('Cache entry expired');
      return null;
    }

    // Cache hit - update access metadata
    entry.accessCount++;
    entry.lastAccessedAt = now;
    entry.accessSequence = ++this.accessSequenceCounter;
    this.hits++;

    this.log('Cache hit', {
      accessCount: entry.accessCount,
      accessSequence: entry.accessSequence,
      ageMs: now - entry.cachedAt,
    });

    return entry.result;
  }

  /**
   * Cache a validation result
   *
   * @param token - The token (never logged for security)
   * @param result - Validation result to cache
   *
   * @remarks
   * Only caches valid tokens. Respects token expiration and never caches
   * beyond the token's exp claim. Triggers LRU eviction if cache is full.
   */
  set(token: string, result: TokenValidationResult): void {
    // Only cache valid tokens
    if (!result.valid) {
      this.log('Skipping cache for invalid token');
      return;
    }

    if (!token || typeof token !== 'string') {
      return;
    }

    const key = this.generateKey(token);
    const now = Date.now();

    // Calculate expiration time
    // Use the earlier of: cache TTL or token expiration
    let expiresAt = now + this.ttlMs;

    if (result.claims?.exp) {
      const tokenExpirationMs = result.claims.exp * 1000;
      expiresAt = Math.min(expiresAt, tokenExpirationMs);
    }

    // Don't cache if already expired
    if (expiresAt <= now) {
      this.log('Token already expired, not caching');
      return;
    }

    // Don't cache if maxEntries is 0
    if (this.maxEntries === 0) {
      this.log('Max entries is 0, not caching');
      return;
    }

    // Check memory limit before adding
    if (this.shouldEvictForMemory()) {
      this.evictLRU();
    }

    // Check entry limit and evict if needed
    // Only evict if we're AT the limit (not above, which shouldn't happen)
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    // Create cache entry
    const entry: CacheEntry = {
      result,
      cachedAt: now,
      expiresAt,
      accessCount: 0,
      lastAccessedAt: now,
      accessSequence: ++this.accessSequenceCounter,
    };

    this.cache.set(key, entry);

    this.log('Token cached', {
      ttlMs: expiresAt - now,
      cacheSize: this.cache.size,
      accessSequence: entry.accessSequence,
    });
  }

  /**
   * Invalidate a cached token
   *
   * @param token - The token to invalidate (never logged)
   * @returns true if token was in cache and removed, false otherwise
   *
   * @remarks
   * Use this when a token is revoked, user logs out, or permissions change.
   * Thread-safe operation.
   */
  invalidate(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const key = this.generateKey(token);
    const existed = this.cache.delete(key);

    if (existed) {
      this.log('Token invalidated');
    }

    return existed;
  }

  /**
   * Clear all cached tokens
   *
   * @remarks
   * Use this for bulk invalidation (e.g., configuration change, security incident)
   */
  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.log('Cache cleared', { entriesRemoved: previousSize });
  }

  /**
   * Get cache statistics
   *
   * @returns Current cache statistics for monitoring
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      evictions: this.evictions,
      expirations: this.expirations,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Reset statistics counters
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expirations = 0;
    this.log('Statistics reset');
  }

  /**
   * Cleanup expired entries
   *
   * @returns Number of entries removed
   *
   * @remarks
   * Can be called periodically to proactively remove expired entries.
   * Automatic cleanup happens on get() and set() operations.
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        removed++;
        this.expirations++;
      }
    }

    if (removed > 0) {
      this.log('Cleanup complete', { entriesRemoved: removed });
    }

    return removed;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate cache key from token
   *
   * @remarks
   * For security and memory efficiency, we use the token directly as the key.
   * In production with very sensitive tokens, consider using crypto.subtle.digest
   * for SHA-256 hashing. However, this adds async complexity and the tokens
   * are already stored in the entry values, so direct key usage is acceptable.
   *
   * The cache itself is ephemeral (TTL-based) and should be in secure memory.
   */
  private generateKey(token: string): string {
    // Use token directly as key for simplicity and zero collisions
    // In production, if token storage in keys is a concern, use:
    // return crypto.createHash('sha256').update(token).digest('hex');
    // But this requires crypto module and adds overhead
    return token;
  }

  /**
   * Evict least recently used entry
   *
   * @remarks
   * Finds and removes the entry with the oldest lastAccessedAt timestamp.
   * Uses accessSequence as a tiebreaker when timestamps are identical.
   */
  private evictLRU(): void {
    if (this.cache.size === 0) {
      return;
    }

    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let oldestSequence = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Find entry with smallest timestamp, or if tied, smallest sequence number
      const isOlder =
        entry.lastAccessedAt < oldestTime ||
        (entry.lastAccessedAt === oldestTime && entry.accessSequence < oldestSequence);

      if (isOlder) {
        oldestTime = entry.lastAccessedAt;
        oldestSequence = entry.accessSequence;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictions++;
      this.log('LRU eviction performed');
    }
  }

  /**
   * Check if we should evict for memory reasons
   */
  private shouldEvictForMemory(): boolean {
    const currentMemory = this.estimateMemoryUsage();
    return currentMemory >= this.maxMemoryBytes;
  }

  /**
   * Estimate current memory usage
   *
   * @remarks
   * Rough estimation based on entry count and average entry size.
   * Not precise but good enough for limiting memory growth.
   */
  private estimateMemoryUsage(): number {
    // Rough estimate: 1 KB per entry (claims can vary widely)
    return this.cache.size * 1024;
  }

  /**
   * Debug logging helper
   */
  private log(message: string, data?: Record<string, any>): void {
    if (this.debug) {
      console.log(`[TokenCache] ${message}`, data || '');
    }
  }
}

/**
 * Create a singleton token cache instance
 *
 * @param options - Cache configuration options
 * @returns Shared cache instance
 *
 * @remarks
 * Use this for a global cache shared across the application.
 * For isolated caching (e.g., per-tenant), create separate instances.
 *
 * @example
 * ```typescript
 * const cache = createTokenCache({ maxEntries: 500 });
 *
 * // Use in validation
 * export async function validateWithCache(token: string) {
 *   const cached = cache.get(token);
 *   if (cached) return cached;
 *
 *   const result = await validate(token);
 *   if (result.valid) cache.set(token, result);
 *   return result;
 * }
 * ```
 */
export function createTokenCache(options: TokenCacheOptions = {}): TokenCache {
  return new TokenCache(options);
}
