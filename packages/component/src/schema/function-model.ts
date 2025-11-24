/**
 * Function Model Builder
 *
 * Builds function models for custom HTTP endpoints with defined inputs/outputs.
 */

import type { FunctionModelConfig, AuthorizationRule } from './types';
import type { AuthorizationRulesFn } from './authorization';
import { AuthorizationBuilder } from './authorization';
import { processFields } from './utils';

// ============================================================================
// Function Model Builder
// ============================================================================

/**
 * Function model builder
 *
 * Creates a custom HTTP endpoint with defined input/output schemas.
 *
 * Auto-generates:
 * - POST /api/functions/{function-name} endpoint
 * - Azure Function with HTTP trigger
 * - Input validation
 * - Output typing
 * - TypeScript types
 *
 * @example
 * ```typescript
 * GenerateReport: f.model({
 *   input: {
 *     datasetId: a.string().required(),
 *     format: a.enum(['pdf', 'excel']).default('pdf'),
 *   },
 *   output: {
 *     reportUrl: a.string().url().required(),
 *     status: a.enum(['generating', 'completed']).required(),
 *   },
 * })
 *   .authorization(allow => [allow.authenticated()])
 * ```
 */
export class FunctionModelBuilder<TInput = any, TOutput = any> {
  public readonly _config: FunctionModelConfig<TInput, TOutput>;

  constructor(definition: { input: TInput; output: TOutput }) {
    this._config = {
      type: 'function',
      input: processFields(definition.input),
      output: processFields(definition.output),
      authorization: [],
    };
  }

  /**
   * Define authorization rules
   *
   * @param rules - Function that receives authorization builder
   *
   * @example
   * ```typescript
   * .authorization(allow => [
   *   allow.authenticated(),
   *   allow.groups(['admin']).all(),
   * ])
   * ```
   */
  authorization(rules: AuthorizationRulesFn): this {
    const builder = new AuthorizationBuilder();
    const rawRules = rules(builder);

    // Process rules - convert any rule builders to rules
    this._config.authorization = rawRules.map((rule) => {
      // If it's a rule builder (has _build method), convert it
      if (rule && typeof rule === 'object' && '_build' in rule) {
        return (rule as any)._build();
      }
      return rule;
    });

    return this;
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): FunctionModelConfig<TInput, TOutput> {
    return { ...this._config };
  }
}

// ============================================================================
// Function Model Factory (f namespace)
// ============================================================================

/**
 * Function model factory
 *
 * Creates custom HTTP endpoints with defined inputs/outputs.
 *
 * @example
 * ```typescript
 * import { f, a } from '@atakora/component';
 *
 * const GenerateReport = f.model({
 *   input: {
 *     datasetId: a.string().required(),
 *     format: a.enum(['pdf', 'excel']).default('pdf'),
 *   },
 *   output: {
 *     reportUrl: a.string().url().required(),
 *     status: a.enum(['generating', 'completed']).required(),
 *   },
 * });
 * ```
 */
export const f = {
  /**
   * Create a function model
   *
   * @param definition - Object with input and output field definitions
   * @returns Function model builder
   */
  model: <TInput, TOutput>(definition: { input: TInput; output: TOutput }) =>
    new FunctionModelBuilder(definition),
};
