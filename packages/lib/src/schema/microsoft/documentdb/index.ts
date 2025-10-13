/**
 * Azure Cosmos DB (Microsoft.DocumentDB) schema module.
 *
 * @remarks
 * Centralized type definitions and enums for Azure Cosmos DB resources.
 * Provides a clean, developer-friendly API for working with Cosmos DB.
 *
 * @packageDocumentation
 */

// Export all enums
export {
  CosmosDbKind,
  DatabaseAccountOfferType,
  ConsistencyLevel,
  PublicNetworkAccess,
  NetworkAclBypass,
  MinimalTlsVersion,
  BackupStorageRedundancy,
  CreateMode,
  ConnectorOffer,
  IndexingMode,
  PartitionKind,
  ConflictResolutionMode,
  CompositePathOrder,
  SpatialType,
  TriggerOperation,
  TriggerType,
  ContinuousBackupTier,
  AnalyticalStorageSchemaType,
  MongoDbServerVersion,
  BackupPolicyType,
  RestoreMode,
  ThroughputMode,
  PartitionKeyVersion,
  IndexKind,
  DataType,
} from './enums';

// Export curated types
export type {
  CosmosConsistencyPolicy,
  CosmosLocation,
  CosmosCapability,
  CosmosVirtualNetworkRule,
  CosmosIpAddressOrRange,
  CosmosPartitionKey,
  CosmosIndexingPolicy,
  CosmosConflictResolutionPolicy,
  CosmosUniqueKeyPolicy,
} from './types';

// Re-export generated types for advanced usage
export type {
  AnalyticalStorageConfiguration,
  ApiProps,
  AutoscaleSettings,
  AutoscaleSettingsResource,
  ConsistencyPolicy,
  Location,
  VirtualNetworkRule,
  IpAddressOrRange,
  Capability,
  BackupPolicy,
  BackupPolicyMigrationState,
  ResourceRestoreParameters,
  DatabaseRestoreResource,
  ContainerPartitionKey,
  IndexingPolicy,
  ConflictResolutionPolicy,
  UniqueKeyPolicy,
  SqlDatabaseResource,
  SqlContainerResource,
  MongoDBDatabaseResource,
  MongoDBCollectionResource,
  CassandraKeyspaceResource,
  CassandraTableResource,
  GremlinDatabaseResource,
  GremlinGraphResource,
} from './types';
