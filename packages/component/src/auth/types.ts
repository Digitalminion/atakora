/**
 * Core Type Definitions for Authentication System
 *
 * This file contains the foundational type definitions for the
 * authentication and authorization framework.
 */

import type { Duration } from '../common/duration';

// ============================================================================
// Core Authentication Types
// ============================================================================

/**
 * Authentication definition input
 * Maps provider names to their builder configurations
 */
export type AuthDefinition = Record<string, AuthProviderBuilder>;

/**
 * Union type for all authentication provider builders
 * Extended by specific provider implementations
 */
export type AuthProviderBuilder =
  | import('./providers/api-keys').ApiKeysBuilder
  | import('./providers/entra').EntraIdBuilder
  | import('./providers/custom').CustomAuthBuilder;

/**
 * Union type for all authentication provider configurations
 * Extended by specific provider configurations
 */
export type AuthProviderConfig =
  | import('./providers/api-keys').ApiKeysConfig
  | import('./providers/entra').EntraIdConfig
  | import('./providers/custom').CustomAuthConfig;

/**
 * Processed authentication provider after building
 */
export interface ProcessedAuthProvider {
  type: string;
  config: AuthProviderConfig;
  validate?: TokenValidator;
  mapRoles?: RoleMapper;
}

// ============================================================================
// Token Validation Types
// ============================================================================

/**
 * Function to validate authentication tokens
 */
export type TokenValidator = (
  token: string,
  context?: ValidationContext
) => Promise<TokenValidationResult>;

/**
 * Context provided during token validation
 */
export interface ValidationContext {
  headers?: Record<string, string>;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

/**
 * Result of token validation
 */
export interface TokenValidationResult {
  valid: boolean;
  claims?: Record<string, any>;
  error?: string;
  userId?: string;
  email?: string;
}

// ============================================================================
// Role Mapping Types
// ============================================================================

/**
 * Function to map token claims to application roles
 */
export type RoleMapper = (claims: Record<string, any>) => string[];

// ============================================================================
// Session Configuration Types
// ============================================================================

/**
 * Session security configuration options
 */
export interface SessionSecurityConfig {
  /**
   * Custom token generator function
   * @default crypto.randomBytes(32).toString('base64url')
   */
  tokenGenerator?: () => string;

  /**
   * Cookie security options
   */
  cookieOptions?: {
    /**
     * Prevents JavaScript access to cookies
     * @default true
     */
    httpOnly?: boolean;

    /**
     * Requires HTTPS for cookie transmission
     * @default true in production
     */
    secure?: boolean;

    /**
     * CSRF protection policy
     * @default 'lax'
     */
    sameSite?: 'strict' | 'lax' | 'none';

    /**
     * Cookie domain scope
     */
    domain?: string;

    /**
     * Cookie path scope
     * @default '/'
     */
    path?: string;
  };

  /**
   * Session fingerprinting configuration
   */
  fingerprinting?: {
    /**
     * Enable session fingerprinting
     * @default true
     */
    enabled?: boolean;

    /**
     * Factors to include in fingerprint
     * @default ['ip', 'userAgent']
     */
    factors?: Array<'ip' | 'userAgent' | 'acceptHeaders'>;
  };

  /**
   * Concurrent session configuration
   */
  concurrent?: {
    /**
     * Maximum concurrent sessions per user
     * @default 5
     */
    maxSessions?: number;

    /**
     * Strategy when max sessions exceeded
     * @default 'invalidate-oldest'
     */
    strategy?: 'reject' | 'invalidate-oldest' | 'invalidate-all';
  };

  /**
   * Session rotation configuration
   */
  rotation?: {
    /**
     * Rotate session on privilege elevation
     * @default true
     */
    onElevation?: boolean;

    /**
     * Periodic rotation interval
     */
    interval?: Duration;
  };
}

/**
 * Session configuration
 */
export interface SessionConfig {
  duration: Duration;
  sliding?: boolean;
  storage?: 'memory' | 'redis' | 'cosmos';
  ttl?: Duration;
  security?: SessionSecurityConfig;
}

/**
 * MFA configuration
 */
export interface MfaConfig {
  required?: boolean;
  requiredForRoles?: string[];
  challengeType?: 'totp' | 'sms' | 'email';
  gracePeriod?: Duration;
}

// ============================================================================
// Auth Object Types
// ============================================================================

/**
 * Authentication metadata
 */
export interface AuthMetadata {
  version: string;
  createdAt: string;
  providerNames: string[];
}

/**
 * Complete authentication object returned by defineAuth
 */
export interface AuthObject<T extends AuthDefinition> {
  /**
   * Original definition passed to defineAuth
   */
  readonly definition: T;

  /**
   * Processed authentication providers
   */
  readonly providers: {
    [K in keyof T]: ProcessedAuthProvider;
  };

  /**
   * Name of the primary authentication provider
   */
  readonly primaryProvider: keyof T;

  /**
   * Authentication metadata
   */
  readonly _metadata: AuthMetadata;

  /**
   * Raw definition (internal use)
   * @internal
   */
  readonly _raw: T;
}

// ============================================================================
// Provider Base Types
// ============================================================================

/**
 * Base authentication provider interface
 * All providers must implement this interface
 */
export interface AuthProvider {
  readonly type: string;
  readonly validate: TokenValidator;
  readonly mapRoles: RoleMapper;
  readonly config: Record<string, any>;
}

/**
 * API Key definition
 */
export interface ApiKey {
  id: string;
  secret: string;
  roles: string[];
  expiresAt?: string;
  metadata?: Record<string, any>;
}

/**
 * Secure API Key definition with hashed secret
 * Used internally for secure storage of API keys
 */
export interface SecureApiKey {
  id: string;
  secretHash: string; // Hashed secret (not plain text)
  salt: string; // Salt used for hashing
  roles: string[];
  version?: number; // For key rotation support
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// User Context Types
// ============================================================================

/**
 * Authenticated user context
 */
export interface UserContext {
  id: string;
  email?: string;
  roles: string[];
  claims: Record<string, any>;
  provider: string;
  sessionId?: string;
}

/**
 * Authentication state in request
 */
export interface AuthState {
  authenticated: boolean;
  user?: UserContext;
  error?: string;
  provider?: string;
}
