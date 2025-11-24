/**
 * Tests for Entra ID Authentication Provider
 */

import { describe, it, expect } from 'vitest';
import { entra, EntraIdBuilder } from './entra';
import type { EntraIdConfig } from './entra';
import { hours } from '../../common/duration';

describe('EntraIdBuilder', () => {
  describe('Factory Function', () => {
    it('should create a new builder instance', () => {
      const builder = entra();
      expect(builder).toBeInstanceOf(EntraIdBuilder);
    });

    it('should create independent builder instances', () => {
      const builder1 = entra();
      const builder2 = entra();
      expect(builder1).not.toBe(builder2);
    });
  });

  describe('Builder Methods', () => {
    it('should set tenant ID', () => {
      const builder = entra()
        .tenant('12345678-1234-1234-1234-123456789012')
        .clientId('test-client');

      const config = builder._build();
      expect(config.tenant).toBe('12345678-1234-1234-1234-123456789012');
    });

    it('should set client ID', () => {
      const builder = entra()
        .tenant('test-tenant')
        .clientId('87654321-4321-4321-4321-210987654321');

      const config = builder._build();
      expect(config.clientId).toBe('87654321-4321-4321-4321-210987654321');
    });

    it('should set optional audience', () => {
      const builder = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .audience('api://my-app');

      const config = builder._build();
      expect(config.audience).toBe('api://my-app');
    });

    it('should set optional issuer', () => {
      const builder = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .issuer('https://login.microsoftonline.com/tenant-id/v2.0');

      const config = builder._build();
      expect(config.issuer).toBe('https://login.microsoftonline.com/tenant-id/v2.0');
    });

    it('should set token validator', () => {
      const validator = async (token: string) => ({
        valid: true,
        claims: { sub: 'user-id' },
      });

      const builder = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .validateTokens(validator);

      const config = builder._build();
      expect(config.tokenValidator).toBe(validator);
    });

    it('should set role mapper', () => {
      const mapper = (claims: Record<string, any>) => {
        return claims.groups || [];
      };

      const builder = entra().tenant('test-tenant').clientId('test-client').mapRoles(mapper);

      const config = builder._build();
      expect(config.roleMapper).toBe(mapper);
    });

    it('should support method chaining', () => {
      const builder = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .audience('api://my-app')
        .issuer('https://login.microsoftonline.com/tenant-id/v2.0');

      expect(builder).toBeInstanceOf(EntraIdBuilder);
    });
  });

  describe('Session Configuration', () => {
    it('should configure session with stub builder', () => {
      const builder = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .session((session) => session.duration(hours(8)).sliding(true));

      const config = builder._build();
      expect(config.session).toBeDefined();
      expect(config.session?.duration).toBeDefined();
      expect(config.session?.sliding).toBe(true);
    });

    it('should configure session storage', () => {
      const builder = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .session((session) => session.duration(hours(8)).storage('redis'));

      const config = builder._build();
      expect(config.session?.storage).toBe('redis');
    });

    it('should configure session TTL', () => {
      const ttl = hours(1);
      const builder = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .session((session) => session.duration(hours(8)).ttl(ttl));

      const config = builder._build();
      expect(config.session?.ttl).toBe(ttl);
    });
  });

  describe('MFA Configuration', () => {
    it('should configure MFA with stub builder', () => {
      const builder = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .mfa((mfa) => mfa.require(['admin']).challenge('totp'));

      const config = builder._build();
      expect(config.mfa).toBeDefined();
      expect(config.mfa?.requiredForRoles).toEqual(['admin']);
      expect(config.mfa?.challengeType).toBe('totp');
      expect(config.mfa?.required).toBe(true);
    });

    it('should configure MFA grace period', () => {
      const gracePeriod = hours(1);
      const builder = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .mfa((mfa) => mfa.require(['admin']).gracePeriod(gracePeriod));

      const config = builder._build();
      expect(config.mfa?.gracePeriod).toBe(gracePeriod);
    });

    it('should support different challenge types', () => {
      const challengeTypes: Array<'totp' | 'sms' | 'email'> = ['totp', 'sms', 'email'];

      for (const type of challengeTypes) {
        const builder = entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .mfa((mfa) => mfa.require(['admin']).challenge(type));

        const config = builder._build();
        expect(config.mfa?.challengeType).toBe(type);
      }
    });
  });

  describe('Build Configuration', () => {
    it('should build valid configuration with required fields', () => {
      const config = entra().tenant('test-tenant').clientId('test-client')._build();

      expect(config).toEqual({
        type: 'entra-id',
        tenant: 'test-tenant',
        clientId: 'test-client',
      });
    });

    it('should build configuration with all fields', () => {
      const validator = async (token: string) => ({ valid: true });
      const mapper = (claims: Record<string, any>) => claims.groups || [];

      const config = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .audience('api://my-app')
        .issuer('https://login.microsoftonline.com/tenant-id/v2.0')
        .validateTokens(validator)
        .mapRoles(mapper)
        .session((session) => session.duration(hours(8)))
        .mfa((mfa) => mfa.require(['admin']).challenge('totp'))
        ._build();

      expect(config.type).toBe('entra-id');
      expect(config.tenant).toBe('test-tenant');
      expect(config.clientId).toBe('test-client');
      expect(config.audience).toBe('api://my-app');
      expect(config.issuer).toBe('https://login.microsoftonline.com/tenant-id/v2.0');
      expect(config.tokenValidator).toBe(validator);
      expect(config.roleMapper).toBe(mapper);
      expect(config.session).toBeDefined();
      expect(config.mfa).toBeDefined();
    });

    it('should throw error if tenant is missing', () => {
      const builder = entra().clientId('test-client');

      expect(() => builder._build()).toThrow(/tenant ID/i);
    });

    it('should throw error if clientId is missing', () => {
      const builder = entra().tenant('test-tenant');

      expect(() => builder._build()).toThrow(/client ID/i);
    });

    it('should throw error if both tenant and clientId are missing', () => {
      const builder = entra();

      expect(() => builder._build()).toThrow(/tenant ID/i);
    });
  });

  describe('Type Safety', () => {
    it('should have correct type for configuration', () => {
      const config = entra().tenant('test-tenant').clientId('test-client')._build();

      // Type assertion to ensure correct type
      const typedConfig: EntraIdConfig = config;
      expect(typedConfig.type).toBe('entra-id');
    });

    it('should have entra-id as literal type', () => {
      const config = entra().tenant('test-tenant').clientId('test-client')._build();

      // This should not cause type errors
      const type: 'entra-id' = config.type;
      expect(type).toBe('entra-id');
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('should support basic Entra ID configuration', () => {
      const config = entra()
        .tenant(process.env.AZURE_TENANT_ID || 'test-tenant')
        .clientId(process.env.AZURE_CLIENT_ID || 'test-client')
        .audience(process.env.AZURE_AUDIENCE || 'api://my-app')
        ._build();

      expect(config.type).toBe('entra-id');
      expect(config.tenant).toBeTruthy();
      expect(config.clientId).toBeTruthy();
    });

    it('should support complex validation logic', () => {
      const expectedIssuer = 'https://login.microsoftonline.com/tenant-id/v2.0';

      const config = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .validateTokens(async (token, context) => {
          // Simulate JWT validation
          const claims = { iss: expectedIssuer, sub: 'user-id' };

          if (claims.iss !== expectedIssuer) {
            return { valid: false, error: 'Invalid issuer' };
          }

          return {
            valid: true,
            claims,
            userId: claims.sub,
          };
        })
        ._build();

      expect(config.tokenValidator).toBeDefined();
    });

    it('should support role mapping from Azure AD groups', () => {
      const config = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .mapRoles((claims) => {
          const groups = claims.groups || [];
          const roles: string[] = [];

          if (groups.includes('admin-group-id')) {
            roles.push('admin');
          }
          if (groups.includes('user-group-id')) {
            roles.push('user');
          }

          return roles;
        })
        ._build();

      expect(config.roleMapper).toBeDefined();

      // Test the mapper
      const roles = config.roleMapper?.({
        groups: ['admin-group-id', 'user-group-id'],
      });
      expect(roles).toEqual(['admin', 'user']);
    });

    it('should support full authentication configuration', () => {
      const config = entra()
        .tenant('12345678-1234-1234-1234-123456789012')
        .clientId('87654321-4321-4321-4321-210987654321')
        .audience('api://my-application')
        .issuer('https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012/v2.0')
        .validateTokens(async (token) => {
          // Real validation would verify JWT signature here
          return { valid: true, claims: { sub: 'user-id' } };
        })
        .mapRoles((claims) => {
          const groups = claims.groups || [];
          return groups.map((g: any) => g.name);
        })
        .session((session) => session.duration(hours(8)).sliding(true).storage('redis'))
        .mfa((mfa) => mfa.require(['admin', 'finance']).challenge('totp').gracePeriod(hours(1)))
        ._build();

      expect(config.type).toBe('entra-id');
      expect(config.tenant).toBeTruthy();
      expect(config.clientId).toBeTruthy();
      expect(config.audience).toBeTruthy();
      expect(config.issuer).toBeTruthy();
      expect(config.tokenValidator).toBeDefined();
      expect(config.roleMapper).toBeDefined();
      expect(config.session).toBeDefined();
      expect(config.mfa).toBeDefined();
    });
  });

  describe('Integration with defineAuth', () => {
    it('should be compatible with defineAuth expectations', () => {
      const builder = entra().tenant('test-tenant').clientId('test-client');

      // Verify builder has _build method
      expect(typeof builder._build).toBe('function');

      // Verify build produces valid config
      const config = builder._build();
      expect(config).toHaveProperty('type');
      expect(config.type).toBe('entra-id');
    });

    it('should maintain immutability - multiple builds return same values', () => {
      const builder = entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .audience('api://my-app');

      const config1 = builder._build();
      const config2 = builder._build();

      expect(config1).toEqual(config2);
      expect(config1.tenant).toBe(config2.tenant);
      expect(config1.clientId).toBe(config2.clientId);
      expect(config1.audience).toBe(config2.audience);
    });
  });
});
