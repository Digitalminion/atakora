# ADR-019: Queue Processor Pattern - Separating Infrastructure from Function Handlers

## Context

There's architectural confusion in the Gen 2 structure about queue processing. The current pattern suggests queues have "handlers" (`queues/data-quality/handler.ts`), implying direct JavaScript integration with Azure Storage Queues or Service Bus. However, this is technically inaccurate.

**Azure Reality**:
- Azure Storage Queues and Service Bus Queues are pure message infrastructure - they store and deliver messages
- They have NO native JavaScript execution capability
- Processing requires an Azure Function with a queue trigger binding
- The function polls the queue and processes messages
- There's no "queue handler" - there's a "function triggered by a queue"

**Current Misleading Pattern**:
```
queues/
  data-quality/
    resource.ts  -> Uses defineQueueProcessor()
    handler.ts   -> Implies the queue has a handler
```

This structure conflates two distinct Azure resources:
1. The queue infrastructure (Storage Queue or Service Bus Queue)
2. The Azure Function that processes messages from the queue

## Decision

We will adopt a **unified queue processor abstraction** that clearly communicates what's actually happening while providing a good developer experience.

### Pattern: Queue Processors as First-Class Citizens

Keep the current folder structure but clarify the mental model:

```
queue-processors/           # Renamed from "queues" for clarity
  data-quality/
    resource.ts            # Defines BOTH queue AND function with trigger
    handler.ts             # Function code that processes queue messages
    README.md              # Explains what resources are created
```

### What `defineQueueProcessor()` Actually Creates

The `defineQueueProcessor()` helper creates TWO Azure resources:

1. **Queue Infrastructure**:
   - Azure Storage Queue (default) or Service Bus Queue
   - Dead letter queue (if enabled)
   - Queue policies and settings

2. **Processing Function**:
   - Azure Function with queue trigger binding
   - Automatic retry configuration
   - Batch processing settings
   - Connection to the queue

### Clear Naming Convention

- Directory: `queue-processors/` (not `queues/`)
- Helper: `defineQueueProcessor()` (accurately describes creating both)
- Handler: Still `handler.ts` (it IS a function handler)
- Resource: Still `resource.ts` (defines the resources)

## Alternatives Considered

### Alternative 1: Separate Queue and Function Folders

```
queues/
  data-quality-queue/
    resource.ts           # Just the queue
functions/
  data-quality-processor/
    resource.ts           # Function with queue trigger
    handler.ts
```

**Rejected because**:
- Splits related concerns across folders
- Makes it harder to understand the relationship
- More files to manage for a single logical unit
- Breaks the pattern where handlers are co-located with their triggers

### Alternative 2: Queue Folder with Function Subfolder

```
queues/
  data-quality/
    queue.ts              # Queue resource
    processor/
      resource.ts         # Function resource
      handler.ts          # Function code
```

**Rejected because**:
- Adds unnecessary nesting
- Still suggests the queue "owns" the processor
- More complex than needed

### Alternative 3: Everything in Functions Folder

```
functions/
  queue-processors/
    data-quality/
      resource.ts         # Defines queue AND function
      handler.ts
```

**Rejected because**:
- Mixes different trigger types in one folder
- Makes queue processors less discoverable
- Doesn't match the pattern for other event sources

## Consequences

### Positive

1. **Technically Accurate**: Clearly shows that processing requires a function
2. **Simple Mental Model**: One folder = one logical processing unit
3. **Co-location**: Queue config and processing logic stay together
4. **Progressive Enhancement**: Simple cases stay simple, complexity is additive
5. **Consistent Pattern**: Works for all trigger types (timers, events, blobs)

### Negative

1. **Two Resources**: Single `defineQueueProcessor()` creates multiple resources (but this is hidden complexity)
2. **Learning Curve**: Developers need to understand the abstraction
3. **Naming Change**: Moving from `queues/` to `queue-processors/` requires migration

### Trade-offs

- **Simplicity vs Accuracy**: We choose a simple folder structure over perfectly representing Azure's architecture
- **Abstraction vs Transparency**: We abstract the two-resource reality behind a single definition
- **Convention vs Configuration**: We use convention (queue-processors folder) to signal intent

## Implementation Guidelines

### Folder Structure

```
queue-processors/
  [processor-name]/
    resource.ts           # Configuration
    handler.ts            # Processing logic
    README.md             # Documents what Azure resources are created
    handler.test.ts       # Optional tests
```

### Resource Definition

```typescript
// resource.ts
export const processor = defineQueueProcessor({
  name: 'data-quality',

  // Queue configuration
  queue: {
    name: 'data-quality',
    type: 'storage',        // or 'servicebus'
    // Queue-specific settings
  },

  // Function configuration
  handler: './handler.ts',
  batchSize: 16,
  maxRetries: 3,
  timeout: 300,

  // Resources available to handler
  environment: {
    COSMOS_ENDPOINT: cosmosDb.endpoint,
  }
});
```

### Documentation Requirements

Each queue processor MUST have a README.md explaining:

```markdown
# Data Quality Queue Processor

This processor handles data quality validation messages.

## Azure Resources Created

1. **Storage Queue**: `data-quality`
   - Dead letter queue: `data-quality-poison`
   - Max delivery attempts: 3

2. **Azure Function**: `data-quality-processor`
   - Trigger: Queue trigger on `data-quality` queue
   - Batch size: 16 messages
   - Timeout: 5 minutes per batch

## Message Format

```json
{
  "recordId": "string",
  "validationType": "schema" | "business",
  "data": { ... }
}
```
```

## Success Criteria

1. **Developer Understanding**: Developers understand that queue processors create both infrastructure and functions
2. **Clear Errors**: Build errors clearly indicate when queue or function configuration is invalid
3. **Documentation**: Each processor documents what Azure resources it creates
4. **Consistent Pattern**: Pattern works for Storage Queues, Service Bus, and future queue types
5. **Migration Path**: Existing `queues/` folders can be easily renamed to `queue-processors/`

## Related Patterns

This pattern should be consistent with:

- **Event Processors**: `event-processors/` for Event Grid/Event Hub triggers
- **Timer Jobs**: `scheduled-jobs/` for timer-triggered functions
- **Blob Processors**: `blob-processors/` for blob-triggered functions

All follow the same principle: the folder name describes the **processing unit**, not just the infrastructure.

## Migration Path

For existing Gen 2 structures:

1. Rename `queues/` to `queue-processors/`
2. Update imports in consuming code
3. Add README.md to each processor explaining resources
4. No code changes needed - just folder rename

## Decision Date

2025-01-28

## Status

Proposed