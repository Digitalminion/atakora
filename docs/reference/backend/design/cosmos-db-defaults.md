# Cosmos DB Default Configuration

This document describes the default Azure Cosmos DB configuration that Atakora provisions automatically for CRUD models.

## Overview

Cosmos DB stores all data for `c.model` definitions. Each model becomes a container with optimized settings for typical applications.

## Default Configuration

### Development Environment

```typescript
NODE_ENV=development
```

**Account Settings:**
```yaml
API: NoSQL (Core SQL)
Mode: Serverless
Consistency Level: Session
Enable Free Tier: true (if available)
```

**Regions:**
```yaml
Primary Region: From settings.region (default: eastus)
Additional Regions: None
Multi-Region Writes: Disabled
Automatic Failover: Disabled
```

**Backup:**
```yaml
Mode: Periodic
Interval: 4 hours
Retention: 7 days
```

**Networking:**
```yaml
Public Access: Enabled
Private Endpoints: Disabled
IP Firewall: Disabled
VNet Integration: Disabled
```

**Encryption:**
```yaml
At Rest: Microsoft-managed keys
In Transit: TLS 1.2+
```

**Cost:**
- **Serverless:** $0.25 per GB stored + $0.28 per 1M RUs consumed
- **Free tier:** First 1000 RU/s and 25 GB free
- **Typical dev cost:** $0-10/month

---

### Production Environment

```typescript
NODE_ENV=production
```

**Account Settings:**
```yaml
API: NoSQL (Core SQL)
Mode: Autoscale
Consistency Level: Session
Enable Free Tier: false
```

**Throughput:**
```yaml
Min RU/s: 400 (autoscale minimum)
Max RU/s: 4000 (autoscale maximum)
Scaling: Automatic based on load
```

**Regions:**
```yaml
Primary Region: From settings.region
Additional Regions: None (can add via override)
Multi-Region Writes: Disabled (can enable via override)
Automatic Failover: Enabled (if multi-region)
```

**Backup:**
```yaml
Mode: Continuous (Point-in-time restore)
Retention: 30 days
Intervals: Every change is backed up
```

**Networking:**
```yaml
Public Access: Enabled
Private Endpoints: Disabled (unless VNet configured)
IP Firewall: Disabled (unless configured)
VNet Integration: Disabled (unless configured)
```

**Encryption:**
```yaml
At Rest: Microsoft-managed keys
In Transit: TLS 1.2+
```

**Cost:**
- **Autoscale (4000 max RU/s):** ~$240/month
- **Storage:** $0.25 per GB/month
- **Backup:** Included in autoscale
- **Typical prod cost:** $250-500/month

---

## Container Configuration

### Per CRUD Model

Each `c.model` becomes a Cosmos DB container:

```typescript
// Schema definition
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
  organizationId: a.string().required(),
})
```

**Generates Container:**
```yaml
Container Name: users (lowercase, pluralized)
Partition Key: /id
Unique Keys: None (unless specified)
TTL: Disabled
Analytical Store: Disabled
```

---

### Partition Key

**Default:**
```yaml
Path: /id
Type: String
Version: V2 (hierarchical partition keys supported)
```

**Rationale:**
- Simple and predictable
- Works well for small-medium datasets
- Point reads are fast (single partition)
- No hot partitions for random IDs

**When to Override:**
```typescript
// Multi-tenant app: partition by tenant
User: c.model({...})
  .partitionKey('organizationId')

// Time-series data: partition by date
Metric: c.model({...})
  .partitionKey('date')  // Format: YYYY-MM-DD

// High-cardinality: synthetic partition key
Order: c.model({...})
  .partitionKey('partitionId')  // Computed: hash(orderId) % 100
```

---

### Indexing Policy

**Default Indexing:**
```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    {
      "path": "/*"
    }
  ],
  "excludedPaths": [
    {
      "path": "/\"_etag\"/?"
    }
  ]
}
```

**What This Means:**
- ✅ All properties are indexed automatically
- ✅ Queries on any field are fast
- ✅ Writes are slightly slower (index maintenance)
- ✅ Storage cost includes index overhead (~30% extra)

**Custom Indexes:**
```typescript
User: c.model({...})
  .indexes(['email', 'organizationId', 'createdAt'])
```

Generates composite indexes:
```json
{
  "compositeIndexes": [
    [
      { "path": "/email", "order": "ascending" },
      { "path": "/organizationId", "order": "ascending" }
    ],
    [
      { "path": "/organizationId", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ]
  ]
}
```

**Benefits:**
- ✅ Faster multi-field queries
- ✅ Lower RU costs for filtered queries
- ✅ ORDER BY on multiple fields

---

### Consistency Levels

**Default: Session Consistency**

```yaml
Level: Session
Guarantees:
  - Read your own writes
  - Monotonic reads
  - Monotonic writes
  - Prefix consistent reads
Latency: ~5-10ms
RU Cost: 1× (baseline)
```

**Why Session?**
- ✅ Strongly consistent within a session
- ✅ Eventually consistent across sessions
- ✅ Good balance of consistency and performance
- ✅ Suitable for most applications

**Other Levels Available:**

**Strong:**
```yaml
Guarantees: Linearizability (strongest)
Latency: ~20-30ms (synchronous replication)
RU Cost: 2×
Use When: Financial transactions, inventory management
```

**Bounded Staleness:**
```yaml
Guarantees: Reads lag by max K versions or T time
Latency: ~10-15ms
RU Cost: 2×
Use When: Need predictable staleness bounds
```

**Consistent Prefix:**
```yaml
Guarantees: Reads never see out-of-order writes
Latency: ~5-10ms
RU Cost: 1×
Use When: Order matters, absolute consistency doesn't
```

**Eventual:**
```yaml
Guarantees: All replicas converge eventually
Latency: ~3-5ms (fastest)
RU Cost: 0.5×
Use When: High throughput, weak consistency OK
```

**Override:**
```typescript
backend.storage.database.attach(
  storage.cosmosDb()
    .consistency('Strong')  // For strict consistency
);
```

---

## Request Unit (RU) Costs

### Typical Operations

**Point Read (by id and partition key):**
```
Cost: 1 RU per 1 KB document
Example: GET /api/users/user123
```

**Query (single partition):**
```
Cost: ~1 RU per KB scanned + 1 RU per KB returned
Example: GET /api/users?organizationId=org123
```

**Query (cross-partition):**
```
Cost: ~2-5 RU per KB scanned + 1 RU per KB returned
Example: GET /api/users?email=user@example.com
```

**Write (create/update):**
```
Cost: ~5-10 RU per 1 KB document
Includes: Document + index updates
Example: POST /api/users
```

**Delete:**
```
Cost: ~5 RU per document
Includes: Document + index updates
Example: DELETE /api/users/user123
```

### Auto-Scaling

**Serverless (Development):**
```
Min RU/s: 0
Max RU/s: 5000
Scaling: Instant (0-5000 RU/s in <1s)
Cost: Pay per RU consumed
```

**Autoscale (Production):**
```
Min RU/s: 400 (10% of max)
Max RU/s: 4000 (configurable)
Scaling: Gradual (scales in 10% increments)
Cost: Pay for max RU/s provisioned, even if not used
```

**When to Increase Max RU/s:**
- Traffic exceeds 4000 RU/s consistently
- Getting 429 (throttling) errors
- P95 latency > 100ms

**Override:**
```typescript
backend.storage.database.attach(
  storage.cosmosDb()
    .mode('Autoscale')
    .maxThroughput(10000)  // 10K max RU/s
);
```

---

## Automatic Features

### Timestamps

Added automatically to all CRUD models:

```typescript
{
  "id": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2025-01-15T10:30:00Z",  // Auto-added on create
  "updatedAt": "2025-01-15T11:45:00Z",  // Auto-updated on update
  "_ts": 1705318200                      // Cosmos internal timestamp
}
```

**Disable:**
```typescript
User: c.model({...})
  .timestamps(false)
```

---

### ETags for Optimistic Concurrency

Cosmos DB automatically adds `_etag` for conflict detection:

```typescript
// Update request
PUT /api/users/user123
If-Match: "0000000-0000-0000-0000-000000000000"

// If etag doesn't match (someone else updated):
HTTP/1.1 412 Precondition Failed

// If etag matches (update succeeds):
HTTP/1.1 200 OK
```

**Default Behavior:**
- ✅ Updates check etag automatically
- ✅ 412 error if conflict detected
- ✅ Client must retry with fresh etag

---

### TTL (Time-To-Live)

**Default: Disabled**

Enable per model:
```typescript
Session: c.model({
  id: a.id(),
  userId: a.string().required(),
  expiresAt: a.datetime().required(),
})
  .ttl(true, 'expiresAt')  // Use expiresAt field for TTL
```

Or set default TTL for all documents:
```typescript
AuditLog: c.model({...})
  .defaultTtl(2592000)  // 30 days in seconds
```

---

## Query Patterns

### Generated Queries

**List with Filters:**
```typescript
GET /api/users?role=admin&isActive=true

// Generates SQL:
SELECT * FROM users u
WHERE u.role = @role
  AND u.isActive = @isActive
ORDER BY u.createdAt DESC
OFFSET @skip LIMIT @limit

// Cost: ~2-3 RU per user returned
```

**List with Pagination:**
```typescript
GET /api/users?page=2&pageSize=20

// Uses continuation tokens internally
// Cost: ~1 RU per user returned
```

**List with Sorting:**
```typescript
GET /api/users?sortBy=email&sortOrder=asc

// Generates SQL:
SELECT * FROM users u
ORDER BY u.email ASC

// Requires composite index on email
// Cost: ~1-2 RU per user returned
```

**Search (Full-Text):**
```typescript
GET /api/users?search=john

// Generates SQL:
SELECT * FROM users u
WHERE CONTAINS(u.name, @search, true)
   OR CONTAINS(u.email, @search, true)

// Cost: ~5-10 RU per user scanned
// Note: Not efficient for large datasets, use Azure Cognitive Search
```

---

## Multi-Region Configuration

**Default: Single Region**

**When to Add Regions:**
- Global user base
- Disaster recovery
- Compliance requirements (data residency)

**Add Regions:**
```typescript
backend.storage.database.attach(
  storage.cosmosDb()
    .multiRegion(['eastus', 'westus', 'westeurope'])
    .writeRegion('eastus')
    .failover('automatic')
);
```

**Read Regions:**
- All regions can serve reads
- Reads route to nearest region automatically
- Latency: ~5-10ms in-region, ~100-200ms cross-region

**Write Regions:**
- Single write region (default)
- Multi-region writes (optional, 2× cost)

**Cost Impact:**
- 2 regions: 2× cost
- 3 regions: 3× cost
- etc.

---

## Backup & Restore

### Continuous Backup (Production)

**Configuration:**
```yaml
Mode: Continuous
Retention: 30 days
Granularity: Per-second restore
```

**Point-in-Time Restore:**
```bash
# Restore to 2 hours ago
az cosmosdb sql database restore \
  --account-name my-app-prod-cosmos \
  --restore-timestamp "2025-01-15T08:30:00Z"
```

**Cost:**
- Included in autoscale pricing
- Storage: $0.20 per GB/month for backups

---

### Periodic Backup (Development)

**Configuration:**
```yaml
Mode: Periodic
Interval: 4 hours
Retention: 7 days (2 most recent backups)
```

**Restore:**
```bash
# Contact Azure support to restore
# Restores to a new account
# Takes several hours
```

**Cost:**
- Included in serverless pricing
- No additional storage cost

---

## Security

### Encryption

**At Rest:**
```yaml
Method: Microsoft-managed keys
Algorithm: AES-256
Scope: All data and indexes
```

**In Transit:**
```yaml
Protocol: TLS 1.2+
Cipher Suites: Modern, secure ciphers only
Certificate: Azure-managed
```

**Customer-Managed Keys:**
```typescript
backend.storage.database.attach(
  storage.cosmosDb()
    .encryption(enc =>
      enc
        .customerManagedKeys()
        .keyVault(process.env.KEY_VAULT_ID!)
        .keyName('cosmos-encryption-key')
    )
);
```

---

### Access Control

**Default: Managed Identity**

Function App → Cosmos DB via Managed Identity:
```yaml
Identity: System-assigned
Role: Cosmos DB Data Contributor
Scope: Database account
```

**No Connection Strings** in app settings (more secure).

**Firewall:**
```yaml
Default: Allow all Azure services
Override: Restrict to specific IPs or VNets
```

```typescript
backend.storage.database.attach(
  storage.cosmosDb()
    .firewall(fw =>
      fw
        .allowAzureServices(true)
        .allowIps(['203.0.113.0/24'])
        .denyAll()
    )
);
```

---

## When to Override Defaults

### Use Defaults When:
- ✅ Dataset < 100 GB
- ✅ Throughput < 4000 RU/s
- ✅ Single region is OK
- ✅ Session consistency is sufficient
- ✅ Standard partition key (/id) works

### Override When:
- ⚠️ Dataset > 100 GB
- ⚠️ Throughput > 4000 RU/s
- ⚠️ Global user base (multi-region)
- ⚠️ Need strong consistency
- ⚠️ Multi-tenant (partition by tenantId)
- ⚠️ Time-series data (partition by date)

### Override Example:

```typescript
import { defineStorage, storage } from '@atakora/component/storage';

export const data = defineStorage({
  Database: storage.cosmosDb()
    .name('my-app-prod-cosmos')
    .mode('Autoscale')
    .maxThroughput(20000)        // 20K max RU/s
    .consistency('Strong')        // Strong consistency
    .multiRegion([
      'eastus',                   // Primary
      'westus',                   // Read region
      'westeurope',               // Read region
    ])
    .multiRegionWrites(false)    // Single write region
    .failover('automatic')       // Auto-failover on outage
    .backup(backup =>
      backup
        .mode('Continuous')
        .retention(90)             // 90 days retention
    )
    .encryption(enc =>
      enc
        .customerManagedKeys()
        .keyVault(process.env.KEY_VAULT_ID!)
    )
    .firewall(fw =>
      fw
        .allowVnets([process.env.VNET_ID!])
        .denyAll()
    ),
});

backend.storage.database.attach(data.Database);
```

---

## Related Documentation

- [Function App Defaults](./function-app-defaults.md) - Compute configuration
- [Storage Defaults](./storage-defaults.md) - Blob storage configuration
- [CRUD Model Defaults](./crud-model-defaults.md) - Model-specific defaults
- [Storage Configuration](../storage.md) - Override storage settings
- [Performance Tuning](../performance-tuning.md) - Optimization guide
