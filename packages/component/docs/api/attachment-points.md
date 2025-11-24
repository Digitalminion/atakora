# Attachment Points API Reference

> Complete API documentation for attachment points and infrastructure customization

## AttachmentPoint Interface

The base interface for all attachment points.

```typescript
interface AttachmentPoint<T> {
  attach(config: T): void;
  isAttached(): boolean;
  getConfig(): T;
  reset(): void;
  readonly _default: T;
  _attached?: T;
  readonly _path: string;
}
```

### Methods

#### `attach(config: T): void`

Attaches a custom configuration to this attachment point.

**Parameters:**
- `config: T` - Configuration object to attach

**Throws:**
- `Error` if configuration is null or undefined
- `Error` if configuration fails validation

**Example:**

```typescript
backend.storage.database.attach(
  storage.cosmosDb().name('custom-db')
);
```

---

#### `isAttached(): boolean`

Checks if a custom configuration is attached.

**Returns:** `boolean` - `true` if custom configuration attached, `false` if using defaults

**Example:**

```typescript
if (backend.storage.database.isAttached()) {
  console.log('Using custom database configuration');
}
```

---

#### `getConfig(): T`

Gets the current configuration (attached or default).

**Returns:** `T` - Current configuration

**Example:**

```typescript
const dbConfig = backend.storage.database.getConfig();
console.log('Database mode:', dbConfig.mode);
```

---

#### `reset(): void`

Resets to default configuration, removing any attached custom configuration.

**Example:**

```typescript
backend.storage.database.reset();
console.log('Reset to defaults');
```

---

## Storage Attachment Points

### `backend.storage.database`

Cosmos DB database configuration.

**Type:** `AttachmentPoint<CosmosDbConfig>`

**Default:**
- Mode: Serverless (development), Provisioned (production)
- Consistency: Session
- Backup: Periodic (dev), Continuous (prod)

**Example:**

```typescript
backend.storage.database.attach(
  storage.cosmosDb()
    .name('my-database')
    .mode('Serverless')
    .consistencyLevel('Session')
    .backup({ type: 'Continuous', retention: 30 })
);
```

---

### `backend.storage.blobs`

Blob storage configuration.

**Type:** `AttachmentPoint<BlobStorageConfig>`

**Default:**
- SKU: Standard_LRS (dev), Standard_GRS (prod)
- Access Tier: Hot
- Delete Retention: 7 days (dev), 365 days (prod)

**Example:**

```typescript
backend.storage.blobs.attach(
  storage.blobStorage()
    .name('myfiles')
    .sku('Standard_GRS')
    .accessTier('Hot')
    .deleteRetentionDays(90)
);
```

---

### `backend.storage.account`

Storage account configuration.

**Type:** `AttachmentPoint<StorageAccountConfig>`

**Default:**
- SKU: Standard_LRS (dev), Standard_GRS (prod)
- HTTPS Only: true
- Minimum TLS: 1.2

**Example:**

```typescript
backend.storage.account.attach(
  storage.account()
    .name('mystorageacct')
    .sku('Standard_GRS')
    .httpsOnly(true)
    .minimumTlsVersion('TLS1_2')
);
```

---

## Compute Attachment Points

### `backend.compute.functionApp`

Function App configuration.

**Type:** `AttachmentPoint<FunctionAppConfig>`

**Default:**
- Plan: Consumption (dev), Premium (prod)
- Runtime: Node.js 20
- Always On: false (dev), true (prod)

**Example:**

```typescript
backend.compute.functionApp.attach(
  compute.functionApp()
    .name('my-api')
    .plan('Premium')
    .sku('EP2')
    .runtime('node', '20')
    .alwaysOn(true)
);
```

---

## Network Attachment Points

Available only when `settings.features.networking: true`.

### `backend.network.vnet`

Virtual Network configuration.

**Type:** `AttachmentPoint<VNetConfig>`

**Example:**

```typescript
backend.network.vnet.attach(
  network.vnet()
    .name('my-vnet')
    .addressSpace(['10.0.0.0/16'])
    .subnets([
      {
        name: 'functions',
        addressPrefix: '10.0.1.0/24'
      }
    ])
);
```

---

### `backend.network.firewall`

Azure Firewall configuration.

**Type:** `AttachmentPoint<FirewallConfig>`

**Example:**

```typescript
backend.network.firewall.attach(
  network.firewall()
    .name('my-firewall')
    .sku('Standard')
    .threatIntelMode('Alert')
);
```

---

## Monitoring Attachment Points

Available only when `settings.features.monitoring: true`.

### `backend.monitoring.appInsights`

Application Insights configuration.

**Type:** `AttachmentPoint<AppInsightsConfig>`

**Default:**
- Retention: 30 days (dev), 90 days (prod)
- Sampling: 10% (dev), 100% (prod)

**Example:**

```typescript
backend.monitoring.appInsights.attach(
  monitoring.appInsights()
    .name('my-insights')
    .retentionInDays(90)
    .samplingPercentage(100)
);
```

---

### `backend.monitoring.logs`

Log Analytics Workspace configuration.

**Type:** `AttachmentPoint<LogAnalyticsConfig>`

**Example:**

```typescript
backend.monitoring.logs.attach(
  monitoring.logAnalytics()
    .name('my-logs')
    .retentionInDays(365)
    .sku('PerGB2018')
);
```

---

### `backend.monitoring.alerts`

Alert rules configuration.

**Type:** `AttachmentPoint<AlertConfig>`

**Example:**

```typescript
backend.monitoring.alerts.attach(
  monitoring.alerts()
    .alert({
      name: 'high-error-rate',
      severity: 'Error',
      condition: {
        metric: 'requests/failed',
        operator: 'GreaterThan',
        threshold: 5
      }
    })
);
```

---

## Performance Attachment Points

Available only when `settings.features.performance: true`.

### `backend.performance.cdn`

CDN configuration.

**Type:** `AttachmentPoint<CdnConfig>`

**Example:**

```typescript
backend.performance.cdn.attach(
  performance.cdn()
    .name('my-cdn')
    .sku('Standard_Microsoft')
    .origins([{ name: 'storage', hostName: 'myapp.blob.core.windows.net' }])
);
```

---

### `backend.performance.cache`

Redis cache configuration.

**Type:** `AttachmentPoint<RedisCacheConfig>`

**Example:**

```typescript
backend.performance.cache.attach(
  performance.redis()
    .name('my-cache')
    .sku('Premium', 'P1')
    .enableNonSslPort(false)
);
```

---

## Model-Specific Attachment Points

Attachment points for individual schema models.

### `backend.schema.{ModelName}.container`

Cosmos DB container configuration for a CRUD model.

**Available for:** `c.model()` models

**Type:** `AttachmentPoint<ContainerConfig>`

**Example:**

```typescript
backend.schema.User.container.attach(
  storage.container()
    .name('users')
    .partitionKey('/id')
    .uniqueKeys(['/email'])
    .indexingPolicy({
      includedPaths: [{ path: '/email/?' }]
    })
);
```

---

### `backend.schema.{ModelName}.queue`

Event queue configuration for an event model.

**Available for:** `e.model()` models

**Type:** `AttachmentPoint<QueueConfig>`

**Example:**

```typescript
backend.schema.DataUploaded.queue.attach(
  storage.queue()
    .name('data-uploaded')
    .messageTimeToLive(86400)
    .maxDequeueCount(5)
);
```

---

### `backend.schema.{ModelName}.function`

Function configuration for a function model.

**Available for:** `f.model()` models

**Type:** `AttachmentPoint<FunctionConfig>`

**Example:**

```typescript
backend.schema.GenerateReport.function.attach(
  compute.function()
    .name('generate-report')
    .timeout(600)
    .memory(4096)
);
```

---

## Builder APIs

### Storage Builders

#### `storage.cosmosDb()`

Creates a Cosmos DB configuration builder.

**Methods:**
- `.name(name: string)` - Set database account name
- `.mode('Serverless' | 'Provisioned')` - Set capacity mode
- `.throughput(config: ThroughputConfig)` - Set throughput (Provisioned mode only)
- `.consistencyLevel(level: ConsistencyLevel)` - Set consistency level
- `.multiRegion(config: MultiRegionConfig)` - Enable multi-region
- `.backup(config: BackupConfig)` - Configure backup
- `.enableAnalyticalStorage(enabled: boolean)` - Enable Synapse Link
- `.encryption(config: EncryptionConfig)` - Configure encryption
- `.tags(tags: Record<string, string>)` - Add resource tags

**Example:**

```typescript
storage.cosmosDb()
  .name('my-db')
  .mode('Provisioned')
  .throughput({ mode: 'autoscale', maxRU: 20000 })
  .consistencyLevel('Session')
  .multiRegion({
    regions: ['eastus', 'westus'],
    writeRegion: 'eastus'
  })
  .backup({ type: 'Continuous', retention: 30 })
```

---

#### `storage.blobStorage()`

Creates a blob storage configuration builder.

**Methods:**
- `.name(name: string)` - Set storage account name
- `.sku(sku: StorageSku)` - Set SKU
- `.accessTier('Hot' | 'Cool')` - Set access tier
- `.deleteRetentionDays(days: number)` - Set soft delete retention
- `.lifecycle(policies: LifecyclePolicy[])` - Configure lifecycle management
- `.cors(rules: CorsRule[])` - Configure CORS
- `.encryption(config: EncryptionConfig)` - Configure encryption
- `.tags(tags: Record<string, string>)` - Add resource tags

---

#### `storage.account()`

Creates a storage account configuration builder.

**Methods:**
- `.name(name: string)` - Set account name
- `.sku(sku: StorageSku)` - Set SKU
- `.httpsOnly(enabled: boolean)` - Require HTTPS
- `.minimumTlsVersion(version: string)` - Set minimum TLS version
- `.allowBlobPublicAccess(allowed: boolean)` - Allow public blob access
- `.networkRules(rules: NetworkRules)` - Configure network access
- `.tags(tags: Record<string, string>)` - Add resource tags

---

### Compute Builders

#### `compute.functionApp()`

Creates a Function App configuration builder.

**Methods:**
- `.name(name: string)` - Set function app name
- `.plan('Consumption' | 'Premium' | 'Dedicated')` - Set hosting plan
- `.sku(sku: string)` - Set SKU (Premium/Dedicated only)
- `.runtime(runtime: string, version: string)` - Set runtime
- `.alwaysOn(enabled: boolean)` - Enable always-on
- `.preWarmedInstances(count: number)` - Set pre-warmed instances
- `.maxInstances(count: number)` - Set maximum scale
- `.vnetIntegration(config: VNetConfig)` - Enable VNet integration
- `.appSettings(settings: Record<string, string>)` - Add app settings
- `.tags(tags: Record<string, string>)` - Add resource tags

---

## Type Definitions

### CosmosDbConfig

```typescript
interface CosmosDbConfig {
  name: string;
  mode: 'Serverless' | 'Provisioned';
  throughput?: ThroughputConfig;
  consistencyLevel?: ConsistencyLevel;
  multiRegion?: MultiRegionConfig;
  backup?: BackupConfig;
  enableAnalyticalStorage?: boolean;
  encryption?: EncryptionConfig;
  tags?: Record<string, string>;
}
```

### ThroughputConfig

```typescript
interface ThroughputConfig {
  mode: 'manual' | 'autoscale';
  RU?: number;        // For manual mode
  maxRU?: number;     // For autoscale mode
}
```

### MultiRegionConfig

```typescript
interface MultiRegionConfig {
  regions: string[];
  writeRegion: string;
}
```

### BackupConfig

```typescript
interface BackupConfig {
  type: 'Periodic' | 'Continuous';
  retention?: number;           // Days (Continuous) or hours (Periodic)
  intervalInMinutes?: number;   // Periodic only
}
```

---

## Validation

### Attach-Time Validation

Performed immediately when `.attach()` is called:

1. **Null Check**: Configuration cannot be null or undefined
2. **Type Check**: Configuration must be an object
3. **Custom Validation**: Runs custom validator if provided

### Synthesis-Time Validation

Performed during `atakora synth`:

1. **Azure Naming**: Resource names follow Azure naming rules
2. **Resource Limits**: Configurations within Azure quotas
3. **Dependencies**: Related resources configured correctly
4. **Region Availability**: Features available in target region

---

## Error Handling

### Common Errors

#### "Cannot attach null or undefined configuration"

**Cause:** Trying to attach null/undefined value

**Solution:**

```typescript
// GOOD
const config = storage.cosmosDb().name('my-db');
backend.storage.database.attach(config);

// BAD
backend.storage.database.attach(null);
```

---

#### "Configuration must be an object"

**Cause:** Wrong type passed to attach()

**Solution:**

```typescript
// GOOD
backend.storage.database.attach(
  storage.cosmosDb().mode('Serverless')
);

// BAD
backend.storage.database.attach('serverless');
```

---

#### "Invalid configuration: ..."

**Cause:** Custom validation failed

**Solution:** Check error message for specific validation failure

```typescript
// Example: Name validation
backend.storage.database.attach(
  storage.cosmosDb().name('my-database-123')  // Valid
);

// This would fail:
// backend.storage.database.attach(
//   storage.cosmosDb().name('My Database!')  // Invalid characters
// );
```

---

## Best Practices

1. **Use builders**: Always use builder APIs for type safety
2. **Validate early**: Configurations are validated at attach time
3. **Document customizations**: Add comments explaining WHY you're customizing
4. **Test configurations**: Write unit tests for attachment logic
5. **Environment-specific**: Use different configs for dev/staging/prod

---

## See Also

- [Attachment Points Guide](../guides/attachment-points.md) - Usage guide and patterns
- [Synthesis Guide](../guides/synthesis.md) - How attachments affect synthesis
- [Examples](../../examples/attachment-points/) - Working code examples
