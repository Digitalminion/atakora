# Function Customization API - Gap Assessment

**Date**: 2025-01-21
**Reviewer**: Architecture Team
**Priority**: CRITICAL
**Status**: BLOCKING ALPHA

---

## Executive Summary

### Critical Finding: Functions Are Not Production-Ready Without Handler API

The component package successfully implements function model definition (`f.model()`) but lacks the customization API needed to implement actual business logic. This is a **critical blocker** for alpha release.

**Impact**: Users can define function schemas but cannot implement handlers, making functions non-functional for real-world use.

**Recommendation**: **IMPLEMENT BEFORE ALPHA** (3-5 day effort)

---

## Current State

### What Works ✅

```typescript
// Users can define function schemas
const schema = defineSchema({
  schema: a.schema({
    GenerateReport: f
      .model({
        input: {
          datasetId: a.string().required(),
          format: a.enum(['pdf', 'excel']).default('pdf'),
        },
        output: {
          reportUrl: a.string().url().required(),
          status: a.enum(['completed', 'failed']).required(),
        },
      })
      .authorization((allow) => [allow.authenticated()]),
  }),
});
```

**Result**: Function model defined, auto-generates:

- POST /api/functions/generate-report endpoint
- Input/output schema validation
- Authorization checks
- TypeScript types

### What Doesn't Work ❌

```typescript
// Users CANNOT implement custom handlers
// This API does not exist in component package:

import { defineFunctions, configureFunction } from '@atakora/component/functions';

export const func = defineFunctions({
  GenerateReport: configureFunction('GenerateReport')
    .memory(1024)
    .timeout(minutes(10))
    .withHandler(async (context, input) => {
      // Custom business logic here
      const report = await generatePdfReport(input.datasetId);
      return { reportUrl: report.url, status: 'completed' };
    }),
});
```

**Error**: Module '@atakora/component/functions' not found

---

## Gap Analysis

### Missing Components

1. **`/src/functions/` directory** - Does not exist
2. **`defineFunctions()` API** - Not implemented
3. **`configureFunction()` builder** - Not implemented
4. **Helper utilities** - `minutes()`, `greaterThan()` missing

### Missing Capabilities

| Feature             | Backend Package | Component Package | Status       |
| ------------------- | --------------- | ----------------- | ------------ |
| Custom handlers     | ✅ Yes          | ❌ No             | CRITICAL     |
| Memory tuning       | ✅ Yes          | ❌ No             | Important    |
| Timeout config      | ✅ Yes          | ❌ No             | Important    |
| Output bindings     | ✅ Yes          | ❌ No             | Important    |
| Environment vars    | ✅ Yes          | ❌ No             | Important    |
| Monitoring alerts   | ✅ Yes          | ❌ No             | Nice to have |
| Custom metrics      | ✅ Yes          | ❌ No             | Nice to have |
| Distributed tracing | ✅ Yes          | ❌ No             | Nice to have |

---

## Why This Blocks Alpha

### 1. Core Value Proposition Broken

**Atakora's Promise**: "Define once, everything auto-generated"

**Reality Without Handler API**:

- ✅ Can define function schema
- ❌ Cannot implement business logic
- ❌ Function just echoes input (useless)

**User Experience**:

```typescript
// User defines a function
GenerateReport: f.model({ input: {...}, output: {...} })

// User tries to deploy
npm run deploy

// Function is deployed but...
// It just returns the input as-is
// Completely useless for real work
```

### 2. Blocks All Real-World Use Cases

**Without handlers, users cannot**:

- Generate reports
- Transform data
- Integrate external APIs
- Validate complex business rules
- Process uploaded files
- Send notifications
- Execute long-running operations

### 3. Comparison to Reference Implementation

Backend package demonstrates 5 complete examples:

1. **GenerateReport** - PDF generation (1024MB, 10min timeout)
2. **ValidateData** - Data validation (512MB, 2min timeout)
3. **TransformData** - ETL operations (2048MB, 15min timeout)
4. **SearchData** - AI-powered search (512MB, 1min timeout)
5. **ProcessUpload** - File processing (defaults)

**All 5 examples require custom handlers.**

### 4. User Expectations

When developers see `f.model()`, they expect:

- Schema definition ✅ (we have this)
- Handler implementation ❌ (we don't have this)

It's like selling a car without an engine.

---

## Reference Implementation Analysis

### Backend Package Structure

```
packages/backend/src/function/
└── resource.ts (398 lines)
    ├── defineFunctions() - Container
    ├── configureFunction() - Builder
    ├── Helper examples (5 complete functions)
    └── Documentation
```

### Key APIs Required

#### 1. defineFunctions()

```typescript
export const func = defineFunctions({
  FunctionName: configureFunction('FunctionName'),
  // ... configuration
});
```

**Purpose**: Container for all function customizations

#### 2. configureFunction()

```typescript
configureFunction('FunctionName')
  // Performance
  .memory(1024) // MB
  .timeout(minutes(10)) // Duration

  // Business logic
  .withHandler(async (context, input) => {
    // Custom implementation
    return output;
  })

  // Bindings
  .bindings({
    storage: { type: 'blob', container: 'reports' },
    queue: { type: 'queue', name: 'cleanup' },
  })

  // Environment
  .env({
    API_KEY: 'required',
    MAX_SIZE_MB: '100',
  })

  // Monitoring
  .monitoring((alerts) => alerts.onExecutionTime(greaterThan(minutes(8))).warn())

  .withMetrics()
  .withTracing();
```

**Purpose**: Fluent builder for function customization

#### 3. Context API

The handler receives a rich context object:

```typescript
async (context, input) => {
  // Database access
  const data = await context.database.datasets.get(id);

  // Storage access
  const file = await context.storage.blobs.download(url);

  // Services
  const result = await context.services.reportGenerator.generate();

  // Utilities
  const id = context.utils.generateId('rpt');

  // User context
  const userId = context.user.id;

  // Execution context
  const duration = context.executionTime;

  return output;
};
```

---

## Implementation Plan

### Phase 1: Core Handler API (P0 - Critical)

**Files to Create**:

1. `src/functions/define-functions.ts` - Container function
2. `src/functions/configure-function.ts` - Builder class
3. `src/functions/types.ts` - TypeScript types
4. `src/functions/context.ts` - Context API
5. `src/functions/index.ts` - Public exports

**Estimated Effort**: 2-3 days

**Features**:

- ✅ `.withHandler(async (context, input) => output)`
- ✅ `.memory(mb)` - Memory allocation
- ✅ `.timeout(duration)` - Execution timeout
- ✅ Context API with database, storage, user access

### Phase 2: Bindings & Environment (P1 - Important)

**Estimated Effort**: 1 day

**Features**:

- ✅ `.bindings({...})` - Output bindings
- ✅ `.env({...})` - Environment variables

### Phase 3: Monitoring (P2 - Nice to Have)

**Estimated Effort**: 1-2 days

**Features**:

- ✅ `.monitoring(alerts => {...})` - Alert configuration
- ✅ `.withMetrics()` - Custom metrics
- ✅ `.withTracing()` - Distributed tracing

### Phase 4: Helper Utilities (P2 - Nice to Have)

**Estimated Effort**: 0.5 days

**Features**:

- ✅ `minutes()`, `hours()`, `days()` - Duration helpers
- ✅ `greaterThan()`, `lessThan()` - Threshold helpers

---

## Total Implementation Effort

### Minimum Viable (Phase 1 Only)

- **Time**: 2-3 days
- **Result**: Users can implement handlers
- **Alpha Ready**: YES (with basic handler API)

### Recommended (Phase 1 + Phase 2)

- **Time**: 3-4 days
- **Result**: Handlers + bindings + environment
- **Alpha Ready**: YES (feature complete for alpha)

### Complete (All Phases)

- **Time**: 5-6 days
- **Result**: Full feature parity with backend package
- **Alpha Ready**: YES (production-ready)

---

## Risk Assessment

### If We Ship Alpha WITHOUT Handler API

**User Experience**:

1. User defines function with `f.model()` ✅
2. User deploys backend ✅
3. User calls function endpoint ✅
4. Function returns input as-is ❌
5. **User frustration**: "How do I implement the logic?"

**Workarounds**: NONE
**Documentation Fix**: Cannot be documented away
**Community Reaction**: Negative - "Half-baked feature"

### If We Implement Before Alpha

**User Experience**:

1. User defines function with `f.model()` ✅
2. User implements handler with `configureFunction()` ✅
3. User deploys backend ✅
4. Function executes custom business logic ✅
5. **User success**: Feature works as expected

**Workarounds**: Not needed
**Documentation**: Standard usage docs
**Community Reaction**: Positive - "Complete feature"

---

## Recommendations

### Option A: Implement Phase 1 + 2 (RECOMMENDED)

**Timeline**: 3-4 days
**Alpha Release**: Delayed by 3-4 days
**Result**: Production-ready function API

**Includes**:

- Custom handlers (business logic)
- Memory and timeout configuration
- Output bindings (storage, queues)
- Environment variables
- Full context API

**Excludes**:

- Monitoring alerts (can add in beta)
- Custom metrics (can add in beta)
- Distributed tracing (can add in beta)

**Rationale**: This is the minimum feature set for production use. Users can implement real business logic and deploy working functions.

### Option B: Ship Alpha As-Is (NOT RECOMMENDED)

**Timeline**: Immediate
**Alpha Release**: No delay
**Result**: Non-functional functions

**Risk**: High user frustration, negative feedback, potential rejection of framework

**Mitigation**: None - cannot document away missing functionality

### Option C: Implement All Phases (OVER-ENGINEERED)

**Timeline**: 5-6 days
**Alpha Release**: Delayed by 5-6 days
**Result**: Full feature parity

**Rationale**: Monitoring and metrics are "nice to have" for alpha. Save for beta.

---

## Decision Matrix

| Criterion       | Option A (Recommended) | Option B (Not Recommended) | Option C (Over-Engineered) |
| --------------- | ---------------------- | -------------------------- | -------------------------- |
| **Usability**   | ✅ Production-ready    | ❌ Not functional          | ✅ Full-featured           |
| **Timeline**    | 3-4 days delay         | No delay                   | 5-6 days delay             |
| **Risk**        | Low                    | High                       | Low                        |
| **User Value**  | High                   | None                       | High                       |
| **Scope**       | Right-sized            | Incomplete                 | Too much                   |
| **Alpha Ready** | ✅ YES                 | ❌ NO                      | ✅ YES                     |

---

## Implementation Approach

### Step 1: Create Function Customization System (2 days)

```typescript
// src/functions/define-functions.ts
export function defineFunctions(functions: Record<string, FunctionConfiguration>) {
  return functions;
}

// src/functions/configure-function.ts
export class FunctionConfigurationBuilder {
  private config: FunctionConfig;

  constructor(name: string) {
    this.config = {
      name,
      memory: 256, // Default
      timeout: 30000, // Default 30s
    };
  }

  memory(mb: number): this {
    this.config.memory = mb;
    return this;
  }

  timeout(ms: number): this {
    this.config.timeout = ms;
    return this;
  }

  withHandler(handler: FunctionHandler): this {
    this.config.handler = handler;
    return this;
  }

  _build(): FunctionConfig {
    return this.config;
  }
}

export function configureFunction(name: string) {
  return new FunctionConfigurationBuilder(name);
}
```

### Step 2: Create Context API (1 day)

```typescript
// src/functions/context.ts
export interface FunctionContext {
  // Database access
  database: DatabaseClient;

  // Storage access
  storage: StorageClient;

  // User context
  user: {
    id: string;
    email: string;
    roles: string[];
  };

  // Utilities
  utils: {
    generateId: (prefix: string) => string;
    // ... more helpers
  };

  // Execution metadata
  executionId: string;
  executionTime: number;
  invocationId: string;
}
```

### Step 3: Add Bindings & Environment (1 day)

```typescript
// Add to configure-function.ts
bindings(config: BindingConfig): this {
  this.config.bindings = config;
  return this;
}

env(vars: EnvironmentConfig): this {
  this.config.environment = vars;
  return this;
}
```

### Step 4: Integration & Testing (1 day)

- Add exports to `src/index.ts`
- Create integration tests
- Update backend assembly to handle function attachments
- Verify end-to-end flow

---

## Success Criteria

### Minimum (Phase 1)

- ✅ Users can implement custom handlers
- ✅ Handlers receive context and input
- ✅ Handlers return typed output
- ✅ Memory and timeout configurable
- ✅ Full TypeScript type inference

### Recommended (Phase 1 + 2)

- ✅ All Phase 1 criteria
- ✅ Output bindings work (storage, queues)
- ✅ Environment variables configurable
- ✅ 80%+ test coverage
- ✅ Documentation complete

---

## Conclusion

**The function customization API is a critical blocker for alpha release.**

Without it:

- Functions are non-functional (echo handlers only)
- Real-world use cases are impossible
- Users will be frustrated and reject the framework

With it (Phase 1 + 2):

- Functions are production-ready
- Users can implement business logic
- Framework delivers on its core promise

**Recommended Action**: Implement Phase 1 + 2 (3-4 day effort) before alpha release.

**Alternative**: If timeline is critical, implement Phase 1 only (2-3 days) and ship with basic handler API. Add bindings and environment in beta.

**NOT Recommended**: Ship alpha without handler API. This will damage user trust and framework adoption.

---

## Next Steps

1. ✅ **Review this assessment**
2. ⏳ **Make decision**: Implement now vs. defer to beta
3. ⏳ **If implementing**: Activate Devon to build function customization API
4. ⏳ **If deferring**: Document limitation prominently in alpha release notes

---

**Assessment Complete**: 2025-01-21
**Status**: Awaiting decision on implementation timeline
