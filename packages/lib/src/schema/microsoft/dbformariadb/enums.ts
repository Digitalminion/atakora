/**
 * Enums for Azure Database for MariaDB (Microsoft.DBforMariaDB).
 *
 * @remarks
 * Curated enums for Azure Database for MariaDB server resources.
 *
 * **Resource Types**:
 * - Microsoft.DBforMariaDB/servers
 * - Microsoft.DBforMariaDB/servers/databases
 * - Microsoft.DBforMariaDB/servers/firewallRules
 *
 * **API Version**: 2018-06-01
 *
 * @packageDocumentation
 */

// MariaDB Server enums

/**
 * MariaDB server version.
 */
export enum MariaDbVersion {
  /**
   * MariaDB 10.2.
   */
  V10_2 = '10.2',

  /**
   * MariaDB 10.3.
   */
  V10_3 = '10.3',
}

/**
 * Server create mode.
 */
export enum MariaDbCreateMode {
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
 * Minimum TLS version enforcement.
 */
export enum MariaDbMinimalTlsVersion {
  /**
   * TLS 1.0.
   */
  TLS_1_0 = 'TLS1_0',

  /**
   * TLS 1.1.
   */
  TLS_1_1 = 'TLS1_1',

  /**
   * TLS 1.2.
   */
  TLS_1_2 = 'TLS1_2',

  /**
   * TLS enforcement disabled.
   */
  TLS_ENFORCEMENT_DISABLED = 'TLSEnforcementDisabled',
}

/**
 * SSL enforcement configuration.
 */
export enum MariaDbSslEnforcement {
  /**
   * SSL enforcement is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * SSL enforcement is enabled.
   */
  ENABLED = 'Enabled',
}

/**
 * Public network access configuration.
 */
export enum MariaDbPublicNetworkAccess {
  /**
   * Public network access is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Public network access is enabled.
   */
  ENABLED = 'Enabled',
}

/**
 * MariaDB server SKU tier.
 */
export enum MariaDbSkuTier {
  /**
   * Basic tier - entry-level pricing and performance.
   */
  BASIC = 'Basic',

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
 * Geo-redundant backup configuration.
 */
export enum MariaDbGeoRedundantBackup {
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
 * Storage auto-grow configuration.
 */
export enum MariaDbStorageAutoGrow {
  /**
   * Storage auto-grow is disabled.
   */
  DISABLED = 'Disabled',

  /**
   * Storage auto-grow is enabled.
   */
  ENABLED = 'Enabled',
}
