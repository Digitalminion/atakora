# Events Unification Migration Guide

## Overview

The Atakora framework now provides a unified events namespace that consolidates all event-driven infrastructure (Storage Queues, Event Grid Topics, Service Bus Queues, and Service Bus Topics) into a single, consistent API. This guide explains how to migrate from the old scattered patterns to the new unified approach.

## Why Migrate?

### Current Problems

- **Scattered Implementation**: Events spread across `queue-processors/`, `event-topics/`, and `infrastructure/service-bus/` folders
- **Inconsistent APIs**: Each pattern has different configuration methods
- **Import Complexity**: Must remember multiple import paths
- **Poor Discoverability**: No single place to see all event infrastructure

### Benefits of Unified Events

- **Single Import**: All event infrastructure from `@atakora/component/events`
- **Consistent API**: Same builder patterns work across all event types
- **Progressive Enhancement**: Start simple, add complexity as needed
- **Better IntelliSense**: Full type support and autocomplete
- **Centralized Configuration**: Global settings for all events

## Migration Steps

### Step 1: Install/Update Dependencies

Ensure you have the latest version of `@atakora/component`:

```bash
npm install @atakora/component@latest
```

### Step 2: Create New Unified Events File

Create `events/resource.ts` with the unified API:

```typescript
// events/resource.ts
import {
  defineEvents,
  queue,
  topic,
  serviceBusQueue,
  serviceBusTopic,
  days,
  hours,
  minutes,
} from '@atakora/component/events';

// Import your processor functions
import { dataQualityProcessor } from '../functions/data-quality-processor/resource';
import { emailProcessor } from '../functions/email-processor/resource';
import { auditLogger } from '../functions/audit-logger/resource';

export const events = defineEvents({
  // Storage Queues
  dataQuality: queue('data-quality')
    .processor(dataQualityProcessor)
    .ttl(days(7))
    .retries(3)
    .deadLetter(),

  email: queue('email').processor(emailProcessor).ttl(days(2)).reliable(),

  // Event Grid Topics
  auditLogs: topic('audit-logs')
    .processor(auditLogger)
    .events(['Auth.*', 'Data.*'])
    .retention(days(90)),

  // Service Bus Queues
  orders: serviceBusQueue('orders')
    .processor(orderProcessor)
    .sessions()
    .duplicateDetection(minutes(10)),

  // Service Bus Topics
  notifications: serviceBusTopic('notifications')
    .subscription('email', emailProcessor)
    .subscription('sms', smsProcessor)
    .subscription('push', pushProcessor),
});
```

### Step 3: Update Your Main Application File

Replace old imports with the unified events:

#### Before:

```typescript
// index.ts
import { dataQualityQueue } from './queue-processors/data-quality/resource';
import { emailQueue } from './queue-processors/email/resource';
import { auditLogsTopic } from './event-topics/audit-logger/resource';
import { serviceBus } from './infrastructure/service-bus/resource';

backend.dataQualityQueue = dataQualityQueue;
backend.emailQueue = emailQueue;
backend.auditLogsTopic = auditLogsTopic;
backend.serviceBus = serviceBus;
```

#### After:

```typescript
// index.ts
import { events } from './events/resource';

// Deploy all events at once
events.deploy(resourceGroup);

// Or attach to backend
backend.events = events;
```

### Step 4: Migrate Specific Patterns

#### Storage Queue Migration

**Old Pattern:**

```typescript
// queue-processors/data-quality/resource.ts
import { Queue } from '@atakora/component/queues';

export const dataQualityQueue = Queue('data-quality')
  .messageTimeToLive(days(7))
  .visibilityTimeout(minutes(5))
  .maxDeliveryCount(3)
  .processor(dataQualityProcessor);
```

**New Pattern:**

```typescript
dataQuality: queue('data-quality')
  .processor(dataQualityProcessor)
  .ttl(days(7))
  .visibilityTimeout(minutes(5))
  .retries(3)
  .deadLetter();
```

#### Event Grid Topic Migration

**Old Pattern:**

```typescript
// event-topics/audit-logger/resource.ts
import { EventTopic } from '../builders';

export const auditLogsTopic = EventTopic('audit-logs')
  .processor(auditLogger)
  .eventTypes(['Auth.*', 'Data.*'])
  .retentionDays(90);
```

**New Pattern:**

```typescript
auditLogs: topic('audit-logs')
  .processor(auditLogger)
  .events(['Auth.*', 'Data.*'])
  .retention(days(90))
  .schema('CloudEventSchemaV1_0');
```

#### Service Bus Queue Migration

**Old Pattern:**

```typescript
// infrastructure/service-bus/resource.ts
const serviceBus = ServiceBus('app-bus').queue('orders', (q) =>
  q.requiresSession(true).duplicateDetection(minutes(10)).maxDeliveryCount(3)
);
```

**New Pattern:**

```typescript
orders: serviceBusQueue('orders').sessions().duplicateDetection(minutes(10)).maxDeliveryCount(3);
```

#### Service Bus Topic Migration

**Old Pattern:**

```typescript
const serviceBus = ServiceBus('app-bus').topic('notifications', (t) =>
  t.subscription('email', emailHandler).subscription('sms', smsHandler)
);
```

**New Pattern:**

```typescript
notifications: serviceBusTopic('notifications')
  .subscription('email', emailProcessor)
  .subscription('sms', smsProcessor)
  .subscription('high-priority', (sub) =>
    sub.filter("Priority = 'High'").processor(urgentProcessor)
  );
```

### Step 5: Use Preset Configurations

The unified API provides preset configurations for common scenarios:

```typescript
// Reliable queue processing
emailQueue: queue('email')
  .processor(emailProcessor)
  .reliable(), // Sets retries=5, deadLetter=true, visibilityTimeout=5min

// FIFO processing
orderQueue: serviceBusQueue('orders')
  .processor(orderProcessor)
  .fifo(), // Sets sessions=true, maxDeliveryCount=1, lockDuration=5min

// Broadcast messaging
systemEvents: serviceBusTopic('system-events')
  .broadcast(), // Sets ttl=1hr, partitioning=true, maxSize=5GB

// Audit logging
auditLogs: topic('audit-logs')
  .auditLog(), // Sets retention=90days, schema=CloudEvents, appropriate event types
```

### Step 6: Clean Up Old Code

Once migration is complete and tested:

1. Delete old folders:

   ```bash
   rm -rf queue-processors/
   rm -rf event-topics/
   rm -rf infrastructure/service-bus/
   ```

2. Remove old imports from your codebase

3. Update any documentation referencing old patterns

## Advanced Features

### Global Configuration

Set default configuration for all events:

```typescript
export const events = defineEvents(
  {
    // ... your events
  },
  {
    storageAccountName: 'myeventstorage',
    serviceBusNamespaceName: 'sb-events-prod',
    serviceBusSku: 'Standard',
    tags: {
      environment: 'production',
      team: 'platform',
    },
  }
);
```

### Progressive Enhancement

Start simple and add features as needed:

```typescript
// Start simple
dataQueue: queue('data'),

// Add processor
dataQueue: queue('data', dataProcessor),

// Add configuration
dataQueue: queue('data')
  .processor(dataProcessor)
  .ttl(days(7)),

// Full configuration
dataQueue: queue('data')
  .processor(dataProcessor)
  .ttl(days(7))
  .visibilityTimeout(minutes(10))
  .retries(3)
  .deadLetter()
  .batchSize(16)
  .tag('team', 'data-platform')
```

### Monitoring Configuration

Add monitoring to any event type:

```typescript
criticalQueue: queue('critical')
  .processor(criticalProcessor)
  .monitoring((m) =>
    m.queueDepth(1000, 'Warning').messageAge(hours(1), 'Error').onDeliveryFailure(5, 'Critical')
  );
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure you're importing from `@atakora/component/events`, not old paths
2. **Type Errors**: The new API uses different method names (e.g., `ttl()` instead of `messageTimeToLive()`)
3. **Missing Features**: Some advanced features may require additional configuration

### Getting Help

- Check the [ADR-020](../../architecture/decisions/adr-020-unified-events-namespace.md) for architectural decisions
- Review the [API documentation](../../reference/api/events.md)
- File issues on GitHub with the `events` label

## Reference

### Method Mapping

| Old Method            | New Method                          | Notes                      |
| --------------------- | ----------------------------------- | -------------------------- |
| `messageTimeToLive()` | `ttl()`                             | Accepts Duration objects   |
| `maxDeliveryCount()`  | `retries()` or `maxDeliveryCount()` | Both available             |
| `requiresSession()`   | `sessions()`                        | Simpler boolean method     |
| `eventTypes()`        | `events()`                          | Renamed for clarity        |
| `retentionDays()`     | `retention()`                       | Accepts Duration or number |

### Builder Methods by Type

**All Types:**

- `.processor()` - Attach handler
- `.tag()` / `.withTags()` - Resource tagging

**Storage Queue:**

- `.ttl()` - Message time to live
- `.visibilityTimeout()` - Lock duration
- `.retries()` - Max delivery attempts
- `.deadLetter()` - Enable DLQ
- `.batchSize()` - Concurrent processing

**Event Grid Topic:**

- `.events()` - Event type list
- `.schema()` - Event schema format
- `.retention()` - Event retention
- `.subscription()` - Add subscribers

**Service Bus Queue:**

- `.sessions()` - Enable sessions
- `.duplicateDetection()` - Dedup window
- `.lockDuration()` - Message lock
- `.partitioning()` - Enable partitions

**Service Bus Topic:**

- `.subscription()` - Add subscriptions
- `.supportOrdering()` - Message ordering
- `.maxSize()` - Topic size limit

## Conclusion

The unified events namespace simplifies event infrastructure management while maintaining full flexibility. The migration process is straightforward, and the benefits in terms of consistency, discoverability, and maintainability make it worthwhile for any Atakora-based project.