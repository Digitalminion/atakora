/**
 * Type definitions for Azure Cache for Redis (Microsoft.Cache).
 *
 * @remarks
 * Complete type definitions extracted from Microsoft.Cache Azure schema.
 *
 * **Resource Type**: Microsoft.Cache/redis
 * **API Version**: 2024-03-01
 *
 * @packageDocumentation
 */

import type {
  RedisCacheSku,
  SkuFamily,
  TlsVersion,
  PublicNetworkAccess,
} from './enums';

/**
 * SKU configuration for Redis Cache.
 *
 * @remarks
 * Defines the pricing tier, family, and capacity of the Redis cache instance.
 */
export interface Sku {
  /**
   * SKU name (pricing tier).
   *
   * Available options:
   * - Basic: Single node, no SLA, ideal for development/testing
   * - Standard: Two-node replication with 99.9% SLA
   * - Premium: Clustering, persistence, VNet support, 99.95% SLA
   *
   * @example 'Standard'
   */
  readonly name: RedisCacheSku;

  /**
   * SKU family.
   *
   * - C: Basic and Standard tiers
   * - P: Premium tier
   *
   * @example 'C'
   */
  readonly family: SkuFamily;

  /**
   * SKU capacity (cache size).
   *
   * Constraints:
   * - Basic/Standard (C family): 0-6 representing C0-C6
   *   - C0: 250 MB
   *   - C1: 1 GB
   *   - C2: 2.5 GB
   *   - C3: 6 GB
   *   - C4: 13 GB
   *   - C5: 26 GB
   *   - C6: 53 GB
   * - Premium (P family): 1-5 representing P1-P5
   *   - P1: 6 GB
   *   - P2: 13 GB
   *   - P3: 26 GB
   *   - P4: 53 GB
   *   - P5: 120 GB
   *
   * @example 1
   */
  readonly capacity: number;
}

/**
 * Redis configuration settings.
 *
 * @remarks
 * Advanced configuration options for Redis behavior, persistence, and memory management.
 */
export interface RedisConfiguration {
  /**
   * Enable AAD (Azure Active Directory) authentication.
   *
   * @remarks
   * When enabled, requires AAD token for authentication instead of access keys.
   * Available in Premium tier only.
   */
  readonly 'aad-enabled'?: string;

  /**
   * Enable AOF (Append-Only File) backup for data persistence.
   *
   * @remarks
   * Premium tier only. Provides better durability than RDB with potentially more frequent writes.
   */
  readonly 'aof-backup-enabled'?: string;

  /**
   * Storage account connection string for AOF backups.
   *
   * @remarks
   * Required when aof-backup-enabled is true.
   * Must be a valid Azure Storage connection string with write permissions.
   */
  readonly 'aof-storage-connection-string-0'?: string;

  /**
   * Secondary storage account connection string for AOF backups.
   *
   * @remarks
   * Optional secondary storage for geo-redundancy.
   */
  readonly 'aof-storage-connection-string-1'?: string;

  /**
   * Disable authentication requirement.
   *
   * @remarks
   * When set to 'true', allows connections without authentication.
   * Not recommended for production environments.
   *
   * Values: 'true' | 'false'
   */
  readonly authnotrequired?: string;

  /**
   * Max memory policy for eviction.
   *
   * @remarks
   * Determines which keys to evict when max memory is reached.
   *
   * Available policies:
   * - volatile-lru: Evict keys with expiration set using LRU algorithm
   * - allkeys-lru: Evict any key using LRU algorithm (recommended)
   * - volatile-lfu: Evict keys with expiration set using LFU algorithm
   * - allkeys-lfu: Evict any key using LFU algorithm
   * - volatile-random: Evict random keys with expiration set
   * - allkeys-random: Evict random keys
   * - volatile-ttl: Evict keys with nearest expiration time
   * - noeviction: Return errors when memory limit reached
   *
   * @example 'allkeys-lru'
   */
  readonly 'maxmemory-policy'?: string;

  /**
   * Max memory delta (in MB).
   *
   * @remarks
   * Additional memory reserved for non-cache usage during operations like
   * replication, backups, and failover. Recommended: 10-15% of cache size.
   *
   * Constraints:
   * - Minimum: 0
   * - Must be numeric value
   *
   * @example '100'
   */
  readonly 'maxmemory-delta'?: string;

  /**
   * Max memory reserved (in MB).
   *
   * @remarks
   * Memory reserved for non-cache operations. Helps prevent eviction during
   * high memory pressure scenarios.
   *
   * Constraints:
   * - Minimum: 0
   * - Must be numeric value
   *
   * @example '50'
   */
  readonly 'maxmemory-reserved'?: string;

  /**
   * Max fragmentation memory reserved (in MB).
   *
   * @remarks
   * Memory reserved to handle memory fragmentation. Helps maintain performance
   * during long-running operations.
   *
   * Constraints:
   * - Minimum: 0
   * - Must be numeric value
   *
   * @example '50'
   */
  readonly 'maxfragmentationmemory-reserved'?: string;

  /**
   * Keyspace notification events.
   *
   * @remarks
   * Enables Redis keyspace notifications for specific events.
   *
   * Event types:
   * - K: Keyspace events (published with __keyspace@<db>__ prefix)
   * - E: Keyevent events (published with __keyevent@<db>__ prefix)
   * - g: Generic commands (DEL, EXPIRE, RENAME, etc.)
   * - $: String commands
   * - l: List commands
   * - s: Set commands
   * - h: Hash commands
   * - z: Sorted set commands
   * - x: Expired events
   * - e: Evicted events
   * - A: Alias for g$lshzxe (all events)
   *
   * @example 'KEA' (enables all keyspace and keyevent notifications)
   */
  readonly 'notify-keyspace-events'?: string;

  /**
   * Preferred data persistence authentication method.
   *
   * @remarks
   * Specifies authentication method for persistence storage.
   *
   * Values:
   * - SAS: Shared Access Signature
   * - ManagedIdentity: Azure Managed Identity
   */
  readonly 'preferred-data-persistence-auth-method'?: string;

  /**
   * Enable RDB (Redis Database) backup for data persistence.
   *
   * @remarks
   * Premium tier only. Creates periodic snapshots of data.
   *
   * Values: 'true' | 'false'
   */
  readonly 'rdb-backup-enabled'?: string;

  /**
   * RDB backup frequency in minutes.
   *
   * @remarks
   * How often to create RDB snapshots.
   *
   * Constraints:
   * - Valid values: 15, 30, 60, 360, 720, 1440 (minutes)
   *
   * @example '60'
   */
  readonly 'rdb-backup-frequency'?: string;

  /**
   * Max clients allowed to connect concurrently.
   *
   * @remarks
   * Automatically calculated based on cache size, but can be overridden.
   *
   * @example '1000'
   */
  readonly 'rdb-backup-max-snapshot-count'?: string;

  /**
   * Storage account connection string for RDB backups.
   *
   * @remarks
   * Required when rdb-backup-enabled is true.
   * Must be a valid Azure Storage connection string with write permissions.
   */
  readonly 'rdb-storage-connection-string'?: string;

  /**
   * Storage account connection string for secondary RDB backups.
   *
   * @remarks
   * Optional secondary storage for geo-redundancy.
   */
  readonly 'rdb-storage-connection-string-1'?: string;

  /**
   * Enable zone redundancy awareness.
   *
   * @remarks
   * Premium tier only. Distributes cache nodes across availability zones.
   *
   * Values: 'true' | 'false'
   */
  readonly 'zonal-configuration'?: string;

  /**
   * Additional Redis configuration parameters.
   *
   * @remarks
   * Allows any other Redis configuration setting as string values.
   */
  readonly [key: string]: string | undefined;
}

/**
 * Managed identity configuration for Redis Cache.
 *
 * @remarks
 * Configures managed identities for accessing Azure resources without credentials.
 */
export interface ManagedServiceIdentity {
  /**
   * Identity type.
   *
   * Available types:
   * - None: No managed identity
   * - SystemAssigned: Azure-managed identity
   * - UserAssigned: User-created managed identity
   * - SystemAssigned,UserAssigned: Both types enabled
   *
   * @example 'SystemAssigned'
   */
  readonly type: 'None' | 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned';

  /**
   * User-assigned identities.
   *
   * @remarks
   * Map of user-assigned identity resource IDs to identity properties.
   * Required when type includes 'UserAssigned'.
   *
   * @example
   * {
   *   '/subscriptions/.../resourceGroups/.../providers/Microsoft.ManagedIdentity/userAssignedIdentities/myIdentity': {}
   * }
   */
  readonly userAssignedIdentities?: Record<string, UserAssignedIdentity>;
}

/**
 * User-assigned identity properties.
 */
export interface UserAssignedIdentity {
  /**
   * Client ID of the identity.
   *
   * @remarks
   * Read-only, populated by Azure after identity assignment.
   */
  readonly clientId?: string;

  /**
   * Principal ID of the identity.
   *
   * @remarks
   * Read-only, populated by Azure after identity assignment.
   */
  readonly principalId?: string;
}

/**
 * Private endpoint connection properties.
 *
 * @remarks
 * Represents a private endpoint connection to the Redis cache.
 */
export interface PrivateEndpointConnection {
  /**
   * Private endpoint resource ID.
   */
  readonly privateEndpoint?: {
    /**
     * Resource ID of the private endpoint.
     */
    readonly id?: string;
  };

  /**
   * Connection state.
   */
  readonly privateLinkServiceConnectionState: {
    /**
     * Connection status.
     *
     * Values: 'Pending' | 'Approved' | 'Rejected'
     */
    readonly status?: 'Pending' | 'Approved' | 'Rejected';

    /**
     * Description of the connection state.
     */
    readonly description?: string;

    /**
     * Actions required from the service consumer.
     */
    readonly actionsRequired?: string;
  };

  /**
   * Provisioning state.
   *
   * @remarks
   * Read-only.
   *
   * Values: 'Creating' | 'Updating' | 'Deleting' | 'Succeeded' | 'Failed'
   */
  readonly provisioningState?: string;
}

/**
 * Redis Cache instance properties.
 *
 * @remarks
 * Core properties for Microsoft.Cache/redis resource configuration.
 */
export interface RedisCacheProperties {
  /**
   * Redis configuration settings.
   *
   * @remarks
   * Advanced configuration for Redis behavior, memory management, and persistence.
   */
  readonly redisConfiguration?: RedisConfiguration;

  /**
   * Redis version.
   *
   * @remarks
   * Specify Redis version to use. Defaults to latest stable version.
   *
   * Constraints:
   * - Pattern: ^\d+(\.\d+)?$
   * - Supported versions: '4', '6', '7'
   *
   * @example '6'
   */
  readonly redisVersion?: string;

  /**
   * Enable non-SSL port (6379).
   *
   * @remarks
   * When true, allows unencrypted connections on port 6379.
   * When false (default), only SSL port 6380 is enabled.
   *
   * Security recommendation: Keep disabled in production environments.
   *
   * @example false
   */
  readonly enableNonSslPort?: boolean;

  /**
   * Number of replicas per primary node.
   *
   * @remarks
   * Premium tier only. Configures read replicas for high availability.
   *
   * Constraints:
   * - Minimum: 0
   * - Maximum: 3
   *
   * @example 1
   */
  readonly replicasPerPrimary?: number;

  /**
   * Number of replicas per master (deprecated - use replicasPerPrimary).
   *
   * @deprecated Use replicasPerPrimary instead
   */
  readonly replicasPerMaster?: number;

  /**
   * Number of shards for clustering.
   *
   * @remarks
   * Premium tier only. Enables Redis clustering for horizontal scaling.
   *
   * Constraints:
   * - Minimum: 1
   * - Maximum: 10
   *
   * @example 3
   */
  readonly shardCount?: number;

  /**
   * Subnet resource ID for VNet injection.
   *
   * @remarks
   * Premium tier only. Deploys cache into specified subnet.
   *
   * Constraints:
   * - Must be valid Azure subnet resource ID
   * - Subnet must be dedicated to Redis Cache
   * - Subnet must have sufficient IP addresses
   *
   * @example '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.Network/virtualNetworks/{vnet}/subnets/{subnet}'
   */
  readonly subnetId?: string;

  /**
   * Static IP address for VNet-injected cache.
   *
   * @remarks
   * Premium tier with VNet only. Must be within subnet range.
   *
   * Constraints:
   * - Must be valid IPv4 address
   * - Must be within subnet address space
   * - Must not be already allocated
   *
   * @example '10.0.0.4'
   */
  readonly staticIP?: string;

  /**
   * Minimum TLS version required for client connections.
   *
   * @remarks
   * Enforces minimum TLS version for security.
   *
   * Security recommendation: Use TLS 1.2 or higher in production.
   *
   * @example '1.2'
   */
  readonly minimumTlsVersion?: TlsVersion;

  /**
   * Public network access setting.
   *
   * @remarks
   * Controls whether cache is accessible from public internet.
   *
   * Security recommendation: Use 'Disabled' with private endpoints or VNet for production.
   *
   * @example 'Disabled'
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Update channel for Redis updates.
   *
   * @remarks
   * Controls when Redis updates are applied.
   *
   * Values:
   * - Stable: Production-ready releases
   * - Preview: Early access to new features
   */
  readonly updateChannel?: 'Stable' | 'Preview';

  /**
   * Disable access key authentication.
   *
   * @remarks
   * When true, requires Azure Active Directory authentication.
   * Access keys are disabled and cannot be regenerated.
   *
   * Requires:
   * - Premium tier
   * - AAD authentication enabled in redisConfiguration
   *
   * @example false
   */
  readonly disableAccessKeyAuthentication?: boolean;
}

/**
 * Complete Microsoft.Cache/redis resource definition.
 *
 * @remarks
 * Top-level resource definition for Azure Cache for Redis.
 *
 * **Resource Type**: Microsoft.Cache/redis
 * **API Version**: 2024-03-01
 */
export interface RedisCache {
  /**
   * Resource name.
   *
   * @remarks
   * Name must be globally unique across Azure.
   *
   * Constraints:
   * - Length: 1-63 characters
   * - Pattern: ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$
   * - Lowercase letters, numbers, and hyphens only
   * - Cannot start or end with hyphen
   *
   * @example 'my-redis-cache'
   */
  readonly name: string;

  /**
   * Azure region location.
   *
   * @remarks
   * Region where the Redis cache will be deployed.
   *
   * @example 'eastus'
   */
  readonly location: string;

  /**
   * SKU configuration.
   *
   * @remarks
   * Defines pricing tier, family, and capacity.
   */
  readonly sku: Sku;

  /**
   * Availability zones.
   *
   * @remarks
   * Premium tier only. Distributes cache across availability zones for higher availability.
   *
   * Constraints:
   * - Valid zone values: '1', '2', '3'
   * - Zones must be supported in target region
   *
   * @example ['1', '2']
   */
  readonly zones?: string[];

  /**
   * Resource tags.
   *
   * @remarks
   * Key-value pairs for resource organization and cost tracking.
   *
   * Constraints:
   * - Maximum 50 tags
   * - Key length: 1-512 characters
   * - Value length: 0-256 characters
   *
   * @example { 'Environment': 'Production', 'Department': 'Engineering' }
   */
  readonly tags?: Record<string, string>;

  /**
   * Managed identity configuration.
   *
   * @remarks
   * Configures managed identities for secure resource access.
   */
  readonly identity?: ManagedServiceIdentity;

  /**
   * Redis cache properties.
   *
   * @remarks
   * Core configuration properties for the cache instance.
   */
  readonly properties: RedisCacheProperties;
}

/**
 * Firewall rule for Redis Cache.
 *
 * @remarks
 * Child resource: Microsoft.Cache/redis/firewallRules
 * API Version: 2024-03-01
 */
export interface RedisFirewallRule {
  /**
   * Rule name.
   *
   * @remarks
   * Constraints:
   * - Length: 1-256 characters
   * - Pattern: ^[a-zA-Z0-9-_]+$
   *
   * @example 'AllowOfficeNetwork'
   */
  readonly name: string;

  /**
   * Start IP address of the range.
   *
   * @remarks
   * Constraints:
   * - Must be valid IPv4 address
   * - Must be less than or equal to endIP
   *
   * @example '192.168.1.1'
   */
  readonly startIP: string;

  /**
   * End IP address of the range.
   *
   * @remarks
   * Constraints:
   * - Must be valid IPv4 address
   * - Must be greater than or equal to startIP
   *
   * @example '192.168.1.255'
   */
  readonly endIP: string;
}

/**
 * Patch schedule for Redis Cache.
 *
 * @remarks
 * Child resource: Microsoft.Cache/redis/patchSchedules
 * API Version: 2024-03-01
 *
 * Defines maintenance windows for cache updates.
 */
export interface RedisPatchSchedule {
  /**
   * Schedule entries.
   *
   * @remarks
   * List of time windows for maintenance.
   */
  readonly scheduleEntries: ScheduleEntry[];
}

/**
 * Schedule entry for patch schedule.
 */
export interface ScheduleEntry {
  /**
   * Day of week.
   *
   * @remarks
   * Day when maintenance can occur.
   *
   * Values: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | 'Everyday' | 'Weekend'
   *
   * @example 'Sunday'
   */
  readonly dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | 'Everyday' | 'Weekend';

  /**
   * Start hour (UTC).
   *
   * @remarks
   * Hour when maintenance window starts.
   *
   * Constraints:
   * - Minimum: 0
   * - Maximum: 23
   *
   * @example 2
   */
  readonly startHourUtc: number;

  /**
   * Maintenance window duration.
   *
   * @remarks
   * How long the maintenance window lasts.
   *
   * Constraints:
   * - Minimum: PT5M (5 minutes)
   * - Format: ISO 8601 duration
   *
   * @example 'PT5H' (5 hours)
   */
  readonly maintenanceWindow?: string;
}

/**
 * Linked server for geo-replication.
 *
 * @remarks
 * Child resource: Microsoft.Cache/redis/linkedServers
 * API Version: 2024-03-01
 *
 * Premium tier only. Enables active geo-replication between caches.
 */
export interface RedisLinkedServer {
  /**
   * Linked server name.
   *
   * @remarks
   * Must match target cache name.
   */
  readonly name: string;

  /**
   * Properties for linked server.
   */
  readonly properties: {
    /**
     * Resource ID of the linked Redis cache.
     *
     * @remarks
     * Must be a Premium tier cache in a different region.
     */
    readonly linkedRedisCacheId: string;

    /**
     * Location of the linked cache.
     *
     * @remarks
     * Must be different from primary cache location.
     */
    readonly linkedRedisCacheLocation: string;

    /**
     * Server role in replication.
     *
     * Values: 'Primary' | 'Secondary'
     *
     * @example 'Secondary'
     */
    readonly serverRole: 'Primary' | 'Secondary';

    /**
     * Geo-replication groupNickname.
     *
     * @remarks
     * Optional friendly name for the replication group.
     */
    readonly geoReplicatedPrimaryHostName?: string;

    /**
     * Primary hostname.
     *
     * @remarks
     * Read-only, populated by Azure.
     */
    readonly primaryHostName?: string;
  };
}
