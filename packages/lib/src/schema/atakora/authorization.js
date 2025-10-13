"use strict";
/**
 * Authorization rule builder for schema definitions.
 *
 * @remarks
 * Provides declarative authorization rules that integrate with
 * the authorization middleware in Azure Functions.
 *
 * @packageDocumentation
 */
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
exports.allow = exports.AuthRuleBuilder = void 0;
exports.evaluateAuthorizationRule = evaluateAuthorizationRule;
exports.toFunctionAuthConfig = toFunctionAuthConfig;
exports.validateAuthorizationRules = validateAuthorizationRules;
/**
 * Authorization rule builder with composable methods.
 */
var AuthRuleBuilder = /** @class */ (function () {
    function AuthRuleBuilder(config) {
        this.config = config;
    }
    /**
     * Allow public access (no authentication required).
     */
    AuthRuleBuilder.public = function () {
        return new AuthRuleBuilder({
            type: 'public',
        });
    };
    /**
     * Require authentication (any authenticated user).
     */
    AuthRuleBuilder.authenticated = function () {
        return new AuthRuleBuilder({
            type: 'authenticated',
        });
    };
    /**
     * Owner-based authorization (user owns the record).
     *
     * @param ownerField - Field name containing the owner ID
     */
    AuthRuleBuilder.owner = function (ownerField) {
        return new AuthRuleBuilder({
            type: 'owner',
            ownerField: ownerField,
        });
    };
    /**
     * Role-based authorization (user has specific role).
     *
     * @param role - Required role
     */
    AuthRuleBuilder.role = function (role) {
        return new AuthRuleBuilder({
            type: 'role',
            role: role,
        });
    };
    /**
     * Role-based authorization (user has any of the specified roles).
     *
     * @param roles - Array of acceptable roles
     */
    AuthRuleBuilder.roles = function (roles) {
        return new AuthRuleBuilder({
            type: 'role',
            roles: roles,
        });
    };
    /**
     * Group-based authorization (user is member of specific group).
     *
     * @param group - Azure AD group ID
     */
    AuthRuleBuilder.group = function (group) {
        return new AuthRuleBuilder({
            type: 'group',
            group: group,
        });
    };
    /**
     * Group-based authorization (user is member of any specified group).
     *
     * @param groups - Array of Azure AD group IDs
     */
    AuthRuleBuilder.groups = function (groups) {
        return new AuthRuleBuilder({
            type: 'group',
            groups: groups,
        });
    };
    /**
     * Custom authorization logic.
     *
     * @param fn - Custom authorization function
     */
    AuthRuleBuilder.custom = function (fn) {
        return new AuthRuleBuilder({
            type: 'custom',
            custom: fn,
        });
    };
    /**
     * Conditional authorization based on a condition.
     *
     * @param fn - Condition function
     */
    AuthRuleBuilder.if = function (fn) {
        return new AuthRuleBuilder({
            type: 'custom',
            custom: fn,
        });
    };
    /**
     * Combine with another rule using AND logic.
     *
     * @param other - Other authorization rule
     */
    AuthRuleBuilder.prototype.and = function (other) {
        var otherConfig = other instanceof AuthRuleBuilder ? other.build() : other;
        return new AuthRuleBuilder({
            type: 'custom',
            and: [this.config, otherConfig],
        });
    };
    /**
     * Combine with another rule using OR logic.
     *
     * @param other - Other authorization rule
     */
    AuthRuleBuilder.prototype.or = function (other) {
        var otherConfig = other instanceof AuthRuleBuilder ? other.build() : other;
        return new AuthRuleBuilder({
            type: 'custom',
            or: [this.config, otherConfig],
        });
    };
    /**
     * Negate the rule.
     */
    AuthRuleBuilder.prototype.not = function () {
        return new AuthRuleBuilder({
            type: 'custom',
            not: this.config,
        });
    };
    /**
     * Build the authorization rule configuration.
     */
    AuthRuleBuilder.prototype.build = function () {
        return this.config;
    };
    return AuthRuleBuilder;
}());
exports.AuthRuleBuilder = AuthRuleBuilder;
/**
 * Authorization rule helpers (exported as `allow` for schema definitions).
 */
exports.allow = {
    /**
     * Allow public access (no authentication required).
     */
    public: function () { return AuthRuleBuilder.public().build(); },
    /**
     * Require authentication (any authenticated user).
     */
    authenticated: function () { return AuthRuleBuilder.authenticated().build(); },
    /**
     * Owner-based authorization (user owns the record).
     *
     * @param ownerField - Field name containing the owner ID
     */
    owner: function (ownerField) { return AuthRuleBuilder.owner(ownerField).build(); },
    /**
     * Role-based authorization (user has specific role).
     *
     * @param role - Required role
     */
    role: function (role) { return AuthRuleBuilder.role(role).build(); },
    /**
     * Role-based authorization (user has any of the specified roles).
     *
     * @param roles - Array of acceptable roles
     */
    roles: function (roles) { return AuthRuleBuilder.roles(roles).build(); },
    /**
     * Group-based authorization (user is member of specific group).
     *
     * @param group - Azure AD group ID
     */
    group: function (group) { return AuthRuleBuilder.group(group).build(); },
    /**
     * Group-based authorization (user is member of any specified group).
     *
     * @param groups - Array of Azure AD group IDs
     */
    groups: function (groups) { return AuthRuleBuilder.groups(groups).build(); },
    /**
     * Custom authorization logic.
     *
     * @param fn - Custom authorization function
     */
    custom: function (fn) { return AuthRuleBuilder.custom(fn).build(); },
    /**
     * Conditional authorization based on a condition.
     *
     * @param fn - Condition function
     */
    if: function (fn) { return AuthRuleBuilder.if(fn).build(); },
};
/**
 * Evaluate an authorization rule.
 *
 * @param rule - Authorization rule to evaluate
 * @param context - Authorization context
 * @param record - Record being accessed (optional)
 * @returns Authorization result
 */
function evaluateAuthorizationRule(rule, context, record) {
    return __awaiter(this, void 0, void 0, function () {
        var config, _a, results, results, result;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!(typeof rule === 'function')) return [3 /*break*/, 2];
                    return [4 /*yield*/, rule(context, record)];
                case 1: return [2 /*return*/, _d.sent()];
                case 2:
                    config = rule;
                    _a = config.type;
                    switch (_a) {
                        case 'public': return [3 /*break*/, 3];
                        case 'authenticated': return [3 /*break*/, 4];
                        case 'owner': return [3 /*break*/, 5];
                        case 'role': return [3 /*break*/, 6];
                        case 'group': return [3 /*break*/, 7];
                        case 'custom': return [3 /*break*/, 8];
                    }
                    return [3 /*break*/, 17];
                case 3: return [2 /*return*/, true];
                case 4: return [2 /*return*/, !!context.user];
                case 5:
                    if (!context.user || !record || !config.ownerField) {
                        return [2 /*return*/, false];
                    }
                    return [2 /*return*/, record[config.ownerField] === context.user.id];
                case 6:
                    if (!((_b = context.user) === null || _b === void 0 ? void 0 : _b.roles)) {
                        return [2 /*return*/, false];
                    }
                    if (config.role) {
                        return [2 /*return*/, context.user.roles.includes(config.role)];
                    }
                    if (config.roles) {
                        return [2 /*return*/, config.roles.some(function (role) { return context.user.roles.includes(role); })];
                    }
                    return [2 /*return*/, false];
                case 7:
                    if (!((_c = context.user) === null || _c === void 0 ? void 0 : _c.groups)) {
                        return [2 /*return*/, false];
                    }
                    if (config.group) {
                        return [2 /*return*/, context.user.groups.includes(config.group)];
                    }
                    if (config.groups) {
                        return [2 /*return*/, config.groups.some(function (group) { return context.user.groups.includes(group); })];
                    }
                    return [2 /*return*/, false];
                case 8:
                    if (!config.and) return [3 /*break*/, 10];
                    return [4 /*yield*/, Promise.all(config.and.map(function (r) { return evaluateAuthorizationRule(r, context, record); }))];
                case 9:
                    results = _d.sent();
                    return [2 /*return*/, results.every(function (r) { return r; })];
                case 10:
                    if (!config.or) return [3 /*break*/, 12];
                    return [4 /*yield*/, Promise.all(config.or.map(function (r) { return evaluateAuthorizationRule(r, context, record); }))];
                case 11:
                    results = _d.sent();
                    return [2 /*return*/, results.some(function (r) { return r; })];
                case 12:
                    if (!config.not) return [3 /*break*/, 14];
                    return [4 /*yield*/, evaluateAuthorizationRule(config.not, context, record)];
                case 13:
                    result = _d.sent();
                    return [2 /*return*/, !result];
                case 14:
                    if (!config.custom) return [3 /*break*/, 16];
                    return [4 /*yield*/, config.custom(context, record)];
                case 15: return [2 /*return*/, _d.sent()];
                case 16: return [2 /*return*/, false];
                case 17: return [2 /*return*/, false];
            }
        });
    });
}
/**
 * Convert schema authorization rule to Function middleware authorization config.
 *
 * @param rule - Schema authorization rule
 * @returns Function middleware authorization config
 */
function toFunctionAuthConfig(rule) {
    var _this = this;
    // This will be implemented to bridge schema auth rules with Function middleware
    // For now, return the rule as-is
    return {
        rule: function (context, record) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, evaluateAuthorizationRule(rule, context, record)];
            });
        }); },
    };
}
/**
 * Validate authorization rules in a schema.
 *
 * @param rules - Authorization rules object
 * @returns Validation result
 */
function validateAuthorizationRules(rules) {
    var errors = [];
    var validOperations = ['create', 'read', 'update', 'delete', 'list', 'fields'];
    for (var _i = 0, _a = Object.entries(rules); _i < _a.length; _i++) {
        var _b = _a[_i], operation = _b[0], rule = _b[1];
        if (!validOperations.includes(operation)) {
            errors.push("Invalid authorization operation: '".concat(operation, "'"));
            continue;
        }
        if (operation === 'fields') {
            // Validate field-level rules
            if (typeof rule !== 'object' || Array.isArray(rule)) {
                errors.push("Field-level authorization must be an object");
            }
        }
        else {
            // Validate operation-level rules
            if (typeof rule !== 'function' && typeof rule !== 'object') {
                errors.push("Authorization rule for '".concat(operation, "' must be a function or config object"));
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors: errors,
    };
}
