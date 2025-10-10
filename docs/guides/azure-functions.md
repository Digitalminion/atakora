# Azure Functions with Atakora

Learn how to build serverless applications with Azure Functions using Atakora's type-safe infrastructure framework.

## Overview

Atakora provides a comprehensive framework for building Azure Functions applications with TypeScript, combining runtime handler types with infrastructure configuration following the Amplify Gen 2 pattern of separating code from configuration.

**Key Benefits:**
- Type-safe handler interfaces for all 18 Azure Functions trigger types
- Separate runtime code (`handler.ts`) from infrastructure config (`resource.ts`)
- Automatic function discovery and deployment
- Environment variable resolution with `${PLACEHOLDER}` syntax
- Full IntelliSense support with TSDoc documentation

## Installation

```bash
npm install @atakora/cdk
```

## Quick Start

### 1. Create Your First HTTP Function

Create a function directory with two files:

**functions/api/handler.ts** (Runtime code):
```typescript
import { HttpHandler } from '@atakora/cdk/functions';

export const handler: HttpHandler = async (context, req) => {
  return {
    status: 200,
    body: { message: 'Hello World' }
  };
};
```

**functions/api/resource.ts** (Infrastructure config):
```typescript
import { defineFunction } from '@atakora/cdk/functions';

export default defineFunction({
  trigger: {
    type: 'http',
    route: 'api/hello',
    methods: ['GET'],
    authLevel: 'anonymous'
  },
  timeout: { seconds: 30 }
});
```

### 2. Add Function App to Your Stack

**infrastructure/app.ts**:
```typescript
import { Stack, FunctionApp } from '@atakora/cdk';

const stack = new Stack('MyApp');

const functionApp = new FunctionApp(stack, 'Api', {
  functionsPath: '../functions'
});
```

### 3. Deploy

```bash
npx atakora deploy
```

Your HTTP function is now live at: `https://<app-name>.azurewebsites.net/api/hello`

## Core Concepts

### Handler Types

Atakora provides type-safe handler interfaces for all Azure Functions trigger types:

**Priority 1 - Core Triggers:**
- `HttpHandler` - REST APIs and webhooks
- `TimerHandler` - Scheduled tasks (CRON)
- `QueueHandler` - Azure Storage Queue processing
- `BlobHandler` - Blob storage event handling
- `ServiceBusQueueHandler` - Service Bus queue messages
- `ServiceBusTopicHandler` - Service Bus topic subscriptions
- `EventHubHandler` - Event stream processing
- `CosmosDBHandler` - Cosmos DB change feed
- `EventGridHandler` - Event routing

**Priority 2 - IoT & Real-time:**
- `IoTHubHandler` - IoT device messages
- `SignalRNegotiateHandler` - Real-time connections

**Priority 3 - Third-Party:**
- `KafkaHandler` - Kafka event streaming
- `RabbitMQHandler` - RabbitMQ messaging
- `RedisStreamHandler` - Redis stream processing

**Priority 4 - Durable Functions:**
- `DurableOrchestratorHandler` - Workflow orchestration
- `DurableActivityHandler` - Activity execution
- `DurableEntityHandler` - Stateful entities

See the [Azure Functions Handlers Reference](../reference/azure-functions-handlers.md) for complete documentation.

### Function Discovery

Atakora automatically discovers functions in your `functions/` directory. Each function must have:

1. **handler.ts** - Runtime code with exported `handler` function
2. **resource.ts** - Infrastructure config with default export from `defineFunction()`

**Directory structure:**
```
functions/
├── api/
│   ├── handler.ts
│   └── resource.ts
├── process-order/
│   ├── handler.ts
│   └── resource.ts
└── scheduled-cleanup/
    ├── handler.ts
    └── resource.ts
```

The discovery system:
- Scans the functions directory for handler/resource pairs
- Computes content hashes for cache invalidation
- Validates function configurations
- Builds a function registry for deployment

### Environment Resolution

Use `${PLACEHOLDER}` syntax to reference environment variables defined in your infrastructure:

**functions/api/resource.ts:**
```typescript
export interface ApiEnv {
  readonly DATABASE_URL: string;
  readonly API_KEY: string;
}

export default defineFunction<ApiEnv>({
  trigger: { type: 'http', route: 'api/users' },
  environment: {
    DATABASE_URL: '${COSMOS_ENDPOINT}',
    API_KEY: '${API_SECRET}'
  }
});
```

**infrastructure/app.ts:**
```typescript
const functionApp = new FunctionApp(stack, 'Api', {
  functionsPath: '../functions',
  environment: {
    COSMOS_ENDPOINT: cosmosDb.endpoint,      // Resource reference
    API_SECRET: keyVault.secret('api-key')   // ARM expression
  }
});
```

**functions/api/handler.ts:**
```typescript
export const handler: HttpHandler = async (context, req) => {
  // Environment variables are resolved and available
  const { DATABASE_URL, API_KEY } = process.env;
  // Use them in your code
};
```

## Common Patterns

### HTTP API with Authentication

```typescript
// handler.ts
import { HttpHandler } from '@atakora/cdk/functions';

export const handler: HttpHandler = async (context, req) => {
  // Check authentication
  if (!req.user) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }

  // Check authorization
  if (!req.user.roles?.includes('admin')) {
    return { status: 403, body: { error: 'Forbidden' } };
  }

  // Process authenticated request
  return {
    status: 200,
    body: { userId: req.user.id }
  };
};
```

```typescript
// resource.ts
import { defineFunction, AuthLevel } from '@atakora/cdk/functions';

export default defineFunction({
  trigger: {
    type: 'http',
    route: 'api/admin/{id}',
    methods: ['GET', 'DELETE'],
    authLevel: AuthLevel.FUNCTION
  }
});
```

### Queue Message Processing

```typescript
// handler.ts
import { QueueHandler } from '@atakora/cdk/functions';

interface OrderMessage {
  orderId: string;
  customerId: string;
  items: Array<{ sku: string; quantity: number }>;
}

export const handler: QueueHandler<OrderMessage> = async (context, message) => {
  const { orderId, customerId, items } = message.body;

  context.log.info(`Processing order ${orderId} for customer ${customerId}`);

  // Handle retries
  if (message.dequeueCount > 3) {
    context.log.warn('Message retry limit reached, moving to dead-letter queue');
    throw new Error('Max retries exceeded');
  }

  // Process order
  await processOrder(orderId, items);
};
```

```typescript
// resource.ts
import { defineFunction } from '@atakora/cdk/functions';

export default defineFunction({
  trigger: {
    type: 'queue',
    queueName: 'orders',
    connection: '${STORAGE_CONNECTION}'
  },
  environment: {
    STORAGE_CONNECTION: '${STORAGE_ACCOUNT_CONNECTION_STRING}'
  }
});
```

### Scheduled Task (Timer)

```typescript
// handler.ts
import { TimerHandler } from '@atakora/cdk/functions';

export const handler: TimerHandler = async (context, timer) => {
  context.log.info(`Timer triggered at ${timer.scheduleStatus.last}`);
  context.log.info(`Next run scheduled for ${timer.scheduleStatus.next}`);

  if (timer.isPastDue) {
    context.log.warn('Timer is past due - catching up on missed executions');
  }

  // Perform cleanup or batch processing
  await cleanupExpiredData();
};
```

```typescript
// resource.ts
import { defineFunction } from '@atakora/cdk/functions';

export default defineFunction({
  trigger: {
    type: 'timer',
    schedule: '0 0 * * *'  // Run daily at midnight
  },
  timeout: { minutes: 5 }
});
```

### Event Stream Processing

```typescript
// handler.ts
import { EventHubHandler } from '@atakora/cdk/functions';

interface TelemetryEvent {
  deviceId: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}

export const handler: EventHubHandler<TelemetryEvent> = async (context, events) => {
  context.log.info(`Processing batch of ${events.length} telemetry events`);

  for (const event of events) {
    const { deviceId, temperature, humidity } = event.body;

    // Alert on critical conditions
    if (temperature > 100) {
      context.log.warn(`Critical temperature alert for device ${deviceId}: ${temperature}°C`);
      await sendAlert(deviceId, temperature);
    }

    // Store metrics
    await storeMetric(deviceId, { temperature, humidity });
  }
};
```

```typescript
// resource.ts
import { defineFunction } from '@atakora/cdk/functions';

export default defineFunction({
  trigger: {
    type: 'eventHub',
    eventHubName: 'telemetry',
    connection: '${EVENTHUB_CONNECTION}',
    consumerGroup: '$Default',
    cardinality: 'many'
  },
  environment: {
    EVENTHUB_CONNECTION: '${EVENTHUB_CONNECTION_STRING}'
  }
});
```

### Durable Workflow Orchestration

```typescript
// orchestrator/handler.ts
import { DurableOrchestratorHandler } from '@atakora/cdk/functions';

interface OrderWorkflow {
  orderId: string;
  items: string[];
}

export const handler: DurableOrchestratorHandler<OrderWorkflow, string> = function* (context) {
  const { orderId, items } = context.input;

  // Step 1: Reserve inventory
  const inventoryReserved = yield context.callActivity<string[], boolean>(
    'ReserveInventory',
    items
  );

  if (!inventoryReserved) {
    return 'Order failed: Insufficient inventory';
  }

  // Step 2: Process payment
  const paymentResult = yield context.callActivity<string, { success: boolean }>(
    'ProcessPayment',
    orderId
  );

  if (!paymentResult.success) {
    // Rollback inventory
    yield context.callActivity('ReleaseInventory', items);
    return 'Order failed: Payment declined';
  }

  // Step 3: Ship order
  yield context.callActivity('ShipOrder', orderId);

  return 'Order completed successfully';
};
```

```typescript
// reserve-inventory/handler.ts (Activity)
import { DurableActivityHandler } from '@atakora/cdk/functions';

export const handler: DurableActivityHandler<string[], boolean> = async (context, items) => {
  context.log.info(`Checking inventory for ${items.length} items`);

  const available = await checkInventory(items);

  if (available) {
    await reserveItems(items);
    return true;
  }

  return false;
};
```

## Best Practices

### 1. Type Your Message Bodies

Always provide type parameters for handlers that process messages:

```typescript
interface OrderMessage {
  orderId: string;
  customerId: string;
  items: Array<{ sku: string; quantity: number }>;
}

export const handler: QueueHandler<OrderMessage> = async (context, message) => {
  // Full type safety on message.body
  const { orderId, customerId, items } = message.body;
};
```

### 2. Handle Errors Gracefully

Use try-catch blocks and return appropriate error responses:

```typescript
export const handler: HttpHandler = async (context, req) => {
  try {
    const result = await processRequest(req);
    return { status: 200, body: result };
  } catch (error) {
    context.log.error('Request failed', error);
    return {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
};
```

### 3. Use Context Logging

Leverage structured logging for better observability:

```typescript
export const handler: BlobHandler = async (context, blob) => {
  context.log.info(`Processing blob: ${blob.name}`);
  context.log.verbose(`Size: ${blob.properties.contentLength} bytes`);
  context.log.metric('BlobSize', blob.properties.contentLength);

  if (blob.properties.contentLength > 10_000_000) {
    context.log.warn('Large blob detected');
  }
};
```

### 4. Implement Retry Logic

Check delivery/dequeue counts to implement retry policies:

```typescript
export const handler: QueueHandler = async (context, message) => {
  if (message.dequeueCount > 3) {
    context.log.warn('Message has been retried multiple times');
    // Move to dead-letter queue or alert
    throw new Error('Max retries exceeded');
  }

  // Process message
};
```

### 5. Use Deterministic Code in Orchestrators

Orchestrator functions must be deterministic for replay:

```typescript
export const handler: DurableOrchestratorHandler = function* (context) {
  // CORRECT: Use context.currentUtcDateTime
  const deadline = new Date(context.currentUtcDateTime.getTime() + 3600000);

  // INCORRECT: Don't use Date.now() or new Date()
  // const deadline = new Date(Date.now() + 3600000); // ❌

  yield context.createTimer(deadline);
};
```

### 6. Separate Environment Types

Define environment variable interfaces for type safety:

```typescript
export interface FunctionEnv {
  readonly DATABASE_URL: string;
  readonly API_KEY: string;
  readonly LOG_LEVEL?: string;
}

export default defineFunction<FunctionEnv>({
  environment: {
    DATABASE_URL: '${COSMOS_ENDPOINT}',
    API_KEY: '${API_SECRET}',
    LOG_LEVEL: 'info'
  }
});
```

## Advanced Topics

### Resource References

Use resource references to automatically generate ARM expressions:

```typescript
import { FunctionApp } from '@atakora/cdk';

const functionApp = new FunctionApp(stack, 'Api', {
  functionsPath: '../functions',
  environment: {
    // These automatically resolve to ARM template references
    COSMOS_ENDPOINT: cosmosDb.endpoint,
    STORAGE_CONNECTION: storageAccount.connectionString,
    KEYVAULT_URI: keyVault.uri
  }
});
```

### Custom Bindings

Define input and output bindings for advanced scenarios:

```typescript
export default defineFunction({
  trigger: {
    type: 'http',
    route: 'api/users/{id}'
  },
  bindings: {
    input: [
      {
        type: 'cosmosDB',
        name: 'user',
        databaseName: 'mydb',
        collectionName: 'users',
        id: '{id}',
        connection: '${COSMOS_CONNECTION}'
      }
    ],
    output: [
      {
        type: 'queue',
        name: 'outputQueue',
        queueName: 'user-updates',
        connection: '${STORAGE_CONNECTION}'
      }
    ]
  }
});
```

### Cache Invalidation

The discovery system computes SHA256 hashes of handler and resource files to determine when rebuilding is necessary:

```typescript
// Automatic cache invalidation when files change
const discovery = new FunctionDiscovery('../functions');
const result = await discovery.discover();

// Only changed functions are rebuilt
console.log(`Found ${result.functionsDiscovered} functions`);
```

## Testing

### Unit Testing Handlers

```typescript
import { handler } from './handler';
import { AzureFunctionContext, HttpRequest } from '@atakora/cdk/functions';

describe('HTTP Handler', () => {
  it('should return 200 for valid request', async () => {
    const context = createMockContext();
    const request: HttpRequest = {
      method: 'GET',
      url: '/api/test',
      headers: {},
      query: {},
      params: {}
    };

    const response = await handler(context, request);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Success' });
  });
});
```

### Integration Testing

```typescript
import { FunctionApp } from '@atakora/cdk';

describe('Function App', () => {
  it('should discover all functions', async () => {
    const discovery = new FunctionDiscovery('./test-functions');
    const result = await discovery.discover();

    expect(result.functionsDiscovered).toBe(3);
    expect(result.registry.has('api')).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

**Function not discovered:**
- Verify `handler.ts` and `resource.ts` exist in function directory
- Check that `resource.ts` has default export from `defineFunction()`
- Ensure `handler.ts` exports a `handler` function

**Environment variable not resolved:**
- Verify placeholder syntax: `${VARIABLE_NAME}`
- Check that variable is defined in FunctionApp `environment` config
- Ensure resource references implement `IResourceReference` interface

**Type errors:**
- Import handler types from `@atakora/cdk/functions`
- Provide type parameters for generic handlers: `QueueHandler<YourType>`
- Check that function signature matches handler type

## Next Steps

- [Azure Functions Handlers Reference](../reference/azure-functions-handlers.md) - Complete handler type documentation
- [Function App Configuration](../reference/function-app-config.md) - Detailed configuration options
- [Deployment Guide](./deployment.md) - Deploy functions to Azure

## Related Documentation

- [Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)
- [TypeScript Best Practices](./typescript-best-practices.md)
- [ARM Template Output](../reference/arm-template-output.md)
