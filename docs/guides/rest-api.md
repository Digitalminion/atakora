# Building REST APIs

Build type-safe REST APIs for Azure API Management with full OpenAPI 3.0/3.1 support.

## Overview

Atakora provides a comprehensive REST API framework that enables you to:

- Define type-safe REST operations with full TypeScript inference
- Import and export OpenAPI 3.0/3.1 specifications
- Integrate with Azure Functions, App Service, and other backends
- Validate requests and responses at build time
- Implement retry policies, circuit breakers, and health checks

## Quick Start

### Creating a Simple GET Operation

```typescript
import { get } from '@atakora/cdk/api/rest';

const getUserOperation = get('/users/{userId}')
  .operationId('getUser')
  .summary('Get user by ID')
  .pathParams<{ userId: string }>({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', format: 'uuid' }
      }
    }
  })
  .responses<User>({
    200: {
      description: 'User found',
      content: {
        'application/json': {
          schema: UserSchema
        }
      }
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      }
    }
  })
  .build();
```

### Creating a POST Operation with Request Body

```typescript
import { post } from '@atakora/cdk/api/rest';

const createUserOperation = post<CreateUserRequest>('/users')
  .operationId('createUser')
  .summary('Create a new user')
  .body<CreateUserRequest>({
    required: true,
    content: {
      'application/json': {
        schema: CreateUserRequestSchema
      }
    }
  })
  .responses<User>({
    201: {
      description: 'User created successfully',
      content: {
        'application/json': {
          schema: UserSchema
        }
      }
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      }
    }
  })
  .build();
```

## Backend Integration

### Azure Functions Backend

Connect your REST operations to Azure Functions:

```typescript
import { get, BackendManager } from '@atakora/cdk/api/rest';

const operation = get('/users/{userId}')
  .operationId('getUser')
  .backend({
    type: 'azureFunction',
    functionApp: myFunctionApp,
    functionName: 'GetUser',
    authLevel: 'function'
  })
  .responses<User>({
    200: {
      description: 'User found',
      content: { 'application/json': { schema: UserSchema } }
    }
  })
  .build();
```

### App Service Backend

Proxy requests to an Azure App Service:

```typescript
const operation = get('/users/{userId}')
  .operationId('getUser')
  .backend({
    type: 'appService',
    appService: myWebApp,
    relativePath: '/api/users'
  })
  .responses<User>({
    200: {
      description: 'User found',
      content: { 'application/json': { schema: UserSchema } }
    }
  })
  .build();
```

### External HTTP Endpoint

Connect to external APIs:

```typescript
const operation = get('/users/{userId}')
  .operationId('getUser')
  .backend({
    type: 'httpEndpoint',
    url: 'https://api.example.com/users',
    preserveHostHeader: true,
    credentials: {
      type: 'apiKey',
      header: 'X-API-Key',
      value: 'my-api-key'
    }
  })
  .responses<User>({
    200: {
      description: 'User found',
      content: { 'application/json': { schema: UserSchema } }
    }
  })
  .build();
```

## Working with Parameters

### Query Parameters with Pagination

```typescript
const listUsersOperation = get('/users')
  .operationId('listUsers')
  .queryParams<{ page?: number; pageSize?: number; sort?: string }>({
    schema: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, default: 1 },
        pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        sort: { type: 'string', enum: ['name', 'createdAt'], default: 'createdAt' }
      }
    }
  })
  .responses<PaginatedResponse<User>>({
    200: {
      description: 'List of users',
      content: {
        'application/json': {
          schema: PaginatedUserResponseSchema
        }
      }
    }
  })
  .build();
```

## Reliability Patterns

### Retry Policy

Configure automatic retry behavior for transient failures:

```typescript
const operation = get('/users/{userId}')
  .operationId('getUser')
  .backend({
    type: 'azureFunction',
    functionApp: myFunctionApp,
    functionName: 'GetUser',
    retryPolicy: {
      maxAttempts: 3,
      interval: 1000,
      backoffMultiplier: 2,
      maxInterval: 10000,
      retryOn: [500, 502, 503, 504]
    }
  })
  .responses<User>({
    200: {
      description: 'User found',
      content: { 'application/json': { schema: UserSchema } }
    }
  })
  .build();
```

### Circuit Breaker

Prevent cascading failures with circuit breaker pattern:

```typescript
const operation = get('/users/{userId}')
  .operationId('getUser')
  .backend({
    type: 'azureFunction',
    functionApp: myFunctionApp,
    functionName: 'GetUser',
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000
    }
  })
  .responses<User>({
    200: {
      description: 'User found',
      content: { 'application/json': { schema: UserSchema } }
    }
  })
  .build();
```

### Health Checks

Monitor backend service health:

```typescript
const operation = get('/users/{userId}')
  .operationId('getUser')
  .backend({
    type: 'appService',
    appService: myWebApp,
    healthCheck: {
      enabled: true,
      path: '/health',
      interval: 30,
      timeout: 5,
      unhealthyThreshold: 3,
      healthyThreshold: 2,
      expectedStatusCode: 200
    }
  })
  .responses<User>({
    200: {
      description: 'User found',
      content: { 'application/json': { schema: UserSchema } }
    }
  })
  .build();
```

## Type Safety

All REST operations provide full TypeScript type inference:

```typescript
// Path parameters are typed
const op1 = get('/users/{userId}')
  .pathParams<{ userId: string }>({
    schema: {
      type: 'object',
      properties: { userId: { type: 'string' } }
    }
  })
  .build();

// Query parameters are typed
const op2 = get('/users')
  .queryParams<{ search?: string }>({
    schema: {
      type: 'object',
      properties: { search: { type: 'string' } }
    }
  })
  .build();

// Request body is typed
const op3 = post<CreateUserRequest>('/users')
  .body<CreateUserRequest>({
    required: true,
    content: {
      'application/json': { schema: CreateUserRequestSchema }
    }
  })
  .build();

// Response is typed
const op4 = get('/users/{userId}')
  .responses<User>({
    200: {
      description: 'User',
      content: { 'application/json': { schema: UserSchema } }
    }
  })
  .build();
```

## HTTP Methods

All standard HTTP methods are supported:

- **GET** - `get(path)` - Retrieve resources
- **POST** - `post(path)` - Create resources
- **PUT** - `put(path)` - Update/replace resources
- **PATCH** - `patch(path)` - Partial updates
- **DELETE** - `del(path)` - Delete resources
- **HEAD** - `head(path)` - Metadata only
- **OPTIONS** - `options(path)` - CORS and capabilities
- **TRACE** - `trace(path)` - Debugging

## Backend Types

Supported backend integrations:

- **azureFunction** - Azure Functions
- **appService** - Azure App Service (Web Apps)
- **containerApp** - Azure Container Apps
- **httpEndpoint** - External HTTP/HTTPS endpoints
- **serviceFabric** - Service Fabric services
- **logicApp** - Azure Logic Apps

## Authentication Methods

Configure backend authentication:

- **none** - No authentication
- **basic** - Basic authentication (username/password)
- **clientCertificate** - Client certificate authentication
- **managedIdentity** - Azure Managed Identity (recommended)
- **apiKey** - API key in header or query parameter

## Error Handling

Follow RFC 7807 Problem Details format for error responses:

```typescript
const ErrorResponseSchema: JsonSchema<ErrorResponse> = {
  type: 'object',
  required: ['title', 'status'],
  properties: {
    type: { type: 'string', format: 'uri' },
    title: { type: 'string' },
    status: { type: 'integer' },
    detail: { type: 'string' },
    instance: { type: 'string', format: 'uri' }
  }
};
```

## Gov Cloud Considerations

When deploying to Azure Government Cloud:

- Remote reference resolution is disabled for security
- Only local filesystem access is allowed
- External HTTP endpoints require approval
- Use managed identities for backend authentication

## Next Steps

- Learn about [OpenAPI integration](./openapi-integration.md)
- Explore [API authentication patterns](./api-authentication.md)
- Review [REST API best practices](./rest-api-best-practices.md)

## Related Documentation

- [ADR-014: REST API Core Architecture](../design/architecture/adr-014-rest-api-architecture.md)
- [ADR-015: REST Advanced Features](../design/architecture/adr-015-rest-advanced-features.md)
- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [RFC 7807: Problem Details](https://tools.ietf.org/html/rfc7807)
