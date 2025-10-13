/**
 * Type definitions for Cosmos DB SQL Container constructs.
 *
 * @remarks
 * Types for Cosmos DB SQL containers that are children of databases.
 *
 * @packageDocumentation
 */
import { schema } from '@atakora/lib';
import type { ICosmosDBDatabase } from './cosmos-db-database-types';
import type { ThroughputConfig } from './cosmos-db-database-types';
/**
 * Partition key version.
 */
export declare const PartitionKeyVersion: typeof schema.documentdb.PartitionKeyVersion;
export type PartitionKeyVersion = typeof PartitionKeyVersion[keyof typeof PartitionKeyVersion];
/**
 * Indexing mode.
 */
export declare const IndexingMode: typeof schema.documentdb.IndexingMode;
export type IndexingMode = typeof IndexingMode[keyof typeof IndexingMode];
/**
 * Index kind.
 */
export declare const IndexKind: typeof schema.documentdb.IndexKind;
export type IndexKind = typeof IndexKind[keyof typeof IndexKind];
/**
 * Data type for indexes.
 */
export declare const DataType: typeof schema.documentdb.DataType;
export type DataType = typeof DataType[keyof typeof DataType];
/**
 * Spatial index type.
 */
export declare const SpatialType: typeof schema.documentdb.SpatialType;
export type SpatialType = typeof SpatialType[keyof typeof SpatialType];
/**
 * Conflict resolution mode.
 */
export declare const ConflictResolutionMode: typeof schema.documentdb.ConflictResolutionMode;
export type ConflictResolutionMode = typeof ConflictResolutionMode[keyof typeof ConflictResolutionMode];
/**
 * Composite index path.
 */
export interface CompositeIndexPath {
    /**
     * Path to the property.
     */
    readonly path: string;
    /**
     * Sort order (asc or desc).
     */
    readonly order: 'ascending' | 'descending';
}
/**
 * Composite index.
 */
export interface CompositeIndex {
    /**
     * Paths in the composite index.
     */
    readonly paths: CompositeIndexPath[];
}
/**
 * Included path in indexing policy.
 */
export interface IncludedPath {
    /**
     * Path pattern.
     */
    readonly path: string;
    /**
     * Indexes for this path.
     */
    readonly indexes?: Array<{
        readonly kind: IndexKind;
        readonly dataType: DataType;
        readonly precision?: number;
    }>;
}
/**
 * Excluded path in indexing policy.
 */
export interface ExcludedPath {
    /**
     * Path pattern.
     */
    readonly path: string;
}
/**
 * Spatial index configuration.
 */
export interface SpatialIndex {
    /**
     * Path to spatial property.
     */
    readonly path: string;
    /**
     * Spatial types to index.
     */
    readonly types: SpatialType[];
}
/**
 * Vector index configuration (preview feature).
 */
export interface VectorIndex {
    /**
     * Path to vector property.
     */
    readonly path: string;
    /**
     * Vector index type.
     */
    readonly type: 'flat' | 'quantizedFlat' | 'diskANN';
}
/**
 * Indexing policy.
 */
export interface IndexingPolicy {
    /**
     * Indexing mode.
     */
    readonly indexingMode?: IndexingMode;
    /**
     * Automatic indexing enabled.
     */
    readonly automatic?: boolean;
    /**
     * Included paths.
     */
    readonly includedPaths?: IncludedPath[];
    /**
     * Excluded paths.
     */
    readonly excludedPaths?: ExcludedPath[];
    /**
     * Composite indexes.
     */
    readonly compositeIndexes?: CompositeIndex[];
    /**
     * Spatial indexes.
     */
    readonly spatialIndexes?: SpatialIndex[];
    /**
     * Vector indexes (preview).
     */
    readonly vectorIndexes?: VectorIndex[];
}
/**
 * Unique key.
 */
export interface UniqueKey {
    /**
     * Paths that must be unique.
     */
    readonly paths: string[];
}
/**
 * Unique key policy.
 */
export interface UniqueKeyPolicy {
    /**
     * Unique keys.
     */
    readonly uniqueKeys: UniqueKey[];
}
/**
 * Conflict resolution policy.
 */
export interface ConflictResolutionPolicy {
    /**
     * Conflict resolution mode.
     */
    readonly mode: ConflictResolutionMode;
    /**
     * Path for last writer wins (default: /_ts).
     */
    readonly conflictResolutionPath?: string;
    /**
     * Stored procedure for custom resolution.
     */
    readonly conflictResolutionProcedure?: string;
}
/**
 * Analytical storage configuration.
 */
export interface AnalyticalStorageConfig {
    /**
     * Schema type for analytical storage.
     */
    readonly schemaType: 'WellDefined' | 'FullFidelity';
}
/**
 * Properties for ArmCosmosDBContainer (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers ARM resource.
 *
 * ARM API Version: 2024-08-15
 */
export interface ArmCosmosDBContainerProps {
    /**
     * Parent Cosmos DB database.
     */
    readonly database: ICosmosDBDatabase;
    /**
     * Container name.
     *
     * @remarks
     * Must be 1-255 characters.
     */
    readonly containerName: string;
    /**
     * Partition key path.
     */
    readonly partitionKeyPath: string;
    /**
     * Partition key version.
     */
    readonly partitionKeyVersion?: PartitionKeyVersion;
    /**
     * Partition key paths (for hierarchical keys).
     */
    readonly partitionKeyPaths?: string[];
    /**
     * Indexing policy.
     */
    readonly indexingPolicy?: IndexingPolicy;
    /**
     * Throughput configuration.
     */
    readonly throughput?: ThroughputConfig;
    /**
     * Unique key policy.
     */
    readonly uniqueKeyPolicy?: UniqueKeyPolicy;
    /**
     * Conflict resolution policy.
     */
    readonly conflictResolutionPolicy?: ConflictResolutionPolicy;
    /**
     * Default time to live in seconds.
     */
    readonly defaultTtl?: number;
    /**
     * Analytical storage configuration.
     */
    readonly analyticalStorageTtl?: number;
    /**
     * Tags to apply to the container.
     */
    readonly tags?: Record<string, string>;
}
/**
 * Properties for CosmosDBContainer (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 */
export interface CosmosDBContainerProps {
    /**
     * Parent Cosmos DB database.
     */
    readonly database: ICosmosDBDatabase;
    /**
     * Container name (optional - auto-generated if not provided).
     */
    readonly containerName?: string;
    /**
     * Partition key path (required).
     *
     * @example
     * ```typescript
     * partitionKeyPath: '/tenantId'
     * ```
     */
    readonly partitionKeyPath: string;
    /**
     * Partition key version (optional - defaults to V2).
     */
    readonly partitionKeyVersion?: PartitionKeyVersion;
    /**
     * Partition key paths for hierarchical partition keys (optional).
     *
     * @remarks
     * Only used with PartitionKeyVersion.V2.
     */
    readonly partitionKeyPaths?: string[];
    /**
     * Indexing policy (optional).
     */
    readonly indexingPolicy?: IndexingPolicy;
    /**
     * Throughput in RU/s (for manual provisioned throughput).
     */
    readonly throughput?: number;
    /**
     * Maximum throughput in RU/s (for autoscale mode).
     */
    readonly maxThroughput?: number;
    /**
     * Unique key policy (optional).
     */
    readonly uniqueKeyPolicy?: UniqueKeyPolicy;
    /**
     * Conflict resolution policy (optional).
     */
    readonly conflictResolutionPolicy?: ConflictResolutionPolicy;
    /**
     * Default time to live in seconds (optional).
     *
     * @remarks
     * -1 = no expiration
     * 0 = TTL disabled
     * >0 = TTL in seconds
     */
    readonly defaultTtl?: number;
    /**
     * Analytical storage TTL in seconds (optional).
     *
     * @remarks
     * -1 = infinite retention
     * >0 = TTL in seconds
     */
    readonly analyticalStorageTtl?: number;
    /**
     * Tags to apply to the container.
     */
    readonly tags?: Record<string, string>;
}
/**
 * Interface for Cosmos DB Container reference.
 */
export interface ICosmosDBContainer {
    /**
     * Name of the Cosmos DB container.
     */
    readonly containerName: string;
    /**
     * Resource ID of the Cosmos DB container.
     */
    readonly containerId: string;
    /**
     * Parent database.
     */
    readonly database: ICosmosDBDatabase;
}
//# sourceMappingURL=cosmos-db-container-types.d.ts.map