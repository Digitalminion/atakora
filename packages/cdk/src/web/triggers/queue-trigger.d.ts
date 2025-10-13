/**
 * Queue trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */
import type { QueueTriggerConfig } from '../function-app-types';
/**
 * Builder for creating Queue trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building queue trigger configurations for Azure Storage Queues.
 *
 * @example
 * ```typescript
 * const trigger = QueueTrigger.create()
 *   .withQueueName('orders-queue')
 *   .withConnection('MyStorageConnection')
 *   .build();
 * ```
 */
export declare class QueueTrigger {
    private queueName?;
    private connection?;
    /**
     * Creates a new Queue trigger builder.
     *
     * @returns New QueueTrigger builder instance
     */
    static create(): QueueTrigger;
    /**
     * Sets the queue name to monitor.
     *
     * @param queueName - Name of the Azure Storage Queue
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withQueueName('orders-queue')
     * ```
     */
    withQueueName(queueName: string): this;
    /**
     * Sets the storage account connection string app setting name.
     *
     * @param connection - App setting name containing the connection string
     * @returns This builder for chaining
     *
     * @remarks
     * Defaults to 'AzureWebJobsStorage' if not specified.
     *
     * @example
     * ```typescript
     * .withConnection('MyStorageConnection')
     * ```
     */
    withConnection(connection: string): this;
    /**
     * Builds the Queue trigger configuration.
     *
     * @returns Queue trigger configuration object
     *
     * @throws {Error} If queue name is not set
     */
    build(): QueueTriggerConfig;
}
/**
 * Helper function to create a queue trigger configuration.
 *
 * @param queueName - Name of the queue to monitor
 * @param options - Optional configuration
 * @returns Complete queue trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = queueTrigger('orders-queue', {
 *   connection: 'MyStorageConnection'
 * });
 * ```
 */
export declare function queueTrigger(queueName: string, options?: {
    connection?: string;
}): QueueTriggerConfig;
//# sourceMappingURL=queue-trigger.d.ts.map