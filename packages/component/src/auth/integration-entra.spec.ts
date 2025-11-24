/**
 * Integration Tests for Entra ID Provider with defineAuth
 */

import { describe, it, expect } from 'vitest';
import { defineAuth, auth, validateAuthForProduction } from './index';
import { hours } from '../common/duration';

describe('Entra ID Integration with defineAuth', () => {
  it('should work with defineAuth - basic configuration', () => {
    const authentication = defineAuth({
      Primary: auth.entra().tenant('test-tenant-id').clientId('test-client-id'),
    });

    expect(authentication.providers.Primary).toBeDefined();
    expect(authentication.providers.Primary.type).toBe('entra-id');
    expect(authentication.providers.Primary.config).toHaveProperty('tenant', 'test-tenant-id');
    expect(authentication.providers.Primary.config).toHaveProperty('clientId', 'test-client-id');
  });

  it('should work with defineAuth - full configuration', () => {
    const authentication = defineAuth({
      Primary: auth
        .entra()
        .tenant('12345678-1234-1234-1234-123456789012')
        .clientId('87654321-4321-4321-4321-210987654321')
        .audience('api://my-app')
        .issuer('https://login.microsoftonline.com/tenant-id/v2.0')
        .validateTokens(async (token) => {
          return { valid: true, claims: { sub: 'user-id' } };
        })
        .mapRoles((claims) => {
          const groups = claims.groups || [];
          return groups.map((g: any) => g.name || g);
        })
        .session((session) => session.duration(hours(8)).sliding(true))
        .mfa((mfa) => mfa.require(['admin']).challenge('totp')),
    });

    const primary = authentication.providers.Primary;
    expect(primary.type).toBe('entra-id');
    expect(primary.validate).toBeDefined();
    expect(primary.mapRoles).toBeDefined();
    expect(primary.config.tenant).toBe('12345678-1234-1234-1234-123456789012');
    expect(primary.config.clientId).toBe('87654321-4321-4321-4321-210987654321');
    expect(primary.config.audience).toBe('api://my-app');
    expect(primary.config.issuer).toBe('https://login.microsoftonline.com/tenant-id/v2.0');
    expect(primary.config.session).toBeDefined();
    expect(primary.config.mfa).toBeDefined();
  });

  it('should work with multiple providers including Entra ID', () => {
    const authentication = defineAuth({
      Primary: auth.entra().tenant('test-tenant').clientId('test-client'),
      ApiKeys: auth
        .apiKeys()
        .enable()
        .keys([
          {
            id: 'service-1',
            secret: 'test-secret',
            roles: ['service'],
          },
        ]),
    });

    expect(authentication.providers.Primary.type).toBe('entra-id');
    expect(authentication.providers.ApiKeys.type).toBe('api-keys');
    expect(authentication.primaryProvider).toBe('Primary');
  });

  it('should extract token validator from Entra ID config', () => {
    const validator = async (token: string) => ({
      valid: true,
      claims: { sub: 'user-id', email: 'user@example.com' },
      userId: 'user-id',
      email: 'user@example.com',
    });

    const authentication = defineAuth({
      Primary: auth.entra().tenant('test-tenant').clientId('test-client').validateTokens(validator),
    });

    expect(authentication.providers.Primary.validate).toBe(validator);
  });

  it('should extract role mapper from Entra ID config', () => {
    const mapper = (claims: Record<string, any>) => {
      const groups = claims.groups || [];
      const roles: string[] = [];

      if (groups.includes('admin-group-id')) {
        roles.push('admin');
      }
      if (groups.includes('user-group-id')) {
        roles.push('user');
      }

      return roles;
    };

    const authentication = defineAuth({
      Primary: auth.entra().tenant('test-tenant').clientId('test-client').mapRoles(mapper),
    });

    expect(authentication.providers.Primary.mapRoles).toBe(mapper);

    // Test the mapper
    const roles = authentication.providers.Primary.mapRoles?.({
      groups: ['admin-group-id', 'user-group-id'],
    });
    expect(roles).toEqual(['admin', 'user']);
  });

  it('should validate production configuration with Entra ID', () => {
    const authentication = defineAuth({
      Primary: auth
        .entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .validateTokens(async (token) => ({ valid: true }))
        .mapRoles((claims) => claims.groups || []),
    });

    const validation = validateAuthForProduction(authentication);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should throw error if Entra ID provider missing tenant', () => {
    expect(() => {
      defineAuth({
        Primary: auth.entra().clientId('test-client'),
      });
    }).toThrow(/tenant ID/i);
  });

  it('should throw error if Entra ID provider missing clientId', () => {
    expect(() => {
      defineAuth({
        Primary: auth.entra().tenant('test-tenant'),
      });
    }).toThrow(/client ID/i);
  });

  it('should preserve session configuration in processed provider', () => {
    const authentication = defineAuth({
      Primary: auth
        .entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .session((session) => session.duration(hours(8)).sliding(true).storage('redis')),
    });

    const sessionConfig = authentication.providers.Primary.config.session;
    expect(sessionConfig).toBeDefined();
    expect(sessionConfig?.duration).toBeDefined();
    expect(sessionConfig?.sliding).toBe(true);
    expect(sessionConfig?.storage).toBe('redis');
  });

  it('should preserve MFA configuration in processed provider', () => {
    const authentication = defineAuth({
      Primary: auth
        .entra()
        .tenant('test-tenant')
        .clientId('test-client')
        .mfa((mfa) => mfa.require(['admin', 'finance']).challenge('totp').gracePeriod(hours(1))),
    });

    const mfaConfig = authentication.providers.Primary.config.mfa;
    expect(mfaConfig).toBeDefined();
    expect(mfaConfig?.requiredForRoles).toEqual(['admin', 'finance']);
    expect(mfaConfig?.challengeType).toBe('totp');
    expect(mfaConfig?.gracePeriod).toBeDefined();
    expect(mfaConfig?.required).toBe(true);
  });

  it('should work with environment variables pattern', () => {
    // Simulate environment variables
    const env = {
      AZURE_TENANT_ID: '12345678-1234-1234-1234-123456789012',
      AZURE_CLIENT_ID: '87654321-4321-4321-4321-210987654321',
      AZURE_AUDIENCE: 'api://my-application',
    };

    const authentication = defineAuth({
      Primary: auth
        .entra()
        .tenant(env.AZURE_TENANT_ID)
        .clientId(env.AZURE_CLIENT_ID)
        .audience(env.AZURE_AUDIENCE),
    });

    expect(authentication.providers.Primary.config.tenant).toBe(env.AZURE_TENANT_ID);
    expect(authentication.providers.Primary.config.clientId).toBe(env.AZURE_CLIENT_ID);
    expect(authentication.providers.Primary.config.audience).toBe(env.AZURE_AUDIENCE);
  });

  it('should create proper metadata', () => {
    const authentication = defineAuth({
      Primary: auth.entra().tenant('test-tenant').clientId('test-client'),
    });

    expect(authentication._metadata).toBeDefined();
    expect(authentication._metadata.version).toBe('1.0.0');
    expect(authentication._metadata.providerNames).toEqual(['Primary']);
    expect(authentication._metadata.createdAt).toBeTruthy();
  });

  it('should match backend-simple reference pattern', () => {
    // This is the exact pattern from backend-simple
    const authentication = defineAuth({
      Primary: auth
        .entra()
        .tenant('test-tenant-id')
        .clientId('test-client-id')
        .audience('test-audience')
        .validateTokens(async (token, claims) => {
          // Token validation logic
          return { valid: true, claims: { sub: 'user-id' } };
        })
        .mapRoles((claims) => {
          const groups = claims.groups || [];
          return groups.map((g: any) => g.name);
        })
        .session((session) => session.duration(hours(8)).sliding(true))
        .mfa((mfa) => mfa.require(['admin']).challenge('totp')),
    });

    expect(authentication.providers.Primary.type).toBe('entra-id');
    expect(authentication.primaryProvider).toBe('Primary');
    expect(authentication.providers.Primary.validate).toBeDefined();
    expect(authentication.providers.Primary.mapRoles).toBeDefined();
  });
});
