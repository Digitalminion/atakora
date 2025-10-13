/**
 * Enums for Azure Database for PostgreSQL (Microsoft.DBforPostgreSQL).
 *
 * @remarks
 * Curated enums for Azure Database for PostgreSQL Flexible Server resources.
 *
 * **Resource Types**:
 * - Microsoft.DBforPostgreSQL/flexibleServers
 * - Microsoft.DBforPostgreSQL/flexibleServers/databases
 * - Microsoft.DBforPostgreSQL/flexibleServers/configurations
 *
 * **API Version**: 2024-11-01-preview
 *
 * @packageDocumentation
 */

// PostgreSQL Flexible Server enums

/**
 * PostgreSQL server SKU tier.
 */
export enum PostgreSqlSkuTier {
  /**
   * Burstable tier - cost-effective for workloads with low CPU utilization.
   */
  BURSTABLE = 'Burstable',

  /**
   * General Purpose tier - balanced compute and memory.
   */
  GENERAL_PURPOSE = 'GeneralPurpose',

  /**
   * Memory Optimized tier - high memory-to-CPU ratio.
   */
  MEMORY_OPTIMIZED = 'MemoryOptimized',
}

/**
 * PostgreSQL server version.
 */
export enum PostgreSqlVersion {
  /**
   * PostgreSQL 11.
   */
  V11 = '11',

  /**
   * PostgreSQL 12.
   */
  V12 = '12',

  /**
   * PostgreSQL 13.
   */
  V13 = '13',

  /**
   * PostgreSQL 14.
   */
  V14 = '14',

  /**
   * PostgreSQL 15.
   */
  V15 = '15',

  /**
   * PostgreSQL 16.
   */
  V16 = '16',

  /**
   * PostgreSQL 17.
   */
  V17 = '17',
}

/**
 * Storage type for PostgreSQL server.
 */
export enum PostgreSqlStorageType {
  /**
   * Premium Locally Redundant Storage.
   */
  PREMIUM_LRS = 'Premium_LRS',

  /**
   * Premium V2 Locally Redundant Storage.
   */
  PREMIUM_V2_LRS = 'PremiumV2_LRS',

  /**
   * Ultra SSD Locally Redundant Storage.
   */
  ULTRA_SSD_LRS = 'UltraSSD_LRS',
}

/**
 * Geo-redundant backup configuration.
 */
export enum PostgreSqlGeoRedundantBackup {
  /**
   * Geo-redundant backup is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Geo-redundant backup is enabled.
   */
  ENABLED = 'Enabled',
}

/**
 * High availability mode for PostgreSQL server.
 */
export enum PostgreSqlHighAvailabilityMode {
  /**
   * High availability is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Same-zone high availability.
   */
  SAME_ZONE = 'SameZone',

  /**
   * Zone-redundant high availability.
   */
  ZONE_REDUNDANT = 'ZoneRedundant',
}

/**
 * Server create mode.
 */
export enum PostgreSqlCreateMode {
  /**
   * Create a new server.
   */
  CREATE = 'Create',

  /**
   * Default create mode.
   */
  DEFAULT = 'Default',

  /**
   * Geo-restore from a geo-redundant backup.
   */
  GEO_RESTORE = 'GeoRestore',

  /**
   * Point-in-time restore from a backup.
   */
  POINT_IN_TIME_RESTORE = 'PointInTimeRestore',

  /**
   * Create as a read replica.
   */
  REPLICA = 'Replica',

  /**
   * Revive a dropped server.
   */
  REVIVE_DROPPED = 'ReviveDropped',

  /**
   * Update an existing server.
   */
  UPDATE = 'Update',
}

/**
 * Replication role for PostgreSQL server.
 */
export enum PostgreSqlReplicationRole {
  /**
   * Asynchronous replica.
   */
  ASYNC_REPLICA = 'AsyncReplica',

  /**
   * Geo-asynchronous replica.
   */
  GEO_ASYNC_REPLICA = 'GeoAsyncReplica',

  /**
   * No replication role.
   */
  NONE = 'None',

  /**
   * Primary server.
   */
  PRIMARY = 'Primary',
}

/**
 * Data encryption type.
 */
export enum PostgreSqlDataEncryptionType {
  /**
   * Azure Key Vault encryption.
   */
  AZURE_KEY_VAULT = 'AzureKeyVault',

  /**
   * System-managed encryption.
   */
  SYSTEM_MANAGED = 'SystemManaged',
}

/**
 * Replica promote mode.
 */
export enum PostgreSqlReplicaPromoteMode {
  /**
   * Promote to standalone server.
   */
  STANDALONE = 'standalone',

  /**
   * Switchover with planned downtime.
   */
  SWITCHOVER = 'switchover',
}

/**
 * Replica promote option.
 */
export enum PostgreSqlReplicaPromoteOption {
  /**
   * Forced promotion (data loss possible).
   */
  FORCED = 'forced',

  /**
   * Planned promotion (no data loss).
   */
  PLANNED = 'planned',
}

/**
 * Server identity type.
 */
export enum PostgreSqlIdentityType {
  /**
   * No managed identity.
   */
  NONE = 'None',

  /**
   * System-assigned managed identity.
   */
  SYSTEM_ASSIGNED = 'SystemAssigned',

  /**
   * Both system-assigned and user-assigned identities.
   */
  SYSTEM_ASSIGNED_USER_ASSIGNED = 'SystemAssigned,UserAssigned',

  /**
   * User-assigned managed identity.
   */
  USER_ASSIGNED = 'UserAssigned',
}

/**
 * Public network access configuration.
 */
export enum PostgreSqlPublicNetworkAccess {
  /**
   * Public network access is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Public network access is enabled.
   */
  ENABLED = 'Enabled',
}
