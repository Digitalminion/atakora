# Resource Provisioning

This document explains exactly what Azure resources get provisioned when you deploy an Atakora backend.

## Overview

Atakora automatically provisions Azure resources based on your schema and configuration. Resources are created in a single Azure Resource Group with consistent naming and tagging.

## Resource Naming

All resources follow a consistent naming convention:

```
{app-name}-{environment}-{resource-type}-{unique-suffix}
```

**Example:**
```
my-app-prod-func-abc123      # Function App
my-app-prod-cosmos-abc123    # Cosmos DB
my-app-prod-storage-abc123   # Storage Account
my-app-prod-insights-abc123  # Application Insights
```

**Components:**
- `{app-name}` - From `settings.name` in defineBackend
- `{environment}` - From `settings.environment` (dev/staging/prod)
- `{resource-type}` - Type of resource (func, cosmos, storage, etc.)
- `{unique-suffix}` - Random suffix for global uniqueness

## Always Provisioned

These resources are created for every backend:

### 1. Resource Group

**Name:** `{app-name}-{environment}-rg`

**Purpose:** Contains all resources for this backend

**Tags:**
```json
{
  "application": "my-app",
  "environment": "production",
  "managedBy": "atakora",
  "costCenter": "eng-001",
  "team": "data-engineering"
}
```

**Cost:** Free

---

### 2. Function App

**Name:** `{app-name}-{environment}-func`

**Type:** Azure Functions

**Configuration:**
- **Runtime:** Node.js 20
- **Plan:** Consumption (dev) / Premium EP1 (prod)
- **OS:** Linux
- **Always On:** false (dev) / true (prod)
- **Auto-scale:** 0-200 instances (Consumption) / 2-20 instances (Premium)

**Endpoints:**
```
https://{app-name}-{environment}-func.azurewebsites.net

# CRUD endpoints (from c.model)
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/users

# Event endpoints (from e.model)
POST   /api/events/data-uploaded

# Function endpoints (from f.model)
POST   /api/functions/generate-report

# Health/metadata
GET    /api/health
GET    /api/version
```

**Cost:**
- Consumption: $0.20 per 1M executions + $0.000016 per GB-s
- Premium EP1: $160/month + execution time

---

### 3. Storage Account

**Name:** `{app-name}{env}storage{suffix}` (lowercase, no hyphens)

**Type:** Azure Storage Account V2

**Configuration:**
- **Redundancy:** LRS (dev) / GRS (prod)
- **Performance:** Standard
- **Access Tier:** Hot
- **Encryption:** Microsoft-managed keys
- **HTTPS Only:** true

**Containers:**
```
# Auto-created for Function App
function-packages          # Deployment packages
function-artifacts         # Build artifacts

# Auto-created for events (e.model)
data-uploaded-queue        # One per event model
data-validated-queue
processing-completed-queue

# Dead letter queues
data-uploaded-deadletter
data-validated-deadletter
```

**Cost:**
- LRS: $0.0184 per GB/month
- GRS: $0.0368 per GB/month
- Queue operations: $0.05 per 10,000 operations

---

### 4. Cosmos DB Account

**Name:** `{app-name}-{environment}-cosmos`

**Type:** Azure Cosmos DB (NoSQL API)

**Configuration:**
- **Mode:** Serverless (dev) / Autoscale (prod)
- **Consistency:** Session
- **Regions:** Single (dev) / Multi (prod)
- **Backup:** Periodic (dev) / Continuous (prod)
- **Encryption:** Microsoft-managed keys

**Containers:**
```
# One container per c.model
users                # Partition key: /id
projects             # Partition key: /id
datasets             # Partition key: /id
feedback             # Partition key: /id
```

**Container Configuration:**
```json
{
  "partitionKey": "/id",
  "indexingPolicy": {
    "automatic": true,
    "indexingMode": "consistent",
    "includedPaths": [
      {
        "path": "/*"  // Index everything
      }
    ],
    "excludedPaths": [
      {
        "path": "/\"_etag\"/?"  // Exclude etag
      }
    ]
  }
}
```

**Custom Indexes** (from `.indexes()`):
```json
{
  "compositeIndexes": [
    [
      { "path": "/email", "order": "ascending" },
      { "path": "/organizationId", "order": "ascending" }
    ]
  ]
}
```

**Cost:**
- Serverless: $0.25 per GB + $0.28 per 1M RUs
- Autoscale: $0.008 per RU/s/hour (~$58/month for 400 RU/s)

---

### 5. Application Insights

**Name:** `{app-name}-{environment}-insights`

**Type:** Application Insights

**Configuration:**
- **Sampling:** 100% (dev) / 50% (prod)
- **Retention:** 30 days (dev) / 90 days (prod)
- **Daily Cap:** None (dev) / 100 GB (prod)

**Auto-Tracked:**
- ✅ HTTP requests and responses
- ✅ Dependencies (Cosmos DB, Storage, HTTP)
- ✅ Exceptions and errors
- ✅ Performance counters
- ✅ Custom metrics
- ✅ Distributed tracing

**Queries:**
```kusto
// Request count
requests
| summarize count() by name

// Failed requests
requests
| where success == false
| project timestamp, name, resultCode, duration

// Slow requests
requests
| where duration > 1000
| project timestamp, name, duration
| order by duration desc
```

**Cost:**
- First 5 GB/month: Free
- Additional: $2.30 per GB

---

### 6. Key Vault

**Name:** `{app-name}-{env}-kv`

**Type:** Azure Key Vault

**Configuration:**
- **SKU:** Standard
- **Soft Delete:** Enabled (90 days)
- **Purge Protection:** Enabled (prod only)
- **Access:** Managed Identity only

**Secrets:**
```
# Connection strings
COSMOS-DB-CONNECTION-STRING
STORAGE-ACCOUNT-CONNECTION-STRING
APPINSIGHTS-INSTRUMENTATION-KEY

# Authentication
AZURE-TENANT-ID
AZURE-CLIENT-ID
AZURE-CLIENT-SECRET

# External services
SENDGRID-API-KEY
TWILIO-AUTH-TOKEN
SLACK-WEBHOOK-URL

# API Keys
API-KEY-PARTNER-A
API-KEY-INTERNAL-SERVICE
```

**Access Policy:**
- Function App Managed Identity: Get, List secrets
- Deployment Service Principal: All operations

**Cost:**
- Standard tier: $0.03 per 10,000 operations
- Secrets: Free

---

### 7. Managed Identity

**Name:** `{app-name}-{environment}-func-identity`

**Type:** System-Assigned Managed Identity

**Purpose:** Secure access between services without credentials

**Assignments:**
```
Function App → Cosmos DB: Data Contributor
Function App → Storage: Storage Blob Data Contributor
Function App → Storage: Storage Queue Data Contributor
Function App → Key Vault: Secrets User
```

**Cost:** Free

---

## Conditionally Provisioned

These resources are only created when you attach custom configurations:

### Networking

#### Virtual Network

**When:** `backend.network.primary.attach(networking.Primary)`

**Resources:**
```
{app-name}-{env}-vnet              # Virtual Network
{app-name}-{env}-subnet-func       # Function App subnet
{app-name}-{env}-subnet-cosmos     # Cosmos DB subnet
{app-name}-{env}-subnet-storage    # Storage subnet
{app-name}-{env}-subnet-redis      # Redis subnet (if cache attached)
{app-name}-{env}-nsg-func          # Network Security Group
```

**Configuration:**
```
Address Space: 10.0.0.0/16

Subnets:
- function-subnet:   10.0.1.0/24
- cosmos-subnet:     10.0.2.0/24
- storage-subnet:    10.0.3.0/24
- redis-subnet:      10.0.4.0/24
```

**Cost:**
- Virtual Network: Free
- Private Endpoints: $0.01 per hour each (~$7/month)

#### Application Gateway + WAF

**When:** `backend.network.firewall.attach(networking.Firewall)`

**Resources:**
```
{app-name}-{env}-appgw             # Application Gateway
{app-name}-{env}-waf               # Web Application Firewall
{app-name}-{env}-pip-appgw         # Public IP
```

**Configuration:**
```
SKU: WAF_v2
Tier: Standard
Capacity: 2 instances (autoscale)
Rules: OWASP 3.2
Mode: Prevention
```

**Cost:**
- Gateway: $0.36 per hour (~$260/month)
- Capacity Unit: $0.008 per hour per unit
- WAF: Included in SKU

#### DDoS Protection

**When:** `backend.network.ddos.attach(networking.DDoS)`

**Resources:**
```
{app-name}-{env}-ddos-plan         # DDoS Protection Plan
```

**Configuration:**
```
Tier: Standard
Protected Resources: All public IPs
Alert Recipients: ops@company.com
```

**Cost:**
- $2,944/month (covers up to 100 public IPs)

---

### Performance

#### Redis Cache

**When:** `backend.performance.cache.attach(performance.Cache)`

**Resources:**
```
{app-name}-{env}-redis             # Redis Cache
```

**Configuration (Production):**
```
SKU: Standard C1
Capacity: 1 GB
TLS: Minimum 1.2
Access: Private endpoint only
Backup: Enabled, 60 min frequency
Patching: Sunday 2 AM, 5-hour window
```

**Configuration (Development):**
```
In-memory cache (no Azure resource)
```

**Cost:**
- C0 (250 MB): $16/month
- C1 (1 GB): $75/month
- C2 (2.5 GB): $145/month

#### CDN

**When:** `backend.performance.cdn.attach(performance.CDN)`

**Resources:**
```
{app-name}-{env}-cdn-profile       # CDN Profile
{app-name}-{env}-cdn-endpoint      # CDN Endpoint
```

**Configuration:**
```
Tier: Standard Microsoft
Origin: Function App URL
Caching Rules:
- /assets/*:  1 day cache
- /static/*:  1 day cache
- /api/*:     No cache (bypass)
Compression: Enabled (gzip, brotli)
```

**Cost:**
- First 10 TB: $0.081 per GB
- HTTP requests: $0.0075 per 10,000

---

### Monitoring

#### Log Analytics Workspace

**When:** `backend.monitoring.logs.attach(monitoring.LogAnalytics)`

**Resources:**
```
{app-name}-{env}-logs              # Log Analytics Workspace
```

**Configuration:**
```
Retention: 30 days (dev) / 90 days (prod)
Daily Cap: 50 GB (prod)
Data Sources:
- Azure Activity Logs
- Azure Diagnostics
- Custom Logs
- Performance Counters
```

**Cost:**
- First 5 GB/day: Free
- Additional: $2.76 per GB

#### Action Groups

**When:** `backend.monitoring.alerts.attach(monitoring.Alerts)`

**Resources:**
```
{app-name}-{env}-ag-critical       # Critical alerts
{app-name}-{env}-ag-warning        # Warning alerts
{app-name}-{env}-ag-info           # Info alerts
```

**Actions:**
```
Critical:
- Email: oncall@company.com
- SMS: +1-555-0100
- Webhook: https://pagerduty.com/...

Warning:
- Email: ops@company.com

Info:
- Email: team@company.com
```

**Alert Rules:**
```
{app-name}-{env}-alert-error-rate
{app-name}-{env}-alert-response-time
{app-name}-{env}-alert-function-failures
{app-name}-{env}-alert-db-throttling
{app-name}-{env}-alert-storage-availability
{app-name}-{env}-alert-queue-depth
```

**Cost:**
- Email: Free
- SMS: $0.15 per SMS
- Webhook: Free
- Alert rules: $0.10 per rule per month

---

## Per-Model Resources

### CRUD Models (c.model)

For each `c.model`:

**Functions Created:**
```
CreateUser              # POST /api/users
GetUser                 # GET /api/users/:id
UpdateUser              # PUT /api/users/:id
DeleteUser              # DELETE /api/users/:id
ListUsers               # GET /api/users
```

**Cosmos DB Container:**
```
Container: users
Partition Key: /id (or custom)
Indexes: Automatic + custom from .indexes()
TTL: Disabled (or custom)
```

**Application Insights:**
```
Custom metrics:
- crud.{model}.create.count
- crud.{model}.create.duration
- crud.{model}.read.count
- crud.{model}.update.count
- crud.{model}.delete.count
- crud.{model}.list.count
```

**Cost Per Model:**
- Functions: Included in Function App cost
- Database: Depends on throughput and storage
  - Serverless: ~$0.25 per GB + $0.28 per 1M RUs
  - Autoscale: ~$0.008 per RU/s/hour

---

### Event Models (e.model)

For each `e.model`:

**Functions Created:**
```
PublishDataUploaded      # POST /api/events/data-uploaded
ProcessDataUploaded      # Queue-triggered processor
```

**Storage Queue:**
```
Queue: data-uploaded
Dead Letter: data-uploaded-deadletter
Visibility Timeout: 300s (5 min)
Message TTL: 1209600s (14 days)
Max Dequeue Count: 10
```

**Application Insights:**
```
Custom metrics:
- event.data-uploaded.published.count
- event.data-uploaded.processed.count
- event.data-uploaded.failed.count
- event.data-uploaded.queue.depth
- event.data-uploaded.processing.duration
```

**Cost Per Event Model:**
- Functions: Included in Function App cost
- Queue storage: $0.05 per 10,000 operations
- Messages: Free (included in storage cost)

---

### Function Models (f.model)

For each `f.model`:

**Functions Created:**
```
GenerateReport           # POST /api/functions/generate-report
```

**Bindings** (if specified):
```
Input Bindings:
- HTTP Trigger: Always included
- Blob Input: If .bindings({ storage: ... })
- Queue Input: If .bindings({ queue: ... })

Output Bindings:
- HTTP Response: Always included
- Blob Output: If .bindings({ storage: ... })
- Queue Output: If .bindings({ queue: ... })
```

**Application Insights:**
```
Custom metrics:
- function.generate-report.invocations.count
- function.generate-report.duration
- function.generate-report.success.count
- function.generate-report.failure.count
```

**Cost Per Function Model:**
- Functions: Included in Function App cost
- Bindings: Depends on usage (storage/queue operations)

---

## Total Cost Examples

### Example 1: Minimal Blog (Development)

**Resources:**
- Function App: Consumption plan
- Cosmos DB: Serverless
- Storage: Standard LRS
- Application Insights: Basic

**Monthly Cost:** ~$10-30
- Function App: $0 (free tier)
- Cosmos DB: $5 (1 GB, 100K RUs)
- Storage: $2 (10 GB)
- Application Insights: $0 (under 5 GB)
- Key Vault: $1

---

### Example 2: Production E-Commerce

**Resources:**
- Function App: Premium EP1
- Cosmos DB: Autoscale 4000 RU/s
- Storage: GRS
- Redis: Standard C1
- Application Gateway + WAF
- DDoS Protection
- Log Analytics
- Action Groups

**Monthly Cost:** ~$3,500-4,500
- Function App: $160
- Cosmos DB: $240 (4000 RU/s autoscale)
- Storage: $50 (500 GB GRS)
- Redis: $75
- App Gateway + WAF: $300
- DDoS: $2,944
- Application Insights: $100 (40 GB)
- Log Analytics: $80 (30 GB)
- Misc: $50

---

### Example 3: Data Platform (Enterprise)

**Resources:**
- Function App: Premium EP2
- Cosmos DB: Multi-region autoscale 10K RU/s
- Storage: GRS with lifecycle
- Redis: Standard C2
- Application Gateway + WAF
- DDoS Protection
- Log Analytics
- CDN
- VNet with private endpoints

**Monthly Cost:** ~$6,000-8,000
- Function App: $320 (EP2)
- Cosmos DB: $900 (10K RU/s × 2 regions)
- Storage: $200 (2 TB GRS)
- Redis: $145
- App Gateway + WAF: $350
- DDoS: $2,944
- Application Insights: $200 (80 GB)
- Log Analytics: $150 (50 GB)
- CDN: $100 (1 TB transfer)
- VNet: $150 (private endpoints)
- Misc: $100

---

## Resource Limits

### Azure Subscription Limits

**Function Apps:**
- Per subscription: 100 (can request increase)
- Per resource group: 100

**Cosmos DB:**
- Accounts per subscription: 50 (can request increase)
- Throughput per account: 1,000,000 RU/s

**Storage Accounts:**
- Per subscription: 250
- Per account capacity: 5 PB

**Key Vaults:**
- Per subscription: 500
- Secrets per vault: 25,000

### Atakora Limits

**Schema:**
- Models per schema: Unlimited
- Fields per model: Unlimited (practical: ~100)

**Events:**
- Event models: Unlimited
- Queue message size: 64 KB (Storage Queue)
- Queue message size: 256 KB (Service Bus)

**Functions:**
- Function models: Unlimited
- Request timeout: 230s (Consumption), 600s (Premium)
- Request size: 100 MB (Consumption), 1 GB (Premium)

---

## Monitoring Resource Creation

### During Deployment

```bash
npm run deploy

# Output:
Deploying to Azure...

✅ Resource Group: my-app-prod-rg
✅ Storage Account: myappprodstorageabc123
✅ Key Vault: my-app-prod-kv
✅ Cosmos DB: my-app-prod-cosmos
   ✅ Container: users
   ✅ Container: projects
   ✅ Container: datasets
✅ Application Insights: my-app-prod-insights
✅ Function App: my-app-prod-func
   ✅ Function: CreateUser
   ✅ Function: GetUser
   ✅ Function: UpdateUser
   ✅ Function: DeleteUser
   ✅ Function: ListUsers
   ✅ Function: PublishDataUploaded
   ✅ Function: ProcessDataUploaded
   ✅ Function: GenerateReport
✅ Managed Identity: Configured

Custom Infrastructure:
✅ Redis Cache: my-app-prod-redis
✅ Application Gateway: my-app-prod-appgw
✅ WAF: Enabled
✅ DDoS Protection: my-app-prod-ddos-plan

Deployment complete! (4m 32s)

Endpoints:
https://my-app-prod-func.azurewebsites.net

Health Check:
https://my-app-prod-func.azurewebsites.net/api/health
```

### After Deployment

**Azure Portal:**
```
Navigate to Resource Group: my-app-prod-rg
View all resources in one place
```

**Atakora CLI:**
```bash
npm run atakora resources

# Lists all provisioned resources
# Shows configuration
# Displays costs
```

---

## Cleanup

### Delete All Resources

```bash
npm run atakora destroy

# Prompts for confirmation
# Deletes resource group
# All resources deleted
```

### Selective Cleanup

```bash
# Remove custom infrastructure
npm run atakora detach --resource=redis
npm run atakora deploy

# Redis cache will be deleted
# Other resources remain
```

---

## Related Documentation

- [Schema Definition](./schema.md) - Define models that create resources
- [Attach Pattern](./attach-pattern.md) - Customize infrastructure
- [Storage Configuration](./storage.md) - Database and blob storage
- [Networking Configuration](./networking.md) - VNet, WAF, DDoS
- [Monitoring Configuration](./monitoring.md) - Logging and alerts
- [Performance Configuration](./performance.md) - Cache, CDN, rate limiting
