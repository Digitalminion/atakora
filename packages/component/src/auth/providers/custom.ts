/**
 * Custom Authentication Provider
 *
 * Provides a flexible, user-defined authentication mechanism that allows
 * full customization of token validation and role mapping logic.
 *
 * Features:
 * - Custom token validation functions
 * - Custom role mapping functions
 * - Configurable authentication header
 * - Custom token extraction logic
 * - Complete control over authentication flow
 */

import type { TokenValidator, RoleMapper, ValidationContext } from '../types';
import { ProviderConfigError, AuthErrorMessages } from '../errors';

// ============================================================================
// Custom Auth Configuration Type
// ============================================================================

/**
 * Custom authentication provider configuration
 */
export interface CustomAuthConfig {
  /**
   * Provider type identifier
   */
  type: 'custom';

  /**
   * Custom token validation function
   * Required - validates authentication tokens
   */
  tokenValidator?: TokenValidator;

  /**
   * Custom role mapping function
   * Maps token claims to application roles
   */
  roleMapper?: RoleMapper;

  /**
   * Custom authentication header name
   * @default 'Authorization'
   */
  headerName?: string;

  /**
   * Custom token extractor function
   * Alternative to header-based extraction
   */
  tokenExtractor?: TokenExtractor;
}

/**
 * Function to extract authentication token from request
 *
 * @param req - Request object (implementation-specific)
 * @returns Token string, null if not found, or Promise resolving to token/null
 */
export type TokenExtractor = (req: any) => string | null | Promise<string | null>;

// ============================================================================
// Custom Auth Builder
// ============================================================================

/**
 * Builder for Custom authentication provider
 *
 * Configures a fully customizable authentication provider with user-defined
 * token validation and role mapping logic. Ideal for integrating with
 * custom authentication systems, third-party providers, or legacy systems.
 *
 * @example
 * ```typescript
 * import { auth } from '@atakora/component';
 *
 * // Basic custom auth with token validation
 * const customAuth = auth.custom()
 *   .validateTokens(async (token) => {
 *     const user = await myAuthService.validate(token);
 *     if (!user) {
 *       return { valid: false, error: 'Invalid token' };
 *     }
 *     return {
 *       valid: true,
 *       claims: { sub: user.id, email: user.email }
 *     };
 *   })
 *   .mapRoles(claims => claims.roles || []);
 * ```
 *
 * @example
 * ```typescript
 * // Custom auth with header and token extraction
 * const customAuth = auth.custom()
 *   .header('X-Custom-Auth')
 *   .validateTokens(async (token) => {
 *     return await validateCustomToken(token);
 *   })
 *   .mapRoles(claims => extractRoles(claims));
 * ```
 *
 * @example
 * ```typescript
 * // Custom auth with token extractor (e.g., from cookies)
 * const customAuth = auth.custom()
 *   .extractToken((req) => {
 *     return req.cookies.authToken || null;
 *   })
 *   .validateTokens(async (token) => {
 *     return await validateCookieToken(token);
 *   })
 *   .mapRoles(claims => claims.roles);
 * ```
 */
export class CustomAuthBuilder {
  private config: CustomAuthConfig = {
    type: 'custom',
  };

  /**
   * Set custom token validation function
   *
   * The validator receives a token string and optional context, and must
   * return a validation result indicating whether the token is valid and
   * providing claims/user information.
   *
   * @param validator - Function to validate authentication tokens
   * @returns this builder for method chaining
   *
   * @example
   * ```typescript
   * auth.custom()
   *   .validateTokens(async (token, context) => {
   *     try {
   *       const user = await customAuthService.validate(token);
   *
   *       if (!user || !user.active) {
   *         return { valid: false, error: 'User not found or inactive' };
   *       }
   *
   *       return {
   *         valid: true,
   *         claims: {
   *           sub: user.id,
   *           email: user.email,
   *           name: user.name,
   *           roles: user.roles,
   *         },
   *         userId: user.id,
   *         email: user.email,
   *       };
   *     } catch (error) {
   *       return { valid: false, error: error.message };
   *     }
   *   });
   * ```
   */
  validateTokens(validator: TokenValidator): this {
    if (typeof validator !== 'function') {
      throw new ProviderConfigError('Token validator must be a function', 'custom', {
        validator: typeof validator,
      });
    }

    this.config.tokenValidator = validator;
    return this;
  }

  /**
   * Set custom role mapping function
   *
   * The role mapper receives token claims and returns an array of role strings
   * that represent the user's permissions in the application.
   *
   * @param mapper - Function to map token claims to application roles
   * @returns this builder for method chaining
   *
   * @example
   * ```typescript
   * auth.custom()
   *   .validateTokens(validator)
   *   .mapRoles((claims) => {
   *     const roles: string[] = [];
   *
   *     // Map custom claims to application roles
   *     if (claims.is_admin) roles.push('admin');
   *     if (claims.is_editor) roles.push('editor');
   *     if (claims.permissions?.includes('read')) roles.push('viewer');
   *
   *     return roles;
   *   });
   * ```
   */
  mapRoles(mapper: RoleMapper): this {
    if (typeof mapper !== 'function') {
      throw new ProviderConfigError('Role mapper must be a function', 'custom', {
        mapper: typeof mapper,
      });
    }

    this.config.roleMapper = mapper;
    return this;
  }

  /**
   * Set custom authentication header name
   *
   * Specifies which HTTP header contains the authentication token.
   * If not set, defaults to 'Authorization'.
   *
   * Note: If both header() and extractToken() are set, header takes precedence.
   *
   * @param headerName - Name of the HTTP header containing the token
   * @returns this builder for method chaining
   *
   * @example
   * ```typescript
   * // Use custom header name
   * auth.custom()
   *   .header('X-Custom-Auth')
   *   .validateTokens(validator);
   * ```
   *
   * @example
   * ```typescript
   * // Use API key header
   * auth.custom()
   *   .header('X-API-Key')
   *   .validateTokens(async (token) => {
   *     return await validateApiKey(token);
   *   });
   * ```
   */
  header(headerName: string): this {
    if (typeof headerName !== 'string' || headerName.trim() === '') {
      throw new ProviderConfigError('Header name must be a non-empty string', 'custom', {
        headerName,
      });
    }

    // Warn if both header and extractor are set
    if (this.config.tokenExtractor) {
      console.warn(
        'CustomAuthBuilder: Both header() and extractToken() are set. ' +
          'header() will take precedence during token extraction.'
      );
    }

    this.config.headerName = headerName;
    return this;
  }

  /**
   * Set custom token extraction function
   *
   * Provides complete control over how tokens are extracted from requests.
   * Useful for cookie-based auth, query parameter tokens, or complex
   * multi-source token logic.
   *
   * Note: If both header() and extractToken() are set, header takes precedence.
   *
   * @param extractor - Function to extract token from request
   * @returns this builder for method chaining
   *
   * @example
   * ```typescript
   * // Extract token from cookies
   * auth.custom()
   *   .extractToken((req) => {
   *     return req.cookies.authToken || null;
   *   })
   *   .validateTokens(validator);
   * ```
   *
   * @example
   * ```typescript
   * // Extract token from multiple sources (fallback)
   * auth.custom()
   *   .extractToken((req) => {
   *     // Try Authorization header first
   *     const authHeader = req.headers['authorization'];
   *     if (authHeader?.startsWith('Bearer ')) {
   *       return authHeader.substring(7);
   *     }
   *
   *     // Fallback to cookie
   *     if (req.cookies.session) {
   *       return req.cookies.session;
   *     }
   *
   *     // Fallback to query parameter
   *     return req.query.token || null;
   *   })
   *   .validateTokens(validator);
   * ```
   *
   * @example
   * ```typescript
   * // Async token extraction
   * auth.custom()
   *   .extractToken(async (req) => {
   *     const sessionId = req.cookies.sessionId;
   *     if (!sessionId) return null;
   *
   *     // Look up token from session store
   *     const session = await sessionStore.get(sessionId);
   *     return session?.token || null;
   *   })
   *   .validateTokens(validator);
   * ```
   */
  extractToken(extractor: TokenExtractor): this {
    if (typeof extractor !== 'function') {
      throw new ProviderConfigError('Token extractor must be a function', 'custom', {
        extractor: typeof extractor,
      });
    }

    // Warn if header is already set
    if (this.config.headerName) {
      console.warn(
        'CustomAuthBuilder: Both header() and extractToken() are set. ' +
          'header() will take precedence during token extraction.'
      );
    }

    this.config.tokenExtractor = extractor;
    return this;
  }

  /**
   * Build the custom authentication configuration
   *
   * @internal
   * @returns Custom authentication configuration
   * @throws {ProviderConfigError} If configuration is invalid
   */
  _build(): CustomAuthConfig {
    // Validate that at least token validator is provided
    if (!this.config.tokenValidator) {
      throw new ProviderConfigError(
        'Custom authentication requires a token validator. Use .validateTokens() to provide one.',
        'custom',
        { hasValidator: false }
      );
    }

    // Warn if no role mapper is provided
    if (!this.config.roleMapper) {
      console.warn(
        'CustomAuthBuilder: No role mapper configured. ' +
          'Users will not have any roles assigned. ' +
          'Consider adding .mapRoles() to assign roles.'
      );
    }

    // Set default header if neither header nor extractor is set
    if (!this.config.headerName && !this.config.tokenExtractor) {
      this.config.headerName = 'Authorization';
    }

    // Return a copy to prevent mutation
    return {
      type: 'custom',
      tokenValidator: this.config.tokenValidator,
      roleMapper: this.config.roleMapper,
      headerName: this.config.headerName,
      tokenExtractor: this.config.tokenExtractor,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Custom authentication provider
 *
 * Factory function for creating a fully customizable authentication provider.
 * Use this when you need to integrate with custom authentication systems,
 * third-party providers not natively supported, or implement complex
 * authentication logic.
 *
 * @returns Custom authentication builder
 *
 * @example
 * ```typescript
 * import { defineAuth, auth } from '@atakora/component';
 *
 * // Simple custom authentication
 * export const authentication = defineAuth({
 *   Primary: auth.custom()
 *     .header('X-Custom-Auth')
 *     .validateTokens(async (token) => {
 *       const user = await customAuthService.validate(token);
 *
 *       if (!user) {
 *         return { valid: false, error: 'Invalid token' };
 *       }
 *
 *       return {
 *         valid: true,
 *         claims: {
 *           sub: user.id,
 *           email: user.email,
 *           roles: user.roles,
 *         },
 *       };
 *     })
 *     .mapRoles(claims => claims.roles || []),
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Cookie-based authentication
 * export const authentication = defineAuth({
 *   Primary: auth.custom()
 *     .extractToken((req) => req.cookies.authToken || null)
 *     .validateTokens(async (token) => {
 *       return await validateSessionToken(token);
 *     })
 *     .mapRoles((claims) => {
 *       const roles: string[] = [];
 *       if (claims.admin) roles.push('admin');
 *       if (claims.editor) roles.push('editor');
 *       return roles;
 *     }),
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Third-party auth integration
 * export const authentication = defineAuth({
 *   Primary: auth.custom()
 *     .validateTokens(async (token, context) => {
 *       // Integrate with third-party auth provider
 *       const result = await thirdPartyAuth.verify(token, {
 *         ip: context?.ip,
 *         userAgent: context?.userAgent,
 *       });
 *
 *       if (!result.valid) {
 *         return { valid: false, error: result.error };
 *       }
 *
 *       return {
 *         valid: true,
 *         claims: result.user,
 *         userId: result.user.id,
 *         email: result.user.email,
 *       };
 *     })
 *     .mapRoles(claims => claims.permissions || []),
 * });
 * ```
 *
 * @public
 */
export function custom(): CustomAuthBuilder {
  return new CustomAuthBuilder();
}
