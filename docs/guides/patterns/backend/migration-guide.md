# Migration Guide: Traditional to Backend Pattern

This guide will help you migrate existing @atakora/component code from the traditional pattern to the new Backend Pattern, unlocking significant cost savings and simplified resource management.

## Table of Contents

- [Overview](#overview)
- [Benefits of Migration](#benefits-of-migration)
- [Breaking Changes](#breaking-changes)
- [Migration Strategy](#migration-strategy)
- [Step-by-Step Migration](#step-by-step-migration)
- [Component-Specific Migrations](#component-specific-migrations)
- [Testing Your Migration](#testing-your-migration)
- [Rollback Plan](#rollback-plan)
- [Common Migration Patterns](#common-migration-patterns)
- [FAQ](#faq)

## Overview

The Backend Pattern is a new (opt-in) way to use @atakora/component that enables multiple components to share infrastructure resources efficiently. Migration is straightforward and **100% backward compatible** - your existing code will continue to work unchanged.

### What Changes?

**Before (Traditional Pattern):**
```typescript
// Each component creates its own resources
const userApi = new CrudApi(stack, 'UserApi', { ... });
const productApi = new CrudApi(stack, 'ProductApi', { ... });
```

**After (Backend Pattern):**
```typescript
// Components share resources via backend orchestration
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),
  productApi: CrudApi.define('ProductApi', { ... })
});

backend.addToStack(stack);
```

The only real difference is:
1. Use `Component.define()` instead of `new Component()`
2. Wrap definitions in `defineBackend()`
3. Call `backend.addToStack()` instead of constructing directly

Everything else stays the same!

## Benefits of Migration

### Cost Savings

Real-world impact for a typical application:

| Scale | Traditional Cost | Backend Pattern Cost | Monthly Savings | Annual Savings |
|-------|------------------|---------------------|-----------------|----------------|
| 3 APIs | ~$111/month | ~$37/month | $74/month | $888/year |
| 5 APIs | ~$185/month | ~$55/month | $130/month | $1,560/year |
| 10 APIs | ~$370/month | ~$110/month | $260/month | $3,120/year |
| 20 APIs | ~$740/month | ~$220/month | $520/month | $6,240/year |

### Resource Reduction

| Components | Traditional Resources | Backend Resources | Reduction |
|------------|----------------------|-------------------|-----------|
| 3 | 9 resources | 3 resources | 67% |
| 5 | 15 resources | 3 resources | 80% |
| 10 | 30 resources | 3-6 resources | 75-80% |
| 20 | 60 resources | 3-9 resources | 70-85% |

### Operational Benefits

- Fewer resources to monitor and maintain
- Simplified security configuration
- Faster deployment times
- Better resource utilization
- Coordinated scaling

## Breaking Changes

**Good news: There are ZERO breaking changes!**

The Backend Pattern is completely opt-in:

- Existing code continues to work unchanged
- No deprecated APIs
- No removed functionality
- Traditional and backend patterns can coexist in the same codebase

You can migrate components progressively, testing as you go.

## Migration Strategy

### Recommended Approach: Progressive Migration

Migrate components incrementally to minimize risk:

1. **Phase 1: Non-Production Environments**
   - Start with dev/test environments
   - Migrate 1-2 components
   - Validate functionality
   - Monitor resource usage

2. **Phase 2: Expand Non-Production**
   - Migrate remaining dev/test components
   - Run full test suites
   - Verify performance
   - Document any issues

3. **Phase 3: Staging/Pre-Production**
   - Apply learnings from dev/test
   - Migrate staging components
   - Run load tests
   - Validate monitoring and alerting

4. **Phase 4: Production Rollout**
   - Plan maintenance window
   - Migrate production components
   - Monitor closely for 24-48 hours
   - Have rollback plan ready

### Alternative: Big Bang Migration

If you have good test coverage and confidence:

1. Migrate all components at once
2. Test thoroughly in pre-production
3. Deploy to production during maintenance window

## Step-by-Step Migration

### Step 1: Audit Current Components

Identify all components in your codebase:

```bash
# Find all component instantiations
grep -r "new CrudApi" src/
grep -r "new FunctionsApp" src/
grep -r "new StaticSiteWithCdn" src/
```

Create an inventory:

```
Component Inventory:
- UserApi (CrudApi) - stack: main-stack.ts:15
- ProductApi (CrudApi) - stack: main-stack.ts:25
- OrderApi (CrudApi) - stack: main-stack.ts:35
- ProcessorApp (FunctionsApp) - stack: worker-stack.ts:10
```

### Step 2: Identify Migration Candidates

Good candidates for backend pattern:
- Multiple components of same type (CrudApi, FunctionsApp)
- Components with similar resource requirements
- Components in same region/environment
- Components that don't need strict resource isolation

Poor candidates:
- Single standalone component
- Components with vastly different resource needs
- Components requiring separate security boundaries
- Components in different regions

### Step 3: Update Imports

Add the backend import:

```typescript
// Add this import
import { defineBackend } from '@atakora/component/backend';

// Keep existing imports
import { CrudApi } from '@atakora/component/crud';
import { FunctionsApp } from '@atakora/component/functions';
import { ResourceGroupStack } from '@atakora/cdk';
```

### Step 4: Convert Component Instantiations

**Before:**
```typescript
const userApi = new CrudApi(stack, 'UserApi', {
  entityName: 'User',
  schema: {
    id: 'string',
    name: 'string',
    email: 'string'
  },
  partitionKey: '/id'
});

const productApi = new CrudApi(stack, 'ProductApi', {
  entityName: 'Product',
  schema: {
    id: 'string',
    name: 'string',
    price: 'number'
  },
  partitionKey: '/id'
});
```

**After:**
```typescript
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: {
      id: 'string',
      name: 'string',
      email: 'string'
    },
    partitionKey: '/id'
  }),

  productApi: CrudApi.define('ProductApi', {
    entityName: 'Product',
    schema: {
      id: 'string',
      name: 'string',
      price: 'number'
    },
    partitionKey: '/id'
  })
});

backend.addToStack(stack);
```

Key changes:
1. Replace `new CrudApi(stack, 'UserApi', config)` with `CrudApi.define('UserApi', config)`
2. Remove `stack` parameter from component creation
3. Wrap definitions in `defineBackend({ ... })`
4. Call `backend.addToStack(stack)` to provision

### Step 5: Update Component References

**Before:**
```typescript
// Direct property access
console.log(userApi.apiEndpoint);
console.log(productApi.database.resourceId);
```

**After:**
```typescript
// Access via backend.components
console.log(backend.components.userApi.apiEndpoint);
console.log(backend.components.productApi.database.resourceId);
```

**TypeScript Tip:** The `backend.components` object is fully typed, so you'll get autocomplete and type checking!

### Step 6: Update Outputs and Cross-References

**Before:**
```typescript
// Direct references between components
const processorApp = new FunctionsApp(stack, 'ProcessorApp', {
  environmentVariables: {
    USER_API_ENDPOINT: userApi.apiEndpoint
  }
});
```

**After:**
```typescript
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),

  processorApp: FunctionsApp.define('ProcessorApp', {
    // Reference will be resolved during initialization
    environmentVariables: {
      USER_API_ENDPOINT: '${userApi.apiEndpoint}'
    }
  })
});
```

Or use `getOutputs()` for dynamic references:

```typescript
backend.addToStack(stack);

// After initialization, get outputs
const userApiOutputs = backend.components.userApi.getOutputs();
console.log('User API endpoint:', userApiOutputs.apiEndpoint);
```

### Step 7: Add Backend Configuration (Optional)

Enhance your backend with configuration:

```typescript
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),
  productApi: CrudApi.define('ProductApi', { ... })
}, {
  // Optional configuration
  environment: 'production',
  location: 'eastus',
  monitoring: {
    enabled: true,
    retentionDays: 90
  },
  tags: {
    project: 'myapp',
    team: 'backend'
  }
});
```

### Step 8: Test Compilation

Verify TypeScript compilation:

```bash
npx tsc --noEmit
```

Fix any type errors before proceeding.

### Step 9: Test Synthesis

Generate ARM templates:

```bash
npx atakora synth
```

Review the generated templates to ensure resources are created as expected.

### Step 10: Deploy and Validate

Deploy to a test environment:

```bash
npx atakora deploy --environment dev
```

Validate:
- All resources created successfully
- Component endpoints are accessible
- Functionality works as expected
- Monitoring is configured correctly

## Component-Specific Migrations

### CrudApi Migration

**Before:**
```typescript
const userApi = new CrudApi(stack, 'UserApi', {
  entityName: 'User',
  schema: {
    id: 'string',
    name: 'string',
    email: 'string',
    role: 'string',
    createdAt: 'timestamp'
  },
  partitionKey: '/id',
  ttl: 86400,
  throughput: 400,
  enableSoftDelete: true,
  cors: {
    allowedOrigins: ['https://myapp.com']
  }
});

// Access properties
const endpoint = userApi.apiEndpoint;
const dbId = userApi.database.resourceId;
```

**After:**
```typescript
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: {
      id: 'string',
      name: 'string',
      email: 'string',
      role: 'string',
      createdAt: 'timestamp'
    },
    partitionKey: '/id',
    ttl: 86400,
    throughput: 400,
    enableSoftDelete: true,
    cors: {
      allowedOrigins: ['https://myapp.com']
    }
  })
});

backend.addToStack(stack);

// Access properties via components
const endpoint = backend.components.userApi.apiEndpoint;
const dbId = backend.components.userApi.database.resourceId;
```

**Migration Notes:**
- Configuration props are identical
- All features work the same way
- Resource sharing happens automatically with other CrudApi components

### FunctionsApp Migration

**Before:**
```typescript
const processorApp = new FunctionsApp(stack, 'ProcessorApp', {
  runtime: 'node',
  version: '20',
  functions: {
    'process-webhook': {
      trigger: 'http',
      methods: ['POST']
    }
  },
  environmentVariables: {
    STORAGE_CONNECTION: storageAccount.connectionString,
    LOG_LEVEL: 'info'
  }
});
```

**After:**
```typescript
const backend = defineBackend({
  processorApp: FunctionsApp.define('ProcessorApp', {
    runtime: 'node',
    version: '20',
    functions: {
      'process-webhook': {
        trigger: 'http',
        methods: ['POST']
      }
    },
    environmentVariables: {
      STORAGE_CONNECTION: '${storage.connectionString}',
      LOG_LEVEL: 'info'
    }
  })
});

backend.addToStack(stack);
```

**Migration Notes:**
- Functions will be deployed to shared Function App
- Environment variables support templating (e.g., `${storage.connectionString}`)
- Each component's functions remain isolated

### StaticSiteWithCdn Migration

**Before:**
```typescript
const website = new StaticSiteWithCdn(stack, 'Website', {
  indexDocument: 'index.html',
  enableSpaMode: true,
  customDomain: 'www.myapp.com',
  dnsZoneName: 'myapp.com'
});
```

**After:**
```typescript
const backend = defineBackend({
  website: StaticSiteWithCdn.define('Website', {
    indexDocument: 'index.html',
    enableSpaMode: true,
    customDomain: 'www.myapp.com',
    dnsZoneName: 'myapp.com'
  })
});

backend.addToStack(stack);
```

**Migration Notes:**
- Storage accounts can be shared if multiple static sites exist
- CDN configuration remains per-component
- Custom domains work identically

## Testing Your Migration

### Pre-Migration Checklist

- [ ] All components identified and inventoried
- [ ] Migration candidates selected
- [ ] Test environment prepared
- [ ] Backup of current infrastructure completed
- [ ] Team notified of migration plan

### Post-Migration Validation

#### 1. Resource Validation

Verify correct resources were created:

```bash
# Check deployed resources
az resource list --resource-group rg-myapp-dev --output table

# Verify resource counts
az resource list --resource-group rg-myapp-dev --query "length([])"
```

Expected results:
- Fewer total resources than before
- Shared Cosmos DB, Function App, Storage Account present
- All necessary databases/containers/functions exist

#### 2. Functional Testing

Test each component's functionality:

```bash
# Test API endpoints
curl https://userapi-endpoint.azurewebsites.net/users
curl https://productapi-endpoint.azurewebsites.net/products

# Check function logs
az functionapp logs tail --name myapp-functions --resource-group rg-myapp-dev

# Verify database access
# (use Cosmos DB Data Explorer or Azure Portal)
```

#### 3. Integration Testing

Run your full test suite:

```bash
npm test
npm run test:integration
npm run test:e2e
```

All tests should pass identically to pre-migration state.

#### 4. Performance Testing

Compare performance before and after:

```bash
# Load test endpoints
npm run test:load

# Monitor response times
# Monitor resource utilization
# Check for any degradation
```

Expected results:
- Similar or better response times (often better due to shared connections)
- Lower overall resource utilization
- No increased error rates

#### 5. Monitoring Validation

Verify monitoring and alerting:

- [ ] Application Insights receiving telemetry
- [ ] Logs flowing correctly
- [ ] Alerts configured and firing appropriately
- [ ] Dashboards showing correct data

## Rollback Plan

If issues arise, you can quickly rollback:

### Option 1: Revert Code Changes

```bash
# Revert to previous commit
git revert HEAD

# Redeploy
npx atakora deploy --environment dev
```

### Option 2: Manual Rollback

If you need to rollback immediately without redeployment:

1. Keep traditional components alongside backend pattern temporarily:

```typescript
// Fallback: Traditional pattern alongside backend
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... })
});

// Temporary fallback component (commented out normally)
// const userApiFallback = new CrudApi(stack, 'UserApiFallback', { ... });
```

2. Switch DNS or load balancer to point to fallback resources
3. Investigate issues
4. Redeploy when resolved

### Option 3: Blue-Green Deployment

For zero-downtime rollback:

1. Deploy backend pattern as new stack
2. Test thoroughly
3. Switch traffic gradually
4. Keep old stack running for 24-48 hours
5. Destroy old stack after validation

## Common Migration Patterns

### Pattern 1: Homogeneous Components

Multiple components of the same type:

```typescript
// Migrating 5 CrudApi components
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),
  productApi: CrudApi.define('ProductApi', { ... }),
  orderApi: CrudApi.define('OrderApi', { ... }),
  inventoryApi: CrudApi.define('InventoryApi', { ... }),
  analyticsApi: CrudApi.define('AnalyticsApi', { ... })
});
```

**Benefit:** Maximum resource sharing and cost savings.

### Pattern 2: Mixed Component Types

Different component types sharing infrastructure:

```typescript
const backend = defineBackend({
  // CRUD APIs share Cosmos DB and Functions
  userApi: CrudApi.define('UserApi', { ... }),
  productApi: CrudApi.define('ProductApi', { ... }),

  // Function App for background processing
  processorApp: FunctionsApp.define('ProcessorApp', { ... }),

  // Static website
  website: StaticSiteWithCdn.define('Website', { ... })
});
```

**Benefit:** Cross-component resource sharing where compatible.

### Pattern 3: Incremental Migration

Migrate one component at a time:

```typescript
// Iteration 1: Migrate one component
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... })
});

// Keep existing traditional components
const productApi = new CrudApi(stack, 'ProductApi', { ... });
const orderApi = new CrudApi(stack, 'OrderApi', { ... });
```

Then progressively add more:

```typescript
// Iteration 2: Add second component
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),
  productApi: CrudApi.define('ProductApi', { ... })
});

// Still one traditional component
const orderApi = new CrudApi(stack, 'OrderApi', { ... });
```

**Benefit:** Minimal risk, easy rollback, gradual validation.

### Pattern 4: Environment-Specific Migration

Migrate non-production first:

```typescript
// In dev/staging
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),
  productApi: CrudApi.define('ProductApi', { ... })
});

// In production (not yet migrated)
const userApi = new CrudApi(stack, 'UserApi', { ... });
const productApi = new CrudApi(stack, 'ProductApi', { ... });
```

**Benefit:** Test in safe environment before production rollout.

## FAQ

### Q: Will this break my existing deployments?

**A:** No. The backend pattern is completely opt-in. Your existing code will continue to work unchanged. You can migrate incrementally, testing each step.

### Q: Can I mix traditional and backend patterns?

**A:** Yes! Traditional components and backend components can coexist in the same codebase and even the same stack.

### Q: Do I need to migrate all components at once?

**A:** No. Migrate incrementally for lower risk. Start with dev environments and one or two components.

### Q: What happens to my existing data?

**A:** Data migration depends on your approach:
- **New deployment**: Start fresh with backend pattern (no data migration needed)
- **In-place upgrade**: May require data migration between resources
- **Blue-green**: Run both patterns in parallel, migrate data gradually

### Q: Will performance change?

**A:** Performance typically improves or stays the same:
- **Pros**: Shared connection pools, lower latency between co-located components
- **Cons**: Potential resource contention if one component has traffic spike
- **Solution**: Monitor and adjust SKUs as needed

### Q: How do I handle resource limits?

**A:** Configure limits in backend config:

```typescript
defineBackend({ ... }, {
  limits: {
    maxCosmosAccounts: 1,
    maxFunctionApps: 2,
    maxStorageAccounts: 2
  }
});
```

Backend will error if limits are exceeded, preventing unexpected resource creation.

### Q: Can I still access individual resources?

**A:** Yes! Resources are accessible via the backend:

```typescript
// Get specific resource
const cosmosDb = backend.getResource('cosmos', 'shared');
const functions = backend.getResource('functions', 'shared');

// Or via component
const userApiDatabase = backend.components.userApi.database;
```

### Q: What if components have conflicting requirements?

**A:** The backend uses smart conflict resolution:
1. **Compatible configs**: Merged automatically (databases, containers)
2. **Priority-based**: Higher priority wins (configurable per requirement)
3. **Incompatible**: Error with clear message

Example:
```typescript
// Component A wants Session consistency
// Component B wants Strong consistency
// Error: "Conflicting consistency requirements"
// Solution: Align requirements or use separate backends
```

### Q: How do I migrate between regions?

**A:** Backend pattern simplifies multi-region:

```typescript
// Region 1
const eastBackend = defineBackend({ ... }, {
  location: 'eastus'
});

// Region 2
const westBackend = defineBackend({ ... }, {
  location: 'westus2'
});
```

Each backend manages resources in its region independently.

### Q: Can I customize resource names?

**A:** Yes, via naming convention:

```typescript
defineBackend({ ... }, {
  naming: {
    formatResourceName: (type, backendId, suffix) =>
      `${type}-${backendId}-${suffix}`.toLowerCase(),
    formatResourceGroupName: (backendId, env) =>
      `rg-${backendId}-${env}`.toLowerCase()
  }
});
```

### Q: What about cost allocation and tagging?

**A:** Tags are automatically applied to all resources:

```typescript
defineBackend({ ... }, {
  tags: {
    project: 'myapp',
    team: 'backend',
    costCenter: 'engineering',
    environment: 'production'
  }
});
```

Use Azure Cost Management to track costs by tags.

## Next Steps

After migrating:

1. **Monitor Resource Usage**: Track actual resource utilization and costs
2. **Optimize Configuration**: Adjust SKUs and limits based on actual usage
3. **Document Changes**: Update your infrastructure documentation
4. **Share Learnings**: Document any issues or tips for your team
5. **Plan Next Migration**: Identify next set of components to migrate

## Additional Resources

- [Backend Pattern Overview](./overview.md)
- [API Reference](./api-reference.md)
- [Basic Examples](./examples/basic-examples.md)
- [Advanced Examples](./examples/advanced-examples.md)
- [Best Practices](./best-practices.md)
- [Troubleshooting](./troubleshooting.md)

## Getting Help

If you encounter issues during migration:

1. Check the [Troubleshooting Guide](./troubleshooting.md)
2. Review [Backend Architecture Design](../../../../architecture/decisions/backend-architecture-design.md)
3. Open an issue on GitHub
4. Contact the Atakora team

Happy migrating!
