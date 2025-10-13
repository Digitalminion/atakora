/**
 * Azure Service Bus resources
 *
 * This namespace contains constructs for Azure Service Bus resources:
 * - Service Bus Namespaces (Microsoft.ServiceBus/namespaces)
 *
 * @remarks
 * Import Service Bus resources from this namespace using:
 * ```typescript
 * import { ServiceBusNamespace, ArmServiceBusNamespace, ServiceBusSku } from '@atakora/cdk/servicebus';
 * ```
 *
 * ## ARM Resource Types
 *
 * - **Service Bus Namespace**: `Microsoft.ServiceBus/namespaces`
 *
 * ## Usage Example
 *
 * ```typescript
 * import { App, ResourceGroupStack } from '@atakora/cdk';
 * import { ServiceBusNamespace, ServiceBusSku } from '@atakora/cdk/servicebus';
 *
 * const app = new App();
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * // Create Service Bus Namespace with L2 construct
 * const namespace = new ServiceBusNamespace(stack, 'Messaging', {
 *   sku: ServiceBusSku.STANDARD
 * });
 *
 * // Grant permissions to a function app
 * const functionApp = new FunctionApp(stack, 'Processor', { ... });
 * namespace.grantDataReceiver(functionApp);
 *
 * app.synth();
 * ```
 *
 * @packageDocumentation
 */
/**
 * Service Bus Namespace L1 construct
 */
export { ArmServiceBusNamespace } from './service-bus-namespace-arm';
/**
 * Service Bus Namespace L2 construct with grant methods
 */
export { ServiceBusNamespace } from './service-bus-namespace';
/**
 * Service Bus Namespace types and interfaces
 */
export type { ArmServiceBusNamespaceProps, ServiceBusNamespaceProps, IServiceBusNamespace, } from './service-bus-namespace-types';
/**
 * Service Bus enums
 */
export { ServiceBusSku, } from './service-bus-namespace-types';
/**
 * Service Bus Topic L1 construct
 */
export { ArmServiceBusTopic } from './service-bus-topic-arm';
/**
 * Service Bus Topic L2 construct with grant methods
 */
export { ServiceBusTopic } from './service-bus-topic';
/**
 * Service Bus Topic types and interfaces
 */
export type { ArmServiceBusTopicProps, ServiceBusTopicProps, IServiceBusTopic, } from './service-bus-topic-types';
/**
 * Service Bus Topic enums
 */
export { EntityStatus, FilterType, } from './service-bus-topic-types';
/**
 * Service Bus Subscription L1 construct
 */
export { ArmServiceBusSubscription } from './service-bus-subscription-arm';
/**
 * Service Bus Subscription L2 construct with grant methods
 */
export { ServiceBusSubscription } from './service-bus-subscription';
/**
 * Service Bus Subscription types and interfaces
 */
export type { ArmServiceBusSubscriptionProps, ServiceBusSubscriptionProps, IServiceBusSubscription, SqlFilter, CorrelationFilter, SqlRuleAction, } from './service-bus-topic-types';
/**
 * Service Bus Rule L1 construct
 */
export { ArmServiceBusRule } from './service-bus-rule';
/**
 * Service Bus Rule L2 construct
 */
export { ServiceBusRule } from './service-bus-rule';
/**
 * Service Bus Rule types and interfaces
 */
export type { ArmServiceBusRuleProps, ServiceBusRuleProps, IServiceBusRule, } from './service-bus-topic-types';
//# sourceMappingURL=index.d.ts.map