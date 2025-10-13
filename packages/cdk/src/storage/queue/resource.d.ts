import { Construct } from '@atakora/cdk';
import type { IStorageAccount } from '../storage-account-types';
import { QueueStack, type QueueConfig } from './stack';
/**
 * Creates a Queue infrastructure stack with common queue patterns.
 *
 * @remarks
 * This is a convenience factory function that creates a QueueStack with
 * opinionated defaults for common queue scenarios.
 *
 * Common queue patterns:
 * - Order processing queues
 * - Notification queues
 * - Event processing queues
 * - Dead letter queues
 *
 * @param scope - Parent scope (SubscriptionStack or ResourceGroupStack)
 * @param storageAccount - Storage account for queues
 * @param queueConfigs - Array of queue configurations
 * @returns Configured QueueStack instance
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { createQueues } from '@atakora/cdk/storage/queue';
 *
 * const queueStack = createQueues(scope, storageAccount, [
 *   { name: 'orders', metadata: { purpose: 'order-processing' } },
 *   { name: 'notifications', metadata: { purpose: 'notifications' } }
 * ]);
 * ```
 *
 * @example
 * With CORS configuration:
 * ```typescript
 * const queueStack = createQueues(
 *   scope,
 *   storageAccount,
 *   [
 *     { name: 'orders' },
 *     { name: 'notifications' }
 *   ],
 *   {
 *     cors: {
 *       corsRules: [{
 *         allowedOrigins: ['https://example.com'],
 *         allowedMethods: ['GET', 'POST'],
 *         allowedHeaders: ['*'],
 *         exposedHeaders: ['*'],
 *         maxAgeInSeconds: 3600
 *       }]
 *     }
 *   }
 * );
 * ```
 */
export declare function createQueues(scope: Construct, storageAccount: IStorageAccount, queueConfigs: QueueConfig[], options?: {
    cors?: {
        corsRules: Array<{
            allowedOrigins: string[];
            allowedMethods: ('DELETE' | 'GET' | 'HEAD' | 'MERGE' | 'POST' | 'OPTIONS' | 'PUT' | 'PATCH')[];
            allowedHeaders: string[];
            exposedHeaders: string[];
            maxAgeInSeconds: number;
        }>;
    };
}): QueueStack;
/**
 * Creates a standard set of queues for a microservice architecture.
 *
 * @remarks
 * Creates the following queues:
 * - commands: For command messages
 * - events: For event messages
 * - notifications: For notification messages
 * - dead-letter: For failed messages
 *
 * @param scope - Parent scope
 * @param storageAccount - Storage account for queues
 * @returns Configured QueueStack with standard queues
 *
 * @example
 * ```typescript
 * import { createStandardQueues } from '@atakora/cdk/storage/queue';
 *
 * const queueStack = createStandardQueues(scope, storageAccount);
 *
 * // Access specific queues
 * const commandQueue = queueStack.getQueue('commands');
 * const eventQueue = queueStack.getQueue('events');
 * ```
 */
export declare function createStandardQueues(scope: Construct, storageAccount: IStorageAccount): QueueStack;
/**
 * Creates queues for order processing workloads.
 *
 * @remarks
 * Creates the following queues:
 * - orders: For new orders
 * - order-processing: For order processing tasks
 * - order-completed: For completed orders
 * - order-failed: For failed orders
 *
 * @param scope - Parent scope
 * @param storageAccount - Storage account for queues
 * @returns Configured QueueStack with order processing queues
 *
 * @example
 * ```typescript
 * import { createOrderQueues } from '@atakora/cdk/storage/queue';
 *
 * const queueStack = createOrderQueues(scope, storageAccount);
 *
 * // Grant permissions
 * const orderQueue = queueStack.getQueue('orders');
 * orderQueue?.grantSend(apiFunction);
 * orderQueue?.grantProcess(processorFunction);
 * ```
 */
export declare function createOrderQueues(scope: Construct, storageAccount: IStorageAccount): QueueStack;
/**
 * Export for use in infrastructure code.
 *
 * @remarks
 * This will be imported like:
 * ```typescript
 * import { queues } from '@atakora/cdk/storage/queue';
 * const queueStack = queues(scope, storageAccount, [...]);
 * ```
 */
export { createQueues as queues };
//# sourceMappingURL=resource.d.ts.map