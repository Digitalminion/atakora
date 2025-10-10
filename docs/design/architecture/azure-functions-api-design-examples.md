## Usage Examples

### Basic HTTP Function with handler.ts + resource.ts

**File: functions/api/resource.ts**
```typescript
import { defineFunction } from '@atakora/functions';

export interface ApiEnv {
  readonly DATABASE_URL: string;
  readonly API_KEY: string;
}

export default defineFunction<ApiEnv>({
  trigger: {
    type: 'http',
    route: 'api/users/{userId}',
    methods: ['GET', 'POST'],
    authLevel: AuthLevel.FUNCTION
  },
  environment: {
    DATABASE_URL: '${COSMOS_ENDPOINT}',
    API_KEY: '${API_SECRET_KEY}'
  },
  timeout: Duration.seconds(30),
  role: {
    managedIdentity: true
  }
});
```

**File: functions/api/handler.ts**
```typescript
import { HttpHandler, AzureFunctionContext, HttpRequest, HttpResponse } from '@atakora/functions';

export const handler: HttpHandler = async (
  context: AzureFunctionContext,
  req: HttpRequest
): Promise<HttpResponse> => {
  const { DATABASE_URL, API_KEY } = process.env;
  const userId = req.params.userId;

  context.log.info(`Processing request for user: ${userId}`);

  // Function logic here

  return {
    status: 200,
    body: { userId, message: 'Success' }
  };
};
```

**File: app.ts**
```typescript
const functionApp = new FunctionApp(resourceGroup, 'MyFunctions', {
  plan: consumptionPlan,
  storageAccount: storage,
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '18'
});

// Function automatically discovers resource.ts configuration
const apiFunction = new AzureFunction(functionApp, 'ApiEndpoint', {
  handler: './functions/api/handler.ts',
  resource: './functions/api/resource.ts',
  environment: {
    COSMOS_ENDPOINT: cosmosDb.endpoint,
    API_SECRET_KEY: keyVault.secret('api-key')
  }
});
```

### Timer Function with Cosmos Output

**File: functions/cleanup/resource.ts**
```typescript
import { defineFunction } from '@atakora/functions';

export default defineFunction({
  trigger: {
    type: 'timer',
    schedule: '0 0 2 * * *',  // 2 AM daily
    runOnStartup: false
  },
  outputBindings: [{
    type: 'cosmosDb',
    direction: 'out',
    name: 'deletedItems',
    databaseName: 'audit',
    collectionName: 'deletions',
    connection: '${COSMOS_CONNECTION}'
  }],
  timeout: Duration.minutes(10)
});
```

**File: functions/cleanup/handler.ts**
```typescript
import { TimerHandler, AzureFunctionContext, TimerInfo } from '@atakora/functions';

export const handler: TimerHandler = async (
  context: AzureFunctionContext,
  timer: TimerInfo
): Promise<void> => {
  context.log.info('Cleanup function triggered', {
    isPastDue: timer.isPastDue,
    nextRun: timer.scheduleStatus.next
  });

  const deletedItems = [];
  // Cleanup logic here

  // Output binding automatically handles Cosmos write
  context.bindings.deletedItems = deletedItems;
};
```

**File: app.ts**
```typescript
const cleanupFunction = new AzureFunction(functionApp, 'Cleanup', {
  handler: './functions/cleanup/handler.ts',
  resource: './functions/cleanup/resource.ts',
  environment: {
    COSMOS_CONNECTION: cosmosDb.connectionString
  }
});
```

### Queue Processing Function

**File: functions/orders/resource.ts**
```typescript
import { defineFunction } from '@atakora/functions';

export interface OrderEnv {
  readonly MAX_RETRIES: string;
  readonly NOTIFICATION_ENABLED: string;
}

export default defineFunction<OrderEnv>({
  trigger: {
    type: 'queue',
    queueName: 'orders',
    connection: '${STORAGE_CONNECTION}',
    batchSize: 10,
    maxDequeueCount: 3
  },
  inputBindings: [{
    type: 'table',
    direction: 'in',
    name: 'inventory',
    tableName: 'inventory',
    connection: '${STORAGE_CONNECTION}'
  }],
  outputBindings: [{
    type: 'serviceBus',
    direction: 'out',
    name: 'notifications',
    queueName: 'order-notifications',
    connection: '${SERVICE_BUS_CONNECTION}'
  }],
  environment: {
    MAX_RETRIES: '3',
    NOTIFICATION_ENABLED: '${NOTIFICATION_FLAG}'
  }
});
```

**File: functions/orders/handler.ts**
```typescript
import { QueueHandler, AzureFunctionContext } from '@atakora/functions';

interface OrderMessage {
  orderId: string;
  items: string[];
  customerId: string;
}

export const handler: QueueHandler<OrderMessage> = async (
  context: AzureFunctionContext,
  message: OrderMessage
): Promise<void> => {
  const inventory = context.bindings.inventory;

  context.log.info('Processing order', { orderId: message.orderId });

  // Process order logic
  const notification = {
    orderId: message.orderId,
    status: 'processed'
  };

  // Output to Service Bus
  if (process.env.NOTIFICATION_ENABLED === 'true') {
    context.bindings.notifications = notification;
  }
};
```

**File: app.ts**
```typescript
const orderProcessor = new AzureFunction(functionApp, 'OrderProcessor', {
  handler: './functions/orders/handler.ts',
  resource: './functions/orders/resource.ts',
  environment: {
    STORAGE_CONNECTION: storage.connectionString,
    SERVICE_BUS_CONNECTION: serviceBus.connectionString,
    NOTIFICATION_FLAG: 'true'
  }
});
```