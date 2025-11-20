/**
 * Event Grid Topic Builder - Fluent API for Azure Event Grid Topics
 *
 * Provides pub/sub patterns for event-driven architecture with
 * webhooks, event filtering, and real-time notifications.
 *
 * NOTE: This is a simplified implementation until Event Grid CDK module is available.
 * Currently creates topics using ARM templates directly.
 */

import { Construct, Resource } from '@atakora/lib';
import { IFunctionApp, EventGridTrigger } from '@atakora/cdk/web';
import { Duration, days } from '../common';
import type { EventsNamespace } from './types';

/**
 * Subscription configuration builder for Event Grid
 */
export class EventGridSubscriptionBuilder {
  name: string;
  endpointValue?: IFunctionApp | string;
  eventTypes: string[] = [];
  subjectBeginsWith?: string;
  subjectEndsWith?: string;
  advancedFilters: any[] = [];
  maxEventsPerBatch = 1;
  preferredBatchSizeInKilobytes = 64;
  maxDeliveryAttempts = 30;
  eventTimeToLiveInMinutes = 1440; // 24 hours

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Set the endpoint for this subscription
   */
  endpoint(endpoint: IFunctionApp | string): this {
    this.endpointValue = endpoint;
    return this;
  }

  /**
   * Filter by event types
   */
  eventTypesFilter(...types: string[]): this {
    this.eventTypes = types;
    return this;
  }

  /**
   * Filter by subject prefix
   */
  subjectBegins(prefix: string): this {
    this.subjectBeginsWith = prefix;
    return this;
  }

  /**
   * Filter by subject suffix
   */
  subjectEnds(suffix: string): this {
    this.subjectEndsWith = suffix;
    return this;
  }

  /**
   * Add advanced filter
   */
  advancedFilter(filter: any): this {
    this.advancedFilters.push(filter);
    return this;
  }

  /**
   * Configure batching
   */
  batching(maxEvents: number, preferredSizeKB: number): this {
    this.maxEventsPerBatch = maxEvents;
    this.preferredBatchSizeInKilobytes = preferredSizeKB;
    return this;
  }

  /**
   * Set delivery retry policy
   */
  retryPolicy(maxAttempts: number, ttlMinutes: number): this {
    this.maxDeliveryAttempts = maxAttempts;
    this.eventTimeToLiveInMinutes = ttlMinutes;
    return this;
  }
}

/**
 * Builder for Azure Event Grid Topics with fluent configuration API
 */
export class TopicBuilder {
  private name: string;
  private processorFn?: IFunctionApp;
  private eventTypes: string[] = [];
  private schemaType: 'EventGridSchema' | 'CloudEventSchemaV1_0' | 'CustomEventSchema' = 'EventGridSchema';
  private retentionDays = 1;
  private subscriptions: EventGridSubscriptionBuilder[] = [];
  private inputSchema?: any;
  private publicNetworkAccessValue = true;
  private tags: Record<string, string> = {};

  constructor(name: string, processor?: IFunctionApp) {
    this.name = name;
    this.processorFn = processor;
  }

  /**
   * Attach a processor function to handle events
   */
  processor(fn: IFunctionApp): this {
    this.processorFn = fn;
    return this;
  }

  /**
   * Define event types this topic will handle
   */
  events(types: string[]): this {
    this.eventTypes = types;
    return this;
  }

  /**
   * Set the event schema type
   */
  schema(type: 'EventGridSchema' | 'CloudEventSchemaV1_0' | 'CustomEventSchema'): this {
    this.schemaType = type;
    return this;
  }

  /**
   * Set custom input schema (for CustomEventSchema type)
   */
  customSchema(schema: any): this {
    this.schemaType = 'CustomEventSchema';
    this.inputSchema = schema;
    return this;
  }

  /**
   * Set event retention period
   */
  retention(days: number | Duration): this {
    this.retentionDays = typeof days === 'number' ? days : Math.ceil(days.hours / 24);
    return this;
  }

  /**
   * Add a subscription to this topic
   */
  subscription(name: string, configure?: (sub: EventGridSubscriptionBuilder) => void): this {
    const sub = new EventGridSubscriptionBuilder(name);
    if (configure) {
      configure(sub);
    }
    this.subscriptions.push(sub);
    return this;
  }

  /**
   * Enable/disable public network access
   */
  publicNetworkAccess(enabled: boolean): this {
    this.publicNetworkAccessValue = enabled;
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
   * Preset configuration for audit logging
   */
  auditLog(): this {
    return this
      .events(['Authentication.*', 'Authorization.*', 'DataAccess.*', 'Security.*'])
      .retention(days(90))
      .schema('CloudEventSchemaV1_0');
  }

  /**
   * Preset configuration for webhook scenarios
   */
  webhook(): this {
    return this
      .schema('CloudEventSchemaV1_0')
      .retention(days(1))
      .publicNetworkAccess(true);
  }

  /**
   * Preset configuration for system events
   */
  systemEvents(): this {
    return this
      .schema('EventGridSchema')
      .retention(days(7))
      .events(['Microsoft.Resources.*', 'Microsoft.Storage.*', 'Microsoft.Web.*']);
  }

  /**
   * Build the Event Grid topic within the parent construct
   *
   * NOTE: This is a simplified implementation. When Event Grid CDK module
   * is available, this will be updated to use proper L2 constructs.
   */
  build(parent: Construct, namespace: EventsNamespace): void {
    // For now, create a simple ARM resource
    // This will be replaced with proper Event Grid constructs when available

    const topicResource = new Resource(parent, `EventGridTopic-${this.name}`, {
      type: 'Microsoft.EventGrid/topics',
      apiVersion: '2022-06-15',
      name: this.name,
      location: parent.resourceGroup?.location || 'eastus',
      properties: {
        inputSchema: this.schemaType,
        inputSchemaMapping: this.inputSchema,
        publicNetworkAccess: this.publicNetworkAccessValue ? 'Enabled' : 'Disabled',
        dataResidencyBoundary: 'WithinRegion',
      },
      tags: this.tags,
    });

    // Create subscriptions
    for (const sub of this.subscriptions) {
      // Create subscription resource
      const subscriptionResource = new Resource(topicResource, `Subscription-${sub.name}`, {
        type: 'Microsoft.EventGrid/topics/eventSubscriptions',
        apiVersion: '2022-06-15',
        name: `${this.name}/${sub.name}`,
        properties: {
          destination: this.getDestination(sub),
          filter: {
            includedEventTypes: sub.eventTypes.length > 0 ? sub.eventTypes : undefined,
            subjectBeginsWith: sub.subjectBeginsWith,
            subjectEndsWith: sub.subjectEndsWith,
            advancedFilters: sub.advancedFilters.length > 0 ? sub.advancedFilters : undefined,
          },
          eventDeliverySchema: this.schemaType,
          retryPolicy: {
            maxDeliveryAttempts: sub.maxDeliveryAttempts,
            eventTimeToLiveInMinutes: sub.eventTimeToLiveInMinutes,
          },
          deadLetterDestination: undefined, // Can be configured later
        },
      });

      // If endpoint is a function, set up trigger
      if (sub.endpointValue && typeof sub.endpointValue === 'object' && 'resourceId' in sub.endpointValue) {
        const trigger = new EventGridTrigger(sub.endpointValue, `EventGrid-${sub.name}`, {});
        namespace.registerTopicProcessor(`${this.name}/${sub.name}`, sub.endpointValue);
      }
    }

    // Attach default processor if provided and no subscriptions defined
    if (this.processorFn && this.subscriptions.length === 0) {
      // Create a default subscription for the processor
      const trigger = new EventGridTrigger(this.processorFn, 'EventGridTrigger', {});
      namespace.registerTopicProcessor(this.name, this.processorFn);
    }
  }

  /**
   * Get destination configuration for a subscription
   */
  private getDestination(sub: EventGridSubscriptionBuilder): any {
    if (sub.endpointValue && typeof sub.endpointValue === 'object' && 'resourceId' in sub.endpointValue) {
      // Azure Function endpoint
      return {
        endpointType: 'AzureFunction',
        properties: {
          resourceId: sub.endpointValue.resourceId,
          maxEventsPerBatch: sub.maxEventsPerBatch,
          preferredBatchSizeInKilobytes: sub.preferredBatchSizeInKilobytes,
        },
      };
    } else if (typeof sub.endpointValue === 'string') {
      // Webhook endpoint
      return {
        endpointType: 'WebHook',
        properties: {
          endpointUrl: sub.endpointValue,
          maxEventsPerBatch: sub.maxEventsPerBatch,
          preferredBatchSizeInKilobytes: sub.preferredBatchSizeInKilobytes,
        },
      };
    }
    // Default to webhook
    return {
      endpointType: 'WebHook',
      properties: {},
    };
  }
}

/**
 * Factory function for creating an Event Grid topic builder
 */
export function topic(name: string, processor?: IFunctionApp): TopicBuilder {
  return new TopicBuilder(name, processor);
}