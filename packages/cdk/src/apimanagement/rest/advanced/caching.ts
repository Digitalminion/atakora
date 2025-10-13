/**
 * HTTP Caching
 *
 * Comprehensive HTTP caching support for REST APIs including:
 * - ETag-based caching (strong and weak validators)
 * - Last-Modified caching
 * - Cache-Control directives (public, private, no-cache, no-store)
 * - Conditional requests (If-None-Match, If-Modified-Since)
 * - 304 Not Modified responses
 * - Vary-by configuration (headers, query params, user)
 * - Cache invalidation patterns
 *
 * @see ADR-015 REST Advanced Features - Section 3
 * @see RFC 7234 HTTP Caching
 * @see RFC 7232 Conditional Requests
 */

import type { HeaderDefinition, ResponseSchema } from '../operation';

/**
 * ETag type (strong or weak validator)
 */
export type ETagType = 'strong' | 'weak';

/**
 * Cache directive types
 */
export type CacheDirective =
  | 'public'
  | 'private'
  | 'no-cache'
  | 'no-store'
  | 'no-transform'
  | 'must-revalidate'
  | 'proxy-revalidate'
  | 'immutable'
  | 'stale-while-revalidate'
  | 'stale-if-error';

/**
 * Cache-Control configuration
 */
export interface CacheControlConfig {
  readonly directives: readonly CacheDirective[];
  readonly maxAge?: number; // In seconds
  readonly sMaxAge?: number; // Shared cache max age (CDN)
  readonly staleWhileRevalidate?: number; // In seconds
  readonly staleIfError?: number; // In seconds
}

/**
 * ETag configuration
 */
export interface ETagConfig {
  readonly enabled: boolean;
  readonly type: ETagType;
  readonly algorithm?: 'md5' | 'sha1' | 'sha256' | 'custom';
  readonly includeHeaders?: readonly string[];
  readonly includeQueryParams?: readonly string[];
}

/**
 * Last-Modified configuration
 */
export interface LastModifiedConfig {
  readonly enabled: boolean;
  readonly precision?: 'seconds' | 'milliseconds';
  readonly roundDown?: boolean; // Round down to nearest second
}

/**
 * Vary configuration
 */
export interface VaryConfig {
  readonly headers?: readonly string[];
  readonly queryParams?: readonly string[];
  readonly byUser?: boolean;
  readonly byTenant?: boolean;
}

/**
 * Complete cache configuration
 */
export interface CacheConfig {
  readonly cacheControl?: CacheControlConfig;
  readonly etag?: ETagConfig;
  readonly lastModified?: LastModifiedConfig;
  readonly vary?: VaryConfig;
}

/**
 * HTTP request for conditional validation
 */
export interface HttpRequest {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly method: string;
  readonly url: string;
}

/**
 * Conditional request validation result
 */
export interface ConditionalRequestResult {
  readonly shouldReturn304: boolean;
  readonly matchedETag?: boolean;
  readonly matchedLastModified?: boolean;
}

/**
 * ETag cache helper
 *
 * Provides ETag generation and validation for HTTP caching.
 *
 * @example
 * ```typescript
 * // Configure ETag caching
 * const config = ETagCache.configure({
 *   enabled: true,
 *   type: 'strong',
 *   algorithm: 'sha256'
 * });
 *
 * // Generate ETag
 * const etag = ETagCache.generateETag({ id: 123, name: 'John' }, 'strong');
 *
 * // Validate conditional request
 * const result = ETagCache.validateConditionalRequest(request, currentETag);
 * if (result.shouldReturn304) {
 *   // Return 304 Not Modified
 * }
 * ```
 */
export class ETagCache {
  /**
   * Configures ETag-based caching
   *
   * @param options - ETag configuration options
   * @returns Cache configuration with ETag enabled
   */
  static configure(options: Partial<ETagConfig> = {}): CacheConfig {
    return {
      etag: {
        enabled: true,
        type: 'strong',
        algorithm: 'sha256',
        ...options,
      },
    };
  }

  /**
   * Generates an ETag for the given content
   *
   * @param content - Content to generate ETag for
   * @param type - ETag type (strong or weak)
   * @param algorithm - Hashing algorithm
   * @returns ETag value
   *
   * @example
   * ```typescript
   * const strongETag = ETagCache.generateETag(data, 'strong', 'sha256');
   * // Returns: "a1b2c3d4..."
   *
   * const weakETag = ETagCache.generateETag(data, 'weak', 'md5');
   * // Returns: "W/"a1b2c3..."
   * ```
   */
  static generateETag(
    content: unknown,
    type: ETagType = 'strong',
    algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256'
  ): string {
    // Serialize content to string
    const serialized = typeof content === 'string'
      ? content
      : JSON.stringify(content);

    // In a real implementation, this would use crypto.createHash()
    // For now, we'll use a simple hash placeholder
    const hash = this.simpleHash(serialized, algorithm);

    // Format as strong or weak ETag
    return type === 'weak' ? `W/"${hash}"` : `"${hash}"`;
  }

  /**
   * Validates a conditional request based on ETag
   *
   * @param request - HTTP request with conditional headers
   * @param currentETag - Current ETag value for the resource
   * @returns Validation result indicating if 304 should be returned
   *
   * @example
   * ```typescript
   * const request = {
   *   headers: { 'if-none-match': '"abc123"' },
   *   method: 'GET',
   *   url: '/api/resource/1'
   * };
   *
   * const result = ETagCache.validateConditionalRequest(request, '"abc123"');
   * // result.shouldReturn304 === true
   * ```
   */
  static validateConditionalRequest(
    request: HttpRequest,
    currentETag: string
  ): ConditionalRequestResult {
    const ifNoneMatch = this.getHeader(request, 'if-none-match');
    const ifMatch = this.getHeader(request, 'if-match');

    if (ifNoneMatch) {
      // If-None-Match: Used for conditional GET (return 304 if match)
      const etags = this.parseETagList(ifNoneMatch);
      const matches = etags.includes('*') || etags.some(etag => this.etagsMatch(etag, currentETag));

      if (matches && (request.method === 'GET' || request.method === 'HEAD')) {
        return {
          shouldReturn304: true,
          matchedETag: true,
        };
      }
    }

    if (ifMatch) {
      // If-Match: Used for conditional updates (return 412 if no match)
      const etags = this.parseETagList(ifMatch);
      const matches = etags.includes('*') || etags.some(etag => this.etagsMatch(etag, currentETag));

      if (!matches) {
        return {
          shouldReturn304: false,
          matchedETag: false,
        };
      }
    }

    return {
      shouldReturn304: false,
    };
  }

  /**
   * Compares two ETags for equality
   */
  private static etagsMatch(etag1: string, etag2: string): boolean {
    // Strong comparison: exact match including weak/strong prefix
    // Weak comparison: ignore W/ prefix
    const normalized1 = etag1.replace(/^W\//, '');
    const normalized2 = etag2.replace(/^W\//, '');
    return normalized1 === normalized2;
  }

  /**
   * Parses comma-separated ETag list
   */
  private static parseETagList(header: string): string[] {
    return header
      .split(',')
      .map(etag => etag.trim())
      .filter(etag => etag.length > 0);
  }

  /**
   * Gets header value (case-insensitive)
   */
  private static getHeader(request: HttpRequest, name: string): string | undefined {
    const lowerName = name.toLowerCase();
    const value = request.headers[lowerName] || request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }

  /**
   * Simple hash function (placeholder for crypto.createHash)
   */
  private static simpleHash(content: string, algorithm: string): string {
    // In production, use: crypto.createHash(algorithm).update(content).digest('hex')
    // This is a simplified placeholder
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

/**
 * Last-Modified cache helper
 *
 * Provides Last-Modified header support for HTTP caching.
 *
 * @example
 * ```typescript
 * // Configure Last-Modified caching
 * const config = LastModifiedCache.configure({
 *   enabled: true,
 *   precision: 'seconds',
 *   roundDown: true
 * });
 *
 * // Validate conditional request
 * const lastModified = new Date('2024-01-01T12:00:00Z');
 * const result = LastModifiedCache.validateConditionalRequest(request, lastModified);
 * ```
 */
export class LastModifiedCache {
  /**
   * Configures Last-Modified based caching
   *
   * @param options - Last-Modified configuration options
   * @returns Cache configuration with Last-Modified enabled
   */
  static configure(options: Partial<LastModifiedConfig> = {}): CacheConfig {
    return {
      lastModified: {
        enabled: true,
        precision: 'seconds',
        roundDown: true,
        ...options,
      },
    };
  }

  /**
   * Validates a conditional request based on Last-Modified
   *
   * @param request - HTTP request with conditional headers
   * @param lastModified - Last modified date of the resource
   * @returns Validation result indicating if 304 should be returned
   */
  static validateConditionalRequest(
    request: HttpRequest,
    lastModified: Date
  ): ConditionalRequestResult {
    const ifModifiedSince = this.getHeader(request, 'if-modified-since');
    const ifUnmodifiedSince = this.getHeader(request, 'if-unmodified-since');

    if (ifModifiedSince) {
      const sinceDate = new Date(ifModifiedSince);
      const resourceDate = this.normalizeDate(lastModified);

      // Return 304 if resource hasn't been modified
      if (resourceDate <= sinceDate) {
        return {
          shouldReturn304: true,
          matchedLastModified: true,
        };
      }
    }

    if (ifUnmodifiedSince) {
      const sinceDate = new Date(ifUnmodifiedSince);
      const resourceDate = this.normalizeDate(lastModified);

      // Return 412 if resource has been modified
      if (resourceDate > sinceDate) {
        return {
          shouldReturn304: false,
          matchedLastModified: false,
        };
      }
    }

    return {
      shouldReturn304: false,
    };
  }

  /**
   * Formats a date for Last-Modified header
   *
   * @param date - Date to format
   * @returns HTTP date string (RFC 7231 format)
   */
  static formatDate(date: Date): string {
    return date.toUTCString();
  }

  /**
   * Normalizes date to seconds precision
   */
  private static normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setMilliseconds(0);
    return normalized;
  }

  /**
   * Gets header value (case-insensitive)
   */
  private static getHeader(request: HttpRequest, name: string): string | undefined {
    const lowerName = name.toLowerCase();
    const value = request.headers[lowerName] || request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }
}

/**
 * Cache-Control header builder
 *
 * Provides convenient methods for creating Cache-Control configurations.
 *
 * @example
 * ```typescript
 * // Public cache for 1 hour
 * const publicCache = CacheControl.public(3600);
 *
 * // Private cache for 5 minutes
 * const privateCache = CacheControl.private(300);
 *
 * // No caching
 * const noCache = CacheControl.noCache();
 *
 * // Custom configuration
 * const custom = CacheControl.custom({
 *   directives: ['public', 'must-revalidate'],
 *   maxAge: 3600,
 *   sMaxAge: 7200
 * });
 * ```
 */
export class CacheControl {
  /**
   * Creates a public cache configuration
   *
   * @param maxAge - Maximum age in seconds
   * @param sMaxAge - Shared cache max age (optional)
   * @returns Cache configuration for public caching
   */
  static public(maxAge: number, sMaxAge?: number): CacheConfig {
    return {
      cacheControl: {
        directives: ['public'],
        maxAge,
        sMaxAge,
      },
    };
  }

  /**
   * Creates a private cache configuration
   *
   * @param maxAge - Maximum age in seconds
   * @returns Cache configuration for private (user-specific) caching
   */
  static private(maxAge: number): CacheConfig {
    return {
      cacheControl: {
        directives: ['private'],
        maxAge,
      },
    };
  }

  /**
   * Creates a no-cache configuration (must revalidate)
   *
   * @returns Cache configuration requiring revalidation
   */
  static noCache(): CacheConfig {
    return {
      cacheControl: {
        directives: ['no-cache'],
      },
    };
  }

  /**
   * Creates a no-store configuration (no caching at all)
   *
   * @returns Cache configuration preventing any caching
   */
  static noStore(): CacheConfig {
    return {
      cacheControl: {
        directives: ['no-store'],
      },
    };
  }

  /**
   * Creates an immutable cache configuration
   *
   * @param maxAge - Maximum age in seconds (typically very long)
   * @returns Cache configuration for immutable resources
   */
  static immutable(maxAge: number = 31536000): CacheConfig {
    return {
      cacheControl: {
        directives: ['public', 'immutable'],
        maxAge,
      },
    };
  }

  /**
   * Creates a stale-while-revalidate configuration
   *
   * @param maxAge - Maximum fresh age in seconds
   * @param staleWhileRevalidate - Stale serving period in seconds
   * @returns Cache configuration allowing stale content while revalidating
   */
  static staleWhileRevalidate(maxAge: number, staleWhileRevalidate: number): CacheConfig {
    return {
      cacheControl: {
        directives: ['public', 'stale-while-revalidate'],
        maxAge,
        staleWhileRevalidate,
      },
    };
  }

  /**
   * Creates a custom Cache-Control configuration
   *
   * @param config - Custom cache control configuration
   * @returns Complete cache configuration
   */
  static custom(config: CacheControlConfig): CacheConfig {
    return {
      cacheControl: config,
    };
  }

  /**
   * Builds Cache-Control header value from configuration
   *
   * @param config - Cache-Control configuration
   * @returns Cache-Control header value string
   */
  static build(config: CacheControlConfig): string {
    const parts: string[] = [...config.directives];

    if (config.maxAge !== undefined) {
      parts.push(`max-age=${config.maxAge}`);
    }

    if (config.sMaxAge !== undefined) {
      parts.push(`s-maxage=${config.sMaxAge}`);
    }

    if (config.staleWhileRevalidate !== undefined) {
      parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }

    if (config.staleIfError !== undefined) {
      parts.push(`stale-if-error=${config.staleIfError}`);
    }

    return parts.join(', ');
  }
}

/**
 * Vary header configuration builder
 *
 * Configures cache variance based on request characteristics.
 *
 * @example
 * ```typescript
 * const varyConfig = new VaryConfig()
 *   .varyByHeaders(['Accept', 'Accept-Language'])
 *   .varyByQuery(['version', 'format'])
 *   .varyByUser()
 *   .build();
 * ```
 */
export class VaryConfigBuilder {
  private headers: string[] = [];
  private queryParams: string[] = [];
  private byUser: boolean = false;
  private byTenant: boolean = false;

  /**
   * Adds headers to vary by
   *
   * @param headers - Header names to vary cache by
   * @returns This builder for chaining
   */
  varyByHeaders(headers: readonly string[]): this {
    this.headers.push(...headers);
    return this;
  }

  /**
   * Adds query parameters to vary by
   *
   * @param params - Query parameter names to vary cache by
   * @returns This builder for chaining
   */
  varyByQuery(params: readonly string[]): this {
    this.queryParams.push(...params);
    return this;
  }

  /**
   * Varies cache by authenticated user
   *
   * @returns This builder for chaining
   */
  varyByUser(): this {
    this.byUser = true;
    // Standard practice: vary by Authorization header
    if (!this.headers.includes('Authorization')) {
      this.headers.push('Authorization');
    }
    return this;
  }

  /**
   * Varies cache by tenant
   *
   * @returns This builder for chaining
   */
  varyByTenant(): this {
    this.byTenant = true;
    // Typically use a custom header like X-Tenant-ID
    if (!this.headers.includes('X-Tenant-ID')) {
      this.headers.push('X-Tenant-ID');
    }
    return this;
  }

  /**
   * Builds the Vary configuration
   *
   * @returns Complete vary configuration
   */
  build(): VaryConfig {
    return {
      headers: this.headers.length > 0 ? this.headers : undefined,
      queryParams: this.queryParams.length > 0 ? this.queryParams : undefined,
      byUser: this.byUser,
      byTenant: this.byTenant,
    };
  }

  /**
   * Builds Vary header value
   *
   * @returns Vary header value string
   */
  buildHeader(): string {
    return this.headers.join(', ');
  }
}

/**
 * Cache header builder
 *
 * Generates HTTP cache headers from cache configuration.
 */
export class CacheHeaderBuilder {
  /**
   * Builds cache-related headers from configuration
   *
   * @param config - Cache configuration
   * @param etag - Optional ETag value
   * @param lastModified - Optional Last-Modified date
   * @returns Header definitions for cache control
   */
  static build(
    config: CacheConfig,
    etag?: string,
    lastModified?: Date
  ): Record<string, HeaderDefinition> {
    const headers: Record<string, HeaderDefinition> = {};

    // Cache-Control header
    if (config.cacheControl) {
      headers['Cache-Control'] = {
        schema: {
          type: 'string',
          description: 'Cache control directives',
        },
        description: 'Directives for caching mechanisms',
      };
    }

    // ETag header
    if (config.etag?.enabled && etag) {
      headers['ETag'] = {
        schema: {
          type: 'string',
          description: 'Entity tag for cache validation',
        },
        description: 'Entity tag (ETag) for the resource',
      };
    }

    // Last-Modified header
    if (config.lastModified?.enabled && lastModified) {
      headers['Last-Modified'] = {
        schema: {
          type: 'string',
          format: 'http-date',
          description: 'Last modification date',
        },
        description: 'Date and time the resource was last modified',
      };
    }

    // Vary header
    if (config.vary?.headers && config.vary.headers.length > 0) {
      headers['Vary'] = {
        schema: {
          type: 'string',
          description: 'Headers that affect caching',
        },
        description: 'Request headers that affect the response',
      };
    }

    return headers;
  }

  /**
   * Builds headers for 304 Not Modified response
   *
   * @param etag - Optional ETag value
   * @param lastModified - Optional Last-Modified date
   * @returns Header definitions for 304 response
   */
  static notModified(etag?: string, lastModified?: Date): Record<string, HeaderDefinition> {
    const headers: Record<string, HeaderDefinition> = {};

    if (etag) {
      headers['ETag'] = {
        schema: { type: 'string' },
        description: 'Entity tag for the resource',
      };
    }

    if (lastModified) {
      headers['Last-Modified'] = {
        schema: { type: 'string', format: 'http-date' },
        description: 'Last modification date',
      };
    }

    headers['Cache-Control'] = {
      schema: { type: 'string' },
      description: 'Cache directives',
    };

    return headers;
  }
}

/**
 * 304 Not Modified response builder
 */
export class NotModifiedResponse {
  /**
   * Creates a 304 Not Modified response schema
   *
   * @param etag - Optional ETag value
   * @param lastModified - Optional Last-Modified date
   * @returns Response schema for 304 status
   */
  static create(etag?: string, lastModified?: Date): ResponseSchema {
    return {
      description: 'Not Modified - Resource has not changed',
      headers: CacheHeaderBuilder.notModified(etag, lastModified),
    };
  }
}

/**
 * Cache helper for combining cache configurations and validation
 */
export class CacheHelper {
  /**
   * Combines multiple cache configurations
   *
   * @param configs - Cache configurations to merge
   * @returns Combined cache configuration
   */
  static combine(...configs: CacheConfig[]): CacheConfig {
    // Use mutable types during construction
    let cacheControl: CacheControlConfig | undefined;
    let etag: ETagConfig | undefined;
    let lastModified: LastModifiedConfig | undefined;
    let headers: string[] = [];
    let queryParams: string[] = [];
    let byUser: boolean = false;
    let byTenant: boolean = false;

    for (const config of configs) {
      if (config.cacheControl) {
        cacheControl = config.cacheControl;
      }
      if (config.etag) {
        etag = config.etag;
      }
      if (config.lastModified) {
        lastModified = config.lastModified;
      }
      if (config.vary) {
        if (config.vary.headers) {
          headers.push(...config.vary.headers);
        }
        if (config.vary.queryParams) {
          queryParams.push(...config.vary.queryParams);
        }
        byUser = byUser || config.vary.byUser || false;
        byTenant = byTenant || config.vary.byTenant || false;
      }
    }

    // Build final readonly object
    const result: CacheConfig = {
      ...(cacheControl && { cacheControl }),
      ...(etag && { etag }),
      ...(lastModified && { lastModified }),
      ...((headers.length > 0 || queryParams.length > 0 || byUser || byTenant) && {
        vary: {
          ...(headers.length > 0 && { headers }),
          ...(queryParams.length > 0 && { queryParams }),
          ...(byUser && { byUser }),
          ...(byTenant && { byTenant }),
        },
      }),
    };

    return result;
  }

  /**
   * Validates a conditional request
   *
   * @param request - HTTP request
   * @param etag - Current ETag value
   * @param lastModified - Current Last-Modified date
   * @returns Validation result
   */
  static validateConditionalRequest(
    request: HttpRequest,
    etag?: string,
    lastModified?: Date
  ): ConditionalRequestResult {
    let result: ConditionalRequestResult = {
      shouldReturn304: false,
    };

    // Check ETag first (takes precedence)
    if (etag) {
      const etagResult = ETagCache.validateConditionalRequest(request, etag);
      if (etagResult.shouldReturn304) {
        return etagResult;
      }
    }

    // Check Last-Modified
    if (lastModified) {
      const lastModResult = LastModifiedCache.validateConditionalRequest(request, lastModified);
      if (lastModResult.shouldReturn304) {
        return lastModResult;
      }
    }

    return result;
  }

  /**
   * Creates a cache configuration with common presets
   *
   * @param preset - Preset name
   * @returns Cache configuration for the preset
   */
  static preset(
    preset: 'static-asset' | 'api-response' | 'user-specific' | 'no-cache'
  ): CacheConfig {
    switch (preset) {
      case 'static-asset':
        return CacheControl.immutable(31536000); // 1 year

      case 'api-response':
        return this.combine(
          CacheControl.public(300), // 5 minutes
          ETagCache.configure({ enabled: true, type: 'strong' })
        );

      case 'user-specific':
        return this.combine(
          CacheControl.private(60), // 1 minute
          ETagCache.configure({ enabled: true, type: 'weak' }),
          { vary: { byUser: true, headers: ['Authorization'] } }
        );

      case 'no-cache':
        return CacheControl.noStore();

      default:
        return {};
    }
  }
}
