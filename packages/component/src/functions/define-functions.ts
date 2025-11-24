/**
 * Function Customization Container
 *
 * @remarks
 * Container for all function customizations. Builds final configurations
 * from function configuration builders.
 *
 * @packageDocumentation
 */

import type { FunctionConfigurationBuilder } from './configure-function';
import type { FunctionConfig } from './types';

/**
 * Define function customizations
 *
 * @remarks
 * Container for all function handler customizations. Takes a record of
 * function configuration builders and builds final configurations.
 *
 * Functions defined in schema (f.model()) will automatically get:
 * - POST /api/functions/{function-name} endpoint
 * - Azure Function with HTTP trigger
 * - Input/output schema validation
 * - Basic handler (echo input) if no customization provided
 * - 256MB memory, 30s timeout defaults
 *
 * Use this to override defaults with custom handlers and settings.
 *
 * @param functions - Record of function configuration builders
 * @returns Record of built function configurations
 *
 * @example
 * ```typescript
 * import { defineFunctions, configureFunction } from '@atakora/component/functions';
 * import { minutes, greaterThan } from '@atakora/component/common';
 *
 * export const func = defineFunctions({
 *   // Long-running report generation
 *   GenerateReport: configureFunction('GenerateReport')
 *     .memory(1024)
 *     .timeout(minutes(10))
 *     .withHandler(async (context, input) => {
 *       const dataset = await context.database.datasets.get(input.datasetId);
 *       const reportUrl = await generateReport(dataset);
 *       return { reportUrl, status: 'completed' };
 *     })
 *     .bindings({
 *       storage: {
 *         type: 'blob',
 *         container: 'reports',
 *         path: '{reportId}.pdf'
 *       }
 *     })
 *     .monitoring(alerts =>
 *       alerts
 *         .onExecutionTime(greaterThan(minutes(8)))
 *         .warn()
 *         .withEmail('platform@company.com')
 *     ),
 *
 *   // Fast validation function
 *   ValidateData: configureFunction('ValidateData')
 *     .memory(512)
 *     .timeout(minutes(2))
 *     .withHandler(async (context, input) => {
 *       const dataset = await context.database.datasets.get(input.datasetId);
 *       const validator = context.services.dataValidator;
 *       const result = await validator.validate(dataset);
 *       return { isValid: result.isValid, errors: result.errors };
 *     }),
 *
 *   // Function without customization uses defaults
 *   // ProcessUpload: (no configuration needed, will use echo handler)
 * });
 * ```
 *
 * @public
 */
export function defineFunctions(
  functions: Record<string, FunctionConfigurationBuilder>
): Record<string, FunctionConfig> {
  const result: Record<string, FunctionConfig> = {};

  for (const [name, builder] of Object.entries(functions)) {
    // Validate that builder is actually a FunctionConfigurationBuilder
    if (!builder || typeof builder._build !== 'function') {
      throw new Error(
        `Invalid function configuration for '${name}'. ` +
          `Expected FunctionConfigurationBuilder from configureFunction().`
      );
    }

    // Build configuration
    const config = builder._build();

    // Validate name matches
    if (config.name !== name) {
      throw new Error(
        `Function configuration name mismatch: ` +
          `key '${name}' does not match configured name '${config.name}'. ` +
          `Use configureFunction('${name}') to match the key.`
      );
    }

    result[name] = config;
  }

  return result;
}

/**
 * Type-safe function configuration record
 *
 * @remarks
 * Helper type for inferring function configuration types from
 * a defineFunctions() call.
 *
 * @typeParam T - The function configuration record type
 *
 * @example
 * ```typescript
 * export const func = defineFunctions({ ... });
 *
 * // Extract type
 * type MyFunctions = FunctionConfigs<typeof func>;
 * ```
 *
 * @public
 */
export type FunctionConfigs<T extends Record<string, FunctionConfig>> = T;
