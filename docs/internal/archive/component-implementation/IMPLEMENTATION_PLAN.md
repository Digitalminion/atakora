# @atakora/component - Implementation Plan

**Status**: Architecture Design Phase
**Author**: Becky (Staff Architect)
**Date**: 2025-01-20
**Version**: 1.0

---

## Executive Summary

This document provides a comprehensive implementation plan for the `@atakora/component` package, which is the core library that powers Atakora's schema-first backend framework. This package provides the fluent API, type system, builder patterns, and runtime infrastructure that enables developers to define backends using ~30 lines of code while automatically generating production-ready Azure infrastructure.

**Key Innovation**: Schema-centric architecture where data models drive infrastructure provisioning, eliminating the need for manual infrastructure configuration while maintaining full customization capabilities through the attach pattern.

**Code Reduction**: 70%+ reduction in code vs traditional approaches, with more features and better organization.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Package Structure](#2-package-structure)
3. [Core Abstractions](#3-core-abstractions)
4. [Fluent API Implementation](#4-fluent-api-implementation)
5. [Attach Pattern Implementation](#5-attach-pattern-implementation)
6. [Infrastructure Defaults](#6-infrastructure-defaults)
7. [Type Generation](#7-type-generation)
8. [Context API](#8-context-api)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Strategy](#10-testing-strategy)
11. [Dependencies](#11-dependencies)
12. [Open Questions](#12-open-questions)

---

## 1. Architecture Overview

### 1.1 Design Patterns Established

Based on the backend-simple and backend packages, we've established these patterns:

#### Schema-Centric Design

```typescript
// Single source of truth
export const schema = defineSchema({
  schema: a.schema({
    User: c.model({...}),           // CRUD → 5 REST endpoints + DB
    DataUploaded: e.model({...}),   // Event → Queue + Processor
    GenerateReport: f.model({...}), // Function → HTTP endpoint
  })
});
```

**Key Decisions:**

- ✅ Schema defines ALL data contracts
- ✅ Infrastructure auto-generates from schema
- ✅ Type generation from schema definitions
- ✅ Validation logic embedded in schema

#### Progressive Enhancement Pattern

```typescript
// Start minimal
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Add customizations as needed
backend.storage.database.attach(data.Database);
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
```

**Key Decisions:**

- ✅ Defaults work for 80% of use cases
- ✅ Customization is explicit via `.attach()`
- ✅ Type-safe attachment points
- ✅ Environment-aware defaults

#### Fluent Builder API

```typescript
// Chainable configuration
Database: storage
  .cosmosDb()
  .name('my-db')
  .mode('Autoscale')
  .consistency('Session')
  .backup((backup) => backup.enable(true).type('Continuous'))
  .when(isProd, (db) => db.multiRegion(['eastus', 'westus']));
```

**Key Decisions:**

- ✅ Method chaining for readability
- ✅ Nested builders for complex config
- ✅ Conditional `.when()` for environment-specific logic
- ✅ IntelliSense-driven development

### 1.2 API Surface

The package exposes these primary APIs:

```typescript
// Schema Definition
import { defineSchema, a, c, e, f } from '@atakora/component';

// Authentication
import { defineAuth, auth } from '@atakora/component/auth';

// Backend Assembly
import { defineBackend } from '@atakora/component';

// Infrastructure Resources
import { defineNetwork, network } from '@atakora/component/network';
import { defineStorage, storage } from '@atakora/component/storage';
import { defineCompute, compute } from '@atakora/component/compute';
import { defineMonitoring, monitoring } from '@atakora/component/monitoring';
import { definePerformance, performance } from '@atakora/component/performance';

// Event Customization
import { defineEvents, configureEvent } from '@atakora/component/events';

// Function Customization
import { defineFunctions, configureFunction } from '@atakora/component/functions';
```

### 1.3 Type Safety Strategy

**Principle**: Leverage TypeScript's type system to prevent errors at compile-time, not runtime.

```typescript
// Type inference from schema
type User = typeof backend.schema.User.$inferType;
type CreateUserInput = typeof backend.schema.User.$inferCreateInput;

// Type-safe attachment points
backend.storage.database.attach(data.Database); // ✅ Correct type
backend.storage.database.attach(performance.Cache); // ❌ Compile error

// Type-safe event processors
.withProcessor(async (context, event: DataUploadedEvent) => {
  // event is fully typed
  await context.db.datasets.update(event.datasetId, {...});
});
```

**Implementation Strategy:**

- Use TypeScript utility types extensively (`Partial`, `Omit`, `Pick`, `Required`)
- Leverage conditional types for schema inference
- Use mapped types for attachment point validation
- Provide helper types for common patterns

---

## 2. Package Structure

### 2.1 Recommended Directory Structure

```
packages/component/
├── src/
│   ├── index.ts                    # Main entry point
│   │
│   ├── schema/
│   │   ├── index.ts                # Schema API exports
│   │   ├── define-schema.ts        # defineSchema() implementation
│   │   ├── field-types.ts          # a.string(), a.number(), etc.
│   │   ├── crud-model.ts           # c.model() implementation
│   │   ├── event-model.ts          # e.model() implementation
│   │   ├── function-model.ts       # f.model() implementation
│   │   ├── schema-builder.ts       # a.schema() implementation
│   │   ├── validation.ts           # Validation logic
│   │   └── types.ts                # Type inference utilities
│   │
│   ├── auth/
│   │   ├── index.ts                # Auth API exports
│   │   ├── define-auth.ts          # defineAuth() implementation
│   │   ├── entra.ts                # auth.entra() builder
│   │   ├── api-keys.ts             # auth.apiKeys() builder
│   │   └── types.ts                # Auth type definitions
│   │
│   ├── backend/
│   │   ├── index.ts                # Backend API exports
│   │   ├── define-backend.ts       # defineBackend() implementation
│   │   ├── attach-points.ts        # Attachment point definitions
│   │   ├── defaults.ts             # Default configurations
│   │   └── types.ts                # Backend type definitions
│   │
│   ├── network/
│   │   ├── index.ts                # Network API exports
│   │   ├── define-network.ts       # defineNetwork() implementation
│   │   ├── vnet.ts                 # network.vnet() builder
│   │   ├── waf.ts                  # network.waf() builder
│   │   ├── ddos.ts                 # network.ddos() builder
│   │   └── types.ts                # Network type definitions
│   │
│   ├── storage/
│   │   ├── index.ts                # Storage API exports
│   │   ├── define-storage.ts       # defineStorage() implementation
│   │   ├── account.ts              # storage.account() builder
│   │   ├── cosmos-db.ts            # storage.cosmosDb() builder
│   │   └── types.ts                # Storage type definitions
│   │
│   ├── compute/
│   │   ├── index.ts                # Compute API exports
│   │   ├── define-compute.ts       # defineCompute() implementation
│   │   ├── function-app.ts         # compute.functionApp() builder
│   │   └── types.ts                # Compute type definitions
│   │
│   ├── monitoring/
│   │   ├── index.ts                # Monitoring API exports
│   │   ├── define-monitoring.ts    # defineMonitoring() implementation
│   │   ├── app-insights.ts         # monitoring.appInsights() builder
│   │   ├── log-analytics.ts        # monitoring.logAnalytics() builder
│   │   ├── alerts.ts               # monitoring.alerts() builder
│   │   └── types.ts                # Monitoring type definitions
│   │
│   ├── performance/
│   │   ├── index.ts                # Performance API exports
│   │   ├── define-performance.ts   # definePerformance() implementation
│   │   ├── cdn.ts                  # performance.cdn() builder
│   │   ├── cache.ts                # performance.cache() builder
│   │   ├── rate-limit.ts           # performance.rateLimit() builder
│   │   └── types.ts                # Performance type definitions
│   │
│   ├── events/
│   │   ├── index.ts                # Events API exports
│   │   ├── define-events.ts        # defineEvents() implementation
│   │   ├── configure-event.ts      # configureEvent() builder
│   │   ├── queue-config.ts         # Queue configuration
│   │   ├── retry-policy.ts         # Retry policy builder
│   │   └── types.ts                # Event type definitions
│   │
│   ├── functions/
│   │   ├── index.ts                # Functions API exports
│   │   ├── define-functions.ts     # defineFunctions() implementation
│   │   ├── configure-function.ts   # configureFunction() builder
│   │   ├── bindings.ts             # Function bindings
│   │   └── types.ts                # Function type definitions
│   │
│   ├── context/
│   │   ├── index.ts                # Context API exports
│   │   ├── crud-context.ts         # Context for CRUD handlers
│   │   ├── event-context.ts        # Context for event processors
│   │   ├── function-context.ts     # Context for function handlers
│   │   ├── database-client.ts      # Database access layer
│   │   ├── storage-client.ts       # Storage access layer
│   │   ├── event-publisher.ts      # Event publishing
│   │   └── types.ts                # Context type definitions
│   │
│   ├── utils/
│   │   ├── index.ts                # Utility exports
│   │   ├── time.ts                 # Time helpers (minutes(), hours(), days())
│   │   ├── comparison.ts           # Comparison helpers (greaterThan(), etc.)
│   │   ├── validation.ts           # Validation utilities
│   │   ├── type-guards.ts          # Type guard functions
│   │   └── builder.ts              # Base builder class
│   │
│   └── types/
│       ├── index.ts                # Type exports
│       ├── schema.ts               # Schema type definitions
│       ├── infrastructure.ts       # Infrastructure type definitions
│       ├── context.ts              # Context type definitions
│       └── utility.ts              # Utility type definitions
│
├── package.json
├── tsconfig.json
├── README.md
└── CHANGELOG.md
```

### 2.2 Export Strategy

**Main entry point** (`src/index.ts`):

```typescript
// Schema API
export { defineSchema } from './schema/define-schema';
export { a } from './schema/field-types';
export { c } from './schema/crud-model';
export { e } from './schema/event-model';
export { f } from './schema/function-model';

// Backend API
export { defineBackend } from './backend/define-backend';

// Type exports
export type * from './types';
```

**Subpath exports** (in `package.json`):

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./auth": "./dist/auth/index.js",
    "./network": "./dist/network/index.js",
    "./storage": "./dist/storage/index.js",
    "./compute": "./dist/compute/index.js",
    "./monitoring": "./dist/monitoring/index.js",
    "./performance": "./dist/performance/index.js",
    "./events": "./dist/events/index.js",
    "./functions": "./dist/functions/index.js"
  },
  "typesVersions": {
    "*": {
      "auth": ["./dist/auth/index.d.ts"],
      "network": ["./dist/network/index.d.ts"],
      "storage": ["./dist/storage/index.d.ts"],
      "compute": ["./dist/compute/index.d.ts"],
      "monitoring": ["./dist/monitoring/index.d.ts"],
      "performance": ["./dist/performance/index.d.ts"],
      "events": ["./dist/events/index.d.ts"],
      "functions": ["./dist/functions/index.d.ts"]
    }
  }
}
```

**Benefits:**

- ✅ Clear separation of concerns
- ✅ Tree-shaking friendly
- ✅ IntelliSense works per domain
- ✅ Optional imports (only load what you need)

---

## 3. Core Abstractions

### 3.1 `defineSchema()` Implementation

**Purpose**: Define all data models in one place. Returns a schema object that can be used in `defineBackend()`.

**API Design**:

```typescript
export const schema = defineSchema({
  schema: a.schema({
    User: c.model({...}),
    DataUploaded: e.model({...}),
    GenerateReport: f.model({...}),
  })
});
```

**Implementation Approach**:

```typescript
// src/schema/define-schema.ts

import type { SchemaDefinition, SchemaObject } from './types';

export function defineSchema<T extends SchemaDefinition>(definition: T): SchemaObject<T> {
  // Validate schema structure
  validateSchemaDefinition(definition);

  // Process schema models
  const processedSchema = processSchemaModels(definition.schema);

  // Return schema object with metadata
  return {
    ...definition,
    _metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      models: extractModelNames(processedSchema),
    },
    _processedSchema: processedSchema,
  } as SchemaObject<T>;
}

function validateSchemaDefinition(definition: SchemaDefinition): void {
  if (!definition.schema) {
    throw new Error('Schema definition must include a "schema" property');
  }

  // Validate model names (PascalCase, unique)
  // Validate no reserved keywords
  // etc.
}

function processSchemaModels(schema: any): any {
  // Walk through all models
  // Validate field definitions
  // Build internal representation
  // Generate attachment points

  return processedModels;
}
```

**Key Features:**

- Schema validation at definition time
- Model name validation (PascalCase, uniqueness)
- Field type validation
- Metadata tracking for code generation
- Internal representation for synthesis

### 3.2 `defineAuth()` Implementation

**Purpose**: Configure authentication providers. Returns an auth object that can be used in `defineBackend()`.

**API Design**:

```typescript
export const authentication = defineAuth({
  Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!).clientId(process.env.AZURE_CLIENT_ID!),

  ApiKeys: auth.apiKeys().enable().rotateEvery(90),
});
```

**Implementation Approach**:

```typescript
// src/auth/define-auth.ts

import type { AuthDefinition, AuthObject } from './types';

export function defineAuth<T extends AuthDefinition>(definition: T): AuthObject<T> {
  // Validate auth providers
  validateAuthDefinition(definition);

  // Process auth configurations
  const processedAuth = processAuthProviders(definition);

  return {
    ...definition,
    _metadata: {
      providers: Object.keys(definition),
      primaryProvider: 'Primary' in definition ? 'Primary' : Object.keys(definition)[0],
    },
    _processedAuth: processedAuth,
  } as AuthObject<T>;
}
```

**Key Features:**

- Multiple provider support
- Primary provider designation
- Provider-specific validation
- Token validation configuration
- Role mapping support

### 3.3 `defineBackend()` Implementation

**Purpose**: Assemble backend from schema and auth. Provides attachment points for infrastructure customization.

**API Design**:

```typescript
export const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    environment: 'development',
    region: 'eastus',
  },
});

// Attachment points available
backend.network.primary.attach(networking.Primary);
backend.storage.database.attach(data.Database);
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
```

**Implementation Approach**:

```typescript
// src/backend/define-backend.ts

import type { BackendDefinition, BackendObject } from './types';
import { createAttachmentPoints } from './attach-points';
import { getDefaults } from './defaults';

export function defineBackend<TSchema extends SchemaObject<any>, TAuth extends AuthObject<any>>(
  definition: BackendDefinition<TSchema, TAuth>
): BackendObject<TSchema, TAuth> {
  const { schema, authentication, settings } = definition;

  // Validate required fields
  if (!schema) throw new Error('Schema is required');
  if (!authentication) throw new Error('Authentication is required');
  if (!settings?.name) throw new Error('Settings.name is required');

  // Get environment-aware defaults
  const defaults = getDefaults(settings.environment || 'development');

  // Create attachment points
  const attachPoints = createAttachmentPoints(schema, defaults);

  // Create backend object
  const backend: BackendObject<TSchema, TAuth> = {
    schema: schema._processedSchema,
    authentication: authentication._processedAuth,
    settings,

    // Infrastructure attachment points
    network: attachPoints.network,
    storage: attachPoints.storage,
    compute: attachPoints.compute,
    monitoring: attachPoints.monitoring,
    performance: attachPoints.performance,

    // Internal state
    _attachments: new Map(),
    _defaults: defaults,
    _metadata: {
      name: settings.name,
      environment: settings.environment || 'development',
      region: settings.region || 'eastus',
      createdAt: new Date().toISOString(),
    },
  };

  return backend;
}
```

**Key Features:**

- Validates required configuration
- Loads environment-aware defaults
- Creates type-safe attachment points
- Tracks attachments internally
- Provides metadata for synthesis

### 3.4 Field Types (`a.*`)

**Purpose**: Provide fluent API for defining field types with validation.

**API Design**:

```typescript
// String fields
email: a.string().required().email().maxLength(255);
name: a.string().required().minLength(2).maxLength(100);
url: a.string().url().required();

// Number fields
age: a.number().min(0).max(120).integer();
price: a.number().positive().required();

// Other types
isActive: a.boolean().default(true);
createdAt: a.datetime().required();
status: a.enum(['pending', 'active', 'archived']).default('pending');
tags: a.array(a.string()).default([]);
metadata: a.json().default({});
```

**Implementation Approach**:

```typescript
// src/schema/field-types.ts

class StringFieldBuilder {
  private config: StringFieldConfig = {
    type: 'string',
    validations: [],
  };

  required(): this {
    this.config.validations.push({ type: 'required' });
    return this;
  }

  email(): this {
    this.config.validations.push({
      type: 'pattern',
      pattern: EMAIL_REGEX,
      message: 'Must be a valid email address',
    });
    return this;
  }

  minLength(min: number): this {
    this.config.validations.push({
      type: 'minLength',
      value: min,
      message: `Must be at least ${min} characters`,
    });
    return this;
  }

  maxLength(max: number): this {
    this.config.validations.push({
      type: 'maxLength',
      value: max,
      message: `Must be at most ${max} characters`,
    });
    return this;
  }

  default(value: string): this {
    this.config.default = value;
    return this;
  }

  // Internal: build final config
  _build(): StringFieldConfig {
    return this.config;
  }
}

class NumberFieldBuilder {
  private config: NumberFieldConfig = {
    type: 'number',
    validations: [],
  };

  min(value: number): this {
    this.config.validations.push({
      type: 'min',
      value,
      message: `Must be at least ${value}`,
    });
    return this;
  }

  max(value: number): this {
    this.config.validations.push({
      type: 'max',
      value,
      message: `Must be at most ${value}`,
    });
    return this;
  }

  integer(): this {
    this.config.validations.push({
      type: 'integer',
      message: 'Must be an integer',
    });
    return this;
  }

  _build(): NumberFieldConfig {
    return this.config;
  }
}

// Export field type builders
export const a = {
  string: () => new StringFieldBuilder(),
  number: () => new NumberFieldBuilder(),
  boolean: () => new BooleanFieldBuilder(),
  datetime: () => new DatetimeFieldBuilder(),
  id: () => new IdFieldBuilder(),
  enum: <T extends string[]>(values: T) => new EnumFieldBuilder(values),
  array: <T>(itemType: FieldBuilder<T>) => new ArrayFieldBuilder(itemType),
  object: <T>(schema: T) => new ObjectFieldBuilder(schema),
  json: () => new JsonFieldBuilder(),
  binary: () => new BinaryFieldBuilder(),
  schema: <T>(models: T) => new SchemaBuilder(models),
};
```

**Key Features:**

- Fluent builder pattern
- Chainable validation methods
- Type inference from builders
- Default value support
- Custom validation rules

### 3.5 Model Types (`c.model`, `e.model`, `f.model`)

**Purpose**: Define different model types with specific infrastructure generation.

#### CRUD Model (`c.model`)

**API Design**:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
})
  .authorization((allow) => [allow.owner('id'), allow.groups(['admin']).all()])
  .indexes(['email'])
  .partitionKey('organizationId')
  .timestamps(true)
  .softDelete(true);
```

**Implementation**:

```typescript
// src/schema/crud-model.ts

class CrudModelBuilder<T> {
  private config: CrudModelConfig<T>;

  constructor(fields: T) {
    this.config = {
      type: 'crud',
      fields: processFields(fields),
      authorization: [],
      indexes: [],
      partitionKey: 'id',
      timestamps: false,
      softDelete: false,
    };
  }

  authorization(rules: AuthorizationRulesFn): this {
    this.config.authorization = rules(new AuthorizationBuilder());
    return this;
  }

  indexes(fields: string[]): this {
    this.config.indexes = fields;
    return this;
  }

  partitionKey(field: string): this {
    this.config.partitionKey = field;
    return this;
  }

  timestamps(enable: boolean): this {
    this.config.timestamps = enable;
    return this;
  }

  softDelete(enable: boolean): this {
    this.config.softDelete = enable;
    return this;
  }

  _build(): CrudModelConfig<T> {
    return this.config;
  }
}

export const c = {
  model: <T>(fields: T) => new CrudModelBuilder(fields),
};
```

#### Event Model (`e.model`)

**API Design**:

```typescript
DataUploaded: e.model({
  datasetId: a.string().required(),
  fileUrl: a.string().url().required(),
  uploadedAt: a.datetime().required(),
});
```

**Implementation**:

```typescript
// src/schema/event-model.ts

class EventModelBuilder<T> {
  private config: EventModelConfig<T>;

  constructor(fields: T) {
    this.config = {
      type: 'event',
      fields: processFields(fields),
    };
  }

  _build(): EventModelConfig<T> {
    return this.config;
  }
}

export const e = {
  model: <T>(fields: T) => new EventModelBuilder(fields),
};
```

#### Function Model (`f.model`)

**API Design**:

```typescript
GenerateReport: f.model({
  input: {
    datasetId: a.string().required(),
    format: a.enum(['pdf', 'excel']).default('pdf'),
  },
  output: {
    reportUrl: a.string().url().required(),
    status: a.enum(['generating', 'completed']).required(),
  },
}).authorization((allow) => [allow.authenticated()]);
```

**Implementation**:

```typescript
// src/schema/function-model.ts

class FunctionModelBuilder<TInput, TOutput> {
  private config: FunctionModelConfig<TInput, TOutput>;

  constructor(definition: { input: TInput; output: TOutput }) {
    this.config = {
      type: 'function',
      input: processFields(definition.input),
      output: processFields(definition.output),
      authorization: [],
    };
  }

  authorization(rules: AuthorizationRulesFn): this {
    this.config.authorization = rules(new AuthorizationBuilder());
    return this;
  }

  _build(): FunctionModelConfig<TInput, TOutput> {
    return this.config;
  }
}

export const f = {
  model: <TInput, TOutput>(definition: { input: TInput; output: TOutput }) =>
    new FunctionModelBuilder(definition),
};
```

---

## 4. Fluent API Implementation

### 4.1 Builder Pattern Implementation

**Core Pattern**: All configuration uses builder pattern for fluent API.

**Base Builder Class**:

```typescript
// src/utils/builder.ts

export abstract class Builder<TConfig> {
  protected config: TConfig;

  constructor(initialConfig: Partial<TConfig>) {
    this.config = initialConfig as TConfig;
  }

  /**
   * Conditional configuration
   */
  when(condition: boolean, fn: (builder: this) => this): this {
    if (condition) {
      return fn(this);
    }
    return this;
  }

  /**
   * Build final configuration (internal use)
   */
  abstract _build(): TConfig;
}
```

**Example Builder Implementation**:

```typescript
// src/storage/cosmos-db.ts

import { Builder } from '../utils/builder';

class CosmosDbBuilder extends Builder<CosmosDbConfig> {
  constructor() {
    super({
      type: 'cosmosdb',
      mode: 'Serverless',
      consistency: 'Session',
    });
  }

  name(value: string): this {
    this.config.name = value;
    return this;
  }

  mode(value: 'Serverless' | 'Provisioned' | 'Autoscale'): this {
    this.config.mode = value;
    return this;
  }

  consistency(value: 'Strong' | 'Session' | 'Eventual'): this {
    this.config.consistency = value;
    return this;
  }

  backup(fn: (builder: BackupBuilder) => BackupBuilder): this {
    const backupBuilder = new BackupBuilder();
    this.config.backup = fn(backupBuilder)._build();
    return this;
  }

  multiRegion(regions: string[]): this {
    this.config.multiRegion = regions;
    return this;
  }

  _build(): CosmosDbConfig {
    // Validate configuration
    validateCosmosDbConfig(this.config);
    return this.config;
  }
}

export const cosmosDb = () => new CosmosDbBuilder();
```

### 4.2 Method Chaining Approach

**Principles:**

- Every method returns `this` for chaining
- Order doesn't matter (idempotent)
- Last value wins for duplicates
- Nested builders for complex configuration

**Example**:

```typescript
storage
  .cosmosDb()
  .name('my-db') // Simple property
  .mode('Autoscale') // Simple property
  .consistency('Session') // Simple property
  .backup(
    (
      backup // Nested builder
    ) => backup.enable(true).type('Continuous').retain(30)
  )
  .when(
    isProd,
    (
      db // Conditional
    ) => db.multiRegion(['eastus', 'westus'])
  );
```

### 4.3 Type Inference Strategy

**Goal**: Infer types from builder usage without explicit type annotations.

**Approach**:

```typescript
// Type inference from field builders
const emailField = a.string().required().email();
type EmailFieldType = ReturnType<typeof emailField._build>;
// → { type: 'string', validations: [...], ... }

// Type inference from model builders
const UserModel = c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
});
type UserType = InferModelType<typeof UserModel>;
// → { id: string, email: string, name: string }

// Type inference for create input (omits auto-generated fields)
type CreateUserInput = InferCreateInput<typeof UserModel>;
// → { email: string, name: string }

// Type inference for update input (all fields optional)
type UpdateUserInput = InferUpdateInput<typeof UserModel>;
// → { email?: string, name?: string }
```

**Implementation**:

```typescript
// src/types/schema.ts

export type InferModelType<T> = T extends CrudModelBuilder<infer F> ? InferFieldTypes<F> : never;

export type InferCreateInput<T> =
  T extends CrudModelBuilder<infer F>
    ? Omit<InferFieldTypes<F>, 'id' | 'createdAt' | 'updatedAt'>
    : never;

export type InferUpdateInput<T> = Partial<InferCreateInput<T>>;

type InferFieldTypes<T> = {
  [K in keyof T]: T[K] extends StringFieldBuilder
    ? string
    : T[K] extends NumberFieldBuilder
      ? number
      : T[K] extends BooleanFieldBuilder
        ? boolean
        : T[K] extends DatetimeFieldBuilder
          ? string // ISO 8601
          : T[K] extends EnumFieldBuilder<infer E>
            ? E[number]
            : T[K] extends ArrayFieldBuilder<infer I>
              ? InferFieldType<I>[]
              : T[K] extends ObjectFieldBuilder<infer S>
                ? InferFieldTypes<S>
                : unknown;
};
```

### 4.4 Named Instances Pattern

**Pattern**: Use named instances for clarity and reusability.

**Example**:

```typescript
// Named auth providers
export const authentication = defineAuth({
  Primary: auth.entra()....,      // Named: "Primary"
  ApiKeys: auth.apiKeys()...,     // Named: "ApiKeys"
});

// Named network configs
export const networking = defineNetwork({
  Primary: network.vnet()...,     // Named: "Primary"
  Firewall: network.waf()...,     // Named: "Firewall"
  DDoS: network.ddos()...,        // Named: "DDoS"
});

// Named event configs
export const event = defineEvents({
  DataUploaded: configureEvent('DataUploaded')...,
  DataValidated: configureEvent('DataValidated')...,
});
```

**Benefits:**

- ✅ Clear reference in attachments
- ✅ Multiple instances of same type
- ✅ Easy to identify in deployment
- ✅ Better error messages

---

## 5. Attach Pattern Implementation

### 5.1 How `.attach()` Works Internally

**Core Concept**: Attachment points are pre-created on backend object, typed to accept specific configurations.

**Implementation**:

```typescript
// src/backend/attach-points.ts

export interface AttachmentPoint<TConfig> {
  attach(config: TConfig): void;
  getConfig(): TConfig | undefined;
  hasAttachment(): boolean;
}

class AttachmentPointImpl<TConfig> implements AttachmentPoint<TConfig> {
  private config?: TConfig;
  private readonly defaultConfig: TConfig;

  constructor(defaultConfig: TConfig) {
    this.defaultConfig = defaultConfig;
  }

  attach(config: TConfig): void {
    // Validate config type
    if (!isValidConfig(config)) {
      throw new Error('Invalid configuration type');
    }

    // Store attached config
    this.config = config;
  }

  getConfig(): TConfig | undefined {
    return this.config ?? this.defaultConfig;
  }

  hasAttachment(): boolean {
    return this.config !== undefined;
  }
}

export function createAttachmentPoints<TSchema>(
  schema: TSchema,
  defaults: DefaultConfigs
): AttachmentPoints<TSchema> {
  return {
    network: {
      primary: new AttachmentPointImpl(defaults.network.primary),
      firewall: new AttachmentPointImpl(defaults.network.firewall),
      ddos: new AttachmentPointImpl(defaults.network.ddos),
    },
    storage: {
      blobs: new AttachmentPointImpl(defaults.storage.blobs),
      database: new AttachmentPointImpl(defaults.storage.database),
    },
    compute: {
      functionApp: new AttachmentPointImpl(defaults.compute.functionApp),
    },
    monitoring: {
      insights: new AttachmentPointImpl(defaults.monitoring.insights),
      logs: new AttachmentPointImpl(defaults.monitoring.logs),
      alerts: new AttachmentPointImpl(defaults.monitoring.alerts),
    },
    performance: {
      cdn: new AttachmentPointImpl(defaults.performance.cdn),
      cache: new AttachmentPointImpl(defaults.performance.cache),
      rateLimit: new AttachmentPointImpl(defaults.performance.rateLimit),
    },
    // Schema-specific attachment points created dynamically
    schema: createSchemaAttachmentPoints(schema, defaults),
  };
}
```

### 5.2 Type-Safe Attachment Points

**Goal**: TypeScript prevents attaching wrong configuration types.

**Type System**:

```typescript
// src/backend/types.ts

export interface BackendObject<TSchema, TAuth> {
  schema: ProcessedSchema<TSchema>;
  authentication: ProcessedAuth<TAuth>;
  settings: BackendSettings;

  // Infrastructure attachments
  network: {
    primary: AttachmentPoint<NetworkVNetConfig>;
    firewall: AttachmentPoint<NetworkWAFConfig>;
    ddos: AttachmentPoint<NetworkDDoSConfig>;
  };

  storage: {
    blobs: AttachmentPoint<StorageAccountConfig>;
    database: AttachmentPoint<CosmosDbConfig>;
  };

  compute: {
    functionApp: AttachmentPoint<FunctionAppConfig>;
  };

  monitoring: {
    insights: AttachmentPoint<AppInsightsConfig>;
    logs: AttachmentPoint<LogAnalyticsConfig>;
    alerts: AttachmentPoint<AlertsConfig>;
  };

  performance: {
    cdn: AttachmentPoint<CDNConfig>;
    cache: AttachmentPoint<RedisCacheConfig>;
    rateLimit: AttachmentPoint<RateLimitConfig>;
  };
}

// Type-safe attachment
backend.storage.database.attach(data.Database); // ✅ Correct
backend.storage.database.attach(performance.Cache); // ❌ Type error
```

### 5.3 Default vs Custom Infrastructure

**Strategy**: Every attachment point has a default configuration. Attachments override defaults.

**Default Configuration Loading**:

```typescript
// src/backend/defaults.ts

export function getDefaults(environment: string): DefaultConfigs {
  const isProd = environment === 'production';

  return {
    network: {
      primary: {
        type: 'vnet',
        addressSpace: '10.0.0.0/16',
        subnets: [{ name: 'default', addressPrefix: '10.0.1.0/24' }],
        cors: {
          allowOrigins: isProd ? [] : ['*'],
          allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
      },
      firewall: null, // Only enabled if attached
      ddos: null, // Only enabled if attached
    },

    storage: {
      blobs: {
        type: 'storage-account',
        sku: isProd ? 'Standard_GRS' : 'Standard_LRS',
        tier: 'Standard',
        containers: [],
      },
      database: {
        type: 'cosmosdb',
        mode: isProd ? 'Autoscale' : 'Serverless',
        consistency: 'Session',
        backup: isProd ? { enabled: true, type: 'Continuous' } : { enabled: false },
        multiRegion: isProd ? ['eastus', 'westus'] : undefined,
      },
    },

    compute: {
      functionApp: {
        type: 'function-app',
        plan: isProd ? 'Premium' : 'Consumption',
        runtime: 'node',
        runtimeVersion: '20',
        alwaysOn: isProd,
        scaling: {
          min: isProd ? 2 : 0,
          max: isProd ? 20 : 10,
        },
      },
    },

    monitoring: {
      insights: {
        type: 'app-insights',
        samplingPercentage: isProd ? 100 : 10,
        retentionDays: isProd ? 90 : 30,
      },
      logs: null, // Only if attached
      alerts: null, // Only if attached
    },

    performance: {
      cdn: null, // Only if attached
      cache: null, // Only if attached
      rateLimit: null, // Only if attached
    },
  };
}
```

### 5.4 Progressive Enhancement Mechanism

**Pattern**: Start minimal, add only what you need.

**Example Flow**:

```typescript
// Week 1: Start with defaults
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});
// Uses all defaults

// Week 2: Need production database
backend.storage.database.attach(
  storage.cosmosDb().mode('Autoscale').multiRegion(['eastus', 'westus'])
);
// Only database config attached, rest still defaults

// Week 3: Add caching
backend.performance.cache.attach(performance.redis().sku('Standard').capacity(1));
// Database + cache attached, rest still defaults

// Week 4: Add WAF
backend.network.firewall.attach(network.waf().mode('Prevention').ruleSet('OWASP_3.2'));
// Database + cache + firewall attached
```

**Detection at Synthesis Time**:

```typescript
// During ARM template generation
function generateResources(backend: BackendObject): AzureResource[] {
  const resources: AzureResource[] = [];

  // Always provision core resources
  resources.push(generateFunctionApp(backend.compute.functionApp.getConfig()));
  resources.push(generateCosmosDb(backend.storage.database.getConfig()));
  resources.push(generateStorageAccount(backend.storage.blobs.getConfig()));

  // Conditionally provision based on attachments
  if (backend.network.firewall.hasAttachment()) {
    resources.push(generateWAF(backend.network.firewall.getConfig()));
  }

  if (backend.performance.cache.hasAttachment()) {
    resources.push(generateRedis(backend.performance.cache.getConfig()));
  }

  // ... etc

  return resources;
}
```

---

## 6. Infrastructure Defaults

### 6.1 How Defaults Are Determined Based on NODE_ENV

**Strategy**: Environment variable `NODE_ENV` drives default configuration choices.

**Environment Types**:

- `development` - Local development, minimal resources, low cost
- `staging` - Pre-production testing, moderate resources
- `production` - Full production, high availability, performance

**Configuration Matrix**:

| Resource              | Development  | Production                  |
| --------------------- | ------------ | --------------------------- |
| **Cosmos DB**         | Serverless   | Autoscale (400-4000 RU/s)   |
| **Function App**      | Consumption  | Premium (EP1, 2+ instances) |
| **Storage**           | Standard LRS | Standard GRS                |
| **App Insights**      | 10% sampling | 100% sampling               |
| **Backup**            | None         | Continuous (30 days)        |
| **Multi-Region**      | No           | Yes (2+ regions)            |
| **VNet Integration**  | No           | Yes                         |
| **Private Endpoints** | No           | Yes                         |

### 6.2 Default Configuration Objects

**Implementation**:

```typescript
// src/backend/defaults/development.ts

export const developmentDefaults: DefaultConfigs = {
  network: {
    primary: {
      type: 'vnet',
      cors: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      },
      tls: {
        minVersion: '1.2',
        requireHttps: true,
      },
    },
    firewall: null,
    ddos: null,
  },

  storage: {
    database: {
      type: 'cosmosdb',
      mode: 'Serverless',
      consistency: 'Session',
      backup: { enabled: false },
      freeTier: true,
    },
    blobs: {
      type: 'storage-account',
      sku: 'Standard_LRS',
      tier: 'Standard',
      publicAccess: false,
      softDelete: { enabled: true, retainDays: 7 },
    },
  },

  compute: {
    functionApp: {
      type: 'function-app',
      plan: 'Consumption',
      runtime: 'node',
      runtimeVersion: '20',
      alwaysOn: false,
      scaling: {
        min: 0,
        max: 10,
      },
    },
  },

  monitoring: {
    insights: {
      type: 'app-insights',
      samplingPercentage: 10,
      retentionDays: 30,
    },
    logs: null,
    alerts: null,
  },

  performance: {
    cdn: null,
    cache: null,
    rateLimit: {
      enabled: false,
    },
  },
};
```

```typescript
// src/backend/defaults/production.ts

export const productionDefaults: DefaultConfigs = {
  network: {
    primary: {
      type: 'vnet',
      addressSpace: '10.0.0.0/16',
      subnets: [
        { name: 'function-subnet', addressPrefix: '10.0.1.0/24' },
        { name: 'private-endpoint-subnet', addressPrefix: '10.0.2.0/24' },
      ],
      cors: {
        allowOrigins: [], // Must be explicitly configured
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      },
      tls: {
        minVersion: '1.2',
        requireHttps: true,
        hsts: 31536000, // 1 year
      },
      privateLink: {
        enabled: true,
        services: ['functionApp', 'storage', 'cosmosdb'],
      },
    },
    firewall: null, // Attach if needed
    ddos: {
      enabled: true,
      mode: 'VirtualNetworkInherited',
    },
  },

  storage: {
    database: {
      type: 'cosmosdb',
      mode: 'Autoscale',
      throughput: { min: 400, max: 4000 },
      consistency: 'Session',
      backup: {
        enabled: true,
        type: 'Continuous',
        tier: 'Continuous7Days',
      },
      multiRegion: {
        locations: [
          { name: 'East US', priority: 0 },
          { name: 'West US', priority: 1 },
        ],
        automaticFailover: true,
      },
      encryption: {
        keySource: 'Microsoft.KeyVault',
      },
      analyticalStorage: {
        enabled: true,
        schema: 'WellDefined',
      },
    },
    blobs: {
      type: 'storage-account',
      sku: 'Standard_GRS',
      tier: 'Standard',
      publicAccess: false,
      softDelete: { enabled: true, retainDays: 30 },
      versioning: { enabled: true },
      changeFeed: { enabled: true, retainDays: 90 },
      encryption: {
        keySource: 'Microsoft.KeyVault',
        requireInfrastructureEncryption: true,
      },
    },
  },

  compute: {
    functionApp: {
      type: 'function-app',
      plan: 'Premium',
      sku: 'EP1',
      runtime: 'node',
      runtimeVersion: '20',
      alwaysOn: true,
      scaling: {
        min: 2,
        max: 20,
        rules: [
          {
            name: 'cpu-scale',
            metric: 'CpuPercentage',
            threshold: 70,
            scaleBy: 2,
          },
          {
            name: 'memory-scale',
            metric: 'MemoryPercentage',
            threshold: 80,
            scaleBy: 2,
          },
        ],
      },
      vnet: {
        enabled: true,
        routeAll: true,
      },
      healthCheck: {
        enabled: true,
        path: '/api/health',
        interval: 30,
      },
      deployment: {
        slots: ['staging'],
        runFromPackage: true,
      },
    },
  },

  monitoring: {
    insights: {
      type: 'app-insights',
      samplingPercentage: 100,
      retentionDays: 90,
    },
    logs: {
      type: 'log-analytics',
      retentionDays: 90,
    },
    alerts: {
      actionGroups: [
        {
          name: 'critical-alerts',
          email: ['oncall@company.com'],
          sms: ['+1-555-0100'],
        },
      ],
    },
  },

  performance: {
    cdn: null, // Attach if needed
    cache: null, // Attach if needed
    rateLimit: {
      enabled: true,
      perIp: { limit: 1000, window: 'hour' },
      global: { limit: 100000, window: 'hour' },
    },
  },
};
```

### 6.3 Override Mechanism

**Pattern**: Attachments merge with defaults, with attachments taking precedence.

**Merge Strategy**:

```typescript
// src/backend/config-merger.ts

export function mergeConfigs<T extends Record<string, any>>(
  defaultConfig: T,
  attachedConfig: T | null
): T {
  if (!attachedConfig) {
    return defaultConfig;
  }

  // Deep merge: attached values override defaults
  return deepMerge(defaultConfig, attachedConfig);
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      // Recursively merge objects
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      // Override with source value
      result[key] = sourceValue;
    }
  }

  return result;
}
```

**Example**:

```typescript
// Default config
const defaultDb = {
  mode: 'Serverless',
  consistency: 'Session',
  backup: { enabled: false },
};

// Attached config (partial override)
const attachedDb = storage
  .cosmosDb()
  .mode('Autoscale')
  .backup((b) => b.enable(true))
  ._build();

// Merged result
const finalConfig = mergeConfigs(defaultDb, attachedDb);
// → {
//     mode: 'Autoscale',        // Overridden
//     consistency: 'Session',   // From default
//     backup: { enabled: true } // Overridden
//   }
```

---

## 7. Type Generation

### 7.1 How to Infer Types from Schema

**Goal**: Auto-generate TypeScript types from schema definitions without manual duplication.

**Type Inference Helpers**:

```typescript
// src/types/schema.ts

/**
 * Infer full model type from schema
 */
export type InferModelType<T> =
  T extends CrudModelBuilder<infer Fields>
    ? InferFieldTypes<Fields> & {
        id: string;
        createdAt?: string;
        updatedAt?: string;
      }
    : never;

/**
 * Infer create input type (omits auto-generated fields)
 */
export type InferCreateInput<T> =
  T extends CrudModelBuilder<infer Fields>
    ? Omit<InferFieldTypes<Fields>, 'id' | 'createdAt' | 'updatedAt'>
    : never;

/**
 * Infer update input type (all fields optional)
 */
export type InferUpdateInput<T> =
  T extends CrudModelBuilder<infer Fields> ? Partial<InferCreateInput<T>> : never;

/**
 * Infer filter type for list queries
 */
export type InferFilterType<T> =
  T extends CrudModelBuilder<infer Fields>
    ? {
        [K in keyof InferFieldTypes<Fields>]?:
          | InferFieldTypes<Fields>[K]
          | {
              eq?: InferFieldTypes<Fields>[K];
              ne?: InferFieldTypes<Fields>[K];
              gt?: InferFieldTypes<Fields>[K];
              gte?: InferFieldTypes<Fields>[K];
              lt?: InferFieldTypes<Fields>[K];
              lte?: InferFieldTypes<Fields>[K];
              in?: InferFieldTypes<Fields>[K][];
              contains?: string; // For strings
            };
      }
    : never;

/**
 * Infer event type
 */
export type InferEventType<T> =
  T extends EventModelBuilder<infer Fields> ? InferFieldTypes<Fields> : never;

/**
 * Infer function input type
 */
export type InferFunctionInput<T> =
  T extends FunctionModelBuilder<infer Input, any> ? InferFieldTypes<Input> : never;

/**
 * Infer function output type
 */
export type InferFunctionOutput<T> =
  T extends FunctionModelBuilder<any, infer Output> ? InferFieldTypes<Output> : never;

/**
 * Infer types from field builders
 */
type InferFieldTypes<T> = {
  [K in keyof T]: InferFieldType<T[K]>;
};

type InferFieldType<T> = T extends StringFieldBuilder
  ? string
  : T extends NumberFieldBuilder
    ? number
    : T extends BooleanFieldBuilder
      ? boolean
      : T extends DatetimeFieldBuilder
        ? string
        : T extends IdFieldBuilder
          ? string
          : T extends EnumFieldBuilder<infer Values>
            ? Values[number]
            : T extends ArrayFieldBuilder<infer Item>
              ? InferFieldType<Item>[]
              : T extends ObjectFieldBuilder<infer Schema>
                ? InferFieldTypes<Schema>
                : T extends JsonFieldBuilder
                  ? any
                  : T extends BinaryFieldBuilder
                    ? Buffer
                    : unknown;
```

### 7.2 TypeScript Utility Types Needed

**Core Utilities**:

```typescript
// src/types/utility.ts

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep partial
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Deep readonly
 */
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

/**
 * Extract keys of specific type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Nullable
 */
export type Nullable<T> = T | null;

/**
 * Maybe (null or undefined)
 */
export type Maybe<T> = T | null | undefined;

/**
 * Expand type for better IntelliSense display
 */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

/**
 * Function type helpers
 */
export type AsyncFunction<TArgs extends any[], TReturn> = (...args: TArgs) => Promise<TReturn>;

export type SyncOrAsyncFunction<TArgs extends any[], TReturn> = (
  ...args: TArgs
) => TReturn | Promise<TReturn>;
```

**Schema-Specific Utilities**:

```typescript
// src/types/schema.ts

/**
 * Extract CRUD models from schema
 */
export type ExtractCrudModels<T> = {
  [K in keyof T]: T[K] extends CrudModelBuilder<any> ? K : never;
}[keyof T];

/**
 * Extract event models from schema
 */
export type ExtractEventModels<T> = {
  [K in keyof T]: T[K] extends EventModelBuilder<any> ? K : never;
}[keyof T];

/**
 * Extract function models from schema
 */
export type ExtractFunctionModels<T> = {
  [K in keyof T]: T[K] extends FunctionModelBuilder<any, any> ? K : never;
}[keyof T];

/**
 * Schema model map
 */
export type SchemaModelMap<T> = {
  crud: Pick<T, ExtractCrudModels<T>>;
  events: Pick<T, ExtractEventModels<T>>;
  functions: Pick<T, ExtractFunctionModels<T>>;
};
```

### 7.3 Usage Examples

**In User Code**:

```typescript
// Define schema
export const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
      name: a.string().required(),
      role: a.enum(['user', 'admin']).default('user'),
    }),

    DataUploaded: e.model({
      datasetId: a.string().required(),
      fileUrl: a.string().url().required(),
    }),

    GenerateReport: f.model({
      input: {
        datasetId: a.string().required(),
      },
      output: {
        reportUrl: a.string().url().required(),
      },
    }),
  }),
});

// Auto-generated types (no manual type definitions!)
type User = InferModelType<typeof schema._processedSchema.User>;
// → { id: string, email: string, name: string, role: 'user' | 'admin', createdAt?: string, updatedAt?: string }

type CreateUserInput = InferCreateInput<typeof schema._processedSchema.User>;
// → { email: string, name: string, role?: 'user' | 'admin' }

type UpdateUserInput = InferUpdateInput<typeof schema._processedSchema.User>;
// → { email?: string, name?: string, role?: 'user' | 'admin' }

type UserFilter = InferFilterType<typeof schema._processedSchema.User>;
// → { email?: string | { eq?: string, contains?: string, ... }, ... }

type DataUploadedEvent = InferEventType<typeof schema._processedSchema.DataUploaded>;
// → { datasetId: string, fileUrl: string }

type GenerateReportInput = InferFunctionInput<typeof schema._processedSchema.GenerateReport>;
// → { datasetId: string }

type GenerateReportOutput = InferFunctionOutput<typeof schema._processedSchema.GenerateReport>;
// → { reportUrl: string }
```

**Exported from Backend**:

```typescript
// src/index.ts
export const backend = defineBackend({ schema, authentication, settings });

// Export types directly
export type User = InferModelType<typeof backend.schema.User>;
export type CreateUserInput = InferCreateInput<typeof backend.schema.User>;
export type UpdateUserInput = InferUpdateInput<typeof backend.schema.User>;
// ... etc for all models
```

---

## 8. Context API

The context object is passed to all handlers (CRUD, event processors, function handlers) and provides access to infrastructure, services, and user context.

### 8.1 Structure of Context Object

**Base Context** (common to all handler types):

```typescript
// src/context/types.ts

export interface BaseContext {
  // User context (from authentication)
  user: {
    id: string;
    email: string;
    roles: string[];
    hasRole(role: string): boolean;
    isAuthenticated: boolean;
  };

  // Request metadata
  requestId: string;
  timestamp: string;
  ip: string;
  userAgent: string;

  // Logging
  log: Logger;

  // Secrets (from Key Vault)
  secrets: SecretsClient;

  // Utilities
  utils: {
    generateId(prefix?: string): string;
  };

  // Execution metadata
  executionTime: number; // milliseconds since handler started
}

export interface Logger {
  (message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  debug(message: string, data?: any): void;
}
```

**CRUD Context** (for CRUD operation handlers):

```typescript
export interface CrudContext extends BaseContext {
  // Database access
  db: DatabaseClient;

  // Storage access
  storage: StorageClient;

  // Event publishing
  events: EventPublisher;

  // Cache access
  cache?: CacheClient;

  // HTTP client
  http: HttpClient;

  // Audit logging
  audit: AuditLogger;
}
```

**Event Context** (for event processors):

```typescript
export interface EventContext extends BaseContext {
  // Database access
  database: DatabaseClient;

  // Storage access
  storage: StorageClient;

  // Event publishing
  events: EventPublisher;

  // External services
  services: {
    email: EmailService;
    sms: SmsService;
    push: PushNotificationService;
    http: HttpClient;
  };

  // Metrics
  metrics: MetricsClient;

  // Audit logging
  audit: AuditLogger;
}
```

**Function Context** (for custom function handlers):

```typescript
export interface FunctionContext extends BaseContext {
  // Database access
  database: DatabaseClient;

  // Storage access
  storage: StorageClient;

  // Event publishing
  publish: EventPublisher;

  // Cache access
  cache?: CacheClient;

  // HTTP client
  http: HttpClient;

  // External services (custom per function)
  services: Record<string, any>;

  // Audit logging
  audit: AuditLogger;
}
```

### 8.2 Database Access Layer

**API Design**:

```typescript
// src/context/database-client.ts

export interface DatabaseClient {
  // Access all CRUD models
  [modelName: string]: ModelClient<any>;

  // Example: context.db.users, context.db.projects, etc.
}

export interface ModelClient<T> {
  // Create
  create(data: CreateInput<T>): Promise<T>;

  // Read
  get(id: string): Promise<T | null>;
  find(filter: Filter<T>): Promise<T | null>;

  // Update
  update(id: string, data: UpdateInput<T>): Promise<T>;

  // Delete
  delete(id: string): Promise<void>;

  // List
  list(options?: ListOptions<T>): Promise<{
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>;

  // Count
  count(filter?: Filter<T>): Promise<number>;

  // Batch operations
  batchCreate(items: CreateInput<T>[]): Promise<T[]>;
  batchUpdate(updates: Array<{ id: string; data: UpdateInput<T> }>): Promise<T[]>;
  batchDelete(ids: string[]): Promise<void>;

  // Transactions (if supported by Cosmos DB)
  transaction<R>(fn: (tx: TransactionClient<T>) => Promise<R>): Promise<R>;
}

export interface ListOptions<T> {
  // Filtering
  filter?: Filter<T>;

  // Pagination
  page?: number;
  pageSize?: number;

  // Sorting
  sortBy?: keyof T;
  sortOrder?: 'asc' | 'desc';

  // Field selection
  select?: (keyof T)[];

  // Authorization context
  user?: UserContext;
}

export type Filter<T> = {
  [K in keyof T]?: T[K] | FilterOperators<T[K]>;
};

export interface FilterOperators<T> {
  eq?: T;
  ne?: T;
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;
  in?: T[];
  nin?: T[];
  contains?: string; // For strings
  startsWith?: string; // For strings
  endsWith?: string; // For strings
}
```

**Usage Example**:

```typescript
.withProcessor(async (context, event) => {
  // Get single item
  const user = await context.database.users.get(event.userId);

  // Find by filter
  const admin = await context.database.users.find({
    email: event.email,
    role: 'admin',
  });

  // Update
  await context.database.datasets.update(event.datasetId, {
    status: 'processing',
    processedAt: new Date().toISOString(),
  });

  // List with pagination
  const projects = await context.database.projects.list({
    filter: { ownerId: user.id, status: 'active' },
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Count
  const totalDatasets = await context.database.datasets.count({
    projectId: event.projectId,
  });
})
```

### 8.3 Storage Access Layer

**API Design**:

```typescript
// src/context/storage-client.ts

export interface StorageClient {
  // Blob storage operations
  blobs: BlobStorageClient;

  // File share operations (if configured)
  files?: FileShareClient;
}

export interface BlobStorageClient {
  // Upload
  upload(
    container: string,
    path: string,
    content: Buffer | string,
    options?: UploadOptions
  ): Promise<string>; // Returns URL

  // Download
  download(container: string, path: string): Promise<Buffer>;
  downloadAsString(container: string, path: string): Promise<string>;

  // Exists
  exists(container: string, path: string): Promise<boolean>;

  // Delete
  delete(container: string, path: string): Promise<void>;

  // List
  list(container: string, prefix?: string): Promise<BlobInfo[]>;

  // Generate SAS URL
  generateSasUrl(container: string, path: string, options: SasOptions): Promise<string>;

  // Copy
  copy(
    sourceContainer: string,
    sourcePath: string,
    destContainer: string,
    destPath: string
  ): Promise<void>;

  // Move
  move(
    sourceContainer: string,
    sourcePath: string,
    destContainer: string,
    destPath: string
  ): Promise<void>;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  tags?: Record<string, string>;
}

export interface SasOptions {
  permissions: 'r' | 'w' | 'rw';
  expiresIn: number; // seconds
}

export interface BlobInfo {
  name: string;
  size: number;
  contentType: string;
  lastModified: string;
  etag: string;
  metadata: Record<string, string>;
}
```

**Usage Example**:

```typescript
.withHandler(async (context, input) => {
  // Upload file
  const reportUrl = await context.storage.blobs.upload(
    'reports',
    `${reportId}.pdf`,
    pdfBuffer,
    {
      contentType: 'application/pdf',
      metadata: {
        datasetId: input.datasetId,
        generatedBy: context.user.id,
      },
    }
  );

  // Download file
  const csvData = await context.storage.blobs.downloadAsString(
    'datasets',
    `${datasetId}.csv`
  );

  // Check if exists
  const exists = await context.storage.blobs.exists('uploads', 'file.csv');

  // Generate temporary download URL
  const downloadUrl = await context.storage.blobs.generateSasUrl(
    'reports',
    `${reportId}.pdf`,
    {
      permissions: 'r',
      expiresIn: 3600, // 1 hour
    }
  );
})
```

### 8.4 Event Publishing

**API Design**:

```typescript
// src/context/event-publisher.ts

export interface EventPublisher {
  // Publish event
  publish<TEvent>(eventName: string, event: TEvent): Promise<{ eventId: string; queuedAt: string }>;

  // Publish multiple events
  publishBatch<TEvent>(
    eventName: string,
    events: TEvent[]
  ): Promise<Array<{ eventId: string; queuedAt: string }>>;

  // Schedule event for future
  schedule<TEvent>(
    eventName: string,
    event: TEvent,
    scheduledFor: Date
  ): Promise<{ eventId: string; scheduledFor: string }>;
}
```

**Usage Example**:

```typescript
.withProcessor(async (context, event) => {
  // Publish follow-up event
  await context.events.publish('DataValidated', {
    datasetId: event.datasetId,
    isValid: true,
    rowCount: 1000,
    validationErrors: [],
    warnings: [],
    validatedAt: new Date().toISOString(),
  });

  // Publish notification
  await context.events.publish('NotificationRequested', {
    userId: event.userId,
    type: 'email',
    subject: 'Data Upload Complete',
    body: 'Your dataset has been uploaded successfully.',
    priority: 'normal',
  });

  // Schedule cleanup event
  const cleanupDate = new Date();
  cleanupDate.setDate(cleanupDate.getDate() + 7);

  await context.events.schedule('DatasetCleanup', {
    datasetId: event.datasetId,
  }, cleanupDate);
})
```

### 8.5 User Context

**API Design**:

```typescript
// src/context/user-context.ts

export interface UserContext {
  // Basic user info
  id: string;
  email: string;
  name?: string;

  // Roles from auth token
  roles: string[];
  groups: string[];

  // Helper methods
  hasRole(role: string): boolean;
  hasAnyRole(roles: string[]): boolean;
  hasAllRoles(roles: string[]): boolean;
  isInGroup(group: string): boolean;

  // Authentication status
  isAuthenticated: boolean;

  // Token info
  tokenIssuedAt: string;
  tokenExpiresAt: string;

  // Custom claims (from auth provider)
  claims: Record<string, any>;
}
```

**Usage Example**:

```typescript
.withHandler(async (context, input) => {
  // Check authentication
  if (!context.user.isAuthenticated) {
    throw new UnauthorizedError('Authentication required');
  }

  // Check roles
  if (!context.user.hasRole('admin')) {
    throw new ForbiddenError('Admin role required');
  }

  // Get user info
  const userId = context.user.id;
  const userEmail = context.user.email;

  // Check multiple roles
  const canEdit = context.user.hasAnyRole(['admin', 'editor']);

  // Access custom claims
  const organizationId = context.user.claims.organizationId;
})
```

---

## 9. Implementation Phases

Break the implementation into manageable phases with clear deliverables.

### Phase 1: Core Schema System (Weeks 1-2)

**Goal**: Implement field types and model builders.

**Deliverables**:

- ✅ Field type builders (`a.string()`, `a.number()`, etc.)
- ✅ Validation logic for field types
- ✅ Schema builder (`a.schema()`)
- ✅ Basic type inference utilities
- ✅ Unit tests for field types

**Implementation Order**:

1. Base builder class
2. Primitive field types (string, number, boolean, datetime, id)
3. Complex field types (enum, array, object, json, binary)
4. Validation logic
5. Schema builder
6. Type inference helpers

**Success Criteria**:

- Can define fields with all validation options
- Type inference works correctly
- Validation errors are clear and helpful

### Phase 2: Model Builders (Weeks 3-4)

**Goal**: Implement CRUD, event, and function model builders.

**Deliverables**:

- ✅ CRUD model builder (`c.model()`)
- ✅ Event model builder (`e.model()`)
- ✅ Function model builder (`f.model()`)
- ✅ Authorization builder
- ✅ Model-level configuration options
- ✅ Type inference for models

**Implementation Order**:

1. CRUD model builder with authorization
2. Event model builder
3. Function model builder
4. Authorization rule builder
5. Model configuration options (indexes, partition key, etc.)
6. Type inference for all model types

**Success Criteria**:

- Can define all three model types
- Authorization rules work correctly
- Type inference generates correct types
- Model configuration options apply correctly

### Phase 3: Authentication System (Week 5)

**Goal**: Implement authentication builders and providers.

**Deliverables**:

- ✅ `defineAuth()` function
- ✅ Entra ID builder (`auth.entra()`)
- ✅ API Keys builder (`auth.apiKeys()`)
- ✅ Token validation configuration
- ✅ Role mapping configuration

**Implementation Order**:

1. Auth definition function
2. Entra ID builder
3. API Keys builder
4. Token validation options
5. Role mapping builder

**Success Criteria**:

- Can define multiple auth providers
- Configuration options work correctly
- Type safety for auth config

### Phase 4: Backend Assembly and Defaults (Weeks 6-7)

**Goal**: Implement backend assembly with default configurations.

**Deliverables**:

- ✅ `defineBackend()` function
- ✅ `defineSchema()` function
- ✅ Default configurations (dev, staging, prod)
- ✅ Environment detection
- ✅ Configuration merging logic

**Implementation Order**:

1. Schema definition function
2. Backend definition function
3. Development defaults
4. Production defaults
5. Configuration merger
6. Environment detection

**Success Criteria**:

- Can assemble minimal backend
- Defaults load based on environment
- Settings validation works

### Phase 5: Infrastructure Resources (Weeks 8-10)

**Goal**: Implement all infrastructure resource builders.

**Deliverables**:

- ✅ Network builders (VNet, WAF, DDoS)
- ✅ Storage builders (Account, Cosmos DB)
- ✅ Compute builders (Function App)
- ✅ Monitoring builders (App Insights, Log Analytics, Alerts)
- ✅ Performance builders (CDN, Cache, Rate Limit)

**Implementation Order**:

1. Network builders
2. Storage builders
3. Compute builders
4. Monitoring builders
5. Performance builders

**Success Criteria**:

- All builders support fluent API
- Conditional `.when()` works
- Type safety for all configs
- Configuration validation

### Phase 6: Attach Pattern (Weeks 11-12)

**Goal**: Implement attachment point system.

**Deliverables**:

- ✅ Attachment point implementation
- ✅ Type-safe attachment validation
- ✅ Attachment tracking
- ✅ Schema-specific attachment points
- ✅ Configuration merging with defaults

**Implementation Order**:

1. Attachment point interface
2. Attachment point implementation
3. Type-safe attachment validation
4. Schema-based attachment point creation
5. Attachment tracking

**Success Criteria**:

- Type errors for wrong attachments
- Attachments override defaults correctly
- Can detect which configs are attached
- Schema attachments work for events/functions

### Phase 7: Event and Function Systems (Weeks 13-14)

**Goal**: Implement event and function customization APIs.

**Deliverables**:

- ✅ `defineEvents()` function
- ✅ `configureEvent()` builder
- ✅ Queue configuration options
- ✅ Retry policy builder
- ✅ Monitoring configuration
- ✅ `defineFunctions()` function
- ✅ `configureFunction()` builder
- ✅ Function performance options
- ✅ Bindings configuration

**Implementation Order**:

1. Event definition function
2. Event configuration builder
3. Queue settings
4. Retry policy builder
5. Function definition function
6. Function configuration builder
7. Bindings configuration

**Success Criteria**:

- Can customize event processing
- Can customize function handlers
- Retry policies work correctly
- Bindings configuration works

### Phase 8: Context API (Weeks 15-16)

**Goal**: Implement context object passed to handlers.

**Deliverables**:

- ✅ Base context implementation
- ✅ Database client
- ✅ Storage client
- ✅ Event publisher
- ✅ User context
- ✅ Logger implementation
- ✅ Secrets client

**Implementation Order**:

1. Base context structure
2. User context
3. Logger
4. Database client interface (implementation separate)
5. Storage client interface (implementation separate)
6. Event publisher interface (implementation separate)
7. Secrets client

**Success Criteria**:

- Context provides all documented APIs
- Type safety for context usage
- Handler signatures accept context correctly

### Phase 9: Type Generation & Validation (Week 17)

**Goal**: Finalize type inference and validation.

**Deliverables**:

- ✅ Complete type inference system
- ✅ Runtime validation
- ✅ Error messages
- ✅ Type export helpers

**Implementation Order**:

1. Complete type inference utilities
2. Runtime validation for all field types
3. Error message formatting
4. Export type helpers

**Success Criteria**:

- All types infer correctly
- Validation catches errors
- Error messages are clear
- IntelliSense works perfectly

### Phase 10: Polish & Documentation (Week 18)

**Goal**: Polish API, write documentation, create examples.

**Deliverables**:

- ✅ API polish and consistency
- ✅ JSDoc comments on all public APIs
- ✅ Example applications
- ✅ Migration guide
- ✅ API reference documentation

**Implementation Order**:

1. API consistency audit
2. Add JSDoc comments
3. Create example applications
4. Write migration guide
5. Generate API reference

**Success Criteria**:

- API is consistent and intuitive
- All public APIs documented
- Examples cover common use cases
- Documentation is complete

---

## 10. Testing Strategy

### 10.1 Unit Testing Approach

**Test Structure**:

```
src/__tests__/
├── schema/
│   ├── field-types.test.ts
│   ├── crud-model.test.ts
│   ├── event-model.test.ts
│   ├── function-model.test.ts
│   └── validation.test.ts
├── auth/
│   ├── define-auth.test.ts
│   ├── entra.test.ts
│   └── api-keys.test.ts
├── backend/
│   ├── define-backend.test.ts
│   ├── attach-points.test.ts
│   └── defaults.test.ts
├── infrastructure/
│   ├── network.test.ts
│   ├── storage.test.ts
│   ├── compute.test.ts
│   ├── monitoring.test.ts
│   └── performance.test.ts
└── utils/
    ├── builder.test.ts
    └── type-inference.test.ts
```

**Test Framework**: Jest with TypeScript

**Example Tests**:

```typescript
// src/__tests__/schema/field-types.test.ts

describe('Field Types', () => {
  describe('a.string()', () => {
    it('should create string field with required validation', () => {
      const field = a.string().required();
      const config = field._build();

      expect(config.type).toBe('string');
      expect(config.validations).toContainEqual({ type: 'required' });
    });

    it('should add email validation', () => {
      const field = a.string().email();
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'pattern',
        pattern: expect.any(RegExp),
        message: 'Must be a valid email address',
      });
    });

    it('should set min/max length', () => {
      const field = a.string().minLength(5).maxLength(100);
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'minLength',
        value: 5,
        message: 'Must be at least 5 characters',
      });
      expect(config.validations).toContainEqual({
        type: 'maxLength',
        value: 100,
        message: 'Must be at most 100 characters',
      });
    });
  });

  describe('a.number()', () => {
    it('should create number field with min/max', () => {
      const field = a.number().min(0).max(100);
      const config = field._build();

      expect(config.type).toBe('number');
      expect(config.validations).toContainEqual({
        type: 'min',
        value: 0,
        message: 'Must be at least 0',
      });
    });
  });
});
```

### 10.2 Integration Testing

**Goal**: Test how components work together.

**Example Integration Tests**:

```typescript
// src/__tests__/integration/backend-assembly.test.ts

describe('Backend Assembly', () => {
  it('should assemble minimal backend', () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({
          id: a.id(),
          email: a.string().required().email(),
          name: a.string().required(),
        }),
      }),
    });

    const authentication = defineAuth({
      Primary: auth.entra().tenant('test-tenant').clientId('test-client'),
    });

    const backend = defineBackend({
      schema,
      authentication,
      settings: {
        name: 'test-app',
        environment: 'development',
      },
    });

    expect(backend.settings.name).toBe('test-app');
    expect(backend.schema).toBeDefined();
    expect(backend.authentication).toBeDefined();
  });

  it('should apply defaults based on environment', () => {
    const backend = defineBackend({
      schema,
      authentication,
      settings: {
        name: 'test-app',
        environment: 'production',
      },
    });

    const dbConfig = backend.storage.database.getConfig();

    expect(dbConfig.mode).toBe('Autoscale');
    expect(dbConfig.backup.enabled).toBe(true);
  });
});
```

### 10.3 Type Testing

**Goal**: Ensure type inference works correctly.

**Approach**: Use TypeScript's type system to test types at compile time.

```typescript
// src/__tests__/types/type-inference.test.ts

import { expectType, expectError } from 'tsd';

describe('Type Inference', () => {
  it('should infer model type correctly', () => {
    const UserModel = c.model({
      id: a.id(),
      email: a.string().required().email(),
      name: a.string().required(),
      age: a.number().min(0),
    });

    type User = InferModelType<typeof UserModel>;

    expectType<User>({
      id: 'user_123',
      email: 'user@example.com',
      name: 'John Doe',
      age: 30,
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z',
    });

    // Should error on wrong types
    expectError<User>({
      id: 123, // Should be string
      email: 'user@example.com',
      name: 'John Doe',
    });
  });

  it('should infer create input type', () => {
    type CreateUserInput = InferCreateInput<typeof UserModel>;

    expectType<CreateUserInput>({
      email: 'user@example.com',
      name: 'John Doe',
      age: 30,
    });

    // Should error if id is included
    expectError<CreateUserInput>({
      id: 'user_123', // Should be omitted
      email: 'user@example.com',
      name: 'John Doe',
    });
  });
});
```

### 10.4 Example Validation

**Goal**: Ensure example code in documentation works.

**Approach**: Extract code blocks from documentation and run them as tests.

```typescript
// src/__tests__/examples/simple-backend.test.ts

describe('Examples from Documentation', () => {
  it('should run simple backend example', () => {
    // Code from backend-simple/README.md
    const schema = defineSchema({
      schema: a.schema({
        User: c
          .model({
            id: a.id(),
            email: a.string().required().email(),
            name: a.string().required(),
            role: a.enum(['user', 'admin']).default('user'),
          })
          .authorization((allow) => [allow.owner('id'), allow.groups(['admin']).all()]),
      }),
    });

    const authentication = defineAuth({
      Primary: auth
        .entra()
        .tenant(process.env.AZURE_TENANT_ID!)
        .clientId(process.env.AZURE_CLIENT_ID!),
    });

    const backend = defineBackend({
      schema,
      authentication,
      settings: {
        name: 'my-app',
        environment: process.env.NODE_ENV || 'development',
      },
    });

    expect(backend).toBeDefined();
    expect(backend.schema.User).toBeDefined();
  });
});
```

---

## 11. Dependencies

### 11.1 Required npm Packages

**Core Dependencies**:

```json
{
  "dependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**Rationale**: Keep dependencies minimal. The component package is primarily about API design and type generation, not runtime execution.

### 11.2 Azure SDK Dependencies

**Note**: These are NOT direct dependencies of `@atakora/component`. They will be dependencies of the synthesis/runtime packages.

**For Reference** (used by synthesis package):

```json
{
  "dependencies": {
    "@azure/arm-resources": "^5.2.0",
    "@azure/arm-storage": "^18.1.0",
    "@azure/arm-cosmosdb": "^15.4.0",
    "@azure/arm-appservice": "^13.0.0",
    "@azure/arm-monitor": "^8.0.0",
    "@azure/identity": "^4.0.0"
  }
}
```

**For Reference** (used by runtime package):

```json
{
  "dependencies": {
    "@azure/cosmos": "^4.0.0",
    "@azure/storage-blob": "^12.17.0",
    "@azure/storage-queue": "^12.16.0",
    "@azure/keyvault-secrets": "^4.7.0",
    "@azure/monitor-opentelemetry": "^1.0.0"
  }
}
```

### 11.3 Type System Dependencies

**Development Dependencies**:

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "tsd": "^0.30.0",
    "prettier": "^3.1.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.18.0",
    "@typescript-eslint/parser": "^6.18.0"
  }
}
```

---

## 12. Open Questions

### 12.1 Design Decisions to Make

**Question 1: Validation Library**

- Should we use an existing validation library (Zod, Yup) or build our own?
- **Recommendation**: Build our own for these reasons:
  - Full control over error messages
  - Tighter integration with field types
  - No external dependency
  - Can optimize for our use case

**Question 2: Builder Pattern vs Factory Functions**

- Should we use classes (builder pattern) or factory functions?
- **Current Approach**: Builder pattern (classes)
- **Rationale**: Better for method chaining, easier to extend, better IntelliSense

**Question 3: Runtime vs Compile-Time Validation**

- When should validation happen?
- **Recommendation**: Both
  - Compile-time: Type checking via TypeScript
  - Runtime: Validate at API boundaries (HTTP requests)

**Question 4: Error Handling Strategy**

- How should errors be represented?
- **Recommendation**:
  - Custom error classes for specific error types
  - Structured error objects for validation errors
  - Clear, actionable error messages

### 12.2 Ambiguities That Need Clarification

**Ambiguity 1: Schema Evolution**

- How do we handle schema changes over time?
- **Needs Clarification**: Migration strategy, versioning approach

**Ambiguity 2: Custom Field Types**

- Can users define their own field types?
- **Needs Clarification**: Extension points for custom types

**Ambiguity 3: Multi-Region Deployments**

- How do we handle deploying to multiple regions?
- **Needs Clarification**: Region-specific configuration, data residency

**Ambiguity 4: Environment Variable Management**

- How do we validate required environment variables?
- **Current Approach**: Validate at backend definition time
- **Needs Clarification**: Runtime validation strategy

### 12.3 Potential Challenges

**Challenge 1: Type Inference Complexity**

- Complex nested types may be hard to infer
- **Mitigation**: Provide explicit type helpers, extensive testing

**Challenge 2: IntelliSense Performance**

- Large schemas may slow down IntelliSense
- **Mitigation**: Use type aliases, optimize type definitions

**Challenge 3: Error Message Quality**

- TypeScript error messages can be cryptic
- **Mitigation**: Design types for clear error messages, provide documentation

**Challenge 4: Backwards Compatibility**

- API changes may break existing code
- **Mitigation**: Semantic versioning, deprecation warnings, migration guides

**Challenge 5: Documentation Maintenance**

- Keeping docs in sync with code
- **Mitigation**: Generate API docs from JSDoc, example validation tests

---

## Appendix A: Example API Usage

### Minimal Backend

```typescript
import { defineSchema, defineAuth, defineBackend, a, c, auth } from '@atakora/component';

// Schema
export const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
      name: a.string().required(),
    }),
  }),
});

// Auth
export const authentication = defineAuth({
  Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!).clientId(process.env.AZURE_CLIENT_ID!),
});

// Backend
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});
```

### Full Backend with Customizations

```typescript
import { defineBackend } from '@atakora/component';
import { schema } from './schema/resource';
import { authentication } from './auth/resource';
import { networking } from './network/resource';
import { data } from './storage/resource';
import { functions } from './compute/resource';
import { event } from './event/resource';
import { func } from './function/resource';

export const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'data-platform',
    environment: 'production',
    region: 'eastus',
  },
});

// Infrastructure attachments
backend.network.primary.attach(networking.Primary);
backend.network.firewall.attach(networking.Firewall);
backend.storage.database.attach(data.Database);
backend.storage.blobs.attach(data.BlobStorage);
backend.compute.functionApp.attach(functions.FunctionApp);

// Schema customizations
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
backend.schema.GenerateReport.function.attach(func.GenerateReport);
```

---

## Appendix B: File Size Estimates

Estimated lines of code per module:

| Module               | Estimated LOC  |
| -------------------- | -------------- |
| Field Types          | 800            |
| CRUD Model           | 400            |
| Event Model          | 200            |
| Function Model       | 300            |
| Schema Builder       | 300            |
| Auth Builders        | 400            |
| Backend Assembly     | 500            |
| Network Builders     | 600            |
| Storage Builders     | 800            |
| Compute Builders     | 400            |
| Monitoring Builders  | 600            |
| Performance Builders | 500            |
| Event Config         | 400            |
| Function Config      | 400            |
| Context API          | 600            |
| Type System          | 800            |
| Utilities            | 400            |
| **Total**            | **~8,000 LOC** |

**Note**: This is implementation code only, not including tests or documentation.

---

## Appendix C: Success Metrics

How to measure if this implementation is successful:

### Developer Experience Metrics

- ✅ Time to first working backend: < 10 minutes
- ✅ Lines of code reduction: 70%+ vs traditional approach
- ✅ IntelliSense suggestions: 100% coverage of public APIs
- ✅ Type errors caught at compile-time: 95%+
- ✅ Time to add new CRUD model: < 5 minutes

### Code Quality Metrics

- ✅ Test coverage: > 90%
- ✅ Type coverage: 100%
- ✅ Documentation coverage: 100% of public APIs
- ✅ Zero runtime dependencies
- ✅ Bundle size: < 100KB

### Adoption Metrics

- ✅ Examples work without modification
- ✅ Migration from v1 takes < 2 hours
- ✅ No GitHub issues about type errors
- ✅ Positive developer feedback

---

## Next Steps

1. **Review this plan** with the team
2. **Clarify open questions** (Section 12)
3. **Set up project structure** (Section 2)
4. **Begin Phase 1** implementation
5. **Create tracking tasks** for each phase

---

## Document History

| Version | Date       | Author | Changes                     |
| ------- | ---------- | ------ | --------------------------- |
| 1.0     | 2025-01-20 | Becky  | Initial implementation plan |

---

**End of Implementation Plan**
