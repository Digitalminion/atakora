"use strict";
/**
 * Function builder orchestrator
 *
 * @remarks
 * This module orchestrates the build process for Azure Functions, coordinating:
 * - Function discovery and validation
 * - Parallel compilation with esbuild
 * - Build caching
 * - Package strategy determination
 * - Build telemetry
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionBuilder = void 0;
var fs = require("fs");
var path = require("path");
var bundler_1 = require("./bundler");
var cache_1 = require("./cache");
var types_1 = require("./types");
/**
 * Function builder that orchestrates the build process
 *
 * @remarks
 * The builder coordinates compilation, caching, and packaging.
 * It builds functions in parallel with configurable concurrency.
 *
 * @example
 * ```typescript
 * const builder = new FunctionBuilder({
 *   cache: { cacheDir: '.cache' },
 *   concurrency: 4
 * });
 *
 * const functions: FunctionDescriptor[] = [
 *   { id: 'fn1', name: 'MyFunction', handler: './handler.ts' }
 * ];
 *
 * const result = await builder.buildAll(functions);
 * ```
 */
var FunctionBuilder = /** @class */ (function () {
    function FunctionBuilder(config) {
        var _a, _b, _c;
        this.telemetry = [];
        this.bundler = new bundler_1.FunctionBundler();
        this.cache = new cache_1.BuildCache(config === null || config === void 0 ? void 0 : config.cache);
        this.config = {
            cache: (_a = config === null || config === void 0 ? void 0 : config.cache) !== null && _a !== void 0 ? _a : { cacheDir: '.atakora/cache' },
            concurrency: (_b = config === null || config === void 0 ? void 0 : config.concurrency) !== null && _b !== void 0 ? _b : 4,
            telemetry: (_c = config === null || config === void 0 ? void 0 : config.telemetry) !== null && _c !== void 0 ? _c : true,
        };
    }
    /**
     * Build all functions
     *
     * @param functions - Functions to build
     * @returns Build result with artifacts
     *
     * @throws {BuildError} If any function fails to build
     */
    FunctionBuilder.prototype.buildAll = function (functions) {
        return __awaiter(this, void 0, void 0, function () {
            var artifacts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (functions.length === 0) {
                            return [2 /*return*/, { artifacts: new Map() }];
                        }
                        // Validate handlers exist
                        return [4 /*yield*/, this.validateHandlers(functions)];
                    case 1:
                        // Validate handlers exist
                        _a.sent();
                        return [4 /*yield*/, this.buildWithConcurrency(functions)];
                    case 2:
                        artifacts = _a.sent();
                        return [2 /*return*/, {
                                artifacts: artifacts,
                                telemetry: this.config.telemetry ? this.telemetry : undefined,
                            }];
                }
            });
        });
    };
    /**
     * Build a single function
     *
     * @param descriptor - Function descriptor
     * @returns Build artifact
     *
     * @throws {BuildError} If build fails
     */
    FunctionBuilder.prototype.buildOne = function (descriptor) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, cacheHit, cacheKey, cached, artifact, strategy, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        startTime = Date.now();
                        cacheHit = false;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, , 7]);
                        return [4 /*yield*/, this.cache.getCacheKey(descriptor.handler, (_a = descriptor.buildOptions) !== null && _a !== void 0 ? _a : {}, descriptor.resource)];
                    case 2:
                        cacheKey = _b.sent();
                        return [4 /*yield*/, this.cache.get(cacheKey)];
                    case 3:
                        cached = _b.sent();
                        if (cached) {
                            cacheHit = true;
                            this.recordTelemetry(descriptor, true, startTime, cached.metadata.size, types_1.PackagingStrategy.STORAGE);
                            return [2 /*return*/, cached];
                        }
                        return [4 /*yield*/, this.bundler.bundle(descriptor.id, descriptor.name, descriptor.handler, descriptor.buildOptions)];
                    case 4:
                        artifact = _b.sent();
                        // Cache result
                        return [4 /*yield*/, this.cache.set(cacheKey, artifact)];
                    case 5:
                        // Cache result
                        _b.sent();
                        strategy = this.determinePackagingStrategy(artifact);
                        // Record telemetry
                        this.recordTelemetry(descriptor, false, startTime, artifact.metadata.size, strategy);
                        return [2 /*return*/, artifact];
                    case 6:
                        error_1 = _b.sent();
                        // Record failure telemetry
                        this.recordTelemetry(descriptor, cacheHit, startTime, 0, types_1.PackagingStrategy.INLINE, error_1 instanceof Error ? error_1.message : 'Unknown error');
                        throw error_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Invalidate cache for specific functions
     *
     * @param pattern - Pattern to match function names (optional)
     */
    FunctionBuilder.prototype.invalidateCache = function (pattern) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.cache.invalidate(pattern)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get build statistics
     *
     * @returns Build statistics including cache stats
     */
    FunctionBuilder.prototype.getStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var cacheStats, builds, cacheHits, cacheHitRate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.cache.getStats()];
                    case 1:
                        cacheStats = _a.sent();
                        builds = this.telemetry.length;
                        cacheHits = this.telemetry.filter(function (t) { return t.cacheHit; }).length;
                        cacheHitRate = builds > 0 ? cacheHits / builds : 0;
                        return [2 /*return*/, {
                                cache: cacheStats,
                                builds: builds,
                                cacheHitRate: cacheHitRate,
                            }];
                }
            });
        });
    };
    /**
     * Validate that all handler files exist
     *
     * @param functions - Functions to validate
     *
     * @throws {BuildError} If any handler is missing
     *
     * @internal
     */
    FunctionBuilder.prototype.validateHandlers = function (functions) {
        return __awaiter(this, void 0, void 0, function () {
            var errors, _i, functions_1, fn, handlerPath;
            return __generator(this, function (_a) {
                errors = [];
                for (_i = 0, functions_1 = functions; _i < functions_1.length; _i++) {
                    fn = functions_1[_i];
                    handlerPath = path.resolve(fn.handler);
                    if (!fs.existsSync(handlerPath)) {
                        errors.push("Handler not found: ".concat(fn.handler, " for function ").concat(fn.name));
                    }
                }
                if (errors.length > 0) {
                    throw new types_1.BuildError("Function handler validation failed:\n".concat(errors.join('\n')));
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Build functions with concurrency control
     *
     * @param functions - Functions to build
     * @returns Map of function ID to artifact
     *
     * @internal
     */
    FunctionBuilder.prototype.buildWithConcurrency = function (functions) {
        return __awaiter(this, void 0, void 0, function () {
            var artifacts, queue, inProgress, _loop_1, this_1, completed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        artifacts = new Map();
                        queue = __spreadArray([], functions, true);
                        inProgress = [];
                        _a.label = 1;
                    case 1:
                        if (!(queue.length > 0 || inProgress.length > 0)) return [3 /*break*/, 5];
                        _loop_1 = function () {
                            var fn = queue.shift();
                            var promise = this_1.buildOne(fn)
                                .then(function (artifact) {
                                artifacts.set(fn.id, artifact);
                            })
                                .catch(function (error) {
                                throw new types_1.BuildError("Failed to build function ".concat(fn.name), fn.id, error instanceof Error ? error : undefined);
                            });
                            inProgress.push(promise);
                        };
                        this_1 = this;
                        // Start new builds up to concurrency limit
                        while (queue.length > 0 && inProgress.length < this.config.concurrency) {
                            _loop_1();
                        }
                        if (!(inProgress.length > 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, Promise.race(inProgress)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, Promise.allSettled(inProgress)];
                    case 3:
                        completed = _a.sent();
                        completed.forEach(function (result, index) {
                            if (result.status === 'fulfilled' || result.status === 'rejected') {
                                inProgress.splice(index, 1);
                            }
                        });
                        _a.label = 4;
                    case 4: return [3 /*break*/, 1];
                    case 5: 
                    // Ensure all builds completed
                    return [4 /*yield*/, Promise.all(inProgress)];
                    case 6:
                        // Ensure all builds completed
                        _a.sent();
                        return [2 /*return*/, artifacts];
                }
            });
        });
    };
    /**
     * Determine packaging strategy based on artifact characteristics
     *
     * @param artifact - Build artifact
     * @returns Recommended packaging strategy
     *
     * @remarks
     * Decision tree:
     * - < 4KB and no dependencies: INLINE
     * - Native modules or > 100MB: CONTAINER
     * - > 50MB: EXTERNAL
     * - Otherwise: STORAGE
     *
     * @internal
     */
    FunctionBuilder.prototype.determinePackagingStrategy = function (artifact) {
        var sizeKB = artifact.metadata.size / 1024;
        var hasDependencies = artifact.metadata.dependencies.length > 0;
        var hasNativeModules = artifact.metadata.hasNativeModules;
        // Decision tree
        if (sizeKB < 4 && !hasDependencies) {
            return types_1.PackagingStrategy.INLINE;
        }
        if (hasNativeModules || sizeKB > 100 * 1024) {
            return types_1.PackagingStrategy.CONTAINER;
        }
        if (sizeKB > 50 * 1024) {
            return types_1.PackagingStrategy.EXTERNAL;
        }
        return types_1.PackagingStrategy.STORAGE;
    };
    /**
     * Record build telemetry
     *
     * @param descriptor - Function descriptor
     * @param cacheHit - Whether cache was used
     * @param startTime - Build start time
     * @param bundleSize - Bundle size in bytes
     * @param strategy - Packaging strategy
     * @param error - Error message if build failed
     *
     * @internal
     */
    FunctionBuilder.prototype.recordTelemetry = function (descriptor, cacheHit, startTime, bundleSize, strategy, error) {
        if (!this.config.telemetry) {
            return;
        }
        var telemetry = {
            functionId: descriptor.id,
            buildTime: Date.now() - startTime,
            bundleSize: bundleSize,
            cacheHit: cacheHit,
            strategy: strategy,
            success: !error,
            error: error,
        };
        this.telemetry.push(telemetry);
    };
    return FunctionBuilder;
}());
exports.FunctionBuilder = FunctionBuilder;
