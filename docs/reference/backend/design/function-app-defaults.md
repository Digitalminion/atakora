# Function App Default Configuration

This document describes the default Azure Functions App configuration that Atakora provisions automatically.

## Overview

The Function App hosts all your REST APIs, event processors, and custom functions. Atakora configures it with sensible defaults that work for most applications.

## Default Configuration

### Development Environment

```typescript
NODE_ENV=development
```

**Hosting Plan:**
```yaml
Plan Type: Consumption
SKU: Y1
OS: Linux
Runtime: Node.js 20 LTS
```

**Scaling:**
```yaml
Min Instances: 0
Max Instances: 200
Scale-Out Strategy: Event-driven
Cold Start: 1-3 seconds
```

**Performance:**
```yaml
Always On: false
HTTP/2: false
Timeout: 230 seconds (max for Consumption)
Max Concurrent Requests: 100 per instance
Memory: 1536 MB per instance
```

**Networking:**
```yaml
Public Access: Enabled
VNet Integration: Disabled
Private Endpoints: Disabled
IP Restrictions: None
```

**Deployment:**
```yaml
Method: Run from package (zip deployment)
Source: Build output
Deployment Slots: None
```

**Cost:**
- **Free tier:** 1M executions/month + 400,000 GB-s
- **After free tier:** $0.20 per 1M executions + $0.000016 per GB-s
- **Typical dev cost:** $0-5/month

---

### Production Environment

```typescript
NODE_ENV=production
```

**Hosting Plan:**
```yaml
Plan Type: Premium
SKU: EP1 (Elastic Premium 1)
OS: Linux
Runtime: Node.js 20 LTS
```

**Scaling:**
```yaml
Min Instances: 2
Max Instances: 20
Scale-Out Strategy: CPU, Memory, HTTP Queue Length
Cold Start: <100ms (pre-warmed instances)
```

**Auto-Scale Rules:**
```yaml
Scale Out When:
  - CPU > 70% for 5 minutes
  - Memory > 80% for 5 minutes
  - HTTP Queue Length > 100

Scale In When:
  - CPU < 30% for 10 minutes
  - Memory < 40% for 10 minutes
  - HTTP Queue Length < 10

Cooldown:
  - Scale Out: 3 minutes
  - Scale In: 5 minutes
```

**Performance:**
```yaml
Always On: true
HTTP/2: true
Timeout: 600 seconds (10 minutes)
Max Concurrent Requests: 100 per instance
Memory: 3584 MB per instance (EP1)
```

**Networking:**
```yaml
Public Access: Enabled
VNet Integration: Disabled (unless custom)
Private Endpoints: Disabled (unless custom)
IP Restrictions: None (unless custom)
HTTPS Only: true
Minimum TLS: 1.2
```

**Deployment:**
```yaml
Method: Run from package (zip deployment)
Source: Build output
Deployment Slots: 1 (staging)
Sticky Settings: ENVIRONMENT, NODE_ENV
Swap with Preview: Enabled
```

**Health Checks:**
```yaml
Enabled: true
Path: /api/health
Interval: 30 seconds
Unhealthy Threshold: 3 failed checks
```

**Cost:**
- **Base:** $160/month (EP1, 1 instance)
- **Additional instances:** $160/month each
- **Typical prod cost:** $320-640/month (2-4 instances)

---

## Runtime Configuration

### Node.js Runtime

```yaml
Version: 20 LTS
Package Manager: npm
Module System: ESM (ES Modules)
```

**Environment Variables:**
```bash
# Automatically set by Atakora
NODE_ENV=development|production
FUNCTIONS_WORKER_RUNTIME=node
FUNCTIONS_EXTENSION_VERSION=~4
WEBSITE_NODE_DEFAULT_VERSION=~20

# Application settings
WEBSITE_RUN_FROM_PACKAGE=1
WEBSITE_CONTENTAZUREFILECONNECTIONSTRING=<auto>
WEBSITE_CONTENTSHARE=<auto>

# Instrumentation
APPINSIGHTS_INSTRUMENTATIONKEY=<auto>
APPLICATIONINSIGHTS_CONNECTION_STRING=<auto>
```

### Function Settings

**Per-Function Defaults:**
```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "post", "put", "delete"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ],
  "scriptFile": "../dist/handlers/users.js",
  "entryPoint": "handler"
}
```

**host.json:**
```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20,
        "evaluationInterval": "01:00:00",
        "initialSamplingPercentage": 100.0,
        "samplingPercentageIncreaseTimeout": "00:00:01",
        "samplingPercentageDecreaseTimeout": "00:00:01",
        "minSamplingPercentage": 0.1,
        "maxSamplingPercentage": 100.0
      }
    },
    "logLevel": {
      "default": "Information",
      "Function": "Information",
      "Host.Results": "Error",
      "Host.Aggregator": "Information"
    }
  },
  "functionTimeout": "00:10:00",
  "extensions": {
    "http": {
      "routePrefix": "api",
      "maxOutstandingRequests": 200,
      "maxConcurrentRequests": 100,
      "dynamicThrottlesEnabled": true
    }
  }
}
```

---

## Generated Functions

### From CRUD Models (c.model)

For each CRUD model, 5 functions are generated:

**Example: User Model**
```
CreateUser     → POST   /api/users
GetUser        → GET    /api/users/{id}
UpdateUser     → PUT    /api/users/{id}
DeleteUser     → DELETE /api/users/{id}
ListUsers      → GET    /api/users
```

**Default Behavior:**
```typescript
// CreateUser
async function createUser(req: HttpRequest): Promise<HttpResponse> {
  // 1. Validate input against schema
  // 2. Check authentication
  // 3. Check authorization
  // 4. Run beforeCreate hooks
  // 5. Generate ID
  // 6. Add timestamps (createdAt, updatedAt)
  // 7. Insert into Cosmos DB
  // 8. Run afterCreate hooks
  // 9. Return 201 Created with resource
}

// GetUser
async function getUser(req: HttpRequest): Promise<HttpResponse> {
  // 1. Check authentication
  // 2. Get from Cosmos DB
  // 3. Check authorization (can user read this?)
  // 4. Return 200 OK with resource (or 404 Not Found)
}

// UpdateUser
async function updateUser(req: HttpRequest): Promise<HttpResponse> {
  // 1. Validate input against schema
  // 2. Check authentication
  // 3. Get existing resource
  // 4. Check authorization (can user update?)
  // 5. Run beforeUpdate hooks
  // 6. Update timestamps (updatedAt)
  // 7. Update in Cosmos DB (optimistic concurrency)
  // 8. Run afterUpdate hooks
  // 9. Return 200 OK with updated resource
}

// DeleteUser
async function deleteUser(req: HttpRequest): Promise<HttpResponse> {
  // 1. Check authentication
  // 2. Get existing resource
  // 3. Check authorization (can user delete?)
  // 4. Run beforeDelete hooks
  // 5. Delete from Cosmos DB (or soft delete if enabled)
  // 6. Run afterDelete hooks
  // 7. Return 204 No Content
}

// ListUsers
async function listUsers(req: HttpRequest): Promise<HttpResponse> {
  // 1. Check authentication
  // 2. Parse query parameters (filters, pagination, sorting)
  // 3. Apply authorization filters
  // 4. Query Cosmos DB
  // 5. Return 200 OK with results + pagination metadata
}
```

---

### From Event Models (e.model)

For each event model, 2 functions are generated:

**Example: DataUploaded Event**
```
PublishDataUploaded    → POST /api/events/data-uploaded (HTTP trigger)
ProcessDataUploaded    → Queue trigger
```

**Publish Function (HTTP Trigger):**
```typescript
async function publishDataUploaded(req: HttpRequest): Promise<HttpResponse> {
  // 1. Validate input against event schema
  // 2. Check authentication
  // 3. Check authorization (can user publish this event?)
  // 4. Validate business rules (if any)
  // 5. Write to Azure Storage Queue
  // 6. Log event to Application Insights
  // 7. Return 202 Accepted with eventId and queuedAt
}
```

**Processor Function (Queue Trigger):**
```typescript
async function processDataUploaded(queueMessage: QueueMessage): Promise<void> {
  // 1. Parse message
  // 2. Validate schema (redundant check)
  // 3. Log processing start
  // 4. Execute custom processor (or default: log event)
  // 5. Log processing complete
  // 6. Acknowledge message (auto-deleted from queue)

  // On error:
  // - Retry with exponential backoff (up to maxRetries)
  // - After maxRetries, move to dead letter queue
}
```

---

### From Function Models (f.model)

For each function model, 1 function is generated:

**Example: GenerateReport Function**
```
GenerateReport → POST /api/functions/generate-report (HTTP trigger)
```

**Default Behavior:**
```typescript
async function generateReport(req: HttpRequest): Promise<HttpResponse> {
  // 1. Validate input against input schema
  // 2. Check authentication
  // 3. Check authorization
  // 4. Execute custom handler (or default: 501 Not Implemented)
  // 5. Validate output against output schema
  // 6. Log execution metrics
  // 7. Return 200 OK with output
}
```

---

## Middleware Stack

All functions go through this middleware stack:

```
1. HTTP Request
   ↓
2. HTTPS Redirect (if HTTP)
   ↓
3. CORS Handler
   ↓
4. Request ID Generation
   ↓
5. Request Logging (start)
   ↓
6. Authentication
   ↓
7. Authorization
   ↓
8. Input Validation
   ↓
9. Function Handler
   ↓
10. Output Validation
   ↓
11. Error Handler
   ↓
12. Response Logging (end)
   ↓
13. Application Insights
   ↓
14. HTTP Response
```

---

## Error Handling

### Default Error Responses

**400 Bad Request** - Validation error:
```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "requestId": "abc-123-def"
}
```

**401 Unauthorized** - Authentication error:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "requestId": "abc-123-def"
}
```

**403 Forbidden** - Authorization error:
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions",
  "requiredRoles": ["Admin"],
  "requestId": "abc-123-def"
}
```

**404 Not Found** - Resource not found:
```json
{
  "error": "Not Found",
  "message": "Resource not found",
  "requestId": "abc-123-def"
}
```

**500 Internal Server Error** - Unexpected error:
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "requestId": "abc-123-def"
}
```

### Error Logging

All errors are automatically logged to Application Insights:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "error",
  "message": "Database query failed",
  "error": {
    "name": "CosmosException",
    "message": "Request rate is large",
    "statusCode": 429
  },
  "function": "GetUser",
  "requestId": "abc-123-def",
  "userId": "user123",
  "endpoint": "GET /api/users/user456",
  "duration": 1234
}
```

---

## Performance Characteristics

### Cold Start Times

**Consumption Plan:**
```
First request after idle: 1-3 seconds
- Download package: 500ms
- Initialize runtime: 500ms-1s
- Load app code: 500ms-1s

Subsequent requests: <50ms
```

**Premium Plan (Always On):**
```
All requests: <100ms
- Pre-warmed instances
- No initialization delay
```

### Request Latency

**CRUD Operations:**
```
P50: 20ms
P95: 50ms
P99: 100ms

Breakdown:
- Middleware: 5ms
- Database query: 10-40ms
- Response: 5ms
```

**Event Publishing:**
```
P50: 10ms
P95: 30ms
P99: 50ms

Breakdown:
- Middleware: 5ms
- Queue write: 5-25ms
- Response: 5ms
```

**Custom Functions:**
```
Depends on implementation
Timeout: 230s (Consumption), 600s (Premium)
```

### Throughput

**Consumption Plan:**
```
Per function: ~200 requests/second
Per instance: ~200 requests/second total
Max instances: 200
Max throughput: ~40,000 requests/second
```

**Premium Plan (EP1):**
```
Per instance: ~100 requests/second
Min instances: 2
Max instances: 20
Max throughput: ~2,000 requests/second
```

---

## Monitoring

### Automatic Metrics

Application Insights automatically tracks:

```yaml
Request Metrics:
  - requests.total
  - requests.duration (P50, P95, P99)
  - requests.success
  - requests.failed
  - requests.rate

Dependency Metrics:
  - dependencies.cosmosdb.duration
  - dependencies.cosmosdb.success
  - dependencies.storage.duration
  - dependencies.http.duration

System Metrics:
  - memory.usage
  - cpu.usage
  - gc.duration
  - exceptions.count

Custom Metrics:
  - function.{name}.invocations
  - function.{name}.duration
  - function.{name}.success
  - function.{name}.failure
```

### Log Levels

**Development:**
```
default: Debug
Function: Debug
Host: Information
```

**Production:**
```
default: Information
Function: Information
Host: Warning
```

---

## When to Override Defaults

### Use Defaults When:
- ✅ Building MVP or prototype
- ✅ Traffic < 10 requests/second
- ✅ Functions complete in < 30 seconds
- ✅ Standard CRUD operations
- ✅ No special networking requirements

### Override When:
- ⚠️ High traffic (>100 requests/second)
- ⚠️ Long-running functions (>5 minutes)
- ⚠️ Need VNet integration
- ⚠️ Need private endpoints
- ⚠️ Need more than 20 instances
- ⚠️ Need custom domain
- ⚠️ Need deployment slots

### Override Example:

```typescript
import { defineCompute, compute } from '@atakora/component/compute';

export const functions = defineCompute({
  FunctionApp: compute.functionApp()
    .plan('Premium')
    .sku('EP2')                // 2× memory, 2× price
    .runtime('node', '20')
    .alwaysOn(true)
    .scale(scale =>
      scale
        .min(4)                // 4 instances minimum
        .max(50)               // 50 instances maximum
        .rule('cpu-scale', rule =>
          rule
            .metric('CpuPercentage')
            .threshold(60)     // Scale at 60% CPU
            .scaleBy(3)        // Add 3 instances at a time
        )
    )
    .performance(perf =>
      perf
        .http2(true)
        .timeout(900)          // 15 minutes
        .maxConcurrentRequests(200)
    )
    .vnet(vnet =>
      vnet
        .enable()
        .subnet(process.env.FUNCTION_SUBNET_ID!)
        .routeAll()
    ),
});

// Attach to backend
backend.compute.functionApp.attach(functions.FunctionApp);
```

---

## Related Documentation

- [Cosmos DB Defaults](./cosmos-db-defaults.md) - Database configuration
- [Storage Defaults](./storage-defaults.md) - Storage configuration
- [Compute Configuration](../compute.md) - Override compute settings
- [Performance Tuning](../performance-tuning.md) - Optimization guide
