/**
 * Enums for Azure Cache for Redis (Microsoft.Cache).
 *
 * @remarks
 * Curated enums extracted from Microsoft.Cache Azure schema.
 *
 * **Resource Type**: Microsoft.Cache/redis
 * **API Version**: 2024-03-01
 *
 * @packageDocumentation
 */

/**
 * SKU name for Redis Cache.
 */
export enum RedisCacheSku {
  /**
   * Basic tier - single node, no SLA.
   */
  BASIC = 'Basic',

  /**
   * Standard tier - two nodes with replication.
   */
  STANDARD = 'Standard',

  /**
   * Premium tier - clustering, persistence, VNet support.
   */
  PREMIUM = 'Premium',
}

/**
 * SKU family.
 */
export enum SkuFamily {
  /**
   * C family (Basic/Standard).
   */
  C = 'C',

  /**
   * P family (Premium).
   */
  P = 'P',
}

/**
 * Minimum TLS version.
 */
export enum TlsVersion {
  TLS1_0 = '1.0',
  TLS1_1 = '1.1',
  TLS1_2 = '1.2',
}

/**
 * Public network access setting.
 */
export enum PublicNetworkAccess {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
}
