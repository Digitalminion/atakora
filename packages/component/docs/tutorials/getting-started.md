# Getting Started with Atakora Component

Welcome to Atakora Component - a schema-first backend framework for Azure that automatically generates production-ready infrastructure from your data models.

## What You'll Build

In this tutorial, you'll build a complete task management backend with:

- User authentication (Microsoft Entra ID)
- Task and project data models
- Automatic REST API endpoints
- Azure infrastructure deployment
- Comprehensive testing

**Time to complete:** 30 minutes

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and **npm 9+** installed
- **Azure subscription** with appropriate permissions
- **Azure CLI** installed and configured (`az login`)
- **TypeScript** knowledge (basic to intermediate)
- **Git** for version control

## Step 1: Installation

### Create a New Project

```bash
# Create project directory
mkdir my-task-app && cd my-task-app

# Initialize npm project
npm init -y

# Install Atakora Component and dependencies
npm install @atakora/component @atakora/cdk @atakora/lib

# Install TypeScript and development tools
npm install -D typescript @types/node vitest
```

### Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

### Project Structure

Create the following directory structure:

```
my-task-app/
├── src/
│   ├── backend.ts          # Backend definition
│   ├── schema.ts           # Data models
│   ├── auth.ts             # Authentication config
│   └── functions/          # Custom handlers
├── tests/                  # Test files
├── infrastructure/         # Generated ARM templates
├── package.json
└── tsconfig.json
```

## Step 2: Define Your Schema

Create `src/schema.ts` to define your data models:

```typescript
import { defineSchema, a, c } from '@atakora/component/schema';

/**
 * Task Management Schema
 *
 * Models:
 * - User: Application users
 * - Project: Project containers
 * - Task: Individual tasks
 */
export const schema = defineSchema({
  schema: a.schema({

    // User model
    User: c.model({
      id: a.id(),
      email: a.string()
        .required()
        .email()
        .description('User email address'),
      name: a.string()
        .required()
        .min(2)
        .max(100)
        .description('Full name'),
      role: a.enum(['admin', 'member', 'viewer'])
        .default('member')
        .description('User role'),
      createdAt: a.datetime()
        .default(() => new Date())
        .description('Account creation timestamp'),
      lastLoginAt: a.datetime()
        .optional()
        .description('Last login timestamp'),
    })
      .authorization(allow => [
        // Users can read their own record
        allow.owner('id'),
        // Admins can read all users
        allow.custom((ctx) => ctx.user.role === 'admin'),
      ]),

    // Project model
    Project: c.model({
      id: a.id(),
      name: a.string()
        .required()
        .min(3)
        .max(200)
        .description('Project name'),
      description: a.string()
        .optional()
        .max(1000)
        .description('Project description'),
      ownerId: a.string()
        .required()
        .description('Project owner user ID'),
      owner: a.ref('User')
        .optional()
        .description('Reference to owner'),
      status: a.enum(['active', 'archived', 'completed'])
        .default('active')
        .description('Project status'),
      tags: a.array(a.string())
        .optional()
        .description('Project tags'),
      createdAt: a.datetime()
        .default(() => new Date()),
      updatedAt: a.datetime()
        .default(() => new Date()),
    })
      .authorization(allow => [
        // Owner can perform all operations
        allow.owner('ownerId'),
        // Members can read
        allow.authenticated().read(),
      ]),

    // Task model
    Task: c.model({
      id: a.id(),
      title: a.string()
        .required()
        .min(3)
        .max(200)
        .description('Task title'),
      description: a.string()
        .optional()
        .max(5000)
        .description('Task description'),
      projectId: a.string()
        .required()
        .description('Parent project ID'),
      project: a.ref('Project')
        .optional()
        .description('Reference to project'),
      assigneeId: a.string()
        .optional()
        .description('Assigned user ID'),
      assignee: a.ref('User')
        .optional()
        .description('Reference to assignee'),
      status: a.enum(['todo', 'in_progress', 'review', 'done'])
        .default('todo')
        .description('Task status'),
      priority: a.enum(['low', 'medium', 'high', 'urgent'])
        .default('medium')
        .description('Task priority'),
      dueDate: a.datetime()
        .optional()
        .description('Task due date'),
      completedAt: a.datetime()
        .optional()
        .description('Completion timestamp'),
      createdAt: a.datetime()
        .default(() => new Date()),
      updatedAt: a.datetime()
        .default(() => new Date()),
    })
      .authorization(allow => [
        // Project owner can manage all tasks
        allow.custom((ctx, task) =>
          task.project?.ownerId === ctx.user.id
        ),
        // Assignee can update their tasks
        allow.custom((ctx, task) =>
          task.assigneeId === ctx.user.id
        ).update(),
        // Authenticated users can read tasks in their projects
        allow.authenticated().read(),
      ]),
  }),
});

// Export types for use in functions
export type User = typeof schema.types.User;
export type Project = typeof schema.types.Project;
export type Task = typeof schema.types.Task;
```

**Key Concepts:**

- **Field Types**: Built-in types (string, number, datetime, enum, ref, array)
- **Validation**: Chained validators (required, min, max, email, etc.)
- **Relationships**: `a.ref()` creates type-safe references between models
- **Authorization**: Declarative access control rules
- **Type Inference**: TypeScript types automatically derived from schema

## Step 3: Configure Authentication

Create `src/auth.ts` to configure Microsoft Entra ID authentication:

```typescript
import { defineAuth, auth } from '@atakora/component/auth';

/**
 * Authentication Configuration
 *
 * Uses Microsoft Entra ID (formerly Azure AD) for user authentication
 * with JWT token validation.
 */
export const authentication = defineAuth({

  // Primary authentication provider
  Primary: auth.entra()
    .tenantId(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .audience('api://my-task-app')
    .issuer(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`)
    .validateIssuer(true)
    .validateAudience(true)
    .clockTolerance(300) // 5 minutes
    .cacheTokens(true)
    .cacheTTL(3600) // 1 hour
    .roles((mapper) => {
      // Map Entra ID roles to application roles
      mapper.map('TaskApp.Admin', 'admin');
      mapper.map('TaskApp.Member', 'member');
      mapper.mapDefault('viewer');
    }),

  // Optional: API key for service-to-service calls
  ApiKey: auth.apiKey()
    .headerName('x-api-key')
    .validateKey(async (key) => {
      // Validate against secure storage
      // In production, use Azure Key Vault
      const validKeys = process.env.API_KEYS?.split(',') || [];
      return validKeys.includes(key);
    })
    .roles(['service']),
});
```

**Key Concepts:**

- **Multi-Provider Support**: Configure multiple auth methods (Entra ID, API keys, custom)
- **Token Validation**: Automatic JWT signature and claims validation
- **Role Mapping**: Map external roles to application roles
- **Token Caching**: Performance optimization for token validation

## Step 4: Assemble Your Backend

Create `src/backend.ts` to assemble your complete backend:

```typescript
import { defineBackend } from '@atakora/component/backend';
import { schema } from './schema';
import { authentication } from './auth';

/**
 * Task Management Backend
 *
 * Combines schema, authentication, and infrastructure configuration
 * to create a complete production-ready backend.
 */
export const backend = defineBackend({

  // Data schema
  schema,

  // Authentication configuration
  authentication,

  // Backend settings
  settings: {
    name: 'task-app',
    region: 'eastus',

    // Environment detection
    environment: 'development', // auto-detected: development, staging, production, govcloud

    // Resource naming
    resourcePrefix: 'taskapp',
    resourceSuffix: 'dev',

    // Feature flags
    features: {
      auditLogging: true,
      metricsCollection: true,
      distributedTracing: true,
      autoScaling: false, // Enable in production
    },

    // CORS configuration
    cors: {
      allowedOrigins: ['http://localhost:3000', 'https://app.example.com'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    },

    // Performance tuning
    performance: {
      caching: {
        enabled: true,
        ttl: 300, // 5 minutes
      },
      rateLimit: {
        enabled: true,
        requestsPerMinute: 100,
        burstSize: 20,
      },
    },
  },

  // Optional: Custom services for dependency injection
  services: (builder) => ({
    emailService: builder.singleton({
      send: async (to: string, subject: string, body: string) => {
        // Integrate with SendGrid, Azure Communication Services, etc.
        console.log(`Sending email to ${to}: ${subject}`);
      },
    }),

    notificationService: builder.transient({
      notify: async (userId: string, message: string) => {
        // Push notifications, webhooks, etc.
        console.log(`Notifying user ${userId}: ${message}`);
      },
    }),
  }),
});

// Export types
export type Backend = typeof backend;
```

**Key Concepts:**

- **Backend Assembly**: Combines schema, auth, and settings
- **Environment Detection**: Automatic environment-specific configuration
- **Resource Naming**: Consistent resource naming across Azure
- **Service Registration**: Dependency injection for custom services

## Step 5: Add Environment Variables

Create `.env` file (add to `.gitignore`):

```bash
# Azure Entra ID Configuration
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id

# Azure Subscription
AZURE_SUBSCRIPTION_ID=your-subscription-id

# API Keys (comma-separated for multiple)
API_KEYS=key1,key2,key3

# Optional: Gov Cloud
AZURE_ENVIRONMENT=AzureCloud  # or AzureUSGovernment
```

Create `.env.example` for team sharing:

```bash
# Azure Entra ID Configuration
AZURE_TENANT_ID=
AZURE_CLIENT_ID=

# Azure Subscription
AZURE_SUBSCRIPTION_ID=

# API Keys
API_KEYS=
```

## Step 6: Add Custom Function Handlers

Create `src/functions/task-handlers.ts`:

```typescript
import type { FunctionHandler } from '@atakora/component/functions';
import type { Backend } from '../backend';

/**
 * Complete a task and send notification
 */
export const completeTask: FunctionHandler<Backend> = async (context) => {
  const { taskId } = context.request.params;
  const { services, database } = context;

  // Get task
  const task = await database.Task.get(taskId);
  if (!task) {
    return context.response.notFound('Task not found');
  }

  // Verify authorization
  if (task.assigneeId !== context.user.id) {
    return context.response.forbidden('Only assignee can complete task');
  }

  // Update task
  const updatedTask = await database.Task.update(taskId, {
    status: 'done',
    completedAt: new Date(),
  });

  // Send notification to project owner
  const project = await database.Project.get(task.projectId);
  if (project) {
    await services.notificationService.notify(
      project.ownerId,
      `Task "${task.title}" completed by ${context.user.name}`
    );
  }

  return context.response.success(updatedTask);
};

/**
 * Get task statistics for a project
 */
export const getProjectStats: FunctionHandler<Backend> = async (context) => {
  const { projectId } = context.request.params;
  const { database } = context;

  // Verify project access
  const project = await database.Project.get(projectId);
  if (!project) {
    return context.response.notFound('Project not found');
  }

  // Get all tasks for project
  const tasks = await database.Task.query({
    filter: { projectId },
  });

  // Calculate statistics
  const stats = {
    total: tasks.length,
    byStatus: {
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
    },
    byPriority: {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length,
    },
    overdue: tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length,
  };

  return context.response.success(stats);
};
```

**Register handlers** in `src/backend.ts`:

```typescript
import * as taskHandlers from './functions/task-handlers';

export const backend = defineBackend({
  // ... previous configuration

  functions: {
    completeTask: {
      handler: taskHandlers.completeTask,
      httpTrigger: {
        methods: ['POST'],
        route: 'tasks/{taskId}/complete',
        authLevel: 'authenticated',
      },
    },
    getProjectStats: {
      handler: taskHandlers.getProjectStats,
      httpTrigger: {
        methods: ['GET'],
        route: 'projects/{projectId}/stats',
        authLevel: 'authenticated',
      },
    },
  },
});
```

## Step 7: Build and Test Locally

### Build the Backend

```bash
# Compile TypeScript
npm run build

# This generates:
# - dist/ - Compiled JavaScript
# - dist/backend.d.ts - Type definitions
```

### Run Tests

Create `tests/backend.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { backend } from '../src/backend';

describe('Task Management Backend', () => {

  it('should have valid schema', () => {
    expect(backend.schema).toBeDefined();
    expect(backend.schema.types.User).toBeDefined();
    expect(backend.schema.types.Project).toBeDefined();
    expect(backend.schema.types.Task).toBeDefined();
  });

  it('should have authentication configured', () => {
    expect(backend.authentication).toBeDefined();
  });

  it('should validate task data', () => {
    const validator = backend.schema.getValidator('Task');

    const validTask = {
      title: 'Build feature',
      projectId: 'proj-123',
      status: 'todo',
      priority: 'high',
    };

    const result = validator.validate(validTask);
    expect(result.success).toBe(true);
  });

  it('should reject invalid task data', () => {
    const validator = backend.schema.getValidator('Task');

    const invalidTask = {
      title: 'A', // Too short (min 3)
      projectId: '',
      status: 'invalid-status',
    };

    const result = validator.validate(invalidTask);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });
});
```

Run tests:

```bash
npm test
```

## Step 8: Deploy to Azure

### Generate Infrastructure

The backend definition automatically generates Azure infrastructure:

```typescript
// infrastructure/main.ts
import { App } from '@atakora/cdk';
import { backend } from '../src/backend';

const app = new App();

// Backend generates:
// - Azure Cosmos DB (NoSQL API) for data storage
// - Azure Functions for REST API and custom handlers
// - Azure Application Insights for monitoring
// - Azure Key Vault for secrets
// - Virtual Network for network isolation (optional)

backend.synth(app, {
  stackName: 'task-app-dev',
  environment: 'development',
});

app.synth();
```

### Deploy with Azure CLI

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "your-subscription-id"

# Deploy infrastructure
npm run deploy
```

This creates:
- Resource Group: `rg-taskapp-dev-eastus`
- Cosmos DB: `cosmos-taskapp-dev`
- Function App: `func-taskapp-dev`
- Storage Account: `sttaskappdev`
- Application Insights: `appi-taskapp-dev`

## Step 9: Test Your API

### Automatic REST API Endpoints

Your schema automatically generates these endpoints:

**Users:**
- `GET /api/users` - List users
- `GET /api/users/{id}` - Get user
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

**Projects:**
- `GET /api/projects` - List projects
- `GET /api/projects/{id}` - Get project
- `POST /api/projects` - Create project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

**Tasks:**
- `GET /api/tasks` - List tasks
- `GET /api/tasks/{id}` - Get task
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `POST /api/tasks/{id}/complete` - Complete task (custom)
- `GET /api/projects/{id}/stats` - Project stats (custom)

### Test with cURL

```bash
# Get access token from Entra ID
TOKEN="your-jwt-token"

# Create a project
curl -X POST https://func-taskapp-dev.azurewebsites.net/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Website Redesign",
    "description": "Redesign company website",
    "ownerId": "user-123"
  }'

# Create a task
curl -X POST https://func-taskapp-dev.azurewebsites.net/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design homepage mockup",
    "projectId": "proj-456",
    "assigneeId": "user-789",
    "priority": "high",
    "status": "todo"
  }'

# Get project statistics
curl https://func-taskapp-dev.azurewebsites.net/api/projects/proj-456/stats \
  -H "Authorization: Bearer $TOKEN"
```

## What You've Learned

Congratulations! You've built a complete production-ready backend. Here's what you accomplished:

1. **Schema Definition** - Defined data models with validation and relationships
2. **Authentication** - Configured Microsoft Entra ID with role mapping
3. **Authorization** - Implemented declarative access control
4. **Custom Functions** - Extended with custom business logic
5. **Testing** - Wrote unit tests for schema validation
6. **Deployment** - Deployed to Azure with infrastructure as code

## Next Steps

### Add More Features

- **Real-time Updates**: Add WebSocket support for live notifications
- **File Uploads**: Store task attachments in Azure Blob Storage
- **Email Notifications**: Integrate Azure Communication Services
- **Audit Logging**: Track all data changes
- **Advanced Search**: Add full-text search with Azure Cognitive Search

### Improve Performance

- **Caching**: Implement Redis cache for frequently accessed data
- **Indexing**: Optimize Cosmos DB indexes for query performance
- **CDN**: Use Azure CDN for static assets
- **Auto-scaling**: Configure Function App auto-scaling rules

### Enhance Security

- **API Rate Limiting**: Protect against abuse
- **Data Encryption**: Enable encryption at rest and in transit
- **Network Isolation**: Deploy in Virtual Network
- **Compliance**: Enable Azure Policy for governance

### Learn Advanced Topics

- [Advanced Features Guide](../guides/advanced-features.md) - Gov Cloud, multi-region, synthesis
- [Testing Guide](../guides/testing.md) - Integration and E2E testing
- [Authorization Patterns](../guides/authorization-patterns.md) - Complex authorization rules
- [Performance Optimization](../guides/performance-optimization.md) - Advanced performance tuning

## Getting Help

- **Documentation**: [Complete API Reference](../api/complete-api-reference.md)
- **Examples**: [Example Gallery](../../examples/)
- **Troubleshooting**: [Common Issues](../troubleshooting/common-errors.md)
- **GitHub Issues**: Report bugs and request features
- **Community**: Join our Discord server

## Common Issues

### Schema validation errors

**Problem:** `ValidationError: Field 'title' is required`

**Solution:** Ensure all required fields are provided:

```typescript
// ❌ Missing required field
const task = { projectId: 'proj-123' };

// ✅ All required fields provided
const task = {
  title: 'My task',
  projectId: 'proj-123',
};
```

### Authentication errors

**Problem:** `401 Unauthorized: Invalid token`

**Solution:** Ensure your token is valid and not expired:

```bash
# Get a fresh token from Entra ID
az account get-access-token --resource api://my-task-app
```

### Deployment errors

**Problem:** `ResourceGroupNotFound`

**Solution:** Ensure resource group exists or enable auto-creation:

```typescript
backend.synth(app, {
  createResourceGroup: true,
});
```

## Summary

You've successfully created a production-ready backend with:

- ✅ Type-safe data models
- ✅ Automatic REST API
- ✅ Microsoft Entra ID authentication
- ✅ Declarative authorization
- ✅ Custom business logic
- ✅ Azure infrastructure
- ✅ Comprehensive testing

The schema-first approach means you defined your data models once and got everything else automatically - no manual API creation, no database setup, no infrastructure configuration.

**Start building amazing applications with Atakora Component!**
