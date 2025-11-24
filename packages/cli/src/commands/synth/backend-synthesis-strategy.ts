/**
 * Backend Synthesis Strategy for CLI
 *
 * Integrates component-style backend synthesis with the CLI synthesis pipeline.
 * Uses BackendAdapter from @atakora/lib to convert BackendObjects into deployable
 * ARM templates.
 *
 * @module @atakora/cli/commands/synth/backend-synthesis-strategy
 */

import { BackendAdapter } from '@atakora/component/synthesis';
import type { BackendObject } from '@atakora/component';
import type { SynthesisOptions } from './types';

// Import CloudAssemblyV2 type from synthesis types
type CloudAssemblyV2 = {
  readonly version: '2.0.0';
  readonly stacks: Record<
    string,
    {
      readonly name: string;
      readonly templatePath: string;
      readonly linkedTemplates?: readonly string[];
      readonly resourceCount: number;
      readonly parameterCount: number;
      readonly outputCount: number;
      readonly dependencies?: readonly string[];
    }
  >;
  readonly directory: string;
};

/**
 * Result of backend synthesis operation
 */
export interface BackendSynthesisResult {
  /**
   * Whether synthesis succeeded
   */
  readonly success: boolean;

  /**
   * Output directory where templates were written
   */
  readonly outputDirectory: string;

  /**
   * Stack names that were generated
   */
  readonly stacks: readonly string[];

  /**
   * Total number of ARM resources generated
   */
  readonly resourceCount: number;

  /**
   * Errors encountered during synthesis
   */
  readonly errors: readonly string[];
}

/**
 * Backend Synthesis Strategy
 *
 * Provides CLI-specific synthesis for component backends. This strategy:
 * 1. Validates backend objects before synthesis
 * 2. Uses BackendAdapter to convert backends to ARM templates
 * 3. Respects CLI options (output directory, validation, quiet mode)
 * 4. Returns user-friendly results for CLI display
 *
 * @example Basic usage
 * ```typescript
 * const strategy = new BackendSynthesisStrategy();
 * const result = await strategy.synthesize(backend, {
 *   output: './arm.out',
 *   environment: 'production'
 * });
 *
 * if (result.success) {
 *   console.log(strategy.getSummary(result));
 * }
 * ```
 *
 * @example With validation only
 * ```typescript
 * const strategy = new BackendSynthesisStrategy();
 * const result = await strategy.synthesize(backend, {
 *   output: './arm.out',
 *   validateOnly: true
 * });
 * ```
 */
export class BackendSynthesisStrategy {
  private readonly adapter: BackendAdapter;

  constructor() {
    this.adapter = new BackendAdapter();
  }

  /**
   * Synthesize a component backend to ARM templates
   *
   * @param backend - Component backend object
   * @param options - CLI synthesis options
   * @returns Synthesis result with success status and metadata
   *
   * @remarks
   * This method orchestrates the full synthesis pipeline:
   * 1. Validates backend structure and requirements
   * 2. Converts CLI options to adapter options
   * 3. Runs synthesis via BackendAdapter
   * 4. Extracts results into CLI-friendly format
   * 5. Handles errors gracefully
   *
   * The method never throws - all errors are captured in the result object.
   */
  async synthesize(
    backend: BackendObject,
    options: SynthesisOptions
  ): Promise<BackendSynthesisResult> {
    const errors: string[] = [];

    try {
      // Validate backend before synthesis
      this.validateBackend(backend);

      // Prepare synthesis options for BackendAdapter
      const synthOptions = {
        outdir: options.output,
        skipValidation: options.skipValidation ?? false,
        prettyPrint: options.prettyPrint ?? true,
      };

      // Run synthesis via BackendAdapter
      const assembly: CloudAssemblyV2 = await this.adapter.synthesize(
        backend,
        synthOptions
      );

      // Extract results
      const stacks = Object.keys(assembly.stacks);
      const resourceCount = Object.values(assembly.stacks).reduce(
        (sum, stack) => sum + (stack.resourceCount || 0),
        0
      );

      return {
        success: true,
        outputDirectory: assembly.directory,
        stacks,
        resourceCount,
        errors: [],
      };
    } catch (error) {
      // Capture error message
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);

      return {
        success: false,
        outputDirectory: options.output,
        stacks: [],
        resourceCount: 0,
        errors,
      };
    }
  }

  /**
   * Validate backend object before synthesis
   *
   * @param backend - Backend to validate
   * @throws {Error} If backend is invalid
   *
   * @remarks
   * Validates that the backend has:
   * - A schema property
   * - Settings with a name
   * - At least one model in the schema
   *
   * These are minimum requirements for successful synthesis.
   */
  private validateBackend(backend: BackendObject): void {
    if (!backend.schema) {
      throw new Error('Backend must have a schema property');
    }

    if (!backend.settings?.name) {
      throw new Error('Backend settings must include a name');
    }

    // Access schema models - they could be in different locations
    const models =
      backend.schema.models || backend.schema.definition?.schema?.models;

    if (!models || Object.keys(models).length === 0) {
      throw new Error('Backend schema must define at least one model');
    }
  }

  /**
   * Get user-friendly summary of synthesis result
   *
   * @param result - Synthesis result
   * @returns Formatted summary message for CLI display
   *
   * @remarks
   * Generates a formatted summary showing:
   * - Success/failure status
   * - Output directory location
   * - Number of stacks and resources
   * - List of generated stack files
   * - Error messages (if any)
   */
  getSummary(result: BackendSynthesisResult): string {
    if (!result.success) {
      const errorList = result.errors.map((e) => `  - ${e}`).join('\n');
      return `Synthesis failed:\n${errorList}`;
    }

    const lines: string[] = [
      '✅ Synthesis complete!',
      '',
      `📂 Output: ${result.outputDirectory}`,
      `📦 Stacks: ${result.stacks.length}`,
      `🔧 Resources: ${result.resourceCount}`,
      '',
      'Generated stacks:',
      ...result.stacks.map((s) => `  - ${s}.json`),
    ];

    return lines.join('\n');
  }
}

/**
 * Factory function to create synthesis strategy
 *
 * @returns New BackendSynthesisStrategy instance
 *
 * @remarks
 * This factory function provides a consistent way to instantiate
 * the strategy and can be extended in the future to support
 * dependency injection or configuration.
 */
export function createBackendSynthesisStrategy(): BackendSynthesisStrategy {
  return new BackendSynthesisStrategy();
}
