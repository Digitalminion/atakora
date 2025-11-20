# Event Model Default Configuration

This document describes the default configuration for event models (`e.model`) including queues, processors, and monitoring.

## Overview

Event models generate async processing pipelines with Azure Storage Queues. Each event model creates a publish endpoint, a queue, a processor function, and a dead letter queue.

## Default Configuration

### Queue Backend

**Default: Azure Storage Queue**

```yaml
Type: Azure Storage Queue
Visibility Timeout: 300 seconds (5 minutes)
Message TTL: 1209600 seconds (14 days)
Max Dequeue Count: 5
Dead Letter Queue: Automatic
```

**Why Storage Queue?**
- ✅ Simple and cost-effective
- ✅ Good for high-volume, simple messaging
- ✅ 64 KB message limit (sufficient for most events)
- ✅ At-least-once delivery
- ❌ No ordering guarantees
- ❌ No transactions or sessions

**Alternative: Service Bus** (when you need ordering/transactions)
```typescript
DataUploaded: e.model({...})
  .queue('serviceBus')  // Override to use Service Bus
  .session('datasetId') // FIFO ordering per dataset
```

---

## Event Flow

```
1. Client Request
   POST /api/events/data-uploaded
   ↓
2. Validation Function
   - Validates event schema
   - Checks authentication
   - Checks authorization
   - Writes to queue
   - Returns 202 Accepted
   ↓
3. Azure Storage Queue
   - Stores message
   - Visibility timeout: 5 min
   - Retry logic: exponential backoff
   ↓
4. Processor Function (Queue-triggered)
   - Reads from queue
   - Validates schema (redundant check)
   - Executes processor logic
   - On success: acknowledge (delete message)
   - On failure: retry or dead letter
   ↓
5. Dead Letter Queue (if all retries fail)
   - Stores failed messages
   - Manual inspection required
   - Can replay messages
```

---

## Generated Functions

### Publish Function (HTTP Trigger)

**Endpoint:** `POST /api/events/{event-name}`

**Example:** `POST /api/events/data-uploaded`

**Default Behavior:**
```typescript
async function publishDataUploaded(req: HttpRequest): Promise<HttpResponse> {
  // 1. Extract event data from request body
  const event = req.body;

  // 2. Validate against event schema
  const validation = validateEvent('DataUploaded', event);
  if (!validation.valid) {
    return {
      statusCode: 400,
      body: {
        error: 'Validation Error',
        details: validation.errors,
      },
    };
  }

  // 3. Check authentication
  const user = await authenticate(req);
  if (!user) {
    return {
      statusCode: 401,
      body: { error: 'Unauthorized' },
    };
  }

  // 4. Check authorization (can user publish this event?)
  const authorized = await authorizeEvent('DataUploaded', user, event);
  if (!authorized) {
    return {
      statusCode: 403,
      body: { error: 'Forbidden' },
    };
  }

  // 5. Generate event ID and timestamp
  const eventId = generateId();
  const queuedAt = new Date().toISOString();

  // 6. Add metadata to event
  const enrichedEvent = {
    ...event,
    _meta: {
      eventId,
      eventType: 'DataUploaded',
      publishedBy: user.id,
      publishedAt: queuedAt,
      version: '1.0',
    },
  };

  // 7. Write to queue
  await queueClient.sendMessage(
    JSON.stringify(enrichedEvent),
    {
      visibilityTimeout: 0,  // Visible immediately
    }
  );

  // 8. Log to Application Insights
  telemetry.trackEvent('EventPublished', {
    eventType: 'DataUploaded',
    eventId,
    userId: user.id,
  });

  // 9. Return response
  return {
    statusCode: 202,  // Accepted
    body: {
      eventId,
      status: 'queued',
      queuedAt,
    },
  };
}
```

**Response:**
```json
{
  "eventId": "evt_abc123def456",
  "status": "queued",
  "queuedAt": "2025-01-15T10:30:00Z"
}
```

---

### Processor Function (Queue Trigger)

**Trigger:** Azure Storage Queue message

**Default Behavior:**
```typescript
async function processDataUploaded(queueMessage: QueueMessage): Promise<void> {
  const startTime = Date.now();
  const message = JSON.parse(queueMessage.messageText);

  try {
    // 1. Log processing start
    context.log('Processing event:', {
      eventType: 'DataUploaded',
      eventId: message._meta.eventId,
      dequeueCount: queueMessage.dequeueCount,
    });

    // 2. Validate schema (redundant but safe)
    const validation = validateEvent('DataUploaded', message);
    if (!validation.valid) {
      throw new Error(`Invalid event schema: ${validation.errors}`);
    }

    // 3. Execute processor logic
    // Default: Just log the event
    context.log('Event data:', message);

    // Custom processor would be here:
    // await customProcessor(context, message);

    // 4. Log processing complete
    const duration = Date.now() - startTime;
    telemetry.trackMetric('event.data-uploaded.processed', 1);
    telemetry.trackMetric('event.data-uploaded.duration', duration);

    context.log('Event processed successfully:', {
      eventId: message._meta.eventId,
      duration,
    });

    // 5. Message is automatically deleted (acknowledged)

  } catch (error) {
    // 6. Log error
    const duration = Date.now() - startTime;
    telemetry.trackException(error, {
      eventType: 'DataUploaded',
      eventId: message._meta.eventId,
      dequeueCount: queueMessage.dequeueCount,
      duration,
    });

    context.log.error('Event processing failed:', {
      eventId: message._meta.eventId,
      error: error.message,
      dequeueCount: queueMessage.dequeueCount,
    });

    // 7. Throw error to trigger retry
    throw error;
  }
}
```

---

## Retry Logic

### Default Retry Configuration

```yaml
Max Retries: 5
Retry Delay: Exponential backoff
Visibility Timeout: 300 seconds (5 minutes)
```

**Retry Schedule:**
```
Attempt 1: Immediate (0s delay)
Attempt 2: 30s after first failure (visibility timeout ÷ 10)
Attempt 3: 1m after second failure (30s × 2)
Attempt 4: 2m after third failure (1m × 2)
Attempt 5: 4m after fourth failure (2m × 2)
Attempt 6 (final): 8m after fifth failure (4m × 2)
→ Dead Letter Queue
```

**Total Time:** ~15 minutes from first failure to dead letter

**Why Exponential Backoff?**
- ✅ Gives transient errors time to resolve
- ✅ Reduces load during incidents
- ✅ Avoids thundering herd

---

### Dead Letter Queue

**Automatic Creation:**
```
Main Queue: data-uploaded
Dead Letter: data-uploaded-deadletter
```

**Messages Move to Dead Letter When:**
- Dequeue count exceeds max retries (5)
- Message expires (14 days)
- Poison message (repeatedly fails)

**Dead Letter Configuration:**
```yaml
Max Messages: Unlimited
Retention: 14 days (same as main queue)
```

**Monitoring:**
```yaml
Alert When: Queue depth > 10
Alert Level: Critical
Action: Email + SMS to on-call
```

**Manual Replay:**
```bash
# List dead letter messages
az storage message peek \
  --queue-name data-uploaded-deadletter

# Move message back to main queue
az storage message put \
  --queue-name data-uploaded \
  --content "<message>"

# Or process manually
node scripts/replay-dead-letter.js \
  --queue data-uploaded-deadletter \
  --event-id evt_abc123
```

---

## Custom Processors

### Default Processor

If no custom processor is attached, events are just logged:

```typescript
async function defaultProcessor(context, event) {
  context.log('Event received:', {
    eventType: event._meta.eventType,
    eventId: event._meta.eventId,
    publishedAt: event._meta.publishedAt,
    data: event,
  });
}
```

**Use Case:** Quick MVP, event auditing, debugging

---

### Custom Processor

Attach custom logic in `src/event/resource.ts`:

```typescript
import { defineEvents, configureEvent, days, minutes } from '@atakora/component/events';

export const event = defineEvents({
  DataUploaded: configureEvent('DataUploaded')
    // Queue settings
    .ttl(days(7))              // 7 days instead of 14
    .visibility(minutes(2))    // 2 min instead of 5
    .retries(10)               // 10 retries instead of 5

    // Custom processor
    .withProcessor(async (context, event) => {
      // 1. Validate file exists
      const fileExists = await context.storage.blobExists(
        'datasets',
        extractBlobPath(event.fileUrl)
      );

      if (!fileExists) {
        throw new Error(`File not found: ${event.fileUrl}`);
      }

      // 2. Update dataset status
      await context.db.datasets.update(event.datasetId, {
        status: 'validating',
        fileUrl: event.fileUrl,
        fileSizeBytes: event.fileSizeBytes,
        uploadedAt: event.uploadedAt,
        uploadedBy: event.userId,
      });

      // 3. Trigger validation (publish next event)
      await context.publish('DataValidationRequested', {
        datasetId: event.datasetId,
        fileUrl: event.fileUrl,
        requestedAt: new Date().toISOString(),
      });

      // 4. Send notification
      await context.notifications.send({
        userId: event.userId,
        type: 'email',
        template: 'data-uploaded',
        data: {
          datasetId: event.datasetId,
          fileName: event.fileName,
        },
      });

      context.log('Data upload processing complete:', {
        datasetId: event.datasetId,
        nextStep: 'validation',
      });
    })

    // Monitoring
    .monitoring(alerts =>
      alerts
        .onFailure('critical')            // Alert on processing failure
        .onQueueDepth(100, 'warning')     // Warn if queue backs up
        .onDeadLetter('critical')         // Alert on dead letter
        .onProcessingTime(300, 'warning') // Warn if > 5 min to process
    ),
});

// Attach to backend
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
```

---

## Batch Processing

**Default: Single Message**

Process one message at a time:
```yaml
Batch Size: 1
Concurrency: Based on Function App scaling
```

**Enable Batch Processing:**
```typescript
DataUploaded: configureEvent('DataUploaded')
  .batchSize(32)  // Process up to 32 messages at once
  .withProcessor(async (context, events) => {
    // events is an array of up to 32 messages
    const results = await Promise.allSettled(
      events.map(event => processEvent(context, event))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    context.log(`Batch processed: ${succeeded} succeeded, ${failed} failed`);

    // Failed events will automatically retry individually
  })
```

**Benefits:**
- ✅ Higher throughput (process 32× faster)
- ✅ Lower costs (fewer function invocations)
- ✅ Better resource utilization

**Tradeoffs:**
- ❌ One failure doesn't fail entire batch (need explicit error handling)
- ❌ Longer processing time per invocation
- ❌ More complex error handling

---

## Monitoring

### Automatic Metrics

Application Insights tracks these metrics automatically:

```yaml
Event Publishing:
  - event.{name}.published.count
  - event.{name}.published.duration
  - event.{name}.publish.errors

Event Processing:
  - event.{name}.processed.count
  - event.{name}.processing.duration
  - event.{name}.processing.errors
  - event.{name}.retry.count
  - event.{name}.deadletter.count

Queue Metrics:
  - queue.{name}.depth
  - queue.{name}.age (oldest message)
  - queue.{name}.deadletter.depth
```

### Automatic Alerts

**Default Alerts:**

**Queue Depth:**
```yaml
Condition: Queue depth > 1000
Severity: Warning
Action: Email ops team
```

**Dead Letter Messages:**
```yaml
Condition: Dead letter queue depth > 0
Severity: Critical
Action: Email + SMS on-call
```

**Processing Failures:**
```yaml
Condition: Processing error rate > 5%
Severity: Warning
Action: Email ops team
```

---

## Performance Characteristics

### Throughput

**Single Message Processing:**
```
Per instance: ~100 messages/second
With 10 instances: ~1000 messages/second
With 20 instances: ~2000 messages/second
```

**Batch Processing (32 messages):**
```
Per instance: ~500-1000 messages/second
With 10 instances: ~5000-10000 messages/second
With 20 instances: ~10000-20000 messages/second
```

### Latency

**End-to-End (Publish → Process → Complete):**
```
P50: 100ms
P95: 500ms
P99: 2s

Breakdown:
- Publish (HTTP): 20ms
- Queue write: 10ms
- Queue visibility: 0-5000ms (depends on load)
- Processing: 50-1000ms (depends on logic)
```

**Queue Delay:**
```
Low load (<100 msg/s): <100ms
Medium load (100-1000 msg/s): 100-1000ms
High load (>1000 msg/s): 1-5 seconds
```

---

## Cost

### Per Event

**Publishing:**
```
Function execution: ~1ms
Cost: ~$0.000002 per event
```

**Queue Storage:**
```
Write operation: 1 operation
Read operation: 1 operation per attempt
Delete operation: 1 operation
Cost: $0.05 per 10,000 operations = $0.000005 per event
```

**Processing:**
```
Function execution: ~50-500ms (depends on logic)
Cost: ~$0.00002-$0.0002 per event
```

**Total per Event:** ~$0.00003 (3¢ per 1000 events)

### Monthly Estimates

**Low Volume (10K events/day):**
```
Publishing: $0.60/month
Queue: $1.50/month
Processing: $6.00/month
Total: ~$8/month
```

**Medium Volume (100K events/day):**
```
Publishing: $6/month
Queue: $15/month
Processing: $60/month
Total: ~$81/month
```

**High Volume (1M events/day):**
```
Publishing: $60/month
Queue: $150/month
Processing: $600/month
Total: ~$810/month
```

---

## When to Override Defaults

### Use Defaults When:
- ✅ Event processing < 5 seconds
- ✅ No ordering requirements
- ✅ At-least-once delivery is OK
- ✅ Event payload < 64 KB
- ✅ Throughput < 1000 events/second

### Override When:
- ⚠️ Need FIFO ordering
- ⚠️ Need exactly-once delivery
- ⚠️ Need transactions
- ⚠️ Event payload > 64 KB
- ⚠️ Throughput > 1000 events/second
- ⚠️ Long processing (>5 minutes)
- ⚠️ Need message sessions

### Override to Service Bus:

```typescript
DataUploaded: e.model({...})
  .queue('serviceBus')       // Use Service Bus instead
  .session('datasetId')      // FIFO per dataset
  .transaction(true)         // Enable transactions
  .maxSize(1024)            // 1 MB messages (vs 64 KB)
```

**Service Bus Features:**
```yaml
✅ FIFO ordering (with sessions)
✅ Exactly-once delivery (with transactions)
✅ Message sessions
✅ Scheduled messages
✅ Dead lettering
✅ 1 MB message size (vs 64 KB)
✅ Topics and subscriptions

Cost: ~10× more expensive than Storage Queue
```

---

## Related Documentation

- [Function App Defaults](./function-app-defaults.md) - Processor function configuration
- [Storage Defaults](./storage-defaults.md) - Queue storage configuration
- [Schema Events](../schema-events.md) - Event model definition
- [Event Configuration](../events.md) - Override event settings
