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
export class IoTHubTrigger {
  private path?: string;
  private connection?: string;
  private consumerGroup?: string;
  private cardinality?: 'one' | 'many';

  /**
   * Creates a new IoT Hub trigger builder.
   *
   * @returns New IoTHubTrigger builder instance
   */
  public static create(): IoTHubTrigger {
    return new IoTHubTrigger();
  }

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
  public withPath(path: string): this {
    this.path = path;
    return this;
  }

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
  public withConnection(connection: string): this {
    this.connection = connection;
    return this;
  }

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
  public withConsumerGroup(consumerGroup: string): this {
    this.consumerGroup = consumerGroup;
    return this;
  }

  /**
   * Configures to process messages one at a time.
   *
   * @returns This builder for chaining
   */
  public processOne(): this {
    this.cardinality = 'one';
    return this;
  }

  /**
   * Configures to process messages in batches.
   *
   * @returns This builder for chaining
   */
  public processBatch(): this {
    this.cardinality = 'many';
    return this;
  }

  /**
   * Sets the cardinality.
   *
   * @param cardinality - 'one' or 'many'
   * @returns This builder for chaining
   */
  public withCardinality(cardinality: 'one' | 'many'): this {
    this.cardinality = cardinality;
    return this;
  }

  /**
   * Builds the IoT Hub trigger configuration.
   *
   * @returns IoT Hub trigger configuration object
   *
   * @throws {Error} If path or connection is not set
   */
  public build(): IoTHubTriggerConfig {
    if (!this.path) {
      throw new Error('Path must be set for IoT Hub trigger');
    }
    if (!this.connection) {
      throw new Error('Connection must be set for IoT Hub trigger');
    }

    return {
      type: 'iotHub',
      path: this.path,
      connection: this.connection,
      consumerGroup: this.consumerGroup,
      cardinality: this.cardinality,
    };
  }
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
export function iotHubTrigger(
  path: string,
  connection: string,
  options: {
    consumerGroup?: string;
    cardinality?: 'one' | 'many';
  } = {}
): IoTHubTriggerConfig {
  return {
    type: 'iotHub',
    path,
    connection,
    consumerGroup: options.consumerGroup,
    cardinality: options.cardinality,
  };
}
