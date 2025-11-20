# Backend Reference Documentation

Comprehensive reference for Atakora's schema-centric backend framework.

## Overview

Atakora Backend provides a schema-first approach to building Azure backends where you define your data contracts once, and all infrastructure is auto-generated with sensible defaults.

**Key Innovation**: Instead of manually configuring infrastructure, you define data models, and Atakora generates:
- REST APIs with full CRUD operations
- Event processing pipelines with queues
- Custom Azure Functions with HTTP triggers
- Cosmos DB containers with optimized indexes
- TypeScript types and validation logic
- Monitoring, alerting, and observability

## Architecture Components

### Core (Required)

These components are required for every backend:

- **[Schema](./schema.md)** - Data model definitions using `c.model`, `e.model`, and `f.model`
- **[Authentication](./authentication.md)** - Security configuration via Entra ID and API keys
- **[Settings](./settings.md)** - Global configuration (name, region, tags, secrets, governance)

### Infrastructure (Optional)

These components are attached only when you need custom behavior:

- **[Networking](./networking.md)** - VNet, CORS, WAF, DDoS protection
- **[Storage](./storage.md)** - Blob storage and Cosmos DB configuration
- **[Compute](./compute.md)** - Azure Functions App configuration
- **[Monitoring](./monitoring.md)** - Application Insights, alerts, logging
- **[Performance](./performance.md)** - Caching, CDN, rate limiting

### Patterns

- **[Attach Pattern](./attach-pattern.md)** - How to customize infrastructure
- **[Resource Provisioning](./resource-provisioning.md)** - What Azure resources get created

## Quick Reference

### Minimal Backend

```typescript
import { defineBackend } from '@atakora/component';
import { schema } from './schema/resource';
import { authentication } from './auth/resource';

export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});
```

This minimal definition automatically provisions:
- ✅ Azure Function App (Consumption plan)
- ✅ Cosmos DB (Serverless mode)
- ✅ Storage Account (for functions)
- ✅ Application Insights (basic monitoring)
- ✅ Key Vault (for secrets)
- ✅ All REST APIs defined in schema
- ✅ All event queues defined in schema
- ✅ All custom functions defined in schema

### Custom Infrastructure

```typescript
// Attach custom configurations
backend.storage.database.attach(data.Database);
backend.network.primary.attach(networking.Primary);
backend.performance.cache.attach(performance.Cache);
backend.monitoring.alerts.attach(monitoring.Alerts);
```

## Documentation Structure

### By Feature

- [Schema Models](./schema.md) - Define data contracts
  - [CRUD Models (c.model)](./schema-crud.md)
  - [Event Models (e.model)](./schema-events.md)
  - [Function Models (f.model)](./schema-functions.md)
- [Authentication](./authentication.md) - Entra ID and API keys
- [Storage](./storage.md) - Blobs and Cosmos DB
- [Networking](./networking.md) - Security and connectivity
- [Compute](./compute.md) - Function App configuration
- [Monitoring](./monitoring.md) - Observability and alerts
- [Performance](./performance.md) - Caching and optimization

### By Task

- [Getting Started](./getting-started.md) - Create your first backend
- [Attach Pattern](./attach-pattern.md) - Customize infrastructure
- [Resource Provisioning](./resource-provisioning.md) - Understand what gets created
- [Environment Configuration](./environments.md) - Dev vs prod settings
- [Authorization](./authorization.md) - Secure your APIs
- [Type Generation](./type-generation.md) - Auto-generated TypeScript types
- [Validation](./validation.md) - Input/output validation
- [Error Handling](./error-handling.md) - Error responses and codes

### API Reference

- [Schema API](./api/schema.md) - `defineSchema`, `c.model`, `e.model`, `f.model`
- [Field Types](./api/field-types.md) - `a.string()`, `a.number()`, etc.
- [Validation Methods](./api/validation.md) - `.required()`, `.email()`, etc.
- [Authorization API](./api/authorization.md) - `allow.owner()`, `allow.groups()`
- [Authentication API](./api/authentication.md) - `auth.entra()`, `auth.apiKeys()`
- [Storage API](./api/storage.md) - `storage.account()`, `storage.cosmosDb()`
- [Networking API](./api/networking.md) - `network.vnet()`, `network.waf()`
- [Compute API](./api/compute.md) - `compute.functionApp()`
- [Monitoring API](./api/monitoring.md) - `insights.instance()`, `logs.alerts()`
- [Performance API](./api/performance.md) - `perf.redis()`, `perf.rateLimiter()`

## Code Reduction

Traditional approaches require extensive boilerplate. Atakora reduces code by 70%+:

### Traditional Approach (~5,000 lines)

```
infrastructure/
├── database.bicep (500 lines)
├── storage.bicep (400 lines)
├── functions.bicep (600 lines)
├── api-management.bicep (800 lines)
├── monitoring.bicep (300 lines)
└── networking.bicep (400 lines)

api/
├── users/
│   ├── create.ts (150 lines)
│   ├── read.ts (120 lines)
│   ├── update.ts (140 lines)
│   ├── delete.ts (100 lines)
│   └── list.ts (200 lines)
├── projects/... (710 lines)
└── datasets/... (710 lines)

types/
├── users.ts (100 lines)
├── projects.ts (100 lines)
└── datasets.ts (100 lines)

validation/
├── users.ts (80 lines)
├── projects.ts (80 lines)
└── datasets.ts (80 lines)
```

### Atakora Approach (~1,500 lines)

```
src/
├── schema/resource.ts (400 lines - defines everything)
├── auth/resource.ts (85 lines)
├── storage/resource.ts (250 lines)
├── network/resource.ts (110 lines)
├── compute/resource.ts (100 lines)
├── monitoring/resource.ts (175 lines)
├── performance/resource.ts (220 lines)
├── event/resource.ts (390 lines - custom processors)
├── function/resource.ts (320 lines - custom handlers)
└── index.ts (150 lines - assembly)
```

**Result**: 70% less code, 100% more features

## What Gets Auto-Generated

From a simple schema definition, Atakora generates:

### From `c.model` (CRUD Model)

**Schema:**
```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
})
```

**Generates:**
- ✅ 5 REST endpoints (POST, GET, PUT, DELETE, LIST)
- ✅ Cosmos DB container with partition key
- ✅ 4 TypeScript types (User, CreateUserInput, UpdateUserInput, UserFilter)
- ✅ Input/output validation for all endpoints
- ✅ Authorization checks
- ✅ Error handling with proper status codes
- ✅ Request logging and tracing
- ✅ API documentation (OpenAPI)

### From `e.model` (Event Model)

**Schema:**
```typescript
DataUploaded: e.model({
  datasetId: a.string().required(),
  fileUrl: a.string().url().required(),
})
```

**Generates:**
- ✅ 1 REST endpoint (POST /api/events/data-uploaded)
- ✅ Azure Storage Queue or Service Bus Topic
- ✅ Validation function (validates schema, publishes to queue)
- ✅ Processor function (default: logs event)
- ✅ Dead letter queue for failures
- ✅ 2 TypeScript types (DataUploadedEvent, PublishDataUploadedInput)
- ✅ Queue depth monitoring
- ✅ Retry logic with exponential backoff

### From `f.model` (Function Model)

**Schema:**
```typescript
GenerateReport: f.model({
  input: {
    datasetId: a.string().required(),
    format: a.enum(['pdf', 'excel']).default('pdf'),
  },
  output: {
    reportUrl: a.string().url().required(),
  },
})
```

**Generates:**
- ✅ 1 REST endpoint (POST /api/functions/generate-report)
- ✅ Azure Function with HTTP trigger
- ✅ Input validation (rejects invalid requests)
- ✅ Output validation (ensures consistent responses)
- ✅ Default handler (returns 501 Not Implemented)
- ✅ 2 TypeScript types (GenerateReportInput, GenerateReportOutput)
- ✅ Performance monitoring
- ✅ Error handling with retries

## Infrastructure Provisioning

When you deploy a backend, Atakora provisions these Azure resources:

### Always Provisioned (Minimal Backend)

- **Resource Group** - Contains all resources
- **Function App** - Hosts all APIs and functions
  - Consumption plan (dev) or Premium plan (prod)
  - Node.js 20 runtime
  - Auto-scaling configuration
- **Storage Account** - For Function App internals
  - Standard LRS (dev) or GRS (prod)
  - Queue storage for event processing
  - Blob storage for function packages
- **Cosmos DB Account** - For CRUD models
  - Serverless mode (dev) or Autoscale (prod)
  - One container per `c.model`
  - Optimized indexes from `.indexes()`
- **Application Insights** - Basic monitoring
  - Request tracking
  - Dependency tracking
  - Exception tracking
- **Key Vault** - Secret management
  - Stores connection strings
  - Stores API keys
  - Certificate management
- **Managed Identity** - For secure access
  - Function App → Storage
  - Function App → Cosmos DB
  - Function App → Key Vault

### Conditionally Provisioned (Custom Infrastructure)

When you attach custom configurations:

- **Virtual Network** (networking.Primary)
  - Private endpoints for services
  - Network security groups
  - DNS zones
- **Application Gateway + WAF** (networking.Firewall)
  - Web Application Firewall rules
  - SSL termination
  - URL routing
- **DDoS Protection** (networking.DDoS)
  - Standard DDoS protection
  - Attack alerting
- **Redis Cache** (performance.Cache)
  - Standard tier (prod) or in-memory (dev)
  - Private endpoint (prod)
  - Backup configuration
- **CDN** (performance.CDN)
  - Azure CDN profile
  - Caching rules
  - Compression
- **Log Analytics Workspace** (monitoring.LogAnalytics)
  - Centralized logging
  - 90-day retention (prod)
- **Action Groups** (monitoring.Alerts)
  - Email notifications
  - SMS alerts
  - Webhook integrations

## Best Practices

### 1. Start Minimal

Begin with just schema and authentication. Add infrastructure as needed:

```typescript
// Start here
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Add later when needed
backend.performance.cache.attach(performance.Cache);
```

### 2. Use Environment Variables

Configure behavior based on environment:

```typescript
const isProd = process.env.NODE_ENV === 'production';

Database: storage.cosmosDb()
  .mode(isProd ? 'Autoscale' : 'Serverless')
  .when(isProd, db =>
    db.multiRegion(['eastus', 'westus'])
  )
```

### 3. Leverage Schema Validation

Let the schema catch errors early:

```typescript
email: a.string()
  .required()
  .email()
  .maxLength(255)
```

### 4. Use Authorization in Schema

Define access control with your data model:

```typescript
User: c.model({...})
  .authorization(allow => [
    allow.owner('id'),
    allow.groups(['admin']).all(),
  ])
```

### 5. Only Customize When Needed

Default behavior works great for most use cases:

```typescript
// ✅ Good: Only attach what needs customization
backend.storage.database.attach(data.Database);

// ❌ Avoid: Over-customizing with defaults
backend.storage.database.attach(
  storage.cosmosDb().mode('Serverless') // This is already the default!
);
```

## Performance Characteristics

### Cold Start Times

- **Consumption Plan**: 1-3 seconds (dev/staging)
- **Premium Plan**: < 100ms (prod with always-on)

### Request Latency

- **CRUD Operations**: 10-50ms (Cosmos DB)
- **Event Publishing**: 5-20ms (Queue write)
- **Custom Functions**: Depends on implementation

### Throughput

- **Consumption Plan**: 200 req/sec per function
- **Premium Plan**: 100+ req/sec per instance, scales to 20+ instances
- **Cosmos DB**: 400-10,000+ RU/s depending on configuration

### Costs

**Development** (minimal backend, low traffic):
- Function App: $0 (free tier)
- Cosmos DB: $0.25/GB + $0.08/1M RU
- Storage: $0.02/GB
- **Total**: ~$10-50/month

**Production** (custom infrastructure, moderate traffic):
- Function App Premium: $160/month (EP1)
- Cosmos DB Autoscale: $50-500/month
- Storage GRS: $0.04/GB
- Redis Standard: $75/month
- **Total**: ~$300-1000/month

## Next Steps

- [Getting Started Guide](./getting-started.md) - Create your first backend
- [Schema Reference](./schema.md) - Learn about c.model, e.model, f.model
- [Authentication Setup](./authentication.md) - Configure Entra ID
- [Attach Pattern](./attach-pattern.md) - Customize infrastructure
- [Example Applications](./examples.md) - See complete examples

## Support

- **Issues**: [github.com/atakora/atakora/issues](https://github.com/atakora/atakora/issues)
- **Documentation**: [docs.atakora.dev](https://docs.atakora.dev)
- **Examples**: [github.com/atakora/examples](https://github.com/atakora/examples)
