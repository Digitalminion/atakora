"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheHelper = exports.NotModifiedResponse = exports.CacheHeaderBuilder = exports.VaryConfigBuilder = exports.CacheControl = exports.LastModifiedCache = exports.ETagCache = void 0;
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
class ETagCache {
    /**
     * Configures ETag-based caching
     *
     * @param options - ETag configuration options
     * @returns Cache configuration with ETag enabled
     */
    static configure(options = {}) {
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
    static generateETag(content, type = 'strong', algorithm = 'sha256') {
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
    static validateConditionalRequest(request, currentETag) {
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
    static etagsMatch(etag1, etag2) {
        // Strong comparison: exact match including weak/strong prefix
        // Weak comparison: ignore W/ prefix
        const normalized1 = etag1.replace(/^W\//, '');
        const normalized2 = etag2.replace(/^W\//, '');
        return normalized1 === normalized2;
    }
    /**
     * Parses comma-separated ETag list
     */
    static parseETagList(header) {
        return header
            .split(',')
            .map(etag => etag.trim())
            .filter(etag => etag.length > 0);
    }
    /**
     * Gets header value (case-insensitive)
     */
    static getHeader(request, name) {
        const lowerName = name.toLowerCase();
        const value = request.headers[lowerName] || request.headers[name];
        return Array.isArray(value) ? value[0] : value;
    }
    /**
     * Simple hash function (placeholder for crypto.createHash)
     */
    static simpleHash(content, algorithm) {
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
exports.ETagCache = ETagCache;
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
class LastModifiedCache {
    /**
     * Configures Last-Modified based caching
     *
     * @param options - Last-Modified configuration options
     * @returns Cache configuration with Last-Modified enabled
     */
    static configure(options = {}) {
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
    static validateConditionalRequest(request, lastModified) {
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
    static formatDate(date) {
        return date.toUTCString();
    }
    /**
     * Normalizes date to seconds precision
     */
    static normalizeDate(date) {
        const normalized = new Date(date);
        normalized.setMilliseconds(0);
        return normalized;
    }
    /**
     * Gets header value (case-insensitive)
     */
    static getHeader(request, name) {
        const lowerName = name.toLowerCase();
        const value = request.headers[lowerName] || request.headers[name];
        return Array.isArray(value) ? value[0] : value;
    }
}
exports.LastModifiedCache = LastModifiedCache;
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
class CacheControl {
    /**
     * Creates a public cache configuration
     *
     * @param maxAge - Maximum age in seconds
     * @param sMaxAge - Shared cache max age (optional)
     * @returns Cache configuration for public caching
     */
    static public(maxAge, sMaxAge) {
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
    static private(maxAge) {
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
    static noCache() {
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
    static noStore() {
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
    static immutable(maxAge = 31536000) {
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
    static staleWhileRevalidate(maxAge, staleWhileRevalidate) {
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
    static custom(config) {
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
    static build(config) {
        const parts = [...config.directives];
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
exports.CacheControl = CacheControl;
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
class VaryConfigBuilder {
    constructor() {
        this.headers = [];
        this.queryParams = [];
        this.byUser = false;
        this.byTenant = false;
    }
    /**
     * Adds headers to vary by
     *
     * @param headers - Header names to vary cache by
     * @returns This builder for chaining
     */
    varyByHeaders(headers) {
        this.headers.push(...headers);
        return this;
    }
    /**
     * Adds query parameters to vary by
     *
     * @param params - Query parameter names to vary cache by
     * @returns This builder for chaining
     */
    varyByQuery(params) {
        this.queryParams.push(...params);
        return this;
    }
    /**
     * Varies cache by authenticated user
     *
     * @returns This builder for chaining
     */
    varyByUser() {
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
    varyByTenant() {
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
    build() {
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
    buildHeader() {
        return this.headers.join(', ');
    }
}
exports.VaryConfigBuilder = VaryConfigBuilder;
/**
 * Cache header builder
 *
 * Generates HTTP cache headers from cache configuration.
 */
class CacheHeaderBuilder {
    /**
     * Builds cache-related headers from configuration
     *
     * @param config - Cache configuration
     * @param etag - Optional ETag value
     * @param lastModified - Optional Last-Modified date
     * @returns Header definitions for cache control
     */
    static build(config, etag, lastModified) {
        const headers = {};
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
    static notModified(etag, lastModified) {
        const headers = {};
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
exports.CacheHeaderBuilder = CacheHeaderBuilder;
/**
 * 304 Not Modified response builder
 */
class NotModifiedResponse {
    /**
     * Creates a 304 Not Modified response schema
     *
     * @param etag - Optional ETag value
     * @param lastModified - Optional Last-Modified date
     * @returns Response schema for 304 status
     */
    static create(etag, lastModified) {
        return {
            description: 'Not Modified - Resource has not changed',
            headers: CacheHeaderBuilder.notModified(etag, lastModified),
        };
    }
}
exports.NotModifiedResponse = NotModifiedResponse;
/**
 * Cache helper for combining cache configurations and validation
 */
class CacheHelper {
    /**
     * Combines multiple cache configurations
     *
     * @param configs - Cache configurations to merge
     * @returns Combined cache configuration
     */
    static combine(...configs) {
        // Use mutable types during construction
        let cacheControl;
        let etag;
        let lastModified;
        let headers = [];
        let queryParams = [];
        let byUser = false;
        let byTenant = false;
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
        const result = {
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
    static validateConditionalRequest(request, etag, lastModified) {
        let result = {
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
    static preset(preset) {
        switch (preset) {
            case 'static-asset':
                return CacheControl.immutable(31536000); // 1 year
            case 'api-response':
                return this.combine(CacheControl.public(300), // 5 minutes
                ETagCache.configure({ enabled: true, type: 'strong' }));
            case 'user-specific':
                return this.combine(CacheControl.private(60), // 1 minute
                ETagCache.configure({ enabled: true, type: 'weak' }), { vary: { byUser: true, headers: ['Authorization'] } });
            case 'no-cache':
                return CacheControl.noStore();
            default:
                return {};
        }
    }
}
exports.CacheHelper = CacheHelper;
