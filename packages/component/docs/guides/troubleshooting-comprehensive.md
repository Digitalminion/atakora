# Comprehensive Troubleshooting Guide

This guide provides solutions to common errors, debugging techniques, and answers to frequently asked questions about Atakora Component.

## Table of Contents

- [Common Errors](#common-errors)
- [Debugging Techniques](#debugging-techniques)
- [Performance Issues](#performance-issues)
- [Security Issues](#security-issues)
- [Deployment Issues](#deployment-issues)
- [Frequently Asked Questions](#frequently-asked-questions)

## Common Errors

### Schema Validation Errors

#### Error: "Field 'fieldName' is required"

**Cause:** Required field is missing from input data.

**Solution:**

```typescript
// ❌ Missing required field
const task = {
  projectId: 'proj-123',
  // Missing 'title' which is required
};

// ✅ Provide all required fields
const task = {
  title: 'Complete documentation',
  projectId: 'proj-123',
};
```

**Prevention:** Use TypeScript types from schema:

```typescript
import type { Task } from './schema';

const task: Task = {
  // TypeScript will error if required fields missing
  title: 'Complete documentation',
  projectId: 'proj-123',
};
```

#### Error: "Validation failed: string length must be >= 3"

**Cause:** String field doesn't meet minimum length requirement.

**Solution:**

```typescript
// Schema definition
const schema = defineSchema({
  schema: a.schema({
    Task: c.model({
      title: a.string().min(3).max(200), // Min 3 characters
    }),
  }),
});

// ❌ Too short
const task = { title: 'AB' }; // Only 2 characters

// ✅ Meets requirement
const task = { title: 'ABC' }; // 3+ characters
```

#### Error: "Invalid email format"

**Cause:** Email field contains invalid email address.

**Solution:**

```typescript
// ❌ Invalid email
const user = { email: 'notanemail' };

// ✅ Valid email
const user = { email: 'user@example.com' };
```

#### Error: "Reference 'ModelName' not found"

**Cause:** Reference points to non-existent model or ID.

**Solution:**

```typescript
// Ensure referenced model exists
const project = await database.Project.get('proj-123');
if (!project) {
  throw new Error('Project not found');
}

// Then create task
const task = await database.Task.create({
  title: 'New task',
  projectId: 'proj-123', // Valid reference
});
```

**Prevention:** Use database transactions:

```typescript
await database.transaction(async (tx) => {
  // Create project
  const project = await tx.Project.create({
    name: 'My Project',
    ownerId: userId,
  });

  // Create task with guaranteed valid reference
  const task = await tx.Task.create({
    title: 'First task',
    projectId: project.id, // Guaranteed to exist
  });
});
```

### Authentication Errors

#### Error: "401 Unauthorized: Invalid token"

**Cause:** JWT token is invalid, expired, or malformed.

**Solutions:**

1. **Check token expiration:**

```bash
# Decode JWT to check expiration
echo "YOUR_TOKEN" | base64 -d | jq .exp

# Compare to current time
date +%s
```

2. **Get fresh token:**

```bash
# Entra ID token
az account get-access-token --resource api://my-app

# Use in API call
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/data
```

3. **Verify token configuration:**

```typescript
export const authentication = defineAuth({
  Primary: auth.entra()
    .tenantId(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .audience('api://my-app') // Must match token audience
    .issuer(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`)
    .validateIssuer(true)
    .validateAudience(true),
});
```

#### Error: "403 Forbidden: Insufficient permissions"

**Cause:** User lacks required role or authorization failed.

**Solutions:**

1. **Check user roles:**

```typescript
// In function handler
console.log('User roles:', context.user.roles);
console.log('Required role:', 'admin');

if (!context.user.roles.includes('admin')) {
  return context.response.forbidden('Admin role required');
}
```

2. **Verify authorization rules:**

```typescript
// Schema authorization
User: c.model({
  // ...
})
  .authorization(allow => [
    allow.owner('id'), // User can access their own record
    allow.custom((ctx) => ctx.user.roles.includes('admin')), // Admins can access all
  ]);
```

3. **Debug authorization:**

```typescript
import { defineBackend } from '@atakora/component/backend';

export const backend = defineBackend({
  settings: {
    features: {
      authorizationLogging: true, // Log authorization decisions
    },
  },
});
```

#### Error: "API key authentication failed"

**Cause:** Invalid or missing API key.

**Solutions:**

1. **Check header:**

```bash
# ❌ Wrong header
curl -H "Authorization: key123" https://api.example.com

# ✅ Correct header
curl -H "x-api-key: key123" https://api.example.com
```

2. **Verify key in storage:**

```typescript
export const authentication = defineAuth({
  ApiKey: auth.apiKey()
    .headerName('x-api-key')
    .validateKey(async (key) => {
      // Check against database or Key Vault
      const validKeys = await getValidKeysFromKeyVault();
      return validKeys.includes(key);
    }),
});
```

### Database Errors

#### Error: "PartitionKey mismatch"

**Cause:** Attempting to access document with wrong partition key.

**Solution:**

```typescript
// Cosmos DB uses partition keys
const task = await database.Task.get('task-123', {
  partitionKey: 'proj-123', // Must match task's projectId
});
```

**Prevention:** Use consistent partition key strategy:

```typescript
export const schema = defineSchema({
  schema: a.schema({
    Task: c.model({
      id: a.id(),
      projectId: a.string().required(), // Partition key
      // ...
    })
      .partitionKey('projectId'), // Explicitly define
  }),
});
```

#### Error: "Request rate too large (429)"

**Cause:** Exceeded Cosmos DB RU/s limit.

**Solutions:**

1. **Implement retry logic:**

```typescript
import { retry } from '@atakora/component/functions';

export const handler = retry(
  async (context) => {
    // Your logic
  },
  {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 100,
  }
);
```

2. **Increase provisioned throughput:**

```typescript
export const backend = defineBackend({
  settings: {
    database: {
      throughput: {
        mode: 'autoscale',
        maxRU: 10000, // Increase limit
      },
    },
  },
});
```

3. **Optimize queries:**

```typescript
// ❌ Cross-partition query
const tasks = await database.Task.query({
  filter: { status: 'done' }, // Scans all partitions
});

// ✅ Single-partition query
const tasks = await database.Task.query({
  filter: { projectId: 'proj-123', status: 'done' }, // Single partition
  partitionKey: 'proj-123',
});
```

#### Error: "Document not found"

**Cause:** Document doesn't exist or was deleted.

**Solution:**

```typescript
// ❌ No error handling
const task = await database.Task.get('task-123');
console.log(task.title); // Crashes if task is null

// ✅ Handle null
const task = await database.Task.get('task-123');
if (!task) {
  return context.response.notFound('Task not found');
}
console.log(task.title);

// ✅ Use try-catch
try {
  const task = await database.Task.getOrThrow('task-123');
  return context.response.success(task);
} catch (error) {
  return context.response.notFound(error.message);
}
```

### Service Registry Errors

#### Error: "Service 'serviceName' not found"

**Cause:** Service not registered or misspelled name.

**Solution:**

```typescript
// Register service
export const backend = defineBackend({
  services: (builder) => ({
    emailService: builder.singleton({
      send: async (to, subject, body) => {
        // Implementation
      },
    }),
  }),
});

// Use service - must match name
export const handler: FunctionHandler<Backend> = async (context) => {
  const { emailService } = context.services; // ✅ Correct name

  await emailService.send('user@example.com', 'Welcome', 'Hello!');
};
```

#### Error: "Circular dependency detected"

**Cause:** Services depend on each other in a circle.

**Solution:**

```typescript
// ❌ Circular dependency
services: (builder) => ({
  serviceA: builder.singleton({
    doSomething: async (serviceB) => {
      await serviceB.doSomethingElse(); // A depends on B
    },
  }),
  serviceB: builder.singleton({
    doSomethingElse: async (serviceA) => {
      await serviceA.doSomething(); // B depends on A - CIRCULAR!
    },
  }),
});

// ✅ Break the circle
services: (builder) => ({
  sharedLogic: builder.singleton({
    // Extract shared logic
  }),
  serviceA: builder.singleton({
    doSomething: async (sharedLogic) => {
      // Use shared logic
    },
  }),
  serviceB: builder.singleton({
    doSomethingElse: async (sharedLogic) => {
      // Use shared logic
    },
  }),
});
```

## Debugging Techniques

### Enable Debug Logging

```typescript
export const backend = defineBackend({
  settings: {
    logging: {
      level: 'debug', // trace, debug, info, warn, error
      categories: {
        schema: 'debug',
        authentication: 'debug',
        authorization: 'debug',
        database: 'debug',
        functions: 'debug',
      },
    },
  },
});
```

### Application Insights Integration

```typescript
export const backend = defineBackend({
  settings: {
    monitoring: {
      applicationInsights: {
        enabled: true,
        connectionString: process.env.APPINSIGHTS_CONNECTION_STRING,

        // Custom telemetry
        trackDependencies: true,
        trackRequests: true,
        trackExceptions: true,
        trackEvents: true,

        // Sampling
        samplingPercentage: 100, // 100% in dev, lower in prod
      },
    },
  },
});
```

### Local Development Debugging

```typescript
// Add to function handler
export const handler: FunctionHandler<Backend> = async (context) => {
  // Log request
  console.log('Request:', {
    method: context.request.method,
    path: context.request.path,
    params: context.request.params,
    body: context.request.body,
    user: context.user,
  });

  // Your logic
  const result = await someOperation();

  // Log response
  console.log('Response:', result);

  return context.response.success(result);
};
```

### Cosmos DB Query Diagnostics

```typescript
export const handler: FunctionHandler<Backend> = async (context) => {
  const result = await context.database.Task.query({
    filter: { projectId: 'proj-123' },
    diagnostics: true, // Enable diagnostics
  });

  // View query metrics
  console.log('Query diagnostics:', result.diagnostics);
  // {
  //   requestCharge: 2.85,
  //   retrievedDocumentCount: 10,
  //   retrievedDocumentSize: 5432,
  //   queryExecutionTime: 12.5,
  // }

  return context.response.success(result.items);
};
```

### Network Debugging

```bash
# Test function endpoint
curl -v https://func-myapp.azurewebsites.net/api/tasks

# Check DNS
nslookup func-myapp.azurewebsites.net

# Test with different methods
curl -X POST -H "Content-Type: application/json" -d '{"title":"Test"}' https://...

# Check TLS
openssl s_client -connect func-myapp.azurewebsites.net:443
```

## Performance Issues

### Slow Query Performance

**Symptoms:** Database queries taking > 100ms

**Solutions:**

1. **Add indexes:**

```typescript
export const schema = defineSchema({
  schema: a.schema({
    Task: c.model({
      // ...
    })
      .indexes([
        { fields: ['projectId'] },
        { fields: ['assigneeId', 'status'] },
        { fields: ['dueDate'] },
      ]),
  }),
});
```

2. **Use projection:**

```typescript
// ❌ Fetch all fields
const tasks = await database.Task.query({
  filter: { projectId: 'proj-123' },
});

// ✅ Fetch only needed fields
const tasks = await database.Task.query({
  filter: { projectId: 'proj-123' },
  select: ['id', 'title', 'status'], // Only fetch these
});
```

3. **Implement pagination:**

```typescript
// ❌ Fetch all at once
const allTasks = await database.Task.query({
  filter: { status: 'todo' },
});

// ✅ Paginate
const firstPage = await database.Task.query({
  filter: { status: 'todo' },
  limit: 20,
});

const nextPage = await database.Task.query({
  filter: { status: 'todo' },
  limit: 20,
  continuationToken: firstPage.continuationToken,
});
```

### High Memory Usage

**Symptoms:** Function app using > 512MB memory

**Solutions:**

1. **Stream large responses:**

```typescript
// ❌ Load all in memory
export const handler: FunctionHandler<Backend> = async (context) => {
  const allTasks = await database.Task.query({}); // Could be thousands
  return context.response.success(allTasks); // High memory
};

// ✅ Stream response
export const handler: FunctionHandler<Backend> = async (context) => {
  const stream = database.Task.queryStream({});
  return context.response.stream(stream);
};
```

2. **Reduce cache size:**

```typescript
export const backend = defineBackend({
  settings: {
    performance: {
      caching: {
        maxSize: 1000, // Limit cached items
        evictionPolicy: 'lru', // Least recently used
      },
    },
  },
});
```

### Cold Start Issues

**Symptoms:** First request takes > 5 seconds

**Solutions:**

1. **Enable warm-up:**

```typescript
export const backend = defineBackend({
  settings: {
    compute: {
      functionApp: {
        warmupEnabled: true,
        alwaysOn: true, // Premium plan required
      },
    },
  },
});
```

2. **Reduce bundle size:**

```typescript
// package.json
{
  "scripts": {
    "build": "esbuild src/index.ts --bundle --minify --platform=node --target=node18"
  }
}
```

3. **Lazy load dependencies:**

```typescript
// ❌ Import at top level
import { heavyLibrary } from 'heavy-library';

export const handler = async (context) => {
  // ...
};

// ✅ Import when needed
export const handler = async (context) => {
  const { heavyLibrary } = await import('heavy-library');
  // Use only when needed
};
```

## Security Issues

### Leaked Secrets

**Problem:** API keys or connection strings committed to git

**Solutions:**

1. **Remove from history:**

```bash
# Remove sensitive file from history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push origin --force --all
```

2. **Rotate secrets immediately:**

```bash
# Rotate in Azure Key Vault
az keyvault secret set --vault-name my-vault --name cosmos-key --value new-value

# Update application configuration
az functionapp config appsettings set --name my-func --resource-group my-rg \
  --settings CosmosKey=@Microsoft.KeyVault(SecretUri=...)
```

3. **Implement .gitignore:**

```gitignore
# .gitignore
.env
.env.local
.env.*.local
*.key
*.pem
secrets/
```

### SQL Injection (Cosmos DB)

**Problem:** User input directly in queries

**Solutions:**

```typescript
// ❌ Dangerous - SQL injection risk
const userId = context.request.query.userId;
const query = `SELECT * FROM c WHERE c.userId = '${userId}'`;

// ✅ Use parameterized queries
const userId = context.request.query.userId;
const tasks = await database.Task.query({
  filter: { userId }, // Automatically parameterized
});

// ✅ For custom SQL queries
const tasks = await database.raw({
  query: 'SELECT * FROM c WHERE c.userId = @userId',
  parameters: [{ name: '@userId', value: userId }],
});
```

### XSS Prevention

**Problem:** User-generated content displayed without sanitization

**Solutions:**

```typescript
import { sanitize } from 'isomorphic-dompurify';

export const handler: FunctionHandler<Backend> = async (context) => {
  const { description } = context.request.body;

  // ❌ Store raw HTML
  const task = await database.Task.create({
    title: 'Task',
    description, // Could contain <script> tags
  });

  // ✅ Sanitize before storing
  const task = await database.Task.create({
    title: 'Task',
    description: sanitize(description), // Remove dangerous HTML
  });

  return context.response.success(task);
};
```

## Deployment Issues

### Deployment Fails

**Problem:** ARM template deployment fails

**Solutions:**

1. **Validate template:**

```bash
# Validate before deploying
az deployment group validate \
  --resource-group my-rg \
  --template-file template.json \
  --parameters parameters.json
```

2. **Check quotas:**

```bash
# Check subscription quotas
az vm list-usage --location eastus --output table

# Request quota increase if needed
```

3. **Review deployment logs:**

```bash
# Get deployment operations
az deployment group operation list \
  --resource-group my-rg \
  --name my-deployment

# Get specific operation details
az deployment group operation show \
  --resource-group my-rg \
  --name my-deployment \
  --operation-id <operation-id>
```

### Resource Naming Conflicts

**Problem:** Resource name already exists

**Solutions:**

```typescript
// Add unique suffix
export const backend = defineBackend({
  settings: {
    resourcePrefix: 'myapp',
    resourceSuffix: Date.now().toString().slice(-6), // Last 6 digits of timestamp
  },
});
```

### Function App Not Starting

**Problem:** Function app shows "Function app is stopped"

**Solutions:**

1. **Check application settings:**

```bash
# List app settings
az functionapp config appsettings list --name my-func --resource-group my-rg

# Verify required settings exist
# - AzureWebJobsStorage
# - FUNCTIONS_WORKER_RUNTIME
# - WEBSITE_NODE_DEFAULT_VERSION
```

2. **Check function app logs:**

```bash
# Stream logs
az functionapp log tail --name my-func --resource-group my-rg

# Download logs
az functionapp log download --name my-func --resource-group my-rg
```

3. **Verify deployment:**

```bash
# Check deployment status
az functionapp deployment list-publishing-profiles --name my-func --resource-group my-rg

# Redeploy if needed
func azure functionapp publish my-func
```

## Frequently Asked Questions

### General Questions

#### Q1: What is the difference between schema-first and code-first?

**A:** Schema-first means you define your data models using the schema DSL, and infrastructure is automatically generated. Code-first means you manually write infrastructure code.

```typescript
// Schema-first (Atakora Component)
export const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().email(),
    }),
  }),
});
// → Automatic: REST API, database, validation

// Code-first (traditional)
// Write your own:
// - API endpoints
// - Database setup
// - Validation logic
// - Infrastructure code
```

#### Q2: Can I use Atakora Component with existing Azure resources?

**A:** Yes, you can import existing resources:

```typescript
export const backend = defineBackend({
  settings: {
    importResources: {
      cosmosDb: {
        accountName: 'existing-cosmos',
        databaseName: 'existing-db',
      },
      functionApp: {
        name: 'existing-func',
      },
    },
  },
});
```

#### Q3: How do I migrate from v1 to v2?

**A:** See [Migration Guide](./migration-guide.md) for detailed steps.

#### Q4: What are the costs of running Atakora Component?

**A:** Costs depend on Azure resources used:

- Cosmos DB: ~$25/month (400 RU/s) + storage
- Function App: ~$0 (Consumption) or ~$150/month (Premium)
- Application Insights: ~$2.30/GB ingested
- Storage: ~$0.02/GB/month

**Estimate:** $30-200/month depending on scale and tier.

### Schema Questions

#### Q5: How do I define optional fields?

**A:**

```typescript
Task: c.model({
  title: a.string().required(), // Required
  description: a.string().optional(), // Optional
  dueDate: a.datetime(), // Optional by default
});
```

#### Q6: Can I have circular references?

**A:** No, circular references are not supported. Use uni-directional references:

```typescript
// ❌ Circular
User: c.model({
  projects: a.array(a.ref('Project')),
});
Project: c.model({
  owner: a.ref('User'),
  members: a.array(a.ref('User')), // Circular!
});

// ✅ Uni-directional
User: c.model({
  id: a.id(),
});
Project: c.model({
  ownerId: a.string(),
  owner: a.ref('User'),
  memberIds: a.array(a.string()),
});
```

#### Q7: How do I validate against external data?

**A:**

```typescript
import { defineSchema, a, c } from '@atakora/component/schema';

export const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      email: a.string()
        .required()
        .email()
        .custom(async (email) => {
          // Check if email already exists
          const exists = await checkEmailExists(email);
          if (exists) {
            throw new Error('Email already registered');
          }
        }),
    }),
  }),
});
```

### Authentication Questions

#### Q8: How do I implement API keys?

**A:**

```typescript
export const authentication = defineAuth({
  ApiKey: auth.apiKey()
    .headerName('x-api-key')
    .validateKey(async (key) => {
      const valid = await checkKeyInDatabase(key);
      return valid;
    })
    .roles(['service']),
});
```

#### Q9: Can I use multiple authentication providers?

**A:** Yes:

```typescript
export const authentication = defineAuth({
  Primary: auth.entra().tenantId('...').clientId('...').primary(),
  Secondary: auth.apiKey().headerName('x-api-key'),
  Custom: auth.custom({ /* ... */ }),
});
```

#### Q10: How do I implement SSO?

**A:** Use Entra ID (Azure AD) which supports SSO:

```typescript
export const authentication = defineAuth({
  Primary: auth.entra()
    .tenantId(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .enableSSO(true),
});
```

### Authorization Questions

#### Q11: How do I implement role-based access control?

**A:**

```typescript
Task: c.model({
  // ...
})
  .authorization(allow => [
    allow.authenticated().read(), // All authenticated users can read
    allow.custom((ctx) => ctx.user.roles.includes('admin')), // Admins can do anything
    allow.owner('assigneeId').update(), // Assignees can update
  ]);
```

#### Q12: Can I implement row-level security?

**A:** Yes, using custom authorization:

```typescript
Task: c.model({
  // ...
})
  .authorization(allow => [
    allow.custom(async (ctx, task) => {
      // Check if user is member of task's project
      const project = await database.Project.get(task.projectId);
      return project.memberIds.includes(ctx.user.id);
    }),
  ]);
```

### Performance Questions

#### Q13: How do I optimize for high traffic?

**A:**

```typescript
export const backend = defineBackend({
  settings: {
    performance: {
      // Caching
      caching: {
        enabled: true,
        redis: { /* ... */ },
      },

      // Auto-scaling
      compute: {
        autoscale: {
          minInstances: 2,
          maxInstances: 20,
          scaleOutCpu: 70,
        },
      },

      // Database
      database: {
        throughput: {
          mode: 'autoscale',
          maxRU: 10000,
        },
      },
    },
  },
});
```

#### Q14: What's the query performance like?

**A:** With proper indexes:
- Point reads: < 10ms
- Single-partition queries: < 50ms
- Cross-partition queries: < 200ms
- Aggregations: < 500ms

#### Q15: How do I handle large file uploads?

**A:**

```typescript
export const handler: FunctionHandler<Backend> = async (context) => {
  // Use Azure Blob Storage for large files
  const { file } = context.request.files;

  const blobClient = context.storage.getBlockBlobClient(file.name);
  await blobClient.uploadStream(file.stream);

  return context.response.success({ url: blobClient.url });
};
```

### Testing Questions

#### Q16: How do I write unit tests?

**A:**

```typescript
import { describe, it, expect } from 'vitest';
import { backend } from './backend';

describe('Task validation', () => {
  it('should validate required fields', () => {
    const validator = backend.schema.getValidator('Task');
    const result = validator.validate({ title: 'Test' });
    expect(result.success).toBe(false); // Missing projectId
  });
});
```

#### Q17: How do I test with mocked services?

**A:**

```typescript
import { createMockContext } from '@atakora/component/testing';

it('should send email on task complete', async () => {
  const mockEmail = vi.fn();
  const context = createMockContext({
    services: {
      emailService: { send: mockEmail },
    },
  });

  await completeTask(context);

  expect(mockEmail).toHaveBeenCalled();
});
```

#### Q18: How do I do integration testing?

**A:** Use Cosmos DB emulator:

```typescript
// Start emulator
// docker run -p 8081:8081 mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator

import { beforeAll } from 'vitest';

beforeAll(async () => {
  process.env.COSMOS_ENDPOINT = 'https://localhost:8081';
  process.env.COSMOS_KEY = 'emulator-key';
});
```

### Deployment Questions

#### Q19: How do I implement blue-green deployment?

**A:**

```typescript
export const backend = defineBackend({
  settings: {
    deployment: {
      strategy: 'blue-green',
      slots: {
        production: { weight: 100 },
        staging: { weight: 0 },
      },
    },
  },
});

// Deploy to staging
// Test staging
// Swap staging ↔ production
```

#### Q20: Can I deploy to multiple regions?

**A:** Yes, see [Multi-Region Architecture](#multi-region-architecture) in Advanced Features Guide.

### Government Cloud Questions

#### Q21: What compliance standards are supported?

**A:**
- FedRAMP High
- DoD IL2, IL4, IL5
- ITAR
- CJIS
- HIPAA
- PCI-DSS

#### Q22: How do I enable compliance features?

**A:**

```typescript
export const backend = defineBackend({
  settings: {
    environment: 'govcloud',
    compliance: {
      fedramp: 'high',
      dod: 'IL5',
      itar: true,
    },
    features: {
      auditLogging: true,
      encryptionAtRest: true,
      encryptionInTransit: true,
      dataResidency: true,
    },
  },
});
```

#### Q23: What are the Gov Cloud limitations?

**A:**
- Limited Azure regions (4 vs 60+)
- Some services unavailable
- Higher costs (~20-30% more)
- Separate tenant required
- US citizenship verification for access

### Cost Questions

#### Q24: How can I reduce costs?

**A:**

1. Use Consumption plan for Function App
2. Use autoscale Cosmos DB
3. Enable caching
4. Implement pagination
5. Use development tier in non-prod

```typescript
export const backend = defineBackend({
  settings: {
    environment: 'development',
    tier: 'development', // Cheaper resources
    features: {
      monitoring: false, // Disable in dev
      backups: false,
    },
  },
});
```

#### Q25: What's the pricing model?

**A:** Pay-as-you-go based on:
- Function App executions
- Cosmos DB RU/s consumed
- Storage used
- Data transfer
- Application Insights data

## Additional Resources

- [Complete API Reference](../api/complete-api-reference.md)
- [Getting Started Tutorial](../tutorials/getting-started.md)
- [Advanced Features](./advanced-features.md)
- [Examples](../../examples/)

## Getting Help

If you can't find a solution here:

1. Check [GitHub Issues](https://github.com/your-org/atakora/issues)
2. Join [Discord Community](https://discord.gg/atakora)
3. Review [Stack Overflow](https://stackoverflow.com/questions/tagged/atakora)
4. Contact [Support](mailto:support@atakora.dev)

---

**Last Updated:** 2025-01-22
**Version:** 2.0.0
