/**
 * Custom Auth Provider Integration Tests
 *
 * Tests integration of custom authentication provider with defineAuth
 * and the broader authentication system.
 */

import { describe, it, expect } from 'vitest';
import { defineAuth } from '../define-auth';
import { custom } from './custom';
import { auth } from './index';
import type { TokenValidator, RoleMapper } from '../types';

describe('Custom Auth Integration', () => {
  describe('with defineAuth', () => {
    it('should work as primary provider', () => {
      const authentication = defineAuth({
        Primary: auth
          .custom()
          .validateTokens(async (token) => ({
            valid: true,
            claims: { sub: 'user-123' },
          }))
          .mapRoles((claims) => ['user']),
      });

      expect(authentication.providers.Primary).toBeDefined();
      expect(authentication.providers.Primary.type).toBe('custom');
      expect(authentication.primaryProvider).toBe('Primary');
    });

    it('should work with multiple providers', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('tenant-123').clientId('client-456'),
        Custom: auth
          .custom()
          .validateTokens(async (token) => ({
            valid: true,
            claims: { sub: 'user' },
          }))
          .mapRoles((claims) => ['user']),
      });

      expect(authentication.providers.Primary).toBeDefined();
      expect(authentication.providers.Custom).toBeDefined();
      expect(authentication.providers.Custom.type).toBe('custom');
    });

    it('should extract token validator from custom provider', () => {
      const validator: TokenValidator = async (token) => ({
        valid: true,
        claims: { sub: 'user' },
      });

      const authentication = defineAuth({
        Primary: auth
          .custom()
          .validateTokens(validator)
          .mapRoles((claims) => []),
      });

      expect(authentication.providers.Primary.validate).toBe(validator);
    });

    it('should extract role mapper from custom provider', () => {
      const mapper: RoleMapper = (claims) => ['admin', 'user'];

      const authentication = defineAuth({
        Primary: auth
          .custom()
          .validateTokens(async (token) => ({ valid: true, claims: {} }))
          .mapRoles(mapper),
      });

      expect(authentication.providers.Primary.mapRoles).toBe(mapper);
    });
  });

  describe('realistic scenarios', () => {
    it('should support simple custom authentication', () => {
      const authentication = defineAuth({
        Primary: auth
          .custom()
          .header('X-Custom-Auth')
          .validateTokens(async (token) => {
            if (token === 'valid-token') {
              return {
                valid: true,
                claims: {
                  sub: 'user-123',
                  email: 'user@example.com',
                },
                userId: 'user-123',
                email: 'user@example.com',
              };
            }
            return { valid: false, error: 'Invalid token' };
          })
          .mapRoles((claims) => ['user']),
      });

      expect(authentication.providers.Primary.type).toBe('custom');
      expect(authentication.providers.Primary.config.headerName).toBe('X-Custom-Auth');
    });

    it('should support cookie-based authentication', () => {
      const authentication = defineAuth({
        Primary: auth
          .custom()
          .extractToken((req) => req.cookies?.authToken || null)
          .validateTokens(async (token) => ({
            valid: true,
            claims: { sessionId: token },
          }))
          .mapRoles(() => ['authenticated']),
      });

      expect(authentication.providers.Primary.type).toBe('custom');
      expect(authentication.providers.Primary.config.tokenExtractor).toBeDefined();
    });

    it('should support third-party auth integration', () => {
      const authentication = defineAuth({
        Primary: auth
          .custom()
          .validateTokens(async (token, context) => {
            // Mock third-party validation
            const result = {
              valid: true,
              user: {
                id: 'user-123',
                email: 'user@example.com',
                roles: ['admin', 'editor'],
              },
            };

            return {
              valid: result.valid,
              claims: result.user,
              userId: result.user.id,
              email: result.user.email,
            };
          })
          .mapRoles((claims) => claims.roles || []),
      });

      expect(authentication.providers.Primary.type).toBe('custom');
      expect(authentication.providers.Primary.validate).toBeDefined();
    });

    it('should support multi-source token extraction', () => {
      const authentication = defineAuth({
        Primary: auth
          .custom()
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
          .mapRoles(() => ['user']),
      });

      expect(authentication.providers.Primary.config.tokenExtractor).toBeDefined();
    });

    it('should support API key style authentication', () => {
      const apiKeys = {
        'key-123': { userId: 'service-1', roles: ['service'] },
        'key-456': { userId: 'admin-cli', roles: ['admin', 'service'] },
      };

      const authentication = defineAuth({
        Primary: auth
          .custom()
          .header('X-API-Key')
          .validateTokens(async (token) => {
            const keyData = apiKeys[token as keyof typeof apiKeys];
            if (!keyData) {
              return { valid: false, error: 'Invalid API key' };
            }

            return {
              valid: true,
              claims: {
                sub: keyData.userId,
                roles: keyData.roles,
              },
              userId: keyData.userId,
            };
          })
          .mapRoles((claims) => claims.roles || []),
      });

      expect(authentication.providers.Primary.config.headerName).toBe('X-API-Key');
    });

    it('should support complex role mapping', () => {
      const authentication = defineAuth({
        Primary: auth
          .custom()
          .validateTokens(async (token) => ({
            valid: true,
            claims: {
              sub: 'user-123',
              permissions: ['read', 'write', 'admin'],
              department: 'engineering',
              isActive: true,
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

            // Add status-based roles
            if (claims.isActive) {
              roles.push('active-user');
            }

            return roles;
          }),
      });

      expect(authentication.providers.Primary.mapRoles).toBeDefined();

      // Test role mapper
      const mapper = authentication.providers.Primary.mapRoles!;
      const roles = mapper({
        permissions: ['read', 'write', 'admin'],
        department: 'engineering',
        isActive: true,
      });

      expect(roles).toEqual(['admin', 'editor', 'viewer', 'engineer', 'active-user']);
    });
  });

  describe('mixed provider configurations', () => {
    it('should work alongside Entra ID provider', () => {
      const authentication = defineAuth({
        Primary: auth.entra().tenant('tenant-123').clientId('client-456'),
        Custom: auth
          .custom()
          .validateTokens(async (token) => ({ valid: true, claims: {} }))
          .mapRoles(() => ['service']),
      });

      expect(authentication.providers.Primary.type).toBe('entra-id');
      expect(authentication.providers.Custom.type).toBe('custom');
    });

    it('should work alongside API Keys provider', () => {
      const authentication = defineAuth({
        Primary: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'service-1', secret: 'secret', roles: ['service'] }]),
        Custom: auth
          .custom()
          .validateTokens(async (token) => ({ valid: true, claims: {} }))
          .mapRoles(() => ['user']),
      });

      expect(authentication.providers.Primary.type).toBe('api-keys');
      expect(authentication.providers.Custom.type).toBe('custom');
    });

    it('should work with all three provider types', () => {
      const authentication = defineAuth({
        Entra: auth.entra().tenant('tenant-123').clientId('client-456'),
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([{ id: 'service-1', secret: 'secret', roles: ['service'] }]),
        Custom: auth
          .custom()
          .validateTokens(async (token) => ({ valid: true, claims: {} }))
          .mapRoles(() => ['custom-user']),
      });

      expect(authentication.providers.Entra.type).toBe('entra-id');
      expect(authentication.providers.ApiKeys.type).toBe('api-keys');
      expect(authentication.providers.Custom.type).toBe('custom');
    });
  });

  describe('type inference', () => {
    it('should infer correct types for custom provider', () => {
      const authentication = defineAuth({
        Primary: auth
          .custom()
          .validateTokens(async (token) => ({ valid: true, claims: {} }))
          .mapRoles(() => []),
      });

      // TypeScript should infer correct types
      type PrimaryConfig = typeof authentication.providers.Primary.config;

      expect(authentication.providers.Primary.config.type).toBe('custom');
    });
  });

  describe('validation', () => {
    it('should throw error if validator is missing', () => {
      expect(() => {
        defineAuth({
          Primary: auth.custom() as any, // Force type to bypass TypeScript check
        });
      }).toThrow();
    });

    it('should allow custom provider without role mapper (with warning)', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const authentication = defineAuth({
        Primary: auth.custom().validateTokens(async (token) => ({ valid: true, claims: {} })),
      });

      expect(authentication.providers.Primary).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
