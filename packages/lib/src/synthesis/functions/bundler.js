"use strict";
/**
 * Function bundler using esbuild
 *
 * @remarks
 * This module provides TypeScript compilation and bundling for Azure Functions
 * using esbuild. It handles:
 * - TypeScript compilation
 * - Dependency bundling
 * - Tree-shaking
 * - Minification
 * - Source map generation
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
exports.FunctionBundler = void 0;
var esbuild = require("esbuild");
var crypto = require("crypto");
var path = require("path");
var types_1 = require("./types");
/**
 * Function bundler that uses esbuild for fast TypeScript compilation
 *
 * @example
 * ```typescript
 * const bundler = new FunctionBundler();
 * const artifact = await bundler.bundle('my-function', '/path/to/handler.ts', {
 *   minify: true,
 *   sourcemap: 'external'
 * });
 * ```
 */
var FunctionBundler = /** @class */ (function () {
    function FunctionBundler() {
    }
    /**
     * Bundle a TypeScript function handler
     *
     * @param functionId - Unique function identifier
     * @param functionName - Function name for deployment
     * @param handlerPath - Path to handler.ts file
     * @param options - Build options
     * @returns Build artifact with bundled code
     *
     * @throws {BuildError} If bundling fails
     */
    FunctionBundler.prototype.bundle = function (functionId, functionName, handlerPath, options) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, absoluteHandlerPath, buildOptions, result, bundle, sourceMap, dependencies, hasNativeModules, hash, metadata, artifact, error_1;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        startTime = Date.now();
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 3, , 4]);
                        absoluteHandlerPath = path.resolve(handlerPath);
                        buildOptions = {
                            entryPoints: [absoluteHandlerPath],
                            bundle: (_a = options === null || options === void 0 ? void 0 : options.bundle) !== null && _a !== void 0 ? _a : true,
                            minify: (_b = options === null || options === void 0 ? void 0 : options.minify) !== null && _b !== void 0 ? _b : true,
                            sourcemap: (_c = options === null || options === void 0 ? void 0 : options.sourcemap) !== null && _c !== void 0 ? _c : 'external',
                            external: (_d = options === null || options === void 0 ? void 0 : options.external) !== null && _d !== void 0 ? _d : [],
                            platform: 'node',
                            target: (_e = options === null || options === void 0 ? void 0 : options.target) !== null && _e !== void 0 ? _e : 'node18',
                            format: 'cjs',
                            treeShaking: (_f = options === null || options === void 0 ? void 0 : options.treeShaking) !== null && _f !== void 0 ? _f : true,
                            define: options === null || options === void 0 ? void 0 : options.define,
                            loader: options === null || options === void 0 ? void 0 : options.loader,
                            write: false, // Keep output in memory
                            metafile: true, // Generate metadata for analysis
                            outdir: 'out', // Required but not used since write=false
                        };
                        return [4 /*yield*/, esbuild.build(buildOptions)];
                    case 2:
                        result = _g.sent();
                        // Extract bundle and source map
                        if (!result.outputFiles) {
                            throw new types_1.BuildError('esbuild did not produce output files (write: false required)', functionId);
                        }
                        bundle = result.outputFiles.find(function (f) { return f.path.endsWith('.js'); });
                        sourceMap = result.outputFiles.find(function (f) { return f.path.endsWith('.js.map'); });
                        if (!bundle) {
                            throw new types_1.BuildError('esbuild did not produce a bundle output', functionId);
                        }
                        dependencies = this.extractDependencies(result.metafile);
                        hasNativeModules = this.detectNativeModules(result.metafile);
                        hash = this.computeHash(bundle.contents);
                        metadata = {
                            size: bundle.contents.length,
                            buildTime: Date.now() - startTime,
                            hash: hash,
                            dependencies: dependencies,
                            hasNativeModules: hasNativeModules,
                            memoryEstimate: this.estimateMemory(bundle.contents.length),
                        };
                        artifact = {
                            functionId: functionId,
                            functionName: functionName,
                            bundle: bundle.contents,
                            sourceMap: sourceMap === null || sourceMap === void 0 ? void 0 : sourceMap.contents,
                            metadata: metadata,
                        };
                        return [2 /*return*/, artifact];
                    case 3:
                        error_1 = _g.sent();
                        throw new types_1.BuildError("Failed to bundle function ".concat(functionName, ": ").concat(error_1 instanceof Error ? error_1.message : 'Unknown error'), functionId, error_1 instanceof Error ? error_1 : undefined);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Extract dependencies from esbuild metafile
     *
     * @param metafile - esbuild metafile
     * @returns List of dependency names
     *
     * @internal
     */
    FunctionBundler.prototype.extractDependencies = function (metafile) {
        if (!metafile) {
            return [];
        }
        var dependencies = new Set();
        // Extract from inputs
        for (var _i = 0, _a = Object.keys(metafile.inputs); _i < _a.length; _i++) {
            var input = _a[_i];
            // Check if it's a node_modules dependency
            if (input.includes('node_modules')) {
                var match = input.match(/node_modules\/([^/]+)/);
                if (match) {
                    dependencies.add(match[1]);
                }
            }
        }
        return Array.from(dependencies);
    };
    /**
     * Detect if bundle contains native modules
     *
     * @param metafile - esbuild metafile
     * @returns True if native modules detected
     *
     * @internal
     */
    FunctionBundler.prototype.detectNativeModules = function (metafile) {
        if (!metafile) {
            return false;
        }
        // Check for .node files or common native module patterns
        var nativePatterns = [
            /\.node$/,
            /node-gyp/,
            /prebuild/,
            /binding\.gyp/,
        ];
        var _loop_1 = function (input) {
            if (nativePatterns.some(function (pattern) { return pattern.test(input); })) {
                return { value: true };
            }
        };
        for (var _i = 0, _a = Object.keys(metafile.inputs); _i < _a.length; _i++) {
            var input = _a[_i];
            var state_1 = _loop_1(input);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        return false;
    };
    /**
     * Compute SHA256 hash of bundle contents
     *
     * @param contents - Bundle contents
     * @returns Hex-encoded hash
     *
     * @internal
     */
    FunctionBundler.prototype.computeHash = function (contents) {
        return crypto
            .createHash('sha256')
            .update(contents)
            .digest('hex');
    };
    /**
     * Estimate memory requirement based on bundle size
     *
     * @param bundleSize - Bundle size in bytes
     * @returns Estimated memory in MB
     *
     * @remarks
     * This is a heuristic estimation. Actual memory usage depends on
     * runtime behavior, but bundle size is a reasonable proxy.
     *
     * @internal
     */
    FunctionBundler.prototype.estimateMemory = function (bundleSize) {
        // Base memory overhead + 2x bundle size (rough heuristic)
        var baseMB = 128;
        var bundleMB = (bundleSize / 1024 / 1024) * 2;
        return Math.ceil(baseMB + bundleMB);
    };
    return FunctionBundler;
}());
exports.FunctionBundler = FunctionBundler;
