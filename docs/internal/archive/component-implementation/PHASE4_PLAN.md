# Phase 4 Implementation Plan: Backend Assembly

**Date**: 2025-11-20
**Author**: Becky (Staff Architect)
**Phase**: 4 of 10
**Duration**: 2 weeks (10 business days)
**Status**: Ready to Begin

---

## Executive Summary

Phase 4 implements the backend assembly system that brings together schema (Phase 1) and authentication (Phase 2) into a unified backend definition. This phase establishes the core `defineBackend()` function, attachment point system, and environment-aware default configurations that enable the "30 lines of code" backend definition experience.

**Key Innovation**: The attachment point system allows progressive enhancement - start with smart defaults, customize only what you need.

**Timeline**: 2 weeks (vs 2 weeks planned) - On schedule

---

## 1. Architecture Overview

### 1.1 Backend Assembly Pattern

The backend assembly pattern is the cornerstone of Atakora's developer experience:

```typescript
// Minimal backend - everything works with defaults
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Progressive enhancement - customize what you need
backend.storage.database.attach(customDatabase);
backend.schema.DataUploaded.queue.attach(customQueue);
```

### 1.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ defineBackend({ schema, auth, settings })               │
│                                                          │
│ Creates BackendObject with:                             │
│   ├─ Schema integration (models, types)                 │
│   ├─ Auth configuration                                 │
│   ├─ Default infrastructure                             │
│   └─ Attachment points for customization                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Environment Detection & Defaults                        │
│   ├─ Development: Serverless, minimal resources         │
│   ├─ Staging: Similar to prod, lower scale              │
│   └─ Production: HA, multi-region, full monitoring      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Attachment Point System                                 │
│   ├─ backend.storage.database.attach(...)              │
│   ├─ backend.storage.account.attach(...)               │
│   ├─ backend.compute.functionApp.attach(...)           │
│   ├─ backend.network.vnet.attach(...)                  │
│   ├─ backend.monitoring.appInsights.attach(...)        │
│   └─ backend.schema.[Model].[resource].attach(...)     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Configuration Resolution                                │
│   1. Start with environment defaults                    │
│   2. Apply user settings                                │
│   3. Apply attachments (override defaults)              │
│   4. Validate final configuration                       │
│   5. Generate infrastructure definitions                │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Key Design Decisions

1. **Defaults by Environment**: Development, staging, and production have different default configurations
2. **Progressive Enhancement**: Start simple, add complexity only when needed
3. **Type-Safe Attachments**: Compile-time checking prevents invalid attachments
4. **Schema-Driven Resources**: Models automatically create attachment points for their resources
5. **Immutable Configuration**: Once created, backend config is immutable (attachments create new state)

---

## 2. API Design

### 2.1 defineBackend() Function

**Core API:**

```typescript
// src/backend/define-backend.ts

export function defineBackend<TSchema extends SchemaDefinition, TAuth extends AuthDefinition>(
  config: BackendConfig<TSchema, TAuth>
): BackendObject<TSchema, TAuth>;

interface BackendConfig<TSchema, TAuth> {
  /**
   * Schema definition from Phase 1
   */
  schema: SchemaObject<TSchema>;

  /**
   * Authentication configuration from Phase 2
   */
  authentication?: AuthObject<TAuth>;

  /**
   * Backend settings
   */
  settings: BackendSettings;

  /**
   * Optional environment override
   */
  environment?: Environment;
}

interface BackendSettings {
  /**
   * Application name (used for resource naming)
   */
  name: string;

  /**
   * Azure region (defaults to process.env.AZURE_REGION or 'eastus')
   */
  region?: string;

  /**
   * Resource group name (defaults to `${name}-rg`)
   */
  resourceGroup?: string;

  /**
   * Tags to apply to all resources
   */
  tags?: Record<string, string>;

  /**
   * Enable/disable specific features
   */
  features?: {
    monitoring?: boolean;
    networking?: boolean;
    performance?: boolean;
  };
}
```

### 2.2 BackendObject Structure

```typescript
interface BackendObject<TSchema, TAuth> {
  // Original inputs
  schema: SchemaObject<TSchema>;
  authentication?: AuthObject<TAuth>;
  settings: ResolvedBackendSettings;
  environment: Environment;

  // Infrastructure components with attachment points
  storage: {
    account: AttachmentPoint<StorageAccountConfig>;
    database: AttachmentPoint<DatabaseConfig>;
  };

  compute: {
    functionApp: AttachmentPoint<FunctionAppConfig>;
  };

  network?: {
    vnet: AttachmentPoint<VNetConfig>;
    waf: AttachmentPoint<WafConfig>;
    ddos: AttachmentPoint<DdosConfig>;
  };

  monitoring?: {
    appInsights: AttachmentPoint<AppInsightsConfig>;
    logAnalytics: AttachmentPoint<LogAnalyticsConfig>;
    alerts: AttachmentPoint<AlertsConfig>;
  };

  performance?: {
    cdn: AttachmentPoint<CdnConfig>;
    cache: AttachmentPoint<CacheConfig>;
    rateLimit: AttachmentPoint<RateLimitConfig>;
  };

  // Schema-specific attachment points
  // Dynamically created based on schema models
  models: {
    [K in keyof TSchema['models']]: ModelAttachmentPoints<TSchema['models'][K]>;
  };

  // Metadata
  _metadata: BackendMetadata;

  // Internal
  _attachments: Map<string, any>;
  _defaults: BackendDefaults;
}
```

### 2.3 Attachment Point System

```typescript
// src/backend/attachment-point.ts

export interface AttachmentPoint<T> {
  /**
   * Attach a custom configuration
   */
  attach(config: T): void;

  /**
   * Check if configuration is attached
   */
  isAttached(): boolean;

  /**
   * Get current configuration (default or attached)
   */
  getConfig(): T;

  /**
   * Reset to default configuration
   */
  reset(): void;

  // Internal
  _default: T;
  _attached?: T;
  _path: string;
}

export class AttachmentPointImpl<T> implements AttachmentPoint<T> {
  constructor(
    private backend: BackendObject<any, any>,
    private path: string,
    private defaultConfig: T
  ) {
    this._default = defaultConfig;
    this._path = path;
  }

  attach(config: T): void {
    // Validate config
    this.validateConfig(config);

    // Store attachment
    this._attached = config;
    this.backend._attachments.set(this._path, config);

    // Log attachment for debugging
    console.debug(`Attached custom config at ${this._path}`);
  }

  isAttached(): boolean {
    return this._attached !== undefined;
  }

  getConfig(): T {
    return this._attached || this._default;
  }

  reset(): void {
    this._attached = undefined;
    this.backend._attachments.delete(this._path);
  }

  private validateConfig(config: T): void {
    // Type-specific validation
    // Implemented per resource type
  }
}
```

### 2.4 Environment Detection

```typescript
// src/backend/environment.ts

export type Environment = 'development' | 'staging' | 'production';

export function detectEnvironment(): Environment {
  const env = process.env.NODE_ENV || process.env.ENVIRONMENT;

  switch (env?.toLowerCase()) {
    case 'production':
    case 'prod':
      return 'production';

    case 'staging':
    case 'stage':
    case 'test':
      return 'staging';

    case 'development':
    case 'dev':
    case 'local':
    default:
      return 'development';
  }
}

export function getEnvironmentDefaults(env: Environment): BackendDefaults {
  switch (env) {
    case 'development':
      return getDevelopmentDefaults();

    case 'staging':
      return getStagingDefaults();

    case 'production':
      return getProductionDefaults();
  }
}
```

---

## 3. Default Configurations

### 3.1 Development Defaults

```typescript
// src/backend/defaults/development.ts

export function getDevelopmentDefaults(): BackendDefaults {
  return {
    storage: {
      account: storage
        .account()
        .name('devstorage')
        .sku('Standard_LRS') // Single region
        .tier('Hot'),

      database: storage
        .cosmosDb()
        .name('devdb')
        .mode('Serverless') // Pay per request
        .consistency('Session')
        .backup((backup) => backup.enable(false)), // No backup in dev
    },

    compute: {
      functionApp: compute
        .functionApp()
        .name('devfunc')
        .plan('Consumption') // Serverless
        .runtime('node', '18')
        .alwaysOn(false),
    },

    // No network isolation in dev
    network: undefined,

    // Minimal monitoring in dev
    monitoring: {
      appInsights: monitoring.appInsights().name('devai').samplingPercentage(10), // Sample 10% of telemetry
    },

    // No performance features in dev
    performance: undefined,
  };
}
```

### 3.2 Production Defaults

```typescript
// src/backend/defaults/production.ts

export function getProductionDefaults(): BackendDefaults {
  return {
    storage: {
      account: storage
        .account()
        .name('prodstorage')
        .sku('Standard_ZRS') // Zone redundant
        .tier('Hot')
        .encryption('Microsoft.Storage')
        .networkRules((rules) => rules.defaultAction('Deny').allowAzureServices(true)),

      database: storage
        .cosmosDb()
        .name('proddb')
        .mode('Autoscale')
        .throughput(4000, 40000) // 4K-40K RU/s
        .consistency('Session')
        .backup((backup) => backup.enable(true).type('Continuous').retention(30))
        .multiRegion(['eastus', 'westus'])
        .enableAnalyticalStore(true),
    },

    compute: {
      functionApp: compute
        .functionApp()
        .name('prodfunc')
        .plan('Premium', 'EP2')
        .runtime('node', '18')
        .alwaysOn(true)
        .minInstances(2)
        .maxInstances(20)
        .healthCheck('/api/health'),
    },

    network: {
      vnet: network
        .vnet()
        .name('prodvnet')
        .addressSpace('10.0.0.0/16')
        .subnets([
          { name: 'functions', range: '10.0.1.0/24' },
          { name: 'data', range: '10.0.2.0/24' },
        ]),

      waf: network.waf().enable(true).mode('Prevention').ruleSet('OWASP', '3.2'),

      ddos: network.ddos().enable(true).plan('Standard'),
    },

    monitoring: {
      appInsights: monitoring
        .appInsights()
        .name('prodai')
        .samplingPercentage(100)
        .retentionDays(90)
        .enableLiveMetrics(true)
        .enableProfiler(true),

      logAnalytics: monitoring.logAnalytics().name('prodlogs').sku('PerGB2018').retentionDays(90),

      alerts: monitoring
        .alerts()
        .responseTime((threshold) => threshold.warning(1000).critical(3000))
        .errorRate((threshold) => threshold.warning(1).critical(5))
        .availability((threshold) => threshold.warning(99.9).critical(99.5)),
    },

    performance: {
      cdn: performance
        .cdn()
        .enable(true)
        .profile('Standard_Microsoft')
        .caching('Standard')
        .compression(true),

      cache: performance.cache().enable(true).sku('Standard', 'C1').evictionPolicy('LRU'),

      rateLimit: performance.rateLimit().enable(true).requestsPerMinute(1000).burstSize(100),
    },
  };
}
```

### 3.3 Staging Defaults

```typescript
// src/backend/defaults/staging.ts

export function getStagingDefaults(): BackendDefaults {
  // Similar to production but with:
  // - Lower scale (min 1 instance, max 10)
  // - Shorter retention (30 days)
  // - Single region
  // - Lower throughput limits

  const prodDefaults = getProductionDefaults();

  return {
    ...prodDefaults,

    storage: {
      ...prodDefaults.storage,
      database: prodDefaults.storage.database
        .throughput(1000, 10000) // Lower than prod
        .multiRegion(undefined), // Single region
    },

    compute: {
      functionApp: prodDefaults.compute.functionApp
        .name('stagefunc')
        .minInstances(1) // Lower than prod
        .maxInstances(10), // Lower than prod
    },

    monitoring: {
      ...prodDefaults.monitoring,
      appInsights: prodDefaults.monitoring.appInsights.retentionDays(30), // Shorter retention

      logAnalytics: prodDefaults.monitoring.logAnalytics.retentionDays(30), // Shorter retention
    },
  };
}
```

---

## 4. Schema-Specific Attachment Points

### 4.1 Dynamic Attachment Point Creation

For each model in the schema, create appropriate attachment points:

```typescript
// src/backend/schema-attachments.ts

export function createSchemaAttachmentPoints<T extends SchemaDefinition>(
  schema: SchemaObject<T>,
  backend: BackendObject<T, any>
): ModelAttachmentPoints {
  const attachmentPoints: ModelAttachmentPoints = {};

  for (const [modelName, model] of Object.entries(schema.models)) {
    attachmentPoints[modelName] = createModelAttachmentPoints(modelName, model, backend);
  }

  return attachmentPoints;
}

function createModelAttachmentPoints(
  name: string,
  model: ModelDefinition,
  backend: BackendObject<any, any>
): ModelSpecificAttachmentPoints {
  const points: ModelSpecificAttachmentPoints = {};

  switch (model.type) {
    case 'crud':
      // CRUD models have database container attachment
      points.container = new AttachmentPointImpl(
        backend,
        `models.${name}.container`,
        getDefaultContainerConfig(name)
      );
      break;

    case 'event':
      // Event models have queue and processor attachments
      points.queue = new AttachmentPointImpl(
        backend,
        `models.${name}.queue`,
        getDefaultQueueConfig(name)
      );

      points.processor = new AttachmentPointImpl(
        backend,
        `models.${name}.processor`,
        getDefaultProcessorConfig(name)
      );
      break;

    case 'function':
      // Function models have handler attachment
      points.handler = new AttachmentPointImpl(
        backend,
        `models.${name}.handler`,
        getDefaultHandlerConfig(name)
      );
      break;
  }

  return points;
}
```

### 4.2 Usage Example

```typescript
// User code
const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Customize queue for specific event model
backend.models.DataUploaded.queue.attach(
  storage.queue().name('data-uploaded-priority').maxDeliveryCount(10).visibilityTimeout(minutes(5))
);

// Customize container for specific CRUD model
backend.models.User.container.attach(
  storage
    .container()
    .name('users')
    .partitionKey('/tenantId')
    .indexingPolicy((policy) => policy.automatic(true).includePaths(['/*']))
);
```

---

## 5. Implementation Tasks

### Task Breakdown (15 tasks total)

#### Task 1: Core Backend Definition [Day 1-2]

**Owner**: Devon-Backend-1
**Files**:

- `src/backend/define-backend.ts`
- `src/backend/types.ts`
- `src/backend/index.ts`

**Deliverables**:

- `defineBackend()` function
- `BackendObject` type and implementation
- Core type definitions
- Basic validation

**Success Criteria**:

- Can create minimal backend
- Type inference works
- Settings validation

---

#### Task 2: Attachment Point System [Day 2-3]

**Owner**: Devon-Backend-2
**Files**:

- `src/backend/attachment-point.ts`
- `src/backend/attachment-validator.ts`

**Deliverables**:

- `AttachmentPoint` interface
- `AttachmentPointImpl` class
- Attachment validation logic
- Type-safe attachment checking

**Success Criteria**:

- Can attach configurations
- Type errors for invalid attachments
- Can check attachment status

---

#### Task 3: Environment Detection [Day 3]

**Owner**: Devon-Backend-3
**Files**:

- `src/backend/environment.ts`
- `src/backend/environment-utils.ts`

**Deliverables**:

- Environment detection logic
- Environment override support
- Environment-specific feature flags

**Success Criteria**:

- Correctly detects dev/staging/prod
- Can override detection
- Returns correct defaults per environment

---

#### Task 4: Development Defaults [Day 4]

**Owner**: Devon-Backend-4
**Files**:

- `src/backend/defaults/development.ts`
- `src/backend/defaults/base.ts`

**Deliverables**:

- Development default configurations
- Base default structure
- Minimal resource configs

**Success Criteria**:

- Serverless/consumption tier defaults
- No unnecessary features enabled
- Cost-optimized for development

---

#### Task 5: Production Defaults [Day 4-5]

**Owner**: Devon-Backend-5
**Files**:

- `src/backend/defaults/production.ts`

**Deliverables**:

- Production default configurations
- HA and multi-region setup
- Full monitoring and performance

**Success Criteria**:

- High availability configs
- Security best practices
- Performance optimizations

---

#### Task 6: Staging Defaults [Day 5]

**Owner**: Devon-Backend-4 (continuation)
**Files**:

- `src/backend/defaults/staging.ts`

**Deliverables**:

- Staging default configurations
- Production-like but scaled down

**Success Criteria**:

- Similar to prod but lower scale
- Cost-optimized for staging

---

#### Task 7: Schema Integration [Day 6]

**Owner**: Devon-Backend-1 (continuation)
**Files**:

- `src/backend/schema-integration.ts`

**Deliverables**:

- Schema to backend integration
- Type preservation
- Model access helpers

**Success Criteria**:

- Schema types flow through
- Can access models via backend
- Type inference maintained

---

#### Task 8: Schema Attachment Points [Day 6-7]

**Owner**: Devon-Backend-2 (continuation)
**Files**:

- `src/backend/schema-attachments.ts`
- `src/backend/model-attachments.ts`

**Deliverables**:

- Dynamic attachment point creation
- Model-specific attachment points
- CRUD/Event/Function attachments

**Success Criteria**:

- Each model has appropriate attachments
- Type-safe model attachments
- Can customize per-model resources

---

#### Task 9: Storage Attachments [Day 7]

**Owner**: Devon-Backend-3 (continuation)
**Files**:

- `src/backend/attachments/storage.ts`

**Deliverables**:

- Storage account attachment logic
- Database attachment logic
- Queue/container attachments

**Success Criteria**:

- Can attach custom storage configs
- Validation of storage settings
- Type safety maintained

---

#### Task 10: Compute Attachments [Day 8]

**Owner**: Devon-Backend-5 (continuation)
**Files**:

- `src/backend/attachments/compute.ts`

**Deliverables**:

- Function app attachment logic
- Runtime configuration
- Scaling configuration

**Success Criteria**:

- Can customize function app
- Plan and runtime validation
- Scaling rules work

---

#### Task 11: Network Attachments [Day 8]

**Owner**: Devon-Backend-4 (continuation)
**Files**:

- `src/backend/attachments/network.ts`

**Deliverables**:

- VNet attachment logic
- WAF attachment logic
- DDoS attachment logic

**Success Criteria**:

- Can customize network configs
- Optional network components
- Security rules validation

---

#### Task 12: Monitoring Attachments [Day 9]

**Owner**: Devon-Backend-3 (continuation)
**Files**:

- `src/backend/attachments/monitoring.ts`

**Deliverables**:

- App Insights attachment
- Log Analytics attachment
- Alerts attachment

**Success Criteria**:

- Can customize monitoring
- Alert thresholds work
- Retention configuration

---

#### Task 13: Performance Attachments [Day 9]

**Owner**: Devon-Backend-5 (continuation)
**Files**:

- `src/backend/attachments/performance.ts`

**Deliverables**:

- CDN attachment logic
- Cache attachment logic
- Rate limit attachment

**Success Criteria**:

- Can customize performance features
- Optional performance components
- Configuration validation

---

#### Task 14: Configuration Resolution [Day 10]

**Owner**: Devon-Backend-1 (continuation)
**Files**:

- `src/backend/config-resolver.ts`
- `src/backend/config-merger.ts`

**Deliverables**:

- Configuration resolution logic
- Default + attachment merging
- Final config validation

**Success Criteria**:

- Correct precedence (attachment > setting > default)
- Deep merging works correctly
- Validates final configuration

---

#### Task 15: defineSchema Function [Day 10]

**Owner**: Devon-Backend-2 (continuation)
**Files**:

- `src/schema/define-schema.ts`

**Deliverables**:

- `defineSchema()` wrapper function
- Schema validation enhancements
- Metadata generation

**Success Criteria**:

- Clean schema definition API
- Validation at definition time
- Metadata included

---

## 6. Testing Strategy

### 6.1 Unit Tests (Target: >90% coverage)

**Test Structure**:

```
src/backend/
├── define-backend.spec.ts       # Core function tests
├── attachment-point.spec.ts     # Attachment system tests
├── environment.spec.ts          # Environment detection tests
├── config-resolver.spec.ts      # Configuration resolution tests
├── defaults/
│   ├── development.spec.ts      # Dev defaults tests
│   ├── staging.spec.ts          # Staging defaults tests
│   └── production.spec.ts       # Prod defaults tests
├── attachments/
│   ├── storage.spec.ts          # Storage attachment tests
│   ├── compute.spec.ts          # Compute attachment tests
│   ├── network.spec.ts          # Network attachment tests
│   ├── monitoring.spec.ts       # Monitoring attachment tests
│   └── performance.spec.ts      # Performance attachment tests
└── schema-attachments.spec.ts   # Schema attachment tests
```

### 6.2 Integration Tests

```typescript
describe('Backend Assembly Integration', () => {
  it('should create backend with schema and auth', () => {
    const schema = defineSchema({...});
    const auth = defineAuth({...});

    const backend = defineBackend({
      schema,
      authentication: auth,
      settings: { name: 'test' }
    });

    expect(backend.schema).toBe(schema);
    expect(backend.authentication).toBe(auth);
  });

  it('should apply environment defaults correctly', () => {
    process.env.NODE_ENV = 'production';

    const backend = defineBackend({...});

    expect(backend.storage.database.getConfig().mode).toBe('Autoscale');
    expect(backend.monitoring).toBeDefined();
    expect(backend.network).toBeDefined();
  });

  it('should allow attachments to override defaults', () => {
    const backend = defineBackend({...});

    const customDb = storage.cosmosDb()
      .name('custom-db')
      .mode('Serverless');

    backend.storage.database.attach(customDb);

    expect(backend.storage.database.getConfig().name).toBe('custom-db');
    expect(backend.storage.database.getConfig().mode).toBe('Serverless');
  });
});
```

### 6.3 Type Tests

```typescript
import { expectType, expectError } from 'tsd';

// Type inference tests
const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'test' },
});

// Should infer schema types
expectType<typeof schema>(backend.schema);

// Should prevent invalid attachments
expectError(backend.storage.database.attach(network.vnet()));

// Should allow valid attachments
expectType<void>(backend.storage.database.attach(storage.cosmosDb()));
```

---

## 7. Success Criteria

### 7.1 Functional Requirements

**Must Have**:

- ✅ `defineBackend()` function works
- ✅ Environment detection and defaults
- ✅ Attachment point system functional
- ✅ Type-safe attachments
- ✅ Schema integration maintained
- ✅ Auth integration maintained
- ✅ All three environment defaults (dev/staging/prod)
- ✅ Configuration resolution logic
- ✅ Schema-specific attachment points

**Should Have**:

- ✅ Attachment validation
- ✅ Configuration merging
- ✅ Reset to defaults capability
- ✅ Attachment status checking

### 7.2 Quality Requirements

- > 90% test coverage
- All public APIs documented
- Type inference works throughout
- No runtime type errors
- Clean separation of concerns

---

## 8. Dependencies

### 8.1 From Previous Phases

**Required from Phase 1**:

- ✅ Schema types and definitions
- ✅ Model builders
- ✅ Type inference utilities

**Required from Phase 2**:

- ✅ Auth types and definitions
- ✅ Provider configurations

### 8.2 For Future Phases

**Phase 4 enables**:

- Phase 5: Infrastructure resource builders use attachment points
- Phase 7: Synthesis uses resolved configuration
- Phase 8: Context API uses backend object

---

## 9. Risk Assessment

### 9.1 Technical Risks

**Risk 1: Complex Type Inference** (Medium)

- **Mitigation**: Start with simpler types, iterate
- **Contingency**: Provide explicit type parameters as escape hatch

**Risk 2: Configuration Merging Complexity** (Low)

- **Mitigation**: Use established deep merge libraries
- **Contingency**: Implement custom merge logic if needed

**Risk 3: Circular Dependencies** (Low)

- **Mitigation**: Clear module boundaries
- **Contingency**: Refactor if detected

### 9.2 Timeline Risks

**Risk 1: Schema Attachment Complexity** (Medium)

- **Impact**: Could delay by 1-2 days
- **Mitigation**: Parallelize with other tasks
- **Contingency**: Simplify initial implementation

---

## 10. Team Assignments

### Devon Agent Allocation

**Devon-Backend-1** (Core & Integration)

- Days 1-2: Task 1 (Core backend definition)
- Day 6: Task 7 (Schema integration)
- Day 10: Task 14 (Configuration resolution)

**Devon-Backend-2** (Attachments)

- Days 2-3: Task 2 (Attachment point system)
- Days 6-7: Task 8 (Schema attachment points)
- Day 10: Task 15 (defineSchema function)

**Devon-Backend-3** (Environment & Infrastructure)

- Day 3: Task 3 (Environment detection)
- Day 7: Task 9 (Storage attachments)
- Day 9: Task 12 (Monitoring attachments)

**Devon-Backend-4** (Defaults & Network)

- Day 4: Task 4 (Development defaults)
- Day 5: Task 6 (Staging defaults)
- Day 8: Task 11 (Network attachments)

**Devon-Backend-5** (Production & Performance)

- Days 4-5: Task 5 (Production defaults)
- Day 8: Task 10 (Compute attachments)
- Day 9: Task 13 (Performance attachments)

### Charlie Agent Allocation

5 Charlie agents for comprehensive testing, following Devon agents' work.

---

## 11. Next Steps

### Immediate Actions

1. Create tasks in Digital Minion system
2. Review plan with team
3. Set up test infrastructure
4. Begin Task 1 implementation

### Week 1 Goals

- Core backend assembly working
- Environment detection complete
- All defaults implemented
- Attachment system functional

### Week 2 Goals

- All attachment types implemented
- Schema integration complete
- Configuration resolution working
- Full test coverage achieved

---

## Document History

| Version | Date       | Author                  | Changes              |
| ------- | ---------- | ----------------------- | -------------------- |
| 1.0     | 2025-11-20 | Becky (Staff Architect) | Initial Phase 4 plan |
