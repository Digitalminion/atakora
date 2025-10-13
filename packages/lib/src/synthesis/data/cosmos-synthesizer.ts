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
import {
  getPrimaryKeyField,
  getUniqueFields,
  getIndexedFields,
  extractFieldMetadata,
} from '../../schema/atakora/define-schema';

/**
 * Cosmos DB indexing mode.
 */
export enum IndexingMode {
  CONSISTENT = 'consistent',
  LAZY = 'lazy',
  NONE = 'none',
}

/**
 * Cosmos DB index kind.
 */
export enum IndexKind {
  HASH = 'Hash',
  RANGE = 'Range',
  SPATIAL = 'Spatial',
}

/**
 * Cosmos DB data type for indexing.
 */
export enum DataType {
  STRING = 'String',
  NUMBER = 'Number',
  POINT = 'Point',
  POLYGON = 'Polygon',
  LINESTRING = 'LineString',
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
export function synthesizeCosmosContainer(
  schema: SchemaDefinition<any>
): CosmosContainerConfig {
  // Extract partition key from metadata or use id as default
  const partitionKeyPath = extractPartitionKey(schema);

  // Build indexing policy from schema indexes and fields
  const indexingPolicy = buildIndexingPolicy(schema);

  // Generate unique key policies from unique fields
  const uniqueKeyPolicy = buildUniqueKeyPolicy(schema);

  // Extract TTL from metadata
  const defaultTtl = extractTtl(schema);

  return {
    containerName: schema.name,
    partitionKeyPath,
    indexingPolicy,
    uniqueKeyPolicy,
    defaultTtl,
  };
}

/**
 * Extract partition key from schema metadata.
 */
function extractPartitionKey(schema: SchemaDefinition<any>): string {
  // Check metadata for explicit partition key
  const metadata = schema.metadata as any;
  if (metadata?.partitionKey) {
    return ensureLeadingSlash(metadata.partitionKey);
  }

  // Check field metadata for partition key marker
  const fieldMetadata = extractFieldMetadata(schema);
  for (const [fieldName, meta] of fieldMetadata.entries()) {
    if (meta?.partitionKey) {
      return ensureLeadingSlash(fieldName);
    }
  }

  // Default to primary key field
  const primaryKey = getPrimaryKeyField(schema);
  if (primaryKey) {
    return ensureLeadingSlash(primaryKey);
  }

  // Fallback to /id
  return '/id';
}

/**
 * Build indexing policy from schema.
 */
function buildIndexingPolicy(schema: SchemaDefinition<any>): IndexingPolicy {
  const includedPaths: IncludedPath[] = [];
  const excludedPaths: ExcludedPath[] = [];

  // Get indexed fields from field metadata
  const indexedFields = getIndexedFields(schema);
  for (const field of indexedFields) {
    includedPaths.push({
      path: ensureLeadingSlash(field) + '/?',
      indexes: [
        {
          kind: IndexKind.RANGE,
          dataType: inferDataType(schema, field),
          precision: -1,
        },
      ],
    });
  }

  // Add indexes from schema.indexes
  if (schema.indexes) {
    for (const [indexName, indexDef] of Object.entries(schema.indexes)) {
      for (const field of indexDef.fields) {
        // Check if already included
        const alreadyIncluded = includedPaths.some(
          (p) => p.path === ensureLeadingSlash(field) + '/?'
        );

        if (!alreadyIncluded) {
          includedPaths.push({
            path: ensureLeadingSlash(field) + '/?',
            indexes: [
              {
                kind: indexDef.type === 'hash' ? IndexKind.HASH : IndexKind.RANGE,
                dataType: inferDataType(schema, field),
                precision: -1,
              },
            ],
          });
        }
      }
    }
  }

  // Always include the default path for all other fields
  includedPaths.push({
    path: '/*',
  });

  return {
    indexingMode: IndexingMode.CONSISTENT,
    automatic: true,
    includedPaths,
    excludedPaths,
  };
}

/**
 * Build unique key policy from schema.
 */
function buildUniqueKeyPolicy(schema: SchemaDefinition<any>): UniqueKeyPolicy | undefined {
  const uniqueKeys: UniqueKey[] = [];

  // Get unique fields from field metadata
  const uniqueFields = getUniqueFields(schema);
  for (const field of uniqueFields) {
    uniqueKeys.push({
      paths: [ensureLeadingSlash(field)],
    });
  }

  // Add unique indexes from schema.indexes
  if (schema.indexes) {
    for (const [indexName, indexDef] of Object.entries(schema.indexes)) {
      if (indexDef.unique) {
        const paths = indexDef.fields.map(ensureLeadingSlash);
        // Check if not already added
        const alreadyAdded = uniqueKeys.some(
          (uk) => JSON.stringify(uk.paths.sort()) === JSON.stringify(paths.sort())
        );

        if (!alreadyAdded) {
          uniqueKeys.push({ paths });
        }
      }
    }
  }

  return uniqueKeys.length > 0 ? { uniqueKeys } : undefined;
}

/**
 * Extract TTL from schema metadata.
 */
function extractTtl(schema: SchemaDefinition<any>): number | undefined {
  const metadata = schema.metadata as any;
  return metadata?.ttl;
}

/**
 * Infer Cosmos DB data type from Zod field schema.
 */
function inferDataType(schema: SchemaDefinition<any>, fieldName: string): DataType {
  const shape = schema.fields.shape;
  const fieldSchema = shape[fieldName];

  if (!fieldSchema) {
    return DataType.STRING; // Default
  }

  // Extract Zod type name
  const typeName = (fieldSchema as any)._def?.typeName;

  switch (typeName) {
    case 'ZodString':
      return DataType.STRING;
    case 'ZodNumber':
      return DataType.NUMBER;
    case 'ZodDate':
      return DataType.STRING; // Dates are stored as ISO strings
    case 'ZodBoolean':
      return DataType.STRING; // Booleans are indexed as strings
    default:
      return DataType.STRING;
  }
}

/**
 * Ensure path has leading slash for Cosmos DB.
 */
function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Validate Cosmos DB container configuration.
 *
 * @param config - Container configuration
 * @returns Validation result
 */
export function validateContainerConfig(
  config: CosmosContainerConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate container name
  if (!config.containerName || config.containerName.trim() === '') {
    errors.push('Container name cannot be empty');
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,254}$/.test(config.containerName)) {
    errors.push(
      `Container name '${config.containerName}' must start with letter/number and contain only alphanumeric, underscore, or hyphen (max 255 chars)`
    );
  }

  // Validate partition key
  if (!config.partitionKeyPath || config.partitionKeyPath.trim() === '') {
    errors.push('Partition key path cannot be empty');
  }

  if (!config.partitionKeyPath.startsWith('/')) {
    errors.push(`Partition key path must start with '/' (got: ${config.partitionKeyPath})`);
  }

  // Validate indexing policy
  if (!config.indexingPolicy) {
    errors.push('Indexing policy is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
