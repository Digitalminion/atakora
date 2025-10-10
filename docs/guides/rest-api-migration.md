# REST API Migration Guide

Guide for migrating from other platforms and frameworks to Atakora REST APIs.

## Table of Contents

- [Azure API Management Portal to Atakora](#azure-api-management-portal-to-atakora)
- [Azure Functions Proxies to Atakora](#azure-functions-proxies-to-atakora)
- [Existing OpenAPI Specs to Atakora](#existing-openapi-specs-to-atakora)
- [Express.js to Atakora](#expressjs-to-atakora)
- [Common Migration Patterns](#common-migration-patterns)
- [Automation Scripts](#automation-scripts)

---

## Azure API Management Portal to Atakora

Migrate from manually configured API Management to infrastructure-as-code with Atakora.

### Before: Portal Configuration

In the Azure Portal, you manually:
1. Create API in API Management
2. Add operations one by one through UI
3. Configure policies through XML editor
4. Set up backends manually
5. Test through portal

### After: Atakora Code

With Atakora, everything is code:

```typescript
import { Stack, App } from '@atakora/cdk';
import { get, post } from '@atakora/cdk/api/rest';

class MigratedApiStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    // Define all operations in code
    const getUserOp = get('/users/{userId}')
      .operationId('getUser')
      .summary('Get user by ID')
      .pathParams<{ userId: string }>({
        schema: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' }
          }
        }
      })
      .responses<User>({
        200: {
          description: 'User found',
          content: { 'application/json': { schema: UserSchema } }
        },
        404: {
          description: 'User not found'
        }
      })
      .backend({
        type: 'azureFunction',
        functionApp: this.userFunctionApp,
        functionName: 'GetUser'
      })
      .policies({
        inbound: [validateJwtPolicy, rateLimitPolicy]
      })
      .build();
  }
}
```

### Migration Steps

1. **Export Existing API**

```bash
# Export from API Management
az apim api export \
  --resource-group myResourceGroup \
  --service-name myApiManagement \
  --api-id myApi \
  --format openapi-link \
  --file-path ./exported-api.json
```

2. **Import into Atakora**

```typescript
import { OpenApiImporter } from '@atakora/cdk/api/rest';

const importer = new OpenApiImporter('./exported-api.json');
const result = await importer.import();

// Review imported operations
for (const operation of result.operations) {
  console.log(`${operation.method} ${operation.path}`);
}
```

3. **Customize and Deploy**

```typescript
// Customize operations as needed
const enhancedOp = {
  ...result.operations[0],
  backend: {
    type: 'azureFunction',
    functionApp: myFunctionApp,
    functionName: 'MyFunction'
  }
};

// Deploy
atakora deploy --stack MigratedApiStack
```

### Policy Migration

**Before (XML):**

```xml
<policies>
  <inbound>
    <rate-limit calls="1000" renewal-period="3600" />
    <validate-jwt header-name="Authorization">
      <openid-config url="https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration" />
    </validate-jwt>
  </inbound>
</policies>
```

**After (TypeScript):**

```typescript
import { RateLimiter, AuthenticationManager } from '@atakora/cdk/api/rest/advanced';

const rateLimiter = new RateLimiter({
  enabled: true,
  strategy: 'fixedWindow',
  limits: [
    { scope: 'perApiKey', limit: 1000, window: 3600 }
  ]
});

const authManager = new AuthenticationManager({
  providers: [
    {
      name: 'azureAd',
      type: 'azureAd',
      config: {
        tenantId: 'common',
        clientId: process.env.CLIENT_ID,
        instance: 'https://login.microsoftonline.com'
      }
    }
  ]
});

const operation = get('/resource')
  .policies({
    inbound: [
      ...authManager.createAuthenticationPolicies(),
      rateLimiter.createPolicy({ scope: 'perApiKey', limit: 1000, window: 3600 })
    ]
  })
  .build();
```

---

## Azure Functions Proxies to Atakora

Migrate from deprecated Azure Functions Proxies to Atakora REST APIs.

### Before: proxies.json

```json
{
  "proxies": {
    "GetUser": {
      "matchCondition": {
        "methods": [ "GET" ],
        "route": "/api/users/{userId}"
      },
      "backendUri": "https://mybackend.azurewebsites.net/users/{userId}"
    },
    "CreateUser": {
      "matchCondition": {
        "methods": [ "POST" ],
        "route": "/api/users"
      },
      "backendUri": "https://mybackend.azurewebsites.net/users"
    }
  }
}
```

### After: Atakora REST API

```typescript
import { get, post } from '@atakora/cdk/api/rest';

class UserApiStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    // GET /api/users/{userId}
    const getUser = get('/api/users/{userId}')
      .operationId('getUser')
      .summary('Get user by ID')
      .pathParams<{ userId: string }>({
        schema: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' }
          }
        }
      })
      .responses({
        200: {
          description: 'User found',
          content: { 'application/json': { schema: UserSchema } }
        }
      })
      .backend({
        type: 'httpEndpoint',
        url: 'https://mybackend.azurewebsites.net/users/{userId}'
      })
      .build();

    // POST /api/users
    const createUser = post('/api/users')
      .operationId('createUser')
      .summary('Create user')
      .body<CreateUserRequest>({
        required: true,
        content: { 'application/json': { schema: CreateUserRequestSchema } }
      })
      .responses({
        201: {
          description: 'User created',
          content: { 'application/json': { schema: UserSchema } }
        }
      })
      .backend({
        type: 'httpEndpoint',
        url: 'https://mybackend.azurewebsites.net/users'
      })
      .build();
  }
}
```

### Migration Steps

1. **Analyze proxies.json**

Create a mapping of all proxy routes and their backends.

2. **Convert to REST Operations**

For each proxy, create an equivalent REST operation:

```typescript
// Proxy: GET /api/resource/{id}
const operation = get('/api/resource/{id}')
  .pathParams<{ id: string }>({ /* ... */ })
  .responses({ /* ... */ })
  .backend({
    type: 'httpEndpoint',
    url: 'https://backend.com/resource/{id}'
  })
  .build();
```

3. **Add Validation**

Proxies had minimal validation. Add proper schemas:

```typescript
.body<RequestType>({
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['field1', 'field2'],
        properties: {
          field1: { type: 'string', minLength: 1 },
          field2: { type: 'number', minimum: 0 }
        }
      }
    }
  }
})
```

4. **Enhance with Features**

Add features that weren't available in proxies:

```typescript
import { HttpCachingHelper, RateLimiter } from '@atakora/cdk/api/rest/advanced';

const cachingHelper = new HttpCachingHelper({
  enabled: true,
  strategy: 'etag',
  defaultTtl: 300
});

const operation = get('/api/resource')
  .policies({
    outbound: [cachingHelper.createETagPolicy()]
  })
  .build();
```

### Automation Script

```typescript
// convert-proxies.ts
import fs from 'fs/promises';

interface ProxiesConfig {
  proxies: Record<string, ProxyDefinition>;
}

interface ProxyDefinition {
  matchCondition: {
    methods: string[];
    route: string;
  };
  backendUri: string;
}

async function convertProxies(proxiesPath: string): Promise<string> {
  const content = await fs.readFile(proxiesPath, 'utf-8');
  const config: ProxiesConfig = JSON.parse(content);

  let code = `import { get, post, put, del } from '@atakora/cdk/api/rest';\n\n`;
  code += `// Auto-generated from proxies.json\n\n`;

  for (const [name, proxy] of Object.entries(config.proxies)) {
    const method = proxy.matchCondition.methods[0].toLowerCase();
    const route = proxy.matchCondition.route;

    code += `const ${name} = ${method}('${route}')\n`;
    code += `  .operationId('${name}')\n`;
    code += `  .summary('${name}')\n`;
    code += `  .responses({ 200: { description: 'Success' } })\n`;
    code += `  .backend({\n`;
    code += `    type: 'httpEndpoint',\n`;
    code += `    url: '${proxy.backendUri}'\n`;
    code += `  })\n`;
    code += `  .build();\n\n`;
  }

  return code;
}

// Usage
const code = await convertProxies('./proxies.json');
await fs.writeFile('./migrated-operations.ts', code);
```

---

## Existing OpenAPI Specs to Atakora

Import and enhance existing OpenAPI 3.0/3.1 specifications.

### Direct Import

```typescript
import { OpenApiImporter } from '@atakora/cdk/api/rest';

// From file
const importer = new OpenApiImporter('./openapi.yaml');
const result = await importer.import();

// From URL
const urlImporter = new OpenApiImporter('https://api.example.com/openapi.json');
const urlResult = await urlImporter.import();
```

### Enhance Imported Operations

Add Atakora-specific features to imported operations:

```typescript
const enhancedOperations = result.operations.map(op => ({
  ...op,
  // Add backend configuration
  backend: {
    type: 'azureFunction',
    functionApp: myFunctionApp,
    functionName: getFunctionName(op.operationId)
  },
  // Add policies
  policies: {
    inbound: [
      validateJwtPolicy,
      rateLimitPolicy
    ],
    outbound: [
      cachingPolicy
    ]
  }
}));
```

### Handling Vendor Extensions

OpenAPI specs may include vendor extensions (x-*):

```typescript
// OpenAPI spec with x-azure-backend
{
  "paths": {
    "/users/{id}": {
      "get": {
        "x-azure-backend": {
          "type": "function",
          "name": "GetUser"
        }
      }
    }
  }
}

// Extract and use in Atakora
const backend = op.extensions?.['x-azure-backend'];
if (backend) {
  operation.backend = {
    type: 'azureFunction',
    functionApp: myFunctionApp,
    functionName: backend.name
  };
}
```

---

## Express.js to Atakora

Migrate from Express.js routing to Atakora REST APIs.

### Before: Express.js

```javascript
const express = require('express');
const app = express();

app.get('/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  const user = await getUserById(userId);

  if (!user) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  res.json(user);
});

app.post('/users', async (req, res) => {
  const { name, email } = req.body;

  // Validation
  if (!name || !email) {
    return res.status(400).json({
      error: 'Name and email are required'
    });
  }

  const user = await createUser({ name, email });
  res.status(201).json(user);
});

app.listen(3000);
```

### After: Atakora

```typescript
import { get, post } from '@atakora/cdk/api/rest';

class UserApiStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    // GET /users/:userId
    const getUser = get('/users/{userId}')
      .operationId('getUser')
      .summary('Get user by ID')
      .pathParams<{ userId: string }>({
        schema: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' }
          }
        }
      })
      .responses<User>({
        200: {
          description: 'User found',
          content: { 'application/json': { schema: UserSchema } }
        },
        404: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' }
                }
              }
            }
          }
        }
      })
      .backend({
        type: 'azureFunction',
        functionApp: this.userFunctionApp,
        functionName: 'GetUser'
      })
      .build();

    // POST /users
    const createUser = post<CreateUserRequest>('/users')
      .operationId('createUser')
      .summary('Create user')
      .body<CreateUserRequest>({
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email'],
              properties: {
                name: { type: 'string', minLength: 1 },
                email: { type: 'string', format: 'email' }
              }
            }
          }
        }
      })
      .responses<User>({
        201: {
          description: 'User created',
          content: { 'application/json': { schema: UserSchema } }
        },
        400: {
          description: 'Invalid request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' }
                }
              }
            }
          }
        }
      })
      .backend({
        type: 'azureFunction',
        functionApp: this.userFunctionApp,
        functionName: 'CreateUser'
      })
      .build();
  }
}
```

### Handler Migration

Express.js handlers need to be converted to Azure Functions:

**Before (Express):**

```javascript
app.get('/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  const user = await getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});
```

**After (Azure Function):**

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function GetUser(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const userId = request.params.userId;

  if (!userId) {
    return {
      status: 400,
      jsonBody: { error: 'userId is required' }
    };
  }

  const user = await getUserById(userId);

  if (!user) {
    return {
      status: 404,
      jsonBody: { error: 'User not found' }
    };
  }

  return {
    status: 200,
    jsonBody: user
  };
}

app.http('GetUser', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'users/{userId}',
  handler: GetUser
});
```

### Middleware Migration

Express middleware converts to API Management policies:

**Express Middleware:**

```javascript
// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Authentication
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
app.use(authMiddleware);
```

**Atakora Policies:**

```typescript
import { RateLimiter, AuthenticationManager } from '@atakora/cdk/api/rest/advanced';

const rateLimiter = new RateLimiter({
  enabled: true,
  strategy: 'fixedWindow',
  limits: [
    {
      scope: 'perIp',
      limit: 100,
      window: 900  // 15 minutes
    }
  ]
});

const authManager = new AuthenticationManager({
  providers: [
    {
      name: 'jwt',
      type: 'oauth2',
      config: {
        flows: { /* ... */ }
      }
    }
  ]
});

const operation = get('/api/resource')
  .policies({
    inbound: [
      ...authManager.createAuthenticationPolicies(),
      rateLimiter.createPolicy({ scope: 'perIp', limit: 100, window: 900 })
    ]
  })
  .build();
```

---

## Common Migration Patterns

### Pattern 1: Path Parameter Extraction

**Before (Various):**
```javascript
// Express: /users/:userId
// Proxies: /users/{userId}
// Manual: Configured in portal
```

**After (Atakora):**
```typescript
.pathParams<{ userId: string }>({
  schema: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string', format: 'uuid' }
    }
  }
})
```

### Pattern 2: Request Validation

**Before:**
```javascript
// Manual validation in code
if (!req.body.name || !req.body.email) {
  return res.status(400).json({ error: 'Validation failed' });
}
```

**After:**
```typescript
.body<CreateUserRequest>({
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' }
        }
      }
    }
  }
})
```

### Pattern 3: Error Responses

**Before:**
```javascript
res.status(404).json({ error: 'Not found' });
```

**After:**
```typescript
.responses({
  404: {
    description: 'Not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'integer' },
            detail: { type: 'string' }
          }
        }
      }
    }
  }
})
```

---

## Automation Scripts

### OpenAPI to Atakora Converter

```typescript
// openapi-to-atakora.ts
import { OpenApiImporter, OpenApiExporter } from '@atakora/cdk/api/rest';
import fs from 'fs/promises';

async function convertOpenApi(inputPath: string, outputPath: string) {
  // Import OpenAPI spec
  const importer = new OpenApiImporter(inputPath);
  const result = await importer.import();

  // Generate TypeScript code
  let code = `import { get, post, put, patch, del } from '@atakora/cdk/api/rest';\n\n`;

  for (const operation of result.operations) {
    const methodName = operation.method.toLowerCase();
    const operationName = operation.operationId || `${methodName}Operation`;

    code += `export const ${operationName} = ${methodName}('${operation.path}')\n`;
    code += `  .operationId('${operation.operationId}')\n`;

    if (operation.summary) {
      code += `  .summary('${operation.summary}')\n`;
    }

    // Add parameters, body, responses
    // ... (simplified for brevity)

    code += `  .build();\n\n`;
  }

  await fs.writeFile(outputPath, code);
  console.log(`Generated ${outputPath}`);
}

// Usage
await convertOpenApi('./openapi.yaml', './operations.ts');
```

### Express Routes to Atakora

```typescript
// express-to-atakora.ts
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs/promises';

async function convertExpressRoutes(inputPath: string, outputPath: string) {
  const code = await fs.readFile(inputPath, 'utf-8');
  const ast = parser.parse(code, { sourceType: 'module' });

  const operations: any[] = [];

  traverse(ast, {
    CallExpression(path) {
      // Find app.get(), app.post(), etc.
      if (
        path.node.callee.type === 'MemberExpression' &&
        path.node.callee.object.name === 'app' &&
        ['get', 'post', 'put', 'delete', 'patch'].includes(path.node.callee.property.name)
      ) {
        const method = path.node.callee.property.name.toUpperCase();
        const route = path.node.arguments[0].value;

        operations.push({ method, route });
      }
    }
  });

  // Generate Atakora code
  let output = `import { get, post, put, patch, del } from '@atakora/cdk/api/rest';\n\n`;

  for (const op of operations) {
    const methodName = op.method.toLowerCase();
    output += `const operation = ${methodName}('${op.route}')\n`;
    output += `  .operationId('${methodName}${op.route.replace(/\//g, '_')}')\n`;
    output += `  .responses({ 200: { description: 'Success' } })\n`;
    output += `  .build();\n\n`;
  }

  await fs.writeFile(outputPath, output);
  console.log(`Generated ${outputPath}`);
}

// Usage
await convertExpressRoutes('./routes.js', './operations.ts');
```

---

## Next Steps

After migration:

1. **Test Thoroughly**: Ensure all operations work as expected
2. **Add Features**: Enhance with caching, rate limiting, authentication
3. **Update Documentation**: Document your new API structure
4. **Monitor**: Set up Application Insights for observability
5. **Optimize**: Use performance testing to identify bottlenecks

## Related Documentation

- [REST API User Guide](./rest-api-user-guide.md)
- [REST API Examples](../examples/rest-api-examples.md)
- [Troubleshooting Guide](./rest-api-troubleshooting.md)
