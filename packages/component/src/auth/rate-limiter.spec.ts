/**
 * Tests for Authentication Rate Limiter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AuthRateLimiter,
  createLoginRateLimiter,
  createApiRateLimiter,
  createStrictRateLimiter,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limiter';
import { milliseconds, seconds, minutes, hours } from '../common/duration';

describe('AuthRateLimiter', () => {
  let rateLimiter: AuthRateLimiter;

  beforeEach(() => {
    // Use fake timers for consistent testing
    vi.useFakeTimers({
      shouldAdvanceTime: false,
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
  });

  afterEach(() => {
    if (rateLimiter) {
      rateLimiter.stopCleanup();
    }
    vi.useRealTimers();
  });

  describe('Basic Rate Limiting', () => {
    beforeEach(() => {
      rateLimiter = new AuthRateLimiter({
        maxAttempts: 3,
        windowMs: minutes(5),
        blockDuration: minutes(10),
        progressiveDelay: false,
      });
    });

    it('should allow requests up to the limit', async () => {
      const identifier = 'user-123';

      // First 3 attempts should be allowed
      for (let i = 0; i < 3; i++) {
        const result = await rateLimiter.checkLimit(identifier);
        expect(result.allowed).toBe(true);
        expect(result.attemptCount).toBe(i);
        rateLimiter.recordAttempt(identifier, false);
      }

      // 4th attempt should be blocked
      const blockedResult = await rateLimiter.checkLimit(identifier);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.reason).toContain('Rate limit exceeded');
      expect(blockedResult.retryAfter).toBe(10 * 60 * 1000); // 10 minutes
    });

    it('should track different identifiers separately', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // Record 2 attempts for user1
      for (let i = 0; i < 2; i++) {
        await rateLimiter.checkLimit(user1);
        rateLimiter.recordAttempt(user1, false);
      }

      // user2 should still be allowed
      const result = await rateLimiter.checkLimit(user2);
      expect(result.allowed).toBe(true);
      expect(result.attemptCount).toBe(0);

      // user1 should still be allowed one more
      const user1Result = await rateLimiter.checkLimit(user1);
      expect(user1Result.allowed).toBe(true);
      expect(user1Result.attemptCount).toBe(2);
    });

    it('should reset counter on successful authentication', async () => {
      const identifier = 'user-123';

      // Record 2 failed attempts
      for (let i = 0; i < 2; i++) {
        await rateLimiter.checkLimit(identifier);
        rateLimiter.recordAttempt(identifier, false);
      }

      // Record successful authentication
      rateLimiter.recordAttempt(identifier, true);

      // Counter should be reset
      const result = await rateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(true);
      expect(result.attemptCount).toBe(0);
    });

    it('should enforce block duration correctly', async () => {
      const identifier = 'user-123';

      // Exceed rate limit
      for (let i = 0; i < 3; i++) {
        await rateLimiter.checkLimit(identifier);
        rateLimiter.recordAttempt(identifier, false);
      }

      // Should be blocked
      let result = await rateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(10 * 60 * 1000);

      // Advance time by 5 minutes (still blocked)
      vi.advanceTimersByTime(5 * 60 * 1000);
      result = await rateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeLessThanOrEqual(5 * 60 * 1000);

      // Advance time by another 5 minutes (should be unblocked)
      vi.advanceTimersByTime(5 * 60 * 1000);
      result = await rateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Sliding Window', () => {
    beforeEach(() => {
      rateLimiter = new AuthRateLimiter({
        maxAttempts: 3,
        windowMs: minutes(5),
        blockDuration: minutes(10),
        progressiveDelay: false,
      });
    });

    it('should clean old attempts from window', async () => {
      const identifier = 'user-123';

      // Record 2 attempts
      for (let i = 0; i < 2; i++) {
        await rateLimiter.checkLimit(identifier);
        rateLimiter.recordAttempt(identifier, false);
      }

      // Advance time by 3 minutes
      vi.advanceTimersByTime(3 * 60 * 1000);

      // Record 1 more attempt (total 3 attempts, but only 3 in current window)
      await rateLimiter.checkLimit(identifier);
      rateLimiter.recordAttempt(identifier, false);

      // Should be blocked now (3 attempts reached in window)
      let result = await rateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Rate limit exceeded');

      // Advance time by 3 more minutes (first 2 attempts now outside window)
      vi.advanceTimersByTime(3 * 60 * 1000);

      // Should still be blocked (block duration is 10 minutes)
      result = await rateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);

      // Advance time past block duration (need total 10 min from block start)
      vi.advanceTimersByTime(7 * 60 * 1000); // 3 min + 7 min = 10 min total

      // Should be allowed now (block expired, old attempts outside window)
      result = await rateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(true);
      expect(result.attemptCount).toBe(0); // All old attempts are outside the 5-minute window
    });

    it('should handle attempts at window boundary correctly', async () => {
      const identifier = 'user-123';

      // Record 3 attempts
      for (let i = 0; i < 3; i++) {
        await rateLimiter.checkLimit(identifier);
        rateLimiter.recordAttempt(identifier, false);
      }

      // Should be blocked now
      let result = await rateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);

      // Advance time past block duration (10 minutes)
      vi.advanceTimersByTime(10 * 60 * 1000 + 1);

      // Should be allowed now (block expired and attempts outside window)
      result = await rateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(true);
      expect(result.attemptCount).toBe(0);
    });
  });

  describe('Progressive Delay', () => {
    beforeEach(() => {
      rateLimiter = new AuthRateLimiter({
        maxAttempts: 5,
        windowMs: minutes(15),
        blockDuration: hours(1),
        progressiveDelay: true,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      });
    });

    it('should apply exponential backoff for repeated failures', async () => {
      const identifier = 'user-123';

      // First attempt - no delay
      const promise1 = rateLimiter.checkLimit(identifier);
      const result1 = await promise1;
      expect(result1.allowed).toBe(true);
      expect(result1.appliedDelay).toBe(0);
      rateLimiter.recordAttempt(identifier, false);

      // Second attempt - 1s delay (1000 * 2^0)
      const promise2 = rateLimiter.checkLimit(identifier);
      await vi.advanceTimersByTimeAsync(1000);
      const result2 = await promise2;
      expect(result2.allowed).toBe(true);
      expect(result2.appliedDelay).toBe(1000);
      rateLimiter.recordAttempt(identifier, false);

      // Third attempt - 2s delay (1000 * 2^1)
      const promise3 = rateLimiter.checkLimit(identifier);
      await vi.advanceTimersByTimeAsync(2000);
      const result3 = await promise3;
      expect(result3.allowed).toBe(true);
      expect(result3.appliedDelay).toBe(2000);
      rateLimiter.recordAttempt(identifier, false);

      // Fourth attempt - 4s delay (1000 * 2^2)
      const promise4 = rateLimiter.checkLimit(identifier);
      await vi.advanceTimersByTimeAsync(4000);
      const result4 = await promise4;
      expect(result4.allowed).toBe(true);
      expect(result4.appliedDelay).toBe(4000);
      rateLimiter.recordAttempt(identifier, false);

      // Fifth attempt - 8s delay (1000 * 2^3)
      const promise5 = rateLimiter.checkLimit(identifier);
      await vi.advanceTimersByTimeAsync(8000);
      const result5 = await promise5;
      expect(result5.allowed).toBe(true);
      expect(result5.appliedDelay).toBe(8000);
    });

    it('should respect maximum delay limit', async () => {
      const identifier = 'user-123';

      // Create many failed attempts to trigger high delay
      for (let i = 0; i < 4; i++) {
        const promise = rateLimiter.checkLimit(identifier);
        if (i > 0) {
          const delay = 1000 * Math.pow(2, i - 1);
          await vi.advanceTimersByTimeAsync(delay);
        }
        await promise;
        rateLimiter.recordAttempt(identifier, false);
      }

      // Next attempt should have delay capped at maxDelayMs
      const promise = rateLimiter.checkLimit(identifier);
      await vi.advanceTimersByTimeAsync(8000); // 1000 * 2^3
      const result = await promise;
      expect(result.allowed).toBe(true);
      expect(result.appliedDelay).toBe(8000); // 1000 * 2^3, still under max

      // Even with more failures, delay should not exceed max
      rateLimiter.recordAttempt(identifier, false);
      const nextPromise = rateLimiter.checkLimit(identifier);
      const nextResult = await nextPromise;
      expect(nextResult.allowed).toBe(false); // Now blocked (5 attempts reached)
    });

    it('should reset progressive delay on successful auth', async () => {
      const identifier = 'user-123';

      // Record some failed attempts
      for (let i = 0; i < 3; i++) {
        const promise = rateLimiter.checkLimit(identifier);
        if (i > 0) {
          const delay = 1000 * Math.pow(2, i - 1);
          await vi.advanceTimersByTimeAsync(delay);
        }
        await promise;
        rateLimiter.recordAttempt(identifier, false);
      }

      // Record successful authentication
      rateLimiter.recordAttempt(identifier, true);

      // Next attempt should have no delay (reset)
      const result = await rateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(true);
      expect(result.appliedDelay).toBe(0);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should automatically clean up old records', () => {
      rateLimiter = new AuthRateLimiter({
        maxAttempts: 3,
        windowMs: minutes(5),
        blockDuration: minutes(10),
        progressiveDelay: false,
      });

      const identifier = 'user-123';

      // Record some attempts
      rateLimiter.recordAttempt(identifier, false);
      expect(rateLimiter.getAttemptCount(identifier)).toBe(1);

      // Advance time beyond window and block duration
      vi.advanceTimersByTime(30 * 60 * 1000);

      // Trigger cleanup
      vi.advanceTimersByTime(60 * 1000);

      // Old record should be cleaned up
      expect(rateLimiter.getAttemptCount(identifier)).toBe(0);
    });

    it('should handle manual reset correctly', () => {
      rateLimiter = new AuthRateLimiter({
        maxAttempts: 3,
        windowMs: minutes(5),
        blockDuration: minutes(10),
        progressiveDelay: false,
      });

      const identifier = 'user-123';

      // Record attempts
      rateLimiter.recordAttempt(identifier, false);
      rateLimiter.recordAttempt(identifier, false);
      expect(rateLimiter.getAttemptCount(identifier)).toBe(2);

      // Reset
      rateLimiter.reset(identifier);
      expect(rateLimiter.getAttemptCount(identifier)).toBe(0);
    });

    it('should clear all records when requested', () => {
      rateLimiter = new AuthRateLimiter({
        maxAttempts: 3,
        windowMs: minutes(5),
        blockDuration: minutes(10),
        progressiveDelay: false,
      });

      // Record attempts for multiple users
      rateLimiter.recordAttempt('user-1', false);
      rateLimiter.recordAttempt('user-2', false);
      rateLimiter.recordAttempt('user-3', false);

      expect(rateLimiter.getAttemptCount('user-1')).toBe(1);
      expect(rateLimiter.getAttemptCount('user-2')).toBe(1);
      expect(rateLimiter.getAttemptCount('user-3')).toBe(1);

      // Clear all
      rateLimiter.clearAll();

      expect(rateLimiter.getAttemptCount('user-1')).toBe(0);
      expect(rateLimiter.getAttemptCount('user-2')).toBe(0);
      expect(rateLimiter.getAttemptCount('user-3')).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      rateLimiter = new AuthRateLimiter({
        maxAttempts: 3,
        windowMs: minutes(5),
        blockDuration: minutes(10),
        progressiveDelay: false,
      });
    });

    it('should correctly report if identifier is blocked', async () => {
      const identifier = 'user-123';

      expect(rateLimiter.isBlocked(identifier)).toBe(false);

      // Exceed rate limit
      for (let i = 0; i < 3; i++) {
        await rateLimiter.checkLimit(identifier);
        rateLimiter.recordAttempt(identifier, false);
      }

      // Trigger block
      await rateLimiter.checkLimit(identifier);
      expect(rateLimiter.isBlocked(identifier)).toBe(true);

      // Advance time past block duration
      vi.advanceTimersByTime(11 * 60 * 1000);
      expect(rateLimiter.isBlocked(identifier)).toBe(false);
    });

    it('should correctly report time until unblock', async () => {
      const identifier = 'user-123';

      expect(rateLimiter.getTimeUntilUnblock(identifier)).toBe(0);

      // Exceed rate limit
      for (let i = 0; i < 3; i++) {
        await rateLimiter.checkLimit(identifier);
        rateLimiter.recordAttempt(identifier, false);
      }

      // Trigger block
      await rateLimiter.checkLimit(identifier);
      expect(rateLimiter.getTimeUntilUnblock(identifier)).toBe(10 * 60 * 1000);

      // Advance time
      vi.advanceTimersByTime(3 * 60 * 1000);
      expect(rateLimiter.getTimeUntilUnblock(identifier)).toBe(7 * 60 * 1000);

      // Advance past block
      vi.advanceTimersByTime(8 * 60 * 1000);
      expect(rateLimiter.getTimeUntilUnblock(identifier)).toBe(0);
    });
  });

  describe('Factory Functions', () => {
    it('should create login rate limiter with expected config', async () => {
      const limiter = createLoginRateLimiter();

      const identifier = 'user-login';

      // Should allow 5 attempts (with progressive delay)
      for (let i = 0; i < 5; i++) {
        const promise = limiter.checkLimit(identifier);
        if (i > 0) {
          const delay = Math.min(1000 * Math.pow(2, i - 1), 10000);
          await vi.advanceTimersByTimeAsync(delay);
        }
        const result = await promise;
        expect(result.allowed).toBe(true);
        limiter.recordAttempt(identifier, false);
      }

      // 6th attempt should be blocked
      const result = await limiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(60 * 60 * 1000); // 1 hour

      limiter.stopCleanup();
    });

    it('should create API rate limiter with expected config', async () => {
      const limiter = createApiRateLimiter();

      const identifier = 'api-client';

      // Should allow 100 attempts in 1 minute
      for (let i = 0; i < 100; i++) {
        const result = await limiter.checkLimit(identifier);
        expect(result.allowed).toBe(true);
        expect(result.appliedDelay).toBe(0); // No progressive delay
        limiter.recordAttempt(identifier, false);
      }

      // 101st attempt should be blocked
      const result = await limiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(5 * 60 * 1000); // 5 minutes

      limiter.stopCleanup();
    });

    it('should create strict rate limiter with expected config', async () => {
      const limiter = createStrictRateLimiter();

      const identifier = 'sensitive-op';

      // Should allow only 3 attempts (with progressive delay)
      for (let i = 0; i < 3; i++) {
        const promise = limiter.checkLimit(identifier);
        if (i > 0) {
          const delay = Math.min(2000 * Math.pow(2, i - 1), 60000);
          await vi.advanceTimersByTimeAsync(delay);
        }
        const result = await promise;
        expect(result.allowed).toBe(true);
        limiter.recordAttempt(identifier, false);
      }

      // 4th attempt should be blocked for 24 hours
      const result = await limiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(24 * 60 * 60 * 1000); // 24 hours

      limiter.stopCleanup();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid concurrent attempts correctly', async () => {
      rateLimiter = new AuthRateLimiter({
        maxAttempts: 3,
        windowMs: minutes(5),
        blockDuration: minutes(10),
        progressiveDelay: false,
      });

      const identifier = 'concurrent-user';

      // Simulate rapid concurrent attempts
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(rateLimiter.checkLimit(identifier));
      }

      const results = await Promise.all(promises);

      // First 3 should be allowed
      expect(results.slice(0, 3).every((r) => r.allowed)).toBe(true);

      // Record the attempts
      for (let i = 0; i < 3; i++) {
        rateLimiter.recordAttempt(identifier, false);
      }

      // Next check should be blocked
      const blockedResult = await rateLimiter.checkLimit(identifier);
      expect(blockedResult.allowed).toBe(false);
    });

    it('should handle zero window correctly', async () => {
      rateLimiter = new AuthRateLimiter({
        maxAttempts: 1,
        windowMs: milliseconds(0),
        blockDuration: minutes(1),
        progressiveDelay: false,
      });

      const identifier = 'zero-window';

      // Should always allow since window is 0 (attempts immediately expire)
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiter.checkLimit(identifier);
        expect(result.allowed).toBe(true);
        rateLimiter.recordAttempt(identifier, false);
      }
    });

    it('should handle very large attempt counts efficiently', async () => {
      rateLimiter = new AuthRateLimiter({
        maxAttempts: 1000,
        windowMs: hours(1),
        blockDuration: minutes(10),
        progressiveDelay: false,
      });

      const identifier = 'high-volume';
      const startTime = Date.now();

      // Record many attempts
      for (let i = 0; i < 999; i++) {
        await rateLimiter.checkLimit(identifier);
        rateLimiter.recordAttempt(identifier, false);
      }

      const endTime = Date.now();

      // Should still be allowed
      const result = await rateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(true);
      expect(result.attemptCount).toBe(999);

      // Performance check - should complete quickly
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});
