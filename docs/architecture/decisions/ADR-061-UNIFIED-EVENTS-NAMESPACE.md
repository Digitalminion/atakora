# ADR-020: Unified Events Namespace - Single Surface for All Event Infrastructure

## Context

The current event infrastructure implementation is scattered across multiple folders and namespaces:

- `queue-processors/` - Storage Queue patterns
- `event-topics/` - Event Grid patterns
- `infrastructure/service-bus/` - Service Bus patterns

**Critical Issue**: The initial attempt at unification in `events/resource.ts` still imports from these old locations:

```typescript
import { Queue as StorageQueue } from '@atakora/component/queues';
import { EventTopic as EventGridTopic } from '../event-topics/audit-logger/resource';
import { ServiceBus } from '../infrastructure/service-bus/resource';
```

This defeats the entire purpose of consolidation. We need a truly self-contained events module.

### Current Problems

1. **Scattered Implementation**: Event infrastructure is spread across 3+ different folder structures
2. **Inconsistent APIs**: Each pattern has different configuration approaches
3. **Import Complexity**: Developers must know where each pattern lives
4. **Leaky Abstractions**: The unified API still depends on old implementations
5. **Poor Discoverability**: No single place to understand all event capabilities

### Requirements

1. **Complete Replacement**: The unified events system must completely replace old patterns
2. **Self-Contained**: No dependencies on old folder structures
3. **Type Safety**: Full TypeScript support with IntelliSense
4. **Progressive Enhancement**: Start simple, add complexity as needed
5. **Consistent API**: Same patterns work across all event types

## Decision

Create a unified `events` namespace that consolidates all event-driven infrastructure patterns into a single, cohesive API similar to the `data` namespace pattern.

### Core API Design

```typescript
import { defineEvents } from '@atakora/component/events';

export const events = defineEvents({
  // Storage Queues - simple async processing
  dataQuality: queue('data-quality').processor(dataQualityProcessor).ttl(days(7)).retries(3),

  // Event Grid Topics - pub/sub patterns
  auditLogs: topic('audit-logs')
    .processor(auditLogger)
    .events(['Auth.*', 'Data.*'])
    .retention(days(30)),

  // Service Bus Queues - enterprise messaging
  orders: serviceBusQueue('orders')
    .processor(orderProcessor)
    .sessions()
    .duplicateDetection(minutes(10)),

  // Service Bus Topics - enterprise pub/sub
  notifications: serviceBusTopic('notifications')
    .subscription('email', emailProcessor)
    .subscription('sms', smsProcessor)
    .subscription('push', pushProcessor),
});
```

### Unified Event Type Builders

Each event type will have a specialized builder that exposes type-appropriate methods while sharing common patterns:

#### Common Interface

All event types share:

- `.processor()` - Attach handler function
- `.ttl()` - Message/event time to live
- `.retries()` - Retry configuration
- `.deadLetter()` - Failed message handling
- `.monitoring()` - Alerts and metrics
- `.tags()` - Resource tagging

#### Type-Specific Extensions

**Storage Queue**:

- `.visibilityTimeout()` - Message lock duration
- `.maxDeliveryCount()` - Attempts before dead lettering
- `.batchSize()` - Processor concurrency

**Event Grid Topic**:

- `.events()` - Event type definitions
- `.schema()` - Event schema format
- `.subscription()` - Add subscribers
- `.filter()` - Event filtering

**Service Bus Queue**:

- `.sessions()` - Message sessions
- `.duplicateDetection()` - Deduplication window
- `.partitioning()` - Enable partitioning
- `.forwardTo()` - Message forwarding

**Service Bus Topic**:

- `.subscription()` - Named subscriptions
- `.filter()` - SQL filters
- `.maxSize()` - Topic size limit

### Progressive Enhancement Pattern

Start simple, add complexity as needed:

```typescript
// Minimal - just name and processor
dataQuality: queue('data-quality', dataQualityProcessor),

// With options
email: queue('email')
  .processor(emailProcessor)
  .ttl(days(2))
  .retries(3),

// Full configuration
criticalEvents: topic('critical-events')
  .processor(criticalProcessor)
  .events(['Security.*', 'Compliance.*'])
  .schema('CloudEventSchemaV1_0')
  .retention(days(90))
  .monitoring(m => m
    .onPublishFailure(5, 'Error')
    .onDeliveryFailure(3, 'Warning')
  )
  .subscription('audit', s => s
    .endpoint(auditEndpoint)
    .filter(f => f.severity('Critical', 'Error'))
    .reliableDelivery()
  )
```

## Alternatives Considered

### 1. Keep Current Separation

**Pros**:

- No migration needed
- Each type stays specialized

**Cons**:

- Continued cognitive overhead
- Inconsistent patterns
- Scattered infrastructure

### 2. Generic Event Abstraction

Create a single `event()` builder that adapts based on configuration.

**Pros**:

- Ultimate simplicity
- Single API to learn

**Cons**:

- Loss of type safety for service-specific features
- Unclear which backend service is used
- Can't leverage unique capabilities

### 3. Two-Level Abstraction

Separate into `messaging` (queues) and `events` (topics).

**Pros**:

- Clear semantic distinction
- Somewhat simplified

**Cons**:

- Still requires multiple imports
- Service Bus spans both categories
- Doesn't achieve full consolidation

## Consequences

### Positive Consequences

1. **Single Import Location**: All event infrastructure from one place
2. **Consistent API**: Same patterns across all event types
3. **Better Discoverability**: IntelliSense shows all options in one place
4. **Shared Abstractions**: Common patterns (monitoring, DLQ, retries) implemented once
5. **Type Safety**: Full typing for each event type's specific features
6. **Progressive Enhancement**: Start simple, add complexity when needed
7. **Cleaner Organization**: All events in `events/resource.ts`

### Negative Consequences

1. **Migration Effort**: Existing code needs updating
2. **Learning Curve**: New API to learn (mitigated by consistency)
3. **Abstraction Overhead**: Another layer over native constructs
4. **Potential Confusion**: Different event types in same namespace

### Trade-offs

- **Simplicity vs Flexibility**: We optimize for common cases while allowing full control
- **Consistency vs Specificity**: Unified API with type-specific extensions
- **Migration vs Innovation**: Short-term migration pain for long-term maintainability

## Success Criteria

1. **Developer Experience**:
   - Single import for all event infrastructure
   - IntelliSense guides configuration
   - Common patterns work identically across types

2. **Code Reduction**:
   - 50% less boilerplate compared to current approach
   - Minimal configuration for common scenarios
   - Smart defaults eliminate repetitive code

3. **Type Safety**:
   - Full typing for all event-specific features
   - Compile-time validation of configuration
   - No runtime surprises

4. **Adoption**:
   - Clean migration path from existing patterns
   - New projects adopt unified pattern immediately
   - Documentation shows clear benefits

## Implementation Strategy

### Phase 1: Core Infrastructure

1. Create `@atakora/component/events` module
2. Implement `defineEvents()` wrapper
3. Create base `EventBuilder` class with common methods
4. Implement type-specific builders extending base

### Phase 2: Integration

1. Update existing queue/topic/service-bus modules to expose builders
2. Ensure backward compatibility during transition
3. Create migration utilities if needed

### Phase 3: Migration

1. Update backend example to use unified namespace
2. Create migration guide with before/after examples
3. Update documentation and examples

### Phase 4: Enhancement

1. Add advanced features (streams, webhooks)
2. Implement cross-event orchestration
3. Add event replay and debugging capabilities

## Related Decisions

- **ADR-017**: Backend API redesign - This continues the simplification trend
- **Data Namespace Pattern**: Proven success of unified namespace approach
- **Fluent API Patterns**: Established patterns for builder-style configuration

## References

- Current queue implementation: `packages/backend/src/queue-processors/`
- Current event topic implementation: `packages/backend/src/event-topics/`
- Current service bus implementation: `packages/backend/src/infrastructure/service-bus/`
- Data namespace pattern: `packages/backend/src/data/resource.ts`
