/**
 * Type definitions for Service Bus Topic constructs.
 *
 * @remarks
 * Types for Service Bus Topics and Subscriptions within a Service Bus Namespace.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';
import type { IServiceBusNamespace } from './service-bus-namespace-types';

/**
 * Status of the Service Bus Topic
 */
export const EntityStatus = schema.servicebus.EntityStatus;
export type EntityStatus = typeof EntityStatus[keyof typeof EntityStatus];

/**
 * Properties for ArmServiceBusTopic (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces/topics ARM resource.
 *
 * ARM API Version: 2021-11-01
 */
export interface ArmServiceBusTopicProps {
  /**
   * Parent Service Bus namespace.
   */
  readonly namespace: IServiceBusNamespace;

  /**
   * Topic name.
   *
   * @remarks
   * Must be 1-260 characters, alphanumeric and hyphens.
   * Cannot start or end with hyphen.
   */
  readonly topicName: string;

  /**
   * Maximum size of the topic in megabytes.
   *
   * @remarks
   * Valid values: 1024, 2048, 3072, 4096, 5120, 10240, 20480, 40960, 81920
   * Only applicable for Premium tier namespaces.
   */
  readonly maxSizeInMegabytes?: number;

  /**
   * ISO 8601 default message time to live value.
   *
   * @remarks
   * This is the duration after which the message expires.
   * Format: P[n]Y[n]M[n]DT[n]H[n]M[n]S
   * Example: PT5M (5 minutes)
   * Default: P14D (14 days)
   */
  readonly defaultMessageTimeToLive?: string;

  /**
   * ISO 8601 timespan structure that defines the duration of the duplicate detection history.
   *
   * @remarks
   * Default: PT10M (10 minutes)
   */
  readonly duplicateDetectionHistoryTimeWindow?: string;

  /**
   * Enable batched operations.
   */
  readonly enableBatchedOperations?: boolean;

  /**
   * Enable duplicate detection.
   */
  readonly requiresDuplicateDetection?: boolean;

  /**
   * Enable partitioning.
   *
   * @remarks
   * Once enabled, cannot be changed.
   */
  readonly enablePartitioning?: boolean;

  /**
   * Enable ordering guarantee.
   */
  readonly supportOrdering?: boolean;

  /**
   * ISO 8601 timespan idle interval after which the topic is automatically deleted.
   *
   * @remarks
   * Minimum: PT5M (5 minutes)
   */
  readonly autoDeleteOnIdle?: string;

  /**
   * Status of the topic.
   */
  readonly status?: EntityStatus;
}

/**
 * Properties for ServiceBusTopic (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 */
export interface ServiceBusTopicProps {
  /**
   * Parent Service Bus namespace.
   */
  readonly namespace: IServiceBusNamespace;

  /**
   * Topic name (optional - auto-generated if not provided).
   */
  readonly topicName?: string;

  /**
   * Maximum size of the topic in megabytes.
   *
   * @remarks
   * Defaults to namespace tier limits.
   */
  readonly maxSizeInMegabytes?: number;

  /**
   * Default message time to live in ISO 8601 duration format.
   *
   * @remarks
   * Defaults to P14D (14 days).
   */
  readonly defaultMessageTimeToLive?: string;

  /**
   * Duplicate detection history window in ISO 8601 duration format.
   *
   * @remarks
   * Only used if requiresDuplicateDetection is true.
   * Defaults to PT10M (10 minutes).
   */
  readonly duplicateDetectionHistoryTimeWindow?: string;

  /**
   * Enable batched operations.
   *
   * @remarks
   * Defaults to true.
   */
  readonly enableBatchedOperations?: boolean;

  /**
   * Enable duplicate detection.
   *
   * @remarks
   * Defaults to false.
   */
  readonly requiresDuplicateDetection?: boolean;

  /**
   * Enable partitioning for high throughput.
   *
   * @remarks
   * Defaults to false. Cannot be changed after creation.
   */
  readonly enablePartitioning?: boolean;

  /**
   * Enable ordering guarantee.
   *
   * @remarks
   * Defaults to false.
   */
  readonly supportOrdering?: boolean;

  /**
   * Auto-delete on idle duration in ISO 8601 format.
   *
   * @remarks
   * Topic will be deleted if idle for this duration.
   */
  readonly autoDeleteOnIdle?: string;

  /**
   * Status of the topic.
   *
   * @remarks
   * Defaults to Active.
   */
  readonly status?: EntityStatus;
}

/**
 * Interface for Service Bus Topic reference.
 */
export interface IServiceBusTopic {
  /**
   * Name of the Service Bus topic.
   */
  readonly topicName: string;

  /**
   * Resource ID of the Service Bus topic.
   */
  readonly topicId: string;

  /**
   * Parent namespace.
   */
  readonly namespace: IServiceBusNamespace;
}

/**
 * Filter type for Service Bus Subscription rules.
 */
export const FilterType = schema.servicebus.FilterType;
export type FilterType = typeof FilterType[keyof typeof FilterType];

/**
 * SQL filter expression for subscription rules.
 */
export interface SqlFilter {
  /**
   * SQL filter expression.
   *
   * @remarks
   * Uses SQL-92 syntax.
   * Example: "Color = 'Red' AND Quantity > 100"
   */
  readonly sqlExpression: string;

  /**
   * Compatibility level.
   */
  readonly compatibilityLevel?: number;

  /**
   * Requires preprocessing.
   */
  readonly requiresPreprocessing?: boolean;
}

/**
 * Correlation filter for subscription rules.
 */
export interface CorrelationFilter {
  /**
   * Correlation ID.
   */
  readonly correlationId?: string;

  /**
   * Message ID.
   */
  readonly messageId?: string;

  /**
   * To address.
   */
  readonly to?: string;

  /**
   * Reply to address.
   */
  readonly replyTo?: string;

  /**
   * Label/Subject.
   */
  readonly label?: string;

  /**
   * Session ID.
   */
  readonly sessionId?: string;

  /**
   * Reply to session ID.
   */
  readonly replyToSessionId?: string;

  /**
   * Content type.
   */
  readonly contentType?: string;

  /**
   * Custom properties to match.
   */
  readonly properties?: Record<string, string>;

  /**
   * Requires preprocessing.
   */
  readonly requiresPreprocessing?: boolean;
}

/**
 * Rule action for subscription rules.
 */
export interface SqlRuleAction {
  /**
   * SQL expression for the rule action.
   *
   * @remarks
   * Can modify message properties.
   * Example: "SET Priority = 'High'"
   */
  readonly sqlExpression: string;

  /**
   * Compatibility level.
   */
  readonly compatibilityLevel?: number;

  /**
   * Requires preprocessing.
   */
  readonly requiresPreprocessing?: boolean;
}

/**
 * Properties for ArmServiceBusSubscription (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces/topics/subscriptions ARM resource.
 *
 * ARM API Version: 2021-11-01
 */
export interface ArmServiceBusSubscriptionProps {
  /**
   * Parent Service Bus topic.
   */
  readonly topic: IServiceBusTopic;

  /**
   * Subscription name.
   *
   * @remarks
   * Must be 1-50 characters, alphanumeric and hyphens.
   */
  readonly subscriptionName: string;

  /**
   * ISO 8601 lock duration for peek-lock receive mode.
   *
   * @remarks
   * Maximum duration a message is locked for other receivers.
   * Default: PT1M (1 minute)
   * Maximum: PT5M (5 minutes)
   */
  readonly lockDuration?: string;

  /**
   * Enable batched operations.
   */
  readonly enableBatchedOperations?: boolean;

  /**
   * ISO 8601 default message time to live.
   *
   * @remarks
   * Default: P14D (14 days)
   */
  readonly defaultMessageTimeToLive?: string;

  /**
   * ISO 8601 timespan idle interval after which the subscription is automatically deleted.
   *
   * @remarks
   * Minimum: PT5M (5 minutes)
   */
  readonly autoDeleteOnIdle?: string;

  /**
   * Enable dead lettering on message expiration.
   */
  readonly deadLetteringOnMessageExpiration?: boolean;

  /**
   * Enable dead lettering on filter evaluation exceptions.
   */
  readonly deadLetteringOnFilterEvaluationExceptions?: boolean;

  /**
   * Maximum delivery count before message is dead-lettered.
   *
   * @remarks
   * Default: 10
   */
  readonly maxDeliveryCount?: number;

  /**
   * Enable session support.
   */
  readonly requiresSession?: boolean;

  /**
   * Forward messages to another entity.
   *
   * @remarks
   * Can be queue or topic name.
   */
  readonly forwardTo?: string;

  /**
   * Forward dead-lettered messages to another entity.
   */
  readonly forwardDeadLetteredMessagesTo?: string;

  /**
   * Status of the subscription.
   */
  readonly status?: EntityStatus;
}

/**
 * Properties for ServiceBusSubscription (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults.
 */
export interface ServiceBusSubscriptionProps {
  /**
   * Parent Service Bus topic.
   */
  readonly topic: IServiceBusTopic;

  /**
   * Subscription name (optional - auto-generated if not provided).
   */
  readonly subscriptionName?: string;

  /**
   * Lock duration in ISO 8601 format.
   *
   * @remarks
   * Defaults to PT1M (1 minute).
   */
  readonly lockDuration?: string;

  /**
   * Enable batched operations.
   *
   * @remarks
   * Defaults to true.
   */
  readonly enableBatchedOperations?: boolean;

  /**
   * Default message time to live in ISO 8601 format.
   *
   * @remarks
   * Defaults to P14D (14 days).
   */
  readonly defaultMessageTimeToLive?: string;

  /**
   * Auto-delete on idle duration in ISO 8601 format.
   */
  readonly autoDeleteOnIdle?: string;

  /**
   * Enable dead lettering on message expiration.
   *
   * @remarks
   * Defaults to false.
   */
  readonly deadLetteringOnMessageExpiration?: boolean;

  /**
   * Enable dead lettering on filter evaluation exceptions.
   *
   * @remarks
   * Defaults to true.
   */
  readonly deadLetteringOnFilterEvaluationExceptions?: boolean;

  /**
   * Maximum delivery count.
   *
   * @remarks
   * Defaults to 10.
   */
  readonly maxDeliveryCount?: number;

  /**
   * Enable session support.
   *
   * @remarks
   * Defaults to false.
   */
  readonly requiresSession?: boolean;

  /**
   * Forward messages to another entity.
   */
  readonly forwardTo?: string;

  /**
   * Forward dead-lettered messages to another entity.
   */
  readonly forwardDeadLetteredMessagesTo?: string;

  /**
   * Status of the subscription.
   *
   * @remarks
   * Defaults to Active.
   */
  readonly status?: EntityStatus;

  /**
   * Default subscription rule filter.
   *
   * @remarks
   * SQL filter or correlation filter to apply to all messages.
   * If not specified, all messages are accepted (TrueFilter).
   */
  readonly filter?: SqlFilter | CorrelationFilter;

  /**
   * Rule action to apply when filter matches.
   */
  readonly ruleAction?: SqlRuleAction;
}

/**
 * Interface for Service Bus Subscription reference.
 */
export interface IServiceBusSubscription {
  /**
   * Name of the Service Bus subscription.
   */
  readonly subscriptionName: string;

  /**
   * Resource ID of the Service Bus subscription.
   */
  readonly subscriptionId: string;

  /**
   * Parent topic.
   */
  readonly topic: IServiceBusTopic;
}

/**
 * Properties for Subscription Rule (L1 construct).
 *
 * @remarks
 * Rules define filters and actions for subscriptions.
 *
 * ARM API Version: 2021-11-01
 */
export interface ArmServiceBusRuleProps {
  /**
   * Parent subscription.
   */
  readonly subscription: IServiceBusSubscription;

  /**
   * Rule name.
   */
  readonly ruleName: string;

  /**
   * Filter type.
   */
  readonly filterType: FilterType;

  /**
   * SQL filter (if filterType is SqlFilter).
   */
  readonly sqlFilter?: SqlFilter;

  /**
   * Correlation filter (if filterType is CorrelationFilter).
   */
  readonly correlationFilter?: CorrelationFilter;

  /**
   * Rule action (optional).
   */
  readonly action?: SqlRuleAction;
}

/**
 * Properties for Subscription Rule (L2 construct).
 */
export interface ServiceBusRuleProps {
  /**
   * Parent subscription.
   */
  readonly subscription: IServiceBusSubscription;

  /**
   * Rule name (optional - auto-generated if not provided).
   */
  readonly ruleName?: string;

  /**
   * SQL filter or correlation filter.
   */
  readonly filter: SqlFilter | CorrelationFilter;

  /**
   * Rule action (optional).
   */
  readonly action?: SqlRuleAction;
}

/**
 * Interface for Service Bus Rule reference.
 */
export interface IServiceBusRule {
  /**
   * Name of the rule.
   */
  readonly ruleName: string;

  /**
   * Resource ID of the rule.
   */
  readonly ruleId: string;

  /**
   * Parent subscription.
   */
  readonly subscription: IServiceBusSubscription;
}
