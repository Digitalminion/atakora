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

import * as esbuild from 'esbuild';
import * as crypto from 'crypto';
import * as path from 'path';
import { BuildOptions, BuildArtifact, BuildMetadata, BuildError } from './types';

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
export class FunctionBundler {
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
  async bundle(
    functionId: string,
    functionName: string,
    handlerPath: string,
    options?: BuildOptions
  ): Promise<BuildArtifact> {
    const startTime = Date.now();

    try {
      // Normalize handler path
      const absoluteHandlerPath = path.resolve(handlerPath);

      // Configure esbuild
      const buildOptions: esbuild.BuildOptions = {
        entryPoints: [absoluteHandlerPath],
        bundle: options?.bundle ?? true,
        minify: options?.minify ?? true,
        sourcemap: options?.sourcemap ?? 'external',
        external: options?.external ?? [],
        platform: 'node',
        target: options?.target ?? 'node18',
        format: 'cjs',
        treeShaking: options?.treeShaking ?? true,
        define: options?.define,
        loader: options?.loader,
        write: false, // Keep output in memory
        metafile: true, // Generate metadata for analysis
        outdir: 'out', // Required but not used since write=false
      };

      // Build with esbuild
      const result = await esbuild.build(buildOptions);

      // Extract bundle and source map
      const bundle = result.outputFiles.find(f => f.path.endsWith('.js'));
      const sourceMap = result.outputFiles.find(f => f.path.endsWith('.js.map'));

      if (!bundle) {
        throw new BuildError(
          'esbuild did not produce a bundle output',
          functionId
        );
      }

      // Extract dependencies from metafile
      const dependencies = this.extractDependencies(result.metafile);

      // Detect native modules
      const hasNativeModules = this.detectNativeModules(result.metafile);

      // Compute hash for cache invalidation
      const hash = this.computeHash(bundle.contents);

      // Create build metadata
      const metadata: BuildMetadata = {
        size: bundle.contents.length,
        buildTime: Date.now() - startTime,
        hash,
        dependencies,
        hasNativeModules,
        memoryEstimate: this.estimateMemory(bundle.contents.length),
      };

      // Create build artifact
      const artifact: BuildArtifact = {
        functionId,
        functionName,
        bundle: bundle.contents,
        sourceMap: sourceMap?.contents,
        metadata,
      };

      return artifact;
    } catch (error) {
      throw new BuildError(
        `Failed to bundle function ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        functionId,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extract dependencies from esbuild metafile
   *
   * @param metafile - esbuild metafile
   * @returns List of dependency names
   *
   * @internal
   */
  private extractDependencies(metafile?: esbuild.Metafile): string[] {
    if (!metafile) {
      return [];
    }

    const dependencies = new Set<string>();

    // Extract from inputs
    for (const input of Object.keys(metafile.inputs)) {
      // Check if it's a node_modules dependency
      if (input.includes('node_modules')) {
        const match = input.match(/node_modules\/([^/]+)/);
        if (match) {
          dependencies.add(match[1]);
        }
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Detect if bundle contains native modules
   *
   * @param metafile - esbuild metafile
   * @returns True if native modules detected
   *
   * @internal
   */
  private detectNativeModules(metafile?: esbuild.Metafile): boolean {
    if (!metafile) {
      return false;
    }

    // Check for .node files or common native module patterns
    const nativePatterns = [
      /\.node$/,
      /node-gyp/,
      /prebuild/,
      /binding\.gyp/,
    ];

    for (const input of Object.keys(metafile.inputs)) {
      if (nativePatterns.some(pattern => pattern.test(input))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Compute SHA256 hash of bundle contents
   *
   * @param contents - Bundle contents
   * @returns Hex-encoded hash
   *
   * @internal
   */
  private computeHash(contents: Uint8Array): string {
    return crypto
      .createHash('sha256')
      .update(contents)
      .digest('hex');
  }

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
  private estimateMemory(bundleSize: number): number {
    // Base memory overhead + 2x bundle size (rough heuristic)
    const baseMB = 128;
    const bundleMB = (bundleSize / 1024 / 1024) * 2;
    return Math.ceil(baseMB + bundleMB);
  }
}
