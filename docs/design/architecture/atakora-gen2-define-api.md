# Atakora Gen 2 - Unified `define*` API Pattern

**Extension to**: atakora-gen2-design.md
**Created**: 2025-10-14
**Status**: Design Phase

## Overview

This document extends the Atakora Gen 2 design with a **unified `define*` API pattern** that provides a consistent, predictable interface across all component types.

## Design Philosophy

Every component type uses a single `define<Type>()` function:
- `defineCrudApi()` - CRUD API endpoints
- `defineFunction()` - Azure Functions
- `defineQueueProcessor()` - Queue-triggered processors
- `defineEventHandler()` - Event-driven handlers
- `defineInfrastructure()` - Infrastructure resources

**Benefits:**
1. **Predictable learning curve** - Learn one pattern, use everywhere
2. **Consistent imports** - Always `import { define<Type> } from '@atakora/component'`
3. **Uniform configuration** - Similar structure across all component types
4. **Better discoverability** - IDE autocomplete shows all `define*` functions

## Component Definitions

### 1. CRUD API (`defineCrudApi`)

```typescript
// packages/backend/src/data/crud/feedback/resource.ts
import { defineCrudApi } from '@atakora/component';

export const feedbackApi = defineCrudApi({
  name: 'feedback',
  entityName: 'Feedback',
  entityNamePlural: 'Feedbacks',
  partitionKey: '/id',

  schema: {
    id: 'string',
    rating: {
      type: 'number',
      required: true,
      validation: { min: 1, max: 5 },
    },
    comment: 'string',
    created_at: 'timestamp',
    user_id: {
      type: 'string',
      required: true,
      description: 'User who submitted feedback',
    },
    status: {
      type: 'string',
      validation: { enum: ['pending', 'approved', 'rejected'] },
      default: 'pending',
    },
  },

  // Optional: customize endpoints
  routes: {
    create: true,
    read: true,
    update: true,
    delete: true,
    list: {
      pageSize: 50,
      sortBy: 'created_at',
    },
  },
});
```

### 2. Azure Function (`defineFunction`)

```typescript
// packages/backend/src/functions/process-upload/resource.ts
import { defineFunction } from '@atakora/component';

export const processUploadFunction = defineFunction({
  name: 'process-upload',
  entry: './handler.ts',
  runtime: 20, // Node.js 20

  trigger: {
    type: 'blob',
    path: 'uploads/{name}',
  },

  bindings: [
    {
      type: 'cosmosDB',
      direction: 'out',
      name: 'outputDocument',
      database: '${backend.database}',
      container: 'data',
    },
  ],

  environment: {
    COSMOS_ENDPOINT: '${backend.cosmos.endpoint}',
    STORAGE_CONNECTION: '${backend.storage.connectionString}',
    SUBSCRIPTION_ID: '${azure.subscriptionId}',
  },

  // Optional advanced settings
  timeout: 300, // 5 minutes
  memorySize: 512, // MB
});
```

**Password Reset Example:**

```typescript
// packages/backend/src/functions/confirm-password-reset/resource.ts
import { defineFunction } from '@atakora/component';

/**
 * Confirm Password Reset function for completing password reset
 * Confirms password reset with verification code and sets new password
 */
export const confirmPasswordReset = defineFunction({
  name: 'confirm-password-reset',
  entry: './handler.ts',
  runtime: 20,

  trigger: {
    type: 'http',
    authLevel: 'function',
    methods: ['POST'],
    route: 'auth/confirm-reset',
  },

  environment: {
    SUBSCRIPTION_ID: '${azure.subscriptionId}',
    USER_POOL_ID: '${backend.userPool.id}',
    JWT_SECRET: '${backend.secrets.jwtSecret}',
  },
});
```

### 3. Queue Processor (`defineQueueProcessor`)

```typescript
// packages/backend/src/processors/image-resize/resource.ts
import { defineQueueProcessor } from '@atakora/component';

export const imageResizeProcessor = defineQueueProcessor({
  name: 'image-resize',
  entry: './handler.ts',
  runtime: 20,

  queue: 'image-processing',
  batchSize: 10,
  visibilityTimeout: 300, // 5 minutes

  bindings: [
    {
      type: 'blob',
      direction: 'in',
      name: 'inputBlob',
      path: 'uploads/{queueTrigger}',
    },
    {
      type: 'blob',
      direction: 'out',
      name: 'outputBlob',
      path: 'thumbnails/{queueTrigger}',
    },
  ],

  environment: {
    STORAGE_ACCOUNT: '${backend.storage.name}',
    MAX_WIDTH: '800',
    MAX_HEIGHT: '600',
    QUALITY: '85',
  },
});
```

### 4. Event Handler (`defineEventHandler`)

```typescript
// packages/backend/src/events/order-created/resource.ts
import { defineEventHandler } from '@atakora/component';

export const orderCreatedHandler = defineEventHandler({
  name: 'order-created',
  entry: './handler.ts',
  runtime: 20,

  eventSource: {
    type: 'eventGrid',
    topic: 'orders',
    filter: {
      eventType: 'Order.Created',
      subject: '/orders/*',
    },
  },

  bindings: [
    {
      type: 'cosmosDB',
      direction: 'out',
      name: 'orderDocument',
      database: '${backend.database}',
      container: 'orders',
    },
    {
      type: 'queue',
      direction: 'out',
      name: 'notificationQueue',
      queueName: 'notifications',
    },
  ],

  environment: {
    NOTIFICATION_SERVICE: '${backend.notificationService.url}',
    EMAIL_FROM: 'orders@company.com',
  },
});
```

### 5. Infrastructure Resource (`defineInfrastructure`)

```typescript
// packages/backend/src/infrastructure/log-analytics/resource.ts
import { defineInfrastructure } from '@atakora/component';

export const logAnalytics = defineInfrastructure({
  name: 'logs',
  type: 'operationalInsights',

  config: {
    retentionInDays: 90,
    sku: {
      name: 'PerGB2018',
    },
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true,
    },
  },

  tags: {
    purpose: 'centralized-logging',
    compliance: 'required',
  },
});
```

## Template Variables

All `define*` functions support template variable interpolation for dynamic runtime values:

### Backend Resources

```typescript
environment: {
  // Cosmos DB
  COSMOS_ENDPOINT: '${backend.cosmos.endpoint}',
  COSMOS_KEY: '${backend.cosmos.primaryKey}',
  COSMOS_DATABASE: '${backend.cosmos.databaseName}',

  // Storage
  STORAGE_CONNECTION: '${backend.storage.connectionString}',
  STORAGE_ACCOUNT: '${backend.storage.name}',
  STORAGE_KEY: '${backend.storage.primaryKey}',

  // Function App
  FUNCTION_APP_URL: '${backend.functionApp.url}',
  FUNCTION_APP_KEY: '${backend.functionApp.defaultHostKey}',
}
```

### Azure Context

```typescript
environment: {
  SUBSCRIPTION_ID: '${azure.subscriptionId}',
  TENANT_ID: '${azure.tenantId}',
  RESOURCE_GROUP: '${azure.resourceGroup}',
  LOCATION: '${azure.location}',
}
```

### Other Components

```typescript
environment: {
  // Reference CRUD API configuration
  FEEDBACK_DATABASE: '${feedbackApi.databaseName}',
  FEEDBACK_CONTAINER: '${feedbackApi.containerName}',

  // Reference other functions
  UPLOAD_FUNCTION_URL: '${processUploadFunction.url}',

  // Reference infrastructure
  LOG_WORKSPACE_ID: '${logAnalytics.workspaceId}',
}
```

## Implementation Architecture

### Type System

```typescript
// packages/component/src/types.ts

export type ComponentType =
  | 'crud-api'
  | 'azure-function'
  | 'queue-processor'
  | 'event-handler'
  | 'infrastructure';

export interface BaseComponent {
  componentType: ComponentType;
  name: string;
}

export interface CrudApiComponent extends BaseComponent {
  componentType: 'crud-api';
  entityName: string;
  schema: Schema;
  partitionKey: string;
  // ...
}

export interface FunctionComponent extends BaseComponent {
  componentType: 'azure-function';
  entry: string;
  runtime: number;
  trigger?: TriggerConfig;
  bindings?: BindingConfig[];
  environment?: Record<string, string>;
  // ...
}

// ... similar interfaces for other types
```

### Define Functions

```typescript
// packages/component/src/index.ts

export { defineCrudApi } from './crud/define-crud-api';
export { defineFunction } from './functions/define-function';
export { defineQueueProcessor } from './processors/define-queue-processor';
export { defineEventHandler } from './events/define-event-handler';
export { defineInfrastructure } from './infrastructure/define-infrastructure';
```

### Example Implementation: `defineFunction`

```typescript
// packages/component/src/functions/define-function.ts

import { AzureFunction } from './azure-function';

export interface FunctionConfig {
  name: string;
  entry: string;
  runtime?: 16 | 18 | 20;
  memory?: number;
  timeout?: number;

  trigger?: TriggerConfig;
  bindings?: BindingConfig[];

  environment?: Record<string, string>;

  // Advanced options
  vnetIntegration?: boolean;
  privateEndpoint?: boolean;
}

export function defineFunction(config: FunctionConfig): AzureFunction {
  // Validate configuration
  validateFunctionConfig(config);

  // Create function instance with componentType
  const fn = new AzureFunction(undefined as any, config.name, {
    ...config,
    componentType: 'azure-function',
  });

  // Process template variables in environment
  if (config.environment) {
    fn.environment = processTemplateVariables(config.environment);
  }

  return fn;
}

function validateFunctionConfig(config: FunctionConfig): void {
  if (!config.name) {
    throw new Error('Function name is required');
  }

  if (!config.entry) {
    throw new Error('Function entry point is required');
  }

  // Validate runtime
  if (config.runtime && ![16, 18, 20].includes(config.runtime)) {
    throw new Error(`Invalid runtime: ${config.runtime}. Must be 16, 18, or 20`);
  }

  // Additional validations...
}

function processTemplateVariables(env: Record<string, string>): Record<string, string> {
  const processed: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    // Template variable pattern: ${backend.cosmos.endpoint}
    if (value.startsWith('${') && value.endsWith('}')) {
      // Mark for runtime resolution
      processed[key] = value;
    } else {
      processed[key] = value;
    }
  }

  return processed;
}
```

## CLI Generators

### Generate CRUD API

```bash
$ atakora add-crud projects

✓ Created: packages/backend/src/data/crud/projects/resource.ts
✓ Created: packages/backend/src/data/crud/projects/handler.ts (optional)
✓ Updated: packages/backend/src/index.ts

Next steps:
  1. Edit the schema in data/crud/projects/resource.ts
  2. Run: atakora synth
  3. Deploy: atakora deploy
```

**Generated file:**

```typescript
// packages/backend/src/data/crud/projects/resource.ts
import { defineCrudApi } from '@atakora/component';

export const projectsApi = defineCrudApi({
  name: 'projects',
  entityName: 'Project',
  entityNamePlural: 'Projects',
  partitionKey: '/id',

  schema: {
    id: 'string',
    name: {
      type: 'string',
      required: true,
    },
    description: 'string',
    created_at: 'timestamp',
    updated_at: 'timestamp',
  },
});
```

### Generate Function

```bash
$ atakora add-function send-email

✓ Created: packages/backend/src/functions/send-email/resource.ts
✓ Created: packages/backend/src/functions/send-email/handler.ts
✓ Updated: packages/backend/src/index.ts

Next steps:
  1. Implement the handler in functions/send-email/handler.ts
  2. Run: atakora synth
  3. Deploy: atakora deploy
```

**Generated files:**

```typescript
// packages/backend/src/functions/send-email/resource.ts
import { defineFunction } from '@atakora/component';

export const sendEmailFunction = defineFunction({
  name: 'send-email',
  entry: './handler.ts',
  runtime: 20,

  trigger: {
    type: 'http',
    authLevel: 'function',
    methods: ['POST'],
    route: 'email/send',
  },

  environment: {
    SMTP_HOST: '${backend.smtp.host}',
    SMTP_FROM: 'noreply@company.com',
  },
});
```

```typescript
// packages/backend/src/functions/send-email/handler.ts
import { AzureFunction, Context, HttpRequest } from '@azure/functions';

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log('HTTP trigger function processed a request.');

  const { to, subject, body } = req.body;

  // TODO: Implement email sending logic

  context.res = {
    status: 200,
    body: { message: 'Email sent successfully' },
  };
};

export default httpTrigger;
```

## Migration from Gen 1

### Before (Gen 1)

```typescript
import { CrudApi } from '@atakora/component';

export const feedbackApi = CrudApi.define('FeedbackApi', {
  // ... config
});
```

### After (Gen 2)

```typescript
import { defineCrudApi } from '@atakora/component';

export const feedbackApi = defineCrudApi({
  name: 'feedback',
  // ... config
});
```

**Migration tool:**

```bash
$ atakora migrate define-api

Scanning for component definitions...
Found 15 components to migrate:
  - 5 CRUD APIs
  - 8 Functions
  - 2 Infrastructure resources

✓ Migrated: data/crud/feedback/resource.ts
✓ Migrated: data/crud/lab-dataset/resource.ts
✓ Migrated: functions/process-upload/resource.ts
...

✓ All components migrated to define* pattern
✓ Updated imports in index.ts

Next steps:
  1. Review changes: git diff
  2. Test: atakora synth
  3. Commit: git commit -m "Migrate to Gen 2 define* API"
```

## Benefits Summary

1. **Consistent API** - Same pattern everywhere
2. **Better DX** - Predictable, intuitive
3. **Easier onboarding** - Learn once, use everywhere
4. **Type safety** - Full TypeScript support
5. **IDE support** - Autocomplete for all `define*` functions
6. **Validation** - Built-in config validation
7. **Template variables** - Dynamic runtime values
8. **Migration path** - Automated tooling available

## Success Metrics

- **API consistency**: 100% - all components use `define*`
- **Learning curve**: < 1 hour to master pattern
- **Migration time**: < 30 minutes per project
- **Developer satisfaction**: > 4.5/5

---

**Next Steps:**
1. Implement `define*` functions for all component types
2. Add template variable resolution
3. Create CLI generators
4. Build migration tooling
5. Update documentation with examples
