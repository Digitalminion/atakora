# Type Inference Examples

This document demonstrates the type inference capabilities of the authentication system.

## Basic Type Inference

### Extracting Provider Configs

```typescript
import { defineAuth, auth } from '@atakora/component';
import type { ExtractProviderConfig } from '@atakora/component';

// Define a provider builder
const entraBuilder = auth.entra().tenant('my-tenant-id').clientId('my-client-id');

// Infer the config type
type EntraConfig = ExtractProviderConfig<typeof entraBuilder>;
// Type: EntraIdConfig

// The config type is automatically inferred from the builder
const config = entraBuilder._build();
// config.tenant: string
// config.clientId: string
// config.type: 'entra-id'
```

### Inferring All Provider Types

```typescript
const authentication = defineAuth({
  Primary: auth.entra().tenant('tenant-id').clientId('client-id'),
  ApiKeys: auth
    .apiKeys()
    .enable()
    .keys([{ id: 'key1', secret: 'secret1', roles: ['admin'] }]),
});

// Access providers with full type information
const primary = authentication.providers.Primary;
// primary.config is typed as EntraIdConfig

const apiKeys = authentication.providers.ApiKeys;
// apiKeys.config is typed as ApiKeysConfig
```

## Type Guards for Runtime Type Narrowing

### Using Type Guards

```typescript
import { isEntraIdProvider, isApiKeysProvider, isCustomProvider } from '@atakora/component';

const authentication = defineAuth({
  Primary: auth.entra().tenant('t').clientId('c'),
  ApiKeys: auth.apiKeys().enable().keys([...]),
  Custom: auth.custom().validateTokens(async () => ({ valid: true }))
});

// Type guard narrows the type
const provider = authentication.providers.Primary;

if (isEntraIdProvider(provider)) {
  // TypeScript knows provider.config is EntraIdConfig
  console.log(provider.config.tenant);      // OK
  console.log(provider.config.clientId);    // OK
  console.log(provider.config.audience);    // OK (optional)

  // TypeScript prevents access to properties from other provider types
  // console.log(provider.config.keys);     // Error!
}

if (isApiKeysProvider(provider)) {
  // TypeScript knows provider.config is ApiKeysConfig
  console.log(provider.config.keys);        // OK
  console.log(provider.config.enabled);     // OK

  // TypeScript prevents access to Entra ID properties
  // console.log(provider.config.tenant);   // Error!
}
```

### Generic Type Guard

```typescript
import { isProviderType } from '@atakora/component';

const provider = authentication.providers.Primary;

// Check for specific provider type
if (isProviderType(provider, 'entra-id')) {
  // Handle Entra ID provider
  console.log('Entra ID provider detected');
}

if (isProviderType(provider, 'api-keys')) {
  // Handle API Keys provider
  console.log('API Keys provider detected');
}
```

## Advanced Type Utilities

### Extracting Config by Provider Name

```typescript
import type { ProviderConfigByName } from '@atakora/component';

const authDef = {
  Primary: auth.entra().tenant('t').clientId('c'),
  ApiKeys: auth.apiKeys().enable().keys([...]),
};

// Extract config type by provider name
type PrimaryConfig = ProviderConfigByName<typeof authDef, 'Primary'>;
// Type: EntraIdConfig

type ApiKeysConfig = ProviderConfigByName<typeof authDef, 'ApiKeys'>;
// Type: ApiKeysConfig
```

### Checking Provider Existence

```typescript
import type { HasProvider } from '@atakora/component';

const authentication = defineAuth({
  Primary: auth.entra().tenant('t').clientId('c'),
});

// Check if provider exists at type level
type HasPrimary = HasProvider<typeof authentication, 'Primary'>;
// Type: true

type HasSecondary = HasProvider<typeof authentication, 'Secondary'>;
// Type: false

// Runtime check
if ('Primary' in authentication.providers) {
  console.log('Primary provider exists');
}
```

### Filtering Providers by Type

```typescript
import type { FilterProvidersByType, ProviderNamesByType } from '@atakora/component';

const authentication = defineAuth({
  EntraId1: auth.entra().tenant('t1').clientId('c1'),
  EntraId2: auth.entra().tenant('t2').clientId('c2'),
  ApiKeys: auth.apiKeys().enable().keys([...]),
});

// Get only Entra ID providers
type EntraProviders = FilterProvidersByType<typeof authentication, 'entra-id'>;
// Type: { EntraId1: ..., EntraId2: ... }

// Get provider names of specific type
type EntraNames = ProviderNamesByType<typeof authentication, 'entra-id'>;
// Type: 'EntraId1' | 'EntraId2'
```

## IntelliSense and Autocomplete

### Autocomplete for Provider Names

```typescript
const authentication = defineAuth({
  Primary: auth.entra().tenant('t').clientId('c'),
  Secondary: auth.apiKeys().enable().keys([...]),
});

// IntelliSense suggests: 'Primary' | 'Secondary'
const provider = authentication.providers.
//                                        ^ Autocomplete shows: Primary, Secondary
```

### Autocomplete for Config Properties

```typescript
const authentication = defineAuth({
  Primary: auth.entra()
    .tenant('t')
    .clientId('c')
    .audience('api://my-app'),
});

const provider = authentication.providers.Primary;

if (isEntraIdProvider(provider)) {
  // IntelliSense suggests all EntraIdConfig properties
  const tenant = provider.config.
  //                            ^ Autocomplete shows: tenant, clientId, audience, issuer, type, etc.
}
```

## Complex Example: Multi-Provider Setup

```typescript
import {
  defineAuth,
  auth,
  isEntraIdProvider,
  isApiKeysProvider,
  isCustomProvider,
} from '@atakora/component';

// Define multiple providers
const authentication = defineAuth({
  // Primary: Entra ID for user authentication
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .audience('api://my-app')
    .validateTokens(async (token) => {
      // Custom token validation
      return { valid: true };
    })
    .mapRoles((claims) => {
      // Map Azure AD groups to roles
      return claims.groups || [];
    }),

  // API Keys for service-to-service
  ServiceKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90))
    .prefix('svc_')
    .keys([
      {
        id: 'monitoring-service',
        secret: process.env.MONITORING_API_KEY!,
        roles: ['monitoring', 'readonly'],
      },
      {
        id: 'admin-cli',
        secret: process.env.ADMIN_API_KEY!,
        roles: ['admin', 'service'],
      },
    ]),

  // Custom provider for legacy system
  Legacy: auth
    .custom()
    .header('X-Legacy-Token')
    .validateTokens(async (token) => {
      const user = await validateLegacyToken(token);
      return {
        valid: !!user,
        userId: user?.id,
        claims: { sub: user?.id, name: user?.name },
      };
    })
    .mapRoles((claims) => ['legacy-user']),
});

// Type-safe access to providers
const primaryProvider = authentication.providers.Primary;
// primaryProvider.config is typed as EntraIdConfig

const serviceKeysProvider = authentication.providers.ServiceKeys;
// serviceKeysProvider.config is typed as ApiKeysConfig

const legacyProvider = authentication.providers.Legacy;
// legacyProvider.config is typed as CustomAuthConfig

// Runtime type checking with type narrowing
function handleProvider(provider: typeof primaryProvider) {
  if (isEntraIdProvider(provider)) {
    console.log('Entra ID tenant:', provider.config.tenant);
    console.log('Client ID:', provider.config.clientId);
  } else if (isApiKeysProvider(provider)) {
    console.log('Number of keys:', provider.config.keys.length);
    console.log('Key prefix:', provider.config.keyPrefix);
  } else if (isCustomProvider(provider)) {
    console.log('Header name:', provider.config.headerName);
  }
}

// Iterate over all providers with type safety
for (const [name, provider] of Object.entries(authentication.providers)) {
  console.log(`Provider ${name}:`, provider.type);

  if (isEntraIdProvider(provider)) {
    console.log('  Tenant:', provider.config.tenant);
  } else if (isApiKeysProvider(provider)) {
    console.log('  Keys:', provider.config.keys.length);
  } else if (isCustomProvider(provider)) {
    console.log('  Header:', provider.config.headerName);
  }
}

// Get primary provider
const primary = authentication.providers[authentication.primaryProvider];
console.log('Primary provider type:', primary.type);
```

## Type-Level Validation

The type system prevents common mistakes:

```typescript
const authentication = defineAuth({
  Primary: auth.entra().tenant('t').clientId('c'),
});

// ✅ Correct - accessing existing provider
const primary = authentication.providers.Primary;

// ❌ Error - TypeScript prevents accessing non-existent provider
// const secondary = authentication.providers.Secondary;
//                                           ^^^^^^^^^ Property 'Secondary' does not exist

// ✅ Type guard narrows the type correctly
if (isEntraIdProvider(primary)) {
  const tenant = primary.config.tenant; // OK
}

// ❌ Error - accessing wrong property without type guard
// const keys = primary.config.keys;
//                            ^^^^ Property 'keys' does not exist on type 'EntraIdConfig'
```

## Summary

The type inference system provides:

1. **Automatic Type Inference**: Types are inferred from builder chains
2. **Type-Safe Access**: Provider configs are strongly typed
3. **Runtime Type Guards**: Narrow types at runtime with type guards
4. **IntelliSense Support**: Full autocomplete in IDEs
5. **Compile-Time Safety**: Catch errors before runtime
6. **Flexible Type Utilities**: Advanced type manipulation when needed

This ensures that authentication configuration is both powerful and safe to use.
