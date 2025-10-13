/**
 * Enums for Azure Cosmos DB (Microsoft.DocumentDB).
 *
 * @remarks
 * Curated enums extracted from Microsoft.DocumentDB Azure schema.
 * These provide type-safe values for common Cosmos DB configurations.
 *
 * **Resource Type**: Microsoft.DocumentDB/databaseAccounts
 * **API Version**: 2024-08-15
 *
 * @packageDocumentation
 */

/**
 * Cosmos DB account kind.
 */
export enum CosmosDbKind {
  /**
   * Global Document DB (SQL API).
   */
  GLOBAL_DOCUMENT_DB = 'GlobalDocumentDB',

  /**
   * MongoDB API.
   */
  MONGO_DB = 'MongoDB',

  /**
   * Parse (deprecated).
   */
  PARSE = 'Parse',
}

/**
 * Database account offer type.
 */
export enum DatabaseAccountOfferType {
  /**
   * Standard offer type.
   */
  STANDARD = 'Standard',
}

/**
 * Consistency level for Cosmos DB.
 */
export enum ConsistencyLevel {
  /**
   * Eventual consistency.
   */
  EVENTUAL = 'Eventual',

  /**
   * Session consistency (default).
   */
  SESSION = 'Session',

  /**
   * Bounded staleness consistency.
   */
  BOUNDED_STALENESS = 'BoundedStaleness',

  /**
   * Strong consistency.
   */
  STRONG = 'Strong',

  /**
   * Consistent prefix.
   */
  CONSISTENT_PREFIX = 'ConsistentPrefix',
}

/**
 * Public network access setting.
 */
export enum PublicNetworkAccess {
  /**
   * Enabled - allows public access.
   */
  ENABLED = 'Enabled',

  /**
   * Disabled - no public access.
   */
  DISABLED = 'Disabled',

  /**
   * Secured by perimeter - access controlled by network security perimeter.
   */
  SECURED_BY_PERIMETER = 'SecuredByPerimeter',
}

/**
 * Network ACL bypass setting.
 */
export enum NetworkAclBypass {
  /**
   * No bypass.
   */
  NONE = 'None',

  /**
   * Allow Azure services to bypass.
   */
  AZURE_SERVICES = 'AzureServices',
}

/**
 * Minimal TLS version.
 */
export enum MinimalTlsVersion {
  /**
   * TLS 1.0 (not recommended).
   */
  TLS = 'Tls',

  /**
   * TLS 1.1 (not recommended).
   */
  TLS11 = 'Tls11',

  /**
   * TLS 1.2 (recommended).
   */
  TLS12 = 'Tls12',
}

/**
 * Backup storage redundancy.
 */
export enum BackupStorageRedundancy {
  /**
   * Geo-redundant storage.
   */
  GEO = 'Geo',

  /**
   * Locally redundant storage.
   */
  LOCAL = 'Local',

  /**
   * Zone-redundant storage.
   */
  ZONE = 'Zone',
}

/**
 * Create mode for database accounts.
 */
export enum CreateMode {
  /**
   * Default creation mode.
   */
  DEFAULT = 'Default',

  /**
   * Restore from backup.
   */
  RESTORE = 'Restore',
}

/**
 * Connector offer for Spark.
 */
export enum ConnectorOffer {
  /**
   * Small connector.
   */
  SMALL = 'Small',
}

/**
 * Indexing mode.
 */
export enum IndexingMode {
  /**
   * Consistent indexing.
   */
  CONSISTENT = 'consistent',

  /**
   * Lazy indexing (deprecated).
   */
  LAZY = 'lazy',

  /**
   * No indexing.
   */
  NONE = 'none',
}

/**
 * Container partition key kind.
 */
export enum PartitionKind {
  /**
   * Hash partitioning.
   */
  HASH = 'Hash',

  /**
   * Range partitioning.
   */
  RANGE = 'Range',

  /**
   * Multi-hash partitioning.
   */
  MULTI_HASH = 'MultiHash',
}

/**
 * Conflict resolution mode.
 */
export enum ConflictResolutionMode {
  /**
   * Last writer wins.
   */
  LAST_WRITER_WINS = 'LastWriterWins',

  /**
   * Custom conflict resolution.
   */
  CUSTOM = 'Custom',
}

/**
 * Composite path order.
 */
export enum CompositePathOrder {
  /**
   * Ascending order.
   */
  ASCENDING = 'ascending',

  /**
   * Descending order.
   */
  DESCENDING = 'descending',
}

/**
 * Spatial index type.
 */
export enum SpatialType {
  /**
   * Point geometry.
   */
  POINT = 'Point',

  /**
   * LineString geometry.
   */
  LINE_STRING = 'LineString',

  /**
   * Polygon geometry.
   */
  POLYGON = 'Polygon',

  /**
   * MultiPolygon geometry.
   */
  MULTI_POLYGON = 'MultiPolygon',
}

/**
 * Trigger operation type.
 */
export enum TriggerOperation {
  /**
   * All operations.
   */
  ALL = 'All',

  /**
   * Create operation.
   */
  CREATE = 'Create',

  /**
   * Update operation.
   */
  UPDATE = 'Update',

  /**
   * Delete operation.
   */
  DELETE = 'Delete',

  /**
   * Replace operation.
   */
  REPLACE = 'Replace',
}

/**
 * Trigger type.
 */
export enum TriggerType {
  /**
   * Pre-trigger.
   */
  PRE = 'Pre',

  /**
   * Post-trigger.
   */
  POST = 'Post',
}

/**
 * Continuous backup tier.
 */
export enum ContinuousBackupTier {
  /**
   * 7 days continuous backup.
   */
  CONTINUOUS_7_DAYS = 'Continuous7Days',

  /**
   * 30 days continuous backup.
   */
  CONTINUOUS_30_DAYS = 'Continuous30Days',
}

/**
 * Analytical storage schema type.
 */
export enum AnalyticalStorageSchemaType {
  /**
   * Well-defined schema.
   */
  WELL_DEFINED = 'WellDefined',

  /**
   * Full fidelity schema.
   */
  FULL_FIDELITY = 'FullFidelity',
}

/**
 * MongoDB server version.
 */
export enum MongoDbServerVersion {
  /**
   * MongoDB 3.2.
   */
  V3_2 = '3.2',

  /**
   * MongoDB 3.6.
   */
  V3_6 = '3.6',

  /**
   * MongoDB 4.0.
   */
  V4_0 = '4.0',

  /**
   * MongoDB 4.2.
   */
  V4_2 = '4.2',

  /**
   * MongoDB 5.0.
   */
  V5_0 = '5.0',

  /**
   * MongoDB 6.0.
   */
  V6_0 = '6.0',

  /**
   * MongoDB 7.0.
   */
  V7_0 = '7.0',
}

/**
 * Backup policy type.
 */
export enum BackupPolicyType {
  /**
   * Periodic backup policy.
   */
  PERIODIC = 'Periodic',

  /**
   * Continuous backup policy.
   */
  CONTINUOUS = 'Continuous',
}

/**
 * Restore mode.
 */
export enum RestoreMode {
  /**
   * Point-in-time restore.
   */
  POINT_IN_TIME = 'PointInTime',
}

/**
 * Throughput mode for database or container.
 */
export enum ThroughputMode {
  /**
   * Manual (provisioned) throughput.
   */
  MANUAL = 'Manual',

  /**
   * Autoscale throughput.
   */
  AUTOSCALE = 'Autoscale',
}

/**
 * Partition key version.
 */
export enum PartitionKeyVersion {
  /**
   * Version 1 (legacy).
   */
  V1 = 1,

  /**
   * Version 2 (hierarchical partition keys).
   */
  V2 = 2,
}

/**
 * Index kind.
 */
export enum IndexKind {
  /**
   * Hash index.
   */
  HASH = 'Hash',

  /**
   * Range index.
   */
  RANGE = 'Range',

  /**
   * Spatial index.
   */
  SPATIAL = 'Spatial',
}

/**
 * Data type for indexes.
 */
export enum DataType {
  STRING = 'String',
  NUMBER = 'Number',
  POINT = 'Point',
  POLYGON = 'Polygon',
  LINE_STRING = 'LineString',
  MULTI_POLYGON = 'MultiPolygon',
}
