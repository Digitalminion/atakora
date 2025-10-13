/**
 * L1 (ARM) constructs for Service Bus Subscriptions.
 *
 * @remarks
 * Direct ARM resource mappings for Microsoft.ServiceBus/namespaces/topics/subscriptions.
 *
 * @packageDocumentation
 */

import { Resource, Construct, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type {
  ArmServiceBusSubscriptionProps,
  IServiceBusSubscription,
} from './service-bus-topic-types';

/**
 * L1 construct for Service Bus Subscription.
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces/topics/subscriptions ARM resource.
 * This is a child resource of Service Bus topic.
 *
 * **ARM Resource Type**: `Microsoft.ServiceBus/namespaces/topics/subscriptions`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup (as child resource)
 */
export class ArmServiceBusSubscription extends Resource implements IServiceBusSubscription {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.ServiceBus/namespaces/topics/subscriptions';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2021-11-01';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Parent topic.
   */
  public readonly topic: any;

  /**
   * Subscription name.
   */
  public readonly subscriptionName: string;

  /**
   * Resource name (same as subscriptionName).
   */
  public readonly name: string;

  /**
   * Lock duration.
   */
  public readonly lockDuration?: string;

  /**
   * Enable batched operations.
   */
  public readonly enableBatchedOperations?: boolean;

  /**
   * Default message time to live.
   */
  public readonly defaultMessageTimeToLive?: string;

  /**
   * Auto delete on idle.
   */
  public readonly autoDeleteOnIdle?: string;

  /**
   * Dead lettering on message expiration.
   */
  public readonly deadLetteringOnMessageExpiration?: boolean;

  /**
   * Dead lettering on filter evaluation exceptions.
   */
  public readonly deadLetteringOnFilterEvaluationExceptions?: boolean;

  /**
   * Maximum delivery count.
   */
  public readonly maxDeliveryCount?: number;

  /**
   * Requires session.
   */
  public readonly requiresSession?: boolean;

  /**
   * Forward to.
   */
  public readonly forwardTo?: string;

  /**
   * Forward dead lettered messages to.
   */
  public readonly forwardDeadLetteredMessagesTo?: string;

  /**
   * Entity status.
   */
  public readonly status?: string;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * Subscription ID (alias for resourceId).
   */
  public readonly subscriptionId: string;

  constructor(scope: Construct, id: string, props: ArmServiceBusSubscriptionProps) {
    super(scope, id);

    this.validateProps(props);

    this.topic = props.topic;
    this.subscriptionName = props.subscriptionName;
    this.name = props.subscriptionName;
    this.lockDuration = props.lockDuration;
    this.enableBatchedOperations = props.enableBatchedOperations;
    this.defaultMessageTimeToLive = props.defaultMessageTimeToLive;
    this.autoDeleteOnIdle = props.autoDeleteOnIdle;
    this.deadLetteringOnMessageExpiration = props.deadLetteringOnMessageExpiration;
    this.deadLetteringOnFilterEvaluationExceptions = props.deadLetteringOnFilterEvaluationExceptions;
    this.maxDeliveryCount = props.maxDeliveryCount;
    this.requiresSession = props.requiresSession;
    this.forwardTo = props.forwardTo;
    this.forwardDeadLetteredMessagesTo = props.forwardDeadLetteredMessagesTo;
    this.status = props.status;

    this.resourceId = `${this.topic.topicId}/subscriptions/${this.subscriptionName}`;
    this.subscriptionId = this.resourceId;
  }

  protected validateProps(props: ArmServiceBusSubscriptionProps): void {
    if (!props.subscriptionName || props.subscriptionName.trim() === '') {
      throw new Error('Subscription name cannot be empty');
    }

    if (props.subscriptionName.length < 1 || props.subscriptionName.length > 50) {
      throw new Error('Subscription name must be between 1 and 50 characters');
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(props.subscriptionName)) {
      throw new Error('Subscription name can only contain alphanumeric characters, hyphens, and underscores');
    }

    if (props.maxDeliveryCount !== undefined && (props.maxDeliveryCount < 1 || props.maxDeliveryCount > 2000)) {
      throw new Error('Max delivery count must be between 1 and 2000');
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: any = {};

    if (this.lockDuration !== undefined) {
      properties.lockDuration = this.lockDuration;
    }

    if (this.enableBatchedOperations !== undefined) {
      properties.enableBatchedOperations = this.enableBatchedOperations;
    }

    if (this.defaultMessageTimeToLive !== undefined) {
      properties.defaultMessageTimeToLive = this.defaultMessageTimeToLive;
    }

    if (this.autoDeleteOnIdle !== undefined) {
      properties.autoDeleteOnIdle = this.autoDeleteOnIdle;
    }

    if (this.deadLetteringOnMessageExpiration !== undefined) {
      properties.deadLetteringOnMessageExpiration = this.deadLetteringOnMessageExpiration;
    }

    if (this.deadLetteringOnFilterEvaluationExceptions !== undefined) {
      properties.deadLetteringOnFilterEvaluationExceptions = this.deadLetteringOnFilterEvaluationExceptions;
    }

    if (this.maxDeliveryCount !== undefined) {
      properties.maxDeliveryCount = this.maxDeliveryCount;
    }

    if (this.requiresSession !== undefined) {
      properties.requiresSession = this.requiresSession;
    }

    if (this.forwardTo !== undefined) {
      properties.forwardTo = this.forwardTo;
    }

    if (this.forwardDeadLetteredMessagesTo !== undefined) {
      properties.forwardDeadLetteredMessagesTo = this.forwardDeadLetteredMessagesTo;
    }

    if (this.status !== undefined) {
      properties.status = this.status;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.topic.namespace.namespaceName}/${this.topic.topicName}/${this.subscriptionName}`,
      properties,
      dependsOn: [this.topic.topicId],
    } as ArmResource;
  }
}
