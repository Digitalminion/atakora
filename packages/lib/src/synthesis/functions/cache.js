"use strict";
/**
 * Build cache for function artifacts
 *
 * @remarks
 * This module provides caching for built function artifacts to speed up
 * incremental builds. The cache is invalidated when:
 * - Handler.ts file changes
 * - Resource.ts file changes
 * - Build options change
 * - Dependencies change
 * - Node.js version changes
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
exports.BuildCache = void 0;
var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
/**
 * Default cache configuration
 */
var DEFAULT_CACHE_CONFIG = {
    cacheDir: path.join(process.cwd(), '.atakora', 'build-cache'),
    ttl: 3600000, // 1 hour
    maxSize: 1024 * 1024 * 1024, // 1GB
    enabled: true,
};
/**
 * Build cache for function artifacts
 *
 * @remarks
 * Implements a disk-based cache with TTL and size limits.
 * Cache entries are JSON files containing serialized artifacts.
 *
 * @example
 * ```typescript
 * const cache = new BuildCache({ cacheDir: '.cache' });
 *
 * // Generate cache key
 * const key = await cache.getCacheKey(
 *   '/path/to/handler.ts',
 *   buildOptions,
 *   '/path/to/resource.ts'
 * );
 *
 * // Check cache
 * const cached = await cache.get(key);
 * if (cached) {
 *   return cached;
 * }
 *
 * // Build and cache
 * const artifact = await build();
 * await cache.set(key, artifact);
 * ```
 */
var BuildCache = /** @class */ (function () {
    function BuildCache(config) {
        this.config = __assign(__assign({}, DEFAULT_CACHE_CONFIG), config);
    }
    /**
     * Generate cache key from function inputs
     *
     * @param handlerPath - Path to handler.ts
     * @param buildOptions - Build options
     * @param resourcePath - Path to resource.ts (optional)
     * @returns Cache key (SHA256 hash)
     *
     * @remarks
     * Cache key is computed from:
     * - Handler file content hash
     * - Build options JSON
     * - Resource file content hash (if provided)
     * - Package.json dependencies hash
     * - Node.js version
     */
    BuildCache.prototype.getCacheKey = function (handlerPath, buildOptions, resourcePath) {
        return __awaiter(this, void 0, void 0, function () {
            var factors, handlerHash, resourceHash, depsHash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        factors = [];
                        return [4 /*yield*/, this.getFileHash(handlerPath)];
                    case 1:
                        handlerHash = _a.sent();
                        factors.push("handler:".concat(handlerHash));
                        // Build options
                        factors.push("options:".concat(JSON.stringify(buildOptions)));
                        if (!(resourcePath && fs.existsSync(resourcePath))) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.getFileHash(resourcePath)];
                    case 2:
                        resourceHash = _a.sent();
                        factors.push("resource:".concat(resourceHash));
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this.getDependencyHash(handlerPath)];
                    case 4:
                        depsHash = _a.sent();
                        factors.push("deps:".concat(depsHash));
                        // Node version
                        factors.push("node:".concat(process.version));
                        // Compute final cache key
                        return [2 /*return*/, crypto
                                .createHash('sha256')
                                .update(factors.join('|'))
                                .digest('hex')];
                }
            });
        });
    };
    /**
     * Get cached artifact
     *
     * @param key - Cache key
     * @returns Cached artifact or null if not found/expired
     */
    BuildCache.prototype.get = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var cachePath, stats, age, content, entry, artifact, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.config.enabled) {
                            return [2 /*return*/, null];
                        }
                        cachePath = this.getCachePath(key);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 6]);
                        // Check if cache file exists
                        if (!fs.existsSync(cachePath)) {
                            return [2 /*return*/, null];
                        }
                        stats = fs.statSync(cachePath);
                        age = Date.now() - stats.mtimeMs;
                        if (!(age > this.config.ttl)) return [3 /*break*/, 3];
                        // Remove expired cache entry
                        return [4 /*yield*/, this.remove(key)];
                    case 2:
                        // Remove expired cache entry
                        _a.sent();
                        return [2 /*return*/, null];
                    case 3:
                        content = fs.readFileSync(cachePath, 'utf-8');
                        entry = JSON.parse(content);
                        artifact = __assign(__assign({}, entry.artifact), { bundle: this.base64ToUint8Array(entry.artifact.bundle), sourceMap: entry.artifact.sourceMap
                                ? this.base64ToUint8Array(entry.artifact.sourceMap)
                                : undefined });
                        return [2 /*return*/, artifact];
                    case 4:
                        error_1 = _a.sent();
                        // Cache read error - invalidate and return null
                        console.warn("Cache read error for key ".concat(key, ":"), error_1);
                        return [4 /*yield*/, this.remove(key).catch(function () { })];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, null];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Store artifact in cache
     *
     * @param key - Cache key
     * @param artifact - Build artifact to cache
     */
    BuildCache.prototype.set = function (key, artifact) {
        return __awaiter(this, void 0, void 0, function () {
            var serializableArtifact, entry, cachePath, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.config.enabled) {
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        // Ensure cache directory exists
                        this.ensureCacheDir();
                        serializableArtifact = __assign(__assign({}, artifact), { bundle: this.uint8ArrayToBase64(artifact.bundle), sourceMap: artifact.sourceMap
                                ? this.uint8ArrayToBase64(artifact.sourceMap)
                                : undefined });
                        entry = {
                            key: key,
                            artifact: serializableArtifact,
                            cachedAt: Date.now(),
                            ttl: this.config.ttl,
                        };
                        cachePath = this.getCachePath(key);
                        fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2), 'utf-8');
                        // Enforce cache size limit
                        return [4 /*yield*/, this.enforceMaxSize()];
                    case 2:
                        // Enforce cache size limit
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        // Cache write error - log but don't fail build
                        console.warn("Failed to write cache for key ".concat(key, ":"), error_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Remove cached artifact
     *
     * @param key - Cache key
     */
    BuildCache.prototype.remove = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var cachePath;
            return __generator(this, function (_a) {
                cachePath = this.getCachePath(key);
                try {
                    if (fs.existsSync(cachePath)) {
                        fs.unlinkSync(cachePath);
                    }
                }
                catch (error) {
                    console.warn("Failed to remove cache entry ".concat(key, ":"), error);
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Invalidate cache entries matching pattern
     *
     * @param pattern - Pattern to match cache keys (optional)
     *
     * @remarks
     * If pattern is provided, only matching cache entries are removed.
     * If pattern is undefined, entire cache is cleared.
     */
    BuildCache.prototype.invalidate = function (pattern) {
        return __awaiter(this, void 0, void 0, function () {
            var files, matching, _i, matching_1, file, filePath, _a, files_1, file, filePath;
            return __generator(this, function (_b) {
                this.ensureCacheDir();
                try {
                    files = fs.readdirSync(this.config.cacheDir);
                    if (pattern) {
                        matching = files.filter(function (f) { return f.includes(pattern); });
                        for (_i = 0, matching_1 = matching; _i < matching_1.length; _i++) {
                            file = matching_1[_i];
                            filePath = path.join(this.config.cacheDir, file);
                            fs.unlinkSync(filePath);
                        }
                    }
                    else {
                        // Clear entire cache
                        for (_a = 0, files_1 = files; _a < files_1.length; _a++) {
                            file = files_1[_a];
                            filePath = path.join(this.config.cacheDir, file);
                            fs.unlinkSync(filePath);
                        }
                    }
                }
                catch (error) {
                    console.warn('Failed to invalidate cache:', error);
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get cache statistics
     *
     * @returns Cache statistics
     */
    BuildCache.prototype.getStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, totalSize, oldestEntry, newestEntry, _i, files_2, file, filePath, stats;
            return __generator(this, function (_a) {
                this.ensureCacheDir();
                try {
                    files = fs.readdirSync(this.config.cacheDir);
                    totalSize = 0;
                    oldestEntry = null;
                    newestEntry = null;
                    for (_i = 0, files_2 = files; _i < files_2.length; _i++) {
                        file = files_2[_i];
                        filePath = path.join(this.config.cacheDir, file);
                        stats = fs.statSync(filePath);
                        totalSize += stats.size;
                        if (oldestEntry === null || stats.mtimeMs < oldestEntry) {
                            oldestEntry = stats.mtimeMs;
                        }
                        if (newestEntry === null || stats.mtimeMs > newestEntry) {
                            newestEntry = stats.mtimeMs;
                        }
                    }
                    return [2 /*return*/, {
                            entries: files.length,
                            totalSize: totalSize,
                            oldestEntry: oldestEntry,
                            newestEntry: newestEntry,
                        }];
                }
                catch (error) {
                    return [2 /*return*/, {
                            entries: 0,
                            totalSize: 0,
                            oldestEntry: null,
                            newestEntry: null,
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get cache file path for key
     *
     * @param key - Cache key
     * @returns Full path to cache file
     *
     * @internal
     */
    BuildCache.prototype.getCachePath = function (key) {
        return path.join(this.config.cacheDir, "".concat(key, ".json"));
    };
    /**
     * Ensure cache directory exists
     *
     * @internal
     */
    BuildCache.prototype.ensureCacheDir = function () {
        if (!fs.existsSync(this.config.cacheDir)) {
            fs.mkdirSync(this.config.cacheDir, { recursive: true });
        }
    };
    /**
     * Enforce maximum cache size by removing oldest entries
     *
     * @internal
     */
    BuildCache.prototype.enforceMaxSize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var stats, files, currentSize, _i, files_3, file;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getStats()];
                    case 1:
                        stats = _a.sent();
                        if (stats.totalSize <= this.config.maxSize) {
                            return [2 /*return*/];
                        }
                        files = fs.readdirSync(this.config.cacheDir)
                            .map(function (f) {
                            var filePath = path.join(_this.config.cacheDir, f);
                            var stat = fs.statSync(filePath);
                            return { path: filePath, mtime: stat.mtimeMs, size: stat.size };
                        })
                            .sort(function (a, b) { return a.mtime - b.mtime; });
                        currentSize = stats.totalSize;
                        for (_i = 0, files_3 = files; _i < files_3.length; _i++) {
                            file = files_3[_i];
                            if (currentSize <= this.config.maxSize) {
                                break;
                            }
                            fs.unlinkSync(file.path);
                            currentSize -= file.size;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Compute SHA256 hash of file
     *
     * @param filePath - Path to file
     * @returns Hex-encoded hash
     *
     * @internal
     */
    BuildCache.prototype.getFileHash = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var hash = crypto.createHash('sha256');
                        var stream = fs.createReadStream(filePath);
                        stream.on('data', function (data) { return hash.update(data); });
                        stream.on('end', function () { return resolve(hash.digest('hex')); });
                        stream.on('error', reject);
                    })];
            });
        });
    };
    /**
     * Compute hash of package.json dependencies
     *
     * @param handlerPath - Path to handler.ts (used to find package.json)
     * @returns Hex-encoded hash of dependencies
     *
     * @internal
     */
    BuildCache.prototype.getDependencyHash = function (handlerPath) {
        return __awaiter(this, void 0, void 0, function () {
            var dir, packageJsonPath, candidate, packageJson, deps;
            return __generator(this, function (_a) {
                try {
                    dir = path.dirname(handlerPath);
                    packageJsonPath = null;
                    while (dir !== path.parse(dir).root) {
                        candidate = path.join(dir, 'package.json');
                        if (fs.existsSync(candidate)) {
                            packageJsonPath = candidate;
                            break;
                        }
                        dir = path.dirname(dir);
                    }
                    if (!packageJsonPath) {
                        return [2 /*return*/, 'no-package-json'];
                    }
                    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                    deps = {
                        dependencies: packageJson.dependencies || {},
                        devDependencies: packageJson.devDependencies || {},
                    };
                    return [2 /*return*/, crypto
                            .createHash('sha256')
                            .update(JSON.stringify(deps))
                            .digest('hex')];
                }
                catch (error) {
                    // If we can't read package.json, return a constant
                    return [2 /*return*/, 'no-deps'];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Convert Uint8Array to base64 string
     *
     * @param data - Uint8Array data
     * @returns Base64 encoded string
     *
     * @internal
     */
    BuildCache.prototype.uint8ArrayToBase64 = function (data) {
        return Buffer.from(data).toString('base64');
    };
    /**
     * Convert base64 string to Uint8Array
     *
     * @param base64 - Base64 encoded string
     * @returns Uint8Array data
     *
     * @internal
     */
    BuildCache.prototype.base64ToUint8Array = function (base64) {
        return new Uint8Array(Buffer.from(base64, 'base64'));
    };
    return BuildCache;
}());
exports.BuildCache = BuildCache;
