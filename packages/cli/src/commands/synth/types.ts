/**
 * Types for CLI synthesis commands
 *
 * @module @atakora/cli/commands/synth/types
 */

/**
 * Synthesis options for CLI commands
 */
export interface SynthesisOptions {
  /**
   * Output directory for generated files
   */
  readonly output: string;

  /**
   * Target environment (development, staging, production)
   */
  readonly environment?: string;

  /**
   * Validate only, don't generate files
   */
  readonly validateOnly?: boolean;

  /**
   * Suppress output
   */
  readonly quiet?: boolean;

  /**
   * Package name to synthesize (for monorepos)
   */
  readonly package?: string;

  /**
   * Skip validation during synthesis
   */
  readonly skipValidation?: boolean;

  /**
   * Pretty-print JSON output
   */
  readonly prettyPrint?: boolean;
}
