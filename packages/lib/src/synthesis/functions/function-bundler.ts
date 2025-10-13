/**
 * Function Bundler - Bundles TypeScript handler files for inline ARM deployment
 *
 * @remarks
 * This module handles bundling Azure Function handlers into minified JavaScript
 * that can be embedded directly into ARM templates as inline code.
 *
 * **Bundle Process**:
 * 1. Uses esbuild to compile TypeScript → JavaScript
 * 2. Tree-shakes dependencies (only includes what's actually used)
 * 3. Minifies code for smaller ARM template size
 * 4. Bundles all dependencies into a single file
 * 5. Escapes strings for JSON embedding
 *
 * **Why Inline Deployment?**
 * - Single ARM template contains both infrastructure AND code
 * - No separate deployment step required
 * - Simplified CI/CD pipeline
 * - Atomic deployments (infra + code together)
 *
 * @packageDocumentation
 */

import { buildSync, BuildOptions } from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Options for bundling a function handler
 */
export interface FunctionBundlerOptions {
  /**
   * Path to the handler.ts file
   */
  readonly handlerPath: string;

  /**
   * Whether to minify the output (default: true)
   */
  readonly minify?: boolean;

  /**
   * Whether to include source maps (default: false, not recommended for ARM templates)
   */
  readonly sourcemap?: boolean;

  /**
   * Target ES version (default: 'es2020')
   */
  readonly target?: string;

  /**
   * External packages that shouldn't be bundled (e.g., @azure/functions)
   * These are expected to be available in the Azure Functions runtime
   */
  readonly external?: string[];
}

/**
 * Result of bundling a function handler
 */
export interface FunctionBundleResult {
  /**
   * The bundled, minified JavaScript code
   */
  readonly code: string;

  /**
   * Size of the bundled code in bytes
   */
  readonly size: number;

  /**
   * Path to the original handler file
   */
  readonly handlerPath: string;

  /**
   * Any warnings from the bundler
   */
  readonly warnings: string[];
}

/**
 * Bundles Azure Function handlers for inline ARM deployment
 *
 * @remarks
 * This class uses esbuild to bundle TypeScript function handlers into
 * minified JavaScript that can be embedded directly into ARM templates.
 *
 * **Default Configuration**:
 * - Target: ES2020 (supported by Azure Functions Node.js 18+)
 * - Minification: Enabled
 * - Tree-shaking: Enabled
 * - Source maps: Disabled (not useful in ARM templates)
 * - External: @azure/functions (provided by runtime)
 *
 * @example
 * Bundle a single handler:
 * ```typescript
 * const bundler = new FunctionBundler();
 * const result = bundler.bundle({
 *   handlerPath: './src/rest/feedback/feedback-create/handler.ts'
 * });
 *
 * console.log(`Bundled code size: ${result.size} bytes`);
 * // Use result.code in ARM template
 * ```
 *
 * @example
 * Bundle multiple handlers:
 * ```typescript
 * const bundler = new FunctionBundler();
 * const handlers = [
 *   './feedback-create/handler.ts',
 *   './feedback-read/handler.ts',
 * ];
 *
 * const results = bundler.bundleMany(handlers.map(h => ({ handlerPath: h })));
 * ```
 */
export class FunctionBundler {
  /**
   * Default external packages (provided by Azure Functions runtime)
   */
  private static readonly DEFAULT_EXTERNAL = [
    '@azure/functions',
  ];

  /**
   * Bundle a single function handler
   *
   * @param options - Bundler options
   * @returns Bundle result with code and metadata
   *
   * @throws {Error} If handler file doesn't exist
   * @throws {Error} If esbuild fails
   */
  public bundle(options: FunctionBundlerOptions): FunctionBundleResult {
    // Validate handler exists
    if (!fs.existsSync(options.handlerPath)) {
      throw new Error(`Handler file not found: ${options.handlerPath}`);
    }

    // Prepare esbuild options
    const esbuildOptions: BuildOptions = {
      entryPoints: [options.handlerPath],
      bundle: true,
      platform: 'node',
      target: options.target || 'es2020',
      format: 'cjs',
      minify: options.minify !== false, // Default true
      sourcemap: options.sourcemap || false,
      external: [
        ...(options.external || []),
        ...FunctionBundler.DEFAULT_EXTERNAL,
      ],
      write: false, // Return output instead of writing to disk
      logLevel: 'warning',
      treeShaking: true,
      // Remove console.log in production builds
      pure: options.minify !== false ? ['console.log'] : [],
    };

    // Bundle with esbuild
    const result = buildSync(esbuildOptions);

    // Check for errors
    if (result.errors.length > 0) {
      throw new Error(
        `esbuild failed:\n${result.errors.map((e) => e.text).join('\n')}`
      );
    }

    // Extract bundled code
    const code = result.outputFiles?.[0]?.text;

    if (!code) {
      throw new Error('esbuild did not produce any output files');
    }

    // Collect warnings
    const warnings = result.warnings.map((w) => w.text);

    return {
      code,
      size: Buffer.byteLength(code, 'utf8'),
      handlerPath: options.handlerPath,
      warnings,
    };
  }

  /**
   * Bundle multiple function handlers
   *
   * @param optionsArray - Array of bundler options
   * @returns Array of bundle results
   *
   * @remarks
   * Bundles handlers in parallel for better performance.
   */
  public bundleMany(optionsArray: FunctionBundlerOptions[]): FunctionBundleResult[] {
    return optionsArray.map((options) => this.bundle(options));
  }

  /**
   * Escape bundled code for JSON embedding in ARM templates
   *
   * @param code - The bundled JavaScript code
   * @returns Escaped code safe for JSON strings
   *
   * @remarks
   * ARM templates are JSON, so we need to escape:
   * - Quotes
   * - Newlines
   * - Backslashes
   */
  public static escapeForJson(code: string): string {
    return code
      .replace(/\\/g, '\\\\')      // Escape backslashes
      .replace(/"/g, '\\"')         // Escape quotes
      .replace(/\n/g, '\\n')        // Escape newlines
      .replace(/\r/g, '\\r')        // Escape carriage returns
      .replace(/\t/g, '\\t');       // Escape tabs
  }

  /**
   * Get the function name from a handler path
   *
   * @param handlerPath - Path to handler.ts file
   * @returns Function name (e.g., "feedback-create")
   *
   * @example
   * ```typescript
   * FunctionBundler.getFunctionName('./feedback/feedback-create/handler.ts')
   * // Returns: 'feedback-create'
   * ```
   */
  public static getFunctionName(handlerPath: string): string {
    // Get parent directory name (e.g., "feedback-create")
    const parentDir = path.basename(path.dirname(handlerPath));
    return parentDir;
  }
}
