/**
 * L2 construct for Azure SignalR Service with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for SignalR Service.
 * Ideal for real-time web functionality and GraphQL subscriptions.
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/cdk';
import type { SignalRServiceProps, ISignalRService } from './signalr-service-types';
/**
 * L2 construct for SignalR Service.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Creates a SignalR Service for real-time web functionality.
 *
 * @example
 * **Minimal usage (serverless mode for Functions):**
 * ```typescript
 * const signalr = new SignalRService(stack, 'Realtime', {});
 * ```
 *
 * @example
 * **For GraphQL subscriptions:**
 * ```typescript
 * const signalr = new SignalRService(stack, 'GraphQLRealtime', {
 *   signalRName: 'graphql-realtime',
 *   mode: ServiceMode.SERVERLESS,
 *   sku: SignalRSku.STANDARD,
 *   capacity: 1,
 *   enableMessagingLogs: true,
 *   cors: {
 *     allowedOrigins: ['https://myapp.com', 'https://admin.myapp.com']
 *   }
 * });
 *
 * // Configure upstream to Azure Function
 * const signalrWithUpstream = new SignalRService(stack, 'Realtime', {
 *   mode: ServiceMode.SERVERLESS,
 *   upstreamTemplates: [{
 *     hubPattern: 'graphql',
 *     eventPattern: '*',
 *     categoryPattern: 'messages',
 *     urlTemplate: 'https://my-functions.azurewebsites.net/runtime/webhooks/signalr',
 *     auth: {
 *       type: 'ManagedIdentity'
 *     }
 *   }]
 * });
 * ```
 *
 * @example
 * **With standard mode (persistent connections):**
 * ```typescript
 * const signalr = new SignalRService(stack, 'Chat', {
 *   mode: ServiceMode.DEFAULT,
 *   sku: SignalRSku.STANDARD,
 *   capacity: 2,
 *   cors: {
 *     allowedOrigins: ['*'] // Allow all origins for development
 *   }
 * });
 * ```
 */
export declare class SignalRService extends Construct implements ISignalRService {
    private readonly armSignalR;
    /**
     * SignalR Service name.
     */
    readonly signalRName: string;
    /**
     * Location.
     */
    readonly location: string;
    /**
     * Resource ID.
     */
    readonly signalRId: string;
    /**
     * Hostname.
     */
    readonly hostName: string;
    /**
     * Primary connection string.
     */
    readonly primaryConnectionString?: string;
    /**
     * Primary access key.
     */
    readonly primaryKey?: string;
    constructor(scope: Construct, id: string, props: SignalRServiceProps);
    /**
     * Generates a SignalR Service name from construct ID.
     *
     * @param id - Construct ID
     * @returns Sanitized SignalR Service name
     */
    private generateSignalRName;
    /**
     * Gets the SKU tier from SKU name.
     *
     * @param sku - SKU name
     * @returns SKU tier
     */
    private getSkuTier;
    /**
     * Builds features array from props.
     *
     * @param props - SignalR Service props
     * @returns Features array
     */
    private buildFeatures;
    /**
     * Grant SignalR access to a Function App.
     *
     * @param functionApp - Function App to grant access
     * @returns This instance for chaining
     *
     * @example
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'Api', { ... });
     * signalr.grantAccess(functionApp);
     * ```
     */
    grantAccess(functionApp: any): this;
    /**
     * Grant full SignalR Service Owner access to a principal.
     *
     * @param principal - Principal to grant access
     * @returns This instance for chaining
     *
     * @example
     * ```typescript
     * const identity = new UserAssignedIdentity(stack, 'Identity', {});
     * signalr.grantOwner(identity);
     * ```
     */
    grantOwner(principal: any): this;
    /**
     * Get the connection string reference for use in app settings.
     *
     * @returns ARM expression for connection string
     *
     * @example
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'Api', {
     *   appSettings: {
     *     'AzureSignalRConnectionString': signalr.getConnectionStringReference()
     *   }
     * });
     * ```
     */
    getConnectionStringReference(): string;
    /**
     * Get the endpoint URL for the SignalR Service.
     *
     * @returns SignalR Service endpoint URL
     */
    getEndpoint(): string;
}
//# sourceMappingURL=signalr-service.d.ts.map