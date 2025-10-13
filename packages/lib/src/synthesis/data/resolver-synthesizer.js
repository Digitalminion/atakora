"use strict";
/**
 * Resolver Synthesizer - Generates GraphQL resolvers from Atakora schemas.
 *
 * @remarks
 * Transforms schema definitions into GraphQL resolver configurations:
 * - CRUD resolvers (get, list, create, update, delete)
 * - Relationship resolvers
 * - Computed field resolvers
 * - Authorization middleware integration
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolverOperation = void 0;
exports.synthesizeResolvers = synthesizeResolvers;
exports.validateResolverSynthesis = validateResolverSynthesis;
exports.generateResolverCode = generateResolverCode;
var define_schema_1 = require("../../schema/atakora/define-schema");
/**
 * Resolver operation type.
 */
var ResolverOperation;
(function (ResolverOperation) {
    ResolverOperation["GET"] = "get";
    ResolverOperation["LIST"] = "list";
    ResolverOperation["CREATE"] = "create";
    ResolverOperation["UPDATE"] = "update";
    ResolverOperation["DELETE"] = "delete";
    ResolverOperation["RELATIONSHIP"] = "relationship";
    ResolverOperation["COMPUTED"] = "computed";
    ResolverOperation["SUBSCRIPTION"] = "subscription";
})(ResolverOperation || (exports.ResolverOperation = ResolverOperation = {}));
/**
 * Synthesize GraphQL resolvers from schema.
 *
 * @param schema - Schema definition
 * @returns Resolver synthesis result
 *
 * @example
 * ```typescript
 * const result = synthesizeResolvers(UserSchema);
 * // Returns {
 * //   resolvers: [
 * //     { resolverName: 'getUser', operation: 'get', ... },
 * //     { resolverName: 'listUsers', operation: 'list', ... },
 * //     { resolverName: 'createUser', operation: 'create', ... },
 * //     ...
 * //   ],
 * //   inputTypes: Map { ... },
 * //   stats: { get: 1, list: 1, create: 1, ... }
 * // }
 * ```
 */
function synthesizeResolvers(schema) {
    var resolvers = [];
    var inputTypes = new Map();
    // Generate CRUD resolvers
    resolvers.push(buildGetResolver(schema));
    resolvers.push(buildListResolver(schema));
    resolvers.push(buildCreateResolver(schema, inputTypes));
    resolvers.push(buildUpdateResolver(schema, inputTypes));
    resolvers.push(buildDeleteResolver(schema));
    // Generate relationship resolvers
    if (schema.relationships) {
        for (var _i = 0, _a = Object.entries(schema.relationships); _i < _a.length; _i++) {
            var _b = _a[_i], relName = _b[0], rel = _b[1];
            var relResolver = buildRelationshipResolver(schema, relName, rel);
            resolvers.push(relResolver);
        }
    }
    // Generate computed field resolvers
    if (schema.computed) {
        for (var _c = 0, _d = Object.entries(schema.computed); _c < _d.length; _c++) {
            var _e = _d[_c], fieldName = _e[0], computed = _e[1];
            var computedResolver = buildComputedResolver(schema, fieldName, computed);
            resolvers.push(computedResolver);
        }
    }
    // Calculate statistics
    var stats = {
        get: resolvers.filter(function (r) { return r.operation === ResolverOperation.GET; }).length,
        list: resolvers.filter(function (r) { return r.operation === ResolverOperation.LIST; }).length,
        create: resolvers.filter(function (r) { return r.operation === ResolverOperation.CREATE; }).length,
        update: resolvers.filter(function (r) { return r.operation === ResolverOperation.UPDATE; }).length,
        delete: resolvers.filter(function (r) { return r.operation === ResolverOperation.DELETE; }).length,
        relationship: resolvers.filter(function (r) { return r.operation === ResolverOperation.RELATIONSHIP; })
            .length,
        computed: resolvers.filter(function (r) { return r.operation === ResolverOperation.COMPUTED; }).length,
        subscription: resolvers.filter(function (r) { return r.operation === ResolverOperation.SUBSCRIPTION; })
            .length,
    };
    return {
        resolvers: resolvers,
        inputTypes: inputTypes,
        stats: stats,
    };
}
/**
 * Build get resolver configuration.
 */
function buildGetResolver(schema) {
    var _a;
    var _b, _c;
    var entityName = schema.name;
    var primaryKey = (0, define_schema_1.getPrimaryKeyField)(schema) || 'id';
    return {
        resolverName: "get".concat(entityName),
        entityName: entityName,
        operation: ResolverOperation.GET,
        fieldPath: "Query.get".concat(entityName),
        handlerName: "get".concat(entityName, "Handler"),
        authorization: (_b = schema.authorization) === null || _b === void 0 ? void 0 : _b.read,
        cosmosQuery: {
            query: "SELECT * FROM c WHERE c.".concat(primaryKey, " = @").concat(primaryKey),
            parameters: (_a = {}, _a[primaryKey] = "@".concat(primaryKey), _a),
        },
        returnType: entityName,
        requiresAuth: !!((_c = schema.authorization) === null || _c === void 0 ? void 0 : _c.read),
        middleware: ['cors', 'logging'],
    };
}
/**
 * Build list resolver configuration.
 */
function buildListResolver(schema) {
    var _a, _b, _c, _d;
    var entityName = schema.name;
    return {
        resolverName: "list".concat(entityName, "s"),
        entityName: entityName,
        operation: ResolverOperation.LIST,
        fieldPath: "Query.list".concat(entityName, "s"),
        handlerName: "list".concat(entityName, "sHandler"),
        authorization: ((_a = schema.authorization) === null || _a === void 0 ? void 0 : _a.list) || ((_b = schema.authorization) === null || _b === void 0 ? void 0 : _b.read),
        cosmosQuery: {
            query: "SELECT * FROM c ORDER BY c._ts DESC OFFSET @offset LIMIT @limit",
            parameters: { offset: '@offset', limit: '@limit' },
        },
        returnType: "".concat(entityName, "Connection"),
        requiresAuth: !!(((_c = schema.authorization) === null || _c === void 0 ? void 0 : _c.list) || ((_d = schema.authorization) === null || _d === void 0 ? void 0 : _d.read)),
        middleware: ['cors', 'logging', 'pagination'],
    };
}
/**
 * Build create resolver configuration.
 */
function buildCreateResolver(schema, inputTypes) {
    var _a, _b;
    var entityName = schema.name;
    var inputTypeName = "Create".concat(entityName, "Input");
    // Generate input type
    inputTypes.set(inputTypeName, {
        name: inputTypeName,
        fields: schema.fields,
    });
    return {
        resolverName: "create".concat(entityName),
        entityName: entityName,
        operation: ResolverOperation.CREATE,
        fieldPath: "Mutation.create".concat(entityName),
        handlerName: "create".concat(entityName, "Handler"),
        authorization: (_a = schema.authorization) === null || _a === void 0 ? void 0 : _a.create,
        inputType: inputTypeName,
        returnType: entityName,
        requiresAuth: !!((_b = schema.authorization) === null || _b === void 0 ? void 0 : _b.create),
        middleware: ['cors', 'logging', 'validation'],
    };
}
/**
 * Build update resolver configuration.
 */
function buildUpdateResolver(schema, inputTypes) {
    var _a, _b;
    var entityName = schema.name;
    var inputTypeName = "Update".concat(entityName, "Input");
    var primaryKey = (0, define_schema_1.getPrimaryKeyField)(schema) || 'id';
    // Generate input type (partial)
    inputTypes.set(inputTypeName, {
        name: inputTypeName,
        fields: schema.fields,
        partial: true,
    });
    return {
        resolverName: "update".concat(entityName),
        entityName: entityName,
        operation: ResolverOperation.UPDATE,
        fieldPath: "Mutation.update".concat(entityName),
        handlerName: "update".concat(entityName, "Handler"),
        authorization: (_a = schema.authorization) === null || _a === void 0 ? void 0 : _a.update,
        inputType: inputTypeName,
        returnType: entityName,
        requiresAuth: !!((_b = schema.authorization) === null || _b === void 0 ? void 0 : _b.update),
        middleware: ['cors', 'logging', 'validation'],
    };
}
/**
 * Build delete resolver configuration.
 */
function buildDeleteResolver(schema) {
    var _a, _b;
    var entityName = schema.name;
    var primaryKey = (0, define_schema_1.getPrimaryKeyField)(schema) || 'id';
    return {
        resolverName: "delete".concat(entityName),
        entityName: entityName,
        operation: ResolverOperation.DELETE,
        fieldPath: "Mutation.delete".concat(entityName),
        handlerName: "delete".concat(entityName, "Handler"),
        authorization: (_a = schema.authorization) === null || _a === void 0 ? void 0 : _a.delete,
        returnType: entityName,
        requiresAuth: !!((_b = schema.authorization) === null || _b === void 0 ? void 0 : _b.delete),
        middleware: ['cors', 'logging'],
    };
}
/**
 * Build relationship resolver configuration.
 */
function buildRelationshipResolver(schema, relationshipName, relationship) {
    var _a, _b;
    var entityName = schema.name;
    return {
        resolverName: relationshipName,
        entityName: entityName,
        operation: ResolverOperation.RELATIONSHIP,
        fieldPath: "".concat(entityName, ".").concat(relationshipName),
        handlerName: "".concat(entityName, "_").concat(relationshipName, "Handler"),
        relationship: {
            type: relationship.type,
            targetEntity: relationship.target || ((_a = relationship.targets) === null || _a === void 0 ? void 0 : _a[0]),
            foreignKey: relationship.foreignKey,
        },
        returnType: relationship.type === 'hasMany' || relationship.type === 'manyToMany'
            ? "[".concat(relationship.target, "]")
            : relationship.target,
        requiresAuth: !!((_b = schema.authorization) === null || _b === void 0 ? void 0 : _b.read),
        middleware: ['cors', 'logging', 'dataLoader'],
    };
}
/**
 * Build computed field resolver configuration.
 */
function buildComputedResolver(schema, fieldName, computed) {
    var entityName = schema.name;
    return {
        resolverName: fieldName,
        entityName: entityName,
        operation: ResolverOperation.COMPUTED,
        fieldPath: "".concat(entityName, ".").concat(fieldName),
        handlerName: "".concat(entityName, "_").concat(fieldName, "Handler"),
        computed: {
            returnType: computed.type,
            dependencies: computed.dependencies,
        },
        returnType: mapComputedType(computed.type),
        requiresAuth: false,
        middleware: computed.cache ? ['cors', 'logging', 'cache'] : ['cors', 'logging'],
    };
}
/**
 * Map computed field type to GraphQL type.
 */
function mapComputedType(type) {
    switch (type) {
        case 'string':
            return 'String';
        case 'number':
            return 'Float';
        case 'boolean':
            return 'Boolean';
        case 'date':
            return 'DateTime';
        case 'array':
            return '[JSON]';
        case 'object':
            return 'JSON';
        default:
            return 'JSON';
    }
}
/**
 * Validate resolver synthesis result.
 */
function validateResolverSynthesis(result) {
    var errors = [];
    // Validate each resolver
    for (var _i = 0, _a = result.resolvers; _i < _a.length; _i++) {
        var resolver = _a[_i];
        if (!resolver.resolverName || resolver.resolverName.trim() === '') {
            errors.push("Resolver for entity '".concat(resolver.entityName, "' has no name"));
        }
        if (!resolver.handlerName || resolver.handlerName.trim() === '') {
            errors.push("Resolver '".concat(resolver.resolverName, "' for entity '").concat(resolver.entityName, "' has no handler name"));
        }
        // Validate authorization if required
        if (resolver.requiresAuth && !resolver.authorization) {
            errors.push("Resolver '".concat(resolver.resolverName, "' requires auth but has no authorization config"));
        }
    }
    // Check for duplicate resolver names
    var resolverNames = new Set();
    for (var _b = 0, _c = result.resolvers; _b < _c.length; _b++) {
        var resolver = _c[_b];
        var key = resolver.fieldPath;
        if (resolverNames.has(key)) {
            errors.push("Duplicate resolver found: ".concat(key));
        }
        resolverNames.add(key);
    }
    return {
        valid: errors.length === 0,
        errors: errors,
    };
}
/**
 * Generate resolver function code.
 *
 * @param config - Resolver configuration
 * @returns Function handler code as string
 */
function generateResolverCode(config) {
    var resolverName = config.resolverName, operation = config.operation, entityName = config.entityName;
    switch (operation) {
        case ResolverOperation.GET:
            return generateGetResolverCode(config);
        case ResolverOperation.LIST:
            return generateListResolverCode(config);
        case ResolverOperation.CREATE:
            return generateCreateResolverCode(config);
        case ResolverOperation.UPDATE:
            return generateUpdateResolverCode(config);
        case ResolverOperation.DELETE:
            return generateDeleteResolverCode(config);
        case ResolverOperation.RELATIONSHIP:
            return generateRelationshipResolverCode(config);
        case ResolverOperation.COMPUTED:
            return generateComputedResolverCode(config);
        default:
            return "// TODO: Implement ".concat(resolverName, " resolver");
    }
}
function generateGetResolverCode(config) {
    return "\nexport async function ".concat(config.handlerName, "(\n  parent: any,\n  args: { id: string },\n  context: any\n): Promise<").concat(config.returnType, " | null> {\n  const { cosmosClient } = context;\n  const container = cosmosClient.database('").concat(config.entityName, "DB').container('").concat(config.entityName, "');\n\n  const { resource } = await container.item(args.id, args.id).read();\n  return resource;\n}\n").trim();
}
function generateListResolverCode(config) {
    return "\nexport async function ".concat(config.handlerName, "(\n  parent: any,\n  args: { limit?: number; nextToken?: string },\n  context: any\n): Promise<").concat(config.returnType, "> {\n  const { cosmosClient } = context;\n  const container = cosmosClient.database('").concat(config.entityName, "DB').container('").concat(config.entityName, "');\n\n  const limit = args.limit || 100;\n  const query = 'SELECT * FROM c ORDER BY c._ts DESC OFFSET @offset LIMIT @limit';\n\n  const { resources } = await container.items\n    .query({ query, parameters: [{ name: '@offset', value: 0 }, { name: '@limit', value: limit }] })\n    .fetchAll();\n\n  return {\n    items: resources,\n    nextToken: undefined, // Implement pagination token logic\n  };\n}\n").trim();
}
function generateCreateResolverCode(config) {
    return "\nexport async function ".concat(config.handlerName, "(\n  parent: any,\n  args: { input: ").concat(config.inputType, " },\n  context: any\n): Promise<").concat(config.returnType, "> {\n  const { cosmosClient } = context;\n  const container = cosmosClient.database('").concat(config.entityName, "DB').container('").concat(config.entityName, "');\n\n  const now = new Date().toISOString();\n  const item = {\n    ...args.input,\n    id: args.input.id || uuidv4(),\n    createdAt: now,\n    updatedAt: now,\n  };\n\n  const { resource } = await container.items.create(item);\n  return resource;\n}\n").trim();
}
function generateUpdateResolverCode(config) {
    return "\nexport async function ".concat(config.handlerName, "(\n  parent: any,\n  args: { id: string; input: ").concat(config.inputType, " },\n  context: any\n): Promise<").concat(config.returnType, "> {\n  const { cosmosClient } = context;\n  const container = cosmosClient.database('").concat(config.entityName, "DB').container('").concat(config.entityName, "');\n\n  const { resource: existing } = await container.item(args.id, args.id).read();\n  if (!existing) {\n    throw new Error('").concat(config.entityName, " not found');\n  }\n\n  const updated = {\n    ...existing,\n    ...args.input,\n    updatedAt: new Date().toISOString(),\n  };\n\n  const { resource } = await container.item(args.id, args.id).replace(updated);\n  return resource;\n}\n").trim();
}
function generateDeleteResolverCode(config) {
    return "\nexport async function ".concat(config.handlerName, "(\n  parent: any,\n  args: { id: string },\n  context: any\n): Promise<").concat(config.returnType, "> {\n  const { cosmosClient } = context;\n  const container = cosmosClient.database('").concat(config.entityName, "DB').container('").concat(config.entityName, "');\n\n  const { resource } = await container.item(args.id, args.id).read();\n  if (!resource) {\n    throw new Error('").concat(config.entityName, " not found');\n  }\n\n  await container.item(args.id, args.id).delete();\n  return resource;\n}\n").trim();
}
function generateRelationshipResolverCode(config) {
    var relationship = config.relationship;
    if (!relationship)
        return '';
    return "\nexport async function ".concat(config.handlerName, "(\n  parent: ").concat(config.entityName, ",\n  args: any,\n  context: any\n): Promise<").concat(config.returnType, "> {\n  const { cosmosClient } = context;\n  const container = cosmosClient.database('").concat(relationship.targetEntity, "DB').container('").concat(relationship.targetEntity, "');\n\n  const query = 'SELECT * FROM c WHERE c.").concat(relationship.foreignKey, " = @parentId';\n  const { resources } = await container.items\n    .query({ query, parameters: [{ name: '@parentId', value: parent.id }] })\n    .fetchAll();\n\n  ").concat(relationship.type === 'hasMany' || relationship.type === 'manyToMany' ? 'return resources;' : 'return resources[0] || null;', "\n}\n").trim();
}
function generateComputedResolverCode(config) {
    return "\nexport async function ".concat(config.handlerName, "(\n  parent: ").concat(config.entityName, ",\n  args: any,\n  context: any\n): Promise<").concat(config.returnType, "> {\n  // TODO: Implement computed field logic\n  return null;\n}\n").trim();
}
