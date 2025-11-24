/**
 * Authentication Middleware Mocks
 *
 * @remarks
 * Provides mock implementations of authentication components for testing,
 * including token validators, user context providers, and authorization.
 *
 * @module @atakora/component/__tests__/mocks/auth-mocks
 */

import type {
  TokenValidator,
  TokenValidationResult,
  UserContext,
  ValidationContext,
} from '../../auth/types';
import {
  parseTokenClaims,
  isTokenExpired,
  extractUserId,
  extractRoles,
} from '../helpers/token-helpers';

// ============================================================================
// Mock Token Validators
// ============================================================================

/**
 * Mock token validator that accepts all tokens
 */
export class MockTokenValidatorAlwaysValid {
  async validate(token: string, context?: ValidationContext): Promise<TokenValidationResult> {
    const claims = parseTokenClaims(token) || {};

    return {
      valid: true,
      claims,
      userId: claims.sub || 'test-user',
      email: claims.email || 'test@example.com',
    };
  }
}

/**
 * Mock token validator that rejects all tokens
 */
export class MockTokenValidatorAlwaysInvalid {
  async validate(token: string, context?: ValidationContext): Promise<TokenValidationResult> {
    return {
      valid: false,
      error: 'Token validation failed (mock)',
    };
  }
}

/**
 * Mock token validator with realistic validation logic
 */
export class MockTokenValidatorRealistic {
  private validTokens = new Set<string>();
  private revokedTokens = new Set<string>();

  /**
   * Add token to whitelist
   */
  addValidToken(token: string): void {
    this.validTokens.add(token);
  }

  /**
   * Revoke token
   */
  revokeToken(token: string): void {
    this.revokedTokens.add(token);
  }

  /**
   * Clear all tokens
   */
  clear(): void {
    this.validTokens.clear();
    this.revokedTokens.clear();
  }

  async validate(token: string, context?: ValidationContext): Promise<TokenValidationResult> {
    // Check if token is revoked
    if (this.revokedTokens.has(token)) {
      return {
        valid: false,
        error: 'Token has been revoked',
      };
    }

    // If we have a whitelist, check it
    if (this.validTokens.size > 0 && !this.validTokens.has(token)) {
      return {
        valid: false,
        error: 'Token not in whitelist',
      };
    }

    // Parse claims
    const claims = parseTokenClaims(token);

    if (!claims) {
      return {
        valid: false,
        error: 'Invalid token format',
      };
    }

    // Check expiration
    if (isTokenExpired(token)) {
      return {
        valid: false,
        error: 'Token has expired',
      };
    }

    // Validate required claims
    if (!claims.sub) {
      return {
        valid: false,
        error: 'Missing required claim: sub',
      };
    }

    return {
      valid: true,
      claims,
      userId: claims.sub,
      email: claims.email,
    };
  }
}

/**
 * Mock token validator with configurable behavior
 */
export class MockTokenValidatorConfigurable {
  private shouldSucceed: boolean = true;
  private delayMs: number = 0;
  private errorMessage: string = 'Token validation failed';

  /**
   * Set whether validation should succeed
   */
  setSucceed(succeed: boolean): void {
    this.shouldSucceed = succeed;
  }

  /**
   * Set validation delay
   */
  setDelay(ms: number): void {
    this.delayMs = ms;
  }

  /**
   * Set error message
   */
  setErrorMessage(message: string): void {
    this.errorMessage = message;
  }

  async validate(token: string, context?: ValidationContext): Promise<TokenValidationResult> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (!this.shouldSucceed) {
      return {
        valid: false,
        error: this.errorMessage,
      };
    }

    const claims = parseTokenClaims(token) || {};

    return {
      valid: true,
      claims,
      userId: claims.sub || 'test-user',
      email: claims.email,
    };
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.shouldSucceed = true;
    this.delayMs = 0;
    this.errorMessage = 'Token validation failed';
  }
}

// ============================================================================
// Mock User Context Providers
// ============================================================================

/**
 * Mock user context provider
 */
export class MockUserContextProvider {
  private contexts = new Map<string, UserContext>();
  private defaultContext?: UserContext;

  /**
   * Set user context for specific user ID
   */
  setUserContext(userId: string, context: UserContext): void {
    this.contexts.set(userId, context);
  }

  /**
   * Set default context for unknown users
   */
  setDefaultContext(context: UserContext): void {
    this.defaultContext = context;
  }

  /**
   * Get user context by user ID
   */
  getUserContext(userId: string): UserContext | undefined {
    return this.contexts.get(userId) || this.defaultContext;
  }

  /**
   * Get user context from token
   */
  getUserContextFromToken(token: string): UserContext | undefined {
    const userId = extractUserId(token);

    if (!userId) {
      return this.defaultContext;
    }

    return this.getUserContext(userId);
  }

  /**
   * Clear all contexts
   */
  clear(): void {
    this.contexts.clear();
    this.defaultContext = undefined;
  }
}

// ============================================================================
// Mock Authorization Providers
// ============================================================================

/**
 * Mock authorization provider
 */
export class MockAuthorizationProvider {
  private permissions = new Map<string, Set<string>>();
  private rolePermissions = new Map<string, Set<string>>();

  /**
   * Grant permission to user
   */
  grantPermission(userId: string, permission: string): void {
    const userPerms = this.permissions.get(userId) || new Set();
    userPerms.add(permission);
    this.permissions.set(userId, userPerms);
  }

  /**
   * Revoke permission from user
   */
  revokePermission(userId: string, permission: string): void {
    const userPerms = this.permissions.get(userId);
    if (userPerms) {
      userPerms.delete(permission);
    }
  }

  /**
   * Grant permission to role
   */
  grantRolePermission(role: string, permission: string): void {
    const rolePerms = this.rolePermissions.get(role) || new Set();
    rolePerms.add(permission);
    this.rolePermissions.set(role, rolePerms);
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId: string, permission: string, roles: string[] = []): boolean {
    // Check user-specific permissions
    const userPerms = this.permissions.get(userId);
    if (userPerms?.has(permission)) {
      return true;
    }

    // Check role-based permissions
    for (const role of roles) {
      const rolePerms = this.rolePermissions.get(role);
      if (rolePerms?.has(permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has any of the permissions
   */
  hasAnyPermission(userId: string, permissions: string[], roles: string[] = []): boolean {
    return permissions.some((perm) => this.hasPermission(userId, perm, roles));
  }

  /**
   * Check if user has all permissions
   */
  hasAllPermissions(userId: string, permissions: string[], roles: string[] = []): boolean {
    return permissions.every((perm) => this.hasPermission(userId, perm, roles));
  }

  /**
   * Clear all permissions
   */
  clear(): void {
    this.permissions.clear();
    this.rolePermissions.clear();
  }
}

// ============================================================================
// Mock Token Introspection Endpoint
// ============================================================================

export interface IntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string;
  iss?: string;
  jti?: string;
  [key: string]: any;
}

/**
 * Mock token introspection endpoint
 */
export class MockIntrospectionEndpoint {
  private activeTokens = new Map<string, IntrospectionResponse>();

  /**
   * Register token as active
   */
  registerToken(token: string, response: IntrospectionResponse): void {
    this.activeTokens.set(token, response);
  }

  /**
   * Introspect token
   */
  async introspect(token: string): Promise<IntrospectionResponse> {
    const response = this.activeTokens.get(token);

    if (!response) {
      return {
        active: false,
      };
    }

    // Check expiration
    if (response.exp && response.exp < Math.floor(Date.now() / 1000)) {
      return {
        active: false,
      };
    }

    return response;
  }

  /**
   * Revoke token
   */
  revokeToken(token: string): void {
    this.activeTokens.delete(token);
  }

  /**
   * Clear all tokens
   */
  clear(): void {
    this.activeTokens.clear();
  }
}

// ============================================================================
// Mock Token Cache
// ============================================================================

export interface CachedTokenInfo {
  userId: string;
  claims: Record<string, any>;
  expiresAt: number;
}

/**
 * Mock token cache
 */
export class MockTokenCache {
  private cache = new Map<string, CachedTokenInfo>();

  /**
   * Get cached token info
   */
  get(token: string): CachedTokenInfo | null {
    const info = this.cache.get(token);

    if (!info) {
      return null;
    }

    // Check if expired
    if (info.expiresAt < Date.now()) {
      this.cache.delete(token);
      return null;
    }

    return info;
  }

  /**
   * Set cached token info
   */
  set(token: string, info: CachedTokenInfo): void {
    this.cache.set(token, info);
  }

  /**
   * Delete cached token
   */
  delete(token: string): void {
    this.cache.delete(token);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// Complete Mock Auth Environment
// ============================================================================

export interface MockAuthEnvironment {
  tokenValidator: MockTokenValidatorRealistic;
  userContextProvider: MockUserContextProvider;
  authorizationProvider: MockAuthorizationProvider;
  introspectionEndpoint: MockIntrospectionEndpoint;
  tokenCache: MockTokenCache;
}

/**
 * Create complete mock auth environment
 */
export function createMockAuthEnvironment(): MockAuthEnvironment {
  return {
    tokenValidator: new MockTokenValidatorRealistic(),
    userContextProvider: new MockUserContextProvider(),
    authorizationProvider: new MockAuthorizationProvider(),
    introspectionEndpoint: new MockIntrospectionEndpoint(),
    tokenCache: new MockTokenCache(),
  };
}

/**
 * Clear all auth mocks in environment
 */
export function clearMockAuthEnvironment(env: MockAuthEnvironment): void {
  env.tokenValidator.clear();
  env.userContextProvider.clear();
  env.authorizationProvider.clear();
  env.introspectionEndpoint.clear();
  env.tokenCache.clear();
}

// ============================================================================
// Mock Middleware Functions
// ============================================================================

/**
 * Create mock authentication middleware
 */
export function createMockAuthMiddleware(
  validator: MockTokenValidatorRealistic | MockTokenValidatorConfigurable = new MockTokenValidatorRealistic()
) {
  return async (token: string, context?: ValidationContext): Promise<UserContext | null> => {
    const result = await validator.validate(token, context);

    if (!result.valid) {
      return null;
    }

    return {
      id: result.userId || 'unknown',
      email: result.email,
      roles: result.claims?.roles || [],
      claims: result.claims || {},
      provider: 'mock',
    };
  };
}

/**
 * Create mock authorization middleware
 */
export function createMockAuthzMiddleware(
  authzProvider: MockAuthorizationProvider = new MockAuthorizationProvider()
) {
  return (userContext: UserContext, requiredPermission: string): boolean => {
    return authzProvider.hasPermission(userContext.id, requiredPermission, userContext.roles);
  };
}

/**
 * Create mock rate limiting middleware
 */
export class MockRateLimiter {
  private requests = new Map<string, number[]>();
  private limit: number;
  private windowMs: number;

  constructor(limit: number = 100, windowMs: number = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // Filter out requests outside the window
    const recentRequests = requests.filter((timestamp) => now - timestamp < this.windowMs);

    if (recentRequests.length >= this.limit) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    return true;
  }

  /**
   * Get remaining requests
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    const recentRequests = requests.filter((timestamp) => now - timestamp < this.windowMs);

    return Math.max(0, this.limit - recentRequests.length);
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.requests.clear();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Setup common test scenario: authenticated admin user
 */
export function setupAdminScenario(env: MockAuthEnvironment, token: string): void {
  // Register token as valid
  env.tokenValidator.addValidToken(token);

  // Setup user context
  const userId = extractUserId(token) || 'admin-123';
  env.userContextProvider.setUserContext(userId, {
    id: userId,
    email: 'admin@example.com',
    roles: ['admin', 'user'],
    claims: parseTokenClaims(token) || {},
    provider: 'test',
  });

  // Grant admin permissions
  env.authorizationProvider.grantRolePermission('admin', 'admin:read');
  env.authorizationProvider.grantRolePermission('admin', 'admin:write');
  env.authorizationProvider.grantRolePermission('admin', 'user:read');
  env.authorizationProvider.grantRolePermission('admin', 'user:write');
}

/**
 * Setup common test scenario: authenticated regular user
 */
export function setupUserScenario(env: MockAuthEnvironment, token: string): void {
  // Register token as valid
  env.tokenValidator.addValidToken(token);

  // Setup user context
  const userId = extractUserId(token) || 'user-123';
  env.userContextProvider.setUserContext(userId, {
    id: userId,
    email: 'user@example.com',
    roles: ['user'],
    claims: parseTokenClaims(token) || {},
    provider: 'test',
  });

  // Grant user permissions
  env.authorizationProvider.grantRolePermission('user', 'user:read');
}

/**
 * Setup common test scenario: unauthenticated/invalid token
 */
export function setupUnauthenticatedScenario(env: MockAuthEnvironment, token: string): void {
  // Explicitly revoke token to ensure it's invalid
  env.tokenValidator.revokeToken(token);
}
