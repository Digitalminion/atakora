# @atakora/component

Higher-level, opinionated components and patterns built on top of Atakora CDK.

## Overview

The `@atakora/component` package provides production-ready, pre-configured infrastructure patterns that abstract away common complexity. Instead of manually wiring together multiple resources, use these components to implement complete patterns with minimal configuration.

**New in v0.0.2:** Backend Pattern for efficient resource sharing across multiple components. Reduce costs by 60-70% and simplify resource management. [Learn more](#backend-pattern-new)

## Installation

```bash
npm install @atakora/component
```

## Philosophy

This package follows these principles:

- **Opinionated Defaults**: Smart defaults based on Azure best practices
- **Composable Patterns**: Components that work together seamlessly
- **Type Safety**: Full TypeScript support with intelligent inference
- **Production Ready**: Security, monitoring, and reliability built-in
- **Resource Efficiency**: Backend pattern for shared infrastructure (optional)

## Available Components

### Static Site with CDN

Automatically provisions a complete static website infrastructure with global CDN delivery:

- Storage Account with static website hosting ($web container)
- CDN Profile and Endpoint for global content delivery
- Optional DNS Zone and custom domain configuration
- Optional SSL/TLS certificate management (automatically provisioned)
- CORS configuration for API integration
- Production-ready caching and compression

Perfect for React, Vue, Angular SPAs, static documentation sites, marketing websites, and JAMstack applications.

```typescript
import { StaticSiteWithCdn } from '@atakora/component/web';
import { ResourceGroupStack } from '@atakora/cdk';

const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

// Simple: Just storage + CDN
const site = new StaticSiteWithCdn(stack, 'MySite', {
  indexDocument: 'index.html',
  enableSpaMode: true  // Redirect all 404s to index.html for client-side routing
});

console.log(site.cdnEndpoint); // https://xyz.azureedge.net
console.log(site.storageWebEndpoint); // https://xyz.z13.web.core.windows.net

// Advanced: With custom domain
const prodSite = new StaticSiteWithCdn(stack, 'ProdSite', {
  customDomain: 'www.myapp.com',
  dnsZoneName: 'myapp.com',
  enableSpaMode: true,
  httpsRedirect: true,
  enableCompression: true,
  cacheMaxAge: 86400, // 24 hours
  corsAllowedOrigins: ['https://api.myapp.com']
});

console.log(prodSite.customDomainEndpoint); // https://www.myapp.com

// Get deployment commands
console.log(site.getUploadCommand('./dist')); // Upload built files
console.log(site.getPurgeCdnCommand()); // Clear CDN cache
```

### CRUD API Pattern

Automatically provisions a complete CRUD API infrastructure including:

- Azure Functions for Create, Read, Update, Delete operations
- Cosmos DB for data storage
- API Management for routing and security
- Application Insights for monitoring
- RBAC and Managed Identity configuration

```typescript
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';

const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

const api = new CrudApi(stack, 'UserApi', {
  entityName: 'User',
  schema: {
    id: 'string',
    name: 'string',
    email: 'string',
    createdAt: 'timestamp'
  },
  partitionKey: '/id'
});

// Access generated resources
console.log(api.database.resourceId);
console.log(api.functions.resourceId);
console.log(api.apiEndpoint);
```

### Backend Pattern (NEW)

The Backend Pattern enables multiple components to share infrastructure resources efficiently, dramatically reducing costs and complexity.

### Quick Example

**Traditional Approach:**
```typescript
// Each component creates its own resources
// 3 APIs = 3 Cosmos DBs + 3 Function Apps + 3 Storage Accounts
const userApi = new CrudApi(stack, 'UserApi', { ... });
const productApi = new CrudApi(stack, 'ProductApi', { ... });
const orderApi = new CrudApi(stack, 'OrderApi', { ... });
// Result: 9 resources, ~$111/month
```

**Backend Pattern:**
```typescript
import { defineBackend } from '@atakora/component/backend';

// Components share resources intelligently
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', { ... }),
  productApi: CrudApi.define('ProductApi', { ... }),
  orderApi: CrudApi.define('OrderApi', { ... })
});

backend.addToStack(stack);
// Result: 3 resources, ~$37/month (67% cost reduction!)

// Access components with full type safety
backend.components.userApi.apiEndpoint;
backend.components.productApi.operations;
```

### Key Benefits

- **60-70% Cost Reduction**: Share infrastructure across multiple components
- **80% Fewer Resources**: Reduce resource sprawl and management overhead
- **Simplified Operations**: Fewer resources to monitor and maintain
- **Type Safety**: Full TypeScript support with intelligent inference
- **Backward Compatible**: Existing code continues to work unchanged

### Documentation

Complete documentation is available in the main Atakora docs:

- [Backend Pattern Overview](../../docs/guides/patterns/backend/overview.md) - Core concepts and benefits
- [API Reference](../../docs/guides/patterns/backend/api-reference.md) - Complete API documentation
- [Basic Examples](../../docs/guides/patterns/backend/examples/basic-examples.md) - Common usage patterns
- [Advanced Examples](../../docs/guides/patterns/backend/examples/advanced-examples.md) - Complex scenarios
- [Migration Guide](../../docs/guides/patterns/backend/migration-guide.md) - Migrate from traditional pattern
- [Best Practices](../../docs/guides/patterns/backend/best-practices.md) - Production recommendations
- [Troubleshooting](../../docs/guides/patterns/backend/troubleshooting.md) - Common issues and solutions

**Quick Links:**
- [All Patterns](../../docs/guides/patterns/README.md) - Browse all infrastructure patterns

## Coming Soon

- **Web App with Database**: Pre-configured App Service + SQL Database
- **Event-Driven Microservice**: Function App + Service Bus + Storage
- **API Gateway Stack**: API Management + Multiple backends + Key Vault
- **Data Pipeline**: Event Hub + Stream Analytics + Data Lake
- **Searchable Data Store**: Cosmos DB + Cognitive Search + Auto-sync

## Component Structure

Each component exposes:

1. **Configuration Props**: Simple, focused API for what matters
2. **Generated Resources**: Access to underlying CDK constructs
3. **Outputs**: Connection strings, endpoints, and identifiers
4. **Methods**: Helper functions for common operations
5. **Backend Support**: Optional `define()` method for backend pattern

## Quick Start

### Traditional Pattern

```typescript
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';

const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

const userApi = new CrudApi(stack, 'UserApi', {
  entityName: 'User',
  schema: {
    id: 'string',
    name: 'string',
    email: 'string'
  },
  partitionKey: '/id'
});

console.log('API Endpoint:', userApi.apiEndpoint);
```

### Backend Pattern (Recommended for Multiple Components)

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';

const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: { id: 'string', name: 'string', email: 'string' },
    partitionKey: '/id'
  }),

  productApi: CrudApi.define('ProductApi', {
    entityName: 'Product',
    schema: { id: 'string', name: 'string', price: 'number' },
    partitionKey: '/id'
  })
}, {
  environment: 'production',
  location: 'eastus',
  monitoring: true
});

const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

backend.addToStack(stack);

console.log('User API:', backend.components.userApi.apiEndpoint);
console.log('Product API:', backend.components.productApi.apiEndpoint);
```

## Examples

See the `/examples` directory for complete working examples of each component.

## Full Documentation

For complete documentation, see the main Atakora documentation:

- **Getting Started**: [Backend Pattern Overview](../../docs/guides/patterns/backend/overview.md)
- **API Reference**: [Complete API Documentation](../../docs/guides/patterns/backend/api-reference.md)
- **Examples**: [Basic](../../docs/guides/patterns/backend/examples/basic-examples.md) | [Advanced](../../docs/guides/patterns/backend/examples/advanced-examples.md)
- **Guides**: [Migration](../../docs/guides/patterns/backend/migration-guide.md) | [Best Practices](../../docs/guides/patterns/backend/best-practices.md) | [Troubleshooting](../../docs/guides/patterns/backend/troubleshooting.md)
- **All Patterns**: [Infrastructure Patterns](../../docs/guides/patterns/README.md)

## Development

This package is part of the Atakora monorepo. Contributions welcome!

## License

Apache-2.0
