/**
 * Service Bus Queue Builder - Fluent API for Azure Service Bus Queues
 *
 * Provides enterprise messaging capabilities with features like sessions,
 * duplicate detection, and guaranteed delivery.
 */

import { Construct } from '@atakora/lib';
import { ServiceBusNamespace, ServiceBusQueue as SBQueue, ServiceBusSku } from '@atakora/cdk/servicebus';
import { IFunctionApp, ServiceBusQueueTrigger } from '@atakora/cdk/web';
import { Duration, seconds, minutes, hours, days } from '../common';
import type { EventsNamespace } from './types';

/**
 * Builder for Azure Service Bus Queues with fluent configuration API
 */
export class ServiceBusQueueBuilder {
  private name: string;
  private processorFn?: IFunctionApp;
  private ttlValue: Duration = days(14);
  private lockDurationValue: Duration = seconds(60);
  private maxDeliveryCountValue = 10;
  private sessionsEnabled = false;
  private partitioningEnabled = false;
  private duplicateDetectionWindow?: Duration;
  private forwardToQueue?: string;
  private forwardDeadLetteredMessagesTo?: string;
  private requiresDuplicateDetection = false;
  private requiresSession = false;
  private maxSizeInMB = 1024; // 1GB default
  private tags: Record<string, string> = {};

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
   * Set lock duration for message processing
   */
  lockDuration(duration: Duration): this {
    this.lockDurationValue = duration;
    return this;
  }

  /**
   * Enable message sessions for FIFO processing
   */
  sessions(enabled = true): this {
    this.sessionsEnabled = enabled;
    this.requiresSession = enabled;
    return this;
  }

  /**
   * Enable duplicate detection with specified window
   */
  duplicateDetection(window: Duration): this {
    this.duplicateDetectionWindow = window;
    this.requiresDuplicateDetection = true;
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
   * Enable partitioning for higher throughput
   */
  partitioning(enabled = true): this {
    this.partitioningEnabled = enabled;
    return this;
  }

  /**
   * Forward messages to another queue
   */
  forwardTo(queueName: string): this {
    this.forwardToQueue = queueName;
    return this;
  }

  /**
   * Forward dead lettered messages to another queue
   */
  forwardDeadLetteredTo(queueName: string): this {
    this.forwardDeadLetteredMessagesTo = queueName;
    return this;
  }

  /**
   * Set maximum queue size in MB
   */
  maxSize(sizeInMB: number): this {
    this.maxSizeInMB = sizeInMB;
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
   * Preset configuration for FIFO (First In, First Out) processing
   */
  fifo(): this {
    return this
      .sessions()
      .maxDeliveryCount(1)
      .lockDuration(minutes(5));
  }

  /**
   * Preset configuration for reliable message processing
   */
  reliable(): this {
    return this
      .maxDeliveryCount(5)
      .duplicateDetection(minutes(10))
      .lockDuration(minutes(2));
  }

  /**
   * Preset configuration for high-throughput scenarios
   */
  highThroughput(): this {
    return this
      .partitioning()
      .maxSize(5120) // 5GB
      .lockDuration(seconds(30));
  }

  /**
   * Preset configuration for transactional processing
   */
  transactional(): this {
    return this
      .sessions()
      .duplicateDetection(hours(1))
      .maxDeliveryCount(3)
      .lockDuration(minutes(5));
  }

  /**
   * Build the Service Bus queue within the parent construct
   */
  build(parent: Construct, namespace: EventsNamespace): void {
    // Get or create Service Bus namespace
    const serviceBusNamespace = namespace.getOrCreateServiceBusNamespace(parent);

    // Create the queue with configuration
    const queue = new SBQueue(serviceBusNamespace, this.name, {
      queueName: this.name,
      defaultMessageTimeToLive: this.ttlValue.toISO8601(),
      lockDuration: this.lockDurationValue.toISO8601(),
      maxDeliveryCount: this.maxDeliveryCountValue,
      requiresSession: this.requiresSession,
      requiresDuplicateDetection: this.requiresDuplicateDetection,
      duplicateDetectionHistoryTimeWindow: this.duplicateDetectionWindow?.toISO8601(),
      enablePartitioning: this.partitioningEnabled,
      maxSizeInMegabytes: this.maxSizeInMB,
      forwardTo: this.forwardToQueue,
      forwardDeadLetteredMessagesTo: this.forwardDeadLetteredMessagesTo,
      // Note: dead lettering is always enabled in Service Bus with maxDeliveryCount
    });

    // Apply tags
    if (Object.keys(this.tags).length > 0) {
      queue.addTags(this.tags);
    }

    // Attach processor if provided
    if (this.processorFn) {
      // Add Service Bus queue trigger to the function
      const trigger = new ServiceBusQueueTrigger(this.processorFn, 'ServiceBusQueueTrigger', {
        queueName: this.name,
        connection: serviceBusNamespace.connectionStringName,
        isSessionsEnabled: this.sessionsEnabled,
      });

      // Store the association for reference
      namespace.registerServiceBusQueueProcessor(this.name, this.processorFn);

      // Grant the function app permission to receive messages
      serviceBusNamespace.grantDataReceiver(this.processorFn);
    }
  }
}

/**
 * Factory function for creating a Service Bus queue builder
 */
export function serviceBusQueue(name: string, processor?: IFunctionApp): ServiceBusQueueBuilder {
  return new ServiceBusQueueBuilder(name, processor);
}