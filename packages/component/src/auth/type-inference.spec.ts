/**
 * Tests for Authentication Type Inference System
 *
 * Note: TypeScript type inference is compile-time, so these tests focus on:
 * 1. Runtime type guard validation
 * 2. Type narrowing behavior
 * 3. Documentation of expected type behavior
 *
 * For true compile-time type testing, consider using:
 * - expect-type (https://github.com/mmkal/expect-type)
 * - tsd (https://github.com/SamVerschueren/tsd)
 *
 * Comprehensive test coverage for:
 * - ExtractProviderConfig - Provider config extraction
 * - InferAuthProviders - Provider type inference
 * - InferPrimaryProvider - Primary provider identification
 * - Type guards - Runtime type narrowing
 * - Provider filters - Type-level filtering
 * - Config type guards - Config type checking
 */

import { describe, it, expect } from 'vitest';
import { defineAuth } from './define-auth';
import { auth } from './providers';
import type {
  ExtractProviderConfig,
  ExtractAllConfigs,
  InferAuthProviders,
  InferPrimaryProvider,
  InferProviderNames,
  InferProviderTypes,
  ProviderConfigByName,
  ProviderByName,
  HasProvider,
} from './type-inference';
import {
  isEntraIdProvider,
  isApiKeysProvider,
  isCustomProvider,
  isProviderType,
  isEntraIdConfig,
  isApiKeysConfig,
  isCustomConfig,
} from './type-inference';
import type { EntraIdConfig } from './providers/entra';
import type { ApiKeysConfig } from './providers/api-keys';
import type { CustomAuthConfig } from './providers/custom';

// ============================================================================
// Provider Type Inference Tests
// ============================================================================

describe('Provider Type Inference', () => {
  describe('ExtractProviderConfig', () => {
    it('should extract config type from builder', () => {
      const builder = auth.entra().tenant('test-tenant').clientId('test-client-id');

      const config = builder._build();

      // Runtime check: config has correct type
      expect(config.type).toBe('entra-id');
      expect(config.tenant).toBe('test-tenant');
      expect(config.clientId).toBe('test-client-id');

      // Compile-time type test (documented):
      // type Config = ExtractProviderConfig<typeof builder>;
      // expectTypeOf<Config>().toEqualTypeOf<EntraIdConfig>();
    });

    it('should work with API Keys builder', () => {
      const builder = auth
        .apiKeys()
        .enable()
        .keys([{ id: 'test-key', secret: 'secret', roles: ['admin'] }]);

      const config = builder._build();

      expect(config.type).toBe('api-keys');
      expect(config.enabled).toBe(true);
      expect(config.keys).toHaveLength(1);

      // Compile-time: ExtractProviderConfig<typeof builder> === ApiKeysConfig
    });

    it('should work with Custom builder', () => {
      const builder = auth
        .custom()
        .validateTokens(async (token) => ({ valid: true }))
        .mapRoles(() => ['user']);

      const config = builder._build();

      expect(config.type).toBe('custom');
      expect(config.tokenValidator).toBeDefined();
      expect(config.roleMapper).toBeDefined();

      // Compile-time: ExtractProviderConfig<typeof builder> === CustomAuthConfig
    });
  });

  describe('ExtractAllConfigs', () => {
    it('should extract all config types from auth definition', () => {
      const authDef = {
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      };

      // Runtime check: verify both builders work
      const primaryConfig = authDef.Primary._build();
      const apiKeysConfig = authDef.ApiKeys._build();

      expect(primaryConfig.type).toBe('entra-id');
      expect(apiKeysConfig.type).toBe('api-keys');

      // Compile-time:
      // type Configs = ExtractAllConfigs<typeof authDef>;
      // expectTypeOf<Configs>().toEqualTypeOf<{
      //   Primary: EntraIdConfig;
      //   ApiKeys: ApiKeysConfig;
      // }>();
    });

    it('should handle single provider definition', () => {
      const authDef = {
        Primary: auth.entra().tenant('t').clientId('c'),
      };

      const config = authDef.Primary._build();
      expect(config.type).toBe('entra-id');

      // Compile-time: ExtractAllConfigs<typeof authDef> === { Primary: EntraIdConfig }
    });

    it('should handle multiple providers of same type', () => {
      const authDef = {
        Primary: auth.entra().tenant('t1').clientId('c1'),
        Secondary: auth.entra().tenant('t2').clientId('c2'),
      };

      const primary = authDef.Primary._build();
      const secondary = authDef.Secondary._build();

      expect(primary.type).toBe('entra-id');
      expect(secondary.type).toBe('entra-id');
      expect(primary.tenant).toBe('t1');
      expect(secondary.tenant).toBe('t2');

      // Compile-time: Both should be EntraIdConfig
    });
  });

  describe('InferAuthProviders', () => {
    it('should infer provider types from auth definition', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      });

      // Runtime checks
      expect(authentication.providers.Primary).toBeDefined();
      expect(authentication.providers.ApiKeys).toBeDefined();
      expect(authentication.providers.Primary.type).toBe('entra-id');
      expect(authentication.providers.ApiKeys.type).toBe('api-keys');

      // Compile-time:
      // type Providers = InferAuthProviders<typeof authentication.definition>;
      // expectTypeOf<Providers['Primary']>().toMatchTypeOf<{
      //   config: EntraIdConfig;
      // }>();
      // expectTypeOf<Providers['ApiKeys']>().toMatchTypeOf<{
      //   config: ApiKeysConfig;
      // }>();
    });

    it('should provide strongly-typed config access', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('test-tenant').clientId('test-client'),
      });

      const provider = authentication.providers.Primary;

      // Runtime: can access config properties
      expect(provider.config).toBeDefined();
      expect((provider.config as EntraIdConfig).tenant).toBe('test-tenant');
      expect((provider.config as EntraIdConfig).clientId).toBe('test-client');

      // Compile-time: provider.config should be typed as EntraIdConfig
    });
  });

  describe('InferPrimaryProvider', () => {
    it('should infer primary provider as first key', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
        Secondary: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      });

      // Runtime check
      expect(authentication.primaryProvider).toBe('Primary');

      // Compile-time:
      // type Primary = InferPrimaryProvider<typeof authentication.definition>;
      // expectTypeOf<Primary>().toEqualTypeOf<'Primary'>();
    });

    it('should work with single provider', () => {
      const authentication = defineAuth({
        Only: auth.entra().tenant('t').clientId('c'),
      });

      expect(authentication.primaryProvider).toBe('Only');

      // Compile-time: Primary should be 'Only'
    });
  });

  describe('InferProviderNames', () => {
    it('should infer all provider names as union', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
        Custom: auth.custom().validateTokens(async () => ({ valid: true })),
      });

      const names = Object.keys(authentication.providers);

      expect(names).toContain('Primary');
      expect(names).toContain('ApiKeys');
      expect(names).toContain('Custom');
      expect(names).toHaveLength(3);

      // Compile-time:
      // type Names = InferProviderNames<typeof authentication.definition>;
      // expectTypeOf<Names>().toEqualTypeOf<'Primary' | 'ApiKeys' | 'Custom'>();
    });
  });

  describe('InferProviderTypes', () => {
    it('should infer provider type strings as union', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      });

      const types = Object.values(authentication.providers).map((p) => p.type);

      expect(types).toContain('entra-id');
      expect(types).toContain('api-keys');

      // Compile-time:
      // type Types = InferProviderTypes<typeof authentication.definition>;
      // expectTypeOf<Types>().toEqualTypeOf<'entra-id' | 'api-keys'>();
    });
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('Type Guards', () => {
  describe('isEntraIdProvider', () => {
    it('should identify Entra ID providers', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
      });

      const provider = authentication.providers.Primary;

      expect(isEntraIdProvider(provider)).toBe(true);

      if (isEntraIdProvider(provider)) {
        // Type should be narrowed to EntraIdConfig
        expect(provider.config.type).toBe('entra-id');
        expect(provider.config.tenant).toBe('t');
        expect(provider.config.clientId).toBe('c');
      }
    });

    it('should reject non-Entra ID providers', () => {
      const authentication = defineAuth({
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      });

      const provider = authentication.providers.ApiKeys;

      expect(isEntraIdProvider(provider)).toBe(false);
    });

    it('should enable type-safe config access', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('test-tenant').clientId('test-client'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      });

      const provider = authentication.providers.Primary;

      if (isEntraIdProvider(provider)) {
        // Config should be typed as EntraIdConfig
        expect(provider.config.tenant).toBe('test-tenant');
        expect(provider.config.clientId).toBe('test-client');

        // These properties should exist on EntraIdConfig
        const audience = provider.config.audience; // Should not error
        const issuer = provider.config.issuer; // Should not error

        // Compile-time: provider.config is EntraIdConfig
      }
    });
  });

  describe('isApiKeysProvider', () => {
    it('should identify API Keys providers', () => {
      const authentication = defineAuth({
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      });

      const provider = authentication.providers.ApiKeys;

      expect(isApiKeysProvider(provider)).toBe(true);

      if (isApiKeysProvider(provider)) {
        // Type should be narrowed to ApiKeysConfig
        expect(provider.config.type).toBe('api-keys');
        expect(provider.config.enabled).toBe(true);
        expect(provider.config.keys).toHaveLength(1);
      }
    });

    it('should reject non-API Keys providers', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
      });

      const provider = authentication.providers.Primary;

      expect(isApiKeysProvider(provider)).toBe(false);
    });

    it('should enable type-safe key access', () => {
      const authentication = defineAuth({
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([
            { id: 'k1', secret: 's1', roles: ['admin'] },
            { id: 'k2', secret: 's2', roles: ['user'] },
          ])
          .prefix('atk_'),
      });

      const provider = authentication.providers.ApiKeys;

      if (isApiKeysProvider(provider)) {
        expect(provider.config.keys).toHaveLength(2);
        expect(provider.config.keys[0].id).toBe('k1');
        expect(provider.config.keys[1].id).toBe('k2');
        expect(provider.config.keyPrefix).toBe('atk_');

        // Compile-time: provider.config is ApiKeysConfig
      }
    });
  });

  describe('isCustomProvider', () => {
    it('should identify Custom providers', () => {
      const authentication = defineAuth({
        Custom: auth
          .custom()
          .validateTokens(async (token) => ({ valid: true }))
          .mapRoles(() => ['user']),
      });

      const provider = authentication.providers.Custom;

      expect(isCustomProvider(provider)).toBe(true);

      if (isCustomProvider(provider)) {
        // Type should be narrowed to CustomAuthConfig
        expect(provider.config.type).toBe('custom');
        // Note: tokenValidator and roleMapper are moved to provider.validate and provider.mapRoles
        expect(provider.validate).toBeDefined();
        expect(provider.mapRoles).toBeDefined();
      }
    });

    it('should reject non-Custom providers', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
      });

      const provider = authentication.providers.Primary;

      expect(isCustomProvider(provider)).toBe(false);
    });

    it('should enable type-safe validator access', () => {
      const validator = async (token: string) => ({ valid: true, userId: 'test' });
      const mapper = (claims: any) => ['admin'];

      const authentication = defineAuth({
        Custom: auth.custom().validateTokens(validator).mapRoles(mapper).header('X-Custom-Auth'),
      });

      const provider = authentication.providers.Custom;

      if (isCustomProvider(provider)) {
        // validator and mapper are in provider.validate and provider.mapRoles
        expect(provider.validate).toBe(validator);
        expect(provider.mapRoles).toBe(mapper);
        expect(provider.config.headerName).toBe('X-Custom-Auth');

        // Compile-time: provider.config is CustomAuthConfig
      }
    });
  });

  describe('isProviderType', () => {
    it('should check provider type generically', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      });

      const entraProvider = authentication.providers.Primary;
      const apiKeysProvider = authentication.providers.ApiKeys;

      expect(isProviderType(entraProvider, 'entra-id')).toBe(true);
      expect(isProviderType(entraProvider, 'api-keys')).toBe(false);

      expect(isProviderType(apiKeysProvider, 'api-keys')).toBe(true);
      expect(isProviderType(apiKeysProvider, 'entra-id')).toBe(false);
    });

    it('should work with custom type strings', () => {
      const authentication = defineAuth({
        Custom: auth.custom().validateTokens(async () => ({ valid: true })),
      });

      const provider = authentication.providers.Custom;

      expect(isProviderType(provider, 'custom')).toBe(true);
      expect(isProviderType(provider, 'entra-id')).toBe(false);
    });
  });
});

// ============================================================================
// Config Type Guard Tests
// ============================================================================

describe('Config Type Guards', () => {
  describe('isEntraIdConfig', () => {
    it('should identify Entra ID configs', () => {
      const config: EntraIdConfig = {
        type: 'entra-id',
        tenant: 'test-tenant',
        clientId: 'test-client',
      };

      expect(isEntraIdConfig(config)).toBe(true);

      if (isEntraIdConfig(config)) {
        expect(config.tenant).toBe('test-tenant');
        expect(config.clientId).toBe('test-client');
      }
    });

    it('should reject non-Entra ID configs', () => {
      const config: ApiKeysConfig = {
        type: 'api-keys',
        enabled: true,
        keys: [],
      };

      expect(isEntraIdConfig(config)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(isEntraIdConfig(null as any)).toBe(false);
      expect(isEntraIdConfig(undefined as any)).toBe(false);
      expect(isEntraIdConfig({})).toBe(false);
    });
  });

  describe('isApiKeysConfig', () => {
    it('should identify API Keys configs', () => {
      const config: ApiKeysConfig = {
        type: 'api-keys',
        enabled: true,
        keys: [{ id: 'k1', secret: 's1', roles: ['admin'] }],
      };

      expect(isApiKeysConfig(config)).toBe(true);

      if (isApiKeysConfig(config)) {
        expect(config.enabled).toBe(true);
        expect(config.keys).toHaveLength(1);
      }
    });

    it('should reject non-API Keys configs', () => {
      const config: EntraIdConfig = {
        type: 'entra-id',
        tenant: 't',
        clientId: 'c',
      };

      expect(isApiKeysConfig(config)).toBe(false);
    });
  });

  describe('isCustomConfig', () => {
    it('should identify Custom configs', () => {
      const config: CustomAuthConfig = {
        type: 'custom',
        tokenValidator: async () => ({ valid: true }),
      };

      expect(isCustomConfig(config)).toBe(true);

      if (isCustomConfig(config)) {
        expect(config.tokenValidator).toBeDefined();
      }
    });

    it('should reject non-Custom configs', () => {
      const config: EntraIdConfig = {
        type: 'entra-id',
        tenant: 't',
        clientId: 'c',
      };

      expect(isCustomConfig(config)).toBe(false);
    });
  });
});

// ============================================================================
// Utility Type Tests
// ============================================================================

describe('Utility Types', () => {
  describe('ProviderConfigByName', () => {
    it('should extract config type by provider name', () => {
      const authDef = {
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      };

      // Runtime checks
      const primaryConfig = authDef.Primary._build();
      const apiKeysConfig = authDef.ApiKeys._build();

      expect(primaryConfig.type).toBe('entra-id');
      expect(apiKeysConfig.type).toBe('api-keys');

      // Compile-time:
      // type PrimaryConfig = ProviderConfigByName<typeof authDef, 'Primary'>;
      // expectTypeOf<PrimaryConfig>().toEqualTypeOf<EntraIdConfig>();
      //
      // type ApiKeysConfig = ProviderConfigByName<typeof authDef, 'ApiKeys'>;
      // expectTypeOf<ApiKeysConfig>().toEqualTypeOf<ApiKeysConfig>();
    });
  });

  describe('ProviderByName', () => {
    it('should extract provider by name', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      });

      const primary = authentication.providers.Primary;
      const apiKeys = authentication.providers.ApiKeys;

      expect(primary.type).toBe('entra-id');
      expect(apiKeys.type).toBe('api-keys');

      // Compile-time:
      // type Primary = ProviderByName<typeof authentication, 'Primary'>;
      // expectTypeOf<Primary['config']>().toEqualTypeOf<EntraIdConfig>();
    });
  });

  describe('HasProvider', () => {
    it('should check provider existence at type level', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
      });

      // Runtime check
      expect('Primary' in authentication.providers).toBe(true);
      expect('Secondary' in authentication.providers).toBe(false);

      // Compile-time:
      // type HasPrimary = HasProvider<typeof authentication, 'Primary'>;
      // expectTypeOf<HasPrimary>().toEqualTypeOf<true>();
      //
      // type HasSecondary = HasProvider<typeof authentication, 'Secondary'>;
      // expectTypeOf<HasSecondary>().toEqualTypeOf<false>();
    });
  });
});

// ============================================================================
// Complex Type Scenarios
// ============================================================================

describe('Complex Type Scenarios', () => {
  describe('multiple providers of different types', () => {
    it('should handle all three provider types together', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('test-tenant').clientId('test-client').audience('api://test'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([
            { id: 'k1', secret: 's1', roles: ['admin'] },
            { id: 'k2', secret: 's2', roles: ['user'] },
          ])
          .prefix('atk_'),
        Custom: auth
          .custom()
          .validateTokens(async (token) => ({
            valid: true,
            userId: 'test',
            claims: { sub: 'test' },
          }))
          .mapRoles(() => ['viewer'])
          .header('X-Custom-Auth'),
      });

      // Runtime checks
      expect(authentication.providers.Primary.type).toBe('entra-id');
      expect(authentication.providers.ApiKeys.type).toBe('api-keys');
      expect(authentication.providers.Custom.type).toBe('custom');

      // Type guards work correctly
      expect(isEntraIdProvider(authentication.providers.Primary)).toBe(true);
      expect(isApiKeysProvider(authentication.providers.ApiKeys)).toBe(true);
      expect(isCustomProvider(authentication.providers.Custom)).toBe(true);

      // Cross-type guards should fail
      expect(isEntraIdProvider(authentication.providers.ApiKeys)).toBe(false);
      expect(isApiKeysProvider(authentication.providers.Custom)).toBe(false);
      expect(isCustomProvider(authentication.providers.Primary)).toBe(false);

      // Compile-time: All providers should be correctly typed
    });
  });

  describe('provider access patterns', () => {
    it('should enable type-safe provider iteration', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      });

      // Iterate over providers
      const providerNames = Object.keys(authentication.providers);
      expect(providerNames).toHaveLength(2);

      for (const name of providerNames) {
        const provider = authentication.providers[name as keyof typeof authentication.providers];
        expect(provider).toBeDefined();
        expect(provider.type).toBeDefined();
        expect(provider.config).toBeDefined();
      }
    });

    it('should support conditional provider access', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
      });

      // Access by type
      const providers = Object.values(authentication.providers);

      for (const provider of providers) {
        if (isEntraIdProvider(provider)) {
          expect(provider.config.tenant).toBe('t');
        } else if (isApiKeysProvider(provider)) {
          expect(provider.config.keys).toHaveLength(1);
        }
      }
    });
  });

  describe('type inference with complex configs', () => {
    it('should preserve all config properties', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .audience('api://test')
          .issuer('https://login.microsoftonline.com/tenant/v2.0')
          .validateTokens(async (token) => ({ valid: true }))
          .mapRoles((claims) => ['admin']),
      });

      const provider = authentication.providers.Primary;

      if (isEntraIdProvider(provider)) {
        expect(provider.config.tenant).toBe('test-tenant');
        expect(provider.config.clientId).toBe('test-client');
        expect(provider.config.audience).toBe('api://test');
        expect(provider.config.issuer).toBe('https://login.microsoftonline.com/tenant/v2.0');
        // tokenValidator and roleMapper are in provider.validate and provider.mapRoles
        expect(provider.validate).toBeDefined();
        expect(provider.mapRoles).toBeDefined();

        // Compile-time: All properties should be typed correctly
      }
    });

    it('should handle optional config properties', () => {
      const authentication = defineAuth({
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
        // No rotation period or prefix
      });

      const provider = authentication.providers.ApiKeys;

      if (isApiKeysProvider(provider)) {
        expect(provider.config.enabled).toBe(true);
        expect(provider.config.keys).toHaveLength(1);
        expect(provider.config.rotationPeriod).toBeUndefined();
        expect(provider.config.keyPrefix).toBeUndefined();

        // Compile-time: Optional properties should be typed correctly
      }
    });
  });
});

// ============================================================================
// IntelliSense and Autocomplete Tests
// ============================================================================

describe('IntelliSense and Autocomplete', () => {
  it('should provide autocomplete for provider names', () => {
    const authentication = defineAuth({
      Primary: auth.entra().tenant('t').clientId('c'),
      Secondary: auth
        .apiKeys()
        .enable()
        .keys([{ id: 'k1', secret: 's1', roles: ['admin'] }]),
    });

    // These accesses should have IntelliSense
    const primary = authentication.providers.Primary;
    const secondary = authentication.providers.Secondary;

    expect(primary).toBeDefined();
    expect(secondary).toBeDefined();

    // Compile-time: IntelliSense should suggest 'Primary' and 'Secondary'
  });

  it('should provide autocomplete for config properties', () => {
    const authentication = defineAuth({
      Primary: auth.entra().tenant('t').clientId('c').audience('a'),
    });

    const provider = authentication.providers.Primary;

    if (isEntraIdProvider(provider)) {
      // IntelliSense should suggest: tenant, clientId, audience, issuer, etc.
      const tenant = provider.config.tenant;
      const clientId = provider.config.clientId;
      const audience = provider.config.audience;

      expect(tenant).toBe('t');
      expect(clientId).toBe('c');
      expect(audience).toBe('a');
    }
  });

  it('should provide type-safe method suggestions', () => {
    const authentication = defineAuth({
      Primary: auth.entra().tenant('t').clientId('c'),
    });

    // IntelliSense should suggest: providers, primaryProvider, definition, _metadata, _raw
    expect(authentication.providers).toBeDefined();
    expect(authentication.primaryProvider).toBeDefined();
    expect(authentication.definition).toBeDefined();
    expect(authentication._metadata).toBeDefined();
    expect(authentication._raw).toBeDefined();
  });
});
