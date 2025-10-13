/**
 * L1 (ARM) construct for Azure Cache for Redis.
 *
 * @remarks
 * Direct ARM resource mapping for Microsoft.Cache/redis.
 *
 * @packageDocumentation
 */
import { Resource, Construct, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmRedisCacheProps, IRedisCache } from './redis-cache-types';
/**
 * L1 construct for Azure Cache for Redis.
 *
 * @remarks
 * Direct mapping to Microsoft.Cache/redis ARM resource.
 *
 * **ARM Resource Type**: `Microsoft.Cache/redis`
 * **API Version**: `2024-03-01`
 * **Deployment Scope**: ResourceGroup
 */
export declare class ArmRedisCache extends Resource implements IRedisCache {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Cache name.
     */
    readonly cacheName: string;
    /**
     * Resource name (same as cacheName).
     */
    readonly name: string;
    /**
     * Location.
     */
    readonly location: string;
    /**
     * SKU configuration.
     */
    private readonly sku;
    /**
     * Enable non-SSL port.
     */
    private readonly enableNonSslPort?;
    /**
     * Minimum TLS version.
     */
    private readonly minimumTlsVersion?;
    /**
     * Redis configuration.
     */
    private readonly redisConfiguration?;
    /**
     * Shard count.
     */
    private readonly shardCount?;
    /**
     * Subnet ID.
     */
    private readonly subnetId?;
    /**
     * Static IP.
     */
    private readonly staticIP?;
    /**
     * Public network access.
     */
    private readonly publicNetworkAccess?;
    /**
     * Redis version.
     */
    private readonly redisVersion?;
    /**
     * Zones.
     */
    private readonly zones?;
    /**
     * Tags.
     */
    private readonly resourceTags?;
    /**
     * ARM resource ID.
     */
    readonly resourceId: string;
    /**
     * Cache ID (alias for resourceId).
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
     * Primary key.
     */
    readonly primaryKey: string;
    /**
     * Secondary key.
     */
    readonly secondaryKey: string;
    constructor(scope: Construct, id: string, props: ArmRedisCacheProps);
    protected validateProps(props: ArmRedisCacheProps): void;
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=redis-cache-arm.d.ts.map