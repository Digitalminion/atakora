# CrudResource Usage Examples

## Example 1: Simple User API

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import { CrudResource } from '@atakora/component/data/crud';

const app = new App();

const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

// Create a complete CRUD API for users
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

// Synthesize to ARM templates
app.synth();

// Access the generated resources
console.log('Database:', userResource.database.accountName);
console.log('Container:', userResource.containerName);
console.log('API Endpoint:', userResource.apiEndpoint);

// Get deployment info
const manifest = userResource.getDeploymentManifest();
console.log('Operations:', manifest.operations);
```

This creates:
- ✅ Cosmos DB account (serverless)
- ✅ Database and container
- ✅ Azure Functions App
- ✅ 5 HTTP-triggered functions
- ✅ RBAC permissions
- ✅ Environment variables

## Example 2: Multiple Entities with Shared Infrastructure

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import { CrudResource } from '@atakora/component/data/crud';
import { DatabaseAccounts } from '@atakora/cdk/documentdb';
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';

const app = new App();

const stack = new ResourceGroupStack(app, 'BlogStack', {
  resourceGroupName: 'rg-blog-prod',
  location: 'eastus'
});

// Create shared infrastructure
const cosmosDb = new DatabaseAccounts(stack, 'BlogDB', {
  enableServerless: true,
  location: 'eastus',
  tags: { app: 'blog', env: 'production' }
});

const functionsApp = new FunctionsApp(stack, 'BlogFunctions', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  location: 'eastus'
});

// User entity
const userResource = new CrudResource(stack, 'UserData', {
  entityName: 'User',
  schema: {
    id: 'string',
    username: { type: 'string', required: true },
    email: { type: 'string', format: 'email', required: true },
    bio: 'string',
    avatarUrl: 'string',
    joinedAt: 'timestamp'
  },
  cosmosAccount: cosmosDb,
  functionsApp: functionsApp,
  databaseName: 'blog-db',
  partitionKey: '/id'
});

// Post entity
const postResource = new CrudResource(stack, 'PostData', {
  entityName: 'Post',
  schema: {
    id: 'string',
    userId: { type: 'string', required: true },
    title: { type: 'string', required: true },
    content: { type: 'string', required: true },
    slug: { type: 'string', required: true },
    status: {
      type: 'string',
      required: true,
      validation: { enum: ['draft', 'published', 'archived'] }
    },
    tags: 'array',
    publishedAt: 'timestamp',
    updatedAt: 'timestamp'
  },
  cosmosAccount: cosmosDb,
  functionsApp: functionsApp,
  databaseName: 'blog-db',
  partitionKey: '/userId'
});

// Comment entity
const commentResource = new CrudResource(stack, 'CommentData', {
  entityName: 'Comment',
  schema: {
    id: 'string',
    postId: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    content: { type: 'string', required: true },
    createdAt: 'timestamp'
  },
  cosmosAccount: cosmosDb,
  functionsApp: functionsApp,
  databaseName: 'blog-db',
  partitionKey: '/postId'
});

app.synth();
```

Infrastructure created:
- 1× Cosmos DB account (shared)
- 3× Cosmos DB containers (users, posts, comments)
- 1× Functions App (shared)
- 15× Functions (5 per entity)
- All RBAC permissions configured

## Example 3: E-Commerce Products with Complex Schema

```typescript
import { App, ResourceGroupStack } from '@atakora/cdk';
import { CrudResource } from '@atakora/component/data/crud';

const app = new App();

const stack = new ResourceGroupStack(app, 'EcommerceStack', {
  resourceGroupName: 'rg-ecommerce-prod',
  location: 'eastus'
});

const productResource = new CrudResource(stack, 'ProductData', {
  entityName: 'Product',
  entityNamePlural: 'Products',
  schema: {
    id: 'string',
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
    name: {
      type: 'string',
      required: true,
      validation: {
        minLength: 3,
        maxLength: 100
      }
    },
    description: {
      type: 'string',
      validation: {
        maxLength: 5000
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
    compareAtPrice: {
      type: 'number',
      validation: {
        min: 0,
        max: 999999.99
      }
    },
    currency: {
      type: 'string',
      required: true,
      validation: {
        enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD']
      }
    },
    category: {
      type: 'string',
      required: true,
      validation: {
        enum: ['electronics', 'clothing', 'food', 'books', 'toys', 'home', 'sports']
      }
    },
    subcategory: 'string',
    brand: 'string',
    inStock: { type: 'boolean', required: true },
    stockQuantity: {
      type: 'number',
      required: true,
      validation: {
        min: 0,
        max: 999999
      }
    },
    images: 'array',
    specifications: 'object',
    tags: 'array',
    rating: {
      type: 'number',
      validation: {
        min: 0,
        max: 5
      }
    },
    reviewCount: 'number',
    featured: 'boolean',
    createdAt: 'timestamp',
    updatedAt: 'timestamp'
  },
  partitionKey: '/category',
  tags: {
    environment: 'production',
    application: 'e-commerce',
    cost-center: 'retail'
  }
});

app.synth();

// Access operation details
productResource.operations.forEach(op => {
  console.log(`${op.operation}: ${op.httpMethod} ${op.pathPattern} -> ${op.functionName}`);
});

// Get function code for deployment
const functionCode = productResource.getFunctionCode();
// Deploy these to your Function App
```

Generated API endpoints:
- `POST /products` - Create product
- `GET /products/{id}` - Get product
- `PUT /products/{id}` - Update product
- `DELETE /products/{id}` - Delete product
- `GET /products` - List products

## Example 4: Getting Deployment Information

```typescript
// After creating a CrudResource
const userResource = new CrudResource(stack, 'UserData', {
  entityName: 'User',
  schema: { /* ... */ }
});

// Get all operations
const operations = userResource.operations;
console.log('Available operations:', operations.map(op => op.operation));

// Get specific operation
const createOp = userResource.getOperation('create');
if (createOp) {
  console.log('Create function:', createOp.functionName);
  console.log('HTTP method:', createOp.httpMethod);
  console.log('Path:', createOp.pathPattern);
}

// Get function code for deployment
const functionCode = userResource.getFunctionCode();
console.log('Create function code:', functionCode.create.substring(0, 100) + '...');

// Get deployment manifest (useful for CI/CD)
const manifest = userResource.getDeploymentManifest();
console.log(JSON.stringify(manifest, null, 2));

// Output:
// {
//   "entityName": "User",
//   "databaseName": "user-db",
//   "containerName": "users",
//   "partitionKey": "/id",
//   "operations": [
//     {
//       "operation": "create",
//       "functionName": "create-user",
//       "httpMethod": "POST",
//       "pathPattern": "/users"
//     },
//     // ... more operations
//   ],
//   "environmentVariables": {
//     "DATABASE_NAME": "user-db",
//     "CONTAINER_NAME": "users",
//     "PARTITION_KEY": "/id"
//   }
// }
```

## Example 5: Using with Atakora CLI

```bash
# Initialize a new Atakora project
atakora init my-api-project

# Navigate to the project
cd my-api-project

# Add a CRUD entity using the CLI (coming soon)
atakora add-crud User \
  --schema '{"id":"string","name":{"type":"string","required":true}}' \
  --partition-key '/id'

# This generates:
# - infrastructure/stacks/user-stack.ts
# - functions/users/create.ts
# - functions/users/read.ts
# - functions/users/update.ts
# - functions/users/delete.ts
# - functions/users/list.ts

# Deploy
atakora deploy --stack UserStack
```

## Import Variations

```typescript
// Option 1: Direct from data/crud (recommended)
import { CrudResource } from '@atakora/component/data/crud';

// Option 2: From data module (includes all data exports)
import { CrudResource } from '@atakora/component/data';

// Option 3: Direct from crud component
import { CrudApi } from '@atakora/component/crud';

// All three give you the same functionality!
```
