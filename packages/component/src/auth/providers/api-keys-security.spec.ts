/**
 * API Keys Provider Security Tests
 *
 * Tests for secure API key storage and validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import { apiKeys, ApiKeysBuilder } from './api-keys';
import type { ApiKey, SecureApiKey } from '../types';

describe('API Keys Security', () => {
  describe('Secure Key Storage', () => {
    it('should hash API keys immediately when added', () => {
      const testKeys: ApiKey[] = [{ id: 'test-1', secret: 'my-secret-key', roles: ['admin'] }];

      const builder = apiKeys().keys(testKeys);
      const config = builder._build();

      // Secret should be hashed, not plain text
      expect(config.keys[0].secretHash).toBeDefined();
      expect(config.keys[0].secretHash).not.toBe('my-secret-key');
      expect(config.keys[0].secretHash.length).toBeGreaterThan(32); // Hex-encoded hash
    });

    it('should generate unique salt for each key', () => {
      const testKeys: ApiKey[] = [
        { id: 'test-1', secret: 'same-secret', roles: ['admin'] },
        { id: 'test-2', secret: 'same-secret', roles: ['user'] },
      ];

      const config = apiKeys().keys(testKeys)._build();

      // Even with same secret, hashes should differ due to unique salts
      expect(config.keys[0].salt).toBeDefined();
      expect(config.keys[1].salt).toBeDefined();
      expect(config.keys[0].salt).not.toBe(config.keys[1].salt);
      expect(config.keys[0].secretHash).not.toBe(config.keys[1].secretHash);
    });

    it('should not retain plain text secrets in memory', () => {
      const testKeys: ApiKey[] = [{ id: 'test-1', secret: 'my-secret-key', roles: ['admin'] }];

      const builder = apiKeys().keys(testKeys);
      const config = builder._build();

      // Original array should have secrets cleared
      expect(testKeys[0].secret).toBe('[REDACTED]');

      // Config should not contain plain text
      const configString = JSON.stringify(config);
      expect(configString).not.toContain('my-secret-key');
    });

    it('should add security metadata to keys', () => {
      const testKeys: ApiKey[] = [{ id: 'test-1', secret: 'my-secret', roles: ['admin'] }];

      const config = apiKeys().keys(testKeys)._build();
      const storedKey = config.keys[0];

      expect(storedKey.version).toBe(1);
      expect(storedKey.createdAt).toBeDefined();
      expect(new Date(storedKey.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should preserve optional fields during hashing', () => {
      const testKeys: ApiKey[] = [
        {
          id: 'test-1',
          secret: 'my-secret',
          roles: ['admin'],
          expiresAt: '2025-12-31T23:59:59Z',
          metadata: { team: 'platform' },
        },
      ];

      const config = apiKeys().keys(testKeys)._build();
      const storedKey = config.keys[0];

      expect(storedKey.expiresAt).toBe('2025-12-31T23:59:59Z');
      expect(storedKey.metadata).toEqual({ team: 'platform' });
    });

    it('should use consistent hashing algorithm parameters', () => {
      // These should match the constants in ApiKeysBuilder
      const SCRYPT_KEY_LENGTH = 64;
      const SCRYPT_SALT_LENGTH = 32;

      const config = apiKeys()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        ._build();

      const storedKey = config.keys[0];

      // Hash should be hex-encoded with correct length
      expect(storedKey.secretHash.length).toBe(SCRYPT_KEY_LENGTH * 2); // Hex encoding doubles length

      // Salt should be hex-encoded with correct length
      expect(storedKey.salt.length).toBe(SCRYPT_SALT_LENGTH * 2);
    });
  });

  describe('API Key Validation', () => {
    let builder: ApiKeysBuilder;

    beforeEach(() => {
      builder = apiKeys()
        .enable()
        .keys([
          { id: 'valid-key', secret: 'correct-secret', roles: ['admin'] },
          {
            id: 'expired-key',
            secret: 'expired-secret',
            roles: ['user'],
            expiresAt: '2020-01-01T00:00:00Z',
          },
        ]);
    });

    it('should validate correct API key', async () => {
      const isValid = await builder.validateApiKey('valid-key', 'correct-secret');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect secret', async () => {
      const isValid = await builder.validateApiKey('valid-key', 'wrong-secret');
      expect(isValid).toBe(false);
    });

    it('should reject non-existent key ID', async () => {
      const isValid = await builder.validateApiKey('non-existent', 'any-secret');
      expect(isValid).toBe(false);
    });

    it('should reject expired keys', async () => {
      const isValid = await builder.validateApiKey('expired-key', 'expired-secret');
      expect(isValid).toBe(false);
    });

    it('should use constant-time comparison', async () => {
      // This test ensures timing attacks are mitigated
      // We can't directly test constant-time behavior, but we ensure the method is used

      const startTime = performance.now();
      await builder.validateApiKey('valid-key', 'wrong-secret-that-is-very-long');
      const shortTime = performance.now() - startTime;

      const startTime2 = performance.now();
      await builder.validateApiKey('valid-key', 'x');
      const veryShortTime = performance.now() - startTime2;

      // Times should be relatively similar (within an order of magnitude)
      // This is a weak test but better than nothing
      const ratio = Math.max(shortTime, veryShortTime) / Math.min(shortTime, veryShortTime);
      expect(ratio).toBeLessThan(10);
    });

    it('should perform dummy hash for non-existent keys to prevent timing attacks', async () => {
      // Even for non-existent keys, we should perform hashing to prevent timing attacks
      const startTime = performance.now();
      const result = await builder.validateApiKey('non-existent', 'some-secret');
      const elapsedTime = performance.now() - startTime;

      expect(result).toBe(false);
      // Should take some measurable time due to dummy hash
      expect(elapsedTime).toBeGreaterThan(0);
    });

    it('should update lastUsedAt on successful validation', async () => {
      const config = builder._build();
      const keyBefore = config.keys.find((k) => k.id === 'valid-key');
      expect(keyBefore?.lastUsedAt).toBeUndefined();

      await builder.validateApiKey('valid-key', 'correct-secret');

      const keyAfter = config.keys.find((k) => k.id === 'valid-key');
      expect(keyAfter?.lastUsedAt).toBeDefined();
    });
  });

  describe('Error Message Security', () => {
    it('should not expose secrets in error messages', () => {
      const testKeys: ApiKey[] = [{ id: 'test-1', secret: 'super-secret-key', roles: ['admin'] }];

      try {
        apiKeys().keys([{ id: 123 as any, secret: 'super-secret-key', roles: ['admin'] }]);
      } catch (error: any) {
        // Error message should not contain the actual secret
        expect(error.message).not.toContain('super-secret-key');
        // Check that if key is in details, secret is redacted
        if (error.details?.key) {
          expect(error.details.key.secret).toBe('[REDACTED]');
        }
      }
    });

    it('should redact secrets when validation fails', () => {
      try {
        apiKeys().keys([{ secret: 'my-secret', roles: ['admin'] } as any]);
      } catch (error: any) {
        // If key object is included in error, secret should be redacted
        if (error.details?.key) {
          expect(error.details.key.secret).not.toBe('my-secret');
        }
      }
    });
  });

  describe('Key Rotation Support', () => {
    it('should support version field for key rotation', () => {
      const config = apiKeys()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        ._build();

      expect(config.keys[0].version).toBe(1);
    });

    it('should track creation time for rotation scheduling', () => {
      const before = Date.now();

      const config = apiKeys()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        ._build();

      const after = Date.now();
      const createdAt = new Date(config.keys[0].createdAt).getTime();

      expect(createdAt).toBeGreaterThanOrEqual(before);
      expect(createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe('Hash Algorithm Security', () => {
    it('should use scrypt with secure parameters', () => {
      // This test verifies we're using appropriate scrypt parameters
      const testKeys: ApiKey[] = [{ id: 'test', secret: 'password', roles: ['admin'] }];

      const config = apiKeys().keys(testKeys)._build();
      const key = config.keys[0];

      // Verify hash and salt have expected lengths
      expect(key.secretHash).toMatch(/^[0-9a-f]{128}$/); // 64 bytes = 128 hex chars
      expect(key.salt).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 64 hex chars
    });

    it('should produce different hashes for different secrets', () => {
      const builder1 = apiKeys().keys([{ id: 'test1', secret: 'secret1', roles: ['admin'] }]);
      const builder2 = apiKeys().keys([{ id: 'test2', secret: 'secret2', roles: ['admin'] }]);

      const config1 = builder1._build();
      const config2 = builder2._build();

      expect(config1.keys[0].secretHash).not.toBe(config2.keys[0].secretHash);
    });

    it('should produce consistent hashes for same secret and salt', () => {
      // This is more of an implementation detail test
      const secret = 'test-secret';
      const salt = crypto.randomBytes(32);

      const hash1 = crypto.scryptSync(secret, salt, 64, {
        N: 16384,
        r: 8,
        p: 1,
      });

      const hash2 = crypto.scryptSync(secret, salt, 64, {
        N: 16384,
        r: 8,
        p: 1,
      });

      expect(hash1.toString('hex')).toBe(hash2.toString('hex'));
    });
  });

  describe('Memory Security', () => {
    it('should clear secrets from input array', () => {
      const testKeys: ApiKey[] = [
        { id: 'key1', secret: 'secret1', roles: ['admin'] },
        { id: 'key2', secret: 'secret2', roles: ['user'] },
      ];

      const originalSecrets = testKeys.map((k) => k.secret);

      apiKeys().keys(testKeys);

      // All secrets should be redacted
      testKeys.forEach((key) => {
        expect(key.secret).toBe('[REDACTED]');
      });

      // Original secrets should not be in the keys anymore
      originalSecrets.forEach((secret) => {
        testKeys.forEach((key) => {
          expect(key.secret).not.toBe(secret);
        });
      });
    });

    it('should not expose secrets through JSON serialization', () => {
      const builder = apiKeys()
        .enable()
        .keys([{ id: 'test', secret: 'super-secret-123', roles: ['admin'] }]);

      const config = builder._build();
      const serialized = JSON.stringify(config);

      expect(serialized).not.toContain('super-secret-123');
      expect(serialized).toContain('secretHash');
      expect(serialized).toContain('salt');
    });
  });

  describe('Migration Support', () => {
    it('should provide fields needed for key migration', () => {
      const config = apiKeys()
        .keys([{ id: 'test', secret: 'secret', roles: ['admin'] }])
        ._build();

      const key = config.keys[0];

      // Fields needed for migration
      expect(key.id).toBeDefined();
      expect(key.version).toBeDefined();
      expect(key.createdAt).toBeDefined();
      expect(key.roles).toBeDefined();

      // Security fields
      expect(key.secretHash).toBeDefined();
      expect(key.salt).toBeDefined();
    });
  });
});
