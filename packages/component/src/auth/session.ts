/**
 * Session Management Configuration
 *
 * @remarks
 * Provides builder for configuring user session management including duration,
 * sliding expiration, and storage backends.
 *
 * @example
 * ```typescript
 * import { auth, hours } from '@atakora/component';
 *
 * const authentication = defineAuth({
 *   Primary: auth.entra()
 *     .tenant(TENANT_ID)
 *     .clientId(CLIENT_ID)
 *     .session(session => session
 *       .duration(hours(8))
 *       .sliding(true)
 *       .storage('redis')
 *     )
 * });
 * ```
 *
 * @packageDocumentation
 */

import type { Duration } from '../common/duration';
import type { SessionConfig, SessionSecurityConfig } from './types';
import { hours } from '../common/duration';
import { createAuthError } from './errors';

/**
 * Builder for session security configuration
 *
 * @remarks
 * Provides a fluent interface for configuring session security options.
 * This is used as a nested builder within SessionBuilder.
 *
 * @internal
 */
class SessionSecurityBuilder {
  private config: SessionSecurityConfig;

  constructor(initial: SessionSecurityConfig = {}) {
    this.config = {
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        ...initial.cookieOptions,
      },
      fingerprinting: {
        enabled: true,
        factors: ['ip', 'userAgent'],
        ...initial.fingerprinting,
      },
      concurrent: {
        maxSessions: 5,
        strategy: 'invalidate-oldest',
        ...initial.concurrent,
      },
      rotation: {
        onElevation: true,
        ...initial.rotation,
      },
      ...initial,
    };
  }

  cookieOptions(options: SessionSecurityConfig['cookieOptions']): this {
    this.config.cookieOptions = {
      ...this.config.cookieOptions,
      ...options,
    };
    return this;
  }

  fingerprinting(enabled: boolean, factors?: Array<'ip' | 'userAgent' | 'acceptHeaders'>): this {
    this.config.fingerprinting = {
      enabled,
      factors: factors || ['ip', 'userAgent'],
    };
    return this;
  }

  concurrentSessions(
    maxSessions: number,
    strategy?: 'reject' | 'invalidate-oldest' | 'invalidate-all'
  ): this {
    this.config.concurrent = {
      maxSessions,
      strategy: strategy || 'invalidate-oldest',
    };
    return this;
  }

  rotation(onElevation: boolean, interval?: Duration): this {
    this.config.rotation = {
      onElevation,
      interval,
    };
    return this;
  }

  _build(): SessionSecurityConfig {
    return this.config;
  }
}

/**
 * Builder for session configuration
 *
 * @remarks
 * Configures user session behavior including timeout duration, sliding expiration,
 * and storage backend options.
 *
 * @public
 */
export class SessionBuilder {
  private config: Partial<SessionConfig> = {
    duration: hours(24), // Default 24 hours
    sliding: false,
    security: {
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
      fingerprinting: {
        enabled: true,
        factors: ['ip', 'userAgent'],
      },
      concurrent: {
        maxSessions: 5,
        strategy: 'invalidate-oldest',
      },
      rotation: {
        onElevation: true,
      },
    },
  };

  /**
   * Set session duration
   *
   * @param duration - Session duration before expiration
   * @returns This builder for chaining
   *
   * @remarks
   * Sets how long a session remains valid before expiring. Use with Duration utilities
   * for type-safe duration configuration.
   *
   * @throws {SessionConfigError} If duration is not positive
   *
   * @example
   * ```typescript
   * // 8 hour sessions
   * .duration(hours(8))
   *
   * // 30 minute sessions
   * .duration(minutes(30))
   *
   * // 7 day sessions
   * .duration(days(7))
   * ```
   */
  duration(duration: Duration): this {
    // Validate duration is positive
    const milliseconds = duration.toMilliseconds();
    if (milliseconds <= 0) {
      throw createAuthError('session', 'Session duration must be positive', {
        duration: duration.toString(),
      });
    }

    this.config.duration = duration;
    return this;
  }

  /**
   * Enable sliding session expiration
   *
   * @param enabled - Whether to enable sliding sessions (default: true)
   * @returns This builder for chaining
   *
   * @remarks
   * When enabled, the session timeout is refreshed on each request, effectively
   * keeping the session alive as long as the user is active. When disabled,
   * sessions expire at a fixed time regardless of activity.
   *
   * @example
   * ```typescript
   * // Enable sliding expiration
   * .sliding(true)
   *
   * // Disable sliding expiration (fixed timeout)
   * .sliding(false)
   * ```
   */
  sliding(enabled = true): this {
    this.config.sliding = enabled;
    return this;
  }

  /**
   * Set session storage backend
   *
   * @param storage - Storage backend type
   * @returns This builder for chaining
   *
   * @remarks
   * Determines where session state is persisted:
   * - `memory`: In-memory storage (for development, not recommended for production)
   * - `redis`: Redis cache (recommended for production)
   * - `cosmos`: Azure Cosmos DB (for distributed scenarios)
   *
   * @example
   * ```typescript
   * // Use Redis for production
   * .storage('redis')
   *
   * // Use Cosmos DB for geo-distributed deployments
   * .storage('cosmos')
   *
   * // Use memory for local development
   * .storage('memory')
   * ```
   */
  storage(storage: 'memory' | 'redis' | 'cosmos'): this {
    this.config.storage = storage;
    return this;
  }

  /**
   * Set session time-to-live override
   *
   * @param duration - TTL duration for session storage
   * @returns This builder for chaining
   *
   * @remarks
   * Sets the storage TTL independently from the session duration. Useful for
   * ensuring storage cleanup even if sessions aren't properly terminated.
   * Typically should be slightly longer than session duration.
   *
   * @example
   * ```typescript
   * .duration(hours(8))
   * .ttl(hours(9)) // 1 hour grace period for cleanup
   * ```
   */
  ttl(duration: Duration): this {
    // Validate duration is positive
    const milliseconds = duration.toMilliseconds();
    if (milliseconds <= 0) {
      throw createAuthError('session', 'Session TTL must be positive', {
        ttl: duration.toString(),
      });
    }

    this.config.ttl = duration;
    return this;
  }

  /**
   * Configure session security options
   *
   * @param config - Security configuration or builder function
   * @returns This builder for chaining
   *
   * @remarks
   * Configures comprehensive security settings for sessions including cookie
   * security flags, fingerprinting, concurrent session limits, and rotation policies.
   *
   * @example
   * ```typescript
   * .security(security => security
   *   .cookieOptions({ httpOnly: true, secure: true })
   *   .fingerprinting(true)
   *   .concurrentSessions(3, 'reject')
   * )
   * ```
   */
  security(
    config: SessionSecurityConfig | ((builder: SessionSecurityBuilder) => SessionSecurityBuilder)
  ): this {
    if (typeof config === 'function') {
      const builder = new SessionSecurityBuilder(this.config.security || {});
      config(builder);
      this.config.security = builder._build();
    } else {
      this.config.security = { ...this.config.security, ...config };
    }
    return this;
  }

  /**
   * Configure cookie security options
   *
   * @param options - Cookie security options
   * @returns This builder for chaining
   *
   * @remarks
   * Sets security flags for session cookies including httpOnly, secure, and sameSite.
   * These settings help prevent XSS and CSRF attacks.
   *
   * @example
   * ```typescript
   * .cookieOptions({
   *   httpOnly: true,      // Prevent JavaScript access
   *   secure: true,        // Require HTTPS
   *   sameSite: 'strict'   // Strict CSRF protection
   * })
   * ```
   */
  cookieOptions(options: SessionSecurityConfig['cookieOptions']): this {
    if (!this.config.security) {
      this.config.security = {};
    }
    this.config.security.cookieOptions = {
      ...this.config.security.cookieOptions,
      ...options,
    };
    return this;
  }

  /**
   * Configure session fingerprinting
   *
   * @param enabled - Whether to enable fingerprinting
   * @param factors - Factors to include in fingerprint
   * @returns This builder for chaining
   *
   * @remarks
   * Enables session fingerprinting to detect session hijacking attempts by
   * binding sessions to specific client characteristics.
   *
   * @example
   * ```typescript
   * // Enable with default factors (IP + User-Agent)
   * .fingerprinting(true)
   *
   * // Enable with specific factors
   * .fingerprinting(true, ['ip', 'userAgent', 'acceptHeaders'])
   *
   * // Disable fingerprinting
   * .fingerprinting(false)
   * ```
   */
  fingerprinting(enabled: boolean, factors?: Array<'ip' | 'userAgent' | 'acceptHeaders'>): this {
    if (!this.config.security) {
      this.config.security = {};
    }
    this.config.security.fingerprinting = {
      enabled,
      factors: factors || ['ip', 'userAgent'],
    };
    return this;
  }

  /**
   * Configure concurrent session limits
   *
   * @param maxSessions - Maximum number of concurrent sessions
   * @param strategy - Strategy when limit exceeded
   * @returns This builder for chaining
   *
   * @remarks
   * Sets limits on concurrent sessions per user and defines the behavior when
   * limits are exceeded.
   *
   * @example
   * ```typescript
   * // Allow max 3 sessions, reject new ones when exceeded
   * .concurrentSessions(3, 'reject')
   *
   * // Allow max 5 sessions, invalidate oldest when exceeded
   * .concurrentSessions(5, 'invalidate-oldest')
   *
   * // Allow 1 session, invalidate all others on new login
   * .concurrentSessions(1, 'invalidate-all')
   * ```
   */
  concurrentSessions(
    maxSessions: number,
    strategy?: 'reject' | 'invalidate-oldest' | 'invalidate-all'
  ): this {
    if (maxSessions <= 0) {
      throw createAuthError('session', 'Maximum concurrent sessions must be positive', {
        maxSessions,
      });
    }

    if (!this.config.security) {
      this.config.security = {};
    }
    this.config.security.concurrent = {
      maxSessions,
      strategy: strategy || 'invalidate-oldest',
    };
    return this;
  }

  /**
   * Configure session rotation
   *
   * @param onElevation - Rotate on privilege elevation
   * @param interval - Periodic rotation interval
   * @returns This builder for chaining
   *
   * @remarks
   * Configures session ID rotation to prevent fixation attacks. Sessions can be
   * rotated on privilege elevation or periodically.
   *
   * @example
   * ```typescript
   * // Rotate on privilege elevation only
   * .rotation(true)
   *
   * // Rotate periodically every hour
   * .rotation(false, hours(1))
   *
   * // Both elevation and periodic rotation
   * .rotation(true, hours(2))
   * ```
   */
  rotation(onElevation: boolean, interval?: Duration): this {
    if (interval) {
      const milliseconds = interval.toMilliseconds();
      if (milliseconds <= 0) {
        throw createAuthError('session', 'Rotation interval must be positive', {
          interval: interval.toString(),
        });
      }
    }

    if (!this.config.security) {
      this.config.security = {};
    }
    this.config.security.rotation = {
      onElevation,
      interval,
    };
    return this;
  }

  /**
   * Build the session configuration
   *
   * @internal
   * @returns Session configuration object
   */
  _build(): SessionConfig {
    // Ensure required fields are set (duration has default)
    if (!this.config.duration) {
      throw createAuthError('session', 'Session duration is required', {});
    }

    return {
      duration: this.config.duration,
      sliding: this.config.sliding ?? false,
      storage: this.config.storage,
      ttl: this.config.ttl,
      security: this.config.security,
    };
  }
}

/**
 * Create a new session builder
 *
 * @returns Session builder instance
 *
 * @remarks
 * Factory function for creating session configuration builders.
 * Typically used within provider configuration, not directly.
 *
 * @example
 * ```typescript
 * const sessionBuilder = session();
 * const config = sessionBuilder
 *   .duration(hours(8))
 *   .sliding(true)
 *   ._build();
 * ```
 *
 * @internal
 */
export function session(): SessionBuilder {
  return new SessionBuilder();
}
