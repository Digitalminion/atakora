# Backend Pattern Best Practices

Proven patterns and recommendations for building production-ready backends with @atakora/component.

## Table of Contents

- [Architecture Patterns](#architecture-patterns)
- [Resource Organization](#resource-organization)
- [Performance Optimization](#performance-optimization)
- [Security Best Practices](#security-best-practices)
- [Cost Optimization](#cost-optimization)
- [Naming Conventions](#naming-conventions)
- [Monitoring and Observability](#monitoring-and-observability)
- [Testing Strategies](#testing-strategies)
- [Deployment Practices](#deployment-practices)
- [Maintenance and Operations](#maintenance-and-operations)

---

## Architecture Patterns

### Use Component Definitions for All Managed Components

**Do:**
```typescript
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),
  productApi: CrudApi.define('ProductApi', { ... })
});
```

**Don't:**
```typescript
// Mixing backend pattern with traditional instantiation
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... })
});
const productApi = new CrudApi(stack, 'ProductApi', { ... }); // Don't mix!
```

**Why:**
- Consistent resource management
- Clear intent and ownership
- Easier to reason about resource sharing
- Better type safety

---

### Group Related Components in Same Backend

**Do:**
```typescript
// Backend for core API services
const apiBackend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),
  productApi: CrudApi.define('ProductApi', { ... }),
  orderApi: CrudApi.define('OrderApi', { ... })
});

// Separate backend for processing/workers
const processingBackend = defineBackend({
  orderProcessor: FunctionsApp.define('OrderProcessor', { ... }),
  notificationService: FunctionsApp.define('NotificationService', { ... })
});
```

**Don't:**
```typescript
// Everything in one massive backend
const backend = defineBackend({
  userApi: ...,
  productApi: ...,
  orderApi: ...,
  processorApp: ...,
  analyticsApp: ...,
  adminApi: ...,
  reportingApi: ...,
  // ... 20 more components
});
```

**Why:**
- Easier to understand and maintain
- Clearer boundaries and responsibilities
- Independent deployment and scaling
- Faster synthesis times

---

### Use Separate Backends for Different Security Boundaries

**Do:**
```typescript
// Public-facing APIs
const publicBackend = defineBackend({
  publicApi: CrudApi.define('PublicApi', { ... })
}, {
  networking: 'public',
  tags: { security: 'public' }
});

// Internal/private APIs
const privateBackend = defineBackend({
  internalApi: CrudApi.define('InternalApi', { ... })
}, {
  networking: {
    mode: 'isolated',
    vnetName: 'internal-vnet',
    privateEndpoints: true
  },
  tags: { security: 'private' }
});
```

**Why:**
- Clear security boundaries
- Easier compliance audits
- Reduced blast radius of security incidents
- Different network policies per trust zone

---

## Resource Organization

### Use Meaningful Component IDs

**Do:**
```typescript
const backend = defineBackend({
  userManagementApi: CrudApi.define('UserManagementApi', { ... }),
  productCatalogApi: CrudApi.define('ProductCatalogApi', { ... }),
  orderProcessingApi: CrudApi.define('OrderProcessingApi', { ... })
});
```

**Don't:**
```typescript
const backend = defineBackend({
  api1: CrudApi.define('Api1', { ... }),
  api2: CrudApi.define('Api2', { ... }),
  api3: CrudApi.define('Api3', { ... })
});
```

**Why:**
- Self-documenting code
- Easier debugging and monitoring
- Clear purpose in logs and metrics
- Better team communication

---

### Align Partition Keys with Access Patterns

**Do:**
```typescript
// Multi-tenant: Partition by tenant
const backend = defineBackend({
  dataApi: CrudApi.define('DataApi', {
    entityName: 'Data',
    schema: {
      id: 'string',
      tenantId: 'string',
      // ...
    },
    partitionKey: '/tenantId' // All tenant queries are efficient
  })
});

// User-centric: Partition by user
const backend = defineBackend({
  orderApi: CrudApi.define('OrderApi', {
    entityName: 'Order',
    schema: {
      id: 'string',
      userId: 'string',
      // ...
    },
    partitionKey: '/userId' // Get all user's orders efficiently
  })
});
```

**Why:**
- Optimal query performance
- Lower RU consumption
- Better scalability
- Reduced costs

---

### Configure TTL for Transient Data

**Do:**
```typescript
const backend = defineBackend({
  sessionApi: CrudApi.define('SessionApi', {
    entityName: 'Session',
    schema: { /* ... */ },
    partitionKey: '/userId',
    ttl: 86400 // Auto-delete after 24 hours
  }),

  auditLogApi: CrudApi.define('AuditLogApi', {
    entityName: 'AuditLog',
    schema: { /* ... */ },
    partitionKey: '/userId',
    ttl: 7776000 // Keep audit logs for 90 days
  })
});
```

**Don't:**
```typescript
// No TTL = data grows forever = costs grow forever
const backend = defineBackend({
  sessionApi: CrudApi.define('SessionApi', {
    entityName: 'Session',
    schema: { /* ... */ },
    partitionKey: '/userId'
    // Missing TTL - sessions never deleted!
  })
});
```

**Why:**
- Automatic data cleanup
- Reduced storage costs
- Compliance with data retention policies
- No manual cleanup needed

---

## Performance Optimization

### Use Serverless Cosmos DB for Variable Workloads

**Do:**
```typescript
const backend = defineBackend({
  api: CrudApi.define('Api', {
    entityName: 'Entity',
    schema: { /* ... */ },
    partitionKey: '/id',
    enableServerless: true // Pay per request
  })
});
```

**When to Use Serverless:**
- Development/testing environments
- Bursty workloads
- Low or unpredictable traffic
- Cost optimization is priority

**When to Use Provisioned:**
- Consistent high throughput
- Predictable workload
- Need guaranteed performance
- Cost is < serverless at scale

---

### Set Appropriate Throughput Levels

**Do:**
```typescript
// Environment-specific throughput
const throughput = {
  dev: 400,
  staging: 1000,
  production: 4000
}[environment];

const backend = defineBackend({
  api: CrudApi.define('Api', {
    entityName: 'Entity',
    schema: { /* ... */ },
    partitionKey: '/id',
    throughput // Appropriate for environment
  })
});
```

**Don't:**
```typescript
// Over-provisioning in all environments
const backend = defineBackend({
  api: CrudApi.define('Api', {
    throughput: 10000 // Wasteful in dev!
  })
});
```

**Why:**
- Optimize costs per environment
- Right-size resources
- Scale up/down as needed

---

### Enable Caching for Read-Heavy Workloads

**Do:**
```typescript
const backend = defineBackend({
  productApi: CrudApi.define('ProductApi', {
    entityName: 'Product',
    schema: { /* ... */ },
    partitionKey: '/category',
    cache: {
      enabled: true,
      ttl: 300 // 5 minutes
    }
  })
});
```

**When to Cache:**
- Read-heavy workloads (>80% reads)
- Data changes infrequently
- Many repeated queries
- Latency is critical

---

## Security Best Practices

### Always Enable HTTPS Only

**Do:**
```typescript
const backend = defineBackend({
  api: CrudApi.define('Api', { ... })
}, {
  enforceHttps: true // Default should be true
});
```

**Why:**
- Encrypt data in transit
- Prevent MITM attacks
- Industry standard
- Required for compliance

---

### Use Managed Identity Over Connection Strings

**Do:**
```typescript
// Managed Identity (no secrets to manage)
const backend = defineBackend({
  api: CrudApi.define('Api', { ... })
}, {
  useManagedIdentity: true // Recommended
});
```

**Don't:**
```typescript
// Connection strings (secrets to manage)
environmentVariables: {
  COSMOS_CONNECTION_STRING: 'AccountEndpoint=https://...;AccountKey=...' // Avoid
}
```

**Why:**
- No secrets to rotate
- Automatic credential management
- Better security posture
- Simplified operations

---

### Implement Network Isolation for Sensitive Data

**Do:**
```typescript
const backend = defineBackend({
  sensitiveDataApi: CrudApi.define('SensitiveDataApi', { ... })
}, {
  networking: {
    mode: 'isolated',
    vnetName: 'secure-vnet',
    subnetName: 'backend-subnet',
    privateEndpoints: true
  },
  tags: {
    dataClassification: 'confidential'
  }
});
```

**When to Isolate:**
- PII/PHI/PCI data
- Financial data
- Intellectual property
- Regulatory requirements

---

### Apply Least Privilege Principle

**Do:**
```typescript
// Components only get permissions they need
const backend = defineBackend({
  readOnlyApi: CrudApi.define('ReadOnlyApi', {
    entityName: 'Data',
    operations: ['read', 'list'], // No write permissions
    schema: { /* ... */ },
    partitionKey: '/id'
  }),

  adminApi: CrudApi.define('AdminApi', {
    entityName: 'Data',
    operations: ['create', 'read', 'update', 'delete', 'list'], // Full permissions
    schema: { /* ... */ },
    partitionKey: '/id'
  })
});
```

**Why:**
- Reduced attack surface
- Limit damage from compromised components
- Clear access control
- Easier auditing

---

## Cost Optimization

### Start with Serverless, Migrate to Provisioned if Needed

**Approach:**
```typescript
// Phase 1: Development - Serverless
const devBackend = defineBackend({
  api: CrudApi.define('Api', {
    enableServerless: true
  })
}, {
  environment: 'dev'
});

// Phase 2: Production - Monitor costs
// If serverless becomes expensive, switch to provisioned

// Phase 3: Scale - Provisioned throughput
const prodBackend = defineBackend({
  api: CrudApi.define('Api', {
    enableServerless: false,
    throughput: 4000 // Based on actual usage metrics
  })
}, {
  environment: 'production'
});
```

**Decision Matrix:**

| Monthly RU Usage | Serverless Cost | Provisioned Cost | Recommendation |
|------------------|-----------------|-------------------|----------------|
| < 1M RUs | ~$5 | ~$24 | Serverless |
| 1-10M RUs | ~$25-250 | ~$24-240 | Similar |
| > 10M RUs | > $250 | ~$240 | Provisioned |

---

### Use Resource Limits to Prevent Cost Overruns

**Do:**
```typescript
const backend = defineBackend({ ... }, {
  limits: {
    maxCosmosAccounts: 1,
    maxFunctionApps: 1,
    maxStorageAccounts: 2,
    maxThroughputPerDatabase: 10000 // RU/s cap
  },
  tags: {
    costCenter: 'engineering',
    budget: 'monitored'
  }
});
```

**Why:**
- Prevent accidental over-provisioning
- Enforce cost controls
- Early warning of resource sprawl
- Predictable billing

---

### Leverage Reserved Capacity for Production

**Do:**
```bash
# For stable production workloads
# Purchase 1-year or 3-year reserved capacity
# Save 20-65% on Cosmos DB, Functions, etc.

az cosmosdb sql reserved-capacity create \
  --account-name myapp-cosmos-prod \
  --resource-group rg-myapp-prod \
  --term 1year \
  --capacity 10000
```

**When to Use:**
- Stable, predictable production workloads
- Multi-year commitment to Azure
- Cost optimization is priority

---

## Naming Conventions

### Use Consistent Naming Pattern

**Recommended Pattern:**
```
{resource-type}-{app-name}-{environment}-{purpose}
```

**Implementation:**
```typescript
const backend = defineBackend({ ... }, {
  environment: 'prod',
  naming: {
    formatResourceName: (type, backendId, suffix) => {
      const parts = [
        type,              // cosmos, func, st
        'myapp',           // Application name
        environment,       // dev, staging, prod
        suffix || 'shared' // Purpose/identifier
      ];
      return parts.join('-').toLowerCase();
    }
  }
});

// Results in:
// cosmos-myapp-prod-shared
// func-myapp-prod-shared
// st-myapp-prod-shared
```

**Examples:**
```
cosmos-myapp-prod-shared
func-myapp-staging-api
st-myapp-dev-uploads
kv-myapp-prod-secrets
```

---

### Include Environment in All Resource Names

**Do:**
```typescript
cosmos-myapp-dev-shared
cosmos-myapp-staging-shared
cosmos-myapp-prod-shared
```

**Don't:**
```typescript
cosmos-myapp-shared  // Which environment?
```

**Why:**
- Immediately identify environment
- Prevent accidental production changes
- Clearer in Azure Portal
- Easier cost allocation

---

## Monitoring and Observability

### Always Enable Monitoring in Production

**Do:**
```typescript
const backend = defineBackend({ ... }, {
  monitoring: {
    enabled: true,
    retentionDays: 90,
    samplingPercentage: 100, // 100% in production
    alerting: {
      enabled: true,
      errorThreshold: 5, // Alert on 5 errors
      latencyThreshold: 1000 // Alert on 1s+ latency
    }
  }
});
```

**Don't:**
```typescript
// No monitoring = flying blind
const backend = defineBackend({ ... }, {
  monitoring: false
});
```

**Why:**
- Detect issues before users do
- Debug production problems
- Capacity planning
- SLA compliance

---

### Use Structured Logging

**Do:**
```typescript
// In your Function App code
context.log({
  level: 'info',
  component: 'UserApi',
  operation: 'createUser',
  userId: user.id,
  duration: elapsed,
  success: true
});
```

**Don't:**
```typescript
// Unstructured logging
context.log('User created');
```

**Why:**
- Queryable logs
- Better debugging
- Metrics aggregation
- Alerting on patterns

---

### Set Up Health Checks

**Do:**
```typescript
const backend = defineBackend({
  api: CrudApi.define('Api', {
    // ... config
    healthCheck: {
      path: '/health',
      interval: 30, // seconds
      timeout: 10,
      unhealthyThreshold: 3
    }
  })
});
```

**Health Check Should Test:**
- Function App responding
- Cosmos DB connectivity
- Storage Account accessibility
- Any external dependencies

---

## Testing Strategies

### Test Infrastructure Code

**Do:**
```typescript
// tests/backend.test.ts
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';

describe('Backend Configuration', () => {
  it('should create backend with correct components', () => {
    const backend = defineBackend({
      userApi: CrudApi.define('UserApi', { ... })
    });

    expect(backend.components).toBeDefined();
    expect(backend.backendId).toBeTruthy();
  });

  it('should validate resource requirements', () => {
    const backend = defineBackend({ ... });
    const validation = backend.validate();

    expect(validation.valid).toBe(true);
    expect(validation.errors).toBeUndefined();
  });

  it('should enforce resource limits', () => {
    expect(() => {
      defineBackend({
        api1: CrudApi.define('Api1', { ... }),
        api2: CrudApi.define('Api2', { ... })
      }, {
        limits: { maxCosmosAccounts: 1 }
      });
    }).not.toThrow();
  });
});
```

---

### Use Different Configurations per Environment

**Do:**
```typescript
// config/dev.ts
export const devConfig = {
  throughput: 400,
  ttl: 86400,
  monitoring: false
};

// config/prod.ts
export const prodConfig = {
  throughput: 4000,
  ttl: 2592000,
  monitoring: true
};

// main.ts
const config = environment === 'production' ? prodConfig : devConfig;
const backend = defineBackend({ ... }, config);
```

---

### Validate Before Deploy

**Do:**
```typescript
// Pre-deployment validation script
const backend = defineBackend({ ... });

// Validate
const validation = backend.validate();
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  process.exit(1);
}

if (validation.warnings && validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}

// Check limits
const resourceCount = Array.from(backend.resources.keys()).length;
console.log(`Creating ${resourceCount} resources`);

if (resourceCount > 50) {
  console.warn('Large number of resources - consider splitting backend');
}

// Proceed with deployment
backend.addToStack(stack);
```

---

## Deployment Practices

### Use CI/CD for All Deployments

**Do:**
```yaml
# .github/workflows/deploy.yml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Validate infrastructure
        run: npm run validate

      - name: Deploy to production
        run: npx atakora deploy
        env:
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
```

---

### Deploy to Non-Production First

**Do:**
```bash
# Always follow this order
npm run deploy:dev      # Deploy to dev, test
npm run deploy:staging  # Deploy to staging, validate
npm run deploy:prod     # Deploy to production

# Or use blue-green deployment for zero downtime
```

---

### Use Git Tags for Releases

**Do:**
```bash
# Tag production deployments
git tag -a v1.2.0 -m "Release 1.2.0"
git push origin v1.2.0

# Deploy specific version
git checkout v1.2.0
npm run deploy:prod
```

---

## Maintenance and Operations

### Regular Review of Resources

**Monthly Checklist:**
- [ ] Review Cosmos DB throughput usage
- [ ] Check storage account sizes
- [ ] Analyze Application Insights metrics
- [ ] Review and clean up old resources
- [ ] Update cost allocation tags
- [ ] Validate backup/DR procedures

---

### Implement Automated Scaling

**Do:**
```typescript
const backend = defineBackend({ ... }, {
  autoScale: {
    enabled: true,
    minThroughput: 400,
    maxThroughput: 10000,
    targetUtilization: 70 // Scale at 70% utilization
  }
});
```

---

### Document Your Architecture

**Do:**
```typescript
/**
 * Production Backend
 *
 * Architecture:
 * - 3 CRUD APIs (User, Product, Order)
 * - 2 Function Apps (Processing, Notifications)
 * - Shared Cosmos DB (Session consistency)
 * - Shared Function App runtime
 *
 * Resource Sharing:
 * - All APIs share 1 Cosmos DB account
 * - All APIs share 1 Function App
 * - Separate storage for each function group
 *
 * Scaling:
 * - Cosmos DB: 4000 RU/s provisioned
 * - Functions: Consumption plan
 *
 * Monitoring:
 * - Application Insights enabled
 * - 90-day retention
 * - Alerts on errors and latency
 */
const backend = defineBackend({ ... });
```

---

## Summary Checklist

**Before Going to Production:**
- [ ] Monitoring enabled with appropriate retention
- [ ] HTTPS enforced on all endpoints
- [ ] Network isolation for sensitive data
- [ ] Managed Identity used instead of secrets
- [ ] TTL configured for transient data
- [ ] Appropriate partition keys for access patterns
- [ ] Resource limits configured
- [ ] Naming convention established
- [ ] Health checks implemented
- [ ] CI/CD pipeline set up
- [ ] Blue-green or canary deployment strategy
- [ ] Backup and DR procedures documented
- [ ] Cost alerts configured
- [ ] Documentation complete
- [ ] Team trained on operations

---

## See Also

- [Backend Pattern Overview](./backend-pattern.md)
- [API Reference](./backend-api-reference.md)
- [Examples](./examples/basic-backend.md)
- [Troubleshooting](./troubleshooting.md)
- [Migration Guide](./migration-guide.md)
