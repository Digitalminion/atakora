# Azure Functions Handler Types Reference

Complete reference documentation for all 18 Azure Functions handler types available in Atakora.

## Overview

Atakora provides type-safe TypeScript handler interfaces for all Azure Functions trigger types, organized by priority:

- **Core Triggers (9)**: HTTP, Timer, Queue, Blob, Service Bus (Queue & Topic), Event Hub, Cosmos DB, Event Grid
- **IoT & Real-time (2)**: IoT Hub, SignalR
- **Third-Party (3)**: Kafka, RabbitMQ, Redis Stream
- **Durable Functions (3)**: Orchestrator, Activity, Entity

## Import

```typescript
import {
  // Core triggers
  HttpHandler,
  TimerHandler,
  QueueHandler,
  BlobHandler,
  ServiceBusQueueHandler,
  ServiceBusTopicHandler,
  EventHubHandler,
  CosmosDBHandler,
  EventGridHandler,

  // IoT & Real-time
  IoTHubHandler,
  SignalRNegotiateHandler,

  // Third-party
  KafkaHandler,
  RabbitMQHandler,
  RedisStreamHandler,

  // Durable Functions
  DurableOrchestratorHandler,
  DurableActivityHandler,
  DurableEntityHandler,
} from '@atakora/cdk/functions';
```

## Core Triggers (Priority 1)

### HttpHandler

Handles HTTP requests with full method and authentication support.

**Type Signature:**
```typescript
type HttpHandler = (
  context: AzureFunctionContext,
  req: HttpRequest
) => Promise<HttpResponse> | HttpResponse;
```

**Use Cases:** REST APIs, webhooks, web applications

**Example:**
```typescript
import { HttpHandler } from '@atakora/cdk/functions';

export const handler: HttpHandler = async (context, req) => {
  const { method, query, params, body, user } = req;

  // Authentication check
  if (!user) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  // Route by method
  if (method === 'GET') {
    return {
      status: 200,
      body: { userId: user.id, data: await fetchData(params.id) }
    };
  }

  if (method === 'POST') {
    return {
      status: 201,
      body: { created: true, id: await createResource(body) }
    };
  }

  return { status: 405, body: { error: 'Method not allowed' } };
};
```

**Types:**
```typescript
interface HttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly query: Record<string, string>;
  readonly params: Record<string, string>;
  readonly body?: any;
  readonly user?: {
    readonly id: string;
    readonly roles?: string[];
    readonly claims?: Record<string, any>;
  };
}

interface HttpResponse {
  readonly status: number;
  readonly headers?: Record<string, string>;
  readonly cookies?: Array<{ name: string; value: string; options?: any }>;
  readonly body?: any;
}
```

---

### TimerHandler

Executes on a schedule defined by CRON expressions.

**Type Signature:**
```typescript
type TimerHandler = (
  context: AzureFunctionContext,
  timer: TimerInfo
) => Promise<void> | void;
```

**Use Cases:** Scheduled tasks, batch processing, cleanup jobs

**Example:**
```typescript
import { TimerHandler } from '@atakora/cdk/functions';

export const handler: TimerHandler = async (context, timer) => {
  context.log.info(`Last run: ${timer.scheduleStatus.last}`);
  context.log.info(`Next run: ${timer.scheduleStatus.next}`);

  if (timer.isPastDue) {
    context.log.warn('Timer is past due - catching up');
  }

  // Perform scheduled work
  await cleanupExpiredRecords();
  await generateDailyReport();
};
```

**Types:**
```typescript
interface TimerInfo {
  readonly isPastDue: boolean;
  readonly scheduleStatus: {
    readonly last: string;
    readonly next: string;
    readonly lastUpdated: string;
  };
  readonly schedule: {
    readonly adjustForDST: boolean;
  };
}
```

---

### QueueHandler

Processes messages from Azure Storage Queues.

**Type Signature:**
```typescript
type QueueHandler<T = any> = (
  context: AzureFunctionContext,
  message: QueueMessage<T>
) => Promise<void> | void;
```

**Use Cases:** Asynchronous task processing, decoupled architectures, work queues

**Example:**
```typescript
import { QueueHandler } from '@atakora/cdk/functions';

interface OrderMessage {
  orderId: string;
  customerId: string;
  items: Array<{ sku: string; quantity: number }>;
}

export const handler: QueueHandler<OrderMessage> = async (context, message) => {
  const { orderId, customerId, items } = message.body;

  context.log.info(`Processing order ${orderId} for customer ${customerId}`);

  // Check retry count
  if (message.dequeueCount > 3) {
    context.log.warn('Max retries exceeded, failing message');
    throw new Error('Processing failed after retries');
  }

  // Process order
  await processOrder(orderId, items);
};
```

**Types:**
```typescript
interface QueueMessage<T = any> {
  readonly id: string;
  readonly body: T;
  readonly popReceipt: string;
  readonly insertionTime: string;
  readonly expirationTime: string;
  readonly nextVisibleTime: string;
  readonly dequeueCount: number;
}
```

---

### BlobHandler

Triggered by blob creation/updates in Azure Storage.

**Type Signature:**
```typescript
type BlobHandler = (
  context: AzureFunctionContext,
  blob: BlobItem
) => Promise<void> | void;
```

**Use Cases:** File processing, image manipulation, document parsing, ETL pipelines

**Example:**
```typescript
import { BlobHandler } from '@atakora/cdk/functions';

export const handler: BlobHandler = async (context, blob) => {
  context.log.info(`Processing blob: ${blob.name}`);
  context.log.info(`Size: ${blob.properties.contentLength} bytes`);
  context.log.info(`Type: ${blob.properties.contentType}`);

  // Process based on content type
  if (blob.properties.contentType.startsWith('image/')) {
    const imageData = blob.content as Buffer;
    await processImage(imageData, blob.name);
  } else if (blob.properties.contentType === 'application/json') {
    const jsonData = JSON.parse(blob.content.toString());
    await processJsonData(jsonData);
  }
};
```

**Types:**
```typescript
interface BlobItem {
  readonly name: string;
  readonly uri: string;
  readonly properties: BlobProperties;
  readonly content: Buffer | string;
  readonly metadata?: Record<string, string>;
}

interface BlobProperties {
  readonly contentLength: number;
  readonly contentType: string;
  readonly etag: string;
  readonly lastModified: string;
  readonly blobType: 'BlockBlob' | 'PageBlob' | 'AppendBlob';
}
```

---

### ServiceBusQueueHandler

Processes messages from Service Bus queues with guaranteed delivery.

**Type Signature:**
```typescript
type ServiceBusQueueHandler<T = any> = (
  context: AzureFunctionContext,
  message: ServiceBusMessage<T>
) => Promise<void> | void;
```

**Use Cases:** Reliable messaging, transaction processing, ordered message processing

**Example:**
```typescript
import { ServiceBusQueueHandler } from '@atakora/cdk/functions';

interface TaskMessage {
  taskId: string;
  taskType: 'process' | 'verify' | 'complete';
  priority: number;
}

export const handler: ServiceBusQueueHandler<TaskMessage> = async (context, message) => {
  const { taskId, taskType, priority } = message.body;

  context.log.info(`Task ${taskId}: ${taskType} (priority: ${priority})`);

  // Session-based processing
  if (message.sessionId) {
    context.log.info(`Processing in session: ${message.sessionId}`);
  }

  // Correlation tracking
  if (message.correlationId) {
    context.log.info(`Correlation ID: ${message.correlationId}`);
  }

  // Execute task
  await executeTask(taskId, taskType);
};
```

**Types:**
```typescript
interface ServiceBusMessage<T = any> {
  readonly messageId: string;
  readonly body: T;
  readonly contentType?: string;
  readonly label?: string;
  readonly correlationId?: string;
  readonly sessionId?: string;
  readonly replyTo?: string;
  readonly timeToLive?: number;
  readonly deliveryCount: number;
  readonly enqueuedTime: string;
  readonly sequenceNumber: number;
  readonly properties: Record<string, any>;
}
```

---

### ServiceBusTopicHandler

Processes messages from Service Bus topic subscriptions.

**Type Signature:**
```typescript
type ServiceBusTopicHandler<T = any> = (
  context: AzureFunctionContext,
  message: ServiceBusMessage<T>
) => Promise<void> | void;
```

**Use Cases:** Pub/sub messaging, event broadcasting, fan-out patterns

**Example:**
```typescript
import { ServiceBusTopicHandler } from '@atakora/cdk/functions';

interface EventMessage {
  eventType: string;
  entityId: string;
  timestamp: string;
  data: any;
}

export const handler: ServiceBusTopicHandler<EventMessage> = async (context, message) => {
  const { eventType, entityId, data } = message.body;

  context.log.info(`Event: ${eventType}, Entity: ${entityId}`);
  context.log.info(`Label: ${message.label}`);

  // Filter by custom properties
  const priority = message.properties['priority'] || 0;
  const source = message.properties['source'] || 'unknown';

  if (priority > 5) {
    await processHighPriority(eventType, entityId, data);
  } else {
    await processNormalPriority(eventType, entityId, data);
  }
};
```

---

### EventHubHandler

Processes batches of events from Event Hubs (high-throughput streaming).

**Type Signature:**
```typescript
type EventHubHandler<T = any> = (
  context: AzureFunctionContext,
  events: EventHubEvent<T>[]
) => Promise<void> | void;
```

**Use Cases:** Telemetry ingestion, log aggregation, real-time analytics, stream processing

**Example:**
```typescript
import { EventHubHandler } from '@atakora/cdk/functions';

interface TelemetryEvent {
  deviceId: string;
  temperature: number;
  humidity: number;
  pressure: number;
}

export const handler: EventHubHandler<TelemetryEvent> = async (context, events) => {
  context.log.info(`Processing batch of ${events.length} events`);

  for (const event of events) {
    const { deviceId, temperature, humidity } = event.body;

    context.log.info(`Device ${deviceId}: ${temperature}°C, ${humidity}%`);
    context.log.info(`Partition: ${event.partitionKey}, Sequence: ${event.sequenceNumber}`);

    // Alert on critical conditions
    if (temperature > 100) {
      context.log.warn(`Critical temperature alert for device ${deviceId}`);
      await sendAlert(deviceId, temperature);
    }

    // Store metrics
    await storeMetric(event);
  }
};
```

**Types:**
```typescript
interface EventHubEvent<T = any> {
  readonly body: T;
  readonly partitionKey: string;
  readonly offset: string;
  readonly sequenceNumber: number;
  readonly enqueuedTime: string;
  readonly systemProperties: Record<string, any>;
  readonly properties: Record<string, any>;
}
```

---

### CosmosDBHandler

Processes document changes from Cosmos DB change feed.

**Type Signature:**
```typescript
type CosmosDBHandler<T = any> = (
  context: AzureFunctionContext,
  documents: CosmosDocument<T>[]
) => Promise<void> | void;
```

**Use Cases:** Database change tracking, data synchronization, materialized views, audit logs

**Example:**
```typescript
import { CosmosDBHandler } from '@atakora/cdk/functions';

interface UserDocument {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  updatedAt: string;
}

export const handler: CosmosDBHandler<UserDocument> = async (context, documents) => {
  context.log.info(`Processing ${documents.length} changed documents`);

  for (const doc of documents) {
    context.log.info(`User ${doc.id}: ${doc.name} (${doc.status})`);
    context.log.info(`Updated: ${new Date(doc._ts * 1000).toISOString()}`);

    // React to status changes
    if (doc.status === 'inactive') {
      await archiveUser(doc.id);
      await sendDeactivationEmail(doc.email);
    }

    // Update derived data
    await updateUserSearchIndex(doc);
  }
};
```

**Types:**
```typescript
interface CosmosDocument<T = any> extends T {
  readonly id: string;
  readonly _rid: string;
  readonly _self: string;
  readonly _etag: string;
  readonly _ts: number;
}
```

---

### EventGridHandler

Processes events from Azure Event Grid (event routing).

**Type Signature:**
```typescript
type EventGridHandler<T = any> = (
  context: AzureFunctionContext,
  event: EventGridEvent<T>
) => Promise<void> | void;
```

**Use Cases:** Event-driven automation, resource monitoring, cross-service orchestration

**Example:**
```typescript
import { EventGridHandler } from '@atakora/cdk/functions';

interface BlobCreatedData {
  url: string;
  api: string;
  contentType: string;
  contentLength: number;
}

export const handler: EventGridHandler<BlobCreatedData> = async (context, event) => {
  context.log.info(`Event Type: ${event.eventType}`);
  context.log.info(`Subject: ${event.subject}`);
  context.log.info(`Time: ${event.eventTime}`);

  if (event.eventType === 'Microsoft.Storage.BlobCreated') {
    const { url, contentType, contentLength } = event.data;

    context.log.info(`New blob: ${url}`);
    context.log.info(`Type: ${contentType}, Size: ${contentLength}`);

    // Process based on content type
    if (contentType.startsWith('image/')) {
      await processNewImage(url);
    }
  }
};
```

**Types:**
```typescript
interface EventGridEvent<T = any> {
  readonly id: string;
  readonly eventType: string;
  readonly subject: string;
  readonly eventTime: string;
  readonly data: T;
  readonly dataVersion: string;
  readonly metadataVersion: string;
  readonly topic: string;
}
```

---

## IoT & Real-time (Priority 2)

### IoTHubHandler

Processes batches of messages from IoT devices.

**Type Signature:**
```typescript
type IoTHubHandler<T = any> = (
  context: AzureFunctionContext,
  messages: IoTHubMessage<T>[]
) => Promise<void> | void;
```

**Use Cases:** IoT telemetry processing, device monitoring, sensor data analysis

**Example:**
```typescript
import { IoTHubHandler } from '@atakora/cdk/functions';

interface DeviceTelemetry {
  temperature: number;
  pressure: number;
  vibration: number;
}

export const handler: IoTHubHandler<DeviceTelemetry> = async (context, messages) => {
  context.log.info(`Processing ${messages.length} IoT messages`);

  for (const msg of messages) {
    const { temperature, pressure, vibration } = msg.body;

    context.log.info(`Device ${msg.deviceId}: Temp=${temperature}°C`);
    context.log.info(`Enqueued: ${msg.enqueuedTime}`);

    // Check device health
    if (temperature > 100 || vibration > 5) {
      context.log.warn(`Device ${msg.deviceId} showing critical metrics`);
      await alertMaintenance(msg.deviceId, { temperature, pressure, vibration });
    }

    // Store telemetry
    await storeTelemetry(msg.deviceId, msg.body);
  }
};
```

**Types:**
```typescript
interface IoTHubMessage<T = any> {
  readonly body: T;
  readonly deviceId: string;
  readonly messageId: string;
  readonly enqueuedTime: string;
  readonly correlationId?: string;
  readonly systemProperties: Record<string, any>;
  readonly properties: Record<string, any>;
}
```

---

### SignalRNegotiateHandler

Handles SignalR connection negotiation for real-time communications.

**Type Signature:**
```typescript
type SignalRNegotiateHandler = (
  context: AzureFunctionContext,
  req: HttpRequest
) => Promise<HttpResponse> | HttpResponse;
```

**Use Cases:** Real-time web applications, live dashboards, chat applications

**Example:**
```typescript
import { SignalRNegotiateHandler } from '@atakora/cdk/functions';

export const handler: SignalRNegotiateHandler = async (context, req) => {
  const userId = req.user?.id;

  if (!userId) {
    return {
      status: 401,
      body: { error: 'Unauthorized' }
    };
  }

  // Connection info is automatically bound via SignalR input binding
  return {
    status: 200,
    body: context.bindings.connectionInfo
  };
};
```

---

## Third-Party (Priority 3)

### KafkaHandler

Processes batches of messages from Apache Kafka topics.

**Type Signature:**
```typescript
type KafkaHandler<T = any> = (
  context: AzureFunctionContext,
  events: KafkaEvent<T>[]
) => Promise<void> | void;
```

**Use Cases:** Stream processing, event sourcing, log aggregation

**Example:**
```typescript
import { KafkaHandler } from '@atakora/cdk/functions';

interface OrderEvent {
  orderId: string;
  customerId: string;
  amount: number;
  status: string;
}

export const handler: KafkaHandler<OrderEvent> = async (context, events) => {
  context.log.info(`Processing ${events.length} Kafka events`);

  for (const event of events) {
    const { orderId, customerId, amount } = event.value;

    context.log.info(`Order ${orderId}: $${amount}`);
    context.log.info(`Topic: ${event.topic}, Partition: ${event.partition}, Offset: ${event.offset}`);

    // Process event
    await processOrder(event.value);
  }
};
```

**Types:**
```typescript
interface KafkaEvent<T = any> {
  readonly topic: string;
  readonly partition: number;
  readonly offset: number;
  readonly timestamp: number;
  readonly key?: string;
  readonly value: T;
  readonly headers?: Record<string, string>;
}
```

---

### RabbitMQHandler

Processes messages from RabbitMQ queues.

**Type Signature:**
```typescript
type RabbitMQHandler<T = any> = (
  context: AzureFunctionContext,
  message: RabbitMQMessage<T>
) => Promise<void> | void;
```

**Use Cases:** Message queuing, task distribution, RPC patterns

**Example:**
```typescript
import { RabbitMQHandler } from '@atakora/cdk/functions';

interface TaskMessage {
  taskId: string;
  action: string;
  payload: any;
}

export const handler: RabbitMQHandler<TaskMessage> = async (context, message) => {
  const { taskId, action, payload } = message.body;

  context.log.info(`Task ${taskId}: ${action}`);
  context.log.info(`Routing: ${message.exchange} -> ${message.routingKey}`);

  const priority = message.properties.priority || 0;
  const correlationId = message.properties.correlationId;

  // Process high-priority tasks first
  if (priority > 5) {
    await processHighPriority(taskId, action, payload);
  } else {
    await processNormal(taskId, action, payload);
  }
};
```

**Types:**
```typescript
interface RabbitMQMessage<T = any> {
  readonly body: T;
  readonly deliveryTag: number;
  readonly redelivered: boolean;
  readonly exchange: string;
  readonly routingKey: string;
  readonly properties: {
    readonly contentType?: string;
    readonly contentEncoding?: string;
    readonly priority?: number;
    readonly correlationId?: string;
    readonly replyTo?: string;
    readonly expiration?: string;
    readonly messageId?: string;
    readonly timestamp?: number;
    readonly type?: string;
    readonly userId?: string;
    readonly appId?: string;
  };
}
```

---

### RedisStreamHandler

Processes batches of entries from Redis Streams.

**Type Signature:**
```typescript
type RedisStreamHandler = (
  context: AzureFunctionContext,
  entries: RedisStreamEntry[]
) => Promise<void> | void;
```

**Use Cases:** Event streaming, activity feeds, real-time analytics

**Example:**
```typescript
import { RedisStreamHandler } from '@atakora/cdk/functions';

export const handler: RedisStreamHandler = async (context, entries) => {
  context.log.info(`Processing ${entries.length} Redis stream entries`);

  for (const entry of entries) {
    const eventType = entry.values['eventType'];
    const payload = JSON.parse(entry.values['payload']);

    context.log.info(`Entry ${entry.id}: ${eventType}`);

    // Process based on event type
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(payload);
        break;
      case 'user.updated':
        await handleUserUpdated(payload);
        break;
    }
  }
};
```

**Types:**
```typescript
interface RedisStreamEntry {
  readonly id: string;
  readonly values: Record<string, string>;
}
```

---

## Durable Functions (Priority 4)

### DurableOrchestratorHandler

Defines workflows with activities, timers, and external events.

**Type Signature:**
```typescript
type DurableOrchestratorHandler<TInput = any, TOutput = any> = (
  context: DurableOrchestrationContext<TInput>
) => Generator<any, TOutput, any>;
```

**Use Cases:** Multi-step workflows, saga patterns, long-running processes

**Example:**
```typescript
import { DurableOrchestratorHandler } from '@atakora/cdk/functions';

interface OrderWorkflow {
  orderId: string;
  items: string[];
  customerId: string;
}

export const handler: DurableOrchestratorHandler<OrderWorkflow, string> = function* (context) {
  const { orderId, items, customerId } = context.input;

  // Step 1: Validate order
  const isValid = yield context.callActivity<OrderWorkflow, boolean>('ValidateOrder', context.input);

  if (!isValid) {
    return 'Order validation failed';
  }

  // Step 2: Reserve inventory
  const inventoryReserved = yield context.callActivity<string[], boolean>(
    'ReserveInventory',
    items
  );

  if (!inventoryReserved) {
    return 'Order failed: Insufficient inventory';
  }

  // Step 3: Process payment
  const paymentResult = yield context.callActivity<string, { success: boolean }>(
    'ProcessPayment',
    orderId
  );

  if (!paymentResult.success) {
    // Rollback: Release inventory
    yield context.callActivity('ReleaseInventory', items);
    return 'Order failed: Payment declined';
  }

  // Step 4: Ship order
  yield context.callActivity('ShipOrder', orderId);

  // Step 5: Send confirmation
  yield context.callActivity('SendConfirmation', customerId);

  return 'Order completed successfully';
};
```

**Important:** Orchestrator code must be deterministic. Use `context.currentUtcDateTime`, not `new Date()`.

---

### DurableActivityHandler

Performs actual work in durable workflows.

**Type Signature:**
```typescript
type DurableActivityHandler<TInput = any, TOutput = any> = (
  context: AzureFunctionContext,
  input: TInput
) => Promise<TOutput> | TOutput;
```

**Use Cases:** Work units in workflows, side effects, external API calls

**Example:**
```typescript
import { DurableActivityHandler } from '@atakora/cdk/functions';

export const handler: DurableActivityHandler<string[], boolean> = async (context, items) => {
  context.log.info(`Checking inventory for ${items.length} items`);

  // Perform non-deterministic operations (database calls, API calls, etc.)
  const inventoryCheck = await checkInventoryDatabase(items);

  if (inventoryCheck.allAvailable) {
    await reserveItems(items);
    context.log.info('Inventory reserved successfully');
    return true;
  }

  context.log.warn('Insufficient inventory');
  return false;
};
```

---

### DurableEntityHandler

Manages stateful entities in durable functions.

**Type Signature:**
```typescript
type DurableEntityHandler<TState = any> = (
  context: DurableEntityContext<TState>
) => Promise<void> | void;
```

**Use Cases:** Stateful objects, counters, aggregates, actor pattern

**Example:**
```typescript
import { DurableEntityHandler } from '@atakora/cdk/functions';

interface CounterState {
  value: number;
  lastUpdated: string;
}

export const handler: DurableEntityHandler<CounterState> = async (context) => {
  const state = context.getState<CounterState>() || {
    value: 0,
    lastUpdated: new Date().toISOString()
  };

  switch (context.operationName) {
    case 'increment':
      state.value++;
      state.lastUpdated = new Date().toISOString();
      break;

    case 'decrement':
      state.value--;
      state.lastUpdated = new Date().toISOString();
      break;

    case 'add':
      const amount = context.getInput<number>();
      state.value += amount;
      state.lastUpdated = new Date().toISOString();
      break;

    case 'get':
      return state.value;

    case 'reset':
      state.value = 0;
      state.lastUpdated = new Date().toISOString();
      break;
  }

  context.setState(state);
};
```

---

## Common Types

### AzureFunctionContext

All handlers receive `AzureFunctionContext` as the first parameter:

```typescript
interface AzureFunctionContext {
  readonly invocationId: string;
  readonly executionContext: ExecutionContext;
  readonly bindings: BindingData;
  readonly bindingData: Record<string, any>;
  readonly traceContext: TraceContext;
  readonly log: Logger;
  done: (err?: Error, result?: any) => void;
}

interface Logger {
  (message: string, ...optionalParams: any[]): void;
  error(message: string, ...optionalParams: any[]): void;
  warn(message: string, ...optionalParams: any[]): void;
  info(message: string, ...optionalParams: any[]): void;
  verbose(message: string, ...optionalParams: any[]): void;
  metric(name: string, value: number, properties?: Record<string, any>): void;
}
```

---

## Handler Comparison Table

| Handler Type | Trigger | Cardinality | Input Type | Use Case |
|-------------|---------|-------------|------------|----------|
| HttpHandler | HTTP | Single | HttpRequest | REST APIs, webhooks |
| TimerHandler | Timer | Single | TimerInfo | Scheduled tasks |
| QueueHandler | Storage Queue | Single | QueueMessage | Async processing |
| BlobHandler | Blob Storage | Single | BlobItem | File processing |
| ServiceBusQueueHandler | Service Bus Queue | Single | ServiceBusMessage | Reliable messaging |
| ServiceBusTopicHandler | Service Bus Topic | Single | ServiceBusMessage | Pub/sub patterns |
| EventHubHandler | Event Hubs | Many | EventHubEvent[] | Stream processing |
| CosmosDBHandler | Cosmos DB | Many | CosmosDocument[] | Change tracking |
| EventGridHandler | Event Grid | Single | EventGridEvent | Event routing |
| IoTHubHandler | IoT Hub | Many | IoTHubMessage[] | IoT telemetry |
| SignalRNegotiateHandler | HTTP | Single | HttpRequest | Real-time connections |
| KafkaHandler | Kafka | Many | KafkaEvent[] | Stream processing |
| RabbitMQHandler | RabbitMQ | Single | RabbitMQMessage | Message queuing |
| RedisStreamHandler | Redis Streams | Many | RedisStreamEntry[] | Event streaming |
| DurableOrchestratorHandler | Durable Functions | Single | TInput (custom) | Workflows |
| DurableActivityHandler | Durable Functions | Single | TInput (custom) | Work units |
| DurableEntityHandler | Durable Functions | Single | Operation | Stateful entities |

---

## See Also

- [Azure Functions Guide](../guides/azure-functions.md) - Complete usage guide with patterns and examples
- [Function App Configuration](../reference/function-app-config.md) - FunctionApp construct reference
- [Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)
