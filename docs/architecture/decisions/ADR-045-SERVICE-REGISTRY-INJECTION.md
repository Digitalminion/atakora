# ADR-022: Service Registry Injection Pattern

**Status:** Proposed
**Date:** 2025-11-22
**Architect:** Becky (Staff Architect)
**Stakeholders:** Devon (Implementation), Charlie (Testing)

---

## Context

Function handlers need access to custom services (report generators, data validators, AI search clients, etc.) through the function execution context. Currently, the service registry is a placeholder that logs warnings and returns empty objects.

### Current State

```typescript
function createServiceRegistry(executionContext: ExecutionContext): ServiceRegistry {
  // TODO: Services will be injected from backend configuration
  return new Proxy({} as ServiceRegistry, {
    get(target, serviceName: string) {
      console.warn(`Service not yet implemented: ${serviceName}`);
      (target as any)[serviceName] = {
        [serviceName]: () => {
          throw new Error(`Service '${serviceName}' not configured`);
        },
      };
      return (target as any)[serviceName];
    },
  });
}
```

### Problem Statement

We need a service injection mechanism that:

1. **Type Safety:** Service access is fully typed
2. **Explicit Configuration:** Services are declared in backend definition
3. **Testable:** Services can be mocked for testing
4. **Lifecycle Management:** Services are instantiated correctly per request/globally
5. **Error Handling:** Missing services fail with clear errors
6. **Environment Awareness:** Services can vary by environment

### Use Cases

**Example 1: Report Generator Service**

```typescript
// In function handler
const generator = context.services.reportGenerator;
const reportUrl = await generator.generate({
  dataset,
  type: 'pdf',
  format: 'summary',
});
```

**Example 2: Data Validator Service**

```typescript
// In function handler
const validator = context.services.dataValidator;
const result = await validator.validate(dataset, rules);
```

**Example 3: AI Search Service**

```typescript
// In function handler
const search = context.services.aiSearch;
const results = await search.query('user query')
  .filter('status eq completed')
  .execute();
```

### Constraints

- Must work with existing `FunctionContext` structure
- Cannot break existing function handler signatures
- Must support both development and production environments
- Must integrate with existing telemetry/logging
- Service implementations may have external dependencies (Azure SDKs, etc.)

---

## Decision

We will implement an **explicit service configuration pattern** with compile-time type safety and runtime dependency injection.

### Architecture Overview

```typescript
/**
 * Service definition in backend configuration
 */
const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
  services: {
    // Service factories - called once per function invocation
    reportGenerator: (context) => new ReportGeneratorService({
      storageAccount: context.env.STORAGE_ACCOUNT,
      aiEndpoint: context.env.AI_ENDPOINT,
    }),

    // Service singletons - shared across invocations
    dataValidator: singleton(() => new DataValidatorService()),

    // External service clients
    aiSearch: (context) => new AISearchClient({
      endpoint: context.env.AZURE_SEARCH_ENDPOINT,
      key: context.env.AZURE_SEARCH_KEY,
    }),
  },
});

// Type inference: backend.services has type-safe service registry
type Services = typeof backend.services;
```

### Core Types

```typescript
/**
 * Service factory function
 *
 * Called once per function invocation to create service instance.
 * Has access to execution context for environment variables, etc.
 */
export type ServiceFactory<T> = (context: ServiceFactoryContext) => T | Promise<T>;

/**
 * Service factory context
 *
 * Provides access to environment, configuration, and utilities.
 */
export interface ServiceFactoryContext {
  /**
   * Environment variables
   */
  env: Record<string, string | undefined>;

  /**
   * Backend settings
   */
  settings: ResolvedBackendSettings;

  /**
   * Current environment (development, staging, production)
   */
  environment: Environment;

  /**
   * Logger for service initialization
   */
  logger: Logger;
}

/**
 * Singleton wrapper for services that should be shared
 */
export function singleton<T>(factory: () => T | Promise<T>): ServiceFactory<T> {
  let instance: T | null = null;
  let promise: Promise<T> | null = null;

  return async (context: ServiceFactoryContext): Promise<T> => {
    if (instance !== null) {
      return instance;
    }

    if (promise !== null) {
      return promise;
    }

    promise = Promise.resolve(factory());
    instance = await promise;
    promise = null;

    context.logger.verbose(`Singleton service initialized`);
    return instance;
  };
}

/**
 * Backend configuration with services
 */
export interface BackendConfig<TSchema, TAuth, TServices = {}> {
  schema: TSchema;
  authentication?: TAuth;
  settings: BackendSettings;
  environment?: string | Environment;

  /**
   * Service registry
   *
   * Services are defined as factory functions that receive execution context.
   * Services can be per-request or singletons.
   */
  services?: {
    [K in keyof TServices]: ServiceFactory<TServices[K]>;
  };
}

/**
 * Backend object with typed service registry
 */
export interface BackendObject<TSchema, TAuth, TServices = {}> {
  schema: TSchema;
  authentication?: TAuth;
  settings: ResolvedBackendSettings;
  environment: Environment;

  // ... attachment points ...

  /**
   * Service factory registry
   *
   * Maps service names to factory functions.
   * Used internally to create service instances per request.
   */
  _serviceFactories: Map<string, ServiceFactory<any>>;
}
```

### Service Registry Implementation

```typescript
/**
 * Create service registry from service factories
 *
 * Called once per function invocation to create fresh service instances.
 */
export function createServiceRegistry<TServices>(
  serviceFactories: Map<string, ServiceFactory<any>>,
  executionContext: ExecutionContext,
  backendSettings: ResolvedBackendSettings,
  environment: Environment
): TServices {
  const factoryContext: ServiceFactoryContext = {
    env: process.env as Record<string, string | undefined>,
    settings: backendSettings,
    environment,
    logger: createLogger(executionContext),
  };

  // Cache for instantiated services within this invocation
  const serviceCache = new Map<string, any>();

  // Create proxy that instantiates services on-demand
  return new Proxy({} as TServices, {
    get(target: any, serviceName: string): any {
      // Check cache first
      if (serviceCache.has(serviceName)) {
        return serviceCache.get(serviceName);
      }

      // Check if service factory exists
      const factory = serviceFactories.get(serviceName);
      if (!factory) {
        throw new ServiceNotFoundError(
          `Service '${serviceName}' not found in service registry. ` +
          `Available services: ${Array.from(serviceFactories.keys()).join(', ')}`
        );
      }

      // Instantiate service (may be async)
      const serviceOrPromise = factory(factoryContext);

      // Handle both sync and async factories
      if (serviceOrPromise instanceof Promise) {
        // Async factory - return promise
        const servicePromise = serviceOrPromise.then(service => {
          serviceCache.set(serviceName, service);
          return service;
        });
        serviceCache.set(serviceName, servicePromise);
        return servicePromise;
      } else {
        // Sync factory - cache and return
        serviceCache.set(serviceName, serviceOrPromise);
        return serviceOrPromise;
      }
    },

    has(target: any, serviceName: string): boolean {
      return serviceFactories.has(serviceName);
    },

    ownKeys(target: any): string[] {
      return Array.from(serviceFactories.keys());
    },
  }) as TServices;
}

/**
 * Service not found error
 */
export class ServiceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceNotFoundError';
  }
}
```

### Updated Backend Definition

```typescript
/**
 * Define backend with services
 */
export function defineBackend<
  TSchema extends { schema: Record<string, any> },
  TAuth extends AuthDefinition,
  TServices extends Record<string, any> = {},
>(
  config: BackendConfig<TSchema, TAuth, TServices>
): BackendObject<TSchema, TAuth, TServices> {
  // ... existing validation and setup ...

  // Create service factory registry
  const serviceFactories = new Map<string, ServiceFactory<any>>();
  if (config.services) {
    for (const [name, factory] of Object.entries(config.services)) {
      serviceFactories.set(name, factory as ServiceFactory<any>);
    }
  }

  // Construct backend object
  const backend: BackendObject<TSchema, TAuth, TServices> = {
    schema: schemaWithModels as any,
    authentication: config.authentication,
    settings: resolvedSettings,
    environment,

    // ... attachment points ...

    _metadata: metadata,
    _attachments: attachments,
    _defaults: {},
    _serviceFactories: serviceFactories,
  };

  return backend;
}
```

### Function Context Integration

```typescript
/**
 * Create function context with service registry
 */
export function createFunctionContext<TServices>(
  executionContext: ExecutionContext,
  userContext: UserContext,
  backend: BackendObject<any, any, TServices>
): FunctionContext<TServices> {
  return {
    database: createDatabaseClient(executionContext),
    storage: createStorageClient(executionContext),
    user: userContext,
    utils: createUtils(),

    // Create service registry from factories
    services: createServiceRegistry<TServices>(
      backend._serviceFactories,
      executionContext,
      backend.settings,
      backend.environment
    ),

    log: createLogger(executionContext),
    bindingData: executionContext.backend?.bindingData,
    executionId: executionContext.executionId,
    executionTime: executionContext.executionTime,
    invocationId: executionContext.invocationId,
  };
}

/**
 * Function context with typed services
 */
export interface FunctionContext<TServices = {}> {
  database: DatabaseClient;
  storage: StorageClient;
  user: UserContext;
  utils: FunctionUtils;

  /**
   * Service registry
   *
   * Access to custom services defined in backend configuration.
   * Services are typed based on backend service definitions.
   */
  services: TServices;

  log: Logger;
  bindingData?: Record<string, any>;
  executionId: string;
  executionTime: number;
  invocationId: string;
}
```

---

## Alternatives Considered

### Alternative 1: Auto-Discovery Pattern

**Approach:** Automatically discover services from `./services` directory.

```typescript
// Backend automatically discovers services
const backend = defineBackend({
  schema,
  authentication,
  settings,
  // No explicit service configuration
});

// Services auto-discovered from:
// - ./services/report-generator.ts
// - ./services/data-validator.ts
// context.services.reportGenerator // Available automatically
```

**Pros:**
- Zero configuration
- Convention over configuration
- Less boilerplate

**Cons:**
- Magic behavior (not explicit)
- Hard to test (need to mock filesystem)
- Type inference complex
- Service dependencies unclear
- No control over lifecycle

**Rejected because:** Too much magic, loses type safety, unclear dependencies.

---

### Alternative 2: Dependency Injection Container

**Approach:** Use full DI container (like InversifyJS) for service management.

```typescript
import { Container, injectable, inject } from 'inversify';

@injectable()
class ReportGeneratorService {
  constructor(
    @inject('StorageClient') private storage: StorageClient,
    @inject('Logger') private logger: Logger
  ) {}
}

const container = new Container();
container.bind('ReportGenerator').to(ReportGeneratorService);

const backend = defineBackend({
  schema,
  authentication,
  settings,
  container, // Pass DI container
});
```

**Pros:**
- Full DI capabilities
- Declarative dependencies
- Mature library
- Advanced features (scopes, decorators, etc.)

**Cons:**
- Heavy dependency
- Complex for simple use cases
- Decorator syntax (metadata, experimental)
- Overkill for most backends
- Learning curve

**Rejected because:** Too complex for our use case, adds heavy dependency, overkill.

---

### Alternative 3: Service Provider Functions

**Approach:** Services defined as standalone provider functions.

```typescript
// Service providers
export function createReportGenerator(config: ReportGeneratorConfig) {
  return {
    generate: async (options) => { ... },
  };
}

// Backend configuration
const backend = defineBackend({
  schema,
  authentication,
  settings,
  serviceProviders: {
    reportGenerator: createReportGenerator,
    dataValidator: createDataValidator,
  },
});

// Service instantiation happens outside of function context
const services = initializeServices(backend, config);

// Functions receive pre-initialized services
function handler(context) {
  context.services.reportGenerator // Pre-initialized
}
```

**Pros:**
- Services initialized once at startup
- No per-request overhead
- Simple provider pattern
- No proxy magic

**Cons:**
- Services can't access per-request context
- Hard to swap services per environment at runtime
- Must handle service lifecycle manually
- Doesn't support lazy initialization

**Rejected because:** Loses per-request flexibility, manual lifecycle management.

---

### Alternative 4: Context-Based Service Factories

**Approach:** Services created by context, no backend configuration.

```typescript
// Function handler
function handler(context) {
  // Create services directly in handler
  const reportGenerator = new ReportGeneratorService({
    storage: context.storage,
    logger: context.log,
  });

  await reportGenerator.generate(...);
}
```

**Pros:**
- No configuration needed
- Full control in handler
- No registry needed
- Simple and explicit

**Cons:**
- Repetitive service instantiation
- Hard to mock for testing
- No centralized service management
- Coupling between handlers and service implementations

**Rejected because:** Repetitive, hard to test, no reuse.

---

## Consequences

### Positive Consequences

1. **Type Safety:** Service access is fully typed via TypeScript inference
2. **Explicit:** Services are clearly declared in backend configuration
3. **Testable:** Services can be swapped with mocks easily
4. **Flexible:** Supports both per-request and singleton services
5. **Clear Errors:** Missing services fail with actionable error messages
6. **Environment-Aware:** Services can vary by environment via factory context
7. **No Magic:** Explicit service registration, no auto-discovery
8. **Performance:** Services instantiated on-demand (lazy)

### Negative Consequences

1. **Configuration Overhead:** Must explicitly configure each service
2. **Factory Pattern:** Requires understanding factory pattern
3. **Async Handling:** Must handle both sync and async factories
4. **Type Complexity:** Service typing adds TypeScript complexity
5. **Documentation:** Needs clear documentation on service patterns

### Trade-offs

**Explicit vs. Auto-Discovery:**
- We chose explicit configuration for clarity and control
- Auto-discovery would reduce boilerplate but add magic

**Simple vs. Full DI:**
- We chose simple factory pattern over full DI container
- DI container would add capabilities but also complexity

**Per-Request vs. Singleton:**
- We support both via factory/singleton patterns
- Gives users control over service lifecycle

---

## Success Criteria

### Functional Requirements

1. ✅ Services defined in backend configuration
2. ✅ Services accessible via `context.services`
3. ✅ Type-safe service access with autocomplete
4. ✅ Missing services throw clear errors
5. ✅ Services can be mocked for testing
6. ✅ Supports both sync and async service factories
7. ✅ Singleton pattern supported

### Non-Functional Requirements

1. ✅ Service instantiation < 50ms per service
2. ✅ Zero overhead if no services configured
3. ✅ Full type inference without explicit type annotations
4. ✅ Services work in both development and production
5. ✅ Memory overhead < 1KB per service factory

### Developer Experience

1. ✅ Intuitive service configuration
2. ✅ IDE autocomplete for service access
3. ✅ Clear error messages for missing services
4. ✅ Easy to mock services for testing
5. ✅ Documentation with common patterns

---

## Implementation Plan

### Phase 1: Core Types and Interfaces (2 hours)

- Define `ServiceFactory<T>` type
- Define `ServiceFactoryContext` interface
- Define `ServiceNotFoundError` class
- Implement `singleton()` helper
- Add unit tests for singleton helper

### Phase 2: Backend Integration (4 hours)

- Add `services` field to `BackendConfig`
- Update `defineBackend()` to handle services
- Create `_serviceFactories` Map in backend object
- Add type inference tests
- Document service configuration

### Phase 3: Service Registry Implementation (6 hours)

- Implement `createServiceRegistry()` function
- Add lazy instantiation via Proxy
- Handle sync and async factories
- Add service caching per invocation
- Implement error handling
- Add comprehensive unit tests

### Phase 4: Function Context Integration (4 hours)

- Update `createFunctionContext()` to create service registry
- Update `FunctionContext` type with generic services
- Add integration tests
- Test service access in handlers

### Phase 5: Testing Support (4 hours)

- Create service mocking utilities
- Add test helpers for service injection
- Document testing patterns
- Create example tests

### Total Estimated Effort: 20 hours (2.5 days)

---

## Usage Examples

### Example 1: Basic Service Configuration

```typescript
import { defineBackend } from '@atakora/component';

// Define services
const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
  services: {
    reportGenerator: (context) => new ReportGeneratorService({
      storageAccount: context.env.STORAGE_ACCOUNT!,
    }),

    dataValidator: (context) => new DataValidatorService(),
  },
});

// Use in function handler
export const func = defineFunctions({
  GenerateReport: configureFunction('GenerateReport')
    .withHandler(async (context, input) => {
      // Type-safe service access
      const generator = context.services.reportGenerator;
      const url = await generator.generate(input);
      return { url };
    }),
});
```

### Example 2: Singleton Services

```typescript
import { defineBackend, singleton } from '@atakora/component';

const backend = defineBackend({
  schema,
  authentication,
  settings,
  services: {
    // Singleton - shared across all function invocations
    aiClient: singleton(() => new AISearchClient({
      endpoint: process.env.AZURE_SEARCH_ENDPOINT!,
      key: process.env.AZURE_SEARCH_KEY!,
    })),

    // Per-request - new instance per function invocation
    requestLogger: (context) => new RequestLogger({
      executionId: context.settings.name,
    }),
  },
});
```

### Example 3: Environment-Specific Services

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings,
  services: {
    emailService: (context) => {
      // Use different email service based on environment
      if (context.environment === 'production') {
        return new ProductionEmailService({
          apiKey: context.env.SENDGRID_API_KEY!,
        });
      } else {
        return new MockEmailService({
          logOnly: true,
        });
      }
    },
  },
});
```

### Example 4: Service Dependencies

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings,
  services: {
    // Service with dependencies
    reportGenerator: (context) => {
      const storage = new StorageClient(context.env.STORAGE_ACCOUNT!);
      const ai = new AIClient(context.env.AI_ENDPOINT!);

      return new ReportGeneratorService({
        storage,
        ai,
        logger: context.logger,
      });
    },
  },
});
```

### Example 5: Testing with Mocked Services

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('GenerateReport Function', () => {
  it('should generate report using service', async () => {
    // Create mock service
    const mockGenerator = {
      generate: vi.fn().mockResolvedValue('https://storage/report.pdf'),
    };

    // Create mock backend with test services
    const testBackend = defineBackend({
      schema,
      authentication,
      settings,
      services: {
        reportGenerator: () => mockGenerator,
      },
    });

    // Create function context
    const context = createFunctionContext(
      executionContext,
      userContext,
      testBackend
    );

    // Test handler
    const result = await handler(context, { datasetId: 'test-id' });

    expect(mockGenerator.generate).toHaveBeenCalledWith({ datasetId: 'test-id' });
    expect(result.url).toBe('https://storage/report.pdf');
  });
});
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Service Registry', () => {
  it('should create service from factory', () => {
    const factory = vi.fn(() => ({ name: 'TestService' }));
    const factories = new Map([['test', factory]]);

    const registry = createServiceRegistry(
      factories,
      executionContext,
      settings,
      'development'
    );

    const service = (registry as any).test;

    expect(factory).toHaveBeenCalled();
    expect(service.name).toBe('TestService');
  });

  it('should cache services within invocation', () => {
    const factory = vi.fn(() => ({ name: 'TestService' }));
    const factories = new Map([['test', factory]]);

    const registry = createServiceRegistry(...);

    const service1 = (registry as any).test;
    const service2 = (registry as any).test;

    expect(factory).toHaveBeenCalledTimes(1);
    expect(service1).toBe(service2);
  });

  it('should throw on missing service', () => {
    const registry = createServiceRegistry(
      new Map(),
      executionContext,
      settings,
      'development'
    );

    expect(() => {
      (registry as any).nonexistent;
    }).toThrow(ServiceNotFoundError);
  });

  it('should handle async factories', async () => {
    const factory = vi.fn(async () => ({ name: 'AsyncService' }));
    const factories = new Map([['test', factory]]);

    const registry = createServiceRegistry(...);

    const service = await (registry as any).test;

    expect(service.name).toBe('AsyncService');
  });
});

describe('Singleton Helper', () => {
  it('should create singleton service', async () => {
    const factory = vi.fn(() => ({ id: Math.random() }));
    const singletonFactory = singleton(factory);

    const service1 = await singletonFactory(factoryContext);
    const service2 = await singletonFactory(factoryContext);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(service1).toBe(service2);
  });
});
```

### Integration Tests

```typescript
describe('Backend Service Integration', () => {
  it('should define backend with services', () => {
    const backend = defineBackend({
      schema,
      authentication,
      settings,
      services: {
        test: () => ({ name: 'TestService' }),
      },
    });

    expect(backend._serviceFactories.has('test')).toBe(true);
  });

  it('should create function context with services', () => {
    const backend = defineBackend({
      schema,
      authentication,
      settings,
      services: {
        test: () => ({ name: 'TestService' }),
      },
    });

    const context = createFunctionContext(
      executionContext,
      userContext,
      backend
    );

    expect((context.services as any).test.name).toBe('TestService');
  });
});
```

---

## Documentation Requirements

### User Documentation

1. **Service Configuration Guide:**
   - How to define services
   - Factory pattern explanation
   - Singleton pattern usage
   - Environment-specific services

2. **API Reference:**
   - `ServiceFactory<T>` type
   - `ServiceFactoryContext` interface
   - `singleton()` helper
   - Error types

3. **Examples:**
   - Basic service configuration
   - Singleton services
   - Environment-specific services
   - Service dependencies
   - Testing with mocked services

### Developer Documentation

1. **Architecture:**
   - Service registry design
   - Factory pattern rationale
   - Proxy-based lazy instantiation

2. **Testing:**
   - Service mocking patterns
   - Test helper utilities
   - Integration testing

---

## Related ADRs

- **ADR-020:** Component Auth System (similar factory pattern)
- **ADR-021:** Attachment Point Implementation (related DI concerns)

---

## Approval

**Architect:** Becky _________________ Date: _______

**Lead Developer:** Devon _____________ Date: _______

**QA Lead:** Charlie _________________ Date: _______

---

**ADR Status:** Proposed
**Next Review:** After implementation
**Implementation Target:** Week 2 of Sprint
