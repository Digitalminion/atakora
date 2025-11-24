/**
 * Token Test Utilities
 *
 * @remarks
 * Provides utilities for generating and validating JWT tokens and API keys
 * in test scenarios. Supports custom claims, expiration, and invalid tokens.
 *
 * @module @atakora/component/__tests__/helpers/token-helpers
 */

import { expect } from 'vitest';
import type { TokenValidationResult, UserContext } from '../../auth/types';

// ============================================================================
// JWT Token Generation
// ============================================================================

export interface JwtClaims {
  sub?: string; // Subject (user ID)
  email?: string;
  name?: string;
  roles?: string[];
  aud?: string; // Audience
  iss?: string; // Issuer
  iat?: number; // Issued at
  exp?: number; // Expiration
  nbf?: number; // Not before
  jti?: string; // JWT ID
  [key: string]: any;
}

/**
 * Generate a valid JWT token for testing
 *
 * @remarks
 * Creates a base64-encoded JWT with standard claims.
 * NOT cryptographically secure - for testing only!
 */
export function generateValidToken(claims: Partial<JwtClaims> = {}): string {
  const now = Math.floor(Date.now() / 1000);

  const defaultClaims: JwtClaims = {
    sub: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
    aud: 'api://test',
    iss: 'https://login.test.com',
    iat: now,
    exp: now + 3600, // 1 hour from now
    jti: `jwt-${Math.random().toString(36).substring(7)}`,
    ...claims,
  };

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(defaultClaims));
  const signature = 'mock-signature-for-testing';

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Generate an expired JWT token
 */
export function generateExpiredToken(claims: Partial<JwtClaims> = {}): string {
  const now = Math.floor(Date.now() / 1000);

  return generateValidToken({
    ...claims,
    iat: now - 7200, // 2 hours ago
    exp: now - 3600, // 1 hour ago
  });
}

/**
 * Generate a not-yet-valid token (nbf in future)
 */
export function generateNotYetValidToken(claims: Partial<JwtClaims> = {}): string {
  const now = Math.floor(Date.now() / 1000);

  return generateValidToken({
    ...claims,
    iat: now,
    nbf: now + 3600, // 1 hour from now
    exp: now + 7200,
  });
}

/**
 * Generate token with custom claims
 */
export function generateTokenWithClaims(customClaims: Record<string, any>): string {
  return generateValidToken(customClaims);
}

/**
 * Generate admin token
 */
export function generateAdminToken(): string {
  return generateValidToken({
    sub: 'admin-user-123',
    email: 'admin@example.com',
    name: 'Admin User',
    roles: ['admin', 'user'],
  });
}

/**
 * Generate token for specific user
 */
export function generateUserToken(userId: string, email: string, roles: string[] = ['user']): string {
  return generateValidToken({
    sub: userId,
    email,
    roles,
  });
}

/**
 * Generate token with specific expiration
 */
export function generateTokenWithExpiration(secondsFromNow: number): string {
  const now = Math.floor(Date.now() / 1000);

  return generateValidToken({
    iat: now,
    exp: now + secondsFromNow,
  });
}

// ============================================================================
// Invalid Token Generation
// ============================================================================

/**
 * Generate malformed JWT (invalid structure)
 */
export function generateMalformedToken(): string {
  return 'not-a-valid-jwt-token';
}

/**
 * Generate JWT with invalid signature
 */
export function generateInvalidSignatureToken(): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claims = {
    sub: 'test-user',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(claims));
  const invalidSignature = 'invalid-signature';

  return `${headerB64}.${payloadB64}.${invalidSignature}`;
}

/**
 * Generate JWT with missing required claims
 */
export function generateTokenMissingClaims(): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claims = {
    // Missing sub, exp, etc.
    iat: Math.floor(Date.now() / 1000),
  };

  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(claims));
  const signature = 'mock-signature';

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Generate JWT with invalid audience
 */
export function generateTokenInvalidAudience(): string {
  return generateValidToken({
    aud: 'api://wrong-audience',
  });
}

/**
 * Generate empty token
 */
export function generateEmptyToken(): string {
  return '';
}

// ============================================================================
// API Key Generation
// ============================================================================

export interface ApiKeyOptions {
  id?: string;
  prefix?: string;
  roles?: string[];
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Generate a valid API key
 */
export function generateApiKey(options: ApiKeyOptions = {}): string {
  const prefix = options.prefix || 'atk';
  const id = options.id || Math.random().toString(36).substring(7);
  const secret = Math.random().toString(36).substring(2, 15) +
                 Math.random().toString(36).substring(2, 15);

  return `${prefix}_${id}_${secret}`;
}

/**
 * Generate API key with metadata
 */
export function generateApiKeyWithMetadata(metadata: Record<string, any>): {
  key: string;
  metadata: Record<string, any>;
} {
  return {
    key: generateApiKey(),
    metadata,
  };
}

/**
 * Generate expired API key
 */
export function generateExpiredApiKey(): string {
  return generateApiKey({
    expiresAt: new Date(Date.now() - 86400000), // 1 day ago
  });
}

/**
 * Generate admin API key
 */
export function generateAdminApiKey(): string {
  return generateApiKey({
    roles: ['admin', 'user'],
  });
}

/**
 * Generate batch of API keys
 */
export function generateApiKeyBatch(count: number): string[] {
  const keys: string[] = [];

  for (let i = 0; i < count; i++) {
    keys.push(generateApiKey({ id: `key-${i}` }));
  }

  return keys;
}

// ============================================================================
// Token Parsing and Validation
// ============================================================================

/**
 * Parse JWT claims without validation
 */
export function parseTokenClaims(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract user ID from token
 */
export function extractUserId(token: string): string | null {
  const claims = parseTokenClaims(token);
  return claims?.sub || null;
}

/**
 * Extract roles from token
 */
export function extractRoles(token: string): string[] {
  const claims = parseTokenClaims(token);
  return claims?.roles || [];
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const claims = parseTokenClaims(token);
  if (!claims?.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return claims.exp < now;
}

/**
 * Check if token is not yet valid
 */
export function isTokenNotYetValid(token: string): boolean {
  const claims = parseTokenClaims(token);
  if (!claims?.nbf) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return claims.nbf > now;
}

// ============================================================================
// Mock Token Validation
// ============================================================================

/**
 * Create mock token validator that always succeeds
 */
export function createAlwaysValidValidator() {
  return async (token: string): Promise<TokenValidationResult> => {
    const claims = parseTokenClaims(token);

    return {
      valid: true,
      claims: claims || {},
      userId: claims?.sub || 'unknown',
      email: claims?.email,
    };
  };
}

/**
 * Create mock token validator that always fails
 */
export function createAlwaysInvalidValidator() {
  return async (token: string): Promise<TokenValidationResult> => {
    return {
      valid: false,
      error: 'Mock validation failure',
    };
  };
}

/**
 * Create mock token validator with custom logic
 */
export function createCustomValidator(
  validationFn: (token: string) => boolean | Promise<boolean>
) {
  return async (token: string): Promise<TokenValidationResult> => {
    const isValid = await validationFn(token);
    const claims = isValid ? parseTokenClaims(token) : null;

    if (isValid && claims) {
      return {
        valid: true,
        claims,
        userId: claims.sub || 'unknown',
        email: claims.email,
      };
    }

    return {
      valid: false,
      error: 'Token validation failed',
    };
  };
}

/**
 * Create realistic token validator
 */
export function createRealisticValidator() {
  return createCustomValidator((token) => {
    // Check token structure
    if (!token || token.split('.').length !== 3) {
      return false;
    }

    // Check expiration
    if (isTokenExpired(token)) {
      return false;
    }

    // Check not-yet-valid
    if (isTokenNotYetValid(token)) {
      return false;
    }

    return true;
  });
}

// ============================================================================
// Token Assertion Helpers
// ============================================================================

/**
 * Assert token is valid format
 */
export function assertValidTokenFormat(token: string) {
  expect(token).toBeTruthy();
  expect(typeof token).toBe('string');

  const parts = token.split('.');
  expect(parts).toHaveLength(3);

  // Verify each part is base64-ish
  parts.forEach((part, index) => {
    if (index < 2) {
      // Header and payload should be valid JSON after base64 decode
      expect(() => JSON.parse(atob(part))).not.toThrow();
    }
  });
}

/**
 * Assert token has required claims
 */
export function assertTokenHasClaims(token: string, requiredClaims: string[]) {
  const claims = parseTokenClaims(token);
  expect(claims).toBeTruthy();

  requiredClaims.forEach((claim) => {
    expect(claims).toHaveProperty(claim);
  });
}

/**
 * Assert token is not expired
 */
export function assertTokenNotExpired(token: string) {
  expect(isTokenExpired(token)).toBe(false);
}

/**
 * Assert token is expired
 */
export function assertTokenExpired(token: string) {
  expect(isTokenExpired(token)).toBe(true);
}

/**
 * Assert token has specific role
 */
export function assertTokenHasRole(token: string, role: string) {
  const roles = extractRoles(token);
  expect(roles).toContain(role);
}

/**
 * Assert token has any of the specified roles
 */
export function assertTokenHasAnyRole(token: string, roles: string[]) {
  const tokenRoles = extractRoles(token);
  const hasRole = roles.some((role) => tokenRoles.includes(role));
  expect(hasRole).toBe(true);
}

/**
 * Assert validation result is successful
 */
export function assertValidationSuccess(result: TokenValidationResult) {
  expect(result.valid).toBe(true);
  expect(result.error).toBeUndefined();
  expect(result.claims).toBeDefined();
  expect(result.userId).toBeTruthy();
}

/**
 * Assert validation result is failure
 */
export function assertValidationFailure(result: TokenValidationResult, expectedError?: string) {
  expect(result.valid).toBe(false);
  expect(result.error).toBeTruthy();

  if (expectedError) {
    expect(result.error).toContain(expectedError);
  }
}

// ============================================================================
// Authorization Header Helpers
// ============================================================================

/**
 * Create Bearer authorization header
 */
export function createBearerHeader(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Create API Key authorization header
 */
export function createApiKeyHeader(apiKey: string): string {
  return `ApiKey ${apiKey}`;
}

/**
 * Extract token from authorization header
 */
export function extractTokenFromHeader(authHeader: string): string | null {
  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  if (scheme !== 'Bearer' && scheme !== 'ApiKey') {
    return null;
  }

  return token;
}

/**
 * Create headers object with authorization
 */
export function createAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: createBearerHeader(token),
    'Content-Type': 'application/json',
  };
}

// ============================================================================
// Test User Context Builders
// ============================================================================

/**
 * Create user context from token
 */
export function createUserContextFromToken(token: string, provider: string = 'test'): UserContext {
  const claims = parseTokenClaims(token);

  if (!claims) {
    throw new Error('Invalid token');
  }

  return {
    id: claims.sub || 'unknown',
    email: claims.email,
    roles: claims.roles || [],
    claims: claims,
    provider,
  };
}

/**
 * Create admin user context
 */
export function createAdminContext(): UserContext {
  return {
    id: 'admin-123',
    email: 'admin@example.com',
    roles: ['admin', 'user'],
    claims: {
      sub: 'admin-123',
      email: 'admin@example.com',
      roles: ['admin', 'user'],
    },
    provider: 'test',
  };
}

/**
 * Create standard user context
 */
export function createUserContext(userId: string = 'user-123'): UserContext {
  return {
    id: userId,
    email: `${userId}@example.com`,
    roles: ['user'],
    claims: {
      sub: userId,
      email: `${userId}@example.com`,
      roles: ['user'],
    },
    provider: 'test',
  };
}

/**
 * Create user context with custom roles
 */
export function createUserContextWithRoles(roles: string[]): UserContext {
  return {
    id: 'user-123',
    email: 'user@example.com',
    roles,
    claims: {
      sub: 'user-123',
      email: 'user@example.com',
      roles,
    },
    provider: 'test',
  };
}
