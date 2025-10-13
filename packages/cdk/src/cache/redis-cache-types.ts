/**
 * Type definitions for Azure Cache for Redis constructs.
 *
 * @remarks
 * Types for Azure Cache for Redis (formerly Redis Cache).
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * SKU name for Redis Cache.
 */
export const RedisCacheSku = schema.cache.RedisCacheSku;
export type RedisCacheSku = typeof RedisCacheSku[keyof typeof RedisCacheSku];

/**
 * SKU family.
 */
export const SkuFamily = schema.cache.SkuFamily;
export type SkuFamily = typeof SkuFamily[keyof typeof SkuFamily];

/**
 * Minimum TLS version.
 */
export const TlsVersion = schema.cache.TlsVersion;
export type TlsVersion = typeof TlsVersion[keyof typeof TlsVersion];

/**
 * Public network access setting.
 */
export const PublicNetworkAccess = schema.cache.PublicNetworkAccess;
export type PublicNetworkAccess = typeof PublicNetworkAccess[keyof typeof PublicNetworkAccess];

/**
 * Redis configuration options.
 */
export interface RedisConfiguration {
  /**
   * Max memory policy.
   *
   * @remarks
   * Common values:
   * - volatile-lru: evict keys with expiration set using LRU
   * - allkeys-lru: evict any key using LRU
   * - volatile-random: evict random keys with expiration set
   * - allkeys-random: evict random keys
   * - volatile-ttl: evict keys with nearest expiration time
   * - noeviction: return errors when memory limit reached
   */
  readonly maxmemoryPolicy?: string;

  /**
   * Max memory delta (in MB).
   */
  readonly maxmemoryDelta?: number;

  /**
   * Max memory reserved (in MB).
   */
  readonly maxmemoryReserved?: number;

  /**
   * Max fragmentation memory reserved (in MB).
   */
  readonly maxfragmentationmemoryReserved?: number;

  /**
   * Enable RDB persistence (Premium only).
   */
  readonly rdbBackupEnabled?: boolean;

  /**
   * RDB backup frequency in minutes (Premium only).
   *
   * @remarks
   * Valid values: 15, 30, 60, 360, 720, 1440
   */
  readonly rdbBackupFrequency?: number;

  /**
   * Storage account connection string for RDB backups (Premium only).
   */
  readonly rdbStorageConnectionString?: string;

  /**
   * Enable AOF persistence (Premium only).
   */
  readonly aofBackupEnabled?: boolean;

  /**
   * Storage account connection string for AOF backups (Premium only).
   */
  readonly aofStorageConnectionString?: string;

  /**
   * Enable authentication.
   */
  readonly authnotrequired?: boolean;

  /**
   * Additional configuration settings.
   */
  readonly [key: string]: string | number | boolean | undefined;
}

/**
 * Firewall rule for Redis Cache.
 */
export interface FirewallRule {
  /**
   * Rule name.
   */
  readonly ruleName: string;

  /**
   * Start IP address.
   */
  readonly startIP: string;

  /**
   * End IP address.
   */
  readonly endIP: string;
}

/**
 * SKU configuration.
 */
export interface RedisCacheSkuConfig {
  /**
   * SKU name.
   */
  readonly name: RedisCacheSku;

  /**
   * SKU family.
   */
  readonly family: SkuFamily;

  /**
   * SKU capacity.
   *
   * @remarks
   * - Basic/Standard: 0-6 (C0-C6)
   * - Premium: 1-4 (P1-P4)
   */
  readonly capacity: number;
}

/**
 * Properties for ArmRedisCache (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Cache/redis ARM resource.
 *
 * ARM API Version: 2024-03-01
 */
export interface ArmRedisCacheProps {
  /**
   * Cache name.
   *
   * @remarks
   * Must be globally unique, 1-63 characters, lowercase letters, numbers, and hyphens.
   * Cannot start or end with hyphen.
   */
  readonly cacheName: string;

  /**
   * Azure region.
   */
  readonly location: string;

  /**
   * SKU configuration.
   */
  readonly sku: RedisCacheSkuConfig;

  /**
   * Enable non-SSL port (6379).
   *
   * @remarks
   * Defaults to false (disabled).
   */
  readonly enableNonSslPort?: boolean;

  /**
   * Minimum TLS version.
   */
  readonly minimumTlsVersion?: TlsVersion;

  /**
   * Redis configuration.
   */
  readonly redisConfiguration?: RedisConfiguration;

  /**
   * Number of shards for Premium tier clustering.
   *
   * @remarks
   * Only valid for Premium SKU.
   * Valid values: 1-10
   */
  readonly shardCount?: number;

  /**
   * Subnet resource ID for VNet injection (Premium only).
   */
  readonly subnetId?: string;

  /**
   * Static IP address (Premium VNet only).
   */
  readonly staticIP?: string;

  /**
   * Public network access setting.
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Redis version.
   *
   * @remarks
   * Defaults to latest stable version (currently 6).
   */
  readonly redisVersion?: string;

  /**
   * Zones for zone redundancy (Premium only).
   *
   * @remarks
   * Example: ['1', '2', '3']
   */
  readonly zones?: string[];

  /**
   * Tags to apply to the cache.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for RedisCache (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 */
export interface RedisCacheProps {
  /**
   * Cache name (optional - auto-generated if not provided).
   */
  readonly cacheName?: string;

  /**
   * Azure region (optional - inherits from parent if not specified).
   */
  readonly location?: string;

  /**
   * SKU name.
   *
   * @remarks
   * Defaults to Standard.
   */
  readonly sku?: RedisCacheSku;

  /**
   * SKU capacity.
   *
   * @remarks
   * - Basic/Standard: 0-6 (C0-C6), defaults to 1 (C1)
   * - Premium: 1-4 (P1-P4), defaults to 1 (P1)
   */
  readonly capacity?: number;

  /**
   * Enable non-SSL port (6379).
   *
   * @remarks
   * Defaults to false for security.
   */
  readonly enableNonSslPort?: boolean;

  /**
   * Minimum TLS version.
   *
   * @remarks
   * Defaults to TLS1_2.
   */
  readonly minimumTlsVersion?: TlsVersion;

  /**
   * Redis configuration options.
   */
  readonly redisConfiguration?: RedisConfiguration;

  /**
   * Number of shards for clustering (Premium only).
   *
   * @remarks
   * Valid values: 1-10
   * Only applies to Premium SKU.
   */
  readonly shardCount?: number;

  /**
   * Subnet for VNet injection (Premium only).
   */
  readonly subnetId?: string;

  /**
   * Static IP address (Premium VNet only).
   */
  readonly staticIP?: string;

  /**
   * Public network access setting.
   *
   * @remarks
   * Defaults to Disabled for security.
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Firewall rules.
   */
  readonly firewallRules?: FirewallRule[];

  /**
   * Enable zone redundancy (Premium only).
   *
   * @remarks
   * Distributes cache across availability zones.
   */
  readonly enableZoneRedundancy?: boolean;

  /**
   * Tags to apply to the cache.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Redis Cache reference.
 */
export interface IRedisCache {
  /**
   * Name of the Redis cache.
   */
  readonly cacheName: string;

  /**
   * Location of the cache.
   */
  readonly location: string;

  /**
   * Resource ID of the cache.
   */
  readonly cacheId: string;

  /**
   * Redis cache hostname.
   */
  readonly hostName: string;

  /**
   * SSL port (6380).
   */
  readonly sslPort: number;

  /**
   * Non-SSL port (6379).
   */
  readonly port: number;
}
