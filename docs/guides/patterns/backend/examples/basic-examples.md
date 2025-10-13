# Basic Backend Pattern Examples

Practical examples showing common usage patterns for the Backend Pattern. These examples demonstrate real-world scenarios you'll encounter when building applications with @atakora/component.

## Table of Contents

- [Example 1: Single Component Backend](#example-1-single-component-backend)
- [Example 2: Multiple CRUD APIs](#example-2-multiple-crud-apis)
- [Example 3: Mixed Component Types](#example-3-mixed-component-types)
- [Example 4: Resource Sharing Example](#example-4-resource-sharing-example)
- [Example 5: Cross-Component References](#example-5-cross-component-references)
- [Example 6: Environment-Specific Configuration](#example-6-environment-specific-configuration)
- [Example 7: Adding Monitoring](#example-7-adding-monitoring)
- [Example 8: Custom Tags and Naming](#example-8-custom-tags-and-naming)

---

## Example 1: Single Component Backend

The simplest possible backend with a single CRUD API.

### Use Case

You're building a user management API and want to use the backend pattern for future extensibility.

### Code

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

// Create CDK app
const app = new App();

// Define backend with single component
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: {
      id: 'string',
      email: 'string',
      firstName: 'string',
      lastName: 'string',
      role: 'string',
      createdAt: 'timestamp',
      updatedAt: 'timestamp'
    },
    partitionKey: '/id',
    ttl: 2592000, // 30 days
    enableSoftDelete: true
  })
});

// Create stack
const stack = new ResourceGroupStack(app, 'UserManagementStack', {
  resourceGroupName: 'rg-users-prod',
  location: 'eastus'
});

// Add backend to stack
backend.addToStack(stack);

// Access component
console.log('User API Endpoint:', backend.components.userApi.apiEndpoint);

// Synthesize
app.synth();
```

### Resources Created

- 1 Cosmos DB Account (serverless)
- 1 Container (`users`)
- 1 Function App (Node 20)
- 5 Functions (create, read, update, delete, list)
- 1 Storage Account (for Functions runtime)

### What You Get

```bash
# API Endpoints
POST   https://<function-app>.azurewebsites.net/users       # Create
GET    https://<function-app>.azurewebsites.net/users/:id   # Read
PUT    https://<function-app>.azurewebsites.net/users/:id   # Update
DELETE https://<function-app>.azurewebsites.net/users/:id   # Delete
GET    https://<function-app>.azurewebsites.net/users       # List
```

---

## Example 2: Multiple CRUD APIs

Multiple CRUD APIs sharing infrastructure for a multi-entity system.

### Use Case

Building an e-commerce platform with separate APIs for users, products, and orders.

### Code

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

// Define backend with multiple CRUD APIs
const backend = defineBackend({
  // User management API
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: {
      id: 'string',
      email: 'string',
      firstName: 'string',
      lastName: 'string',
      address: 'object',
      createdAt: 'timestamp'
    },
    partitionKey: '/id',
    uniqueKeys: ['/email']
  }),

  // Product catalog API
  productApi: CrudApi.define('ProductApi', {
    entityName: 'Product',
    schema: {
      id: 'string',
      sku: 'string',
      name: 'string',
      description: 'string',
      price: 'number',
      category: 'string',
      inStock: 'boolean',
      createdAt: 'timestamp',
      updatedAt: 'timestamp'
    },
    partitionKey: '/category',
    uniqueKeys: ['/sku']
  }),

  // Order management API
  orderApi: CrudApi.define('OrderApi', {
    entityName: 'Order',
    schema: {
      id: 'string',
      userId: 'string',
      items: 'array',
      total: 'number',
      status: 'string',
      createdAt: 'timestamp',
      updatedAt: 'timestamp'
    },
    partitionKey: '/userId',
    ttl: 7776000 // 90 days retention
  })
}, {
  // Backend configuration
  environment: 'production',
  location: 'eastus'
});

// Create stack
const stack = new ResourceGroupStack(app, 'EcommerceStack', {
  resourceGroupName: 'rg-ecommerce-prod',
  location: 'eastus'
});

backend.addToStack(stack);

// Access all APIs
console.log('User API:', backend.components.userApi.apiEndpoint);
console.log('Product API:', backend.components.productApi.apiEndpoint);
console.log('Order API:', backend.components.orderApi.apiEndpoint);

app.synth();
```

### Resources Created

- 1 Cosmos DB Account (shared)
  - 3 Databases: `users-db`, `products-db`, `orders-db`
  - 3 Containers: `users`, `products`, `orders`
- 1 Function App (shared)
  - 15 Functions total (5 per API)
- 1 Storage Account (shared)

### Cost Comparison

| Resource | Traditional (3 separate) | Backend Pattern (shared) | Savings |
|----------|-------------------------|-------------------------|---------|
| Cosmos DB | 3 × $24 = $72 | $24 | $48/month |
| Function App | 3 × $13 = $39 | $13 | $26/month |
| Storage | 3 × $0.18 = $0.54 | $0.18 | $0.36/month |
| **Total** | **$111.54/month** | **$37.18/month** | **$74.36/month (67%)** |

---

## Example 3: Mixed Component Types

Combining different component types in a single backend.

### Use Case

Building a complete application with CRUD APIs, background processing, and a static website.

### Code

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { FunctionsApp } from '@atakora/component/functions';
import { StaticSiteWithCdn } from '@atakora/component/web';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

const backend = defineBackend({
  // CRUD API for data management
  dataApi: CrudApi.define('DataApi', {
    entityName: 'Data',
    schema: {
      id: 'string',
      name: 'string',
      value: 'string',
      timestamp: 'timestamp'
    },
    partitionKey: '/id',
    cors: {
      allowedOrigins: ['https://myapp.com']
    }
  }),

  // Background processing functions
  processorApp: FunctionsApp.define('ProcessorApp', {
    runtime: 'node',
    version: '20',
    functions: {
      // HTTP-triggered webhook processor
      'process-webhook': {
        trigger: 'http',
        methods: ['POST'],
        authLevel: 'function'
      },

      // Timer-triggered batch job (runs every hour)
      'hourly-batch': {
        trigger: 'timer',
        schedule: '0 0 * * * *'
      },

      // Queue-triggered message processor
      'process-queue-message': {
        trigger: 'queue',
        queueName: 'processing-queue'
      }
    },
    environmentVariables: {
      DATA_API_ENDPOINT: '${dataApi.apiEndpoint}',
      LOG_LEVEL: 'info'
    }
  }),

  // Static website frontend
  website: StaticSiteWithCdn.define('Website', {
    indexDocument: 'index.html',
    errorDocument: 'error.html',
    enableSpaMode: true,
    customDomain: 'myapp.com',
    dnsZoneName: 'myapp.com',
    enableCompression: true,
    cacheMaxAge: 86400, // 24 hours
    cors: {
      allowedOrigins: ['*']
    }
  })
}, {
  environment: 'production',
  location: 'eastus',
  tags: {
    project: 'myapp',
    team: 'fullstack'
  }
});

const stack = new ResourceGroupStack(app, 'FullAppStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

backend.addToStack(stack);

// Output endpoints
console.log('Data API:', backend.components.dataApi.apiEndpoint);
console.log('Webhook:', backend.components.processorApp.functionEndpoint('process-webhook'));
console.log('Website:', backend.components.website.cdnEndpoint);
console.log('Custom Domain:', backend.components.website.customDomainEndpoint);

app.synth();
```

### Resources Created

- 1 Cosmos DB Account (for DataApi)
- 1 Function App (shared by DataApi and ProcessorApp)
- 1 Storage Account (shared for Functions runtime + queue)
- 1 Storage Account (for static website)
- 1 CDN Profile
- 1 CDN Endpoint
- 1 DNS Zone

### Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ CDN + Static│─────▶│  Function    │─────▶│  Cosmos DB  │
│   Website   │      │     App      │      │  (shared)   │
└─────────────┘      │              │      └─────────────┘
                     │ - Data API   │
                     │ - Processors │
                     │ - Webhooks   │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Storage    │
                     │   (queue)    │
                     └──────────────┘
```

---

## Example 4: Resource Sharing Example

Demonstrating explicit resource sharing and inspection.

### Use Case

You need to understand exactly what resources are shared and how to access them.

### Code

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: { id: 'string', name: 'string' },
    partitionKey: '/id'
  }),

  productApi: CrudApi.define('ProductApi', {
    entityName: 'Product',
    schema: { id: 'string', name: 'string' },
    partitionKey: '/id'
  }),

  orderApi: CrudApi.define('OrderApi', {
    entityName: 'Order',
    schema: { id: 'string', userId: 'string' },
    partitionKey: '/userId'
  })
});

const stack = new ResourceGroupStack(app, 'SharedResourcesStack', {
  resourceGroupName: 'rg-shared-prod',
  location: 'eastus'
});

backend.addToStack(stack);

// Inspect shared resources
console.log('\n=== Shared Resources ===');

// Access shared Cosmos DB
const cosmosAccount = backend.getResource('cosmos', 'shared');
console.log('Cosmos DB Account:', cosmosAccount?.resourceId);

// Access shared Function App
const functionApp = backend.getResource('functions', 'shared');
console.log('Function App:', functionApp?.resourceId);

// Access shared Storage Account
const storageAccount = backend.getResource('storage', 'shared');
console.log('Storage Account:', storageAccount?.resourceId);

// Inspect component-specific resources
console.log('\n=== Component Resources ===');

// Each component has its own database
console.log('User Database:', backend.components.userApi.database.name);
console.log('Product Database:', backend.components.productApi.database.name);
console.log('Order Database:', backend.components.orderApi.database.name);

// But they all share the same Cosmos DB account
console.log('\n=== Resource Sharing Verification ===');
const userApiCosmos = backend.components.userApi.database.parent;
const productApiCosmos = backend.components.productApi.database.parent;
const orderApiCosmos = backend.components.orderApi.database.parent;

console.log('All APIs share same Cosmos Account:',
  userApiCosmos === productApiCosmos &&
  productApiCosmos === orderApiCosmos
);

// All components' functions are in the same Function App
console.log('\n=== Function Sharing ===');
console.log('User API Functions:', backend.components.userApi.functions.resourceId);
console.log('Product API Functions:', backend.components.productApi.functions.resourceId);
console.log('Order API Functions:', backend.components.orderApi.functions.resourceId);
console.log('All functions in same app:',
  backend.components.userApi.functions.resourceId ===
  backend.components.productApi.functions.resourceId
);

app.synth();
```

### Output

```
=== Shared Resources ===
Cosmos DB Account: /subscriptions/.../cosmosdbAccounts/cosmos-shared-prod
Function App: /subscriptions/.../sites/func-shared-prod
Storage Account: /subscriptions/.../storageAccounts/stsharedprod

=== Component Resources ===
User Database: users-db
Product Database: products-db
Order Database: orders-db

=== Resource Sharing Verification ===
All APIs share same Cosmos Account: true

=== Function Sharing ===
User API Functions: /subscriptions/.../sites/func-shared-prod
Product API Functions: /subscriptions/.../sites/func-shared-prod
Order API Functions: /subscriptions/.../sites/func-shared-prod
All functions in same app: true
```

---

## Example 5: Cross-Component References

Components referencing each other's outputs.

### Use Case

Your processor functions need to call CRUD API endpoints, or you need to pass configuration between components.

### Code

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { FunctionsApp } from '@atakora/component/functions';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

const backend = defineBackend({
  // Define CRUD API first
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: {
      id: 'string',
      email: 'string',
      name: 'string'
    },
    partitionKey: '/id'
  }),

  // Define processor that references the API
  notificationProcessor: FunctionsApp.define('NotificationProcessor', {
    runtime: 'node',
    version: '20',
    functions: {
      'send-welcome-email': {
        trigger: 'queue',
        queueName: 'new-users'
      }
    },
    // Reference userApi endpoint in environment variables
    environmentVariables: {
      USER_API_ENDPOINT: '${userApi.apiEndpoint}',
      USER_API_KEY: '${userApi.functionKey}',
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || ''
    }
  })
});

const stack = new ResourceGroupStack(app, 'NotificationStack', {
  resourceGroupName: 'rg-notifications-prod',
  location: 'eastus'
});

backend.addToStack(stack);

// Access component outputs after initialization
const userApiOutputs = backend.components.userApi.getOutputs();
const processorOutputs = backend.components.notificationProcessor.getOutputs();

console.log('User API Outputs:', {
  endpoint: userApiOutputs.apiEndpoint,
  operations: userApiOutputs.operations,
  databaseId: userApiOutputs.databaseId
});

console.log('Processor Outputs:', {
  functionApp: processorOutputs.functionAppName,
  functions: processorOutputs.functionNames
});

// Processor can now call User API
console.log('\nNotification processor will call:', userApiOutputs.apiEndpoint);

app.synth();
```

### How References Work

1. **Template Strings**: Use `${componentId.property}` syntax in configuration
2. **Backend Resolution**: Backend resolves references during initialization
3. **Type-Safe Access**: Use `getOutputs()` for runtime access

### Example Function Code

```typescript
// In send-welcome-email function
import fetch from 'node-fetch';

export async function handler(context, queueItem) {
  const userId = queueItem.userId;

  // Call User API using injected endpoint
  const userApiEndpoint = process.env.USER_API_ENDPOINT;
  const userApiKey = process.env.USER_API_KEY;

  const response = await fetch(`${userApiEndpoint}/users/${userId}`, {
    headers: {
      'x-functions-key': userApiKey
    }
  });

  const user = await response.json();

  // Send welcome email
  await sendEmail(user.email, 'Welcome!', `Hello ${user.name}!`);

  context.log(`Welcome email sent to ${user.email}`);
}
```

---

## Example 6: Environment-Specific Configuration

Different configurations for dev, staging, and production.

### Use Case

You need different resource configurations per environment while keeping code DRY.

### Code

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

// Get environment from command line or environment variable
const environment = process.env.DEPLOY_ENV || 'dev';

// Environment-specific configuration
const envConfig = {
  dev: {
    location: 'eastus',
    throughput: 400,
    ttl: 86400, // 1 day
    monitoring: false
  },
  staging: {
    location: 'eastus',
    throughput: 800,
    ttl: 604800, // 7 days
    monitoring: true
  },
  production: {
    location: 'eastus2',
    throughput: 4000,
    ttl: 2592000, // 30 days
    monitoring: true
  }
}[environment];

// Define backend with environment-specific config
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: {
      id: 'string',
      email: 'string',
      name: 'string',
      createdAt: 'timestamp'
    },
    partitionKey: '/id',
    throughput: envConfig.throughput,
    ttl: envConfig.ttl
  }),

  productApi: CrudApi.define('ProductApi', {
    entityName: 'Product',
    schema: {
      id: 'string',
      name: 'string',
      price: 'number'
    },
    partitionKey: '/id',
    throughput: envConfig.throughput,
    ttl: envConfig.ttl
  })
}, {
  environment,
  location: envConfig.location,
  monitoring: envConfig.monitoring ? {
    enabled: true,
    retentionDays: environment === 'production' ? 90 : 30
  } : false,
  tags: {
    environment,
    project: 'myapp',
    managedBy: 'atakora'
  }
});

// Create environment-specific stack
const stack = new ResourceGroupStack(app, `AppStack-${environment}`, {
  resourceGroupName: `rg-myapp-${environment}`,
  location: envConfig.location
});

backend.addToStack(stack);

console.log(`Deployed to ${environment} environment:`);
console.log('- Location:', envConfig.location);
console.log('- Throughput:', envConfig.throughput);
console.log('- TTL:', envConfig.ttl);
console.log('- Monitoring:', envConfig.monitoring);

app.synth();
```

### Deploy to Different Environments

```bash
# Deploy to dev
DEPLOY_ENV=dev npx atakora deploy

# Deploy to staging
DEPLOY_ENV=staging npx atakora deploy

# Deploy to production
DEPLOY_ENV=production npx atakora deploy
```

### Result

Each environment gets appropriately sized resources:

| Environment | Location | Throughput | TTL | Monitoring | Monthly Cost |
|-------------|----------|------------|-----|------------|--------------|
| Dev | eastus | 400 RU/s | 1 day | No | ~$30 |
| Staging | eastus | 800 RU/s | 7 days | Yes | ~$60 |
| Production | eastus2 | 4000 RU/s | 30 days | Yes | ~$280 |

---

## Example 7: Adding Monitoring

Enable Application Insights monitoring for all components.

### Use Case

You need centralized monitoring, logging, and alerting for your backend.

### Code

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { FunctionsApp } from '@atakora/component/functions';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: { id: 'string', name: 'string', email: 'string' },
    partitionKey: '/id'
  }),

  processorApp: FunctionsApp.define('ProcessorApp', {
    runtime: 'node',
    version: '20',
    functions: {
      'process-data': {
        trigger: 'timer',
        schedule: '0 */5 * * * *' // Every 5 minutes
      }
    }
  })
}, {
  // Comprehensive monitoring configuration
  environment: 'production',
  location: 'eastus',
  monitoring: {
    enabled: true,
    retentionDays: 90,
    samplingPercentage: 100, // 100% in production
    workspaceName: 'myapp-workspace',
    applicationInsightsName: 'myapp-insights'
  },
  tags: {
    project: 'myapp',
    monitoring: 'enabled'
  }
});

const stack = new ResourceGroupStack(app, 'MonitoredAppStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

backend.addToStack(stack);

// Monitoring resources are automatically created and configured
console.log('Monitoring enabled for all components');
console.log('Application Insights:', backend.config.monitoring);

// All components automatically send telemetry to Application Insights
console.log('\nMonitored endpoints:');
console.log('- User API:', backend.components.userApi.apiEndpoint);
console.log('- Processor:', backend.components.processorApp.functionAppName);

app.synth();
```

### What You Get

**Automatic Configuration:**
- Application Insights resource created
- Log Analytics workspace created
- All Function Apps connected to Application Insights
- All Cosmos DB diagnostic settings enabled
- All Storage Accounts logging enabled

**Available Metrics:**
- Request rates and response times
- Failure rates and error details
- Dependency tracking (Cosmos DB calls)
- Custom events and traces
- Performance counters

**Queries You Can Run:**

```kusto
// Failed API requests
requests
| where success == false
| summarize count() by name, resultCode
| order by count_ desc

// Slow API calls
requests
| where duration > 1000
| project timestamp, name, duration, resultCode
| order by duration desc

// Cosmos DB operations
dependencies
| where type == "Azure DocumentDB"
| summarize avg(duration), count() by name
```

---

## Example 8: Custom Tags and Naming

Customize resource naming and apply organization-specific tags.

### Use Case

Your organization has naming conventions and required tags for cost allocation.

### Code

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: { id: 'string', name: 'string' },
    partitionKey: '/id'
  }),

  productApi: CrudApi.define('ProductApi', {
    entityName: 'Product',
    schema: { id: 'string', name: 'string' },
    partitionKey: '/id'
  })
}, {
  environment: 'production',
  location: 'eastus',

  // Custom naming convention
  naming: {
    formatResourceName: (type, backendId, suffix) => {
      // Format: {type}-{company}-{backendId}-{suffix}
      const company = 'acme';
      const parts = [type, company, backendId, suffix]
        .filter(Boolean)
        .join('-');
      return parts.toLowerCase().replace(/[^a-z0-9-]/g, '');
    },

    formatResourceGroupName: (backendId, env) => {
      // Format: rg-{company}-{backendId}-{env}
      return `rg-acme-${backendId}-${env}`.toLowerCase();
    }
  },

  // Organization-required tags
  tags: {
    // Cost allocation
    'cost-center': 'engineering',
    'project': 'customer-platform',
    'billing-code': 'PROJ-12345',

    // Ownership
    'team': 'backend-team',
    'owner': 'john.doe@acme.com',
    'tech-lead': 'jane.smith@acme.com',

    // Compliance
    'data-classification': 'internal',
    'compliance-scope': 'sox',

    // Environment
    'environment': 'production',
    'deployed-by': 'ci-cd-pipeline',
    'deployment-date': new Date().toISOString(),

    // Operational
    'backup-policy': 'daily',
    'monitoring-level': 'detailed',
    'support-level': 'tier-1'
  }
});

const stack = new ResourceGroupStack(app, 'PlatformStack', {
  resourceGroupName: 'rg-acme-platform-production',
  location: 'eastus'
});

backend.addToStack(stack);

console.log('Resources created with custom naming:');
console.log('- cosmos-acme-backend-shared');
console.log('- func-acme-backend-shared');
console.log('- stacmebackendshared');

console.log('\nAll resources tagged for cost allocation and compliance');

app.synth();
```

### Resource Naming Result

**Default Naming:**
```
cosmosdb-Backend-shared
functions-Backend-shared
storage-Backend-shared
```

**Custom Naming:**
```
cosmos-acme-platform-production
func-acme-platform-production
stacmeplatformproduction
```

### Cost Allocation Queries

With proper tagging, you can track costs:

```bash
# Azure CLI: Get costs by project
az consumption usage list \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --query "[?tags.project=='customer-platform'].{name:name,cost:cost}" \
  --output table

# Get costs by team
az consumption usage list \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --query "[?tags.team=='backend-team'].{name:name,cost:cost}" \
  --output table
```

---

## Next Steps

After reviewing these basic examples:

1. **Try It Yourself**: Start with Example 1 and build up
2. **Advanced Patterns**: See [Advanced Examples](./advanced-examples.md)
3. **Migration**: Convert existing code with [Migration Guide](../migration-guide.md)
4. **Optimization**: Learn [Best Practices](../best-practices.md)
5. **Troubleshooting**: Check [Troubleshooting Guide](../troubleshooting.md)

## Additional Resources

- [Backend Pattern Overview](../overview.md)
- [API Reference](../api-reference.md)
- [Architecture Documentation](../../../../../architecture/decisions/backend-architecture-design.md)

## Complete Example Project

For a complete, runnable example project, see:
```
examples/backend-pattern-demo/
├── src/
│   ├── main.ts                 # Full example app
│   ├── single-component.ts     # Example 1
│   ├── multiple-apis.ts        # Example 2
│   └── mixed-components.ts     # Example 3
├── package.json
└── README.md
```

Clone and run:
```bash
git clone https://github.com/atakora/examples
cd examples/backend-pattern-demo
npm install
npm run deploy
```
