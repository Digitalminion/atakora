/**
 * Function bundler using esbuild
 *
 * @remarks
 * This module provides TypeScript compilation and bundling for Azure Functions
 * using esbuild. It handles:
 * - TypeScript compilation
 * - Dependency bundling
 * - Tree-shaking
 * - Minification
 * - Source map generation
 */
import { BuildOptions, BuildArtifact } from './types';
/**
 * Function bundler that uses esbuild for fast TypeScript compilation
 *
 * @example
 * ```typescript
 * const bundler = new FunctionBundler();
 * const artifact = await bundler.bundle('my-function', '/path/to/handler.ts', {
 *   minify: true,
 *   sourcemap: 'external'
 * });
 * ```
 */
export declare class FunctionBundler {
    /**
     * Bundle a TypeScript function handler
     *
     * @param functionId - Unique function identifier
     * @param functionName - Function name for deployment
     * @param handlerPath - Path to handler.ts file
     * @param options - Build options
     * @returns Build artifact with bundled code
     *
     * @throws {BuildError} If bundling fails
     */
    bundle(functionId: string, functionName: string, handlerPath: string, options?: BuildOptions): Promise<BuildArtifact>;
    /**
     * Extract dependencies from esbuild metafile
     *
     * @param metafile - esbuild metafile
     * @returns List of dependency names
     *
     * @internal
     */
    private extractDependencies;
    /**
     * Detect if bundle contains native modules
     *
     * @param metafile - esbuild metafile
     * @returns True if native modules detected
     *
     * @internal
     */
    private detectNativeModules;
    /**
     * Compute SHA256 hash of bundle contents
     *
     * @param contents - Bundle contents
     * @returns Hex-encoded hash
     *
     * @internal
     */
    private computeHash;
    /**
     * Estimate memory requirement based on bundle size
     *
     * @param bundleSize - Bundle size in bytes
     * @returns Estimated memory in MB
     *
     * @remarks
     * This is a heuristic estimation. Actual memory usage depends on
     * runtime behavior, but bundle size is a reasonable proxy.
     *
     * @internal
     */
    private estimateMemory;
}
//# sourceMappingURL=bundler.d.ts.map