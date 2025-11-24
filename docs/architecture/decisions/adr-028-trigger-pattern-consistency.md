# ADR-020: Consistent Trigger Pattern for All Function Types

## Context

Following ADR-019's queue processor pattern, we need consistent patterns for all Azure Function trigger types. Each pattern should:

1. Clearly indicate what Azure resources are created
2. Co-locate configuration with handler code
3. Use folder names that describe the processing unit, not just infrastructure
4. Be technically accurate about Azure's architecture

Azure Functions support many trigger types, each requiring different infrastructure:

- Queue triggers (Storage Queue or Service Bus)
- Timer triggers (no infrastructure, just schedule)
- Event Grid triggers (Event Grid Topic/Subscription)
- Event Hub triggers (Event Hub + Consumer Group)
- Blob triggers (Storage Container + metadata)
- HTTP triggers (no additional infrastructure)
- Cosmos DB triggers (Change Feed processor)

## Decision

We will use consistent folder naming that describes the **processing unit** rather than the infrastructure.

### Folder Structure by Trigger Type

```
src/gen2/
  queue-processors/        # Queue-triggered functions
  event-processors/        # Event Grid/Hub triggered functions
  scheduled-jobs/          # Timer-triggered functions
  blob-processors/         # Blob-triggered functions
  api-endpoints/           # HTTP-triggered functions
  change-processors/       # Cosmos DB change feed functions
```

### Pattern Details

#### 1. Queue Processors

```
queue-processors/
  order-processing/
    resource.ts           # Creates queue + function
    handler.ts            # Processing logic
    README.md             # Documents both resources
```

Helper: `defineQueueProcessor()`
Creates: Storage/Service Bus Queue + Azure Function

#### 2. Event Processors

```
event-processors/
  user-registered/
    resource.ts           # Creates topic/subscription + function
    handler.ts            # Event handling logic
    README.md             # Documents event infrastructure
```

Helper: `defineEventProcessor()`
Creates: Event Grid Topic/Subscription OR Event Hub + Azure Function

#### 3. Scheduled Jobs

```
scheduled-jobs/
  daily-cleanup/
    resource.ts           # Creates timer-triggered function
    handler.ts            # Job logic
    README.md             # Documents schedule and purpose
```

Helper: `defineScheduledJob()`
Creates: Azure Function with timer trigger (no additional infrastructure)

#### 4. Blob Processors

```
blob-processors/
  image-thumbnail/
    resource.ts           # Creates container + function
    handler.ts            # Blob processing logic
    README.md             # Documents container and triggers
```

Helper: `defineBlobProcessor()`
Creates: Storage Container + Azure Function with blob trigger

#### 5. API Endpoints

```
api-endpoints/
  users/
    resource.ts           # Creates HTTP-triggered functions
    handler.ts            # HTTP request handling
    README.md             # Documents routes and methods
```

Helper: `defineApiEndpoint()`
Creates: Azure Function with HTTP trigger

#### 6. Change Processors

```
change-processors/
  inventory-sync/
    resource.ts           # Creates change feed processor
    handler.ts            # Change handling logic
    README.md             # Documents monitored collections
```

Helper: `defineChangeProcessor()`
Creates: Azure Function with Cosmos DB trigger + lease container

## Alternatives Considered

### Alternative 1: Everything in Functions Folder

```
functions/
  queue-triggered/
  timer-triggered/
  http-triggered/
  ...
```

**Rejected because**:

- Focuses on technical trigger type rather than business purpose
- Makes it harder to find related processors
- Too Azure-specific, not portable to other clouds

### Alternative 2: Mixed Infrastructure and Functions

```
queues/
  order-queue/
functions/
  order-processor/
events/
  user-events/
```

**Rejected because**:

- Separates related concerns
- Unclear relationships between infrastructure and processors
- More complex project structure

## Consequences

### Positive

1. **Consistent Mental Model**: All trigger types follow same pattern
2. **Business-Focused**: Folders describe what they do, not how they work
3. **Self-Documenting**: Folder names immediately convey purpose
4. **Co-location**: Related code stays together
5. **Discoverability**: Easy to find all processors of a type

### Negative

1. **Learning Curve**: Developers must learn the naming conventions
2. **Migration Work**: Existing projects need restructuring
3. **Tool Support**: IDEs won't automatically understand the structure

## Implementation Guidelines

### Helper Functions

Each helper function should:

1. **Hide Complexity**: Abstract Azure-specific configuration
2. **Provide Defaults**: Smart defaults for common scenarios
3. **Allow Overrides**: Full control when needed
4. **Type Safety**: Full TypeScript support with IntelliSense

Example signatures:

```typescript
// Queue processing
defineQueueProcessor({
  name: string;
  queue: QueueConfig;
  handler: string;
  // Function settings
  batchSize?: number;
  memory?: number;
  timeout?: number;
});

// Event processing
defineEventProcessor({
  name: string;
  eventTypes: string[];
  source?: string;
  handler: string;
  // Function settings
});

// Scheduled jobs
defineScheduledJob({
  name: string;
  schedule: string | CronExpression;
  handler: string;
  runOnStartup?: boolean;
  // Function settings
});
```

### Documentation Requirements

Every processor MUST have a README.md with:

1. **Purpose**: What business problem it solves
2. **Resources Created**: Exact Azure resources
3. **Trigger Details**: When/how it executes
4. **Message/Event Format**: Expected input structure
5. **Error Handling**: How failures are managed
6. **Monitoring**: Key metrics and alerts
7. **Local Development**: How to test locally

### Naming Conventions

- **Folder names**: Plural, kebab-case (`queue-processors/`)
- **Processor names**: Singular, kebab-case (`order-processing/`)
- **Handler files**: Always `handler.ts`
- **Resource files**: Always `resource.ts`
- **Test files**: Always `handler.test.ts`

## Success Criteria

1. **Consistency**: All trigger types follow the same pattern
2. **Clarity**: Developers immediately understand what each folder does
3. **Documentation**: Every processor documents its Azure resources
4. **Migration**: Smooth path from current structure
5. **Extensibility**: Pattern works for future trigger types

## Migration Path

1. Create new folder structure alongside existing
2. Move processors one type at a time
3. Update imports and references
4. Remove old structure once migrated
5. Update documentation and examples

## Related Decisions

- **ADR-019**: Queue Processor Pattern (this extends that pattern)
- **ADR-017**: Backend Component Pattern
- **Function Organization**: How handlers are structured internally

## Decision Date

2025-01-28

## Status

Proposed
