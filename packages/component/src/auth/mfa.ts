/**
 * Multi-Factor Authentication Configuration
 *
 * @remarks
 * Provides builder for configuring multi-factor authentication requirements,
 * challenge types, and device trust settings.
 *
 * @example
 * ```typescript
 * import { auth } from '@atakora/component';
 *
 * const authentication = defineAuth({
 *   Primary: auth.entra()
 *     .tenant(TENANT_ID)
 *     .clientId(CLIENT_ID)
 *     .mfa(mfa => mfa
 *       .require(['admin', 'finance'])
 *       .challenge('totp')
 *       .gracePeriod(hours(1))
 *     )
 * });
 * ```
 *
 * @packageDocumentation
 */

import type { Duration } from '../common/duration';
import type { MfaConfig } from './types';
import { createAuthError } from './errors';

/**
 * Builder for MFA configuration
 *
 * @remarks
 * Configures multi-factor authentication behavior including which roles require MFA,
 * what type of challenge to use, and device trust settings.
 *
 * @public
 */
export class MfaBuilder {
  private config: Partial<MfaConfig> = {
    required: false,
    challengeType: 'totp',
  };

  /**
   * Require MFA for specific roles
   *
   * @param roles - Array of role names that require MFA
   * @returns This builder for chaining
   *
   * @remarks
   * Enables MFA and specifies which user roles must complete multi-factor
   * authentication. Users without these roles can authenticate with single factor.
   *
   * @throws {MfaConfigError} If roles array is empty
   *
   * @example
   * ```typescript
   * // Require MFA for admin users
   * .require(['admin'])
   *
   * // Require MFA for multiple sensitive roles
   * .require(['admin', 'finance', 'executive'])
   *
   * // Require MFA for all authenticated users
   * .require(['authenticated'])
   * ```
   */
  require(roles: string[]): this {
    // Validate roles array is not empty
    if (!Array.isArray(roles) || roles.length === 0) {
      throw createAuthError('mfa', 'MFA required roles must be a non-empty array', { roles });
    }

    // Validate all roles are non-empty strings
    for (const role of roles) {
      if (typeof role !== 'string' || role.trim().length === 0) {
        throw createAuthError('mfa', 'MFA role names must be non-empty strings', {
          invalidRole: role,
        });
      }
    }

    this.config.required = true;
    this.config.requiredForRoles = roles;
    return this;
  }

  /**
   * Set MFA challenge type
   *
   * @param type - Challenge mechanism ('totp' | 'sms' | 'email')
   * @returns This builder for chaining
   *
   * @remarks
   * Specifies what type of second factor to use:
   * - `totp`: Time-based one-time password (e.g., Google Authenticator)
   * - `sms`: SMS text message with code
   * - `email`: Email with verification code
   *
   * @example
   * ```typescript
   * // Use authenticator app
   * .challenge('totp')
   *
   * // Use SMS verification
   * .challenge('sms')
   *
   * // Use email verification
   * .challenge('email')
   * ```
   */
  challenge(type: 'totp' | 'sms' | 'email'): this {
    this.config.challengeType = type;
    return this;
  }

  /**
   * Set grace period after initial authentication
   *
   * @param duration - Grace period duration
   * @returns This builder for chaining
   *
   * @remarks
   * Allows users a grace period after successful MFA before requiring
   * re-verification. Useful for reducing friction during short sessions.
   *
   * @throws {MfaConfigError} If duration is not positive
   *
   * @example
   * ```typescript
   * // 1 hour grace period
   * .gracePeriod(hours(1))
   *
   * // 15 minute grace period
   * .gracePeriod(minutes(15))
   *
   * // No grace period (require MFA on every session)
   * // Don't call gracePeriod()
   * ```
   */
  gracePeriod(duration: Duration): this {
    // Validate duration is positive
    const milliseconds = duration.toMilliseconds();
    if (milliseconds <= 0) {
      throw createAuthError('mfa', 'MFA grace period must be positive', {
        gracePeriod: duration.toString(),
      });
    }

    this.config.gracePeriod = duration;
    return this;
  }

  /**
   * Build the MFA configuration
   *
   * @internal
   * @returns MFA configuration object
   */
  _build(): MfaConfig {
    return {
      required: this.config.required ?? false,
      requiredForRoles: this.config.requiredForRoles,
      challengeType: this.config.challengeType ?? 'totp',
      gracePeriod: this.config.gracePeriod,
    };
  }
}

/**
 * Create a new MFA builder
 *
 * @returns MFA builder instance
 *
 * @remarks
 * Factory function for creating MFA configuration builders.
 * Typically used within provider configuration, not directly.
 *
 * @example
 * ```typescript
 * const mfaBuilder = mfa();
 * const config = mfaBuilder
 *   .require(['admin'])
 *   .challenge('totp')
 *   ._build();
 * ```
 *
 * @internal
 */
export function mfa(): MfaBuilder {
  return new MfaBuilder();
}
