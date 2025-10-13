/**
 * IoT Hub trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */
import type { IoTHubTriggerConfig } from '../function-app-types';
/**
 * Builder for creating IoT Hub trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building IoT Hub trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = IoTHubTrigger.create()
 *   .withPath('messages/events')
 *   .withConnection('IoTHubConnection')
 *   .withConsumerGroup('$Default')
 *   .processBatch()
 *   .build();
 * ```
 */
export declare class IoTHubTrigger {
    private path?;
    private connection?;
    private consumerGroup?;
    private cardinality?;
    /**
     * Creates a new IoT Hub trigger builder.
     *
     * @returns New IoTHubTrigger builder instance
     */
    static create(): IoTHubTrigger;
    /**
     * Sets the Event Hub-compatible path.
     *
     * @param path - Event Hub-compatible endpoint path
     * @returns This builder for chaining
     *
     * @remarks
     * Typically 'messages/events' for device-to-cloud messages.
     *
     * @example
     * ```typescript
     * .withPath('messages/events')
     * ```
     */
    withPath(path: string): this;
    /**
     * Sets the IoT Hub connection string app setting name.
     *
     * @param connection - App setting name containing the connection string
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withConnection('IoTHubConnection')
     * ```
     */
    withConnection(connection: string): this;
    /**
     * Sets the consumer group.
     *
     * @param consumerGroup - Consumer group name
     * @returns This builder for chaining
     *
     * @remarks
     * Defaults to '$Default' if not specified.
     *
     * @example
     * ```typescript
     * .withConsumerGroup('telemetry-processor')
     * ```
     */
    withConsumerGroup(consumerGroup: string): this;
    /**
     * Configures to process messages one at a time.
     *
     * @returns This builder for chaining
     */
    processOne(): this;
    /**
     * Configures to process messages in batches.
     *
     * @returns This builder for chaining
     */
    processBatch(): this;
    /**
     * Sets the cardinality.
     *
     * @param cardinality - 'one' or 'many'
     * @returns This builder for chaining
     */
    withCardinality(cardinality: 'one' | 'many'): this;
    /**
     * Builds the IoT Hub trigger configuration.
     *
     * @returns IoT Hub trigger configuration object
     *
     * @throws {Error} If path or connection is not set
     */
    build(): IoTHubTriggerConfig;
}
/**
 * Helper function to create an IoT Hub trigger configuration.
 *
 * @param path - Event Hub-compatible endpoint path
 * @param connection - Connection string app setting name
 * @param options - Optional configuration
 * @returns Complete IoT Hub trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = iotHubTrigger('messages/events', 'IoTHubConnection', {
 *   consumerGroup: 'telemetry-processor',
 *   cardinality: 'many'
 * });
 * ```
 */
export declare function iotHubTrigger(path: string, connection: string, options?: {
    consumerGroup?: string;
    cardinality?: 'one' | 'many';
}): IoTHubTriggerConfig;
//# sourceMappingURL=iot-hub-trigger.d.ts.map