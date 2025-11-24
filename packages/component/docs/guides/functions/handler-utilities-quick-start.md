# Handler Utilities Quick Start Guide

**Complete utility library for building production-ready Azure Function handlers.**

---

## Installation

```typescript
import {
  // Validation
  validationRules,
  validateObject,
  ValidationError,

  // Response formatting
  successResponse,
  errorResponse,

  // Middleware
  withErrorHandler,

  // CORS
  getCorsHeaders,

  // Authorization
  requireAuth,
  requireRole,
  hasRole,

  // Utilities
  withRetry,
  paginate,
} from '@atakora/component/functions';
```

---

## 1. Request Validation

### Basic Validation

```typescript
import { validationRules, validateObject, ValidationError } from '@atakora/component/functions';

export const handler = async (context, input) => {
  // Define validation schema
  const schema = {
    email: [
      validationRules.required(),
      validationRules.email(),
    ],
    password: [
      validationRules.required(),
      validationRules.minLength(8),
      validationRules.pattern(/[A-Z]/, 'Must contain uppercase letter'),
    ],
    age: [
      validationRules.range(18, 120),
    ],
  };

  // Validate input
  const errors = validateObject(input, schema);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', undefined, errors);
  }

  // Continue with handler logic...
};
```

### Built-in Validation Rules

| Rule | Usage | Description |
|------|-------|-------------|
| `required()` | `validationRules.required()` | Not null/undefined/empty |
| `email()` | `validationRules.email()` | Valid email format |
| `minLength(n)` | `validationRules.minLength(8)` | Minimum string length |
| `maxLength(n)` | `validationRules.maxLength(100)` | Maximum string length |
| `range(min, max)` | `validationRules.range(1, 100)` | Number in range |
| `pattern(regex)` | `validationRules.pattern(/^[A-Z]+$/)` | Matches regex |

### Custom Validation Rules

```typescript
const customRule = (value: string) => {
  return value.startsWith('PRE-') || 'Must start with PRE-';
};

const schema = {
  code: [validationRules.required(), customRule],
};
```

---

## 2. Response Formatting

### Success Response

```typescript
import { successResponse } from '@atakora/component/functions';

export const handler = async (context, input) => {
  const user = await context.database.users.get(input.userId);

  return successResponse(user, {
    requestId: context.executionId,
    cached: false,
  });
};

// Response format:
// {
//   "data": { "id": "123", "name": "John" },
//   "error": null,
//   "metadata": {
//     "timestamp": "2025-11-22T12:00:00Z",
//     "requestId": "exec-123",
//     "cached": false
//   }
// }
```

### Error Response

```typescript
import { errorResponse } from '@atakora/component/functions';

export const handler = async (context, input) => {
  const user = await context.database.users.get(input.userId);

  if (!user) {
    return errorResponse(
      'User not found',
      'USER_NOT_FOUND',
      { userId: input.userId }
    );
  }

  return successResponse(user);
};

// Error response format:
// {
//   "data": null,
//   "error": {
//     "message": "User not found",
//     "code": "USER_NOT_FOUND",
//     "details": { "userId": "123" }
//   },
//   "metadata": {
//     "timestamp": "2025-11-22T12:00:00Z"
//   }
// }
```

---

## 3. Error Handling Middleware

### Automatic Error Handling

```typescript
import { withErrorHandler, successResponse } from '@atakora/component/functions';

export const handler = withErrorHandler(async (context, input) => {
  // Any errors thrown here are automatically caught and formatted
  const user = await context.database.users.get(input.userId);

  if (!user) {
    throw new NotFoundError('users', input.userId);
  }

  return successResponse(user);
});

// Errors are automatically:
// - Logged with context
// - Formatted as error responses
// - Given appropriate status codes (400, 401, 403, 404, 500)
```

### Error Status Codes

| Error Type | HTTP Status |
|------------|-------------|
| `ValidationError` | 400 |
| `UnauthorizedError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `DatabaseError` | 500 |
| `StorageError` | 500 |
| Other | 500 |

---

## 4. CORS Configuration

### Basic CORS

```typescript
import { getCorsHeaders } from '@atakora/component/functions';

export const handler = async (context, input) => {
  // Get CORS headers
  const corsHeaders = getCorsHeaders({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'],
  }, context.bindingData?.headers?.origin);

  const result = await processRequest(input);

  return {
    ...result,
    headers: corsHeaders,
  };
};
```

### Production CORS

```typescript
import { getCorsHeaders } from '@atakora/component/functions';

const ALLOWED_ORIGINS = [
  'https://app.example.com',
  'https://mobile.example.com',
];

export const handler = async (context, input) => {
  const requestOrigin = context.bindingData?.headers?.origin;

  const corsHeaders = getCorsHeaders({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 3600, // 1 hour
  }, requestOrigin);

  // Handler logic...

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(result),
  };
};
```

---

## 5. Authentication & Authorization

### Require Authentication

```typescript
import { requireAuth } from '@atakora/component/functions';

export const handler = async (context, input) => {
  // Throws 401 if user is not authenticated
  requireAuth(context);

  // User is authenticated, continue...
  const userId = context.user.id;
};
```

### Require Specific Role

```typescript
import { requireRole } from '@atakora/component/functions';

export const handler = async (context, input) => {
  // Throws 403 if user doesn't have admin role
  requireRole(context, ['admin']);

  // User is admin, continue...
};
```

### Check Role Without Throwing

```typescript
import { hasRole } from '@atakora/component/functions';

export const handler = async (context, input) => {
  if (hasRole(context, ['premium-user'])) {
    // Provide premium features
    return await getPremiumData();
  } else {
    // Provide standard features
    return await getStandardData();
  }
};
```

### Multiple Roles (OR logic)

```typescript
import { requireRole } from '@atakora/component/functions';

export const handler = async (context, input) => {
  // User must have AT LEAST ONE of these roles
  requireRole(context, ['admin', 'moderator', 'super-user']);

  // User has one of the required roles, continue...
};
```

---

## 6. Retry Logic

### Basic Retry

```typescript
import { withRetry } from '@atakora/component/functions';

export const handler = async (context, input) => {
  const result = await withRetry(
    () => externalApi.call(data),
    {
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 5000,
    }
  );

  return successResponse(result);
};
```

### Custom Retry Logic

```typescript
import { withRetry } from '@atakora/component/functions';

export const handler = async (context, input) => {
  const result = await withRetry(
    () => externalApi.call(data),
    {
      maxRetries: 5,
      initialDelayMs: 200,
      maxDelayMs: 10000,
      backoffMultiplier: 2, // Exponential backoff
      isRetryable: (error) => {
        // Only retry on specific errors
        return error.statusCode >= 500 || error.code === 'TIMEOUT';
      },
    }
  );

  return successResponse(result);
};
```

---

## 7. Pagination

### Basic Pagination

```typescript
import { paginate } from '@atakora/component/functions';

export const handler = async (context, input) => {
  // Get all users
  const allUsers = await context.database.users.list();

  // Paginate results
  const page = paginate(allUsers, {
    page: input.page || 1,
    pageSize: input.pageSize || 20,
  });

  return successResponse(page);
};

// Response:
// {
//   "items": [...],
//   "total": 150,
//   "page": 1,
//   "pageSize": 20,
//   "totalPages": 8,
//   "hasMore": true
// }
```

---

## 8. Complete Example

### Production-Ready Handler

```typescript
import {
  withErrorHandler,
  requireAuth,
  validateObject,
  validationRules,
  ValidationError,
  successResponse,
  getCorsHeaders,
  paginate,
} from '@atakora/component/functions';

export const handler = withErrorHandler(async (context, input) => {
  // 1. CORS
  const corsHeaders = getCorsHeaders({
    origin: ['https://app.example.com'],
    methods: ['GET', 'POST'],
    credentials: true,
  }, context.bindingData?.headers?.origin);

  // 2. Authentication
  requireAuth(context);

  // 3. Validation
  const schema = {
    search: [validationRules.required(), validationRules.minLength(3)],
    page: [validationRules.range(1, 1000)],
  };

  const errors = validateObject(input, schema);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Invalid input', undefined, errors);
  }

  // 4. Business Logic
  const users = await context.database.users.list({
    name: { $regex: input.search },
  });

  // 5. Pagination
  const page = paginate(users, {
    page: input.page || 1,
    pageSize: 20,
  });

  // 6. Response
  return {
    ...successResponse(page),
    headers: corsHeaders,
  };
});
```

---

## 9. Multi-Tenant with Partition Keys

### Custom Partition Key Usage

```typescript
import { createModelOperations, type ModelOperationsOptions } from '@atakora/component/functions';

export const handler = async (context, input) => {
  // Configure operations with custom partition key
  const options: ModelOperationsOptions = {
    partitionKey: 'tenantId',
  };

  const operations = createModelOperations('documents', context, options);

  // All operations automatically use tenantId as partition key
  const doc = await operations.create({
    tenantId: context.user.claims.tenantId,
    title: input.title,
    content: input.content,
  });

  return successResponse(doc);
};
```

### Nested Partition Key

```typescript
const options: ModelOperationsOptions = {
  partitionKey: 'organization.id', // Supports dot notation
};

const operations = createModelOperations('users', context, options);

await operations.create({
  organization: {
    id: 'org-123',
    name: 'Acme Corp',
  },
  name: 'John Doe',
  email: 'john@acme.com',
});
```

---

## 10. Common Patterns

### Pattern: Validate -> Authorize -> Execute

```typescript
export const handler = withErrorHandler(async (context, input) => {
  // 1. Validate input
  const schema = { /* ... */ };
  const errors = validateObject(input, schema);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Invalid input', undefined, errors);
  }

  // 2. Authorize
  requireRole(context, ['admin']);

  // 3. Execute
  const result = await performOperation(context, input);

  return successResponse(result);
});
```

### Pattern: Try with Retry -> Fallback

```typescript
export const handler = async (context, input) => {
  try {
    // Try primary API with retry
    return await withRetry(
      () => primaryApi.call(input),
      { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 1000 }
    );
  } catch (error) {
    context.log.warn('Primary API failed, using fallback', error);

    // Fallback to secondary API
    return await secondaryApi.call(input);
  }
};
```

### Pattern: Conditional Authorization

```typescript
export const handler = async (context, input) => {
  requireAuth(context);

  const resource = await context.database.resources.get(input.resourceId);

  // Check if user owns resource OR has admin role
  const isOwner = resource.ownerId === context.user.id;
  const isAdmin = hasRole(context, ['admin']);

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('Cannot access this resource');
  }

  // Continue with operation...
};
```

---

## Best Practices

1. **Always use withErrorHandler** for automatic error formatting and logging
2. **Validate early** - catch bad input before expensive operations
3. **Use requireAuth/requireRole** instead of manual checks
4. **Return standardized responses** with successResponse/errorResponse
5. **Configure CORS explicitly** for production origins
6. **Use partition keys** for multi-tenant data isolation
7. **Paginate large result sets** to avoid memory issues
8. **Add retry logic** for external API calls
9. **Log errors with context** for debugging
10. **Test edge cases** especially validation and error paths

---

## TypeScript Types

All utilities are fully typed:

```typescript
import type {
  ApiResponse,
  CorsOptions,
  RetryOptions,
  PaginationOptions,
  PaginatedResponse,
  ModelOperationsOptions,
} from '@atakora/component/functions';

// Strongly typed responses
const response: ApiResponse<User> = successResponse(user);

// Strongly typed options
const corsOptions: CorsOptions = { /* ... */ };
const retryOptions: RetryOptions = { /* ... */ };
const paginationOptions: PaginationOptions = { /* ... */ };
```

---

## Testing

### Example Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { withErrorHandler, ValidationError } from '@atakora/component/functions';

describe('My Handler', () => {
  it('should handle validation errors', async () => {
    const handler = withErrorHandler(async (context, input) => {
      throw new ValidationError('Invalid input', 'email');
    });

    const mockContext = createMockContext();
    const result = await handler(mockContext, {});

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Invalid input');
  });
});
```

---

## More Information

- **Full API Documentation:** See TSDoc comments in source files
- **Examples:** Check `/packages/backend/src/function/` for real implementations
- **Tests:** See `*.spec.ts` files for comprehensive test examples

---

**Version:** 1.0.0
**Last Updated:** 2025-11-22
**Maintained by:** Devon (Developer)
