"use strict";
/**
 * Runtime SDK for Atakora data framework.
 *
 * @remarks
 * Type-safe query and mutation builders, relationship loading with batching,
 * and runtime utilities for working with Atakora schemas.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRelationshipLoader = exports.RelationshipLoader = exports.createMutationBuilder = exports.MutationBuilder = exports.createQueryBuilder = exports.QueryBuilder = void 0;
// ============================================================================
// QUERY BUILDER
// ============================================================================
var query_builder_1 = require("./query-builder");
Object.defineProperty(exports, "QueryBuilder", { enumerable: true, get: function () { return query_builder_1.QueryBuilder; } });
Object.defineProperty(exports, "createQueryBuilder", { enumerable: true, get: function () { return query_builder_1.createQueryBuilder; } });
// ============================================================================
// MUTATION BUILDER
// ============================================================================
var mutation_builder_1 = require("./mutation-builder");
Object.defineProperty(exports, "MutationBuilder", { enumerable: true, get: function () { return mutation_builder_1.MutationBuilder; } });
Object.defineProperty(exports, "createMutationBuilder", { enumerable: true, get: function () { return mutation_builder_1.createMutationBuilder; } });
// ============================================================================
// RELATIONSHIP LOADER
// ============================================================================
var relationship_loader_1 = require("./relationship-loader");
Object.defineProperty(exports, "RelationshipLoader", { enumerable: true, get: function () { return relationship_loader_1.RelationshipLoader; } });
Object.defineProperty(exports, "createRelationshipLoader", { enumerable: true, get: function () { return relationship_loader_1.createRelationshipLoader; } });
