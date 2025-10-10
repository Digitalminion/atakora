# REST API Troubleshooting Guide

Common issues and solutions when working with Atakora REST APIs.

## Table of Contents

- [Compilation Errors](#compilation-errors)
- [Synthesis Failures](#synthesis-failures)
- [OpenAPI Validation Errors](#openapi-validation-errors)
- [Type Inference Issues](#type-inference-issues)
- [Runtime Errors](#runtime-errors)
- [Performance Problems](#performance-problems)
- [Government Cloud Issues](#government-cloud-issues)
- [Debugging Tips](#debugging-tips)

---

## Compilation Errors

### Error: "Operation must define at least one response"

**Problem:**
```typescript
const operation = get('/users')
  .operationId('listUsers')
  .build();  // Error: Operation must define at least one response
```

**Cause:** Every REST operation must have at least one response defined.

**Solution:**
```typescript
const operation = get('/users')
  .operationId('listUsers')
  .responses({
    200: {
      description: 'Success',
      content: { 'application/json': { schema: UserArraySchema } }
    }
  })
  .build();
```

---

### Error: Type inference not working

**Problem:**
```typescript
const operation = get('/users/{userId}')
  .pathParams({ /* ... */ });  // Types not inferred

// Later, no type safety
operation.pathParameters.schema.properties.userId;  // No autocomplete
```

**Cause:** Missing type parameter on `pathParams`.

**Solution:**
```typescript
const operation = get('/users/{userId}')
  .pathParams<{ userId: string }>({
    schema: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string', format: 'uuid' }
      }
    }
  });

// Now fully typed
operation.pathParameters.schema.properties.userId;  // ✓ Type-safe
```

---

### Error: "Type 'string' is not assignable to type 'never'"

**Problem:**
```typescript
const operation = post('/users')
  .body<CreateUserRequest>({
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' }  // Error here
          }
        }
      }
    }
  });
```

**Cause:** Mismatch between TypeScript type and JSON Schema type.

**Solution:**
```typescript
// Option 1: Use 'as const' assertion
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' }
  }
} as const;

// Option 2: Explicitly type the schema
const schema: JsonSchema<CreateUserRequest> = {
  type: 'object',
  properties: {
    name: { type: 'string' }
  }
};
```

---

### Error: "Cannot find module '@atakora/cdk/api/rest'"

**Problem:**
```typescript
import { get, post } from '@atakora/cdk/api/rest';  // Module not found
```

**Cause:** Incorrect import path or missing package.

**Solution:**
```bash
# Ensure package is installed
npm install @atakora/cdk

# Check package.json
{
  "dependencies": {
    "@atakora/cdk": "^1.0.0"
  }
}

# Correct import
import { get, post } from '@atakora/cdk/api/rest';
```

---

## Synthesis Failures

### Error: "Backend function app not found"

**Problem:**
```typescript
const operation = get('/users')
  .backend({
    type: 'azureFunction',
    functionApp: undefined,  // Error during synthesis
    functionName: 'GetUsers'
  })
  .build();
```

**Cause:** Function app reference is undefined or hasn't been synthesized yet.

**Solution:**
```typescript
class MyStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    // Create function app first
    this.userFunctionApp = new FunctionApp(this, 'UserFunctionApp', {
      /* ... */
    });

    // Then reference it
    const operation = get('/users')
      .backend({
        type: 'azureFunction',
        functionApp: this.userFunctionApp,
        functionName: 'GetUsers'
      })
      .build();
  }
}
```

---

### Error: "Circular dependency detected"

**Problem:**
```typescript
// Stack A depends on Stack B
// Stack B depends on Stack A
```

**Cause:** Circular dependencies between stacks or resources.

**Solution:**
```typescript
// Option 1: Combine into single stack
class CombinedStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);
    // All resources in one stack
  }
}

// Option 2: Use stack outputs
class StackA extends Stack {
  public readonly apiUrl: string;

  constructor(scope: App, id: string) {
    super(scope, id);
    this.apiUrl = this.api.url;
  }
}

class StackB extends Stack {
  constructor(scope: App, id: string, apiUrl: string) {
    super(scope, id);
    // Use apiUrl from StackA
  }
}

// Usage
const stackA = new StackA(app, 'StackA');
const stackB = new StackB(app, 'StackB', stackA.apiUrl);
```

---

### Error: "Resource group does not exist"

**Problem:**
```bash
$ atakora deploy
Error: Resource group 'my-rg' does not exist
```

**Cause:** Resource group not created or incorrect name.

**Solution:**
```bash
# Create resource group first
az group create --name my-rg --location eastus

# Or let Atakora create it
atakora deploy --create-resource-group

# Check existing resource groups
az group list --output table
```

---

## OpenAPI Validation Errors

### Error: "Invalid OpenAPI specification"

**Problem:**
```typescript
const importer = new OpenApiImporter('./openapi.yaml');
await importer.import();  // OpenApiValidationError
```

**Cause:** OpenAPI spec doesn't conform to OpenAPI 3.0/3.1 schema.

**Solution:**
```typescript
try {
  const importer = new OpenApiImporter('./openapi.yaml');
  const result = await importer.import();
} catch (error) {
  if (error instanceof OpenApiValidationError) {
    // Log detailed errors
    for (const validationError of error.errors) {
      console.error(`${validationError.path}: ${validationError.message}`);
    }
  }
}

// Fix common issues:
// 1. Ensure 'openapi' field is present and valid
{
  "openapi": "3.0.3",  // Must be 3.0.x or 3.1.x
  "info": {
    "title": "My API",
    "version": "1.0.0"
  }
}

// 2. Ensure all $ref references are valid
{
  "$ref": "#/components/schemas/User"  // Must exist in components
}

// 3. Validate with online tools
// https://editor.swagger.io/
```

---

### Error: "$ref resolution failed"

**Problem:**
```yaml
paths:
  /users:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'  # Not found

# Missing:
components:
  schemas:
    UserList:
      # ...
```

**Cause:** Referenced schema doesn't exist in components.

**Solution:**
```yaml
# Define all referenced schemas
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string

    UserList:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
```

---

## Type Inference Issues

### Issue: Generic types not inferred

**Problem:**
```typescript
// Want type inference but getting 'any'
const operation = get('/users')
  .responses({
    200: {
      description: 'Success',
      content: { 'application/json': { schema: UserSchema } }
    }
  });

type ResponseType = typeof operation;  // any
```

**Cause:** Missing type parameter on `responses`.

**Solution:**
```typescript
// Explicitly specify response type
const operation = get('/users')
  .responses<User[]>({
    200: {
      description: 'Success',
      content: { 'application/json': { schema: UserArraySchema } }
    }
  });

type ResponseType = typeof operation;  // IRestOperation<{}, {}, unknown, User[]>
```

---

### Issue: Schema type mismatch

**Problem:**
```typescript
interface User {
  id: string;
  name: string;
  age: number;
}

const schema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    age: { type: 'string' }  // Mismatch: should be 'number'
  }
};
```

**Cause:** TypeScript interface and JSON Schema don't match.

**Solution:**
```typescript
// Option 1: Keep them in sync manually
const schema: JsonSchema<User> = {
  type: 'object',
  required: ['id', 'name', 'age'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    age: { type: 'number' }  // Fixed
  }
};

// Option 2: Generate schema from TypeScript types
import { generateSchema } from '@atakora/schema-generator';

const schema = generateSchema<User>();
```

---

## Runtime Errors

### Error: "404 Not Found" when calling API

**Problem:**
```bash
$ curl https://api.example.com/users/123
404 Not Found
```

**Cause:** Operation not registered or path mismatch.

**Solution:**
```typescript
// 1. Check operation is registered
class ApiStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    const operation = get('/users/{userId}')
      .operationId('getUser')
      .pathParams<{ userId: string }>({ /* ... */ })
      .responses({ /* ... */ })
      .build();

    // Must add operation to API
    this.api.addOperation(operation);  // ← Don't forget this
  }
}

// 2. Check path matches exactly
// API: /users/{userId}
// Call: /users/123  ✓
// Call: /user/123   ✗ (wrong path)
// Call: /users/     ✗ (missing userId)

// 3. Check deployment
$ atakora deploy --stack ApiStack
$ az apim api operation list --resource-group my-rg --service-name my-apim --api-id my-api
```

---

### Error: "401 Unauthorized"

**Problem:**
```bash
$ curl https://api.example.com/users
401 Unauthorized
```

**Cause:** Missing or invalid authentication.

**Solution:**
```bash
# 1. Check if authentication is required
# Look for .security() in operation definition

# 2. Include proper authentication
# For API key:
curl -H "X-API-Key: your-key" https://api.example.com/users

# For OAuth 2.0:
TOKEN=$(az account get-access-token --query accessToken -o tsv)
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/users

# 3. Check Azure AD configuration
az ad app list --display-name "My API" --query "[0].appId"

# 4. Verify token claims
# Use https://jwt.ms/ to decode token
```

---

### Error: "429 Too Many Requests"

**Problem:**
```bash
$ curl https://api.example.com/users
429 Too Many Requests
Retry-After: 60
```

**Cause:** Rate limit exceeded.

**Solution:**
```typescript
// 1. Check rate limit configuration
const rateLimiter = new RateLimiter({
  enabled: true,
  limits: [
    {
      scope: 'perApiKey',
      limit: 1000,  // Check this value
      window: 3600
    }
  ]
});

// 2. Implement retry logic
async function callWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      await sleep(retryAfter * 1000);
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}

// 3. Increase rate limits if legitimate
const rateLimiter = new RateLimiter({
  limits: [
    {
      scope: 'perApiKey',
      limit: 5000,  // Increased
      window: 3600
    }
  ]
});
```

---

### Error: "500 Internal Server Error"

**Problem:**
```bash
$ curl https://api.example.com/users
500 Internal Server Error
```

**Cause:** Backend error or misconfiguration.

**Solution:**
```typescript
// 1. Check Application Insights logs
// Azure Portal → API Management → Application Insights → Logs

// 2. Enable detailed error responses (development only)
import { ProblemDetailsFactory } from '@atakora/cdk/api/rest/advanced';

const errorHandler = ProblemDetailsFactory.createGlobalErrorHandler(
  true,  // logErrors
  true   // includeStackTrace (ONLY in development!)
);

// 3. Check backend connectivity
const operation = get('/users')
  .backend({
    type: 'azureFunction',
    functionApp: myFunctionApp,
    functionName: 'GetUsers',
    timeout: 30,  // Increase if needed
    retryPolicy: {
      maxAttempts: 3,
      interval: 1000
    }
  });

// 4. Test backend directly
$ az functionapp function show \
    --resource-group my-rg \
    --name my-function-app \
    --function-name GetUsers
```

---

## Performance Problems

### Issue: Slow response times

**Problem:** API responses taking > 1 second.

**Diagnosis:**
```typescript
// 1. Enable Application Insights
import { ObservabilityHelper } from '@atakora/cdk/api/rest/advanced';

const observability = new ObservabilityHelper({
  tracing: {
    enabled: true,
    provider: 'applicationInsights',
    samplingRate: 1.0  // 100% sampling for diagnosis
  },
  logging: {
    enabled: true,
    logLevel: 'information',
    logRequests: true,
    logResponses: true
  }
});

// 2. Check Application Insights metrics
// Azure Portal → Application Insights → Performance → Operations
// Look for:
// - Server response time
// - Dependency duration
// - Request count
```

**Solutions:**

1. **Enable caching:**

```typescript
import { HttpCachingHelper } from '@atakora/cdk/api/rest/advanced';

const cachingHelper = new HttpCachingHelper({
  enabled: true,
  strategy: 'etag',
  defaultTtl: 300  // 5 minutes
});

const operation = get('/users')
  .policies({
    outbound: [cachingHelper.createETagPolicy()]
  });
```

2. **Optimize backend:**

```typescript
// Increase timeout if backend is slow
.backend({
  type: 'azureFunction',
  functionApp: myFunctionApp,
  functionName: 'GetUsers',
  timeout: 60,  // Increased from 30
  retryPolicy: {
    maxAttempts: 1  // Reduce retries if not needed
  }
})
```

3. **Use CDN for static content:**

```typescript
// Serve static content from CDN
.policies({
  inbound: [
    choose({
      when: {
        condition: '@(context.Request.Url.Path.StartsWith("/static/"))',
        operations: [
          rewrite({
            uri: 'https://cdn.example.com' + '@(context.Request.Url.Path)'
          })
        ]
      }
    })
  ]
})
```

---

### Issue: High memory usage

**Problem:** Function app using excessive memory.

**Diagnosis:**
```bash
# Check function app metrics
az monitor metrics list \
  --resource /subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{function-app} \
  --metric "MemoryWorkingSet" \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z
```

**Solutions:**

1. **Optimize response payloads:**

```typescript
// Use field selection
import { FieldSelectionHelper } from '@atakora/cdk/api/rest/advanced';

const fieldSelection = new FieldSelectionHelper({
  enabled: true,
  allowedFields: ['id', 'name', 'email']  // Limit fields
});

const operation = get('/users')
  .policies({
    outbound: [fieldSelection.createProjectionPolicy()]
  });
```

2. **Implement pagination:**

```typescript
import { offsetPagination } from '@atakora/cdk/api/rest/advanced';

const pagination = offsetPagination({
  strategy: 'offset',
  defaultPageSize: 20,
  maxPageSize: 100  // Limit maximum page size
});
```

---

## Government Cloud Issues

### Issue: Authentication failing in Gov Cloud

**Problem:**
```bash
$ curl -H "Authorization: Bearer $TOKEN" https://api.usgovcloudapi.net/users
401 Unauthorized
```

**Cause:** Using commercial cloud endpoints instead of government cloud.

**Solution:**
```typescript
import { AuthenticationManager } from '@atakora/cdk/api/rest/advanced';

// Use government cloud endpoints
const authManager = new AuthenticationManager({
  providers: [
    {
      name: 'azureAdGov',
      type: 'azureAd',
      config: {
        tenantId: 'gov-tenant-id',
        clientId: 'client-id',
        instance: 'https://login.microsoftonline.us',  // Gov cloud
        audience: 'api://your-api'
      }
    }
  ]
});
```

---

### Issue: Deployment failing in Gov Cloud

**Problem:**
```bash
$ atakora deploy --environment gov
Error: Region 'eastus' not available in Government Cloud
```

**Cause:** Using commercial cloud regions.

**Solution:**
```typescript
// Use government cloud regions
class GovCloudStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      region: 'usgovvirginia',  // Gov cloud region
      environment: 'AzureUSGovernment'
    });
  }
}

// Available Gov Cloud regions:
// - usgovvirginia
// - usgovtexas
// - usgovarizona
```

---

## Debugging Tips

### Enable Verbose Logging

```bash
# CLI debugging
export ATAKORA_LOG_LEVEL=debug
atakora deploy --stack MyStack

# View detailed logs
atakora logs --stack MyStack --tail
```

### Inspect Synthesized ARM Templates

```bash
# Generate ARM templates without deploying
atakora synth --stack MyStack --output ./arm-templates

# Inspect the generated templates
cat ./arm-templates/MyStack.template.json
```

### Test Operations Locally

```typescript
// Create mock context for testing
import { HttpRequest } from '@azure/functions';

const mockRequest: HttpRequest = {
  method: 'GET',
  url: 'https://api.example.com/users/123',
  params: { userId: '123' },
  query: {},
  headers: {},
  body: null
};

// Test your handler
const response = await GetUser(mockRequest, context);
console.log(response);
```

### Use OpenAPI Editor

```bash
# Export your API to OpenAPI
const exporter = new OpenApiExporter(operations, info);
const spec = exporter.export();
await fs.writeFile('openapi.json', JSON.stringify(spec, null, 2));

# Open in Swagger Editor
# https://editor.swagger.io/
# Upload openapi.json to validate and test
```

### Check Azure Resources

```bash
# List API Management operations
az apim api operation list \
  --resource-group my-rg \
  --service-name my-apim \
  --api-id my-api \
  --output table

# Get operation details
az apim api operation show \
  --resource-group my-rg \
  --service-name my-apim \
  --api-id my-api \
  --operation-id getUser

# Test operation directly
az apim api operation test \
  --resource-group my-rg \
  --service-name my-apim \
  --api-id my-api \
  --operation-id getUser
```

---

## Getting Help

If you can't find a solution here:

1. **Check the Documentation**
   - [REST API User Guide](./rest-api-user-guide.md)
   - [REST API Reference](../reference/api/rest-api-reference.md)
   - [Examples](../examples/rest-api-examples.md)

2. **Search GitHub Issues**
   - https://github.com/atakora/atakora/issues

3. **Ask the Community**
   - GitHub Discussions
   - Stack Overflow (tag: atakora)

4. **Report a Bug**
   - Create a GitHub issue with:
     - Atakora version
     - Complete error message
     - Minimal reproduction code
     - Expected vs actual behavior

5. **Enterprise Support**
   - Contact support@atakora.dev for commercial support

---

## Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `ATK-REST-001` | Missing required response | Add at least one response definition |
| `ATK-REST-002` | Invalid path parameter | Ensure path param name matches schema |
| `ATK-REST-003` | Schema validation failed | Check JSON Schema syntax |
| `ATK-REST-004` | OpenAPI import failed | Validate OpenAPI spec |
| `ATK-REST-005` | Backend not configured | Add backend configuration |
| `ATK-REST-006` | Type mismatch | Ensure TypeScript and schema types match |
| `ATK-REST-007` | Circular dependency | Refactor stack dependencies |
| `ATK-REST-008` | Rate limit exceeded | Implement retry logic or increase limits |
| `ATK-REST-009` | Authentication failed | Check credentials and configuration |
| `ATK-REST-010` | Synthesis error | Review stack configuration |

---

## Related Documentation

- [REST API User Guide](./rest-api-user-guide.md)
- [REST API Examples](../examples/rest-api-examples.md)
- [REST API Reference](../reference/api/rest-api-reference.md)
- [Migration Guide](./rest-api-migration.md)
