# Summary: Queue and Event Processing Patterns

## Executive Summary

The Gen 2 architecture clarifies Azure's actual resource model for message and event processing. Key insight: **Queues and Event Topics don't have "handlers" - they require Azure Functions with triggers**.

## The Truth About Azure

### What Azure Actually Provides

1. **Message Infrastructure**:
   - Storage Queues: Simple message storage
   - Service Bus: Advanced messaging with topics/subscriptions
   - Event Grid: Event routing service
   - Event Hubs: High-volume event streaming

2. **Compute for Processing**:
   - Azure Functions: Serverless compute that processes messages/events
   - Container Apps: Microservices that can consume messages
   - Logic Apps: Workflow orchestration

**Critical Point**: The infrastructure stores/routes messages. Processing requires separate compute resources.

## Our Solution: Processor Pattern

### Folder Structure Reflects Reality

```
queue-processors/       # Queue + Function together
event-processors/       # Event Topic + Function together
scheduled-jobs/         # Just Function (no infrastructure)
blob-processors/        # Storage + Function together
```

### Why This Works

1. **Technically Accurate**: Shows both resources are created
2. **Developer Friendly**: Single folder for related concerns
3. **Self-Documenting**: Name describes the purpose
4. **Consistent**: Same pattern for all trigger types

## Pattern by Type

### Queue Processors

```typescript
defineQueueProcessor({
  name: 'order-processing',
  queue: { ... },      // Creates Azure Queue
  handler: './handler.ts'  // Creates Azure Function
})
```

**Creates**: Storage Queue + Azure Function with queue trigger

### Event Processors

```typescript
defineEventProcessor({
  name: 'user-activity',
  eventTypes: [...],   // Creates Event Grid subscription
  handler: './handler.ts'  // Creates Azure Function
})
```

**Creates**: Event Grid Topic/Subscription + Azure Function

### Scheduled Jobs

```typescript
defineScheduledJob({
  name: 'daily-cleanup',
  schedule: '0 2 * * *', // No infrastructure
  handler: './handler.ts', // Creates Azure Function
});
```

**Creates**: Only Azure Function with timer trigger

## Key Principles

1. **Transparency**: Each processor's README documents exact Azure resources
2. **Abstraction**: Helpers hide complexity while being accurate
3. **Convention**: Consistent naming across all processor types
4. **Documentation**: Clear about what's actually happening in Azure

## Migration Impact

- Rename `queues/` → `queue-processors/`
- Rename `events/` → `event-processors/`
- Add README.md to each processor
- Update imports in index.ts

## Benefits

1. **No Confusion**: Clear what resources are created
2. **Better Mental Model**: Processors are first-class citizens
3. **Easier Debugging**: Understand the full architecture
4. **Consistent Pattern**: Works for all trigger types

## Related ADRs

- **ADR-019**: Queue Processor Pattern
- **ADR-020**: Trigger Pattern Consistency
- **ADR-017**: Backend Component Pattern

## Conclusion

By naming our abstractions accurately (`queue-processors` not `queues`), we:

- Maintain technical accuracy
- Provide better developer experience
- Create self-documenting code
- Avoid architectural confusion

The pattern scales to all Azure Function trigger types while keeping the developer experience simple and intuitive.
