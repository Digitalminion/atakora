"use strict";
/**
 * Relationship loader with batch loading and caching.
 *
 * @remarks
 * Provides efficient relationship loading with batching to prevent N+1 queries,
 * caching for performance, and support for eager and lazy loading.
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
exports.RelationshipLoader = void 0;
exports.createRelationshipLoader = createRelationshipLoader;
/**
 * Batch loader for efficient data loading.
 */
var BatchLoader = /** @class */ (function () {
    function BatchLoader(loaderFn, options) {
        if (options === void 0) { options = {}; }
        this.loaderFn = loaderFn;
        this.options = options;
        this.queue = [];
        this.batchTimer = null;
        this.cache = new Map();
    }
    /**
     * Load a value by key.
     */
    BatchLoader.prototype.load = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var cached;
            var _this = this;
            return __generator(this, function (_a) {
                // Check cache first
                if (this.options.cache) {
                    cached = this.cache.get(key);
                    if (cached && cached.expiresAt > Date.now()) {
                        return [2 /*return*/, cached.value];
                    }
                }
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.queue.push({ key: key, resolve: resolve, reject: reject });
                        // Clear existing timer
                        if (_this.batchTimer) {
                            clearTimeout(_this.batchTimer);
                        }
                        // Check if we should execute immediately
                        var maxBatchSize = _this.options.maxBatchSize || 100;
                        if (_this.queue.length >= maxBatchSize) {
                            _this.executeBatch();
                        }
                        else {
                            // Schedule batch execution
                            var delay = _this.options.batchDelay || 10;
                            _this.batchTimer = setTimeout(function () {
                                _this.executeBatch();
                            }, delay);
                        }
                    })];
            });
        });
    };
    /**
     * Load multiple values by keys.
     */
    BatchLoader.prototype.loadMany = function (keys) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, Promise.all(keys.map(function (key) { return _this.load(key); }))];
            });
        });
    };
    /**
     * Execute batched load.
     */
    BatchLoader.prototype.executeBatch = function () {
        return __awaiter(this, void 0, void 0, function () {
            var batch, keys, results, cacheTtl, _i, batch_1, item, value, error_1, _a, batch_2, item;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.queue.length === 0) {
                            return [2 /*return*/];
                        }
                        batch = this.queue.splice(0, this.queue.length);
                        this.batchTimer = null;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        keys = batch.map(function (item) { return item.key; });
                        return [4 /*yield*/, this.loaderFn(keys)];
                    case 2:
                        results = _b.sent();
                        cacheTtl = this.options.cacheTtl || 60000;
                        for (_i = 0, batch_1 = batch; _i < batch_1.length; _i++) {
                            item = batch_1[_i];
                            value = results.get(item.key);
                            if (this.options.cache && value !== undefined) {
                                this.cache.set(item.key, {
                                    value: value,
                                    expiresAt: Date.now() + cacheTtl,
                                });
                            }
                            item.resolve(value);
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _b.sent();
                        // Reject all items in batch
                        for (_a = 0, batch_2 = batch; _a < batch_2.length; _a++) {
                            item = batch_2[_a];
                            item.reject(error_1);
                        }
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clear cache.
     */
    BatchLoader.prototype.clearCache = function () {
        this.cache.clear();
    };
    /**
     * Prime cache with a value.
     */
    BatchLoader.prototype.prime = function (key, value) {
        if (this.options.cache) {
            var cacheTtl = this.options.cacheTtl || 60000;
            this.cache.set(key, {
                value: value,
                expiresAt: Date.now() + cacheTtl,
            });
        }
    };
    return BatchLoader;
}());
/**
 * Relationship loader for a schema.
 */
var RelationshipLoader = /** @class */ (function () {
    function RelationshipLoader(schema, context) {
        this.schema = schema;
        this.context = context;
        this.loaders = new Map();
    }
    /**
     * Load a has-one relationship.
     *
     * @param relationshipName - Relationship name
     * @param record - Parent record
     * @returns Related record or undefined
     *
     * @example
     * ```typescript
     * const user = await userQuery.get('user-123').execute();
     * const profile = await loader.loadHasOne('profile', user);
     * ```
     */
    RelationshipLoader.prototype.loadHasOne = function (relationshipName, record) {
        return __awaiter(this, void 0, void 0, function () {
            var relationship, loader, localKey, foreignKeyValue, results;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        relationship = (_a = this.schema.relationships) === null || _a === void 0 ? void 0 : _a[relationshipName];
                        if (!relationship || relationship.type !== 'hasOne') {
                            throw new Error("Has-one relationship '".concat(relationshipName, "' not found"));
                        }
                        loader = this.getOrCreateLoader(relationship.target, relationship.foreignKey);
                        localKey = relationship.localKey || 'id';
                        foreignKeyValue = record[localKey];
                        if (!foreignKeyValue) {
                            return [2 /*return*/, undefined];
                        }
                        return [4 /*yield*/, loader.load(foreignKeyValue)];
                    case 1:
                        results = _b.sent();
                        return [2 /*return*/, Array.isArray(results) ? results[0] : results];
                }
            });
        });
    };
    /**
     * Load a has-many relationship.
     *
     * @param relationshipName - Relationship name
     * @param record - Parent record
     * @returns Array of related records
     *
     * @example
     * ```typescript
     * const user = await userQuery.get('user-123').execute();
     * const posts = await loader.loadHasMany('posts', user);
     * ```
     */
    RelationshipLoader.prototype.loadHasMany = function (relationshipName, record) {
        return __awaiter(this, void 0, void 0, function () {
            var relationship, loader, localKey, foreignKeyValue, results;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        relationship = (_a = this.schema.relationships) === null || _a === void 0 ? void 0 : _a[relationshipName];
                        if (!relationship || relationship.type !== 'hasMany') {
                            throw new Error("Has-many relationship '".concat(relationshipName, "' not found"));
                        }
                        loader = this.getOrCreateLoader(relationship.target, relationship.foreignKey);
                        localKey = relationship.localKey || 'id';
                        foreignKeyValue = record[localKey];
                        if (!foreignKeyValue) {
                            return [2 /*return*/, []];
                        }
                        return [4 /*yield*/, loader.load(foreignKeyValue)];
                    case 1:
                        results = _b.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : results ? [results] : []];
                }
            });
        });
    };
    /**
     * Load a belongs-to relationship.
     *
     * @param relationshipName - Relationship name
     * @param record - Child record
     * @returns Related record or undefined
     *
     * @example
     * ```typescript
     * const post = await postQuery.get('post-123').execute();
     * const author = await loader.loadBelongsTo('author', post);
     * ```
     */
    RelationshipLoader.prototype.loadBelongsTo = function (relationshipName, record) {
        return __awaiter(this, void 0, void 0, function () {
            var relationship, loader, foreignKeyValue, results;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        relationship = (_a = this.schema.relationships) === null || _a === void 0 ? void 0 : _a[relationshipName];
                        if (!relationship || relationship.type !== 'belongsTo') {
                            throw new Error("Belongs-to relationship '".concat(relationshipName, "' not found"));
                        }
                        loader = this.getOrCreateLoader(relationship.target, 'id');
                        foreignKeyValue = record[relationship.foreignKey];
                        if (!foreignKeyValue) {
                            return [2 /*return*/, undefined];
                        }
                        return [4 /*yield*/, loader.load(foreignKeyValue)];
                    case 1:
                        results = _b.sent();
                        return [2 /*return*/, Array.isArray(results) ? results[0] : results];
                }
            });
        });
    };
    /**
     * Load a many-to-many relationship.
     *
     * @param relationshipName - Relationship name
     * @param record - Record
     * @returns Array of related records
     *
     * @example
     * ```typescript
     * const post = await postQuery.get('post-123').execute();
     * const categories = await loader.loadManyToMany('categories', post);
     * ```
     */
    RelationshipLoader.prototype.loadManyToMany = function (relationshipName, record) {
        return __awaiter(this, void 0, void 0, function () {
            var relationship, throughLoader, foreignKeyValue, joinRecords, joinArray, targetLoader, targetKey, targetIds, targetRecords;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        relationship = (_a = this.schema.relationships) === null || _a === void 0 ? void 0 : _a[relationshipName];
                        if (!relationship || relationship.type !== 'manyToMany') {
                            throw new Error("Many-to-many relationship '".concat(relationshipName, "' not found"));
                        }
                        throughLoader = this.getOrCreateLoader(relationship.through, relationship.foreignKey || "".concat(this.schema.name.toLowerCase(), "Id"));
                        foreignKeyValue = record.id;
                        if (!foreignKeyValue) {
                            return [2 /*return*/, []];
                        }
                        return [4 /*yield*/, throughLoader.load(foreignKeyValue)];
                    case 1:
                        joinRecords = _b.sent();
                        joinArray = Array.isArray(joinRecords) ? joinRecords : joinRecords ? [joinRecords] : [];
                        if (joinArray.length === 0) {
                            return [2 /*return*/, []];
                        }
                        targetLoader = this.getOrCreateLoader(relationship.target, 'id');
                        targetKey = relationship.targetKey || "".concat(relationship.target.toLowerCase(), "Id");
                        targetIds = joinArray.map(function (join) { return join[targetKey]; }).filter(Boolean);
                        if (targetIds.length === 0) {
                            return [2 /*return*/, []];
                        }
                        return [4 /*yield*/, targetLoader.loadMany(targetIds)];
                    case 2:
                        targetRecords = _b.sent();
                        return [2 /*return*/, targetRecords.filter(Boolean).flat()];
                }
            });
        });
    };
    /**
     * Load a polymorphic relationship.
     *
     * @param relationshipName - Relationship name
     * @param record - Record
     * @returns Related record or undefined
     *
     * @example
     * ```typescript
     * const comment = await commentQuery.get('comment-123').execute();
     * const commentable = await loader.loadPolymorphic('commentable', comment);
     * ```
     */
    RelationshipLoader.prototype.loadPolymorphic = function (relationshipName, record) {
        return __awaiter(this, void 0, void 0, function () {
            var relationship, typeValue, foreignKeyValue, targetSchema, loader, results;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        relationship = (_a = this.schema.relationships) === null || _a === void 0 ? void 0 : _a[relationshipName];
                        if (!relationship || relationship.type !== 'polymorphic') {
                            throw new Error("Polymorphic relationship '".concat(relationshipName, "' not found"));
                        }
                        typeValue = record[relationship.typeField];
                        foreignKeyValue = record[relationship.foreignKey];
                        if (!typeValue || !foreignKeyValue) {
                            return [2 /*return*/, undefined];
                        }
                        targetSchema = relationship.targets.find(function (target) { return target.toLowerCase() === typeValue.toLowerCase(); });
                        if (!targetSchema) {
                            return [2 /*return*/, undefined];
                        }
                        loader = this.getOrCreateLoader(targetSchema, 'id');
                        return [4 /*yield*/, loader.load(foreignKeyValue)];
                    case 1:
                        results = _b.sent();
                        return [2 /*return*/, Array.isArray(results) ? results[0] : results];
                }
            });
        });
    };
    /**
     * Load a relationship automatically based on type.
     *
     * @param relationshipName - Relationship name
     * @param record - Record
     * @returns Related record(s)
     *
     * @example
     * ```typescript
     * const user = await userQuery.get('user-123').execute();
     * const posts = await loader.load('posts', user);
     * ```
     */
    RelationshipLoader.prototype.load = function (relationshipName, record) {
        return __awaiter(this, void 0, void 0, function () {
            var relationship;
            var _a;
            return __generator(this, function (_b) {
                relationship = (_a = this.schema.relationships) === null || _a === void 0 ? void 0 : _a[relationshipName];
                if (!relationship) {
                    throw new Error("Relationship '".concat(relationshipName, "' not found"));
                }
                switch (relationship.type) {
                    case 'hasOne':
                        return [2 /*return*/, this.loadHasOne(relationshipName, record)];
                    case 'hasMany':
                        return [2 /*return*/, this.loadHasMany(relationshipName, record)];
                    case 'belongsTo':
                        return [2 /*return*/, this.loadBelongsTo(relationshipName, record)];
                    case 'manyToMany':
                        return [2 /*return*/, this.loadManyToMany(relationshipName, record)];
                    case 'polymorphic':
                        return [2 /*return*/, this.loadPolymorphic(relationshipName, record)];
                    default:
                        throw new Error("Unknown relationship type: ".concat(relationship.type));
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Load multiple relationships for a record.
     *
     * @param relationshipNames - Relationship names
     * @param record - Record
     * @returns Record with loaded relationships
     *
     * @example
     * ```typescript
     * const post = await postQuery.get('post-123').execute();
     * const withRelations = await loader.loadMany(['author', 'comments', 'categories'], post);
     * ```
     */
    RelationshipLoader.prototype.loadMany = function (relationshipNames, record) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = __assign({}, record);
                        return [4 /*yield*/, Promise.all(relationshipNames.map(function (name) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _a = result;
                                            _b = name;
                                            return [4 /*yield*/, this.load(name, record)];
                                        case 1:
                                            _a[_b] = _c.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Load relationships for multiple records.
     *
     * @param relationshipNames - Relationship names
     * @param records - Records
     * @returns Records with loaded relationships
     *
     * @example
     * ```typescript
     * const posts = await postQuery.list().execute();
     * const withRelations = await loader.loadManyForRecords(['author'], posts.data);
     * ```
     */
    RelationshipLoader.prototype.loadManyForRecords = function (relationshipNames, records) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, Promise.all(records.map(function (record) { return _this.loadMany(relationshipNames, record); }))];
            });
        });
    };
    /**
     * Clear all loader caches.
     */
    RelationshipLoader.prototype.clearCache = function () {
        for (var _i = 0, _a = this.loaders.values(); _i < _a.length; _i++) {
            var loader = _a[_i];
            loader.clearCache();
        }
    };
    /**
     * Get or create a batch loader for a relationship.
     */
    RelationshipLoader.prototype.getOrCreateLoader = function (targetSchema, foreignKey) {
        var _this = this;
        var loaderKey = "".concat(targetSchema, ":").concat(foreignKey);
        var loader = this.loaders.get(loaderKey);
        if (!loader) {
            // Create default loader function
            var loaderFn = function (keys) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // Placeholder - actual implementation would query database
                    console.warn("No custom loader provided for ".concat(targetSchema, ".").concat(foreignKey, ", returning empty results"));
                    return [2 /*return*/, new Map()];
                });
            }); };
            loader = new BatchLoader(loaderFn, this.context.batchOptions);
            this.loaders.set(loaderKey, loader);
        }
        return loader;
    };
    /**
     * Register a custom loader for a relationship.
     *
     * @param targetSchema - Target schema name
     * @param foreignKey - Foreign key field
     * @param loaderFn - Custom loader function
     *
     * @example
     * ```typescript
     * loader.registerLoader('Post', 'authorId', async (authorIds) => {
     *   const posts = await database.query('SELECT * FROM posts WHERE authorId IN (?)', [authorIds]);
     *   const grouped = new Map();
     *   for (const post of posts) {
     *     const existing = grouped.get(post.authorId) || [];
     *     existing.push(post);
     *     grouped.set(post.authorId, existing);
     *   }
     *   return grouped;
     * });
     * ```
     */
    RelationshipLoader.prototype.registerLoader = function (targetSchema, foreignKey, loaderFn) {
        var loaderKey = "".concat(targetSchema, ":").concat(foreignKey);
        var loader = new BatchLoader(loaderFn, this.context.batchOptions);
        this.loaders.set(loaderKey, loader);
    };
    return RelationshipLoader;
}());
exports.RelationshipLoader = RelationshipLoader;
/**
 * Create a relationship loader for a schema.
 *
 * @param schema - Schema definition
 * @param context - Loader context
 * @returns Relationship loader instance
 *
 * @example
 * ```typescript
 * const loader = createRelationshipLoader(UserSchema, {
 *   schemaRegistry: globalSchemaRegistry,
 *   batchOptions: {
 *     maxBatchSize: 100,
 *     batchDelay: 10,
 *     cache: true,
 *     cacheTtl: 60000
 *   }
 * });
 *
 * const user = await userQuery.get('user-123').execute();
 * const posts = await loader.loadHasMany('posts', user);
 * ```
 */
function createRelationshipLoader(schema, context) {
    return new RelationshipLoader(schema, context);
}
