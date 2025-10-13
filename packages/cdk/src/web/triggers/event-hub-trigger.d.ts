/**
 * Event Hub trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */
import type { EventHubTriggerConfig } from '../function-app-types';
/**
 * Builder for creating Event Hub trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building Event Hub trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = EventHubTrigger.create()
 *   .withEventHubName('telemetry-hub')
 *   .withConnection('MyEventHubConnection')
 *   .withConsumerGroup('$Default')
 *   .processBatch()
 *   .build();
 * ```
 */
export declare class EventHubTrigger {
    private eventHubName?;
    private connection?;
    private consumerGroup?;
    private cardinality?;
    /**
     * Creates a new Event Hub trigger builder.
     *
     * @returns New EventHubTrigger builder instance
     */
    static create(): EventHubTrigger;
    /**
     * Sets the Event Hub name.
     *
     * @param eventHubName - Name of the Event Hub
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withEventHubName('telemetry-hub')
     * ```
     */
    withEventHubName(eventHubName: string): this;
    /**
     * Sets the Event Hub connection string app setting name.
     *
     * @param connection - App setting name containing the connection string
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withConnection('MyEventHubConnection')
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
     * .withConsumerGroup('processor-group')
     * ```
     */
    withConsumerGroup(consumerGroup: string): this;
    /**
     * Configures to process events one at a time.
     *
     * @returns This builder for chaining
     */
    processOne(): this;
    /**
     * Configures to process events in batches.
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
     * Builds the Event Hub trigger configuration.
     *
     * @returns Event Hub trigger configuration object
     *
     * @throws {Error} If Event Hub name or connection is not set
     */
    build(): EventHubTriggerConfig;
}
/**
 * Helper function to create an Event Hub trigger configuration.
 *
 * @param eventHubName - Name of the Event Hub
 * @param connection - Connection string app setting name
 * @param options - Optional configuration
 * @returns Complete Event Hub trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = eventHubTrigger('telemetry-hub', 'MyEventHubConnection', {
 *   consumerGroup: 'processor-group',
 *   cardinality: 'many'
 * });
 * ```
 */
export declare function eventHubTrigger(eventHubName: string, connection: string, options?: {
    consumerGroup?: string;
    cardinality?: 'one' | 'many';
}): EventHubTriggerConfig;
//# sourceMappingURL=event-hub-trigger.d.ts.map