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
export class ServiceBusQueueTrigger {
  private queueName?: string;
  private connection?: string;
  private isSessionsEnabled?: boolean;

  /**
   * Creates a new Service Bus Queue trigger builder.
   *
   * @returns New ServiceBusQueueTrigger builder instance
   */
  public static create(): ServiceBusQueueTrigger {
    return new ServiceBusQueueTrigger();
  }

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
  public withQueueName(queueName: string): this {
    this.queueName = queueName;
    return this;
  }

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
  public withConnection(connection: string): this {
    this.connection = connection;
    return this;
  }

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
  public withSessions(enabled: boolean = true): this {
    this.isSessionsEnabled = enabled;
    return this;
  }

  /**
   * Builds the Service Bus Queue trigger configuration.
   *
   * @returns Service Bus Queue trigger configuration object
   *
   * @throws {Error} If queue name is not set
   */
  public build(): ServiceBusQueueTriggerConfig {
    if (!this.queueName) {
      throw new Error('Queue name must be set for Service Bus queue trigger');
    }

    return {
      type: 'serviceBusQueue',
      queueName: this.queueName,
      connection: this.connection,
      isSessionsEnabled: this.isSessionsEnabled,
    };
  }
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
export function serviceBusQueueTrigger(
  queueName: string,
  options: {
    connection?: string;
    isSessionsEnabled?: boolean;
  } = {}
): ServiceBusQueueTriggerConfig {
  return {
    type: 'serviceBusQueue',
    queueName,
    connection: options.connection,
    isSessionsEnabled: options.isSessionsEnabled,
  };
}
