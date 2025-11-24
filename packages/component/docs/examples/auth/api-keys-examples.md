# Authentication Examples

This document provides comprehensive examples of using the authentication system with the API Keys provider.

## Table of Contents

- [Basic API Keys](#basic-api-keys)
- [Multiple Providers](#multiple-providers)
- [Advanced Configuration](#advanced-configuration)
- [Service Accounts](#service-accounts)
- [Temporary Access](#temporary-access)
- [Type Inference](#type-inference)

## Basic API Keys

### Simple Configuration

```typescript
import { defineAuth, auth } from '@atakora/component';

export const authentication = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .keys([
      {
        id: 'service-account',
        secret: process.env.API_KEY!,
        roles: ['service'],
      },
    ]),
});
```

### With Key Rotation

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
        secret: process.env.API_KEY_1!,
        roles: ['service'],
      },
    ]),
});
```

### With Key Prefix

```typescript
import { defineAuth, auth } from '@atakora/component';

export const authentication = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .prefix('atk_')
    .keys([
      {
        id: 'service-1',
        secret: process.env.API_KEY!,
        roles: ['service'],
      },
    ]),
});
```

## Multiple Providers

### Entra ID + API Keys

```typescript
import { defineAuth, auth, days } from '@atakora/component';

export const authentication = defineAuth({
  // Primary provider (Entra ID)
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .audience(process.env.AZURE_AUDIENCE!),

  // Secondary provider (API Keys)
  ApiKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90))
    .keys([
      {
        id: 'service-1',
        secret: process.env.API_KEY_1!,
        roles: ['service'],
      },
      {
        id: 'service-2',
        secret: process.env.API_KEY_2!,
        roles: ['service'],
      },
    ])
    .prefix('atk_'),
});
```

## Advanced Configuration

### Complete Configuration

```typescript
import { defineAuth, auth, days } from '@atakora/component';

export const authentication = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90))
    .prefix('atk_')
    .keys([
      {
        id: 'admin-cli',
        secret: process.env.ADMIN_API_KEY!,
        roles: ['admin', 'service'],
        expiresAt: '2025-12-31T23:59:59Z',
        metadata: {
          description: 'Admin CLI tool',
          createdBy: 'ops-team',
          environment: 'production',
        },
      },
      {
        id: 'monitoring-service',
        secret: process.env.MONITORING_KEY!,
        roles: ['monitoring', 'readonly'],
        metadata: {
          description: 'Monitoring service',
          team: 'platform',
        },
      },
    ]),
});
```

## Service Accounts

### Multiple Service Accounts

```typescript
import { defineAuth, auth, days } from '@atakora/component';

export const authentication = defineAuth({
  ServiceAccounts: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(30))
    .keys([
      {
        id: 'data-pipeline',
        secret: process.env.PIPELINE_KEY!,
        roles: ['data-write', 'storage-access'],
        metadata: {
          service: 'ETL Pipeline',
          owner: 'data-team',
        },
      },
      {
        id: 'reporting-service',
        secret: process.env.REPORTING_KEY!,
        roles: ['data-read', 'analytics'],
        metadata: {
          service: 'Reporting',
          owner: 'analytics-team',
        },
      },
      {
        id: 'backup-service',
        secret: process.env.BACKUP_KEY!,
        roles: ['data-read', 'backup'],
        metadata: {
          service: 'Backup',
          owner: 'ops-team',
        },
      },
    ]),
});
```

### Role-Based Access

```typescript
import { defineAuth, auth } from '@atakora/component';

export const authentication = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .keys([
      // Admin access
      {
        id: 'admin-key',
        secret: process.env.ADMIN_KEY!,
        roles: ['admin', 'write', 'read'],
      },
      // Editor access
      {
        id: 'editor-key',
        secret: process.env.EDITOR_KEY!,
        roles: ['write', 'read'],
      },
      // Viewer access
      {
        id: 'viewer-key',
        secret: process.env.VIEWER_KEY!,
        roles: ['read'],
      },
    ]),
});
```

## Temporary Access

### Contractor Access

```typescript
import { defineAuth, auth } from '@atakora/component';

export const authentication = defineAuth({
  Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!).clientId(process.env.AZURE_CLIENT_ID!),

  TemporaryAccess: auth
    .apiKeys()
    .enable()
    .keys([
      {
        id: 'contractor-q1-2025',
        secret: process.env.CONTRACTOR_KEY!,
        roles: ['viewer', 'readonly'],
        expiresAt: '2025-03-31T23:59:59Z',
        metadata: {
          grantedTo: 'contractor@example.com',
          purpose: 'Q1 Audit',
          approver: 'manager@company.com',
        },
      },
    ]),
});
```

### Partner Integration

```typescript
import { defineAuth, auth, days } from '@atakora/component';

export const authentication = defineAuth({
  PartnerAccess: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(180))
    .prefix('partner_')
    .keys([
      {
        id: 'partner-acme-corp',
        secret: process.env.PARTNER_ACME_KEY!,
        roles: ['partner', 'data-export'],
        expiresAt: '2025-12-31T23:59:59Z',
        metadata: {
          partner: 'Acme Corporation',
          contract: 'ACME-2025-001',
          contactEmail: 'integration@acme.com',
        },
      },
    ]),
});
```

## Type Inference

### Provider Type Inference

```typescript
import { defineAuth, auth } from '@atakora/component';

const authentication = defineAuth({
  Primary: auth.entra().tenant('t').clientId('c'),
  ApiKeys: auth
    .apiKeys()
    .enable()
    .keys([{ id: 'test', secret: 's', roles: ['admin'] }]),
});

// TypeScript infers provider types automatically
const primaryType = authentication.providers.Primary.type; // 'entra-id'
const apiKeysType = authentication.providers.ApiKeys.type; // 'api-keys'

// Access configuration with type safety
const apiKeysConfig = authentication.providers.ApiKeys.config;
// TypeScript knows this is ApiKeysConfig
```

### Configuration Access

```typescript
import { defineAuth, auth } from '@atakora/component';
import type { ApiKeysConfig } from '@atakora/component';

const authentication = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .prefix('atk_')
    .keys([{ id: 'test', secret: 's', roles: ['admin'] }]),
});

// Type-safe configuration access
const config = authentication.providers.ApiKeys.config as ApiKeysConfig;
console.log(config.keyPrefix); // 'atk_'
console.log(config.keys.length); // 1
```

## Validation Examples

### Enabled Without Keys (Error)

```typescript
import { defineAuth, auth } from '@atakora/component';

// This will throw an error at build time
try {
  const authentication = defineAuth({
    ApiKeys: auth.apiKeys().enable(),
    // Missing .keys([...])
  });
} catch (error) {
  console.error('API key authentication is enabled but no keys are configured');
}
```

### Invalid Provider Name (Error)

```typescript
import { defineAuth, auth } from '@atakora/component';

// This will throw an error - provider names must be PascalCase
try {
  const authentication = defineAuth({
    'api-keys': auth
      .apiKeys()
      .enable()
      .keys([{ id: 'test', secret: 's', roles: ['admin'] }]),
  });
} catch (error) {
  console.error('Provider name must be PascalCase');
}
```

### Missing Required Fields (Error)

```typescript
import { defineAuth, auth } from '@atakora/component';

// This will throw an error - missing required fields
try {
  const authentication = defineAuth({
    ApiKeys: auth
      .apiKeys()
      .enable()
      .keys([
        { id: 'test' }, // Missing secret and roles
      ]),
  });
} catch (error) {
  console.error('API key is missing required fields');
}
```

## Best Practices

### Use Environment Variables

Always store API keys in environment variables, never in source code:

```typescript
import { defineAuth, auth } from '@atakora/component';

export const authentication = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .keys([
      {
        id: 'service-1',
        secret: process.env.API_KEY_1!, // ✅ Good
        // secret: 'my-secret-key',       // ❌ Bad
        roles: ['service'],
      },
    ]),
});
```

### Rotate Keys Regularly

Set automatic rotation periods for better security:

```typescript
import { defineAuth, auth, days } from '@atakora/component';

export const authentication = defineAuth({
  ApiKeys: auth.apiKeys()
    .enable()
    .rotateEvery(days(90))  // ✅ Rotate every 90 days
    .keys([...])
});
```

### Use Key Prefixes

Add prefixes to identify keys in logs:

```typescript
import { defineAuth, auth } from '@atakora/component';

export const authentication = defineAuth({
  ApiKeys: auth.apiKeys()
    .enable()
    .prefix('atk_')  // ✅ Easy to identify in logs
    .keys([...])
});
```

### Add Metadata

Include metadata for documentation and auditing:

```typescript
import { defineAuth, auth } from '@atakora/component';

export const authentication = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .keys([
      {
        id: 'service-1',
        secret: process.env.API_KEY!,
        roles: ['service'],
        metadata: {
          // ✅ Helpful for auditing
          description: 'ETL Pipeline',
          owner: 'data-team',
          createdAt: '2025-01-20',
        },
      },
    ]),
});
```

### Set Expiration Dates

Use expiration for temporary access:

```typescript
import { defineAuth, auth } from '@atakora/component';

export const authentication = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .keys([
      {
        id: 'temp-contractor',
        secret: process.env.TEMP_KEY!,
        roles: ['viewer'],
        expiresAt: '2025-06-30T23:59:59Z', // ✅ Auto-expires
      },
    ]),
});
```
