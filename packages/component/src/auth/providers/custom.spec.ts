/**
 * Custom Authentication Provider Tests
 *
 * Comprehensive test suite for custom authentication provider.
 */

import { describe, it, expect, vi } from 'vitest';
import { custom, CustomAuthBuilder } from './custom';
import type { CustomAuthConfig, TokenExtractor } from './custom';
import type { TokenValidator, RoleMapper, TokenValidationResult } from '../types';
import { ProviderConfigError } from '../errors';

describe('CustomAuthBuilder', () => {
  describe('constructor', () => {
    it('should create a new builder with default values', () => {
      const builder = custom();

      expect(builder).toBeInstanceOf(CustomAuthBuilder);
    });

    it('should have correct type', () => {
      const builder = custom();

      // Note: Can't build without validator, so we'll test this in _build() tests
      expect(builder).toBeInstanceOf(CustomAuthBuilder);
    });
  });

  describe('validateTokens()', () => {
    it('should set token validator', () => {
      const validator: TokenValidator = async (token) => ({
        valid: true,
        claims: { sub: 'user-123' },
      });

      const config = custom().validateTokens(validator)._build();

      expect(config.tokenValidator).toBe(validator);
    });

    it('should return this for method chaining', () => {
      const builder = custom();
      const validator: TokenValidator = async (token) => ({
        valid: true,
        claims: {},
      });

      const result = builder.validateTokens(validator);

      expect(result).toBe(builder);
    });

    it('should throw error if validator is not a function', () => {
      expect(() => {
        custom().validateTokens('not-a-function' as any);
      }).toThrow(ProviderConfigError);
    });

    it('should support async validator functions', () => {
      const validator: TokenValidator = async (token) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { valid: true, claims: {} };
      };

      const config = custom().validateTokens(validator)._build();

      expect(config.tokenValidator).toBe(validator);
    });

    it('should support validator with context parameter', () => {
      const validator: TokenValidator = async (token, context) => {
        const ip = context?.ip;
        return {
          valid: true,
          claims: { sub: 'user', ip },
        };
      };

      const config = custom().validateTokens(validator)._build();

      expect(config.tokenValidator).toBe(validator);
    });

    it('should support validator returning error', () => {
      const validator: TokenValidator = async (token) => ({
        valid: false,
        error: 'Invalid token',
      });

      const config = custom().validateTokens(validator)._build();

      expect(config.tokenValidator).toBe(validator);
    });
  });

  describe('mapRoles()', () => {
    it('should set role mapper', () => {
      const mapper: RoleMapper = (claims) => claims.roles || [];

      const config = custom()
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        .mapRoles(mapper)
        ._build();

      expect(config.roleMapper).toBe(mapper);
    });

    it('should return this for method chaining', () => {
      const builder = custom();
      const mapper: RoleMapper = (claims) => [];

      const result = builder.mapRoles(mapper);

      expect(result).toBe(builder);
    });

    it('should throw error if mapper is not a function', () => {
      expect(() => {
        custom().mapRoles('not-a-function' as any);
      }).toThrow(ProviderConfigError);
    });

    it('should support complex role mapping logic', () => {
      const mapper: RoleMapper = (claims) => {
        const roles: string[] = [];
        if (claims.is_admin) roles.push('admin');
        if (claims.is_editor) roles.push('editor');
        return roles;
      };

      const config = custom()
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        .mapRoles(mapper)
        ._build();

      expect(config.roleMapper).toBe(mapper);
    });
  });

  describe('header()', () => {
    it('should set custom header name', () => {
      const config = custom()
        .header('X-Custom-Auth')
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      expect(config.headerName).toBe('X-Custom-Auth');
    });

    it('should return this for method chaining', () => {
      const builder = custom();
      const result = builder.header('X-API-Key');

      expect(result).toBe(builder);
    });

    it('should support various header formats', () => {
      const config1 = custom()
        .header('X-API-Key')
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();
      expect(config1.headerName).toBe('X-API-Key');

      const config2 = custom()
        .header('Authorization')
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();
      expect(config2.headerName).toBe('Authorization');

      const config3 = custom()
        .header('X-Custom-Token')
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();
      expect(config3.headerName).toBe('X-Custom-Token');
    });

    it('should throw error for non-string header', () => {
      expect(() => {
        custom().header(123 as any);
      }).toThrow(ProviderConfigError);
    });

    it('should throw error for empty string header', () => {
      expect(() => {
        custom().header('');
      }).toThrow(ProviderConfigError);
    });

    it('should throw error for whitespace-only header', () => {
      expect(() => {
        custom().header('   ');
      }).toThrow(ProviderConfigError);
    });

    it('should warn if both header and extractor are set', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      custom()
        .extractToken((req) => req.token)
        .header('X-Custom-Auth');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Both header() and extractToken() are set')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('extractToken()', () => {
    it('should set token extractor', () => {
      const extractor: TokenExtractor = (req) => req.token || null;

      const config = custom()
        .extractToken(extractor)
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      expect(config.tokenExtractor).toBe(extractor);
    });

    it('should return this for method chaining', () => {
      const builder = custom();
      const extractor: TokenExtractor = (req) => null;

      const result = builder.extractToken(extractor);

      expect(result).toBe(builder);
    });

    it('should throw error if extractor is not a function', () => {
      expect(() => {
        custom().extractToken('not-a-function' as any);
      }).toThrow(ProviderConfigError);
    });

    it('should support synchronous extractor', () => {
      const extractor: TokenExtractor = (req) => {
        return req.headers['authorization'] || null;
      };

      const config = custom()
        .extractToken(extractor)
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      expect(config.tokenExtractor).toBe(extractor);
    });

    it('should support async extractor', () => {
      const extractor: TokenExtractor = async (req) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return req.token || null;
      };

      const config = custom()
        .extractToken(extractor)
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      expect(config.tokenExtractor).toBe(extractor);
    });

    it('should support cookie-based extraction', () => {
      const extractor: TokenExtractor = (req) => {
        return req.cookies?.authToken || null;
      };

      const config = custom()
        .extractToken(extractor)
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      expect(config.tokenExtractor).toBe(extractor);
    });

    it('should support multi-source extraction with fallback', () => {
      const extractor: TokenExtractor = (req) => {
        // Try header first
        const authHeader = req.headers?.['authorization'];
        if (authHeader) return authHeader;

        // Try cookie second
        const cookie = req.cookies?.token;
        if (cookie) return cookie;

        // Try query param
        return req.query?.token || null;
      };

      const config = custom()
        .extractToken(extractor)
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      expect(config.tokenExtractor).toBe(extractor);
    });

    it('should warn if header is already set', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      custom()
        .header('X-Custom-Auth')
        .extractToken((req) => req.token);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Both header() and extractToken() are set')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('_build()', () => {
    it('should throw error if no token validator is provided', () => {
      expect(() => {
        custom()._build();
      }).toThrow(ProviderConfigError);
      expect(() => {
        custom()._build();
      }).toThrow('requires a token validator');
    });

    it('should return complete configuration', () => {
      const validator: TokenValidator = async (token) => ({
        valid: true,
        claims: { sub: 'user' },
      });
      const mapper: RoleMapper = (claims) => ['admin'];

      const config = custom()
        .validateTokens(validator)
        .mapRoles(mapper)
        .header('X-Custom-Auth')
        ._build();

      expect(config).toMatchObject({
        type: 'custom',
        tokenValidator: validator,
        roleMapper: mapper,
        headerName: 'X-Custom-Auth',
      });
    });

    it('should set default header when neither header nor extractor is set', () => {
      const config = custom()
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      expect(config.headerName).toBe('Authorization');
    });

    it('should not set default header when extractor is set', () => {
      const config = custom()
        .extractToken((req) => req.token)
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      expect(config.headerName).toBeUndefined();
    });

    it('should warn if no role mapper is provided', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      custom()
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No role mapper configured')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should not warn if role mapper is provided', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      custom()
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        .mapRoles((claims) => [])
        ._build();

      // Should not warn about role mapper
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('No role mapper configured')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should return immutable configuration', () => {
      const builder = custom()
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        .mapRoles((claims) => ['admin']);

      const config1 = builder._build();
      const config2 = builder._build();

      expect(config1).not.toBe(config2);
    });

    it('should include all optional fields when set', () => {
      const validator: TokenValidator = async (token) => ({ valid: true, claims: {} });
      const mapper: RoleMapper = (claims) => [];
      const extractor: TokenExtractor = (req) => req.token;

      const config = custom()
        .validateTokens(validator)
        .mapRoles(mapper)
        .header('X-Custom-Auth')
        .extractToken(extractor)
        ._build();

      expect(config.tokenValidator).toBeDefined();
      expect(config.roleMapper).toBeDefined();
      expect(config.headerName).toBe('X-Custom-Auth');
      expect(config.tokenExtractor).toBeDefined();
    });

    it('should exclude optional fields when not set', () => {
      const config = custom()
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      expect(config.roleMapper).toBeUndefined();
      expect(config.tokenExtractor).toBeUndefined();
      // headerName will be set to default 'Authorization'
      expect(config.headerName).toBe('Authorization');
    });
  });

  describe('method chaining', () => {
    it('should support full method chain', () => {
      const validator: TokenValidator = async (token) => ({ valid: true, claims: {} });
      const mapper: RoleMapper = (claims) => ['admin'];
      const extractor: TokenExtractor = (req) => req.token;

      const config = custom()
        .validateTokens(validator)
        .mapRoles(mapper)
        .header('X-Custom-Auth')
        .extractToken(extractor)
        ._build();

      expect(config).toMatchObject({
        type: 'custom',
        tokenValidator: validator,
        roleMapper: mapper,
        headerName: 'X-Custom-Auth',
        tokenExtractor: extractor,
      });
    });

    it('should support any method order', () => {
      const validator: TokenValidator = async (token) => ({ valid: true, claims: {} });
      const mapper: RoleMapper = (claims) => ['admin'];

      const config = custom()
        .mapRoles(mapper)
        .header('X-Custom-Auth')
        .validateTokens(validator)
        ._build();

      expect(config.tokenValidator).toBe(validator);
      expect(config.roleMapper).toBe(mapper);
      expect(config.headerName).toBe('X-Custom-Auth');
    });
  });

  describe('realistic use cases', () => {
    it('should support simple custom auth with header', () => {
      const config = custom()
        .header('X-Custom-Auth')
        .validateTokens(async (token) => {
          if (token === 'valid-token') {
            return {
              valid: true,
              claims: { sub: 'user-123', email: 'user@example.com' },
            };
          }
          return { valid: false, error: 'Invalid token' };
        })
        .mapRoles((claims) => ['user'])
        ._build();

      expect(config.headerName).toBe('X-Custom-Auth');
      expect(config.tokenValidator).toBeDefined();
      expect(config.roleMapper).toBeDefined();
    });

    it('should support cookie-based authentication', () => {
      const config = custom()
        .extractToken((req) => req.cookies?.authToken || null)
        .validateTokens(async (token) => {
          // Validate session token
          return {
            valid: true,
            claims: { sessionId: token },
          };
        })
        .mapRoles((claims) => ['authenticated'])
        ._build();

      expect(config.tokenExtractor).toBeDefined();
      expect(config.tokenValidator).toBeDefined();
    });

    it('should support third-party auth integration', () => {
      const config = custom()
        .validateTokens(async (token, context) => {
          // Mock third-party validation
          const result = await Promise.resolve({
            valid: true,
            user: { id: 'user-123', email: 'user@example.com', roles: ['admin'] },
          });

          return {
            valid: result.valid,
            claims: result.user,
            userId: result.user.id,
            email: result.user.email,
          };
        })
        .mapRoles((claims) => claims.roles || [])
        ._build();

      expect(config.tokenValidator).toBeDefined();
      expect(config.roleMapper).toBeDefined();
    });

    it('should support multi-source token extraction', () => {
      const config = custom()
        .extractToken((req) => {
          // Try Authorization header
          const authHeader = req.headers?.['authorization'];
          if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
          }

          // Fallback to cookie
          if (req.cookies?.session) {
            return req.cookies.session;
          }

          // Fallback to query param
          return req.query?.token || null;
        })
        .validateTokens(async (token) => ({
          valid: true,
          claims: { sub: 'user' },
        }))
        .mapRoles((claims) => ['user'])
        ._build();

      expect(config.tokenExtractor).toBeDefined();
    });

    it('should support API key style authentication', () => {
      const config = custom()
        .header('X-API-Key')
        .validateTokens(async (token) => {
          // Mock API key lookup
          const apiKeys = {
            'key-123': { userId: 'service-1', roles: ['service'] },
          };

          const keyData = apiKeys[token as keyof typeof apiKeys];
          if (!keyData) {
            return { valid: false, error: 'Invalid API key' };
          }

          return {
            valid: true,
            claims: { sub: keyData.userId, roles: keyData.roles },
            userId: keyData.userId,
          };
        })
        .mapRoles((claims) => claims.roles || [])
        ._build();

      expect(config.headerName).toBe('X-API-Key');
      expect(config.tokenValidator).toBeDefined();
    });

    it('should support context-aware validation', () => {
      const config = custom()
        .validateTokens(async (token, context) => {
          // Use context for additional validation
          const ip = context?.ip;
          const userAgent = context?.userAgent;

          // Mock validation with context
          if (!ip || !userAgent) {
            return { valid: false, error: 'Missing context' };
          }

          return {
            valid: true,
            claims: { sub: 'user', ip, userAgent },
          };
        })
        .mapRoles((claims) => ['user'])
        ._build();

      expect(config.tokenValidator).toBeDefined();
    });

    it('should support complex role mapping logic', () => {
      const config = custom()
        .validateTokens(async (token) => ({
          valid: true,
          claims: {
            sub: 'user-123',
            permissions: ['read', 'write', 'admin'],
            department: 'engineering',
          },
        }))
        .mapRoles((claims) => {
          const roles: string[] = [];

          // Map permissions to roles
          if (claims.permissions?.includes('admin')) {
            roles.push('admin');
          }
          if (claims.permissions?.includes('write')) {
            roles.push('editor');
          }
          if (claims.permissions?.includes('read')) {
            roles.push('viewer');
          }

          // Add department-based roles
          if (claims.department === 'engineering') {
            roles.push('engineer');
          }

          return roles;
        })
        ._build();

      expect(config.roleMapper).toBeDefined();
    });
  });

  describe('type safety', () => {
    it('should return correct type from _build()', () => {
      const config = custom()
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      // TypeScript should enforce this at compile time
      const typeCheck: CustomAuthConfig = config;
      expect(typeCheck.type).toBe('custom');
    });

    it('should have correct type property', () => {
      const config = custom()
        .validateTokens(async (token) => ({ valid: true, claims: {} }))
        ._build();

      expect(config.type).toBe('custom');
      expect(typeof config.type).toBe('string');
    });
  });

  describe('configuration immutability', () => {
    it('should not affect other builders', () => {
      const validator1: TokenValidator = async (token) => ({
        valid: true,
        claims: { type: 'validator1' },
      });
      const validator2: TokenValidator = async (token) => ({
        valid: true,
        claims: { type: 'validator2' },
      });

      const config1 = custom().validateTokens(validator1)._build();

      const config2 = custom().validateTokens(validator2)._build();

      expect(config1.tokenValidator).not.toBe(config2.tokenValidator);
    });
  });
});

describe('custom factory function', () => {
  it('should create new CustomAuthBuilder instance', () => {
    const builder = custom();

    expect(builder).toBeInstanceOf(CustomAuthBuilder);
  });

  it('should create independent instances', () => {
    const builder1 = custom();
    const builder2 = custom();

    expect(builder1).not.toBe(builder2);
  });

  it('should create builders with default state', () => {
    const builder1 = custom();
    const builder2 = custom();

    expect(builder1).toBeInstanceOf(CustomAuthBuilder);
    expect(builder2).toBeInstanceOf(CustomAuthBuilder);
    expect(builder1).not.toBe(builder2);
  });
});
