/**
 * Enums for Azure Database for MySQL (Microsoft.DBforMySQL).
 *
 * @remarks
 * Curated enums for Azure Database for MySQL Flexible Server resources.
 *
 * **Resource Types**:
 * - Microsoft.DBforMySQL/flexibleServers
 * - Microsoft.DBforMySQL/flexibleServers/databases
 * - Microsoft.DBforMySQL/flexibleServers/configurations
 *
 * **API Version**: 2024-12-01-preview
 *
 * @packageDocumentation
 */

// MySQL Flexible Server enums

/**
 * MySQL server SKU tier.
 */
export enum MySqlSkuTier {
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
 * MySQL server version.
 */
export enum MySqlVersion {
  /**
   * MySQL 5.7.
   */
  V5_7 = '5.7',

  /**
   * MySQL 8.0.21.
   */
  V8_0_21 = '8.0.21',
}

/**
 * Geo-redundant backup configuration.
 */
export enum MySqlGeoRedundantBackup {
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
 * High availability mode for MySQL server.
 */
export enum MySqlHighAvailabilityMode {
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
export enum MySqlCreateMode {
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
}

/**
 * Replication role for MySQL server.
 */
export enum MySqlReplicationRole {
  /**
   * No replication role.
   */
  NONE = 'None',

  /**
   * Read replica.
   */
  REPLICA = 'Replica',

  /**
   * Source/primary server.
   */
  SOURCE = 'Source',
}

/**
 * Storage auto-grow configuration.
 */
export enum MySqlStorageAutoGrow {
  /**
   * Storage auto-grow is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Storage auto-grow is enabled.
   */
  ENABLED = 'Enabled',
}

/**
 * Storage auto IO scaling configuration.
 */
export enum MySqlStorageAutoIoScaling {
  /**
   * Auto IO scaling is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Auto IO scaling is enabled.
   */
  ENABLED = 'Enabled',
}

/**
 * Log on disk configuration.
 */
export enum MySqlLogOnDisk {
  /**
   * Log on disk is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Log on disk is enabled.
   */
  ENABLED = 'Enabled',
}

/**
 * Storage redundancy type.
 */
export enum MySqlStorageRedundancy {
  /**
   * Locally redundant storage.
   */
  LOCAL_REDUNDANCY = 'LocalRedundancy',

  /**
   * Zone-redundant storage.
   */
  ZONE_REDUNDANCY = 'ZoneRedundancy',
}

/**
 * Maintenance patch strategy.
 */
export enum MySqlPatchStrategy {
  /**
   * Regular patching schedule.
   */
  REGULAR = 'Regular',

  /**
   * Virtual canary patching.
   */
  VIRTUAL_CANARY = 'VirtualCanary',
}

/**
 * Data encryption type.
 */
export enum MySqlDataEncryptionType {
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
 * Public network access configuration.
 */
export enum MySqlPublicNetworkAccess {
  /**
   * Public network access is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Public network access is enabled.
   */
  ENABLED = 'Enabled',
}
