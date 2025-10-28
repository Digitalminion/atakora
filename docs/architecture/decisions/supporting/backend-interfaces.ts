/**
 * Backend Pattern Interface Definitions
 *
 * This file contains the complete TypeScript interface definitions for the
 * defineBackend() pattern implementation. These interfaces ensure type safety
 * and provide clear contracts for all components in the system.
 */

import type { Construct } from '@atakora/cdk';
import type { Stack } from '@atakora/cdk';

// ============================================================================
// Resource Requirements
// ============================================================================

/**
 * Base interface for all resource requirements.
 * Components declare their infrastructure needs through these requirements.
 */
export interface IResourceRequirement {
  /** Type of resource needed (e.g., 'cosmos', 'storage', 'functions') */
  readonly resourceType: string;

  /** Unique key for deduplication and reference */
  readonly requirementKey: string;

  /** Configuration requirements for the resource */
  readonly config: ResourceConfig;

  /** Priority for conflict resolution (higher wins) */
  readonly priority?: number;

  /** Validation rules for compatibility checking */
  readonly validators?: ReadonlyArray<RequirementValidator>;

  /** Metadata for debugging and tracing */
  readonly metadata?: RequirementMetadata;
}

/**
 * Generic resource configuration
 */
export type ResourceConfig = Record<string, any>;

/**
 * Validator for requirement compatibility
 */
export interface RequirementValidator {
  readonly name: string;
  validate(requirement: IResourceRequirement, context: ValidationContext): ValidationResult;
}

/**
 * Context provided to validators
 */
export interface ValidationContext {
  readonly allRequirements: ReadonlyArray<IResourceRequirement>;
  readonly existingResources: ResourceMap;
  readonly backendConfig: BackendConfig;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors?: ReadonlyArray<string>;
  readonly warnings?: ReadonlyArray<string>;
}

/**
 * Metadata for requirements
 */
export interface RequirementMetadata {
  readonly source: string;
  readonly version: string;
  readonly description?: string;
}

// ============================================================================
// Specific Resource Requirements
// ============================================================================

/**
 * Cosmos DB specific requirement
 */
export interface ICosmosRequirement extends IResourceRequirement {
  readonly resourceType: 'cosmos';
  readonly config: CosmosConfig;
}

export interface CosmosConfig {
  readonly consistency?: 'Eventual' | 'ConsistentPrefix' | 'Session' | 'BoundedStaleness' | 'Strong';
  readonly enableServerless?: boolean;
  readonly enableMultiRegion?: boolean;
  readonly capabilities?: ReadonlyArray<'EnableCassandra' | 'EnableGremlin' | 'EnableTable' | 'EnableMongo'>;
  readonly databases?: ReadonlyArray<DatabaseRequirement>;
  readonly publicNetworkAccess?: 'Enabled' | 'Disabled';
  readonly ipRules?: ReadonlyArray<string>;
}

export interface DatabaseRequirement {
  readonly name: string;
  readonly throughput?: number;
  readonly containers?: ReadonlyArray<ContainerRequirement>;
}

export interface ContainerRequirement {
  readonly name: string;
  readonly partitionKey: string;
  readonly uniqueKeys?: ReadonlyArray<string>;
  readonly ttl?: number;
  readonly throughput?: number;
  readonly indexingPolicy?: IndexingPolicy;
}

export interface IndexingPolicy {
  readonly automatic?: boolean;
  readonly indexingMode?: 'Consistent' | 'None';
  readonly includedPaths?: ReadonlyArray<{ path: string }>;
  readonly excludedPaths?: ReadonlyArray<{ path: string }>;
}

/**
 * Function App specific requirement
 */
export interface IFunctionAppRequirement extends IResourceRequirement {
  readonly resourceType: 'functions';
  readonly config: FunctionAppConfig;
}

export interface FunctionAppConfig {
  readonly runtime: 'node' | 'dotnet' | 'java' | 'python' | 'powershell' | 'custom';
  readonly version?: string;
  readonly sku?: 'Y1' | 'EP1' | 'EP2' | 'EP3' | 'B1' | 'S1' | 'P1v2';
  readonly alwaysOn?: boolean;
  readonly use32BitWorkerProcess?: boolean;
  readonly environmentVariables?: Record<string, string>;
  readonly extensions?: ReadonlyArray<string>;
  readonly cors?: CorsSettings;
  readonly connectionStrings?: Record<string, ConnectionString>;
}

export interface CorsSettings {
  readonly allowedOrigins: ReadonlyArray<string>;
  readonly supportCredentials?: boolean;
}

export interface ConnectionString {
  readonly type: 'MySql' | 'SQLServer' | 'SQLAzure' | 'Custom' | 'NotificationHub' | 'ServiceBus' | 'EventHub' | 'ApiHub' | 'DocDb' | 'RedisCache' | 'PostgreSQL';
  readonly value: string;
}

/**
 * Storage Account specific requirement
 */
export interface IStorageRequirement extends IResourceRequirement {
  readonly resourceType: 'storage';
  readonly config: StorageConfig;
}

export interface StorageConfig {
  readonly sku: 'Standard_LRS' | 'Standard_GRS' | 'Standard_RAGRS' | 'Standard_ZRS' | 'Premium_LRS';
  readonly kind?: 'Storage' | 'StorageV2' | 'BlobStorage' | 'FileStorage' | 'BlockBlobStorage';
  readonly accessTier?: 'Hot' | 'Cool';
  readonly enableHttpsOnly?: boolean;
  readonly containers?: ReadonlyArray<StorageContainer>;
  readonly queues?: ReadonlyArray<string>;
  readonly tables?: ReadonlyArray<string>;
  readonly fileShares?: ReadonlyArray<FileShare>;
}

export interface StorageContainer {
  readonly name: string;
  readonly publicAccess?: 'None' | 'Blob' | 'Container';
}

export interface FileShare {
  readonly name: string;
  readonly quota?: number;
}

// ============================================================================
// Component Interfaces
// ============================================================================

/**
 * Interface for components that can be managed by a backend
 */
export interface IBackendComponent<TConfig = any> {
  /** Unique identifier for this component instance */
  readonly componentId: string;

  /** Component type (e.g., 'CrudApi', 'StaticSite') */
  readonly componentType: string;

  /** Configuration provided during definition */
  readonly config: TConfig;

  /** Get resource requirements for this component */
  getRequirements(): ReadonlyArray<IResourceRequirement>;

  /** Initialize component with resolved resources */
  initialize(resources: ResourceMap, scope: Construct): void;

  /** Validate that provided resources meet requirements */
  validateResources(resources: ResourceMap): ValidationResult;

  /** Get outputs from this component */
  getOutputs(): ComponentOutputs;
}

/**
 * Component outputs for cross-component references
 */
export interface ComponentOutputs {
  readonly [key: string]: any;
}

/**
 * Component definition before initialization
 */
export interface IComponentDefinition<TConfig = any> {
  readonly componentId: string;
  readonly componentType: string;
  readonly config: TConfig;
  readonly factory: ComponentFactory<TConfig>;
}

/**
 * Factory for creating component instances
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
 * Main backend interface
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

  /** Add component to backend */
  addComponent(component: IComponentDefinition): void;

  /** Initialize all components and resources */
  initialize(scope: Construct): void;

  /** Add backend to CDK stack */
  addToStack(stack: Stack): void;

  /** Get specific resource by type and key */
  getResource<T = any>(type: string, key?: string): T | undefined;

  /** Get component by ID */
  getComponent<T extends IBackendComponent = IBackendComponent>(id: string): T | undefined;

  /** Validate all components and resources */
  validate(): ValidationResult;
}

/**
 * Resource map for dependency injection
 */
export type ResourceMap = ReadonlyMap<string, any>;

/**
 * Backend configuration
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
  readonly enabled: boolean;
  readonly retentionDays?: number;
  readonly samplingPercentage?: number;
  readonly workspaceName?: string;
  readonly applicationInsightsName?: string;
}

/**
 * Networking configuration
 */
export interface NetworkingConfig {
  readonly mode: 'public' | 'isolated' | 'hybrid';
  readonly vnetName?: string;
  readonly subnetName?: string;
  readonly privateEndpoints?: boolean;
  readonly serviceTags?: ReadonlyArray<string>;
}

/**
 * Resource naming convention
 */
export interface NamingConvention {
  formatResourceName(
    resourceType: string,
    backendId: string,
    suffix?: string
  ): string;

  formatResourceGroupName(backendId: string, environment?: string): string;
}

/**
 * Resource limits
 */
export interface ResourceLimits {
  readonly maxCosmosAccounts?: number;
  readonly maxFunctionApps?: number;
  readonly maxStorageAccounts?: number;
  readonly maxFunctionsPerApp?: number;
  readonly maxContainersPerStorage?: number;
}

// ============================================================================
// Resource Provider Interfaces
// ============================================================================

/**
 * Interface for resource providers
 */
export interface IResourceProvider {
  /** Provider identifier */
  readonly providerId: string;

  /** Resource types this provider can handle */
  readonly supportedTypes: ReadonlyArray<string>;

  /** Check if provider can handle requirement */
  canProvide(requirement: IResourceRequirement): boolean;

  /** Create or get existing resource */
  provideResource(
    requirement: IResourceRequirement,
    scope: Construct,
    context: ProviderContext
  ): any;

  /** Merge multiple requirements into one */
  mergeRequirements(
    requirements: ReadonlyArray<IResourceRequirement>
  ): IResourceRequirement;

  /** Validate merged requirements */
  validateMerged(requirement: IResourceRequirement): ValidationResult;
}

/**
 * Context provided to resource providers
 */
export interface ProviderContext {
  readonly backend: IBackend;
  readonly naming: NamingConvention;
  readonly tags: Record<string, string>;
  readonly existingResources: ResourceMap;
  readonly location: string;
  readonly environment: string;
}

// ============================================================================
// Configuration Merger Interfaces
// ============================================================================

/**
 * Strategy for merging configurations
 */
export interface IConfigurationMerger<T = any> {
  /** Merger identifier */
  readonly mergerId: string;

  /** Check if configurations can be merged */
  canMerge(configs: ReadonlyArray<T>): boolean;

  /** Merge multiple configurations */
  merge(configs: ReadonlyArray<T>): T;

  /** Resolve conflicts between configurations */
  resolveConflicts(configs: ReadonlyArray<T>): ConflictResolution<T>;
}

/**
 * Result of conflict resolution
 */
export interface ConflictResolution<T> {
  readonly resolved: T;
  readonly strategy: 'union' | 'intersection' | 'priority' | 'maximum' | 'custom';
  readonly warnings?: ReadonlyArray<string>;
  readonly incompatible?: ReadonlyArray<string>;
  readonly metadata?: Record<string, any>;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Main entry point for creating backends
 */
export interface DefineBackendFunction {
  <T extends ComponentMap>(
    components: T,
    config?: BackendConfig
  ): TypedBackend<T>;

  (config: BackendConfig): BackendBuilder;
}

/**
 * Component map type
 */
export type ComponentMap = {
  [K: string]: IComponentDefinition;
};

/**
 * Typed backend with component access
 */
export interface TypedBackend<T extends ComponentMap> extends IBackend {
  readonly components: {
    [K in keyof T]: T[K] extends IComponentDefinition<infer C>
      ? IBackendComponent<C>
      : never;
  };
}

/**
 * Builder pattern for backends
 */
export interface BackendBuilder {
  addComponent<T>(component: IComponentDefinition<T>): BackendBuilder;
  withMonitoring(config: MonitoringConfig): BackendBuilder;
  withNetworking(config: NetworkingConfig): BackendBuilder;
  withNaming(convention: NamingConvention): BackendBuilder;
  withTags(tags: Record<string, string>): BackendBuilder;
  withProvider(provider: IResourceProvider): BackendBuilder;
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

/**
 * Type guard for backend components
 */
export function isBackendComponent(obj: any): obj is IBackendComponent {
  return (
    obj &&
    typeof obj.componentId === 'string' &&
    typeof obj.componentType === 'string' &&
    typeof obj.getRequirements === 'function' &&
    typeof obj.initialize === 'function'
  );
}

/**
 * Type guard for component definitions
 */
export function isComponentDefinition(obj: any): obj is IComponentDefinition {
  return (
    obj &&
    typeof obj.componentId === 'string' &&
    typeof obj.componentType === 'string' &&
    obj.config &&
    typeof obj.factory === 'function'
  );
}