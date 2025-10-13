/**
 * L2 construct for Service Bus Subscriptions with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for Service Bus Subscriptions.
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/cdk';
import type { ServiceBusSubscriptionProps, IServiceBusSubscription } from './service-bus-topic-types';
/**
 * L2 construct for Service Bus Subscription.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Creates a subscription to a Service Bus topic for receiving filtered messages.
 *
 * @example
 * **Minimal usage (receives all messages):**
 * ```typescript
 * const subscription = new ServiceBusSubscription(topic, 'AllMessages', {
 *   topic: serviceBusTopic
 * });
 * ```
 *
 * @example
 * **With SQL filter:**
 * ```typescript
 * const subscription = new ServiceBusSubscription(topic, 'HighPriority', {
 *   topic: serviceBusTopic,
 *   subscriptionName: 'high-priority-messages',
 *   filter: {
 *     sqlExpression: "Priority = 'High' AND Status = 'Active'"
 *   },
 *   deadLetteringOnMessageExpiration: true,
 *   maxDeliveryCount: 5
 * });
 * ```
 *
 * @example
 * **GraphQL subscription (by entity type):**
 * ```typescript
 * const userMutationsSub = new ServiceBusSubscription(graphqlEventsTopic, 'UserMutations', {
 *   topic: graphqlEventsTopic,
 *   filter: {
 *     sqlExpression: "entityType = 'User' AND operation IN ('create', 'update', 'delete')"
 *   },
 *   lockDuration: 'PT30S', // 30 seconds
 *   maxDeliveryCount: 3
 * });
 * ```
 *
 * @example
 * **With correlation filter:**
 * ```typescript
 * const subscription = new ServiceBusSubscription(topic, 'OrderEvents', {
 *   topic: serviceBusTopic,
 *   filter: {
 *     correlationId: 'order-processing',
 *     label: 'OrderEvent',
 *     properties: {
 *       'Region': 'US-East',
 *       'Environment': 'Production'
 *     }
 *   }
 * });
 * ```
 */
export declare class ServiceBusSubscription extends Construct implements IServiceBusSubscription {
    private readonly armSubscription;
    /**
     * Subscription name.
     */
    readonly subscriptionName: string;
    /**
     * Resource ID of the subscription.
     */
    readonly subscriptionId: string;
    /**
     * Parent topic.
     */
    readonly topic: any;
    constructor(scope: Construct, id: string, props: ServiceBusSubscriptionProps);
    /**
     * Generates a subscription name from construct ID.
     *
     * @param id - Construct ID
     * @returns Sanitized subscription name
     */
    private generateSubscriptionName;
    /**
     * Creates the default subscription rule with filter.
     *
     * @param filter - SQL or correlation filter
     * @param action - Optional rule action
     */
    private createDefaultRule;
    /**
     * Grant receive permission to a principal.
     *
     * @param principal - Principal to grant permissions (managed identity resource)
     * @returns The subscription instance for chaining
     *
     * @example
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'Subscriber', { ... });
     * subscription.grantReceive(functionApp);
     * ```
     */
    grantReceive(principal: any): this;
}
//# sourceMappingURL=service-bus-subscription.d.ts.map