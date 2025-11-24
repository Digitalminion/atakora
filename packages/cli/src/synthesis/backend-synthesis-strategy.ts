/**
 * Backend Synthesis Strategy
 *
 * Implements the synthesis path for component-style backends in the CLI.
 * Bridges the CLI synth command with the lib package BackendAdapter.
 *
 * @module @atakora/cli/synthesis/backend-synthesis-strategy
 *
 * @remarks
 * This strategy is responsible for synthesizing component backends through
 * the CLI. It wraps the BackendAdapter from @atakora/lib and provides
 * CLI-specific options handling and error formatting.
 *
 * Architecture:
 * - CLI synth command detects backend entry point
 * - BackendSynthesisStrategy wraps synthesis call
 * - BackendAdapter (lib) performs actual synthesis
 * - SynthesisPipeline (component) generates ARM templates
 * - BackendSynthesizer (component) analyzes backend structure
 *
 * This strategy respects all CLI flags:
 * - --output: Custom output directory
 * - --skip-validation: Skip ARM template validation
 * - --validate-only: Validate without writing files
 * - --quiet: Suppress output
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { BackendSynthesisStrategy } from './backend-synthesis-strategy';
 * import { defineBackend } from '@atakora/component';
 *
 * const backend = defineBackend({ schema, settings });
 * const strategy = new BackendSynthesisStrategy();
 *
 * const result = await strategy.synthesize(backend, {
 *   output: './arm.out',
 *   skipValidation: false,
 *   quiet: false,
 * });
 *
 * console.log(`Synthesized to: ${result.directory}`);
 * ```
 */

import { BackendAdapter } from '@atakora/component/synthesis';
import type { CloudAssemblyV2, SynthesisOptions } from '@atakora/lib/synthesis/types';

/**
 * CLI synthesis options
 *
 * Extends core synthesis options with CLI-specific flags.
 */
export interface CliSynthesisOptions {
  /** Output directory for synthesized templates */
  output: string;
  /** Target environment (development, staging, production) */
  environment?: string;
  /** Skip ARM template validation */
  skipValidation?: boolean;
  /** Validate templates without writing files */
  validateOnly?: boolean;
  /** Suppress console output */
  quiet?: boolean;
  /** Package name (for monorepo support) */
  package?: string;
  /** Pretty-print JSON output */
  prettyPrint?: boolean;
  /** Strict mode for validation */
  strict?: boolean;
}

/**
 * Synthesis result with success indicator
 *
 * Used for CLI result reporting and error handling.
 */
export interface SynthesisResult {
  /** Whether synthesis completed successfully */
  success: boolean;
  /** Cloud assembly with synthesized templates */
  assembly?: CloudAssemblyV2;
  /** Error if synthesis failed */
  error?: Error;
  /** Output directory */
  directory?: string;
  /** Number of resources synthesized */
  resourceCount?: number;
  /** Number of stacks generated */
  stackCount?: number;
}

/**
 * Backend Synthesis Strategy
 *
 * Handles component backend synthesis in the CLI synth command.
 *
 * @remarks
 * This class is the integration point between the CLI and the lib package
 * backend synthesis system. It:
 *
 * 1. Validates CLI options
 * 2. Converts CLI options to SynthesisOptions
 * 3. Invokes BackendAdapter from lib package
 * 4. Returns standardized result for CLI display
 *
 * The strategy doesn't implement synthesis logic itself - it delegates
 * to the existing BackendAdapter to avoid duplication.
 *
 * Error Handling:
 * - Catches all synthesis errors
 * - Formats errors for CLI display
 * - Preserves stack traces for debugging
 * - Returns success=false instead of throwing
 *
 * @example
 * Using in CLI command:
 * ```typescript
 * const strategy = new BackendSynthesisStrategy();
 *
 * try {
 *   const result = await strategy.synthesize(backend, {
 *     output: options.output || 'arm.out',
 *     skipValidation: options.skipValidation,
 *     quiet: options.quiet,
 *   });
 *
 *   if (!result.success) {
 *     console.error(result.error?.message);
 *     process.exit(1);
 *   }
 *
 *   console.log(strategy.getSummary(result));
 * } catch (error) {
 *   // Unexpected error
 *   console.error('Synthesis failed:', error);
 *   process.exit(1);
 * }
 * ```
 */
export class BackendSynthesisStrategy {
  private adapter: BackendAdapter;

  constructor() {
    this.adapter = new BackendAdapter();
  }

  /**
   * Synthesize component backend to ARM templates
   *
   * @param backend - Backend object from defineBackend()
   * @param options - CLI synthesis options
   * @returns Synthesis result with success indicator
   *
   * @remarks
   * This method never throws - it always returns a result object with
   * success/error indicators. This makes CLI error handling more consistent.
   *
   * Synthesis Flow:
   * 1. Convert CLI options to lib SynthesisOptions
   * 2. Call BackendAdapter.synthesize()
   * 3. Handle success/error cases
   * 4. Return standardized result
   *
   * The method respects all CLI flags and passes them through to the
   * underlying synthesis system.
   *
   * @example
   * ```typescript
   * const strategy = new BackendSynthesisStrategy();
   * const result = await strategy.synthesize(backend, {
   *   output: './arm.out',
   *   skipValidation: false,
   * });
   *
   * if (result.success) {
   *   console.log(`Generated ${result.stackCount} stacks`);
   * } else {
   *   console.error(result.error?.message);
   * }
   * ```
   */
  async synthesize(backend: any, options: CliSynthesisOptions): Promise<SynthesisResult> {
    try {
      // Convert CLI options to synthesis options
      const synthOptions: Partial<SynthesisOptions> = {
        outdir: options.output,
        skipValidation: options.skipValidation || false,
        prettyPrint: options.prettyPrint !== false,
        strict: options.strict || false,
        enableLinkedTemplates: true,
        maxTemplateSize: 3 * 1024 * 1024, // 3MB default
      };

      // Synthesize using BackendAdapter
      const assembly = await this.adapter.synthesize(backend, synthOptions);

      // Calculate metrics
      const stackCount = Object.keys(assembly.stacks || {}).length;
      let totalResourceCount = 0;

      for (const stack of Object.values(assembly.stacks || {})) {
        totalResourceCount += stack.resourceCount || 0;
      }

      return {
        success: true,
        assembly,
        directory: assembly.directory,
        resourceCount: totalResourceCount,
        stackCount,
      };
    } catch (error) {
      // Return failure result instead of throwing
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get formatted summary of synthesis result
   *
   * @param result - Synthesis result
   * @returns Formatted summary string for CLI output
   *
   * @remarks
   * Provides user-friendly output for the CLI including:
   * - Success/failure indicator
   * - Resource counts
   * - Stack counts
   * - Output directory
   * - Error messages (if failed)
   *
   * @example
   * ```typescript
   * const result = await strategy.synthesize(backend, options);
   * console.log(strategy.getSummary(result));
   * // "✓ Synthesized 3 stacks with 42 resources to ./arm.out"
   * ```
   */
  getSummary(result: SynthesisResult): string {
    if (!result.success) {
      return `✗ Synthesis failed: ${result.error?.message || 'Unknown error'}`;
    }

    const stackStr = result.stackCount === 1 ? 'stack' : 'stacks';
    const resourceStr = result.resourceCount === 1 ? 'resource' : 'resources';

    return (
      `✓ Synthesized ${result.stackCount} ${stackStr} ` +
      `with ${result.resourceCount} ${resourceStr}\n` +
      `  Output: ${result.directory}`
    );
  }

  /**
   * Validate backend object before synthesis
   *
   * @param backend - Backend object to validate
   * @returns Validation result
   *
   * @remarks
   * Performs basic structural validation before attempting synthesis.
   * Checks for required properties:
   * - schema (required)
   * - settings (required)
   * - settings.name (required)
   *
   * This catches common errors early with clear messages.
   *
   * @example
   * ```typescript
   * const strategy = new BackendSynthesisStrategy();
   * const validation = strategy.validateBackend(backend);
   *
   * if (!validation.valid) {
   *   console.error(validation.error);
   *   process.exit(1);
   * }
   * ```
   */
  validateBackend(backend: any): { valid: boolean; error?: string } {
    if (!backend) {
      return {
        valid: false,
        error: 'Backend object is null or undefined',
      };
    }

    if (!backend.schema) {
      return {
        valid: false,
        error: 'Backend must have a schema property',
      };
    }

    if (!backend.settings) {
      return {
        valid: false,
        error: 'Backend must have a settings property',
      };
    }

    if (typeof backend.settings !== 'object') {
      return {
        valid: false,
        error: 'Backend settings must be an object',
      };
    }

    if (!backend.settings.name) {
      return {
        valid: false,
        error: 'Backend settings must have a name property',
      };
    }

    return { valid: true };
  }

  /**
   * Get detailed error message for synthesis failures
   *
   * @param error - Error from synthesis
   * @returns Formatted error message with guidance
   *
   * @remarks
   * Provides context and troubleshooting guidance for common errors:
   * - Missing dependencies
   * - Invalid backend structure
   * - Validation failures
   * - File system errors
   *
   * @example
   * ```typescript
   * try {
   *   await strategy.synthesize(backend, options);
   * } catch (error) {
   *   console.error(strategy.getDetailedError(error));
   * }
   * ```
   */
  getDetailedError(error: unknown): string {
    if (!(error instanceof Error)) {
      return `Unknown error: ${String(error)}`;
    }

    let message = `Synthesis failed: ${error.message}`;

    // Add context for common errors
    if (error.message.includes('Cannot find module')) {
      message +=
        '\n\nMake sure all dependencies are installed:\n' + '  npm install\n' + '  pnpm install';
    }

    if (error.message.includes('schema')) {
      message +=
        '\n\nBackend schema error. Verify:\n' +
        '  - Schema is properly defined with defineSchema()\n' +
        '  - All models are valid\n' +
        '  - Field types are correct';
    }

    if (error.message.includes('validation')) {
      message +=
        '\n\nValidation failed. Try:\n' +
        '  - Run with --skip-validation to see the templates\n' +
        '  - Check ARM template limits (4MB size, 800 resources)\n' +
        '  - Verify resource names follow Azure conventions';
    }

    // Add stack trace in debug mode
    if (process.env.DEBUG && error.stack) {
      message += '\n\nStack trace:\n' + error.stack;
    } else {
      message += '\n\nRun with DEBUG=1 for full stack trace';
    }

    return message;
  }
}
