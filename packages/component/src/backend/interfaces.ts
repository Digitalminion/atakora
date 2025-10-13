/**
 * Backend Pattern Interface Definitions
 *
 * This file contains the complete TypeScript interface definitions for the
 * defineBackend() pattern implementation. These interfaces ensure type safety
 * and provide clear contracts for all components in the system.
 *
 * @module @atakora/component/backend
 */

import type {
  Construct,
  ResourceGroupStack,
  SubscriptionStack,
  ManagementGroupStack,
} from '@atakora/cdk';

/**
 * Union type for all Azure stack types
 */
export type AzureStack = ResourceGroupStack | SubscriptionStack | ManagementGroupStack;

// ============================================================================
// Resource Requirements
// ============================================================================

/**
 * Base interface for all resource requirements.
 * Components declare their infrastructure needs through these requirements.
 *
 * @example
 * ```typescript
 * const requirement: IResourceRequirement = {
 *   resourceType: 'cosmos',
 *   requirementKey: 'shared-database',
 *   config: {
 *     enableServerless: true,
 *     databases: [{ name: 'users-db' }]
 *   },
 *   priority: 10
 * };
 * ```
 */
export interface IResourceRequirement {
  /** Type of resource needed (e.g., 'cosmos', 'storage', 'functions') */
  readonly resourceType: string;

  /** Unique key for deduplication and reference */
  readonly requirementKey: string;

  /** Configuration requirements for the resource */
  readonly config: ResourceConfig;

  /** Priority for conflict resolution (higher wins, default: 10) */
  readonly priority?: number;

  /** Validation rules for compatibility checking */
  readonly validators?: ReadonlyArray<RequirementValidator>;

  /** Metadata for debugging and tracing */
  readonly metadata?: RequirementMetadata;
}

/**
 * Generic resource configuration
 * Allows flexible configuration while maintaining type safety
 */
export type ResourceConfig = Record<string, unknown>;

/**
 * Validator for requirement compatibility
 * Used to ensure requirements can be safely merged
 */
export interface RequirementValidator {
  /** Validator name for debugging */
  readonly name: string;

  /**
   * Validate requirement against context
   * @param requirement - The requirement to validate
   * @param context - Validation context
   * @returns Validation result with errors/warnings
   */
  validate(requirement: IResourceRequirement, context: ValidationContext): ValidationResult;
}

/**
 * Context provided to validators
 * Includes all information needed for comprehensive validation
 */
export interface ValidationContext {
  /** All requirements being processed */
  readonly allRequirements: ReadonlyArray<IResourceRequirement>;

  /** Resources that already exist */
  readonly existingResources: ResourceMap;

  /** Backend configuration */
  readonly backendConfig: BackendConfig;
}

/**
 * Result of validation
 * Provides detailed information about validation success or failure
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;

  /** Critical errors that prevent proceeding */
  readonly errors?: ReadonlyArray<string>;

  /** Non-critical warnings */
  readonly warnings?: ReadonlyArray<string>;
}

/**
 * Metadata for requirements
 * Used for debugging and tracing requirement sources
 */
export interface RequirementMetadata {
  /** Source component that created this requirement */
  readonly source: string;

  /** Version of the requirement schema */
  readonly version: string;

  /** Human-readable description */
  readonly description?: string;
}

// ============================================================================
// Specific Resource Requirements
// ============================================================================

/**
 * Cosmos DB consistency levels
 * @see https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels
 */
export type CosmosConsistencyLevel = 'Eventual' | 'ConsistentPrefix' | 'Session' | 'BoundedStaleness' | 'Strong';

/**
 * Cosmos DB capabilities
 * Determines which API to enable
 */
export type CosmosCapability = 'EnableCassandra' | 'EnableGremlin' | 'EnableTable' | 'EnableMongo';

/**
 * Cosmos DB specific requirement
 * Extends base requirement with Cosmos-specific configuration
 */
export interface ICosmosRequirement extends IResourceRequirement {
  readonly resourceType: 'cosmos';
  readonly config: CosmosConfig;
}

/**
 * Configuration for Cosmos DB resources
 */
export interface CosmosConfig extends Record<string, unknown> {
  /** Consistency level for the account */
  readonly consistency?: CosmosConsistencyLevel;

  /** Enable serverless mode (pay per request) */
  readonly enableServerless?: boolean;

  /** Enable multi-region writes */
  readonly enableMultiRegion?: boolean;

  /** API capabilities to enable */
  readonly capabilities?: ReadonlyArray<CosmosCapability>;

  /** Databases to create */
  readonly databases?: ReadonlyArray<DatabaseRequirement>;

  /** Public network access setting */
  readonly publicNetworkAccess?: 'Enabled' | 'Disabled';

  /** IP rules for firewall */
  readonly ipRules?: ReadonlyArray<string>;
}

/**
 * Database requirements within a Cosmos DB account
 */
export interface DatabaseRequirement {
  /** Database name */
  readonly name: string;

  /** Provisioned throughput (RU/s) */
  readonly throughput?: number;

  /** Containers within the database */
  readonly containers?: ReadonlyArray<ContainerRequirement>;
}

/**
 * Container requirements within a Cosmos DB database
 */
export interface ContainerRequirement {
  /** Container name */
  readonly name: string;

  /** Partition key path (e.g., '/id') */
  readonly partitionKey: string;

  /** Unique key paths */
  readonly uniqueKeys?: ReadonlyArray<string>;

  /** Time-to-live in seconds */
  readonly ttl?: number;

  /** Provisioned throughput (RU/s) */
  readonly throughput?: number;

  /** Indexing policy */
  readonly indexingPolicy?: IndexingPolicy;
}

/**
 * Indexing policy for Cosmos DB containers
 */
export interface IndexingPolicy {
  /** Enable automatic indexing */
  readonly automatic?: boolean;

  /** Indexing mode */
  readonly indexingMode?: 'Consistent' | 'None';

  /** Paths to include in index */
  readonly includedPaths?: ReadonlyArray<{ readonly path: string }>;

  /** Paths to exclude from index */
  readonly excludedPaths?: ReadonlyArray<{ readonly path: string }>;
}

/**
 * Function runtime types
 */
export type FunctionRuntime = 'node' | 'dotnet' | 'java' | 'python' | 'powershell' | 'custom';

/**
 * App Service / Function App SKUs
 */
export type FunctionAppSku = 'Y1' | 'EP1' | 'EP2' | 'EP3' | 'B1' | 'S1' | 'P1v2';

/**
 * Function App specific requirement
 * Extends base requirement with Function App-specific configuration
 */
export interface IFunctionAppRequirement extends IResourceRequirement {
  readonly resourceType: 'functions';
  readonly config: FunctionAppConfig;
}

/**
 * Configuration for Function App resources
 */
export interface FunctionAppConfig extends Record<string, unknown> {
  /** Runtime language */
  readonly runtime: FunctionRuntime;

  /** Runtime version (e.g., '20' for Node 20) */
  readonly version?: string;

  /** App Service Plan SKU */
  readonly sku?: FunctionAppSku;

  /** Keep app always on (not available in Consumption) */
  readonly alwaysOn?: boolean;

  /** Use 32-bit worker process */
  readonly use32BitWorkerProcess?: boolean;

  /** Environment variables */
  readonly environmentVariables?: Record<string, string>;

  /** Function extensions to install */
  readonly extensions?: ReadonlyArray<string>;

  /** CORS settings */
  readonly cors?: CorsSettings;

  /** Connection strings */
  readonly connectionStrings?: Record<string, ConnectionString>;
}

/**
 * CORS configuration for Function Apps
 */
export interface CorsSettings {
  /** Allowed origin URLs */
  readonly allowedOrigins: ReadonlyArray<string>;

  /** Support credentials */
  readonly supportCredentials?: boolean;
}

/**
 * Connection string types
 */
export type ConnectionStringType =
  | 'MySql'
  | 'SQLServer'
  | 'SQLAzure'
  | 'Custom'
  | 'NotificationHub'
  | 'ServiceBus'
  | 'EventHub'
  | 'ApiHub'
  | 'DocDb'
  | 'RedisCache'
  | 'PostgreSQL';

/**
 * Connection string configuration
 */
export interface ConnectionString {
  /** Connection string type */
  readonly type: ConnectionStringType;

  /** Connection string value */
  readonly value: string;
}

/**
 * Storage Account SKUs
 */
export type StorageSku = 'Standard_LRS' | 'Standard_GRS' | 'Standard_RAGRS' | 'Standard_ZRS' | 'Premium_LRS';

/**
 * Storage Account kinds
 */
export type StorageKind = 'Storage' | 'StorageV2' | 'BlobStorage' | 'FileStorage' | 'BlockBlobStorage';

/**
 * Storage Account access tiers
 */
export type StorageAccessTier = 'Hot' | 'Cool';

/**
 * Storage Account specific requirement
 * Extends base requirement with Storage-specific configuration
 */
export interface IStorageRequirement extends IResourceRequirement {
  readonly resourceType: 'storage';
  readonly config: StorageConfig;
}

/**
 * Configuration for Storage Account resources
 */
export interface StorageConfig extends Record<string, unknown> {
  /** Storage SKU */
  readonly sku: StorageSku;

  /** Storage account kind */
  readonly kind?: StorageKind;

  /** Access tier */
  readonly accessTier?: StorageAccessTier;

  /** Enforce HTTPS only */
  readonly enableHttpsOnly?: boolean;

  /** Blob containers */
  readonly containers?: ReadonlyArray<StorageContainer>;

  /** Storage queues */
  readonly queues?: ReadonlyArray<string>;

  /** Storage tables */
  readonly tables?: ReadonlyArray<string>;

  /** File shares */
  readonly fileShares?: ReadonlyArray<FileShare>;
}

/**
 * Blob container configuration
 */
export interface StorageContainer {
  /** Container name */
  readonly name: string;

  /** Public access level */
  readonly publicAccess?: 'None' | 'Blob' | 'Container';
}

/**
 * File share configuration
 */
export interface FileShare {
  /** File share name */
  readonly name: string;

  /** Quota in GB */
  readonly quota?: number;
}

// ============================================================================
// Component Interfaces
// ============================================================================

/**
 * Interface for components that can be managed by a backend.
 * All components participating in the backend pattern must implement this interface.
 *
 * @typeParam TConfig - The configuration type for this component
 *
 * @example
 * ```typescript
 * class CrudApi implements IBackendComponent<CrudApiConfig> {
 *   readonly componentId = 'UserApi';
 *   readonly componentType = 'CrudApi';
 *   readonly config = { entityName: 'User' };
 *
 *   getRequirements(): IResourceRequirement[] {
 *     return [{ resourceType: 'cosmos', ... }];
 *   }
 *
 *   initialize(resources: ResourceMap, scope: Construct): void {
 *     // Use injected resources
 *   }
 * }
 * ```
 */
export interface IBackendComponent<TConfig = unknown> {
  /** Unique identifier for this component instance */
  readonly componentId: string;

  /** Component type (e.g., 'CrudApi', 'StaticSite') */
  readonly componentType: string;

  /** Configuration provided during definition */
  readonly config: TConfig;

  /**
   * Get resource requirements for this component
   * @returns Array of resource requirements
   */
  getRequirements(): ReadonlyArray<IResourceRequirement>;

  /**
   * Initialize component with resolved resources
   * @param resources - Map of resolved resources
   * @param scope - CDK construct scope
   */
  initialize(resources: ResourceMap, scope: Construct): void;

  /**
   * Validate that provided resources meet requirements
   * @param resources - Map of resources to validate
   * @returns Validation result
   */
  validateResources(resources: ResourceMap): ValidationResult;

  /**
   * Get outputs from this component
   * @returns Component outputs
   */
  getOutputs(): ComponentOutputs;
}

/**
 * Component outputs for cross-component references
 * Allows components to expose values to other components
 */
export interface ComponentOutputs {
  readonly [key: string]: unknown;
}

/**
 * Component definition before initialization.
 * Used during the definition phase to capture component configuration.
 *
 * @typeParam TConfig - The configuration type for this component
 */
export interface IComponentDefinition<TConfig = unknown> {
  /** Unique component identifier */
  readonly componentId: string;

  /** Component type name */
  readonly componentType: string;

  /** Component configuration */
  readonly config: TConfig;

  /** Factory function to create component instance */
  readonly factory: ComponentFactory<TConfig>;
}

/**
 * Factory for creating component instances.
 * Called by the backend during initialization phase.
 *
 * @typeParam TConfig - The configuration type for this component
 * @param scope - CDK construct scope
 * @param id - Component ID
 * @param config - Component configuration
 * @param resources - Resolved resources
 * @returns Initialized component instance
 */
export type ComponentFactory<TConfig> = (
  scope: Construct,
  id: string,
  config: TConfig,
  resources: ResourceMap
) => IBackendComponent<TConfig>;

// ============================================================================
// Backend Interfaces
// ============================================================================

/**
 * Main backend interface.
 * Orchestrates component registration, resource provisioning, and initialization.
 */
export interface IBackend {
  /** Unique backend identifier */
  readonly backendId: string;

  /** All registered components */
  readonly components: ReadonlyMap<string, IBackendComponent>;

  /** Shared resources created by this backend */
  readonly resources: ResourceMap;

  /** Backend configuration */
  readonly config: BackendConfig;

  /**
   * Add component to backend
   * @param component - Component definition to add
   */
  addComponent(component: IComponentDefinition): void;

  /**
   * Initialize all components and resources
   * @param scope - CDK construct scope
   */
  initialize(scope: Construct): void;

  /**
   * Add backend to CDK stack
   * @param stack - CDK stack to add to
   */
  addToStack(stack: AzureStack): void;

  /**
   * Get specific resource by type and key
   * @typeParam T - Expected resource type
   * @param type - Resource type
   * @param key - Optional resource key
   * @returns Resource or undefined if not found
   */
  getResource<T = unknown>(type: string, key?: string): T | undefined;

  /**
   * Get component by ID
   * @typeParam T - Expected component type
   * @param id - Component ID
   * @returns Component or undefined if not found
   */
  getComponent<T extends IBackendComponent = IBackendComponent>(id: string): T | undefined;

  /**
   * Validate all components and resources
   * @returns Validation result
   */
  validate(): ValidationResult;
}

/**
 * Resource map for dependency injection.
 * Maps resource keys to resource instances.
 */
export type ResourceMap = ReadonlyMap<string, unknown>;

/**
 * Backend configuration.
 * Controls how the backend manages resources and components.
 */
export interface BackendConfig {
  /** Enable monitoring with Application Insights */
  readonly monitoring?: boolean | MonitoringConfig;

  /** Network isolation strategy */
  readonly networking?: 'public' | 'isolated' | NetworkingConfig;

  /** Resource naming convention */
  readonly naming?: NamingConvention;

  /** Tags to apply to all resources */
  readonly tags?: Record<string, string>;

  /** Custom resource providers */
  readonly providers?: ReadonlyArray<IResourceProvider>;

  /** Resource limits and quotas */
  readonly limits?: ResourceLimits;

  /** Environment (dev, staging, prod) */
  readonly environment?: string;

  /** Azure region */
  readonly location?: string;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /** Enable monitoring */
  readonly enabled: boolean;

  /** Log retention in days */
  readonly retentionDays?: number;

  /** Sampling percentage (0-100) */
  readonly samplingPercentage?: number;

  /** Log Analytics workspace name */
  readonly workspaceName?: string;

  /** Application Insights name */
  readonly applicationInsightsName?: string;
}

/**
 * Networking configuration
 */
export interface NetworkingConfig {
  /** Networking mode */
  readonly mode: 'public' | 'isolated' | 'hybrid';

  /** Virtual network name */
  readonly vnetName?: string;

  /** Subnet name */
  readonly subnetName?: string;

  /** Enable private endpoints */
  readonly privateEndpoints?: boolean;

  /** Service tags for firewall rules */
  readonly serviceTags?: ReadonlyArray<string>;
}

/**
 * Resource naming convention.
 * Provides consistent naming for all resources.
 */
export interface NamingConvention {
  /**
   * Format resource name
   * @param resourceType - Type of resource
   * @param backendId - Backend identifier
   * @param suffix - Optional suffix
   * @returns Formatted resource name
   */
  formatResourceName(
    resourceType: string,
    backendId: string,
    suffix?: string
  ): string;

  /**
   * Format resource group name
   * @param backendId - Backend identifier
   * @param environment - Optional environment
   * @returns Formatted resource group name
   */
  formatResourceGroupName(backendId: string, environment?: string): string;
}

/**
 * Resource limits to prevent exceeding Azure quotas
 */
export interface ResourceLimits {
  /** Maximum Cosmos DB accounts */
  readonly maxCosmosAccounts?: number;

  /** Maximum Function Apps */
  readonly maxFunctionApps?: number;

  /** Maximum Storage Accounts */
  readonly maxStorageAccounts?: number;

  /** Maximum functions per Function App */
  readonly maxFunctionsPerApp?: number;

  /** Maximum containers per Storage Account */
  readonly maxContainersPerStorage?: number;
}

// ============================================================================
// Resource Provider Interfaces
// ============================================================================

/**
 * Interface for resource providers.
 * Providers are responsible for creating and managing specific resource types.
 */
export interface IResourceProvider {
  /** Provider identifier */
  readonly providerId: string;

  /** Resource types this provider can handle */
  readonly supportedTypes: ReadonlyArray<string>;

  /**
   * Check if provider can handle requirement
   * @param requirement - Requirement to check
   * @returns True if provider can handle this requirement
   */
  canProvide(requirement: IResourceRequirement): boolean;

  /**
   * Create or get existing resource
   * @param requirement - Resource requirement
   * @param scope - CDK construct scope
   * @param context - Provider context
   * @returns Created or existing resource
   */
  provideResource(
    requirement: IResourceRequirement,
    scope: Construct,
    context: ProviderContext
  ): unknown;

  /**
   * Merge multiple requirements into one
   * @param requirements - Requirements to merge
   * @returns Merged requirement
   */
  mergeRequirements(
    requirements: ReadonlyArray<IResourceRequirement>
  ): IResourceRequirement;

  /**
   * Validate merged requirements
   * @param requirement - Merged requirement to validate
   * @returns Validation result
   */
  validateMerged(requirement: IResourceRequirement): ValidationResult;
}

/**
 * Context provided to resource providers.
 * Contains all information needed to provision resources.
 */
export interface ProviderContext {
  /** Backend instance */
  readonly backend: IBackend;

  /** Naming convention */
  readonly naming: NamingConvention;

  /** Tags to apply */
  readonly tags: Record<string, string>;

  /** Existing resources */
  readonly existingResources: ResourceMap;

  /** Azure region */
  readonly location: string;

  /** Environment name */
  readonly environment: string;
}

// ============================================================================
// Configuration Merger Interfaces
// ============================================================================

/**
 * Merge strategy types
 */
export type MergeStrategy = 'union' | 'intersection' | 'priority' | 'maximum' | 'custom';

/**
 * Strategy for merging configurations.
 * Used when multiple components require the same resource with different configs.
 *
 * @typeParam T - Configuration type to merge
 */
export interface IConfigurationMerger<T = unknown> {
  /** Merger identifier */
  readonly mergerId: string;

  /**
   * Check if configurations can be merged
   * @param configs - Configurations to check
   * @returns True if configs can be merged
   */
  canMerge(configs: ReadonlyArray<T>): boolean;

  /**
   * Merge multiple configurations
   * @param configs - Configurations to merge
   * @returns Merged configuration
   */
  merge(configs: ReadonlyArray<T>): T;

  /**
   * Resolve conflicts between configurations
   * @param configs - Configurations with conflicts
   * @returns Conflict resolution result
   */
  resolveConflicts(configs: ReadonlyArray<T>): ConflictResolution<T>;
}

/**
 * Result of conflict resolution
 *
 * @typeParam T - Configuration type
 */
export interface ConflictResolution<T> {
  /** Resolved configuration */
  readonly resolved: T;

  /** Strategy used for resolution */
  readonly strategy: MergeStrategy;

  /** Non-critical warnings */
  readonly warnings?: ReadonlyArray<string>;

  /** Incompatibilities that couldn't be resolved */
  readonly incompatible?: ReadonlyArray<string>;

  /** Additional metadata about resolution */
  readonly metadata?: Record<string, unknown>;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Component map type
 * Maps component IDs to their definitions
 */
export type ComponentMap = {
  [K: string]: IComponentDefinition;
};

/**
 * Main entry point for creating backends.
 * Provides type-safe component access and configuration.
 */
export interface DefineBackendFunction {
  /**
   * Define backend with components
   * @typeParam T - Component map type
   * @param components - Component definitions
   * @param config - Backend configuration
   * @returns Typed backend instance
   */
  <T extends ComponentMap>(
    components: T,
    config?: BackendConfig
  ): TypedBackend<T>;

  /**
   * Define backend with configuration only
   * @param config - Backend configuration
   * @returns Backend builder
   */
  (config: BackendConfig): BackendBuilder;
}

/**
 * Typed backend with component access.
 * Provides type-safe access to components by their keys.
 *
 * @typeParam T - Component map type
 */
export interface TypedBackend<T extends ComponentMap> extends Omit<IBackend, 'components'> {
  /** Typed component access */
  readonly components: {
    [K in keyof T]: T[K] extends IComponentDefinition<infer C>
      ? IBackendComponent<C>
      : never;
  };
}

/**
 * Builder pattern for backends.
 * Provides fluent API for backend configuration.
 */
export interface BackendBuilder {
  /**
   * Add component to backend
   * @typeParam T - Component config type
   * @param component - Component definition
   * @returns Builder for chaining
   */
  addComponent<T>(component: IComponentDefinition<T>): BackendBuilder;

  /**
   * Configure monitoring
   * @param config - Monitoring configuration
   * @returns Builder for chaining
   */
  withMonitoring(config: MonitoringConfig): BackendBuilder;

  /**
   * Configure networking
   * @param config - Networking configuration
   * @returns Builder for chaining
   */
  withNetworking(config: NetworkingConfig): BackendBuilder;

  /**
   * Configure naming convention
   * @param convention - Naming convention
   * @returns Builder for chaining
   */
  withNaming(convention: NamingConvention): BackendBuilder;

  /**
   * Add tags
   * @param tags - Tags to add
   * @returns Builder for chaining
   */
  withTags(tags: Record<string, string>): BackendBuilder;

  /**
   * Add resource provider
   * @param provider - Resource provider
   * @returns Builder for chaining
   */
  withProvider(provider: IResourceProvider): BackendBuilder;

  /**
   * Build the backend
   * @returns Backend instance
   */
  build(): IBackend;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract config type from component definition
 */
export type ExtractConfig<T> = T extends IComponentDefinition<infer C> ? C : never;

/**
 * Extract component type from definition
 */
export type ExtractComponent<T> = T extends IComponentDefinition<infer C>
  ? IBackendComponent<C>
  : never;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for backend components
 * @param obj - Object to check
 * @returns True if object is a backend component
 */
export function isBackendComponent(obj: unknown): obj is IBackendComponent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'componentId' in obj &&
    typeof (obj as IBackendComponent).componentId === 'string' &&
    'componentType' in obj &&
    typeof (obj as IBackendComponent).componentType === 'string' &&
    'getRequirements' in obj &&
    typeof (obj as IBackendComponent).getRequirements === 'function' &&
    'initialize' in obj &&
    typeof (obj as IBackendComponent).initialize === 'function'
  );
}

/**
 * Type guard for component definitions
 * @param obj - Object to check
 * @returns True if object is a component definition
 */
export function isComponentDefinition(obj: unknown): obj is IComponentDefinition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'componentId' in obj &&
    typeof (obj as IComponentDefinition).componentId === 'string' &&
    'componentType' in obj &&
    typeof (obj as IComponentDefinition).componentType === 'string' &&
    'config' in obj &&
    'factory' in obj &&
    typeof (obj as IComponentDefinition).factory === 'function'
  );
}

/**
 * Type guard for resource requirements
 * @param obj - Object to check
 * @returns True if object is a resource requirement
 */
export function isResourceRequirement(obj: unknown): obj is IResourceRequirement {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'resourceType' in obj &&
    typeof (obj as IResourceRequirement).resourceType === 'string' &&
    'requirementKey' in obj &&
    typeof (obj as IResourceRequirement).requirementKey === 'string' &&
    'config' in obj &&
    typeof (obj as IResourceRequirement).config === 'object'
  );
}
