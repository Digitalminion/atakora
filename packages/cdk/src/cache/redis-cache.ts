/**
 * L2 construct for Azure Cache for Redis with intent-based API.
 *
 * @remarks
 * Higher-level construct with sensible defaults for Azure Cache for Redis.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { constructIdToPurpose, IGrantable, IGrantResult } from '@atakora/lib';
import { ArmRedisCache } from './redis-cache-arm';
import type {
  RedisCacheProps,
  IRedisCache,
} from './redis-cache-types';
import {
  RedisCacheSku,
  SkuFamily,
  TlsVersion,
  PublicNetworkAccess,
} from './redis-cache-types';

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
export class RedisCache extends Construct implements IRedisCache {
  /**
   * Counter for generating unique grant IDs
   */
  private grantCounter = 0;

  private readonly armCache: ArmRedisCache;

  /**
   * Cache name.
   */
  public readonly cacheName: string;

  /**
   * Location.
   */
  public readonly location: string;

  /**
   * Resource ID of the cache.
   */
  public readonly cacheId: string;

  /**
   * Hostname.
   */
  public readonly hostName: string;

  /**
   * SSL port.
   */
  public readonly sslPort: number = 6380;

  /**
   * Non-SSL port.
   */
  public readonly port: number = 6379;

  /**
   * Primary key (ARM expression).
   */
  public readonly primaryKey: string;

  /**
   * Secondary key (ARM expression).
   */
  public readonly secondaryKey: string;

  constructor(scope: Construct, id: string, props: RedisCacheProps = {}) {
    super(scope, id);

    // Resolve cache name (auto-generate if not provided)
    this.cacheName = props.cacheName ?? this.generateCacheName(id);

    // Resolve location (inherit from parent if not specified)
    this.location = this.resolveLocation(props.location);

    // Determine SKU configuration
    const sku = props.sku ?? RedisCacheSku.STANDARD;
    const capacity = props.capacity ?? this.getDefaultCapacity(sku);
    const family = sku === RedisCacheSku.PREMIUM ? SkuFamily.P : SkuFamily.C;

    // Build zones array if zone redundancy enabled
    const zones = props.enableZoneRedundancy ? ['1', '2', '3'] : undefined;

    // Create underlying L1 construct
    this.armCache = new ArmRedisCache(scope, `${id}-Resource`, {
      cacheName: this.cacheName,
      location: this.location,
      sku: {
        name: sku,
        family,
        capacity,
      },
      enableNonSslPort: props.enableNonSslPort ?? false,
      minimumTlsVersion: props.minimumTlsVersion ?? TlsVersion.TLS1_2,
      redisConfiguration: props.redisConfiguration,
      shardCount: props.shardCount,
      subnetId: props.subnetId,
      staticIP: props.staticIP,
      publicNetworkAccess: props.publicNetworkAccess ?? PublicNetworkAccess.DISABLED,
      zones,
      tags: props.tags,
    });

    // Expose properties
    this.cacheId = this.armCache.cacheId;
    this.hostName = this.armCache.hostName;
    this.primaryKey = this.armCache.primaryKey;
    this.secondaryKey = this.armCache.secondaryKey;
  }

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
  private generateCacheName(id: string): string {
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = constructIdToPurpose(id, 'redis', ['cache']) || id.toLowerCase();
      const project = subscriptionStack.project.resourceName;
      const instance = subscriptionStack.instance.resourceName;
      const hash = subscriptionStack.namingService.getResourceHash(6);

      const generatedName = `redis-${project}-${purpose}-${instance}-${hash}`;

      // Ensure it fits within 63 characters
      if (generatedName.length > 63) {
        const maxPurposeLen = 63 - (6 + project.length + instance.length + hash.length + 4);
        const truncatedPurpose = purpose.substring(0, maxPurposeLen);
        return `redis-${project}-${truncatedPurpose}-${instance}-${hash}`.substring(0, 63);
      }

      return generatedName;
    }

    // Fallback
    let fallbackName = `redis-${id.toLowerCase()}`;
    fallbackName = fallbackName.substring(0, 63);

    if (fallbackName.endsWith('-')) {
      fallbackName = fallbackName.substring(0, 62);
    }

    return fallbackName;
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Resolves the location from props or parent scope.
   */
  private resolveLocation(location?: string): string {
    if (location) {
      return location;
    }

    // Try to inherit from parent
    const parentStack = this.node.scopes.find((s: any) => s.location);
    if (parentStack && (parentStack as any).location) {
      return (parentStack as any).location;
    }

    throw new Error('Location must be provided either in props or inherited from parent');
  }

  /**
   * Gets the default capacity for a SKU.
   */
  private getDefaultCapacity(sku: RedisCacheSku): number {
    if (sku === RedisCacheSku.PREMIUM) {
      return 1; // P1
    }
    return 1; // C1 for Basic/Standard
  }

  /**
   * Import an existing Redis cache by its resource ID.
   *
   * @param scope - The parent construct
   * @param id - The construct ID
   * @param cacheId - The full resource ID of the cache
   * @returns An IRedisCache reference
   */
  public static fromCacheId(scope: Construct, id: string, cacheId: string): IRedisCache {
    class Import extends Construct implements IRedisCache {
      public readonly cacheId = cacheId;
      public readonly cacheName: string;
      public readonly location: string;
      public readonly hostName: string;
      public readonly sslPort = 6380;
      public readonly port = 6379;

      constructor() {
        super(scope, id);

        // Parse cache name from resource ID
        const match = cacheId.match(/\/redis\/([^/]+)$/);
        if (!match) {
          throw new Error(
            `Invalid Redis cache resource ID: ${cacheId}. ` +
              `Expected format: .../Microsoft.Cache/redis/{cacheName}`
          );
        }
        this.cacheName = match[1];
        this.location = 'unknown';
        this.hostName = `${this.cacheName}.redis.cache.windows.net`;
      }
    }

    return new Import();
  }

  // ============================================================
  // Connection String Methods
  // ============================================================

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
  public getConnectionString(): string {
    return `[concat('${this.hostName}:${this.sslPort},password=', listKeys(resourceId('Microsoft.Cache/redis', '${this.cacheName}'), '${this.armCache.apiVersion}').primaryKey, ',ssl=True,abortConnect=False')]`;
  }

  /**
   * Get the primary access key.
   *
   * @returns ARM expression for primary key
   */
  public getPrimaryKey(): string {
    return this.primaryKey;
  }

  /**
   * Get the secondary access key.
   *
   * @returns ARM expression for secondary key
   */
  public getSecondaryKey(): string {
    return this.secondaryKey;
  }

  // ============================================================
  // Grant Methods
  // ============================================================

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
  public grantAccess(grantable: IGrantable): IGrantResult {
    // Redis Cache Contributor role
    const roleDefinitionId =
      '/providers/Microsoft.Authorization/roleDefinitions/e0f68234-74aa-48ed-b826-c38b57376e17';

    return this.grant(grantable, roleDefinitionId, `Access to cache ${this.cacheName}`);
  }

  /**
   * Internal helper to create role assignments for grant methods.
   */
  protected grant(
    grantable: IGrantable,
    roleDefinitionId: string,
    description?: string
  ): IGrantResult {
    const RoleAssignment = require('@atakora/lib/authorization').RoleAssignment;
    const GrantResult = require('@atakora/lib/authorization').GrantResult;

    const roleAssignment = new RoleAssignment(this, `Grant${this.grantCounter++}`, {
      scope: this.cacheId,
      roleDefinitionId,
      principalId: grantable.principalId,
      principalType: grantable.principalType,
      tenantId: grantable.tenantId,
      description,
    });

    return new GrantResult(roleAssignment, roleDefinitionId, grantable, this.cacheId);
  }
}
