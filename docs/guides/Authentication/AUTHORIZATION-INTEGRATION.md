# Authorization Integration Guide

This guide explains how the authentication system integrates with authorization at runtime to control access to resources.

## Overview

The Atakora authentication and authorization systems work together to provide comprehensive security:

- **Authentication** answers: "Who are you?"
  - Validates tokens (JWT, API keys, custom)
  - Maps roles/groups from token claims
  - Creates user context with identity and permissions

- **Authorization** answers: "What can you do?"
  - Evaluates rules (owner, groups, authenticated, public)
  - Enforces permissions per operation
  - Returns allow/deny decisions

## Architecture

```
┌─────────────────┐
│  HTTP Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Auth Middleware        │
│  - Extract token        │
│  - Select provider      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Token Validation       │◄────── Authentication
│  - Verify signature     │
│  - Check expiration     │
│  - Extract claims       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Role Mapping           │
│  - Map claims → roles   │
│  - Apply transformations│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  User Context           │◄────── Integration Point
│  - id, email, name      │
│  - roles, groups        │
│  - isAuthenticated      │
│  - Helper methods       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Authorization Rules    │◄────── Authorization
│  - Evaluate rules       │
│  - Check ownership      │
│  - Verify groups        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Allow / Deny           │
└─────────────────────────┘
```

## Complete Implementation Example

```typescript
import { defineAuth, auth } from '@atakora/component/auth';
import { defineSchema, c, a } from '@atakora/component/schema';
import { defineBackend } from '@atakora/component';

// ============================================================================
// Step 1: Define Authentication
// ============================================================================

export const authentication = defineAuth({
  // Primary provider: Entra ID (Azure AD)
  Primary: auth
    .entra()
    .tenant(process.env.TENANT_ID!)
    .clientId(process.env.CLIENT_ID!)
    .mapRoles((claims) => {
      // Map Entra groups to application roles
      const groups = claims.groups || [];
      const roles = groups.map((g: any) => g.name || g);

      // Add default role
      roles.push('user');

      return roles;
    }),

  // Secondary provider: API Keys
  ApiKeys: auth.apiKeys().keys([
    {
      id: 'service-key',
      secret: process.env.API_KEY_SECRET!,
      roles: ['service', 'admin'],
    },
  ]),
});

// ============================================================================
// Step 2: Define Authorization in Schema
// ============================================================================

export const schema = defineSchema({
  models: {
    // User model
    User: c
      .model({
        id: a.id(),
        email: a.string().required().email(),
        name: a.string(),
      })
      .authorization((allow) => [
        // Users can read their own profile
        allow.owner('id').read(),

        // Admins can do anything
        allow.groups(['admin']).all(),

        // Anyone authenticated can list users
        allow.authenticated(['list']),
      ]),

    // Post model
    Post: c
      .model({
        id: a.id(),
        title: a.string().required(),
        content: a.string(),
        userId: a.string().required(), // Owner field
        published: a.boolean().default(false),
      })
      .authorization((allow) => [
        // Post owner can do anything with their posts
        allow.owner('userId').all(),

        // Editors can update any post
        allow.groups(['editor', 'admin']).update(),

        // Anyone authenticated can read
        allow.authenticated(['read', 'list']),

        // Public can read published posts
        allow.public(['read', 'list']),
      ]),
  },
});

// ============================================================================
// Step 3: Combine in Backend
// ============================================================================

export const backend = defineBackend({
  schema,
  authentication, // Integration point
});
```

## Runtime Flow

### 1. Request Processing

```typescript
// Incoming HTTP request
const request = {
  headers: { Authorization: 'Bearer eyJ...' },
  method: 'PUT',
  path: '/api/posts/123',
  body: { title: 'Updated Title' },
};
```

### 2. Authentication Phase

```typescript
// Extract and validate token
const token = extractBearerToken(request.headers.authorization);
const validationResult = await authProvider.validate(token);

if (!validationResult.valid) {
  return { status: 401, body: { error: 'Unauthorized' } };
}

// Map roles from token claims
const roles = authProvider.mapRoles(validationResult.claims);
// roles = ['user', 'editor']
```

### 3. User Context Creation

```typescript
// Create user context (integration point)
const userContext = createUserContext(validationResult, roles, 'entra');

// User context contains:
// {
//   id: 'user-123',
//   email: 'john@example.com',
//   name: 'John Doe',
//   roles: ['user', 'editor'],
//   groups: ['user', 'editor'],
//   isAuthenticated: true,
//   hasRole: (role) => ...,
//   hasAnyRole: (roles) => ...,
//   hasAllRoles: (roles) => ...,
//   isInGroup: (group) => ...
// }
```

### 4. Authorization Evaluation

```typescript
// Fetch the record being accessed
const record = await database.get('posts', '123');
// record = { id: '123', userId: 'user-123', title: 'My Post' }

// Create runtime context
const context: AuthorizationRuntimeContext = {
  user: userContext,
  record: record,
  operation: 'update',
};

// Evaluate authorization rules
const rules = schema.models.Post.authorization;
const allowed = evaluateAuthorizationRules(rules, context);

if (!allowed) {
  return { status: 403, body: { error: 'Forbidden' } };
}

// Authorization passed, process the request
const updatedRecord = await database.update('posts', '123', request.body);
return { status: 200, body: updatedRecord };
```

## Authorization Rules

### Rule Types and Context Mapping

| Authorization Rule | User Context Field | Check Logic |
|-------------------|-------------------|-------------|
| `allow.owner('userId')` | `user.id` | `record.userId === user.id` |
| `allow.groups(['admin'])` | `user.roles` or `user.groups` | `user.roles.includes('admin')` |
| `allow.authenticated()` | `user.isAuthenticated` | `user.isAuthenticated === true` |
| `allow.public()` | (none) | Always `true` |

### Owner Rule Example

```typescript
// Schema definition
Post: c.model({
  id: a.id(),
  title: a.string(),
  userId: a.string(), // Owner field
}).authorization((allow) => [
  allow.owner('userId').all()
]);

// Runtime check
function checkOwnerRule(user: UserContext, record: any): boolean {
  // User must be authenticated
  if (!user.isAuthenticated) {
    return false;
  }

  // Compare user ID with owner field
  return record.userId === user.id;
}

// Example
const user = { id: 'user-123', isAuthenticated: true };
const record = { id: 'post-1', userId: 'user-123', title: 'My Post' };
checkOwnership(user, record, 'userId'); // ✅ true
```

### Groups Rule Example

```typescript
// Schema definition
Post: c.model({ ... })
  .authorization(allow => [
    allow.groups(['admin', 'editor']).update()
  ]);

// Runtime check
function checkGroupsRule(user: UserContext, requiredGroups: string[]): boolean {
  if (!user.isAuthenticated) {
    return false;
  }

  // User must have at least one of the required groups
  return requiredGroups.some(group => user.roles.includes(group));
}

// Example
const user = {
  id: 'user-123',
  roles: ['user', 'editor'],
  isAuthenticated: true
};

checkGroups(user, ['admin', 'editor']); // ✅ true (has 'editor')
checkGroups(user, ['admin']); // ❌ false
```

### Operation-Specific Rules

Rules can be scoped to specific operations:

```typescript
.authorization(allow => [
  // Owner can do everything
  allow.owner('userId').all(),

  // Editors can only update
  allow.groups(['editor']).update(),

  // Anyone authenticated can read
  allow.authenticated(['read', 'list']),

  // Public can only list
  allow.public(['list'])
])
```

## Helper Methods

The `ExtendedUserContext` provides convenient helper methods:

```typescript
const user = createUserContext(validationResult, ['user', 'editor'], 'entra');

// Check single role
if (user.hasRole('editor')) {
  // Allow edit
}

// Check any role (OR logic)
if (user.hasAnyRole(['admin', 'editor'])) {
  // Allow if user has admin OR editor
}

// Check all roles (AND logic)
if (user.hasAllRoles(['user', 'verified'])) {
  // Allow only if user has BOTH user AND verified
}

// Check group (alias for hasRole)
if (user.isInGroup('developers')) {
  // Allow for developers group
}
```

## Error Handling

### 401 Unauthorized

Returned when authentication fails:

```typescript
if (!validationResult.valid) {
  return {
    status: 401,
    body: {
      error: 'Unauthorized',
      message: validationResult.error
    }
  };
}
```

Common causes:
- Invalid token signature
- Expired token
- Missing token (when required)
- Token validation error

### 403 Forbidden

Returned when authorization fails:

```typescript
if (!evaluateAuthorizationRules(rules, context)) {
  return {
    status: 403,
    body: {
      error: 'Forbidden',
      message: 'You do not have permission to perform this action'
    }
  };
}
```

Common causes:
- User is authenticated but lacks permissions
- Authorization rules deny access
- User not in required group
- User doesn't own the resource

## Type Safety

TypeScript ensures type safety across the integration:

```typescript
// ✅ Type-safe context creation
const context: ExtendedUserContext = createUserContext(
  validationResult,  // TokenValidationResult
  roles,             // string[]
  'entra'           // string
);

// ✅ Type-safe rule evaluation
const allowed: boolean = evaluateAuthorizationRules(
  rules,  // AuthorizationRule[]
  {
    user: context,         // UserContext
    record: record,        // any (from database)
    operation: 'update',   // Operation type
  }
);

// ❌ Compile error - invalid operation
const invalid = {
  user: context,
  operation: 'invalid',  // Error: Type '"invalid"' is not assignable
};
```

## Performance Considerations

1. **Token validation** - Cached per request, not per operation
2. **Role mapping** - Performed once during context creation
3. **Rule evaluation** - Fast in-memory checks (no database calls)
4. **User context** - Immutable, can be safely reused within request

## Best Practices

1. **Define clear ownership fields** - Use consistent naming (e.g., `userId`, `ownerId`)
2. **Use groups for role-based access** - Map external groups to internal roles
3. **Default to authenticated** - Require authentication unless explicitly public
4. **Combine rules appropriately** - Owner + groups provide flexible access control
5. **Test authorization rules** - Verify both positive and negative cases
6. **Log authorization failures** - Help debug permission issues
7. **Cache user context** - Reuse within request lifecycle

## Testing Authorization

```typescript
import { describe, it, expect } from 'vitest';
import { createUserContext, evaluateAuthorizationRules } from '@atakora/component/auth';

describe('Authorization Integration', () => {
  it('should allow owner to update their post', () => {
    const user = createUserContext(
      { valid: true, claims: { sub: 'user-123' } },
      ['user'],
      'entra'
    );

    const record = { id: 'post-1', userId: 'user-123' };
    const rules = [{ type: 'owner', field: 'userId', operations: ['update'] }];

    const allowed = evaluateAuthorizationRules(rules, {
      user,
      record,
      operation: 'update'
    });

    expect(allowed).toBe(true);
  });

  it('should deny non-owner from updating post', () => {
    const user = createUserContext(
      { valid: true, claims: { sub: 'user-456' } },
      ['user'],
      'entra'
    );

    const record = { id: 'post-1', userId: 'user-123' };
    const rules = [{ type: 'owner', field: 'userId', operations: ['update'] }];

    const allowed = evaluateAuthorizationRules(rules, {
      user,
      record,
      operation: 'update'
    });

    expect(allowed).toBe(false);
  });
});
```

## Future Enhancements

Potential future additions:
- Field-level authorization (allow update of specific fields)
- Custom rule evaluators
- Authorization caching
- Audit logging integration
- Fine-grained permissions (e.g., read own + read published)