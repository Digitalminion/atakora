# Fluent Queue API - Real-World Examples

## Transformed Queue Processors

### Example 1: Data Quality Queue

#### Before (Current Implementation)

```typescript
// packages/backend/src/gen2/queue-processors/data-quality/resource.ts

import { defineQueue } from '@atakora/component/queues';
import { dataQualityProcessor } from '../../functions/data-quality-processor/resource';

export const dataQualityQueue = defineQueue({
  name: 'data-quality',
  processor: dataQualityProcessor,
  queue: {
    messageTimeToLive: '7.00:00:00',
    visibilityTimeout: '00:10:00',
    maxDeliveryCount: 3,
    deadLetterQueue: {
      enabled: true,
      name: 'data-quality-dlq',
    },
  },
  monitoring: {
    queueDepthAlert: {
      threshold: 1000,
      severity: 'Warning',
    },
    messageAgeAlert: {
      threshold: '01:00:00',
      severity: 'Warning',
    },
    deadLetterAlert: {
      enabled: true,
      severity: 'Error',
    },
  },
});
```

#### After (New Fluent API)

```typescript
// packages/backend/src/gen2/queue-processors/data-quality/resource.ts

import { Queue, minutes, hours, days, greaterThan, olderThan } from '@atakora/component/queues';
import { dataQualityProcessor } from '../../functions/data-quality-processor/resource';

export const dataQualityQueue = Queue('data-quality')
  .processor(dataQualityProcessor)
  .ttl(days(7))
  .visibility(minutes(10))
  .retries(3)
  .withDeadLetterQueue()
  .monitoring((alerts) =>
    alerts
      .onDepth(greaterThan(1000))
      .warn()
      .onMessageAge(olderThan(hours(1)))
      .warn()
      .onDeadLetter()
      .error()
  )
  .export();
```

**Lines of code reduced**: From 24 lines to 10 lines (58% reduction)
**Benefits**:

- Clear, readable flow
- Type-safe duration values
- Intuitive alert configuration
- Smart defaults applied automatically

### Example 2: Email Queue with Advanced Features

#### Before

```typescript
// packages/backend/src/gen2/queue-processors/email/resource.ts

export const emailQueue = defineQueue({
  name: 'email',
  processor: emailProcessor,
  queue: {
    messageTimeToLive: '1.00:00:00',
    visibilityTimeout: '00:00:30',
    maxDeliveryCount: 5,
    requiresDuplicateDetection: true,
    duplicateDetectionWindow: '00:10:00',
    deadLetterQueue: {
      enabled: true,
      name: 'email-dlq',
      maxDeliveryCount: 5,
    },
  },
  scale: {
    batchSize: 10,
    maxConcurrentExecutions: 5,
  },
  retry: {
    strategy: 'exponential',
    maxRetryCount: 5,
    minimumInterval: '00:00:05',
    maximumInterval: '00:05:00',
  },
  monitoring: {
    queueDepthAlert: {
      threshold: 500,
      severity: 'Warning',
    },
    queueDepthAlert2: {
      threshold: 1000,
      severity: 'Critical',
    },
    failureRateAlert: {
      threshold: 0.1,
      severity: 'Error',
    },
  },
});
```

#### After

```typescript
// packages/backend/src/gen2/queue-processors/email/resource.ts

import { Queue, seconds, minutes, hours, days } from '@atakora/component/queues';
import { exponentialBackoff, greaterThan } from '@atakora/component/queues';
import { emailProcessor } from '../../functions/email-processor/resource';

export const emailQueue = Queue('email')
  .processor(emailProcessor)
  .ttl(days(1))
  .visibility(seconds(30))
  .batchSize(10)
  .parallelism(5)
  .withDuplicateDetection(minutes(10))
  .retry(exponentialBackoff().maxAttempts(5).initialDelay(seconds(5)).maxDelay(minutes(5)))
  .withDeadLetterQueue()
  .deadLetterAfter(5)
  .monitoring((alerts) =>
    alerts
      .onDepth(greaterThan(500))
      .warn()
      .onDepth(greaterThan(1000))
      .critical()
      .onFailureRate(greaterThan(0.1))
      .error()
  )
  .export();
```

### Example 3: High-Throughput Event Processing Queue

#### New API Only (Showcasing Presets)

```typescript
// packages/backend/src/gen2/queue-processors/events/resource.ts

import { Queue, greaterThan, olderThan, hours } from '@atakora/component/queues';
import { eventProcessor } from '../../functions/event-processor/resource';

// Option 1: Using preset
export const eventQueueSimple = Queue('events')
  .processor(eventProcessor)
  .highThroughput() // Applies: batchSize(32), parallelism(10), visibility(30s), ttl(1d)
  .export();

// Option 2: Preset with customization
export const eventQueueCustom = Queue('events')
  .processor(eventProcessor)
  .highThroughput()
  .ttl(hours(6)) // Override default TTL
  .monitoring((alerts) =>
    alerts
      .onDepth(greaterThan(100000))
      .critical()
      .withEmail('oncall@company.com')
      .onMessageAge(olderThan(hours(1)))
      .warn()
  )
  .withMetrics()
  .withTracing()
  .export();
```

### Example 4: Reliable Order Processing Queue

```typescript
// packages/backend/src/gen2/queue-processors/orders/resource.ts

import { Queue, minutes, aggressive } from '@atakora/component/queues';
import { orderProcessor } from '../../functions/order-processor/resource';

// Using the 'reliable' preset for mission-critical operations
export const orderQueue = Queue('orders')
  .processor(orderProcessor)
  .reliable() // Applies: retries(5), DLQ, duplicate detection, aggressive retry
  .withSessions() // Ensure order processing for same customer
  .withEncryption() // Encrypt at rest
  .monitoring(
    (alerts) =>
      alerts
        .onDeadLetter()
        .critical()
        .withEmail('orders-team@company.com')
        .withWebhook('https://pagerduty.com/webhook/orders')
        .onFailureRate(greaterThan(0.01))
        .error() // Alert on 1% failure rate
  )
  .tags({
    team: 'orders',
    compliance: 'pci',
    environment: 'production',
  })
  .export();
```

### Example 5: Long-Running Data Processing Queue

```typescript
// packages/backend/src/gen2/queue-processors/ml-training/resource.ts

import { Queue, hours, days, greaterThan, olderThan } from '@atakora/component/queues';
import { mlTrainingProcessor } from '../../functions/ml-training-processor/resource';

export const mlTrainingQueue = Queue('ml-training')
  .processor(mlTrainingProcessor)
  .longRunning() // Preset: visibility(30m), lock(1h), ttl(14d), retries(1)
  .lockDuration(hours(4)) // Override for very long processing
  .monitoring((alerts) =>
    alerts
      .onProcessingTime(greaterThan(hours(3)))
      .warn()
      .onProcessingTime(greaterThan(hours(6)))
      .error()
      .onMessageAge(olderThan(days(2)))
      .warn()
      .onDeadLetter()
      .error()
  )
  .withMetrics()
  .export();
```

## Function Resource Examples

The same fluent pattern can be applied to function definitions:

### Before

```typescript
export const dataQualityProcessor = defineFunction({
  name: 'data-quality-processor',
  trigger: {
    type: 'queue',
    queueName: 'data-quality',
    connection: 'STORAGE_CONNECTION',
    batchSize: 16,
  },
  handler: './handler.ts',
  memory: 1024,
  timeout: 600,
  environment: {
    COSMOS_CONNECTION: '@cosmos.connectionString',
    STORAGE_CONNECTION: '@storage.connectionString',
  },
  scale: {
    minInstances: 0,
    maxInstances: 10,
    maxConcurrentExecutions: 5,
  },
  retry: {
    maxRetryCount: 3,
    minimumInterval: '00:00:05',
    maximumInterval: '00:00:30',
  },
});
```

### After

```typescript
import { Function, MB, minutes, seconds } from '@atakora/component/functions';
import { exponentialBackoff } from '@atakora/component/functions';

export const dataQualityProcessor = Function('data-quality-processor')
  .handler('./handler.ts')
  .queueTrigger('data-quality', { batchSize: 16 })
  .memory(MB(1024))
  .timeout(minutes(10))
  .env({
    COSMOS_CONNECTION: '@cosmos.connectionString',
    STORAGE_CONNECTION: '@storage.connectionString',
  })
  .scale((scale) => scale.instances(0, 10).concurrency(5))
  .retry(exponentialBackoff().maxAttempts(3).initialDelay(seconds(5)).maxDelay(seconds(30)))
  .export();
```

## Event Topic Examples

### Before

```typescript
export const orderEventTopic = defineTopic({
  name: 'order-events',
  subscriptions: [
    {
      name: 'payment-processor',
      endpoint: paymentFunction,
      filter: {
        eventType: 'OrderCreated',
      },
      retry: {
        maxDeliveryCount: 5,
        deadLetterDestination: 'payment-dlq',
      },
    },
    {
      name: 'inventory-updater',
      endpoint: inventoryFunction,
      filter: {
        eventTypes: ['OrderCreated', 'OrderCancelled'],
      },
    },
  ],
  monitoring: {
    publishFailureAlert: {
      threshold: 10,
      severity: 'Error',
    },
  },
});
```

### After

```typescript
import { Topic, greaterThan } from '@atakora/component/events';

export const orderEventTopic = Topic('order-events')
  .subscription('payment-processor')
  .endpoint(paymentFunction)
  .filter((events) => events.type('OrderCreated'))
  .retries(5)
  .withDeadLetter('payment-dlq')
  .subscription('inventory-updater')
  .endpoint(inventoryFunction)
  .filter((events) => events.type('OrderCreated').type('OrderCancelled'))
  .monitoring((alerts) => alerts.onPublishFailure(greaterThan(10)).error())
  .export();
```

## Progressive Enhancement Examples

### Starting Simple

```typescript
// Minimum viable queue
export const basicQueue = Queue('basic').processor(myProcessor).export();
```

### Adding Features Incrementally

```typescript
// Add reliability
export const basicQueueV2 = Queue('basic')
  .processor(myProcessor)
  .retries(3)
  .withDeadLetterQueue()
  .export();

// Add monitoring
export const basicQueueV3 = Queue('basic')
  .processor(myProcessor)
  .retries(3)
  .withDeadLetterQueue()
  .monitoring((alerts) => alerts.onDeadLetter().error())
  .export();

// Add performance tuning
export const basicQueueV4 = Queue('basic')
  .processor(myProcessor)
  .retries(3)
  .withDeadLetterQueue()
  .batchSize(10)
  .parallelism(5)
  .monitoring((alerts) => alerts.onDeadLetter().error().onDepth(greaterThan(1000)).warn())
  .export();
```

## Comparison: Lines of Code

| Queue Type      | Old API  | New API  | Reduction |
| --------------- | -------- | -------- | --------- |
| Simple Queue    | 15 lines | 3 lines  | 80%       |
| Standard Queue  | 24 lines | 10 lines | 58%       |
| Complex Queue   | 45 lines | 20 lines | 56%       |
| With Monitoring | 35 lines | 12 lines | 66%       |

## Key Improvements

1. **Readability**: Code reads like natural language
2. **Discoverability**: IDE autocomplete guides through options
3. **Type Safety**: No more string-based time values
4. **Composability**: Reusable policies and configurations
5. **Progressive**: Start simple, enhance as needed
6. **Maintainability**: Easier to modify and understand

## Developer Feedback Examples

### Before

"This doesn't feel like a DX, it feels like a loose abstraction for an ARM template."

### After (Expected)

"This feels like writing TypeScript! The API guides me through options, and I can start simple and add complexity as needed."

"The autocomplete is amazing - I don't need to look at docs to understand what's available."

"Time helpers and thresholds make the code so much more readable and less error-prone."

"Presets save me so much time - I can get a production-ready queue in 3 lines!"
