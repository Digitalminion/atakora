/**
 * Tests for authentication utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateAuthDefinition,
  isValidProviderName,
  processProviders,
  processProvider,
  determinePrimaryProvider,
  getProviderTypes,
  hasProviderType,
  getProviderByName,
  getProviderByType,
  validateRequiredFields,
  validateConfigValue,
  extractBearerToken,
  parseJwtClaims,
  isTokenExpired,
} from './utils';
import { AuthDefinitionError } from './errors';

describe('auth/utils', () => {
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

  describe('validateAuthDefinition', () => {
    it('should validate valid definition', () => {
      const definition = {
        Primary: new MockProviderBuilder(),
      };

      expect(() => validateAuthDefinition(definition as any)).not.toThrow();
    });

    it('should throw for empty definition', () => {
      expect(() => validateAuthDefinition({} as any)).toThrow(
        'At least one authentication provider must be defined'
      );
    });

    it('should throw for null definition', () => {
      expect(() => validateAuthDefinition(null as any)).toThrow(
        'Authentication definition cannot be empty'
      );
    });

    it('should throw for undefined definition', () => {
      expect(() => validateAuthDefinition(undefined as any)).toThrow(
        'Authentication definition cannot be empty'
      );
    });

    it('should validate provider names are PascalCase', () => {
      const definition = {
        'invalid-name': new MockProviderBuilder(),
      };

      expect(() => validateAuthDefinition(definition as any)).toThrow(
        'Provider names must be PascalCase'
      );
    });

    it('should throw for invalid provider value', () => {
      const definition = {
        Primary: 'not-a-builder',
      };

      expect(() => validateAuthDefinition(definition as any)).toThrow(
        'must be a valid authentication provider builder'
      );
    });

    it('should throw for provider without _build method', () => {
      const definition = {
        Primary: { notABuilder: true },
      };

      expect(() => validateAuthDefinition(definition as any)).toThrow(
        'not a valid authentication provider builder'
      );
    });
  });

  describe('isValidProviderName', () => {
    it('should accept valid PascalCase names', () => {
      const validNames = [
        'Primary',
        'ApiKeys',
        'CustomAuth',
        'OAuth2',
        'EntraId',
        'AWS',
        'GoogleAuth',
      ];

      for (const name of validNames) {
        expect(isValidProviderName(name)).toBe(true);
      }
    });

    it('should reject invalid names', () => {
      const invalidNames = [
        'lowercase',
        'snake_case',
        'kebab-case',
        'camelCase', // Starts with lowercase
        '123Numbers',
        'With Spaces',
        'Special!Chars',
        '',
      ];

      for (const name of invalidNames) {
        expect(isValidProviderName(name)).toBe(false);
      }
    });
  });

  describe('processProviders', () => {
    it('should process all providers', () => {
      const definition = {
        Primary: new MockProviderBuilder().withConfig('type', 'entra'),
        ApiKeys: new MockProviderBuilder().withConfig('type', 'api-keys'),
      };

      const processed = processProviders(definition as any);

      expect(Object.keys(processed)).toHaveLength(2);
      expect(processed.Primary.type).toBe('entra');
      expect(processed.ApiKeys.type).toBe('api-keys');
    });

    it('should throw if provider build fails', () => {
      class FailingBuilder {
        _build() {
          throw new Error('Build failed');
        }
      }

      const definition = {
        Primary: new FailingBuilder(),
      };

      expect(() => processProviders(definition as any)).toThrow(
        'Failed to build provider "Primary"'
      );
    });

    it('should extract validate and mapRoles functions', () => {
      const validator = async () => ({ valid: true });
      const mapper = () => ['admin'];

      class FunctionBuilder {
        _build() {
          return {
            type: 'custom',
            tokenValidator: validator,
            roleMapper: mapper,
          };
        }
      }

      const definition = {
        Primary: new FunctionBuilder(),
      };

      const processed = processProviders(definition as any);

      expect(processed.Primary.validate).toBe(validator);
      expect(processed.Primary.mapRoles).toBe(mapper);
      expect(processed.Primary.config.tokenValidator).toBeUndefined();
      expect(processed.Primary.config.roleMapper).toBeUndefined();
    });
  });

  describe('processProvider', () => {
    it('should process single provider', () => {
      const builder = new MockProviderBuilder()
        .withConfig('tenant', '123')
        .withConfig('clientId', '456');

      const processed = processProvider('Primary', builder as any);

      expect(processed.type).toBe('mock');
      expect(processed.config.tenant).toBe('123');
      expect(processed.config.clientId).toBe('456');
    });

    it('should throw if provider has no type', () => {
      class NoTypeBuilder {
        _build() {
          return { someConfig: 'value' };
        }
      }

      const builder = new NoTypeBuilder();

      expect(() => processProvider('Primary', builder as any)).toThrow(
        'missing type in configuration'
      );
    });

    it('should handle alternative function names', () => {
      const validator = async () => ({ valid: true });
      const mapper = () => ['admin'];

      class AlternativeBuilder {
        _build() {
          return {
            type: 'custom',
            validate: validator, // Alternative to tokenValidator
            mapRoles: mapper, // Alternative to roleMapper
          };
        }
      }

      const builder = new AlternativeBuilder();
      const processed = processProvider('Primary', builder as any);

      expect(processed.validate).toBe(validator);
      expect(processed.mapRoles).toBe(mapper);
    });
  });

  describe('determinePrimaryProvider', () => {
    it('should return first provider as primary', () => {
      const definition = {
        Secondary: new MockProviderBuilder(),
        Primary: new MockProviderBuilder(),
        Tertiary: new MockProviderBuilder(),
      };

      const primary = determinePrimaryProvider(definition as any);
      expect(primary).toBe('Secondary');
    });

    it('should throw for empty definition', () => {
      expect(() => determinePrimaryProvider({})).toThrow(
        'At least one authentication provider must be defined'
      );
    });
  });

  describe('provider utility functions', () => {
    const providers = {
      Primary: { type: 'entra-id', config: {} },
      ApiKeys: { type: 'api-keys', config: {} },
      Custom: { type: 'custom', config: {} },
    } as any;

    describe('getProviderTypes', () => {
      it('should return all provider types', () => {
        const types = getProviderTypes(providers);
        expect(types).toEqual(['entra-id', 'api-keys', 'custom']);
      });
    });

    describe('hasProviderType', () => {
      it('should return true if type exists', () => {
        expect(hasProviderType(providers, 'entra-id')).toBe(true);
        expect(hasProviderType(providers, 'api-keys')).toBe(true);
      });

      it('should return false if type does not exist', () => {
        expect(hasProviderType(providers, 'oauth2')).toBe(false);
      });
    });

    describe('getProviderByName', () => {
      it('should return provider by name', () => {
        const provider = getProviderByName(providers, 'ApiKeys');
        expect(provider?.type).toBe('api-keys');
      });

      it('should return undefined for non-existent name', () => {
        const provider = getProviderByName(providers, 'NonExistent');
        expect(provider).toBeUndefined();
      });
    });

    describe('getProviderByType', () => {
      it('should return first provider of type', () => {
        const provider = getProviderByType(providers, 'entra-id');
        expect(provider?.type).toBe('entra-id');
      });

      it('should return undefined for non-existent type', () => {
        const provider = getProviderByType(providers, 'oauth2');
        expect(provider).toBeUndefined();
      });
    });
  });

  describe('validation helpers', () => {
    describe('validateRequiredFields', () => {
      it('should pass for valid config', () => {
        const config = { tenant: '123', clientId: '456' };
        expect(() => validateRequiredFields(config, ['tenant', 'clientId'], 'Test')).not.toThrow();
      });

      it('should throw for missing fields', () => {
        const config = { tenant: '123' };
        expect(() => validateRequiredFields(config, ['tenant', 'clientId'], 'Test')).toThrow(
          'missing required configuration field: clientId'
        );
      });

      it('should throw for empty values', () => {
        const config = { tenant: '123', clientId: '' };
        expect(() => validateRequiredFields(config, ['tenant', 'clientId'], 'Test')).toThrow(
          'missing required configuration field: clientId'
        );
      });
    });

    describe('validateConfigValue', () => {
      it('should pass for valid value', () => {
        const validator = (v: any) => typeof v === 'string';
        expect(() => validateConfigValue('test', validator, 'Test', 'field')).not.toThrow();
      });

      it('should throw for invalid value', () => {
        const validator = (v: any) => typeof v === 'string';
        expect(() => validateConfigValue(123, validator, 'Test', 'field')).toThrow(
          'invalid value for field "field": 123'
        );
      });
    });
  });

  describe('token helpers', () => {
    describe('extractBearerToken', () => {
      it('should extract valid bearer token', () => {
        const token = extractBearerToken('Bearer eyJhbGciOiJIUzI1NiJ9.test.signature');
        expect(token).toBe('eyJhbGciOiJIUzI1NiJ9.test.signature');
      });

      it('should handle case insensitive bearer', () => {
        const token = extractBearerToken('bearer eyJhbGciOiJIUzI1NiJ9.test.signature');
        expect(token).toBe('eyJhbGciOiJIUzI1NiJ9.test.signature');
      });

      it('should return null for invalid format', () => {
        expect(extractBearerToken('InvalidFormat')).toBeNull();
        expect(extractBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
        expect(extractBearerToken('')).toBeNull();
      });

      it('should return null for undefined header', () => {
        expect(extractBearerToken(undefined)).toBeNull();
      });
    });

    describe('parseJwtClaims', () => {
      it('should parse valid JWT claims', () => {
        // Create a valid JWT with base64url encoded payload
        const payload = Buffer.from(
          JSON.stringify({
            sub: '1234567890',
            name: 'John Doe',
            iat: 1516239022,
          })
        ).toString('base64url');

        const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
        const claims = parseJwtClaims(token);

        expect(claims).toEqual({
          sub: '1234567890',
          name: 'John Doe',
          iat: 1516239022,
        });
      });

      it('should return null for invalid JWT format', () => {
        expect(parseJwtClaims('invalid')).toBeNull();
        expect(parseJwtClaims('two.parts')).toBeNull();
        expect(parseJwtClaims('')).toBeNull();
      });

      it('should return null for invalid payload encoding', () => {
        const token = 'header.invalid-base64.signature';
        expect(parseJwtClaims(token)).toBeNull();
      });
    });

    describe('isTokenExpired', () => {
      it('should return true for expired token', () => {
        const claims = {
          exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        };
        expect(isTokenExpired(claims)).toBe(true);
      });

      it('should return false for valid token', () => {
        const claims = {
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        };
        expect(isTokenExpired(claims)).toBe(false);
      });

      it('should return false if no exp claim', () => {
        const claims = {
          sub: '1234567890',
          name: 'John Doe',
        };
        expect(isTokenExpired(claims)).toBe(false);
      });
    });
  });
});
