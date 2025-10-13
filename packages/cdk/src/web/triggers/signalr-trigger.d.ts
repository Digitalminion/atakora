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
export declare class SignalRTrigger {
    private hubName?;
    private category?;
    private event?;
    private connection?;
    /**
     * Creates a new SignalR trigger builder.
     *
     * @returns New SignalRTrigger builder instance
     */
    static create(): SignalRTrigger;
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
    withHubName(hubName: string): this;
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
    onConnection(event: string): this;
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
    onMessage(event: string): this;
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
    withConnection(connection: string): this;
    /**
     * Builds the SignalR trigger configuration.
     *
     * @returns SignalR trigger configuration object
     *
     * @throws {Error} If required properties are not set
     */
    build(): SignalRTriggerConfig;
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
export declare function signalRTrigger(hubName: string, category: 'connections' | 'messages', event: string, options?: {
    connection?: string;
}): SignalRTriggerConfig;
//# sourceMappingURL=signalr-trigger.d.ts.map