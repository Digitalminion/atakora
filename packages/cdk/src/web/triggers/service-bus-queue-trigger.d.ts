/**
 * Service Bus Queue trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */
import type { ServiceBusQueueTriggerConfig } from '../function-app-types';
/**
 * Builder for creating Service Bus Queue trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building Service Bus queue trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = ServiceBusQueueTrigger.create()
 *   .withQueueName('orders-queue')
 *   .withConnection('MyServiceBusConnection')
 *   .withSessions(true)
 *   .build();
 * ```
 */
export declare class ServiceBusQueueTrigger {
    private queueName?;
    private connection?;
    private isSessionsEnabled?;
    /**
     * Creates a new Service Bus Queue trigger builder.
     *
     * @returns New ServiceBusQueueTrigger builder instance
     */
    static create(): ServiceBusQueueTrigger;
    /**
     * Sets the queue name to monitor.
     *
     * @param queueName - Name of the Service Bus queue
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withQueueName('orders-queue')
     * ```
     */
    withQueueName(queueName: string): this;
    /**
     * Sets the Service Bus connection string app setting name.
     *
     * @param connection - App setting name containing the connection string
     * @returns This builder for chaining
     *
     * @remarks
     * Defaults to 'AzureWebJobsServiceBus' if not specified.
     *
     * @example
     * ```typescript
     * .withConnection('MyServiceBusConnection')
     * ```
     */
    withConnection(connection: string): this;
    /**
     * Enables or disables session support.
     *
     * @param enabled - True to enable sessions, false to disable
     * @returns This builder for chaining
     *
     * @remarks
     * Sessions enable ordered processing of messages with the same session ID.
     *
     * @example
     * ```typescript
     * .withSessions(true)
     * ```
     */
    withSessions(enabled?: boolean): this;
    /**
     * Builds the Service Bus Queue trigger configuration.
     *
     * @returns Service Bus Queue trigger configuration object
     *
     * @throws {Error} If queue name is not set
     */
    build(): ServiceBusQueueTriggerConfig;
}
/**
 * Helper function to create a Service Bus queue trigger configuration.
 *
 * @param queueName - Name of the queue to monitor
 * @param options - Optional configuration
 * @returns Complete Service Bus queue trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = serviceBusQueueTrigger('orders-queue', {
 *   connection: 'MyServiceBusConnection',
 *   isSessionsEnabled: true
 * });
 * ```
 */
export declare function serviceBusQueueTrigger(queueName: string, options?: {
    connection?: string;
    isSessionsEnabled?: boolean;
}): ServiceBusQueueTriggerConfig;
//# sourceMappingURL=service-bus-queue-trigger.d.ts.map