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
import type {
  ArmRedisCacheProps,
  IRedisCache,
} from './redis-cache-types';
import { RedisCacheSku, SkuFamily } from './redis-cache-types';

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
export class ArmRedisCache extends Resource implements IRedisCache {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Cache/redis';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-03-01';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Cache name.
   */
  public readonly cacheName: string;

  /**
   * Resource name (same as cacheName).
   */
  public readonly name: string;

  /**
   * Location.
   */
  public readonly location: string;

  /**
   * SKU configuration.
   */
  private readonly sku: any;

  /**
   * Enable non-SSL port.
   */
  private readonly enableNonSslPort?: boolean;

  /**
   * Minimum TLS version.
   */
  private readonly minimumTlsVersion?: string;

  /**
   * Redis configuration.
   */
  private readonly redisConfiguration?: any;

  /**
   * Shard count.
   */
  private readonly shardCount?: number;

  /**
   * Subnet ID.
   */
  private readonly subnetId?: string;

  /**
   * Static IP.
   */
  private readonly staticIP?: string;

  /**
   * Public network access.
   */
  private readonly publicNetworkAccess?: string;

  /**
   * Redis version.
   */
  private readonly redisVersion?: string;

  /**
   * Zones.
   */
  private readonly zones?: string[];

  /**
   * Tags.
   */
  private readonly resourceTags?: Record<string, string>;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * Cache ID (alias for resourceId).
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
   * Primary key.
   */
  public readonly primaryKey: string;

  /**
   * Secondary key.
   */
  public readonly secondaryKey: string;

  constructor(scope: Construct, id: string, props: ArmRedisCacheProps) {
    super(scope, id);

    this.validateProps(props);

    this.cacheName = props.cacheName;
    this.name = props.cacheName;
    this.location = props.location;
    this.sku = props.sku;
    this.enableNonSslPort = props.enableNonSslPort;
    this.minimumTlsVersion = props.minimumTlsVersion;
    this.redisConfiguration = props.redisConfiguration;
    this.shardCount = props.shardCount;
    this.subnetId = props.subnetId;
    this.staticIP = props.staticIP;
    this.publicNetworkAccess = props.publicNetworkAccess;
    this.redisVersion = props.redisVersion;
    this.zones = props.zones;
    this.resourceTags = props.tags;

    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Cache/redis/${this.cacheName}`;
    this.cacheId = this.resourceId;
    this.hostName = `${this.cacheName}.redis.cache.windows.net`;

    // Set up ARM expressions for keys
    this.primaryKey = `[listKeys(resourceId('Microsoft.Cache/redis', '${this.cacheName}'), '${this.apiVersion}').primaryKey]`;
    this.secondaryKey = `[listKeys(resourceId('Microsoft.Cache/redis', '${this.cacheName}'), '${this.apiVersion}').secondaryKey]`;
  }

  protected validateProps(props: ArmRedisCacheProps): void {
    if (!props.cacheName || props.cacheName.trim() === '') {
      throw new Error('Cache name cannot be empty');
    }

    if (props.cacheName.length < 1 || props.cacheName.length > 63) {
      throw new Error('Cache name must be between 1 and 63 characters');
    }

    // Validate name pattern
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(props.cacheName)) {
      throw new Error(
        'Cache name must contain only lowercase letters, numbers, and hyphens, and cannot start or end with hyphen'
      );
    }

    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate SKU
    if (!props.sku) {
      throw new Error('SKU must be provided');
    }

    // Validate capacity
    if (props.sku.name === RedisCacheSku.BASIC || props.sku.name === RedisCacheSku.STANDARD) {
      if (props.sku.capacity < 0 || props.sku.capacity > 6) {
        throw new Error('Basic/Standard SKU capacity must be 0-6');
      }
      if (props.sku.family !== SkuFamily.C) {
        throw new Error('Basic/Standard SKU must use family C');
      }
    } else if (props.sku.name === RedisCacheSku.PREMIUM) {
      if (props.sku.capacity < 1 || props.sku.capacity > 4) {
        throw new Error('Premium SKU capacity must be 1-4');
      }
      if (props.sku.family !== SkuFamily.P) {
        throw new Error('Premium SKU must use family P');
      }
    }

    // Validate Premium-only features
    if (props.sku.name !== RedisCacheSku.PREMIUM) {
      if (props.shardCount) {
        throw new Error('Clustering (shardCount) is only available in Premium SKU');
      }
      if (props.subnetId) {
        throw new Error('VNet injection is only available in Premium SKU');
      }
    }

    // Validate shard count
    if (props.shardCount && (props.shardCount < 1 || props.shardCount > 10)) {
      throw new Error('Shard count must be between 1 and 10');
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: any = {
      sku: this.sku,
    };

    if (this.enableNonSslPort !== undefined) {
      properties.enableNonSslPort = this.enableNonSslPort;
    }

    if (this.minimumTlsVersion) {
      properties.minimumTlsVersion = this.minimumTlsVersion;
    }

    if (this.redisConfiguration) {
      properties.redisConfiguration = this.redisConfiguration;
    }

    if (this.shardCount !== undefined) {
      properties.shardCount = this.shardCount;
    }

    if (this.subnetId) {
      properties.subnetId = this.subnetId;
    }

    if (this.staticIP) {
      properties.staticIP = this.staticIP;
    }

    if (this.publicNetworkAccess) {
      properties.publicNetworkAccess = this.publicNetworkAccess;
    }

    if (this.redisVersion) {
      properties.redisVersion = this.redisVersion;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.cacheName,
      location: this.location,
      properties,
      ...(this.zones && this.zones.length > 0 && { zones: this.zones }),
      ...(this.resourceTags && Object.keys(this.resourceTags).length > 0 && { tags: this.resourceTags }),
    } as ArmResource;
  }
}
