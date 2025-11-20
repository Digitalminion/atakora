# Fluent Queue API - Migration Guide

## Overview

This guide helps you migrate from the current configuration-based queue API to the new fluent API that provides a superior developer experience.

## Quick Start

### Step 1: Update Imports

```typescript
// Old
import { defineQueue } from '@atakora/component/queues';

// New
import { Queue, minutes, hours, days } from '@atakora/component/queues';
import { greaterThan, olderThan, between } from '@atakora/component/monitoring';
import { exponentialBackoff } from '@atakora/component/retry';
```

### Step 2: Basic Migration Pattern

The fundamental change is from configuration objects to method chaining:

```typescript
// Old: Configuration object
export const myQueue = defineQueue({
  name: 'my-queue',
  processor: myProcessor,
  queue: { /* config */ },
  monitoring: { /* config */ }
});

// New: Fluent builder
export const myQueue = Queue('my-queue')
  .processor(myProcessor)
  .ttl(days(7))
  .monitoring(alerts => /* config */)
  .export();
```

## Common Migration Patterns

### Time Values

```typescript
// Old: String-based time spans
messageTimeToLive: '7.00:00:00'      // 7 days
visibilityTimeout: '00:10:00'        // 10 minutes
minimumInterval: '00:00:05'          // 5 seconds

// New: Type-safe duration helpers
ttl(days(7))
visibility(minutes(10))
initialDelay(seconds(5))
```

### Dead Letter Queue

```typescript
// Old
deadLetterQueue: {
  enabled: true,
  name: 'my-queue-dlq',
  maxDeliveryCount: 5
}

// New
.withDeadLetterQueue('my-queue-dlq')
.deadLetterAfter(5)

// Or with defaults
.withDeadLetterQueue()  // Auto-names as '{queue-name}-dlq'
```

### Retry Configuration

```typescript
// Old
retry: {
  strategy: 'exponential',
  maxRetryCount: 3,
  minimumInterval: '00:00:05',
  maximumInterval: '00:00:30'
}

// New
.retry(exponentialBackoff()
  .maxAttempts(3)
  .initialDelay(seconds(5))
  .maxDelay(seconds(30))
)
```

### Monitoring and Alerts

```typescript
// Old
monitoring: {
  queueDepthAlert: {
    threshold: 1000,
    severity: 'Warning'
  },
  messageAgeAlert: {
    threshold: '01:00:00',
    severity: 'Error'
  }
}

// New
.monitoring(alerts => alerts
  .onDepth(greaterThan(1000)).warn()
  .onMessageAge(olderThan(hours(1))).error()
)
```

## Complete Migration Examples

### Example 1: Simple Queue

```typescript
// Old
export const simpleQueue = defineQueue({
  name: 'simple',
  processor: simpleProcessor,
  queue: {
    messageTimeToLive: '7.00:00:00',
    maxDeliveryCount: 3
  }
});

// New
export const simpleQueue = Queue('simple')
  .processor(simpleProcessor)
  .ttl(days(7))
  .retries(3)
  .export();
```

### Example 2: Queue with Monitoring

```typescript
// Old
export const monitoredQueue = defineQueue({
  name: 'monitored',
  processor: processor,
  queue: {
    messageTimeToLive: '1.00:00:00',
    visibilityTimeout: '00:05:00',
    maxDeliveryCount: 5,
    deadLetterQueue: {
      enabled: true,
      name: 'monitored-dlq'
    }
  },
  monitoring: {
    queueDepthAlert: {
      threshold: 500,
      severity: 'Warning'
    },
    queueDepthCriticalAlert: {
      threshold: 1000,
      severity: 'Critical'
    },
    deadLetterAlert: {
      enabled: true,
      severity: 'Error'
    }
  }
});

// New
export const monitoredQueue = Queue('monitored')
  .processor(processor)
  .ttl(days(1))
  .visibility(minutes(5))
  .retries(5)
  .withDeadLetterQueue('monitored-dlq')
  .monitoring(alerts => alerts
    .onDepth(greaterThan(500)).warn()
    .onDepth(greaterThan(1000)).critical()
    .onDeadLetter().error()
  )
  .export();
```

### Example 3: High-Performance Queue

```typescript
// Old
export const performanceQueue = defineQueue({
  name: 'performance',
  processor: processor,
  queue: {
    messageTimeToLive: '0.01:00:00',
    visibilityTimeout: '00:00:30',
    maxDeliveryCount: 1
  },
  scale: {
    batchSize: 32,
    maxConcurrentExecutions: 10
  },
  retry: {
    strategy: 'fixed',
    maxRetryCount: 0
  }
});

// New - Option 1: Using preset
export const performanceQueue = Queue('performance')
  .processor(processor)
  .highThroughput()
  .retries(1)
  .export();

// New - Option 2: Custom configuration
export const performanceQueue = Queue('performance')
  .processor(processor)
  .ttl(hours(1))
  .visibility(seconds(30))
  .batchSize(32)
  .parallelism(10)
  .retries(1)
  .export();
```

## Mapping Reference

| Old Property | New Method | Example |
|--------------|------------|---------|
| `name` | Constructor parameter | `Queue('my-queue')` |
| `processor` | `.processor()` | `.processor(myFunction)` |
| `queue.messageTimeToLive` | `.ttl()` | `.ttl(days(7))` |
| `queue.visibilityTimeout` | `.visibility()` | `.visibility(minutes(5))` |
| `queue.lockDuration` | `.lockDuration()` | `.lockDuration(minutes(10))` |
| `queue.maxDeliveryCount` | `.retries()` | `.retries(3)` |
| `queue.deadLetterQueue.enabled` | `.withDeadLetterQueue()` | `.withDeadLetterQueue()` |
| `queue.deadLetterQueue.name` | `.withDeadLetterQueue(name)` | `.withDeadLetterQueue('dlq')` |
| `queue.deadLetterQueue.maxDeliveryCount` | `.deadLetterAfter()` | `.deadLetterAfter(5)` |
| `queue.requiresDuplicateDetection` | `.withDuplicateDetection()` | `.withDuplicateDetection()` |
| `queue.duplicateDetectionWindow` | `.withDuplicateDetection(window)` | `.withDuplicateDetection(minutes(10))` |
| `queue.requiresSession` | `.withSessions()` | `.withSessions()` |
| `scale.batchSize` | `.batchSize()` | `.batchSize(10)` |
| `scale.maxConcurrentExecutions` | `.parallelism()` | `.parallelism(5)` |
| `retry.*` | `.retry()` | `.retry(exponentialBackoff()...)` |
| `monitoring.*` | `.monitoring()` | `.monitoring(alerts => ...)` |
| `tags` | `.tags()` | `.tags({ env: 'prod' })` |

## Using Presets

Presets provide optimized configurations for common patterns:

```typescript
// High Throughput - for event streams
Queue('events')
  .processor(eventProcessor)
  .highThroughput()  // batchSize(32), parallelism(10), visibility(30s)
  .export();

// Low Latency - for real-time processing
Queue('realtime')
  .processor(realtimeProcessor)
  .lowLatency()  // batchSize(1), parallelism(5), visibility(10s)
  .export();

// Long Running - for batch jobs
Queue('batch')
  .processor(batchProcessor)
  .longRunning()  // visibility(30m), lockDuration(1h), ttl(14d)
  .export();

// Reliable - for critical operations
Queue('critical')
  .processor(criticalProcessor)
  .reliable()  // retries(5), DLQ, duplicate detection, aggressive retry
  .export();
```

## Advanced Patterns

### Custom Retry Policies

```typescript
// Old: Limited to basic configuration
retry: {
  strategy: 'exponential',
  maxRetryCount: 5
}

// New: Full control over retry behavior
.retry(exponentialBackoff()
  .maxAttempts(10)
  .initialDelay(seconds(1))
  .maxDelay(minutes(10))
  .backoffMultiplier(2)
  .withJitter()
)

// Or use presets
.retry(aggressive())  // 10 attempts, 1s-10m
.retry(conservative())  // 3 attempts, 30s-30m
.retry(immediate())  // 3 attempts, no delay
```

### Complex Monitoring

```typescript
// Old: Limited alert types
monitoring: {
  queueDepthAlert: { threshold: 1000, severity: 'Warning' }
}

// New: Rich monitoring with actions
.monitoring(alerts => alerts
  .onDepth(greaterThan(1000)).warn()
  .onDepth(greaterThan(5000)).critical()
    .withEmail('oncall@company.com')
    .withWebhook('https://pagerduty.com/webhook')
  .onMessageAge(olderThan(hours(1))).warn()
  .onProcessingTime(between(minutes(5), minutes(10))).warn()
  .onProcessingTime(greaterThan(minutes(10))).error()
  .onFailureRate(greaterThan(0.05)).critical()
  .onDeadLetter().error()
)
```

## Validation and Type Safety

The new API provides compile-time validation:

```typescript
// These will cause TypeScript errors:
Queue('my-queue')
  .ttl('7.00:00:00')  // ❌ Error: Expected Duration, got string
  .retries('3')  // ❌ Error: Expected number, got string
  .export();  // ❌ Error: Missing required processor()

// Correct usage:
Queue('my-queue')
  .processor(myProcessor)  // ✓ Required
  .ttl(days(7))  // ✓ Type-safe
  .retries(3)  // ✓ Type-safe
  .export();
```

## Gradual Migration Strategy

You don't need to migrate everything at once:

1. **Phase 1**: New queues use the fluent API
2. **Phase 2**: Migrate simple queues during regular maintenance
3. **Phase 3**: Migrate complex queues when adding features
4. **Phase 4**: Deprecate old API after full migration

## Getting Help

### IntelliSense Support

The fluent API is designed for discoverability. Type `.` after any method to see available options:

```typescript
Queue('my-queue')
  .  // IDE shows: processor, ttl, visibility, retries, withDeadLetterQueue, etc.
```

### Common Patterns Cookbook

```typescript
// Standard web API queue
const apiQueue = Queue('api-requests')
  .processor(apiProcessor)
  .standardRetries()
  .withDeadLetterQueue()
  .export();

// Background job queue
const jobQueue = Queue('background-jobs')
  .processor(jobProcessor)
  .longRunning()
  .withDeadLetterQueue()
  .export();

// Event streaming queue
const eventQueue = Queue('events')
  .processor(eventProcessor)
  .highThroughput()
  .withMetrics()
  .export();

// Payment processing (high reliability)
const paymentQueue = Queue('payments')
  .processor(paymentProcessor)
  .reliable()
  .withEncryption()
  .withSessions()  // Process payments in order per customer
  .export();
```

## Summary

The new fluent API transforms queue configuration from tedious JSON-like objects into expressive, type-safe TypeScript code. The migration is straightforward:

1. Replace string-based times with duration helpers
2. Use method chaining instead of nested objects
3. Leverage presets for common patterns
4. Take advantage of progressive enhancement

The result is code that's easier to write, read, and maintain - a true TypeScript developer experience.