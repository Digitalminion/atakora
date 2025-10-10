/**
 * Example implementations for all Azure Functions handler types.
 *
 * @packageDocumentation
 *
 * @remarks
 * This file demonstrates usage of all 18 handler types with practical examples.
 * These examples are for documentation and type-checking purposes only.
 */

import type {
  HttpHandler,
  TimerHandler,
  QueueHandler,
  BlobHandler,
  ServiceBusQueueHandler,
  ServiceBusTopicHandler,
  EventHubHandler,
  CosmosDBHandler,
  EventGridHandler,
  IoTHubHandler,
  SignalRNegotiateHandler,
  KafkaHandler,
  RabbitMQHandler,
  RedisStreamHandler,
  DurableOrchestratorHandler,
  DurableActivityHandler,
  DurableEntityHandler,
} from './handlers';

// ============================================================================
// PRIORITY 1: CORE TRIGGERS
// ============================================================================

/**
 * Example HTTP handler for a REST API endpoint.
 */
export const httpExample: HttpHandler = async (context, req) => {
  context.log.info(`Received ${req.method} request to ${req.url}`);

  if (req.method === 'GET') {
    const userId = req.params.id;
    return {
      status: 200,
      body: { userId, message: 'User retrieved successfully' },
    };
  }

  if (req.method === 'POST') {
    const userData = req.body;
    return {
      status: 201,
      body: { message: 'User created', data: userData },
    };
  }

  return {
    status: 405,
    body: { error: 'Method not allowed' },
  };
};

/**
 * Example timer handler for scheduled cleanup.
 */
export const timerExample: TimerHandler = async (context, timer) => {
  if (timer.isPastDue) {
    context.log.warn('Timer execution is past due');
  }

  context.log.info('Running scheduled cleanup task');
  context.log.info(`Last run: ${timer.scheduleStatus.last}`);
  context.log.info(`Next run: ${timer.scheduleStatus.next}`);

  // Perform cleanup operations
};

/**
 * Example queue handler for order processing.
 */
export const queueExample: QueueHandler<{ orderId: string; items: string[] }> = async (
  context,
  message
) => {
  context.log.info(`Processing order: ${message.body.orderId}`);
  context.log.info(`Dequeue count: ${message.dequeueCount}`);

  // Process order
  const { orderId, items } = message.body;
  context.log.info(`Order ${orderId} has ${items.length} items`);
};

/**
 * Example blob handler for image processing.
 */
export const blobExample: BlobHandler = async (context, blob) => {
  context.log.info(`Processing blob: ${blob.name}`);
  context.log.info(`Size: ${blob.properties.contentLength} bytes`);
  context.log.info(`Type: ${blob.properties.contentType}`);

  if (blob.properties.contentType.startsWith('image/')) {
    // Process image
    context.log.info('Processing image file');
  }
};

/**
 * Example Service Bus queue handler for message processing.
 */
export const serviceBusQueueExample: ServiceBusQueueHandler<{ taskId: string }> = async (
  context,
  message
) => {
  context.log.info(`Processing task: ${message.body.taskId}`);
  context.log.info(`Message ID: ${message.messageId}`);
  context.log.info(`Delivery count: ${message.deliveryCount}`);

  if (message.sessionId) {
    context.log.info(`Session: ${message.sessionId}`);
  }
};

/**
 * Example Service Bus topic handler for event processing.
 */
export const serviceBusTopicExample: ServiceBusTopicHandler<{ eventType: string }> = async (
  context,
  message
) => {
  context.log.info(`Processing event: ${message.body.eventType}`);
  context.log.info(`Label: ${message.label}`);

  const priority = message.properties['priority'];
  if (priority === 'high') {
    context.log.info('Processing high-priority event');
  }
};

/**
 * Example Event Hub handler for telemetry processing.
 */
export const eventHubExample: EventHubHandler<{ temperature: number; humidity: number }> = async (
  context,
  events
) => {
  context.log.info(`Processing ${events.length} telemetry events`);

  for (const event of events) {
    context.log.info(
      `Temperature: ${event.body.temperature}°C, Humidity: ${event.body.humidity}%`
    );
  }
};

/**
 * Example Cosmos DB handler for change feed processing.
 */
export const cosmosDBExample: CosmosDBHandler<{ id: string; name: string }> = async (
  context,
  documents
) => {
  context.log.info(`Processing ${documents.length} changed documents`);

  for (const doc of documents) {
    context.log.info(`Document ${doc.id} updated: ${doc.name}`);
    context.log.info(`Timestamp: ${new Date(doc._ts * 1000)}`);
  }
};

/**
 * Example Event Grid handler for blob storage events.
 */
export const eventGridExample: EventGridHandler<{ url: string }> = async (context, event) => {
  context.log.info(`Event type: ${event.eventType}`);
  context.log.info(`Subject: ${event.subject}`);
  context.log.info(`Data: ${JSON.stringify(event.data)}`);

  if (event.eventType === 'Microsoft.Storage.BlobCreated') {
    context.log.info(`New blob created: ${event.data.url}`);
  }
};

// ============================================================================
// PRIORITY 2: IOT & REAL-TIME
// ============================================================================

/**
 * Example IoT Hub handler for device telemetry.
 */
export const iotHubExample: IoTHubHandler<{ temperature: number; pressure: number }> = async (
  context,
  messages
) => {
  context.log.info(`Processing ${messages.length} IoT messages`);

  for (const msg of messages) {
    context.log.info(`Device ${msg.deviceId}: Temp=${msg.body.temperature}°C`);

    if (msg.body.temperature > 100) {
      context.log.warn(`Critical temperature alert for device ${msg.deviceId}`);
    }
  }
};

/**
 * Example SignalR negotiation handler for real-time connections.
 */
export const signalRExample: SignalRNegotiateHandler = async (context, req) => {
  const userId = req.user?.id;

  if (!userId) {
    return {
      status: 401,
      body: { error: 'Unauthorized' },
    };
  }

  // Connection info is bound via SignalR input binding
  const connectionInfo = context.bindings.connectionInfo;

  return {
    status: 200,
    body: connectionInfo,
  };
};

// ============================================================================
// PRIORITY 3: THIRD-PARTY
// ============================================================================

/**
 * Example Kafka handler for event streaming.
 */
export const kafkaExample: KafkaHandler<{ eventId: string; payload: any }> = async (
  context,
  events
) => {
  context.log.info(`Processing ${events.length} Kafka events`);

  for (const event of events) {
    context.log.info(`Event ${event.value.eventId} from partition ${event.partition}`);
  }
};

/**
 * Example RabbitMQ handler for message queue processing.
 */
export const rabbitMQExample: RabbitMQHandler<{ taskId: string }> = async (context, message) => {
  context.log.info(`Processing task: ${message.body.taskId}`);
  context.log.info(`Exchange: ${message.exchange}, Routing key: ${message.routingKey}`);

  if (message.redelivered) {
    context.log.warn('Message was redelivered');
  }

  const priority = message.properties.priority || 0;
  context.log.info(`Priority: ${priority}`);
};

/**
 * Example Redis Stream handler for activity feeds.
 */
export const redisStreamExample: RedisStreamHandler = async (context, entries) => {
  context.log.info(`Processing ${entries.length} stream entries`);

  for (const entry of entries) {
    const eventType = entry.values['eventType'];
    const payload = JSON.parse(entry.values['payload'] || '{}');

    context.log.info(`Entry ${entry.id}: ${eventType}`);
  }
};

// ============================================================================
// PRIORITY 4: DURABLE FUNCTIONS
// ============================================================================

/**
 * Example orchestrator for order fulfillment workflow.
 */
export const orchestratorExample: DurableOrchestratorHandler<
  { orderId: string },
  string
> = function* (context) {
  const { orderId } = context.input;

  // Step 1: Reserve inventory
  const inventoryReserved = yield context.callActivity<string, boolean>(
    'ReserveInventory',
    orderId
  );

  if (!inventoryReserved) {
    return 'Order failed: Inventory unavailable';
  }

  // Step 2: Process payment
  const paymentResult = yield context.callActivity<string, { success: boolean }>(
    'ProcessPayment',
    orderId
  );

  if (!paymentResult.success) {
    // Rollback inventory
    yield context.callActivity('ReleaseInventory', orderId);
    return 'Order failed: Payment declined';
  }

  // Step 3: Ship order
  yield context.callActivity('ShipOrder', orderId);

  return 'Order completed successfully';
};

/**
 * Example activity for inventory reservation.
 */
export const activityExample: DurableActivityHandler<string, boolean> = async (context, orderId) => {
  context.log.info(`Reserving inventory for order ${orderId}`);

  // Simulate inventory check
  const available = true; // Check actual inventory

  if (available) {
    // Reserve items
    return true;
  }

  return false;
};

/**
 * Example entity for counter state management.
 */
export const entityExample: DurableEntityHandler<{ value: number }> = async (context) => {
  const state = context.getState<{ value: number }>() || { value: 0 };

  switch (context.operationName) {
    case 'increment':
      state.value++;
      break;
    case 'decrement':
      state.value--;
      break;
    case 'add':
      const amount = context.getInput<number>();
      state.value += amount;
      break;
    case 'get':
      return state.value;
    case 'reset':
      state.value = 0;
      break;
  }

  context.setState(state);
};
