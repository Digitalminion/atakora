# Tasks 4 & 5: Token Validation and Role Mapping - Usage Examples

This document demonstrates how to use the token validation and role mapping utilities implemented in Phase 2, Tasks 4 & 5.

## Token Validation Examples

### Basic Token Extraction

```typescript
import { extractBearerToken, decodeJwt } from '@atakora/component';

// Extract token from Authorization header
const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const token = extractBearerToken(authHeader);

if (token) {
  // Decode JWT payload
  const payload = decodeJwt(token);

  if (payload) {
    console.log('User ID:', payload.sub);
    console.log('Issuer:', payload.iss);
    console.log('Expiration:', new Date(payload.exp! * 1000));
  }
}
```

### Full Token Validation Flow

```typescript
import {
  extractBearerToken,
  decodeJwt,
  validateJwtSignature,
  extractUserId,
  extractEmail,
  isTokenExpired,
  isTokenNotYetValid,
} from '@atakora/component';

async function validateRequest(authHeader: string) {
  // 1. Extract token
  const token = extractBearerToken(authHeader);
  if (!token) {
    return { valid: false, error: 'Missing or invalid authorization header' };
  }

  // 2. Decode token
  const claims = decodeJwt(token);
  if (!claims) {
    return { valid: false, error: 'Malformed JWT token' };
  }

  // 3. Check expiration
  if (isTokenExpired(claims)) {
    return { valid: false, error: 'Token has expired' };
  }

  if (isTokenNotYetValid(claims)) {
    return { valid: false, error: 'Token not yet valid' };
  }

  // 4. Validate signature (stub in component package)
  const result = await validateJwtSignature(
    token,
    'https://login.microsoftonline.com/tenant-id/v2.0',
    'api://my-app'
  );

  if (!result.valid) {
    return { valid: false, error: result.error };
  }

  // 5. Extract user information
  const userId = extractUserId(claims);
  const email = extractEmail(claims);

  return {
    valid: true,
    userId,
    email,
    claims,
  };
}
```

### Custom Claim Extraction

```typescript
import { decodeJwt, extractUserId, extractEmail } from '@atakora/component';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const claims = decodeJwt(token);

if (claims) {
  // Standard extraction
  const userId = extractUserId(claims); // Tries sub, oid, userId
  const email = extractEmail(claims); // Tries email, upn, preferred_username

  // Custom claims
  const tenantId = claims.tid;
  const roles = claims.roles || [];
  const groups = claims.groups || [];

  console.log({ userId, email, tenantId, roles, groups });
}
```

## Role Mapping Examples

### Entra ID Role Mapping

```typescript
import {
  defaultEntraRoleMapper,
  mapGroupsToRoles,
  filterRoles,
  transformRoles,
} from '@atakora/component';

// Default Entra role mapping (extracts from groups claim)
const claims = {
  sub: 'user-123',
  groups: ['admin', 'editor', 'viewer'],
};

const roles = defaultEntraRoleMapper(claims);
// Returns: ['admin', 'editor', 'viewer']
```

### Map Azure AD Group IDs to Role Names

```typescript
import { mapGroupsToRoles } from '@atakora/component';

// Map Azure AD group GUIDs to application role names
const groupMapper = mapGroupsToRoles({
  '12345678-1234-1234-1234-123456789012': 'admin',
  '87654321-4321-4321-4321-210987654321': 'editor',
  'abcdef00-0000-0000-0000-000000abcdef': 'viewer',
});

const claims = {
  groups: ['12345678-1234-1234-1234-123456789012', '87654321-4321-4321-4321-210987654321'],
};

const roles = groupMapper(claims);
// Returns: ['admin', 'editor']
```

### Filter Roles by Whitelist

```typescript
import { filterRoles } from '@atakora/component';

// Only allow specific roles
const allowedRoles = ['admin', 'editor', 'viewer'];
const roleFilter = filterRoles(allowedRoles);

const claims = {
  groups: ['admin', 'editor', 'finance', 'hr', 'legal'],
};

const roles = roleFilter(claims);
// Returns: ['admin', 'editor'] (finance, hr, legal filtered out)
```

### Transform Role Names

```typescript
import { transformRoles } from '@atakora/component';

// Convert to lowercase
const lowercaseMapper = transformRoles((role) => role.toLowerCase());

const claims = {
  groups: ['ADMIN', 'Editor', 'VIEWER'],
};

const roles = lowercaseMapper(claims);
// Returns: ['admin', 'editor', 'viewer']

// Add prefix
const prefixMapper = transformRoles((role) => `app_${role}`);
const prefixedRoles = prefixMapper({ groups: ['admin', 'editor'] });
// Returns: ['app_admin', 'app_editor']
```

### Combine Multiple Role Mappers

```typescript
import { combineRoleMappers, defaultEntraRoleMapper, staticRoles } from '@atakora/component';

// Combine Entra roles with static system roles
const systemRoles = staticRoles(['authenticated']);
const combined = combineRoleMappers(defaultEntraRoleMapper, systemRoles);

const claims = {
  groups: ['admin', 'editor'],
};

const roles = combined(claims);
// Returns: ['admin', 'editor', 'authenticated']
```

### API Key Role Mapping

```typescript
import { defaultApiKeyRoleMapper } from '@atakora/component';
import type { ApiKey } from '@atakora/component';

const apiKey: ApiKey = {
  id: 'service-1',
  secret: 'secret-key-value',
  roles: ['service', 'monitoring', 'readonly'],
};

const roles = defaultApiKeyRoleMapper(apiKey);
// Returns: ['service', 'monitoring', 'readonly']
```

### Conditional Role Mapping

```typescript
import { conditionalRoles, defaultEntraRoleMapper, emptyRoles } from '@atakora/component';

// Different mapping for internal vs external users
const roleMapper = conditionalRoles(
  (claims) => claims.tenant === 'internal',
  defaultEntraRoleMapper, // Use full role mapping for internal
  emptyRoles() // No roles for external users
);

// Internal user
const internalClaims = {
  tenant: 'internal',
  groups: ['admin', 'editor'],
};
const internalRoles = roleMapper(internalClaims);
// Returns: ['admin', 'editor']

// External user
const externalClaims = {
  tenant: 'external',
  groups: ['admin', 'editor'],
};
const externalRoles = roleMapper(externalClaims);
// Returns: []
```

### Complex Role Mapping Pipeline

```typescript
import {
  mapGroupsToRoles,
  createFilteredMapper,
  createTransformedMapper,
  combineRoleMappers,
  staticRoles,
} from '@atakora/component';

// Step 1: Map Azure AD groups to role names
const groupMapper = mapGroupsToRoles({
  'admin-group-id': 'admin',
  'editor-group-id': 'editor',
  'viewer-group-id': 'viewer',
});

// Step 2: Filter to allowed roles
const filteredMapper = createFilteredMapper(groupMapper, (role) =>
  ['admin', 'editor', 'viewer'].includes(role)
);

// Step 3: Transform to uppercase
const transformedMapper = createTransformedMapper(filteredMapper, (role) => role.toUpperCase());

// Step 4: Combine with static roles
const systemRoles = staticRoles(['AUTHENTICATED']);
const finalMapper = combineRoleMappers(transformedMapper, systemRoles);

const claims = {
  groups: ['admin-group-id', 'editor-group-id', 'unknown-group'],
};

const roles = finalMapper(claims);
// Returns: ['ADMIN', 'EDITOR', 'AUTHENTICATED']
```

## Integration with Entra ID Provider

```typescript
import { defineAuth, auth } from '@atakora/component';
import { mapGroupsToRoles, filterRoles, combineRoleMappers, staticRoles } from '@atakora/component';

// Define authentication with custom role mapping
export const authentication = defineAuth({
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .mapRoles((claims) => {
      // Map Azure AD groups to application roles
      const groupMapper = mapGroupsToRoles({
        '12345678-1234-1234-1234-123456789012': 'admin',
        '87654321-4321-4321-4321-210987654321': 'editor',
        'abcdef00-0000-0000-0000-000000abcdef': 'viewer',
      });

      // Add system role for all authenticated users
      const systemMapper = staticRoles(['authenticated']);

      // Combine mappers
      const combinedMapper = combineRoleMappers(groupMapper, systemMapper);

      return combinedMapper(claims);
    }),
});
```

## Integration with API Keys Provider

```typescript
import { defineAuth, auth, days } from '@atakora/component';

export const authentication = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90))
    .keys([
      {
        id: 'service-1',
        secret: process.env.API_KEY_SERVICE_1!,
        roles: ['service', 'monitoring'],
      },
      {
        id: 'admin-cli',
        secret: process.env.API_KEY_ADMIN!,
        roles: ['admin', 'service'],
      },
    ])
    .prefix('atk_'),
});

// API key roles are automatically extracted using defaultApiKeyRoleMapper
```

## Runtime Middleware Example (Future)

This shows how token validation and role mapping will be used in runtime middleware (Phase 7):

```typescript
import {
  extractBearerToken,
  validateJwtSignature,
  extractUserId,
  extractEmail,
  isTokenExpired,
} from '@atakora/component';

async function authMiddleware(req: Request, authConfig: any) {
  // 1. Extract token
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return { status: 401, body: 'Missing authorization token' };
  }

  // 2. Validate token
  const provider = authConfig.providers[authConfig.primaryProvider];
  const result = await validateJwtSignature(
    token,
    provider.config.issuer,
    provider.config.audience
  );

  if (!result.valid) {
    return { status: 401, body: result.error };
  }

  // 3. Check expiration
  if (isTokenExpired(result.claims!)) {
    return { status: 401, body: 'Token has expired' };
  }

  // 4. Map roles
  const roles = provider.mapRoles ? provider.mapRoles(result.claims!) : [];

  // 5. Create user context
  const userContext = {
    id: extractUserId(result.claims!) || '',
    email: extractEmail(result.claims!),
    roles,
    claims: result.claims!,
    isAuthenticated: true,
  };

  return { userContext };
}
```

## Testing Examples

```typescript
import {
  extractBearerToken,
  decodeJwt,
  defaultEntraRoleMapper,
  mapGroupsToRoles,
} from '@atakora/component';
import { describe, it, expect } from 'vitest';

describe('Authentication Flow', () => {
  it('should validate and extract user from token', () => {
    const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    const token = extractBearerToken(authHeader);

    expect(token).toBeDefined();

    const claims = decodeJwt(token!);
    expect(claims).toBeDefined();
    expect(claims!.sub).toBe('user-123');
  });

  it('should map roles from claims', () => {
    const claims = {
      sub: 'user-123',
      groups: ['admin', 'editor'],
    };

    const roles = defaultEntraRoleMapper(claims);
    expect(roles).toEqual(['admin', 'editor']);
  });

  it('should map Azure AD groups to role names', () => {
    const mapper = mapGroupsToRoles({
      'group-123': 'admin',
      'group-456': 'editor',
    });

    const claims = {
      groups: ['group-123', 'group-456'],
    };

    const roles = mapper(claims);
    expect(roles).toEqual(['admin', 'editor']);
  });
});
```

## Best Practices

### 1. Always Validate Tokens

```typescript
// Good
const token = extractBearerToken(authHeader);
if (!token) return { error: 'Missing token' };

const claims = decodeJwt(token);
if (!claims) return { error: 'Invalid token' };

if (isTokenExpired(claims)) return { error: 'Token expired' };

// Bad
const token = extractBearerToken(authHeader);
const claims = decodeJwt(token!); // Assuming token exists
```

### 2. Use Type-Safe Claim Extraction

```typescript
// Good
const userId = extractUserId(claims); // Tries multiple claim fields
const email = extractEmail(claims); // Tries multiple claim fields

// Less robust
const userId = claims.sub; // Might miss oid or userId claims
```

### 3. Combine Role Mappers for Flexibility

```typescript
// Good - Composable, testable
const groupMapper = mapGroupsToRoles({
  /* mapping */
});
const systemMapper = staticRoles(['authenticated']);
const finalMapper = combineRoleMappers(groupMapper, systemMapper);

// Less flexible
const roles = [...groupMapper(claims), 'authenticated'];
```

### 4. Handle Errors Gracefully

```typescript
// Good - Defensive
const claims = decodeJwt(token);
if (!claims) {
  console.error('Failed to decode JWT');
  return { valid: false };
}

// Bad - Assumes success
const claims = decodeJwt(token)!;
const userId = claims.sub; // Could crash if decodeJwt returns null
```
