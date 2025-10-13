# Infrastructure Patterns

Production-ready architectural patterns for building Azure infrastructure with Atakora.

## Overview

Infrastructure patterns provide opinionated, reusable solutions to common architectural challenges. These patterns combine multiple resources with smart defaults, automated resource sharing, and built-in best practices.

## Available Patterns

### Backend Pattern

The Backend Pattern enables efficient resource sharing across multiple components, dramatically reducing costs and operational complexity.

**What it solves:**
- Resource proliferation (each component creating separate infrastructure)
- High costs from duplicated resources
- Management overhead from many separate resources
- Complex cross-component coordination

**Key Benefits:**
- 60-70% cost reduction through intelligent resource sharing
- 80% fewer resources to manage
- Simplified operations and monitoring
- Type-safe component access
- 100% backward compatible with existing code

**Documentation:**
- [Overview](./backend/overview.md) - Core concepts, how it works, and benefits
- [API Reference](./backend/api-reference.md) - Complete API documentation
- [Migration Guide](./backend/migration-guide.md) - Migrate from traditional pattern
- [Best Practices](./backend/best-practices.md) - Production recommendations
- [Troubleshooting](./backend/troubleshooting.md) - Common issues and solutions

**Examples:**
- [Basic Examples](./backend/examples/basic-examples.md) - Common usage patterns
- [Advanced Examples](./backend/examples/advanced-examples.md) - Complex scenarios

**Quick Example:**

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';

// Define multiple components sharing infrastructure
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
});

// Add to stack - creates 3 resources instead of 6
backend.addToStack(stack);

// Access components with full type safety
console.log(backend.components.userApi.apiEndpoint);
console.log(backend.components.productApi.apiEndpoint);
```

**When to Use:**
- Multiple components with similar resource requirements
- Cost optimization is important
- Microservices architecture
- Development/staging environments
- Multi-tenant systems

## Coming Soon

Additional patterns in development:

- **Multi-Region Pattern** - Global deployment with automatic failover
- **Event-Driven Pattern** - Event Hub + Stream Analytics + Storage
- **API Gateway Pattern** - API Management + multiple backends
- **Data Pipeline Pattern** - Ingestion, processing, and storage
- **Searchable Data Pattern** - Cosmos DB + Cognitive Search with auto-sync

## Pattern Philosophy

All Atakora patterns follow these principles:

1. **Opinionated Defaults**: Based on Azure best practices and real-world experience
2. **Composable**: Patterns work together seamlessly
3. **Type Safe**: Full TypeScript support with intelligent inference
4. **Production Ready**: Security, monitoring, and reliability built-in
5. **Cost Conscious**: Optimize resource usage without sacrificing capability
6. **Backward Compatible**: Traditional approaches continue to work

## Getting Help

- **Documentation**: Start with the pattern's overview page
- **Examples**: Review basic and advanced examples
- **Issues**: Open issues on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas

## See Also

- [Component Library](../../../packages/component/README.md) - Individual components
- [CDK Reference](../../reference/api/cdk/README.md) - Low-level CDK constructs
- [Architecture Decisions](../../architecture/decisions/) - Design rationale
- [Getting Started](../../getting-started/README.md) - Atakora basics
