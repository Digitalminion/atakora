/**
 * Unified Events Namespace - Single Surface for All Event Infrastructure
 *
 * This module provides a unified API for all event-driven patterns in Azure:
 * - Storage Queues for simple async processing
 * - Event Grid Topics for pub/sub patterns
 * - Service Bus Queues for enterprise messaging
 * - Service Bus Topics for enterprise pub/sub
 *
 * @example
 * ```typescript
 * import { defineEvents, queue, topic, serviceBusQueue, serviceBusTopic } from '@atakora/component/events';
 * import { days, hours, minutes } from '@atakora/component/common';
 *
 * export const events = defineEvents({
 *   // Storage Queue - simple async processing
 *   dataQuality: queue('data-quality')
 *     .processor(dataQualityProcessor)
 *     .ttl(days(7))
 *     .retries(3)
 *     .deadLetter(),
 *
 *   // Event Grid Topic - pub/sub patterns
 *   auditLogs: topic('audit-logs')
 *     .processor(auditLogger)
 *     .events(['Auth.*', 'Data.*', 'Security.*'])
 *     .schema('CloudEventSchemaV1_0')
 *     .retention(days(90)),
 *
 *   // Service Bus Queue - enterprise messaging
 *   orders: serviceBusQueue('orders')
 *     .processor(orderProcessor)
 *     .sessions()
 *     .duplicateDetection(minutes(10)),
 *
 *   // Service Bus Topic - enterprise pub/sub
 *   notifications: serviceBusTopic('notifications')
 *     .subscription('email', emailProcessor)
 *     .subscription('sms', smsProcessor)
 *     .subscription('push', sub => sub
 *       .filter("Priority = 'High'")
 *       .processor(urgentProcessor)
 *     ),
 * });
 * ```
 *
 * @packageDocumentation
 */

// Core function for defining events
export { defineEvents } from './define-events';

// Queue builders
export { QueueBuilder, queue } from './queue-builder';
export { TopicBuilder, topic } from './topic-builder';
export { ServiceBusQueueBuilder, serviceBusQueue } from './service-bus-queue-builder';
export { ServiceBusTopicBuilder, serviceBusTopic, ServiceBusSubscriptionBuilder } from './service-bus-topic-builder';

// Types
export type {
  EventBuilder,
  EventsConfig,
  EventsNamespace,
  DefineEventsOptions,
} from './types';

// Re-export commonly used durations for convenience
export { Duration, milliseconds, seconds, minutes, hours, days } from '../common';

/**
 * Migration Guide from Old Patterns
 *
 * ## Before (Multiple imports and patterns):
 * ```typescript
 * // In queue-processors/data-quality/resource.ts
 * import { Queue } from '@atakora/component/queues';
 * export const dataQualityQueue = Queue('data-quality')
 *   .messageTimeToLive(days(7))
 *   .processor(dataQualityProcessor);
 *
 * // In event-topics/audit-logger/resource.ts
 * import { EventTopic } from '../builders';
 * export const auditLogsTopic = EventTopic('audit-logs')
 *   .processor(auditLogger);
 *
 * // In infrastructure/service-bus/resource.ts
 * import { ServiceBus } from '../builders';
 * export const serviceBus = ServiceBus('app-bus')
 *   .queue('orders', q => q.sessions());
 * ```
 *
 * ## After (Single import, unified API):
 * ```typescript
 * // In events/resource.ts - ALL events in one place
 * import { defineEvents, queue, topic, serviceBusQueue } from '@atakora/component/events';
 *
 * export const events = defineEvents({
 *   dataQuality: queue('data-quality', dataQualityProcessor).ttl(days(7)),
 *   auditLogs: topic('audit-logs', auditLogger),
 *   orders: serviceBusQueue('orders', orderProcessor).sessions(),
 * });
 * ```
 *
 * ## Key Benefits:
 * - **Single Import**: All event infrastructure from one location
 * - **Consistent API**: Same patterns work across all event types
 * - **Progressive Enhancement**: Start simple, add complexity as needed
 * - **Type Safety**: Full IntelliSense support throughout
 * - **Smart Defaults**: Sensible defaults for common scenarios
 */