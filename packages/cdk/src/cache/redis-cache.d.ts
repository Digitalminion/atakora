/**
 * L2 construct for Azure Cache for Redis with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for Azure Cache for Redis.
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/cdk';
import { IGrantable, IGrantResult } from '@atakora/lib';
import type { RedisCacheProps, IRedisCache } from './redis-cache-types';
/**
 * L2 construct for Azure Cache for Redis.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Creates an Azure Cache for Redis instance.
 *
 * @example
 * **Minimal usage (Standard tier):**
 * ```typescript
 * const cache = new RedisCache(stack, 'Cache', {});
 * ```
 *
 * @example
 * **Basic tier for development:**
 * ```typescript
 * const cache = new RedisCache(stack, 'DevCache', {
 *   sku: RedisCacheSku.BASIC,
 *   capacity: 0 // C0 - smallest size
 * });
 * ```
 *
 * @example
 * **Premium tier with clustering:**
 * ```typescript
 * const cache = new RedisCache(stack, 'ProductionCache', {
 *   sku: RedisCacheSku.PREMIUM,
 *   capacity: 1, // P1
 *   shardCount: 3,
 *   enableZoneRedundancy: true,
 *   redisConfiguration: {
 *     maxmemoryPolicy: 'allkeys-lru',
 *     rdbBackupEnabled: true,
 *     rdbBackupFrequency: 60
 *   }
 * });
 * ```
 *
 * @example
 * **Premium tier with VNet injection:**
 * ```typescript
 * const cache = new RedisCache(stack, 'SecureCache', {
 *   sku: RedisCacheSku.PREMIUM,
 *   capacity: 1,
 *   subnetId: subnet.subnetId,
 *   publicNetworkAccess: PublicNetworkAccess.DISABLED
 * });
 * ```
 */
export declare class RedisCache extends Construct implements IRedisCache {
    /**
     * Counter for generating unique grant IDs
     */
    private grantCounter;
    private readonly armCache;
    /**
     * Cache name.
     */
    readonly cacheName: string;
    /**
     * Location.
     */
    readonly location: string;
    /**
     * Resource ID of the cache.
     */
    readonly cacheId: string;
    /**
     * Hostname.
     */
    readonly hostName: string;
    /**
     * SSL port.
     */
    readonly sslPort: number;
    /**
     * Non-SSL port.
     */
    readonly port: number;
    /**
     * Primary key (ARM expression).
     */
    readonly primaryKey: string;
    /**
     * Secondary key (ARM expression).
     */
    readonly secondaryKey: string;
    constructor(scope: Construct, id: string, props?: RedisCacheProps);
    /**
     * Generates a cache name from the construct ID.
     *
     * @remarks
     * Redis cache names have constraints:
     * - 1-63 characters
     * - Lowercase letters, numbers, and hyphens
     * - Cannot start or end with hyphen
     * - Globally unique across Azure
     */
    private generateCacheName;
    /**
     * Gets the SubscriptionStack from the construct tree.
     */
    private getSubscriptionStack;
    /**
     * Resolves the location from props or parent scope.
     */
    private resolveLocation;
    /**
     * Gets the default capacity for a SKU.
     */
    private getDefaultCapacity;
    /**
     * Import an existing Redis cache by its resource ID.
     *
     * @param scope - The parent construct
     * @param id - The construct ID
     * @param cacheId - The full resource ID of the cache
     * @returns An IRedisCache reference
     */
    static fromCacheId(scope: Construct, id: string, cacheId: string): IRedisCache;
    /**
     * Get the connection string for the Redis cache.
     *
     * @remarks
     * Returns an ARM expression that resolves to the connection string.
     *
     * @returns ARM expression for connection string
     *
     * @example
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'Api', {
     *   appSettings: {
     *     'RedisConnectionString': cache.getConnectionString()
     *   }
     * });
     * ```
     */
    getConnectionString(): string;
    /**
     * Get the primary access key.
     *
     * @returns ARM expression for primary key
     */
    getPrimaryKey(): string;
    /**
     * Get the secondary access key.
     *
     * @returns ARM expression for secondary key
     */
    getSecondaryKey(): string;
    /**
     * Grant access to the Redis cache.
     *
     * @remarks
     * Grants the Redis Cache Contributor role to the principal.
     * This allows reading connection strings and managing the cache.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'Api', {});
     * cache.grantAccess(functionApp);
     * ```
     */
    grantAccess(grantable: IGrantable): IGrantResult;
    /**
     * Internal helper to create role assignments for grant methods.
     */
    protected grant(grantable: IGrantable, roleDefinitionId: string, description?: string): IGrantResult;
}
//# sourceMappingURL=redis-cache.d.ts.map