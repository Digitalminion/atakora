/**
 * RabbitMQ trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */

import type { RabbitMQTriggerConfig } from '../function-app-types';

/**
 * Builder for creating RabbitMQ trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building RabbitMQ trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = RabbitMQTrigger.create()
 *   .withQueueName('tasks')
 *   .withConnection('RabbitMQConnection')
 *   .withHost('rabbitmq.example.com', 5672)
 *   .build();
 * ```
 */
export class RabbitMQTrigger {
  private queueName?: string;
  private connection?: string;
  private hostName?: string;
  private port?: number;

  /**
   * Creates a new RabbitMQ trigger builder.
   *
   * @returns New RabbitMQTrigger builder instance
   */
  public static create(): RabbitMQTrigger {
    return new RabbitMQTrigger();
  }

  /**
   * Sets the queue name to monitor.
   *
   * @param queueName - RabbitMQ queue name
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withQueueName('tasks')
   * ```
   */
  public withQueueName(queueName: string): this {
    this.queueName = queueName;
    return this;
  }

  /**
   * Sets the RabbitMQ connection string app setting name.
   *
   * @param connection - App setting name containing the connection string
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withConnection('RabbitMQConnection')
   * ```
   */
  public withConnection(connection: string): this {
    this.connection = connection;
    return this;
  }

  /**
   * Sets the host name and port.
   *
   * @param hostName - RabbitMQ server host name
   * @param port - Port number (default: 5672)
   * @returns This builder for chaining
   *
   * @remarks
   * Optional if connection string is provided.
   *
   * @example
   * ```typescript
   * .withHost('rabbitmq.example.com', 5672)
   * ```
   */
  public withHost(hostName: string, port: number = 5672): this {
    this.hostName = hostName;
    this.port = port;
    return this;
  }

  /**
   * Builds the RabbitMQ trigger configuration.
   *
   * @returns RabbitMQ trigger configuration object
   *
   * @throws {Error} If required properties are not set
   */
  public build(): RabbitMQTriggerConfig {
    if (!this.queueName) {
      throw new Error('Queue name must be set for RabbitMQ trigger');
    }
    if (!this.connection) {
      throw new Error('Connection must be set for RabbitMQ trigger');
    }

    return {
      type: 'rabbitMQ',
      queueName: this.queueName,
      connection: this.connection,
      hostName: this.hostName,
      port: this.port,
    };
  }
}

/**
 * Helper function to create a RabbitMQ trigger configuration.
 *
 * @param queueName - Queue name
 * @param connection - Connection string app setting name
 * @param options - Optional configuration
 * @returns Complete RabbitMQ trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = rabbitMQTrigger('tasks', 'RabbitMQConnection', {
 *   hostName: 'rabbitmq.example.com',
 *   port: 5672
 * });
 * ```
 */
export function rabbitMQTrigger(
  queueName: string,
  connection: string,
  options: {
    hostName?: string;
    port?: number;
  } = {}
): RabbitMQTriggerConfig {
  return {
    type: 'rabbitMQ',
    queueName,
    connection,
    hostName: options.hostName,
    port: options.port,
  };
}
