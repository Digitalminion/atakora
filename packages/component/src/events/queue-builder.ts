/**
 * Storage Queue Builder - Fluent API for Azure Storage Queues
 *
 * Provides a unified interface for creating and configuring Azure Storage Queues
 * with automatic processor attachment, retry policies, and monitoring.
 */

import { Construct } from '@atakora/lib';
import { StorageAccounts, Queues } from '@atakora/cdk/storage';
import { IFunctionApp, QueueTrigger } from '@atakora/cdk/web';
import { Duration, milliseconds, seconds, minutes, hours, days } from '../common';
import type { EventsNamespace } from './types';

/**
 * Builder for Azure Storage Queues with fluent configuration API
 */
export class QueueBuilder {
  private name: string;
  private processorFn?: IFunctionApp;
  private ttlValue: Duration = days(7);
  private visibilityTimeoutValue: Duration = seconds(30);
  private maxDeliveryCountValue = 5;
  private deadLetterEnabled = false;
  private batchSizeValue = 1;
  private maxPollingInterval?: Duration;
  private tags: Record<string, string> = {};
  private storageAccountName?: string;

  constructor(name: string, processor?: IFunctionApp) {
    this.name = name;
    this.processorFn = processor;
  }

  /**
   * Attach a processor function to handle queue messages
   */
  processor(fn: IFunctionApp): this {
    this.processorFn = fn;
    return this;
  }

  /**
   * Set message time-to-live duration
   */
  ttl(duration: Duration): this {
    this.ttlValue = duration;
    return this;
  }

  /**
   * Set visibility timeout for messages being processed
   */
  visibilityTimeout(duration: Duration): this {
    this.visibilityTimeoutValue = duration;
    return this;
  }

  /**
   * Set maximum delivery attempts before dead lettering
   */
  maxDeliveryCount(count: number): this {
    this.maxDeliveryCountValue = count;
    return this;
  }

  /**
   * Alias for maxDeliveryCount
   */
  retries(count: number): this {
    return this.maxDeliveryCount(count);
  }

  /**
   * Enable/disable dead letter queue for failed messages
   */
  deadLetter(enabled = true): this {
    this.deadLetterEnabled = enabled;
    return this;
  }

  /**
   * Set batch size for concurrent message processing
   */
  batchSize(size: number): this {
    this.batchSizeValue = size;
    return this;
  }

  /**
   * Set maximum polling interval for queue
   */
  pollingInterval(duration: Duration): this {
    this.maxPollingInterval = duration;
    return this;
  }

  /**
   * Use a specific storage account (optional)
   */
  storageAccount(name: string): this {
    this.storageAccountName = name;
    return this;
  }

  /**
   * Add a single tag
   */
  tag(key: string, value: string): this {
    this.tags[key] = value;
    return this;
  }

  /**
   * Add multiple tags
   */
  withTags(tags: Record<string, string>): this {
    Object.assign(this.tags, tags);
    return this;
  }

  /**
   * Preset configuration for reliable message processing
   */
  reliable(): this {
    return this
      .retries(5)
      .deadLetter()
      .visibilityTimeout(minutes(5))
      .batchSize(1);
  }

  /**
   * Preset configuration for fire-and-forget scenarios
   */
  fireAndForget(): this {
    return this
      .retries(1)
      .ttl(hours(1))
      .deadLetter(false)
      .visibilityTimeout(seconds(30));
  }

  /**
   * Preset configuration for high-throughput scenarios
   */
  highThroughput(): this {
    return this
      .batchSize(32)
      .visibilityTimeout(minutes(1))
      .pollingInterval(milliseconds(100));
  }

  /**
   * Build the queue and attach processor within the parent construct
   */
  build(parent: Construct, namespace: EventsNamespace): void {
    // Get or create storage account
    let storageAccount: StorageAccounts;
    if (this.storageAccountName) {
      // Use specified storage account - assume it exists
      storageAccount = namespace.getStorageAccount(this.storageAccountName);
    } else {
      // Use default events storage account
      storageAccount = namespace.getOrCreateDefaultStorage(parent);
    }

    // Create the queue service if it doesn't exist
    const queueService = new Queues(storageAccount, 'QueueService', {});

    // Create the queue with configuration
    const queue = queueService.queue(this.name, {
      metadata: {
        ...this.tags,
        maxDeliveryCount: this.maxDeliveryCountValue.toString(),
        visibilityTimeout: this.visibilityTimeoutValue.seconds.toString(),
        messageTimeToLive: this.ttlValue.seconds.toString(),
      }
    });

    // Create dead letter queue if enabled
    if (this.deadLetterEnabled) {
      queueService.queue(`${this.name}-dlq`, {
        metadata: {
          ...this.tags,
          purpose: 'dead-letter',
          sourceQueue: this.name,
        }
      });
    }

    // Attach processor if provided
    if (this.processorFn) {
      // Add queue trigger to the function
      const trigger = new QueueTrigger(this.processorFn, 'QueueTrigger', {
        queueName: this.name,
        connection: storageAccount.connectionStringName,
      });

      // Configure trigger settings
      if (this.batchSizeValue > 1) {
        trigger.setBatchSize(this.batchSizeValue);
      }
      if (this.maxPollingInterval) {
        trigger.setMaxPollingInterval(this.maxPollingInterval.milliseconds);
      }
      if (this.visibilityTimeoutValue) {
        trigger.setVisibilityTimeout(this.visibilityTimeoutValue.seconds);
      }

      // Store the association for reference
      namespace.registerQueueProcessor(this.name, this.processorFn);
    }
  }
}

/**
 * Factory function for creating a queue builder
 */
export function queue(name: string, processor?: IFunctionApp): QueueBuilder {
  return new QueueBuilder(name, processor);
}