# Authentication Setup

> Learn how to add authentication to your backend using JWT, Entra ID, or API Keys

## What You'll Learn

- Why authentication matters for your application
- How to choose the right authentication provider
- How to set up JWT authentication (the simplest option)
- How to configure Entra ID for enterprise SSO
- How to use API Keys for service accounts
- How to combine multiple authentication providers

## Prerequisites

Before you begin, make sure you have:

- Completed the [Your First Schema](./your-first-schema.md) guide
- A schema defined using `defineSchema()`
- Understanding of basic authentication concepts (tokens, claims, roles)

## Why Authentication Matters

Authentication verifies the identity of users or services accessing your API. Without authentication:

- Anyone can access your data
- You can't track who performed which actions
- You can't implement authorization rules
- Audit logs are meaningless

The Atakora Component authentication system provides:

- Multiple provider options (JWT, Entra ID, API Keys)
- Automatic token validation
- Role mapping from identity providers
- Session management with MFA support
- Rate limiting and security features

## Choose Your Authentication Provider

The component library supports three authentication providers:

### JWT (JSON Web Tokens)

**Best for:**

- Simple applications
- Custom authentication systems
- Quick prototyping
- Mobile apps with custom login

**Pros:**

- Simple to set up
- Works with any JWT issuer
- Full control over token structure

**Cons:**

- You manage token issuance
- No built-in user directory

### Entra ID (Azure Active Directory)

**Best for:**

- Enterprise applications
- Single sign-on (SSO) requirements
- Organizations already using Microsoft 365
- Government cloud deployments

**Pros:**

- Enterprise-grade identity management
- Built-in MFA support
- Group-based access control
- Compliance ready

**Cons:**

- More complex setup
- Requires Azure subscription
- Tied to Microsoft ecosystem

### API Keys

**Best for:**

- Service-to-service communication
- CI/CD pipelines
- Backend automation
- Partner integrations

**Pros:**

- Simple for machines
- Long-lived credentials
- Role-based access
- Easy rotation

**Cons:**

- Not suitable for user authentication
- Requires secure key storage
- Manual rotation process

## Step 1: Define Authentication Configuration

All authentication configuration uses the `defineAuth()` function. Let's start with the simplest option: JWT.

### Option A: JWT Authentication (Simple)

Create a new file called `auth.ts`:

```typescript
import { defineAuth, auth } from '@atakora/component';

export const myAuth = defineAuth({
  // Define your primary authentication provider
  Primary: auth
    .jwt()
    .issuer('https://your-auth-server.com') // Your JWT issuer URL
    .audience('https://your-api.com') // Your API audience
    .algorithm('RS256'), // JWT signing algorithm
});
```

**What each option means:**

- **`issuer`**: The URL of the service that issues JWTs (your auth server)
- **`audience`**: The intended recipient of the token (your API)
- **`algorithm`**: The algorithm used to sign the token (RS256, HS256, etc.)

### Option B: Entra ID Authentication (Enterprise)

For enterprise applications using Azure Active Directory:

```typescript
import { defineAuth, auth } from '@atakora/component';

export const myAuth = defineAuth({
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!) // Your Azure tenant ID
    .clientId(process.env.AZURE_CLIENT_ID!) // Your app registration client ID
    .audience('api://your-app-id'), // Your API audience
});
```

**Where to find these values:**

1. Go to Azure Portal > Azure Active Directory
2. Navigate to App Registrations
3. Find or create your app registration
4. **Tenant ID**: Directory (tenant) ID on the Overview page
5. **Client ID**: Application (client) ID on the Overview page
6. **Audience**: Set in the Expose an API section

### Option C: API Keys (Service Accounts)

For service-to-service authentication:

```typescript
import { defineAuth, auth } from '@atakora/component';
import { days } from '@atakora/component';

export const myAuth = defineAuth({
  ServiceAccounts: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90)) // Require rotation every 90 days
    .keys([
      {
        id: 'data-pipeline',
        secret: process.env.PIPELINE_API_KEY!,
        roles: ['data-write', 'storage-access'],
        metadata: {
          service: 'ETL Pipeline',
          owner: 'data-team',
        },
      },
      {
        id: 'monitoring-service',
        secret: process.env.MONITORING_API_KEY!,
        roles: ['monitoring', 'readonly'],
        metadata: {
          service: 'Monitoring System',
          owner: 'ops-team',
        },
      },
    ]),
});
```

## Step 2: Environment Variables

For security, never hardcode sensitive values. Use environment variables:

Create a `.env` file:

```bash
# JWT Configuration
JWT_ISSUER=https://your-auth-server.com
JWT_AUDIENCE=https://your-api.com

# Or Entra ID Configuration
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_AUDIENCE=api://your-app-id

# API Keys
PIPELINE_API_KEY=your-secure-api-key-here
MONITORING_API_KEY=another-secure-api-key-here
```

Then use them in your auth configuration:

```typescript
import { defineAuth, auth } from '@atakora/component';

export const myAuth = defineAuth({
  Primary: auth
    .jwt()
    .issuer(process.env.JWT_ISSUER!)
    .audience(process.env.JWT_AUDIENCE!)
    .algorithm('RS256'),
});
```

## Step 3: Add Authentication to Backend

Once you have your auth configuration, add it to your backend definition:

```typescript
import { defineBackend } from '@atakora/component';
import { schema } from './schema';
import { myAuth } from './auth';

export const backend = defineBackend({
  name: 'my-app',
  schema,
  authentication: myAuth, // Add authentication here
});
```

That's it! Your backend now requires authentication for all API requests.

## Step 4: Test Authentication

To test your authentication setup, you'll need to:

### For JWT

1. Obtain a valid JWT from your auth server
2. Include it in API requests as a Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-api.com/api/users
```

### For Entra ID

1. Use Azure AD authentication flow to get a token
2. Include it in API requests:

```bash
# Get token using Azure CLI
TOKEN=$(az account get-access-token --resource api://your-app-id --query accessToken -o tsv)

# Use token in API request
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api.com/api/users
```

### For API Keys

Include the API key in the request header:

```bash
curl -H "X-API-Key: your-api-key-here" \
  https://your-api.com/api/data
```

## Advanced Configuration

### Custom Token Validation

Add custom validation logic to your auth configuration:

```typescript
export const myAuth = defineAuth({
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .validateTokens(async (token, claims) => {
      // Custom validation logic
      if (!claims.email_verified) {
        return {
          valid: false,
          error: 'Email must be verified',
        };
      }

      // Check if user is in allowed domains
      const email = claims.email as string;
      if (!email.endsWith('@yourcompany.com')) {
        return {
          valid: false,
          error: 'Only company emails allowed',
        };
      }

      return { valid: true };
    }),
});
```

### Role Mapping

Map identity provider groups/claims to application roles:

```typescript
export const myAuth = defineAuth({
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .mapRoles((claims) => {
      // Map Azure AD groups to app roles
      const groups = claims.groups || [];
      const roles: string[] = [];

      if (groups.includes('admins-group-id')) {
        roles.push('admin');
      }
      if (groups.includes('editors-group-id')) {
        roles.push('editor');
      }

      return roles;
    }),
});
```

### API Key Rotation

Set up automatic key rotation reminders:

```typescript
import { days } from '@atakora/component';

export const myAuth = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90)) // Warn when keys are older than 90 days
    .prefix('atk_') // Add prefix to all keys
    .keys([
      {
        id: 'admin-cli',
        secret: process.env.ADMIN_API_KEY!,
        roles: ['admin', 'service'],
        expiresAt: '2025-12-31T23:59:59Z', // Hard expiration
        metadata: {
          description: 'Admin CLI tool',
          team: 'platform',
          createdBy: 'admin@company.com',
        },
      },
    ]),
});
```

## Common Patterns

### Pattern 1: User Auth + Service Auth

Combine Entra ID for users and API Keys for services:

```typescript
export const myAuth = defineAuth({
  // Users authenticate with Entra ID
  Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!).clientId(process.env.AZURE_CLIENT_ID!),

  // Services authenticate with API Keys
  ServiceAccounts: auth
    .apiKeys()
    .enable()
    .keys([
      {
        id: 'data-sync',
        secret: process.env.SYNC_API_KEY!,
        roles: ['service', 'data-write'],
      },
    ]),
});
```

### Pattern 2: Session with MFA

Enable session management with multi-factor authentication:

```typescript
import { defineAuth, auth } from '@atakora/component';
import { hours, days } from '@atakora/component';

export const myAuth = defineAuth({
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .session({
      enabled: true,
      duration: hours(8), // Session lasts 8 hours
      mfa: {
        required: true,
        methods: ['totp', 'sms'], // Support TOTP and SMS
        gracePeriod: days(7), // Re-prompt MFA after 7 days
      },
    }),
});
```

### Pattern 3: Temporary Access

Create time-limited API keys for contractors:

```typescript
export const myAuth = defineAuth({
  Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!).clientId(process.env.AZURE_CLIENT_ID!),

  TemporaryAccess: auth
    .apiKeys()
    .enable()
    .keys([
      {
        id: 'contractor-q1-2025',
        secret: process.env.CONTRACTOR_KEY!,
        roles: ['viewer', 'readonly'],
        expiresAt: '2025-03-31T23:59:59Z', // Expires at end of Q1
        metadata: {
          grantedTo: 'contractor@example.com',
          purpose: 'Q1 Audit',
          approver: 'manager@company.com',
        },
      },
    ]),
});
```

## Troubleshooting

### Error: "Invalid token issuer"

The token's `iss` claim doesn't match your configured issuer:

```typescript
// Make sure issuer matches exactly (including https://)
Primary: auth.jwt().issuer('https://your-auth-server.com'); // Must match token's iss claim
```

### Error: "Token audience mismatch"

The token's `aud` claim doesn't match your configured audience:

```typescript
// Make sure audience matches your API
Primary: auth.jwt().audience('https://your-api.com'); // Must match token's aud claim
```

### Error: "API key not found"

The provided API key isn't in your configuration:

```typescript
// Make sure the key is defined
ApiKeys: auth.apiKeys().keys([
  {
    id: 'service-1',
    secret: 'the-actual-key-value', // Must match request header
    roles: ['service'],
  },
]);
```

### Tokens Not Validating

Check that your token is valid and not expired:

```bash
# Decode JWT to check claims (using jwt.io or jwt-cli)
jwt decode YOUR_TOKEN

# Look for:
# - exp: Token expiration (must be in the future)
# - iss: Issuer (must match your config)
# - aud: Audience (must match your config)
```

## Next Steps

Now that you have authentication configured, you can:

- [Set up authorization rules](../guides/authorization-patterns.md) - Control who can access specific data
- [Learn about CRUD models](../guides/crud-models.md) - Apply auth to your models
- [Configure session management](../guides/session-management.md) - Advanced session features
- [Set up audit logging](../guides/audit-logging.md) - Track authenticated actions

## Summary

You've learned how to:

- Choose the right authentication provider for your needs
- Configure JWT authentication for simple use cases
- Set up Entra ID for enterprise SSO
- Use API Keys for service accounts
- Combine multiple authentication providers
- Add custom validation and role mapping
- Test your authentication setup

Authentication is the first line of defense for your API. Combined with authorization rules (covered in the next guide), you can build secure, compliant applications.
