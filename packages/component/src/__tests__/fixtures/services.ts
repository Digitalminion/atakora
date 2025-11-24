/**
 * Service Registry Test Fixtures
 *
 * @remarks
 * Provides mock service implementations for testing service registry
 * and dependency injection in function handlers.
 *
 * @module @atakora/component/__tests__/fixtures/services
 */

// ============================================================================
// Service Interfaces
// ============================================================================

export interface EmailService {
  sendEmail(to: string, subject: string, body: string): Promise<EmailResult>;
  sendBulkEmail(recipients: string[], subject: string, body: string): Promise<BulkEmailResult>;
  getEmailStatus(messageId: string): Promise<EmailStatus>;
}

export interface EmailResult {
  messageId: string;
  sent: boolean;
  timestamp: Date;
  error?: string;
}

export interface BulkEmailResult {
  totalSent: number;
  totalFailed: number;
  messageIds: string[];
}

export interface EmailStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  deliveredAt?: Date;
  error?: string;
}

export interface LoggingService {
  log(level: string, message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
  getLogs(): LogEntry[];
  clear(): void;
}

export interface LogEntry {
  level: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  error?: Error;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
}

export interface QueueService {
  enqueue(queueName: string, message: any): Promise<string>;
  dequeue(queueName: string): Promise<QueueMessage | null>;
  peek(queueName: string): Promise<QueueMessage | null>;
  getQueueLength(queueName: string): Promise<number>;
  clear(queueName: string): Promise<void>;
}

export interface QueueMessage {
  id: string;
  queueName: string;
  payload: any;
  enqueuedAt: Date;
  dequeueCount: number;
}

export interface NotificationService {
  sendNotification(userId: string, notification: Notification): Promise<NotificationResult>;
  getNotifications(userId: string): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
}

export interface Notification {
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  createdAt?: Date;
  read?: boolean;
}

export interface NotificationResult {
  notificationId: string;
  sent: boolean;
  timestamp: Date;
}

// ============================================================================
// Mock Email Service
// ============================================================================

export class MockEmailService implements EmailService {
  private sentEmails: Array<{
    to: string;
    subject: string;
    body: string;
    messageId: string;
    timestamp: Date;
  }> = [];

  private failureRate: number = 0;
  private delayMs: number = 0;

  async sendEmail(to: string, subject: string, body: string): Promise<EmailResult> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date();

    const shouldFail = Math.random() < this.failureRate;

    if (shouldFail) {
      return {
        messageId,
        sent: false,
        timestamp,
        error: 'Simulated email sending failure',
      };
    }

    this.sentEmails.push({ to, subject, body, messageId, timestamp });

    return {
      messageId,
      sent: true,
      timestamp,
    };
  }

  async sendBulkEmail(recipients: string[], subject: string, body: string): Promise<BulkEmailResult> {
    const results = await Promise.all(
      recipients.map((to) => this.sendEmail(to, subject, body))
    );

    const sent = results.filter((r) => r.sent);
    const failed = results.filter((r) => !r.sent);

    return {
      totalSent: sent.length,
      totalFailed: failed.length,
      messageIds: sent.map((r) => r.messageId),
    };
  }

  async getEmailStatus(messageId: string): Promise<EmailStatus> {
    const email = this.sentEmails.find((e) => e.messageId === messageId);

    if (!email) {
      return {
        messageId,
        status: 'failed',
        error: 'Message not found',
      };
    }

    return {
      messageId,
      status: 'delivered',
      deliveredAt: email.timestamp,
    };
  }

  // Test helpers
  setFailureRate(rate: number) {
    this.failureRate = rate;
  }

  setDelay(ms: number) {
    this.delayMs = ms;
  }

  getSentEmails() {
    return [...this.sentEmails];
  }

  clear() {
    this.sentEmails = [];
    this.failureRate = 0;
    this.delayMs = 0;
  }
}

// ============================================================================
// Mock Logging Service
// ============================================================================

export class MockLoggingService implements LoggingService {
  private logs: LogEntry[] = [];

  log(level: string, message: string, metadata?: Record<string, any>): void {
    this.logs.push({
      level,
      message,
      metadata,
      timestamp: new Date(),
    });
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.logs.push({
      level: 'error',
      message,
      metadata,
      error,
      timestamp: new Date(),
    });
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: string): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  clear(): void {
    this.logs = [];
  }
}

// ============================================================================
// Mock Cache Service
// ============================================================================

export class MockCacheService implements CacheService {
  private cache = new Map<string, { value: any; expiresAt?: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async keys(): Promise<string[]> {
    // Remove expired keys
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    return Array.from(this.cache.keys());
  }

  // Test helper
  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// Mock Queue Service
// ============================================================================

export class MockQueueService implements QueueService {
  private queues = new Map<string, QueueMessage[]>();

  async enqueue(queueName: string, message: any): Promise<string> {
    const queue = this.queues.get(queueName) || [];

    const queueMessage: QueueMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      queueName,
      payload: message,
      enqueuedAt: new Date(),
      dequeueCount: 0,
    };

    queue.push(queueMessage);
    this.queues.set(queueName, queue);

    return queueMessage.id;
  }

  async dequeue(queueName: string): Promise<QueueMessage | null> {
    const queue = this.queues.get(queueName);

    if (!queue || queue.length === 0) {
      return null;
    }

    const message = queue.shift()!;
    message.dequeueCount++;

    return message;
  }

  async peek(queueName: string): Promise<QueueMessage | null> {
    const queue = this.queues.get(queueName);

    if (!queue || queue.length === 0) {
      return null;
    }

    return { ...queue[0] };
  }

  async getQueueLength(queueName: string): Promise<number> {
    const queue = this.queues.get(queueName);
    return queue ? queue.length : 0;
  }

  async clear(queueName: string): Promise<void> {
    this.queues.delete(queueName);
  }

  // Test helper
  clearAll(): void {
    this.queues.clear();
  }

  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }
}

// ============================================================================
// Mock Notification Service
// ============================================================================

export class MockNotificationService implements NotificationService {
  private notifications = new Map<string, Notification[]>();

  async sendNotification(userId: string, notification: Notification): Promise<NotificationResult> {
    const userNotifications = this.notifications.get(userId) || [];

    const completeNotification: Notification = {
      ...notification,
      id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: notification.createdAt || new Date(),
      read: false,
    };

    userNotifications.push(completeNotification);
    this.notifications.set(userId, userNotifications);

    return {
      notificationId: completeNotification.id!,
      sent: true,
      timestamp: completeNotification.createdAt!,
    };
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];
    return [...userNotifications];
  }

  async markAsRead(notificationId: string): Promise<void> {
    const entries = Array.from(this.notifications.entries());
    for (const [userId, notifications] of entries) {
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification) {
        notification.read = true;
        return;
      }
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const entries = Array.from(this.notifications.entries());
    for (const [userId, notifications] of entries) {
      const index = notifications.findIndex((n) => n.id === notificationId);
      if (index !== -1) {
        notifications.splice(index, 1);
        this.notifications.set(userId, notifications);
        return;
      }
    }
  }

  // Test helpers
  clear(): void {
    this.notifications.clear();
  }

  getUserCount(): number {
    return this.notifications.size;
  }

  getTotalNotificationCount(): number {
    let total = 0;
    const values = Array.from(this.notifications.values());
    for (const notifications of values) {
      total += notifications.length;
    }
    return total;
  }
}

// ============================================================================
// Service Factory Builders
// ============================================================================

export interface ServiceRegistry {
  email: EmailService;
  logging: LoggingService;
  cache: CacheService;
  queue: QueueService;
  notification: NotificationService;
}

/**
 * Create complete mock service registry
 */
export function createMockServices(): ServiceRegistry {
  return {
    email: new MockEmailService(),
    logging: new MockLoggingService(),
    cache: new MockCacheService(),
    queue: new MockQueueService(),
    notification: new MockNotificationService(),
  };
}

/**
 * Create service registry with custom implementations
 */
export function createCustomServices(overrides: Partial<ServiceRegistry>): ServiceRegistry {
  const defaults = createMockServices();
  return {
    ...defaults,
    ...overrides,
  };
}

// ============================================================================
// Service Configuration Fixtures
// ============================================================================

export interface EmailServiceConfig {
  provider: 'sendgrid' | 'ses' | 'smtp';
  apiKey?: string;
  fromAddress: string;
  fromName?: string;
  retryAttempts?: number;
  timeout?: number;
}

export interface CacheServiceConfig {
  provider: 'memory' | 'redis' | 'cosmos';
  ttlSeconds?: number;
  maxSize?: number;
  connectionString?: string;
}

export interface QueueServiceConfig {
  provider: 'memory' | 'storage-queue' | 'service-bus';
  connectionString?: string;
  maxDequeueCount?: number;
  visibilityTimeout?: number;
}

export const defaultEmailConfig: EmailServiceConfig = {
  provider: 'sendgrid',
  fromAddress: 'noreply@test.com',
  fromName: 'Test App',
  retryAttempts: 3,
  timeout: 30000,
};

export const defaultCacheConfig: CacheServiceConfig = {
  provider: 'memory',
  ttlSeconds: 3600,
  maxSize: 1000,
};

export const defaultQueueConfig: QueueServiceConfig = {
  provider: 'memory',
  maxDequeueCount: 5,
  visibilityTimeout: 30,
};

// ============================================================================
// Test Helper Functions
// ============================================================================

/**
 * Wait for async operations to complete
 */
export async function waitForServices(ms: number = 100): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clear all services in registry
 */
export function clearAllServices(services: ServiceRegistry): void {
  if (services.email instanceof MockEmailService) {
    services.email.clear();
  }
  if (services.logging instanceof MockLoggingService) {
    services.logging.clear();
  }
  if (services.cache instanceof MockCacheService) {
    services.cache.clear();
  }
  if (services.queue instanceof MockQueueService) {
    services.queue.clearAll();
  }
  if (services.notification instanceof MockNotificationService) {
    services.notification.clear();
  }
}

/**
 * Create service registry with realistic delays
 */
export function createRealisticServices(): ServiceRegistry {
  const services = createMockServices();

  if (services.email instanceof MockEmailService) {
    services.email.setDelay(50); // 50ms delay for email sending
  }

  return services;
}

/**
 * Create service registry with high failure rates for error testing
 */
export function createUnreliableServices(): ServiceRegistry {
  const services = createMockServices();

  if (services.email instanceof MockEmailService) {
    services.email.setFailureRate(0.5); // 50% failure rate
  }

  return services;
}
