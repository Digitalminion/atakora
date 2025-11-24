/**
 * Integration tests for rate limiting with authentication providers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { defineAuth } from './define-auth';
import { auth } from './providers';
import { minutes, hours } from '../common/duration';
import type { AuthRateLimiter } from './rate-limiter';

describe('Rate Limiting Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      shouldAdvanceTime: false,
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Entra ID with Rate Limiting', () => {
    it('should prevent brute force attacks on Entra ID authentication', async () => {
      const authConfig = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .rateLimiting({
            maxAttempts: 3,
            windowMs: minutes(15),
            blockDuration: hours(1),
            progressiveDelay: true,
          }),
      });

      const provider = authConfig.providers.Primary;
      expect(provider.config.rateLimiting).toBeDefined();

      const rateLimiter = provider.config.rateLimiter as AuthRateLimiter;
      expect(rateLimiter).toBeDefined();

      // Simulate brute force attack
      const attackerIp = '192.168.1.100';

      // First 3 attempts should be allowed (with increasing delay)
      for (let i = 0; i < 3; i++) {
        const promise = rateLimiter.checkLimit(attackerIp);
        if (i > 0) {
          const delay = 1000 * Math.pow(2, i - 1);
          await vi.advanceTimersByTimeAsync(delay);
        }
        const result = await promise;
        expect(result.allowed).toBe(true);

        // Simulate failed authentication
        rateLimiter.recordAttempt(attackerIp, false);
      }

      // 4th attempt should be blocked
      const blockedResult = await rateLimiter.checkLimit(attackerIp);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.reason).toContain('Rate limit exceeded');
      expect(blockedResult.retryAfter).toBe(60 * 60 * 1000); // 1 hour

      // Cleanup
      rateLimiter.stopCleanup();
    });

    it('should allow legitimate users while blocking attackers', async () => {
      const authConfig = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .rateLimiting({
            maxAttempts: 5,
            windowMs: minutes(15),
            blockDuration: minutes(30),
            progressiveDelay: false,
          }),
      });

      const provider = authConfig.providers.Primary;
      const rateLimiter = provider.config.rateLimiter as AuthRateLimiter;

      const legitimateUser = 'user-legit';
      const attacker = 'user-attacker';

      // Legitimate user tries once and succeeds
      let result = await rateLimiter.checkLimit(legitimateUser);
      expect(result.allowed).toBe(true);
      rateLimiter.recordAttempt(legitimateUser, true);

      // Attacker tries multiple times and fails
      for (let i = 0; i < 5; i++) {
        result = await rateLimiter.checkLimit(attacker);
        expect(result.allowed).toBe(true);
        rateLimiter.recordAttempt(attacker, false);
      }

      // Attacker is now blocked
      result = await rateLimiter.checkLimit(attacker);
      expect(result.allowed).toBe(false);

      // Legitimate user can still authenticate
      result = await rateLimiter.checkLimit(legitimateUser);
      expect(result.allowed).toBe(true);

      // Cleanup
      rateLimiter.stopCleanup();
    });
  });

  describe('API Keys with Rate Limiting', () => {
    it('should protect API endpoints from abuse', async () => {
      const authConfig = defineAuth({
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([
            {
              id: 'test-key',
              secret: 'test-secret',
              roles: ['api'],
            },
          ])
          .rateLimiting({
            maxAttempts: 100,
            windowMs: minutes(1),
            blockDuration: minutes(5),
            progressiveDelay: false,
          }),
      });

      const provider = authConfig.providers.ApiKeys;
      expect(provider.config.rateLimiting).toBeDefined();

      const rateLimiter = provider.config.rateLimiter as AuthRateLimiter;
      expect(rateLimiter).toBeDefined();

      const apiClient = 'api-client-1';

      // Should allow up to 100 requests per minute
      for (let i = 0; i < 99; i++) {
        const result = await rateLimiter.checkLimit(apiClient);
        expect(result.allowed).toBe(true);
        rateLimiter.recordAttempt(apiClient, false); // Record as failed attempts to increment counter
      }

      // 100th attempt should still be allowed
      let result = await rateLimiter.checkLimit(apiClient);
      expect(result.allowed).toBe(true);
      rateLimiter.recordAttempt(apiClient, false);

      // 101st attempt should be blocked
      const blockedResult = await rateLimiter.checkLimit(apiClient);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.retryAfter).toBe(5 * 60 * 1000); // 5 minutes

      // After 5 minutes, should be allowed again
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      const unblockedResult = await rateLimiter.checkLimit(apiClient);
      expect(unblockedResult.allowed).toBe(true);

      // Cleanup
      rateLimiter.stopCleanup();
    });

    it('should handle API key rotation with rate limiting', async () => {
      const authConfig = defineAuth({
        ApiKeys: auth
          .apiKeys()
          .enable()
          .keys([
            {
              id: 'key-v1',
              secret: 'secret-v1',
              roles: ['api'],
            },
            {
              id: 'key-v2',
              secret: 'secret-v2',
              roles: ['api'],
            },
          ])
          .rateLimiting({
            maxAttempts: 3,
            windowMs: minutes(5),
            blockDuration: minutes(15),
            progressiveDelay: true,
          }),
      });

      const provider = authConfig.providers.ApiKeys;
      const rateLimiter = provider.config.rateLimiter as AuthRateLimiter;

      // Try with first key until blocked
      const keyV1Id = 'key-v1';
      for (let i = 0; i < 3; i++) {
        const promise = rateLimiter.checkLimit(keyV1Id);
        if (i > 0) {
          const delay = 1000 * Math.pow(2, i - 1);
          await vi.advanceTimersByTimeAsync(delay);
        }
        const result = await promise;
        expect(result.allowed).toBe(true);
        rateLimiter.recordAttempt(keyV1Id, false);
      }

      // First key is now blocked
      let result = await rateLimiter.checkLimit(keyV1Id);
      expect(result.allowed).toBe(false);

      // But second key should still work
      const keyV2Id = 'key-v2';
      result = await rateLimiter.checkLimit(keyV2Id);
      expect(result.allowed).toBe(true);

      // Cleanup
      rateLimiter.stopCleanup();
    });
  });

  describe('Multiple Providers with Different Rate Limits', () => {
    it('should support different rate limiting configs per provider', () => {
      const authConfig = defineAuth({
        // Strict rate limiting for Entra ID (user authentication)
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .rateLimiting({
            maxAttempts: 5,
            windowMs: minutes(15),
            blockDuration: hours(1),
            progressiveDelay: true,
          }),

        // More lenient rate limiting for API keys (service accounts)
        ServiceAccounts: auth
          .apiKeys()
          .enable()
          .keys([
            {
              id: 'service-1',
              secret: 'secret-1',
              roles: ['service'],
            },
          ])
          .rateLimiting({
            maxAttempts: 1000,
            windowMs: minutes(1),
            blockDuration: minutes(5),
            progressiveDelay: false,
          }),
      });

      const entraProvider = authConfig.providers.Primary;
      const apiKeysProvider = authConfig.providers.ServiceAccounts;

      // Check Entra ID has strict limits
      expect(entraProvider.config.rateLimiting?.maxAttempts).toBe(5);
      expect(entraProvider.config.rateLimiting?.blockDuration.toMilliseconds()).toBe(
        60 * 60 * 1000
      );
      expect(entraProvider.config.rateLimiting?.progressiveDelay).toBe(true);

      // Check API Keys has lenient limits
      expect(apiKeysProvider.config.rateLimiting?.maxAttempts).toBe(1000);
      expect(apiKeysProvider.config.rateLimiting?.blockDuration.toMilliseconds()).toBe(
        5 * 60 * 1000
      );
      expect(apiKeysProvider.config.rateLimiting?.progressiveDelay).toBe(false);

      // Cleanup
      const entraLimiter = entraProvider.config.rateLimiter as AuthRateLimiter;
      const apiLimiter = apiKeysProvider.config.rateLimiter as AuthRateLimiter;
      entraLimiter?.stopCleanup();
      apiLimiter?.stopCleanup();
    });
  });

  describe('Rate Limiting with Session Management', () => {
    it('should reset rate limit on successful session creation', async () => {
      const authConfig = defineAuth({
        Primary: auth
          .entra()
          .tenant('test-tenant')
          .clientId('test-client')
          .session((session) => session.duration(hours(8)).sliding(true))
          .rateLimiting({
            maxAttempts: 3,
            windowMs: minutes(15),
            blockDuration: hours(1),
            progressiveDelay: true,
          }),
      });

      const provider = authConfig.providers.Primary;
      const rateLimiter = provider.config.rateLimiter as AuthRateLimiter;

      const userId = 'user-123';

      // Fail twice
      for (let i = 0; i < 2; i++) {
        const promise = rateLimiter.checkLimit(userId);
        if (i > 0) {
          await vi.advanceTimersByTimeAsync(1000);
        }
        const result = await promise;
        expect(result.allowed).toBe(true);
        rateLimiter.recordAttempt(userId, false);
      }

      // Check attempt count
      expect(rateLimiter.getAttemptCount(userId)).toBe(2);

      // Successful authentication (creates session)
      rateLimiter.recordAttempt(userId, true);

      // Attempt count should be reset
      expect(rateLimiter.getAttemptCount(userId)).toBe(0);

      // Next attempt should have no delay
      const result = await rateLimiter.checkLimit(userId);
      expect(result.allowed).toBe(true);
      expect(result.appliedDelay).toBe(0);

      // Cleanup
      rateLimiter.stopCleanup();
    });
  });
});
