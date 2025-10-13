# Backend Pattern

The Backend Pattern enables efficient resource sharing across multiple components in your infrastructure. Instead of each component creating its own Azure resources, the backend orchestrates shared resources intelligently, dramatically reducing costs and complexity.

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [How It Works](#how-it-works)
- [Key Benefits](#key-benefits)
- [When to Use](#when-to-use)
- [Core Concepts](#core-concepts)
- [Quick Start](#quick-start)
- [Next Steps](#next-steps)

## Overview

The Backend Pattern is a resource orchestration pattern that allows multiple components to share common infrastructure resources. It provides a declarative way to define components and their resource requirements, then automatically provisions and distributes shared resources.

This pattern is particularly valuable when building microservices, multi-tenant systems, or any architecture where multiple components need similar infrastructure.

## The Problem

### Traditional Approach: Resource Proliferation

In traditional infrastructure-as-code, each component creates its own dedicated resources:

```typescript
// Traditional approach - 3 separate CrudApi components
const userApi = new CrudApi(stack, 'UserApi', {
  entityName: 'User',
  schema: { id: 'string', name: 'string', email: 'string' }
});

const productApi = new CrudApi(stack, 'ProductApi', {
  entityName: 'Product',
  schema: { id: 'string', name: 'string', price: 'number' }
});

const orderApi = new CrudApi(stack, 'OrderApi', {
  entityName: 'Order',
  schema: { id: 'string', userId: 'string', total: 'number' }
});
```

**Result**: 3 Cosmos DB accounts + 3 Function Apps + 3 Storage Accounts = 9 resources

### The Cost Impact

Each Azure resource has both fixed and variable costs:

| Resource Type | Monthly Base Cost | Per-Component Cost (3 components) |
|--------------|-------------------|-----------------------------------|
| Cosmos DB Account | ~$24/month minimum | $72/month |
| Function App | ~$13/month (consumption) | $39/month |
| Storage Account | ~$0.18/month minimum | $0.54/month |
| **Total** | | **~$111.54/month** |

Additional hidden costs:
- Management overhead: 9 resources to monitor and maintain
- Network egress: Data transfer between separate resources
- Complexity: 9 separate security configurations
- Scaling: Each resource scales independently

## The Solution

### Backend Pattern: Intelligent Resource Sharing

The Backend Pattern consolidates resources while maintaining component isolation:

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';

const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: { id: 'string', name: 'string', email: 'string' }
  }),

  productApi: CrudApi.define('ProductApi', {
    entityName: 'Product',
    schema: { id: 'string', name: 'string', price: 'number' }
  }),

  orderApi: CrudApi.define('OrderApi', {
    entityName: 'Order',
    schema: { id: 'string', userId: 'string', total: 'number' }
  })
});

// Add to your CDK stack
const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

backend.addToStack(stack);
```

**Result**: 1 Cosmos DB account + 1 Function App + 1 Storage Account = 3 resources (67% reduction)

### Cost Savings

| Resource Type | Backend Pattern Cost | Savings vs Traditional |
|--------------|---------------------|------------------------|
| Cosmos DB Account | $24/month | -$48/month (67% reduction) |
| Function App | $13/month | -$26/month (67% reduction) |
| Storage Account | $0.18/month | -$0.36/month (67% reduction) |
| **Total** | **~$37.18/month** | **-$74.36/month (67% savings)** |

Additional benefits:
- Single resource to monitor
- Reduced network egress costs
- Simplified security configuration
- Coordinated scaling

## How It Works

The Backend Pattern operates in four distinct phases:

### Phase 1: Definition

Components declare their requirements without creating resources:

```typescript
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: { ... }
  })
});
```

At this stage:
- No resources are created
- Component definitions are captured
- Type safety is established

### Phase 2: Requirement Collection

The backend collects requirements from all components:

```
Component: UserApi
  └─ Requires: Cosmos DB (serverless, Session consistency)
  └─ Requires: Functions App (Node 20 runtime)
  └─ Requires: Storage Account (Standard_LRS)

Component: ProductApi
  └─ Requires: Cosmos DB (serverless, Session consistency)
  └─ Requires: Functions App (Node 20 runtime)
  └─ Requires: Storage Account (Standard_LRS)
```

### Phase 3: Intelligent Merging

The backend analyzes requirements and merges compatible configs:

```
Merged Requirements:
  ✓ Cosmos DB: Combined - 2 databases, Session consistency
  ✓ Functions App: Compatible - Node 20, merged env vars
  ✓ Storage Account: Shared - Standard_LRS
```

Smart conflict resolution:
- **Compatible configs**: Automatically merged (databases, containers, env vars)
- **Conflicting configs**: Higher priority wins (with warnings)
- **Incompatible configs**: Error with clear explanation

### Phase 4: Resource Provisioning & Injection

Resources are created and distributed to components:

```
1. Create shared Cosmos DB with all databases
2. Create shared Function App with all functions
3. Create shared Storage Account
4. Initialize components with injected resources
5. Components finalize their configuration
```

## Key Benefits

### 1. Resource Reduction: Up to 80% Fewer Resources

Traditional approach scales linearly:
- 5 components = 15 resources
- 10 components = 30 resources
- 20 components = 60 resources

Backend Pattern scales sub-linearly:
- 5 components = 3 resources (80% reduction)
- 10 components = 3-6 resources (75-80% reduction)
- 20 components = 3-9 resources (70-85% reduction)

### 2. Cost Savings: 60-70% Reduction

Real-world example with 10 CRUD APIs:
- Traditional: ~$370/month (10 × $37)
- Backend Pattern: ~$110/month (1 × $110 with higher throughput)
- **Savings: $260/month or $3,120/year**

### 3. Simplified Management

Fewer resources means:
- Fewer monitoring dashboards
- Fewer security rules to maintain
- Fewer backup configurations
- Fewer deployment pipelines
- Faster development cycles

### 4. Improved Performance

Shared resources often perform better:
- Lower latency (components within same Function App)
- Better resource utilization (shared connection pools)
- Coordinated scaling (all components scale together)

### 5. Backward Compatibility

Existing code continues to work:
```typescript
// Old code - still works!
const api = new CrudApi(stack, 'UserApi', { ... });

// New code - opt-in to backend pattern
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... })
});
```

No breaking changes. Gradual migration path.

### 6. Type Safety

Full TypeScript support with intelligent type inference:

```typescript
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),
  productApi: CrudApi.define('ProductApi', { ... })
});

// TypeScript knows the exact type!
backend.components.userApi;     // Type: CrudApi
backend.components.productApi;  // Type: CrudApi

// Compilation error if typo
backend.components.userAp;      // Error: Property 'userAp' does not exist
```

## When to Use

### Perfect For

1. **Microservices Architecture**
   - Multiple small services sharing infrastructure
   - Need cost efficiency at scale
   - Want simplified deployment

2. **Multi-Tenant Systems**
   - Many tenants with similar requirements
   - Need resource isolation within shared infrastructure
   - Cost per tenant is critical

3. **Development/Staging Environments**
   - Multiple components in non-production
   - Cost optimization is priority
   - Don't need production-level isolation

4. **Rapid Prototyping**
   - Building MVPs quickly
   - Need to minimize infrastructure complexity
   - Want to defer scaling decisions

### Consider Alternatives When

1. **Strict Resource Isolation Required**
   - Regulatory requirements for separate resources
   - Different security/compliance profiles per component
   - Independent audit trails needed

2. **Vastly Different Resource Requirements**
   - Some components need premium SKUs, others don't
   - Different geographic distribution requirements
   - Incompatible networking configurations

3. **Independent Deployment Cycles Critical**
   - Components must deploy completely independently
   - Different teams own different components
   - Zero tolerance for shared resource updates

## Core Concepts

### Component Definition

Components declare what they need without creating resources:

```typescript
const definition = CrudApi.define('UserApi', {
  entityName: 'User',
  schema: { ... }
});
```

A definition contains:
- Component ID (unique identifier)
- Component type (e.g., 'CrudApi')
- Configuration (component-specific props)
- Factory function (creates component instance)

### Resource Requirements

Components specify their infrastructure needs:

```typescript
{
  resourceType: 'cosmos',
  requirementKey: 'UserApi-cosmos',
  priority: 20,
  config: {
    enableServerless: true,
    consistency: 'Session',
    databases: [{ name: 'users-db' }]
  }
}
```

Requirements include:
- Resource type (cosmos, functions, storage, etc.)
- Unique key (for deduplication)
- Priority (for conflict resolution)
- Configuration (resource-specific settings)

### Resource Providers

Providers know how to create and manage specific resource types:

- **CosmosProvider**: Creates and manages Cosmos DB accounts
- **FunctionsProvider**: Creates and manages Function Apps
- **StorageProvider**: Creates and manages Storage Accounts

Providers handle:
- Requirement merging (combining compatible configs)
- Resource creation (provisioning infrastructure)
- Conflict resolution (handling incompatibilities)

### Backend Instance

The orchestrator that manages the entire lifecycle:

```typescript
const backend = defineBackend({
  // Component definitions
}, {
  // Backend configuration
  environment: 'prod',
  location: 'eastus',
  monitoring: true
});
```

Responsibilities:
- Collect requirements from all components
- Coordinate providers to create resources
- Initialize components with shared resources
- Provide type-safe component access

## Quick Start

### 1. Install the Package

```bash
npm install @atakora/component
```

### 2. Define Your Components

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';

// Define components (doesn't create resources yet)
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
      price: 'number',
      category: 'string'
    },
    partitionKey: '/category'
  })
});
```

### 3. Add to CDK Stack

```typescript
// Create your CDK stack
const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

// Add backend to stack (creates resources)
backend.addToStack(stack);
```

### 4. Access Your Components

```typescript
// Type-safe component access
const userEndpoint = backend.components.userApi.apiEndpoint;
const productEndpoint = backend.components.productApi.apiEndpoint;

console.log('User API:', userEndpoint);
console.log('Product API:', productEndpoint);

// Access shared resources
const cosmosDb = backend.getResource('cosmos', 'shared');
const functions = backend.getResource('functions', 'shared');
```

### 5. Deploy

```bash
npx atakora synth
npx atakora deploy
```

That's it! You now have a fully functional backend with shared resources.

## Next Steps

- **[API Reference](./api-reference.md)**: Complete API documentation
- **[Basic Examples](./examples/basic-examples.md)**: Common usage patterns
- **[Advanced Examples](./examples/advanced-examples.md)**: Complex scenarios
- **[Migration Guide](./migration-guide.md)**: Migrate existing code
- **[Best Practices](./best-practices.md)**: Optimization tips
- **[Troubleshooting](./troubleshooting.md)**: Common issues and solutions

## Additional Resources

- [Backend Architecture Design](../../../../architecture/decisions/backend-architecture-design.md)
- [ADR-001: Define Backend Pattern](../../../../architecture/decisions/ADR-001-define-backend-pattern.md)
- [Implementation Guide](../../../../architecture/decisions/backend-implementation-guide.md)
