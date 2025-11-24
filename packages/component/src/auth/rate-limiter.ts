/**
 * Rate Limiting for Authentication
 *
 * Provides sliding window rate limiting with progressive delay to prevent
 * brute force attacks on authentication endpoints.
 */

import type { Duration } from '../common/duration';
import { milliseconds } from '../common/duration';

// ============================================================================
// Rate Limiting Types
// ============================================================================

/**
 * Configuration for rate limiting
 */
export interface RateLimitConfig {
  /**
   * Maximum number of attempts allowed within the window
   */
  maxAttempts: number;

  /**
   * Time window for tracking attempts
   */
  windowMs: Duration;

  /**
   * How long to block after limit is exceeded
   */
  blockDuration: Duration;

  /**
   * Enable exponential backoff for repeated failures
   * @default false
   */
  progressiveDelay?: boolean;

  /**
   * Base delay for progressive backoff (in milliseconds)
   * @default 1000
   */
  baseDelayMs?: number;

  /**
   * Maximum delay for progressive backoff (in milliseconds)
   * @default 30000
   */
  maxDelayMs?: number;
}

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Milliseconds until retry is allowed (when blocked)
   */
  retryAfter?: number;

  /**
   * Reason for denial
   */
  reason?: string;

  /**
   * Current attempt count within window
   */
  attemptCount?: number;

  /**
   * Applied delay in milliseconds (when progressive delay is active)
   */
  appliedDelay?: number;
}

/**
 * Internal record for tracking attempts
 */
interface AttemptRecord {
  /**
   * Timestamps of attempts within the window
   */
  attempts: number[];

  /**
   * Number of consecutive failures
   */
  consecutiveFails: number;

  /**
   * Timestamp when blocking expires
   */
  blockedUntil?: number;

  /**
   * Last successful attempt timestamp
   */
  lastSuccess?: number;
}

// ============================================================================
// Rate Limiter Implementation
// ============================================================================

/**
 * Authentication rate limiter using sliding window algorithm
 *
 * @remarks
 * Implements a sliding window rate limiting algorithm with optional
 * progressive delay (exponential backoff) for repeated failures.
 *
 * Features:
 * - Per-identifier tracking (IP, user ID, API key)
 * - Sliding window for accurate rate limiting
 * - Progressive delay for repeated failures
 * - Automatic cleanup of old attempts
 * - Block mechanism after limit exceeded
 *
 * @example
 * ```typescript
 * const rateLimiter = new AuthRateLimiter({
 *   maxAttempts: 5,
 *   windowMs: minutes(15),
 *   blockDuration: hours(1),
 *   progressiveDelay: true
 * });
 *
 * // Check if request is allowed
 * const result = await rateLimiter.checkLimit('user-123');
 * if (!result.allowed) {
 *   throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter}ms`);
 * }
 *
 * // Record authentication attempt
 * rateLimiter.recordAttempt('user-123', false);
 * ```
 */
export class AuthRateLimiter {
  private readonly attempts: Map<string, AttemptRecord> = new Map();
  private readonly config: Required<RateLimitConfig>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = {
      ...config,
      progressiveDelay: config.progressiveDelay ?? false,
      baseDelayMs: config.baseDelayMs ?? 1000,
      maxDelayMs: config.maxDelayMs ?? 30000,
    };

    // Start periodic cleanup every minute
    this.startCleanup();
  }

  /**
   * Check if a request from an identifier is allowed
   *
   * @param identifier - Unique identifier (IP address, user ID, API key, etc.)
   * @returns Result indicating if request is allowed
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const record = this.getOrCreateRecord(identifier);

    // Clean old attempts outside window
    const windowMs = this.config.windowMs.toMilliseconds();
    record.attempts = record.attempts.filter((timestamp) => now - timestamp < windowMs);

    // Check if currently blocked
    if (record.blockedUntil && record.blockedUntil > now) {
      return {
        allowed: false,
        retryAfter: record.blockedUntil - now,
        reason: 'Too many failed attempts. Account temporarily blocked.',
        attemptCount: record.attempts.length,
      };
    }

    // Check if limit exceeded
    if (record.attempts.length >= this.config.maxAttempts) {
      // Set block duration
      const blockMs = this.config.blockDuration.toMilliseconds();
      record.blockedUntil = now + blockMs;

      return {
        allowed: false,
        retryAfter: blockMs,
        reason: `Rate limit exceeded. Maximum ${this.config.maxAttempts} attempts allowed in ${this.config.windowMs.toString()}.`,
        attemptCount: record.attempts.length,
      };
    }

    // Apply progressive delay if enabled
    let appliedDelay = 0;
    if (this.config.progressiveDelay && record.consecutiveFails > 0) {
      // Exponential backoff: delay = baseDelay * 2^(failures - 1)
      const calculatedDelay = this.config.baseDelayMs * Math.pow(2, record.consecutiveFails - 1);
      appliedDelay = Math.min(calculatedDelay, this.config.maxDelayMs);

      // Apply the delay
      await this.delay(appliedDelay);
    }

    return {
      allowed: true,
      attemptCount: record.attempts.length,
      appliedDelay,
    };
  }

  /**
   * Record an authentication attempt
   *
   * @param identifier - Unique identifier
   * @param success - Whether the authentication was successful
   */
  recordAttempt(identifier: string, success: boolean): void {
    const now = Date.now();
    const record = this.getOrCreateRecord(identifier);

    if (success) {
      // Reset on successful authentication
      record.consecutiveFails = 0;
      record.attempts = [];
      record.blockedUntil = undefined;
      record.lastSuccess = now;
    } else {
      // Add failed attempt
      record.attempts.push(now);
      record.consecutiveFails++;

      // Clean old attempts to maintain accurate count
      const windowMs = this.config.windowMs.toMilliseconds();
      record.attempts = record.attempts.filter((timestamp) => now - timestamp < windowMs);
    }

    this.attempts.set(identifier, record);
  }

  /**
   * Reset rate limit for a specific identifier
   *
   * @param identifier - Unique identifier to reset
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Clear all rate limit records
   */
  clearAll(): void {
    this.attempts.clear();
  }

  /**
   * Get current attempt count for an identifier
   *
   * @param identifier - Unique identifier
   * @returns Current attempt count within window
   */
  getAttemptCount(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return 0;

    const now = Date.now();
    const windowMs = this.config.windowMs.toMilliseconds();

    // Filter to only attempts within window
    const validAttempts = record.attempts.filter((timestamp) => now - timestamp < windowMs);

    return validAttempts.length;
  }

  /**
   * Check if an identifier is currently blocked
   *
   * @param identifier - Unique identifier
   * @returns True if currently blocked
   */
  isBlocked(identifier: string): boolean {
    const record = this.attempts.get(identifier);
    if (!record || !record.blockedUntil) return false;

    return record.blockedUntil > Date.now();
  }

  /**
   * Get time until unblock for an identifier
   *
   * @param identifier - Unique identifier
   * @returns Milliseconds until unblock, or 0 if not blocked
   */
  getTimeUntilUnblock(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || !record.blockedUntil) return 0;

    const remaining = record.blockedUntil - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Stop the cleanup interval (for testing or shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Get or create an attempt record for an identifier
   */
  private getOrCreateRecord(identifier: string): AttemptRecord {
    let record = this.attempts.get(identifier);

    if (!record) {
      record = {
        attempts: [],
        consecutiveFails: 0,
      };
      this.attempts.set(identifier, record);
    }

    return record;
  }

  /**
   * Delay execution for progressive backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Start periodic cleanup of old records
   */
  private startCleanup(): void {
    // Clean up every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldRecords();
    }, 60000);

    // Prevent interval from keeping process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Clean up old attempt records outside the window
   */
  private cleanupOldRecords(): void {
    const now = Date.now();
    const windowMs = this.config.windowMs.toMilliseconds();
    const blockMs = this.config.blockDuration.toMilliseconds();

    // Calculate the maximum time we need to keep records
    const maxRetentionMs = Math.max(windowMs, blockMs) * 2;

    for (const [identifier, record] of this.attempts.entries()) {
      // Remove if no recent activity
      const lastAttempt = record.attempts[record.attempts.length - 1] || 0;
      const lastActivity = Math.max(lastAttempt, record.lastSuccess || 0, record.blockedUntil || 0);

      if (now - lastActivity > maxRetentionMs) {
        this.attempts.delete(identifier);
      } else {
        // Clean old attempts from record
        record.attempts = record.attempts.filter((timestamp) => now - timestamp < windowMs);

        // Reset block if expired
        if (record.blockedUntil && record.blockedUntil <= now) {
          record.blockedUntil = undefined;
        }
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a rate limiter with default configuration for login attempts
 *
 * @returns Rate limiter configured for login protection
 */
export function createLoginRateLimiter(): AuthRateLimiter {
  return new AuthRateLimiter({
    maxAttempts: 5,
    windowMs: milliseconds(15 * 60 * 1000), // 15 minutes
    blockDuration: milliseconds(60 * 60 * 1000), // 1 hour
    progressiveDelay: true,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  });
}

/**
 * Create a rate limiter with default configuration for API endpoints
 *
 * @returns Rate limiter configured for API protection
 */
export function createApiRateLimiter(): AuthRateLimiter {
  return new AuthRateLimiter({
    maxAttempts: 100,
    windowMs: milliseconds(60 * 1000), // 1 minute
    blockDuration: milliseconds(5 * 60 * 1000), // 5 minutes
    progressiveDelay: false,
  });
}

/**
 * Create a rate limiter with strict configuration for sensitive operations
 *
 * @returns Rate limiter configured for sensitive operations
 */
export function createStrictRateLimiter(): AuthRateLimiter {
  return new AuthRateLimiter({
    maxAttempts: 3,
    windowMs: milliseconds(30 * 60 * 1000), // 30 minutes
    blockDuration: milliseconds(24 * 60 * 60 * 1000), // 24 hours
    progressiveDelay: true,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
  });
}
