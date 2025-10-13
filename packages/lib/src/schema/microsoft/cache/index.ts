/**
 * Azure Cache for Redis schema module (Microsoft.Cache).
 *
 * @remarks
 * Type definitions and enums for Azure Cache for Redis resources.
 *
 * @packageDocumentation
 */

// Export all enums
export {
  RedisCacheSku,
  SkuFamily,
  TlsVersion,
  PublicNetworkAccess,
} from './enums';

// Export all types
export type {
  Sku,
  RedisConfiguration,
  ManagedServiceIdentity,
  UserAssignedIdentity,
  PrivateEndpointConnection,
  RedisCacheProperties,
  RedisCache,
  RedisFirewallRule,
  RedisPatchSchedule,
  ScheduleEntry,
  RedisLinkedServer,
} from './types';
