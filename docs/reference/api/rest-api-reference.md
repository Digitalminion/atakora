# REST API Reference

Complete API reference for Atakora's REST API implementation.

## Table of Contents

- [Core Interfaces](#core-interfaces)
- [Operation Builder](#operation-builder)
- [HTTP Method Helpers](#http-method-helpers)
- [OpenAPI Integration](#openapi-integration)
- [Advanced Features](#advanced-features)
- [Type Utilities](#type-utilities)

---

## Core Interfaces

### IRestOperation

The core interface representing a REST API operation with full type safety.

```typescript
interface IRestOperation<TParams = any, TQuery = any, TBody = any, TResponse = any>
```

**Type Parameters:**
- `TParams` - Type of path parameters object
- `TQuery` - Type of query parameters object
- `TBody` - Type of request body
- `TResponse` - Type of response body

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `method` | `HttpMethod` | Yes | HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, TRACE) |
| `path` | `string` | Yes | URL path template (e.g., '/users/{userId}') |
| `operationId` | `string` | No | Unique identifier for the operation |
| `summary` | `string` | No | Brief summary of the operation |
| `description` | `string` | No | Detailed description of the operation |
| `tags` | `readonly string[]` | No | Tags for grouping operations |
| `pathParameters` | `PathParameterDefinition<TParams>` | No | Path parameter definitions |
| `queryParameters` | `QueryParameterDefinition<TQuery>` | No | Query parameter definitions |
| `headerParameters` | `HeaderParameterDefinition` | No | Header parameter definitions |
| `requestBody` | `RequestBodyDefinition<TBody>` | No | Request body definition |
| `responses` | `ResponseDefinition<TResponse>` | Yes | Response definitions (at least one required) |
| `backend` | `BackendConfiguration` | No | Backend service configuration |
| `security` | `readonly SecurityRequirement[]` | No | Security requirements |
| `policies` | `OperationPolicies` | No | API Management policies |
| `deprecated` | `boolean` | No | Whether the operation is deprecated |
| `externalDocs` | `ExternalDocumentation` | No | External documentation reference |
| `servers` | `readonly ServerConfiguration[]` | No | Server configurations |

**Example:**

```typescript
const operation: IRestOperation<{ userId: string }, {}, never, User> = {
  method: 'GET',
  path: '/users/{userId}',
  operationId: 'getUser',
  summary: 'Get user by ID',
  pathParameters: {
    schema: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string', format: 'uuid' }
      }
    }
  },
  responses: {
    200: {
      description: 'User found',
      content: {
        'application/json': { schema: UserSchema }
      }
    }
  }
};
```

---

### HttpMethod

Type representing supported HTTP methods.

```typescript
type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'TRACE';
```

**Method Semantics:**

- **GET**: Retrieve a resource. Should be idempotent and safe (no side effects).
- **POST**: Create a new resource or submit data. Not idempotent.
- **PUT**: Update or replace a resource. Should be idempotent.
- **PATCH**: Partially update a resource.
- **DELETE**: Remove a resource. Should be idempotent.
- **HEAD**: Same as GET but without response body. Used for metadata.
- **OPTIONS**: Describe communication options. Used for CORS preflight.
- **TRACE**: Loop-back test. Used for debugging.

---

### PathParameterDefinition

Defines path parameters with type inference.

```typescript
interface PathParameterDefinition<T = any> {
  readonly schema: ParameterSchema<T>;
  readonly description?: string;
  readonly examples?: Record<string, ParameterExample>;
  readonly style?: 'simple' | 'label' | 'matrix';
  readonly explode?: boolean;
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `schema` | `ParameterSchema<T>` | JSON Schema for parameters |
| `description` | `string` | Description of parameters |
| `examples` | `Record<string, ParameterExample>` | Example values |
| `style` | `'simple' \| 'label' \| 'matrix'` | Serialization style |
| `explode` | `boolean` | Whether to explode arrays/objects |

**Example:**

```typescript
pathParams<{ userId: string; orderId: string }>({
  schema: {
    type: 'object',
    required: ['userId', 'orderId'],
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'User identifier'
      },
      orderId: {
        type: 'string',
        format: 'uuid',
        description: 'Order identifier'
      }
    }
  }
})
```

---

### QueryParameterDefinition

Defines query parameters with type inference.

```typescript
interface QueryParameterDefinition<T = any> {
  readonly schema: ParameterSchema<T>;
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly allowEmptyValue?: boolean;
  readonly style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
  readonly explode?: boolean;
  readonly examples?: Record<string, ParameterExample>;
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `schema` | `ParameterSchema<T>` | JSON Schema for query parameters |
| `description` | `string` | Description of parameters |
| `required` | `boolean` | Whether any parameter is required |
| `deprecated` | `boolean` | Whether parameters are deprecated |
| `allowEmptyValue` | `boolean` | Allow empty string values |
| `style` | `string` | Serialization style |
| `explode` | `boolean` | Explode arrays/objects |
| `examples` | `Record<string, ParameterExample>` | Example values |

**Example:**

```typescript
queryParams<{ page?: number; pageSize?: number; sort?: string }>({
  schema: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        minimum: 1,
        default: 1
      },
      pageSize: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20
      },
      sort: {
        type: 'string',
        description: 'Sort field and direction'
      }
    }
  }
})
```

---

### RequestBodyDefinition

Defines request body with type inference.

```typescript
interface RequestBodyDefinition<T = any> {
  readonly description?: string;
  readonly required?: boolean;
  readonly content: ContentTypeDefinition<T>;
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `description` | `string` | Description of request body |
| `required` | `boolean` | Whether body is required |
| `content` | `ContentTypeDefinition<T>` | Content type schemas |

**Example:**

```typescript
body<CreateUserRequest>({
  required: true,
  description: 'User creation data',
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

---

### ResponseDefinition

Defines responses with status code mapping.

```typescript
interface ResponseDefinition<T = any> {
  readonly 200?: ResponseSchema<T>;
  readonly 201?: ResponseSchema<T>;
  readonly 204?: ResponseSchema<T>;
  readonly 400?: ResponseSchema<ErrorResponse>;
  readonly 401?: ResponseSchema<ErrorResponse>;
  readonly 403?: ResponseSchema<ErrorResponse>;
  readonly 404?: ResponseSchema<ErrorResponse>;
  readonly 409?: ResponseSchema<ErrorResponse>;
  readonly 422?: ResponseSchema<ErrorResponse>;
  readonly 429?: ResponseSchema<ErrorResponse>;
  readonly 500?: ResponseSchema<ErrorResponse>;
  readonly [statusCode: number]: ResponseSchema | undefined;
  readonly default?: ResponseSchema;
}
```

**Common Status Codes:**

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request syntax |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Temporary outage |

**Example:**

```typescript
responses<User>({
  200: {
    description: 'User found',
    content: {
      'application/json': { schema: UserSchema }
    }
  },
  404: {
    description: 'User not found',
    content: {
      'application/json': { schema: ErrorSchema }
    }
  }
})
```

---

### JsonSchema

JSON Schema definition aligned with OpenAPI.

```typescript
interface JsonSchema<T = any> {
  readonly type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  readonly format?: string;
  readonly title?: string;
  readonly description?: string;
  readonly default?: T;
  readonly multipleOf?: number;
  readonly maximum?: number;
  readonly exclusiveMaximum?: boolean;
  readonly minimum?: number;
  readonly exclusiveMinimum?: boolean;
  readonly maxLength?: number;
  readonly minLength?: number;
  readonly pattern?: string;
  readonly maxItems?: number;
  readonly minItems?: number;
  readonly uniqueItems?: boolean;
  readonly maxProperties?: number;
  readonly minProperties?: number;
  readonly required?: readonly string[];
  readonly enum?: readonly any[];
  readonly properties?: Record<string, JsonSchema>;
  readonly additionalProperties?: boolean | JsonSchema;
  readonly items?: JsonSchema;
  readonly oneOf?: readonly JsonSchema[];
  readonly anyOf?: readonly JsonSchema[];
  readonly allOf?: readonly JsonSchema[];
  readonly not?: JsonSchema;
  readonly nullable?: boolean;
  readonly readOnly?: boolean;
  readonly writeOnly?: boolean;
  readonly example?: any;
  readonly deprecated?: boolean;
  readonly $ref?: string;
}
```

**Common Formats:**

| Format | Type | Example |
|--------|------|---------|
| `date` | string | `"2024-01-15"` |
| `date-time` | string | `"2024-01-15T10:30:00Z"` |
| `email` | string | `"user@example.com"` |
| `uuid` | string | `"123e4567-e89b-12d3-a456-426614174000"` |
| `uri` | string | `"https://example.com"` |
| `ipv4` | string | `"192.168.1.1"` |
| `ipv6` | string | `"2001:0db8:85a3::8a2e:0370:7334"` |
| `binary` | string | Base64-encoded binary data |
| `byte` | string | Base64-encoded data |
| `int32` | integer | 32-bit integer |
| `int64` | integer | 64-bit integer |
| `float` | number | Floating-point number |
| `double` | number | Double-precision floating-point |

---

## Operation Builder

### RestOperationBuilder

Fluent API for building type-safe REST operations.

```typescript
class RestOperationBuilder<TParams = {}, TQuery = {}, TBody = unknown, TResponse = unknown>
```

**Methods:**

#### operationId(id: string): this

Sets unique operation identifier.

```typescript
.operationId('getUser')
```

#### summary(text: string): this

Sets brief summary.

```typescript
.summary('Get user by ID')
```

#### description(text: string): this

Sets detailed description.

```typescript
.description('Retrieves a single user by their unique identifier')
```

#### tags(...tags: string[]): this

Sets tags for grouping.

```typescript
.tags('Users', 'Public API')
```

#### deprecated(isDeprecated?: boolean): this

Marks operation as deprecated.

```typescript
.deprecated(true)
```

#### pathParams<T>(definition: PathParameterDefinition<T>): RestOperationBuilder<T, TQuery, TBody, TResponse>

Defines path parameters with type inference.

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

#### queryParams<T>(definition: QueryParameterDefinition<T>): RestOperationBuilder<TParams, T, TBody, TResponse>

Defines query parameters with type inference.

```typescript
.queryParams<{ page?: number }>({
  schema: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 }
    }
  }
})
```

#### body<T>(definition: RequestBodyDefinition<T>): RestOperationBuilder<TParams, TQuery, T, TResponse>

Defines request body with type inference.

```typescript
.body<CreateUserRequest>({
  required: true,
  content: {
    'application/json': { schema: CreateUserRequestSchema }
  }
})
```

#### responses<T>(definition: ResponseDefinition<T>): RestOperationBuilder<TParams, TQuery, TBody, T>

Defines responses with type inference.

```typescript
.responses<User>({
  200: {
    description: 'Success',
    content: { 'application/json': { schema: UserSchema } }
  }
})
```

#### backend(config: BackendConfiguration): this

Configures backend service.

```typescript
.backend({
  type: 'azureFunction',
  functionApp: myFunctionApp,
  functionName: 'GetUser'
})
```

#### security(...requirements: SecurityRequirement[]): this

Defines security requirements.

```typescript
.security({ oauth2: ['users:read'] })
```

#### policies(policies: OperationPolicies): this

Defines API Management policies.

```typescript
.policies({
  inbound: [validateJwtPolicy],
  outbound: [cachingPolicy]
})
```

#### build(): IRestOperation<TParams, TQuery, TBody, TResponse>

Builds final operation.

```typescript
const operation = builder.build();
```

**Throws:**
- Error if responses are not defined
- Error if HTTP method is missing
- Error if path is missing

---

## HTTP Method Helpers

Convenience functions for creating operations with specific HTTP methods.

### get(path: string): RestOperationBuilder

Creates GET operation builder.

```typescript
const operation = get('/users/{userId}')
  .operationId('getUser')
  .responses({ /* ... */ })
  .build();
```

**Use For:**
- Retrieving resources
- Listing collections
- Read-only operations

### post<TBody>(path: string): RestOperationBuilder<{}, {}, TBody, unknown>

Creates POST operation builder with body type.

```typescript
const operation = post<CreateUserRequest>('/users')
  .body<CreateUserRequest>({ /* ... */ })
  .responses({ /* ... */ })
  .build();
```

**Use For:**
- Creating new resources
- Submitting forms
- Non-idempotent operations

### put<TBody>(path: string): RestOperationBuilder<{}, {}, TBody, unknown>

Creates PUT operation builder with body type.

```typescript
const operation = put<UpdateUserRequest>('/users/{userId}')
  .pathParams<{ userId: string }>({ /* ... */ })
  .body<UpdateUserRequest>({ /* ... */ })
  .responses({ /* ... */ })
  .build();
```

**Use For:**
- Full resource replacement
- Idempotent updates
- Creating resources at specific URIs

### patch<TBody>(path: string): RestOperationBuilder<{}, {}, TBody, unknown>

Creates PATCH operation builder with body type.

```typescript
const operation = patch<Partial<User>>('/users/{userId}')
  .pathParams<{ userId: string }>({ /* ... */ })
  .body<Partial<User>>({ /* ... */ })
  .responses({ /* ... */ })
  .build();
```

**Use For:**
- Partial resource updates
- Modifying specific fields
- Efficient updates

### del(path: string): RestOperationBuilder

Creates DELETE operation builder.

```typescript
const operation = del('/users/{userId}')
  .pathParams<{ userId: string }>({ /* ... */ })
  .responses({
    204: { description: 'Deleted' }
  })
  .build();
```

**Use For:**
- Removing resources
- Cleanup operations
- Idempotent deletions

### head(path: string): RestOperationBuilder

Creates HEAD operation builder.

```typescript
const operation = head('/users/{userId}')
  .pathParams<{ userId: string }>({ /* ... */ })
  .responses({
    200: { description: 'Exists' },
    404: { description: 'Not found' }
  })
  .build();
```

**Use For:**
- Checking resource existence
- Getting metadata without body
- Cache validation

### options(path: string): RestOperationBuilder

Creates OPTIONS operation builder.

```typescript
const operation = options('/users/{userId}')
  .responses({
    200: {
      description: 'Available options',
      headers: {
        'Allow': { schema: { type: 'string' } }
      }
    }
  })
  .build();
```

**Use For:**
- CORS preflight requests
- Capability discovery
- Allowed methods

### trace(path: string): RestOperationBuilder

Creates TRACE operation builder.

```typescript
const operation = trace('/users/{userId}')
  .responses({
    200: { description: 'Trace successful' }
  })
  .build();
```

**Use For:**
- Debugging
- Message loop-back tests

---

## OpenAPI Integration

### OpenApiImporter

Imports OpenAPI 3.0/3.1 specifications.

```typescript
class OpenApiImporter {
  constructor(spec: OpenApiDefinition | string);
  import(): Promise<OpenApiImportResult>;
}
```

**Constructor Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `spec` | `OpenApiDefinition \| string` | OpenAPI spec object or path/URL to spec file |

**Methods:**

#### import(): Promise<OpenApiImportResult>

Imports and validates OpenAPI specification.

**Returns:** `Promise<OpenApiImportResult>`

```typescript
interface OpenApiImportResult {
  operations: IRestOperation[];
  info: OpenApiInfo;
  servers?: OpenApiServer[];
  components?: OpenApiComponents;
  security?: SecurityRequirement[];
}
```

**Example:**

```typescript
// From file
const importer = new OpenApiImporter('./openapi.yaml');
const result = await importer.import();

// From URL
const urlImporter = new OpenApiImporter('https://api.example.com/openapi.json');
const urlResult = await urlImporter.import();

// From object
const specImporter = new OpenApiImporter(openApiObject);
const specResult = await specImporter.import();
```

**Throws:**
- `OpenApiValidationError` if spec is invalid

---

### OpenApiExporter

Exports REST operations to OpenAPI format.

```typescript
class OpenApiExporter {
  constructor(
    operations: IRestOperation[],
    info: OpenApiInfo
  );
  export(version?: '3.0.3' | '3.1.0'): OpenApiDefinition;
}
```

**Constructor Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `operations` | `IRestOperation[]` | Array of REST operations to export |
| `info` | `OpenApiInfo` | API metadata (title, version, description, etc.) |

**Methods:**

#### export(version?: '3.0.3' | '3.1.0'): OpenApiDefinition

Exports operations to OpenAPI specification.

**Parameters:**
- `version` - OpenAPI version (defaults to '3.0.3')

**Returns:** `OpenApiDefinition`

**Example:**

```typescript
const exporter = new OpenApiExporter(operations, {
  title: 'My API',
  version: '1.0.0',
  description: 'API for managing resources',
  contact: {
    name: 'API Support',
    email: 'support@example.com'
  },
  license: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT'
  }
});

const openApiSpec = exporter.export('3.0.3');

// Save to file
await fs.writeFile('openapi.json', JSON.stringify(openApiSpec, null, 2));
```

---

## Advanced Features

### API Versioning

#### ApiVersionManager

Manages API versioning strategies.

```typescript
class ApiVersionManager {
  constructor(config: ApiVersioningConfig);
}
```

**Configuration:**

```typescript
interface ApiVersioningConfig {
  strategy: 'path' | 'header' | 'queryParameter' | 'contentNegotiation' | 'custom';
  defaultVersion?: string;
  versionFormat?: 'numeric' | 'semver' | 'date' | 'prefixed';
  deprecatedVersions?: DeprecatedVersion[];
}
```

**Example:**

```typescript
const versionManager = new ApiVersionManager({
  strategy: 'path',
  defaultVersion: 'v2',
  versionFormat: 'prefixed',
  deprecatedVersions: [
    {
      version: 'v1',
      deprecatedAt: new Date('2024-01-01'),
      sunsetAt: new Date('2024-12-31'),
      message: 'v1 is deprecated',
      migrationGuide: 'https://docs.example.com/migration'
    }
  ]
});
```

---

### Pagination

Helper functions for pagination patterns.

#### offsetPagination<T>(config): PaginationHelper<T>

Creates offset-based pagination helper.

```typescript
const helper = offsetPagination<User>({
  strategy: 'offset',
  defaultPageSize: 20,
  maxPageSize: 100,
  includeTotalCount: true
});
```

#### cursorPagination<T>(config): PaginationHelper<T>

Creates cursor-based pagination helper.

```typescript
const helper = cursorPagination<User>({
  strategy: 'cursor',
  defaultPageSize: 20,
  maxPageSize: 100,
  cursorEncoding: 'base64'
});
```

#### pagePagination<T>(config): PaginationHelper<T>

Creates page-based pagination helper.

```typescript
const helper = pagePagination<User>({
  strategy: 'page',
  defaultPageSize: 20,
  maxPageSize: 100,
  includeTotalCount: true
});
```

**PaginationHelper Methods:**

| Method | Description |
|--------|-------------|
| `addToOperation(operation)` | Adds pagination query parameters |
| `createResponseSchema(itemSchema)` | Creates paginated response schema |
| `generateLinkHeader(url, total?)` | Generates RFC 8288 Link header |
| `generateMetadata(items, total?)` | Generates pagination metadata |

---

### Filtering and Sorting

#### FilteringHelper

Adds filtering capabilities to operations.

```typescript
const filterHelper = new FilteringHelper({
  enabled: true,
  syntax: 'rsql',  // 'rsql' | 'odata' | 'mongo' | 'simple'
  allowedFields: ['name', 'email', 'status'],
  maxFilters: 10
});

const operation = filterHelper.addFilterParams(baseOperation);
```

#### SortingHelper

Adds sorting capabilities to operations.

```typescript
const sortHelper = new SortingHelper({
  enabled: true,
  allowedFields: ['name', 'createdAt', 'email'],
  defaultSort: [{ field: 'createdAt', direction: 'desc' }],
  maxSortFields: 3
});

const operation = sortHelper.addSortParams(baseOperation);
```

---

### Caching

#### HttpCachingHelper

Implements HTTP caching with ETags and Last-Modified.

```typescript
const cachingHelper = new HttpCachingHelper({
  enabled: true,
  strategy: 'etag',  // 'etag' | 'lastModified' | 'both'
  defaultTtl: 300,
  varyBy: {
    headers: ['Accept-Language'],
    queryParameters: ['includeDeleted']
  }
});

const etagPolicy = cachingHelper.createETagPolicy();
const conditionalPolicy = cachingHelper.createConditionalRequestPolicy();
```

---

### Rate Limiting

#### RateLimiter

Implements rate limiting strategies.

```typescript
const rateLimiter = new RateLimiter({
  enabled: true,
  strategy: 'fixedWindow',  // 'fixedWindow' | 'slidingWindow' | 'tokenBucket'
  responseHeaders: true,
  retryAfter: true,
  limits: [
    {
      scope: 'perApiKey',
      limit: 1000,
      window: 3600  // 1 hour
    }
  ]
});

const policy = rateLimiter.createPolicy({
  scope: 'perApiKey',
  limit: 1000,
  window: 3600
});
```

**Rate Limit Scopes:**

- `global` - Applies to all requests
- `perIp` - Per client IP address
- `perUser` - Per authenticated user
- `perApiKey` - Per API key
- `perSubscription` - Per API Management subscription
- `perOperation` - Per operation
- `custom` - Custom key extraction

---

## Type Utilities

### Inference Types

TypeScript utility types for type inference.

#### ExtractPathParams<T>

Extracts path parameter types from operation.

```typescript
type UserIdParam = ExtractPathParams<typeof getUserOperation>;
// { userId: string }
```

#### ExtractQueryParams<T>

Extracts query parameter types from operation.

```typescript
type ListQuery = ExtractQueryParams<typeof listUsersOperation>;
// { page?: number; pageSize?: number }
```

#### ExtractRequestBody<T>

Extracts request body type from operation.

```typescript
type CreateRequest = ExtractRequestBody<typeof createUserOperation>;
// CreateUserRequest
```

#### ExtractResponseBody<T>

Extracts response body type from operation.

```typescript
type UserResponse = ExtractResponseBody<typeof getUserOperation>;
// User
```

---

## Error Types

### OpenApiValidationError

Error thrown when OpenAPI validation fails.

```typescript
class OpenApiValidationError extends Error {
  constructor(
    message: string,
    errors: ValidationError[]
  );

  readonly errors: ValidationError[];
}
```

**ValidationError:**

```typescript
interface ValidationError {
  path: string;
  message: string;
  code?: string;
}
```

**Example:**

```typescript
try {
  const importer = new OpenApiImporter('./invalid.yaml');
  await importer.import();
} catch (error) {
  if (error instanceof OpenApiValidationError) {
    for (const validationError of error.errors) {
      console.error(`${validationError.path}: ${validationError.message}`);
    }
  }
}
```

---

## Constants

### Common Content Types

```typescript
const ContentTypes = {
  JSON: 'application/json',
  XML: 'application/xml',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  FORM_DATA: 'multipart/form-data',
  TEXT: 'text/plain',
  BINARY: 'application/octet-stream',
  PROBLEM_JSON: 'application/problem+json'
} as const;
```

### HTTP Status Codes

```typescript
const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const;
```

---

## Related Documentation

- [REST API User Guide](../../guides/rest-api-user-guide.md) - Getting started and patterns
- [REST API Examples](../../examples/rest-api-examples.md) - Complete working examples
- [OpenAPI Synthesis](./openapi-synthesis.md) - OpenAPI-specific details
- [Azure Functions Handlers](./azure-functions-handlers.md) - Backend integration

---

## See Also

- [ADR-014: REST API Core Architecture](../../design/architecture/adr-014-rest-api-architecture.md)
- [ADR-015: REST Advanced Features](../../design/architecture/adr-015-rest-advanced-features.md)
- [OpenAPI Specification](https://spec.openapis.org/)
- [RFC 7807: Problem Details](https://tools.ietf.org/html/rfc7807)
- [RFC 8288: Web Linking](https://tools.ietf.org/html/rfc8288)
