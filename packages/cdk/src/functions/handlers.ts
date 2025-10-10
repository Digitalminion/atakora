/**
 * Comprehensive handler interfaces for all Azure Functions trigger types.
 *
 * @packageDocumentation
 *
 * @remarks
 * This module provides type-safe handler interfaces for all 18 Azure Functions trigger types,
 * organized by priority:
 * - Core Triggers (9): HTTP, Timer, Queue, Blob, Service Bus (Queue & Topic), Event Hub, Cosmos DB, Event Grid
 * - IoT & Real-time (2): IoT Hub, SignalR
 * - Third-Party (3): Kafka, RabbitMQ, Redis Stream
 * - Durable Functions (3): Orchestrator, Activity, Entity
 *
 * @example
 * Basic HTTP handler:
 * ```typescript
 * import { HttpHandler } from '@atakora/cdk/functions';
 *
 * export const handler: HttpHandler = async (context, req) => {
 *   return {
 *     status: 200,
 *     body: { message: 'Hello World' }
 *   };
 * };
 * ```
 *
 * @example
 * Timer handler with scheduling:
 * ```typescript
 * import { TimerHandler } from '@atakora/cdk/functions';
 *
 * export const handler: TimerHandler = async (context, timer) => {
 *   if (timer.isPastDue) {
 *     context.log.warn('Timer is past due');
 *   }
 *   context.log.info('Processing scheduled task');
 * };
 * ```
 */

import type {
  AzureFunctionContext,
  HttpRequest,
  HttpResponse,
  TimerInfo,
  Principal,
  Cookie,
} from './types';

// ============================================================================
// PRIORITY 1: CORE TRIGGERS (9 handlers)
// ============================================================================

/**
 * Generic Azure Function handler type.
 *
 * @typeParam TInput - Input type for the handler
 * @typeParam TOutput - Output type for the handler
 *
 * @remarks
 * Base type for all Azure Function handlers. Specific trigger types
 * extend this with their own input/output types.
 */
export type AzureFunctionHandler<TInput = unknown, TOutput = unknown> = (
  context: AzureFunctionContext,
  input: TInput
) => Promise<TOutput> | TOutput;

// ----------------------------------------------------------------------------
// HTTP Trigger
// ----------------------------------------------------------------------------

/**
 * HTTP handler function type for HTTP-triggered Azure Functions.
 *
 * @remarks
 * Handles HTTP requests and returns HTTP responses. Supports all HTTP methods
 * (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) and authentication levels.
 *
 * @example
 * Basic HTTP handler:
 * ```typescript
 * export const handler: HttpHandler = async (context, req) => {
 *   const name = req.query.name || 'World';
 *   return {
 *     status: 200,
 *     body: { message: `Hello, ${name}!` }
 *   };
 * };
 * ```
 *
 * @example
 * With authentication:
 * ```typescript
 * export const handler: HttpHandler = async (context, req) => {
 *   if (!req.user) {
 *     return { status: 401, body: { error: 'Unauthorized' } };
 *   }
 *
 *   return {
 *     status: 200,
 *     body: { userId: req.user.id, roles: req.user.roles }
 *   };
 * };
 * ```
 */
export type HttpHandler = (
  context: AzureFunctionContext,
  req: HttpRequest
) => Promise<HttpResponse> | HttpResponse;

// ----------------------------------------------------------------------------
// Timer Trigger
// ----------------------------------------------------------------------------

/**
 * Timer handler function type for scheduled Azure Functions.
 *
 * @remarks
 * Executes on a schedule defined by a CRON expression. Useful for periodic
 * tasks like cleanup, data synchronization, or scheduled processing.
 *
 * @example
 * Basic timer handler:
 * ```typescript
 * export const handler: TimerHandler = async (context, timer) => {
 *   if (timer.isPastDue) {
 *     context.log.warn('Timer execution is past due');
 *   }
 *
 *   context.log.info('Running scheduled task');
 *   // Perform scheduled work
 * };
 * ```
 *
 * @example
 * With error handling:
 * ```typescript
 * export const handler: TimerHandler = async (context, timer) => {
 *   try {
 *     context.log.info(`Last run: ${timer.scheduleStatus.last}`);
 *     context.log.info(`Next run: ${timer.scheduleStatus.next}`);
 *
 *     // Perform work
 *   } catch (error) {
 *     context.log.error('Timer execution failed', error);
 *     throw error;
 *   }
 * };
 * ```
 */
export type TimerHandler = (
  context: AzureFunctionContext,
  timer: TimerInfo
) => Promise<void> | void;

// ----------------------------------------------------------------------------
// Queue Trigger
// ----------------------------------------------------------------------------

/**
 * Queue message information for Azure Storage Queue triggers.
 *
 * @remarks
 * Contains metadata about the queue message, including insertion time,
 * expiration, dequeue count, and message ID.
 */
export interface QueueMessage<T = any> {
  /**
   * Message content (automatically deserialized from JSON if applicable).
   */
  readonly body: T;

  /**
   * Unique message identifier.
   */
  readonly messageId: string;

  /**
   * Pop receipt token for message visibility management.
   */
  readonly popReceipt: string;

  /**
   * Message insertion time in UTC.
   */
  readonly insertionTime: Date;

  /**
   * Message expiration time in UTC.
   */
  readonly expirationTime: Date;

  /**
   * Number of times this message has been dequeued.
   */
  readonly dequeueCount: number;

  /**
   * Time when message becomes visible again (if requeued).
   */
  readonly nextVisibleTime?: Date;
}

/**
 * Queue handler function type for Azure Storage Queue triggers.
 *
 * @typeParam T - Message body type (defaults to any)
 *
 * @remarks
 * Processes messages from Azure Storage Queues. Messages are automatically
 * deleted after successful processing or moved to poison queue after max retries.
 *
 * @example
 * Basic queue handler:
 * ```typescript
 * export const handler: QueueHandler<{ orderId: string }> = async (context, message) => {
 *   context.log.info(`Processing order: ${message.body.orderId}`);
 *
 *   if (message.dequeueCount > 3) {
 *     context.log.warn(`Message has been retried ${message.dequeueCount} times`);
 *   }
 *
 *   // Process message
 * };
 * ```
 */
export type QueueHandler<T = any> = (
  context: AzureFunctionContext,
  message: QueueMessage<T>
) => Promise<void> | void;

// ----------------------------------------------------------------------------
// Blob Trigger
// ----------------------------------------------------------------------------

/**
 * Blob properties for blob storage events.
 *
 * @remarks
 * Contains metadata about the blob, including content type, size, timestamps,
 * and entity tags for concurrency control.
 */
export interface BlobProperties {
  /**
   * MIME type of the blob content.
   */
  readonly contentType: string;

  /**
   * Size of the blob in bytes.
   */
  readonly contentLength: number;

  /**
   * Last modification timestamp.
   */
  readonly lastModified: Date;

  /**
   * Entity tag for concurrency control.
   */
  readonly etag: string;

  /**
   * Content MD5 hash (if available).
   */
  readonly contentMD5?: string;

  /**
   * Content encoding (e.g., 'gzip').
   */
  readonly contentEncoding?: string;

  /**
   * Content language.
   */
  readonly contentLanguage?: string;

  /**
   * Cache control header.
   */
  readonly cacheControl?: string;

  /**
   * Blob type (BlockBlob, PageBlob, AppendBlob).
   */
  readonly blobType: 'BlockBlob' | 'PageBlob' | 'AppendBlob';

  /**
   * Lease status of the blob.
   */
  readonly leaseStatus?: 'locked' | 'unlocked';

  /**
   * Lease state of the blob.
   */
  readonly leaseState?: 'available' | 'leased' | 'expired' | 'breaking' | 'broken';
}

/**
 * Blob item for blob storage triggers.
 *
 * @remarks
 * Represents a blob that triggered the function, including its content,
 * properties, and metadata.
 */
export interface BlobItem {
  /**
   * Blob name (path within container).
   */
  readonly name: string;

  /**
   * Full URI to the blob.
   */
  readonly uri: string;

  /**
   * Blob properties and metadata.
   */
  readonly properties: BlobProperties;

  /**
   * Blob content (Buffer for binary, string for text).
   *
   * @remarks
   * Content is automatically loaded based on the dataType binding configuration.
   */
  readonly content: Buffer | string;

  /**
   * Custom metadata key-value pairs.
   */
  readonly metadata?: Record<string, string>;
}

/**
 * Blob handler function type for Azure Blob Storage triggers.
 *
 * @remarks
 * Triggered when a new blob is created or updated in the specified container.
 * Useful for image processing, file validation, ETL operations, etc.
 *
 * @example
 * Basic blob handler:
 * ```typescript
 * export const handler: BlobHandler = async (context, blob) => {
 *   context.log.info(`Processing blob: ${blob.name}`);
 *   context.log.info(`Size: ${blob.properties.contentLength} bytes`);
 *
 *   if (blob.properties.contentType.startsWith('image/')) {
 *     // Process image
 *   }
 * };
 * ```
 *
 * @example
 * With metadata:
 * ```typescript
 * export const handler: BlobHandler = async (context, blob) => {
 *   const userId = blob.metadata?.userId;
 *   const category = blob.metadata?.category;
 *
 *   context.log.info(`Processing blob for user ${userId} in category ${category}`);
 *
 *   // Process based on metadata
 * };
 * ```
 */
export type BlobHandler = (
  context: AzureFunctionContext,
  blob: BlobItem
) => Promise<void> | void;

// ----------------------------------------------------------------------------
// Service Bus Queue Trigger
// ----------------------------------------------------------------------------

/**
 * Service Bus message for queue and topic triggers.
 *
 * @remarks
 * Represents a message from Azure Service Bus with full metadata including
 * session support, delivery tracking, and custom properties.
 */
export interface ServiceBusMessage<T = any> {
  /**
   * Message body (automatically deserialized from JSON if applicable).
   */
  readonly body: T;

  /**
   * Unique message identifier.
   */
  readonly messageId: string;

  /**
   * Session identifier for session-enabled queues/subscriptions.
   */
  readonly sessionId?: string;

  /**
   * Correlation identifier for request-reply patterns.
   */
  readonly correlationId?: string;

  /**
   * Content type descriptor.
   */
  readonly contentType?: string;

  /**
   * Application-specific label.
   */
  readonly label?: string;

  /**
   * Address of the queue or topic to send replies to.
   */
  readonly replyTo?: string;

  /**
   * Session identifier for reply messages.
   */
  readonly replyToSessionId?: string;

  /**
   * Address of the queue or topic to send replies to.
   */
  readonly to?: string;

  /**
   * Time when the message was enqueued.
   */
  readonly enqueuedTimeUtc: Date;

  /**
   * Scheduled enqueue time (for delayed messages).
   */
  readonly scheduledEnqueueTimeUtc?: Date;

  /**
   * Number of times this message has been delivered.
   */
  readonly deliveryCount: number;

  /**
   * Time to live for the message.
   */
  readonly timeToLive?: number;

  /**
   * Unique sequence number assigned by Service Bus.
   */
  readonly sequenceNumber: number;

  /**
   * Lock token for message completion/abandonment.
   */
  readonly lockToken: string;

  /**
   * Partition key for partitioned entities.
   */
  readonly partitionKey?: string;

  /**
   * Custom application properties.
   */
  readonly properties: Record<string, any>;

  /**
   * Dead letter source (if message was dead-lettered).
   */
  readonly deadLetterSource?: string;
}

/**
 * Service Bus queue handler function type.
 *
 * @typeParam T - Message body type (defaults to any)
 *
 * @remarks
 * Processes messages from Service Bus queues with guaranteed delivery and
 * ordered processing (when using sessions).
 *
 * @example
 * Basic queue handler:
 * ```typescript
 * export const handler: ServiceBusQueueHandler<{ orderId: string }> = async (context, message) => {
 *   context.log.info(`Processing order: ${message.body.orderId}`);
 *   context.log.info(`Delivery count: ${message.deliveryCount}`);
 *
 *   // Process message
 * };
 * ```
 *
 * @example
 * With session support:
 * ```typescript
 * export const handler: ServiceBusQueueHandler = async (context, message) => {
 *   if (message.sessionId) {
 *     context.log.info(`Processing message in session: ${message.sessionId}`);
 *   }
 *
 *   // Messages with same sessionId are processed in order
 * };
 * ```
 */
export type ServiceBusQueueHandler<T = any> = (
  context: AzureFunctionContext,
  message: ServiceBusMessage<T>
) => Promise<void> | void;

// ----------------------------------------------------------------------------
// Service Bus Topic Trigger
// ----------------------------------------------------------------------------

/**
 * Service Bus topic handler function type.
 *
 * @typeParam T - Message body type (defaults to any)
 *
 * @remarks
 * Processes messages from Service Bus topic subscriptions. Supports filtering
 * with subscription rules and correlation.
 *
 * @example
 * Basic topic handler:
 * ```typescript
 * export const handler: ServiceBusTopicHandler<{ eventType: string }> = async (context, message) => {
 *   context.log.info(`Processing event: ${message.body.eventType}`);
 *   context.log.info(`Label: ${message.label}`);
 *
 *   // Process based on event type
 * };
 * ```
 *
 * @example
 * With correlation:
 * ```typescript
 * export const handler: ServiceBusTopicHandler = async (context, message) => {
 *   const correlationId = message.correlationId;
 *   const customProperty = message.properties['customHeader'];
 *
 *   context.log.info(`Correlation ID: ${correlationId}`);
 *
 *   // Process with correlation tracking
 * };
 * ```
 */
export type ServiceBusTopicHandler<T = any> = (
  context: AzureFunctionContext,
  message: ServiceBusMessage<T>
) => Promise<void> | void;

// ----------------------------------------------------------------------------
// Event Hub Trigger
// ----------------------------------------------------------------------------

/**
 * Event Hub event for Event Hub triggers.
 *
 * @remarks
 * Represents an event from Azure Event Hubs with partition and sequence information.
 */
export interface EventHubEvent<T = any> {
  /**
   * Event body (automatically deserialized from JSON if applicable).
   */
  readonly body: T;

  /**
   * Partition key used to route the event to a specific partition.
   */
  readonly partitionKey?: string;

  /**
   * Unique sequence number within the partition.
   */
  readonly sequenceNumber: number;

  /**
   * Offset of the event in the partition.
   */
  readonly offset: string;

  /**
   * Time when the event was enqueued.
   */
  readonly enqueuedTime: Date;

  /**
   * Application-defined properties.
   */
  readonly properties: Record<string, any>;

  /**
   * System properties set by Event Hubs.
   */
  readonly systemProperties: Record<string, any>;
}

/**
 * Event Hub handler function type for batch processing.
 *
 * @typeParam T - Event body type (defaults to any)
 *
 * @remarks
 * Processes batches of events from Event Hubs. Batch size is configurable.
 * Events are processed in order within a partition.
 *
 * @example
 * Basic Event Hub handler:
 * ```typescript
 * export const handler: EventHubHandler<{ temperature: number }> = async (context, events) => {
 *   context.log.info(`Processing ${events.length} events`);
 *
 *   for (const event of events) {
 *     context.log.info(`Temperature: ${event.body.temperature}`);
 *   }
 * };
 * ```
 *
 * @example
 * With partition tracking:
 * ```typescript
 * export const handler: EventHubHandler = async (context, events) => {
 *   const partitionKey = events[0]?.partitionKey;
 *   const sequenceNumbers = events.map(e => e.sequenceNumber);
 *
 *   context.log.info(`Processing partition ${partitionKey}, sequences: ${sequenceNumbers}`);
 *
 *   // Process batch
 * };
 * ```
 */
export type EventHubHandler<T = any> = (
  context: AzureFunctionContext,
  events: readonly EventHubEvent<T>[]
) => Promise<void> | void;

// ----------------------------------------------------------------------------
// Cosmos DB Trigger
// ----------------------------------------------------------------------------

/**
 * Cosmos DB document for change feed triggers.
 *
 * @typeParam T - Document type (defaults to any)
 *
 * @remarks
 * Represents a document from Cosmos DB change feed. The document includes
 * system properties (_ts, _etag, _rid, etc.) along with user-defined properties.
 */
export interface CosmosDocument<T = any> {
  /**
   * Document ID.
   */
  readonly id: string;

  /**
   * Partition key value.
   */
  readonly _partitionKey?: string;

  /**
   * Timestamp of the last update (epoch seconds).
   */
  readonly _ts: number;

  /**
   * Entity tag for optimistic concurrency.
   */
  readonly _etag: string;

  /**
   * Resource ID.
   */
  readonly _rid?: string;

  /**
   * Self-link for the document.
   */
  readonly _self?: string;

  /**
   * Attachments link.
   */
  readonly _attachments?: string;

  /**
   * User-defined document properties.
   */
  readonly [key: string]: any;
}

/**
 * Cosmos DB change feed handler function type.
 *
 * @typeParam T - Document type (defaults to any)
 *
 * @remarks
 * Processes batches of changed documents from Cosmos DB change feed.
 * Useful for reacting to data changes, synchronization, and event sourcing.
 *
 * @example
 * Basic Cosmos DB handler:
 * ```typescript
 * interface UserDocument {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * export const handler: CosmosDBHandler<UserDocument> = async (context, documents) => {
 *   context.log.info(`Processing ${documents.length} changed documents`);
 *
 *   for (const doc of documents) {
 *     context.log.info(`User ${doc.id} updated: ${doc.name}`);
 *   }
 * };
 * ```
 *
 * @example
 * With timestamp tracking:
 * ```typescript
 * export const handler: CosmosDBHandler = async (context, documents) => {
 *   const timestamps = documents.map(doc => new Date(doc._ts * 1000));
 *   context.log.info(`Latest change: ${Math.max(...timestamps.map(t => t.getTime()))}`);
 *
 *   // Process changes
 * };
 * ```
 */
export type CosmosDBHandler<T = any> = (
  context: AzureFunctionContext,
  documents: readonly CosmosDocument<T>[]
) => Promise<void> | void;

// ----------------------------------------------------------------------------
// Event Grid Trigger
// ----------------------------------------------------------------------------

/**
 * Event Grid event for Event Grid triggers.
 *
 * @typeParam T - Event data type (defaults to any)
 *
 * @remarks
 * Represents an event from Azure Event Grid with CloudEvents schema support.
 */
export interface EventGridEvent<T = any> {
  /**
   * Unique event identifier.
   */
  readonly id: string;

  /**
   * Full resource path to the event source.
   */
  readonly topic: string;

  /**
   * Publisher-defined path to the event subject.
   */
  readonly subject: string;

  /**
   * Registered event type for this event source.
   */
  readonly eventType: string;

  /**
   * Time the event was generated (ISO 8601 format).
   */
  readonly eventTime: Date;

  /**
   * Event-specific data.
   */
  readonly data: T;

  /**
   * Schema version of the data object.
   */
  readonly dataVersion: string;

  /**
   * Schema version of the event metadata.
   */
  readonly metadataVersion: string;
}

/**
 * Event Grid handler function type.
 *
 * @typeParam T - Event data type (defaults to any)
 *
 * @remarks
 * Processes events from Azure Event Grid. Supports both Event Grid schema
 * and CloudEvents schema.
 *
 * @example
 * Basic Event Grid handler:
 * ```typescript
 * export const handler: EventGridHandler<{ fileName: string }> = async (context, event) => {
 *   context.log.info(`Event type: ${event.eventType}`);
 *   context.log.info(`Subject: ${event.subject}`);
 *   context.log.info(`File: ${event.data.fileName}`);
 *
 *   // Process event
 * };
 * ```
 *
 * @example
 * Blob storage events:
 * ```typescript
 * interface BlobCreatedData {
 *   api: string;
 *   clientRequestId: string;
 *   requestId: string;
 *   eTag: string;
 *   contentType: string;
 *   contentLength: number;
 *   blobType: string;
 *   url: string;
 * }
 *
 * export const handler: EventGridHandler<BlobCreatedData> = async (context, event) => {
 *   if (event.eventType === 'Microsoft.Storage.BlobCreated') {
 *     context.log.info(`New blob: ${event.data.url}`);
 *   }
 * };
 * ```
 */
export type EventGridHandler<T = any> = (
  context: AzureFunctionContext,
  event: EventGridEvent<T>
) => Promise<void> | void;

// ============================================================================
// PRIORITY 2: IOT & REAL-TIME (2 handlers)
// ============================================================================

// ----------------------------------------------------------------------------
// IoT Hub Trigger
// ----------------------------------------------------------------------------

/**
 * IoT Hub system properties.
 *
 * @remarks
 * System-generated properties for IoT Hub messages, including device
 * identity and authentication information.
 */
export interface IoTHubSystemProperties {
  /**
   * Device ID that sent the message.
   */
  readonly connectionDeviceId: string;

  /**
   * Authentication method used by the device.
   */
  readonly connectionAuthMethod: string;

  /**
   * Device generation ID for lifecycle tracking.
   */
  readonly connectionDeviceGenerationId: string;

  /**
   * Time when the message was enqueued.
   */
  readonly enqueuedTime: Date;

  /**
   * IoT Hub name that received the message.
   */
  readonly iothubName?: string;

  /**
   * Message source (e.g., 'Telemetry', 'TwinChangeEvents').
   */
  readonly messageSource?: string;

  /**
   * Module ID if message is from an IoT Edge module.
   */
  readonly connectionModuleId?: string;
}

/**
 * IoT Hub message for IoT Hub triggers.
 *
 * @typeParam T - Message body type (defaults to any)
 *
 * @remarks
 * Represents a message from an IoT device, including telemetry data,
 * system properties, and custom application properties.
 */
export interface IoTHubMessage<T = any> {
  /**
   * Message body (typically telemetry data).
   */
  readonly body: T;

  /**
   * Device ID that sent the message.
   */
  readonly deviceId: string;

  /**
   * Message identifier.
   */
  readonly messageId: string;

  /**
   * Time when the message was enqueued in IoT Hub.
   */
  readonly enqueuedTime: Date;

  /**
   * Application-defined properties.
   */
  readonly properties: Record<string, any>;

  /**
   * System properties set by IoT Hub.
   */
  readonly systemProperties: IoTHubSystemProperties;

  /**
   * Correlation ID for tracking related messages.
   */
  readonly correlationId?: string;

  /**
   * Content type of the message body.
   */
  readonly contentType?: string;

  /**
   * Content encoding (e.g., 'utf-8').
   */
  readonly contentEncoding?: string;

  /**
   * Partition key for routing.
   */
  readonly partitionKey?: string;

  /**
   * Sequence number assigned by IoT Hub.
   */
  readonly sequenceNumber?: number;
}

/**
 * IoT Hub handler function type for batch processing.
 *
 * @typeParam T - Message body type (defaults to any)
 *
 * @remarks
 * Processes batches of messages from IoT Hub. Useful for telemetry processing,
 * device-to-cloud communications, and IoT analytics.
 *
 * @example
 * Basic IoT Hub handler:
 * ```typescript
 * interface TelemetryData {
 *   temperature: number;
 *   humidity: number;
 *   pressure: number;
 * }
 *
 * export const handler: IoTHubHandler<TelemetryData> = async (context, messages) => {
 *   context.log.info(`Processing ${messages.length} telemetry messages`);
 *
 *   for (const msg of messages) {
 *     context.log.info(`Device ${msg.deviceId}: Temp=${msg.body.temperature}°C`);
 *   }
 * };
 * ```
 *
 * @example
 * With filtering by device:
 * ```typescript
 * export const handler: IoTHubHandler = async (context, messages) => {
 *   const criticalDevices = messages.filter(msg =>
 *     msg.properties['alertLevel'] === 'critical'
 *   );
 *
 *   if (criticalDevices.length > 0) {
 *     context.log.warn(`${criticalDevices.length} critical alerts`);
 *   }
 * };
 * ```
 */
export type IoTHubHandler<T = any> = (
  context: AzureFunctionContext,
  messages: readonly IoTHubMessage<T>[]
) => Promise<void> | void;

// ----------------------------------------------------------------------------
// SignalR Trigger
// ----------------------------------------------------------------------------

/**
 * SignalR connection information.
 *
 * @remarks
 * Contains the connection URL and access token for SignalR clients.
 */
export interface SignalRConnectionInfo {
  /**
   * SignalR service endpoint URL.
   */
  readonly url: string;

  /**
   * Access token for authentication.
   */
  readonly accessToken: string;

  /**
   * Token expiration time.
   */
  readonly expiresAt?: Date;
}

/**
 * SignalR negotiation handler function type.
 *
 * @remarks
 * Handles SignalR connection negotiation requests. This handler is typically
 * used with HTTP trigger to provide connection information to clients.
 *
 * @example
 * Basic SignalR negotiation:
 * ```typescript
 * export const handler: SignalRNegotiateHandler = async (context, req) => {
 *   const userId = req.user?.id;
 *
 *   if (!userId) {
 *     return { status: 401, body: { error: 'Unauthorized' } };
 *   }
 *
 *   // Connection info is automatically bound via SignalR input binding
 *   const connectionInfo: SignalRConnectionInfo = context.bindings.connectionInfo;
 *
 *   return {
 *     status: 200,
 *     body: connectionInfo
 *   };
 * };
 * ```
 *
 * @example
 * With user ID claim:
 * ```typescript
 * export const handler: SignalRNegotiateHandler = async (context, req) => {
 *   const userId = req.headers['x-ms-client-principal-id'];
 *
 *   context.log.info(`Negotiating SignalR connection for user: ${userId}`);
 *
 *   // SignalR binding automatically includes userId in connection
 *   return {
 *     status: 200,
 *     body: context.bindings.connectionInfo
 *   };
 * };
 * ```
 */
export type SignalRNegotiateHandler = HttpHandler;

// ============================================================================
// PRIORITY 3: THIRD-PARTY (3 handlers)
// ============================================================================

// ----------------------------------------------------------------------------
// Kafka Trigger
// ----------------------------------------------------------------------------

/**
 * Kafka event for Kafka triggers.
 *
 * @typeParam T - Message value type (defaults to any)
 *
 * @remarks
 * Represents a Kafka message with topic, partition, offset, and header information.
 */
export interface KafkaEvent<T = any> {
  /**
   * Kafka topic name.
   */
  readonly topic: string;

  /**
   * Partition number.
   */
  readonly partition: number;

  /**
   * Message offset within the partition.
   */
  readonly offset: number;

  /**
   * Message timestamp (milliseconds since epoch).
   */
  readonly timestamp: number;

  /**
   * Message key (for partitioning and compaction).
   */
  readonly key: string | null;

  /**
   * Message value (automatically deserialized from JSON if applicable).
   */
  readonly value: T;

  /**
   * Message headers.
   */
  readonly headers: Record<string, string>;
}

/**
 * Kafka handler function type for batch processing.
 *
 * @typeParam T - Message value type (defaults to any)
 *
 * @remarks
 * Processes batches of messages from Apache Kafka topics. Supports consumer
 * groups, offset management, and partition assignment.
 *
 * @example
 * Basic Kafka handler:
 * ```typescript
 * interface OrderEvent {
 *   orderId: string;
 *   customerId: string;
 *   amount: number;
 * }
 *
 * export const handler: KafkaHandler<OrderEvent> = async (context, events) => {
 *   context.log.info(`Processing ${events.length} Kafka events`);
 *
 *   for (const event of events) {
 *     context.log.info(`Order ${event.value.orderId}: $${event.value.amount}`);
 *   }
 * };
 * ```
 *
 * @example
 * With partition tracking:
 * ```typescript
 * export const handler: KafkaHandler = async (context, events) => {
 *   const partitions = new Set(events.map(e => e.partition));
 *   context.log.info(`Processing events from partitions: ${Array.from(partitions)}`);
 *
 *   // Group by partition for ordered processing
 *   const byPartition = events.reduce((acc, event) => {
 *     (acc[event.partition] = acc[event.partition] || []).push(event);
 *     return acc;
 *   }, {} as Record<number, KafkaEvent[]>);
 * };
 * ```
 */
export type KafkaHandler<T = any> = (
  context: AzureFunctionContext,
  events: readonly KafkaEvent<T>[]
) => Promise<void> | void;

// ----------------------------------------------------------------------------
// RabbitMQ Trigger
// ----------------------------------------------------------------------------

/**
 * RabbitMQ message properties.
 *
 * @remarks
 * AMQP message properties for RabbitMQ messages, including headers,
 * delivery mode, priority, and routing information.
 */
export interface RabbitMQProperties {
  /**
   * MIME content type.
   */
  readonly contentType?: string;

  /**
   * Content encoding (e.g., 'gzip').
   */
  readonly contentEncoding?: string;

  /**
   * Application-defined headers.
   */
  readonly headers?: Record<string, any>;

  /**
   * Delivery mode (1=non-persistent, 2=persistent).
   */
  readonly deliveryMode?: 1 | 2;

  /**
   * Message priority (0-9).
   */
  readonly priority?: number;

  /**
   * Correlation identifier for RPC patterns.
   */
  readonly correlationId?: string;

  /**
   * Address to reply to.
   */
  readonly replyTo?: string;

  /**
   * Message expiration time (milliseconds).
   */
  readonly expiration?: string;

  /**
   * Application message identifier.
   */
  readonly messageId?: string;

  /**
   * Message timestamp.
   */
  readonly timestamp?: Date;

  /**
   * Message type name.
   */
  readonly type?: string;

  /**
   * Creating user ID.
   */
  readonly userId?: string;

  /**
   * Creating application ID.
   */
  readonly appId?: string;

  /**
   * Cluster ID (reserved).
   */
  readonly clusterId?: string;
}

/**
 * RabbitMQ message for RabbitMQ triggers.
 *
 * @typeParam T - Message body type (defaults to any)
 *
 * @remarks
 * Represents a message from RabbitMQ with AMQP properties and routing information.
 */
export interface RabbitMQMessage<T = any> {
  /**
   * Message body (automatically deserialized from JSON if applicable).
   */
  readonly body: T;

  /**
   * Delivery tag for acknowledgment.
   */
  readonly deliveryTag: number;

  /**
   * Whether this message was redelivered after rejection.
   */
  readonly redelivered: boolean;

  /**
   * Exchange name.
   */
  readonly exchange: string;

  /**
   * Routing key used for message routing.
   */
  readonly routingKey: string;

  /**
   * AMQP message properties.
   */
  readonly properties: RabbitMQProperties;

  /**
   * Consumer tag.
   */
  readonly consumerTag?: string;
}

/**
 * RabbitMQ handler function type.
 *
 * @typeParam T - Message body type (defaults to any)
 *
 * @remarks
 * Processes messages from RabbitMQ queues. Supports automatic acknowledgment
 * and dead-letter handling.
 *
 * @example
 * Basic RabbitMQ handler:
 * ```typescript
 * interface TaskMessage {
 *   taskId: string;
 *   action: string;
 *   payload: any;
 * }
 *
 * export const handler: RabbitMQHandler<TaskMessage> = async (context, message) => {
 *   context.log.info(`Processing task: ${message.body.taskId}`);
 *   context.log.info(`Routing key: ${message.routingKey}`);
 *
 *   if (message.redelivered) {
 *     context.log.warn('Message was redelivered');
 *   }
 *
 *   // Process message
 * };
 * ```
 *
 * @example
 * With priority handling:
 * ```typescript
 * export const handler: RabbitMQHandler = async (context, message) => {
 *   const priority = message.properties.priority || 0;
 *
 *   if (priority > 5) {
 *     context.log.info('Processing high-priority message');
 *   }
 *
 *   // Process based on priority
 * };
 * ```
 */
export type RabbitMQHandler<T = any> = (
  context: AzureFunctionContext,
  message: RabbitMQMessage<T>
) => Promise<void> | void;

// ----------------------------------------------------------------------------
// Redis Stream Trigger
// ----------------------------------------------------------------------------

/**
 * Redis stream entry for Redis Stream triggers.
 *
 * @remarks
 * Represents an entry from a Redis Stream with ID and field-value pairs.
 */
export interface RedisStreamEntry {
  /**
   * Entry ID (format: timestamp-sequence).
   */
  readonly id: string;

  /**
   * Field-value pairs in the stream entry.
   *
   * @remarks
   * Redis stores all values as strings; parse as needed.
   */
  readonly values: Record<string, string>;
}

/**
 * Redis Stream handler function type for batch processing.
 *
 * @remarks
 * Processes batches of entries from Redis Streams. Useful for event sourcing,
 * activity feeds, and real-time data processing.
 *
 * @example
 * Basic Redis Stream handler:
 * ```typescript
 * export const handler: RedisStreamHandler = async (context, entries) => {
 *   context.log.info(`Processing ${entries.length} stream entries`);
 *
 *   for (const entry of entries) {
 *     const eventType = entry.values['eventType'];
 *     const payload = JSON.parse(entry.values['payload']);
 *
 *     context.log.info(`Event ${entry.id}: ${eventType}`);
 *   }
 * };
 * ```
 *
 * @example
 * With typed parsing:
 * ```typescript
 * interface StreamEvent {
 *   eventType: string;
 *   userId: string;
 *   data: any;
 * }
 *
 * export const handler: RedisStreamHandler = async (context, entries) => {
 *   const events: StreamEvent[] = entries.map(entry => ({
 *     eventType: entry.values['eventType'],
 *     userId: entry.values['userId'],
 *     data: JSON.parse(entry.values['data'])
 *   }));
 *
 *   // Process typed events
 * };
 * ```
 */
export type RedisStreamHandler = (
  context: AzureFunctionContext,
  entries: readonly RedisStreamEntry[]
) => Promise<void> | void;

// ============================================================================
// PRIORITY 4: DURABLE FUNCTIONS (3 handlers)
// ============================================================================

// ----------------------------------------------------------------------------
// Durable Orchestrator
// ----------------------------------------------------------------------------

/**
 * Durable orchestration context for orchestrator functions.
 *
 * @remarks
 * Provides orchestration capabilities including activity invocation,
 * sub-orchestrations, timers, and external event handling.
 */
export interface DurableOrchestrationContext extends AzureFunctionContext {
  /**
   * Unique instance ID for this orchestration.
   */
  readonly instanceId: string;

  /**
   * Current UTC date/time (deterministic).
   *
   * @remarks
   * Always use this instead of Date.now() or new Date() for deterministic replay.
   */
  readonly currentUtcDateTime: Date;

  /**
   * Whether this orchestration is currently replaying.
   *
   * @remarks
   * Use this to avoid side effects during replay (e.g., logging, external calls).
   */
  readonly isReplaying: boolean;

  /**
   * Input provided when the orchestration was started.
   */
  readonly input: any;

  /**
   * Call an activity function.
   *
   * @typeParam TInput - Activity input type
   * @typeParam TOutput - Activity output type
   * @param name - Name of the activity function
   * @param input - Input to pass to the activity
   * @returns Promise that resolves to the activity result
   *
   * @example
   * ```typescript
   * const result = await context.callActivity<string, number>('ProcessItem', 'item-123');
   * ```
   */
  callActivity<TInput = any, TOutput = any>(name: string, input?: TInput): Promise<TOutput>;

  /**
   * Call a sub-orchestrator function.
   *
   * @typeParam TInput - Sub-orchestrator input type
   * @typeParam TOutput - Sub-orchestrator output type
   * @param name - Name of the sub-orchestrator function
   * @param input - Input to pass to the sub-orchestrator
   * @param instanceId - Optional instance ID for the sub-orchestrator
   * @returns Promise that resolves to the sub-orchestrator result
   */
  callSubOrchestrator<TInput = any, TOutput = any>(
    name: string,
    input?: TInput,
    instanceId?: string
  ): Promise<TOutput>;

  /**
   * Create a durable timer.
   *
   * @param fireAt - UTC time when the timer should fire
   * @returns Promise that resolves when the timer fires
   *
   * @example
   * ```typescript
   * const deadline = new Date(context.currentUtcDateTime.getTime() + 60000);
   * await context.createTimer(deadline);
   * ```
   */
  createTimer(fireAt: Date): Promise<void>;

  /**
   * Wait for an external event.
   *
   * @typeParam T - Event data type
   * @param name - Name of the event to wait for
   * @returns Promise that resolves with the event data
   *
   * @example
   * ```typescript
   * const approval = await context.waitForExternalEvent<boolean>('Approval');
   * ```
   */
  waitForExternalEvent<T = any>(name: string): Promise<T>;

  /**
   * Continue as new with different input.
   *
   * @param input - New input for the orchestration
   *
   * @remarks
   * Restarts the orchestration with new input, useful for long-running workflows.
   */
  continueAsNew(input: any): void;
}

/**
 * Durable orchestrator handler function type.
 *
 * @typeParam TInput - Orchestration input type
 * @typeParam TOutput - Orchestration output type
 *
 * @remarks
 * Defines a durable orchestration workflow. Orchestrators must be deterministic
 * and use only the context APIs for non-deterministic operations.
 *
 * @example
 * Basic orchestrator:
 * ```typescript
 * interface OrderInput {
 *   orderId: string;
 *   items: string[];
 * }
 *
 * export const handler: DurableOrchestratorHandler<OrderInput, string> = function* (context) {
 *   const { orderId, items } = context.input;
 *
 *   // Reserve inventory
 *   yield context.callActivity('ReserveInventory', { orderId, items });
 *
 *   // Process payment
 *   const paymentResult = yield context.callActivity('ProcessPayment', orderId);
 *
 *   if (paymentResult.success) {
 *     // Ship order
 *     yield context.callActivity('ShipOrder', orderId);
 *     return 'Order completed';
 *   } else {
 *     // Release inventory
 *     yield context.callActivity('ReleaseInventory', { orderId, items });
 *     return 'Order failed';
 *   }
 * };
 * ```
 *
 * @example
 * With timers and external events:
 * ```typescript
 * export const handler: DurableOrchestratorHandler = function* (context) {
 *   // Wait for approval or timeout
 *   const approvalTask = context.waitForExternalEvent<boolean>('Approval');
 *   const timeoutTask = context.createTimer(
 *     new Date(context.currentUtcDateTime.getTime() + 3600000)
 *   );
 *
 *   const winner = yield Promise.race([approvalTask, timeoutTask]);
 *
 *   if (winner === true) {
 *     return yield context.callActivity('ProcessApproval');
 *   } else {
 *     return 'Approval timeout';
 *   }
 * };
 * ```
 */
export type DurableOrchestratorHandler<TInput = any, TOutput = any> = (
  context: DurableOrchestrationContext
) => Generator<any, TOutput, any>;

// ----------------------------------------------------------------------------
// Durable Activity
// ----------------------------------------------------------------------------

/**
 * Durable activity handler function type.
 *
 * @typeParam TInput - Activity input type
 * @typeParam TOutput - Activity output type
 *
 * @remarks
 * Defines an activity function that performs actual work in a durable workflow.
 * Activities can perform non-deterministic operations and side effects.
 *
 * @example
 * Basic activity:
 * ```typescript
 * interface InventoryInput {
 *   orderId: string;
 *   items: string[];
 * }
 *
 * export const handler: DurableActivityHandler<InventoryInput, boolean> = async (context, input) => {
 *   context.log.info(`Reserving inventory for order ${input.orderId}`);
 *
 *   // Call external API or database
 *   const available = await checkInventory(input.items);
 *
 *   if (available) {
 *     await reserveItems(input.orderId, input.items);
 *     return true;
 *   }
 *
 *   return false;
 * };
 * ```
 *
 * @example
 * With retry logic:
 * ```typescript
 * export const handler: DurableActivityHandler<string, any> = async (context, orderId) => {
 *   const retryCount = context.executionContext.retryContext?.retryCount || 0;
 *
 *   if (retryCount > 0) {
 *     context.log.warn(`Retry attempt ${retryCount}`);
 *   }
 *
 *   try {
 *     return await processPayment(orderId);
 *   } catch (error) {
 *     context.log.error('Payment processing failed', error);
 *     throw error; // Will trigger retry policy
 *   }
 * };
 * ```
 */
export type DurableActivityHandler<TInput = any, TOutput = any> = (
  context: AzureFunctionContext,
  input: TInput
) => Promise<TOutput> | TOutput;

// ----------------------------------------------------------------------------
// Durable Entity
// ----------------------------------------------------------------------------

/**
 * Durable entity context for entity functions.
 *
 * @remarks
 * Provides entity state management and signaling capabilities for
 * stateful serverless entities.
 */
export interface DurableEntityContext extends AzureFunctionContext {
  /**
   * Entity name.
   */
  readonly entityName: string;

  /**
   * Entity key (unique identifier).
   */
  readonly entityKey: string;

  /**
   * Operation being invoked (if any).
   */
  readonly operationName?: string;

  /**
   * Get the current entity state.
   *
   * @typeParam T - State type
   * @returns Current state or undefined if not initialized
   */
  getState<T = any>(): T | undefined;

  /**
   * Set the entity state.
   *
   * @typeParam T - State type
   * @param state - New state to set
   */
  setState<T = any>(state: T): void;

  /**
   * Delete the entity state.
   */
  deleteState(): void;

  /**
   * Signal another entity.
   *
   * @param entityId - Target entity ID
   * @param operationName - Operation to invoke
   * @param input - Input to pass to the operation
   */
  signalEntity(entityId: string, operationName: string, input?: any): void;

  /**
   * Get the operation input.
   *
   * @typeParam T - Input type
   * @returns Operation input
   */
  getInput<T = any>(): T;
}

/**
 * Durable entity handler function type.
 *
 * @typeParam TState - Entity state type
 *
 * @remarks
 * Defines a durable entity that maintains state across invocations.
 * Entities support operations that can read and modify state.
 *
 * @example
 * Counter entity:
 * ```typescript
 * interface CounterState {
 *   value: number;
 * }
 *
 * export const handler: DurableEntityHandler<CounterState> = async (context) => {
 *   const state = context.getState<CounterState>() || { value: 0 };
 *
 *   switch (context.operationName) {
 *     case 'increment':
 *       state.value++;
 *       break;
 *     case 'decrement':
 *       state.value--;
 *       break;
 *     case 'add':
 *       const amount = context.getInput<number>();
 *       state.value += amount;
 *       break;
 *     case 'reset':
 *       state.value = 0;
 *       break;
 *     case 'get':
 *       return state.value;
 *     case 'delete':
 *       context.deleteState();
 *       return;
 *   }
 *
 *   context.setState(state);
 * };
 * ```
 *
 * @example
 * Shopping cart entity:
 * ```typescript
 * interface CartState {
 *   items: Array<{ id: string; quantity: number }>;
 *   customerId: string;
 * }
 *
 * export const handler: DurableEntityHandler<CartState> = async (context) => {
 *   const state = context.getState<CartState>();
 *
 *   switch (context.operationName) {
 *     case 'addItem':
 *       const item = context.getInput<{ id: string; quantity: number }>();
 *       const existing = state.items.find(i => i.id === item.id);
 *       if (existing) {
 *         existing.quantity += item.quantity;
 *       } else {
 *         state.items.push(item);
 *       }
 *       break;
 *     case 'removeItem':
 *       const itemId = context.getInput<string>();
 *       state.items = state.items.filter(i => i.id !== itemId);
 *       break;
 *     case 'clear':
 *       state.items = [];
 *       break;
 *     case 'getTotal':
 *       return state.items.reduce((sum, item) => sum + item.quantity, 0);
 *   }
 *
 *   context.setState(state);
 * };
 * ```
 */
export type DurableEntityHandler<TState = any> = (
  context: DurableEntityContext
) => Promise<any> | any;

// ============================================================================
// UNION TYPES
// ============================================================================

/**
 * Union type for all Azure Function handler types.
 *
 * @remarks
 * Represents any valid Azure Function handler. Use specific handler types
 * for better type safety when possible.
 */
export type AnyFunctionHandler =
  | HttpHandler
  | TimerHandler
  | QueueHandler
  | BlobHandler
  | ServiceBusQueueHandler
  | ServiceBusTopicHandler
  | EventHubHandler
  | CosmosDBHandler
  | EventGridHandler
  | IoTHubHandler
  | SignalRNegotiateHandler
  | KafkaHandler
  | RabbitMQHandler
  | RedisStreamHandler
  | DurableOrchestratorHandler
  | DurableActivityHandler
  | DurableEntityHandler;
