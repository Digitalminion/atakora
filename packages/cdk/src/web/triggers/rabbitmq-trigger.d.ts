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
export declare class RabbitMQTrigger {
    private queueName?;
    private connection?;
    private hostName?;
    private port?;
    /**
     * Creates a new RabbitMQ trigger builder.
     *
     * @returns New RabbitMQTrigger builder instance
     */
    static create(): RabbitMQTrigger;
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
    withQueueName(queueName: string): this;
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
    withConnection(connection: string): this;
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
    withHost(hostName: string, port?: number): this;
    /**
     * Builds the RabbitMQ trigger configuration.
     *
     * @returns RabbitMQ trigger configuration object
     *
     * @throws {Error} If required properties are not set
     */
    build(): RabbitMQTriggerConfig;
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
export declare function rabbitMQTrigger(queueName: string, connection: string, options?: {
    hostName?: string;
    port?: number;
}): RabbitMQTriggerConfig;
//# sourceMappingURL=rabbitmq-trigger.d.ts.map