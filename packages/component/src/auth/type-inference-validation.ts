/**
 * Type Inference Validation Examples
 *
 * This file demonstrates that the type inference system works correctly.
 * It's designed to be type-checked by TypeScript to verify that:
 * 1. Types are inferred correctly
 * 2. Type guards narrow types properly
 * 3. IntelliSense works as expected
 * 4. Invalid code is caught at compile time
 */

import { defineAuth } from './define-auth';
import { auth } from './providers';
import {
  isEntraIdProvider,
  isApiKeysProvider,
  isCustomProvider,
  type ExtractProviderConfig,
  type InferAuthProviders,
  type ProviderConfigByName,
} from './type-inference';
import type { EntraIdConfig } from './providers/entra';
import type { ApiKeysConfig } from './providers/api-keys';
import type { CustomAuthConfig } from './providers/custom';
import { days } from '../common/duration';

// ============================================================================
// Example 1: Basic Type Inference
// ============================================================================

const exampleAuth1 = defineAuth({
  Primary: auth.entra().tenant('example-tenant').clientId('example-client-id'),
});

// Type should be inferred automatically
const provider1 = exampleAuth1.providers.Primary;

// Config should be typed as EntraIdConfig
const config1: EntraIdConfig = provider1.config as EntraIdConfig;

// These properties should exist and be typed correctly
const tenant1: string = config1.tenant;
const clientId1: string = config1.clientId;

// ============================================================================
// Example 2: Multiple Providers with Type Inference
// ============================================================================

const exampleAuth2 = defineAuth({
  Primary: auth.entra().tenant('tenant-id').clientId('client-id').audience('api://my-app'),

  ApiKeys: auth
    .apiKeys()
    .enable()
    .keys([
      { id: 'key1', secret: 'secret1', roles: ['admin'] },
      { id: 'key2', secret: 'secret2', roles: ['user'] },
    ])
    .prefix('app_'),

  Custom: auth
    .custom()
    .validateTokens(async (token) => ({ valid: true }))
    .mapRoles(() => ['viewer'])
    .header('X-Custom-Token'),
});

// All providers should be correctly typed
const primaryProvider = exampleAuth2.providers.Primary;
const apiKeysProvider = exampleAuth2.providers.ApiKeys;
const customProvider = exampleAuth2.providers.Custom;

// ============================================================================
// Example 3: Type Guards for Runtime Type Narrowing
// ============================================================================

function handleProvider(provider: typeof primaryProvider) {
  // Before type guard: provider.config is AuthProviderConfig (union)

  if (isEntraIdProvider(provider)) {
    // After type guard: provider.config is EntraIdConfig
    const tenant = provider.config.tenant;
    const clientId = provider.config.clientId;
    const audience = provider.config.audience; // optional property

    // These should compile without errors
    console.log('Entra ID:', tenant, clientId, audience);

    // The following line should cause a TypeScript error if uncommented:
    // const keys = provider.config.keys; // Error: Property 'keys' does not exist
  }

  if (isApiKeysProvider(provider)) {
    // After type guard: provider.config is ApiKeysConfig
    const keys = provider.config.keys;
    const prefix = provider.config.keyPrefix;

    console.log('API Keys:', keys.length, prefix);

    // The following line should cause a TypeScript error if uncommented:
    // const tenant = provider.config.tenant; // Error: Property 'tenant' does not exist
  }

  if (isCustomProvider(provider)) {
    // After type guard: provider.config is CustomAuthConfig
    const headerName = provider.config.headerName;

    console.log('Custom:', headerName);

    // The following line should cause a TypeScript error if uncommented:
    // const clientId = provider.config.clientId; // Error: Property 'clientId' does not exist
  }
}

// ============================================================================
// Example 4: Type-Safe Provider Iteration
// ============================================================================

function iterateProviders() {
  for (const [name, provider] of Object.entries(exampleAuth2.providers)) {
    console.log(`Processing provider: ${name}`);

    // Use type guards for type-safe access
    if (isEntraIdProvider(provider)) {
      console.log('  Type: Entra ID');
      console.log('  Tenant:', provider.config.tenant);
    } else if (isApiKeysProvider(provider)) {
      console.log('  Type: API Keys');
      console.log('  Keys:', provider.config.keys.length);
    } else if (isCustomProvider(provider)) {
      console.log('  Type: Custom');
      console.log('  Header:', provider.config.headerName);
    }
  }
}

// ============================================================================
// Example 5: ExtractProviderConfig Type Utility
// ============================================================================

const entraBuilder = auth.entra().tenant('test-tenant').clientId('test-client');

// Extract config type from builder
type ExtractedEntraConfig = ExtractProviderConfig<typeof entraBuilder>;

// This type should be EntraIdConfig
const extractedConfig: ExtractedEntraConfig = entraBuilder._build();

// These properties should be typed correctly
const extractedTenant: string = extractedConfig.tenant;
const extractedClientId: string = extractedConfig.clientId;

// ============================================================================
// Example 6: ProviderConfigByName Type Utility
// ============================================================================

const authDef = {
  Primary: auth.entra().tenant('t1').clientId('c1'),
  Secondary: auth.entra().tenant('t2').clientId('c2'),
  ApiKeys: auth
    .apiKeys()
    .enable()
    .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
};

// Extract specific provider config type by name
type PrimaryConfigType = ProviderConfigByName<typeof authDef, 'Primary'>;
type SecondaryConfigType = ProviderConfigByName<typeof authDef, 'Secondary'>;
type ApiKeysConfigType = ProviderConfigByName<typeof authDef, 'ApiKeys'>;

// All should be correctly typed
const primary: PrimaryConfigType = authDef.Primary._build();
const secondary: SecondaryConfigType = authDef.Secondary._build();
const apiKeys: ApiKeysConfigType = authDef.ApiKeys._build();

// ============================================================================
// Example 7: Complex Real-World Scenario
// ============================================================================

const productionAuth = defineAuth({
  // Primary: Entra ID for users
  EntraId: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID || 'tenant')
    .clientId(process.env.AZURE_CLIENT_ID || 'client')
    .audience('api://production-app')
    .validateTokens(async (token) => {
      // Custom validation
      return { valid: true };
    })
    .mapRoles((claims) => {
      // Map groups to roles
      return claims.groups || [];
    }),

  // API Keys for services
  ServiceKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90))
    .prefix('svc_')
    .keys([
      {
        id: 'monitoring',
        secret: process.env.MONITORING_KEY || 'key',
        roles: ['monitoring', 'readonly'],
      },
    ]),

  // Custom provider for legacy
  Legacy: auth
    .custom()
    .header('X-Legacy-Auth')
    .validateTokens(async (token) => {
      return { valid: false };
    })
    .mapRoles(() => ['legacy']),
});

// Type-safe access to all providers
const entraIdProvider = productionAuth.providers.EntraId;
const serviceKeysProvider = productionAuth.providers.ServiceKeys;
const legacyProvider = productionAuth.providers.Legacy;

// Type guards work correctly
if (isEntraIdProvider(entraIdProvider)) {
  console.log('Entra tenant:', entraIdProvider.config.tenant);
  console.log('Entra audience:', entraIdProvider.config.audience);
}

if (isApiKeysProvider(serviceKeysProvider)) {
  console.log('Service keys count:', serviceKeysProvider.config.keys.length);
  console.log('Key prefix:', serviceKeysProvider.config.keyPrefix);
}

if (isCustomProvider(legacyProvider)) {
  console.log('Legacy header:', legacyProvider.config.headerName);
}

// ============================================================================
// Example 8: IntelliSense Verification
// ============================================================================

function demonstrateIntelliSense() {
  const authExample = defineAuth({
    Primary: auth.entra().tenant('t').clientId('c'),
  });

  // IntelliSense should suggest: providers, primaryProvider, definition, _metadata, _raw
  const providers = authExample.providers;
  const primaryProvider = authExample.primaryProvider;
  const definition = authExample.definition;
  const metadata = authExample._metadata;

  // IntelliSense should suggest: Primary (and only Primary)
  const primary = authExample.providers.Primary;

  // Type guard enables IntelliSense for specific provider type
  if (isEntraIdProvider(primary)) {
    // IntelliSense should suggest: tenant, clientId, type, audience, issuer, etc.
    const tenant = primary.config.tenant;
    const clientId = primary.config.clientId;
    const type = primary.config.type;
  }
}

// ============================================================================
// Example 9: Compile-Time Error Prevention
// ============================================================================

function demonstrateErrorPrevention() {
  const authExample = defineAuth({
    Primary: auth.entra().tenant('t').clientId('c'),
  });

  // ✅ This should compile without errors
  const primary = authExample.providers.Primary;

  // ❌ The following lines should cause TypeScript errors if uncommented:

  // Error: Property 'NonExistent' does not exist
  // const nonExistent = authExample.providers.NonExistent;

  // Error: Property 'keys' does not exist on type 'EntraIdConfig'
  // const keys = primary.config.keys;

  // Error: Type 'EntraIdConfig' is not assignable to type 'ApiKeysConfig'
  // const apiKeysConfig: ApiKeysConfig = primary.config;
}

// ============================================================================
// Example 10: Type Inference with Method Chaining
// ============================================================================

const chainedAuth = defineAuth({
  Primary: auth
    .entra()
    .tenant('tenant-id')
    .clientId('client-id')
    .audience('api://app')
    .issuer('https://login.microsoftonline.com/tenant/v2.0')
    .validateTokens(async (token, context) => {
      console.log('Validating token with context:', context);
      return { valid: true };
    })
    .mapRoles((claims) => {
      const groups = claims.groups || [];
      return groups.map((g: any) => g.name || g);
    }),
});

// All method chain results should be properly typed
const chainedProvider = chainedAuth.providers.Primary;

if (isEntraIdProvider(chainedProvider)) {
  // All properties set via method chaining should be accessible
  const tenant = chainedProvider.config.tenant;
  const clientId = chainedProvider.config.clientId;
  const audience = chainedProvider.config.audience;
  const issuer = chainedProvider.config.issuer;
  const validator = chainedProvider.validate;
  const mapper = chainedProvider.mapRoles;

  console.log('Chained config:', { tenant, clientId, audience, issuer });
  console.log('Has validator:', !!validator);
  console.log('Has mapper:', !!mapper);
}

// ============================================================================
// Export Examples for Testing
// ============================================================================

export {
  exampleAuth1,
  exampleAuth2,
  productionAuth,
  handleProvider,
  iterateProviders,
  demonstrateIntelliSense,
  demonstrateErrorPrevention,
};
