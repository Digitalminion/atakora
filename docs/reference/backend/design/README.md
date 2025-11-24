# Default Configuration Design

This folder documents all the default configurations that Atakora provides out-of-the-box. These are the sensible defaults you get without any customization.

## Philosophy

**Convention over Configuration**: Atakora makes opinionated choices that work well for 90% of applications. You only need to override defaults when your specific requirements differ.

**Environment-Aware**: Defaults automatically adjust based on `NODE_ENV`:

- `development` - Optimized for fast iteration, low cost, verbose logging
- `staging` - Production-like but with more observability
- `production` - Optimized for performance, reliability, and security

**Progressive Enhancement**: Start with defaults, customize only what you need.

## Default Configuration Documents

### Core Infrastructure

- **[Function App Defaults](./function-app-defaults.md)** - Compute, scaling, runtime
- **[Cosmos DB Defaults](./cosmos-db-defaults.md)** - Database mode, consistency, regions
- **[Storage Defaults](./storage-defaults.md)** - Redundancy, containers, lifecycle
- **[Key Vault Defaults](./key-vault-defaults.md)** - Secret management, access policies

### Networking & Security

- **[Networking Defaults](./networking-defaults.md)** - HTTPS, CORS, TLS
- **[Authentication Defaults](./authentication-defaults.md)** - Token validation, sessions
- **[Authorization Defaults](./authorization-defaults.md)** - Endpoint access control

### Observability

- **[Application Insights Defaults](./application-insights-defaults.md)** - Sampling, retention
- **[Logging Defaults](./logging-defaults.md)** - Log levels, structured logging
- **[Alerting Defaults](./alerting-defaults.md)** - Built-in alert rules

### Performance

- **[Caching Defaults](./caching-defaults.md)** - Cache behavior (when attached)
- **[Rate Limiting Defaults](./rate-limiting-defaults.md)** - Request throttling
- **[Compression Defaults](./compression-defaults.md)** - Response compression

### Schema Models

- **[CRUD Model Defaults](./crud-model-defaults.md)** - REST API behavior
- **[Event Model Defaults](./event-model-defaults.md)** - Queue configuration
- **[Function Model Defaults](./function-model-defaults.md)** - Handler behavior

## Quick Reference

### Development Environment

```typescript
NODE_ENV = development;
```

**Optimized for:**

- Fast iteration
- Minimal cost
- Verbose logging
- Easy debugging

**Defaults:**

- Function App: Consumption plan, auto-scale 0-200
- Cosmos DB: Serverless mode
- Storage: LRS (local redundancy)
- App Insights: 100% sampling, 30-day retention
- Logging: Debug level, console + insights
- CORS: Permissive (`*`)

**Cost:** ~$10-30/month

---

### Production Environment

```typescript
NODE_ENV = production;
```

**Optimized for:**

- High availability
- Performance
- Security
- Cost efficiency

**Defaults:**

- Function App: Premium EP1, always-on, min 2 instances
- Cosmos DB: Autoscale mode, multi-region (if configured)
- Storage: GRS (geo-redundant)
- App Insights: 50% sampling, 90-day retention
- Logging: Info level, structured JSON
- CORS: Explicit origins only
- MFA: Required (if configured in auth)

**Cost:** ~$200-500/month (minimal backend)

---

## Override Patterns

### When to Override Defaults

**Use defaults when:**

- ✅ Building an MVP or prototype
- ✅ Standard CRUD application
- ✅ Typical API usage patterns
- ✅ Standard security requirements

**Override when:**

- ⚠️ High-traffic application (>10K req/min)
- ⚠️ Large data volumes (>100GB)
- ⚠️ Special compliance requirements (HIPAA, PCI-DSS)
- ⚠️ Multi-region deployment
- ⚠️ Custom networking (VNet, private endpoints)
- ⚠️ Advanced caching strategies

### How to Override

```typescript
// Use defaults
export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
});

// Override specific parts
backend.storage.database.attach(
  storage
    .cosmosDb()
    .mode('Autoscale') // Override: use autoscale instead of serverless
    .maxThroughput(10000) // Override: higher throughput
    .multiRegion(['eastus', 'westus']) // Override: multi-region
);
```

## Default Values by Environment

| Configuration     | Development       | Production                   |
| ----------------- | ----------------- | ---------------------------- |
| **Function App**  |
| Plan              | Consumption       | Premium EP1                  |
| Always On         | false             | true                         |
| Min Instances     | 0                 | 2                            |
| Max Instances     | 200               | 20                           |
| Timeout           | 230s              | 600s                         |
| **Cosmos DB**     |
| Mode              | Serverless        | Autoscale                    |
| Consistency       | Session           | Session                      |
| Regions           | Single            | Single (multi if configured) |
| Backup            | Periodic (7 days) | Continuous (30 days)         |
| Max RU/s          | N/A               | 4000                         |
| **Storage**       |
| Redundancy        | LRS               | GRS                          |
| Access Tier       | Hot               | Hot                          |
| Soft Delete       | 7 days            | 7 days                       |
| Versioning        | Disabled          | Enabled                      |
| **Networking**    |
| CORS Origins      | `*`               | Explicit list required       |
| TLS Version       | 1.2               | 1.2                          |
| Public Access     | Enabled           | Enabled (unless VNet)        |
| Private Endpoints | No                | No (unless VNet)             |
| **Monitoring**    |
| Sampling          | 100%              | 50%                          |
| Retention         | 30 days           | 90 days                      |
| Daily Cap         | None              | 100 GB                       |
| Log Level         | Debug             | Info                         |
| **Security**      |
| MFA Required      | No                | Yes (if configured)          |
| Token Lifetime    | 8 hours           | 8 hours                      |
| API Key Rotation  | 365 days          | 90 days                      |
| **Performance**   |
| Caching           | None              | None (unless attached)       |
| CDN               | Disabled          | Disabled (unless attached)   |
| Compression       | Enabled           | Enabled                      |
| Rate Limiting     | Basic (1000/min)  | Basic (1000/min)             |

## Cost Implications

### Using All Defaults

**Development:**

```
Function App (Consumption):  $0 (free tier)
Cosmos DB (Serverless):      $5
Storage (LRS):               $2
Application Insights:        $0 (under 5GB)
Key Vault:                   $1
-----------------------------------------
Total:                       ~$10/month
```

**Production:**

```
Function App (Premium EP1):  $160
Cosmos DB (Autoscale 4K):    $240
Storage (GRS):               $20
Application Insights:        $50
Key Vault:                   $1
-----------------------------------------
Total:                       ~$470/month
```

### With Custom Overrides

**Adding Redis Cache:**

```
+ Redis (Standard C1):       $75/month
```

**Adding Application Gateway + WAF:**

```
+ App Gateway + WAF:         $300/month
```

**Adding DDoS Protection:**

```
+ DDoS Standard:             $2,944/month
```

**Adding Multi-Region Cosmos:**

```
× Cosmos DB cost by 2:       $480/month (instead of $240)
```

## Default Behavior by Model Type

### CRUD Models (c.model)

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required(),
});
```

**Defaults:**

- ✅ 5 REST endpoints (POST, GET, PUT, DELETE, LIST)
- ✅ Cosmos DB container with `/id` partition key
- ✅ Automatic indexing on all fields
- ✅ Authentication required on all endpoints
- ✅ No authorization rules (admin-only by default)
- ✅ Automatic timestamps (createdAt, updatedAt)
- ✅ Request/response validation
- ✅ Error handling with standard codes
- ✅ Application Insights tracking

**Override with:**

- `.partitionKey('organizationId')` - Custom partition key
- `.indexes(['email'])` - Specific indexes
- `.authorization(...)` - Access control
- `.timestamps(false)` - Disable timestamps
- `.softDelete(true)` - Enable soft deletes

---

### Event Models (e.model)

```typescript
DataUploaded: e.model({
  datasetId: a.string().required(),
  fileUrl: a.string().url().required(),
});
```

**Defaults:**

- ✅ 1 REST endpoint (POST /api/events/data-uploaded)
- ✅ Azure Storage Queue (not Service Bus)
- ✅ Visibility timeout: 5 minutes
- ✅ Message TTL: 14 days
- ✅ Max retries: 5
- ✅ Dead letter queue enabled
- ✅ Default processor (logs event)
- ✅ Queue depth monitoring
- ✅ Application Insights tracking

**Override with:**

```typescript
backend.schema.DataUploaded.queue.attach(
  configureEvent('DataUploaded')
    .ttl(days(7)) // Override TTL
    .visibility(minutes(2)) // Override visibility
    .retries(10) // Override retries
    .withProcessor(async (context, event) => {
      // Custom processing logic
    })
);
```

---

### Function Models (f.model)

```typescript
GenerateReport: f.model({
  input: { datasetId: a.string().required() },
  output: { reportUrl: a.string().url().required() },
});
```

**Defaults:**

- ✅ 1 REST endpoint (POST /api/functions/generate-report)
- ✅ Authentication required
- ✅ Input validation
- ✅ Output validation
- ✅ Default handler (returns 501 Not Implemented)
- ✅ Timeout: 230s (Consumption), 600s (Premium)
- ✅ Memory: 1536 MB
- ✅ Concurrency: 100 (Consumption), 10 (Premium per instance)
- ✅ Application Insights tracking

**Override with:**

```typescript
backend.schema.GenerateReport.function.attach(
  configureFunction('GenerateReport')
    .memory(2048) // Override memory
    .timeout(minutes(15)) // Override timeout
    .withHandler(async (context, input) => {
      // Custom implementation
    })
);
```

## Validation of Defaults

Atakora's defaults are based on:

**Azure Best Practices:**

- Well-Architected Framework
- Security baselines
- Cost optimization

**Real-World Usage:**

- Tested in production applications
- Performance benchmarked
- Cost-optimized

**Common Patterns:**

- 90th percentile of typical applications
- Standard security requirements
- Typical scaling needs

## Troubleshooting Defaults

### Defaults Not Working?

**Check Environment:**

```bash
echo $NODE_ENV
# Should be 'development' or 'production'
```

**Verify Configuration:**

```bash
npm run atakora inspect

# Shows:
# - Current environment
# - Active defaults
# - Overrides applied
```

**Review Deployment Logs:**

```bash
npm run atakora deploy --verbose

# Shows:
# - Defaults being applied
# - Custom configurations
# - Resource creation
```

### When Defaults Change

Atakora may update defaults in new versions:

- Breaking changes: Major version bump (v1 → v2)
- New defaults: Minor version bump (v1.1 → v1.2)
- Bug fixes: Patch version bump (v1.1.1 → v1.1.2)

**Pinning Defaults:**

```typescript
// Lock to specific version
backend.defaults.version('1.5.0');

// Or use current defaults explicitly
backend.defaults.freeze();
```

## Related Documentation

- [Attach Pattern](../attach-pattern.md) - How to override defaults
- [Resource Provisioning](../resource-provisioning.md) - What gets created
- [Environment Configuration](../environments.md) - Dev vs prod
- [Cost Optimization](../cost-optimization.md) - Reducing costs
