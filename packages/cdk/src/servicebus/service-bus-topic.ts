/**
 * L2 construct for Service Bus Topics with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for Service Bus Topics.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { constructIdToPurpose } from '@atakora/lib';
import { ArmServiceBusTopic } from './service-bus-topic-arm';
import type {
  ServiceBusTopicProps,
  IServiceBusTopic,
} from './service-bus-topic-types';

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
export class ServiceBusTopic extends Construct implements IServiceBusTopic {
  private readonly armTopic: ArmServiceBusTopic;

  /**
   * Topic name.
   */
  public readonly topicName: string;

  /**
   * Resource ID of the topic.
   */
  public readonly topicId: string;

  /**
   * Parent namespace.
   */
  public readonly namespace: any;

  constructor(scope: Construct, id: string, props: ServiceBusTopicProps) {
    super(scope, id);

    this.namespace = props.namespace;
    this.topicName = props.topicName ?? this.generateTopicName(id);

    this.armTopic = new ArmServiceBusTopic(scope, `${id}-Resource`, {
      namespace: props.namespace,
      topicName: this.topicName,
      maxSizeInMegabytes: props.maxSizeInMegabytes,
      defaultMessageTimeToLive: props.defaultMessageTimeToLive ?? 'P14D', // 14 days default
      duplicateDetectionHistoryTimeWindow: props.duplicateDetectionHistoryTimeWindow,
      enableBatchedOperations: props.enableBatchedOperations ?? true,
      requiresDuplicateDetection: props.requiresDuplicateDetection ?? false,
      enablePartitioning: props.enablePartitioning ?? false,
      supportOrdering: props.supportOrdering ?? false,
      autoDeleteOnIdle: props.autoDeleteOnIdle,
      status: props.status,
    });

    this.topicId = this.armTopic.topicId;
  }

  /**
   * Generates a topic name from construct ID.
   *
   * @param id - Construct ID
   * @returns Sanitized topic name
   */
  private generateTopicName(id: string): string {
    const purpose = constructIdToPurpose(id, 'topic', ['topic']);
    return `${purpose}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

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
  public grantSend(principal: any): this {
    // Azure Service Bus Data Sender role
    const roleDefinitionId =
      '/providers/Microsoft.Authorization/roleDefinitions/69a216fc-b8fb-44d8-bc22-1f3c2cd27a39';

    // Use lib's RBAC helper to create role assignment
    const { grantResourceRole } = require('@atakora/lib');
    grantResourceRole(this, `${principal.node.id}-SendGrant`, {
      principal,
      roleDefinitionId,
      scope: this.topicId,
    });

    return this;
  }

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
  public grantReceive(principal: any): this {
    // Azure Service Bus Data Receiver role
    const roleDefinitionId =
      '/providers/Microsoft.Authorization/roleDefinitions/4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0';

    const { grantResourceRole } = require('@atakora/lib');
    grantResourceRole(this, `${principal.node.id}-ReceiveGrant`, {
      principal,
      roleDefinitionId,
      scope: this.topicId,
    });

    return this;
  }

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
  public grantFullAccess(principal: any): this {
    return this.grantSend(principal).grantReceive(principal);
  }
}
