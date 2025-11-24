# Token Validation Guide

> Comprehensive guide to token validation: JWT, API keys, multi-provider setup, and security best practices

## Table of Contents

- [How Token Validation Works](#how-token-validation-works)
- [Supported Token Types](#supported-token-types)
- [Configuring Validation](#configuring-validation)
- [Multi-Provider Setup](#multi-provider-setup)
- [Token Caching](#token-caching)
- [Revocation Checking](#revocation-checking)
- [Custom Validation Rules](#custom-validation-rules)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Performance Considerations](#performance-considerations)

## How Token Validation Works

Token validation ensures that incoming requests are authentic and authorized.

### Validation Flow

```
┌─────────────────────────────────────────┐
│         Incoming Request                │
│  Authorization: Bearer <token>          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    1. Extract Token from Header         │
│    extractBearerToken(authHeader)       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    2. Decode Token (No Validation)      │
│    decodeJwt(token)                     │
│    - Get issuer, audience, claims       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    3. Validate Signature                │
│    validateJwtSignature(...)            │
│    - Verify cryptographic signature     │
│    - Check issuer/audience              │
│    - Validate expiration                │
│    - Check not-before time              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    4. Extract User Context              │
│    - userId (sub, oid, userId)          │
│    - email (email, upn, preferred_...)  │
│    - roles (groups, roles)              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    5. Pass to Function Handler          │
│    context.user = { id, email, roles }  │
└─────────────────────────────────────────┘
```

### Token Structure

JWT tokens have three parts separated by periods:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9    ← Header
.
eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoi    ← Payload (Claims)
dXNlckBleGFtcGxlLmNvbSIsImV4cCI6MTcy
.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_    ← Signature
adQssw5c
```

## Supported Token Types

### JWT (JSON Web Tokens)

Industry-standard token format for authentication.

**Configuration:**

```typescript
import { defineAuth, auth } from '@atakora/component/auth';

export const authentication = defineAuth({
  JWT: auth
    .jwt()
    .issuer('https://your-auth-server.com')
    .audience('api://your-application')
    .publicKey(process.env.JWT_PUBLIC_KEY!)
    .primary(),
});
```

**Token Example:**

```json
{
  "iss": "https://your-auth-server.com",
  "sub": "user-12345",
  "aud": "api://your-application",
  "exp": 1735689600,
  "iat": 1735686000,
  "email": "user@example.com",
  "roles": ["user", "editor"]
}
```

### Azure Entra ID (Azure AD)

Microsoft's enterprise identity platform.

**Configuration:**

```typescript
import { defineAuth, auth } from '@atakora/component/auth';

export const authentication = defineAuth({
  EntraID: auth
    .entra()
    .tenantId(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .audience(process.env.AZURE_AUDIENCE!)
    .primary(),
});
```

**Token Claims:**

```json
{
  "iss": "https://login.microsoftonline.com/tenant-id/v2.0",
  "sub": "user-guid",
  "aud": "api://your-application",
  "oid": "object-id-guid",
  "upn": "user@tenant.onmicrosoft.com",
  "groups": ["group-guid-1", "group-guid-2"],
  "roles": ["Admin", "User"]
}
```

### API Keys

Simple token-based authentication for service accounts.

**Configuration:**

```typescript
import { defineAuth, auth, days } from '@atakora/component/auth';

export const authentication = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90))
    .prefix('atk_')
    .keys([
      {
        id: 'service-account-1',
        secret: process.env.API_KEY_1!,
        roles: ['service', 'admin'],
      },
    ]),
});
```

**Usage:**

```bash
curl -H "Authorization: Bearer atk_your-secret-key" \
  https://api.example.com/function
```

## Configuring Validation

### JWT Validation Options

Full control over validation behavior:

```typescript
import { defineAuth, auth } from '@atakora/component/auth';

export const authentication = defineAuth({
  JWT: auth
    .jwt()
    .issuer('https://auth.example.com')
    .audience('api://my-app')
    .publicKey(process.env.JWT_PUBLIC_KEY!)
    .validationOptions({
      requireExpiration: true,        // Require 'exp' claim (default: true)
      clockSkewSeconds: 300,          // 5 minute tolerance (default: 300)
      maxTokenAgeSeconds: 86400,      // Max age 24 hours (default: 86400)
    })
    .primary(),
});
```

### Validation Options Explained

**requireExpiration:**
- When `true`, tokens MUST have an `exp` claim
- Tokens without expiration are rejected
- Recommended: `true` for production

```typescript
// Token with expiration
{
  "exp": 1735689600,  // Valid until Jan 1, 2025
  "iat": 1735686000   // Issued 1 hour ago
}
```

**clockSkewSeconds:**
- Tolerance for time differences between servers
- Prevents false rejections due to clock drift
- Default: 300 seconds (5 minutes)

```typescript
// Example: Current time is 12:00:00
// Token expires at 11:59:00
// With 5 min skew, token is still valid until 12:04:00
```

**maxTokenAgeSeconds:**
- Maximum lifetime from `iat` (issued at) claim
- Defense against excessively long-lived tokens
- Default: 86400 seconds (24 hours)

```typescript
// Example: Token issued 25 hours ago
// Even if not expired, exceeds max age → rejected
```

### Environment-Specific Configuration

```typescript
import { defineAuth, auth } from '@atakora/component/auth';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const authentication = defineAuth({
  JWT: auth
    .jwt()
    .issuer(process.env.JWT_ISSUER!)
    .audience(process.env.JWT_AUDIENCE!)
    .publicKey(process.env.JWT_PUBLIC_KEY!)
    .validationOptions({
      // Strict in production
      requireExpiration: isProduction,
      clockSkewSeconds: isProduction ? 60 : 300,
      maxTokenAgeSeconds: isProduction ? 3600 : 86400,
    })
    .primary(),
});
```

## Multi-Provider Setup

Support multiple authentication methods simultaneously.

### JWT + API Keys

```typescript
import { defineAuth, auth, days } from '@atakora/component/auth';

export const authentication = defineAuth({
  // Primary: Entra ID for users
  Primary: auth
    .entra()
    .tenantId(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .audience(process.env.AZURE_AUDIENCE!),

  // Secondary: API Keys for services
  ServiceAccounts: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90))
    .prefix('svc_')
    .keys([
      {
        id: 'data-pipeline',
        secret: process.env.PIPELINE_KEY!,
        roles: ['service', 'data-writer'],
      },
      {
        id: 'monitoring',
        secret: process.env.MONITORING_KEY!,
        roles: ['service', 'readonly'],
      },
    ]),
});
```

### Multiple JWT Issuers

```typescript
export const authentication = defineAuth({
  // Internal users
  InternalAuth: auth
    .jwt()
    .issuer('https://internal-auth.company.com')
    .audience('api://internal-app')
    .publicKey(process.env.INTERNAL_JWT_PUBLIC_KEY!)
    .primary(),

  // External partners
  PartnerAuth: auth
    .jwt()
    .issuer('https://partner-auth.example.com')
    .audience('api://partner-integration')
    .publicKey(process.env.PARTNER_JWT_PUBLIC_KEY!),
});
```

### Provider Priority

When multiple providers are configured, they are tried in order:

1. **Primary provider** (marked with `.primary()`)
2. **Secondary providers** (in definition order)

```typescript
// Request flow:
// 1. Try Primary provider
// 2. If fails, try ServiceAccounts provider
// 3. If all fail, return 401 Unauthorized
```

## Token Caching

Token validation can be expensive (cryptographic operations). Implement caching for performance.

### Basic Caching

```typescript
const tokenCache = new Map<string, { valid: boolean; user: any; expiresAt: number }>();

export async function validateWithCache(token: string): Promise<ValidationResult> {
  // Check cache
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return { valid: cached.valid, ...cached.user };
  }

  // Validate token
  const result = await validateJwtSignature(token, issuer, audience, publicKey);

  // Cache result (cache for 5 minutes or until token expiration)
  const cacheUntil = result.claims?.exp
    ? Math.min(result.claims.exp * 1000, Date.now() + 5 * 60 * 1000)
    : Date.now() + 5 * 60 * 1000;

  tokenCache.set(token, {
    valid: result.valid,
    user: result.valid ? { userId: result.userId, email: result.email } : null,
    expiresAt: cacheUntil,
  });

  return result;
}
```

### Redis-Based Caching

```typescript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

export async function validateWithRedis(token: string): Promise<ValidationResult> {
  // Check Redis cache
  const cached = await redis.get(`token:${token}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Validate token
  const result = await validateJwtSignature(token, issuer, audience, publicKey);

  // Cache in Redis (5 minute TTL)
  await redis.setEx(`token:${token}`, 300, JSON.stringify(result));

  return result;
}
```

### Cache Invalidation

```typescript
// Invalidate on logout
export async function logout(token: string): Promise<void> {
  // Remove from cache
  tokenCache.delete(token);
  await redis.del(`token:${token}`);

  // Optional: Add to revocation list
  await redis.sAdd('revoked-tokens', token);
}
```

## Revocation Checking

Check if tokens have been revoked or invalidated.

### Revocation List

```typescript
const revokedTokens = new Set<string>();

export async function validateWithRevocationCheck(
  token: string
): Promise<ValidationResult> {
  // Check if token is revoked
  if (revokedTokens.has(token)) {
    return {
      valid: false,
      error: 'Token has been revoked',
    };
  }

  // Validate token
  return validateJwtSignature(token, issuer, audience, publicKey);
}

// Revoke a token
export function revokeToken(token: string): void {
  revokedTokens.add(token);
}
```

### Database-Based Revocation

```typescript
export async function validateWithDatabaseCheck(
  context: FunctionContext,
  token: string
): Promise<ValidationResult> {
  // Decode token to get JTI (JWT ID)
  const decoded = decodeJwt(token);
  if (!decoded?.jti) {
    return { valid: false, error: 'Token missing JTI claim' };
  }

  // Check revocation table
  const revoked = await context.database.revokedTokens.list({
    jti: decoded.jti,
  });

  if (revoked.length > 0) {
    return { valid: false, error: 'Token has been revoked' };
  }

  // Validate token
  return validateJwtSignature(token, issuer, audience, publicKey);
}
```

### Revocation by User

```typescript
// Revoke all tokens for a user
export async function revokeUserTokens(
  context: FunctionContext,
  userId: string
): Promise<void> {
  await context.database.revokedTokens.create({
    userId,
    revokedAt: new Date().toISOString(),
    reason: 'User logout',
  });
}

// Check if user's tokens are revoked
export async function isUserRevoked(
  context: FunctionContext,
  userId: string
): Promise<boolean> {
  const revocations = await context.database.revokedTokens.list({
    userId,
  });

  return revocations.length > 0;
}
```

## Custom Validation Rules

Extend validation with custom business logic.

### IP Allowlist

```typescript
const ALLOWED_IPS = new Set([
  '192.168.1.1',
  '10.0.0.0/8',
]);

export async function validateWithIPCheck(
  token: string,
  clientIP: string
): Promise<ValidationResult> {
  // Validate token first
  const result = await validateJwtSignature(token, issuer, audience, publicKey);

  if (!result.valid) {
    return result;
  }

  // Check IP allowlist
  if (!ALLOWED_IPS.has(clientIP)) {
    return {
      valid: false,
      error: 'Access denied from this IP address',
    };
  }

  return result;
}
```

### Time-Based Access

```typescript
export async function validateWithTimeRestriction(
  token: string
): Promise<ValidationResult> {
  const result = await validateJwtSignature(token, issuer, audience, publicKey);

  if (!result.valid) {
    return result;
  }

  // Check if current time is within business hours (9 AM - 5 PM)
  const now = new Date();
  const hour = now.getHours();

  if (hour < 9 || hour >= 17) {
    return {
      valid: false,
      error: 'Access only allowed during business hours (9 AM - 5 PM)',
    };
  }

  return result;
}
```

### Custom Claims Validation

```typescript
export async function validateCustomClaims(token: string): Promise<ValidationResult> {
  const result = await validateJwtSignature(token, issuer, audience, publicKey);

  if (!result.valid) {
    return result;
  }

  // Require specific claims
  const claims = result.claims;

  if (!claims?.department) {
    return {
      valid: false,
      error: 'Token missing required department claim',
    };
  }

  if (!claims?.clearance_level || claims.clearance_level < 2) {
    return {
      valid: false,
      error: 'Insufficient clearance level',
    };
  }

  return result;
}
```

## Security Best Practices

### 1. Always Use HTTPS

```typescript
// ✅ Good - enforce HTTPS
if (request.protocol !== 'https' && process.env.NODE_ENV === 'production') {
  throw new Error('HTTPS required');
}
```

### 2. Validate Issuer and Audience

```typescript
// ✅ Good - strict validation
export const authentication = defineAuth({
  JWT: auth
    .jwt()
    .issuer('https://auth.company.com') // Exact match required
    .audience('api://my-application')   // Exact match required
    .publicKey(process.env.JWT_PUBLIC_KEY!),
});

// ❌ Bad - accepting any issuer/audience
```

### 3. Use Short Token Lifetimes

```typescript
// ✅ Good - short-lived tokens
export const authentication = defineAuth({
  JWT: auth
    .jwt()
    .issuer('https://auth.company.com')
    .audience('api://my-application')
    .publicKey(process.env.JWT_PUBLIC_KEY!)
    .validationOptions({
      maxTokenAgeSeconds: 3600, // 1 hour maximum
    }),
});
```

### 4. Rotate Keys Regularly

```typescript
// ✅ Good - automatic key rotation
export const authentication = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90)) // Rotate every 90 days
    .keys([...]),
});
```

### 5. Never Log Tokens

```typescript
// ✅ Good - log safely
context.log.info('Token validated', {
  userId: result.userId,
  // Don't log token!
});

// ❌ Bad - leaks sensitive data
context.log.info('Token validated', {
  token: token, // NEVER DO THIS
});
```

### 6. Implement Rate Limiting

```typescript
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimiter.get(userId);

  if (!limit || limit.resetAt < now) {
    rateLimiter.set(userId, {
      count: 1,
      resetAt: now + 60 * 1000, // Reset after 1 minute
    });
    return true;
  }

  if (limit.count >= 100) {
    return false; // Rate limit exceeded
  }

  limit.count++;
  return true;
}
```

### 7. Use Token Revocation

```typescript
// ✅ Good - support revocation
export async function logout(context: FunctionContext, token: string): Promise<void> {
  const decoded = decodeJwt(token);

  if (decoded?.jti) {
    await context.database.revokedTokens.create({
      jti: decoded.jti,
      revokedAt: new Date().toISOString(),
    });
  }
}
```

## Troubleshooting

### Token Expired

**Error:**
```
TokenValidationError: Token has expired
```

**Causes:**
- Token's `exp` claim is in the past
- Clock skew exceeds tolerance

**Solutions:**
1. Request a new token from auth provider
2. Increase `clockSkewSeconds` if clocks are out of sync:

```typescript
.validationOptions({
  clockSkewSeconds: 600, // 10 minute tolerance
})
```

### Invalid Signature

**Error:**
```
TokenValidationError: Invalid token signature
```

**Causes:**
- Wrong public key
- Token was modified
- Token from different issuer

**Solutions:**
1. Verify public key matches issuer:

```typescript
// Download public key from issuer
const jwks = await fetch('https://auth.example.com/.well-known/jwks.json');
const keys = await jwks.json();
```

2. Ensure token is from expected issuer
3. Check for token tampering

### Issuer Mismatch

**Error:**
```
TokenValidationError: Token issuer does not match expected value
```

**Cause:** Token's `iss` claim doesn't match configured issuer

**Solution:**

```typescript
// Check token issuer
const decoded = decodeJwt(token);
console.log('Token issuer:', decoded.iss);

// Update configuration
export const authentication = defineAuth({
  JWT: auth
    .jwt()
    .issuer(decoded.iss!) // Use actual issuer
    .audience('...')
    .publicKey('...'),
});
```

### Audience Mismatch

**Error:**
```
TokenValidationError: Token audience does not match expected value
```

**Cause:** Token's `aud` claim doesn't match configured audience

**Solution:**

```typescript
// Check token audience
const decoded = decodeJwt(token);
console.log('Token audience:', decoded.aud);

// Update configuration to match
export const authentication = defineAuth({
  JWT: auth
    .jwt()
    .issuer('...')
    .audience(decoded.aud!) // Use actual audience
    .publicKey('...'),
});
```

### Missing Authorization Header

**Error:**
```
AuthenticationError: Missing Authorization header
```

**Cause:** Request didn't include `Authorization` header

**Solution:**

```bash
# ✅ Include Authorization header
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/function

# ❌ Missing header
curl https://api.example.com/function
```

## Performance Considerations

### 1. Cache Validation Results

Reduce cryptographic operations:

```typescript
// Cache validated tokens for 5 minutes
const cache = new Map<string, { result: ValidationResult; expiresAt: number }>();

export async function validateWithCache(token: string): Promise<ValidationResult> {
  const cached = cache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result; // ~1000x faster than validation
  }

  const result = await validateJwtSignature(token, issuer, audience, publicKey);

  cache.set(token, {
    result,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return result;
}
```

### 2. Use Singleton JWKS Client

Share JWKS client across invocations:

```typescript
import { createRemoteJWKSet } from 'jose';

// Create once, reuse across invocations
const JWKS = createRemoteJWKSet(
  new URL('https://auth.example.com/.well-known/jwks.json')
);

export async function validateJWT(token: string): Promise<ValidationResult> {
  // JWKS client caches keys automatically
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: 'https://auth.example.com',
    audience: 'api://my-app',
  });

  return { valid: true, claims: payload };
}
```

### 3. Parallelize Multi-Provider Validation

Try multiple providers concurrently:

```typescript
export async function validateMultiProvider(token: string): Promise<ValidationResult> {
  // Try all providers in parallel
  const results = await Promise.allSettled([
    validateProvider1(token),
    validateProvider2(token),
    validateProvider3(token),
  ]);

  // Return first successful result
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.valid) {
      return result.value;
    }
  }

  return { valid: false, error: 'No provider validated token' };
}
```

### 4. Optimize Clock Skew

Balance security and performance:

```typescript
// Production: Strict validation (1 min skew)
.validationOptions({
  clockSkewSeconds: 60,
})

// Development: Lenient validation (5 min skew)
.validationOptions({
  clockSkewSeconds: 300,
})
```

### Benchmarks

Typical validation times:

- **JWT validation (no cache):** 5-10ms
- **JWT validation (cached):** 0.01ms (1000x faster)
- **API key validation:** 0.1ms
- **Multi-provider (parallel):** ~10ms (vs 30ms sequential)

---

**Next Steps:**
- Learn about [Service Registry](./service-registry.md)
- Explore [Function Handlers](./function-handlers.md)
- See [Authorization Patterns](./authorization-patterns.md) for access control
