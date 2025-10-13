/**
 * Kafka trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */
import type { KafkaTriggerConfig } from '../function-app-types';
/**
 * Builder for creating Kafka trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building Kafka trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = KafkaTrigger.create()
 *   .withTopic('orders')
 *   .withBrokerList('kafka-broker:9092')
 *   .withConsumerGroup('order-processor')
 *   .withSaslAuthentication('plain', 'username', 'PasswordSetting')
 *   .build();
 * ```
 */
export declare class KafkaTrigger {
    private topic?;
    private brokerList?;
    private consumerGroup?;
    private protocol?;
    private authenticationMode?;
    private username?;
    private password?;
    /**
     * Creates a new Kafka trigger builder.
     *
     * @returns New KafkaTrigger builder instance
     */
    static create(): KafkaTrigger;
    /**
     * Sets the Kafka topic name.
     *
     * @param topic - Topic name
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withTopic('orders')
     * ```
     */
    withTopic(topic: string): this;
    /**
     * Sets the Kafka broker list.
     *
     * @param brokerList - Comma-separated broker addresses
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withBrokerList('kafka-broker1:9092,kafka-broker2:9092')
     * ```
     */
    withBrokerList(brokerList: string): this;
    /**
     * Sets the consumer group ID.
     *
     * @param consumerGroup - Consumer group ID
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withConsumerGroup('order-processor')
     * ```
     */
    withConsumerGroup(consumerGroup: string): this;
    /**
     * Sets the protocol for communication.
     *
     * @param protocol - Protocol ('plaintext', 'ssl', 'sasl_plaintext', 'sasl_ssl')
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withProtocol('sasl_ssl')
     * ```
     */
    withProtocol(protocol: string): this;
    /**
     * Configures SASL authentication.
     *
     * @param mode - Authentication mode
     * @param username - Username
     * @param passwordSetting - App setting name containing the password
     * @returns This builder for chaining
     *
     * @example
     * ```typescript
     * .withSaslAuthentication('plain', 'myuser', 'KafkaPassword')
     * ```
     */
    withSaslAuthentication(mode: string, username: string, passwordSetting: string): this;
    /**
     * Builds the Kafka trigger configuration.
     *
     * @returns Kafka trigger configuration object
     *
     * @throws {Error} If required properties are not set
     */
    build(): KafkaTriggerConfig;
}
/**
 * Helper function to create a Kafka trigger configuration.
 *
 * @param topic - Topic name
 * @param brokerList - Broker addresses
 * @param options - Optional configuration
 * @returns Complete Kafka trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = kafkaTrigger('orders', 'kafka-broker:9092', {
 *   consumerGroup: 'order-processor',
 *   protocol: 'sasl_ssl',
 *   authenticationMode: 'plain',
 *   username: 'myuser',
 *   password: 'KafkaPassword'
 * });
 * ```
 */
export declare function kafkaTrigger(topic: string, brokerList: string, options?: {
    consumerGroup?: string;
    protocol?: string;
    authenticationMode?: string;
    username?: string;
    password?: string;
}): KafkaTriggerConfig;
//# sourceMappingURL=kafka-trigger.d.ts.map