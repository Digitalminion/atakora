/**
 * Microsoft.Storage resource constructs
 *
 * This namespace contains Azure storage resources including:
 * - Storage Accounts (Microsoft.Storage/storageAccounts)
 * - Queue Services (Microsoft.Storage/storageAccounts/queueServices)
 * - Storage Queues (Microsoft.Storage/storageAccounts/queueServices/queues)
 * - Queue Stack (High-level queue infrastructure orchestration)
 *
 * @packageDocumentation
 */

// Storage Account exports
export { ArmStorageAccounts } from './storage-account-arm';
export { StorageAccounts } from './storage-accounts';
export type {
  ArmStorageAccountsProps,
  StorageAccountsProps,
  IStorageAccount,
  StorageAccountSku,
  NetworkAcls,
} from './storage-account-types';
export {
  StorageAccountSkuName,
  StorageAccountKind,
  AccessTier,
  TlsVersion,
  PublicNetworkAccess,
  NetworkAclDefaultAction,
  NetworkAclBypass,
} from './storage-account-types';

// Queue Service exports
export { ArmQueueServices } from './queue-service-arm';
export { QueueServices } from './queue-services';
export type { ArmQueueServicesProps, QueueServicesProps, IQueueService, QueueCorsRule } from './queue-service-types';

// Storage Queue exports
export { ArmStorageQueues } from './queue-arm';
export { StorageQueues } from './queues';
export type { ArmStorageQueuesProps, StorageQueuesProps, IStorageQueue } from './queue-types';

// Queue Stack exports (high-level orchestration)
export { QueueStack } from './queue/stack';
export type { QueueStackProps, QueueConfig } from './queue/stack';
export { createQueues, createStandardQueues, createOrderQueues, queues } from './queue/resource';
