"use strict";
/**
 * Type-safe mutation builder for Atakora schemas.
 *
 * @remarks
 * Provides a fluent API for building mutations (create, update, delete)
 * with Zod validation and authorization checks.
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
exports.MutationBuilder = void 0;
exports.createMutationBuilder = createMutationBuilder;
var authorization_1 = require("../schema/atakora/authorization");
/**
 * Type-safe mutation builder for a schema.
 */
var MutationBuilder = /** @class */ (function () {
    function MutationBuilder(schema, authContext) {
        this.schema = schema;
        this.authContext = authContext;
    }
    /**
     * Create a new record.
     *
     * @param data - Record data
     * @returns Mutation result
     *
     * @example
     * ```typescript
     * const result = await userMutation.create({
     *   email: 'user@example.com',
     *   name: 'John Doe',
     *   role: 'user'
     * });
     * ```
     */
    MutationBuilder.prototype.create = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var authorized, hookContext, validation, customValidation, hookContext, error_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 10, , 11]);
                        if (!this.authContext) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.checkAuthorization('create')];
                    case 1:
                        authorized = _c.sent();
                        if (!authorized) {
                            return [2 /*return*/, {
                                    success: false,
                                    errors: [
                                        {
                                            message: 'Unauthorized to create this resource',
                                            code: 'UNAUTHORIZED',
                                        },
                                    ],
                                }];
                        }
                        _c.label = 2;
                    case 2:
                        if (!((_a = this.schema.hooks) === null || _a === void 0 ? void 0 : _a.beforeCreate)) return [3 /*break*/, 4];
                        hookContext = {
                            operation: 'create',
                            auth: this.authContext,
                        };
                        return [4 /*yield*/, this.schema.hooks.beforeCreate(data, hookContext)];
                    case 3:
                        data = _c.sent();
                        _c.label = 4;
                    case 4: return [4 /*yield*/, this.validate(data)];
                    case 5:
                        validation = _c.sent();
                        if (!validation.success) {
                            return [2 /*return*/, {
                                    success: false,
                                    errors: validation.errors,
                                }];
                        }
                        if (!this.schema.validation) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.runCustomValidation(data, 'create')];
                    case 6:
                        customValidation = _c.sent();
                        if (!customValidation.success) {
                            return [2 /*return*/, {
                                    success: false,
                                    errors: customValidation.errors,
                                }];
                        }
                        _c.label = 7;
                    case 7:
                        if (!((_b = this.schema.hooks) === null || _b === void 0 ? void 0 : _b.afterCreate)) return [3 /*break*/, 9];
                        hookContext = {
                            operation: 'create',
                            auth: this.authContext,
                        };
                        return [4 /*yield*/, this.schema.hooks.afterCreate(data, hookContext)];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9: 
                    // Placeholder for actual creation
                    return [2 /*return*/, {
                            success: true,
                            data: data,
                        }];
                    case 10:
                        error_1 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                errors: [
                                    {
                                        message: error_1 instanceof Error ? error_1.message : 'Unknown error',
                                        code: 'INTERNAL_ERROR',
                                    },
                                ],
                            }];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update an existing record.
     *
     * @param id - Record ID
     * @param data - Updated data
     * @returns Mutation result
     *
     * @example
     * ```typescript
     * const result = await userMutation.update('user-123', {
     *   name: 'Jane Doe',
     *   bio: 'Updated bio'
     * });
     * ```
     */
    MutationBuilder.prototype.update = function (id, data) {
        return __awaiter(this, void 0, void 0, function () {
            var authorized, existing, hookContext, validation, customValidation, hookContext, error_2;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 10, , 11]);
                        if (!this.authContext) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.checkAuthorization('update', { id: id })];
                    case 1:
                        authorized = _c.sent();
                        if (!authorized) {
                            return [2 /*return*/, {
                                    success: false,
                                    errors: [
                                        {
                                            message: 'Unauthorized to update this resource',
                                            code: 'UNAUTHORIZED',
                                        },
                                    ],
                                }];
                        }
                        _c.label = 2;
                    case 2:
                        existing = { id: id };
                        if (!((_a = this.schema.hooks) === null || _a === void 0 ? void 0 : _a.beforeUpdate)) return [3 /*break*/, 4];
                        hookContext = {
                            operation: 'update',
                            auth: this.authContext,
                            existing: existing,
                        };
                        return [4 /*yield*/, this.schema.hooks.beforeUpdate(data, hookContext)];
                    case 3:
                        data = _c.sent();
                        _c.label = 4;
                    case 4: return [4 /*yield*/, this.validate(data, true)];
                    case 5:
                        validation = _c.sent();
                        if (!validation.success) {
                            return [2 /*return*/, {
                                    success: false,
                                    errors: validation.errors,
                                }];
                        }
                        if (!this.schema.validation) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.runCustomValidation(data, 'update', existing)];
                    case 6:
                        customValidation = _c.sent();
                        if (!customValidation.success) {
                            return [2 /*return*/, {
                                    success: false,
                                    errors: customValidation.errors,
                                }];
                        }
                        _c.label = 7;
                    case 7:
                        if (!((_b = this.schema.hooks) === null || _b === void 0 ? void 0 : _b.afterUpdate)) return [3 /*break*/, 9];
                        hookContext = {
                            operation: 'update',
                            auth: this.authContext,
                            existing: existing,
                        };
                        return [4 /*yield*/, this.schema.hooks.afterUpdate(data, hookContext)];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9: 
                    // Placeholder for actual update
                    return [2 /*return*/, {
                            success: true,
                            data: __assign(__assign({}, existing), data),
                        }];
                    case 10:
                        error_2 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                errors: [
                                    {
                                        message: error_2 instanceof Error ? error_2.message : 'Unknown error',
                                        code: 'INTERNAL_ERROR',
                                    },
                                ],
                            }];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete a record.
     *
     * @param id - Record ID
     * @returns Mutation result
     *
     * @example
     * ```typescript
     * const result = await userMutation.delete('user-123');
     * ```
     */
    MutationBuilder.prototype.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var authorized, existing, hookContext, hookContext, error_3;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 7, , 8]);
                        if (!this.authContext) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.checkAuthorization('delete', { id: id })];
                    case 1:
                        authorized = _c.sent();
                        if (!authorized) {
                            return [2 /*return*/, {
                                    success: false,
                                    errors: [
                                        {
                                            message: 'Unauthorized to delete this resource',
                                            code: 'UNAUTHORIZED',
                                        },
                                    ],
                                }];
                        }
                        _c.label = 2;
                    case 2:
                        existing = { id: id };
                        if (!((_a = this.schema.hooks) === null || _a === void 0 ? void 0 : _a.beforeDelete)) return [3 /*break*/, 4];
                        hookContext = {
                            operation: 'delete',
                            auth: this.authContext,
                            existing: existing,
                        };
                        return [4 /*yield*/, this.schema.hooks.beforeDelete(existing, hookContext)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4:
                        if (!((_b = this.schema.hooks) === null || _b === void 0 ? void 0 : _b.afterDelete)) return [3 /*break*/, 6];
                        hookContext = {
                            operation: 'delete',
                            auth: this.authContext,
                            existing: existing,
                        };
                        return [4 /*yield*/, this.schema.hooks.afterDelete(existing, hookContext)];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6: 
                    // Placeholder for actual deletion
                    return [2 /*return*/, {
                            success: true,
                            data: { id: id },
                        }];
                    case 7:
                        error_3 = _c.sent();
                        return [2 /*return*/, {
                                success: false,
                                errors: [
                                    {
                                        message: error_3 instanceof Error ? error_3.message : 'Unknown error',
                                        code: 'INTERNAL_ERROR',
                                    },
                                ],
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate GraphQL mutation for create.
     *
     * @param data - Record data
     * @returns GraphQL mutation
     *
     * @example
     * ```typescript
     * const { mutation, variables } = userMutation.toGraphQLCreate({
     *   email: 'user@example.com',
     *   name: 'John Doe'
     * });
     * ```
     */
    MutationBuilder.prototype.toGraphQLCreate = function (data) {
        var entityName = this.schema.name;
        var operationName = "create".concat(entityName);
        var mutation = "\n      mutation ".concat(operationName, "($input: Create").concat(entityName, "Input!) {\n        ").concat(operationName.charAt(0).toLowerCase() + operationName.slice(1), "(input: $input) {\n          ").concat(this.buildFieldSelection(), "\n        }\n      }\n    ").trim();
        return {
            mutation: mutation,
            variables: { input: data },
        };
    };
    /**
     * Generate GraphQL mutation for update.
     *
     * @param id - Record ID
     * @param data - Updated data
     * @returns GraphQL mutation
     *
     * @example
     * ```typescript
     * const { mutation, variables } = userMutation.toGraphQLUpdate('user-123', {
     *   name: 'Jane Doe'
     * });
     * ```
     */
    MutationBuilder.prototype.toGraphQLUpdate = function (id, data) {
        var entityName = this.schema.name;
        var operationName = "update".concat(entityName);
        var mutation = "\n      mutation ".concat(operationName, "($id: ID!, $input: Update").concat(entityName, "Input!) {\n        ").concat(operationName.charAt(0).toLowerCase() + operationName.slice(1), "(id: $id, input: $input) {\n          ").concat(this.buildFieldSelection(), "\n        }\n      }\n    ").trim();
        return {
            mutation: mutation,
            variables: { id: id, input: data },
        };
    };
    /**
     * Generate GraphQL mutation for delete.
     *
     * @param id - Record ID
     * @returns GraphQL mutation
     *
     * @example
     * ```typescript
     * const { mutation, variables } = userMutation.toGraphQLDelete('user-123');
     * ```
     */
    MutationBuilder.prototype.toGraphQLDelete = function (id) {
        var entityName = this.schema.name;
        var operationName = "delete".concat(entityName);
        var mutation = "\n      mutation ".concat(operationName, "($id: ID!) {\n        ").concat(operationName.charAt(0).toLowerCase() + operationName.slice(1), "(id: $id) {\n          id\n        }\n      }\n    ").trim();
        return {
            mutation: mutation,
            variables: { id: id },
        };
    };
    /**
     * Set authorization context.
     *
     * @param context - Authorization context
     * @returns Mutation builder for chaining
     */
    MutationBuilder.prototype.withAuth = function (context) {
        return new MutationBuilder(this.schema, context);
    };
    /**
     * Validate data against schema.
     */
    MutationBuilder.prototype.validate = function (data_1) {
        return __awaiter(this, arguments, void 0, function (data, partial) {
            var schema, error_4, zodErrors;
            if (partial === void 0) { partial = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        schema = partial ? this.schema.fields.partial() : this.schema.fields;
                        return [4 /*yield*/, schema.parseAsync(data)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                    case 2:
                        error_4 = _a.sent();
                        if (error_4 instanceof Error && 'errors' in error_4) {
                            zodErrors = error_4.errors;
                            return [2 /*return*/, {
                                    success: false,
                                    errors: zodErrors.map(function (err) { return ({
                                        field: err.path.join('.'),
                                        message: err.message,
                                        code: err.code,
                                    }); }),
                                }];
                        }
                        return [2 /*return*/, {
                                success: false,
                                errors: [
                                    {
                                        message: error_4 instanceof Error ? error_4.message : 'Validation failed',
                                        code: 'VALIDATION_ERROR',
                                    },
                                ],
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Run custom validation rules.
     */
    MutationBuilder.prototype.runCustomValidation = function (data, operation, existing) {
        return __awaiter(this, void 0, void 0, function () {
            var errors, _i, _a, _b, field, validator, value, result;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        errors = [];
                        if (!this.schema.validation) {
                            return [2 /*return*/, { success: true }];
                        }
                        _i = 0, _a = Object.entries(this.schema.validation);
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        _b = _a[_i], field = _b[0], validator = _b[1];
                        if (!(field in data)) return [3 /*break*/, 3];
                        value = data[field];
                        return [4 /*yield*/, validator(value, data, {
                                field: field,
                                operation: operation,
                                existing: existing,
                            })];
                    case 2:
                        result = _c.sent();
                        if (!result.valid) {
                            errors.push({
                                field: field,
                                message: result.message || 'Validation failed',
                                code: result.code || 'CUSTOM_VALIDATION_ERROR',
                            });
                        }
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, {
                            success: errors.length === 0,
                            errors: errors.length > 0 ? errors : undefined,
                        }];
                }
            });
        });
    };
    /**
     * Check authorization for an operation.
     */
    MutationBuilder.prototype.checkAuthorization = function (operation, record) {
        return __awaiter(this, void 0, void 0, function () {
            var rule;
            var _a;
            return __generator(this, function (_b) {
                if (!this.authContext) {
                    return [2 /*return*/, true];
                }
                rule = (_a = this.schema.authorization) === null || _a === void 0 ? void 0 : _a[operation];
                if (!rule) {
                    return [2 /*return*/, true]; // No rule means allowed
                }
                return [2 /*return*/, (0, authorization_1.evaluateAuthorizationRule)(rule, this.authContext, record)];
            });
        });
    };
    /**
     * Build field selection for GraphQL response.
     */
    MutationBuilder.prototype.buildFieldSelection = function () {
        var shape = this.schema.fields.shape;
        var fields = Object.keys(shape);
        return fields.join('\n');
    };
    return MutationBuilder;
}());
exports.MutationBuilder = MutationBuilder;
/**
 * Create a mutation builder for a schema.
 *
 * @param schema - Schema definition
 * @param authContext - Optional authorization context
 * @returns Mutation builder instance
 *
 * @example
 * ```typescript
 * const userMutation = createMutationBuilder(UserSchema, authContext);
 *
 * // Create
 * const createResult = await userMutation.create({
 *   email: 'user@example.com',
 *   name: 'John Doe'
 * });
 *
 * // Update
 * const updateResult = await userMutation.update('user-123', {
 *   name: 'Jane Doe'
 * });
 *
 * // Delete
 * const deleteResult = await userMutation.delete('user-123');
 * ```
 */
function createMutationBuilder(schema, authContext) {
    return new MutationBuilder(schema, authContext);
}
