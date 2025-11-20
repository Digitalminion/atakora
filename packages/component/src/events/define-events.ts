/**
 * Define Events - Core function for creating unified event namespaces
 *
 * Provides a single entry point for defining all event-driven infrastructure
 * with consistent patterns across Storage Queues, Event Grid, and Service Bus.
 */

import { Construct } from '@atakora/lib';
import { StorageAccounts } from '@atakora/cdk/storage';
import { ServiceBusNamespace, ServiceBusSku } from '@atakora/cdk/servicebus';
import { IFunctionApp } from '@atakora/cdk/web';
import { AzureNaming } from '@atakora/lib/naming';
import type {
  EventsConfig,
  EventsNamespace,
  DefineEventsOptions,
  EventBuilder
} from './types';

/**
 * Implementation of the events namespace
 */
class EventsNamespaceImpl implements EventsNamespace {
  private config: EventsConfig;
  private options: DefineEventsOptions;
  private defaultStorage?: StorageAccounts;
  private storageAccounts: Map<string, StorageAccounts> = new Map();
  private serviceBusNamespace?: ServiceBusNamespace;
  private processorAssociations: Map<string, IFunctionApp> = new Map();

  constructor(config: EventsConfig, options: DefineEventsOptions = {}) {
    this.config = config;
    this.options = options;
  }

  /**
   * Deploy all configured events to the parent construct
   */
  deploy(parent: Construct): void {
    // Build all event infrastructure
    for (const [name, builder] of Object.entries(this.config)) {
      if (builder && typeof builder.build === 'function') {
        builder.build(parent, this);
      }
    }

    // Apply default tags if specified
    if (this.options.tags) {
      this.applyDefaultTags(parent);
    }
  }

  /**
   * Get or create the default storage account for queues
   */
  getOrCreateDefaultStorage(parent: Construct): StorageAccounts {
    if (!this.defaultStorage) {
      const name = this.options.storageAccountName ||
        AzureNaming.storageAccount('events', parent.node.id);

      this.defaultStorage = new StorageAccounts(parent, 'EventsStorage', {
        storageAccountName: name,
        sku: { name: 'Standard_LRS' },
        kind: 'StorageV2',
        minimumTlsVersion: 'TLS1_2',
        allowBlobPublicAccess: false,
        tags: this.options.tags,
      });

      this.storageAccounts.set(name, this.defaultStorage);
    }
    return this.defaultStorage;
  }

  /**
   * Get a specific storage account by name
   */
  getStorageAccount(name: string): StorageAccounts {
    const account = this.storageAccounts.get(name);
    if (!account) {
      throw new Error(`Storage account '${name}' not found. Create it first or use default storage.`);
    }
    return account;
  }

  /**
   * Get or create the Service Bus namespace
   */
  getOrCreateServiceBusNamespace(parent: Construct): ServiceBusNamespace {
    if (!this.serviceBusNamespace) {
      const name = this.options.serviceBusNamespaceName ||
        AzureNaming.serviceBusNamespace('events', parent.node.id);

      const skuName = this.options.serviceBusSku || 'Standard';

      this.serviceBusNamespace = new ServiceBusNamespace(parent, 'EventsServiceBus', {
        namespaceName: name,
        sku: this.mapServiceBusSku(skuName),
        zoneRedundant: skuName === 'Premium',
        tags: this.options.tags,
      });
    }
    return this.serviceBusNamespace;
  }

  /**
   * Register a queue processor association
   */
  registerQueueProcessor(queueName: string, processor: IFunctionApp): void {
    this.processorAssociations.set(`queue:${queueName}`, processor);
  }

  /**
   * Register a Service Bus queue processor association
   */
  registerServiceBusQueueProcessor(queueName: string, processor: IFunctionApp): void {
    this.processorAssociations.set(`sbqueue:${queueName}`, processor);
  }

  /**
   * Register a Service Bus topic processor association
   */
  registerServiceBusTopicProcessor(topicName: string, subscriptionName: string, processor: IFunctionApp): void {
    this.processorAssociations.set(`sbtopic:${topicName}/${subscriptionName}`, processor);
  }

  /**
   * Register an Event Grid topic processor association
   */
  registerTopicProcessor(topicName: string, processor: IFunctionApp): void {
    this.processorAssociations.set(`topic:${topicName}`, processor);
  }

  /**
   * Map string SKU to ServiceBusSku type
   */
  private mapServiceBusSku(sku: string): ServiceBusSku {
    switch (sku.toLowerCase()) {
      case 'basic':
        return ServiceBusSku.BASIC;
      case 'premium':
        return ServiceBusSku.PREMIUM;
      case 'standard':
      default:
        return ServiceBusSku.STANDARD;
    }
  }

  /**
   * Apply default tags to all resources
   */
  private applyDefaultTags(parent: Construct): void {
    if (!this.options.tags) return;

    // Tags are applied during resource creation
    // This method can be extended to retroactively apply tags if needed
  }

  /**
   * Get all processor associations (for debugging/inspection)
   */
  getProcessorAssociations(): Map<string, IFunctionApp> {
    return new Map(this.processorAssociations);
  }
}

/**
 * Define a unified events namespace with all event-driven infrastructure
 *
 * @param config - Configuration object with event builders
 * @param options - Optional configuration for the namespace
 * @returns EventsNamespace instance
 *
 * @example
 * ```typescript
 * import { defineEvents, queue, topic, serviceBusQueue } from '@atakora/component/events';
 *
 * export const events = defineEvents({
 *   // Storage Queue
 *   dataQuality: queue('data-quality')
 *     .processor(dataQualityProcessor)
 *     .ttl(days(7)),
 *
 *   // Event Grid Topic
 *   auditLogs: topic('audit-logs')
 *     .processor(auditLogger)
 *     .events(['Auth.*', 'Data.*']),
 *
 *   // Service Bus Queue
 *   orders: serviceBusQueue('orders')
 *     .processor(orderProcessor)
 *     .sessions(),
 * });
 *
 * // Deploy to a construct
 * events.deploy(resourceGroup);
 * ```
 */
export function defineEvents<T extends EventsConfig>(
  config: T,
  options: DefineEventsOptions = {}
): T & EventsNamespace {
  const namespace = new EventsNamespaceImpl(config, options);

  // Return a proxy that combines config and namespace
  return new Proxy(config, {
    get(target, prop) {
      // Check if it's a namespace method
      if (prop in namespace) {
        return (namespace as any)[prop];
      }
      // Otherwise return the config property
      return target[prop as keyof T];
    }
  }) as T & EventsNamespace;
}