# ADR-020: Separation of Functions and Infrastructure Resources

## Context

The gen2 architecture initially mixed Azure Functions with their infrastructure triggers in the same folders. For example:
- Queue processors contained both the queue definition and the function handler
- Event processors contained both the Event Grid topic and the function handler

This created several problems:
1. **Unclear separation of concerns** - Functions (compute) were mixed with infrastructure (queues, topics)
2. **Inconsistent organization** - HTTP functions were in `functions/` but queue/event functions were elsewhere
3. **Difficult to understand relationships** - The connection between infrastructure and functions was implicit
4. **Naming confusion** - "Queue processor" could mean the queue, the function, or both

## Decision

We have established a clear architectural pattern:

**ALL Azure Functions live in the `functions/` folder, regardless of trigger type.**

This means:
- HTTP-triggered functions → `functions/*/`
- Queue-triggered functions → `functions/*/`
- Timer-triggered functions → `functions/*/`
- Event Grid-triggered functions → `functions/*/`
- Service Bus-triggered functions → `functions/*/`

Infrastructure resources live in their domain-specific folders and reference the functions:
- Queues → `queue-processors/*/resource.ts` (defines queue, imports function)
- Event Grid Topics → `event-topics/*/resource.ts` (defines topic, imports function)
- Service Bus Topics → `service-bus-topics/*/resource.ts` (defines topic, imports function)

## Implementation Pattern

### Function Definition (in `functions/` folder)

```typescript
// functions/data-quality-processor/resource.ts
import { defineFunction } from '@atakora/component/functions';

export const dataQualityProcessor = defineFunction({
  name: 'data-quality-processor',
  trigger: {
    type: 'queue',
    queueName: 'data-quality',
    connection: 'STORAGE_CONNECTION',
  },
  handler: './handler.ts',
  memory: 1024,
  timeout: 600,
});
```

### Infrastructure Definition (references the function)

```typescript
// queue-processors/data-quality/resource.ts
import { defineQueue } from '@atakora/component/queues';
import { dataQualityProcessor } from '../../functions/data-quality-processor/resource';

export const dataQualityQueue = defineQueue({
  name: 'data-quality',
  processor: dataQualityProcessor,  // Attaches the function
  queue: {
    messageTimeToLive: '7.00:00:00',
    maxDeliveryCount: 3,
  },
});
```

## Folder Structure

```
gen2/
├── functions/                        # ALL Azure Functions
│   ├── process-upload/               # HTTP trigger
│   │   ├── resource.ts
│   │   └── handler.ts
│   ├── data-quality-processor/       # Queue trigger
│   │   ├── resource.ts
│   │   └── handler.ts
│   └── audit-logger/                 # Event Grid trigger
│       ├── resource.ts
│       └── handler.ts
│
├── queue-processors/                 # Queue infrastructure
│   └── data-quality/
│       └── resource.ts               # Just the queue definition
│
└── event-topics/                     # Event Grid infrastructure
    └── audit-logs/
        └── resource.ts               # Just the topic definition
```

## Alternatives Considered

### Alternative 1: Keep Mixed Organization

Keep queue/event processors as combined units with both infrastructure and function.

**Rejected because:**
- Violates separation of concerns
- Makes it harder to understand what's infrastructure vs compute
- Inconsistent with HTTP functions being separate

### Alternative 2: Separate by Trigger Type

Organize functions into subfolders by trigger type:
- `functions/http/`
- `functions/queue/`
- `functions/event-grid/`

**Rejected because:**
- Adds unnecessary hierarchy
- Functions often change trigger types during development
- All functions are fundamentally the same (code that runs)

### Alternative 3: Co-locate Everything

Put infrastructure and functions together in feature folders.

**Rejected because:**
- Infrastructure often serves multiple functions
- Functions can be reused across different infrastructure
- Harder to manage infrastructure lifecycle separately

## Consequences

### Positive

1. **Clear separation of concerns** - Functions (compute) are clearly separated from infrastructure
2. **Consistent organization** - All functions in one place, regardless of trigger
3. **Explicit relationships** - Import statements show exactly which functions attach to which infrastructure
4. **Better discoverability** - Easy to find all functions or all infrastructure
5. **Flexible composition** - Functions can be attached to multiple infrastructure resources
6. **Clearer naming** - "processor" means the function, "queue" means the infrastructure

### Negative

1. **More files** - Separating infrastructure and functions creates more files
2. **Import paths** - Need to import across folders (but this makes relationships explicit)
3. **Migration effort** - Existing code needs to be reorganized

### Neutral

1. **Learning curve** - Developers need to understand the separation pattern
2. **Documentation** - Need clear documentation about where things go

## Success Criteria

1. **Consistency** - 100% of functions are in the `functions/` folder
2. **Clarity** - New developers can immediately understand the structure
3. **Maintainability** - Changes to infrastructure don't require touching function code
4. **Testability** - Functions can be tested independently of infrastructure
5. **Type safety** - TypeScript ensures correct connections between infrastructure and functions

## Migration Guide

For existing code using the mixed pattern:

1. **Move handlers** - Move `*/handler.ts` files to `functions/*/handler.ts`
2. **Create function resources** - Add `functions/*/resource.ts` with trigger configuration
3. **Update infrastructure** - Modify infrastructure `resource.ts` to import and reference functions
4. **Update imports** - Fix import paths in index.ts and other files
5. **Test connections** - Ensure infrastructure correctly references functions

## Examples

### Before (Mixed)

```
queue-processors/
  data-quality/
    resource.ts  # defineQueueProcessor (queue + function)
    handler.ts   # Processing logic
```

### After (Separated)

```
functions/
  data-quality-processor/
    resource.ts  # defineFunction with queue trigger
    handler.ts   # Processing logic

queue-processors/
  data-quality/
    resource.ts  # defineQueue that references the function
```

## Related Decisions

- ADR-017: Backend API Redesign - Established the gen2 architecture
- ADR-019: Component Resource Sharing - How resources are shared between components
- ADR-021: Trigger Type Evolution - How functions can change triggers over time (future)

## Status

**Accepted** - Implemented in gen2 architecture

## Date

2024-10-28