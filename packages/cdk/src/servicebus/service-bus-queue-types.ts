/**
 * Type definitions for Service Bus Queue constructs.
 *
 * @remarks
 * Service Bus Queues provide point-to-point messaging with:
 * - FIFO ordering with sessions
 * - Dead-letter queues
 * - Message deduplication
 * - Scheduled delivery
 * - Transactions
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';
import type { IServiceBusNamespace } from './service-bus-namespace-types';

// Re-export IServiceBusNamespace for convenience
export type { IServiceBusNamespace } from './service-bus-namespace-types';

// Re-export EntityStatus enum from schema
export const EntityStatus = schema.servicebus.EntityStatus;
export type EntityStatus = typeof EntityStatus[keyof typeof EntityStatus];

/**
 * Properties for ArmServiceBusQueue (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces/queues ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2021-11-01
 *
 * @example
 * ```typescript
 * const props: ArmServiceBusQueueProps = {
 *   namespace: serviceBusNamespace,
 *   queueName: 'orders',
 *   maxDeliveryCount: 10,
 *   lockDuration: 'PT5M', // 5 minutes
 *   defaultMessageTimeToLive: 'P14D' // 14 days
 * };
 * ```
 */
export interface ArmServiceBusQueueProps {
  /**
   * Parent Service Bus namespace.
   */
  readonly namespace: IServiceBusNamespace;

  /**
   * Queue name.
   *
   * @remarks
   * Must be 1-260 characters, alphanumeric, periods, hyphens, underscores.
   */
  readonly queueName: string;

  /**
   * Lock duration in ISO 8601 duration format.
   *
   * @remarks
   * Time a message is locked for other receivers.
   * Format: PT<minutes>M (e.g., PT5M for 5 minutes)
   * Range: PT5S to PT5M
   * Default: PT1M (1 minute)
   */
  readonly lockDuration?: string;

  /**
   * Maximum delivery count before message goes to dead-letter queue.
   *
   * @remarks
   * Range: 1-2000
   * Default: 10
   */
  readonly maxDeliveryCount?: number;

  /**
   * Maximum size of queue in megabytes.
   *
   * @remarks
   * Values: 1024, 2048, 3072, 4096, 5120
   * Default: 1024
   */
  readonly maxSizeInMegabytes?: number;

  /**
   * Enable duplicate detection.
   *
   * @remarks
   * Cannot be changed after queue creation.
   * Default: false
   */
  readonly requiresDuplicateDetection?: boolean;

  /**
   * Duplicate detection history time window in ISO 8601 format.
   *
   * @remarks
   * Format: PT<minutes>M (e.g., PT10M for 10 minutes)
   * Range: PT20S to P7D
   * Default: PT10M
   * Only applicable if requiresDuplicateDetection is true.
   */
  readonly duplicateDetectionHistoryTimeWindow?: string;

  /**
   * Default message time to live in ISO 8601 format.
   *
   * @remarks
   * Format: P<days>D (e.g., P14D for 14 days)
   * Default: P14D (14 days)
   */
  readonly defaultMessageTimeToLive?: string;

  /**
   * Enable dead lettering on message expiration.
   *
   * @remarks
   * If true, expired messages go to dead-letter queue.
   * Default: false
   */
  readonly deadLetteringOnMessageExpiration?: boolean;

  /**
   * Enable partitioning for high throughput.
   *
   * @remarks
   * Cannot be changed after queue creation.
   * Not available on Premium SKU.
   * Default: false
   */
  readonly enablePartitioning?: boolean;

  /**
   * Require sessions for FIFO ordering.
   *
   * @remarks
   * Cannot be changed after queue creation.
   * Default: false
   */
  readonly requiresSession?: boolean;

  /**
   * Auto-delete queue after idle period in ISO 8601 format.
   *
   * @remarks
   * Format: P<days>D or PT<hours>H
   * Minimum: PT5M (5 minutes)
   * Default: P10675199DT2H48M5.4775807S (never)
   */
  readonly autoDeleteOnIdle?: string;

  /**
   * Enable batched operations.
   *
   * @remarks
   * Default: true
   */
  readonly enableBatchedOperations?: boolean;

  /**
   * Queue status.
   *
   * @remarks
   * Default: Active
   */
  readonly status?: EntityStatus;

  /**
   * Forward messages to another queue or topic.
   *
   * @remarks
   * Must be in same namespace.
   */
  readonly forwardTo?: string;

  /**
   * Forward dead-lettered messages to another queue or topic.
   *
   * @remarks
   * Must be in same namespace.
   */
  readonly forwardDeadLetteredMessagesTo?: string;

  /**
   * Tags to apply to the queue.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for ServiceBusQueue (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage
 * const queue = new ServiceBusQueue(namespace, 'Orders', {});
 *
 * // With custom properties
 * const queue = new ServiceBusQueue(namespace, 'Orders', {
 *   queueName: 'order-processing',
 *   maxDeliveryCount: 5,
 *   requiresDuplicateDetection: true,
 *   requiresSession: true
 * });
 * ```
 */
export interface ServiceBusQueueProps {
  /**
   * Queue name.
   *
   * @remarks
   * If not provided, will be auto-generated using the construct ID.
   */
  readonly queueName?: string;

  /**
   * Lock duration in seconds.
   *
   * @remarks
   * Range: 5-300 seconds
   * Default: 60 (1 minute)
   */
  readonly lockDuration?: number;

  /**
   * Maximum delivery count before dead-letter.
   *
   * @remarks
   * Range: 1-2000
   * Default: 10
   */
  readonly maxDeliveryCount?: number;

  /**
   * Maximum size of queue in megabytes.
   *
   * @remarks
   * Values: 1024, 2048, 3072, 4096, 5120
   * Default: 1024
   */
  readonly maxSizeInMegabytes?: number;

  /**
   * Enable duplicate detection.
   *
   * @remarks
   * Cannot be changed after queue creation.
   * Default: false
   */
  readonly requiresDuplicateDetection?: boolean;

  /**
   * Duplicate detection window in seconds.
   *
   * @remarks
   * Range: 20 seconds to 7 days
   * Default: 600 (10 minutes)
   */
  readonly duplicateDetectionWindow?: number;

  /**
   * Default message TTL in seconds.
   *
   * @remarks
   * Default: 1209600 (14 days)
   */
  readonly defaultMessageTimeToLive?: number;

  /**
   * Enable dead lettering on expiration.
   *
   * @remarks
   * Default: true
   */
  readonly deadLetteringOnMessageExpiration?: boolean;

  /**
   * Enable partitioning for high throughput.
   *
   * @remarks
   * Cannot be changed after queue creation.
   * Default: false
   */
  readonly enablePartitioning?: boolean;

  /**
   * Require sessions for FIFO ordering.
   *
   * @remarks
   * Cannot be changed after queue creation.
   * Default: false
   */
  readonly requiresSession?: boolean;

  /**
   * Enable batched operations.
   *
   * @remarks
   * Default: true
   */
  readonly enableBatchedOperations?: boolean;

  /**
   * Tags to apply to the queue.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Service Bus Queue reference.
 *
 * @remarks
 * Allows resources to reference a Service Bus Queue without depending on the construct class.
 */
export interface IServiceBusQueue {
  /**
   * Name of the queue.
   */
  readonly queueName: string;

  /**
   * Parent namespace name.
   */
  readonly namespaceName: string;

  /**
   * Resource ID of the queue.
   */
  readonly queueId: string;

  /**
   * Connection string for the queue (send/listen).
   */
  readonly connectionString: string;
}
