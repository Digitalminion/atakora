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
import { BuildCache } from './cache';
import { BuildArtifact, BuildOptions, BuildResult, CacheConfig } from './types';
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
export declare class FunctionBuilder {
    private readonly bundler;
    private readonly cache;
    private readonly config;
    private readonly telemetry;
    constructor(config?: BuilderConfig);
    /**
     * Build all functions
     *
     * @param functions - Functions to build
     * @returns Build result with artifacts
     *
     * @throws {BuildError} If any function fails to build
     */
    buildAll(functions: FunctionDescriptor[]): Promise<BuildResult>;
    /**
     * Build a single function
     *
     * @param descriptor - Function descriptor
     * @returns Build artifact
     *
     * @throws {BuildError} If build fails
     */
    buildOne(descriptor: FunctionDescriptor): Promise<BuildArtifact>;
    /**
     * Invalidate cache for specific functions
     *
     * @param pattern - Pattern to match function names (optional)
     */
    invalidateCache(pattern?: string): Promise<void>;
    /**
     * Get build statistics
     *
     * @returns Build statistics including cache stats
     */
    getStats(): Promise<{
        cache: Awaited<ReturnType<BuildCache['getStats']>>;
        builds: number;
        cacheHitRate: number;
    }>;
    /**
     * Validate that all handler files exist
     *
     * @param functions - Functions to validate
     *
     * @throws {BuildError} If any handler is missing
     *
     * @internal
     */
    private validateHandlers;
    /**
     * Build functions with concurrency control
     *
     * @param functions - Functions to build
     * @returns Map of function ID to artifact
     *
     * @internal
     */
    private buildWithConcurrency;
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
    private determinePackagingStrategy;
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
    private recordTelemetry;
}
//# sourceMappingURL=builder.d.ts.map