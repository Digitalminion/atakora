/**
 * Entra ID Authentication Provider
 *
 * Builder for configuring Azure Entra ID (formerly Azure AD) authentication.
 */

import type { TokenValidator, RoleMapper, SessionConfig, MfaConfig } from '../types';
import type { BaseAuthProviderBuilder } from './base';
import { createAuthError } from '../errors';
import { SessionBuilder } from '../session';
import { MfaBuilder } from '../mfa';
import type { RateLimitConfig } from '../rate-limiter';
import { AuthRateLimiter } from '../rate-limiter';

// ============================================================================
// Entra ID Configuration Types
// ============================================================================

/**
 * Entra ID provider configuration
 */
export interface EntraIdConfig {
  type: 'entra-id';
  tenant: string;
  clientId: string;
  audience?: string;
  issuer?: string;
  tokenValidator?: TokenValidator;
  roleMapper?: RoleMapper;
  session?: SessionConfig;
  mfa?: MfaConfig;
  rateLimiting?: RateLimitConfig;
  rateLimiter?: AuthRateLimiter;
}

// ============================================================================
// Entra ID Provider Builder
// ============================================================================

/**
 * Builder for Entra ID authentication provider
 *
 * @remarks
 * Configures Azure Entra ID (formerly Azure AD) as an authentication provider.
 * Supports JWT token validation, role mapping from Azure AD groups, session
 * management, and multi-factor authentication.
 *
 * @example
 * ```typescript
 * import { defineAuth, auth } from '@atakora/component';
 *
 * export const authentication = defineAuth({
 *   Primary: auth.entra()
 *     .tenant(process.env.AZURE_TENANT_ID!)
 *     .clientId(process.env.AZURE_CLIENT_ID!)
 *     .audience(process.env.AZURE_AUDIENCE!)
 *     .validateTokens(async (token, context) => {
 *       // Custom validation logic
 *       return { valid: true };
 *     })
 *     .mapRoles(claims => {
 *       const groups = claims.groups || [];
 *       return groups.map(g => g.name);
 *     })
 * });
 * ```
 */
export class EntraIdBuilder implements BaseAuthProviderBuilder {
  private config: Partial<EntraIdConfig>;

  constructor() {
    this.config = {
      type: 'entra-id',
    };
  }

  /**
   * Set Azure tenant ID
   *
   * @param tenantId - Azure AD tenant ID (GUID)
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .tenant('12345678-1234-1234-1234-123456789012')
   * .tenant(process.env.AZURE_TENANT_ID!)
   * ```
   */
  tenant(tenantId: string): this {
    this.config.tenant = tenantId;
    return this;
  }

  /**
   * Set Azure application (client) ID
   *
   * @param clientId - Azure AD application client ID (GUID)
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .clientId('87654321-4321-4321-4321-210987654321')
   * .clientId(process.env.AZURE_CLIENT_ID!)
   * ```
   */
  clientId(clientId: string): this {
    this.config.clientId = clientId;
    return this;
  }

  /**
   * Set expected token audience
   *
   * @param audience - Expected audience claim (typically the application ID URI)
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .audience('api://my-app')
   * .audience(process.env.AZURE_AUDIENCE!)
   * ```
   */
  audience(audience: string): this {
    this.config.audience = audience;
    return this;
  }

  /**
   * Set expected token issuer
   *
   * @param issuer - Expected issuer claim URL
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .issuer('https://login.microsoftonline.com/tenant-id/v2.0')
   * ```
   */
  issuer(issuer: string): this {
    this.config.issuer = issuer;
    return this;
  }

  /**
   * Configure custom token validation logic
   *
   * @param validator - Function to validate tokens and extract claims
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .validateTokens(async (token, context) => {
   *   // Verify token signature
   *   const decoded = await verifyJwt(token);
   *
   *   // Check custom claims
   *   if (decoded.iss !== expectedIssuer) {
   *     return { valid: false, error: 'Invalid issuer' };
   *   }
   *
   *   return {
   *     valid: true,
   *     claims: decoded,
   *     userId: decoded.sub,
   *     email: decoded.email
   *   };
   * })
   * ```
   */
  validateTokens(validator: TokenValidator): this {
    this.config.tokenValidator = validator;
    return this;
  }

  /**
   * Configure role mapping from token claims
   *
   * @param mapper - Function to map claims to application roles
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .mapRoles(claims => {
   *   const groups = claims.groups || [];
   *   const roles = [];
   *
   *   if (groups.includes('admin-group-id')) {
   *     roles.push('admin');
   *   }
   *   if (groups.includes('user-group-id')) {
   *     roles.push('user');
   *   }
   *
   *   return roles;
   * })
   * ```
   */
  mapRoles(mapper: RoleMapper): this {
    this.config.roleMapper = mapper;
    return this;
  }

  /**
   * Configure session management
   *
   * @param configureFn - Function to configure session builder
   * @returns This builder for chaining
   *
   * @remarks
   * Session configuration determines how user sessions are managed,
   * including duration, storage, and renewal policies.
   *
   * @example
   * ```typescript
   * .session(session => session
   *   .duration(hours(8))
   *   .sliding(true)
   *   .storage('redis')
   * )
   * ```
   */
  session(configureFn: (builder: SessionBuilder) => SessionBuilder): this {
    const builder = new SessionBuilder();
    const configured = configureFn(builder);
    this.config.session = configured._build();
    return this;
  }

  /**
   * Configure multi-factor authentication
   *
   * @param configureFn - Function to configure MFA builder
   * @returns This builder for chaining
   *
   * @remarks
   * MFA configuration determines when additional authentication factors
   * are required and what challenge types are used.
   *
   * @example
   * ```typescript
   * .mfa(mfa => mfa
   *   .require(['admin', 'finance'])
   *   .challenge('totp')
   *   .gracePeriod(hours(1))
   * )
   * ```
   */
  mfa(configureFn: (builder: MfaBuilder) => MfaBuilder): this {
    const builder = new MfaBuilder();
    const configured = configureFn(builder);
    this.config.mfa = configured._build();
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
   * .rateLimiting({
   *   maxAttempts: 5,
   *   windowMs: minutes(15),
   *   blockDuration: hours(1),
   *   progressiveDelay: true
   * })
   * ```
   */
  rateLimiting(config: RateLimitConfig): this {
    this.config.rateLimiting = config;
    this.config.rateLimiter = new AuthRateLimiter(config);
    return this;
  }

  /**
   * Build the Entra ID configuration
   *
   * @internal
   * @returns Entra ID provider configuration
   * @throws {ProviderConfigError} If required fields are missing
   */
  _build(): EntraIdConfig {
    // Validate required fields
    if (!this.config.tenant) {
      throw createAuthError(
        'provider',
        'Entra ID provider requires a tenant ID. Use .tenant() to set it.',
        { provider: 'EntraId', field: 'tenant' }
      );
    }

    if (!this.config.clientId) {
      throw createAuthError(
        'provider',
        'Entra ID provider requires a client ID. Use .clientId() to set it.',
        { provider: 'EntraId', field: 'clientId' }
      );
    }

    return this.config as EntraIdConfig;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Entra ID authentication provider builder
 *
 * @returns Entra ID builder instance
 *
 * @example
 * ```typescript
 * import { defineAuth, auth } from '@atakora/component';
 *
 * export const authentication = defineAuth({
 *   Primary: auth.entra()
 *     .tenant(process.env.AZURE_TENANT_ID!)
 *     .clientId(process.env.AZURE_CLIENT_ID!)
 * });
 * ```
 */
export function entra(): EntraIdBuilder {
  return new EntraIdBuilder();
}
