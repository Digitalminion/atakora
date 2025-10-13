/**
 * Cosmos DB Synthesizer - Converts Atakora schemas to Cosmos DB container configurations.
 *
 * @remarks
 * Transforms schema definitions into Cosmos DB container configurations including:
 * - Partition key extraction
 * - Indexing policy from schema indexes and unique fields
 * - Unique key policies
 * - TTL configuration
 *
 * @packageDocumentation
 */
import type { SchemaDefinition } from '../../schema/atakora/schema-types';
/**
 * Cosmos DB indexing mode.
 */
export declare enum IndexingMode {
    CONSISTENT = "consistent",
    LAZY = "lazy",
    NONE = "none"
}
/**
 * Cosmos DB index kind.
 */
export declare enum IndexKind {
    HASH = "Hash",
    RANGE = "Range",
    SPATIAL = "Spatial"
}
/**
 * Cosmos DB data type for indexing.
 */
export declare enum DataType {
    STRING = "String",
    NUMBER = "Number",
    POINT = "Point",
    POLYGON = "Polygon",
    LINESTRING = "LineString"
}
/**
 * Included path for indexing.
 */
export interface IncludedPath {
    readonly path: string;
    readonly indexes?: Array<{
        readonly kind: IndexKind;
        readonly dataType: DataType;
        readonly precision?: number;
    }>;
}
/**
 * Excluded path for indexing.
 */
export interface ExcludedPath {
    readonly path: string;
}
/**
 * Indexing policy configuration.
 */
export interface IndexingPolicy {
    readonly indexingMode: IndexingMode;
    readonly automatic: boolean;
    readonly includedPaths: IncludedPath[];
    readonly excludedPaths: ExcludedPath[];
}
/**
 * Unique key configuration.
 */
export interface UniqueKey {
    readonly paths: string[];
}
/**
 * Unique key policy configuration.
 */
export interface UniqueKeyPolicy {
    readonly uniqueKeys: UniqueKey[];
}
/**
 * Cosmos DB container configuration.
 */
export interface CosmosContainerConfig {
    /**
     * Container name (entity name).
     */
    readonly containerName: string;
    /**
     * Partition key path.
     */
    readonly partitionKeyPath: string;
    /**
     * Indexing policy.
     */
    readonly indexingPolicy: IndexingPolicy;
    /**
     * Unique key policy (optional).
     */
    readonly uniqueKeyPolicy?: UniqueKeyPolicy;
    /**
     * Default TTL in seconds (optional).
     */
    readonly defaultTtl?: number;
    /**
     * Analytical TTL in seconds (optional).
     */
    readonly analyticalStorageTtl?: number;
}
/**
 * Synthesize Cosmos DB container configuration from schema.
 *
 * @param schema - Schema definition
 * @returns Cosmos DB container configuration
 *
 * @example
 * ```typescript
 * const config = synthesizeCosmosContainer(UserSchema);
 * // Returns {
 * //   containerName: 'User',
 * //   partitionKeyPath: '/id',
 * //   indexingPolicy: { ... },
 * //   uniqueKeyPolicy: { ... }
 * // }
 * ```
 */
export declare function synthesizeCosmosContainer(schema: SchemaDefinition<any>): CosmosContainerConfig;
/**
 * Validate Cosmos DB container configuration.
 *
 * @param config - Container configuration
 * @returns Validation result
 */
export declare function validateContainerConfig(config: CosmosContainerConfig): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=cosmos-synthesizer.d.ts.map