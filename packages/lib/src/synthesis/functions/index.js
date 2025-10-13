"use strict";
/**
 * Azure Functions Discovery, Environment Resolution, and Build Pipeline
 *
 * @remarks
 * This module provides the complete Azure Functions infrastructure including:
 *
 * **Discovery System**:
 * - {@link FunctionDiscovery}: Scans filesystem for function directories
 * - {@link ResourceLoader}: Loads and parses resource.ts files
 * - {@link EnvironmentResolver}: Resolves ${PLACEHOLDER} variables
 *
 * **Build Pipeline**:
 * - {@link FunctionBundler}: TypeScript compilation and bundling with esbuild
 * - {@link BuildCache}: Build caching with automatic invalidation
 * - {@link FunctionBuilder}: Build orchestration with parallel processing
 * - {@link StoragePackager}: Function packaging for Azure Storage deployment
 *
 * @packageDocumentation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionSynthesizer = exports.ArmFunctionBundler = exports.StoragePackager = exports.FunctionBuilder = exports.BuildCache = exports.FunctionBundler = exports.PackagingError = exports.BuildError = exports.EnvironmentResolutionError = exports.ResourceLoadError = exports.DiscoveryError = exports.PackagingStrategy = exports.EnvironmentResolver = exports.ResourceLoader = exports.FunctionDiscovery = void 0;
// Core discovery and resolution
var discovery_1 = require("./discovery");
Object.defineProperty(exports, "FunctionDiscovery", { enumerable: true, get: function () { return discovery_1.FunctionDiscovery; } });
var resource_loader_1 = require("./resource-loader");
Object.defineProperty(exports, "ResourceLoader", { enumerable: true, get: function () { return resource_loader_1.ResourceLoader; } });
var env_resolver_1 = require("./env-resolver");
Object.defineProperty(exports, "EnvironmentResolver", { enumerable: true, get: function () { return env_resolver_1.EnvironmentResolver; } });
// Types and interfaces
var types_1 = require("./types");
Object.defineProperty(exports, "PackagingStrategy", { enumerable: true, get: function () { return types_1.PackagingStrategy; } });
// Error types
Object.defineProperty(exports, "DiscoveryError", { enumerable: true, get: function () { return types_1.DiscoveryError; } });
Object.defineProperty(exports, "ResourceLoadError", { enumerable: true, get: function () { return types_1.ResourceLoadError; } });
Object.defineProperty(exports, "EnvironmentResolutionError", { enumerable: true, get: function () { return types_1.EnvironmentResolutionError; } });
Object.defineProperty(exports, "BuildError", { enumerable: true, get: function () { return types_1.BuildError; } });
Object.defineProperty(exports, "PackagingError", { enumerable: true, get: function () { return types_1.PackagingError; } });
// Bindings framework
__exportStar(require("./bindings"), exports);
// Build pipeline components
var bundler_1 = require("./bundler");
Object.defineProperty(exports, "FunctionBundler", { enumerable: true, get: function () { return bundler_1.FunctionBundler; } });
var cache_1 = require("./cache");
Object.defineProperty(exports, "BuildCache", { enumerable: true, get: function () { return cache_1.BuildCache; } });
var builder_1 = require("./builder");
Object.defineProperty(exports, "FunctionBuilder", { enumerable: true, get: function () { return builder_1.FunctionBuilder; } });
var storage_packager_1 = require("./packaging/storage-packager");
Object.defineProperty(exports, "StoragePackager", { enumerable: true, get: function () { return storage_packager_1.StoragePackager; } });
// ARM inline deployment components
var function_bundler_1 = require("./function-bundler");
Object.defineProperty(exports, "ArmFunctionBundler", { enumerable: true, get: function () { return function_bundler_1.FunctionBundler; } });
var function_synthesizer_1 = require("./function-synthesizer");
Object.defineProperty(exports, "FunctionSynthesizer", { enumerable: true, get: function () { return function_synthesizer_1.FunctionSynthesizer; } });
