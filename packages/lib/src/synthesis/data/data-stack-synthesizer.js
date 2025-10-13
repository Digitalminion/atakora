"use strict";
/**
 * Data Stack Synthesizer - Main orchestrator for Atakora data infrastructure synthesis.
 *
 * @remarks
 * Coordinates all sub-synthesizers to transform schemas into complete Azure infrastructure:
 * - Cosmos DB containers (via CosmosDbSynthesizer)
 * - Service Bus topics/subscriptions (via EventSynthesizer)
 * - GraphQL resolvers (via ResolverSynthesizer)
 * - Validates schema relationships
 * - Generates dependency graph for ARM resources
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStackSynthesizer = void 0;
exports.validateDataStackManifest = validateDataStackManifest;
var define_schema_1 = require("../../schema/atakora/define-schema");
var cosmos_synthesizer_1 = require("./cosmos-synthesizer");
var event_synthesizer_1 = require("./event-synthesizer");
var resolver_synthesizer_1 = require("./resolver-synthesizer");
/**
 * Main Data Stack Synthesizer.
 *
 * @remarks
 * Orchestrates the synthesis of Atakora schemas into Azure infrastructure.
 *
 * @example
 * ```typescript
 * const synthesizer = new DataStackSynthesizer();
 * const manifest = synthesizer.synthesize(
 *   [UserSchema, PostSchema, CommentSchema],
 *   {
 *     outdir: './cdk.out',
 *     databaseName: 'BlogDB',
 *     enableEvents: true,
 *     enableGraphQL: true
 *   }
 * );
 * ```
 */
var DataStackSynthesizer = /** @class */ (function () {
    function DataStackSynthesizer() {
        this.registry = new define_schema_1.SchemaRegistry();
    }
    /**
     * Synthesize schemas into data stack infrastructure.
     *
     * @param schemas - Array of schema definitions
     * @param options - Synthesis options
     * @returns Data stack manifest
     */
    DataStackSynthesizer.prototype.synthesize = function (schemas, options) {
        // Validate individual schemas
        this.validateSchemas(schemas);
        // Register schemas for cross-validation
        this.registerSchemas(schemas);
        // Validate relationships across schemas
        this.validateRelationships();
        // Determine which schemas to synthesize (incremental or all)
        var schemasToSynthesize = this.selectSchemasToSynthesize(schemas, options);
        // Synthesize Cosmos DB containers
        var containers = this.synthesizeCosmosContainers(schemasToSynthesize);
        // Synthesize Service Bus topics and subscriptions
        var eventResult = this.synthesizeEvents(schemas, options);
        // Synthesize GraphQL resolvers
        var resolverResult = this.synthesizeGraphQLResolvers(schemasToSynthesize, options);
        // Build dependency graph
        var dependencies = this.buildDependencyGraph(containers, eventResult, resolverResult, options);
        // Create manifest
        var manifest = {
            cosmos: {
                databaseName: options.databaseName || 'MainDB',
                containers: containers,
            },
            serviceBus: {
                topics: eventResult.topics,
                subscriptions: eventResult.subscriptions,
            },
            resolvers: {
                configs: resolverResult.resolvers,
                inputTypes: resolverResult.inputTypes,
                stats: resolverResult.stats,
            },
            dependencies: dependencies,
            metadata: {
                schemaCount: schemas.length,
                entityNames: schemas.map(function (s) { return s.name; }),
                synthesizedAt: new Date().toISOString(),
            },
        };
        return manifest;
    };
    /**
     * Validate all schemas.
     */
    DataStackSynthesizer.prototype.validateSchemas = function (schemas) {
        var errors = [];
        for (var _i = 0, schemas_1 = schemas; _i < schemas_1.length; _i++) {
            var schema = schemas_1[_i];
            var validation = (0, define_schema_1.validateSchema)(schema);
            if (!validation.valid) {
                errors.push("Schema '".concat(schema.name, "' validation failed:\n  ").concat(validation.errors.join('\n  ')));
            }
        }
        if (errors.length > 0) {
            throw new Error("Schema validation failed:\n".concat(errors.join('\n')));
        }
    };
    /**
     * Register schemas in registry.
     */
    DataStackSynthesizer.prototype.registerSchemas = function (schemas) {
        this.registry.clear();
        for (var _i = 0, schemas_2 = schemas; _i < schemas_2.length; _i++) {
            var schema = schemas_2[_i];
            this.registry.register(schema);
        }
    };
    /**
     * Validate relationships across schemas.
     */
    DataStackSynthesizer.prototype.validateRelationships = function () {
        var validation = this.registry.validateRelationships();
        if (!validation.valid) {
            throw new Error("Cross-schema relationship validation failed:\n  ".concat(validation.errors.join('\n  ')));
        }
    };
    /**
     * Select schemas to synthesize (for incremental synthesis).
     */
    DataStackSynthesizer.prototype.selectSchemasToSynthesize = function (schemas, options) {
        if (!options.incremental || !options.changedSchemas) {
            return schemas;
        }
        // Filter to only changed schemas and their dependents
        var changedSet = new Set(options.changedSchemas);
        var toSynthesize = [];
        for (var _i = 0, schemas_3 = schemas; _i < schemas_3.length; _i++) {
            var schema = schemas_3[_i];
            if (changedSet.has(schema.name)) {
                toSynthesize.push(schema);
                continue;
            }
            // Check if schema depends on any changed schema (via relationships)
            if (schema.relationships) {
                var dependsOnChanged = Object.values(schema.relationships).some(function (rel) {
                    var target = 'target' in rel ? rel.target : undefined;
                    return target && changedSet.has(target);
                });
                if (dependsOnChanged) {
                    toSynthesize.push(schema);
                }
            }
        }
        return toSynthesize;
    };
    /**
     * Synthesize Cosmos DB containers.
     */
    DataStackSynthesizer.prototype.synthesizeCosmosContainers = function (schemas) {
        return schemas.map(function (schema) { return (0, cosmos_synthesizer_1.synthesizeCosmosContainer)(schema); });
    };
    /**
     * Synthesize Service Bus events.
     */
    DataStackSynthesizer.prototype.synthesizeEvents = function (schemas, options) {
        if (options.enableEvents === false) {
            return { topics: [], subscriptions: [] };
        }
        return (0, event_synthesizer_1.synthesizeEventTopics)(schemas, this.registry);
    };
    /**
     * Synthesize GraphQL resolvers.
     */
    DataStackSynthesizer.prototype.synthesizeGraphQLResolvers = function (schemas, options) {
        if (options.enableGraphQL === false) {
            return {
                resolvers: [],
                inputTypes: new Map(),
                stats: {
                    get: 0,
                    list: 0,
                    create: 0,
                    update: 0,
                    delete: 0,
                    relationship: 0,
                    computed: 0,
                    subscription: 0,
                },
            };
        }
        // Synthesize resolvers for each schema
        var allResolvers = [];
        var allInputTypes = new Map();
        var combinedStats = {
            get: 0,
            list: 0,
            create: 0,
            update: 0,
            delete: 0,
            relationship: 0,
            computed: 0,
            subscription: 0,
        };
        for (var _i = 0, schemas_4 = schemas; _i < schemas_4.length; _i++) {
            var schema = schemas_4[_i];
            var result = (0, resolver_synthesizer_1.synthesizeResolvers)(schema);
            allResolvers.push.apply(allResolvers, result.resolvers);
            // Merge input types
            for (var _a = 0, _b = result.inputTypes.entries(); _a < _b.length; _a++) {
                var _c = _b[_a], name_1 = _c[0], type = _c[1];
                allInputTypes.set(name_1, type);
            }
            // Accumulate stats
            combinedStats.get += result.stats.get;
            combinedStats.list += result.stats.list;
            combinedStats.create += result.stats.create;
            combinedStats.update += result.stats.update;
            combinedStats.delete += result.stats.delete;
            combinedStats.relationship += result.stats.relationship;
            combinedStats.computed += result.stats.computed;
            combinedStats.subscription += result.stats.subscription;
        }
        return {
            resolvers: allResolvers,
            inputTypes: allInputTypes,
            stats: combinedStats,
        };
    };
    /**
     * Build dependency graph for ARM resource ordering.
     */
    DataStackSynthesizer.prototype.buildDependencyGraph = function (containers, eventResult, resolverResult, options) {
        var nodes = [];
        var databaseId = "database:".concat(options.databaseName || 'MainDB');
        // Database node (no dependencies)
        nodes.push({
            type: 'database',
            id: databaseId,
            dependsOn: [],
        });
        // Container nodes (depend on database)
        for (var _i = 0, containers_1 = containers; _i < containers_1.length; _i++) {
            var container = containers_1[_i];
            nodes.push({
                type: 'container',
                id: "container:".concat(container.containerName),
                dependsOn: [databaseId],
                entityName: container.containerName,
            });
        }
        // Topic nodes (no dependencies)
        for (var _a = 0, _b = eventResult.topics; _a < _b.length; _a++) {
            var topic = _b[_a];
            nodes.push({
                type: 'topic',
                id: "topic:".concat(topic.topicName),
                dependsOn: [],
                entityName: topic.entityName,
            });
        }
        // Subscription nodes (depend on topics)
        for (var _c = 0, _d = eventResult.subscriptions; _c < _d.length; _c++) {
            var sub = _d[_c];
            nodes.push({
                type: 'subscription',
                id: "subscription:".concat(sub.subscriptionName),
                dependsOn: ["topic:".concat(sub.topicName)],
                entityName: sub.subscriberEntity,
            });
        }
        // Resolver/Function nodes (depend on containers)
        for (var _e = 0, _f = resolverResult.resolvers; _e < _f.length; _e++) {
            var resolver = _f[_e];
            nodes.push({
                type: 'resolver',
                id: "resolver:".concat(resolver.resolverName),
                dependsOn: ["container:".concat(resolver.entityName)],
                entityName: resolver.entityName,
            });
        }
        // Topological sort
        var sortedIds = topologicalSort(nodes);
        return {
            nodes: nodes,
            sortedIds: sortedIds,
        };
    };
    /**
     * Get the schema registry.
     */
    DataStackSynthesizer.prototype.getRegistry = function () {
        return this.registry;
    };
    return DataStackSynthesizer;
}());
exports.DataStackSynthesizer = DataStackSynthesizer;
/**
 * Topological sort of dependency graph.
 *
 * @param nodes - Dependency nodes
 * @returns Topologically sorted resource IDs
 */
function topologicalSort(nodes) {
    var sorted = [];
    var visited = new Set();
    var visiting = new Set();
    // Build adjacency map
    var nodeMap = new Map(nodes.map(function (n) { return [n.id, n]; }));
    function visit(id) {
        if (visited.has(id))
            return;
        if (visiting.has(id)) {
            throw new Error("Circular dependency detected: ".concat(id));
        }
        visiting.add(id);
        var node = nodeMap.get(id);
        if (node) {
            for (var _i = 0, _a = node.dependsOn; _i < _a.length; _i++) {
                var dep = _a[_i];
                visit(dep);
            }
        }
        visiting.delete(id);
        visited.add(id);
        sorted.push(id);
    }
    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
        var node = nodes_1[_i];
        visit(node.id);
    }
    return sorted;
}
/**
 * Validate data stack manifest.
 */
function validateDataStackManifest(manifest) {
    var errors = [];
    // Validate Cosmos DB configuration
    if (!manifest.cosmos.databaseName) {
        errors.push('Database name is required');
    }
    if (manifest.cosmos.containers.length === 0) {
        errors.push('At least one container is required');
    }
    // Validate dependency graph
    if (manifest.dependencies.nodes.length === 0) {
        errors.push('Dependency graph is empty');
    }
    // Check for circular dependencies (should have been caught during sort)
    try {
        topologicalSort(manifest.dependencies.nodes);
    }
    catch (error) {
        if (error instanceof Error) {
            errors.push("Dependency graph error: ".concat(error.message));
        }
    }
    return {
        valid: errors.length === 0,
        errors: errors,
    };
}
