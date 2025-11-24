/**
 * Common Service Implementations
 *
 * @remarks
 * Pre-built service implementations for common use cases.
 * These can be used directly in backend service configuration.
 *
 * @packageDocumentation
 */

// Email Service
export type {
  EmailMessage,
  EmailAttachment,
  EmailSendResult,
  EmailService,
} from './email-service';
export { MockEmailService } from './email-service';

// Logging Service
export type {
  LogLevel,
  LogEntry,
  LoggingService,
} from './logging-service';
export { BasicLoggingService } from './logging-service';

// Cache Service
export type {
  CacheEntry,
  CacheOptions,
  CacheService,
  ServiceCacheStats,
} from './cache-service';
export { InMemoryCacheService } from './cache-service';

// Queue Service
export type {
  QueueMessage,
  QueueSendOptions,
  QueueService,
} from './queue-service';
export { MockQueueService } from './queue-service';

// Notification Service
export type {
  Notification,
  NotificationSendOptions,
  NotificationSendResult,
  NotificationService,
} from './notification-service';
export { MockNotificationService } from './notification-service';
