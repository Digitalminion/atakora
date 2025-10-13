"use strict";
/**
 * Type-safe query builder for Atakora schemas.
 *
 * @remarks
 * Provides a fluent API for building queries with type safety,
 * relationship loading, filtering, pagination, and sorting.
 *
 * @packageDocumentation
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilder = void 0;
exports.createQueryBuilder = createQueryBuilder;
/**
 * Type-safe query builder for a schema.
 */
var QueryBuilder = /** @class */ (function () {
    function QueryBuilder(schema, schemaRegistry) {
        this.schema = schema;
        this.schemaRegistry = schemaRegistry;
        this.options = {};
    }
    /**
     * Get a single record by ID.
     *
     * @param id - Record ID
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const user = await userQuery.get('user-123').execute();
     * ```
     */
    QueryBuilder.prototype.get = function (id) {
        this.options.filters = [
            {
                field: 'id',
                operator: 'eq',
                value: id,
            },
        ];
        this.options.pagination = { limit: 1 };
        return this;
    };
    /**
     * List all records with optional filtering.
     *
     * @param options - List options
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery.list({ limit: 10 }).execute();
     * ```
     */
    QueryBuilder.prototype.list = function (options) {
        if (options) {
            this.options.pagination = __assign(__assign({}, this.options.pagination), options);
        }
        return this;
    };
    /**
     * Add filter conditions.
     *
     * @param field - Field name
     * @param operator - Filter operator
     * @param value - Filter value
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .where('status', 'eq', 'published')
     *   .where('viewCount', 'gt', 1000)
     *   .execute();
     * ```
     */
    QueryBuilder.prototype.where = function (field, operator, value) {
        if (!this.options.filters) {
            this.options.filters = [];
        }
        this.options.filters.push({
            field: field,
            operator: operator,
            value: value,
        });
        return this;
    };
    /**
     * Add AND filter group.
     *
     * @param filters - Filter conditions
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .and([
     *     { field: 'status', operator: 'eq', value: 'published' },
     *     { field: 'featured', operator: 'eq', value: true }
     *   ])
     *   .execute();
     * ```
     */
    QueryBuilder.prototype.and = function (filters) {
        if (!this.options.filters) {
            this.options.filters = [];
        }
        this.options.filters.push({
            and: filters,
        });
        return this;
    };
    /**
     * Add OR filter group.
     *
     * @param filters - Filter conditions
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .or([
     *     { field: 'status', operator: 'eq', value: 'published' },
     *     { field: 'status', operator: 'eq', value: 'archived' }
     *   ])
     *   .execute();
     * ```
     */
    QueryBuilder.prototype.or = function (filters) {
        if (!this.options.filters) {
            this.options.filters = [];
        }
        this.options.filters.push({
            or: filters,
        });
        return this;
    };
    /**
     * Include related entities.
     *
     * @param relationships - Relationship names to include
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .include('author', 'comments')
     *   .execute();
     * ```
     */
    QueryBuilder.prototype.include = function () {
        var _a;
        var relationships = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            relationships[_i] = arguments[_i];
        }
        if (!this.options.include) {
            this.options.include = [];
        }
        (_a = this.options.include).push.apply(_a, relationships);
        return this;
    };
    /**
     * Select specific fields.
     *
     * @param fields - Field names to select
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .select('id', 'title', 'excerpt')
     *   .execute();
     * ```
     */
    QueryBuilder.prototype.select = function () {
        var fields = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            fields[_i] = arguments[_i];
        }
        this.options.select = fields;
        return this;
    };
    /**
     * Add sorting.
     *
     * @param field - Field to sort by
     * @param direction - Sort direction
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .orderBy('publishedAt', 'desc')
     *   .orderBy('title', 'asc')
     *   .execute();
     * ```
     */
    QueryBuilder.prototype.orderBy = function (field, direction) {
        if (direction === void 0) { direction = 'asc'; }
        if (!this.options.sort) {
            this.options.sort = [];
        }
        this.options.sort.push({
            field: field,
            direction: direction,
        });
        return this;
    };
    /**
     * Set pagination limit.
     *
     * @param limit - Maximum number of records
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery.limit(10).execute();
     * ```
     */
    QueryBuilder.prototype.limit = function (limit) {
        if (!this.options.pagination) {
            this.options.pagination = {};
        }
        this.options.pagination.limit = limit;
        return this;
    };
    /**
     * Set pagination offset.
     *
     * @param offset - Number of records to skip
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery.offset(20).limit(10).execute();
     * ```
     */
    QueryBuilder.prototype.offset = function (offset) {
        if (!this.options.pagination) {
            this.options.pagination = {};
        }
        this.options.pagination.offset = offset;
        return this;
    };
    /**
     * Set cursor-based pagination.
     *
     * @param cursor - Pagination cursor
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery.cursor('next-page-token').execute();
     * ```
     */
    QueryBuilder.prototype.cursor = function (cursor) {
        if (!this.options.pagination) {
            this.options.pagination = {};
        }
        this.options.pagination.cursor = cursor;
        return this;
    };
    /**
     * Set authorization context.
     *
     * @param context - Authorization context
     * @returns Query builder for chaining
     *
     * @example
     * ```typescript
     * const posts = await postQuery
     *   .withAuth({ user: currentUser, operation: 'read' })
     *   .execute();
     * ```
     */
    QueryBuilder.prototype.withAuth = function (context) {
        this.options.authContext = context;
        return this;
    };
    /**
     * Generate GraphQL query string.
     *
     * @returns GraphQL query and variables
     *
     * @example
     * ```typescript
     * const { query, variables } = postQuery
     *   .where('status', 'eq', 'published')
     *   .toGraphQL();
     * ```
     */
    QueryBuilder.prototype.toGraphQL = function () {
        var _a;
        var entityName = this.schema.name;
        var operationName = ((_a = this.options.filters) === null || _a === void 0 ? void 0 : _a.some(function (f) { return 'field' in f && f.field === 'id'; }))
            ? "get".concat(entityName)
            : "list".concat(entityName, "s");
        // Build field selection
        var fields = this.buildFieldSelection();
        // Build filter arguments
        var filterArgs = this.buildFilterArgs();
        // Build query
        var query = "\n      query ".concat(operationName).concat(this.buildVariableDefinitions(), " {\n        ").concat(operationName.charAt(0).toLowerCase() + operationName.slice(1)).concat(filterArgs, " {\n          ").concat(fields, "\n        }\n      }\n    ").trim();
        var variables = this.buildVariables();
        return { query: query, variables: variables };
    };
    /**
     * Build field selection for GraphQL.
     */
    QueryBuilder.prototype.buildFieldSelection = function () {
        var _a, _b;
        var fields = [];
        // Add selected fields or all schema fields
        if (this.options.select && this.options.select.length > 0) {
            fields.push.apply(fields, this.options.select);
        }
        else {
            // Get all field names from schema
            var shape = this.schema.fields.shape;
            fields.push.apply(fields, Object.keys(shape));
        }
        // Add included relationships
        if (this.options.include && this.options.include.length > 0) {
            for (var _i = 0, _c = this.options.include; _i < _c.length; _i++) {
                var rel = _c[_i];
                var relationship = (_a = this.schema.relationships) === null || _a === void 0 ? void 0 : _a[rel];
                if (relationship) {
                    var targetSchema = (_b = this.schemaRegistry) === null || _b === void 0 ? void 0 : _b.get('target' in relationship ? relationship.target : '');
                    if (targetSchema) {
                        var targetFields = Object.keys(targetSchema.fields.shape);
                        fields.push("".concat(rel, " { ").concat(targetFields.join(' '), " }"));
                    }
                    else {
                        fields.push("".concat(rel, " { id }"));
                    }
                }
            }
        }
        return fields.join('\n');
    };
    /**
     * Build filter arguments for GraphQL.
     */
    QueryBuilder.prototype.buildFilterArgs = function () {
        var args = [];
        if (this.options.filters && this.options.filters.length > 0) {
            args.push('filter: $filter');
        }
        if (this.options.sort && this.options.sort.length > 0) {
            args.push('sort: $sort');
        }
        if (this.options.pagination) {
            if (this.options.pagination.limit !== undefined) {
                args.push('limit: $limit');
            }
            if (this.options.pagination.offset !== undefined) {
                args.push('offset: $offset');
            }
            if (this.options.pagination.cursor) {
                args.push('cursor: $cursor');
            }
        }
        return args.length > 0 ? "(".concat(args.join(', '), ")") : '';
    };
    /**
     * Build variable definitions for GraphQL.
     */
    QueryBuilder.prototype.buildVariableDefinitions = function () {
        var defs = [];
        if (this.options.filters && this.options.filters.length > 0) {
            defs.push('$filter: FilterInput');
        }
        if (this.options.sort && this.options.sort.length > 0) {
            defs.push('$sort: [SortInput!]');
        }
        if (this.options.pagination) {
            if (this.options.pagination.limit !== undefined) {
                defs.push('$limit: Int');
            }
            if (this.options.pagination.offset !== undefined) {
                defs.push('$offset: Int');
            }
            if (this.options.pagination.cursor) {
                defs.push('$cursor: String');
            }
        }
        return defs.length > 0 ? "(".concat(defs.join(', '), ")") : '';
    };
    /**
     * Build variables object for GraphQL.
     */
    QueryBuilder.prototype.buildVariables = function () {
        var variables = {};
        if (this.options.filters && this.options.filters.length > 0) {
            variables.filter = this.serializeFilters(this.options.filters);
        }
        if (this.options.sort && this.options.sort.length > 0) {
            variables.sort = this.options.sort;
        }
        if (this.options.pagination) {
            if (this.options.pagination.limit !== undefined) {
                variables.limit = this.options.pagination.limit;
            }
            if (this.options.pagination.offset !== undefined) {
                variables.offset = this.options.pagination.offset;
            }
            if (this.options.pagination.cursor) {
                variables.cursor = this.options.pagination.cursor;
            }
        }
        return variables;
    };
    /**
     * Serialize filters to GraphQL format.
     */
    QueryBuilder.prototype.serializeFilters = function (filters) {
        var _this = this;
        if (filters.length === 1) {
            return this.serializeFilter(filters[0]);
        }
        return {
            and: filters.map(function (f) { return _this.serializeFilter(f); }),
        };
    };
    /**
     * Serialize a single filter.
     */
    QueryBuilder.prototype.serializeFilter = function (filter) {
        var _a, _b;
        var _this = this;
        var _c, _d;
        if ('and' in filter) {
            return { and: (_c = filter.and) === null || _c === void 0 ? void 0 : _c.map(function (f) { return _this.serializeFilter(f); }) };
        }
        if ('or' in filter) {
            return { or: (_d = filter.or) === null || _d === void 0 ? void 0 : _d.map(function (f) { return _this.serializeFilter(f); }) };
        }
        if ('not' in filter) {
            return { not: filter.not ? this.serializeFilter(filter.not) : undefined };
        }
        // Filter condition
        var condition = filter;
        return _a = {},
            _a[condition.field] = (_b = {},
                _b[condition.operator] = condition.value,
                _b),
            _a;
    };
    /**
     * Execute the query (placeholder - actual implementation would call API).
     *
     * @returns Query result
     *
     * @example
     * ```typescript
     * const result = await postQuery
     *   .where('status', 'eq', 'published')
     *   .orderBy('publishedAt', 'desc')
     *   .limit(10)
     *   .execute();
     * ```
     */
    QueryBuilder.prototype.execute = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // This would be implemented by the actual data provider
                // For now, return empty result
                throw new Error('Query execution not implemented. Use toGraphQL() to generate query string and execute with your data provider.');
            });
        });
    };
    /**
     * Get current query options.
     *
     * @returns Query options
     */
    QueryBuilder.prototype.getOptions = function () {
        return this.options;
    };
    /**
     * Clone the query builder.
     *
     * @returns New query builder with same options
     */
    QueryBuilder.prototype.clone = function () {
        var cloned = new QueryBuilder(this.schema, this.schemaRegistry);
        cloned.options = JSON.parse(JSON.stringify(this.options));
        return cloned;
    };
    return QueryBuilder;
}());
exports.QueryBuilder = QueryBuilder;
/**
 * Create a query builder for a schema.
 *
 * @param schema - Schema definition
 * @param registry - Optional schema registry for relationship resolution
 * @returns Query builder instance
 *
 * @example
 * ```typescript
 * const postQuery = createQueryBuilder(PostSchema);
 * const result = await postQuery
 *   .where('status', 'eq', 'published')
 *   .include('author', 'comments')
 *   .orderBy('publishedAt', 'desc')
 *   .limit(10)
 *   .execute();
 * ```
 */
function createQueryBuilder(schema, registry) {
    return new QueryBuilder(schema, registry);
}
