"use strict";
/**
 * Rate Limiting and Throttling
 *
 * Comprehensive rate limiting and throttling support for REST APIs including:
 * - Multiple strategies (fixed window, sliding window, token bucket)
 * - Flexible scoping (global, per-IP, per-user, per-API-key, per-operation)
 * - Standard rate limit headers (X-RateLimit-*)
 * - 429 Too Many Requests responses
 * - Retry-After header support
 * - Quota policies
 *
 * @see ADR-015 REST Advanced Features - Section 5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitHelper = exports.QuotaPolicyBuilder = exports.RateLimitResponse = exports.RateLimitHeaderBuilder = exports.RateLimitScopeFactory = exports.RateLimiter = void 0;
/**
 * Rate limiter factory
 *
 * Provides factory methods for creating different rate limiting strategies.
 *
 * @example
 * ```typescript
 * // Fixed window: 100 requests per minute
 * const fixedWindow = RateLimiter.fixedWindow({
 *   limit: 100,
 *   period: { minutes: 1 },
 *   scope: 'per-ip'
 * });
 *
 * // Sliding window: 1000 requests per hour
 * const slidingWindow = RateLimiter.slidingWindow({
 *   limit: 1000,
 *   period: { hours: 1 },
 *   scope: 'per-user',
 *   windowSize: 12 // 12 sub-windows of 5 minutes
 * });
 *
 * // Token bucket: 50 burst, 10 per second refill
 * const tokenBucket = RateLimiter.tokenBucket({
 *   bucketSize: 50,
 *   refillRate: 10,
 *   period: { seconds: 1 },
 *   scope: 'per-api-key'
 * });
 * ```
 */
class RateLimiter {
    /**
     * Creates a fixed window rate limiter
     *
     * Simple algorithm that resets the counter at fixed intervals.
     * Easy to implement but can allow bursts at window boundaries.
     *
     * @param config - Fixed window configuration
     * @returns Rate limit configuration
     */
    static fixedWindow(config) {
        return {
            strategy: 'fixed-window',
            includeHeaders: true,
            ...config,
        };
    }
    /**
     * Creates a sliding window rate limiter
     *
     * More accurate than fixed window, smooths out bursts by using
     * overlapping time windows.
     *
     * @param config - Sliding window configuration
     * @returns Rate limit configuration
     */
    static slidingWindow(config) {
        return {
            strategy: 'sliding-window',
            windowSize: 10,
            includeHeaders: true,
            ...config,
        };
    }
    /**
     * Creates a token bucket rate limiter
     *
     * Allows bursts up to bucket size while maintaining average rate.
     * Good for APIs that need to handle occasional spikes.
     *
     * @param config - Token bucket configuration
     * @returns Rate limit configuration
     */
    static tokenBucket(config) {
        return {
            strategy: 'token-bucket',
            includeHeaders: true,
            ...config,
        };
    }
    /**
     * Creates a leaky bucket rate limiter
     *
     * Processes requests at a constant rate, queuing excess requests.
     * Smooths out traffic spikes.
     *
     * @param config - Leaky bucket configuration
     * @returns Rate limit configuration
     */
    static leakyBucket(config) {
        return {
            strategy: 'leaky-bucket',
            includeHeaders: true,
            ...config,
        };
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Rate limit scope factory
 *
 * Provides convenient methods for creating scoped rate limits.
 *
 * @example
 * ```typescript
 * // Global limit: 10,000 requests per hour across all users
 * const global = RateLimitScopeFactory.global(10000, { hours: 1 });
 *
 * // Per-IP: 100 requests per minute per IP address
 * const perIp = RateLimitScopeFactory.perIP(100, { minutes: 1 });
 *
 * // Per-User: 5,000 requests per day per authenticated user
 * const perUser = RateLimitScopeFactory.perUser(5000, { days: 1 });
 *
 * // Per-API-Key: 1,000 requests per hour per API key
 * const perKey = RateLimitScopeFactory.perApiKey(1000, { hours: 1 });
 *
 * // Per-Operation: 10 requests per minute for a specific operation
 * const perOp = RateLimitScopeFactory.perOperation(10, { minutes: 1 });
 * ```
 */
class RateLimitScopeFactory {
    /**
     * Creates a global rate limit (applies to entire API)
     *
     * @param limit - Maximum number of requests
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static global(limit, period, strategy = 'fixed-window') {
        return {
            strategy,
            scope: 'global',
            limit,
            period,
            includeHeaders: true,
        };
    }
    /**
     * Creates a per-IP rate limit
     *
     * @param limit - Maximum number of requests per IP
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static perIP(limit, period, strategy = 'fixed-window') {
        return {
            strategy,
            scope: 'per-ip',
            limit,
            period,
            includeHeaders: true,
        };
    }
    /**
     * Creates a per-user rate limit
     *
     * @param limit - Maximum number of requests per authenticated user
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static perUser(limit, period, strategy = 'fixed-window') {
        return {
            strategy,
            scope: 'per-user',
            limit,
            period,
            includeHeaders: true,
        };
    }
    /**
     * Creates a per-API-key rate limit
     *
     * @param limit - Maximum number of requests per API key
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static perApiKey(limit, period, strategy = 'fixed-window') {
        return {
            strategy,
            scope: 'per-api-key',
            limit,
            period,
            includeHeaders: true,
        };
    }
    /**
     * Creates a per-operation rate limit
     *
     * @param limit - Maximum number of requests for this operation
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static perOperation(limit, period, strategy = 'fixed-window') {
        return {
            strategy,
            scope: 'per-operation',
            limit,
            period,
            includeHeaders: true,
        };
    }
    /**
     * Creates a per-tenant rate limit
     *
     * @param limit - Maximum number of requests per tenant
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static perTenant(limit, period, strategy = 'fixed-window') {
        return {
            strategy,
            scope: 'per-tenant',
            limit,
            period,
            includeHeaders: true,
        };
    }
}
exports.RateLimitScopeFactory = RateLimitScopeFactory;
/**
 * Rate limit header builder
 *
 * Generates standard rate limit headers for API responses.
 */
class RateLimitHeaderBuilder {
    /**
     * Creates rate limit headers
     *
     * @param metadata - Rate limit metadata
     * @returns Rate limit headers
     */
    static build(metadata) {
        const headers = {
            'X-RateLimit-Limit': {
                schema: {
                    type: 'integer',
                    description: 'Maximum number of requests allowed in the current window',
                },
                description: 'Request rate limit',
            },
            'X-RateLimit-Remaining': {
                schema: {
                    type: 'integer',
                    description: 'Number of requests remaining in the current window',
                },
                description: 'Remaining requests in current window',
            },
            'X-RateLimit-Reset': {
                schema: {
                    type: 'integer',
                    description: 'Unix timestamp when the rate limit resets',
                },
                description: 'Time when rate limit resets (Unix timestamp)',
            },
        };
        if (metadata.retryAfter !== undefined) {
            headers['Retry-After'] = {
                schema: {
                    type: 'integer',
                    description: 'Number of seconds to wait before retrying',
                },
                description: 'Seconds until retry allowed',
            };
        }
        return headers;
    }
    /**
     * Creates headers for successful responses
     *
     * @param limit - Maximum requests allowed
     * @param remaining - Requests remaining
     * @param reset - Reset timestamp
     * @returns Header definitions
     */
    static success(limit, remaining, reset) {
        return {
            'X-RateLimit-Limit': {
                schema: { type: 'integer' },
                description: 'Request rate limit',
            },
            'X-RateLimit-Remaining': {
                schema: { type: 'integer' },
                description: 'Remaining requests',
            },
            'X-RateLimit-Reset': {
                schema: { type: 'integer' },
                description: 'Reset timestamp',
            },
        };
    }
    /**
     * Creates headers for 429 Too Many Requests responses
     *
     * @param retryAfter - Seconds until retry allowed
     * @param limit - Maximum requests allowed
     * @param reset - Reset timestamp
     * @returns Header definitions
     */
    static tooManyRequests(retryAfter, limit, reset) {
        return {
            'X-RateLimit-Limit': {
                schema: { type: 'integer' },
                description: 'Request rate limit',
            },
            'X-RateLimit-Remaining': {
                schema: { type: 'integer' },
                description: 'Remaining requests (0)',
            },
            'X-RateLimit-Reset': {
                schema: { type: 'integer' },
                description: 'Reset timestamp',
            },
            'Retry-After': {
                schema: { type: 'integer' },
                description: 'Seconds until retry allowed',
                required: true,
            },
        };
    }
}
exports.RateLimitHeaderBuilder = RateLimitHeaderBuilder;
/**
 * 429 Too Many Requests response builder
 */
class RateLimitResponse {
    /**
     * Creates a 429 Too Many Requests response schema
     *
     * @param config - Rate limit configuration
     * @returns Response schema for 429 status
     */
    static tooManyRequests(config) {
        const periodSeconds = this.durationToSeconds(config.period);
        const retryAfter = Math.ceil(periodSeconds);
        return {
            description: 'Rate limit exceeded',
            headers: RateLimitHeaderBuilder.tooManyRequests(retryAfter, config.limit, Date.now() + retryAfter * 1000),
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        required: ['type', 'title', 'status', 'detail', 'retryAfter', 'limit', 'scope'],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['https://httpstatuses.com/429'],
                                description: 'URI reference identifying the problem type',
                            },
                            title: {
                                type: 'string',
                                enum: ['Rate Limit Exceeded'],
                                description: 'Short, human-readable summary',
                            },
                            status: {
                                type: 'integer',
                                enum: [429],
                                description: 'HTTP status code',
                            },
                            detail: {
                                type: 'string',
                                description: 'Human-readable explanation',
                                example: `Rate limit of ${config.limit} requests per ${this.formatDuration(config.period)} exceeded`,
                            },
                            retryAfter: {
                                type: 'integer',
                                description: 'Seconds until retry allowed',
                                example: retryAfter,
                            },
                            limit: {
                                type: 'integer',
                                description: 'Maximum requests allowed',
                                example: config.limit,
                            },
                            scope: {
                                type: 'string',
                                description: 'Scope of the rate limit',
                                example: config.scope,
                            },
                        },
                    },
                },
            },
        };
    }
    /**
     * Converts duration to seconds
     */
    static durationToSeconds(duration) {
        let seconds = 0;
        if (duration.seconds)
            seconds += duration.seconds;
        if (duration.minutes)
            seconds += duration.minutes * 60;
        if (duration.hours)
            seconds += duration.hours * 3600;
        if (duration.days)
            seconds += duration.days * 86400;
        return seconds;
    }
    /**
     * Formats duration for human-readable messages
     */
    static formatDuration(duration) {
        if (duration.days)
            return `${duration.days} day${duration.days > 1 ? 's' : ''}`;
        if (duration.hours)
            return `${duration.hours} hour${duration.hours > 1 ? 's' : ''}`;
        if (duration.minutes)
            return `${duration.minutes} minute${duration.minutes > 1 ? 's' : ''}`;
        if (duration.seconds)
            return `${duration.seconds} second${duration.seconds > 1 ? 's' : ''}`;
        return 'unknown period';
    }
}
exports.RateLimitResponse = RateLimitResponse;
/**
 * Quota policy builder
 */
class QuotaPolicyBuilder {
    /**
     * Creates a daily quota policy
     *
     * @param dailyLimit - Maximum requests per day
     * @param resetTime - Time of day to reset (ISO 8601 format)
     * @returns Quota policy
     */
    static daily(dailyLimit, resetTime = '00:00:00Z') {
        return {
            dailyLimit,
            resetTime,
            carryOverUnused: false,
        };
    }
    /**
     * Creates a monthly quota policy
     *
     * @param monthlyLimit - Maximum requests per month
     * @param carryOverUnused - Whether to carry over unused quota
     * @returns Quota policy
     */
    static monthly(monthlyLimit, carryOverUnused = false) {
        return {
            monthlyLimit,
            carryOverUnused,
        };
    }
    /**
     * Creates a combined daily and monthly quota policy
     *
     * @param dailyLimit - Maximum requests per day
     * @param monthlyLimit - Maximum requests per month
     * @returns Quota policy
     */
    static combined(dailyLimit, monthlyLimit) {
        return {
            dailyLimit,
            monthlyLimit,
            resetTime: '00:00:00Z',
            carryOverUnused: false,
        };
    }
}
exports.QuotaPolicyBuilder = QuotaPolicyBuilder;
/**
 * Rate limit helper for adding rate limiting to operations
 */
class RateLimitHelper {
    /**
     * Adds rate limit headers to a response definition
     *
     * @param metadata - Rate limit metadata
     * @returns Header definitions
     */
    static addHeaders(metadata) {
        return RateLimitHeaderBuilder.build(metadata);
    }
    /**
     * Creates a complete rate limit configuration with burst support
     *
     * @param baseLimit - Base rate limit per period
     * @param burstLimit - Maximum burst size
     * @param period - Time period
     * @param scope - Rate limit scope
     * @returns Token bucket rate limit config
     */
    static withBurst(baseLimit, burstLimit, period, scope = 'per-user') {
        return RateLimiter.tokenBucket({
            bucketSize: burstLimit,
            refillRate: baseLimit,
            limit: baseLimit,
            period,
            scope,
        });
    }
    /**
     * Creates a tiered rate limit (different limits for different tiers)
     *
     * @param tier - Service tier name
     * @param limits - Limits per tier
     * @param period - Time period
     * @returns Rate limit configuration
     */
    static tiered(tier, limits, period) {
        const limit = limits[tier] || limits['free'] || 100;
        return {
            strategy: 'sliding-window',
            scope: 'per-user',
            limit,
            period,
            includeHeaders: true,
        };
    }
    /**
     * Combines multiple rate limit configurations (applies all)
     *
     * @param configs - Rate limit configurations to combine
     * @returns Combined configuration
     */
    static combine(...configs) {
        return configs;
    }
    /**
     * Calculates reset timestamp for a given period
     *
     * @param period - Duration period
     * @param from - Starting timestamp (default: now)
     * @returns Unix timestamp when the period resets
     */
    static calculateResetTime(period, from = Date.now()) {
        const periodMs = this.durationToMilliseconds(period);
        return from + periodMs;
    }
    /**
     * Converts duration to milliseconds
     */
    static durationToMilliseconds(duration) {
        let ms = 0;
        if (duration.seconds)
            ms += duration.seconds * 1000;
        if (duration.minutes)
            ms += duration.minutes * 60000;
        if (duration.hours)
            ms += duration.hours * 3600000;
        if (duration.days)
            ms += duration.days * 86400000;
        return ms;
    }
}
exports.RateLimitHelper = RateLimitHelper;
