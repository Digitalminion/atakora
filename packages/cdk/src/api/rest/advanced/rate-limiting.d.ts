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
import type { HeaderDefinition, ResponseSchema } from '../operation';
/**
 * Rate limiting strategy types
 */
export type RateLimitStrategy = 'fixed-window' | 'sliding-window' | 'token-bucket' | 'leaky-bucket';
/**
 * Rate limit scope types
 */
export type RateLimitScope = 'global' | 'per-ip' | 'per-user' | 'per-api-key' | 'per-operation' | 'per-tenant';
/**
 * Time period for rate limits
 */
export interface Duration {
    readonly seconds?: number;
    readonly minutes?: number;
    readonly hours?: number;
    readonly days?: number;
}
/**
 * Base rate limit configuration
 */
export interface RateLimitConfig {
    readonly strategy: RateLimitStrategy;
    readonly scope: RateLimitScope;
    readonly limit: number;
    readonly period: Duration;
    readonly includeHeaders?: boolean;
    readonly burstLimit?: number;
    readonly quotaPolicy?: QuotaPolicy;
}
/**
 * Fixed window rate limit configuration
 */
export interface FixedWindowConfig extends RateLimitConfig {
    readonly strategy: 'fixed-window';
}
/**
 * Sliding window rate limit configuration
 */
export interface SlidingWindowConfig extends RateLimitConfig {
    readonly strategy: 'sliding-window';
    readonly windowSize?: number;
}
/**
 * Token bucket rate limit configuration
 */
export interface TokenBucketConfig extends RateLimitConfig {
    readonly strategy: 'token-bucket';
    readonly bucketSize: number;
    readonly refillRate: number;
}
/**
 * Leaky bucket rate limit configuration
 */
export interface LeakyBucketConfig extends RateLimitConfig {
    readonly strategy: 'leaky-bucket';
    readonly bucketSize: number;
    readonly leakRate: number;
}
/**
 * Quota policy configuration
 */
export interface QuotaPolicy {
    readonly dailyLimit?: number;
    readonly monthlyLimit?: number;
    readonly resetTime?: string;
    readonly carryOverUnused?: boolean;
}
/**
 * Rate limit headers following IETF draft standard
 *
 * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
 */
export interface RateLimitHeaders {
    /**
     * Maximum number of requests allowed in the current window
     */
    readonly 'X-RateLimit-Limit': number;
    /**
     * Number of requests remaining in the current window
     */
    readonly 'X-RateLimit-Remaining': number;
    /**
     * Unix timestamp when the rate limit window resets
     */
    readonly 'X-RateLimit-Reset': number;
    /**
     * Seconds until retry (present in 429 responses)
     */
    readonly 'Retry-After'?: number;
    /**
     * Optional: Time window in seconds
     */
    readonly 'X-RateLimit-Window'?: number;
    /**
     * Optional: Current usage as percentage
     */
    readonly 'X-RateLimit-Used'?: number;
}
/**
 * Rate limit metadata for response generation
 */
export interface RateLimitMetadata {
    readonly limit: number;
    readonly remaining: number;
    readonly reset: number;
    readonly retryAfter?: number;
    readonly scope: RateLimitScope;
    readonly strategy: RateLimitStrategy;
}
/**
 * Rate limit exceeded response
 */
export interface RateLimitExceededResponse {
    readonly type: 'https://httpstatuses.com/429';
    readonly title: 'Rate Limit Exceeded';
    readonly status: 429;
    readonly detail: string;
    readonly retryAfter: number;
    readonly limit: number;
    readonly scope: string;
}
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
export declare class RateLimiter {
    /**
     * Creates a fixed window rate limiter
     *
     * Simple algorithm that resets the counter at fixed intervals.
     * Easy to implement but can allow bursts at window boundaries.
     *
     * @param config - Fixed window configuration
     * @returns Rate limit configuration
     */
    static fixedWindow(config: Omit<FixedWindowConfig, 'strategy'>): FixedWindowConfig;
    /**
     * Creates a sliding window rate limiter
     *
     * More accurate than fixed window, smooths out bursts by using
     * overlapping time windows.
     *
     * @param config - Sliding window configuration
     * @returns Rate limit configuration
     */
    static slidingWindow(config: Omit<SlidingWindowConfig, 'strategy'>): SlidingWindowConfig;
    /**
     * Creates a token bucket rate limiter
     *
     * Allows bursts up to bucket size while maintaining average rate.
     * Good for APIs that need to handle occasional spikes.
     *
     * @param config - Token bucket configuration
     * @returns Rate limit configuration
     */
    static tokenBucket(config: Omit<TokenBucketConfig, 'strategy'>): TokenBucketConfig;
    /**
     * Creates a leaky bucket rate limiter
     *
     * Processes requests at a constant rate, queuing excess requests.
     * Smooths out traffic spikes.
     *
     * @param config - Leaky bucket configuration
     * @returns Rate limit configuration
     */
    static leakyBucket(config: Omit<LeakyBucketConfig, 'strategy'>): LeakyBucketConfig;
}
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
export declare class RateLimitScopeFactory {
    /**
     * Creates a global rate limit (applies to entire API)
     *
     * @param limit - Maximum number of requests
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static global(limit: number, period: Duration, strategy?: RateLimitStrategy): RateLimitConfig;
    /**
     * Creates a per-IP rate limit
     *
     * @param limit - Maximum number of requests per IP
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static perIP(limit: number, period: Duration, strategy?: RateLimitStrategy): RateLimitConfig;
    /**
     * Creates a per-user rate limit
     *
     * @param limit - Maximum number of requests per authenticated user
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static perUser(limit: number, period: Duration, strategy?: RateLimitStrategy): RateLimitConfig;
    /**
     * Creates a per-API-key rate limit
     *
     * @param limit - Maximum number of requests per API key
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static perApiKey(limit: number, period: Duration, strategy?: RateLimitStrategy): RateLimitConfig;
    /**
     * Creates a per-operation rate limit
     *
     * @param limit - Maximum number of requests for this operation
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static perOperation(limit: number, period: Duration, strategy?: RateLimitStrategy): RateLimitConfig;
    /**
     * Creates a per-tenant rate limit
     *
     * @param limit - Maximum number of requests per tenant
     * @param period - Time period for the limit
     * @param strategy - Rate limiting strategy (default: fixed-window)
     * @returns Rate limit configuration
     */
    static perTenant(limit: number, period: Duration, strategy?: RateLimitStrategy): RateLimitConfig;
}
/**
 * Rate limit header builder
 *
 * Generates standard rate limit headers for API responses.
 */
export declare class RateLimitHeaderBuilder {
    /**
     * Creates rate limit headers
     *
     * @param metadata - Rate limit metadata
     * @returns Rate limit headers
     */
    static build(metadata: RateLimitMetadata): Record<string, HeaderDefinition>;
    /**
     * Creates headers for successful responses
     *
     * @param limit - Maximum requests allowed
     * @param remaining - Requests remaining
     * @param reset - Reset timestamp
     * @returns Header definitions
     */
    static success(limit: number, remaining: number, reset: number): Record<string, HeaderDefinition>;
    /**
     * Creates headers for 429 Too Many Requests responses
     *
     * @param retryAfter - Seconds until retry allowed
     * @param limit - Maximum requests allowed
     * @param reset - Reset timestamp
     * @returns Header definitions
     */
    static tooManyRequests(retryAfter: number, limit: number, reset: number): Record<string, HeaderDefinition>;
}
/**
 * 429 Too Many Requests response builder
 */
export declare class RateLimitResponse {
    /**
     * Creates a 429 Too Many Requests response schema
     *
     * @param config - Rate limit configuration
     * @returns Response schema for 429 status
     */
    static tooManyRequests(config: RateLimitConfig): ResponseSchema<RateLimitExceededResponse>;
    /**
     * Converts duration to seconds
     */
    private static durationToSeconds;
    /**
     * Formats duration for human-readable messages
     */
    private static formatDuration;
}
/**
 * Quota policy builder
 */
export declare class QuotaPolicyBuilder {
    /**
     * Creates a daily quota policy
     *
     * @param dailyLimit - Maximum requests per day
     * @param resetTime - Time of day to reset (ISO 8601 format)
     * @returns Quota policy
     */
    static daily(dailyLimit: number, resetTime?: string): QuotaPolicy;
    /**
     * Creates a monthly quota policy
     *
     * @param monthlyLimit - Maximum requests per month
     * @param carryOverUnused - Whether to carry over unused quota
     * @returns Quota policy
     */
    static monthly(monthlyLimit: number, carryOverUnused?: boolean): QuotaPolicy;
    /**
     * Creates a combined daily and monthly quota policy
     *
     * @param dailyLimit - Maximum requests per day
     * @param monthlyLimit - Maximum requests per month
     * @returns Quota policy
     */
    static combined(dailyLimit: number, monthlyLimit: number): QuotaPolicy;
}
/**
 * Rate limit helper for adding rate limiting to operations
 */
export declare class RateLimitHelper {
    /**
     * Adds rate limit headers to a response definition
     *
     * @param metadata - Rate limit metadata
     * @returns Header definitions
     */
    static addHeaders(metadata: RateLimitMetadata): Record<string, HeaderDefinition>;
    /**
     * Creates a complete rate limit configuration with burst support
     *
     * @param baseLimit - Base rate limit per period
     * @param burstLimit - Maximum burst size
     * @param period - Time period
     * @param scope - Rate limit scope
     * @returns Token bucket rate limit config
     */
    static withBurst(baseLimit: number, burstLimit: number, period: Duration, scope?: RateLimitScope): TokenBucketConfig;
    /**
     * Creates a tiered rate limit (different limits for different tiers)
     *
     * @param tier - Service tier name
     * @param limits - Limits per tier
     * @param period - Time period
     * @returns Rate limit configuration
     */
    static tiered(tier: 'free' | 'basic' | 'premium' | 'enterprise', limits: Record<string, number>, period: Duration): RateLimitConfig;
    /**
     * Combines multiple rate limit configurations (applies all)
     *
     * @param configs - Rate limit configurations to combine
     * @returns Combined configuration
     */
    static combine(...configs: RateLimitConfig[]): readonly RateLimitConfig[];
    /**
     * Calculates reset timestamp for a given period
     *
     * @param period - Duration period
     * @param from - Starting timestamp (default: now)
     * @returns Unix timestamp when the period resets
     */
    static calculateResetTime(period: Duration, from?: number): number;
    /**
     * Converts duration to milliseconds
     */
    private static durationToMilliseconds;
}
//# sourceMappingURL=rate-limiting.d.ts.map