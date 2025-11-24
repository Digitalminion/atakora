/**
 * Queue Service
 *
 * @remarks
 * Message queue abstraction that can be implemented with different backends
 * (Azure Storage Queue, Azure Service Bus, etc.)
 *
 * @packageDocumentation
 */

/**
 * Queue message
 *
 * @public
 */
export interface QueueMessage<T = any> {
  /**
   * Message ID
   */
  readonly id: string;

  /**
   * Message body
   */
  readonly body: T;

  /**
   * Message metadata
   */
  readonly metadata?: Record<string, string>;

  /**
   * Dequeue count
   */
  readonly dequeueCount: number;

  /**
   * Enqueued time (ISO string)
   */
  readonly enqueuedTime: string;

  /**
   * Expiration time (ISO string)
   */
  readonly expirationTime?: string;
}

/**
 * Queue send options
 *
 * @public
 */
export interface QueueSendOptions {
  /**
   * Message time-to-live in milliseconds
   */
  readonly ttl?: number;

  /**
   * Visibility timeout in milliseconds
   */
  readonly visibilityTimeout?: number;

  /**
   * Message metadata
   */
  readonly metadata?: Record<string, string>;
}

/**
 * Queue service interface
 *
 * @remarks
 * Abstract interface for message queuing.
 * Implement this interface with your preferred queue backend.
 *
 * @example
 * ```typescript
 * // In backend configuration
 * services: {
 *   queue: (context) => new AzureStorageQueueService({
 *     connectionString: context.env.STORAGE_CONNECTION_STRING!,
 *   }),
 * }
 *
 * // In function handler
 * await context.services.queue.send('process-uploads', {
 *   fileUrl: uploadUrl,
 *   userId: user.id,
 * });
 * ```
 *
 * @public
 */
export interface QueueService {
  /**
   * Send a message to a queue
   *
   * @param queueName - Queue name
   * @param message - Message body
   * @param options - Send options
   * @returns Message ID
   */
  send<T>(queueName: string, message: T, options?: QueueSendOptions): Promise<string>;

  /**
   * Send multiple messages to a queue
   *
   * @param queueName - Queue name
   * @param messages - Message bodies
   * @param options - Send options
   * @returns Array of message IDs
   */
  sendBatch<T>(
    queueName: string,
    messages: readonly T[],
    options?: QueueSendOptions
  ): Promise<readonly string[]>;

  /**
   * Receive messages from a queue
   *
   * @param queueName - Queue name
   * @param maxMessages - Maximum number of messages to receive
   * @param visibilityTimeout - Visibility timeout in milliseconds
   * @returns Array of messages
   */
  receive<T>(
    queueName: string,
    maxMessages?: number,
    visibilityTimeout?: number
  ): Promise<readonly QueueMessage<T>[]>;

  /**
   * Delete a message from a queue
   *
   * @param queueName - Queue name
   * @param messageId - Message ID
   * @param popReceipt - Pop receipt (for Azure Storage Queues)
   */
  delete(queueName: string, messageId: string, popReceipt?: string): Promise<void>;

  /**
   * Get queue length (approximate)
   *
   * @param queueName - Queue name
   * @returns Approximate number of messages in queue
   */
  getLength(queueName: string): Promise<number>;

  /**
   * Clear all messages from a queue
   *
   * @param queueName - Queue name
   */
  clear(queueName: string): Promise<void>;
}

/**
 * Mock queue service for development/testing
 *
 * @remarks
 * Stores messages in memory instead of a real queue.
 * Useful for development and testing environments.
 *
 * @public
 */
export class MockQueueService implements QueueService {
  private readonly queues = new Map<string, QueueMessage<any>[]>();
  private readonly logMessages: boolean;

  /**
   * Create a mock queue service
   *
   * @param options - Service options
   */
  constructor(
    options: {
      logMessages?: boolean;
    } = {}
  ) {
    this.logMessages = options.logMessages ?? true;
  }

  /**
   * Send a message to a queue
   */
  async send<T>(queueName: string, message: T, options?: QueueSendOptions): Promise<string> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const queueMessage: QueueMessage<T> = {
      id: messageId,
      body: message,
      metadata: options?.metadata,
      dequeueCount: 0,
      enqueuedTime: new Date().toISOString(),
      expirationTime: options?.ttl
        ? new Date(Date.now() + options.ttl).toISOString()
        : undefined,
    };

    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }

    this.queues.get(queueName)!.push(queueMessage);

    if (this.logMessages) {
      console.log(`[MockQueueService] Message sent to queue '${queueName}':`, {
        messageId,
        bodyType: typeof message,
      });
    }

    return messageId;
  }

  /**
   * Send multiple messages to a queue
   */
  async sendBatch<T>(
    queueName: string,
    messages: readonly T[],
    options?: QueueSendOptions
  ): Promise<readonly string[]> {
    const messageIds: string[] = [];

    for (const message of messages) {
      const messageId = await this.send(queueName, message, options);
      messageIds.push(messageId);
    }

    return messageIds;
  }

  /**
   * Receive messages from a queue
   */
  async receive<T>(
    queueName: string,
    maxMessages = 1,
    visibilityTimeout?: number
  ): Promise<readonly QueueMessage<T>[]> {
    const queue = this.queues.get(queueName) || [];
    const messages = queue.splice(0, maxMessages);

    if (this.logMessages && messages.length > 0) {
      console.log(`[MockQueueService] Received ${messages.length} message(s) from '${queueName}'`);
    }

    return messages as QueueMessage<T>[];
  }

  /**
   * Delete a message from a queue
   */
  async delete(queueName: string, messageId: string, popReceipt?: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      const index = queue.findIndex((msg) => msg.id === messageId);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    }

    if (this.logMessages) {
      console.log(`[MockQueueService] Message '${messageId}' deleted from '${queueName}'`);
    }
  }

  /**
   * Get queue length
   */
  async getLength(queueName: string): Promise<number> {
    return this.queues.get(queueName)?.length ?? 0;
  }

  /**
   * Clear all messages from a queue
   */
  async clear(queueName: string): Promise<void> {
    this.queues.set(queueName, []);

    if (this.logMessages) {
      console.log(`[MockQueueService] Queue '${queueName}' cleared`);
    }
  }
}
