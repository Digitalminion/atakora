# The Attach Pattern

The attach pattern is Atakora's approach to progressive infrastructure customization. It makes customization explicit, transparent, and type-safe.

## Philosophy

**Convention over Configuration**: Atakora provides sensible defaults for all infrastructure. You only customize what needs to be different.

**Explicit is Better Than Implicit**: When you customize infrastructure, it should be obvious what you're changing and why.

**Type-Safe Composition**: TypeScript guides you through available attachment points and prevents errors at compile time.

## Overview

### Traditional Approach (Implicit)

```typescript
// Hard to see what's custom vs default
export const backend = defineBackend({
  schema,
  authentication,
  storage: storageConfig,      // Is this custom or default?
  monitoring: monitoringConfig, // What's being customized?
  performance: perfConfig,      // Why is this here?
});
```

Problems:
- ❌ Can't tell what's custom vs default
- ❌ Hard to remove customizations
- ❌ No clear separation of concerns
- ❌ Difficult to audit changes

### Attach Pattern (Explicit)

```typescript
// Clear: minimal core
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Explicit: these are customizations
backend.storage.database.attach(data.Database);
backend.performance.cache.attach(performance.Cache);
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
```

Benefits:
- ✅ Clear what's custom vs default
- ✅ Easy to add/remove customizations
- ✅ Separation of concerns
- ✅ Easy to audit what's been customized
- ✅ Type-safe attachment points

## Core Concept

### Minimal Backend

Start with just the essentials:

```typescript
export const backend = defineBackend({
  schema,          // Data contracts (required)
  authentication,  // Security (required)
  settings: {      // Global config (required)
    name: 'my-app',
    environment: 'development',
    region: 'eastus',
  },
});
```

This minimal definition automatically provisions:
- ✅ Function App (Consumption plan)
- ✅ Cosmos DB (Serverless mode)
- ✅ Storage Account (standard LRS)
- ✅ Application Insights (basic)
- ✅ Key Vault
- ✅ All APIs from schema
- ✅ All event queues from schema
- ✅ All functions from schema

**For many applications, this is sufficient.**

### Progressive Enhancement

Add customizations only when needed:

```typescript
// Production needs: custom database config
backend.storage.database.attach(data.Database);

// High traffic needs: caching
backend.performance.cache.attach(performance.Cache);

// Security requirements: WAF
backend.network.firewall.attach(networking.Firewall);

// Custom event processing
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
```

## Attachment Points

### Infrastructure Domains

Customize cross-cutting infrastructure concerns:

```typescript
// Authentication (though usually included in defineBackend)
backend.auth.primary.attach(authentication.Primary);
backend.auth.apiKeys.attach(authentication.ApiKeys);

// Networking
backend.network.primary.attach(networking.Primary);
backend.network.firewall.attach(networking.Firewall);
backend.network.ddos.attach(networking.DDoS);

// Storage
backend.storage.blobs.attach(data.BlobStorage);
backend.storage.database.attach(data.Database);

// Compute
backend.compute.functionApp.attach(functions.FunctionApp);

// Monitoring
backend.monitoring.insights.attach(monitoring.AppInsights);
backend.monitoring.logs.attach(monitoring.LogAnalytics);
backend.monitoring.alerts.attach(monitoring.Alerts);
backend.monitoring.diagnostics.attach(monitoring.Diagnostics);
backend.monitoring.metrics.attach(monitoring.CustomMetrics);
backend.monitoring.tracing.attach(monitoring.Tracing);

// Performance
backend.performance.cdn.attach(performance.CDN);
backend.performance.cache.attach(performance.Cache);
backend.performance.rateLimit.attach(performance.RateLimit);
backend.performance.compression.attach(performance.Compression);
```

### Schema Model Customizations

Customize behavior of specific models:

```typescript
// Event processing
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
backend.schema.DataValidated.queue.attach(event.DataValidated);
backend.schema.ProcessingCompleted.queue.attach(event.ProcessingCompleted);

// Function handlers
backend.schema.GenerateReport.function.attach(func.GenerateReport);
backend.schema.ValidateData.function.attach(func.ValidateData);
backend.schema.TransformData.function.attach(func.TransformData);
backend.schema.SearchData.function.attach(func.SearchData);

// Model-specific infrastructure
backend.schema.User.storage.attach(data.UserStorage);  // Custom storage
backend.schema.User.cache.attach(performance.UserCache);  // Custom cache
backend.schema.User.logging.attach(monitoring.UserLogs);  // Custom logging
```

## How It Works

### Type-Safe Discovery

TypeScript IntelliSense shows available attachment points:

```typescript
backend.  // Type Ctrl+Space
// ↓ IntelliSense shows:
// - auth
// - network
// - storage
// - compute
// - monitoring
// - performance
// - schema

backend.storage.  // Type Ctrl+Space
// ↓ IntelliSense shows:
// - blobs
// - database

backend.schema.  // Type Ctrl+Space
// ↓ IntelliSense shows all models:
// - User
// - Project
// - Dataset
// - DataUploaded
// - GenerateReport
// ... etc

backend.schema.DataUploaded.  // Type Ctrl+Space
// ↓ IntelliSense shows:
// - queue (for event models)

backend.schema.GenerateReport.  // Type Ctrl+Space
// ↓ IntelliSense shows:
// - function (for function models)

backend.schema.User.  // Type Ctrl+Space
// ↓ IntelliSense shows:
// - crud (CRUD operations, rarely customized)
// - storage (model-specific storage)
// - cache (model-specific cache)
// - logging (model-specific logging)
```

### Compile-Time Safety

TypeScript prevents invalid attachments:

```typescript
// ✅ Valid: correct type
backend.storage.database.attach(data.Database);

// ❌ Error: wrong type
backend.storage.database.attach(performance.Cache);
// Error: Type 'RedisCacheConfig' is not assignable to type 'CosmosDbConfig'

// ❌ Error: wrong attachment point
backend.storage.queue.attach(data.Database);
// Error: Property 'queue' does not exist on type 'StorageAttachments'

// ❌ Error: event model doesn't have .function
backend.schema.DataUploaded.function.attach(func.DataUploaded);
// Error: Property 'function' does not exist on type 'EventModelAttachments'
```

### Runtime Behavior

Attachments are processed during deployment:

1. **Discovery**: Atakora scans all `backend.*.attach()` calls
2. **Validation**: Ensures configs are valid
3. **Merge**: Merges custom configs with defaults
4. **Generation**: Generates ARM templates
5. **Deployment**: Provisions Azure resources

## Patterns

### Start Minimal, Grow Incrementally

```typescript
// Week 1: MVP with defaults
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Week 2: Add production database config
backend.storage.database.attach(data.Database);

// Week 3: Add caching for performance
backend.performance.cache.attach(performance.Cache);

// Week 4: Add monitoring alerts
backend.monitoring.alerts.attach(monitoring.Alerts);

// Week 5: Add WAF for security
backend.network.firewall.attach(networking.Firewall);
```

### Environment-Specific Attachments

```typescript
const isProd = process.env.NODE_ENV === 'production';

// Always attach these
backend.storage.database.attach(data.Database);

// Production only
if (isProd) {
  backend.network.firewall.attach(networking.Firewall);
  backend.network.ddos.attach(networking.DDoS);
  backend.performance.cdn.attach(performance.CDN);
  backend.performance.cache.attach(performance.Cache);
}

// Development only
if (!isProd) {
  backend.monitoring.diagnostics.attach(monitoring.DetailedLogs);
}
```

### Conditional Attachments

```typescript
// Feature flags
if (process.env.ENABLE_CACHING === 'true') {
  backend.performance.cache.attach(performance.Cache);
}

// Regional features
if (process.env.AZURE_REGION === 'eastus') {
  backend.network.primary.attach(networking.EastUS);
} else if (process.env.AZURE_REGION === 'westeurope') {
  backend.network.primary.attach(networking.WestEurope);
}

// Tenant-specific
if (process.env.TENANT_TYPE === 'enterprise') {
  backend.network.primary.attach(networking.EnterpriseNetwork);
  backend.storage.database.attach(data.EnterpriseDatabases);
}
```

### Selective Event Processing

```typescript
// Only customize events that need it
backend.schema.DataUploaded.queue.attach(event.DataUploaded);  // Custom logic
backend.schema.DataValidated.queue.attach(event.DataValidated);  // Custom logic

// ProcessingCompleted uses defaults (just logs)
// QualityCheckFailed uses defaults
// NotificationRequested uses defaults
```

### Selective Function Customization

```typescript
// Only customize functions that need implementation
backend.schema.GenerateReport.function.attach(func.GenerateReport);  // Custom
backend.schema.SearchData.function.attach(func.SearchData);  // Custom

// ValidateData uses defaults (returns 501 Not Implemented)
// TransformData uses defaults
// ProcessUpload uses defaults
```

## Examples

### Example 1: Minimal Blog

```typescript
// Just schema and auth
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-blog' },
});

// No attachments needed!
// Gets: CRUD APIs, database, auth, basic monitoring
```

### Example 2: Production E-Commerce

```typescript
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'shop', environment: 'production' },
});

// Production database (multi-region, autoscale)
backend.storage.database.attach(data.Database);

// Redis cache for performance
backend.performance.cache.attach(performance.Cache);

// Rate limiting for protection
backend.performance.rateLimit.attach(performance.RateLimit);

// WAF for security
backend.network.firewall.attach(networking.Firewall);

// DDoS protection
backend.network.ddos.attach(networking.DDoS);

// Comprehensive alerting
backend.monitoring.alerts.attach(monitoring.Alerts);

// Custom event processing for orders
backend.schema.OrderPlaced.queue.attach(event.OrderPlaced);
backend.schema.PaymentProcessed.queue.attach(event.PaymentProcessed);
backend.schema.OrderShipped.queue.attach(event.OrderShipped);
```

### Example 3: Data Platform

```typescript
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'data-platform', environment: 'production' },
});

// High-performance database
backend.storage.database.attach(data.Database);

// Large blob storage for datasets
backend.storage.blobs.attach(data.BlobStorage);

// Custom function handlers for data processing
backend.schema.ProcessData.function.attach(func.ProcessData);
backend.schema.GenerateReport.function.attach(func.GenerateReport);
backend.schema.TransformData.function.attach(func.TransformData);
backend.schema.ValidateData.function.attach(func.ValidateData);

// Data pipeline events
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
backend.schema.DataValidated.queue.attach(event.DataValidated);
backend.schema.ProcessingCompleted.queue.attach(event.ProcessingCompleted);
backend.schema.QualityCheckFailed.queue.attach(event.QualityCheckFailed);

// Advanced monitoring
backend.monitoring.insights.attach(monitoring.AppInsights);
backend.monitoring.alerts.attach(monitoring.Alerts);
backend.monitoring.metrics.attach(monitoring.CustomMetrics);
backend.monitoring.tracing.attach(monitoring.Tracing);
```

## What Gets Attached

### Default Behavior (No Attachments)

```typescript
// Minimal backend
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Gets these defaults:
// - Function App: Consumption plan, auto-scale 0-200
// - Cosmos DB: Serverless mode, Session consistency
// - Storage: Standard LRS, standard containers
// - App Insights: Basic monitoring, 100% sampling
// - Networking: HTTPS only, basic CORS
// - Performance: No cache, no CDN, basic rate limiting
```

### With Attachments

```typescript
// Attach custom database
backend.storage.database.attach(data.Database);

// Replaces default with:
// - Cosmos DB: Autoscale mode, 4000 max RU/s
// - Multi-region: East US + West US
// - Consistency: Strong
// - Backup: Continuous, 30 days retention
// - Encryption: Customer-managed keys
```

## Debugging Attachments

### List All Attachments

```bash
npm run atakora inspect

# Output:
Backend: my-app
Environment: production

Core:
✅ Schema: 12 models (4 CRUD, 5 events, 3 functions)
✅ Authentication: Entra ID + API Keys

Attachments:
✅ Storage → Database (Custom)
✅ Performance → Cache (Custom)
✅ Performance → RateLimit (Custom)
✅ Network → Firewall (Custom)
✅ Monitoring → Alerts (Custom)
✅ Schema → DataUploaded.queue (Custom)
✅ Schema → OrderPlaced.queue (Custom)
✅ Schema → GenerateReport.function (Custom)

Defaults (No Attachments):
→ Network → Primary (Using defaults)
→ Compute → FunctionApp (Using defaults)
→ Monitoring → Insights (Using defaults)
→ Schema → DataValidated.queue (Using defaults)
```

### Dry Run Deployment

```bash
npm run atakora deploy --dry-run

# Shows what would be deployed
# Highlights customizations vs defaults
```

## Best Practices

### 1. Start Minimal

```typescript
// ✅ Good: Start with defaults
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// ❌ Avoid: Over-customizing from day 1
backend.storage.database.attach(data.Database);
backend.network.primary.attach(networking.Primary);
backend.compute.functionApp.attach(functions.FunctionApp);
backend.monitoring.insights.attach(monitoring.AppInsights);
// etc... most of these might not be needed!
```

### 2. Customize Only What's Different

```typescript
// ✅ Good: Only attach what needs customization
backend.storage.database.attach(data.Database);  // Multi-region, autoscale

// ❌ Avoid: Attaching defaults
backend.storage.database.attach(
  storage.cosmosDb()
    .mode('Serverless')  // This is already the default!
);
```

### 3. Use Environment Variables

```typescript
// ✅ Good: Environment-aware attachments
if (process.env.NODE_ENV === 'production') {
  backend.network.firewall.attach(networking.Firewall);
}

// ❌ Avoid: Always attaching everything
backend.network.firewall.attach(networking.Firewall);  // In dev too?
```

### 4. Document Why You're Customizing

```typescript
// ✅ Good: Explain why
// Multi-region database for high availability
// and compliance with data residency requirements
backend.storage.database.attach(data.Database);

// Custom event processing for data validation
// and automatic dataset status updates
backend.schema.DataUploaded.queue.attach(event.DataUploaded);

// ❌ Avoid: No context
backend.storage.database.attach(data.Database);
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
```

### 5. Group Related Attachments

```typescript
// ✅ Good: Organized by domain
// ========================================
// Storage Configuration
// ========================================
backend.storage.database.attach(data.Database);
backend.storage.blobs.attach(data.BlobStorage);

// ========================================
// Performance Optimization
// ========================================
backend.performance.cache.attach(performance.Cache);
backend.performance.cdn.attach(performance.CDN);
backend.performance.rateLimit.attach(performance.RateLimit);

// ========================================
// Event Processing
// ========================================
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
backend.schema.DataValidated.queue.attach(event.DataValidated);
```

## Comparison with Other Patterns

### vs Configuration Objects

**Configuration Objects:**
```typescript
export const backend = defineBackend({
  schema,
  storage: {
    database: { /* config */ },
    blobs: { /* config */ },
  },
  monitoring: {
    insights: { /* config */ },
    alerts: { /* config */ },
  },
});
```

**Problems:**
- Hard to tell what's custom vs default
- No separation between core and customization
- Difficult to conditionally include config

**Attach Pattern:**
```typescript
export const backend = defineBackend({ schema, authentication, settings });
backend.storage.database.attach(data.Database);
backend.monitoring.alerts.attach(monitoring.Alerts);
```

**Benefits:**
- Clear what's custom
- Separation of concerns
- Easy conditional logic

### vs Inheritance

**Inheritance:**
```typescript
class ProductionBackend extends Backend {
  constructor() {
    super();
    this.storage = new ProductionStorage();
    this.monitoring = new ProductionMonitoring();
  }
}
```

**Problems:**
- Object-oriented, not functional
- Difficult to compose multiple behaviors
- No type-safety for customization points

**Attach Pattern:**
- Functional composition
- Type-safe attachment points
- Easy to compose multiple customizations

## Related Documentation

- [Resource Provisioning](./resource-provisioning.md) - What gets created
- [Storage Configuration](./storage.md) - Customize storage
- [Networking Configuration](./networking.md) - Customize networking
- [Monitoring Configuration](./monitoring.md) - Customize monitoring
- [Performance Configuration](./performance.md) - Customize performance
