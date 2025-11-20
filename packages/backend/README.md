# Atakora Backend - Schema-Centric Architecture

A revolutionary approach to building Azure backends where you define your data contracts once, and everything else is auto-generated with sensible defaults.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Getting Started](#getting-started)
- [Schema Definition](#schema-definition)
  - [CRUD Models (c.model)](#crud-models-cmodel)
  - [Event Models (e.model)](#event-models-emodel)
  - [Function Models (f.model)](#function-models-fmodel)
- [Authentication](#authentication)
- [Infrastructure Customization](#infrastructure-customization)
  - [Networking](#networking)
  - [Storage](#storage)
  - [Compute](#compute)
  - [Monitoring](#monitoring)
  - [Performance](#performance)
- [The Attach Pattern](#the-attach-pattern)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

## Overview

Traditional backend development requires writing thousands of lines of boilerplate:
- REST API endpoints with routing, validation, error handling
- Database schemas and migrations
- Event queues and processors
- Function handlers
- Infrastructure configuration
- TypeScript types and interfaces

**Atakora Backend eliminates 70%+ of this code** by auto-generating everything from a single schema definition.

### What You Write

```typescript
// Define your data contract
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
  role: a.enum(['user', 'admin']).default('user'),
})
```

### What You Get

- ✅ `POST /api/users` - Create user with validation
- ✅ `GET /api/users/:id` - Retrieve user
- ✅ `PUT /api/users/:id` - Update user
- ✅ `DELETE /api/users/:id` - Delete user
- ✅ `GET /api/users` - List users with filtering, pagination, sorting
- ✅ Cosmos DB container with optimized indexes
- ✅ TypeScript types: `User`, `CreateUserInput`, `UpdateUserInput`, `UserFilter`
- ✅ Input/output validation
- ✅ Authentication and authorization
- ✅ Error handling and logging
- ✅ Monitoring and alerting

**All of this from 6 lines of schema definition.**

## Core Concepts

### 1. Schema First

Everything starts with the schema. Define your data models using three powerful primitives:

- **`c.model`** - CRUD models backed by REST APIs and Cosmos DB
- **`e.model`** - Event models for async processing with queues
- **`f.model`** - Custom functions with HTTP triggers

### 2. Core vs Customization

The backend requires only three things:
- **Schema** - Your data models
- **Authentication** - Security configuration (always required)
- **Settings** - Global configuration (name, region, tags, etc.)

Everything else is optional infrastructure that you attach only when you need custom behavior.

### 3. The Attach Pattern

Infrastructure customizations are explicit and transparent:

```typescript
// Minimal backend definition
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Attach infrastructure customizations
backend.storage.database.attach(data.Database);
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
backend.schema.GenerateReport.function.attach(func.GenerateReport);
```

### 4. Type Safety

Everything is fully typed. IntelliSense guides you through the entire API:

```typescript
// Auto-complete shows all available models
backend.schema.User
backend.schema.DataUploaded

// Auto-complete shows all attachment points
backend.schema.DataUploaded.queue
backend.storage.database
backend.performance.cache
```

## Getting Started

### Installation

```bash
npm install @atakora/component
```

### Minimal Backend

Create a minimal backend with just schema and authentication:

```typescript
// src/schema/resource.ts
import { defineSchema, a, c } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    Todo: c.model({
      id: a.id(),
      title: a.string().required(),
      completed: a.boolean().default(false),
    }),
  }),
});

// src/auth/resource.ts
import { defineAuth, auth } from '@atakora/component/auth';

export const authentication = defineAuth({
  Primary: auth.entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!),
});

// src/index.ts
import { defineBackend } from '@atakora/component';
import { schema } from './schema/resource';
import { authentication } from './auth/resource';

export const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-todo-app',
    environment: process.env.NODE_ENV || 'development',
    region: 'eastus',
  },
});
```

### Deploy

```bash
npm run build   # Build TypeScript
npm run synth   # Generate ARM templates
npm run deploy  # Deploy to Azure
```

## Schema Definition

The schema is your single source of truth. Define it once in `src/schema/resource.ts`:

### CRUD Models (c.model)

CRUD models generate full REST APIs backed by Cosmos DB.

```typescript
import { defineSchema, a, c } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
      name: a.string().required(),
      role: a.enum(['user', 'admin', 'analyst']).default('user'),
      organizationId: a.string().required(),
      preferences: a.json(),
      isActive: a.boolean().default(true),
      lastLoginAt: a.datetime(),
    })
      .authorization(allow => [
        allow.owner('id'),
        allow.groups(['admin']).all(),
      ])
      .indexes(['email', 'organizationId', 'role']),
  }),
});
```

**Auto-generates:**

- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users` - List/search users with:
  - Filtering: `GET /api/users?role=admin&isActive=true`
  - Pagination: `GET /api/users?page=2&pageSize=50`
  - Sorting: `GET /api/users?sortBy=createdAt&sortOrder=desc`
- Cosmos DB container `users` with indexes on `email`, `organizationId`, `role`
- TypeScript types:
  ```typescript
  type User = { id: string; email: string; name: string; ... }
  type CreateUserInput = { email: string; name: string; ... }
  type UpdateUserInput = Partial<CreateUserInput>
  type UserFilter = { email?: string; role?: string; ... }
  ```

**Field Types:**

```typescript
a.id()                          // Auto-generated UUID
a.string()                      // String
a.number()                      // Number
a.boolean()                     // Boolean
a.datetime()                    // ISO 8601 datetime
a.json()                        // Arbitrary JSON
a.enum(['a', 'b', 'c'])        // Enum
a.array(a.string())            // Array
a.object({ field: a.string() }) // Nested object
a.binary()                      // Binary data (for file uploads)
```

**Validation:**

```typescript
a.string()
  .required()
  .email()
  .minLength(3)
  .maxLength(100)
  .pattern(/^[a-z]+$/)

a.number()
  .required()
  .min(0)
  .max(100)
  .integer()

a.array(a.string())
  .required()
  .minItems(1)
  .maxItems(10)
```

**Authorization:**

```typescript
.authorization(allow => [
  // Owner can read/update their own records
  allow.owner('userId'),

  // Admins can do everything
  allow.groups(['admin']).all(),

  // Analysts can read only
  allow.groups(['analyst']).read(),

  // Users can create and read their own, update specific fields
  allow.owner('userId').create().read().update(['name', 'preferences']),
])
```

### Event Models (e.model)

Event models generate event publishing endpoints and async processing queues.

```typescript
DataUploaded: e.model({
  datasetId: a.string().required(),
  projectId: a.string().required(),
  userId: a.string().required(),
  fileUrl: a.string().required().url(),
  fileSizeBytes: a.number().required(),
  fileName: a.string().required(),
  contentType: a.string().required(),
  uploadedAt: a.datetime().required(),
}),
```

**Auto-generates:**

- `POST /api/events/data-uploaded` - Publish event
  ```bash
  curl -X POST https://api.example.com/api/events/data-uploaded \
    -H "Content-Type: application/json" \
    -d '{
      "datasetId": "123",
      "projectId": "456",
      "userId": "789",
      "fileUrl": "https://storage.blob.core.windows.net/...",
      "fileSizeBytes": 1024000,
      "fileName": "data.csv",
      "contentType": "text/csv",
      "uploadedAt": "2025-01-15T10:30:00Z"
    }'
  ```
- Azure Storage Queue or Service Bus Topic `data-uploaded`
- Validation function (validates schema, publishes to queue)
- Default processor function (logs event, can be customized)
- Dead letter queue for failed messages
- TypeScript types:
  ```typescript
  type DataUploadedEvent = { datasetId: string; projectId: string; ... }
  type PublishDataUploadedInput = DataUploadedEvent
  ```

**Customize Event Processing:**

```typescript
// src/event/resource.ts
import { defineEvents, configureEvent } from '@atakora/component/events';

export const event = defineEvents({
  DataUploaded: configureEvent('DataUploaded')
    .ttl(days(14))              // Message TTL
    .visibility(minutes(5))     // Visibility timeout
    .retries(10)                // Max retries
    .withProcessor(async (context, event) => {
      // Custom processing logic
      context.log(`Processing upload: ${event.fileName}`);

      // Validate the file
      await validateFile(event.fileUrl);

      // Publish next event
      await context.publish('DataValidated', {
        datasetId: event.datasetId,
        isValid: true,
        rowCount: 1000,
        validatedAt: new Date(),
      });
    })
    .monitoring(alerts =>
      alerts
        .onFailure('critical')
        .onQueueDepth(100, 'warning')
    ),
});

// src/index.ts - Attach custom processor
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
```

### Function Models (f.model)

Function models generate HTTP-triggered Azure Functions with input/output validation.

```typescript
GenerateReport: f.model({
  input: {
    datasetId: a.string().required(),
    reportType: a.enum(['summary', 'detailed', 'quality', 'comparison']).required(),
    format: a.enum(['pdf', 'excel', 'json']).default('pdf'),
    includeCharts: a.boolean().default(true),
    customFilters: a.json(),
  },
  output: {
    reportId: a.string().required(),
    reportUrl: a.string().url().required(),
    status: a.enum(['generating', 'completed', 'failed']).required(),
    expiresAt: a.datetime().required(),
    metadata: a.json(),
  },
}),
```

**Auto-generates:**

- `POST /api/functions/generate-report` - Invoke function
  ```bash
  curl -X POST https://api.example.com/api/functions/generate-report \
    -H "Content-Type: application/json" \
    -d '{
      "datasetId": "123",
      "reportType": "detailed",
      "format": "pdf",
      "includeCharts": true
    }'
  ```
- Azure Function with HTTP trigger
- Input validation (rejects invalid requests)
- Output validation (ensures consistent responses)
- Default handler (returns 501 Not Implemented, prompting customization)
- TypeScript types:
  ```typescript
  type GenerateReportInput = { datasetId: string; reportType: 'summary' | 'detailed' | ...; ... }
  type GenerateReportOutput = { reportId: string; reportUrl: string; ... }
  ```

**Customize Function Handler:**

```typescript
// src/function/resource.ts
import { defineFunctions, configureFunction } from '@atakora/component/functions';

export const func = defineFunctions({
  GenerateReport: configureFunction('GenerateReport')
    .memory(1024)              // MB
    .timeout(minutes(10))      // Max execution time
    .withHandler(async (context, input) => {
      context.log(`Generating ${input.reportType} report for ${input.datasetId}`);

      // Fetch data
      const dataset = await context.storage.getDataset(input.datasetId);

      // Generate report
      const reportId = generateId();
      const reportBlob = await generateReport(dataset, input);

      // Upload to storage
      const reportUrl = await context.storage.uploadReport(reportId, reportBlob);

      return {
        reportId,
        reportUrl,
        status: 'completed',
        expiresAt: addDays(new Date(), 7),
        metadata: {
          rowCount: dataset.rowCount,
          generatedAt: new Date(),
        },
      };
    })
    .bindings({
      storage: 'BlobStorage',
      queue: 'report-requests',
    }),
});

// src/index.ts - Attach custom handler
backend.schema.GenerateReport.function.attach(func.GenerateReport);
```

## Authentication

Authentication is required for all backends. Define it in `src/auth/resource.ts`:

```typescript
import { defineAuth, auth } from '@atakora/component/auth';

export const authentication = defineAuth({
  // Primary authentication via Microsoft Entra ID (Azure AD)
  Primary: auth.entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .validateTokens(token =>
      token
        .audience(process.env.AZURE_CLIENT_ID!)
        .issuer(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`)
        .validateLifetime()
        .clockSkew(300)
    )
    .mapRoles(roles =>
      roles
        .fromClaim('roles')
        .map('Admin', ['admin'])
        .map('Analyst', ['analyst', 'user'])
        .map('User', ['user'])
    )
    .authorization(authz =>
      authz
        .requireByDefault()
        .publicEndpoints(['/api/health', '/api/version'])
        .adminEndpoints(['/api/users', '/api/admin/*'])
    )
    .mfa(mfa =>
      mfa
        .required(process.env.NODE_ENV === 'production')
        .providers(['authenticator', 'sms'])
    )
    .session(session =>
      session
        .duration('8h')
        .sliding(true)
        .renewBefore('30m')
    ),

  // API Keys for service-to-service authentication
  ApiKeys: auth.apiKeys()
    .enable()
    .rotateEvery(90)
    .requireHttps(),
});
```

**Features:**

- **Entra ID Integration**: OAuth 2.0 / OpenID Connect
- **Role-Based Access Control**: Map Entra ID roles to application permissions
- **Multi-Factor Authentication**: Require MFA for production environments
- **Session Management**: Sliding sessions with automatic renewal
- **API Keys**: Service-to-service authentication
- **Public Endpoints**: Whitelist endpoints that don't require auth

## Infrastructure Customization

All infrastructure is optional and uses the attach pattern. Only customize what needs to be different from defaults.

### Networking

Define networking configuration in `src/network/resource.ts`:

```typescript
import { defineNetwork, network } from '@atakora/component/network';

export const networking = defineNetwork({
  Primary: network.vnet()
    .access(access =>
      access
        .allowIps(['203.0.113.0/24'])  // Office IP range
        .allowVnets([process.env.CORP_VNET_ID!])
        .denyAll()  // Deny everything else
    )
    .cors(cors =>
      cors
        .allowOrigins(['https://app.example.com'])
        .allowMethods(['GET', 'POST', 'PUT', 'DELETE'])
        .allowHeaders(['Content-Type', 'Authorization'])
        .allowCredentials()
        .maxAge(3600)
    )
    .tls(tls =>
      tls
        .minVersion('1.2')
        .ciphers(['TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384'])
    ),

  Firewall: network.waf()
    .enable(process.env.NODE_ENV === 'production')
    .mode('Prevention')
    .ruleSet('OWASP', '3.2')
    .customRule('block-bots', rule =>
      rule
        .priority(100)
        .matchVariable('RequestHeaders', 'User-Agent')
        .operator('Contains')
        .matchValues(['bot', 'crawler', 'spider'])
        .action('Block')
    ),

  DDoS: network.ddos()
    .enable(process.env.NODE_ENV === 'production')
    .mode('VirtualNetworkInherited')
    .alertOnAttack(),
});

// src/index.ts - Attach networking
backend.network.primary.attach(networking.Primary);
backend.network.firewall.attach(networking.Firewall);
backend.network.ddos.attach(networking.DDoS);
```

### Storage

Define storage backends in `src/storage/resource.ts`:

```typescript
import { defineStorage, storage } from '@atakora/component/storage';

const isProd = process.env.NODE_ENV === 'production';

export const data = defineStorage({
  // Blob Storage for files
  BlobStorage: storage.account()
    .name('dataplatformstorage')
    .redundancy(isProd ? 'GRS' : 'LRS')  // Geo-redundant in prod
    .container('datasets', c =>
      c.private()
       .when(isProd, c => c.immutable(7))  // WORM compliance
       .lifecycle(lc =>
         lc.deleteAfter(365)
           .archiveAfter(90)
       )
    )
    .container('reports', c =>
      c.private()
       .deleteAfter(30)
    )
    .encryption(enc =>
      enc
        .enable()
        .keyVault(process.env.KEY_VAULT_ID!)
        .rotateEvery(90)
    ),

  // Cosmos DB for structured data
  Database: storage.cosmosDb()
    .name('data-platform-db')
    .mode(isProd ? 'Autoscale' : 'Serverless')
    .consistency('Session')  // Balance between consistency and performance
    .when(isProd, db =>
      db
        .maxThroughput(4000)
        .multiRegion(['eastus', 'westus'])
        .failover('automatic')
    )
    .backup(backup =>
      backup
        .mode('Continuous')
        .retention(30)
    ),
});

// src/index.ts - Attach storage
backend.storage.blobs.attach(data.BlobStorage);
backend.storage.database.attach(data.Database);
```

### Compute

Define Function App configuration in `src/compute/resource.ts`:

```typescript
import { defineCompute, compute } from '@atakora/component/compute';

const isProd = process.env.NODE_ENV === 'production';

export const functions = defineCompute({
  FunctionApp: compute.functionApp()
    .plan(isProd ? 'Premium' : 'Consumption')
    .when(isProd, a => a.sku('EP1'))  // Elastic Premium 1
    .runtime('node', '20')
    .alwaysOn(isProd)
    .scale(scale =>
      scale
        .max(isProd ? 20 : 10)
        .when(isProd, s =>
          s.min(2)  // Always 2 instances in prod
           .rule('cpu-scale', rule =>
             rule
               .metric('CpuPercentage')
               .threshold(70)
               .scaleBy(2)
           )
        )
    ),
});

// src/index.ts - Attach compute
backend.compute.functionApp.attach(functions.FunctionApp);
```

### Monitoring

Define monitoring and logging in `src/log/resource.ts`:

```typescript
import { defineMonitoring, logs, insights } from '@atakora/component/monitoring';

const isProd = process.env.NODE_ENV === 'production';

export const monitoring = defineMonitoring({
  AppInsights: insights.instance()
    .enable()
    .sampling(isProd ? 50 : 100)  // Sample 50% in prod
    .adaptiveSampling(isProd)
    .liveMetrics()
    .trackDependencies()
    .trackPerformance(),

  Alerts: logs.alerts()
    .contacts(contacts =>
      contacts
        .email('ops@company.com')
        .sms(process.env.ONCALL_PHONE!)
    )
    .rule('High Error Rate', rule =>
      rule
        .severity('Critical')
        .frequency('5m')
        .condition('requests/failed > 5%')
        .action('critical')
    ),

  CustomMetrics: logs.metrics()
    .counter('business.orders.created')
    .gauge('business.queue.depth'),
});

// src/index.ts - Attach monitoring
backend.monitoring.insights.attach(monitoring.AppInsights);
backend.monitoring.alerts.attach(monitoring.Alerts);
backend.monitoring.metrics.attach(monitoring.CustomMetrics);
```

### Performance

Define caching, CDN, and rate limiting in `src/performance/resource.ts`:

```typescript
import { definePerformance, perf } from '@atakora/component/performance';

const isProd = process.env.NODE_ENV === 'production';

export const performance = definePerformance({
  Cache: perf.redis()
    .enable(true)
    .when(isProd, cache =>
      cache.sku('Standard', 1)  // C1
    )
    .when(!isProd, cache =>
      cache.provider('memory')
    )
    .policy(policy =>
      policy
        .defaultTtl(300)  // 5 minutes
        .ttlFor('users', 600)  // 10 minutes
        .invalidateOnWrite()
    ),

  RateLimit: perf.rateLimiter()
    .enable()
    .global(limit =>
      limit.requests(1000).window('1m').burst(1500)
    )
    .perUser(limit =>
      limit.requests(100).window('1m').burst(150)
    )
    .endpoint('POST /api/functions/generate-report', limit =>
      limit.requests(5).window('1m').burst(10)
    ),
});

// src/index.ts - Attach performance
backend.performance.cache.attach(performance.Cache);
backend.performance.rateLimit.attach(performance.RateLimit);
```

## The Attach Pattern

The attach pattern makes infrastructure customization explicit and transparent.

### Why Attach?

**Before (implicit configuration):**
```typescript
export const backend = defineBackend({
  schema,
  authentication,
  storage: data,        // What's being customized?
  monitoring: logs,     // What if I want defaults?
  performance: perf,    // Hard to see what's custom vs default
});
```

**After (explicit attachment):**
```typescript
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Explicit: I'm customizing storage
backend.storage.database.attach(data.Database);

// Clear: monitoring uses defaults (no attachment)

// Transparent: performance is customized for cache only
backend.performance.cache.attach(performance.Cache);
```

### Attach Points

Every infrastructure domain has attachment points:

```typescript
// Schema models
backend.schema.User                 // CRUD model
backend.schema.DataUploaded         // Event model
backend.schema.GenerateReport       // Function model

// Schema attachments
backend.schema.DataUploaded.queue.attach(event.DataUploaded)
backend.schema.GenerateReport.function.attach(func.GenerateReport)

// Infrastructure domains
backend.network.primary.attach(networking.Primary)
backend.storage.database.attach(data.Database)
backend.compute.functionApp.attach(functions.FunctionApp)
backend.monitoring.insights.attach(monitoring.AppInsights)
backend.performance.cache.attach(performance.Cache)
```

### Selective Attachments

Only attach what you need to customize:

```typescript
// Customize storage, use defaults for everything else
backend.storage.database.attach(data.Database);
// No networking, compute, monitoring, or performance attachments
// = All use sensible defaults
```

## Examples

### Minimal Blog Backend

```typescript
// schema/resource.ts
export const schema = defineSchema({
  schema: a.schema({
    Post: c.model({
      id: a.id(),
      title: a.string().required(),
      content: a.string().required(),
      authorId: a.string().required(),
      publishedAt: a.datetime(),
      tags: a.array(a.string()),
    }),
  }),
});

// auth/resource.ts
export const authentication = defineAuth({
  Primary: auth.entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!),
});

// index.ts
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-blog' },
});

// That's it! You get:
// - POST/GET/PUT/DELETE/LIST /api/posts
// - Cosmos DB container
// - Full authentication
// - All defaults work great
```

### E-Commerce with Events

```typescript
// schema/resource.ts
export const schema = defineSchema({
  schema: a.schema({
    // CRUD models
    Product: c.model({ /* ... */ }),
    Order: c.model({ /* ... */ }),

    // Event models
    OrderPlaced: e.model({
      orderId: a.string().required(),
      userId: a.string().required(),
      total: a.number().required(),
      items: a.array(a.object({ /* ... */ })),
    }),

    PaymentProcessed: e.model({ /* ... */ }),
    OrderShipped: e.model({ /* ... */ }),
  }),
});

// event/resource.ts
export const event = defineEvents({
  OrderPlaced: configureEvent('OrderPlaced')
    .withProcessor(async (context, event) => {
      // Process payment
      const payment = await processPayment(event);

      // Publish next event
      await context.publish('PaymentProcessed', payment);
    }),
});

// index.ts
backend.schema.OrderPlaced.queue.attach(event.OrderPlaced);
```

### Data Platform with Custom Functions

```typescript
// schema/resource.ts
export const schema = defineSchema({
  schema: a.schema({
    Dataset: c.model({ /* ... */ }),

    ProcessData: f.model({
      input: {
        datasetId: a.string().required(),
        transformations: a.array(a.object({ /* ... */ })),
      },
      output: {
        resultUrl: a.string().url().required(),
        rowsProcessed: a.number().required(),
      },
    }),
  }),
});

// function/resource.ts
export const func = defineFunctions({
  ProcessData: configureFunction('ProcessData')
    .memory(2048)
    .timeout(minutes(15))
    .withHandler(async (context, input) => {
      const dataset = await loadDataset(input.datasetId);
      const result = await applyTransformations(dataset, input.transformations);
      const resultUrl = await uploadResult(result);

      return {
        resultUrl,
        rowsProcessed: result.length,
      };
    }),
});

// index.ts
backend.schema.ProcessData.function.attach(func.ProcessData);
```

## Best Practices

### 1. Start Minimal, Grow Incrementally

```typescript
// Start with just schema and auth
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Add infrastructure as needed
backend.storage.database.attach(data.Database);
backend.monitoring.alerts.attach(monitoring.Alerts);
```

### 2. Use Environment-Aware Configuration

```typescript
const isProd = process.env.NODE_ENV === 'production';

export const data = defineStorage({
  Database: storage.cosmosDb()
    .mode(isProd ? 'Autoscale' : 'Serverless')
    .when(isProd, db =>
      db.multiRegion(['eastus', 'westus'])
        .maxThroughput(10000)
    ),
});
```

### 3. Leverage Authorization in Schema

```typescript
User: c.model({
  // ... fields
})
  .authorization(allow => [
    allow.owner('id'),                              // Users manage own records
    allow.groups(['admin']).all(),                  // Admins do everything
    allow.groups(['analyst']).read(),               // Analysts read only
  ])
```

### 4. Use Indexes for Query Performance

```typescript
Project: c.model({
  // ... fields
})
  .indexes(['organizationId', 'status', 'createdAt'])  // Common query fields
```

### 5. Event-Driven > Polling

```typescript
// Good: Event-driven
DataUploaded: e.model({ /* ... */ })

// Avoid: Polling for upload status
```

### 6. Validate Early

```typescript
// Schema validation catches errors before they reach your code
fileUrl: a.string().required().url(),
fileSizeBytes: a.number().required().min(1).max(100_000_000),
```

### 7. Use Defaults Unless You Need Custom

```typescript
// ✅ Good: Only customize what needs to be different
backend.performance.cache.attach(performance.Cache);

// ❌ Avoid: Over-customizing with default values
backend.storage.blobs.attach(storage.account().name('default').redundancy('LRS'));
```

### 8. Separate Concerns by File

```
src/
  schema/resource.ts      # Data contracts only
  auth/resource.ts        # Authentication config
  event/resource.ts       # Event processors
  function/resource.ts    # Function handlers
  storage/resource.ts     # Storage config
  network/resource.ts     # Network config
  index.ts                # Assembly
```

## API Reference

### Schema Types

#### `c.model(fields)` - CRUD Model
Generates REST API + Cosmos DB container

**Methods:**
- `.authorization(fn)` - Define access control
- `.indexes(fields)` - Optimize query performance

**Generates:**
- `POST /api/{model-name}` - Create
- `GET /api/{model-name}/:id` - Read
- `PUT /api/{model-name}/:id` - Update
- `DELETE /api/{model-name}/:id` - Delete
- `GET /api/{model-name}` - List/search

#### `e.model(fields)` - Event Model
Generates event queue + processor

**Generates:**
- `POST /api/events/{event-name}` - Publish
- Azure Storage Queue
- Processor function

#### `f.model({ input, output })` - Function Model
Generates HTTP function

**Generates:**
- `POST /api/functions/{function-name}` - Invoke
- Azure Function with HTTP trigger

### Field Types

- `a.id()` - UUID
- `a.string()` - String
- `a.number()` - Number
- `a.boolean()` - Boolean
- `a.datetime()` - ISO 8601 datetime
- `a.json()` - Arbitrary JSON
- `a.enum(values)` - Enum
- `a.array(type)` - Array
- `a.object(fields)` - Nested object
- `a.binary()` - Binary data

### Validation Methods

- `.required()` - Field is required
- `.email()` - Validate email format
- `.url()` - Validate URL format
- `.min(n)` - Minimum value/length
- `.max(n)` - Maximum value/length
- `.minLength(n)` - Minimum string length
- `.maxLength(n)` - Maximum string length
- `.pattern(regex)` - Match pattern
- `.minItems(n)` - Minimum array items
- `.maxItems(n)` - Maximum array items
- `.default(value)` - Default value

### Authorization

- `allow.owner(field)` - Owner of record
- `allow.groups(roles)` - User in role
- `.all()` - All operations
- `.read()` - Read only
- `.create()` - Create only
- `.update(fields?)` - Update (optionally specific fields)
- `.delete()` - Delete only

### Infrastructure Builders

All infrastructure uses fluent builder pattern:

```typescript
builder()
  .method(value)
  .method(nested =>
    nested
      .submethod(value)
  )
  .when(condition, builder =>
    builder.conditionalMethod(value)
  )
```

---

## Comparison with Other Frameworks

| Feature | Atakora | AWS Amplify | Terraform | Azure Bicep |
|---------|---------|-------------|-----------|-------------|
| Schema-Centric | ✅ | ✅ | ❌ | ❌ |
| Auto-generates APIs | ✅ | ✅ | ❌ | ❌ |
| Auto-generates Events | ✅ | ⚠️ Limited | ❌ | ❌ |
| TypeScript-first | ✅ | ⚠️ JS/TS | ⚠️ HCL | ⚠️ Bicep |
| Azure-optimized | ✅ | ❌ AWS-only | ⚠️ Generic | ✅ |
| Code Reduction | 70%+ | 60% | 0% | 0% |
| Attach Pattern | ✅ | ✅ | ❌ | ❌ |

**Atakora = Amplify Gen 2 DX + Azure-native + Infrastructure control**

---

## Need Help?

- **Documentation**: [docs.atakora.dev](https://docs.atakora.dev)
- **Examples**: [github.com/atakora/examples](https://github.com/atakora/examples)
- **Issues**: [github.com/atakora/atakora/issues](https://github.com/atakora/atakora/issues)

## License

MIT
