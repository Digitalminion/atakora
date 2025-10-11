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
export class KafkaTrigger {
  private topic?: string;
  private brokerList?: string;
  private consumerGroup?: string;
  private protocol?: string;
  private authenticationMode?: string;
  private username?: string;
  private password?: string;

  /**
   * Creates a new Kafka trigger builder.
   *
   * @returns New KafkaTrigger builder instance
   */
  public static create(): KafkaTrigger {
    return new KafkaTrigger();
  }

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
  public withTopic(topic: string): this {
    this.topic = topic;
    return this;
  }

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
  public withBrokerList(brokerList: string): this {
    this.brokerList = brokerList;
    return this;
  }

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
  public withConsumerGroup(consumerGroup: string): this {
    this.consumerGroup = consumerGroup;
    return this;
  }

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
  public withProtocol(protocol: string): this {
    this.protocol = protocol;
    return this;
  }

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
  public withSaslAuthentication(mode: string, username: string, passwordSetting: string): this {
    this.authenticationMode = mode;
    this.username = username;
    this.password = passwordSetting;
    return this;
  }

  /**
   * Builds the Kafka trigger configuration.
   *
   * @returns Kafka trigger configuration object
   *
   * @throws {Error} If required properties are not set
   */
  public build(): KafkaTriggerConfig {
    if (!this.topic) {
      throw new Error('Topic must be set for Kafka trigger');
    }
    if (!this.brokerList) {
      throw new Error('Broker list must be set for Kafka trigger');
    }

    return {
      type: 'kafka',
      topic: this.topic,
      brokerList: this.brokerList,
      consumerGroup: this.consumerGroup,
      protocol: this.protocol,
      authenticationMode: this.authenticationMode,
      username: this.username,
      password: this.password,
    };
  }
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
export function kafkaTrigger(
  topic: string,
  brokerList: string,
  options: {
    consumerGroup?: string;
    protocol?: string;
    authenticationMode?: string;
    username?: string;
    password?: string;
  } = {}
): KafkaTriggerConfig {
  return {
    type: 'kafka',
    topic,
    brokerList,
    consumerGroup: options.consumerGroup,
    protocol: options.protocol,
    authenticationMode: options.authenticationMode,
    username: options.username,
    password: options.password,
  };
}
