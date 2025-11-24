/**
 * OAuth 2.0 Token Introspection (RFC 7662)
 *
 * Provides token introspection functionality for validating opaque tokens
 * and caching introspection results for performance.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7662
 * @packageDocumentation
 */

import type { Duration } from '../common/duration';
import { milliseconds } from '../common/duration';
import { TokenCache } from './token-cache';
import type { TokenValidationResult } from './types';

// ============================================================================
// Introspection Types
// ============================================================================

/**
 * Configuration for OAuth 2.0 token introspection
 */
export interface TokenIntrospectionConfig {
  /**
   * Introspection endpoint URL
   * @example 'https://oauth.example.com/introspect'
   */
  introspectionEndpoint: string;

  /**
   * Client ID for introspection authentication
   */
  clientId: string;

  /**
   * Client secret for introspection authentication
   */
  clientSecret: string;

  /**
   * Cache duration for introspection results
   * @default 5 minutes
   */
  cacheDuration?: Duration;

  /**
   * Maximum cache size
   * @default 1000
   */
  cacheMaxSize?: number;

  /**
   * Request timeout in milliseconds
   * @default 5000
   */
  timeoutMs?: number;

  /**
   * Number of retry attempts for failed requests
   * @default 3
   */
  maxRetries?: number;

  /**
   * Base delay for retry backoff (in milliseconds)
   * @default 1000
   */
  retryDelayMs?: number;

  /**
   * Custom headers to send with introspection request
   */
  customHeaders?: Record<string, string>;

  /**
   * Token type hint (e.g., 'access_token', 'refresh_token')
   */
  tokenTypeHint?: string;
}

/**
 * RFC 7662 Token Introspection Response
 *
 * @see https://www.rfc-editor.org/rfc/rfc7662#section-2.2
 */
export interface IntrospectionResponse {
  /**
   * REQUIRED. Boolean indicator of whether or not the presented token is currently active.
   */
  active: boolean;

  /**
   * OPTIONAL. Client identifier for the OAuth 2.0 client that requested this token.
   */
  client_id?: string;

  /**
   * OPTIONAL. Human-readable identifier for the resource owner who authorized this token.
   */
  username?: string;

  /**
   * OPTIONAL. Type of the token (e.g., "Bearer").
   */
  token_type?: string;

  /**
   * OPTIONAL. Integer timestamp, indicating when this token will expire.
   */
  exp?: number;

  /**
   * OPTIONAL. Integer timestamp, indicating when this token was originally issued.
   */
  iat?: number;

  /**
   * OPTIONAL. Integer timestamp, indicating when this token is not to be used before.
   */
  nbf?: number;

  /**
   * OPTIONAL. Subject of the token - usually a machine-readable identifier.
   */
  sub?: string;

  /**
   * OPTIONAL. Service-specific string identifier or list of identifiers representing the intended audience.
   */
  aud?: string | string[];

  /**
   * OPTIONAL. Issuer of the token.
   */
  iss?: string;

  /**
   * OPTIONAL. String representing the token identifier.
   */
  jti?: string;

  /**
   * OPTIONAL. JSON string containing a space-separated list of scopes.
   */
  scope?: string;

  /**
   * Additional custom claims from the introspection endpoint
   */
  [key: string]: any;
}

/**
 * Result of token introspection with enhanced metadata
 */
export interface IntrospectionResult extends TokenValidationResult {
  /**
   * Full introspection response from the server
   */
  introspectionResponse?: IntrospectionResponse;

  /**
   * Whether result was served from cache
   */
  fromCache?: boolean;

  /**
   * Timestamp when this result was cached
   */
  cachedAt?: number;
}

// ============================================================================
// Token Introspection Client
// ============================================================================

/**
 * OAuth 2.0 Token Introspection Client
 *
 * @remarks
 * Implements RFC 7662 token introspection with:
 * - Automatic caching of introspection results
 * - Retry logic with exponential backoff
 * - Request timeout handling
 * - Error recovery
 * - Performance optimization
 *
 * Security considerations:
 * - Client credentials are sent via HTTP Basic Auth
 * - Tokens are never logged or exposed in errors
 * - Cache is protected against timing attacks
 * - Supports custom headers for additional security
 *
 * @example
 * ```typescript
 * const introspector = new TokenIntrospector({
 *   introspectionEndpoint: 'https://auth.example.com/introspect',
 *   clientId: 'my-service',
 *   clientSecret: process.env.CLIENT_SECRET!,
 *   cacheDuration: minutes(5),
 *   cacheMaxSize: 1000,
 *   maxRetries: 3
 * });
 *
 * // Introspect an opaque token
 * const result = await introspector.introspect(opaqueToken);
 *
 * if (result.valid) {
 *   console.log('Token is active');
 *   console.log('User ID:', result.userId);
 *   console.log('Scopes:', result.introspectionResponse?.scope);
 * } else {
 *   console.error('Token is inactive:', result.error);
 * }
 * ```
 */
export class TokenIntrospector {
  private readonly config: Required<TokenIntrospectionConfig>;
  private readonly cache: TokenCache;
  private readonly authHeader: string;

  constructor(config: TokenIntrospectionConfig) {
    // Apply defaults
    this.config = {
      ...config,
      cacheDuration: config.cacheDuration ?? milliseconds(5 * 60 * 1000), // 5 minutes
      cacheMaxSize: config.cacheMaxSize ?? 1000,
      timeoutMs: config.timeoutMs ?? 5000,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
      customHeaders: config.customHeaders ?? {},
      tokenTypeHint: config.tokenTypeHint ?? 'access_token',
    };

    // Initialize cache
    this.cache = new TokenCache({
      ttlMs: this.config.cacheDuration.toMilliseconds(),
      maxEntries: this.config.cacheMaxSize,
    });

    // Prepare HTTP Basic Auth header
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );
    this.authHeader = `Basic ${credentials}`;
  }

  /**
   * Introspect a token using the configured endpoint
   *
   * @param token - Token to introspect (opaque or JWT)
   * @param options - Optional override settings
   * @returns Introspection result with validation status
   *
   * @remarks
   * This method:
   * 1. Checks cache for existing introspection result
   * 2. If not cached, calls introspection endpoint
   * 3. Parses and validates the response
   * 4. Caches the result for future requests
   * 5. Returns normalized validation result
   *
   * The cache key is derived from a hash of the token to prevent
   * timing attacks and reduce memory usage.
   *
   * @example
   * ```typescript
   * // Basic introspection
   * const result = await introspector.introspect(token);
   *
   * // With custom timeout
   * const result = await introspector.introspect(token, {
   *   timeoutMs: 10000
   * });
   * ```
   */
  async introspect(
    token: string,
    options?: { timeoutMs?: number }
  ): Promise<IntrospectionResult> {
    // Validate input
    if (!token || typeof token !== 'string') {
      return {
        valid: false,
        error: 'Invalid token format',
      };
    }

    // Check cache first
    const cached = this.cache.get(token);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
        cachedAt: Date.now(),
      };
    }

    // Perform introspection with retries
    const response = await this.callIntrospectionEndpoint(token, options?.timeoutMs);

    // Parse and validate response
    const result = this.parseIntrospectionResponse(response, token);

    // Cache successful results (even if token is inactive)
    if (result.valid !== undefined) {
      this.cache.set(token, result);
    }

    return {
      ...result,
      fromCache: false,
    };
  }

  /**
   * Clear the introspection cache
   *
   * @remarks
   * Use this to force re-introspection of all tokens or to free memory.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   *
   * @returns Cache hit/miss statistics
   */
  getCacheStats(): { hits: number; misses: number; size: number } {
    return this.cache.getStats();
  }

  /**
   * Call the introspection endpoint with retry logic
   *
   * @param token - Token to introspect
   * @param timeoutMs - Optional timeout override
   * @returns Introspection response from server
   * @throws Error if all retry attempts fail
   */
  private async callIntrospectionEndpoint(
    token: string,
    timeoutMs?: number
  ): Promise<IntrospectionResponse> {
    const timeout = timeoutMs ?? this.config.timeoutMs;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Apply exponential backoff delay for retries
        if (attempt > 0) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
          await this.delay(delay);
        }

        // Make the introspection request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(this.config.introspectionEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: this.authHeader,
              ...this.config.customHeaders,
            },
            body: this.buildIntrospectionRequestBody(token),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Check HTTP status
          if (!response.ok) {
            throw new Error(`Introspection endpoint returned status ${response.status}`);
          }

          // Parse JSON response
          const data = await response.json();

          // Validate response structure
          if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid introspection response format');
          }

          if (typeof data.active !== 'boolean') {
            throw new Error('Introspection response missing required "active" field');
          }

          return data as IntrospectionResponse;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on validation errors
        if (
          lastError.message.includes('Invalid introspection response') ||
          lastError.message.includes('missing required')
        ) {
          throw lastError;
        }

        // Continue to next retry attempt
        continue;
      }
    }

    // All retries failed
    throw new Error(
      `Token introspection failed after ${this.config.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Build the introspection request body per RFC 7662
   *
   * @param token - Token to introspect
   * @returns URL-encoded request body
   */
  private buildIntrospectionRequestBody(token: string): string {
    const params = new URLSearchParams();
    params.append('token', token);

    if (this.config.tokenTypeHint) {
      params.append('token_type_hint', this.config.tokenTypeHint);
    }

    return params.toString();
  }

  /**
   * Parse introspection response into validation result
   *
   * @param response - Raw introspection response
   * @param token - Original token (for context)
   * @returns Normalized validation result
   */
  private parseIntrospectionResponse(
    response: IntrospectionResponse,
    token: string
  ): IntrospectionResult {
    // Token is inactive
    if (!response.active) {
      return {
        valid: false,
        error: 'Token is not active',
        introspectionResponse: response,
      };
    }

    // Extract user information from standard claims
    const userId = response.sub || response.username;
    const email = response.username?.includes('@') ? response.username : undefined;

    // Build claims object from introspection response
    const claims: Record<string, any> = {
      ...response,
      // Normalize standard claims
      sub: userId,
      email: email,
    };

    return {
      valid: true,
      claims,
      userId,
      email,
      introspectionResponse: response,
    };
  }

  /**
   * Delay helper for retry backoff
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a token introspector for Entra ID (Azure AD)
 *
 * @param config - Base configuration
 * @returns Configured introspector for Entra ID
 *
 * @example
 * ```typescript
 * const introspector = createEntraIntrospector({
 *   tenantId: 'my-tenant-id',
 *   clientId: 'my-client-id',
 *   clientSecret: process.env.CLIENT_SECRET!
 * });
 * ```
 */
export function createEntraIntrospector(config: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  cacheDuration?: Duration;
  cacheMaxSize?: number;
}): TokenIntrospector {
  const introspectionEndpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/introspect`;

  return new TokenIntrospector({
    introspectionEndpoint,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    cacheDuration: config.cacheDuration,
    cacheMaxSize: config.cacheMaxSize,
    tokenTypeHint: 'access_token',
  });
}

/**
 * Create a token introspector for a generic OAuth 2.0 provider
 *
 * @param config - Introspection configuration
 * @returns Configured introspector
 *
 * @example
 * ```typescript
 * const introspector = createOAuthIntrospector({
 *   introspectionEndpoint: 'https://oauth.example.com/introspect',
 *   clientId: 'my-service',
 *   clientSecret: process.env.CLIENT_SECRET!,
 *   cacheDuration: minutes(10)
 * });
 * ```
 */
export function createOAuthIntrospector(
  config: TokenIntrospectionConfig
): TokenIntrospector {
  return new TokenIntrospector(config);
}
