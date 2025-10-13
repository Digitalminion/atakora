# Backend Pattern Troubleshooting Guide

Common issues and solutions when working with the Backend Pattern in @atakora/component.

## Table of Contents

- [Configuration Issues](#configuration-issues)
- [Resource Conflicts](#resource-conflicts)
- [Initialization Errors](#initialization-errors)
- [Type Safety Issues](#type-safety-issues)
- [Performance Problems](#performance-problems)
- [Network and Connectivity](#network-and-connectivity)
- [Deployment Failures](#deployment-failures)
- [Monitoring and Debugging](#monitoring-and-debugging)

---

## Configuration Issues

### Issue: "Cannot access components before backend initialization"

**Error Message:**
```
Error: Cannot access components before backend initialization.
Call initialize() or addToStack() first.
```

**Cause:**
Attempting to access `backend.components` before calling `addToStack()` or `initialize()`.

**Solution:**
```typescript
const backend = defineBackend({ ... });

// WRONG: Accessing components before initialization
// console.log(backend.components.userApi.apiEndpoint);

// Create and initialize first
const stack = new ResourceGroupStack(app, 'Stack', { ... });
backend.addToStack(stack);

// CORRECT: Access after initialization
console.log(backend.components.userApi.apiEndpoint);
```

---

### Issue: "Backend must have at least one component"

**Error Message:**
```
Error: Backend must have at least one component
```

**Cause:**
Calling `defineBackend()` with an empty component map.

**Solution:**
```typescript
// WRONG: Empty component map
const backend = defineBackend({});

// CORRECT: At least one component
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... })
});
```

---

### Issue: Conflicting Resource Requirements

**Error Message:**
```
Error: Conflicting consistency requirements for Cosmos DB
  Component A requires: Session
  Component B requires: Strong
  Resolution: Use priority-based selection or align requirements
```

**Cause:**
Multiple components have incompatible resource requirements.

**Solution 1: Align Requirements**
```typescript
// Make all components use the same consistency level
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    // ... config
    consistency: 'Session' // Align with other components
  }),

  productApi: CrudApi.define('ProductApi', {
    // ... config
    consistency: 'Session' // Same consistency
  })
});
```

**Solution 2: Use Priority**
```typescript
// Higher priority requirement wins
const backend = defineBackend({
  criticalApi: CrudApi.define('CriticalApi', {
    // ... config
    consistency: 'Strong',
    priority: 30 // Higher priority
  }),

  normalApi: CrudApi.define('NormalApi', {
    // ... config
    consistency: 'Session',
    priority: 10 // Lower priority (will use Strong from above)
  })
});
```

**Solution 3: Separate Backends**
```typescript
// Create separate backends for incompatible requirements
const strongConsistencyBackend = defineBackend({
  criticalApi: CrudApi.define('CriticalApi', {
    // ... config with Strong consistency
  })
});

const sessionConsistencyBackend = defineBackend({
  normalApi: CrudApi.define('NormalApi', {
    // ... config with Session consistency
  })
});
```

---

## Resource Conflicts

### Issue: Resource Limit Exceeded

**Error Message:**
```
Error: ResourceLimitError: Maximum Cosmos DB accounts exceeded
  Limit: 1
  Requested: 2
  Current: 1
```

**Cause:**
Backend configuration has resource limits that prevent additional resources from being created.

**Solution 1: Increase Limits**
```typescript
const backend = defineBackend({ ... }, {
  limits: {
    maxCosmosAccounts: 2, // Increase limit
    maxFunctionApps: 2,
    maxStorageAccounts: 3
  }
});
```

**Solution 2: Share More Aggressively**
```typescript
// Ensure components share resources
// Check that requirementKey is the same for resources that should be shared
const backend = defineBackend({
  api1: CrudApi.define('Api1', {
    // Will share Cosmos DB if requirements are compatible
    ...
  }),
  api2: CrudApi.define('Api2', {
    // Will share same Cosmos DB
    ...
  })
});
```

**Solution 3: Split into Multiple Backends**
```typescript
// Create separate backends if truly need separate resources
const backend1 = defineBackend({
  api1: CrudApi.define('Api1', { ... })
});

const backend2 = defineBackend({
  api2: CrudApi.define('Api2', { ... })
});
```

---

### Issue: Duplicate Component IDs

**Error Message:**
```
Error: DuplicateComponentError: Component with ID 'UserApi' already exists
```

**Cause:**
Two components defined with the same ID.

**Solution:**
```typescript
// WRONG: Duplicate IDs
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),
  userApi2: CrudApi.define('UserApi', { ... }) // Same ID!
});

// CORRECT: Unique IDs
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),
  adminUserApi: CrudApi.define('AdminUserApi', { ... }) // Different ID
});
```

---

## Initialization Errors

### Issue: Missing Required Resources

**Error Message:**
```
ValidationError: Component 'UserApi' missing required resources
  Missing: cosmos:UserApi-cosmos
```

**Cause:**
Component's resource requirements weren't met during initialization.

**Debug Steps:**

1. **Check Resource Provisioning:**
```typescript
// Add logging to see what resources were created
const backend = defineBackend({ ... });
backend.addToStack(stack);

// Check available resources
const resources = backend.resources;
console.log('Available resources:', Array.from(resources.keys()));
```

2. **Verify Requirement Keys:**
```typescript
// Ensure requirement keys match what's being looked up
const userApi = CrudApi.define('UserApi', { ... });
const requirements = userApi.getRequirements();
console.log('Requirements:', requirements.map(r => r.requirementKey));
```

3. **Check Provider Registration:**
```typescript
// Ensure all required providers are registered
const backend = defineBackend({ ... }, {
  providers: [
    new CosmosProvider(),
    new FunctionsProvider(),
    new StorageProvider()
    // Add any custom providers
  ]
});
```

---

### Issue: Provider Not Found

**Error Message:**
```
Error: MissingProviderError: No provider found for resource type 'servicebus'
  Supported types: cosmos, functions, storage
```

**Cause:**
No provider registered for the required resource type.

**Solution:**
```typescript
import { ServiceBusProvider } from './custom-providers/service-bus-provider';

const backend = defineBackend({ ... }, {
  providers: [
    // Default providers
    new CosmosProvider(),
    new FunctionsProvider(),
    new StorageProvider(),
    // Add custom provider
    new ServiceBusProvider()
  ]
});
```

---

## Type Safety Issues

### Issue: TypeScript Compilation Errors

**Error Message:**
```
error TS2339: Property 'userApi' does not exist on type 'components'
```

**Cause:**
TypeScript can't infer component types, usually due to incorrect usage.

**Solution 1: Ensure Proper Type Inference**
```typescript
// Make sure you're using const for backend
const backend = defineBackend({ // Use 'const', not 'let' or 'var'
  userApi: CrudApi.define('UserApi', { ... })
});

// TypeScript will infer the correct type
backend.components.userApi; // ✓ Type safe
```

**Solution 2: Explicit Type Annotation**
```typescript
import type { TypedBackend, ComponentMap } from '@atakora/component/backend';

const components = {
  userApi: CrudApi.define('UserApi', { ... }),
  productApi: CrudApi.define('ProductApi', { ... })
} as const; // Important: 'as const'

const backend = defineBackend(components);

// Type is fully inferred
type MyBackend = typeof backend;
```

---

### Issue: "Cannot use namespace as a value"

**Error Message:**
```
error TS2349: This expression is not callable.
  Type 'typeof import("@atakora/component/backend")' has no call signatures.
```

**Cause:**
Incorrect import of `defineBackend`.

**Solution:**
```typescript
// WRONG: Importing the namespace
import * as Backend from '@atakora/component/backend';
const backend = Backend.defineBackend({ ... }); // Error

// CORRECT: Import the function directly
import { defineBackend } from '@atakora/component/backend';
const backend = defineBackend({ ... }); // ✓ Works
```

---

## Performance Problems

### Issue: Slow Synthesis Time

**Symptom:**
`npx atakora synth` takes several minutes to complete.

**Causes and Solutions:**

**1. Too Many Components**
```typescript
// If you have 50+ components, consider splitting
// SLOW: Single backend with 50 components
const backend = defineBackend({
  api1: ..., api2: ..., /* ... 48 more */
});

// FASTER: Multiple smaller backends
const backend1 = defineBackend({ api1: ..., api2: ..., api3: ... });
const backend2 = defineBackend({ api4: ..., api5: ..., api6: ... });
```

**2. Complex Resource Requirements**
```typescript
// Avoid overly complex configurations
// SLOW: Too much configuration to process
const backend = defineBackend({
  api: CrudApi.define('Api', {
    databases: [/* 50 databases with 100 containers each */]
  })
});

// FASTER: Reasonable configuration
const backend = defineBackend({
  api: CrudApi.define('Api', {
    databases: [/* 5-10 databases with 10-20 containers */]
  })
});
```

**3. Enable Parallelization**
```bash
# Use parallel flag if available
npx atakora synth --parallel

# Or split into multiple stacks
npx atakora synth stack1 &
npx atakora synth stack2 &
wait
```

---

### Issue: High Cosmos DB Costs

**Symptom:**
Cosmos DB costs higher than expected despite using Backend Pattern.

**Debug and Fix:**

**1. Check Throughput Settings**
```typescript
// High throughput = high cost
// Check your configuration
const backend = defineBackend({
  api: CrudApi.define('Api', {
    throughput: 4000 // RU/s - expensive!
  })
});

// Use serverless for variable workloads
const backend = defineBackend({
  api: CrudApi.define('Api', {
    enableServerless: true // Pay per request
  })
});
```

**2. Verify Resource Sharing**
```typescript
// Ensure components are actually sharing
backend.addToStack(stack);

// Check resource count
const cosmosResources = Array.from(backend.resources.entries())
  .filter(([key]) => key.startsWith('cosmos:'));

console.log(`Cosmos DB resources: ${cosmosResources.length}`);
// Should be 1 if sharing correctly

if (cosmosResources.length > 1) {
  console.warn('Multiple Cosmos DB accounts created - may not be sharing correctly!');
}
```

**3. Enable TTL for Cleanup**
```typescript
// Old data costs money
const backend = defineBackend({
  api: CrudApi.define('Api', {
    ttl: 2592000 // 30 days - auto-delete old data
  })
});
```

---

## Network and Connectivity

### Issue: Function App Can't Connect to Cosmos DB

**Error Message (in logs):**
```
Error: Unable to connect to Cosmos DB
  Connection refused
```

**Causes and Solutions:**

**1. Firewall Rules**
```typescript
// Ensure Function App IP is allowed
const backend = defineBackend({ ... }, {
  cosmosConfig: {
    publicNetworkAccess: 'Enabled',
    ipRules: [
      // Add Function App outbound IPs
      '40.112.123.45',
      '40.112.123.46'
    ]
  }
});
```

**2. VNet Integration Issues**
```typescript
// If using VNet integration, ensure subnet has service endpoints
const backend = defineBackend({ ... }, {
  networking: {
    mode: 'isolated',
    vnetName: 'myapp-vnet',
    subnetName: 'backend-subnet', // Must have Microsoft.AzureCosmosDB service endpoint
    privateEndpoints: true
  }
});

// Check subnet configuration
// az network vnet subnet show --resource-group rg --vnet-name myapp-vnet --name backend-subnet
// Ensure serviceEndpoints includes 'Microsoft.AzureCosmosDB'
```

**3. Managed Identity Permissions**
```bash
# Verify Function App has permissions to access Cosmos DB
az role assignment list \
  --assignee <function-app-identity> \
  --scope <cosmos-db-id> \
  --output table

# If missing, add role assignment
az cosmosdb sql role assignment create \
  --account-name <cosmos-account> \
  --resource-group <rg> \
  --scope "/" \
  --principal-id <function-app-identity> \
  --role-definition-id <cosmos-data-contributor-role>
```

---

### Issue: CORS Errors in Browser

**Error Message (browser console):**
```
Access to fetch at 'https://func-app.azurewebsites.net/api/users' from origin 'https://myapp.com'
has been blocked by CORS policy
```

**Solution:**
```typescript
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    // ... config
    cors: {
      allowedOrigins: [
        'https://myapp.com',
        'https://www.myapp.com',
        'http://localhost:3000' // For local development
      ]
    }
  })
});
```

**Development Override:**
```typescript
// Allow all origins in development only
const isDev = process.env.NODE_ENV === 'development';

const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    cors: {
      allowedOrigins: isDev ? ['*'] : ['https://myapp.com']
    }
  })
});
```

---

## Deployment Failures

### Issue: "Resource already exists"

**Error Message:**
```
Error: A resource with ID 'cosmos-myapp-prod' already exists
```

**Causes and Solutions:**

**1. Previous Deployment Not Cleaned Up**
```bash
# Check existing resources
az resource list --resource-group rg-myapp-prod --output table

# Delete old resources
az resource delete --ids <resource-id>

# Or destroy entire stack
npx atakora destroy
```

**2. Name Collision**
```typescript
// Use unique names per environment
const backend = defineBackend({ ... }, {
  environment: 'prod', // Make sure this is unique
  naming: {
    formatResourceName: (type, backendId, suffix) =>
      `${type}-${backendId}-${Date.now()}-${suffix}` // Add timestamp for uniqueness
  }
});
```

---

### Issue: Deployment Timeout

**Error Message:**
```
Error: Deployment timed out after 30 minutes
```

**Solutions:**

**1. Increase Timeout**
```bash
# Increase deployment timeout
npx atakora deploy --timeout 60 # 60 minutes
```

**2. Deploy in Stages**
```typescript
// Split into multiple stacks that can deploy independently
const dataBackend = defineBackend({
  dataApi: CrudApi.define('DataApi', { ... })
});

const computeBackend = defineBackend({
  processorApp: FunctionsApp.define('ProcessorApp', { ... })
});

// Deploy separately
// npx atakora deploy --stack data-stack
// npx atakora deploy --stack compute-stack
```

**3. Reduce Resource Count**
```typescript
// If creating too many resources at once, reduce batch size
// Instead of 20 APIs in one backend, create 2 backends with 10 each
```

---

## Monitoring and Debugging

### Issue: Can't Find Application Insights Data

**Symptom:**
Application Insights shows no data even though backend is deployed.

**Debug Steps:**

**1. Verify Monitoring is Enabled**
```typescript
const backend = defineBackend({ ... }, {
  monitoring: {
    enabled: true, // Must be true
    retentionDays: 90
  }
});
```

**2. Check Instrumentation Key**
```bash
# Verify Function App has APPINSIGHTS_INSTRUMENTATIONKEY
az functionapp config appsettings list \
  --name <function-app-name> \
  --resource-group <rg> \
  --query "[?name=='APPINSIGHTS_INSTRUMENTATIONKEY']"
```

**3. Wait for Data Ingestion**
```
# Application Insights has latency
# Data may take 2-5 minutes to appear
# Wait and refresh
```

**4. Query Directly**
```kusto
// In Application Insights, run direct query
requests
| where timestamp > ago(1h)
| summarize count() by bin(timestamp, 5m)
```

---

### Issue: Missing Component Outputs

**Error:**
```typescript
const outputs = backend.components.userApi.getOutputs();
console.log(outputs.apiEndpoint); // undefined
```

**Cause:**
Component hasn't implemented `getOutputs()` correctly or hasn't been initialized.

**Solution:**
```typescript
// 1. Ensure backend is initialized
backend.addToStack(stack);

// 2. Wait for synth to complete
app.synth();

// 3. Then access outputs
const outputs = backend.components.userApi.getOutputs();

// 4. Check that outputs exist
if (!outputs.apiEndpoint) {
  console.error('API endpoint not available in outputs');
  console.log('Available outputs:', Object.keys(outputs));
}
```

---

### Issue: Enable Detailed Logging

**Need more debugging information?**

```typescript
import { setGlobalLogLevel, LogLevel } from '@atakora/component/backend';

// Enable debug logging
setGlobalLogLevel(LogLevel.DEBUG);

const backend = defineBackend({ ... });

// You'll see detailed logs like:
// [DEBUG] [define-backend] Creating typed backend with 3 components
// [DEBUG] [define-backend] Registering component: UserApi (CrudApi)
// [DEBUG] [cosmos-provider] Merging 3 Cosmos DB requirements
// [DEBUG] [cosmos-provider] Created Cosmos DB account: cosmos-shared-prod
```

---

## Common Error Messages Quick Reference

| Error | Quick Fix |
|-------|-----------|
| "Cannot access components before initialization" | Call `backend.addToStack()` before accessing components |
| "Backend must have at least one component" | Add at least one component to `defineBackend()` |
| "Conflicting consistency requirements" | Align component configs or use priorities |
| "Resource limit exceeded" | Increase limits in backend config or split backends |
| "Duplicate component ID" | Ensure all component IDs are unique |
| "Missing required resources" | Check provider registration and requirement keys |
| "No provider found for type X" | Register custom provider for that resource type |
| "Property X does not exist" | Check TypeScript types and ensure proper inference |
| "Resource already exists" | Clean up previous deployment or use unique names |
| "Deployment timed out" | Increase timeout or split into multiple stacks |

---

## Getting Help

If you can't resolve your issue:

1. **Check Documentation**
   - [Backend Pattern Overview](./overview.md)
   - [API Reference](./api-reference.md)
   - [Basic Examples](./examples/basic-examples.md)
   - [Advanced Examples](./examples/advanced-examples.md)

2. **Enable Debug Logging**
   ```typescript
   setGlobalLogLevel(LogLevel.DEBUG);
   ```

3. **Check Validation**
   ```typescript
   const validation = backend.validate();
   if (!validation.valid) {
     console.error(validation.errors);
     console.warn(validation.warnings);
   }
   ```

4. **Open an Issue**
   - Include error message
   - Include minimal reproduction code
   - Include debug logs
   - Describe expected vs actual behavior

5. **Community Support**
   - GitHub Discussions
   - Stack Overflow (tag: `atakora`)
   - Discord Server

---

## See Also

- [Backend Pattern Overview](./overview.md)
- [API Reference](./api-reference.md)
- [Best Practices](./best-practices.md)
- [Migration Guide](./migration-guide.md)
- [Architecture Documentation](../../../../architecture/decisions/backend-architecture-design.md)
