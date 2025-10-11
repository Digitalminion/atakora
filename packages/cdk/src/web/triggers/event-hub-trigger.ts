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
export class EventHubTrigger {
  private eventHubName?: string;
  private connection?: string;
  private consumerGroup?: string;
  private cardinality?: 'one' | 'many';

  /**
   * Creates a new Event Hub trigger builder.
   *
   * @returns New EventHubTrigger builder instance
   */
  public static create(): EventHubTrigger {
    return new EventHubTrigger();
  }

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
  public withEventHubName(eventHubName: string): this {
    this.eventHubName = eventHubName;
    return this;
  }

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
   * .withConsumerGroup('processor-group')
   * ```
   */
  public withConsumerGroup(consumerGroup: string): this {
    this.consumerGroup = consumerGroup;
    return this;
  }

  /**
   * Configures to process events one at a time.
   *
   * @returns This builder for chaining
   */
  public processOne(): this {
    this.cardinality = 'one';
    return this;
  }

  /**
   * Configures to process events in batches.
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
   * Builds the Event Hub trigger configuration.
   *
   * @returns Event Hub trigger configuration object
   *
   * @throws {Error} If Event Hub name or connection is not set
   */
  public build(): EventHubTriggerConfig {
    if (!this.eventHubName) {
      throw new Error('Event Hub name must be set for Event Hub trigger');
    }
    if (!this.connection) {
      throw new Error('Connection must be set for Event Hub trigger');
    }

    return {
      type: 'eventHub',
      eventHubName: this.eventHubName,
      connection: this.connection,
      consumerGroup: this.consumerGroup,
      cardinality: this.cardinality,
    };
  }
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
export function eventHubTrigger(
  eventHubName: string,
  connection: string,
  options: {
    consumerGroup?: string;
    cardinality?: 'one' | 'many';
  } = {}
): EventHubTriggerConfig {
  return {
    type: 'eventHub',
    eventHubName,
    connection,
    consumerGroup: options.consumerGroup,
    cardinality: options.cardinality,
  };
}
