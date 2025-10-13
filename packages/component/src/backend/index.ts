/**
 * Backend Pattern Main Exports
 *
 * This is the main entry point for the backend pattern implementation.
 * It exports all public interfaces, classes, and utilities.
 *
 * @module @atakora/component/backend
 *
 * @example
 * ```typescript
 * import { Backend, IBackendComponent, IResourceRequirement } from '@atakora/component/backend';
 *
 * // Create backend
 * const backend = new Backend(scope, 'MyBackend', {
 *   environment: 'prod',
 *   location: 'eastus',
 * });
 *
 * // Add components
 * backend.addComponent(CrudApi.define('UserApi', config));
 *
 * // Initialize
 * backend.initialize(scope);
 * ```
 */

// ============================================================================
// Core Backend
// ============================================================================

export { Backend } from './backend';

// ============================================================================
// Interfaces
// ============================================================================

export type {
  // Core interfaces
  IBackend,
  IBackendComponent,
  IComponentDefinition,
  IResourceRequirement,
  IResourceProvider,

  // Configuration
  BackendConfig,
  MonitoringConfig,
  NetworkingConfig,
  NamingConvention,
  ResourceLimits,

  // Resource requirements
  ICosmosRequirement,
  IFunctionAppRequirement,
  IStorageRequirement,
  CosmosConfig,
  FunctionAppConfig,
  StorageConfig,
  DatabaseRequirement,
  ContainerRequirement,
  StorageContainer,
  FileShare,
  IndexingPolicy,
  CorsSettings,
  ConnectionString,

  // Validation
  ValidationResult,
  ValidationContext,
  RequirementValidator,
  RequirementMetadata,

  // Provider context
  ProviderContext,

  // Component types
  ComponentFactory,
  ComponentOutputs,
  ComponentMap,

  // Resource map
  ResourceMap,
  ResourceConfig,

  // Configuration merger
  IConfigurationMerger,
  ConflictResolution,
  MergeStrategy,

  // Factory functions
  DefineBackendFunction,
  TypedBackend,

  // Utility types
  ExtractConfig,
  ExtractComponent,

  // Specific types
  CosmosConsistencyLevel,
  CosmosCapability,
  FunctionRuntime,
  FunctionAppSku,
  StorageSku,
  StorageKind,
  StorageAccessTier,
  ConnectionStringType,
} from './interfaces';

// ============================================================================
// Type Guards
// ============================================================================

export {
  isBackendComponent,
  isComponentDefinition,
  isResourceRequirement,
} from './interfaces';

// ============================================================================
// Registry
// ============================================================================

export {
  ProviderRegistry,
  globalRegistry,
  registerGlobalProvider,
  registerGlobalProviders,
  getGlobalProvider,
  isGloballySupported,
} from './registry';

// ============================================================================
// Utilities
// ============================================================================

export {
  // Resource key formatting
  formatResourceKey,
  parseResourceKey,
  getResourceKeyFromRequirement,
  formatResourceKeyWithSuffix,

  // Backward compatibility
  markAsBackendManaged,
  setBackendId,

  // Validation
  validateRequirement,
  isValidRequirementKey,
  sanitizeRequirementKey,

  // Requirement analysis
  groupRequirementsByKey,
  groupRequirementsByType,
  getUniqueResourceTypes,
  filterRequirementsByType,

  // Priority handling
  DEFAULT_REQUIREMENT_PRIORITY,
  getEffectivePriority,
  sortRequirementsByPriority,
  getHighestPriorityRequirement,

  // Deep merge
  deepMerge,
  deepMergeAll,

  // Environment variables
  namespaceEnvironmentVariable,
  mergeEnvironmentVariables,

  // Error utilities
  createDuplicateKeyError,
  createUnsupportedResourceTypeError,
  createMissingProviderError,
  createResourceLimitError,
} from './utils';

// ============================================================================
// Errors
// ============================================================================

export {
  // Error classes
  BackendError,
  ComponentError,
  RequirementError,
  ProviderError,
  ProvisioningError,
  ValidationError,
  MergeError,
  ResourceLimitError,
  InitializationError,

  // Error factory functions
  createDuplicateComponentError,
  createComponentNotFoundError,
  createInvalidRequirementError,
  createMissingProviderError as createMissingProviderErrorTyped,
  createProviderFailureError,
  createProvisioningFailureError,
  createValidationFailureError,
  createIncompatibleConfigsError,
  createLimitExceededError,
  createInitializationFailureError,
} from './errors';

// ============================================================================
// Logging
// ============================================================================

export {
  // Logger class
  Logger,

  // Log level
  LogLevel,

  // Types
  type LogEntry,
  type LoggerConfig,
  type LogHandler,

  // Global logger
  globalLogger,

  // Logger factories
  getBackendLogger,
  getComponentLogger,
  getProviderLogger,

  // Global log level
  setGlobalLogLevel,
  getGlobalLogLevel,
} from './logger';

// ============================================================================
// Main API - defineBackend and Builder
// ============================================================================

export {
  defineBackend,
  isBackendManaged,
  getBackendId,
  setBackendContext,
} from './define-backend';

export {
  BackendBuilder,
  createBackendBuilder,
} from './builder';

// ============================================================================
// Resource Providers
// ============================================================================

export {
  CosmosProvider,
  FunctionsProvider,
  StorageProvider,
} from './providers';

// ============================================================================
// Re-exports for convenience
// ============================================================================

/**
 * Create a new backend instance.
 * Convenience function that wraps Backend constructor.
 *
 * @param scope - CDK construct scope
 * @param id - Backend identifier
 * @param config - Backend configuration
 * @returns Backend instance
 *
 * @deprecated Use defineBackend() instead for better type safety
 */
export function createBackend(
  scope: import('@atakora/cdk').Construct,
  id: string,
  config?: BackendConfig
): IBackend {
  const { Backend: BackendClass } = require('./backend');
  return new BackendClass(scope, id, config);
}

// Import types to satisfy TS
import type { BackendConfig, IBackend } from './interfaces';
