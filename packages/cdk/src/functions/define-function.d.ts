/**
 * Helper function for defining Azure Functions with type-safe configuration.
 *
 * @packageDocumentation
 */
import type { FunctionConfig, FunctionDefinition } from './types';
/**
 * Defines an Azure Function with type-safe configuration.
 *
 * @remarks
 * This helper function is used in resource.ts files to define function configuration
 * in a type-safe manner. It validates the configuration and returns a FunctionDefinition
 * that can be used by the synthesis pipeline.
 *
 * **Usage Pattern**:
 * - Define function configuration in `resource.ts` file
 * - Export the configuration using `export default defineFunction({ ... })`
 * - Reference environment variables using placeholder syntax: `${VAR_NAME}`
 * - Actual values are provided in `app.ts` when creating the AzureFunction construct
 *
 * @typeParam TEnv - Type of environment variables (for type safety between resource.ts and app.ts)
 * @param config - Function configuration object
 * @returns Function definition with validated configuration
 *
 * @throws {Error} If trigger configuration is missing
 * @throws {Error} If trigger type is invalid
 * @throws {Error} If required trigger properties are missing
 *
 * @example
 * Basic HTTP function (in resource.ts):
 * ```typescript
 * import { defineFunction, AuthLevel } from '@atakora/cdk/functions';
 *
 * export default defineFunction({
 *   trigger: {
 *     type: 'http',
 *     route: 'api/users/{id}',
 *     methods: ['GET', 'POST'],
 *     authLevel: AuthLevel.FUNCTION
 *   },
 *   timeout: { seconds: 30 }
 * });
 * ```
 *
 * @example
 * Timer function with environment variables (in resource.ts):
 * ```typescript
 * export interface CleanupEnv {
 *   readonly TABLE_NAME: string;
 *   readonly MAX_AGE_DAYS: string;
 * }
 *
 * export default defineFunction<CleanupEnv>({
 *   trigger: {
 *     type: 'timer',
 *     schedule: '0 0 2 * * *',  // 2 AM daily
 *   },
 *   environment: {
 *     TABLE_NAME: '${COSMOS_TABLE_NAME}',
 *     MAX_AGE_DAYS: '30'
 *   },
 *   timeout: { minutes: 10 }
 * });
 * ```
 *
 * @example
 * Queue function with bindings (in resource.ts):
 * ```typescript
 * export default defineFunction({
 *   trigger: {
 *     type: 'queue',
 *     queueName: 'orders',
 *     connection: '${STORAGE_CONNECTION}'
 *   },
 *   inputBindings: [{
 *     type: 'table',
 *     direction: 'in',
 *     name: 'inventory',
 *     tableName: 'inventory',
 *     connection: '${STORAGE_CONNECTION}'
 *   }],
 *   outputBindings: [{
 *     type: 'serviceBus',
 *     direction: 'out',
 *     name: 'notifications',
 *     queueName: 'order-notifications',
 *     connection: '${SERVICE_BUS_CONNECTION}'
 *   }]
 * });
 * ```
 */
export declare function defineFunction<TEnv extends Record<string, string> = Record<string, string>>(config: FunctionConfig<TEnv>): FunctionDefinition<TEnv>;
//# sourceMappingURL=define-function.d.ts.map