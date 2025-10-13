/**
 * Build cache for function artifacts
 *
 * @remarks
 * This module provides caching for built function artifacts to speed up
 * incremental builds. The cache is invalidated when:
 * - Handler.ts file changes
 * - Resource.ts file changes
 * - Build options change
 * - Dependencies change
 * - Node.js version changes
 */
import { BuildArtifact, CacheConfig } from './types';
/**
 * Build cache for function artifacts
 *
 * @remarks
 * Implements a disk-based cache with TTL and size limits.
 * Cache entries are JSON files containing serialized artifacts.
 *
 * @example
 * ```typescript
 * const cache = new BuildCache({ cacheDir: '.cache' });
 *
 * // Generate cache key
 * const key = await cache.getCacheKey(
 *   '/path/to/handler.ts',
 *   buildOptions,
 *   '/path/to/resource.ts'
 * );
 *
 * // Check cache
 * const cached = await cache.get(key);
 * if (cached) {
 *   return cached;
 * }
 *
 * // Build and cache
 * const artifact = await build();
 * await cache.set(key, artifact);
 * ```
 */
export declare class BuildCache {
    private readonly config;
    constructor(config?: Partial<CacheConfig>);
    /**
     * Generate cache key from function inputs
     *
     * @param handlerPath - Path to handler.ts
     * @param buildOptions - Build options
     * @param resourcePath - Path to resource.ts (optional)
     * @returns Cache key (SHA256 hash)
     *
     * @remarks
     * Cache key is computed from:
     * - Handler file content hash
     * - Build options JSON
     * - Resource file content hash (if provided)
     * - Package.json dependencies hash
     * - Node.js version
     */
    getCacheKey(handlerPath: string, buildOptions: any, resourcePath?: string): Promise<string>;
    /**
     * Get cached artifact
     *
     * @param key - Cache key
     * @returns Cached artifact or null if not found/expired
     */
    get(key: string): Promise<BuildArtifact | null>;
    /**
     * Store artifact in cache
     *
     * @param key - Cache key
     * @param artifact - Build artifact to cache
     */
    set(key: string, artifact: BuildArtifact): Promise<void>;
    /**
     * Remove cached artifact
     *
     * @param key - Cache key
     */
    remove(key: string): Promise<void>;
    /**
     * Invalidate cache entries matching pattern
     *
     * @param pattern - Pattern to match cache keys (optional)
     *
     * @remarks
     * If pattern is provided, only matching cache entries are removed.
     * If pattern is undefined, entire cache is cleared.
     */
    invalidate(pattern?: string): Promise<void>;
    /**
     * Get cache statistics
     *
     * @returns Cache statistics
     */
    getStats(): Promise<{
        entries: number;
        totalSize: number;
        oldestEntry: number | null;
        newestEntry: number | null;
    }>;
    /**
     * Get cache file path for key
     *
     * @param key - Cache key
     * @returns Full path to cache file
     *
     * @internal
     */
    private getCachePath;
    /**
     * Ensure cache directory exists
     *
     * @internal
     */
    private ensureCacheDir;
    /**
     * Enforce maximum cache size by removing oldest entries
     *
     * @internal
     */
    private enforceMaxSize;
    /**
     * Compute SHA256 hash of file
     *
     * @param filePath - Path to file
     * @returns Hex-encoded hash
     *
     * @internal
     */
    private getFileHash;
    /**
     * Compute hash of package.json dependencies
     *
     * @param handlerPath - Path to handler.ts (used to find package.json)
     * @returns Hex-encoded hash of dependencies
     *
     * @internal
     */
    private getDependencyHash;
    /**
     * Convert Uint8Array to base64 string
     *
     * @param data - Uint8Array data
     * @returns Base64 encoded string
     *
     * @internal
     */
    private uint8ArrayToBase64;
    /**
     * Convert base64 string to Uint8Array
     *
     * @param base64 - Base64 encoded string
     * @returns Uint8Array data
     *
     * @internal
     */
    private base64ToUint8Array;
}
//# sourceMappingURL=cache.d.ts.map