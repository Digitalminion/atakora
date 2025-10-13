/**
 * Azure Event Hub resources
 *
 * This namespace contains constructs for Azure Event Hub resources:
 * - Event Hubs (Microsoft.EventHub/namespaces/eventhubs)
 *
 * @remarks
 * Import Event Hub resources from this namespace using:
 * ```typescript
 * import { EventHub, ArmEventHub } from '@atakora/cdk/eventhub';
 * ```
 *
 * ## ARM Resource Types
 *
 * - **Event Hub**: `Microsoft.EventHub/namespaces/eventhubs`
 *
 * ## Usage Example
 *
 * ```typescript
 * import { App, ResourceGroupStack } from '@atakora/cdk';
 * import { EventHub } from '@atakora/cdk/eventhub';
 *
 * const app = new App();
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * // Create Event Hub with L2 construct
 * const eventHub = new EventHub(stack, 'Events', {
 *   namespaceName: 'evhns-myapp-prod',
 *   partitionCount: 4,
 *   messageRetentionInDays: 7
 * });
 *
 * // Grant permissions to a function app
 * const functionApp = new FunctionApp(stack, 'Processor', { ... });
 * eventHub.grantDataReceiver(functionApp);
 *
 * app.synth();
 * ```
 *
 * @packageDocumentation
 */
/**
 * Event Hub L1 construct
 */
export { ArmEventHub } from './event-hub-arm';
/**
 * Event Hub L2 construct with grant methods
 */
export { EventHub } from './event-hub';
/**
 * Event Hub types and interfaces
 */
export type { ArmEventHubProps, EventHubProps, IEventHub, EventHubCaptureDescription, } from './event-hub-types';
//# sourceMappingURL=index.d.ts.map