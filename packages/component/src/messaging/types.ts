/**
 * Type definitions for messaging components.
 *
 * @packageDocumentation
 */

import type { IServiceBusNamespace, ServiceBusNamespace } from '@atakora/cdk/servicebus';
import type { IGrantable } from '@atakora/lib';

/**
 * Function configuration for queue message processing.
 */
export interface QueueFunctionConfig {
  /**
   * Function app or other grantable identity that will process messages.
   *
   * @remarks
   * This should be a resource with a managed identity (like a Function App,
   * Container App, or any other IGrantable resource).
   */
  readonly functionApp: IGrantable;

  /**
   * Function handler name.
   *
   * @remarks
   * Name of the function that will be triggered by queue messages.
   */
  readonly handlerName: string;

  /**
   * Maximum number of messages to process in a single batch.
   *
   * @default 1
   * @remarks
   * Range: 1-32
   */
  readonly batchSize?: number;

  /**
   * Maximum time to wait for a full batch before processing.
   *
   * @remarks
   * In seconds. Only applicable if batchSize > 1.
   */
  readonly maxBatchWaitTime?: number;
}

/**
 * Properties for MessageQueue component.
 */
export interface MessageQueueProps {
  /**
   * Service Bus namespace (optional - created if not provided).
   *
   * @remarks
   * Pass a ServiceBusNamespace construct instance. If not provided,
   * a new namespace will be created automatically.
   */
  readonly namespace?: ServiceBusNamespace;

  /**
   * Queue name (optional - auto-generated if not provided).
   */
  readonly queueName?: string;

  /**
   * Lock duration in seconds.
   *
   * @remarks
   * Time a message is locked for processing before becoming available again.
   * Range: 5-300 seconds
   * @default 60
   */
  readonly lockDuration?: number;

  /**
   * Maximum delivery count before moving to dead-letter queue.
   *
   * @remarks
   * Range: 1-2000
   * @default 10
   */
  readonly maxDeliveryCount?: number;

  /**
   * Enable duplicate detection.
   *
   * @remarks
   * Cannot be changed after queue creation.
   * @default false
   */
  readonly requiresDuplicateDetection?: boolean;

  /**
   * Duplicate detection window in seconds.
   *
   * @remarks
   * Range: 20 seconds to 7 days
   * @default 600 (10 minutes)
   */
  readonly duplicateDetectionWindow?: number;

  /**
   * Default message TTL in seconds.
   *
   * @remarks
   * @default 1209600 (14 days)
   */
  readonly defaultMessageTimeToLive?: number;

  /**
   * Enable dead lettering on message expiration.
   *
   * @remarks
   * @default true
   */
  readonly deadLetteringOnMessageExpiration?: boolean;

  /**
   * Enable partitioning for high throughput.
   *
   * @remarks
   * Cannot be changed after queue creation.
   * Not available on Premium SKU.
   * @default false
   */
  readonly enablePartitioning?: boolean;

  /**
   * Require sessions for FIFO ordering.
   *
   * @remarks
   * Cannot be changed after queue creation.
   * @default false
   */
  readonly requiresSession?: boolean;

  /**
   * Producer function configuration.
   *
   * @remarks
   * Function that will send messages to the queue.
   * Will be granted send permissions automatically.
   */
  readonly producer?: QueueFunctionConfig;

  /**
   * Consumer function configuration.
   *
   * @remarks
   * Function that will receive and process messages from the queue.
   * Will be granted receive permissions automatically and configured with queue trigger.
   */
  readonly consumer?: QueueFunctionConfig;

  /**
   * Multiple consumers for the same queue.
   *
   * @remarks
   * All consumers will receive messages from the same queue (competing consumers pattern).
   */
  readonly consumers?: QueueFunctionConfig[];

  /**
   * Enable monitoring and diagnostics.
   *
   * @default true
   */
  readonly enableMonitoring?: boolean;

  /**
   * Resource location.
   */
  readonly location?: string;

  /**
   * Resource tags.
   */
  readonly tags?: Record<string, string>;
}
