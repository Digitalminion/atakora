/**
 * L2 construct for Service Bus Subscriptions with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for Service Bus Subscriptions.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { constructIdToPurpose } from '@atakora/lib';
import { ArmServiceBusSubscription } from './service-bus-subscription-arm';
import type {
  ServiceBusSubscriptionProps,
  IServiceBusSubscription,
  SqlFilter,
  CorrelationFilter,
} from './service-bus-topic-types';

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
export class ServiceBusSubscription extends Construct implements IServiceBusSubscription {
  private readonly armSubscription: ArmServiceBusSubscription;

  /**
   * Subscription name.
   */
  public readonly subscriptionName: string;

  /**
   * Resource ID of the subscription.
   */
  public readonly subscriptionId: string;

  /**
   * Parent topic.
   */
  public readonly topic: any;

  constructor(scope: Construct, id: string, props: ServiceBusSubscriptionProps) {
    super(scope, id);

    this.topic = props.topic;
    this.subscriptionName = props.subscriptionName ?? this.generateSubscriptionName(id);

    this.armSubscription = new ArmServiceBusSubscription(scope, `${id}-Resource`, {
      topic: props.topic,
      subscriptionName: this.subscriptionName,
      lockDuration: props.lockDuration ?? 'PT1M', // 1 minute default
      enableBatchedOperations: props.enableBatchedOperations ?? true,
      defaultMessageTimeToLive: props.defaultMessageTimeToLive ?? 'P14D', // 14 days default
      autoDeleteOnIdle: props.autoDeleteOnIdle,
      deadLetteringOnMessageExpiration: props.deadLetteringOnMessageExpiration ?? false,
      deadLetteringOnFilterEvaluationExceptions: props.deadLetteringOnFilterEvaluationExceptions ?? true,
      maxDeliveryCount: props.maxDeliveryCount ?? 10,
      requiresSession: props.requiresSession ?? false,
      forwardTo: props.forwardTo,
      forwardDeadLetteredMessagesTo: props.forwardDeadLetteredMessagesTo,
      status: props.status,
    });

    this.subscriptionId = this.armSubscription.subscriptionId;

    // If a filter is provided, create a default rule
    if (props.filter || props.ruleAction) {
      this.createDefaultRule(props.filter, props.ruleAction);
    }
  }

  /**
   * Generates a subscription name from construct ID.
   *
   * @param id - Construct ID
   * @returns Sanitized subscription name
   */
  private generateSubscriptionName(id: string): string {
    const purpose = constructIdToPurpose(id, 'subscription', ['subscription', 'sub']);
    return `${purpose}`.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  }

  /**
   * Creates the default subscription rule with filter.
   *
   * @param filter - SQL or correlation filter
   * @param action - Optional rule action
   */
  private createDefaultRule(
    filter?: SqlFilter | CorrelationFilter,
    action?: any
  ): void {
    if (!filter) {
      return;
    }

    // Import rule construct
    const { ServiceBusRule } = require('./service-bus-rule');

    new ServiceBusRule(this, 'DefaultRule', {
      subscription: this,
      ruleName: '$Default',
      filter,
      action,
    });
  }

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
  public grantReceive(principal: any): this {
    // Azure Service Bus Data Receiver role
    const roleDefinitionId =
      '/providers/Microsoft.Authorization/roleDefinitions/4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0';

    const { grantResourceRole } = require('@atakora/lib');
    grantResourceRole(this, `${principal.node.id}-ReceiveGrant`, {
      principal,
      roleDefinitionId,
      scope: this.subscriptionId,
    });

    return this;
  }
}
