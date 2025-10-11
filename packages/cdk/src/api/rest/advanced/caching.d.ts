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
export type CacheDirective = 'public' | 'private' | 'no-cache' | 'no-store' | 'no-transform' | 'must-revalidate' | 'proxy-revalidate' | 'immutable' | 'stale-while-revalidate' | 'stale-if-error';
/**
 * Cache-Control configuration
 */
export interface CacheControlConfig {
    readonly directives: readonly CacheDirective[];
    readonly maxAge?: number;
    readonly sMaxAge?: number;
    readonly staleWhileRevalidate?: number;
    readonly staleIfError?: number;
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
    readonly roundDown?: boolean;
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
export declare class ETagCache {
    /**
     * Configures ETag-based caching
     *
     * @param options - ETag configuration options
     * @returns Cache configuration with ETag enabled
     */
    static configure(options?: Partial<ETagConfig>): CacheConfig;
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
    static generateETag(content: unknown, type?: ETagType, algorithm?: 'md5' | 'sha1' | 'sha256'): string;
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
    static validateConditionalRequest(request: HttpRequest, currentETag: string): ConditionalRequestResult;
    /**
     * Compares two ETags for equality
     */
    private static etagsMatch;
    /**
     * Parses comma-separated ETag list
     */
    private static parseETagList;
    /**
     * Gets header value (case-insensitive)
     */
    private static getHeader;
    /**
     * Simple hash function (placeholder for crypto.createHash)
     */
    private static simpleHash;
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
export declare class LastModifiedCache {
    /**
     * Configures Last-Modified based caching
     *
     * @param options - Last-Modified configuration options
     * @returns Cache configuration with Last-Modified enabled
     */
    static configure(options?: Partial<LastModifiedConfig>): CacheConfig;
    /**
     * Validates a conditional request based on Last-Modified
     *
     * @param request - HTTP request with conditional headers
     * @param lastModified - Last modified date of the resource
     * @returns Validation result indicating if 304 should be returned
     */
    static validateConditionalRequest(request: HttpRequest, lastModified: Date): ConditionalRequestResult;
    /**
     * Formats a date for Last-Modified header
     *
     * @param date - Date to format
     * @returns HTTP date string (RFC 7231 format)
     */
    static formatDate(date: Date): string;
    /**
     * Normalizes date to seconds precision
     */
    private static normalizeDate;
    /**
     * Gets header value (case-insensitive)
     */
    private static getHeader;
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
export declare class CacheControl {
    /**
     * Creates a public cache configuration
     *
     * @param maxAge - Maximum age in seconds
     * @param sMaxAge - Shared cache max age (optional)
     * @returns Cache configuration for public caching
     */
    static public(maxAge: number, sMaxAge?: number): CacheConfig;
    /**
     * Creates a private cache configuration
     *
     * @param maxAge - Maximum age in seconds
     * @returns Cache configuration for private (user-specific) caching
     */
    static private(maxAge: number): CacheConfig;
    /**
     * Creates a no-cache configuration (must revalidate)
     *
     * @returns Cache configuration requiring revalidation
     */
    static noCache(): CacheConfig;
    /**
     * Creates a no-store configuration (no caching at all)
     *
     * @returns Cache configuration preventing any caching
     */
    static noStore(): CacheConfig;
    /**
     * Creates an immutable cache configuration
     *
     * @param maxAge - Maximum age in seconds (typically very long)
     * @returns Cache configuration for immutable resources
     */
    static immutable(maxAge?: number): CacheConfig;
    /**
     * Creates a stale-while-revalidate configuration
     *
     * @param maxAge - Maximum fresh age in seconds
     * @param staleWhileRevalidate - Stale serving period in seconds
     * @returns Cache configuration allowing stale content while revalidating
     */
    static staleWhileRevalidate(maxAge: number, staleWhileRevalidate: number): CacheConfig;
    /**
     * Creates a custom Cache-Control configuration
     *
     * @param config - Custom cache control configuration
     * @returns Complete cache configuration
     */
    static custom(config: CacheControlConfig): CacheConfig;
    /**
     * Builds Cache-Control header value from configuration
     *
     * @param config - Cache-Control configuration
     * @returns Cache-Control header value string
     */
    static build(config: CacheControlConfig): string;
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
export declare class VaryConfigBuilder {
    private headers;
    private queryParams;
    private byUser;
    private byTenant;
    /**
     * Adds headers to vary by
     *
     * @param headers - Header names to vary cache by
     * @returns This builder for chaining
     */
    varyByHeaders(headers: readonly string[]): this;
    /**
     * Adds query parameters to vary by
     *
     * @param params - Query parameter names to vary cache by
     * @returns This builder for chaining
     */
    varyByQuery(params: readonly string[]): this;
    /**
     * Varies cache by authenticated user
     *
     * @returns This builder for chaining
     */
    varyByUser(): this;
    /**
     * Varies cache by tenant
     *
     * @returns This builder for chaining
     */
    varyByTenant(): this;
    /**
     * Builds the Vary configuration
     *
     * @returns Complete vary configuration
     */
    build(): VaryConfig;
    /**
     * Builds Vary header value
     *
     * @returns Vary header value string
     */
    buildHeader(): string;
}
/**
 * Cache header builder
 *
 * Generates HTTP cache headers from cache configuration.
 */
export declare class CacheHeaderBuilder {
    /**
     * Builds cache-related headers from configuration
     *
     * @param config - Cache configuration
     * @param etag - Optional ETag value
     * @param lastModified - Optional Last-Modified date
     * @returns Header definitions for cache control
     */
    static build(config: CacheConfig, etag?: string, lastModified?: Date): Record<string, HeaderDefinition>;
    /**
     * Builds headers for 304 Not Modified response
     *
     * @param etag - Optional ETag value
     * @param lastModified - Optional Last-Modified date
     * @returns Header definitions for 304 response
     */
    static notModified(etag?: string, lastModified?: Date): Record<string, HeaderDefinition>;
}
/**
 * 304 Not Modified response builder
 */
export declare class NotModifiedResponse {
    /**
     * Creates a 304 Not Modified response schema
     *
     * @param etag - Optional ETag value
     * @param lastModified - Optional Last-Modified date
     * @returns Response schema for 304 status
     */
    static create(etag?: string, lastModified?: Date): ResponseSchema;
}
/**
 * Cache helper for combining cache configurations and validation
 */
export declare class CacheHelper {
    /**
     * Combines multiple cache configurations
     *
     * @param configs - Cache configurations to merge
     * @returns Combined cache configuration
     */
    static combine(...configs: CacheConfig[]): CacheConfig;
    /**
     * Validates a conditional request
     *
     * @param request - HTTP request
     * @param etag - Current ETag value
     * @param lastModified - Current Last-Modified date
     * @returns Validation result
     */
    static validateConditionalRequest(request: HttpRequest, etag?: string, lastModified?: Date): ConditionalRequestResult;
    /**
     * Creates a cache configuration with common presets
     *
     * @param preset - Preset name
     * @returns Cache configuration for the preset
     */
    static preset(preset: 'static-asset' | 'api-response' | 'user-specific' | 'no-cache'): CacheConfig;
}
//# sourceMappingURL=caching.d.ts.map