"use strict";
/**
 * Storage packager for Azure Functions
 *
 * @remarks
 * This module packages function artifacts for deployment to Azure Storage.
 * Functions larger than 4KB but smaller than 100MB are typically deployed
 * via Storage Account using ZIP packages.
 *
 * The packager:
 * - Creates ZIP archives containing function code and metadata
 * - Generates function.json for bindings
 * - Computes integrity hashes
 * - Prepares deployment configuration
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
exports.StoragePackager = void 0;
var crypto = require("crypto");
var types_1 = require("../types");
/**
 * Storage packager for function deployment
 *
 * @remarks
 * Packages function artifacts into ZIP archives suitable for
 * deployment to Azure Storage and consumption by Azure Functions.
 *
 * @example
 * ```typescript
 * const packager = new StoragePackager({
 *   includeSourceMaps: true,
 *   compressionLevel: 9
 * });
 *
 * const pkg = await packager.package(artifact, trigger, inputBindings, outputBindings);
 * ```
 */
var StoragePackager = /** @class */ (function () {
    function StoragePackager(options) {
        var _a, _b, _c;
        this.options = {
            includeSourceMaps: (_a = options === null || options === void 0 ? void 0 : options.includeSourceMaps) !== null && _a !== void 0 ? _a : true,
            compressionLevel: (_b = options === null || options === void 0 ? void 0 : options.compressionLevel) !== null && _b !== void 0 ? _b : 9,
            outputDir: (_c = options === null || options === void 0 ? void 0 : options.outputDir) !== null && _c !== void 0 ? _c : '.atakora/packages',
        };
    }
    /**
     * Package a function artifact for storage deployment
     *
     * @param artifact - Build artifact
     * @param trigger - Function trigger configuration
     * @param inputBindings - Input bindings (optional)
     * @param outputBindings - Output bindings (optional)
     * @returns Function package ready for deployment
     *
     * @throws {PackagingError} If packaging fails
     */
    StoragePackager.prototype.package = function (artifact, trigger, inputBindings, outputBindings) {
        return __awaiter(this, void 0, void 0, function () {
            var functionJson, entries, zipBuffer, integrity, deployment, pkg, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        functionJson = this.generateFunctionJson(trigger, inputBindings, outputBindings);
                        entries = [
                            // Main function code
                            {
                                path: 'index.js',
                                content: artifact.bundle,
                                compression: this.options.compressionLevel,
                            },
                            // function.json
                            {
                                path: 'function.json',
                                content: JSON.stringify(functionJson, null, 2),
                                compression: this.options.compressionLevel,
                            },
                        ];
                        // Add source map if available and enabled
                        if (this.options.includeSourceMaps && artifact.sourceMap) {
                            entries.push({
                                path: 'index.js.map',
                                content: artifact.sourceMap,
                                compression: this.options.compressionLevel,
                            });
                        }
                        return [4 /*yield*/, this.createZip(entries)];
                    case 1:
                        zipBuffer = _a.sent();
                        integrity = this.computeIntegrity(zipBuffer);
                        deployment = {
                            type: 'storage',
                            integrity: integrity,
                            // Location will be set during assembly phase when uploaded
                            // to Azure Storage and SAS token is generated
                        };
                        pkg = {
                            artifact: artifact,
                            strategy: types_1.PackagingStrategy.STORAGE,
                            deployment: deployment,
                        };
                        return [2 /*return*/, pkg];
                    case 2:
                        error_1 = _a.sent();
                        throw new types_1.PackagingError("Failed to package function ".concat(artifact.functionName, ": ").concat(error_1 instanceof Error ? error_1.message : 'Unknown error'), types_1.PackagingStrategy.STORAGE, error_1 instanceof Error ? error_1 : undefined);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Determine if artifact should use storage packaging
     *
     * @param artifact - Build artifact
     * @returns True if storage packaging is appropriate
     *
     * @remarks
     * Storage packaging is suitable for:
     * - Functions > 4KB (too large for inline)
     * - Functions < 100MB (storage limit)
     * - Functions without native modules
     */
    StoragePackager.prototype.shouldUseStoragePackaging = function (artifact) {
        var _a;
        var sizeKB = artifact.metadata.size / 1024;
        var hasNativeModules = (_a = artifact.metadata.hasNativeModules) !== null && _a !== void 0 ? _a : false;
        return sizeKB >= 4 && sizeKB < 100 * 1024 && !hasNativeModules;
    };
    /**
     * Generate function.json from trigger and bindings
     *
     * @param trigger - Trigger configuration
     * @param inputBindings - Input bindings
     * @param outputBindings - Output bindings
     * @returns function.json structure
     *
     * @internal
     */
    StoragePackager.prototype.generateFunctionJson = function (trigger, inputBindings, outputBindings) {
        var _this = this;
        var bindings = [];
        // Add trigger (always first binding)
        bindings.push(this.triggerToBinding(trigger));
        // Add input bindings
        if (inputBindings) {
            bindings.push.apply(bindings, inputBindings.map(function (b) { return _this.bindingToJson(b); }));
        }
        // Add output bindings
        if (outputBindings) {
            bindings.push.apply(bindings, outputBindings.map(function (b) { return _this.bindingToJson(b); }));
        }
        return {
            bindings: bindings,
            disabled: false,
            scriptFile: 'index.js',
        };
    };
    /**
     * Convert trigger config to function.json binding
     *
     * @param trigger - Trigger configuration
     * @returns Binding JSON
     *
     * @internal
     */
    StoragePackager.prototype.triggerToBinding = function (trigger) {
        var binding = {
            type: trigger.type,
            direction: 'in',
            name: 'trigger', // Standard name for trigger parameter
        };
        // Copy trigger-specific properties
        for (var _i = 0, _a = Object.entries(trigger); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (key !== 'type') {
                binding[key] = value;
            }
        }
        return binding;
    };
    /**
     * Convert binding config to function.json binding
     *
     * @param binding - Binding configuration
     * @returns Binding JSON
     *
     * @internal
     */
    StoragePackager.prototype.bindingToJson = function (binding) {
        var json = {
            type: binding.type,
            direction: binding.direction,
            name: binding.name,
        };
        // Copy binding-specific properties
        for (var _i = 0, _a = Object.entries(binding); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (key !== 'type' && key !== 'direction' && key !== 'name') {
                json[key] = value;
            }
        }
        return json;
    };
    /**
     * Create ZIP archive from entries
     *
     * @param entries - ZIP entries
     * @returns ZIP buffer
     *
     * @remarks
     * This is a simplified ZIP implementation for now.
     * In production, use a proper ZIP library like jszip or archiver.
     *
     * @internal
     */
    StoragePackager.prototype.createZip = function (entries) {
        return __awaiter(this, void 0, void 0, function () {
            var buffers, totalSize, _i, entries_1, entry, content, result, offset, _a, buffers_1, buffer;
            return __generator(this, function (_b) {
                buffers = [];
                totalSize = 0;
                for (_i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                    entry = entries_1[_i];
                    content = typeof entry.content === 'string'
                        ? new TextEncoder().encode(entry.content)
                        : entry.content;
                    // For now, just concatenate (in production, create proper ZIP structure)
                    buffers.push(content);
                    totalSize += content.length;
                }
                result = new Uint8Array(totalSize);
                offset = 0;
                for (_a = 0, buffers_1 = buffers; _a < buffers_1.length; _a++) {
                    buffer = buffers_1[_a];
                    result.set(buffer, offset);
                    offset += buffer.length;
                }
                return [2 /*return*/, result];
            });
        });
    };
    /**
     * Compute SHA256 integrity hash
     *
     * @param data - Data to hash
     * @returns Hex-encoded hash
     *
     * @internal
     */
    StoragePackager.prototype.computeIntegrity = function (data) {
        return crypto
            .createHash('sha256')
            .update(data)
            .digest('hex');
    };
    /**
     * Estimate package size
     *
     * @param artifact - Build artifact
     * @returns Estimated package size in bytes
     *
     * @remarks
     * Estimates final ZIP size based on bundle size and compression ratio.
     * Actual size may vary.
     */
    StoragePackager.prototype.estimatePackageSize = function (artifact) {
        // Estimate compression ratio (typically 60-70% of original size)
        var compressionRatio = 0.65;
        // Bundle size
        var estimatedSize = artifact.metadata.size * compressionRatio;
        // Add source map if included
        if (this.options.includeSourceMaps && artifact.sourceMap) {
            estimatedSize += artifact.sourceMap.length * compressionRatio;
        }
        // Add overhead for function.json and ZIP structure (~1KB)
        estimatedSize += 1024;
        return Math.ceil(estimatedSize);
    };
    return StoragePackager;
}());
exports.StoragePackager = StoragePackager;
