/**
 * Event Configuration Attachment Types
 *
 * @module @atakora/component/events
 *
 * @remarks
 * This module provides configuration types for event queue customizations.
 * Used when attaching custom event processing configurations to schema event models.
 *
 * @example
 * ```typescript
 * import { defineEventConfig } from '@atakora/component/events';
 *
 * export const DataUploaded = defineEventConfig({
 *   retryPolicy: {
 *     maxRetries: 3,
 *     backoffMultiplier: 2,
 *   },
 *   visibilityTimeout: minutes(5),
 *   messageTimeToLive: minutes(30),
 * });
 * ```
 */

import type { Duration } from '../../common/duration';

/**
 * Retry policy configuration for event processing
 */
export interface RetryPolicy {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  readonly maxRetries?: number;

  /**
   * Initial delay before first retry
   * @default 1 second
   */
  readonly initialDelay?: Duration;

  /**
   * Backoff multiplier for exponential backoff
   * @default 2
   */
  readonly backoffMultiplier?: number;

  /**
   * Maximum delay between retries
   * @default 5 minutes
   */
  readonly maxDelay?: Duration;
}

/**
 * Event queue configuration
 */
export interface EventQueueConfig {
  /**
   * Queue name (defaults to event model name)
   */
  readonly name?: string;

  /**
   * Retry policy for failed messages
   */
  readonly retryPolicy?: RetryPolicy;

  /**
   * How long a message is hidden after being picked up by a processor
   * @default 5 minutes
   */
  readonly visibilityTimeout?: Duration;

  /**
   * How long a message lives in the queue before being deleted
   * @default 7 days
   */
  readonly messageTimeToLive?: Duration;

  /**
   * Maximum number of delivery attempts before moving to dead letter queue
   * @default 10
   */
  readonly maxDeliveryAttempts?: number;

  /**
   * Enable batch processing
   * @default false
   */
  readonly enableBatchProcessing?: boolean;

  /**
   * Batch size for processing
   * @default 10
   */
  readonly batchSize?: number;
}

/**
 * Event processor configuration
 */
export interface EventProcessorConfig {
  /**
   * Custom processor function handler
   */
  readonly handler?: (event: any, context: any) => Promise<void>;

  /**
   * Memory allocation for processor function
   * @default 256 MB
   */
  readonly memory?: number;

  /**
   * Timeout for processor function
   * @default 5 minutes
   */
  readonly timeout?: Duration;

  /**
   * Environment variables for processor
   */
  readonly environment?: Record<string, string>;
}

/**
 * Complete event configuration
 */
export interface EventConfig {
  /**
   * Queue configuration
   */
  readonly queue?: EventQueueConfig;

  /**
   * Processor configuration
   */
  readonly processor?: EventProcessorConfig;

  /**
   * Enable monitoring and alerting
   * @default true
   */
  readonly enableMonitoring?: boolean;
}

/**
 * Define event configuration
 *
 * @param config - Event configuration
 * @returns Event configuration object
 *
 * @example
 * ```typescript
 * export const DataUploaded = defineEventConfig({
 *   queue: {
 *     retryPolicy: {
 *       maxRetries: 3,
 *       backoffMultiplier: 2,
 *     },
 *     visibilityTimeout: minutes(5),
 *   },
 *   processor: {
 *     memory: 512,
 *     timeout: minutes(10),
 *   },
 * });
 * ```
 */
export function defineEventConfig(config: EventConfig): EventConfig {
  return config;
}

// Re-export for convenience
export type { Duration };

// ============================================================================
// Events Builder API (Stub Implementation)
// ============================================================================

/**
 * TODO: Full implementation of events builder API
 * This is a stub to allow example code to compile.
 */

// Re-export common utilities for convenience
import { minutes as _minutes, hours as _hours, days as _days } from '../../common/duration';
import {
  greaterThan as _greaterThan,
  lessThan as _lessThan,
  olderThan as _olderThan,
} from '../../common/threshold';

export { _minutes as minutes, _hours as hours, _days as days };
export { _greaterThan as greaterThan, _lessThan as lessThan, _olderThan as olderThan };

/**
 * Event configuration builder (stub)
 * @internal
 */
export class EventConfigurationBuilder {
  private config: any = {};

  constructor(private eventName: string) {
    this.config.name = eventName;
  }

  ttl(duration: any): this {
    this.config.ttl = duration;
    return this;
  }

  visibility(duration: any): this {
    this.config.visibility = duration;
    return this;
  }

  batchSize(size: number): this {
    this.config.batchSize = size;
    return this;
  }

  parallelism(count: number): this {
    this.config.parallelism = count;
    return this;
  }

  retry(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  retries(count: number): this {
    this.config.retries = count;
    return this;
  }

  withDeadLetterQueue(name?: string): this {
    this.config.deadLetterQueue = name || `${this.eventName}-dlq`;
    return this;
  }

  deadLetterAfter(attempts: number): this {
    this.config.deadLetterAfter = attempts;
    return this;
  }

  withProcessor(processor: (context: any, event: any) => Promise<void>): this {
    this.config.processor = processor;
    return this;
  }

  monitoring(callback: (builder: any) => any): this {
    // Stub
    return this;
  }

  withMetrics(): this {
    this.config.metrics = true;
    return this;
  }

  withTracing(): this {
    this.config.tracing = true;
    return this;
  }

  tags(tags: Record<string, string>): this {
    this.config.tags = tags;
    return this;
  }

  _build(): any {
    return this.config;
  }
}

/**
 * Configure an event
 *
 * @param eventName - The name of the event to configure
 * @returns Event configuration builder
 */
export function configureEvent(eventName: string): EventConfigurationBuilder {
  return new EventConfigurationBuilder(eventName);
}

/**
 * Define events configuration
 *
 * @param configs - Event configuration builders
 * @returns Events configuration
 */
export function defineEvents(configs: Record<string, any>): any {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(configs)) {
    if (value && typeof value === 'object' && '_build' in value) {
      result[key] = value._build();
    } else {
      result[key] = value;
    }
  }

  return result;
}
