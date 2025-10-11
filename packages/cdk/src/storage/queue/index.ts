/**
 * Azure Storage Queue infrastructure constructs.
 *
 * This module provides high-level abstractions for creating and managing
 * Azure Queue Storage infrastructure, including queue services and queues.
 *
 * @packageDocumentation
 */

// Stack exports
export { QueueStack } from './stack';
export type { QueueStackProps, QueueConfig } from './stack';

// Resource/factory function exports
export { createQueues, createStandardQueues, createOrderQueues, queues } from './resource';
