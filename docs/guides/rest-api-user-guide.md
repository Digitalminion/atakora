# REST API User Guide

Comprehensive guide to building production-ready REST APIs with Atakora.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Creating Your First REST Operation](#creating-your-first-rest-operation)
- [OpenAPI Integration](#openapi-integration)
- [Versioning Strategies](#versioning-strategies)
- [Pagination Patterns](#pagination-patterns)
- [Authentication and Authorization](#authentication-and-authorization)
- [Caching Configuration](#caching-configuration)
- [Rate Limiting](#rate-limiting)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)
- [Government Cloud Considerations](#government-cloud-considerations)

## Overview

Atakora's REST API implementation provides a type-safe, OpenAPI-compliant way to build REST APIs on Azure API Management. It combines the power of TypeScript type inference with industry-standard REST patterns to create APIs that are both developer-friendly and production-ready.

### Key Features

- **Full TypeScript Type Safety**: Complete type inference for path parameters, query parameters, request bodies, and responses
- **OpenAPI 3.0/3.1 Support**: Import existing OpenAPI specs or export your API definitions
- **Multiple Versioning Strategies**: Path, header, query parameter, or content negotiation versioning
- **Built-in Pagination**: Offset, cursor, and page-based pagination with RFC 8288 Link headers
- **Advanced Authentication**: OAuth 2.0, OpenID Connect, Azure AD, API keys, and client certificates
- **HTTP Caching**: ETag and Last-Modified headers with conditional requests
- **Rate Limiting**: Fixed window, sliding window, and token bucket strategies
- **Request/Response Validation**: Automatic schema validation at build time and runtime
- **RFC 7807 Error Handling**: Standardized problem details format for errors
- **Azure Native**: Seamless integration with Azure Functions, App Services, and Container Apps
- **Government Cloud Ready**: Full support for Azure Government Cloud deployments

### When to Use REST APIs

REST APIs are ideal when you need:
- **Public-facing APIs** that follow industry standards
- **Integration with third-party systems** expecting REST/HTTP
- **Simple CRUD operations** on resources
- **File uploads and downloads**
- **Caching and conditional requests**
- **Wide client compatibility** (browsers, mobile apps, IoT devices)

For complex queries or data graphs, consider using [GraphQL](./graphql-user-guide.md) instead.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Azure subscription (Commercial or Government Cloud)
- Azure API Management instance
- Atakora CLI installed (`npm install -g @atakora/cli`)

### Installation

```bash
npm install @atakora/cdk
```

### Your First REST API

Let's create a simple REST API for managing users:

```typescript
import { Stack } from '@atakora/cdk';
import { get, post } from '@atakora/cdk/api/rest';

// Define your data types
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

// Define JSON schemas
const UserSchema = {
  type: 'object',
  required: ['id', 'name', 'email', 'createdAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    createdAt: { type: 'string', format: 'date-time' }
  }
} as const;

const CreateUserRequestSchema = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' }
  }
} as const;

// Create a stack
class UserApiStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    // GET /users/{userId}
    const getUser = get('/users/{userId}')
      .operationId('getUser')
      .summary('Get user by ID')
      .description('Retrieves a single user by their unique identifier')
      .tags('Users')
      .pathParams<{ userId: string }>({
        schema: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier'
            }
          }
        }
      })
      .responses<User>({
        200: {
          description: 'User found successfully',
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
      .build();

    // POST /users
    const createUser = post<CreateUserRequest>('/users')
      .operationId('createUser')
      .summary('Create a new user')
      .tags('Users')
      .body<CreateUserRequest>({
        required: true,
        description: 'User data for creation',
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
          description: 'Invalid request body',
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
      .build();
  }
}
```

## Creating Your First REST Operation

REST operations in Atakora are built using a fluent builder API that maintains full type safety.

### Basic Operation Structure

Every REST operation has three required components:

1. **HTTP Method and Path**: Defined when creating the builder
2. **Responses**: At least one response must be defined
3. **Metadata**: Operation ID, summary, and description (highly recommended)

```typescript
import { get } from '@atakora/cdk/api/rest';

const operation = get('/resource/{id}')
  .operationId('getResource')        // Unique identifier
  .summary('Get resource by ID')     // Brief description
  .description('Full description')   // Detailed explanation
  .responses({
    200: {
      description: 'Success',
      content: {
        'application/json': { schema: ResourceSchema }
      }
    }
  })
  .build();
```

### Path Parameters

Path parameters are extracted from the URL path template and validated against your schema:

```typescript
const operation = get('/users/{userId}/orders/{orderId}')
  .pathParams<{ userId: string; orderId: string }>({
    schema: {
      type: 'object',
      required: ['userId', 'orderId'],
      properties: {
        userId: {
          type: 'string',
          format: 'uuid',
          description: 'Unique user identifier'
        },
        orderId: {
          type: 'string',
          format: 'uuid',
          description: 'Unique order identifier'
        }
      }
    }
  })
  // ... rest of operation
  .build();
```

### Query Parameters

Query parameters provide filtering, sorting, and pagination capabilities:

```typescript
interface UserListQuery {
  status?: 'active' | 'inactive';
  page?: number;
  pageSize?: number;
  sort?: string;
}

const operation = get('/users')
  .queryParams<UserListQuery>({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Filter by user status'
        },
        page: {
          type: 'integer',
          minimum: 1,
          default: 1,
          description: 'Page number'
        },
        pageSize: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20,
          description: 'Items per page'
        },
        sort: {
          type: 'string',
          description: 'Sort field and direction (e.g., "createdAt:desc")'
        }
      }
    }
  })
  .build();
```

### Request Body

Define request body schemas with content type support:

```typescript
interface CreateProductRequest {
  name: string;
  price: number;
  category: string;
}

const operation = post<CreateProductRequest>('/products')
  .body<CreateProductRequest>({
    required: true,
    description: 'Product data',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['name', 'price', 'category'],
          properties: {
            name: { type: 'string', minLength: 1 },
            price: { type: 'number', minimum: 0 },
            category: { type: 'string' }
          }
        }
      }
    }
  })
  .build();
```

### Multiple Response Codes

Define different responses for various scenarios:

```typescript
const operation = post('/users')
  .responses<User>({
    201: {
      description: 'User created successfully',
      content: {
        'application/json': { schema: UserSchema }
      }
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': { schema: ErrorSchema }
      }
    },
    409: {
      description: 'User already exists',
      content: {
        'application/json': { schema: ErrorSchema }
      }
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': { schema: ErrorSchema }
      }
    }
  })
  .build();
```

## OpenAPI Integration

Atakora supports both importing existing OpenAPI specifications and exporting your API definitions to OpenAPI format.

### Importing OpenAPI Specs

Import an existing OpenAPI 3.0 or 3.1 specification:

```typescript
import { OpenApiImporter } from '@atakora/cdk/api/rest';

// From a file
const importer = new OpenApiImporter('./openapi.yaml');
const result = await importer.import();

// Use the imported operations
for (const operation of result.operations) {
  console.log(`${operation.method} ${operation.path}`);
}

// From a URL
const urlImporter = new OpenApiImporter('https://api.example.com/openapi.json');
const urlResult = await urlImporter.import();
```

### Exporting to OpenAPI

Export your Atakora REST operations to OpenAPI format:

```typescript
import { OpenApiExporter } from '@atakora/cdk/api/rest';

const operations = [getUserOperation, createUserOperation, updateUserOperation];

const exporter = new OpenApiExporter(operations, {
  title: 'User API',
  version: '1.0.0',
  description: 'API for managing users',
  contact: {
    name: 'API Support',
    email: 'support@example.com'
  }
});

const openApiSpec = exporter.export('3.0.3');

// Write to file
import fs from 'fs/promises';
await fs.writeFile('openapi.json', JSON.stringify(openApiSpec, null, 2));
```

### Validating OpenAPI Specs

Atakora automatically validates OpenAPI specs during import:

```typescript
try {
  const importer = new OpenApiImporter('./openapi.yaml');
  const result = await importer.import();
} catch (error) {
  if (error instanceof OpenApiValidationError) {
    console.error('Validation errors:');
    for (const validationError of error.errors) {
      console.error(`- ${validationError.path}: ${validationError.message}`);
    }
  }
}
```

## Versioning Strategies

Atakora supports multiple API versioning strategies to match your requirements.

### Path-Based Versioning

The most common approach - version in the URL path:

```typescript
import { ApiVersionManager } from '@atakora/cdk/api/rest/advanced';

const versionManager = new ApiVersionManager({
  strategy: 'path',
  defaultVersion: 'v1',
  versionFormat: 'prefixed'
});

// Define v1 operation
const getUserV1 = get('/v1/users/{userId}')
  .operationId('getUserV1')
  .responses<UserV1>({ /* ... */ })
  .build();

// Define v2 operation with breaking changes
const getUserV2 = get('/v2/users/{userId}')
  .operationId('getUserV2')
  .responses<UserV2>({ /* ... */ })
  .build();
```

### Header-Based Versioning

Version via custom header:

```typescript
const versionManager = new ApiVersionManager({
  strategy: 'header',
  headerName: 'Api-Version',
  defaultVersion: '2023-01-01',
  versionFormat: 'date'
});

const operation = get('/users/{userId}')
  .headerParams({
    schema: {
      type: 'object',
      properties: {
        'Api-Version': {
          type: 'string',
          enum: ['2023-01-01', '2023-06-01', '2024-01-01'],
          description: 'API version date'
        }
      }
    }
  })
  .build();
```

### Query Parameter Versioning

Version via query string:

```typescript
const versionManager = new ApiVersionManager({
  strategy: 'queryParameter',
  parameterName: 'api-version',
  defaultVersion: '1.0',
  versionFormat: 'semver'
});

const operation = get('/users/{userId}')
  .queryParams({
    schema: {
      type: 'object',
      properties: {
        'api-version': {
          type: 'string',
          enum: ['1.0', '1.1', '2.0'],
          default: '1.0'
        }
      }
    }
  })
  .build();
```

### Version Deprecation

Mark versions as deprecated with sunset dates:

```typescript
import { VersionDeprecationManager } from '@atakora/cdk/api/rest/advanced';

const deprecationManager = new VersionDeprecationManager({
  strategy: 'path',
  deprecatedVersions: [
    {
      version: 'v1',
      deprecatedAt: new Date('2024-01-01'),
      sunsetAt: new Date('2024-06-01'),
      message: 'v1 is deprecated. Please migrate to v2.',
      migrationGuide: 'https://docs.example.com/migration/v1-to-v2'
    }
  ]
});

// Automatically adds Deprecation, Sunset, and Link headers
const policy = deprecationManager.createDeprecationPolicy('v1');
```

## Pagination Patterns

Atakora provides three standard pagination patterns with full type safety.

### Offset-Based Pagination

Traditional skip/take pagination:

```typescript
import { offsetPagination } from '@atakora/cdk/api/rest/advanced';

interface User {
  id: string;
  name: string;
  email: string;
}

const paginationHelper = offsetPagination<User>({
  strategy: 'offset',
  defaultPageSize: 20,
  maxPageSize: 100,
  includeTotalCount: true
});

const operation = get('/users')
  .operationId('listUsers')
  .summary('List all users with pagination')
  .responses({
    200: {
      description: 'Paginated list of users',
      content: {
        'application/json': {
          schema: paginationHelper.createResponseSchema({
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' }
            }
          })
        }
      }
    }
  })
  .build();

// Adds ?offset=0&limit=20 query parameters
const paginatedOperation = paginationHelper.addToOperation(operation);

// Response format:
// {
//   "data": [...],
//   "metadata": {
//     "offset": 0,
//     "limit": 20,
//     "pageSize": 20,
//     "totalCount": 150,
//     "hasNextPage": true,
//     "hasPreviousPage": false
//   }
// }
```

### Cursor-Based Pagination

Best for large datasets and real-time data:

```typescript
import { cursorPagination } from '@atakora/cdk/api/rest/advanced';

const paginationHelper = cursorPagination<User>({
  strategy: 'cursor',
  defaultPageSize: 20,
  maxPageSize: 100,
  cursorEncoding: 'base64'
});

const operation = get('/users')
  .operationId('listUsers')
  .responses({
    200: {
      description: 'Cursor-paginated users',
      content: {
        'application/json': {
          schema: paginationHelper.createResponseSchema(UserSchema)
        }
      }
    }
  })
  .build();

const paginatedOperation = paginationHelper.addToOperation(operation);

// Response format:
// {
//   "data": [...],
//   "metadata": {
//     "pageSize": 20,
//     "hasNextPage": true,
//     "hasPreviousPage": false,
//     "nextCursor": "eyJpZCI6MTIzfQ==",
//     "previousCursor": null
//   }
// }
```

### Page-Based Pagination

Intuitive page numbers:

```typescript
import { pagePagination } from '@atakora/cdk/api/rest/advanced';

const paginationHelper = pagePagination<User>({
  strategy: 'page',
  defaultPageSize: 20,
  maxPageSize: 100,
  includeTotalCount: true
});

const paginatedOperation = paginationHelper.addToOperation(operation);

// Response format:
// {
//   "data": [...],
//   "metadata": {
//     "currentPage": 1,
//     "pageSize": 20,
//     "totalPages": 8,
//     "totalCount": 150,
//     "hasNextPage": true,
//     "hasPreviousPage": false
//   }
// }
```

### RFC 8288 Link Headers

Automatically generate Link headers for pagination:

```typescript
import { LinkHeaderBuilder } from '@atakora/cdk/api/rest/advanced';

const linkBuilder = new LinkHeaderBuilder()
  .add('https://api.example.com/users?page=1', 'first')
  .add('https://api.example.com/users?page=2', 'next')
  .add('https://api.example.com/users?page=10', 'last')
  .build();

// Returns: <https://api.example.com/users?page=1>; rel="first", <https://api.example.com/users?page=2>; rel="next", <https://api.example.com/users?page=10>; rel="last"
```

## Authentication and Authorization

Atakora supports multiple authentication schemes and authorization strategies.

### OAuth 2.0

Standard OAuth 2.0 with multiple grant types:

```typescript
const operation = get('/users')
  .security({
    oauth2: ['users:read', 'users:write']
  })
  .build();

// In your API configuration
const authConfig = {
  providers: [
    {
      name: 'oauth2',
      type: 'oauth2',
      config: {
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://auth.example.com/oauth/authorize',
            tokenUrl: 'https://auth.example.com/oauth/token',
            scopes: {
              'users:read': 'Read user data',
              'users:write': 'Modify user data'
            }
          }
        }
      }
    }
  ]
};
```

### Azure AD Integration

Seamless Azure Active Directory authentication:

```typescript
import { AuthenticationManager } from '@atakora/cdk/api/rest/advanced';

const authManager = new AuthenticationManager({
  providers: [
    {
      name: 'azureAd',
      type: 'azureAd',
      config: {
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        audience: 'api://your-api',
        instance: 'https://login.microsoftonline.com' // or .us for Gov Cloud
      }
    }
  ]
});

const authPolicies = authManager.createAuthenticationPolicies();
```

### API Key Authentication

Simple API key in header or query parameter:

```typescript
const operation = get('/users')
  .security({
    apiKey: []
  })
  .build();

const apiKeyConfig = {
  name: 'apiKey',
  type: 'apiKey',
  config: {
    in: 'header',
    name: 'X-API-Key'
  }
};
```

### Role-Based Access Control (RBAC)

Control access based on user roles:

```typescript
const authorizationConfig = {
  strategy: 'rbac',
  rules: [
    {
      type: 'rbac',
      roles: ['admin', 'editor'],
      requireAll: false // User needs at least one of these roles
    }
  ]
};

const operation = post('/users')
  .security({ oauth2: ['users:write'] })
  .policies({
    inbound: authManager.createAuthorizationPolicies(authorizationConfig)
  })
  .build();
```

## Caching Configuration

Implement HTTP caching for improved performance.

### ETag-Based Caching

Generate ETags for response validation:

```typescript
import { HttpCachingHelper } from '@atakora/cdk/api/rest/advanced';

const cachingHelper = new HttpCachingHelper({
  enabled: true,
  strategy: 'etag',
  defaultTtl: 300, // 5 minutes
  varyBy: {
    headers: ['Accept-Language'],
    queryParameters: ['includeDeleted']
  }
});

const operation = get('/users/{userId}')
  .operationId('getUser')
  .responses({
    200: {
      description: 'User found',
      headers: {
        'ETag': {
          schema: { type: 'string' },
          description: 'Entity tag for caching'
        },
        'Cache-Control': {
          schema: { type: 'string' }
        }
      }
    },
    304: {
      description: 'Not Modified'
    }
  })
  .policies({
    outbound: [cachingHelper.createETagPolicy()]
  })
  .build();
```

### Last-Modified Caching

Use Last-Modified headers:

```typescript
const cachingHelper = new HttpCachingHelper({
  enabled: true,
  strategy: 'lastModified',
  defaultTtl: 600
});

const lastModifiedPolicy = cachingHelper.createLastModifiedPolicy();
```

### Conditional Requests

Handle If-None-Match and If-Modified-Since:

```typescript
const conditionalPolicy = cachingHelper.createConditionalRequestPolicy();

const operation = get('/users/{userId}')
  .headerParams({
    schema: {
      type: 'object',
      properties: {
        'If-None-Match': {
          type: 'string',
          description: 'ETag for conditional request'
        },
        'If-Modified-Since': {
          type: 'string',
          format: 'date-time',
          description: 'Date for conditional request'
        }
      }
    }
  })
  .policies({
    inbound: [conditionalPolicy]
  })
  .build();
```

## Rate Limiting

Protect your API from abuse and ensure fair usage.

### Fixed Window Rate Limiting

Simple request counting per time window:

```typescript
import { RateLimiter } from '@atakora/cdk/api/rest/advanced';

const rateLimiter = new RateLimiter({
  enabled: true,
  strategy: 'fixedWindow',
  responseHeaders: true,
  retryAfter: true,
  limits: [
    {
      scope: 'perApiKey',
      limit: 1000,
      window: 3600 // 1 hour
    }
  ]
});

const rateLimitPolicy = rateLimiter.createPolicy({
  scope: 'perApiKey',
  limit: 1000,
  window: 3600
});

const operation = get('/users')
  .policies({
    inbound: [rateLimitPolicy]
  })
  .responses({
    200: { /* ... */ },
    429: {
      description: 'Too many requests',
      headers: {
        'X-RateLimit-Limit': { schema: { type: 'integer' } },
        'X-RateLimit-Remaining': { schema: { type: 'integer' } },
        'X-RateLimit-Reset': { schema: { type: 'integer' } },
        'Retry-After': { schema: { type: 'integer' } }
      }
    }
  })
  .build();
```

### Per-User Rate Limiting

Different limits for authenticated users:

```typescript
const userLimitPolicy = rateLimiter.createPolicy({
  scope: 'perUser',
  limit: 5000,
  window: 3600
});
```

### Global Rate Limiting

Protect your entire API:

```typescript
const globalLimitPolicy = rateLimiter.createPolicy({
  scope: 'global',
  limit: 100000,
  window: 3600
});
```

## Common Patterns

### CRUD Operations

Complete create, read, update, delete pattern:

```typescript
// List resources with pagination
const list = get('/users')
  .queryParams<{ page?: number; pageSize?: number }>({ /* ... */ })
  .responses<PaginatedResponse<User>>({ /* ... */ })
  .build();

// Get single resource
const getOne = get('/users/{userId}')
  .pathParams<{ userId: string }>({ /* ... */ })
  .responses<User>({ /* ... */ })
  .build();

// Create resource
const create = post<CreateUserRequest>('/users')
  .body<CreateUserRequest>({ /* ... */ })
  .responses<User>({
    201: { description: 'Created' }
  })
  .build();

// Update resource (full replacement)
const update = put<UpdateUserRequest>('/users/{userId}')
  .pathParams<{ userId: string }>({ /* ... */ })
  .body<UpdateUserRequest>({ /* ... */ })
  .responses<User>({
    200: { description: 'Updated' }
  })
  .build();

// Partial update
const patch = patch<Partial<User>>('/users/{userId}')
  .pathParams<{ userId: string }>({ /* ... */ })
  .body<Partial<User>>({ /* ... */ })
  .responses<User>({
    200: { description: 'Patched' }
  })
  .build();

// Delete resource
const remove = del('/users/{userId}')
  .pathParams<{ userId: string }>({ /* ... */ })
  .responses({
    204: { description: 'Deleted' }
  })
  .build();
```

### File Upload

Handle multipart/form-data:

```typescript
const uploadFile = post('/files')
  .body<{ file: File; description?: string }>({
    required: true,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          required: ['file'],
          properties: {
            file: {
              type: 'string',
              format: 'binary'
            },
            description: {
              type: 'string'
            }
          }
        }
      }
    }
  })
  .responses<{ fileId: string; url: string }>({
    201: {
      description: 'File uploaded successfully'
    }
  })
  .build();
```

### Batch Operations

Process multiple items in one request:

```typescript
interface BatchRequest {
  operations: Array<{
    method: 'POST' | 'PUT' | 'DELETE';
    path: string;
    body?: any;
  }>;
}

const batch = post<BatchRequest>('/batch')
  .body<BatchRequest>({
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            operations: {
              type: 'array',
              maxItems: 100,
              items: {
                type: 'object',
                required: ['method', 'path'],
                properties: {
                  method: {
                    type: 'string',
                    enum: ['POST', 'PUT', 'DELETE']
                  },
                  path: { type: 'string' },
                  body: { }
                }
              }
            }
          }
        }
      }
    }
  })
  .build();
```

### Search and Filtering

Advanced query capabilities:

```typescript
import { FilteringHelper, SortingHelper } from '@atakora/cdk/api/rest/advanced';

const filterHelper = new FilteringHelper({
  enabled: true,
  syntax: 'rsql',
  allowedFields: ['name', 'email', 'status', 'createdAt']
});

const sortHelper = new SortingHelper({
  enabled: true,
  allowedFields: ['name', 'createdAt', 'email'],
  defaultSort: [{ field: 'createdAt', direction: 'desc' }]
});

let searchOperation = get('/users/search')
  .operationId('searchUsers')
  .responses<PaginatedResponse<User>>({ /* ... */ })
  .build();

searchOperation = filterHelper.addFilterParams(searchOperation);
searchOperation = sortHelper.addSortParams(searchOperation);

// Request: GET /users/search?filter=status==active;createdAt>2024-01-01&sort=name:asc,createdAt:desc
```

## Best Practices

### 1. Use Meaningful Operation IDs

Operation IDs should be unique and descriptive:

```typescript
// Good
.operationId('getUserById')
.operationId('createProduct')
.operationId('updateOrderStatus')

// Bad
.operationId('get1')
.operationId('operation2')
```

### 2. Provide Comprehensive Documentation

Always include summary and description:

```typescript
const operation = get('/users/{userId}')
  .operationId('getUser')
  .summary('Get user by ID')
  .description(
    'Retrieves a single user by their unique identifier. ' +
    'Returns user profile information including name, email, and account status.'
  )
  .tags('Users', 'Public API')
  .externalDocs({
    url: 'https://docs.example.com/api/users#get-user',
    description: 'Full API documentation'
  })
  .build();
```

### 3. Use Proper HTTP Status Codes

Return appropriate status codes for different scenarios:

```typescript
.responses({
  200: { description: 'Success - resource retrieved' },
  201: { description: 'Created - new resource created' },
  204: { description: 'No Content - resource deleted' },
  400: { description: 'Bad Request - invalid input' },
  401: { description: 'Unauthorized - authentication required' },
  403: { description: 'Forbidden - insufficient permissions' },
  404: { description: 'Not Found - resource does not exist' },
  409: { description: 'Conflict - resource already exists' },
  422: { description: 'Unprocessable Entity - validation failed' },
  429: { description: 'Too Many Requests - rate limit exceeded' },
  500: { description: 'Internal Server Error' },
  503: { description: 'Service Unavailable - temporary outage' }
})
```

### 4. Implement Idempotency

Use idempotency keys for non-idempotent operations:

```typescript
const operation = post('/orders')
  .headerParams({
    schema: {
      type: 'object',
      properties: {
        'Idempotency-Key': {
          type: 'string',
          format: 'uuid',
          description: 'Unique key to prevent duplicate processing'
        }
      },
      required: ['Idempotency-Key']
    }
  })
  .build();
```

### 5. Version Your API from Day One

Even if you only have v1, plan for future versions:

```typescript
// Use path versioning
const operation = get('/v1/users/{userId}')
  .build();

// Or header versioning with default
const operation = get('/users/{userId}')
  .headerParams({
    schema: {
      properties: {
        'Api-Version': {
          type: 'string',
          default: '2024-01-01'
        }
      }
    }
  })
  .build();
```

### 6. Validate All Inputs

Use JSON Schema for comprehensive validation:

```typescript
const schema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      maxLength: 255
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 128,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$' // Require mixed case and number
    }
  }
};
```

### 7. Use RFC 7807 for Errors

Return consistent error format:

```typescript
interface ProblemDetails {
  type: string;      // URI reference identifying problem type
  title: string;     // Human-readable summary
  status: number;    // HTTP status code
  detail?: string;   // Human-readable explanation
  instance?: string; // URI reference to specific occurrence
}

const ErrorSchema = {
  type: 'object',
  required: ['type', 'title', 'status'],
  properties: {
    type: { type: 'string', format: 'uri' },
    title: { type: 'string' },
    status: { type: 'integer' },
    detail: { type: 'string' },
    instance: { type: 'string', format: 'uri' }
  }
};
```

### 8. Enable CORS for Browser Clients

Configure CORS headers:

```typescript
const operation = options('/users')
  .operationId('corsUsers')
  .responses({
    200: {
      description: 'CORS preflight response',
      headers: {
        'Access-Control-Allow-Origin': { schema: { type: 'string' } },
        'Access-Control-Allow-Methods': { schema: { type: 'string' } },
        'Access-Control-Allow-Headers': { schema: { type: 'string' } },
        'Access-Control-Max-Age': { schema: { type: 'integer' } }
      }
    }
  })
  .build();
```

## Government Cloud Considerations

When deploying to Azure Government Cloud, keep these considerations in mind:

### Authentication Endpoints

Use government cloud endpoints for Azure AD:

```typescript
const authConfig = {
  providers: [
    {
      name: 'azureAdGov',
      type: 'azureAd',
      config: {
        tenantId: 'your-gov-tenant-id',
        clientId: 'your-client-id',
        instance: 'https://login.microsoftonline.us', // Government cloud
        audience: 'api://your-api'
      }
    }
  ]
};
```

### Compliance and Data Residency

Ensure all data remains within government cloud boundaries:

```typescript
// Explicitly configure backend to government cloud resources
const operation = get('/users')
  .backend({
    type: 'azureFunction',
    functionApp: govCloudFunctionApp, // Must be in .us region
    functionName: 'GetUser'
  })
  .build();
```

### Rate Limiting for Government Workloads

Government APIs may have different rate limit requirements:

```typescript
const govRateLimiter = new RateLimiter({
  enabled: true,
  strategy: 'fixedWindow',
  limits: [
    {
      scope: 'perUser',
      limit: 10000, // Higher limits for government users
      window: 3600
    }
  ]
});
```

### Audit Logging

Enable comprehensive audit logging for compliance:

```typescript
import { ObservabilityHelper } from '@atakora/cdk/api/rest/advanced';

const observability = new ObservabilityHelper({
  logging: {
    enabled: true,
    logLevel: 'information',
    logRequests: true,
    logResponses: true,
    maskSensitiveData: true,
    sensitiveFields: ['ssn', 'password', 'creditCard']
  }
});

const loggingPolicies = observability.createLoggingPolicies();
```

---

## Next Steps

- Explore the [REST API Examples](../examples/rest-api-examples.md) for complete working code
- Review the [REST API Reference](../reference/api/rest-api-reference.md) for detailed API documentation
- Check the [Migration Guide](./rest-api-migration.md) for migrating from other platforms
- See the [Troubleshooting Guide](./rest-api-troubleshooting.md) for common issues and solutions

## Related Documentation

- [GraphQL API Guide](./graphql-user-guide.md)
- [Azure Functions Integration](./azure-functions-guide.md)
- [API Security Best Practices](./api-security-guide.md)
- [Performance Optimization](./performance-guide.md)
