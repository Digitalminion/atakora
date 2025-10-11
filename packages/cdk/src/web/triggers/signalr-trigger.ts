/**
 * SignalR trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */

import type { SignalRTriggerConfig } from '../function-app-types';

/**
 * Builder for creating SignalR trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building SignalR trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = SignalRTrigger.create()
 *   .withHubName('chat')
 *   .onMessage('newMessage')
 *   .withConnection('AzureSignalRConnectionString')
 *   .build();
 * ```
 */
export class SignalRTrigger {
  private hubName?: string;
  private category?: 'connections' | 'messages';
  private event?: string;
  private connection?: string;

  /**
   * Creates a new SignalR trigger builder.
   *
   * @returns New SignalRTrigger builder instance
   */
  public static create(): SignalRTrigger {
    return new SignalRTrigger();
  }

  /**
   * Sets the SignalR hub name.
   *
   * @param hubName - Hub name
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withHubName('chat')
   * ```
   */
  public withHubName(hubName: string): this {
    this.hubName = hubName;
    return this;
  }

  /**
   * Sets the event category and event name for connection events.
   *
   * @param event - Connection event ('connected' or 'disconnected')
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .onConnection('connected')
   * ```
   */
  public onConnection(event: string): this {
    this.category = 'connections';
    this.event = event;
    return this;
  }

  /**
   * Sets the event category and event name for message events.
   *
   * @param event - Message event name
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .onMessage('newMessage')
   * ```
   */
  public onMessage(event: string): this {
    this.category = 'messages';
    this.event = event;
    return this;
  }

  /**
   * Sets the SignalR connection string app setting name.
   *
   * @param connection - App setting name containing the connection string
   * @returns This builder for chaining
   *
   * @remarks
   * Defaults to 'AzureSignalRConnectionString' if not specified.
   *
   * @example
   * ```typescript
   * .withConnection('MySignalRConnection')
   * ```
   */
  public withConnection(connection: string): this {
    this.connection = connection;
    return this;
  }

  /**
   * Builds the SignalR trigger configuration.
   *
   * @returns SignalR trigger configuration object
   *
   * @throws {Error} If required properties are not set
   */
  public build(): SignalRTriggerConfig {
    if (!this.hubName) {
      throw new Error('Hub name must be set for SignalR trigger');
    }
    if (!this.category) {
      throw new Error('Category must be set for SignalR trigger (use onConnection or onMessage)');
    }
    if (!this.event) {
      throw new Error('Event must be set for SignalR trigger');
    }

    return {
      type: 'signalR',
      hubName: this.hubName,
      category: this.category,
      event: this.event,
      connection: this.connection,
    };
  }
}

/**
 * Helper function to create a SignalR trigger configuration.
 *
 * @param hubName - Hub name
 * @param category - Event category
 * @param event - Event name
 * @param options - Optional configuration
 * @returns Complete SignalR trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = signalRTrigger('chat', 'messages', 'newMessage', {
 *   connection: 'MySignalRConnection'
 * });
 * ```
 */
export function signalRTrigger(
  hubName: string,
  category: 'connections' | 'messages',
  event: string,
  options: {
    connection?: string;
  } = {}
): SignalRTriggerConfig {
  return {
    type: 'signalR',
    hubName,
    category,
    event,
    connection: options.connection,
  };
}
