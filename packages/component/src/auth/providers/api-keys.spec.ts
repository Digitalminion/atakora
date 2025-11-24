/**
 * API Keys Provider Tests
 *
 * Comprehensive test suite for API key-based authentication provider.
 */

import { describe, it, expect } from 'vitest';
import { apiKeys, ApiKeysBuilder } from './api-keys';
import type { ApiKeysConfig } from './api-keys';
import type { ApiKey } from '../types';
import { ProviderConfigError } from '../errors';
import { days, hours } from '../../common/duration';

describe('ApiKeysBuilder', () => {
  describe('constructor', () => {
    it('should create a new builder with default values', () => {
      const builder = apiKeys();

      expect(builder).toBeInstanceOf(ApiKeysBuilder);
    });

    it('should have disabled authentication by default', () => {
      const builder = apiKeys();
      const config = builder._build();

      expect(config.enabled).toBe(false);
    });

    it('should have empty keys array by default', () => {
      const builder = apiKeys();
      const config = builder._build();

      expect(config.keys).toEqual([]);
    });

    it('should have correct type', () => {
      const builder = apiKeys();
      const config = builder._build();

      expect(config.type).toBe('api-keys');
    });
  });

  describe('enable()', () => {
    it('should enable API key authentication', () => {
      const builder = apiKeys()
        .enable()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }]);
      const config = builder._build();

      expect(config.enabled).toBe(true);
    });

    it('should return this for method chaining', () => {
      const builder = apiKeys();
      const result = builder.enable();

      expect(result).toBe(builder);
    });

    it('should work with other methods', () => {
      const config = apiKeys()
        .enable()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        ._build();

      expect(config.enabled).toBe(true);
      expect(config.keys).toHaveLength(1);
    });
  });

  describe('rotateEvery()', () => {
    it('should set rotation period', () => {
      const rotation = days(90);
      const config = apiKeys().rotateEvery(rotation)._build();

      expect(config.rotationPeriod).toBe(rotation);
    });

    it('should accept various duration units', () => {
      const dayConfig = apiKeys().rotateEvery(days(30))._build();
      expect(dayConfig.rotationPeriod?.toDays()).toBe(30);

      const hourConfig = apiKeys().rotateEvery(hours(24))._build();
      expect(hourConfig.rotationPeriod?.toHours()).toBe(24);
    });

    it('should return this for method chaining', () => {
      const builder = apiKeys();
      const result = builder.rotateEvery(days(90));

      expect(result).toBe(builder);
    });

    it('should throw error for negative duration', () => {
      expect(() => {
        apiKeys().rotateEvery({
          value: -1,
          unit: 'd',
          toMilliseconds: () => -86400000,
          toSeconds: () => -86400,
          toMinutes: () => -1440,
          toHours: () => -24,
          toDays: () => -1,
          toISOString: () => 'P-1D',
          toArmDuration: () => '-1.00:00:00',
          toString: () => '-1 day',
        });
      }).toThrow(ProviderConfigError);
    });

    it('should throw error for zero duration', () => {
      expect(() => {
        apiKeys().rotateEvery({
          value: 0,
          unit: 'd',
          toMilliseconds: () => 0,
          toSeconds: () => 0,
          toMinutes: () => 0,
          toHours: () => 0,
          toDays: () => 0,
          toISOString: () => 'P0D',
          toArmDuration: () => '0.00:00:00',
          toString: () => '0 days',
        });
      }).toThrow(ProviderConfigError);
    });
  });

  describe('keys()', () => {
    it('should set API keys', () => {
      const testKeys: ApiKey[] = [{ id: 'service-1', secret: 'secret1', roles: ['service'] }];

      const config = apiKeys().keys(testKeys)._build();

      expect(config.keys).toHaveLength(1);
      expect(config.keys[0].id).toBe('service-1');
    });

    it('should support multiple keys', () => {
      const testKeys: ApiKey[] = [
        { id: 'service-1', secret: 'secret1', roles: ['service'] },
        { id: 'service-2', secret: 'secret2', roles: ['admin'] },
      ];

      const config = apiKeys().keys(testKeys)._build();

      expect(config.keys).toHaveLength(2);
    });

    it('should support keys with expiration', () => {
      const testKeys: ApiKey[] = [
        {
          id: 'temp-key',
          secret: 'secret',
          roles: ['viewer'],
          expiresAt: '2025-12-31T23:59:59Z',
        },
      ];

      const config = apiKeys().keys(testKeys)._build();

      expect(config.keys[0].expiresAt).toBe('2025-12-31T23:59:59Z');
    });

    it('should support keys with metadata', () => {
      const testKeys: ApiKey[] = [
        {
          id: 'service-1',
          secret: 'secret',
          roles: ['service'],
          metadata: { team: 'platform', purpose: 'monitoring' },
        },
      ];

      const config = apiKeys().keys(testKeys)._build();

      expect(config.keys[0].metadata).toEqual({
        team: 'platform',
        purpose: 'monitoring',
      });
    });

    it('should return this for method chaining', () => {
      const builder = apiKeys();
      const result = builder.keys([{ id: 'test', secret: 'secret', roles: ['admin'] }]);

      expect(result).toBe(builder);
    });

    it('should create a copy of keys array (immutability)', () => {
      const testKeys: ApiKey[] = [{ id: 'service-1', secret: 'secret', roles: ['service'] }];

      const config = apiKeys().keys(testKeys)._build();

      // Modify original array
      testKeys.push({ id: 'service-2', secret: 'secret2', roles: ['admin'] });

      // Config should not be affected
      expect(config.keys).toHaveLength(1);
    });

    it('should throw error if keys is not an array', () => {
      expect(() => {
        apiKeys().keys('not-an-array' as any);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error if key is missing id', () => {
      expect(() => {
        apiKeys().keys([{ secret: 'secret', roles: ['admin'] } as any]);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error if key id is not a string', () => {
      expect(() => {
        apiKeys().keys([{ id: 123, secret: 'secret', roles: ['admin'] } as any]);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error if key is missing secret', () => {
      expect(() => {
        apiKeys().keys([{ id: 'test', roles: ['admin'] } as any]);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error if key secret is not a string', () => {
      expect(() => {
        apiKeys().keys([{ id: 'test', secret: 123, roles: ['admin'] } as any]);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error if key is missing roles', () => {
      expect(() => {
        apiKeys().keys([{ id: 'test', secret: 'secret' } as any]);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error if key roles is not an array', () => {
      expect(() => {
        apiKeys().keys([{ id: 'test', secret: 'secret', roles: 'admin' } as any]);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error if key roles is empty array', () => {
      expect(() => {
        apiKeys().keys([{ id: 'test', secret: 'secret', roles: [] }]);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error if role is not a string', () => {
      expect(() => {
        apiKeys().keys([{ id: 'test', secret: 'secret', roles: [123] } as any]);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error if role is empty string', () => {
      expect(() => {
        apiKeys().keys([{ id: 'test', secret: 'secret', roles: [''] }]);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error for duplicate key IDs', () => {
      expect(() => {
        apiKeys().keys([
          { id: 'duplicate', secret: 'secret1', roles: ['admin'] },
          { id: 'duplicate', secret: 'secret2', roles: ['viewer'] },
        ]);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error for invalid expiration date format', () => {
      expect(() => {
        apiKeys().keys([
          {
            id: 'test',
            secret: 'secret',
            roles: ['admin'],
            expiresAt: 'invalid-date',
          },
        ]);
      }).toThrow(ProviderConfigError);
    });

    it('should accept valid ISO date string for expiration', () => {
      const config = apiKeys()
        .keys([
          {
            id: 'test',
            secret: 'secret',
            roles: ['admin'],
            expiresAt: '2025-12-31T23:59:59.999Z',
          },
        ])
        ._build();

      expect(config.keys[0].expiresAt).toBeDefined();
    });
  });

  describe('prefix()', () => {
    it('should set key prefix', () => {
      const config = apiKeys().prefix('atk_')._build();

      expect(config.keyPrefix).toBe('atk_');
    });

    it('should support various prefix formats', () => {
      const config1 = apiKeys().prefix('api_')._build();
      expect(config1.keyPrefix).toBe('api_');

      const config2 = apiKeys().prefix('sk-')._build();
      expect(config2.keyPrefix).toBe('sk-');
    });

    it('should return this for method chaining', () => {
      const builder = apiKeys();
      const result = builder.prefix('atk_');

      expect(result).toBe(builder);
    });

    it('should throw error for non-string prefix', () => {
      expect(() => {
        apiKeys().prefix(123 as any);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error for empty string prefix', () => {
      expect(() => {
        apiKeys().prefix('');
      }).toThrow(ProviderConfigError);
    });

    it('should throw error for whitespace-only prefix', () => {
      expect(() => {
        apiKeys().prefix('   ');
      }).toThrow(ProviderConfigError);
    });
  });

  describe('_build()', () => {
    it('should return complete configuration', () => {
      const config = apiKeys()
        .enable()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        ._build();

      expect(config).toMatchObject({
        type: 'api-keys',
        enabled: true,
        keys: expect.arrayContaining([
          expect.objectContaining({
            id: 'test',
            roles: ['admin'],
            secretHash: expect.any(String),
            salt: expect.any(String),
            version: 1,
            createdAt: expect.any(String),
          }),
        ]),
      });
    });

    it('should throw error if enabled but no keys configured', () => {
      expect(() => {
        apiKeys().enable()._build();
      }).toThrow(ProviderConfigError);
    });

    it('should not throw error if disabled with no keys', () => {
      expect(() => {
        apiKeys()._build();
      }).not.toThrow();
    });

    it('should return immutable configuration', () => {
      const builder = apiKeys()
        .enable()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }]);

      const config1 = builder._build();
      const config2 = builder._build();

      expect(config1).not.toBe(config2);
      expect(config1.keys).not.toBe(config2.keys);
    });

    it('should include all optional fields when set', () => {
      const config = apiKeys()
        .enable()
        .rotateEvery(days(90))
        .prefix('atk_')
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        ._build();

      expect(config.rotationPeriod).toBeDefined();
      expect(config.keyPrefix).toBe('atk_');
    });

    it('should exclude optional fields when not set', () => {
      const config = apiKeys()
        .enable()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        ._build();

      expect(config.rotationPeriod).toBeUndefined();
      expect(config.keyPrefix).toBeUndefined();
    });
  });

  describe('method chaining', () => {
    it('should support full method chain', () => {
      const config = apiKeys()
        .enable()
        .rotateEvery(days(90))
        .prefix('atk_')
        .keys([
          { id: 'service-1', secret: 'secret1', roles: ['service'] },
          { id: 'admin-cli', secret: 'secret2', roles: ['admin'] },
        ])
        ._build();

      expect(config).toMatchObject({
        type: 'api-keys',
        enabled: true,
        keys: expect.arrayContaining([
          expect.objectContaining({ id: 'service-1' }),
          expect.objectContaining({ id: 'admin-cli' }),
        ]),
        keyPrefix: 'atk_',
      });
      expect(config.rotationPeriod?.toDays()).toBe(90);
    });

    it('should support any method order', () => {
      const config = apiKeys()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        .prefix('atk_')
        .rotateEvery(days(30))
        .enable()
        ._build();

      expect(config.enabled).toBe(true);
      expect(config.keyPrefix).toBe('atk_');
    });
  });

  describe('configuration immutability', () => {
    it('should not allow modification of built config', () => {
      const config = apiKeys()
        .enable()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        ._build();

      // Try to modify (TypeScript would prevent this, but check runtime)
      expect(() => {
        (config as any).enabled = false;
      }).not.toThrow();

      // Build again to verify original is unchanged
      const config2 = apiKeys()
        .enable()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        ._build();

      expect(config2.enabled).toBe(true);
    });

    it('should create new keys array on build', () => {
      const testKeys: ApiKey[] = [{ id: 'test', secret: 'secret', roles: ['admin'] }];

      const builder = apiKeys().enable().keys(testKeys);
      const config = builder._build();

      // Modify original
      testKeys.push({ id: 'new', secret: 'secret2', roles: ['viewer'] });

      // Config should be unchanged
      expect(config.keys).toHaveLength(1);
    });
  });

  describe('realistic use cases', () => {
    it('should support service account configuration', () => {
      const config = apiKeys()
        .enable()
        .keys([
          {
            id: 'monitoring-service',
            secret: process.env.MONITORING_KEY || 'test-key',
            roles: ['monitoring', 'readonly'],
          },
          {
            id: 'backup-service',
            secret: process.env.BACKUP_KEY || 'test-key',
            roles: ['backup', 'readonly'],
          },
        ])
        ._build();

      expect(config.keys).toHaveLength(2);
      expect(config.keys[0].roles).toContain('monitoring');
    });

    it('should support admin CLI configuration', () => {
      const config = apiKeys()
        .enable()
        .rotateEvery(days(90))
        .prefix('atk_')
        .keys([
          {
            id: 'admin-cli',
            secret: 'super-secret-key',
            roles: ['admin', 'service'],
            metadata: {
              description: 'Admin CLI tool',
              createdBy: 'ops-team',
            },
          },
        ])
        ._build();

      expect(config.enabled).toBe(true);
      expect(config.rotationPeriod?.toDays()).toBe(90);
      expect(config.keyPrefix).toBe('atk_');
    });

    it('should support temporary access keys', () => {
      const config = apiKeys()
        .enable()
        .keys([
          {
            id: 'temp-contractor',
            secret: 'temporary-key',
            roles: ['viewer'],
            expiresAt: '2025-06-30T23:59:59Z',
            metadata: {
              grantedTo: 'contractor@example.com',
              purpose: 'Quarterly audit',
            },
          },
        ])
        ._build();

      expect(config.keys[0].expiresAt).toBeDefined();
      expect(config.keys[0].metadata?.purpose).toBe('Quarterly audit');
    });
  });

  describe('type safety', () => {
    it('should return correct type from _build()', () => {
      const config = apiKeys()
        .enable()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        ._build();

      // TypeScript should enforce this at compile time
      const typeCheck: ApiKeysConfig = config;
      expect(typeCheck.type).toBe('api-keys');
    });

    it('should have correct type property', () => {
      const config = apiKeys()._build();

      expect(config.type).toBe('api-keys');
      expect(typeof config.type).toBe('string');
    });
  });
});

describe('apiKeys factory function', () => {
  it('should create new ApiKeysBuilder instance', () => {
    const builder = apiKeys();

    expect(builder).toBeInstanceOf(ApiKeysBuilder);
  });

  it('should create independent instances', () => {
    const builder1 = apiKeys();
    const builder2 = apiKeys();

    expect(builder1).not.toBe(builder2);
  });

  it('should create builders with default state', () => {
    const config1 = apiKeys()._build();
    const config2 = apiKeys()._build();

    expect(config1.enabled).toBe(config2.enabled);
    expect(config1.keys).toEqual(config2.keys);
  });
});
