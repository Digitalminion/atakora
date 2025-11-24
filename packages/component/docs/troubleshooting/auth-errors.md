# Troubleshooting Authentication Errors

> Common authentication error messages and how to fix them

## Overview

This guide covers common authentication and authorization errors, their causes, and solutions. Authentication verifies who you are, while authorization determines what you can do.

## Error Categories

- [Token Validation Errors](#token-validation-errors)
- [Provider Configuration Errors](#provider-configuration-errors)
- [API Key Errors](#api-key-errors)
- [Session Management Errors](#session-management-errors)
- [MFA Errors](#mfa-errors)
- [Rate Limiting Errors](#rate-limiting-errors)

---

## Token Validation Errors

### "Invalid token signature"

**Error Message:**

```
Error: Invalid token signature
```

**Cause:**
The JWT signature verification failed. The token may have been tampered with, or the signing key doesn't match.

**Common Causes:**

1. Token was modified after being signed
2. Wrong signing key/secret being used for validation
3. Token was signed with different algorithm than configured

**Solution:**

For JWT provider, ensure the algorithm and keys match:

```typescript
// Bad - algorithm mismatch
Primary: auth.jwt().issuer('https://auth.example.com').algorithm('HS256'); // Token signed with RS256, but expecting HS256
```

```typescript
// Good - correct algorithm
Primary: auth.jwt().issuer('https://auth.example.com').algorithm('RS256'); // Matches token signing algorithm
```

For Entra ID, ensure client ID and tenant ID are correct:

```typescript
Primary: auth
  .entra()
  .tenant(process.env.AZURE_TENANT_ID!) // Must match token issuer
  .clientId(process.env.AZURE_CLIENT_ID!); // Must match token audience
```

---

### "Token has expired"

**Error Message:**

```
Error: Token has expired
Error: JWT expired at 2025-01-15T10:30:00Z
```

**Cause:**
The token's `exp` (expiration) claim is in the past.

**Solution:**

Request a new token from your auth provider:

```bash
# For Entra ID
az account get-access-token --resource api://your-app-id

# For custom JWT
# Re-authenticate with your auth service to get fresh token
```

**Prevention:**

Implement token refresh logic in your client:

```typescript
async function getValidToken() {
  const token = getCurrentToken();

  // Check if token expires in next 5 minutes
  const decoded = jwt.decode(token);
  const expiresIn = decoded.exp - Date.now() / 1000;

  if (expiresIn < 300) {
    // Refresh token
    return await refreshToken();
  }

  return token;
}
```

---

### "Token issuer mismatch"

**Error Message:**

```
Error: Token issuer "https://wrong-issuer.com" does not match expected issuer "https://auth.example.com"
```

**Cause:**
The token's `iss` (issuer) claim doesn't match your configured issuer.

**Bad Configuration:**

```typescript
Primary: auth.jwt().issuer('https://auth.example.com'); // Configured issuer
// But token has iss: "https://different-issuer.com"
```

**Solution:**

Match the issuer in your config to the token's issuer:

```typescript
// Check token's iss claim first
const decoded = jwt.decode(token);
console.log('Token issuer:', decoded.iss);

// Then configure to match
Primary: auth.jwt().issuer('https://login.microsoftonline.com/{tenant-id}/v2.0'); // Match exactly
```

**For Entra ID:**

```typescript
Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!); // Issuer is derived from tenant
```

---

### "Token audience mismatch"

**Error Message:**

```
Error: Token audience "https://wrong-api.com" does not match expected audience "https://your-api.com"
```

**Cause:**
The token's `aud` (audience) claim doesn't match your configured audience.

**Bad Configuration:**

```typescript
Primary: auth.jwt().audience('https://your-api.com'); // Configured audience
// But token has aud: "https://different-api.com"
```

**Solution:**

Match the audience in your config to the token's audience:

```typescript
// Check token's aud claim first
const decoded = jwt.decode(token);
console.log('Token audience:', decoded.aud);

// Then configure to match
Primary: auth.jwt().issuer('https://auth.example.com').audience('api://your-app-id'); // Match exactly
```

**For Entra ID:**

```typescript
Primary: auth
  .entra()
  .tenant(process.env.AZURE_TENANT_ID!)
  .clientId(process.env.AZURE_CLIENT_ID!)
  .audience('api://your-app-id'); // Must match App Registration
```

---

### "No authorization header provided"

**Error Message:**

```
Error: No authorization header provided
Error: Missing Bearer token
```

**Cause:**
The request doesn't include an `Authorization` header.

**Bad Request:**

```bash
# Missing Authorization header
curl https://your-api.com/api/users
```

**Solution:**

Include the Authorization header:

```bash
# For JWT/Entra ID
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://your-api.com/api/users
```

```typescript
// In JavaScript/TypeScript
const response = await fetch('https://your-api.com/api/users', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

---

### "Invalid authorization header format"

**Error Message:**

```
Error: Invalid authorization header format
Error: Authorization header must be "Bearer <token>"
```

**Cause:**
The Authorization header is malformed.

**Bad Format:**

```bash
# Missing "Bearer" prefix
curl -H "Authorization: abc123token" https://your-api.com/api/users

# Typo in "Bearer"
curl -H "Authorization: Barer abc123token" https://your-api.com/api/users
```

**Solution:**

Use correct format:

```bash
curl -H "Authorization: Bearer abc123token" https://your-api.com/api/users
#                      ^^^^^^ - Must be exactly "Bearer" with capital B
```

---

## Provider Configuration Errors

### "Authentication provider not configured"

**Error Message:**

```
Error: No authentication provider configured for backend
```

**Cause:**
You didn't add authentication to your backend definition.

**Bad Configuration:**

```typescript
export const backend = defineBackend({
  name: 'my-app',
  schema,
  // Missing: authentication
});
```

**Solution:**

Add authentication configuration:

```typescript
import { myAuth } from './auth';

export const backend = defineBackend({
  name: 'my-app',
  schema,
  authentication: myAuth, // Add this
});
```

---

### "Multiple primary authentication providers defined"

**Error Message:**

```
Error: Cannot define multiple primary authentication providers
```

**Cause:**
You defined more than one provider without distinct names.

**Bad Configuration:**

```typescript
export const myAuth = defineAuth({
  Primary: auth.jwt().issuer('https://auth1.com'),
  Primary: auth.entra().tenant('tenant-id'), // Duplicate name!
});
```

**Solution:**

Use unique provider names:

```typescript
export const myAuth = defineAuth({
  Primary: auth.jwt().issuer('https://auth1.com'),
  EntraId: auth.entra().tenant('tenant-id'), // Unique name
});
```

Or choose one primary provider:

```typescript
export const myAuth = defineAuth({
  Primary: auth.entra().tenant('tenant-id'),
  // Add other providers as API keys, etc.
});
```

---

### "Azure tenant ID is required for Entra ID provider"

**Error Message:**

```
Error: Tenant ID is required for Entra ID authentication provider
```

**Cause:**
You didn't provide a tenant ID to the Entra ID provider.

**Bad Configuration:**

```typescript
Primary: auth.entra().clientId(process.env.AZURE_CLIENT_ID!);
// Missing: .tenant()
```

**Solution:**

Provide your Azure tenant ID:

```typescript
Primary: auth
  .entra()
  .tenant(process.env.AZURE_TENANT_ID!) // Required
  .clientId(process.env.AZURE_CLIENT_ID!); // Required
```

**Finding your tenant ID:**

1. Go to Azure Portal > Azure Active Directory
2. Look for "Tenant ID" or "Directory ID" on the Overview page
3. Add to your `.env` file:

```bash
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
```

---

## API Key Errors

### "API key not found"

**Error Message:**

```
Error: Invalid API key
Error: API key not found
```

**Cause:**
The provided API key doesn't match any configured keys.

**Bad Request:**

```bash
# Wrong API key value
curl -H "X-API-Key: wrong-key-value" https://your-api.com/api/data
```

**Solution:**

Use the correct API key:

```bash
# Correct API key
curl -H "X-API-Key: your-correct-api-key" https://your-api.com/api/data
```

**Verify your configuration:**

```typescript
ApiKeys: auth.apiKeys().keys([
  {
    id: 'service-1',
    secret: process.env.API_KEY_1!, // Make sure this matches your request
    roles: ['service'],
  },
]);
```

---

### "API key has expired"

**Error Message:**

```
Error: API key has expired
Error: API key expired at 2025-01-15T00:00:00Z
```

**Cause:**
The API key has passed its `expiresAt` date.

**Configuration:**

```typescript
ApiKeys: auth.apiKeys().keys([
  {
    id: 'temp-key',
    secret: process.env.TEMP_KEY!,
    expiresAt: '2025-01-15T00:00:00Z', // This date has passed
    roles: ['viewer'],
  },
]);
```

**Solution:**

1. Remove or update the expired key
2. Generate a new key
3. Update your configuration:

```typescript
ApiKeys: auth.apiKeys().keys([
  {
    id: 'temp-key',
    secret: process.env.NEW_TEMP_KEY!,
    expiresAt: '2025-12-31T23:59:59Z', // New expiration
    roles: ['viewer'],
  },
]);
```

---

### "API key rotation required"

**Error Message:**

```
Warning: API key "service-key" should be rotated (last rotated 95 days ago)
```

**Cause:**
The API key is older than the configured rotation period.

**Configuration:**

```typescript
ApiKeys: auth.apiKeys().rotateEvery(days(90)); // Keys older than 90 days trigger warning
```

**Solution:**

1. Generate new API key
2. Update configuration with new key
3. Update clients to use new key
4. Remove old key after transition period

```typescript
import { days } from '@atakora/component';

ApiKeys: auth
  .apiKeys()
  .rotateEvery(days(90))
  .keys([
    // New key
    {
      id: 'service-1-v2',
      secret: process.env.NEW_API_KEY!,
      roles: ['service'],
      metadata: {
        rotatedAt: new Date().toISOString(),
      },
    },
    // Keep old key for transition (30 days)
    {
      id: 'service-1-v1',
      secret: process.env.OLD_API_KEY!,
      roles: ['service'],
      expiresAt: '2025-02-15T00:00:00Z', // Grace period
    },
  ]);
```

---

### "Empty API keys array"

**Error Message:**

```
Error: API keys provider must have at least one key
```

**Cause:**
You enabled API keys but didn't provide any keys.

**Bad Configuration:**

```typescript
ApiKeys: auth.apiKeys().enable().keys([]); // Empty array!
```

**Solution:**

Provide at least one API key:

```typescript
ApiKeys: auth
  .apiKeys()
  .enable()
  .keys([
    {
      id: 'service-1',
      secret: process.env.API_KEY_1!,
      roles: ['service'],
    },
  ]);
```

---

## Session Management Errors

### "Session has expired"

**Error Message:**

```
Error: Session has expired
Error: Session expired at 2025-01-15T18:00:00Z
```

**Cause:**
The user's session has exceeded the configured duration.

**Configuration:**

```typescript
import { hours } from '@atakora/component';

Primary: auth
  .entra()
  .tenant(process.env.AZURE_TENANT_ID!)
  .clientId(process.env.AZURE_CLIENT_ID!)
  .session({
    enabled: true,
    duration: hours(8), // Sessions last 8 hours
  });
```

**Solution:**

User must re-authenticate:

```typescript
// Client-side code
if (error.message.includes('Session has expired')) {
  // Redirect to login
  window.location.href = '/login';
}
```

**Prevention:**

Implement session refresh:

```typescript
.session({
  enabled: true,
  duration: hours(8),
  renewalThreshold: hours(1),  // Auto-renew if less than 1 hour remaining
})
```

---

### "Invalid session token"

**Error Message:**

```
Error: Invalid session token
Error: Session token signature verification failed
```

**Cause:**
The session token is malformed or tampered with.

**Common Causes:**

1. Session token was modified
2. Session secret changed
3. Token from different environment

**Solution:**

Clear the session and re-authenticate:

```typescript
// Client-side
localStorage.removeItem('session_token');
sessionStorage.clear();

// Redirect to login
window.location.href = '/login';
```

---

## MFA Errors

### "MFA verification required"

**Error Message:**

```
Error: Multi-factor authentication required
Error: MFA code required
```

**Cause:**
The user must complete MFA, but hasn't provided a code.

**Configuration:**

```typescript
import { days } from '@atakora/component';

Primary: auth.entra().session({
  enabled: true,
  mfa: {
    required: true,
    methods: ['totp', 'sms'],
    gracePeriod: days(7),
  },
});
```

**Solution:**

Prompt user for MFA code:

```typescript
// Client-side
if (error.code === 'MFA_REQUIRED') {
  // Show MFA input form
  const code = await promptForMFACode();

  // Retry with MFA code
  await authenticateWithMFA(token, code);
}
```

---

### "Invalid MFA code"

**Error Message:**

```
Error: Invalid MFA code
Error: MFA verification failed
```

**Cause:**
The MFA code provided is incorrect or expired.

**Common Causes:**

1. User entered wrong code
2. Code expired (TOTP codes expire after 30-60 seconds)
3. Time sync issue between server and authenticator app

**Solution:**

1. **For users:** Try a fresh code from authenticator app
2. **For developers:** Ensure server time is synchronized

```bash
# Check server time
date

# Sync server time (if needed)
sudo ntpdate -s time.nist.gov
```

---

### "MFA method not supported"

**Error Message:**

```
Error: MFA method "email" is not supported
```

**Cause:**
User tried to use an MFA method that's not enabled.

**Configuration:**

```typescript
Primary: auth.entra().session({
  mfa: {
    required: true,
    methods: ['totp', 'sms'], // Only TOTP and SMS supported
  },
});
```

**Solution:**

Use a supported MFA method or add the method to configuration:

```typescript
Primary: auth.entra().session({
  mfa: {
    required: true,
    methods: ['totp', 'sms', 'email'], // Add 'email'
  },
});
```

---

## Rate Limiting Errors

### "Too many requests"

**Error Message:**

```
Error: Too many requests
Error: Rate limit exceeded (429)
```

**Cause:**
The client has exceeded the configured rate limit.

**Configuration:**

```typescript
import { auth } from '@atakora/component';

Primary: auth.entra().rateLimit({
  enabled: true,
  maxRequests: 100,
  windowMs: 60000, // 100 requests per minute
});
```

**Solution:**

Implement retry logic with exponential backoff:

```typescript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After') || (i + 1) * 1000;
        await sleep(retryAfter);
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

**Prevention:**

Implement request throttling on client side:

```typescript
// Simple rate limiter
class RateLimiter {
  private queue: Promise<any>[] = [];

  async throttle<T>(fn: () => Promise<T>, delayMs: number): Promise<T> {
    const promise = Promise.all(this.queue).then(() => fn());
    this.queue.push(promise.catch(() => {}));

    setTimeout(() => {
      this.queue = this.queue.filter((p) => p !== promise);
    }, delayMs);

    return promise;
  }
}

const limiter = new RateLimiter();

// Use it
await limiter.throttle(() => api.getUsers(), 1000); // Max 1 req/second
```

---

## Debugging Authentication

### Check Token Contents

Decode JWT to inspect claims:

```bash
# Using jwt-cli
jwt decode YOUR_TOKEN

# Or online at jwt.io
```

```typescript
// In code
const jwt = require('jsonwebtoken');
const decoded = jwt.decode(token);

console.log('Issuer:', decoded.iss);
console.log('Audience:', decoded.aud);
console.log('Expires:', new Date(decoded.exp * 1000));
console.log('Claims:', decoded);
```

### Test Authentication Manually

```bash
# Get Entra ID token
az account get-access-token --resource api://your-app-id

# Test with token
TOKEN=$(az account get-access-token --resource api://your-app-id --query accessToken -o tsv)

curl -H "Authorization: Bearer $TOKEN" https://your-api.com/api/users
```

### Enable Debug Logging

```typescript
// In your backend
backend.setLogLevel('debug');

// You'll see detailed auth logs
// - Token received
// - Validation steps
// - Claims extracted
// - Authorization decisions
```

### Verify Environment Variables

```typescript
// Check that env vars are loaded
console.log('Tenant ID:', process.env.AZURE_TENANT_ID);
console.log('Client ID:', process.env.AZURE_CLIENT_ID);
console.log('API Key loaded:', !!process.env.API_KEY_1);

// If undefined, check:
// 1. .env file exists
// 2. dotenv is loaded: require('dotenv').config()
// 3. Env vars are set in deployment environment
```

---

## Common Patterns That Cause Errors

### Pattern 1: Hardcoded Secrets

**Problem:**

```typescript
// NEVER do this!
Primary: auth.jwt().issuer('https://auth.example.com').secret('my-secret-key-123'); // Hardcoded secret!
```

**Solution:**

```typescript
Primary: auth.jwt().issuer('https://auth.example.com').secret(process.env.JWT_SECRET!); // From environment
```

### Pattern 2: Missing Error Handling

**Problem:**

```typescript
// No error handling
const users = await api.getUsers();
```

**Solution:**

```typescript
try {
  const users = await api.getUsers();
} catch (error) {
  if (error.status === 401) {
    // Unauthorized - redirect to login
    window.location.href = '/login';
  } else if (error.status === 403) {
    // Forbidden - show access denied message
    showError('You do not have permission to view this resource');
  } else {
    // Other error
    showError('An error occurred');
  }
}
```

### Pattern 3: Storing Tokens Insecurely

**Problem:**

```typescript
// Insecure storage
localStorage.setItem('token', token); // Vulnerable to XSS
```

**Solution:**

```typescript
// Use httpOnly cookies (server-side)
res.cookie('token', token, {
  httpOnly: true, // Not accessible via JavaScript
  secure: true, // HTTPS only
  sameSite: 'strict', // CSRF protection
  maxAge: 3600000, // 1 hour
});
```

---

## Security Best Practices

### 1. Use HTTPS

Always use HTTPS in production:

```typescript
// In production, ensure API uses HTTPS
const API_URL =
  process.env.NODE_ENV === 'production' ? 'https://api.yourapp.com' : 'http://localhost:3000';
```

### 2. Validate Tokens Server-Side

Never trust client-side validation:

```typescript
// Always validate on server
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  try {
    const validated = await validateToken(token);
    req.user = validated.user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

### 3. Rotate API Keys Regularly

```typescript
import { days } from '@atakora/component';

ApiKeys: auth.apiKeys()
  .rotateEvery(days(90))  // Force rotation every 90 days
  .keys([...])
```

### 4. Implement Rate Limiting

Prevent brute force attacks:

```typescript
Primary: auth.jwt().rateLimit({
  enabled: true,
  maxRequests: 5, // Max 5 failed attempts
  windowMs: 900000, // Per 15 minutes
  blockDuration: 3600000, // Block for 1 hour after limit
});
```

### 5. Log Authentication Events

```typescript
// Log all auth events
authLogger.log({
  event: 'login_attempt',
  userId: user.id,
  success: true,
  ip: req.ip,
  timestamp: new Date(),
});
```

---

## Quick Reference

### HTTP Status Codes

| Status | Meaning               | Common Cause                             |
| ------ | --------------------- | ---------------------------------------- |
| 401    | Unauthorized          | Missing or invalid token                 |
| 403    | Forbidden             | Valid token but insufficient permissions |
| 429    | Too Many Requests     | Rate limit exceeded                      |
| 500    | Internal Server Error | Server configuration issue               |

### Header Formats

```bash
# JWT / Entra ID
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

# API Key
X-API-Key: your-api-key-here
```

### Common Commands

```bash
# Get Entra ID token
az account get-access-token --resource api://your-app-id

# Decode JWT
jwt decode YOUR_TOKEN

# Test API with auth
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/resource
```

---

## Next Steps

- [Authentication Setup Guide](../getting-started/authentication-setup.md) - Configure auth providers
- [Authorization Patterns](../guides/authorization-patterns.md) - Control access to resources
- [Schema Errors](./schema-errors.md) - Troubleshoot schema issues

## Summary

You've learned how to troubleshoot:

- Token validation errors (signature, expiration, issuer, audience)
- Provider configuration errors (missing config, wrong settings)
- API key errors (not found, expired, rotation)
- Session management errors (expired sessions, invalid tokens)
- MFA errors (verification required, invalid codes)
- Rate limiting errors (too many requests)

Always validate tokens server-side, use environment variables for secrets, implement proper error handling, and follow security best practices.
