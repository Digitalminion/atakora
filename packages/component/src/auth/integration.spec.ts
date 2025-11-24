/**
 * Authentication Integration Tests
 *
 * Tests for multi-provider authentication configurations and
 * integration with defineAuth.
 */

import { describe, it, expect } from 'vitest';
import { defineAuth } from './define-auth';
import { auth } from './providers';
import { days } from '../common/duration';

describe('Authentication Integration', () => {
  describe('defineAuth with API Keys', () => {
    it('should create auth object with API keys provider', () => {
      const authentication = defineAuth({
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'service-1', secret: 'secret1', roles: ['service'] }]),
      });

      expect(authentication).toBeDefined();
      expect(authentication.providers.ApiKeys).toBeDefined();
      expect(authentication.providers.ApiKeys.type).toBe('api-keys');
      expect(authentication.primaryProvider).toBe('ApiKeys');
    });

    it('should process API keys configuration correctly', () => {
      const authentication = defineAuth({
        ApiKeys: auth
          .apiKeys()
          .enable()
          .rotateEvery(days(90))
          .prefix('atk_')
          .keys([
            { id: 'service-1', secret: 'secret1', roles: ['service'] },
            { id: 'admin-cli', secret: 'secret2', roles: ['admin'] },
          ]),
      });

      const config = authentication.providers.ApiKeys.config as any;
      expect(config.enabled).toBe(true);
      expect(config.keys).toHaveLength(2);
      expect(config.keyPrefix).toBe('atk_');
      expect(config.rotationPeriod?.toDays()).toBe(90);
    });
  });

  describe('defineAuth with Entra ID', () => {
    it('should create auth object with Entra ID provider', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('test-tenant-id').clientId('test-client-id'),
      });

      expect(authentication).toBeDefined();
      expect(authentication.providers.Primary).toBeDefined();
      expect(authentication.providers.Primary.type).toBe('entra-id');
      expect(authentication.primaryProvider).toBe('Primary');
    });
  });

  describe('defineAuth with multiple providers', () => {
    it('should support both Entra ID and API Keys', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('test-tenant-id').clientId('test-client-id'),

        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'service-1', secret: 'secret1', roles: ['service'] }]),
      });

      expect(authentication.providers.Primary).toBeDefined();
      expect(authentication.providers.ApiKeys).toBeDefined();
      expect(authentication.providers.Primary.type).toBe('entra-id');
      expect(authentication.providers.ApiKeys.type).toBe('api-keys');
      expect(authentication.primaryProvider).toBe('Primary');
    });

    it('should set first provider as primary', () => {
      const auth1 = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'test', secret: 's', roles: ['admin'] }]),
      });

      expect(auth1.primaryProvider).toBe('Primary');

      const auth2 = defineAuth({
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'test', secret: 's', roles: ['admin'] }]),
        Primary: auth.entra().tenant('t').clientId('c'),
      });

      expect(auth2.primaryProvider).toBe('ApiKeys');
    });

    it('should include metadata for multiple providers', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'test', secret: 's', roles: ['admin'] }]),
      });

      expect(authentication._metadata.providerNames).toEqual(['Primary', 'ApiKeys']);
      expect(authentication._metadata.version).toBe('1.0.0');
      expect(authentication._metadata.createdAt).toBeDefined();
    });
  });

  describe('realistic use cases', () => {
    it('should support typical enterprise configuration', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant(process.env.AZURE_TENANT_ID || 'test-tenant')
          .clientId(process.env.AZURE_CLIENT_ID || 'test-client')
          .audience(process.env.AZURE_AUDIENCE || 'test-audience'),

        ApiKeys: auth
          .apiKeys()
          .enable()
          .rotateEvery(days(90))
          .keys([
            {
              id: 'monitoring-service',
              secret: process.env.MONITORING_KEY || 'test-key',
              roles: ['monitoring', 'readonly'],
            },
            {
              id: 'admin-cli',
              secret: process.env.ADMIN_KEY || 'test-key',
              roles: ['admin', 'service'],
            },
          ])
          .prefix('atk_'),
      });

      expect(authentication.providers.Primary.type).toBe('entra-id');
      expect(authentication.providers.ApiKeys.type).toBe('api-keys');
      expect(authentication.primaryProvider).toBe('Primary');

      const apiKeysConfig = authentication.providers.ApiKeys.config as any;
      expect(apiKeysConfig.keys).toHaveLength(2);
    });

    it('should support API keys only configuration', () => {
      const authentication = defineAuth({
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([
            {
              id: 'service-account',
              secret: process.env.SERVICE_KEY || 'test-key',
              roles: ['service'],
            },
          ]),
      });

      expect(authentication.providers.ApiKeys.type).toBe('api-keys');
      expect(authentication.primaryProvider).toBe('ApiKeys');
    });

    it('should support multiple service accounts with different permissions', () => {
      const authentication = defineAuth({
        ServiceAccounts: auth
          .apiKeys()
          .enable()
          .rotateEvery(days(30))
          .keys([
            {
              id: 'data-pipeline',
              secret: 'pipeline-key',
              roles: ['data-write', 'storage-access'],
            },
            {
              id: 'reporting-service',
              secret: 'reporting-key',
              roles: ['data-read', 'analytics'],
            },
            {
              id: 'backup-service',
              secret: 'backup-key',
              roles: ['data-read', 'backup'],
            },
          ]),
      });

      const config = authentication.providers.ServiceAccounts.config as any;
      expect(config.keys).toHaveLength(3);
      expect(config.keys[0].roles).toContain('data-write');
      expect(config.keys[1].roles).toContain('analytics');
      expect(config.keys[2].roles).toContain('backup');
    });
  });

  describe('type inference', () => {
    it('should infer provider types correctly', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'test', secret: 's', roles: ['admin'] }]),
      });

      // Type assertion to verify type inference works
      const primaryType: 'entra-id' = authentication.providers.Primary.type as 'entra-id';
      const apiKeysType: 'api-keys' = authentication.providers.ApiKeys.type as 'api-keys';

      expect(primaryType).toBe('entra-id');
      expect(apiKeysType).toBe('api-keys');
    });

    it('should infer primary provider name', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('t').clientId('c'),
      });

      const primaryName: 'Primary' = authentication.primaryProvider as 'Primary';
      expect(primaryName).toBe('Primary');
    });
  });

  describe('validation', () => {
    it('should validate provider names are PascalCase', () => {
      expect(() => {
        defineAuth({
          'invalid-name': auth
            .apiKeys()
            .enable()
            .keys([{ id: 'test', secret: 's', roles: ['admin'] }]),
        } as any);
      }).toThrow();
    });

    it('should require at least one provider', () => {
      expect(() => {
        defineAuth({});
      }).toThrow();
    });

    it('should validate each provider is a builder', () => {
      expect(() => {
        defineAuth({
          Invalid: 'not-a-builder' as any,
        });
      }).toThrow();
    });
  });

  describe('provider configuration access', () => {
    it('should allow access to provider configuration', () => {
      const authentication = defineAuth({
        ApiKeys: auth
          .apiKeys()
          .enable()
          .prefix('atk_')
          .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }]),
      });

      const config = authentication.providers.ApiKeys.config as any;
      expect(config.type).toBe('api-keys');
      expect(config.enabled).toBe(true);
      expect(config.keyPrefix).toBe('atk_');
    });

    it('should provide access to raw definition', () => {
      const apiKeysBuilder = auth
        .apiKeys()
        .enable()
        .keys([{ id: 'test', secret: 's', roles: ['admin'] }]);

      const authentication = defineAuth({
        ApiKeys: apiKeysBuilder,
      });

      expect(authentication._raw.ApiKeys).toBe(apiKeysBuilder);
    });
  });
});
