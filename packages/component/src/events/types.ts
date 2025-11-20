/**
 * Types for the unified events namespace
 */

import { Construct } from '@atakora/lib';
import { StorageAccounts } from '@atakora/cdk/storage';
import { ServiceBusNamespace } from '@atakora/cdk/servicebus';
import { IFunctionApp } from '@atakora/cdk/web';
import type { QueueBuilder } from './queue-builder';
import type { TopicBuilder } from './topic-builder';
import type { ServiceBusQueueBuilder } from './service-bus-queue-builder';
import type { ServiceBusTopicBuilder } from './service-bus-topic-builder';

/**
 * Event builder type union
 */
export type EventBuilder =
  | QueueBuilder
  | TopicBuilder
  | ServiceBusQueueBuilder
  | ServiceBusTopicBuilder;

/**
 * Configuration for events namespace
 */
export interface EventsConfig {
  [key: string]: EventBuilder;
}

/**
 * Events namespace with deployment capability
 */
export interface EventsNamespace {
  /**
   * Deploy all configured events to the parent construct
   */
  deploy(parent: Construct): void;

  /**
   * Get or create the default storage account for queues
   */
  getOrCreateDefaultStorage(parent: Construct): StorageAccounts;

  /**
   * Get a specific storage account by name
   */
  getStorageAccount(name: string): StorageAccounts;

  /**
   * Get or create the Service Bus namespace
   */
  getOrCreateServiceBusNamespace(parent: Construct): ServiceBusNamespace;

  /**
   * Register a queue processor association
   */
  registerQueueProcessor(queueName: string, processor: IFunctionApp): void;

  /**
   * Register a Service Bus queue processor association
   */
  registerServiceBusQueueProcessor(queueName: string, processor: IFunctionApp): void;

  /**
   * Register a Service Bus topic processor association
   */
  registerServiceBusTopicProcessor(topicName: string, subscriptionName: string, processor: IFunctionApp): void;

  /**
   * Register an Event Grid topic processor association
   */
  registerTopicProcessor(topicName: string, processor: IFunctionApp): void;
}

/**
 * Options for defineEvents function
 */
export interface DefineEventsOptions {
  /**
   * Name for the default storage account (for queues)
   */
  storageAccountName?: string;

  /**
   * Name for the Service Bus namespace
   */
  serviceBusNamespaceName?: string;

  /**
   * SKU for the Service Bus namespace
   */
  serviceBusSku?: 'Basic' | 'Standard' | 'Premium';

  /**
   * Default tags to apply to all resources
   */
  tags?: Record<string, string>;
}