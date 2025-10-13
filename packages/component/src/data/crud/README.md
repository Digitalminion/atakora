# CRUD Data Resources

Complete CRUD API infrastructure for entity-based data operations.

## Overview

The `CrudResource` provides a simplified, data-focused interface for creating CRUD APIs. It wraps the `CrudApi` component with naming and structure consistent with the data architecture.

## Features

- **Auto-generated Infrastructure**: Cosmos DB + Azure Functions
- **Type-safe Schema**: Define your entity structure with validation
- **RBAC & Managed Identity**: Automatic permission configuration
- **Self-contained Functions**: All dependencies bundled, no runtime installs
- **Shared Resources**: Reuse Cosmos DB and Function Apps across entities

## Quick Start

### Simple Entity

```typescript
import { CrudResource } from '@atakora/component/data/crud';
import { ResourceGroupStack } from '@atakora/cdk';

const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

const userResource = new CrudResource(stack, 'UserData', {
  entityName: 'User',
  schema: {
    id: 'string',
    name: { type: 'string', required: true },
    email: { type: 'string', format: 'email', required: true },
    role: { type: 'string', validation: { enum: ['admin', 'user'] } },
    createdAt: 'timestamp'
  },
  partitionKey: '/id'
});
```

This single declaration creates:
- Cosmos DB account (serverless)
- Cosmos DB database and container
- Azure Functions App (consumption plan)
- 5 CRUD functions (create, read, update, delete, list)
- RBAC permissions
- Function code ready for deployment

### Multiple Entities (Shared Infrastructure)

```typescript
import { CrudResource } from '@atakora/component/data/crud';
import { DatabaseAccounts } from '@atakora/cdk/documentdb';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';

// Shared infrastructure
const cosmosDb = new DatabaseAccounts(stack, 'SharedDB', {
  enableServerless: true,
  location: 'eastus'
});

const functionsApp = new FunctionsApp(stack, 'SharedFunctions', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20'
});

// User entity
const userResource = new CrudResource(stack, 'UserData', {
  entityName: 'User',
  schema: {
    id: 'string',
    name: { type: 'string', required: true },
    email: { type: 'string', required: true }
  },
  cosmosAccount: cosmosDb,
  functionsApp: functionsApp,
  databaseName: 'app-db'
});

// Post entity (same infrastructure)
const postResource = new CrudResource(stack, 'PostData', {
  entityName: 'Post',
  schema: {
    id: 'string',
    userId: { type: 'string', required: true },
    title: { type: 'string', required: true },
    content: 'string',
    publishedAt: 'timestamp'
  },
  cosmosAccount: cosmosDb,
  functionsApp: functionsApp,
  databaseName: 'app-db',
  partitionKey: '/userId'
});
```

## Schema Definition

### Field Types

- `'string'` - Text data
- `'number'` - Numeric data
- `'boolean'` - True/false
- `'timestamp'` - ISO 8601 datetime
- `'object'` - Nested object
- `'array'` - Array of values

### Simple Fields

```typescript
schema: {
  id: 'string',
  name: 'string',
  age: 'number',
  active: 'boolean',
  createdAt: 'timestamp'
}
```

### Advanced Fields with Validation

```typescript
schema: {
  sku: {
    type: 'string',
    required: true,
    validation: {
      pattern: '^[A-Z]{3}-\\d{6}$',
      minLength: 10,
      maxLength: 10
    },
    description: 'Product SKU in format ABC-123456'
  },
  price: {
    type: 'number',
    required: true,
    validation: {
      min: 0,
      max: 999999.99
    }
  },
  category: {
    type: 'string',
    required: true,
    validation: {
      enum: ['electronics', 'clothing', 'food', 'books']
    }
  }
}
```

## Generated Operations

Each `CrudResource` generates 5 HTTP-triggered Azure Functions:

| Operation | HTTP Method | Path | Description |
|-----------|------------|------|-------------|
| create | POST | `/entities` | Create new entity |
| read | GET | `/entities/{id}` | Get entity by ID |
| update | PUT | `/entities/{id}` | Update entity |
| delete | DELETE | `/entities/{id}` | Delete entity |
| list | GET | `/entities` | List all entities |

### Accessing Operations

```typescript
// Get all operations
const operations = userResource.operations;

// Get specific operation
const createOp = userResource.getOperation('create');
console.log(createOp.functionName); // 'create-user'
console.log(createOp.httpMethod);   // 'POST'
console.log(createOp.pathPattern);  // '/users'

// Get function code for deployment
const functionCode = userResource.getFunctionCode();
console.log(functionCode.create); // Function code as string

// Get deployment manifest
const manifest = userResource.getDeploymentManifest();
```

## Deployment

The generated function code is ready for deployment to Azure Functions:

```typescript
// Get the generated code
const functions = userResource.generatedFunctions.functions;

// Deploy to Azure Functions
// (This would typically be done by the CLI or deployment pipeline)
fs.writeFileSync('functions/create/index.js', functions.create);
fs.writeFileSync('functions/read/index.js', functions.read);
fs.writeFileSync('functions/update/index.js', functions.update);
fs.writeFileSync('functions/delete/index.js', functions.delete);
fs.writeFileSync('functions/list/index.js', functions.list);
```

Environment variables are automatically configured:
- `COSMOS_ENDPOINT` - Cosmos DB endpoint
- `DATABASE_NAME` - Database name
- `CONTAINER_NAME` - Container name
- `PARTITION_KEY` - Partition key path
- `SCHEMA_JSON` - JSON-encoded schema for validation

## Advanced Usage

### Complex Schema

```typescript
const productResource = new CrudResource(stack, 'ProductData', {
  entityName: 'Product',
  entityNamePlural: 'Products',
  schema: {
    id: 'string',
    sku: {
      type: 'string',
      required: true,
      validation: {
        pattern: '^[A-Z]{3}-\\d{6}$'
      }
    },
    name: {
      type: 'string',
      required: true,
      validation: {
        minLength: 3,
        maxLength: 100
      }
    },
    price: {
      type: 'number',
      required: true,
      validation: {
        min: 0,
        max: 999999.99
      }
    },
    category: {
      type: 'string',
      required: true,
      validation: {
        enum: ['electronics', 'clothing', 'food', 'books', 'toys']
      }
    },
    inStock: { type: 'boolean', required: true },
    metadata: { type: 'object' },
    tags: { type: 'array' },
    createdAt: 'timestamp',
    updatedAt: 'timestamp'
  },
  partitionKey: '/category',
  tags: {
    environment: 'production',
    application: 'e-commerce'
  }
});
```

### Custom Partition Keys

```typescript
// Partition by user ID (multi-tenant)
partitionKey: '/userId'

// Partition by category (for product catalogs)
partitionKey: '/category'

// Partition by date (for time-series data)
partitionKey: '/date'
```

## Import Paths

```typescript
// Preferred: Direct data/crud import
import { CrudResource } from '@atakora/component/data/crud';

// Alternative: From data module (includes all data exports)
import { CrudResource } from '@atakora/component/data';

// Also available: Direct crud import
import { CrudApi } from '@atakora/component/crud';
```

## Architecture

```
CrudResource (data/crud/resource.ts)
  └─> CrudApi (crud/crud-api.ts)
       ├─> DatabaseAccounts (Cosmos DB)
       ├─> FunctionsApp (Azure Functions host)
       ├─> Generated CRUD Functions (from templates)
       └─> RBAC Grants (managed identity permissions)
```

The `CrudResource` is a thin, data-oriented wrapper around `CrudApi`. Both provide the same functionality - use whichever fits your architecture better.

## Related

- [CrudApi Component](../../crud/README.md) - Original CRUD component
- [DataStack](../README.md) - Schema-driven GraphQL infrastructure
- [Function Generation](../../crud/function-generator.ts) - How functions are generated
