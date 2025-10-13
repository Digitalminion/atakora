# @atakora/component

Higher-level, opinionated components and patterns built on top of Atakora CDK.

## Overview

The `@atakora/component` package provides production-ready, pre-configured infrastructure patterns that abstract away common complexity. Instead of manually wiring together multiple resources, use these components to implement complete patterns with minimal configuration.

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

### Coming Soon

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

## Examples

See the `/examples` directory for complete working examples of each component.

## Documentation

For full documentation, visit [your-docs-url]

## Development

This package is part of the Atakora monorepo. Contributions welcome!

## License

Apache-2.0
