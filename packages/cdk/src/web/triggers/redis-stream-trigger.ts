/**
 * Redis Stream trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */

import type { RedisStreamTriggerConfig } from '../function-app-types';

/**
 * Builder for creating Redis Stream trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building Redis Stream trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = RedisStreamTrigger.create()
 *   .withKey('events:stream')
 *   .withConnection('RedisConnection')
 *   .withConsumerGroup('function-processor')
 *   .withPollingInterval(1000)
 *   .withMaxBatchSize(16)
 *   .build();
 * ```
 */
export class RedisStreamTrigger {
  private connection?: string;
  private key?: string;
  private consumerGroup?: string;
  private pollingIntervalInMs?: number;
  private maxBatchSize?: number;

  /**
   * Creates a new Redis Stream trigger builder.
   *
   * @returns New RedisStreamTrigger builder instance
   */
  public static create(): RedisStreamTrigger {
    return new RedisStreamTrigger();
  }

  /**
   * Sets the Redis connection string app setting name.
   *
   * @param connection - App setting name containing the connection string
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withConnection('RedisConnection')
   * ```
   */
  public withConnection(connection: string): this {
    this.connection = connection;
    return this;
  }

  /**
   * Sets the stream key to monitor.
   *
   * @param key - Redis stream key
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withKey('events:stream')
   * ```
   */
  public withKey(key: string): this {
    this.key = key;
    return this;
  }

  /**
   * Sets the consumer group name.
   *
   * @param consumerGroup - Consumer group name
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withConsumerGroup('function-processor')
   * ```
   */
  public withConsumerGroup(consumerGroup: string): this {
    this.consumerGroup = consumerGroup;
    return this;
  }

  /**
   * Sets the polling interval.
   *
   * @param intervalMs - Polling interval in milliseconds
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withPollingInterval(1000)
   * ```
   */
  public withPollingInterval(intervalMs: number): this {
    this.pollingIntervalInMs = intervalMs;
    return this;
  }

  /**
   * Sets the maximum batch size.
   *
   * @param batchSize - Maximum number of entries to process in a batch
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withMaxBatchSize(16)
   * ```
   */
  public withMaxBatchSize(batchSize: number): this {
    this.maxBatchSize = batchSize;
    return this;
  }

  /**
   * Builds the Redis Stream trigger configuration.
   *
   * @returns Redis Stream trigger configuration object
   *
   * @throws {Error} If required properties are not set
   */
  public build(): RedisStreamTriggerConfig {
    if (!this.connection) {
      throw new Error('Connection must be set for Redis Stream trigger');
    }
    if (!this.key) {
      throw new Error('Key must be set for Redis Stream trigger');
    }

    return {
      type: 'redisStream',
      connection: this.connection,
      key: this.key,
      consumerGroup: this.consumerGroup,
      pollingIntervalInMs: this.pollingIntervalInMs,
      maxBatchSize: this.maxBatchSize,
    };
  }
}

/**
 * Helper function to create a Redis Stream trigger configuration.
 *
 * @param connection - Connection string app setting name
 * @param key - Stream key
 * @param options - Optional configuration
 * @returns Complete Redis Stream trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = redisStreamTrigger('RedisConnection', 'events:stream', {
 *   consumerGroup: 'function-processor',
 *   pollingIntervalInMs: 1000,
 *   maxBatchSize: 16
 * });
 * ```
 */
export function redisStreamTrigger(
  connection: string,
  key: string,
  options: {
    consumerGroup?: string;
    pollingIntervalInMs?: number;
    maxBatchSize?: number;
  } = {}
): RedisStreamTriggerConfig {
  return {
    type: 'redisStream',
    connection,
    key,
    consumerGroup: options.consumerGroup,
    pollingIntervalInMs: options.pollingIntervalInMs,
    maxBatchSize: options.maxBatchSize,
  };
}
