/**
 * Service Bus Topic trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */
import type { ServiceBusTopicTriggerConfig } from '../function-app-types';
/**
 * Builder for creating Service Bus Topic trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building Service Bus topic trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = ServiceBusTopicTrigger.create()
 *   .withTopicName('orders-topic')
 *   .withSubscriptionName('processor-subscription')
 *   .withConnection('MyServiceBusConnection')
 *   .build();
 * ```
 */
export declare class ServiceBusTopicTrigger {
    private topicName?;
    private subscriptionName?;
    private connection?;
    private isSessionsEnabled?;
    /**
     * Creates a new Service Bus Topic trigger builder.
     *
     * @returns New ServiceBusTopicTrigger builder instance
     */
    static create(): ServiceBusTopicTrigger;
    /**
     * Sets the topic name to monitor.
     *
     * @param topicName - Name of the Service Bus topic
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withTopicName('orders-topic')
     * ```
     */
    withTopicName(topicName: string): this;
    /**
     * Sets the subscription name.
     *
     * @param subscriptionName - Name of the topic subscription
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withSubscriptionName('processor-subscription')
     * ```
     */
    withSubscriptionName(subscriptionName: string): this;
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
     * Builds the Service Bus Topic trigger configuration.
     *
     * @returns Service Bus Topic trigger configuration object
     *
     * @throws {Error} If topic name or subscription name is not set
     */
    build(): ServiceBusTopicTriggerConfig;
}
/**
 * Helper function to create a Service Bus topic trigger configuration.
 *
 * @param topicName - Name of the topic to monitor
 * @param subscriptionName - Name of the subscription
 * @param options - Optional configuration
 * @returns Complete Service Bus topic trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = serviceBusTopicTrigger('orders-topic', 'processor-subscription', {
 *   connection: 'MyServiceBusConnection',
 *   isSessionsEnabled: false
 * });
 * ```
 */
export declare function serviceBusTopicTrigger(topicName: string, subscriptionName: string, options?: {
    connection?: string;
    isSessionsEnabled?: boolean;
}): ServiceBusTopicTriggerConfig;
//# sourceMappingURL=service-bus-topic-trigger.d.ts.map