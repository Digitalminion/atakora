import { Construct } from '@atakora/cdk';
import type { IStorageAccount } from '../storage-account-types';
import { QueueServices } from '../queue-services';
import { StorageQueues } from '../queues';
import type { IQueueService, QueueCorsRule } from '../queue-service-types';
import type { IStorageQueue } from '../queue-types';

/**
 * Configuration for a single queue.
 */
export interface QueueConfig {
  /**
   * Name of the queue.
   *
   * @remarks
   * - Must be 3-63 characters
   * - Lowercase alphanumeric and hyphens only
   * - Cannot start or end with hyphen
   */
  name: string;

  /**
   * Metadata for the queue.
   */
  metadata?: Record<string, string>;
}

/**
 * Properties for QueueStack.
 */
export interface QueueStackProps {
  /**
   * Parent storage account.
   */
  storageAccount: IStorageAccount;

  /**
   * Queue configurations.
   */
  queues: QueueConfig[];

  /**
   * CORS configuration for the queue service.
   */
  cors?: {
    corsRules: QueueCorsRule[];
  };
}

/**
 * Queue Stack
 *
 * @remarks
 * Orchestrates the creation of queue service and multiple queues within a storage account.
 * Provides a high-level abstraction for managing Azure Queue Storage infrastructure.
 *
 * Features:
 * - Automatic queue service creation
 * - Multiple queue management
 * - CORS configuration support
 * - Queue lookup by name
 * - Deployment configuration export
 *
 * @example
 * ```typescript
 * const queueStack = new QueueStack(resourceGroup, 'Queues', {
 *   storageAccount: storageAccount,
 *   queues: [
 *     { name: 'orders', metadata: { purpose: 'order-processing' } },
 *     { name: 'notifications', metadata: { purpose: 'email-notifications' } },
 *     { name: 'events', metadata: { purpose: 'event-processing' } }
 *   ],
 *   cors: {
 *     corsRules: [{
 *       allowedOrigins: ['https://example.com'],
 *       allowedMethods: ['GET', 'POST'],
 *       allowedHeaders: ['*'],
 *       exposedHeaders: ['*'],
 *       maxAgeInSeconds: 3600
 *     }]
 *   }
 * });
 *
 * // Get a specific queue
 * const orderQueue = queueStack.getQueue('orders');
 *
 * // Grant permissions
 * orderQueue?.grantSend(functionApp);
 * ```
 */
export class QueueStack {
  /**
   * The queue service.
   */
  public readonly queueService: IQueueService;

  /**
   * Map of queues by name.
   */
  public readonly queues: Map<string, IStorageQueue> = new Map();

  /**
   * Parent storage account.
   */
  public readonly storageAccount: IStorageAccount;

  /**
   * Creates a new QueueStack.
   *
   * @param scope - Parent construct
   * @param id - Unique identifier for this stack
   * @param props - Queue stack properties
   *
   * @example
   * ```typescript
   * const queueStack = new QueueStack(resourceGroup, 'Queues', {
   *   storageAccount: storageAccount,
   *   queues: [
   *     { name: 'orders' },
   *     { name: 'notifications' }
   *   ]
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: QueueStackProps) {
    this.storageAccount = props.storageAccount;

    // Create queue service
    const queueServiceConstruct = new QueueServices(scope, `${id}Service`, {
      cors: props.cors,
    });
    this.queueService = queueServiceConstruct;

    // Create queues
    props.queues.forEach((queueConfig) => {
      const queue = new StorageQueues(scope, `${id}-${queueConfig.name}`, {
        queueName: queueConfig.name,
        metadata: queueConfig.metadata,
      });

      this.queues.set(queueConfig.name, queue);
    });
  }

  /**
   * Get a queue by name.
   *
   * @param name - Queue name
   * @returns The queue if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const orderQueue = queueStack.getQueue('orders');
   * if (orderQueue) {
   *   orderQueue.grantSend(functionApp);
   * }
   * ```
   */
  public getQueue(name: string): IStorageQueue | undefined {
    return this.queues.get(name);
  }

  /**
   * Get all queue names.
   *
   * @returns Array of queue names
   *
   * @example
   * ```typescript
   * const queueNames = queueStack.getQueueNames();
   * console.log('Available queues:', queueNames);
   * ```
   */
  public getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Get the full deployed configuration (matches infrastructure output structure).
   *
   * @returns Deployment configuration object
   *
   * @example
   * ```typescript
   * const config = queueStack.getDeployedConfig();
   * console.log('Queue infrastructure:', config);
   * ```
   */
  public getDeployedConfig() {
    return {
      queueService: {
        name: this.queueService.queueServiceName,
        id: this.queueService.queueServiceId,
        storageAccountName: this.queueService.storageAccountName,
      },
      queues: Array.from(this.queues.entries()).map(([name, queue]) => ({
        name,
        id: queue.queueId,
        url: queue.queueUrl,
        storageAccountName: queue.storageAccountName,
      })),
      storageAccount: {
        name: this.storageAccount.storageAccountName,
        id: this.storageAccount.storageAccountId,
        location: this.storageAccount.location,
      },
    };
  }
}
