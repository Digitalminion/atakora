/**
 * Resource providers for the backend pattern.
 *
 * @packageDocumentation
 */

// Export base provider
export {
  BaseProvider,
  type IResourceRequirement,
  type IResourceProvider,
  type ProviderContext,
  type NamingConvention,
  type MergeResult,
  type SplitStrategy,
  type ValidationResult,
  ProviderError,
} from './base-provider';

// Export Cosmos DB provider
export {
  CosmosProvider,
  type DatabaseRequirement,
  type ContainerRequirement,
  type CosmosConfig,
} from './cosmos-provider';

// Export Functions provider
export {
  FunctionsProvider,
  type FunctionRuntime,
  type FunctionsConfig,
  type EnvironmentVariableConfig,
} from './functions-provider';

// Export Storage provider
export {
  StorageProvider,
  type ContainerConfig,
  type StorageConfig,
} from './storage-provider';
