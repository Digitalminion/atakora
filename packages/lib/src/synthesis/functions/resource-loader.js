"use strict";
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
exports.ResourceLoader = void 0;
var path = require("path");
var types_1 = require("./types");
/**
 * Resource Loader for Function Definitions
 *
 * @remarks
 * Loads and parses resource.ts files to extract function configurations.
 * This is used during the Build phase after functions have been discovered.
 *
 * The resource loader:
 * 1. Dynamically imports resource.ts files
 * 2. Validates the exported definition structure
 * 3. Extracts typed environment variable information
 * 4. Returns complete function configurations
 *
 * @example
 * ```typescript
 * const loader = new ResourceLoader();
 * const config = await loader.loadResourceConfig(functionDir);
 * console.log(`Loaded ${config.definition.config.trigger.type} trigger`);
 * ```
 */
var ResourceLoader = /** @class */ (function () {
    function ResourceLoader() {
    }
    /**
     * Loads a single function's resource.ts configuration
     *
     * @param directory - Function directory information
     * @returns Complete function configuration
     * @throws {ResourceLoadError} If loading or validation fails
     *
     * @remarks
     * This method performs the following steps:
     * 1. Dynamically imports the resource.ts module
     * 2. Extracts the default export (FunctionDefinition)
     * 3. Validates the definition structure
     * 4. Updates metadata with environment variable type information
     *
     * The resource.ts file must export a FunctionDefinition as default:
     * ```typescript
     * export default defineFunction({ ... });
     * ```
     */
    ResourceLoader.prototype.loadResourceConfig = function (directory) {
        return __awaiter(this, void 0, void 0, function () {
            var module_1, definition, config, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.importResourceModule(directory.resourcePath)];
                    case 1:
                        module_1 = _a.sent();
                        definition = this.extractDefinition(module_1, directory.resourcePath);
                        // Validate definition structure
                        this.validateDefinition(definition, directory.name);
                        config = {
                            directory: directory,
                            definition: definition,
                            metadata: {
                                discoveredAt: Date.now(),
                                functionName: directory.name,
                                hasTypedEnvironment: !!definition.config.environment,
                            },
                        };
                        return [2 /*return*/, config];
                    case 2:
                        error_1 = _a.sent();
                        throw new types_1.ResourceLoadError("Failed to load resource.ts for function '".concat(directory.name, "': ").concat(error_1 instanceof Error ? error_1.message : 'Unknown error'), directory.resourcePath, error_1 instanceof Error ? error_1 : undefined);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Loads multiple function configurations in parallel
     *
     * @param directories - Array of function directories
     * @returns Array of function configurations
     * @throws {ResourceLoadError} If any loading fails
     *
     * @remarks
     * Uses Promise.all for parallel loading to improve performance.
     * If any resource fails to load, the entire operation fails.
     */
    ResourceLoader.prototype.loadMultiple = function (directories) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, Promise.all(directories.map(function (dir) { return _this.loadResourceConfig(dir); }))];
            });
        });
    };
    /**
     * Dynamically imports a resource.ts module
     *
     * @param resourcePath - Absolute path to resource.ts
     * @returns Imported module
     * @throws {Error} If import fails
     *
     * @remarks
     * Uses dynamic import() to load TypeScript modules at runtime.
     * The module is evaluated and its exports are returned.
     *
     * On Windows, we need to convert the path to a file:// URL to
     * handle paths with spaces and special characters correctly.
     *
     * @internal
     */
    ResourceLoader.prototype.importResourceModule = function (resourcePath) {
        return __awaiter(this, void 0, void 0, function () {
            var absolutePath, fileUrl, module_2, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        absolutePath = path.resolve(resourcePath);
                        fileUrl = new URL("file:///".concat(absolutePath.replace(/\\/g, '/')));
                        return [4 /*yield*/, Promise.resolve("".concat(fileUrl.href)).then(function (s) { return require(s); })];
                    case 1:
                        module_2 = _a.sent();
                        return [2 /*return*/, module_2];
                    case 2:
                        error_2 = _a.sent();
                        throw new Error("Failed to import resource.ts: ".concat(error_2 instanceof Error ? error_2.message : 'Unknown error'));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Extracts FunctionDefinition from module exports
     *
     * @param module - Imported module
     * @param resourcePath - Path for error messages
     * @returns Function definition
     * @throws {Error} If definition is missing or invalid
     *
     * @remarks
     * The resource.ts file should export a FunctionDefinition as default:
     * ```typescript
     * export default defineFunction({ ... });
     * ```
     *
     * We also support named export 'definition' as a fallback:
     * ```typescript
     * export const definition = defineFunction({ ... });
     * ```
     *
     * @internal
     */
    ResourceLoader.prototype.extractDefinition = function (module, resourcePath) {
        // Try default export first
        if (module.default) {
            return module.default;
        }
        // Try named 'definition' export
        if (module.definition) {
            return module.definition;
        }
        // No valid export found
        throw new Error("resource.ts must export a FunctionDefinition as default or named 'definition' export. " +
            "Found exports: ".concat(Object.keys(module).join(', ')));
    };
    /**
     * Validates function definition structure
     *
     * @param definition - Function definition to validate
     * @param functionName - Function name for error messages
     * @throws {Error} If validation fails
     *
     * @remarks
     * Validates that the definition has required properties:
     * - type: Must be 'AzureFunction'
     * - version: Must be present
     * - config: Must be an object with trigger
     * - config.trigger: Must have a type property
     *
     * This catches common configuration errors early.
     *
     * @internal
     */
    ResourceLoader.prototype.validateDefinition = function (definition, functionName) {
        // Check type
        if (definition.type !== 'AzureFunction') {
            throw new Error("Invalid function definition type. Expected 'AzureFunction', got '".concat(definition.type, "'"));
        }
        // Check version
        if (!definition.version) {
            throw new Error('Function definition must have a version property');
        }
        // Check config
        if (!definition.config || typeof definition.config !== 'object') {
            throw new Error('Function definition must have a config object');
        }
        // Check trigger
        if (!definition.config.trigger || !definition.config.trigger.type) {
            throw new Error('Function config must have a trigger with a type property');
        }
        // Validate bindings if present
        if (definition.config.inputBindings) {
            this.validateBindings(definition.config.inputBindings, 'input', functionName);
        }
        if (definition.config.outputBindings) {
            this.validateBindings(definition.config.outputBindings, 'output', functionName);
        }
    };
    /**
     * Validates binding configurations
     *
     * @param bindings - Array of bindings to validate
     * @param bindingType - Type of bindings (input/output) for error messages
     * @param functionName - Function name for error messages
     * @throws {Error} If validation fails
     *
     * @remarks
     * Validates that each binding has required properties:
     * - type: Binding type (cosmosDb, blob, etc.)
     * - direction: in, out, or inout
     * - name: Binding name for code reference
     *
     * @internal
     */
    ResourceLoader.prototype.validateBindings = function (bindings, bindingType, functionName) {
        if (!Array.isArray(bindings)) {
            throw new Error("".concat(bindingType, " bindings must be an array in function '").concat(functionName, "'"));
        }
        for (var _i = 0, _a = bindings.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], index = _b[0], binding = _b[1];
            if (!binding.type) {
                throw new Error("".concat(bindingType, " binding at index ").concat(index, " must have a type property in function '").concat(functionName, "'"));
            }
            if (!binding.direction) {
                throw new Error("".concat(bindingType, " binding '").concat(binding.type, "' at index ").concat(index, " must have a direction property in function '").concat(functionName, "'"));
            }
            if (!binding.name) {
                throw new Error("".concat(bindingType, " binding '").concat(binding.type, "' at index ").concat(index, " must have a name property in function '").concat(functionName, "'"));
            }
        }
    };
    /**
     * Updates an existing function configuration with loaded definition
     *
     * @param existingConfig - Existing configuration from discovery
     * @param directory - Function directory
     * @returns Updated configuration
     * @throws {ResourceLoadError} If loading fails
     *
     * @remarks
     * This is useful when you want to update a configuration that was
     * created during the Discovery phase with placeholder data.
     */
    ResourceLoader.prototype.updateConfiguration = function (existingConfig, directory) {
        return __awaiter(this, void 0, void 0, function () {
            var loadedConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadResourceConfig(directory)];
                    case 1:
                        loadedConfig = _a.sent();
                        return [2 /*return*/, __assign(__assign({}, existingConfig), { definition: loadedConfig.definition, metadata: __assign(__assign({}, existingConfig.metadata), { hasTypedEnvironment: loadedConfig.metadata.hasTypedEnvironment }) })];
                }
            });
        });
    };
    return ResourceLoader;
}());
exports.ResourceLoader = ResourceLoader;
