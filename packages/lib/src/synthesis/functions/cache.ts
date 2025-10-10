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

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { BuildArtifact, CacheConfig, CacheEntry } from './types';

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  cacheDir: path.join(process.cwd(), '.atakora', 'build-cache'),
  ttl: 3600000, // 1 hour
  maxSize: 1024 * 1024 * 1024, // 1GB
  enabled: true,
};

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
export class BuildCache {
  private readonly config: Required<CacheConfig>;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

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
  async getCacheKey(
    handlerPath: string,
    buildOptions: any,
    resourcePath?: string
  ): Promise<string> {
    const factors: string[] = [];

    // Handler file hash
    const handlerHash = await this.getFileHash(handlerPath);
    factors.push(`handler:${handlerHash}`);

    // Build options
    factors.push(`options:${JSON.stringify(buildOptions)}`);

    // Resource file hash (if exists)
    if (resourcePath && fs.existsSync(resourcePath)) {
      const resourceHash = await this.getFileHash(resourcePath);
      factors.push(`resource:${resourceHash}`);
    }

    // Dependencies hash
    const depsHash = await this.getDependencyHash(handlerPath);
    factors.push(`deps:${depsHash}`);

    // Node version
    factors.push(`node:${process.version}`);

    // Compute final cache key
    return crypto
      .createHash('sha256')
      .update(factors.join('|'))
      .digest('hex');
  }

  /**
   * Get cached artifact
   *
   * @param key - Cache key
   * @returns Cached artifact or null if not found/expired
   */
  async get(key: string): Promise<BuildArtifact | null> {
    if (!this.config.enabled) {
      return null;
    }

    const cachePath = this.getCachePath(key);

    try {
      // Check if cache file exists
      if (!fs.existsSync(cachePath)) {
        return null;
      }

      // Check if cache entry is expired
      const stats = fs.statSync(cachePath);
      const age = Date.now() - stats.mtimeMs;

      if (age > this.config.ttl) {
        // Remove expired cache entry
        await this.remove(key);
        return null;
      }

      // Read and deserialize cache entry
      const content = fs.readFileSync(cachePath, 'utf-8');
      const entry: CacheEntry = JSON.parse(content);

      // Convert base64 strings back to Uint8Array
      const artifact: BuildArtifact = {
        ...entry.artifact,
        bundle: this.base64ToUint8Array(entry.artifact.bundle as any),
        sourceMap: entry.artifact.sourceMap
          ? this.base64ToUint8Array(entry.artifact.sourceMap as any)
          : undefined,
      };

      return artifact;
    } catch (error) {
      // Cache read error - invalidate and return null
      console.warn(`Cache read error for key ${key}:`, error);
      await this.remove(key).catch(() => {});
      return null;
    }
  }

  /**
   * Store artifact in cache
   *
   * @param key - Cache key
   * @param artifact - Build artifact to cache
   */
  async set(key: string, artifact: BuildArtifact): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Ensure cache directory exists
      this.ensureCacheDir();

      // Convert Uint8Array to base64 for JSON serialization
      const serializableArtifact = {
        ...artifact,
        bundle: this.uint8ArrayToBase64(artifact.bundle),
        sourceMap: artifact.sourceMap
          ? this.uint8ArrayToBase64(artifact.sourceMap)
          : undefined,
      };

      // Create cache entry
      const entry: CacheEntry = {
        key,
        artifact: serializableArtifact as any,
        cachedAt: Date.now(),
        ttl: this.config.ttl,
      };

      // Write to cache file
      const cachePath = this.getCachePath(key);
      fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2), 'utf-8');

      // Enforce cache size limit
      await this.enforceMaxSize();
    } catch (error) {
      // Cache write error - log but don't fail build
      console.warn(`Failed to write cache for key ${key}:`, error);
    }
  }

  /**
   * Remove cached artifact
   *
   * @param key - Cache key
   */
  async remove(key: string): Promise<void> {
    const cachePath = this.getCachePath(key);

    try {
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
    } catch (error) {
      console.warn(`Failed to remove cache entry ${key}:`, error);
    }
  }

  /**
   * Invalidate cache entries matching pattern
   *
   * @param pattern - Pattern to match cache keys (optional)
   *
   * @remarks
   * If pattern is provided, only matching cache entries are removed.
   * If pattern is undefined, entire cache is cleared.
   */
  async invalidate(pattern?: string): Promise<void> {
    this.ensureCacheDir();

    try {
      const files = fs.readdirSync(this.config.cacheDir);

      if (pattern) {
        // Remove matching entries
        const matching = files.filter(f => f.includes(pattern));
        for (const file of matching) {
          const filePath = path.join(this.config.cacheDir, file);
          fs.unlinkSync(filePath);
        }
      } else {
        // Clear entire cache
        for (const file of files) {
          const filePath = path.join(this.config.cacheDir, file);
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.warn('Failed to invalidate cache:', error);
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  async getStats(): Promise<{
    entries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    this.ensureCacheDir();

    try {
      const files = fs.readdirSync(this.config.cacheDir);
      let totalSize = 0;
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;

      for (const file of files) {
        const filePath = path.join(this.config.cacheDir, file);
        const stats = fs.statSync(filePath);

        totalSize += stats.size;

        if (oldestEntry === null || stats.mtimeMs < oldestEntry) {
          oldestEntry = stats.mtimeMs;
        }

        if (newestEntry === null || stats.mtimeMs > newestEntry) {
          newestEntry = stats.mtimeMs;
        }
      }

      return {
        entries: files.length,
        totalSize,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      return {
        entries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Get cache file path for key
   *
   * @param key - Cache key
   * @returns Full path to cache file
   *
   * @internal
   */
  private getCachePath(key: string): string {
    return path.join(this.config.cacheDir, `${key}.json`);
  }

  /**
   * Ensure cache directory exists
   *
   * @internal
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.config.cacheDir)) {
      fs.mkdirSync(this.config.cacheDir, { recursive: true });
    }
  }

  /**
   * Enforce maximum cache size by removing oldest entries
   *
   * @internal
   */
  private async enforceMaxSize(): Promise<void> {
    const stats = await this.getStats();

    if (stats.totalSize <= this.config.maxSize) {
      return;
    }

    // Get all cache files sorted by modification time (oldest first)
    const files = fs.readdirSync(this.config.cacheDir)
      .map(f => {
        const filePath = path.join(this.config.cacheDir, f);
        const stat = fs.statSync(filePath);
        return { path: filePath, mtime: stat.mtimeMs, size: stat.size };
      })
      .sort((a, b) => a.mtime - b.mtime);

    // Remove oldest files until under limit
    let currentSize = stats.totalSize;
    for (const file of files) {
      if (currentSize <= this.config.maxSize) {
        break;
      }

      fs.unlinkSync(file.path);
      currentSize -= file.size;
    }
  }

  /**
   * Compute SHA256 hash of file
   *
   * @param filePath - Path to file
   * @returns Hex-encoded hash
   *
   * @internal
   */
  private async getFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Compute hash of package.json dependencies
   *
   * @param handlerPath - Path to handler.ts (used to find package.json)
   * @returns Hex-encoded hash of dependencies
   *
   * @internal
   */
  private async getDependencyHash(handlerPath: string): Promise<string> {
    try {
      // Find package.json by walking up from handler directory
      let dir = path.dirname(handlerPath);
      let packageJsonPath: string | null = null;

      while (dir !== path.parse(dir).root) {
        const candidate = path.join(dir, 'package.json');
        if (fs.existsSync(candidate)) {
          packageJsonPath = candidate;
          break;
        }
        dir = path.dirname(dir);
      }

      if (!packageJsonPath) {
        return 'no-package-json';
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = {
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
      };

      return crypto
        .createHash('sha256')
        .update(JSON.stringify(deps))
        .digest('hex');
    } catch (error) {
      // If we can't read package.json, return a constant
      return 'no-deps';
    }
  }

  /**
   * Convert Uint8Array to base64 string
   *
   * @param data - Uint8Array data
   * @returns Base64 encoded string
   *
   * @internal
   */
  private uint8ArrayToBase64(data: Uint8Array): string {
    return Buffer.from(data).toString('base64');
  }

  /**
   * Convert base64 string to Uint8Array
   *
   * @param base64 - Base64 encoded string
   * @returns Uint8Array data
   *
   * @internal
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
}
