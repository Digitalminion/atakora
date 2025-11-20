# Migration Guide: Unified Events Namespace

This guide helps you migrate from the scattered event infrastructure pattern to the new unified events namespace introduced in ADR-020.

## Overview

The unified events namespace consolidates all event-driven infrastructure (Storage Queues, Event Grid Topics, Service Bus) into a single, consistent API pattern similar to the successful `data` namespace.

## Quick Comparison

### Before: Scattered Pattern
```typescript
// Multiple imports from different locations
import { Queue } from '@atakora/component/queues';
import { EventTopic } from '../event-topics/builders';
import { ServiceBus } from '../infrastructure/builders';
import { dataQualityProcessor } from './functions/data-quality-processor';
import { auditLogger } from './functions/audit-logger';

// Separate resource definitions
export const dataQualityQueue = Queue('data-quality')
  .messageTimeToLive(days(7))
  .processor(dataQualityProcessor);

export const auditLogsTopic = EventTopic('audit-logs')
  .schema('EventGridSchema')
  .processor(auditLogger);

export const serviceBus = ServiceBus('app-bus')
  .queue('orders', q => q.sessions());

// In index.ts - multiple assignments
backend.dataQualityQueue = dataQualityQueue;
backend.auditLogsTopic = auditLogsTopic;
backend.serviceBus = serviceBus;
```

### After: Unified Pattern
```typescript
// Single import for all events
import { defineEvents, queue, topic, serviceBusQueue } from '@atakora/component/events';

// All events in one place
export const events = defineEvents({
  dataQuality: queue('data-quality', dataQualityProcessor)
    .ttl(days(7)),

  auditLogs: topic('audit-logs', auditLogger)
    .schema('EventGridSchema'),

  orders: serviceBusQueue('orders', orderProcessor)
    .sessions(),
});

// In index.ts - single assignment
backend.events = events;
```

## Step-by-Step Migration

### Step 1: Identify Your Event Infrastructure

First, catalog all your existing event infrastructure:

1. **Storage Queues** - Usually in `queue-processors/` directories
2. **Event Grid Topics** - Usually in `event-topics/` directories
3. **Service Bus** - Usually in `infrastructure/service-bus/`

### Step 2: Create the Events Resource File

Create a new file `events/resource.ts` in your backend:

```typescript
// packages/backend/src/events/resource.ts
import { defineEvents, queue, topic, serviceBusQueue, serviceBusTopic } from '@atakora/component/events';
import { minutes, hours, days } from '@atakora/component/common';

// Import all your processor functions
import { dataQualityProcessor } from '../functions/data-quality-processor/resource';
import { emailProcessor } from '../functions/email-processor/resource';
import { auditLogger } from '../functions/audit-logger/resource';
import { orderProcessor } from '../functions/order-processor/resource';

export const events = defineEvents({
  // Your events will go here
});
```

### Step 3: Migrate Storage Queues

#### Old Pattern:
```typescript
// queue-processors/data-quality/resource.ts
import { Queue, minutes, hours, days } from '@atakora/component/queues';

export const dataQualityQueue = Queue('data-quality')
  .messageTimeToLive(days(7))
  .visibilityTimeout(minutes(10))
  .maxDeliveryCount(3)
  .processor(dataQualityProcessor, proc => proc
    .batchSize(16)
    .maxConcurrentBatches(5)
    .scale(0, 10)
  )
  .deadLetter(dlq => dlq
    .name('data-quality-dlq')
    .enabled(true)
  )
  .monitoring(alerts => alerts
    .queueDepth(greaterThan(1000), 'Warning')
    .messageAge(olderThan(hours(1)), 'Warning')
  )
  .tags({
    Team: 'DataPlatform',
    SLA: 'Tier1'
  });
```

#### New Pattern:
```typescript
// In events/resource.ts
dataQuality: queue('data-quality')
  .processor(dataQualityProcessor, proc => proc
    .batchSize(16)
    .maxConcurrentBatches(5)
    .scale(0, 10)
  )
  .ttl(days(7))
  .visibilityTimeout(minutes(10))
  .retries(3)  // Simplified from maxDeliveryCount
  .deadLetter()
  .monitoring(m => m
    .queueDepth(1000, 'Warning')
    .messageAge(hours(1), 'Warning')
  )
  .tag('Team', 'DataPlatform')
  .tag('SLA', 'Tier1'),
```

### Step 4: Migrate Event Grid Topics

#### Old Pattern:
```typescript
// event-topics/audit-logger/resource.ts
export const auditLogsTopic = EventTopic('audit-logs')
  .eventGridSchema()
  .dataResidency('WithinGeopair')
  .retention(30)
  .allAuditEvents()
  .subscription('audit-logger-subscription', sub =>
    sub
      .endpoint(auditLogger)
      .filter(filter => filter.allEventTypes())
      .maxDeliveryAttempts(1)
      .eventTimeToLive(minutes(30))
  )
  .withMonitoring(monitor => monitor.comprehensive())
  .withTags({
    purpose: 'audit-logging',
    compliance: 'required'
  });
```

#### New Pattern:
```typescript
// In events/resource.ts
auditLogs: topic('audit-logs')
  .processor(auditLogger)
  .events([
    'Authentication.*',
    'Authorization.*',
    'DataAccess.*',
    'Security.*'
  ])
  .schema('EventGridSchema')
  .retention(days(30))
  .subscription('critical-events', sub => sub
    .filter(f => f.severity('Critical', 'Error'))
    .maxDeliveryAttempts(1)
  )
  .monitoring(m => m
    .onPublishFailure(5, 'Error')
    .onDeliveryFailure(3, 'Warning')
  )
  .withTags({
    purpose: 'audit-logging',
    compliance: 'required'
  }),
```

### Step 5: Migrate Service Bus

#### Old Pattern:
```typescript
// infrastructure/service-bus/resource.ts
export const serviceBus = ServiceBus('app-bus')
  .standard()
  .queue('orders', q =>
    q
      .ttl(days(14))
      .sessions(true)
      .duplicateDetection(minutes(10))
      .withDeadLetter()
  )
  .topic('notifications', t =>
    t
      .ttl(hours(1))
      .subscription('email', sub => sub.forwardTo('email-queue'))
      .subscription('sms', sub => sub.forwardTo('sms-queue'))
  )
  .withMonitoring();
```

#### New Pattern:
```typescript
// In events/resource.ts
// Service Bus Queues
orders: serviceBusQueue('orders')
  .processor(orderProcessor)
  .sessions()
  .duplicateDetection(minutes(10))
  .ttl(days(14))
  .reliable(),

// Service Bus Topics
notifications: serviceBusTopic('notifications')
  .subscription('email', emailNotificationProcessor)
  .subscription('sms', smsNotificationProcessor)
  .ttl(hours(1))
  .pubSub(),
```

### Step 6: Update Backend Index

#### Old Pattern:
```typescript
// index.ts
import { dataQualityQueue } from './queue-processors/data-quality/resource';
import { emailQueue } from './queue-processors/email/resource';
import { auditLogsTopic } from './event-topics/audit-logger/resource';
import { serviceBus } from './infrastructure/service-bus/resource';

const backend = new Backend();

// Multiple assignments
backend.dataQualityQueue = dataQualityQueue;
backend.emailQueue = emailQueue;
backend.auditLogsTopic = auditLogsTopic;
backend.serviceBus = serviceBus;
```

#### New Pattern:
```typescript
// index.ts
import { events } from './events/resource';

const backend = new Backend();

// Single assignment
backend.events = events;
```

### Step 7: Clean Up Old Files

Once migration is complete and tested:

1. Delete old queue processor files in `queue-processors/`
2. Delete old event topic files in `event-topics/`
3. Remove Service Bus configuration from `infrastructure/`
4. Update any imports in test files

## Common Migration Patterns

### Pattern 1: Simple Queue with Processor
```typescript
// Before
export const emailQueue = Queue('email')
  .processor(emailProcessor)
  .messageTimeToLive(days(2));

// After
email: queue('email', emailProcessor).ttl(days(2)),
```

### Pattern 2: Topic with Multiple Subscriptions
```typescript
// Before
export const eventTopic = EventTopic('events')
  .subscription('sub1', s => s.endpoint(handler1))
  .subscription('sub2', s => s.endpoint(handler2));

// After
events: topic('events')
  .subscription('sub1', s => s.endpoint(handler1))
  .subscription('sub2', s => s.endpoint(handler2)),
```

### Pattern 3: Service Bus Queue with Sessions
```typescript
// Before
serviceBus.queue('orders', q => q.sessions(true).ttl(days(7)));

// After
orders: serviceBusQueue('orders').sessions().ttl(days(7)),
```

### Pattern 4: Complex Monitoring
```typescript
// Before
.monitoring(alerts => alerts
  .queueDepth(greaterThan(1000), 'Warning')
  .processingRate(rate => rate.below(10).window(minutes(5)))
)

// After
.monitoring(m => m
  .queueDepth(1000, 'Warning')
  // Simplified monitoring API
)
```

## API Mapping Reference

### Storage Queue Methods

| Old API | New API | Notes |
|---------|---------|-------|
| `.messageTimeToLive()` | `.ttl()` | Simplified name |
| `.maxDeliveryCount()` | `.retries()` | More intuitive |
| `.processor(fn, config)` | `.processor(fn, config)` | Same API |
| `.deadLetter(config)` | `.deadLetter()` | Simplified |
| `.tags({})` | `.withTags({})` | Consistent naming |

### Event Grid Topic Methods

| Old API | New API | Notes |
|---------|---------|-------|
| `.eventGridSchema()` | `.schema('EventGridSchema')` | Explicit |
| `.allAuditEvents()` | `.events(['Auth.*', ...])` | More flexible |
| `.withMonitoring()` | `.monitoring()` | Consistent |
| `.retention(days)` | `.retention(days(n))` | Duration objects |

### Service Bus Methods

| Old API | New API | Notes |
|---------|---------|-------|
| `ServiceBus().queue()` | `serviceBusQueue()` | Direct creation |
| `ServiceBus().topic()` | `serviceBusTopic()` | Direct creation |
| `.sessions(true)` | `.sessions()` | Boolean optional |
| `.withDeadLetter()` | Built-in | Automatic |

## Testing Your Migration

### 1. Verify Event Definitions
```typescript
// Test that all events are defined
import { events } from './events/resource';

console.log(Object.keys(events));
// Should list all your event names
```

### 2. Check Processor Attachments
```typescript
// Ensure processors are attached
events.dataQuality.processor === dataQualityProcessor; // true
```

### 3. Validate Configuration
```typescript
// Check that configuration is preserved
events.orders.sessionsEnabled; // true
events.auditLogs.retentionDays; // 30
```

## Benefits After Migration

1. **Single Import Location**
   - All events from `'./events/resource'`
   - No hunting through directories

2. **Consistent API**
   - Same patterns across all event types
   - Learn once, apply everywhere

3. **Better IntelliSense**
   - Type `events.` to see all available events
   - Autocomplete guides configuration

4. **Cleaner Code Organization**
   - All event infrastructure in one file
   - Easier to understand system topology

5. **Progressive Enhancement**
   - Start with minimal config
   - Add complexity only when needed

## Troubleshooting

### Issue: Import Errors
**Solution**: Ensure you're importing from `@atakora/component/events`, not the old locations.

### Issue: Missing Methods
**Solution**: Check the API mapping table above. Some methods have been renamed for consistency.

### Issue: Type Errors
**Solution**: The new API is fully typed. Let TypeScript guide you to the correct method names.

### Issue: Configuration Not Applied
**Solution**: Make sure to chain methods correctly. Each method returns `this` for chaining.

## Need Help?

If you encounter issues during migration:

1. Check the examples in `events/resource.ts`
2. Review ADR-020 for architectural context
3. Refer to the inline documentation in the builders
4. Ask the team - we're here to help!

## Summary

The unified events namespace brings the same simplicity and consistency that made the `data` namespace successful to all event-driven infrastructure. While migration requires some effort, the long-term benefits in maintainability, discoverability, and developer experience make it worthwhile.