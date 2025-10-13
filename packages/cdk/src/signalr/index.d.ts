/**
 * Azure SignalR Service resources
 *
 * This namespace contains constructs for Azure SignalR Service resources:
 * - SignalR Service (Microsoft.SignalRService/SignalR)
 *
 * @remarks
 * Import SignalR resources from this namespace using:
 * ```typescript
 * import { SignalRService, SignalRSku, ServiceMode } from '@atakora/cdk/signalr';
 * ```
 *
 * ## ARM Resource Types
 *
 * - **SignalR Service**: `Microsoft.SignalRService/SignalR`
 *
 * ## Usage Example
 *
 * ```typescript
 * import { App, ResourceGroupStack } from '@atakora/cdk';
 * import { SignalRService, ServiceMode } from '@atakora/cdk/signalr';
 *
 * const app = new App();
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * // Create SignalR Service for serverless (Functions)
 * const signalr = new SignalRService(stack, 'Realtime', {
 *   mode: ServiceMode.SERVERLESS
 * });
 *
 * // Grant access to Function App
 * const functionApp = new FunctionApp(stack, 'Api', { ... });
 * signalr.grantAccess(functionApp);
 *
 * app.synth();
 * ```
 *
 * @packageDocumentation
 */
/**
 * SignalR Service L1 construct
 */
export { ArmSignalRService } from './signalr-service-arm';
/**
 * SignalR Service L2 construct with grant methods
 */
export { SignalRService } from './signalr-service';
/**
 * SignalR Service types and interfaces
 */
export type { ArmSignalRServiceProps, SignalRServiceProps, ISignalRService, CorsSettings, ServiceFeature, UpstreamAuthSettings, UpstreamTemplate, PrivateEndpointAcl, NetworkAcl, } from './signalr-service-types';
/**
 * SignalR Service enums
 */
export { SignalRSku, ServiceMode, FeatureFlag, AclAction, PublicNetworkAccess, } from './signalr-service-types';
//# sourceMappingURL=index.d.ts.map