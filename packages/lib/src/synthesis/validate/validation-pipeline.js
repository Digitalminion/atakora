"use strict";
/**
 * Validation pipeline orchestrator
 *
 * @remarks
 * Coordinates multi-layer validation in the correct order:
 * 1. Construct validation (done in constructors)
 * 2. Transformation validation (type-safe transforms)
 * 3. ARM structure validation
 * 4. Deployment sequence validation
 * 5. Schema validation
 *
 * Provides early exit on errors and configurable strictness levels.
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
exports.ValidationPipeline = exports.ValidationLevel = void 0;
var types_1 = require("../types");
var validator_registry_1 = require("./validator-registry");
/**
 * Validation level configuration
 */
var ValidationLevel;
(function (ValidationLevel) {
    /**
     * Lenient - only fail on critical errors
     */
    ValidationLevel["LENIENT"] = "lenient";
    /**
     * Normal - fail on errors, warn on issues
     */
    ValidationLevel["NORMAL"] = "normal";
    /**
     * Strict - treat warnings as errors
     */
    ValidationLevel["STRICT"] = "strict";
})(ValidationLevel || (exports.ValidationLevel = ValidationLevel = {}));
/**
 * Orchestrates multi-layer validation pipeline
 */
var ValidationPipeline = /** @class */ (function () {
    function ValidationPipeline(validatorRegistry) {
        this.validatorRegistry = validatorRegistry || new validator_registry_1.ValidatorRegistry();
    }
    /**
     * Run complete validation pipeline
     *
     * @param resources - Resources from construct tree
     * @param template - Generated ARM template
     * @param stackName - Name of the stack being validated
     * @param options - Validation options
     * @returns Aggregated validation result
     */
    ValidationPipeline.prototype.validate = function (resources, template, stackName, options) {
        return __awaiter(this, void 0, void 0, function () {
            var opts, layerResults, transformResult, structureResult, deploymentResult, schemaResult;
            var _this = this;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        opts = this.normalizeOptions(options);
                        layerResults = [];
                        if (!!((_a = opts.skip) === null || _a === void 0 ? void 0 : _a.transformation)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.runLayer('Transformation', function () {
                                return _this.validateTransformations(resources, template);
                            })];
                    case 1:
                        transformResult = _e.sent();
                        layerResults.push(transformResult);
                        // Early exit if errors found and strict mode
                        if (this.shouldEarlyExit(transformResult, opts)) {
                            return [2 /*return*/, this.aggregateResults(layerResults, stackName)];
                        }
                        _e.label = 2;
                    case 2:
                        if (!!((_b = opts.skip) === null || _b === void 0 ? void 0 : _b.structure)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.runLayer('ARM Structure', function () {
                                return _this.validateArmStructure(template);
                            })];
                    case 3:
                        structureResult = _e.sent();
                        layerResults.push(structureResult);
                        // Early exit if errors found and strict mode
                        if (this.shouldEarlyExit(structureResult, opts)) {
                            return [2 /*return*/, this.aggregateResults(layerResults, stackName)];
                        }
                        _e.label = 4;
                    case 4:
                        if (!!((_c = opts.skip) === null || _c === void 0 ? void 0 : _c.deployment)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.runLayer('Deployment Sequence', function () {
                                return _this.validateDeploymentSequence(template);
                            })];
                    case 5:
                        deploymentResult = _e.sent();
                        layerResults.push(deploymentResult);
                        // Early exit if errors found and strict mode
                        if (this.shouldEarlyExit(deploymentResult, opts)) {
                            return [2 /*return*/, this.aggregateResults(layerResults, stackName)];
                        }
                        _e.label = 6;
                    case 6:
                        if (!!((_d = opts.skip) === null || _d === void 0 ? void 0 : _d.schema)) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.runLayer('Schema', function () {
                                return _this.validateSchema(template, stackName);
                            })];
                    case 7:
                        schemaResult = _e.sent();
                        layerResults.push(schemaResult);
                        _e.label = 8;
                    case 8: return [2 /*return*/, this.aggregateResults(layerResults, stackName)];
                }
            });
        });
    };
    /**
     * Normalize validation options with defaults
     */
    ValidationPipeline.prototype.normalizeOptions = function (options) {
        var level = (options === null || options === void 0 ? void 0 : options.strict)
            ? ValidationLevel.STRICT
            : (options === null || options === void 0 ? void 0 : options.level) || ValidationLevel.NORMAL;
        return {
            level: level,
            strict: level === ValidationLevel.STRICT,
            skip: (options === null || options === void 0 ? void 0 : options.skip) || {},
        };
    };
    /**
     * Run a validation layer with timing
     */
    ValidationPipeline.prototype.runLayer = function (layerName, validator) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, result, duration, error_1, duration;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, validator()];
                    case 2:
                        result = _a.sent();
                        duration = Date.now() - startTime;
                        return [2 /*return*/, __assign(__assign({ layer: layerName }, result), { duration: duration })];
                    case 3:
                        error_1 = _a.sent();
                        duration = Date.now() - startTime;
                        return [2 /*return*/, {
                                layer: layerName,
                                errors: [
                                    {
                                        severity: types_1.ValidationSeverity.ERROR,
                                        message: "".concat(layerName, " validation failed: ").concat(error_1 instanceof Error ? error_1.message : String(error_1)),
                                        code: 'LAYER_FAILURE',
                                    },
                                ],
                                warnings: [],
                                duration: duration,
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if validation should exit early
     */
    ValidationPipeline.prototype.shouldEarlyExit = function (result, options) {
        // Always exit early on errors
        if (result.errors.length > 0) {
            return true;
        }
        // In strict mode, exit on warnings too
        if (options.strict && result.warnings.length > 0) {
            return true;
        }
        return false;
    };
    /**
     * Layer 2: Validate transformations
     *
     * @remarks
     * Validates that resources were correctly transformed to ARM format.
     * This layer checks for type-safe transformation errors.
     */
    ValidationPipeline.prototype.validateTransformations = function (resources, template) {
        return __awaiter(this, void 0, void 0, function () {
            var errors, warnings, _i, _a, armResource;
            return __generator(this, function (_b) {
                errors = [];
                warnings = [];
                // Check that all resources have valid ARM structure
                for (_i = 0, _a = template.resources; _i < _a.length; _i++) {
                    armResource = _a[_i];
                    // Validate required ARM properties
                    if (!armResource.type) {
                        errors.push({
                            severity: types_1.ValidationSeverity.ERROR,
                            message: "Resource missing required \"type\" property",
                            path: armResource.name || 'unknown',
                            code: 'MISSING_TYPE',
                        });
                    }
                    if (!armResource.apiVersion) {
                        errors.push({
                            severity: types_1.ValidationSeverity.ERROR,
                            message: "Resource '".concat(armResource.name, "' missing required \"apiVersion\" property"),
                            path: armResource.name || 'unknown',
                            code: 'MISSING_API_VERSION',
                        });
                    }
                    if (!armResource.name) {
                        errors.push({
                            severity: types_1.ValidationSeverity.ERROR,
                            message: "Resource missing required \"name\" property",
                            path: armResource.type || 'unknown',
                            code: 'MISSING_NAME',
                        });
                    }
                    // Validate properties wrapper exists for resources that need it
                    if (this.requiresProperties(armResource.type) && !armResource.properties) {
                        warnings.push({
                            severity: types_1.ValidationSeverity.WARNING,
                            message: "Resource '".concat(armResource.name, "' of type '").concat(armResource.type, "' typically requires a \"properties\" object"),
                            path: armResource.name,
                            code: 'MISSING_PROPERTIES',
                            suggestion: 'Add a properties object with resource-specific configuration',
                        });
                    }
                }
                // Validate resource count matches
                if (template.resources.length !== resources.length) {
                    warnings.push({
                        severity: types_1.ValidationSeverity.WARNING,
                        message: "Resource count mismatch: ".concat(resources.length, " constructs transformed to ").concat(template.resources.length, " ARM resources"),
                        code: 'RESOURCE_COUNT_MISMATCH',
                    });
                }
                return [2 /*return*/, { errors: errors, warnings: warnings }];
            });
        });
    };
    /**
     * Layer 3: Validate ARM structure
     *
     * @remarks
     * Validates the overall ARM template structure and relationships.
     */
    ValidationPipeline.prototype.validateArmStructure = function (template) {
        return __awaiter(this, void 0, void 0, function () {
            var errors, warnings, resourceNames, _i, _a, resource;
            return __generator(this, function (_b) {
                errors = [];
                warnings = [];
                // Validate template schema
                if (!template.$schema) {
                    errors.push({
                        severity: types_1.ValidationSeverity.ERROR,
                        message: 'ARM template missing required "$schema" property',
                        code: 'MISSING_SCHEMA',
                    });
                }
                if (!template.contentVersion) {
                    errors.push({
                        severity: types_1.ValidationSeverity.ERROR,
                        message: 'ARM template missing required "contentVersion" property',
                        code: 'MISSING_CONTENT_VERSION',
                    });
                }
                // Validate resources array
                if (!Array.isArray(template.resources)) {
                    errors.push({
                        severity: types_1.ValidationSeverity.ERROR,
                        message: 'ARM template "resources" must be an array',
                        code: 'INVALID_RESOURCES_TYPE',
                    });
                }
                resourceNames = new Set();
                for (_i = 0, _a = template.resources; _i < _a.length; _i++) {
                    resource = _a[_i];
                    if (resourceNames.has(resource.name)) {
                        errors.push({
                            severity: types_1.ValidationSeverity.ERROR,
                            message: "Duplicate resource name: '".concat(resource.name, "'"),
                            path: resource.name,
                            code: 'DUPLICATE_RESOURCE_NAME',
                            suggestion: 'Resource names must be unique within a template',
                        });
                    }
                    resourceNames.add(resource.name);
                }
                return [2 /*return*/, { errors: errors, warnings: warnings }];
            });
        });
    };
    /**
     * Layer 4: Validate deployment sequence
     *
     * @remarks
     * Validates that resource dependencies form a valid deployment graph.
     */
    ValidationPipeline.prototype.validateDeploymentSequence = function (template) {
        return __awaiter(this, void 0, void 0, function () {
            var errors, warnings, resourceMap, _i, _a, resource, _b, _c, resource, _d, _e, dep, depName, visited, recursionStack, detectCycle, _f, _g, resourceName;
            var _this = this;
            return __generator(this, function (_h) {
                errors = [];
                warnings = [];
                resourceMap = new Map();
                for (_i = 0, _a = template.resources; _i < _a.length; _i++) {
                    resource = _a[_i];
                    resourceMap.set(resource.name, resource);
                }
                // Validate dependencies
                for (_b = 0, _c = template.resources; _b < _c.length; _b++) {
                    resource = _c[_b];
                    if (resource.dependsOn && Array.isArray(resource.dependsOn)) {
                        for (_d = 0, _e = resource.dependsOn; _d < _e.length; _d++) {
                            dep = _e[_d];
                            depName = this.extractResourceNameFromDependency(dep);
                            if (!resourceMap.has(depName)) {
                                errors.push({
                                    severity: types_1.ValidationSeverity.ERROR,
                                    message: "Resource '".concat(resource.name, "' depends on '").concat(depName, "' which does not exist in template"),
                                    path: resource.name,
                                    code: 'MISSING_DEPENDENCY',
                                    suggestion: 'Ensure all dependencies are defined in the same template',
                                });
                            }
                        }
                    }
                }
                visited = new Set();
                recursionStack = new Set();
                detectCycle = function (resourceName) {
                    if (recursionStack.has(resourceName)) {
                        return true; // Cycle detected
                    }
                    if (visited.has(resourceName)) {
                        return false; // Already checked this path
                    }
                    visited.add(resourceName);
                    recursionStack.add(resourceName);
                    var resource = resourceMap.get(resourceName);
                    if (resource === null || resource === void 0 ? void 0 : resource.dependsOn) {
                        for (var _i = 0, _a = resource.dependsOn; _i < _a.length; _i++) {
                            var dep = _a[_i];
                            var depName = _this.extractResourceNameFromDependency(dep);
                            if (detectCycle(depName)) {
                                return true;
                            }
                        }
                    }
                    recursionStack.delete(resourceName);
                    return false;
                };
                for (_f = 0, _g = resourceMap.keys(); _f < _g.length; _f++) {
                    resourceName = _g[_f];
                    if (detectCycle(resourceName)) {
                        errors.push({
                            severity: types_1.ValidationSeverity.ERROR,
                            message: "Circular dependency detected involving resource '".concat(resourceName, "'"),
                            path: resourceName,
                            code: 'CIRCULAR_DEPENDENCY',
                            suggestion: 'Review resource dependencies to remove cycles',
                        });
                    }
                }
                return [2 /*return*/, { errors: errors, warnings: warnings }];
            });
        });
    };
    /**
     * Layer 5: Validate schema
     *
     * @remarks
     * Delegates to existing schema validator from registry.
     */
    ValidationPipeline.prototype.validateSchema = function (template, stackName) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.validatorRegistry.validateAll(template, stackName)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                errors: result.errors,
                                warnings: result.warnings,
                            }];
                }
            });
        });
    };
    /**
     * Aggregate results from all layers
     */
    ValidationPipeline.prototype.aggregateResults = function (results, stackName) {
        var allErrors = [];
        var allWarnings = [];
        for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
            var result = results_1[_i];
            // Prefix errors/warnings with layer name
            for (var _a = 0, _b = result.errors; _a < _b.length; _a++) {
                var error = _b[_a];
                allErrors.push(__assign(__assign({}, error), { path: "[".concat(result.layer, "] ").concat(error.path || stackName || '') }));
            }
            for (var _c = 0, _d = result.warnings; _c < _d.length; _c++) {
                var warning = _d[_c];
                allWarnings.push(__assign(__assign({}, warning), { path: "[".concat(result.layer, "] ").concat(warning.path || stackName || '') }));
            }
        }
        return {
            valid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings,
        };
    };
    /**
     * Extract resource name from dependency string
     *
     * @remarks
     * Handles both formats:
     * - "[resourceId('Microsoft.Network/virtualNetworks', 'vnet-name')]"
     * - "vnet-name"
     */
    ValidationPipeline.prototype.extractResourceNameFromDependency = function (dep) {
        // If it's an ARM expression, try to extract the name
        if (dep.startsWith('[resourceId(')) {
            var match = dep.match(/,\s*'([^']+)'\s*\)/);
            if (match && match[1]) {
                return match[1];
            }
        }
        // Otherwise, assume it's the resource name directly
        return dep;
    };
    /**
     * Check if a resource type typically requires a properties object
     */
    ValidationPipeline.prototype.requiresProperties = function (resourceType) {
        // Most Azure resources require properties, except for a few like resource groups
        var noPropertiesRequired = ['Microsoft.Resources/resourceGroups'];
        return !noPropertiesRequired.includes(resourceType);
    };
    return ValidationPipeline;
}());
exports.ValidationPipeline = ValidationPipeline;
