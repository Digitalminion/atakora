/**
 * Helper function for defining Azure Functions with type-safe configuration.
 *
 * @packageDocumentation
 */

import type { FunctionConfig, FunctionDefinition, Duration } from './types';
import { DurationFactory } from './types';

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
export function defineFunction<TEnv extends Record<string, string> = Record<string, string>>(
  config: FunctionConfig<TEnv>
): FunctionDefinition<TEnv> {
  // Validate configuration
  validateFunctionConfig(config);

  // Apply defaults
  const configWithDefaults: FunctionConfig<TEnv> = {
    ...config,
    timeout: config.timeout ?? DurationFactory.minutes(5),
    memorySize: config.memorySize,
    environment: config.environment ?? ({} as TEnv),
    secrets: config.secrets ?? {},
    inputBindings: config.inputBindings ?? [],
    outputBindings: config.outputBindings ?? [],
    role: config.role ?? { managedIdentity: false },
    buildOptions: config.buildOptions ?? {},
    tracing: config.tracing ?? { enabled: true },
    logging: config.logging ?? {},
  };

  return {
    type: 'AzureFunction',
    version: '1.0',
    config: configWithDefaults,
  };
}

/**
 * Validates function configuration.
 *
 * @param config - Function configuration to validate
 * @throws {Error} If validation fails
 *
 * @internal
 */
function validateFunctionConfig<TEnv extends Record<string, string>>(
  config: FunctionConfig<TEnv>
): void {
  // Validate trigger is provided
  if (!config.trigger) {
    throw new Error('Function configuration must include a trigger');
  }

  // Validate trigger type
  if (!config.trigger.type) {
    throw new Error('Trigger configuration must include a type');
  }

  // Validate trigger-specific configuration
  validateTriggerConfig(config.trigger);

  // Validate timeout if provided
  if (config.timeout) {
    validateDuration(config.timeout, 'timeout');
  }

  // Validate memory size if provided
  if (config.memorySize !== undefined) {
    if (config.memorySize <= 0) {
      throw new Error('Memory size must be a positive number');
    }
  }

  // Validate bindings
  if (config.inputBindings) {
    config.inputBindings.forEach((binding, index) => {
      validateBinding(binding, `inputBindings[${index}]`);
    });
  }

  if (config.outputBindings) {
    config.outputBindings.forEach((binding, index) => {
      validateBinding(binding, `outputBindings[${index}]`);
    });
  }
}

/**
 * Validates trigger configuration.
 *
 * @param trigger - Trigger configuration to validate
 * @throws {Error} If validation fails
 *
 * @internal
 */
function validateTriggerConfig(trigger: any): void {
  const triggerType = trigger.type;

  switch (triggerType) {
    case 'http':
      validateHttpTrigger(trigger);
      break;
    case 'timer':
      validateTimerTrigger(trigger);
      break;
    case 'queue':
      validateQueueTrigger(trigger);
      break;
    case 'serviceBus':
      validateServiceBusTrigger(trigger);
      break;
    case 'cosmosDb':
      validateCosmosTrigger(trigger);
      break;
    case 'eventHub':
      validateEventHubTrigger(trigger);
      break;
    case 'blob':
      validateBlobTrigger(trigger);
      break;
    default:
      throw new Error(`Unknown trigger type: ${triggerType}`);
  }
}

/**
 * Validates HTTP trigger configuration.
 *
 * @param trigger - HTTP trigger to validate
 * @throws {Error} If validation fails
 *
 * @internal
 */
function validateHttpTrigger(trigger: any): void {
  // HTTP triggers are always valid - methods, route, and authLevel are optional
}

/**
 * Validates Timer trigger configuration.
 *
 * @param trigger - Timer trigger to validate
 * @throws {Error} If validation fails
 *
 * @internal
 */
function validateTimerTrigger(trigger: any): void {
  if (!trigger.schedule) {
    throw new Error('Timer trigger must include a schedule (CRON expression)');
  }

  if (typeof trigger.schedule !== 'string' || trigger.schedule.trim() === '') {
    throw new Error('Timer trigger schedule must be a non-empty string');
  }
}

/**
 * Validates Queue trigger configuration.
 *
 * @param trigger - Queue trigger to validate
 * @throws {Error} If validation fails
 *
 * @internal
 */
function validateQueueTrigger(trigger: any): void {
  if (!trigger.queueName) {
    throw new Error('Queue trigger must include a queueName');
  }

  if (!trigger.connection) {
    throw new Error('Queue trigger must include a connection string reference');
  }
}

/**
 * Validates Service Bus trigger configuration.
 *
 * @param trigger - Service Bus trigger to validate
 * @throws {Error} If validation fails
 *
 * @internal
 */
function validateServiceBusTrigger(trigger: any): void {
  if (!trigger.queueName && !trigger.topicName) {
    throw new Error('Service Bus trigger must include either queueName or topicName');
  }

  if (trigger.topicName && !trigger.subscriptionName) {
    throw new Error('Service Bus topic trigger must include subscriptionName');
  }

  if (!trigger.connection) {
    throw new Error('Service Bus trigger must include a connection string reference');
  }
}

/**
 * Validates Cosmos DB trigger configuration.
 *
 * @param trigger - Cosmos DB trigger to validate
 * @throws {Error} If validation fails
 *
 * @internal
 */
function validateCosmosTrigger(trigger: any): void {
  if (!trigger.databaseName) {
    throw new Error('Cosmos DB trigger must include databaseName');
  }

  if (!trigger.collectionName) {
    throw new Error('Cosmos DB trigger must include collectionName');
  }

  if (!trigger.connection) {
    throw new Error('Cosmos DB trigger must include a connection string reference');
  }
}

/**
 * Validates Event Hub trigger configuration.
 *
 * @param trigger - Event Hub trigger to validate
 * @throws {Error} If validation fails
 *
 * @internal
 */
function validateEventHubTrigger(trigger: any): void {
  if (!trigger.eventHubName) {
    throw new Error('Event Hub trigger must include eventHubName');
  }

  if (!trigger.connection) {
    throw new Error('Event Hub trigger must include a connection string reference');
  }
}

/**
 * Validates Blob trigger configuration.
 *
 * @param trigger - Blob trigger to validate
 * @throws {Error} If validation fails
 *
 * @internal
 */
function validateBlobTrigger(trigger: any): void {
  if (!trigger.path) {
    throw new Error('Blob trigger must include path');
  }

  if (!trigger.connection) {
    throw new Error('Blob trigger must include a connection string reference');
  }
}

/**
 * Validates binding configuration.
 *
 * @param binding - Binding to validate
 * @param context - Context for error messages
 * @throws {Error} If validation fails
 *
 * @internal
 */
function validateBinding(binding: any, context: string): void {
  if (!binding.type) {
    throw new Error(`${context}: Binding must include a type`);
  }

  if (!binding.direction) {
    throw new Error(`${context}: Binding must include a direction (in, out, or inout)`);
  }

  if (!binding.name) {
    throw new Error(`${context}: Binding must include a name`);
  }

  // Validate direction
  if (!['in', 'out', 'inout'].includes(binding.direction)) {
    throw new Error(`${context}: Binding direction must be 'in', 'out', or 'inout'`);
  }
}

/**
 * Validates duration configuration.
 *
 * @param duration - Duration to validate
 * @param context - Context for error messages
 * @throws {Error} If validation fails
 *
 * @internal
 */
function validateDuration(duration: Duration, context: string): void {
  if (!duration.seconds || duration.seconds <= 0) {
    throw new Error(`${context}: Duration must have positive seconds value`);
  }

  // Azure Functions have timeout limits
  // Consumption plan: max 10 minutes (600 seconds)
  // Premium/Dedicated: max 30 minutes (1800 seconds) or unlimited
  // We'll warn for very long timeouts but not enforce here
  if (duration.seconds > 1800) {
    console.warn(
      `${context}: Timeout of ${duration.seconds} seconds exceeds standard limits. ` +
        'Ensure your hosting plan supports this timeout duration.'
    );
  }
}
