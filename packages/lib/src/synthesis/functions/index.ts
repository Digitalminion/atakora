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

// Core discovery and resolution
export { FunctionDiscovery } from './discovery';
export { ResourceLoader } from './resource-loader';
export { EnvironmentResolver, IResourceReference } from './env-resolver';

// Types and interfaces
export {
  // Directory and configuration types
  FunctionDirectory,
  FunctionConfiguration,
  FunctionDefinition,
  FunctionConfig,
  FunctionMetadata,
  DiscoveryResult,

  // Trigger and binding types
  TriggerConfig,
  BindingConfig,
  EnvironmentPlaceholders,

  // Build types
  BuildOptions,
  BuildArtifact,
  BuildMetadata,
  BuildResult,
  BuildTelemetry,
  FunctionPackage,
  DeploymentConfig,
  PackagingStrategy,
  CacheConfig,
  CacheEntry,

  // Error types
  DiscoveryError,
  ResourceLoadError,
  EnvironmentResolutionError,
  BuildError,
  PackagingError,
} from './types';

// Bindings framework
export * from './bindings';

// Build pipeline components
export { FunctionBundler } from './bundler';
export { BuildCache } from './cache';
export {
  FunctionBuilder,
  FunctionDescriptor,
  BuilderConfig,
} from './builder';
export {
  StoragePackager,
  StoragePackagerOptions,
} from './packaging/storage-packager';
