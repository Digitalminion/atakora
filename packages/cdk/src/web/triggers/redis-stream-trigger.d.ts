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
export declare class RedisStreamTrigger {
    private connection?;
    private key?;
    private consumerGroup?;
    private pollingIntervalInMs?;
    private maxBatchSize?;
    /**
     * Creates a new Redis Stream trigger builder.
     *
     * @returns New RedisStreamTrigger builder instance
     */
    static create(): RedisStreamTrigger;
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
    withConnection(connection: string): this;
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
    withKey(key: string): this;
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
    withConsumerGroup(consumerGroup: string): this;
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
    withPollingInterval(intervalMs: number): this;
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
    withMaxBatchSize(batchSize: number): this;
    /**
     * Builds the Redis Stream trigger configuration.
     *
     * @returns Redis Stream trigger configuration object
     *
     * @throws {Error} If required properties are not set
     */
    build(): RedisStreamTriggerConfig;
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
export declare function redisStreamTrigger(connection: string, key: string, options?: {
    consumerGroup?: string;
    pollingIntervalInMs?: number;
    maxBatchSize?: number;
}): RedisStreamTriggerConfig;
//# sourceMappingURL=redis-stream-trigger.d.ts.map