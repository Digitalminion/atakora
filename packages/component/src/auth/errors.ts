/**
 * Error Classes for Authentication System
 *
 * Provides structured error handling for authentication and authorization
 * operations with clear, actionable error messages.
 */

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Base error class for all authentication errors
 */
export class AuthError extends Error {
  /**
   * Error code for programmatic handling
   */
  public readonly code: string;

  /**
   * Additional error context
   */
  public readonly context?: Record<string, any>;

  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

// ============================================================================
// Specific Error Classes
// ============================================================================

/**
 * Error thrown when auth definition validation fails
 */
export class AuthDefinitionError extends AuthError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AUTH_DEFINITION_ERROR', context);
    this.name = 'AuthDefinitionError';
  }
}

/**
 * Error thrown when token validation fails
 */
export class TokenValidationError extends AuthError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'TOKEN_VALIDATION_ERROR', context);
    this.name = 'TokenValidationError';
  }
}

/**
 * Error thrown when role mapping fails
 */
export class RoleMappingError extends AuthError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'ROLE_MAPPING_ERROR', context);
    this.name = 'RoleMappingError';
  }
}

/**
 * Error thrown when provider configuration is invalid
 */
export class ProviderConfigError extends AuthError {
  constructor(message: string, provider: string, context?: Record<string, any>) {
    super(message, 'PROVIDER_CONFIG_ERROR', { ...context, provider });
    this.name = 'ProviderConfigError';
  }
}

/**
 * Error thrown when session configuration is invalid
 */
export class SessionConfigError extends AuthError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'SESSION_CONFIG_ERROR', context);
    this.name = 'SessionConfigError';
  }
}

/**
 * Error thrown when MFA configuration is invalid
 */
export class MfaConfigError extends AuthError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'MFA_CONFIG_ERROR', context);
    this.name = 'MfaConfigError';
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create an authentication error with context
 *
 * @param type - Type of error to create
 * @param message - Error message
 * @param context - Additional error context
 * @returns Authentication error
 *
 * @example
 * ```typescript
 * throw createAuthError('definition', 'Invalid provider name', {
 *   provider: 'myProvider',
 *   reason: 'Must be PascalCase'
 * });
 * ```
 */
export function createAuthError(
  type: 'definition' | 'token' | 'role' | 'provider' | 'session' | 'mfa',
  message: string,
  context?: Record<string, any>
): AuthError {
  switch (type) {
    case 'definition':
      return new AuthDefinitionError(message, context);
    case 'token':
      return new TokenValidationError(message, context);
    case 'role':
      return new RoleMappingError(message, context);
    case 'provider':
      return new ProviderConfigError(message, context?.provider || 'unknown', context);
    case 'session':
      return new SessionConfigError(message, context);
    case 'mfa':
      return new MfaConfigError(message, context);
    default:
      return new AuthError(message, 'UNKNOWN_AUTH_ERROR', context);
  }
}

// ============================================================================
// Error Message Helpers
// ============================================================================

/**
 * Format error message with context
 */
export function formatAuthError(message: string, details?: Record<string, any>): string {
  if (!details || Object.keys(details).length === 0) return message;

  const detailsStr = Object.entries(details)
    .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
    .join('\n');

  return `${message}\nDetails:\n${detailsStr}`;
}

/**
 * Common error messages
 */
export const AuthErrorMessages = {
  // Definition errors
  EMPTY_DEFINITION: 'Authentication definition cannot be empty',
  INVALID_PROVIDER_NAME: (name: string) =>
    `Invalid provider name "${name}". Provider names must be PascalCase (e.g., "Primary", "ApiKeys")`,
  DUPLICATE_PROVIDER: (name: string) =>
    `Duplicate provider name "${name}" in authentication definition`,
  NO_PROVIDERS: 'At least one authentication provider must be defined',

  // Provider errors
  MISSING_REQUIRED_CONFIG: (provider: string, field: string) =>
    `Provider "${provider}" is missing required configuration field: ${field}`,
  INVALID_CONFIG_VALUE: (provider: string, field: string, value: any) =>
    `Provider "${provider}" has invalid value for field "${field}": ${value}`,
  PROVIDER_BUILD_FAILED: (provider: string, error: string) =>
    `Failed to build provider "${provider}": ${error}`,

  // Token errors
  INVALID_TOKEN_FORMAT: 'Invalid token format',
  TOKEN_EXPIRED: 'Authentication token has expired',
  TOKEN_SIGNATURE_INVALID: 'Token signature validation failed',
  TOKEN_ISSUER_MISMATCH: (expected: string, actual: string) =>
    `Token issuer mismatch. Expected: ${expected}, Actual: ${actual}`,
  TOKEN_AUDIENCE_MISMATCH: (expected: string, actual: string) =>
    `Token audience mismatch. Expected: ${expected}, Actual: ${actual}`,

  // Role errors
  ROLE_MAPPING_FAILED: (error: string) => `Failed to map user roles: ${error}`,
  INVALID_ROLE: (role: string) => `Invalid role "${role}" returned from role mapper`,

  // Session errors
  INVALID_SESSION_DURATION: 'Session duration must be positive',
  UNSUPPORTED_SESSION_STORAGE: (storage: string) => `Unsupported session storage type: ${storage}`,

  // MFA errors
  INVALID_MFA_CHALLENGE: (type: string) => `Invalid MFA challenge type: ${type}`,
  MFA_REQUIRED: 'Multi-factor authentication is required',
} as const;
