"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataType = exports.IndexKind = exports.IndexingMode = void 0;
exports.synthesizeCosmosContainer = synthesizeCosmosContainer;
exports.validateContainerConfig = validateContainerConfig;
var define_schema_1 = require("../../schema/atakora/define-schema");
/**
 * Cosmos DB indexing mode.
 */
var IndexingMode;
(function (IndexingMode) {
    IndexingMode["CONSISTENT"] = "consistent";
    IndexingMode["LAZY"] = "lazy";
    IndexingMode["NONE"] = "none";
})(IndexingMode || (exports.IndexingMode = IndexingMode = {}));
/**
 * Cosmos DB index kind.
 */
var IndexKind;
(function (IndexKind) {
    IndexKind["HASH"] = "Hash";
    IndexKind["RANGE"] = "Range";
    IndexKind["SPATIAL"] = "Spatial";
})(IndexKind || (exports.IndexKind = IndexKind = {}));
/**
 * Cosmos DB data type for indexing.
 */
var DataType;
(function (DataType) {
    DataType["STRING"] = "String";
    DataType["NUMBER"] = "Number";
    DataType["POINT"] = "Point";
    DataType["POLYGON"] = "Polygon";
    DataType["LINESTRING"] = "LineString";
})(DataType || (exports.DataType = DataType = {}));
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
function synthesizeCosmosContainer(schema) {
    // Extract partition key from metadata or use id as default
    var partitionKeyPath = extractPartitionKey(schema);
    // Build indexing policy from schema indexes and fields
    var indexingPolicy = buildIndexingPolicy(schema);
    // Generate unique key policies from unique fields
    var uniqueKeyPolicy = buildUniqueKeyPolicy(schema);
    // Extract TTL from metadata
    var defaultTtl = extractTtl(schema);
    return {
        containerName: schema.name,
        partitionKeyPath: partitionKeyPath,
        indexingPolicy: indexingPolicy,
        uniqueKeyPolicy: uniqueKeyPolicy,
        defaultTtl: defaultTtl,
    };
}
/**
 * Extract partition key from schema metadata.
 */
function extractPartitionKey(schema) {
    // Check metadata for explicit partition key
    var metadata = schema.metadata;
    if (metadata === null || metadata === void 0 ? void 0 : metadata.partitionKey) {
        return ensureLeadingSlash(metadata.partitionKey);
    }
    // Check field metadata for partition key marker
    var fieldMetadata = (0, define_schema_1.extractFieldMetadata)(schema);
    for (var _i = 0, _a = fieldMetadata.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], fieldName = _b[0], meta = _b[1];
        if (meta === null || meta === void 0 ? void 0 : meta.partitionKey) {
            return ensureLeadingSlash(fieldName);
        }
    }
    // Default to primary key field
    var primaryKey = (0, define_schema_1.getPrimaryKeyField)(schema);
    if (primaryKey) {
        return ensureLeadingSlash(primaryKey);
    }
    // Fallback to /id
    return '/id';
}
/**
 * Build indexing policy from schema.
 */
function buildIndexingPolicy(schema) {
    var includedPaths = [];
    var excludedPaths = [];
    // Get indexed fields from field metadata
    var indexedFields = (0, define_schema_1.getIndexedFields)(schema);
    for (var _i = 0, indexedFields_1 = indexedFields; _i < indexedFields_1.length; _i++) {
        var field = indexedFields_1[_i];
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
        for (var _a = 0, _b = Object.entries(schema.indexes); _a < _b.length; _a++) {
            var _c = _b[_a], indexName = _c[0], indexDef = _c[1];
            var _loop_1 = function (field) {
                // Check if already included
                var alreadyIncluded = includedPaths.some(function (p) { return p.path === ensureLeadingSlash(field) + '/?'; });
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
            };
            for (var _d = 0, _e = indexDef.fields; _d < _e.length; _d++) {
                var field = _e[_d];
                _loop_1(field);
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
        includedPaths: includedPaths,
        excludedPaths: excludedPaths,
    };
}
/**
 * Build unique key policy from schema.
 */
function buildUniqueKeyPolicy(schema) {
    var uniqueKeys = [];
    // Get unique fields from field metadata
    var uniqueFields = (0, define_schema_1.getUniqueFields)(schema);
    for (var _i = 0, uniqueFields_1 = uniqueFields; _i < uniqueFields_1.length; _i++) {
        var field = uniqueFields_1[_i];
        uniqueKeys.push({
            paths: [ensureLeadingSlash(field)],
        });
    }
    // Add unique indexes from schema.indexes
    if (schema.indexes) {
        var _loop_2 = function (indexName, indexDef) {
            if (indexDef.unique) {
                var paths_1 = indexDef.fields.map(ensureLeadingSlash);
                // Check if not already added
                var alreadyAdded = uniqueKeys.some(function (uk) { return JSON.stringify(uk.paths.sort()) === JSON.stringify(paths_1.sort()); });
                if (!alreadyAdded) {
                    uniqueKeys.push({ paths: paths_1 });
                }
            }
        };
        for (var _a = 0, _b = Object.entries(schema.indexes); _a < _b.length; _a++) {
            var _c = _b[_a], indexName = _c[0], indexDef = _c[1];
            _loop_2(indexName, indexDef);
        }
    }
    return uniqueKeys.length > 0 ? { uniqueKeys: uniqueKeys } : undefined;
}
/**
 * Extract TTL from schema metadata.
 */
function extractTtl(schema) {
    var metadata = schema.metadata;
    return metadata === null || metadata === void 0 ? void 0 : metadata.ttl;
}
/**
 * Infer Cosmos DB data type from Zod field schema.
 */
function inferDataType(schema, fieldName) {
    var _a;
    var shape = schema.fields.shape;
    var fieldSchema = shape[fieldName];
    if (!fieldSchema) {
        return DataType.STRING; // Default
    }
    // Extract Zod type name
    var typeName = (_a = fieldSchema._def) === null || _a === void 0 ? void 0 : _a.typeName;
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
function ensureLeadingSlash(path) {
    return path.startsWith('/') ? path : "/".concat(path);
}
/**
 * Validate Cosmos DB container configuration.
 *
 * @param config - Container configuration
 * @returns Validation result
 */
function validateContainerConfig(config) {
    var errors = [];
    // Validate container name
    if (!config.containerName || config.containerName.trim() === '') {
        errors.push('Container name cannot be empty');
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,254}$/.test(config.containerName)) {
        errors.push("Container name '".concat(config.containerName, "' must start with letter/number and contain only alphanumeric, underscore, or hyphen (max 255 chars)"));
    }
    // Validate partition key
    if (!config.partitionKeyPath || config.partitionKeyPath.trim() === '') {
        errors.push('Partition key path cannot be empty');
    }
    if (!config.partitionKeyPath.startsWith('/')) {
        errors.push("Partition key path must start with '/' (got: ".concat(config.partitionKeyPath, ")"));
    }
    // Validate indexing policy
    if (!config.indexingPolicy) {
        errors.push('Indexing policy is required');
    }
    return {
        valid: errors.length === 0,
        errors: errors,
    };
}
