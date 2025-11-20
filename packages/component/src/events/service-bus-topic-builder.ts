/**
 * Service Bus Topic Builder - Fluent API for Azure Service Bus Topics
 *
 * Provides enterprise pub/sub messaging with multiple subscriptions,
 * filters, and advanced routing capabilities.
 */

import { Construct } from '@atakora/lib';
import {
  ServiceBusNamespace,
  ServiceBusTopic as SBTopic,
  ServiceBusSubscription,
  ServiceBusRule
} from '@atakora/cdk/servicebus';
import { IFunctionApp, ServiceBusTopicTrigger } from '@atakora/cdk/web';
import { Duration, seconds, minutes, hours, days } from '../common';
import type { EventsNamespace } from './types';

/**
 * Subscription configuration builder
 */
export class ServiceBusSubscriptionBuilder {
  name: string;
  processorFn?: IFunctionApp;
  filterExpression?: string;
  filterAction?: string;
  maxDeliveryCountValue = 10;
  lockDurationValue: Duration = seconds(60);
  autoDeleteOnIdleValue?: Duration;
  deadLetteringOnMessageExpirationValue = false;
  forwardToValue?: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Attach a processor function to this subscription
   */
  processor(fn: IFunctionApp): this {
    this.processorFn = fn;
    return this;
  }

  /**
   * Set SQL filter expression
   */
  filter(expression: string): this {
    this.filterExpression = expression;
    return this;
  }

  /**
   * Filter by property value
   */
  byProperty(property: string, value: any): this {
    return this.filter(`${property} = '${value}'`);
  }

  /**
   * Filter by multiple properties
   */
  byProperties(filters: Record<string, any>): this {
    const expressions = Object.entries(filters)
      .map(([key, value]) => `${key} = '${value}'`)
      .join(' AND ');
    return this.filter(expressions);
  }

  /**
   * Set SQL action for message transformation
   */
  action(sqlAction: string): this {
    this.filterAction = sqlAction;
    return this;
  }

  /**
   * Set maximum delivery attempts
   */
  maxDeliveryCount(count: number): this {
    this.maxDeliveryCountValue = count;
    return this;
  }

  /**
   * Set lock duration
   */
  lockDuration(duration: Duration): this {
    this.lockDurationValue = duration;
    return this;
  }

  /**
   * Auto-delete subscription after idle period
   */
  autoDeleteOnIdle(duration: Duration): this {
    this.autoDeleteOnIdleValue = duration;
    return this;
  }

  /**
   * Enable dead lettering on message expiration
   */
  deadLetterOnExpiration(enabled = true): this {
    this.deadLetteringOnMessageExpirationValue = enabled;
    return this;
  }

  /**
   * Forward messages to another topic or queue
   */
  forwardTo(destination: string): this {
    this.forwardToValue = destination;
    return this;
  }
}

/**
 * Builder for Azure Service Bus Topics with fluent configuration API
 */
export class ServiceBusTopicBuilder {
  private name: string;
  private subscriptions: Map<string, ServiceBusSubscriptionBuilder> = new Map();
  private ttlValue: Duration = days(14);
  private maxSizeInMB = 1024; // 1GB default
  private duplicateDetectionWindow?: Duration;
  private partitioningEnabled = false;
  private requiresDuplicateDetection = false;
  private supportOrderingValue = false;
  private autoDeleteOnIdleValue?: Duration;
  private tags: Record<string, string> = {};

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Add a subscription to this topic
   */
  subscription(name: string): this;
  subscription(name: string, processor: IFunctionApp): this;
  subscription(name: string, configure: (sub: ServiceBusSubscriptionBuilder) => void): this;
  subscription(name: string, processorOrConfigure?: IFunctionApp | ((sub: ServiceBusSubscriptionBuilder) => void)): this {
    const sub = new ServiceBusSubscriptionBuilder(name);

    if (processorOrConfigure && typeof processorOrConfigure === 'object' && 'resourceId' in processorOrConfigure) {
      // It's a processor function (has resourceId property)
      sub.processor(processorOrConfigure as IFunctionApp);
    } else if (typeof processorOrConfigure === 'function') {
      // It's a configuration function
      processorOrConfigure(sub);
    }

    this.subscriptions.set(name, sub);
    return this;
  }

  /**
   * Set default message time-to-live
   */
  ttl(duration: Duration): this {
    this.ttlValue = duration;
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
   * Enable partitioning for higher throughput
   */
  partitioning(enabled = true): this {
    this.partitioningEnabled = enabled;
    return this;
  }

  /**
   * Enable message ordering support
   */
  supportOrdering(enabled = true): this {
    this.supportOrderingValue = enabled;
    return this;
  }

  /**
   * Auto-delete topic after idle period
   */
  autoDeleteOnIdle(duration: Duration): this {
    this.autoDeleteOnIdleValue = duration;
    return this;
  }

  /**
   * Set maximum topic size in MB
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
   * Preset configuration for broadcast scenarios
   */
  broadcast(): this {
    return this
      .ttl(hours(1))
      .partitioning()
      .maxSize(5120); // 5GB
  }

  /**
   * Preset configuration for pub/sub patterns
   */
  pubSub(): this {
    return this
      .ttl(days(1))
      .duplicateDetection(minutes(10))
      .supportOrdering();
  }

  /**
   * Preset configuration for event streaming
   */
  eventStream(): this {
    return this
      .partitioning()
      .ttl(days(7))
      .maxSize(10240); // 10GB
  }

  /**
   * Build the Service Bus topic and subscriptions within the parent construct
   */
  build(parent: Construct, namespace: EventsNamespace): void {
    // Get or create Service Bus namespace
    const serviceBusNamespace = namespace.getOrCreateServiceBusNamespace(parent);

    // Create the topic with configuration
    const topic = new SBTopic(serviceBusNamespace, this.name, {
      topicName: this.name,
      defaultMessageTimeToLive: this.ttlValue.toISO8601(),
      maxSizeInMegabytes: this.maxSizeInMB,
      requiresDuplicateDetection: this.requiresDuplicateDetection,
      duplicateDetectionHistoryTimeWindow: this.duplicateDetectionWindow?.toISO8601(),
      enablePartitioning: this.partitioningEnabled,
      supportOrdering: this.supportOrderingValue,
      autoDeleteOnIdle: this.autoDeleteOnIdleValue?.toISO8601(),
    });

    // Apply tags
    if (Object.keys(this.tags).length > 0) {
      topic.addTags(this.tags);
    }

    // Create subscriptions
    for (const [subName, subBuilder] of this.subscriptions) {
      // Create the subscription
      const subscription = new ServiceBusSubscription(topic, subName, {
        subscriptionName: subName,
        maxDeliveryCount: subBuilder.maxDeliveryCountValue,
        lockDuration: subBuilder.lockDurationValue.toISO8601(),
        autoDeleteOnIdle: subBuilder.autoDeleteOnIdleValue?.toISO8601(),
        deadLetteringOnMessageExpiration: subBuilder.deadLetteringOnMessageExpirationValue,
        forwardTo: subBuilder.forwardToValue,
      });

      // Add filter rule if specified
      if (subBuilder.filterExpression) {
        new ServiceBusRule(subscription, 'Filter', {
          ruleName: 'Filter',
          filterType: 'SqlFilter',
          sqlFilter: {
            sqlExpression: subBuilder.filterExpression,
          },
          action: subBuilder.filterAction ? {
            sqlExpression: subBuilder.filterAction,
          } : undefined,
        });
      }

      // Attach processor if provided
      if (subBuilder.processorFn) {
        // Add Service Bus topic trigger to the function
        const trigger = new ServiceBusTopicTrigger(subBuilder.processorFn, `${subName}Trigger`, {
          topicName: this.name,
          subscriptionName: subName,
          connection: serviceBusNamespace.connectionStringName,
        });

        // Store the association for reference
        namespace.registerServiceBusTopicProcessor(this.name, subName, subBuilder.processorFn);

        // Grant the function app permission to receive messages
        serviceBusNamespace.grantDataReceiver(subBuilder.processorFn);
      }
    }
  }
}

/**
 * Factory function for creating a Service Bus topic builder
 */
export function serviceBusTopic(name: string): ServiceBusTopicBuilder {
  return new ServiceBusTopicBuilder(name);
}