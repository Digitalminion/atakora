/**
 * L2 construct for Service Bus Topics with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for Service Bus Topics.
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/cdk';
import type { ServiceBusTopicProps, IServiceBusTopic } from './service-bus-topic-types';
/**
 * L2 construct for Service Bus Topic.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Creates a topic within a Service Bus namespace for pub/sub messaging.
 *
 * @example
 * **Minimal usage:**
 * ```typescript
 * const topic = new ServiceBusTopic(namespace, 'Events', {
 *   namespace: serviceBusNamespace
 * });
 * ```
 *
 * @example
 * **With custom properties:**
 * ```typescript
 * const topic = new ServiceBusTopic(namespace, 'Orders', {
 *   namespace: serviceBusNamespace,
 *   topicName: 'order-events',
 *   enablePartitioning: true,
 *   requiresDuplicateDetection: true,
 *   defaultMessageTimeToLive: 'P7D', // 7 days
 *   maxSizeInMegabytes: 5120
 * });
 * ```
 *
 * @example
 * **For GraphQL subscriptions (real-time):**
 * ```typescript
 * const graphqlEventsTopic = new ServiceBusTopic(namespace, 'GraphQLEvents', {
 *   namespace: serviceBusNamespace,
 *   topicName: 'graphql-mutations',
 *   enablePartitioning: true,
 *   supportOrdering: true,
 *   defaultMessageTimeToLive: 'PT1H' // 1 hour for real-time events
 * });
 * ```
 */
export declare class ServiceBusTopic extends Construct implements IServiceBusTopic {
    private readonly armTopic;
    /**
     * Topic name.
     */
    readonly topicName: string;
    /**
     * Resource ID of the topic.
     */
    readonly topicId: string;
    /**
     * Parent namespace.
     */
    readonly namespace: any;
    constructor(scope: Construct, id: string, props: ServiceBusTopicProps);
    /**
     * Generates a topic name from construct ID.
     *
     * @param id - Construct ID
     * @returns Sanitized topic name
     */
    private generateTopicName;
    /**
     * Grant send permission to a principal.
     *
     * @param principal - Principal to grant permissions (managed identity resource)
     * @returns The topic instance for chaining
     *
     * @example
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'Publisher', { ... });
     * topic.grantSend(functionApp);
     * ```
     */
    grantSend(principal: any): this;
    /**
     * Grant receive permission to a principal.
     *
     * @param principal - Principal to grant permissions (managed identity resource)
     * @returns The topic instance for chaining
     *
     * @example
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'Subscriber', { ... });
     * topic.grantReceive(functionApp);
     * ```
     */
    grantReceive(principal: any): this;
    /**
     * Grant full access (send and receive) to a principal.
     *
     * @param principal - Principal to grant permissions (managed identity resource)
     * @returns The topic instance for chaining
     *
     * @example
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'Processor', { ... });
     * topic.grantFullAccess(functionApp);
     * ```
     */
    grantFullAccess(principal: any): this;
}
//# sourceMappingURL=service-bus-topic.d.ts.map