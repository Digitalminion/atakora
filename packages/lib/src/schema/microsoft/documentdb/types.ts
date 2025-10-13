/**
 * Type definitions for Azure Cosmos DB (Microsoft.DocumentDB).
 *
 * @remarks
 * Curated types extracted and organized from Microsoft.DocumentDB Azure schema.
 * These provide clean, developer-friendly interfaces for Cosmos DB resources.
 *
 * **Resource Type**: Microsoft.DocumentDB/databaseAccounts
 * **API Version**: 2024-08-15
 *
 * @packageDocumentation
 */

// Re-export key types from generated schema
export type {
  // Configuration types
  AnalyticalStorageConfiguration,
  ApiProps,
  AutoscaleSettings,
  AutoscaleSettingsResource,

  // Consistency and replication
  ConsistencyPolicy,
  Location,

  // Networking
  VirtualNetworkRule,
  IpAddressOrRange,

  // Capabilities
  Capability,

  // Backup and restore
  BackupPolicy,
  BackupPolicyMigrationState,
  ResourceRestoreParameters,
  DatabaseRestoreResource,

  // Container and indexing
  ContainerPartitionKey,
  IndexingPolicy,
  ConflictResolutionPolicy,
  UniqueKeyPolicy,

  // Resource definitions
  SqlDatabaseResource,
  SqlContainerResource,
  MongoDBDatabaseResource,
  MongoDBCollectionResource,
  CassandraKeyspaceResource,
  CassandraTableResource,
  GremlinDatabaseResource,
  GremlinGraphResource,

} from '../../../generated/types/Microsoft.DocumentDB';

/**
 * Consistency policy configuration.
 *
 * @remarks
 * Defines how data is replicated and made consistent across regions.
 */
export interface CosmosConsistencyPolicy {
  /**
   * Default consistency level.
   */
  readonly defaultConsistencyLevel: 'Eventual' | 'Session' | 'BoundedStaleness' | 'Strong' | 'ConsistentPrefix';

  /**
   * Maximum staleness prefix (for BoundedStaleness).
   */
  readonly maxStalenessPrefix?: number;

  /**
   * Maximum interval in seconds (for BoundedStaleness).
   */
  readonly maxIntervalInSeconds?: number;
}

/**
 * Location configuration for Cosmos DB.
 *
 * @remarks
 * Defines a regional deployment for multi-region Cosmos DB accounts.
 */
export interface CosmosLocation {
  /**
   * Azure region name.
   */
  readonly locationName: string;

  /**
   * Failover priority (0 = primary).
   */
  readonly failoverPriority: number;

  /**
   * Zone redundancy enabled.
   */
  readonly isZoneRedundant?: boolean;
}

/**
 * Capability configuration.
 *
 * @remarks
 * Enables specific features for the Cosmos DB account.
 *
 * Common capability names:
 * - EnableServerless
 * - EnableCassandra
 * - EnableTable
 * - EnableGremlin
 * - EnableMongo
 */
export interface CosmosCapability {
  /**
   * Capability name.
   */
  readonly name: string;
}

/**
 * Virtual network rule.
 *
 * @remarks
 * Allows access from specific subnet within a virtual network.
 */
export interface CosmosVirtualNetworkRule {
  /**
   * Subnet resource ID.
   */
  readonly id: string;

  /**
   * Ignore missing VNet service endpoint.
   */
  readonly ignoreMissingVNetServiceEndpoint?: boolean;
}

/**
 * IP address rule.
 *
 * @remarks
 * Allows access from specific IP address or CIDR range.
 */
export interface CosmosIpAddressOrRange {
  /**
   * IP address or CIDR range.
   */
  readonly ipAddressOrRange: string;
}

/**
 * Partition key definition.
 */
export interface CosmosPartitionKey {
  /**
   * Partition key paths.
   */
  readonly paths?: string[];

  /**
   * Partition key kind.
   */
  readonly kind?: 'Hash' | 'Range' | 'MultiHash';

  /**
   * Partition key version (1 or 2).
   */
  readonly version?: number;
}

/**
 * Indexing policy for container.
 */
export interface CosmosIndexingPolicy {
  /**
   * Indexing mode.
   */
  readonly indexingMode?: 'consistent' | 'lazy' | 'none';

  /**
   * Automatic indexing enabled.
   */
  readonly automatic?: boolean;

  /**
   * Included paths.
   */
  readonly includedPaths?: Array<{
    readonly path?: string;
    readonly indexes?: Array<{
      readonly dataType?: 'String' | 'Number' | 'Point' | 'Polygon' | 'LineString';
      readonly kind?: 'Hash' | 'Range' | 'Spatial';
      readonly precision?: number;
    }>;
  }>;

  /**
   * Excluded paths.
   */
  readonly excludedPaths?: Array<{
    readonly path?: string;
  }>;

  /**
   * Composite indexes.
   */
  readonly compositeIndexes?: Array<Array<{
    readonly path?: string;
    readonly order?: 'ascending' | 'descending';
  }>>;

  /**
   * Spatial indexes.
   */
  readonly spatialIndexes?: Array<{
    readonly path?: string;
    readonly types?: ('Point' | 'LineString' | 'Polygon' | 'MultiPolygon')[];
  }>;
}

/**
 * Conflict resolution policy.
 */
export interface CosmosConflictResolutionPolicy {
  /**
   * Conflict resolution mode.
   */
  readonly mode?: 'LastWriterWins' | 'Custom';

  /**
   * Conflict resolution path (for LastWriterWins).
   */
  readonly conflictResolutionPath?: string;

  /**
   * Conflict resolution procedure (for Custom).
   */
  readonly conflictResolutionProcedure?: string;
}

/**
 * Unique key policy.
 */
export interface CosmosUniqueKeyPolicy {
  /**
   * Unique key constraints.
   */
  readonly uniqueKeys?: Array<{
    readonly paths?: string[];
  }>;
}
