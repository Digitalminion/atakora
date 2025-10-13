/**
 * Messaging Components
 *
 * @remarks
 * High-level components for Azure messaging services including:
 * - Service Bus Queues (point-to-point messaging)
 * - Service Bus Topics (pub/sub messaging)
 * - Event Hub integration
 *
 * @packageDocumentation
 */

// MessageQueue component
export { MessageQueue } from './message-queue';

// Types
export type {
  MessageQueueProps,
  QueueFunctionConfig,
} from './types';
