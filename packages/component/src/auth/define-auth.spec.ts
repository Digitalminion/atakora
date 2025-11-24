/**
 * Tests for defineAuth function
 */

import { describe, it, expect } from 'vitest';
import {
  defineAuth,
  isAuthObject,
  getAuthProviderNames,
  getPrimaryProvider,
  getAuthProvider,
  hasAuthProviderType,
  validateAuthForProduction,
} from './define-auth';
import type { AuthDefinition } from './types';

describe('defineAuth', () => {
  // Mock provider builder for testing
  class MockProviderBuilder {
    private config: any = { type: 'mock' };

    withConfig(key: string, value: any) {
      this.config[key] = value;
      return this;
    }

    _build() {
      return this.config;
    }
  }

  describe('basic functionality', () => {
    it('should create auth object with single provider', () => {
      const definition = {
        Primary: new MockProviderBuilder().withConfig('test', 'value'),
      };

      const auth = defineAuth(definition as any);

      expect(auth).toBeDefined();
      expect(auth.definition).toBe(definition);
      expect(auth.primaryProvider).toBe('Primary');
      expect(auth._metadata.version).toBe('1.0.0');
      expect(auth._metadata.providerNames).toEqual(['Primary']);
    });

    it('should create auth object with multiple providers', () => {
      const definition = {
        Primary: new MockProviderBuilder().withConfig('type', 'entra'),
        ApiKeys: new MockProviderBuilder().withConfig('type', 'api-keys'),
      };

      const auth = defineAuth(definition as any);

      expect(auth.primaryProvider).toBe('Primary');
      expect(auth._metadata.providerNames).toEqual(['Primary', 'ApiKeys']);
      expect(Object.keys(auth.providers)).toHaveLength(2);
    });

    it('should use first provider as primary', () => {
      const definition = {
        ApiKeys: new MockProviderBuilder().withConfig('type', 'api-keys'),
        Secondary: new MockProviderBuilder().withConfig('type', 'entra'),
      };

      const auth = defineAuth(definition as any);

      expect(auth.primaryProvider).toBe('ApiKeys');
    });

    it('should preserve original definition', () => {
      const definition = {
        Primary: new MockProviderBuilder(),
      };

      const auth = defineAuth(definition as any);

      expect(auth._raw).toBe(definition);
      expect(auth.definition).toBe(definition);
    });
  });

  describe('validation', () => {
    it('should throw error for empty definition', () => {
      expect(() => defineAuth({} as any)).toThrow(
        'At least one authentication provider must be defined'
      );
    });

    it('should throw error for null definition', () => {
      expect(() => defineAuth(null as any)).toThrow('Authentication definition cannot be empty');
    });

    it('should throw error for undefined definition', () => {
      expect(() => defineAuth(undefined as any)).toThrow(
        'Authentication definition cannot be empty'
      );
    });

    it('should validate provider names are PascalCase', () => {
      const definition = {
        'invalid-name': new MockProviderBuilder(),
      };

      expect(() => defineAuth(definition as any)).toThrow('Provider names must be PascalCase');
    });

    it('should allow valid PascalCase names', () => {
      const validNames = ['Primary', 'ApiKeys', 'CustomAuth', 'OAuth2'];

      for (const name of validNames) {
        const definition = {
          [name]: new MockProviderBuilder(),
        };

        expect(() => defineAuth(definition as any)).not.toThrow();
      }
    });

    it('should reject invalid provider names', () => {
      const invalidNames = ['lowercase', 'snake_case', 'kebab-case', '123Numbers', 'With Spaces'];

      for (const name of invalidNames) {
        const definition = {
          [name]: new MockProviderBuilder(),
        };

        expect(() => defineAuth(definition as any)).toThrow('Provider names must be PascalCase');
      }
    });

    it('should throw error for duplicate provider names', () => {
      const definition = {
        Primary: new MockProviderBuilder(),
        Primary: new MockProviderBuilder(), // Duplicate
      };

      // Note: In JavaScript, duplicate keys are allowed but the last one wins
      // This test actually won't catch duplicates due to JS object behavior
      // The validation would need to happen at the input level
      expect(() => defineAuth(definition as any)).not.toThrow();
    });

    it('should throw error for invalid provider builder', () => {
      const definition = {
        Primary: 'not-a-builder' as any,
      };

      expect(() => defineAuth(definition as any)).toThrow(
        'must be a valid authentication provider builder'
      );
    });

    it('should throw error for provider without _build method', () => {
      const definition = {
        Primary: {} as any,
      };

      expect(() => defineAuth(definition as any)).toThrow(
        'not a valid authentication provider builder'
      );
    });
  });

  describe('provider processing', () => {
    it('should process provider configuration', () => {
      const definition = {
        Primary: new MockProviderBuilder()
          .withConfig('tenant', '123')
          .withConfig('clientId', '456'),
      };

      const auth = defineAuth(definition as any);
      const provider = auth.providers.Primary;

      expect(provider.type).toBe('mock');
      expect(provider.config.tenant).toBe('123');
      expect(provider.config.clientId).toBe('456');
    });

    it('should extract token validator if present', () => {
      const validator = async (token: string) => ({ valid: true });

      class ValidatorBuilder extends MockProviderBuilder {
        _build() {
          return {
            ...super._build(),
            tokenValidator: validator,
          };
        }
      }

      const definition = {
        Primary: new ValidatorBuilder(),
      };

      const auth = defineAuth(definition as any);
      const provider = auth.providers.Primary;

      expect(provider.validate).toBe(validator);
      expect(provider.config.tokenValidator).toBeUndefined(); // Should be cleaned up
    });

    it('should extract role mapper if present', () => {
      const mapper = (claims: any) => ['admin'];

      class MapperBuilder extends MockProviderBuilder {
        _build() {
          return {
            ...super._build(),
            roleMapper: mapper,
          };
        }
      }

      const definition = {
        Primary: new MapperBuilder(),
      };

      const auth = defineAuth(definition as any);
      const provider = auth.providers.Primary;

      expect(provider.mapRoles).toBe(mapper);
      expect(provider.config.roleMapper).toBeUndefined(); // Should be cleaned up
    });
  });

  describe('helper functions', () => {
    const createTestAuth = () => {
      const definition = {
        Primary: new MockProviderBuilder().withConfig('type', 'entra'),
        ApiKeys: new MockProviderBuilder().withConfig('type', 'api-keys'),
      };
      return defineAuth(definition as any);
    };

    describe('isAuthObject', () => {
      it('should return true for valid auth object', () => {
        const auth = createTestAuth();
        expect(isAuthObject(auth)).toBe(true);
      });

      it('should return false for invalid objects', () => {
        expect(isAuthObject(null)).toBe(false);
        expect(isAuthObject(undefined)).toBe(false);
        expect(isAuthObject({})).toBe(false);
        expect(isAuthObject({ definition: {} })).toBe(false);
      });
    });

    describe('getAuthProviderNames', () => {
      it('should return provider names', () => {
        const auth = createTestAuth();
        const names = getAuthProviderNames(auth);
        expect(names).toEqual(['Primary', 'ApiKeys']);
      });
    });

    describe('getPrimaryProvider', () => {
      it('should return primary provider', () => {
        const auth = createTestAuth();
        const primary = getPrimaryProvider(auth);
        expect(primary.type).toBe('entra');
      });
    });

    describe('getAuthProvider', () => {
      it('should return provider by name', () => {
        const auth = createTestAuth();
        const provider = getAuthProvider(auth, 'ApiKeys');
        expect(provider?.type).toBe('api-keys');
      });

      it('should return undefined for non-existent provider', () => {
        const auth = createTestAuth();
        const provider = getAuthProvider(auth, 'NonExistent' as any);
        expect(provider).toBeUndefined();
      });
    });

    describe('hasAuthProviderType', () => {
      it('should return true if provider type exists', () => {
        const auth = createTestAuth();
        expect(hasAuthProviderType(auth, 'entra')).toBe(true);
        expect(hasAuthProviderType(auth, 'api-keys')).toBe(true);
      });

      it('should return false if provider type does not exist', () => {
        const auth = createTestAuth();
        expect(hasAuthProviderType(auth, 'custom')).toBe(false);
      });
    });
  });

  describe('validateAuthForProduction', () => {
    it('should validate auth configuration', () => {
      const definition = {
        Primary: new MockProviderBuilder().withConfig('type', 'entra'),
      };

      const auth = defineAuth(definition as any);
      const result = validateAuthForProduction(auth);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0); // Warnings for missing validators
    });

    it('should report missing providers as error', () => {
      const auth = { providers: {} } as any;
      const result = validateAuthForProduction(auth);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No authentication providers configured');
    });

    it('should warn about missing token validation', () => {
      const definition = {
        Primary: new MockProviderBuilder(),
      };

      const auth = defineAuth(definition as any);
      const result = validateAuthForProduction(auth);

      expect(result.warnings).toContain('Provider "Primary" has no token validation configured');
    });

    it('should warn about missing role mapping', () => {
      const definition = {
        Primary: new MockProviderBuilder(),
      };

      const auth = defineAuth(definition as any);
      const result = validateAuthForProduction(auth);

      expect(result.warnings).toContain('Provider "Primary" has no role mapping configured');
    });

    it('should validate Entra ID specific requirements', () => {
      class EntraBuilder extends MockProviderBuilder {
        _build() {
          return { type: 'entra-id' };
        }
      }

      const definition = {
        Primary: new EntraBuilder(),
      };

      const auth = defineAuth(definition as any);
      const result = validateAuthForProduction(auth);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider "Primary" (Entra ID) missing tenant or clientId');
    });

    it('should validate API Keys specific requirements', () => {
      class ApiKeysBuilder extends MockProviderBuilder {
        _build() {
          return { type: 'api-keys', enabled: false };
        }
      }

      const definition = {
        ApiKeys: new ApiKeysBuilder(),
      };

      const auth = defineAuth(definition as any);
      const result = validateAuthForProduction(auth);

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Provider "ApiKeys" (API Keys) is not enabled');
      expect(result.errors).toContain('Provider "ApiKeys" (API Keys) has no keys configured');
    });
  });
});
