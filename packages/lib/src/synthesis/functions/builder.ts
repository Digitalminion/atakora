/**
 * Function builder orchestrator
 *
 * @remarks
 * This module orchestrates the build process for Azure Functions, coordinating:
 * - Function discovery and validation
 * - Parallel compilation with esbuild
 * - Build caching
 * - Package strategy determination
 * - Build telemetry
 */

import * as fs from 'fs';
import * as path from 'path';
import { FunctionBundler } from './bundler';
import { BuildCache } from './cache';
import {
  BuildArtifact,
  BuildOptions,
  BuildResult,
  BuildTelemetry,
  BuildError,
  CacheConfig,
  PackagingStrategy,
  FunctionPackage,
} from './types';

/**
 * Function descriptor passed to builder
 */
export interface FunctionDescriptor {
  /**
   * Unique function identifier
   */
  readonly id: string;

  /**
   * Function name for deployment
   */
  readonly name: string;

  /**
   * Path to handler.ts
   */
  readonly handler: string;

  /**
   * Path to resource.ts (optional, used for cache invalidation)
   */
  readonly resource?: string;

  /**
   * Build options
   */
  readonly buildOptions?: BuildOptions;
}

/**
 * Builder configuration
 */
export interface BuilderConfig {
  /**
   * Cache configuration
   */
  readonly cache?: CacheConfig;

  /**
   * Maximum parallel builds (default: 4)
   */
  readonly concurrency?: number;

  /**
   * Enable build telemetry (default: true)
   */
  readonly telemetry?: boolean;
}

/**
 * Function builder that orchestrates the build process
 *
 * @remarks
 * The builder coordinates compilation, caching, and packaging.
 * It builds functions in parallel with configurable concurrency.
 *
 * @example
 * ```typescript
 * const builder = new FunctionBuilder({
 *   cache: { cacheDir: '.cache' },
 *   concurrency: 4
 * });
 *
 * const functions: FunctionDescriptor[] = [
 *   { id: 'fn1', name: 'MyFunction', handler: './handler.ts' }
 * ];
 *
 * const result = await builder.buildAll(functions);
 * ```
 */
export class FunctionBuilder {
  private readonly bundler: FunctionBundler;
  private readonly cache: BuildCache;
  private readonly config: Required<BuilderConfig>;
  private readonly telemetry: BuildTelemetry[] = [];

  constructor(config?: BuilderConfig) {
    this.bundler = new FunctionBundler();
    this.cache = new BuildCache(config?.cache);
    this.config = {
      cache: config?.cache ?? {},
      concurrency: config?.concurrency ?? 4,
      telemetry: config?.telemetry ?? true,
    };
  }

  /**
   * Build all functions
   *
   * @param functions - Functions to build
   * @returns Build result with artifacts
   *
   * @throws {BuildError} If any function fails to build
   */
  async buildAll(functions: FunctionDescriptor[]): Promise<BuildResult> {
    if (functions.length === 0) {
      return { artifacts: new Map() };
    }

    // Validate handlers exist
    await this.validateHandlers(functions);

    // Build functions in parallel with concurrency limit
    const artifacts = await this.buildWithConcurrency(functions);

    return {
      artifacts,
      telemetry: this.config.telemetry ? this.telemetry : undefined,
    };
  }

  /**
   * Build a single function
   *
   * @param descriptor - Function descriptor
   * @returns Build artifact
   *
   * @throws {BuildError} If build fails
   */
  async buildOne(descriptor: FunctionDescriptor): Promise<BuildArtifact> {
    const startTime = Date.now();
    let cacheHit = false;

    try {
      // Generate cache key
      const cacheKey = await this.cache.getCacheKey(
        descriptor.handler,
        descriptor.buildOptions ?? {},
        descriptor.resource
      );

      // Check cache
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        cacheHit = true;
        this.recordTelemetry(descriptor, true, startTime, cached.metadata.size, PackagingStrategy.STORAGE);
        return cached;
      }

      // Build with bundler
      const artifact = await this.bundler.bundle(
        descriptor.id,
        descriptor.name,
        descriptor.handler,
        descriptor.buildOptions
      );

      // Cache result
      await this.cache.set(cacheKey, artifact);

      // Determine packaging strategy
      const strategy = this.determinePackagingStrategy(artifact);

      // Record telemetry
      this.recordTelemetry(descriptor, false, startTime, artifact.metadata.size, strategy);

      return artifact;
    } catch (error) {
      // Record failure telemetry
      this.recordTelemetry(
        descriptor,
        cacheHit,
        startTime,
        0,
        PackagingStrategy.INLINE,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  }

  /**
   * Invalidate cache for specific functions
   *
   * @param pattern - Pattern to match function names (optional)
   */
  async invalidateCache(pattern?: string): Promise<void> {
    await this.cache.invalidate(pattern);
  }

  /**
   * Get build statistics
   *
   * @returns Build statistics including cache stats
   */
  async getStats(): Promise<{
    cache: Awaited<ReturnType<BuildCache['getStats']>>;
    builds: number;
    cacheHitRate: number;
  }> {
    const cacheStats = await this.cache.getStats();
    const builds = this.telemetry.length;
    const cacheHits = this.telemetry.filter(t => t.cacheHit).length;
    const cacheHitRate = builds > 0 ? cacheHits / builds : 0;

    return {
      cache: cacheStats,
      builds,
      cacheHitRate,
    };
  }

  /**
   * Validate that all handler files exist
   *
   * @param functions - Functions to validate
   *
   * @throws {BuildError} If any handler is missing
   *
   * @internal
   */
  private async validateHandlers(functions: FunctionDescriptor[]): Promise<void> {
    const errors: string[] = [];

    for (const fn of functions) {
      const handlerPath = path.resolve(fn.handler);
      if (!fs.existsSync(handlerPath)) {
        errors.push(`Handler not found: ${fn.handler} for function ${fn.name}`);
      }
    }

    if (errors.length > 0) {
      throw new BuildError(
        `Function handler validation failed:\n${errors.join('\n')}`
      );
    }
  }

  /**
   * Build functions with concurrency control
   *
   * @param functions - Functions to build
   * @returns Map of function ID to artifact
   *
   * @internal
   */
  private async buildWithConcurrency(
    functions: FunctionDescriptor[]
  ): Promise<Map<string, BuildArtifact>> {
    const artifacts = new Map<string, BuildArtifact>();
    const queue = [...functions];
    const inProgress: Promise<void>[] = [];

    // Process queue with concurrency limit
    while (queue.length > 0 || inProgress.length > 0) {
      // Start new builds up to concurrency limit
      while (queue.length > 0 && inProgress.length < this.config.concurrency) {
        const fn = queue.shift()!;
        const promise = this.buildOne(fn)
          .then(artifact => {
            artifacts.set(fn.id, artifact);
          })
          .catch(error => {
            throw new BuildError(
              `Failed to build function ${fn.name}`,
              fn.id,
              error instanceof Error ? error : undefined
            );
          });

        inProgress.push(promise);
      }

      // Wait for at least one build to complete
      if (inProgress.length > 0) {
        await Promise.race(inProgress);
        // Remove completed promises
        const completed = await Promise.allSettled(inProgress);
        completed.forEach((result, index) => {
          if (result.status === 'fulfilled' || result.status === 'rejected') {
            inProgress.splice(index, 1);
          }
        });
      }
    }

    // Ensure all builds completed
    await Promise.all(inProgress);

    return artifacts;
  }

  /**
   * Determine packaging strategy based on artifact characteristics
   *
   * @param artifact - Build artifact
   * @returns Recommended packaging strategy
   *
   * @remarks
   * Decision tree:
   * - < 4KB and no dependencies: INLINE
   * - Native modules or > 100MB: CONTAINER
   * - > 50MB: EXTERNAL
   * - Otherwise: STORAGE
   *
   * @internal
   */
  private determinePackagingStrategy(artifact: BuildArtifact): PackagingStrategy {
    const sizeKB = artifact.metadata.size / 1024;
    const hasDependencies = artifact.metadata.dependencies.length > 0;
    const hasNativeModules = artifact.metadata.hasNativeModules;

    // Decision tree
    if (sizeKB < 4 && !hasDependencies) {
      return PackagingStrategy.INLINE;
    }

    if (hasNativeModules || sizeKB > 100 * 1024) {
      return PackagingStrategy.CONTAINER;
    }

    if (sizeKB > 50 * 1024) {
      return PackagingStrategy.EXTERNAL;
    }

    return PackagingStrategy.STORAGE;
  }

  /**
   * Record build telemetry
   *
   * @param descriptor - Function descriptor
   * @param cacheHit - Whether cache was used
   * @param startTime - Build start time
   * @param bundleSize - Bundle size in bytes
   * @param strategy - Packaging strategy
   * @param error - Error message if build failed
   *
   * @internal
   */
  private recordTelemetry(
    descriptor: FunctionDescriptor,
    cacheHit: boolean,
    startTime: number,
    bundleSize: number,
    strategy: PackagingStrategy,
    error?: string
  ): void {
    if (!this.config.telemetry) {
      return;
    }

    const telemetry: BuildTelemetry = {
      functionId: descriptor.id,
      buildTime: Date.now() - startTime,
      bundleSize,
      cacheHit,
      strategy,
      success: !error,
      error,
    };

    this.telemetry.push(telemetry);
  }
}
