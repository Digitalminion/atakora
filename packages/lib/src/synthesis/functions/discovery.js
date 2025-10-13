"use strict";
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
exports.FunctionDiscovery = void 0;
var fs = require("fs/promises");
var path = require("path");
var crypto = require("crypto");
var types_1 = require("./types");
/**
 * Function Discovery System
 *
 * @remarks
 * Scans filesystem for function directories containing handler.ts + resource.ts pairs.
 * This implements the Discovery phase (Phase 0) of the synthesis pipeline.
 *
 * The discovery process:
 * 1. Scans the functions directory for subdirectories
 * 2. Validates that each directory contains both handler.ts and resource.ts
 * 3. Computes content hashes for cache invalidation
 * 4. Builds a registry of discovered functions
 *
 * @example
 * ```typescript
 * const discovery = new FunctionDiscovery('../functions');
 * const result = await discovery.discover();
 * console.log(`Discovered ${result.functionsDiscovered} functions`);
 * ```
 */
var FunctionDiscovery = /** @class */ (function () {
    /**
     * Creates a new Function Discovery instance
     *
     * @param functionsPath - Absolute or relative path to functions directory
     */
    function FunctionDiscovery(functionsPath) {
        this.functionsPath = functionsPath;
    }
    /**
     * Discovers all functions in the functions directory
     *
     * @returns Discovery result with registry of found functions
     * @throws {DiscoveryError} If discovery fails
     *
     * @remarks
     * This method performs the complete discovery process:
     * 1. Resolves the absolute path to the functions directory
     * 2. Scans for subdirectories containing handler.ts + resource.ts
     * 3. Computes content hashes for cache invalidation
     * 4. Returns a registry of discovered functions
     *
     * Directories without both files are silently skipped.
     */
    FunctionDiscovery.prototype.discover = function () {
        return __awaiter(this, void 0, void 0, function () {
            var functionDirs, registry, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.scanFunctionsDirectory()];
                    case 1:
                        functionDirs = _a.sent();
                        return [4 /*yield*/, this.buildFunctionRegistry(functionDirs)];
                    case 2:
                        registry = _a.sent();
                        return [2 /*return*/, {
                                functionsDiscovered: registry.size,
                                registry: registry,
                            }];
                    case 3:
                        error_1 = _a.sent();
                        throw new types_1.DiscoveryError("Function discovery failed: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error'), undefined, error_1 instanceof Error ? error_1 : undefined);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Scans the functions directory for valid function directories
     *
     * @returns Array of function directories
     * @throws {DiscoveryError} If directory cannot be accessed
     *
     * @remarks
     * A valid function directory must contain:
     * - handler.ts: Runtime code
     * - resource.ts: Configuration
     *
     * The method skips:
     * - Files (not directories)
     * - Directories without both required files
     * - Hidden directories (starting with .)
     * - node_modules directories
     *
     * @internal
     */
    FunctionDiscovery.prototype.scanFunctionsDirectory = function () {
        return __awaiter(this, void 0, void 0, function () {
            var dirs, basePath, _a, entries, _i, entries_1, entry, functionPath, handlerPath, resourcePath, hasHandler, hasResource;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        dirs = [];
                        basePath = path.resolve(this.functionsPath);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fs.access(basePath)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        throw new types_1.DiscoveryError("Functions directory not found: ".concat(basePath), undefined, undefined);
                    case 4: return [4 /*yield*/, fs.readdir(basePath, { withFileTypes: true })];
                    case 5:
                        entries = _b.sent();
                        _i = 0, entries_1 = entries;
                        _b.label = 6;
                    case 6:
                        if (!(_i < entries_1.length)) return [3 /*break*/, 10];
                        entry = entries_1[_i];
                        // Skip files and hidden/special directories
                        if (!entry.isDirectory())
                            return [3 /*break*/, 9];
                        if (entry.name.startsWith('.'))
                            return [3 /*break*/, 9];
                        if (entry.name === 'node_modules')
                            return [3 /*break*/, 9];
                        functionPath = path.join(basePath, entry.name);
                        handlerPath = path.join(functionPath, 'handler.ts');
                        resourcePath = path.join(functionPath, 'resource.ts');
                        return [4 /*yield*/, this.fileExists(handlerPath)];
                    case 7:
                        hasHandler = _b.sent();
                        return [4 /*yield*/, this.fileExists(resourcePath)];
                    case 8:
                        hasResource = _b.sent();
                        if (hasHandler && hasResource) {
                            dirs.push({
                                name: entry.name,
                                path: functionPath,
                                handlerPath: handlerPath,
                                resourcePath: resourcePath,
                            });
                        }
                        _b.label = 9;
                    case 9:
                        _i++;
                        return [3 /*break*/, 6];
                    case 10: return [2 /*return*/, dirs];
                }
            });
        });
    };
    /**
     * Builds a registry of function configurations with metadata
     *
     * @param dirs - Function directories to process
     * @returns Map of function configurations by name
     * @throws {DiscoveryError} If configuration loading fails
     *
     * @remarks
     * For each function directory, this method:
     * 1. Computes content hashes for handler.ts and resource.ts
     * 2. Creates metadata for cache invalidation
     * 3. Stores configuration in registry
     *
     * Note: resource.ts files are NOT loaded/parsed at this stage.
     * They are loaded later by ResourceLoader during the Build phase.
     *
     * @internal
     */
    FunctionDiscovery.prototype.buildFunctionRegistry = function (dirs) {
        return __awaiter(this, void 0, void 0, function () {
            var registry, _i, dirs_1, dir, handlerHash, resourceHash, metadata, config, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        registry = new Map();
                        _i = 0, dirs_1 = dirs;
                        _a.label = 1;
                    case 1:
                        if (!(_i < dirs_1.length)) return [3 /*break*/, 7];
                        dir = dirs_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 6]);
                        return [4 /*yield*/, this.computeFileHash(dir.handlerPath)];
                    case 3:
                        handlerHash = _a.sent();
                        return [4 /*yield*/, this.computeFileHash(dir.resourcePath)];
                    case 4:
                        resourceHash = _a.sent();
                        metadata = {
                            discoveredAt: Date.now(),
                            functionName: dir.name,
                            hasTypedEnvironment: false, // Will be determined by ResourceLoader
                            handlerHash: handlerHash,
                            resourceHash: resourceHash,
                        };
                        config = {
                            directory: dir,
                            definition: {
                                type: 'AzureFunction',
                                version: '1.0',
                                config: {
                                    trigger: { type: 'unknown' }, // Placeholder
                                },
                            },
                            metadata: metadata,
                        };
                        // Check for duplicate function names
                        if (registry.has(dir.name)) {
                            throw new types_1.DiscoveryError("Duplicate function name found: ".concat(dir.name), dir.name, undefined);
                        }
                        registry.set(dir.name, config);
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        throw new types_1.DiscoveryError("Failed to process function directory: ".concat(dir.name), dir.name, error_2 instanceof Error ? error_2 : undefined);
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7: return [2 /*return*/, registry];
                }
            });
        });
    };
    /**
     * Checks if a file exists
     *
     * @param filePath - Path to check
     * @returns True if file exists
     *
     * @internal
     */
    FunctionDiscovery.prototype.fileExists = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, fs.access(filePath)];
                    case 1:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 2:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Computes SHA256 hash of file contents
     *
     * @param filePath - Path to file
     * @returns Hex-encoded hash
     *
     * @remarks
     * Used for cache invalidation - if hash changes, rebuild is required.
     *
     * @internal
     */
    FunctionDiscovery.prototype.computeFileHash = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var content;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fs.readFile(filePath)];
                    case 1:
                        content = _a.sent();
                        return [2 /*return*/, crypto.createHash('sha256').update(content).digest('hex')];
                }
            });
        });
    };
    /**
     * Gets the absolute path to the functions directory
     *
     * @returns Absolute path
     */
    FunctionDiscovery.prototype.getFunctionsPath = function () {
        return path.resolve(this.functionsPath);
    };
    return FunctionDiscovery;
}());
exports.FunctionDiscovery = FunctionDiscovery;
