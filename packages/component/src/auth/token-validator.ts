/**
 * Token Validation Utilities
 *
 * Provides utilities for extracting, decoding, and validating authentication tokens,
 * particularly JWT tokens from bearer authentication headers.
 *
 * @remarks
 * The full JWT signature validation is implemented in the runtime package.
 * This module provides the foundational utilities and type definitions used
 * during component definition.
 *
 * @packageDocumentation
 */

import type { TokenValidationResult } from './types';

// Type definition for JWK to avoid direct jose dependency during build
export interface JWK {
  kty?: string;
  use?: string;
  key_ops?: string[];
  alg?: string;
  kid?: string;
  x5c?: string[];
  x5t?: string;
  'x5t#S256'?: string;
  x5u?: string;
  n?: string;
  e?: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
  x?: string;
  y?: string;
  k?: string;
  crv?: string;
}

// ============================================================================
// JWT Payload Type
// ============================================================================

/**
 * Standard JWT payload claims
 *
 * @remarks
 * Represents the decoded JWT payload with standard claims and Azure-specific
 * extensions. Additional custom claims can be present via the index signature.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1
 */
export interface JwtPayload {
  /**
   * Issuer - identifies the principal that issued the JWT
   * @example 'https://login.microsoftonline.com/tenant-id/v2.0'
   */
  iss?: string;

  /**
   * Subject - identifies the principal that is the subject of the JWT
   * @example 'user-id-1234'
   */
  sub?: string;

  /**
   * Audience - identifies the recipients that the JWT is intended for
   * @example 'api://my-application'
   */
  aud?: string | string[];

  /**
   * Expiration Time - identifies the expiration time on or after which the JWT must not be accepted
   * Unix timestamp in seconds
   */
  exp?: number;

  /**
   * Not Before - identifies the time before which the JWT must not be accepted
   * Unix timestamp in seconds
   */
  nbf?: number;

  /**
   * Issued At - identifies the time at which the JWT was issued
   * Unix timestamp in seconds
   */
  iat?: number;

  /**
   * JWT ID - unique identifier for the JWT
   */
  jti?: string;

  // Azure-specific claims

  /**
   * Object ID - unique identifier for the user in Azure AD
   * @remarks Azure-specific claim
   */
  oid?: string;

  /**
   * User Principal Name - user's UPN in Azure AD
   * @remarks Azure-specific claim
   * @example 'user@tenant.onmicrosoft.com'
   */
  upn?: string;

  /**
   * Email address
   */
  email?: string;

  /**
   * Preferred username
   */
  preferred_username?: string;

  /**
   * Name
   */
  name?: string;

  /**
   * Groups - list of group IDs or group objects the user belongs to
   * @remarks Can be array of strings (group IDs) or objects with name/displayName
   */
  groups?: any[];

  /**
   * Roles - application-specific roles assigned to the user
   */
  roles?: string[];

  /**
   * Additional claims
   */
  [key: string]: any;
}

// ============================================================================
// Token Extraction
// ============================================================================

/**
 * Extract bearer token from Authorization header
 *
 * @param authHeader - The Authorization header value
 * @returns The extracted token, or null if not found or invalid format
 *
 * @remarks
 * Supports both "Bearer token" and "bearer token" formats (case-insensitive).
 * Returns null for missing headers, malformed headers, or non-Bearer schemes.
 *
 * @example
 * ```typescript
 * const token = extractBearerToken('Bearer abc123xyz');
 * // Returns: 'abc123xyz'
 *
 * const noToken = extractBearerToken('Basic abc123');
 * // Returns: null
 *
 * const missing = extractBearerToken(undefined);
 * // Returns: null
 * ```
 */
export function extractBearerToken(authHeader?: string): string | null {
  // Handle missing header
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmed = authHeader.trim();
  if (!trimmed) {
    return null;
  }

  // Split on first space
  const parts = trimmed.split(/\s+/);

  // Must have exactly 2 parts: scheme and token
  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  // Check for Bearer scheme (case-insensitive)
  if (scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  // Token must be non-empty
  if (!token || token.trim() === '') {
    return null;
  }

  return token;
}

// ============================================================================
// JWT Decoding
// ============================================================================

/**
 * Decode JWT without validation
 *
 * @param token - The JWT token string
 * @returns Decoded JWT payload, or null if decoding fails
 *
 * @remarks
 * This function decodes the JWT payload without verifying the signature.
 * It should only be used for inspection purposes. For security-critical
 * operations, use validateJwtSignature() which performs full validation.
 *
 * The function handles malformed tokens gracefully by returning null.
 *
 * @example
 * ```typescript
 * const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0...';
 * const payload = decodeJwt(token);
 *
 * if (payload) {
 *   console.log('User ID:', payload.sub);
 *   console.log('Issuer:', payload.iss);
 * }
 * ```
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    // JWT must be a string
    if (!token || typeof token !== 'string') {
      return null;
    }

    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payloadBase64 = parts[1];
    if (!payloadBase64) {
      return null;
    }

    // Base64 decode
    // Note: JWT uses base64url encoding, but Node's Buffer handles both
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');

    // Parse JSON
    const payload = JSON.parse(payloadJson);

    // Ensure payload is an object (not null, not array)
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    return payload as JwtPayload;
  } catch (error) {
    // Catch any errors (invalid base64, invalid JSON, etc.)
    return null;
  }
}

// ============================================================================
// JWT Signature Validation
// ============================================================================

/**
 * Validate JWT signature and claims
 *
 * @param token - The JWT token string
 * @param issuer - Expected issuer claim value
 * @param audience - Expected audience claim value (optional)
 * @param publicKey - Public key for signature verification (PEM string or JWK object)
 * @param validationOptions - Options for token expiration and timing validation (optional)
 * @returns Promise resolving to validation result
 *
 * @remarks
 * **BREAKING CHANGE**: This function now requires a `publicKey` parameter for
 * cryptographic signature verification. The function performs full JWT validation:
 * - Verifies JWT signature using the provided public key
 * - Validates issuer (iss claim) matches expected value
 * - Validates audience (aud claim) matches expected value if provided
 * - Validates expiration (exp claim) with clock skew tolerance
 * - Validates not-before time (nbf claim) with clock skew tolerance
 * - Enforces maximum token age when configured
 *
 * Security Note: Never log the actual token or public key in error messages.
 * This function will return generic error messages to prevent information leakage.
 *
 * @example
 * ```typescript
 * // With PEM-formatted public key and default options
 * const result = await validateJwtSignature(
 *   token,
 *   'https://login.microsoftonline.com/tenant-id/v2.0',
 *   'api://my-app',
 *   publicKeyPEM
 * );
 *
 * // With JWK object and custom validation options
 * const jwk = {
 *   kty: 'RSA',
 *   n: '...',
 *   e: 'AQAB',
 *   alg: 'RS256',
 *   use: 'sig'
 * };
 * const options = {
 *   requireExpiration: true,
 *   clockSkewSeconds: 60, // 1 minute
 *   maxTokenAgeSeconds: 3600 // 1 hour
 * };
 * const result = await validateJwtSignature(token, issuer, audience, jwk, options);
 *
 * if (result.valid) {
 *   console.log('User ID:', result.userId);
 *   console.log('Email:', result.email);
 *   console.log('Claims:', result.claims);
 * } else {
 *   console.error('Validation failed:', result.error);
 * }
 * ```
 */
export async function validateJwtSignature(
  token: string,
  issuer: string,
  audience?: string,
  publicKey?: string | JWK,
  validationOptions?: TokenValidationOptions
): Promise<TokenValidationResult> {
  // CRITICAL: Require public key for signature validation
  if (!publicKey) {
    return {
      valid: false,
      error: 'JWT signature validation requires a public key',
    };
  }

  // Validate token parameter
  if (!token || typeof token !== 'string') {
    return {
      valid: false,
      error: 'Invalid token format',
    };
  }

  // Validate issuer parameter
  if (!issuer || typeof issuer !== 'string') {
    return {
      valid: false,
      error: 'Invalid issuer parameter',
    };
  }

  try {
    // Dynamically import jose to handle signature verification
    // This is a runtime dependency for actual JWT validation
    let jose: any;
    try {
      jose = await import('jose');
    } catch (importError) {
      // If jose is not available, we cannot perform cryptographic validation
      // This should never happen in production as jose is a required dependency
      return {
        valid: false,
        error: 'JWT validation library not available - cannot verify signature',
      };
    }

    // Convert public key to the format jose expects
    let key: any;

    if (typeof publicKey === 'string') {
      // PEM format - jose can handle PEM strings directly
      key = publicKey;
    } else {
      // JWK format - import directly using jose
      key = await jose.importJWK(publicKey);
    }

    // Verify the JWT signature and decode payload
    const { payload } = await jose.jwtVerify(token, key, {
      issuer: issuer,
      audience: audience ? audience : undefined,
    });

    // Additional validation: check expiration using our helper with options
    if (isTokenExpired(payload as Record<string, any>, validationOptions)) {
      return {
        valid: false,
        error: 'Token has expired',
      };
    }

    // Additional validation: check not-before using our helper with options
    if (isTokenNotYetValid(payload as Record<string, any>, validationOptions)) {
      return {
        valid: false,
        error: 'Token is not yet valid',
      };
    }

    // Validate issuer claim explicitly (jose may not always enforce this)
    if (payload.iss !== issuer) {
      return {
        valid: false,
        error: 'Token issuer does not match expected value',
      };
    }

    // Validate audience claim if provided
    if (audience) {
      const tokenAudience = payload.aud;
      const audienceValid =
        tokenAudience === audience ||
        (Array.isArray(tokenAudience) && tokenAudience.includes(audience));

      if (!audienceValid) {
        return {
          valid: false,
          error: 'Token audience does not match expected value',
        };
      }
    }

    // Extract user information
    const claims = payload as Record<string, any>;
    const userId = extractUserId(claims);
    const email = extractEmail(claims);

    // Return successful validation result
    return {
      valid: true,
      claims,
      userId,
      email,
    };
  } catch (error: any) {
    // Handle specific jose errors with generic messages for security
    if (error?.code === 'ERR_JWT_EXPIRED') {
      return {
        valid: false,
        error: 'Token has expired',
      };
    }

    if (error?.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      return {
        valid: false,
        error: 'Invalid token signature',
      };
    }

    if (error?.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
      // Don't expose which claim failed
      return {
        valid: false,
        error: 'Token validation failed',
      };
    }

    if (error?.code === 'ERR_JWS_INVALID') {
      return {
        valid: false,
        error: 'Invalid token format',
      };
    }

    // Generic error for any other failure (don't leak internal errors)
    return {
      valid: false,
      error: 'Token validation failed',
    };
  }
}

// ============================================================================
// Claim Extraction
// ============================================================================

/**
 * Extract user ID from JWT claims
 *
 * @param claims - JWT payload claims
 * @returns User ID string, or undefined if not found
 *
 * @remarks
 * Attempts to extract user ID from multiple possible claim fields,
 * checking in order of preference:
 * 1. `sub` (standard JWT subject claim)
 * 2. `oid` (Azure AD object ID)
 * 3. `userId` (custom claim)
 *
 * Returns the first non-empty string value found.
 *
 * @example
 * ```typescript
 * const claims = {
 *   sub: 'user-123',
 *   oid: 'azure-obj-456',
 *   email: 'user@example.com'
 * };
 *
 * const userId = extractUserId(claims);
 * // Returns: 'user-123' (from sub claim)
 * ```
 */
export function extractUserId(claims: Record<string, any>): string | undefined {
  // Try standard JWT subject claim (must be non-empty)
  if (claims.sub && typeof claims.sub === 'string' && claims.sub.trim()) {
    return claims.sub;
  }

  // Try Azure AD object ID (must be non-empty)
  if (claims.oid && typeof claims.oid === 'string' && claims.oid.trim()) {
    return claims.oid;
  }

  // Try custom userId claim (must be non-empty)
  if (claims.userId && typeof claims.userId === 'string' && claims.userId.trim()) {
    return claims.userId;
  }

  return undefined;
}

/**
 * Extract email from JWT claims
 *
 * @param claims - JWT payload claims
 * @returns Email address string, or undefined if not found
 *
 * @remarks
 * Attempts to extract email from multiple possible claim fields,
 * checking in order of preference:
 * 1. `email` (standard email claim)
 * 2. `upn` (Azure AD User Principal Name)
 * 3. `preferred_username` (OIDC preferred username)
 *
 * Returns the first non-empty string value found.
 *
 * @example
 * ```typescript
 * const claims = {
 *   sub: 'user-123',
 *   email: 'user@example.com',
 *   upn: 'user@tenant.onmicrosoft.com'
 * };
 *
 * const email = extractEmail(claims);
 * // Returns: 'user@example.com' (from email claim)
 * ```
 */
export function extractEmail(claims: Record<string, any>): string | undefined {
  // Try standard email claim (must be non-empty)
  if (claims.email && typeof claims.email === 'string' && claims.email.trim()) {
    return claims.email;
  }

  // Try Azure AD User Principal Name (must be non-empty)
  if (claims.upn && typeof claims.upn === 'string' && claims.upn.trim()) {
    return claims.upn;
  }

  // Try OIDC preferred username (often contains email, must be non-empty)
  if (
    claims.preferred_username &&
    typeof claims.preferred_username === 'string' &&
    claims.preferred_username.trim()
  ) {
    return claims.preferred_username;
  }

  return undefined;
}

// ============================================================================
// Token Validation Options
// ============================================================================

/**
 * Options for token validation
 *
 * @remarks
 * Provides fine-grained control over token validation behavior,
 * including security requirements and timing tolerances.
 */
export interface TokenValidationOptions {
  /**
   * Whether to require an expiration claim (exp).
   * @default true
   *
   * @remarks
   * Setting this to false is NOT recommended for production as it allows
   * tokens to be valid indefinitely, creating a security risk.
   */
  requireExpiration?: boolean;

  /**
   * Clock skew tolerance in seconds.
   * @default 300 (5 minutes)
   *
   * @remarks
   * Accounts for slight time differences between servers. The standard
   * tolerance is 5 minutes, which prevents false rejections due to
   * clock synchronization issues.
   */
  clockSkewSeconds?: number;

  /**
   * Maximum allowed token age in seconds (from iat claim).
   * @default 86400 (24 hours)
   *
   * @remarks
   * Even if a token has a valid expiration claim, this option enforces
   * a maximum lifetime from when it was issued (iat claim). This is a
   * defense-in-depth measure against tokens with excessively long lifetimes.
   */
  maxTokenAgeSeconds?: number;
}

// ============================================================================
// Token Expiration Check
// ============================================================================

/**
 * Check if a JWT token is expired
 *
 * @param claims - JWT payload claims
 * @param options - Validation options for controlling behavior
 * @returns true if token is expired, false otherwise
 *
 * @remarks
 * Checks the `exp` (expiration) claim against the current time with
 * configurable clock skew tolerance. By default, requires an expiration
 * claim and treats missing expiration as invalid.
 *
 * Also enforces maximum token age based on the `iat` (issued at) claim
 * when configured.
 *
 * The `exp` and `iat` claims are expected to be Unix timestamps in seconds.
 *
 * @example
 * ```typescript
 * const claims = {
 *   sub: 'user-123',
 *   exp: Math.floor(Date.now() / 1000) + 60, // Expires in 1 minute
 *   iat: Math.floor(Date.now() / 1000) - 3600 // Issued 1 hour ago
 * };
 *
 * // With default options (requires expiration, 5 min clock skew)
 * if (isTokenExpired(claims)) {
 *   console.log('Token has expired');
 * }
 *
 * // With custom options
 * const options = {
 *   requireExpiration: true,
 *   clockSkewSeconds: 60, // 1 minute tolerance
 *   maxTokenAgeSeconds: 7200 // 2 hours max age
 * };
 * if (isTokenExpired(claims, options)) {
 *   console.log('Token has expired or is too old');
 * }
 * ```
 */
export function isTokenExpired(
  claims: Record<string, any>,
  options: TokenValidationOptions = {}
): boolean {
  // Apply default options
  const opts: Required<TokenValidationOptions> = {
    requireExpiration: options.requireExpiration ?? true,
    clockSkewSeconds: options.clockSkewSeconds ?? 300, // 5 minutes default
    maxTokenAgeSeconds: options.maxTokenAgeSeconds ?? 86400, // 24 hours default
  };

  // Check for expiration claim
  if (!claims.exp) {
    // If expiration is required and missing, treat as expired
    return opts.requireExpiration;
  }

  // Validate exp claim type
  if (typeof claims.exp !== 'number') {
    // Invalid exp format = treat as expired
    return true;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);

  // Check maximum token age using iat (issued at) claim
  if (claims.iat && typeof claims.iat === 'number') {
    const tokenAge = nowInSeconds - claims.iat;
    if (tokenAge > opts.maxTokenAgeSeconds) {
      // Token is too old regardless of exp claim
      return true;
    }
  }

  // Apply clock skew tolerance for expiration check
  // Token is expired if exp < (now - clockSkew)
  // This gives a grace period for slightly expired tokens
  return claims.exp < nowInSeconds - opts.clockSkewSeconds;
}

/**
 * Check if a JWT token is not yet valid
 *
 * @param claims - JWT payload claims
 * @param options - Validation options for controlling behavior
 * @returns true if token is not yet valid (nbf check), false otherwise
 *
 * @remarks
 * Checks the `nbf` (not before) claim against the current time with
 * configurable clock skew tolerance. If the `nbf` claim is missing,
 * returns false (valid).
 *
 * The `nbf` claim is expected to be a Unix timestamp in seconds.
 *
 * @example
 * ```typescript
 * const claims = {
 *   sub: 'user-123',
 *   nbf: Math.floor(Date.now() / 1000) + 60 // Valid in 1 minute
 * };
 *
 * // With default options (5 min clock skew)
 * if (isTokenNotYetValid(claims)) {
 *   console.log('Token is not yet valid');
 * }
 *
 * // With custom clock skew
 * const options = { clockSkewSeconds: 60 }; // 1 minute tolerance
 * if (isTokenNotYetValid(claims, options)) {
 *   console.log('Token is not yet valid');
 * }
 * ```
 */
export function isTokenNotYetValid(
  claims: Record<string, any>,
  options: TokenValidationOptions = {}
): boolean {
  // Check for nbf claim
  if (!claims.nbf || typeof claims.nbf !== 'number') {
    // No nbf claim = token is valid
    return false;
  }

  // Apply default clock skew if not specified
  const clockSkew = options.clockSkewSeconds ?? 300; // 5 minutes default

  const nowInSeconds = Math.floor(Date.now() / 1000);

  // Apply clock skew tolerance for not-before check
  // Token is not yet valid if nbf > (now + clockSkew)
  // This allows tokens that are about to become valid
  return claims.nbf > nowInSeconds + clockSkew;
}
