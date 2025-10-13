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
export { FunctionDiscovery } from './discovery';
export { ResourceLoader } from './resource-loader';
export { EnvironmentResolver, IResourceReference } from './env-resolver';
export { FunctionDirectory, FunctionConfiguration, FunctionDefinition, FunctionConfig, FunctionMetadata, DiscoveryResult, TriggerConfig, BindingConfig, EnvironmentPlaceholders, BuildOptions, BuildArtifact, BuildMetadata, BuildResult, BuildTelemetry, FunctionPackage, DeploymentConfig, PackagingStrategy, CacheConfig, CacheEntry, DiscoveryError, ResourceLoadError, EnvironmentResolutionError, BuildError, PackagingError, } from './types';
export * from './bindings';
export { FunctionBundler } from './bundler';
export { BuildCache } from './cache';
export { FunctionBuilder, FunctionDescriptor, BuilderConfig, } from './builder';
export { StoragePackager, StoragePackagerOptions, } from './packaging/storage-packager';
export { FunctionBundler as ArmFunctionBundler, FunctionBundlerOptions as ArmFunctionBundlerOptions, FunctionBundleResult as ArmFunctionBundleResult, } from './function-bundler';
export { FunctionSynthesizer, FunctionConfig as ArmFunctionConfig, HttpTriggerConfig, CosmosDbTriggerConfig, } from './function-synthesizer';
//# sourceMappingURL=index.d.ts.map