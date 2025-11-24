/**
 * API Keys Authentication Provider
 *
 * Provides API key-based authentication for service-to-service communication
 * and programmatic access to the application.
 *
 * Features:
 * - Secure key hashing using scrypt
 * - Multiple API keys with different permissions
 * - Automatic key rotation
 * - Key prefix identification
 * - Role-based access control
 * - Key expiration support
 * - Constant-time comparison for validation
 */

import * as crypto from 'crypto';
import type { Duration } from '../../common/duration';
import type { ApiKey, SecureApiKey } from '../types';
import { ProviderConfigError, AuthErrorMessages } from '../errors';
import type { RateLimitConfig } from '../rate-limiter';
import { AuthRateLimiter } from '../rate-limiter';

// ============================================================================
// API Keys Configuration Type
// ============================================================================

/**
 * API Keys provider configuration
 */
export interface ApiKeysConfig {
  /**
   * Provider type identifier
   */
  type: 'api-keys';

  /**
   * Whether API key authentication is enabled
   * @default false
   */
  enabled: boolean;

  /**
   * List of valid API keys (stored securely with hashed secrets)
   * @internal Keys are hashed before storage
   */
  keys: SecureApiKey[];

  /**
   * Automatic rotation period for keys
   * When set, keys will need to be rotated after this duration
   */
  rotationPeriod?: Duration;

  /**
   * Key prefix for identification (e.g., "atk_")
   * Helps identify keys in logs and error messages
   */
  keyPrefix?: string;

  /**
   * Rate limiting configuration
   */
  rateLimiting?: RateLimitConfig;

  /**
   * Rate limiter instance
   * @internal
   */
  rateLimiter?: AuthRateLimiter;
}

// ============================================================================
// API Keys Builder
// ============================================================================

/**
 * Builder for API Keys authentication provider
 *
 * Configures API key-based authentication for service accounts and
 * programmatic access. Supports multiple keys with different roles,
 * automatic rotation, and key expiration.
 *
 * @example
 * ```typescript
 * import { auth, days } from '@atakora/component';
 *
 * // Basic API keys configuration
 * const apiKeys = auth.apiKeys()
 *   .enable()
 *   .keys([
 *     {
 *       id: 'service-1',
 *       secret: process.env.API_KEY_SERVICE_1!,
 *       roles: ['service']
 *     }
 *   ]);
 * ```
 *
 * @example
 * ```typescript
 * // Advanced configuration with rotation and prefix
 * const apiKeys = auth.apiKeys()
 *   .enable()
 *   .rotateEvery(days(90))
 *   .prefix('atk_')
 *   .keys([
 *     {
 *       id: 'admin-cli',
 *       secret: process.env.ADMIN_API_KEY!,
 *       roles: ['admin', 'service'],
 *       expiresAt: '2025-12-31T23:59:59Z',
 *       metadata: { description: 'Admin CLI tool' }
 *     },
 *     {
 *       id: 'monitoring-service',
 *       secret: process.env.MONITORING_API_KEY!,
 *       roles: ['monitoring', 'readonly']
 *     }
 *   ]);
 * ```
 */
export class ApiKeysBuilder {
  private config: ApiKeysConfig = {
    type: 'api-keys',
    enabled: false,
    keys: [],
  };

  // Scrypt parameters for secure hashing
  private static readonly SCRYPT_KEY_LENGTH = 64;
  private static readonly SCRYPT_SALT_LENGTH = 32;
  private static readonly SCRYPT_N = 16384; // CPU/memory cost
  private static readonly SCRYPT_R = 8; // Block size
  private static readonly SCRYPT_P = 1; // Parallelization

  /**
   * Enable API key authentication
   *
   * By default, API key authentication is disabled. Call this method
   * to enable it.
   *
   * @returns this builder for method chaining
   *
   * @example
   * ```typescript
   * auth.apiKeys()
   *   .enable()
   *   .keys([...]);
   * ```
   */
  enable(): this {
    this.config.enabled = true;
    return this;
  }

  /**
   * Set automatic key rotation period
   *
   * When set, keys should be rotated after the specified duration.
   * This is a recommended best practice for security.
   *
   * @param duration - How often keys should be rotated
   * @returns this builder for method chaining
   *
   * @example
   * ```typescript
   * import { days } from '@atakora/component';
   *
   * auth.apiKeys()
   *   .enable()
   *   .rotateEvery(days(90))
   *   .keys([...]);
   * ```
   */
  rotateEvery(duration: Duration): this {
    // Validate duration is positive
    if (duration.toMilliseconds() <= 0) {
      throw new ProviderConfigError('API key rotation period must be positive', 'ApiKeys', {
        duration: duration.toString(),
      });
    }

    this.config.rotationPeriod = duration;
    return this;
  }

  /**
   * Hash an API key secret using scrypt
   * @private
   */
  private async hashSecret(secret: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(
        secret,
        salt,
        ApiKeysBuilder.SCRYPT_KEY_LENGTH,
        {
          N: ApiKeysBuilder.SCRYPT_N,
          r: ApiKeysBuilder.SCRYPT_R,
          p: ApiKeysBuilder.SCRYPT_P,
        },
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }

  /**
   * Validate an API key using constant-time comparison
   * @private
   */
  private async validateKeySecret(
    providedSecret: string,
    storedHash: string,
    salt: string
  ): Promise<boolean> {
    try {
      const saltBuffer = Buffer.from(salt, 'hex');
      const derivedKey = await this.hashSecret(providedSecret, saltBuffer);
      const storedHashBuffer = Buffer.from(storedHash, 'hex');

      // Use constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(derivedKey, storedHashBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Define API keys
   *
   * Each key must have an ID, secret, and roles. Optionally,
   * keys can have expiration dates and metadata.
   *
   * @param keys - Array of API key definitions
   * @returns this builder for method chaining
   *
   * @throws {ProviderConfigError} If keys array is invalid
   *
   * @example
   * ```typescript
   * auth.apiKeys()
   *   .enable()
   *   .keys([
   *     {
   *       id: 'service-1',
   *       secret: process.env.API_KEY_1!,
   *       roles: ['service']
   *     },
   *     {
   *       id: 'service-2',
   *       secret: process.env.API_KEY_2!,
   *       roles: ['service', 'monitoring'],
   *       expiresAt: '2025-12-31T23:59:59Z',
   *       metadata: { team: 'platform' }
   *     }
   *   ]);
   * ```
   */
  keys(keys: ApiKey[]): this {
    // Validate keys array
    if (!Array.isArray(keys)) {
      throw new ProviderConfigError('API keys must be an array', 'ApiKeys', { keys: typeof keys });
    }

    // Process and hash keys synchronously for now (can be made async in future)
    const secureKeys: SecureApiKey[] = [];
    const keyIds = new Set<string>();

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      // Validate required fields
      if (!key.id || typeof key.id !== 'string') {
        // Redact secret before including in error
        const sanitizedKey = key
          ? { ...key, secret: key.secret ? '[REDACTED]' : undefined }
          : undefined;
        throw new ProviderConfigError(
          `API key at index ${i} is missing valid 'id' field`,
          'ApiKeys',
          { index: i, key: sanitizedKey }
        );
      }

      if (!key.secret || typeof key.secret !== 'string') {
        throw new ProviderConfigError(
          `API key at index ${i} is missing valid 'secret' field`,
          'ApiKeys',
          { index: i, id: key.id }
        );
      }

      if (!key.roles || !Array.isArray(key.roles) || key.roles.length === 0) {
        throw new ProviderConfigError(
          `API key '${key.id}' must have at least one role`,
          'ApiKeys',
          { id: key.id, roles: key.roles }
        );
      }

      // Validate roles are strings
      for (const role of key.roles) {
        if (typeof role !== 'string' || role.trim() === '') {
          throw new ProviderConfigError(
            `API key '${key.id}' has invalid role: ${role}`,
            'ApiKeys',
            { id: key.id, role }
          );
        }
      }

      // Check for duplicate IDs
      if (keyIds.has(key.id)) {
        throw new ProviderConfigError(`Duplicate API key ID: ${key.id}`, 'ApiKeys', { id: key.id });
      }
      keyIds.add(key.id);

      // Validate expiration date format if provided
      if (key.expiresAt) {
        const expirationDate = new Date(key.expiresAt);
        if (isNaN(expirationDate.getTime())) {
          throw new ProviderConfigError(
            `API key '${key.id}' has invalid expiration date format`,
            'ApiKeys',
            { id: key.id, expiresAt: key.expiresAt }
          );
        }
      }

      // Generate salt and hash the secret synchronously using scryptSync
      const salt = crypto.randomBytes(ApiKeysBuilder.SCRYPT_SALT_LENGTH);
      const hashedSecret = crypto.scryptSync(key.secret, salt, ApiKeysBuilder.SCRYPT_KEY_LENGTH, {
        N: ApiKeysBuilder.SCRYPT_N,
        r: ApiKeysBuilder.SCRYPT_R,
        p: ApiKeysBuilder.SCRYPT_P,
      });

      // Create secure key object
      const secureKey: SecureApiKey = {
        id: key.id,
        secretHash: hashedSecret.toString('hex'),
        salt: salt.toString('hex'),
        roles: [...key.roles],
        version: 1,
        createdAt: new Date().toISOString(),
        expiresAt: key.expiresAt,
        metadata: key.metadata ? { ...key.metadata } : undefined,
      };

      secureKeys.push(secureKey);

      // Clear the original secret from memory (best effort)
      key.secret = '[REDACTED]';
    }

    this.config.keys = secureKeys;
    return this;
  }

  /**
   * Set key prefix for identification
   *
   * Adds a prefix to all API keys for easy identification in logs
   * and error messages. Common patterns include "atk_", "api_", etc.
   *
   * @param prefix - Key prefix string
   * @returns this builder for method chaining
   *
   * @example
   * ```typescript
   * auth.apiKeys()
   *   .enable()
   *   .prefix('atk_')
   *   .keys([...]);
   * ```
   */
  prefix(prefix: string): this {
    if (typeof prefix !== 'string' || prefix.trim() === '') {
      throw new ProviderConfigError('API key prefix must be a non-empty string', 'ApiKeys', {
        prefix,
      });
    }

    this.config.keyPrefix = prefix;
    return this;
  }

  /**
   * Configure rate limiting to prevent brute force attacks
   *
   * @param config - Rate limiting configuration
   * @returns This builder for chaining
   *
   * @remarks
   * Rate limiting helps prevent brute force attacks by limiting
   * the number of authentication attempts from a single source.
   *
   * @example
   * ```typescript
   * import { minutes, hours } from '@atakora/component/common';
   *
   * auth.apiKeys()
   *   .enable()
   *   .rateLimiting({
   *     maxAttempts: 10,
   *     windowMs: minutes(5),
   *     blockDuration: minutes(15),
   *     progressiveDelay: false
   *   })
   *   .keys([...]);
   * ```
   */
  rateLimiting(config: RateLimitConfig): this {
    this.config.rateLimiting = config;
    this.config.rateLimiter = new AuthRateLimiter(config);
    return this;
  }

  /**
   * Validate an API key against the stored keys
   *
   * This method performs secure validation using constant-time comparison
   * to prevent timing attacks.
   *
   * @param keyId - The ID of the key to validate
   * @param secret - The secret to validate
   * @returns Promise<boolean> - True if the key is valid
   */
  async validateApiKey(keyId: string, secret: string): Promise<boolean> {
    const storedKey = this.config.keys.find((k) => k.id === keyId);

    if (!storedKey) {
      // Perform a dummy hash to prevent timing attacks
      const dummySalt = crypto.randomBytes(ApiKeysBuilder.SCRYPT_SALT_LENGTH);
      await this.hashSecret(secret, dummySalt);
      return false;
    }

    // Check expiration
    if (storedKey.expiresAt) {
      const now = new Date();
      const expirationDate = new Date(storedKey.expiresAt);
      if (now > expirationDate) {
        return false;
      }
    }

    // Validate the secret using constant-time comparison
    const isValid = await this.validateKeySecret(secret, storedKey.secretHash, storedKey.salt);

    // Update lastUsedAt if valid
    if (isValid) {
      storedKey.lastUsedAt = new Date().toISOString();
    }

    return isValid;
  }

  /**
   * Build the API keys configuration
   *
   * @internal
   * @returns API keys configuration object
   * @throws {ProviderConfigError} If configuration is invalid
   */
  _build(): ApiKeysConfig {
    // Validate configuration on build
    if (this.config.enabled && this.config.keys.length === 0) {
      throw new ProviderConfigError(
        'API key authentication is enabled but no keys are configured. Add keys using .keys([...]) or disable with .enable() set to false',
        'ApiKeys',
        { enabled: this.config.enabled, keysCount: 0 }
      );
    }

    // Return a copy to prevent mutation
    return {
      ...this.config,
      keys: [...this.config.keys],
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an API Keys authentication provider
 *
 * Factory function for creating API key-based authentication.
 * Used in authentication definitions.
 *
 * @returns API Keys builder
 *
 * @example
 * ```typescript
 * import { defineAuth, auth, days } from '@atakora/component';
 *
 * export const authentication = defineAuth({
 *   ApiKeys: auth.apiKeys()
 *     .enable()
 *     .rotateEvery(days(90))
 *     .keys([
 *       {
 *         id: 'service-1',
 *         secret: process.env.API_KEY_1!,
 *         roles: ['service']
 *       }
 *     ])
 *     .prefix('atk_')
 * });
 * ```
 *
 * @public
 */
export function apiKeys(): ApiKeysBuilder {
  return new ApiKeysBuilder();
}
