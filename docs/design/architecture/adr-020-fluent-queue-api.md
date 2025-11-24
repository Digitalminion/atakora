# ADR-020: Fluent Queue API for Enhanced Developer Experience

## Context

The current queue resource definition pattern in Atakora uses a configuration object approach that closely mirrors ARM template structure. User feedback indicates this feels like "a loose abstraction for an ARM template" with "big JSON payloads" rather than a TypeScript-native developer experience.

Current approach:

```typescript
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
  },
});
```

This pattern has several problems:

1. **Configuration-heavy**: Feels like writing JSON, not TypeScript
2. **Poor discoverability**: Options are buried in nested objects
3. **String-based time values**: Error-prone and not type-safe
4. **No progressive enhancement**: Must understand all options upfront
5. **Lacks abstraction**: Direct mapping to ARM concepts without simplification

## Decision

We will implement a fluent, chainable API for queue configuration that provides:

1. **Builder pattern** with method chaining for progressive enhancement
2. **Type-safe helper functions** for time units, thresholds, and common patterns
3. **Smart defaults** with optional overrides
4. **Preset patterns** for common use cases
5. **Composable monitoring** through a fluent sub-API

The new API will feel like writing TypeScript code, not configuration:

```typescript
import { Queue, minutes, hours, days } from '@atakora/component/queues';
import { greaterThan, olderThan } from '@atakora/component/monitoring';

// Simple with defaults
export const simpleQueue = Queue.create('simple').processor(myProcessor);

// Progressive enhancement
export const dataQualityQueue = Queue.create('data-quality')
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
  );

// Using presets
export const highThroughputQueue = Queue.create('events')
  .processor(eventProcessor)
  .highThroughput() // Preset: batch size, parallel processing
  .withMetrics();

// Composable patterns
const retryPolicy = exponentialBackoff()
  .maxAttempts(5)
  .initialDelay(seconds(5))
  .maxDelay(minutes(5));

export const criticalQueue = Queue.create('critical')
  .processor(criticalProcessor)
  .retry(retryPolicy)
  .alerting(urgent());
```

## Implementation Strategy

### 1. Core Queue Builder

```typescript
class QueueBuilder {
  private config: QueueConfig = defaultConfig();

  static create(name: string): QueueBuilder {
    return new QueueBuilder(name);
  }

  processor(fn: Function): this {
    this.config.processor = fn;
    return this;
  }

  ttl(duration: Duration): this {
    this.config.ttl = duration;
    return this;
  }

  visibility(duration: Duration): this {
    this.config.visibility = duration;
    return this;
  }

  retries(count: number): this {
    this.config.maxDeliveryCount = count;
    return this;
  }

  withDeadLetterQueue(name?: string): this {
    this.config.deadLetter = {
      enabled: true,
      name: name || `${this.config.name}-dlq`,
    };
    return this;
  }

  // Presets
  highThroughput(): this {
    return this.batchSize(32).parallelism(10).visibility(seconds(30));
  }

  longRunning(): this {
    return this.visibility(minutes(30)).ttl(days(14)).retries(1);
  }

  standardRetries(): this {
    return this.retry(exponentialBackoff().maxAttempts(3).initialDelay(seconds(5)));
  }

  // Monitoring sub-builder
  monitoring(configure: (alerts: AlertBuilder) => AlertBuilder): this {
    const builder = new AlertBuilder();
    this.config.monitoring = configure(builder).build();
    return this;
  }
}
```

### 2. Time Utilities

```typescript
// Duration type with full type safety
export interface Duration {
  readonly value: number;
  readonly unit: TimeUnit;
  toMilliseconds(): number;
  toSeconds(): number;
  toTimeSpan(): string;  // For ARM format
}

// Factory functions
export const milliseconds = (n: number): Duration => ({ value: n, unit: 'ms', ... });
export const seconds = (n: number): Duration => ({ value: n, unit: 's', ... });
export const minutes = (n: number): Duration => ({ value: n, unit: 'm', ... });
export const hours = (n: number): Duration => ({ value: n, unit: 'h', ... });
export const days = (n: number): Duration => ({ value: n, unit: 'd', ... });

// Arithmetic operations
Duration.add = (a: Duration, b: Duration): Duration => ...;
Duration.subtract = (a: Duration, b: Duration): Duration => ...;
Duration.multiply = (d: Duration, factor: number): Duration => ...;
```

### 3. Threshold Builders

```typescript
export interface Threshold<T> {
  readonly value: T;
  readonly operator: ComparisonOperator;
  evaluate(actual: T): boolean;
}

// Factory functions
export const greaterThan = <T>(value: T): Threshold<T> => ({ value, operator: '>', ... });
export const lessThan = <T>(value: T): Threshold<T> => ({ value, operator: '<', ... });
export const between = <T>(min: T, max: T): Threshold<T> => ({ ... });
export const exactly = <T>(value: T): Threshold<T> => ({ value, operator: '==', ... });

// Special case for time-based thresholds
export const olderThan = (duration: Duration): Threshold<Duration> => ({ ... });
export const newerThan = (duration: Duration): Threshold<Duration> => ({ ... });
```

### 4. Alert Builder

```typescript
class AlertBuilder {
  private alerts: Alert[] = [];

  onDepth(threshold: Threshold<number>): AlertConfig {
    return new AlertConfig('queueDepth', threshold, this);
  }

  onMessageAge(threshold: Threshold<Duration>): AlertConfig {
    return new AlertConfig('messageAge', threshold, this);
  }

  onDeadLetter(): AlertConfig {
    return new AlertConfig('deadLetter', always(), this);
  }

  onProcessingTime(threshold: Threshold<Duration>): AlertConfig {
    return new AlertConfig('processingTime', threshold, this);
  }
}

class AlertConfig {
  constructor(
    private metric: string,
    private threshold: Threshold<any>,
    private builder: AlertBuilder
  ) {}

  critical(): AlertBuilder {
    this.builder.add({ ...this, severity: 'Critical' });
    return this.builder;
  }

  error(): AlertBuilder {
    this.builder.add({ ...this, severity: 'Error' });
    return this.builder;
  }

  warn(): AlertBuilder {
    this.builder.add({ ...this, severity: 'Warning' });
    return this.builder;
  }

  info(): AlertBuilder {
    this.builder.add({ ...this, severity: 'Information' });
    return this.builder;
  }
}
```

### 5. Retry Policies

```typescript
interface RetryPolicy {
  maxAttempts: number;
  delay: Duration;
  backoff: BackoffStrategy;
}

class RetryPolicyBuilder {
  private policy: Partial<RetryPolicy> = {};

  maxAttempts(n: number): this {
    this.policy.maxAttempts = n;
    return this;
  }

  initialDelay(d: Duration): this {
    this.policy.delay = d;
    return this;
  }

  maxDelay(d: Duration): this {
    this.policy.maxDelay = d;
    return this;
  }
}

// Factory functions
export const noRetries = (): RetryPolicy => ({ maxAttempts: 0, ... });
export const fixedDelay = (delay: Duration): RetryPolicyBuilder => ...;
export const exponentialBackoff = (): RetryPolicyBuilder => ...;
export const linearBackoff = (): RetryPolicyBuilder => ...;
```

## Alternatives Considered

### 1. Pure Configuration Objects (Current)

- **Pros**: Familiar to ARM users, simple to implement
- **Cons**: Poor DX, not idiomatic TypeScript, lacks type safety for strings

### 2. Class-based Inheritance

```typescript
class DataQualityQueue extends Queue {
  configure() {
    this.setTtl(days(7));
    this.setRetries(3);
  }
}
```

- **Pros**: OOP patterns, could enable inheritance
- **Cons**: Verbose, requires subclassing, less flexible

### 3. Functional Composition

```typescript
const dataQualityQueue = compose(
  withName('data-quality'),
  withProcessor(processor),
  withRetries(3),
  withTtl(days(7))
);
```

- **Pros**: Functional, composable
- **Cons**: Less discoverable, harder to chain conditionally

## Consequences

### Positive

- **Exceptional DX**: Feels like writing TypeScript, not configuration
- **Type safety**: Full IntelliSense and compile-time checking
- **Discoverability**: IDE autocomplete guides developers
- **Progressive enhancement**: Start simple, add complexity as needed
- **Reusable patterns**: Presets and utilities reduce repetition
- **Maintainable**: Changes are easier with method chaining

### Negative

- **Migration effort**: Existing code needs updating
- **Learning curve**: New patterns to learn (though more intuitive)
- **Implementation complexity**: Builder pattern requires more code
- **Bundle size**: Additional builder code (mitigated by tree-shaking)

### Neutral

- **ARM generation unchanged**: Still produces same ARM templates
- **Runtime behavior identical**: No performance impact
- **Testing approach same**: Unit tests work similarly

## Success Criteria

1. **Developer satisfaction**: Positive feedback on API design
2. **Reduced configuration lines**: 50% less code for common patterns
3. **Type safety**: Zero string-based time configurations
4. **IDE support**: Full autocomplete for all builder methods
5. **Migration success**: All existing queues migrated without issues
6. **Documentation quality**: Clear examples for all patterns

## Migration Strategy

1. **Parallel APIs**: Support both old and new APIs initially
2. **Deprecation warnings**: Guide developers to new API
3. **Codemods**: Automated migration scripts for existing code
4. **Documentation**: Comprehensive migration guide
5. **Phased rollout**: Start with new projects, migrate existing gradually

## Examples

### Before (Configuration-based)

```typescript
defineQueue({
  name: 'orders',
  queue: {
    messageTimeToLive: '7.00:00:00',
    visibilityTimeout: '00:05:00',
    maxDeliveryCount: 5,
  },
  monitoring: {
    queueDepthAlert: {
      threshold: 100,
      severity: 'Warning',
    },
  },
});
```

### After (Fluent API)

```typescript
Queue.create('orders')
  .ttl(days(7))
  .visibility(minutes(5))
  .retries(5)
  .monitoring((alerts) => alerts.onDepth(greaterThan(100)).warn());
```

### Complex Example with Presets

```typescript
Queue.create('critical-events')
  .processor(eventProcessor)
  .highThroughput() // Preset for high volume
  .retry(
    exponentialBackoff() // Custom retry
      .maxAttempts(10)
      .initialDelay(seconds(1))
      .maxDelay(minutes(10))
  )
  .monitoring((alerts) =>
    alerts
      .onDepth(greaterThan(10000))
      .critical()
      .onMessageAge(olderThan(minutes(5)))
      .error()
      .onDeadLetter()
      .critical()
      .withNotification(email('ops@company.com'))
  )
  .withDeadLetterQueue()
  .withMetrics()
  .withTracing();
```

This new API transforms queue configuration from a chore into a delightful experience, making Atakora feel like a modern TypeScript framework rather than an ARM template wrapper.
