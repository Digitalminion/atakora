# Attachment Points Guide

> Progressive infrastructure customization for your Atakora backend

## Overview

Attachment points are the mechanism for customizing backend infrastructure in Atakora. They follow a **progressive disclosure** pattern: start with smart defaults that work out of the box, then selectively customize only what you need.

### What Are Attachment Points?

An attachment point is a specific place in your backend where you can attach custom infrastructure configuration. Think of them as hooks where you can override defaults with your own settings.

```typescript
// Without attachment - uses smart defaults
const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' }
});
// Backend automatically provisions: Cosmos DB, Storage Account, Function App, etc.

// With attachment - customize database configuration
backend.storage.database.attach(
  storage.cosmosDb()
    .name('custom-db')
    .mode('Serverless')
    .throughput({ maxRU: 4000 })
);
```

### Why Attachment Points?

Traditional infrastructure-as-code requires you to specify everything upfront. Atakora inverts this:

1. **Defaults First**: Start with production-ready defaults
2. **Customize Progressively**: Override only what differs from defaults
3. **Type Safety**: Full IDE support and compile-time validation
4. **Fail Fast**: Configuration errors caught at attach time

### Architecture Diagram

```
Backend Definition
    |
    +-- Schema (auto-generates infrastructure)
    |
    +-- Attachment Points (customize infrastructure)
        |
        +-- storage.*      (database, blobs, files)
        +-- compute.*      (function apps)
        +-- network.*      (vnets, firewalls)
        +-- monitoring.*   (insights, logs, alerts)
        +-- performance.*  (cdn, cache, rate limiting)
        +-- models.*       (per-model customizations)
```

---

## How Attachment Points Work

### Lifecycle

1. **Backend Creation**: `defineBackend()` creates attachment points with default configurations
2. **Attachment**: Call `.attach(config)` to override defaults
3. **Validation**: Configuration validated immediately (fail fast)
4. **Synthesis**: During deployment, attached configs replace defaults
5. **Deployment**: Azure resources created with your configurations

### Two-Phase Validation

Attachment points use a hybrid validation strategy:

**Phase 1: Attach Time (Immediate)**
- Type checking (TypeScript compile-time)
- Required fields present
- Basic format validation
- Obvious configuration errors

**Phase 2: Synthesis Time (Deployment)**
- Azure-specific validation
- Resource name conflicts
- Quota checks
- Cross-resource dependencies

This approach provides fast feedback during development while catching deployment issues before they reach Azure.

---

## Available Attachment Points

### Storage Attachment Points

Control how your data is stored and accessed.

#### `backend.storage.database`

Customize the Cosmos DB database used for CRUD models.

```typescript
import { storage } from '@atakora/component/builders';

// Serverless database (pay-per-request)
backend.storage.database.attach(
  storage.cosmosDb()
    .name('my-database')
    .mode('Serverless')
    .backup({
      type: 'Continuous',
      retention: 30  // days
    })
);

// Provisioned throughput (predictable costs)
backend.storage.database.attach(
  storage.cosmosDb()
    .name('my-database')
    .mode('Provisioned')
    .throughput({
      mode: 'autoscale',
      maxRU: 4000
    })
    .multiRegion({
      regions: ['eastus', 'westus'],
      writeRegion: 'eastus'
    })
);
```

**Common Use Cases:**
- Switch to serverless for dev/test environments
- Enable multi-region for production
- Configure backup retention
- Adjust throughput for expected load

#### `backend.storage.blobs`

Customize blob storage for file uploads and static assets.

```typescript
// Basic blob storage
backend.storage.blobs.attach(
  storage.blobStorage()
    .name('myfiles')
    .sku('Standard_LRS')  // Locally-redundant
    .accessTier('Hot')
);

// Production blob storage with lifecycle management
backend.storage.blobs.attach(
  storage.blobStorage()
    .name('myfiles')
    .sku('Standard_GRS')  // Geo-redundant
    .accessTier('Hot')
    .lifecycle([
      {
        name: 'archiveOldFiles',
        enabled: true,
        filters: {
          blobTypes: ['blockBlob'],
          prefixMatch: ['uploads/']
        },
        actions: {
          baseBlob: {
            tierToCool: { daysAfterModificationGreaterThan: 30 },
            tierToArchive: { daysAfterModificationGreaterThan: 90 },
            delete: { daysAfterModificationGreaterThan: 365 }
          }
        }
      }
    ])
    .cors([
      {
        allowedOrigins: ['https://myapp.com'],
        allowedMethods: ['GET', 'POST', 'PUT'],
        allowedHeaders: ['*'],
        exposedHeaders: ['x-ms-request-id'],
        maxAgeInSeconds: 3600
      }
    ])
);
```

**Common Use Cases:**
- Configure lifecycle policies to reduce costs
- Set up CORS for web uploads
- Choose redundancy level
- Configure access tiers

#### `backend.storage.account`

Customize the underlying storage account (affects both blobs and other storage types).

```typescript
backend.storage.account.attach(
  storage.account()
    .name('mystorageacct')
    .sku('Standard_GRS')
    .httpsOnly(true)
    .minimumTlsVersion('TLS1_2')
    .networkRules({
      defaultAction: 'Deny',
      ipRules: ['203.0.113.0/24'],
      virtualNetworkRules: ['/subscriptions/.../virtualNetworks/vnet1/subnets/subnet1']
    })
);
```

---

### Compute Attachment Points

Control how your functions are executed.

#### `backend.compute.functionApp`

Customize the Azure Function App that runs your API and event handlers.

```typescript
import { compute } from '@atakora/component/builders';

// Development configuration
backend.compute.functionApp.attach(
  compute.functionApp()
    .name('my-api')
    .plan('Consumption')  // Pay-per-execution
    .runtime('node', '20')
);

// Production configuration with dedicated plan
backend.compute.functionApp.attach(
  compute.functionApp()
    .name('my-api')
    .plan('Premium')
    .sku('EP1')  // Elastic Premium
    .runtime('node', '20')
    .alwaysOn(true)
    .preWarmedInstances(3)
    .maxInstances(20)
    .vnetIntegration(networking.Primary)  // Private network access
    .appSettings({
      FUNCTIONS_WORKER_RUNTIME: 'node',
      WEBSITE_NODE_DEFAULT_VERSION: '~20',
      ENABLE_ORYX_BUILD: 'true'
    })
);
```

**Common Use Cases:**
- Switch from Consumption to Premium for production
- Configure auto-scaling limits
- Enable VNet integration for security
- Set custom app settings

---

### Network Attachment Points

Control network security and connectivity (only available when `features.networking: true`).

#### `backend.network.vnet`

Configure Virtual Network for private connectivity.

```typescript
import { network } from '@atakora/component/builders';

backend.network.vnet.attach(
  network.vnet()
    .name('my-vnet')
    .addressSpace(['10.0.0.0/16'])
    .subnets([
      {
        name: 'functions',
        addressPrefix: '10.0.1.0/24',
        serviceEndpoints: ['Microsoft.Storage', 'Microsoft.AzureCosmosDB']
      },
      {
        name: 'private-endpoints',
        addressPrefix: '10.0.2.0/24',
        privateEndpointNetworkPolicies: 'Disabled'
      }
    ])
);
```

#### `backend.network.firewall`

Configure Azure Firewall for network protection.

```typescript
backend.network.firewall.attach(
  network.firewall()
    .name('my-firewall')
    .sku('Standard')
    .threatIntelMode('Alert')
    .rules([
      {
        name: 'allow-https',
        priority: 100,
        action: 'Allow',
        rules: [
          {
            name: 'https-traffic',
            protocols: ['Https'],
            sourceAddresses: ['*'],
            destinationAddresses: ['*'],
            destinationPorts: ['443']
          }
        ]
      }
    ])
);
```

---

### Monitoring Attachment Points

Control observability and alerting (only available when `features.monitoring: true`).

#### `backend.monitoring.appInsights`

Configure Application Insights for telemetry.

```typescript
import { monitoring } from '@atakora/component/builders';

backend.monitoring.appInsights.attach(
  monitoring.appInsights()
    .name('my-insights')
    .retentionInDays(90)
    .samplingPercentage(100)  // 100% for production
    .enableLiveMetrics(true)
    .disableIpMasking(false)  // Keep IP masking for privacy
);
```

#### `backend.monitoring.alerts`

Configure alerts for critical metrics.

```typescript
backend.monitoring.alerts.attach(
  monitoring.alerts()
    .alert({
      name: 'high-error-rate',
      description: 'Alert when error rate exceeds 5%',
      severity: 'Error',
      frequency: 5,  // Check every 5 minutes
      timeWindow: 15,  // Look at last 15 minutes
      condition: {
        metric: 'requests/failed',
        aggregation: 'Average',
        operator: 'GreaterThan',
        threshold: 5  // 5% error rate
      },
      actions: [
        {
          actionGroup: '/subscriptions/.../actionGroups/oncall',
          emailSubject: 'High Error Rate Alert'
        }
      ]
    })
    .alert({
      name: 'high-latency',
      description: 'Alert when P95 latency exceeds 2s',
      severity: 'Warning',
      frequency: 5,
      timeWindow: 15,
      condition: {
        metric: 'requests/duration',
        aggregation: 'Percentile95',
        operator: 'GreaterThan',
        threshold: 2000  // milliseconds
      }
    })
);
```

---

### Performance Attachment Points

Control caching, CDN, and optimization (only available when `features.performance: true`).

#### `backend.performance.cdn`

Configure Azure CDN for global content delivery.

```typescript
import { performance } from '@atakora/component/builders';

backend.performance.cdn.attach(
  performance.cdn()
    .name('my-cdn')
    .sku('Standard_Microsoft')
    .origins([
      {
        name: 'storage',
        hostName: 'myapp.blob.core.windows.net'
      }
    ])
    .cacheRules([
      {
        name: 'static-assets',
        order: 1,
        matchConditions: [
          {
            matchVariable: 'UrlFileExtension',
            operator: 'Equal',
            matchValue: ['css', 'js', 'jpg', 'png', 'svg']
          }
        ],
        cacheExpiration: {
          behavior: 'Override',
          duration: '7.00:00:00'  // 7 days
        }
      }
    ])
);
```

#### `backend.performance.cache`

Configure Redis cache for application data.

```typescript
backend.performance.cache.attach(
  performance.redis()
    .name('my-cache')
    .sku('Premium', 'P1')  // 6GB cache
    .enableNonSslPort(false)
    .minimumTlsVersion('1.2')
    .redisConfiguration({
      'maxmemory-policy': 'allkeys-lru',
      'maxmemory-reserved': '30',
      'maxfragmentationmemory-reserved': '30'
    })
    .zoneRedundancy(true)  // High availability
);
```

---

### Model-Specific Attachment Points

Customize infrastructure for individual models.

#### `backend.schema.{ModelName}.queue`

Customize event queue for a specific event model.

```typescript
// For e.model() event models
backend.schema.DataUploaded.queue.attach(
  storage.queue()
    .name('data-uploaded')
    .messageTimeToLive(86400)  // 24 hours
    .visibilityTimeout(300)  // 5 minutes
    .maxDequeueCount(5)
    .deadLetterQueue({
      name: 'data-uploaded-dlq',
      maxMessageCount: 1000
    })
);
```

#### `backend.schema.{ModelName}.function`

Customize function configuration for a specific function model.

```typescript
// For f.model() function models
backend.schema.GenerateReport.function.attach(
  compute.function()
    .name('generate-report')
    .timeout(300)  // 5 minutes
    .memory(2048)  // 2GB
    .bindings([
      {
        type: 'blobInput',
        name: 'template',
        path: 'templates/report.xlsx',
        connection: 'StorageConnection'
      },
      {
        type: 'blobOutput',
        name: 'report',
        path: 'reports/{id}.pdf',
        connection: 'StorageConnection'
      }
    ])
);
```

#### `backend.schema.{ModelName}.container`

Customize Cosmos DB container for a specific CRUD model.

```typescript
// For c.model() CRUD models
backend.schema.User.container.attach(
  storage.container()
    .name('users')
    .partitionKey('/tenantId')  // Multi-tenant partitioning
    .uniqueKeys(['/email'])  // Enforce unique emails
    .indexingPolicy({
      automatic: true,
      indexingMode: 'Consistent',
      includedPaths: [
        { path: '/email/?' },
        { path: '/name/?' }
      ],
      excludedPaths: [
        { path: '/_etag/?' },
        { path: '/passwordHash/?' }  // Don't index sensitive data
      ]
    })
    .defaultTtl(-1)  // No automatic deletion
);
```

---

## Validation Rules

### Attach-Time Validation

Performed immediately when `.attach()` is called:

1. **Type Safety**: TypeScript ensures correct types
2. **Required Fields**: All required configuration fields must be present
3. **Format Validation**: Names, SKUs, enums validated against allowed values
4. **Conflict Detection**: Cannot attach same configuration twice

**Example validation error:**

```typescript
// ERROR: name contains invalid characters
backend.storage.database.attach(
  storage.cosmosDb().name('my database!')  // Spaces not allowed
);
// Error: Invalid configuration for storage.database: name must contain only
// alphanumeric characters, hyphens, and underscores
```

### Synthesis-Time Validation

Performed during `atakora synth`:

1. **Azure Constraints**: Resource limits, naming rules, feature availability
2. **Cross-Resource Dependencies**: Related resources configured correctly
3. **Quota Checks**: Subscription limits not exceeded
4. **Region Availability**: Features available in target region

---

## Common Patterns

### Pattern 1: Environment-Based Configuration

Use different configurations for dev, staging, and production.

```typescript
import { defineBackend } from '@atakora/component';
import { storage, compute } from '@atakora/component/builders';

const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    environment: process.env.NODE_ENV  // 'development', 'staging', 'production'
  }
});

// Database configuration based on environment
const isDev = backend.environment === 'development';
const isProd = backend.environment === 'production';

backend.storage.database.attach(
  storage.cosmosDb()
    .name(`my-app-${backend.environment}`)
    .mode(isDev ? 'Serverless' : 'Provisioned')
    .throughput(
      isDev
        ? undefined  // Serverless
        : { mode: 'autoscale', maxRU: isProd ? 20000 : 4000 }
    )
    .multiRegion(
      isProd
        ? { regions: ['eastus', 'westus'], writeRegion: 'eastus' }
        : undefined  // Single region for dev/staging
    )
    .backup({
      type: isProd ? 'Continuous' : 'Periodic',
      retention: isProd ? 30 : 7
    })
);

// Function app configuration based on environment
backend.compute.functionApp.attach(
  compute.functionApp()
    .name(`my-app-${backend.environment}`)
    .plan(isDev ? 'Consumption' : 'Premium')
    .sku(isProd ? 'EP2' : isDev ? undefined : 'EP1')
    .alwaysOn(!isDev)
    .preWarmedInstances(isProd ? 5 : isDev ? 0 : 2)
);
```

### Pattern 2: Feature Flags for Optional Infrastructure

Enable expensive features only when needed.

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    features: {
      monitoring: true,  // Always enabled
      networking: process.env.ENABLE_VNET === 'true',
      performance: process.env.NODE_ENV === 'production'
    }
  }
});

// Networking only attached if feature enabled
if (backend.network) {
  backend.network.vnet.attach(networkConfig);
  backend.network.firewall.attach(firewallConfig);
}

// Performance optimization only in production
if (backend.performance) {
  backend.performance.cdn.attach(cdnConfig);
  backend.performance.cache.attach(cacheConfig);
}
```

### Pattern 3: Incremental Customization

Start with defaults, add customizations as needed.

```typescript
// Week 1: Basic backend with defaults
const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' }
});
// Deploy: 100% defaults, works great

// Week 2: Add custom database configuration
backend.storage.database.attach(
  storage.cosmosDb().mode('Provisioned').throughput({ maxRU: 4000 })
);
// Deploy: Custom database, everything else default

// Week 3: Add monitoring
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    features: { monitoring: true }  // Enable monitoring
  }
});
backend.storage.database.attach(/* ... */);
backend.monitoring.appInsights.attach(monitoringConfig);
backend.monitoring.alerts.attach(alertConfig);
// Deploy: Custom database + monitoring, other defaults
```

### Pattern 4: Shared Configuration with Builders

Reuse configurations across environments.

```typescript
// config/storage.ts
import { storage } from '@atakora/component/builders';

export const baseDatabase = () => storage.cosmosDb()
  .backup({ type: 'Continuous', retention: 30 })
  .consistencyLevel('Session');

export const devDatabase = () => baseDatabase()
  .name('my-app-dev')
  .mode('Serverless');

export const prodDatabase = () => baseDatabase()
  .name('my-app-prod')
  .mode('Provisioned')
  .throughput({ mode: 'autoscale', maxRU: 20000 })
  .multiRegion({ regions: ['eastus', 'westus'], writeRegion: 'eastus' });

// backend.ts
import { devDatabase, prodDatabase } from './config/storage';

const isProd = process.env.NODE_ENV === 'production';
backend.storage.database.attach(
  isProd ? prodDatabase() : devDatabase()
);
```

### Pattern 5: Model-Specific Optimizations

Customize infrastructure per model based on usage patterns.

```typescript
// High-volume event with aggressive retry
backend.schema.PageView.queue.attach(
  storage.queue()
    .name('page-views')
    .maxDequeueCount(10)  // Retry 10 times
    .visibilityTimeout(60)  // Quick retry
    .batchSize(100)  // Process in batches
);

// Critical event with fast processing
backend.schema.PaymentReceived.queue.attach(
  storage.queue()
    .name('payments')
    .maxDequeueCount(3)  // Fail fast
    .visibilityTimeout(300)  // 5 min processing time
    .priority('High')
);

// Heavy computation function
backend.schema.GenerateReport.function.attach(
  compute.function()
    .timeout(600)  // 10 minutes
    .memory(4096)  // 4GB
);

// Quick validation function
backend.schema.ValidateEmail.function.attach(
  compute.function()
    .timeout(10)  // 10 seconds
    .memory(512)  // 512MB
);
```

---

## Best Practices

### Start with Defaults

Don't customize until you need to. Atakora's defaults are production-ready.

```typescript
// GOOD: Start simple
const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' }
});

// BAD: Over-configuring upfront
const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' }
});
backend.storage.database.attach(/* 50 lines of config */);
backend.storage.blobs.attach(/* 40 lines of config */);
backend.compute.functionApp.attach(/* 30 lines of config */);
// You probably don't need all this yet!
```

### Use Environment Variables

Keep configuration flexible and avoid hardcoding.

```typescript
// GOOD: Configurable
backend.storage.database.attach(
  storage.cosmosDb()
    .name(process.env.DATABASE_NAME || 'my-app-db')
    .mode(process.env.DATABASE_MODE || 'Serverless')
);

// BAD: Hardcoded
backend.storage.database.attach(
  storage.cosmosDb()
    .name('my-app-db')
    .mode('Serverless')
);
```

### Validate Early

Use TypeScript's type system to catch errors at compile time.

```typescript
// GOOD: Type-safe
const config = storage.cosmosDb()
  .mode('Serverless')  // TypeScript validates this
  .throughput({ maxRU: 4000 });  // Type error: Serverless doesn't use throughput

// BAD: Runtime errors
backend.storage.database.attach({
  mode: 'serverless',  // Wrong casing
  throughput: 4000  // Wrong structure
});
```

### Document Your Customizations

Explain WHY you're customizing, not just WHAT.

```typescript
// GOOD: Explains reasoning
// Use Provisioned mode because we have predictable, constant traffic (5K req/min)
// Serverless would cost 3x more at this volume
backend.storage.database.attach(
  storage.cosmosDb()
    .mode('Provisioned')
    .throughput({ mode: 'manual', RU: 2000 })
);

// BAD: No context
backend.storage.database.attach(
  storage.cosmosDb().mode('Provisioned').throughput({ RU: 2000 })
);
```

### Test Configuration Changes

Use `atakora synth --dry-run` to validate before deploying.

```bash
# Validate configuration without deploying
atakora synth --dry-run

# Review generated ARM template
atakora synth --output ./synth-output
cat ./synth-output/template.json

# Deploy after validation
atakora deploy
```

---

## Troubleshooting

### Error: "Cannot attach null or undefined configuration"

**Cause**: Trying to attach an invalid value.

```typescript
// ERROR
const config = undefined;
backend.storage.database.attach(config);
```

**Solution**: Ensure configuration is valid before attaching.

```typescript
// GOOD
const config = storage.cosmosDb().name('my-db');
backend.storage.database.attach(config);

// GOOD: Conditional attachment
if (customConfig) {
  backend.storage.database.attach(customConfig);
}
```

### Error: "Configuration for {path} must be an object"

**Cause**: Wrong type passed to attach().

```typescript
// ERROR
backend.storage.database.attach('serverless');  // String, not object
```

**Solution**: Use builder pattern.

```typescript
// GOOD
backend.storage.database.attach(
  storage.cosmosDb().mode('Serverless')
);
```

### Error: "Attachment points not yet implemented"

**Cause**: Using old version of Atakora or placeholder implementation still in place.

**Solution**: Update to latest version:

```bash
npm update @atakora/component
```

### Error: "Invalid configuration: name must contain only alphanumeric characters"

**Cause**: Azure resource name contains invalid characters.

```typescript
// ERROR
backend.storage.database.attach(
  storage.cosmosDb().name('my database!')
);
```

**Solution**: Use valid Azure naming:

```typescript
// GOOD
backend.storage.database.attach(
  storage.cosmosDb().name('my-database')
);
```

### Attachment Not Taking Effect

**Cause**: Attaching after synthesis or wrong attachment point.

**Solution**: Ensure attachment happens before synthesis:

```typescript
// GOOD: Attach in backend definition
const backend = defineBackend({ /* ... */ });
backend.storage.database.attach(config);

// Then synthesize
// atakora synth
```

### Configuration Validation Fails at Synthesis

**Cause**: Azure-specific constraint violated.

**Solution**: Review synthesis error message and adjust:

```bash
$ atakora synth
Error: Database name 'my-database' conflicts with existing resource
Suggestion: Use 'my-database-2' or choose a different name
```

---

## Government Cloud Considerations

### Attachment Points in Azure Government

All attachment points work in Azure Government Cloud, with these differences:

1. **Region Names**: Use Government Cloud regions

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    region: 'usgovvirginia'  // Government Cloud region
  }
});
```

2. **Feature Availability**: Some features may not be available

```typescript
// Check feature availability before attaching
if (backend.performance) {
  // CDN may have different SKUs in Government Cloud
  backend.performance.cdn.attach(
    performance.cdn().sku('Standard_Microsoft')  // Check availability
  );
}
```

3. **Compliance Tags**: Add required compliance tags

```typescript
backend.storage.database.attach(
  storage.cosmosDb()
    .name('my-db')
    .tags({
      'compliance': 'FedRAMP High',
      'data-classification': 'CUI',
      'impact-level': 'IL5'
    })
);
```

---

## Next Steps

- [Synthesis Guide](./synthesis.md) - Learn how backends become Azure resources
- [Testing Guide](./testing.md) - Test your backend configurations
- [API Reference](../api/attachment-points.md) - Complete API documentation
- [Examples](../../examples/attachment-points) - Working code examples

---

**Tip**: Enable debug logging to see attachment activity:

```bash
DEBUG=atakora:* atakora synth
# or
ATAKORA_DEBUG=true atakora synth
```
