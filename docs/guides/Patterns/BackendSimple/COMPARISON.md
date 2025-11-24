# Comparison: backend-simple vs. backend

This document compares the `backend-simple` and `backend` (full) packages to help you choose the right starting point.

## Quick Comparison

| Aspect             | backend-simple                  | backend (full)                             |
| ------------------ | ------------------------------- | ------------------------------------------ |
| **Lines of code**  | ~30 lines                       | ~200+ lines                                |
| **Files**          | 3 files                         | 10+ files                                  |
| **Setup time**     | 5 minutes                       | 1-2 hours                                  |
| **Customization**  | Uses defaults for everything    | Full control over all infrastructure       |
| **Best for**       | MVPs, prototypes, simple apps   | Production apps with specific requirements |
| **Learning curve** | Minimal                         | Moderate                                   |
| **Flexibility**    | High (add customizations later) | Maximum                                    |

## File Structure Comparison

### backend-simple (Minimal)

```
packages/backend-simple/
├── src/
│   ├── auth/
│   │   └── resource.ts         # Just tenant + clientId
│   ├── schema/
│   │   └── resource.ts         # Data models only
│   └── index.ts                # Minimal assembly
├── package.json
└── tsconfig.json
```

**Total:** 3 source files

### backend (Full)

```
packages/backend/
├── src/
│   ├── auth/
│   │   └── resource.ts         # Full auth config (MFA, sessions, etc.)
│   ├── schema/
│   │   └── resource.ts         # Same as simple
│   ├── network/
│   │   └── resource.ts         # VNet, subnets, NSGs
│   ├── storage/
│   │   └── resource.ts         # Cosmos DB + Blob storage config
│   ├── compute/
│   │   └── resource.ts         # Function App customization
│   ├── log/
│   │   └── resource.ts         # Application Insights config
│   ├── performance/
│   │   └── resource.ts         # CDN, caching, rate limiting
│   ├── event/
│   │   └── resource.ts         # Custom event processors
│   ├── function/
│   │   └── resource.ts         # Custom function handlers
│   └── index.ts                # Full assembly with attachments
├── package.json
└── tsconfig.json
```

**Total:** 10+ source files

## Code Comparison

### Authentication Configuration

**backend-simple:**

```typescript
// src/auth/resource.ts (5 lines)
export const authentication = defineAuth({
  Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!).clientId(process.env.AZURE_CLIENT_ID!),
});
```

**backend (full):**

```typescript
// src/auth/resource.ts (50+ lines)
export const authentication = defineAuth({
  Primary: auth.entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .validateTokens(token => ...)
    .mapRoles(roles => ...)
    .authorization(authz => ...)
    .mfa(mfa => ...)
    .session(session => ...)
    .allowTenants([...]),

  ApiKeys: auth.apiKeys()
    .enable()
    .rotateEvery(90)
    .keys([...]),
});
```

**Difference:**

- Simple: Uses all auth defaults
- Full: Customizes MFA, sessions, API keys, role mapping

---

### Backend Assembly

**backend-simple:**

```typescript
// src/index.ts (10 lines)
export const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    environment: process.env.NODE_ENV || 'development',
  },
});

// No attachments - everything uses defaults
```

**backend (full):**

```typescript
// src/index.ts (30+ lines)
export const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    environment: process.env.NODE_ENV || 'development',
  },
});

// Attach custom infrastructure
backend.network.primary.attach(networking.Primary);
backend.storage.database.attach(data.Database);
backend.storage.blobStorage.attach(data.BlobStorage);
backend.compute.functionApp.attach(functions.FunctionApp);
backend.monitoring.insights.attach(monitoring.AppInsights);
backend.performance.cache.attach(performance.Cache);

// Attach custom event processors
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
backend.schema.ValidationRequested.queue.attach(event.ValidationRequested);

// Attach custom function handlers
backend.schema.GenerateReport.function.attach(func.GenerateReport);
backend.schema.SearchData.function.attach(func.SearchData);
```

**Difference:**

- Simple: No attachments, all defaults
- Full: Explicit customization of all infrastructure

---

## Infrastructure Defaults

### What backend-simple Gets Automatically

**Development (NODE_ENV=development):**

```yaml
Cosmos DB:
  Mode: Serverless
  Cost: ~$0-10/month

Function App:
  Plan: Consumption
  Cost: Free tier available

Storage:
  Redundancy: LRS (Local)
  Cost: ~$1/month

Application Insights:
  Sampling: Basic
  Cost: Included in free tier

Total: ~$0-15/month
```

**Production (NODE_ENV=production):**

```yaml
Cosmos DB:
  Mode: Autoscale
  Throughput: 400-4000 RU/s
  Cost: ~$240/month

Function App:
  Plan: Premium (EP1)
  Instances: 2
  Cost: ~$320/month

Storage:
  Redundancy: GRS (Geo-redundant)
  Cost: ~$3/month

Application Insights:
  Sampling: Full
  Alerts: Enabled
  Cost: ~$5/month

Total: ~$570/month
```

### What backend (full) Allows You to Customize

**Everything!**

- **Cosmos DB:** Partition keys, indexes, consistency, multi-region, throughput
- **Function App:** Plan, SKU, instances, scaling rules, VNet integration
- **Storage:** Redundancy, encryption, private endpoints
- **Networking:** VNets, subnets, NSGs, private endpoints
- **Performance:** CDN, caching, compression, rate limiting
- **Monitoring:** Custom alerts, log retention, sampling
- **Event Processing:** Custom processors, retry policies, batch sizes
- **Functions:** Custom handlers, timeouts, memory, concurrency

## When to Use Each

### Use backend-simple When:

✅ **Starting a new project**

- Get to market fast with sensible defaults
- Validate your idea before investing in customization

✅ **Building an MVP or prototype**

- Focus on features, not infrastructure
- Iterate quickly

✅ **Standard requirements**

- CRUD operations + events + functions
- Single region deployment
- Standard authentication
- No special networking needs

✅ **Small to medium applications**

- < 1000 requests/second
- < 100 GB database
- < 10,000 events/day

✅ **Learning Atakora**

- Understand the framework with minimal complexity
- See what you get automatically

### Use backend (full) When:

⚠️ **Production app with specific requirements**

- Need VNet integration
- Need multi-region Cosmos DB
- Need custom scaling rules
- Need specific security configurations

⚠️ **High performance needs**

- > 1000 requests/second
- > 100 GB database
- > 10,000 events/day
- Need CDN, caching, compression

⚠️ **Complex event processing**

- Custom retry logic
- Batch processing
- FIFO ordering (Service Bus)
- Long-running processors

⚠️ **Enterprise requirements**

- Private endpoints
- Customer-managed encryption keys
- Specific compliance needs
- Complex networking

⚠️ **Custom business logic**

- Complex validation
- Custom authorization rules
- Specialized event processing
- Complex function implementations

## Migration Path

**Start simple, grow as needed:**

```
1. Start with backend-simple
   ↓
2. Add custom event processors (when needed)
   Create: src/event/resource.ts
   ↓
3. Add custom function handlers (when needed)
   Create: src/function/resource.ts
   ↓
4. Customize infrastructure (when defaults don't fit)
   Create: src/network/resource.ts
   Create: src/storage/resource.ts
   Create: src/compute/resource.ts
   etc.
   ↓
5. Now you have backend (full)
```

**You never need to start over!** Just add files as you need them.

## Code Reusability

**100% compatible!**

Everything in `backend-simple` works exactly the same in `backend` (full).

You can copy:

- ✅ Schema definitions
- ✅ Authentication config
- ✅ Custom event processors
- ✅ Custom function handlers
- ✅ All business logic

The only difference is `backend` (full) adds **optional** infrastructure customizations.

## Examples by Use Case

### Use Case: Todo App API

**Recommendation:** backend-simple

**Why:**

- Simple CRUD operations
- Standard authentication
- No special infrastructure needs
- Want to ship fast

**Time to deploy:** 5 minutes

---

### Use Case: E-commerce Platform

**Recommendation:** backend (full)

**Why:**

- Need VNet integration for PCI compliance
- Multi-region Cosmos DB for global customers
- Custom event processing for order workflows
- Need CDN for product images
- High traffic (> 1000 req/s)

**Time to deploy:** 2-4 hours (initial setup)

---

### Use Case: Internal Tools

**Recommendation:** backend-simple

**Why:**

- Low traffic
- Standard CRUD + some events
- Just need authentication
- Defaults are perfect

**Time to deploy:** 5 minutes

---

### Use Case: SaaS Product

**Recommendation:** Start with backend-simple, grow to backend (full)

**Why:**

- Start fast with MVP (backend-simple)
- Add customizations as you scale
- Proven migration path

**Timeline:**

- Month 1: MVP with backend-simple (5 min setup)
- Month 3: Add custom event processors (1 hour)
- Month 6: Add performance optimizations (2 hours)
- Month 12: Full backend with all customizations (4 hours total)

---

## Cost Comparison

### Development (both packages same)

```
backend-simple: ~$0-15/month
backend (full):  ~$0-15/month
```

**Same costs in dev** - both use same defaults.

### Production

**backend-simple with defaults:**

```
Total: ~$570/month
```

**backend (full) with typical customizations:**

```
Cosmos DB (multi-region):     ~$720/month
Function App (EP2, 4 inst):   ~$640/month
Storage (GRS + CDN):          ~$50/month
Monitoring (enhanced):        ~$15/month
Total:                        ~$1,425/month
```

**Custom needs = custom costs**. The full backend lets you optimize for your specific requirements.

## Performance Comparison

### Latency (both same)

```
CRUD operations: P50 20ms, P95 50ms
Event publishing: P50 10ms, P95 30ms
```

Both use same underlying infrastructure, same performance characteristics.

### Throughput

**backend-simple (defaults):**

```
CRUD: ~100 req/s per instance
Events: ~1000 events/s
Functions: ~50 req/s per instance
```

**backend (full, customized):**

```
CRUD: ~200 req/s per instance (with optimizations)
Events: ~10,000 events/s (with batch processing)
Functions: ~100 req/s per instance (with scaling rules)
```

Full customization allows higher throughput when configured properly.

## Recommendation

### For 90% of projects:

**Start with backend-simple**

Why:

- Get to production in 5 minutes
- Validate your idea fast
- Add customizations only when you need them
- Never over-engineer

### For 10% of projects:

**Use backend (full) from start**

Why:

- You know exactly what you need
- You have specific requirements that defaults don't meet
- You're building for scale from day one
- You have enterprise constraints

### Bottom Line

**There's no wrong choice** - both packages work great and you can always migrate from simple to full. Most developers should start with `backend-simple` and grow into customizations as needed.

## Next Steps

**Chose backend-simple?**

- Read [Getting Started Guide](./getting-started.md)
- Deploy your first backend in 5 minutes

**Need backend (full)?**

- Read [Backend Patterns Overview](../overview.md)
- See all customization options

**Not sure?**

- Start with backend-simple
- You can always add customizations later!
