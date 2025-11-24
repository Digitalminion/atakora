# Authentication Reference

Authentication is required for all Atakora backends. It provides security for your APIs through Microsoft Entra ID (Azure AD) and API keys.

## Overview

Atakora supports two authentication methods:

- **Entra ID (Primary)** - OAuth 2.0 / OpenID Connect for user authentication
- **API Keys** - Service-to-service authentication

Both methods are configured in `src/auth/resource.ts` and included in the backend definition.

## Configuration

### Basic Setup

```typescript
// src/auth/resource.ts
import { defineAuth, auth } from '@atakora/component/auth';

export const authentication = defineAuth({
  Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!).clientId(process.env.AZURE_CLIENT_ID!),
});

// src/index.ts
export const backend = defineBackend({
  schema,
  authentication, // Required
  settings: { name: 'my-app' },
});
```

### What Gets Provisioned

When you include authentication:

**Azure Resources:**

- ✅ Managed Identity for Function App
- ✅ Key Vault for secrets
- ✅ App Registration (if not exists)
- ✅ Service Principal (if not exists)

**Function App Configuration:**

- ✅ Authentication middleware on all endpoints
- ✅ Token validation
- ✅ Role extraction from claims
- ✅ User context in all handlers

## Entra ID (Azure AD)

### Full Configuration

```typescript
export const authentication = defineAuth({
  Primary: auth
    .entra()
    // Required settings
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)

    // Token validation
    .validateTokens(
      (token) =>
        token
          .audience(process.env.AZURE_CLIENT_ID!)
          .issuer(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`)
          .validateLifetime()
          .clockSkew(300) // 5 minutes tolerance
    )

    // Role mapping
    .mapRoles((roles) =>
      roles
        .fromClaim('roles') // Where to find roles in token
        .map('Admin', ['admin', 'owner']) // Map token roles to app roles
        .map('Analyst', ['analyst', 'viewer', 'user'])
        .map('User', ['user'])
    )

    // Authorization rules
    .authorization((authz) =>
      authz
        .requireByDefault() // All endpoints require auth by default
        .publicEndpoints(['/api/health', '/api/version', '/api/docs'])
        .adminEndpoints([
          '/api/users',
          '/api/admin/*',
          'DELETE /api/*', // All DELETE operations require admin
        ])
    )

    // Multi-factor authentication
    .mfa(
      (mfa) =>
        mfa
          .required(process.env.NODE_ENV === 'production')
          .providers(['authenticator', 'sms', 'email'])
          .gracePeriod(7) // Days before enforcing MFA
    )

    // Session management
    .session(
      (session) =>
        session
          .duration('8h') // Session expires after 8 hours
          .sliding(true) // Extends on activity
          .renewBefore('30m') // Auto-renew 30 min before expiry
          .absoluteTimeout('24h') // Max session duration
    )

    // Additional tenants (multi-tenant apps)
    .allowTenants([process.env.AZURE_TENANT_ID!, process.env.PARTNER_TENANT_ID!]),
});
```

### Token Validation

Tokens are validated on every request:

```typescript
.validateTokens(token =>
  token
    .audience(process.env.AZURE_CLIENT_ID!)  // Must match clientId
    .issuer('https://login.microsoftonline.com/{tenantId}/v2.0')  // Must match tenant
    .validateLifetime()  // Check exp and nbf claims
    .clockSkew(300)  // Allow 5 min clock skew
    .validateSignature()  // Verify JWT signature (always enabled)
)
```

**What Gets Checked:**

1. **Signature** - Token signed by Microsoft's keys
2. **Issuer** - Token issued by correct tenant
3. **Audience** - Token intended for this application
4. **Expiration** - Token not expired (`exp` claim)
5. **Not Before** - Token is valid now (`nbf` claim)
6. **Clock Skew** - Allow time drift between servers

**Invalid Token Response:**

```bash
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer error="invalid_token", error_description="Token signature verification failed"

{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### Role Mapping

Map Entra ID roles to application roles:

```typescript
.mapRoles(roles =>
  roles
    .fromClaim('roles')  // Default: 'roles' claim
    .map('Admin', ['admin', 'owner', 'superuser'])
    .map('Analyst', ['analyst', 'viewer'])
    .map('User', ['user', 'member'])
    .map('Guest', ['guest'])
)
```

**How It Works:**

1. Extract roles from token claim:

   ```json
   {
     "sub": "user123",
     "roles": ["admin", "analyst"]
   }
   ```

2. Map to application roles:

   ```typescript
   user.roles = ['Admin', 'Analyst', 'User'];
   ```

3. Available in handlers:

   ```typescript
   .withHandler(async (context, input) => {
     const isAdmin = context.user.roles.includes('Admin');
     const isAnalyst = context.user.roles.includes('Analyst');
   })
   ```

4. Used in authorization:
   ```typescript
   User: c.model({...})
     .authorization(allow => [
       allow.groups(['Admin']).all(),
       allow.groups(['Analyst']).read(),
     ])
   ```

### Authorization Rules

Control access at the endpoint level:

```typescript
.authorization(authz =>
  authz
    // Default: all endpoints require authentication
    .requireByDefault()

    // Public endpoints (no auth required)
    .publicEndpoints([
      '/api/health',
      '/api/version',
      '/api/docs',
      'GET /api/public/*',
    ])

    // Admin-only endpoints
    .adminEndpoints([
      '/api/users',
      '/api/admin/*',
      'DELETE /api/*',  // All DELETE operations
      'PUT /api/users/:id/role',  // Specific endpoint
    ])

    // Analyst-only endpoints
    .roleEndpoints('Analyst', [
      'GET /api/analytics/*',
      'POST /api/reports',
    ])
)
```

**Matching Rules:**

- Exact match: `/api/health`
- Wildcard: `/api/public/*` matches `/api/public/anything`
- Method-specific: `DELETE /api/*` matches DELETE only
- Path params: `/api/users/:id` matches `/api/users/123`

**Response When Forbidden:**

```bash
HTTP/1.1 403 Forbidden

{
  "error": "Forbidden",
  "message": "Insufficient permissions to access this resource"
}
```

### Multi-Factor Authentication

Require MFA for enhanced security:

```typescript
.mfa(mfa =>
  mfa
    .required(process.env.NODE_ENV === 'production')  // Prod only
    .providers(['authenticator', 'sms', 'email'])
    .gracePeriod(7)  // 7 days to set up MFA
    .reminder(3)  // Remind every 3 days
    .bypass(['admin'])  // Admins can bypass for emergency access
)
```

**How It Works:**

1. User logs in without MFA
2. Token includes `amr: ['pwd']` (authentication method: password)
3. If MFA required and not set up:

   ```bash
   HTTP/1.1 403 Forbidden
   X-MFA-Required: true
   X-MFA-Grace-Period-Expires: 2025-01-22T00:00:00Z

   {
     "error": "MFA Required",
     "message": "Please set up multi-factor authentication",
     "setupUrl": "https://mysignins.microsoft.com/security"
   }
   ```

4. After grace period, access denied until MFA configured

### Session Management

Control session duration and renewal:

```typescript
.session(session =>
  session
    .duration('8h')  // Session expires after 8 hours of inactivity
    .sliding(true)  // Each request extends the session
    .renewBefore('30m')  // Auto-renew 30 min before expiry
    .absoluteTimeout('24h')  // Max 24 hours, even with activity
    .secure(true)  // HTTPS only
    .sameSite('strict')  // CSRF protection
)
```

**Session Flow:**

1. **Login**: User gets token, session starts

   ```json
   {
     "accessToken": "eyJ...",
     "expiresIn": 28800, // 8 hours
     "expiresAt": "2025-01-15T18:30:00Z"
   }
   ```

2. **Activity**: Each request within 30 min of expiry gets new token

   ```
   Request at 18:00 → Token expires at 18:30
   Request at 18:05 → Token renewed, expires at 20:05
   ```

3. **Absolute Timeout**: Even with activity, max 24 hours

   ```
   Login at 10:00
   Constant activity
   Session ends at 10:00 next day (24 hours)
   ```

4. **Inactivity**: No requests for 8 hours, session expires
   ```
   Last request at 10:00
   No activity
   Session expires at 18:00
   ```

### Multi-Tenant Applications

Support multiple Entra ID tenants:

```typescript
.tenant(process.env.AZURE_TENANT_ID!)  // Primary tenant
.allowTenants([
  process.env.AZURE_TENANT_ID!,
  process.env.PARTNER_TENANT_A_ID!,
  process.env.PARTNER_TENANT_B_ID!,
])
```

**How It Works:**

1. User from Partner A logs in
2. Token includes `tid: "partner-a-tenant-id"`
3. Atakora validates `tid` against allowed tenants
4. User context includes tenant:

   ```typescript
   context.user.tenantId; // 'partner-a-tenant-id'
   ```

5. Tenant isolation in queries:
   ```typescript
   // Automatic tenant filtering
   const projects = await context.db.projects.list({
     tenantId: context.user.tenantId, // Auto-added
   });
   ```

## API Keys

Service-to-service authentication using API keys.

### Configuration

```typescript
export const authentication = defineAuth({
  Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!).clientId(process.env.AZURE_CLIENT_ID!),

  ApiKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(90) // Rotate every 90 days
    .requireHttps() // Reject HTTP requests
    .keys([
      {
        name: 'partner-a',
        key: process.env.PARTNER_A_API_KEY!,
        roles: ['Service'],
        endpoints: ['POST /api/events/*', 'GET /api/datasets'],
      },
      {
        name: 'internal-service',
        key: process.env.INTERNAL_API_KEY!,
        roles: ['Service', 'Admin'],
        endpoints: ['*'], // All endpoints
      },
    ]),
});
```

### What Gets Provisioned

**Azure Resources:**

- ✅ Key Vault secrets for each API key
- ✅ Rotation policy in Key Vault
- ✅ Managed Identity access to Key Vault

**Function App Configuration:**

- ✅ API key validation middleware
- ✅ Key rotation detection
- ✅ Usage logging and monitoring

### Usage

**Request with API Key:**

```bash
curl -X POST https://api.example.com/api/events/data-uploaded \
  -H "X-API-Key: pk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Response:**

```bash
HTTP/1.1 202 Accepted

{
  "eventId": "evt_abc123",
  "status": "queued"
}
```

### Key Rotation

Automatic key rotation for security:

```typescript
.rotateEvery(90)  // Days
```

**Rotation Process:**

1. **Day 80**: Warning logs

   ```
   API key 'partner-a' expires in 10 days
   ```

2. **Day 85**: Email notification

   ```
   Subject: API Key Rotation Required
   Your API key 'partner-a' expires in 5 days
   New key: pk_live_new123...
   ```

3. **Day 90**: Old key stops working

   ```bash
   HTTP/1.1 401 Unauthorized

   {
     "error": "Invalid API Key",
     "message": "API key has been rotated. Use the new key."
   }
   ```

4. **Grace Period** (optional):
   ```typescript
   .rotateEvery(90)
   .gracePeriod(7)  // Both keys work for 7 days
   ```

### Rate Limiting

API keys can have custom rate limits:

```typescript
.keys([
  {
    name: 'partner-a',
    key: process.env.PARTNER_A_API_KEY!,
    rateLimit: {
      requests: 1000,
      window: '1h',
      burst: 1500,
    },
  },
])
```

**Rate Limit Response:**

```bash
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642262400
Retry-After: 3600

{
  "error": "Rate Limit Exceeded",
  "message": "You have exceeded your rate limit. Please retry after 3600 seconds."
}
```

## User Context

All authenticated requests provide a user context:

```typescript
.withHandler(async (context, input) => {
  // User ID (from sub claim)
  const userId = context.user.id;  // 'user123'

  // Roles (from mapped roles)
  const roles = context.user.roles;  // ['Admin', 'User']
  const isAdmin = context.user.roles.includes('Admin');

  // Email (from email claim)
  const email = context.user.email;  // 'user@example.com'

  // Name (from name claim)
  const name = context.user.name;  // 'John Doe'

  // Tenant (for multi-tenant apps)
  const tenantId = context.user.tenantId;  // 'tenant-abc'

  // Authentication method
  const authMethod = context.user.authMethod;  // 'entra' or 'apiKey'

  // API Key (if using API key auth)
  const apiKeyName = context.user.apiKey?.name;  // 'partner-a'

  // Full token claims
  const claims = context.user.claims;  // All JWT claims
})
```

## Error Responses

Standard authentication error responses:

### 401 Unauthorized

Missing or invalid token:

```bash
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer error="invalid_token"

{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "code": "AUTH_001"
}
```

### 403 Forbidden

Valid token, insufficient permissions:

```bash
HTTP/1.1 403 Forbidden

{
  "error": "Forbidden",
  "message": "Insufficient permissions to access this resource",
  "code": "AUTH_002",
  "requiredRoles": ["Admin"]
}
```

### 403 MFA Required

MFA not set up:

```bash
HTTP/1.1 403 Forbidden
X-MFA-Required: true
X-MFA-Grace-Period-Expires: 2025-01-22T00:00:00Z

{
  "error": "MFA Required",
  "message": "Please set up multi-factor authentication",
  "code": "AUTH_003",
  "setupUrl": "https://mysignins.microsoft.com/security",
  "gracePeriodDays": 5
}
```

## Best Practices

### 1. Use Environment Variables

```typescript
// ✅ Good: Secrets in environment variables
.tenant(process.env.AZURE_TENANT_ID!)
.clientId(process.env.AZURE_CLIENT_ID!)

// ❌ Avoid: Hardcoded secrets
.tenant('abc-123-def')  // Don't commit secrets!
```

### 2. Require MFA in Production

```typescript
// ✅ Good: MFA only in production
.mfa(mfa =>
  mfa.required(process.env.NODE_ENV === 'production')
)

// ❌ Avoid: MFA in development (slows development)
.mfa(mfa => mfa.required(true))
```

### 3. Use Public Endpoints Sparingly

```typescript
// ✅ Good: Only truly public endpoints
.publicEndpoints([
  '/api/health',  // Health check
  '/api/version',  // Version info
])

// ❌ Avoid: Too many public endpoints
.publicEndpoints([
  '/api/*',  // Everything public? No!
])
```

### 4. Rotate API Keys Regularly

```typescript
// ✅ Good: Regular rotation
.rotateEvery(90)  // Every 3 months

// ❌ Avoid: Never rotating
.rotateEvery(0)  // Keys never expire
```

### 5. Use Specific Role Mappings

```typescript
// ✅ Good: Specific mappings
.map('Admin', ['admin', 'owner'])
.map('User', ['user', 'member'])

// ❌ Avoid: Catch-all mappings
.map('Admin', ['*'])  // Everyone is admin?
```

### 6. Validate Tokens Strictly

```typescript
// ✅ Good: Full validation
.validateTokens(token =>
  token
    .audience(process.env.AZURE_CLIENT_ID!)
    .issuer('...')
    .validateLifetime()
    .clockSkew(300)
)

// ❌ Avoid: Loose validation
.validateTokens(token =>
  token.clockSkew(3600)  // 1 hour tolerance is too loose!
)
```

## Monitoring

Authentication events are automatically logged:

**Application Insights Metrics:**

- `auth.requests.total` - Total auth requests
- `auth.requests.success` - Successful authentications
- `auth.requests.failed` - Failed authentications
- `auth.mfa.required` - MFA required but not set up
- `auth.tokens.expired` - Expired tokens
- `auth.apikeys.rotated` - API key rotations

**Logs:**

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "info",
  "message": "Authentication successful",
  "userId": "user123",
  "authMethod": "entra",
  "roles": ["Admin", "User"],
  "endpoint": "POST /api/users"
}
```

```json
{
  "timestamp": "2025-01-15T10:30:05Z",
  "level": "warn",
  "message": "Authentication failed: invalid token",
  "error": "Token signature verification failed",
  "endpoint": "GET /api/projects",
  "ip": "203.0.113.100"
}
```

## Related Documentation

- [Authorization Patterns](./authorization.md) - Access control in schema models
- [Entra ID Setup](./entra-id-setup.md) - Setting up Azure AD
- [API Key Management](./api-key-management.md) - Managing service keys
- [Security Best Practices](./security.md) - Comprehensive security guide
