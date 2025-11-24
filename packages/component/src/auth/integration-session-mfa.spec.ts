/**
 * Integration Tests for Session and MFA with Entra Provider
 */

import { describe, it, expect } from 'vitest';
import { defineAuth } from './define-auth';
import { auth } from './providers';
import { hours, minutes, days } from '../common/duration';

describe('Session and MFA Integration', () => {
  describe('Session with Entra Provider', () => {
    it('should configure basic session', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .session((session) => session.duration(hours(8))),
      });

      const provider = authentication.providers.Primary;
      expect(provider.config.session).toBeDefined();
      expect(provider.config.session!.duration.toHours()).toBe(8);
      expect(provider.config.session!.sliding).toBe(false);
    });

    it('should configure session with sliding expiration', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .session((session) => session.duration(hours(8)).sliding(true)),
      });

      const provider = authentication.providers.Primary;
      expect(provider.config.session).toBeDefined();
      expect(provider.config.session!.duration.toHours()).toBe(8);
      expect(provider.config.session!.sliding).toBe(true);
    });

    it('should configure session with Redis storage', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .session((session) => session.duration(hours(8)).sliding(true).storage('redis')),
      });

      const provider = authentication.providers.Primary;
      expect(provider.config.session).toBeDefined();
      expect(provider.config.session!.storage).toBe('redis');
    });

    it('should configure session with TTL', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .session((session) => session.duration(hours(8)).ttl(hours(9)).storage('redis')),
      });

      const provider = authentication.providers.Primary;
      expect(provider.config.session).toBeDefined();
      expect(provider.config.session!.duration.toHours()).toBe(8);
      expect(provider.config.session!.ttl).toBeDefined();
      expect(provider.config.session!.ttl!.toHours()).toBe(9);
    });

    it('should configure production session scenario', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .session((session) =>
            session.duration(hours(8)).sliding(true).storage('redis').ttl(hours(9))
          ),
      });

      const provider = authentication.providers.Primary;
      const sessionConfig = provider.config.session!;

      expect(sessionConfig.duration.toHours()).toBe(8);
      expect(sessionConfig.sliding).toBe(true);
      expect(sessionConfig.storage).toBe('redis');
      expect(sessionConfig.ttl!.toHours()).toBe(9);
    });
  });

  describe('MFA with Entra Provider', () => {
    it('should configure basic MFA', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .mfa((mfa) => mfa.require(['admin'])),
      });

      const provider = authentication.providers.Primary;
      expect(provider.config.mfa).toBeDefined();
      expect(provider.config.mfa!.required).toBe(true);
      expect(provider.config.mfa!.requiredForRoles).toEqual(['admin']);
      expect(provider.config.mfa!.challengeType).toBe('totp');
    });

    it('should configure MFA with SMS challenge', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .mfa((mfa) => mfa.require(['admin']).challenge('sms')),
      });

      const provider = authentication.providers.Primary;
      expect(provider.config.mfa).toBeDefined();
      expect(provider.config.mfa!.challengeType).toBe('sms');
    });

    it('should configure MFA with grace period', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .mfa((mfa) => mfa.require(['admin']).challenge('totp').gracePeriod(hours(1))),
      });

      const provider = authentication.providers.Primary;
      expect(provider.config.mfa).toBeDefined();
      expect(provider.config.mfa!.gracePeriod).toBeDefined();
      expect(provider.config.mfa!.gracePeriod!.toHours()).toBe(1);
    });

    it('should configure MFA for multiple roles', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .mfa((mfa) => mfa.require(['admin', 'finance', 'executive'])),
      });

      const provider = authentication.providers.Primary;
      expect(provider.config.mfa).toBeDefined();
      expect(provider.config.mfa!.requiredForRoles).toEqual(['admin', 'finance', 'executive']);
    });

    it('should configure production MFA scenario', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .mfa((mfa) => mfa.require(['admin', 'finance']).challenge('totp').gracePeriod(hours(1))),
      });

      const provider = authentication.providers.Primary;
      const mfaConfig = provider.config.mfa!;

      expect(mfaConfig.required).toBe(true);
      expect(mfaConfig.requiredForRoles).toEqual(['admin', 'finance']);
      expect(mfaConfig.challengeType).toBe('totp');
      expect(mfaConfig.gracePeriod!.toHours()).toBe(1);
    });
  });

  describe('Session and MFA Combined', () => {
    it('should configure both session and MFA', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .session((session) => session.duration(hours(8)).sliding(true))
          .mfa((mfa) => mfa.require(['admin']).challenge('totp')),
      });

      const provider = authentication.providers.Primary;

      // Validate session config
      expect(provider.config.session).toBeDefined();
      expect(provider.config.session!.duration.toHours()).toBe(8);
      expect(provider.config.session!.sliding).toBe(true);

      // Validate MFA config
      expect(provider.config.mfa).toBeDefined();
      expect(provider.config.mfa!.required).toBe(true);
      expect(provider.config.mfa!.requiredForRoles).toEqual(['admin']);
    });

    it('should configure complete authentication scenario', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .audience('api://my-app')
          .validateTokens(async (token) => ({ valid: true }))
          .mapRoles((claims) => claims.groups || [])
          .session((session) =>
            session.duration(hours(8)).sliding(true).storage('redis').ttl(hours(9))
          )
          .mfa((mfa) => mfa.require(['admin', 'finance']).challenge('totp').gracePeriod(hours(1))),
      });

      const provider = authentication.providers.Primary;

      // Validate all config
      expect(provider.config.type).toBe('entra-id');
      expect(provider.config.tenant).toBe('test-tenant');
      expect(provider.config.clientId).toBe('test-client');
      expect(provider.config.audience).toBe('api://my-app');
      expect(provider.validate).toBeDefined(); // Extracted from tokenValidator
      expect(provider.mapRoles).toBeDefined(); // Extracted from roleMapper
      expect(provider.config.session).toBeDefined();
      expect(provider.config.mfa).toBeDefined();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should configure enterprise scenario with strict security', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant(process.env.AZURE_TENANT_ID || 'test-tenant')
          .clientId(process.env.AZURE_CLIENT_ID || 'test-client')
          .audience(process.env.AZURE_AUDIENCE || 'api://app')
          .session((session) =>
            session
              .duration(hours(4)) // Short session for security
              .sliding(false) // Fixed timeout
              .storage('redis')
          )
          .mfa(
            (mfa) =>
              mfa
                .require(['admin', 'privileged']) // Require for sensitive roles
                .challenge('totp')
                .gracePeriod(minutes(15)) // Short grace period
          ),
      });

      const provider = authentication.providers.Primary;

      expect(provider.config.session!.duration.toHours()).toBe(4);
      expect(provider.config.session!.sliding).toBe(false);
      expect(provider.config.mfa!.required).toBe(true);
      expect(provider.config.mfa!.gracePeriod!.toMinutes()).toBe(15);
    });

    it('should configure developer-friendly scenario', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .session(
            (session) =>
              session
                .duration(days(7)) // Long session for convenience
                .sliding(true) // Keep alive with activity
                .storage('memory') // Simple storage for dev
          ),
        // No MFA for development
      });

      const provider = authentication.providers.Primary;

      expect(provider.config.session!.duration.toDays()).toBe(7);
      expect(provider.config.session!.sliding).toBe(true);
      expect(provider.config.session!.storage).toBe('memory');
      expect(provider.config.mfa).toBeUndefined();
    });

    it('should configure balanced production scenario', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .session(
            (session) =>
              session
                .duration(hours(8)) // Work day session
                .sliding(true) // Extend while active
                .storage('redis')
                .ttl(hours(10)) // Cleanup buffer
          )
          .mfa(
            (mfa) =>
              mfa
                .require(['admin']) // Only admins need MFA
                .challenge('totp')
                .gracePeriod(hours(1)) // Reasonable grace period
          ),
      });

      const provider = authentication.providers.Primary;

      expect(provider.config.session!.duration.toHours()).toBe(8);
      expect(provider.config.session!.sliding).toBe(true);
      expect(provider.config.session!.storage).toBe('redis');
      expect(provider.config.session!.ttl!.toHours()).toBe(10);
      expect(provider.config.mfa!.requiredForRoles).toEqual(['admin']);
      expect(provider.config.mfa!.gracePeriod!.toHours()).toBe(1);
    });
  });

  describe('Type Safety', () => {
    it('should have correct types for session config', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .session((session) => session.duration(hours(8))),
      });

      const provider = authentication.providers.Primary;
      const sessionConfig = provider.config.session;

      // TypeScript should infer correct types
      if (sessionConfig) {
        expect(sessionConfig.duration).toBeDefined();
        expect(typeof sessionConfig.sliding).toBe('boolean');
        expect(sessionConfig.storage).toBeUndefined();
        expect(sessionConfig.ttl).toBeUndefined();
      }
    });

    it('should have correct types for MFA config', () => {
      const authentication = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .mfa((mfa) => mfa.require(['admin'])),
      });

      const provider = authentication.providers.Primary;
      const mfaConfig = provider.config.mfa;

      // TypeScript should infer correct types
      if (mfaConfig) {
        expect(typeof mfaConfig.required).toBe('boolean');
        expect(Array.isArray(mfaConfig.requiredForRoles)).toBe(true);
        expect(mfaConfig.challengeType).toBe('totp');
      }
    });
  });
});
