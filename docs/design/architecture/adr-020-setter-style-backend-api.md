# ADR-020: Setter-Style Backend API Design

## Context

The current backend definition uses a configuration-heavy approach with nested objects passed to `defineBackend()`. This pattern, while explicit, creates a "big JSON payload" feeling that doesn't align with modern TypeScript development patterns. The user has requested a more natural "setter style" where values are assigned using `= value` rather than passed as configuration objects.

Current pattern feels like configuration:
```typescript
defineBackend({
  data,
  functions: { ... },
  queues: { ... }
}, {
  secrets: { ... },
  config: { ... },
  governance: { ... }
});
```

Desired pattern feels like code:
```typescript
const backend = new Backend();
backend.data = data;
backend.functions.processUpload = processUpload;
backend.secrets.SENDGRID_API_KEY = required();
```

## Decision

We will redesign the backend API to use a setter/assignment style that:

1. **Uses direct property assignment** rather than configuration objects
2. **Provides progressive enhancement** - start simple, add complexity as needed
3. **Maintains full type safety** with TypeScript's type system
4. **Feels like writing code**, not configuration
5. **Supports both imperative and declarative styles** where appropriate

### Core Design Pattern

```typescript
// Create backend instance
const backend = new Backend();

// Direct assignment for components
backend.data = data;
backend.processUpload = processUpload;
backend.validateDataset = validateDataset;

// Fluent helpers for common patterns
backend.secrets.SENDGRID_API_KEY = required();
backend.secrets.SLACK_WEBHOOK = optional();

// Direct property access for configuration
backend.config.maxUploadSizeMb = 100;
backend.config.allowedFileTypes = ['.csv', '.xlsx'];

// Chained methods for complex configuration
backend.networking
  .forcePrivate()
  .allowIPs('20.185.0.0/16', '52.173.0.0/16');

backend.monitoring
  .metric('feedback-sentiment', 'gauge')
  .metric('api-latency-p99', 'histogram')
  .alert('high-error-rate')
    .when('error_rate > 1%')
    .severity('critical')
    .action('page-oncall');
```

### Component Registration Pattern

Components are registered by direct assignment to the backend:

```typescript
// Functions are assigned directly (no 'functions' namespace)
backend.processUpload = processUpload;
backend.validateDataset = validateDataset;

// Or use array assignment for bulk registration
backend.functions = [
  processUpload,
  validateDataset,
  generateReport,
  sendNotification
];

// Infrastructure components follow the same pattern
backend.dataQualityQueue = dataQualityQueue;
backend.emailQueue = emailQueue;
backend.auditLogsTopic = auditLogsTopic;
```

### Configuration Pattern

Configuration uses a mix of direct assignment and builder methods:

```typescript
// Simple values use direct assignment
backend.config.maxUploadSizeMb = 100;
backend.config.databaseName = 'colorai-db';

// Complex configuration uses builders
backend.performance
  .functionPlan('Premium')  // or 'Consumption'
  .alwaysOn(true)
  .maxInstances(10)
  .scaleRule('http-queue-length', 100, { scaleBy: 2 })
  .scaleRule('cpu-percentage', 70, { scaleBy: 1 });

// Environment-aware configuration
backend.when('production')
  .networking.forcePrivate()
  .performance.functionPlan('Premium')
  .authentication.requireMFA();

backend.when('development')
  .networking.allowPublic()
  .performance.functionPlan('Consumption')
  .features.experimental();
```

### Type Safety Implementation

The backend class uses TypeScript's type system to provide full IntelliSense:

```typescript
class Backend {
  // Components use type-safe registration
  private _functions = new Map<string, FunctionComponent>();
  private _queues = new Map<string, QueueComponent>();

  // Proxy for dynamic function assignment
  [key: string]: any;

  constructor() {
    // Use Proxy to intercept assignments
    return new Proxy(this, {
      set(target, prop, value) {
        if (isFunction(value)) {
          target._functions.set(prop as string, value);
        } else if (isQueue(value)) {
          target._queues.set(prop as string, value);
        } else {
          target[prop] = value;
        }
        return true;
      }
    });
  }

  // Type-safe configuration properties
  readonly config = new ConfigBuilder();
  readonly secrets = new SecretsBuilder();
  readonly networking = new NetworkingBuilder();
  readonly performance = new PerformanceBuilder();
  readonly monitoring = new MonitoringBuilder();
}
```

## Alternatives Considered

### 1. Pure Builder Pattern
```typescript
backend
  .withData(data)
  .withFunction('processUpload', processUpload)
  .withSecret('SENDGRID_API_KEY', { required: true })
  .build();
```
**Rejected**: Too verbose, doesn't feel like natural code assignment.

### 2. Decorator Pattern
```typescript
@Backend()
class ColorAIBackend {
  @Data() data = data;
  @Function() processUpload = processUpload;
  @Secret({ required: true }) SENDGRID_API_KEY: string;
}
```
**Rejected**: Requires experimental decorators, adds complexity, not as intuitive.

### 3. Keep Current Configuration Pattern
```typescript
defineBackend({ ... }, { ... });
```
**Rejected**: Feels too much like configuration, not code. Doesn't provide progressive enhancement.

## Consequences

### Positive

1. **More intuitive API** - Feels like writing TypeScript code, not JSON configuration
2. **Progressive enhancement** - Start simple, add complexity only when needed
3. **Better IntelliSense** - Direct property access provides excellent autocomplete
4. **Cleaner code** - Less nesting, more readable
5. **Flexible registration** - Components can be added dynamically
6. **Maintains type safety** - Full TypeScript type checking preserved

### Negative

1. **Breaking change** - Requires migration from existing pattern
2. **Proxy usage** - May have slight performance overhead (negligible at build time)
3. **Learning curve** - Developers need to learn new patterns
4. **More complex implementation** - Backend class needs sophisticated type definitions

### Neutral

1. **Mixed paradigm** - Combines assignment, builders, and method chaining
2. **Dynamic properties** - Uses TypeScript index signatures and Proxies
3. **Multiple valid patterns** - Flexibility might lead to inconsistent usage

## Success Criteria

1. **Developer satisfaction** - Positive feedback on the new API design
2. **Reduced boilerplate** - 30-50% less code for typical backends
3. **Faster onboarding** - New developers productive in < 1 hour
4. **Type safety maintained** - No regression in type checking capabilities
5. **IntelliSense quality** - Full autocomplete for all properties and methods
6. **Migration success** - Existing backends can be migrated in < 30 minutes

## Implementation Notes

The setter-style API should:

1. Support both individual and bulk assignment
2. Provide helper functions for common patterns (`required()`, `optional()`)
3. Use builders for complex nested configuration
4. Support environment-specific configuration via `when()` method
5. Maintain backward compatibility during migration period
6. Generate the same ARM templates as the current approach

## Migration Path

1. Implement new Backend class alongside existing defineBackend
2. Provide automated migration tool/codemod
3. Update documentation with new patterns
4. Deprecate old API after migration period
5. Remove old API in next major version