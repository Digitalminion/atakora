/**
 * Authentication Middleware for Function Handlers
 *
 * Provides middleware for automatic token extraction, validation, and
 * user context injection into Azure Function handlers.
 *
 * @packageDocumentation
 */

import type { HttpRequest } from '@azure/functions';
import type {
  TokenValidator,
  ValidationContext,
  TokenValidationResult,
  AuthProviderConfig,
} from '../../auth/types';
import { createUserContext, getAnonymousUserContext, type ExtendedUserContext } from '../../auth/user-context';
import { extractBearerToken } from '../../auth/token-validator';
import { AuthRateLimiter, createLoginRateLimiter } from '../../auth/rate-limiter';

// ============================================================================
// Middleware Types
// ============================================================================

/**
 * Token extraction source configuration
 */
export interface TokenExtractionConfig {
  /**
   * Extract from Authorization header (Bearer tokens)
   * @default true
   */
  fromHeader?: boolean;

  /**
   * Header name for authorization
   * @default 'authorization'
   */
  headerName?: string;

  /**
   * Extract from cookies
   * @default false
   */
  fromCookie?: boolean;

  /**
   * Cookie name for session tokens
   * @default 'auth_token'
   */
  cookieName?: string;

  /**
   * Extract from query parameters
   * @default false
   */
  fromQuery?: boolean;

  /**
   * Query parameter name for API keys
   * @default 'api_key'
   */
  queryParamName?: string;

  /**
   * Extract from custom headers
   * @default false
   */
  fromCustomHeader?: boolean;

  /**
   * Custom header name
   * @default 'x-api-key'
   */
  customHeaderName?: string;
}

/**
 * Authorization configuration
 */
export interface AuthorizationConfig {
  /**
   * Required roles (user must have at least one)
   */
  requiredRoles?: string[];

  /**
   * Required permissions (user must have all)
   */
  requiredPermissions?: string[];

  /**
   * Custom authorization function
   */
  customCheck?: (user: ExtendedUserContext) => boolean | Promise<boolean>;

  /**
   * Allow anonymous access
   * @default false
   */
  allowAnonymous?: boolean;
}

/**
 * Middleware configuration
 */
export interface AuthMiddlewareConfig {
  /**
   * Token validator function
   */
  validator: TokenValidator;

  /**
   * Role mapper function
   */
  roleMapper?: (claims: Record<string, any>) => string[];

  /**
   * Provider name for user context
   */
  providerName?: string;

  /**
   * Token extraction configuration
   */
  extraction?: TokenExtractionConfig;

  /**
   * Authorization configuration
   */
  authorization?: AuthorizationConfig;

  /**
   * Rate limiting configuration
   */
  rateLimiting?: {
    enabled?: boolean;
    rateLimiter?: AuthRateLimiter;
  };

  /**
   * Error handler for authentication failures
   */
  onAuthError?: (error: AuthenticationError) => AuthErrorResponse;

  /**
   * Error handler for authorization failures
   */
  onAuthzError?: (error: AuthorizationError) => AuthErrorResponse;
}

/**
 * Authentication error
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly code: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'RATE_LIMITED',
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly code: 'INSUFFICIENT_PERMISSIONS' | 'MISSING_ROLE' | 'CUSTOM_CHECK_FAILED',
    public readonly requiredRoles?: string[],
    public readonly requiredPermissions?: string[],
    public readonly userRoles?: string[]
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Error response for authentication/authorization failures
 */
export interface AuthErrorResponse {
  status: number;
  body: {
    error: string;
    message: string;
    code?: string;
  };
  headers?: Record<string, string>;
}

/**
 * Request context with user information
 */
export interface AuthenticatedContext {
  user: ExtendedUserContext;
  token?: string;
  provider?: string;
}

/**
 * Function handler with authentication context
 */
export type AuthenticatedHandler<TInput = any, TOutput = any> = (
  input: TInput,
  context: AuthenticatedContext
) => Promise<TOutput> | TOutput;

// ============================================================================
// Token Extraction
// ============================================================================

/**
 * Extract token from HTTP request based on configuration
 *
 * @param request - Azure HTTP request
 * @param config - Extraction configuration
 * @returns Extracted token or null
 *
 * @example
 * ```typescript
 * const token = extractToken(request, {
 *   fromHeader: true,
 *   fromCookie: true,
 *   fromQuery: true
 * });
 * ```
 */
export function extractToken(
  request: HttpRequest,
  config: TokenExtractionConfig = {}
): string | null {
  const {
    fromHeader = true,
    headerName = 'authorization',
    fromCookie = false,
    cookieName = 'auth_token',
    fromQuery = false,
    queryParamName = 'api_key',
    fromCustomHeader = false,
    customHeaderName = 'x-api-key',
  } = config;

  // 1. Try Authorization header (Bearer tokens)
  if (fromHeader) {
    const authHeader = request.headers.get(headerName);
    if (authHeader) {
      const token = extractBearerToken(authHeader);
      if (token) return token;
    }
  }

  // 2. Try custom header (API keys)
  if (fromCustomHeader) {
    const customHeader = request.headers.get(customHeaderName);
    if (customHeader) return customHeader;
  }

  // 3. Try cookies (session tokens)
  if (fromCookie) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const token = extractTokenFromCookie(cookieHeader, cookieName);
      if (token) return token;
    }
  }

  // 4. Try query parameters (API keys - less secure, use with caution)
  if (fromQuery) {
    const queryToken = request.query.get(queryParamName);
    if (queryToken) return queryToken;
  }

  return null;
}

/**
 * Extract token from cookie string
 *
 * @param cookieHeader - Cookie header value
 * @param cookieName - Name of the cookie containing the token
 * @returns Token value or null
 */
function extractTokenFromCookie(cookieHeader: string, cookieName: string): string | null {
  const cookies = cookieHeader.split(';').map((c) => c.trim());

  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === cookieName && value) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

// ============================================================================
// Middleware Implementation
// ============================================================================

/**
 * Create authentication middleware for function handlers
 *
 * @param config - Middleware configuration
 * @returns Middleware function
 *
 * @remarks
 * This middleware:
 * 1. Extracts authentication token from request
 * 2. Validates token using configured validator
 * 3. Creates user context
 * 4. Performs authorization checks
 * 5. Rate limits authentication attempts
 * 6. Injects user context into handler
 *
 * Security features:
 * - Multiple token extraction sources
 * - Comprehensive validation
 * - Role-based access control
 * - Permission-based access control
 * - Rate limiting to prevent brute force
 * - Secure error handling (no token leakage)
 *
 * @example
 * ```typescript
 * const authMiddleware = createAuthMiddleware({
 *   validator: myTokenValidator,
 *   roleMapper: (claims) => claims.roles || [],
 *   providerName: 'entra',
 *   extraction: {
 *     fromHeader: true,
 *     fromCookie: true
 *   },
 *   authorization: {
 *     requiredRoles: ['user']
 *   },
 *   rateLimiting: {
 *     enabled: true
 *   }
 * });
 *
 * // Use in function handler
 * export const myFunction = authMiddleware(async (input, context) => {
 *   console.log('User ID:', context.user.id);
 *   console.log('Roles:', context.user.roles);
 *   return { message: 'Success' };
 * });
 * ```
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig) {
  const {
    validator,
    roleMapper = (claims) => claims.roles || [],
    providerName = 'custom',
    extraction = {},
    authorization = {},
    rateLimiting = {},
  } = config;

  // Initialize rate limiter if enabled
  const rateLimiter = rateLimiting.enabled ? rateLimiting.rateLimiter || createLoginRateLimiter() : undefined;

  /**
   * Middleware wrapper function
   */
  return function authMiddleware<TInput = any, TOutput = any>(
    handler: AuthenticatedHandler<TInput, TOutput>
  ): (input: TInput, request: HttpRequest) => Promise<TOutput | AuthErrorResponse> {
    return async (input: TInput, request: HttpRequest): Promise<TOutput | AuthErrorResponse> => {
      try {
        // Extract token from request
        const token = extractToken(request, extraction);

        // Check if token is required
        if (!token) {
          if (authorization.allowAnonymous) {
            // Allow anonymous access
            const anonymousContext: AuthenticatedContext = {
              user: getAnonymousUserContext(),
            };
            return await handler(input, anonymousContext);
          }

          throw new AuthenticationError('No authentication token provided', 'MISSING_TOKEN');
        }

        // Rate limiting check
        if (rateLimiter) {
          const clientId = getClientIdentifier(request);
          const rateLimitResult = await rateLimiter.checkLimit(clientId);

          if (!rateLimitResult.allowed) {
            rateLimiter.recordAttempt(clientId, false);
            throw new AuthenticationError(
              'Rate limit exceeded',
              'RATE_LIMITED',
              { retryAfter: rateLimitResult.retryAfter }
            );
          }
        }

        // Validate token
        const validationContext: ValidationContext = {
          headers: Object.fromEntries(request.headers.entries()),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        };

        const validationResult: TokenValidationResult = await validator(token, validationContext);

        if (!validationResult.valid) {
          if (rateLimiter) {
            const clientId = getClientIdentifier(request);
            rateLimiter.recordAttempt(clientId, false);
          }

          const errorCode = validationResult.error?.includes('expired') ? 'EXPIRED_TOKEN' : 'INVALID_TOKEN';
          throw new AuthenticationError(validationResult.error || 'Token validation failed', errorCode);
        }

        // Record successful authentication for rate limiting
        if (rateLimiter) {
          const clientId = getClientIdentifier(request);
          rateLimiter.recordAttempt(clientId, true);
        }

        // Map roles
        const roles = roleMapper(validationResult.claims || {});

        // Create user context
        const user = createUserContext(validationResult, roles, providerName);

        // Perform authorization checks
        await performAuthorizationChecks(user, authorization);

        // Create authenticated context
        const authenticatedContext: AuthenticatedContext = {
          user,
          token,
          provider: providerName,
        };

        // Call handler with authenticated context
        return await handler(input, authenticatedContext);
      } catch (error) {
        // Handle authentication errors
        if (error instanceof AuthenticationError) {
          const errorHandler = config.onAuthError || defaultAuthErrorHandler;
          return errorHandler(error);
        }

        // Handle authorization errors
        if (error instanceof AuthorizationError) {
          const errorHandler = config.onAuthzError || defaultAuthzErrorHandler;
          return errorHandler(error);
        }

        // Re-throw other errors
        throw error;
      }
    };
  };
}

/**
 * Perform authorization checks on user context
 *
 * @param user - User context
 * @param config - Authorization configuration
 * @throws AuthorizationError if authorization fails
 */
async function performAuthorizationChecks(
  user: ExtendedUserContext,
  config: AuthorizationConfig
): Promise<void> {
  // Check required roles
  if (config.requiredRoles && config.requiredRoles.length > 0) {
    if (!user.hasAnyRole(config.requiredRoles)) {
      throw new AuthorizationError(
        'User does not have required role',
        'MISSING_ROLE',
        config.requiredRoles,
        undefined,
        user.roles
      );
    }
  }

  // Check required permissions (would be implemented with permission system)
  if (config.requiredPermissions && config.requiredPermissions.length > 0) {
    // This would check against a permission system
    // For now, we'll check if user has all required permissions in roles
    const hasAllPermissions = config.requiredPermissions.every((permission) => user.hasRole(permission));

    if (!hasAllPermissions) {
      throw new AuthorizationError(
        'User does not have required permissions',
        'INSUFFICIENT_PERMISSIONS',
        undefined,
        config.requiredPermissions,
        user.roles
      );
    }
  }

  // Custom authorization check
  if (config.customCheck) {
    const passed = await config.customCheck(user);
    if (!passed) {
      throw new AuthorizationError('Custom authorization check failed', 'CUSTOM_CHECK_FAILED');
    }
  }
}

/**
 * Get client identifier for rate limiting
 *
 * @param request - HTTP request
 * @returns Client identifier (IP address or user agent hash)
 */
function getClientIdentifier(request: HttpRequest): string {
  // Try to get IP address
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip');

  if (ip) {
    // Use first IP in X-Forwarded-For chain
    return ip.split(',')[0].trim();
  }

  // Fallback to user agent hash
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `ua-${hashString(userAgent)}`;
}

/**
 * Simple hash function for strings
 *
 * @param str - String to hash
 * @returns Hash value
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Default authentication error handler
 *
 * @param error - Authentication error
 * @returns Error response
 */
function defaultAuthErrorHandler(error: AuthenticationError): AuthErrorResponse {
  const statusMap = {
    MISSING_TOKEN: 401,
    INVALID_TOKEN: 401,
    EXPIRED_TOKEN: 401,
    RATE_LIMITED: 429,
  };

  const headers: Record<string, string> = {};

  if (error.code === 'RATE_LIMITED' && error.details?.retryAfter) {
    headers['Retry-After'] = Math.ceil(error.details.retryAfter / 1000).toString();
  }

  return {
    status: statusMap[error.code] || 401,
    body: {
      error: 'Unauthorized',
      message: error.message,
      code: error.code,
    },
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  };
}

/**
 * Default authorization error handler
 *
 * @param error - Authorization error
 * @returns Error response
 */
function defaultAuthzErrorHandler(error: AuthorizationError): AuthErrorResponse {
  return {
    status: 403,
    body: {
      error: 'Forbidden',
      message: error.message,
      code: error.code,
    },
  };
}

// ============================================================================
// Middleware Factories
// ============================================================================

/**
 * Create middleware that requires authentication but no specific roles
 *
 * @param validator - Token validator
 * @param roleMapper - Role mapper function
 * @param providerName - Provider name
 * @returns Authentication middleware
 *
 * @example
 * ```typescript
 * const requireAuth = requireAuthentication(validator, roleMapper, 'entra');
 *
 * export const protectedFunction = requireAuth(async (input, context) => {
 *   // User is authenticated
 *   return { userId: context.user.id };
 * });
 * ```
 */
export function requireAuthentication(
  validator: TokenValidator,
  roleMapper?: (claims: Record<string, any>) => string[],
  providerName?: string
) {
  return createAuthMiddleware({
    validator,
    roleMapper,
    providerName,
    extraction: {
      fromHeader: true,
      fromCookie: true,
    },
    authorization: {
      allowAnonymous: false,
    },
  });
}

/**
 * Create middleware that requires specific roles
 *
 * @param validator - Token validator
 * @param requiredRoles - Required roles
 * @param roleMapper - Role mapper function
 * @param providerName - Provider name
 * @returns Authorization middleware
 *
 * @example
 * ```typescript
 * const requireAdmin = requireRoles(validator, ['admin'], roleMapper, 'entra');
 *
 * export const adminFunction = requireAdmin(async (input, context) => {
 *   // User is admin
 *   return { message: 'Admin access granted' };
 * });
 * ```
 */
export function requireRoles(
  validator: TokenValidator,
  requiredRoles: string[],
  roleMapper?: (claims: Record<string, any>) => string[],
  providerName?: string
) {
  return createAuthMiddleware({
    validator,
    roleMapper,
    providerName,
    extraction: {
      fromHeader: true,
      fromCookie: true,
    },
    authorization: {
      requiredRoles,
      allowAnonymous: false,
    },
  });
}

/**
 * Create middleware that allows both authenticated and anonymous access
 *
 * @param validator - Token validator
 * @param roleMapper - Role mapper function
 * @param providerName - Provider name
 * @returns Optional authentication middleware
 *
 * @example
 * ```typescript
 * const optionalAuth = optionalAuthentication(validator, roleMapper, 'entra');
 *
 * export const publicFunction = optionalAuth(async (input, context) => {
 *   if (context.user.isAuthenticated) {
 *     return { message: `Hello ${context.user.id}` };
 *   } else {
 *     return { message: 'Hello guest' };
 *   }
 * });
 * ```
 */
export function optionalAuthentication(
  validator: TokenValidator,
  roleMapper?: (claims: Record<string, any>) => string[],
  providerName?: string
) {
  return createAuthMiddleware({
    validator,
    roleMapper,
    providerName,
    extraction: {
      fromHeader: true,
      fromCookie: true,
    },
    authorization: {
      allowAnonymous: true,
    },
  });
}
