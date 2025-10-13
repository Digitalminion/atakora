/**
 * Define Backend API
 *
 * Main entry point for creating type-safe backends with component definitions.
 * This file implements the defineBackend() function that developers use to
 * create backends with full TypeScript type inference.
 *
 * @module @atakora/component/backend
 */

import type { Construct } from '@atakora/cdk';
import { Backend } from './backend';
import type {
  IBackend,
  IBackendComponent,
  IComponentDefinition,
  ComponentMap,
  TypedBackend,
  BackendConfig,
  AzureStack,
  ResourceMap,
  ValidationResult,
  DefineBackendFunction,
} from './interfaces';
import { ProviderRegistry } from './registry';
import { CosmosProvider } from './providers/cosmos-provider';
import { FunctionsProvider } from './providers/functions-provider';
import { StorageProvider } from './providers/storage-provider';
import { getBackendLogger } from './logger';
import { BackendBuilder } from './builder';

const logger = getBackendLogger('define-backend');

/**
 * Context symbol for backend-managed scopes.
 * Used to mark and identify scopes that are managed by a backend.
 */
const BACKEND_CONTEXT_KEY = 'atakora:backend-managed';
const BACKEND_ID_CONTEXT_KEY = 'atakora:backend-id';

/**
 * Typed backend implementation that provides type-safe component access.
 * This class wraps the Backend instance and provides typed access to components.
 *
 * @typeParam T - Component map type for type inference
 */
class TypedBackendImpl<T extends ComponentMap> implements TypedBackend<T> {
  private readonly backend: Backend;
  private readonly componentDefinitions: T;
  private _components?: TypedBackend<T>['components'];
  private isInitialized = false;

  constructor(
    scope: Construct,
    id: string,
    components: T,
    config: BackendConfig
  ) {
    this.backend = new Backend(scope, id, config);
    this.componentDefinitions = components;

    // Register all component definitions
    for (const [id, definition] of Object.entries(components)) {
      logger.debug(`Registering component: ${id} (${definition.componentType})`);
      this.backend.addComponent(definition);
    }

    logger.info(`Created typed backend: ${id} with ${Object.keys(components).length} components`);
  }

  // ============================================================================
  // IBackend Implementation
  // ============================================================================

  public get backendId(): string {
    return this.backend.backendId;
  }

  public get resources(): ResourceMap {
    return this.backend.resources;
  }

  public get config(): BackendConfig {
    return this.backend.config;
  }

  /**
   * Get typed component access.
   * Components are only available after initialization.
   */
  public get components(): TypedBackend<T>['components'] {
    if (!this.isInitialized) {
      throw new Error(
        `Cannot access components before backend initialization. Call initialize() or addToStack() first.`
      );
    }

    if (!this._components) {
      // Build typed component map
      const components: Record<string, IBackendComponent> = {};
      for (const [id] of Object.entries(this.componentDefinitions)) {
        const component = this.backend.getComponent(id);
        if (component) {
          components[id] = component;
        }
      }
      this._components = components as TypedBackend<T>['components'];
    }

    return this._components;
  }

  public addComponent(component: IComponentDefinition): void {
    if (this.isInitialized) {
      throw new Error('Cannot add components after backend has been initialized');
    }
    this.backend.addComponent(component);
  }

  public initialize(scope: Construct): void {
    if (this.isInitialized) {
      throw new Error('Backend has already been initialized');
    }

    logger.info(`Initializing backend: ${this.backendId}`);

    // Mark scope as backend-managed
    this.markScope(scope);

    // Initialize the underlying backend
    this.backend.initialize(scope);

    this.isInitialized = true;

    logger.info(`Backend initialized successfully: ${this.backendId}`);
  }

  public addToStack(stack: AzureStack): void {
    if (this.isInitialized) {
      throw new Error('Backend has already been initialized');
    }

    logger.info(`Adding backend to stack: ${this.backendId}`);

    // Mark stack as backend-managed
    this.markScope(stack);

    // Initialize with stack as scope
    this.backend.initialize(stack);

    this.isInitialized = true;

    logger.info(`Backend added to stack successfully: ${this.backendId}`);
  }

  public getResource<TResource = unknown>(type: string, key?: string): TResource | undefined {
    return this.backend.getResource<TResource>(type, key);
  }

  public getComponent<TComponent extends IBackendComponent = IBackendComponent>(
    id: string
  ): TComponent | undefined {
    return this.backend.getComponent<TComponent>(id);
  }

  public validate(): ValidationResult {
    return this.backend.validate();
  }

  // ============================================================================
  // Private Methods - Context Management
  // ============================================================================

  /**
   * Mark a scope as backend-managed.
   * This allows components to detect if they're being used in a backend context.
   */
  private markScope(scope: Construct): void {
    scope.node.setContext(BACKEND_CONTEXT_KEY, true);
    scope.node.setContext(BACKEND_ID_CONTEXT_KEY, this.backendId);
    logger.debug(`Marked scope as backend-managed: ${this.backendId}`);
  }
}

/**
 * Get default resource providers.
 * These providers are automatically registered when creating a backend.
 *
 * @returns Array of default providers
 */
function getDefaultProviders() {
  return [
    new CosmosProvider(),
    new FunctionsProvider(),
    new StorageProvider(),
  ];
}

/**
 * Define a backend with typed components.
 * This is the main entry point for creating backends.
 *
 * @typeParam T - Component map type
 * @param components - Component definitions
 * @param config - Backend configuration
 * @returns Typed backend instance with type-safe component access
 *
 * @example
 * ```typescript
 * import { defineBackend } from '@atakora/component/backend';
 * import { CrudApi } from '@atakora/component/crud';
 * import { ResourceGroupStack } from '@atakora/cdk';
 *
 * // Define backend with components
 * const backend = defineBackend({
 *   userApi: CrudApi.define('UserApi', {
 *     entityName: 'User',
 *     schema: { id: 'string', name: 'string' }
 *   }),
 *   productApi: CrudApi.define('ProductApi', {
 *     entityName: 'Product',
 *     schema: { id: 'string', name: 'string' }
 *   })
 * }, {
 *   environment: 'prod',
 *   location: 'eastus',
 *   monitoring: true
 * });
 *
 * // Add to stack
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * backend.addToStack(stack);
 *
 * // Access components with full type safety
 * backend.components.userApi; // Type: CrudApi
 * backend.components.productApi; // Type: CrudApi
 * ```
 */
export function defineBackend<T extends ComponentMap>(
  components: T,
  config?: BackendConfig
): TypedBackend<T>;

/**
 * Define a backend with configuration only, returning a builder.
 * This overload provides a fluent API for progressive backend construction.
 *
 * @param config - Backend configuration
 * @returns Backend builder for fluent API
 *
 * @example
 * ```typescript
 * import { defineBackend } from '@atakora/component/backend';
 *
 * // Using builder pattern
 * const backend = defineBackend({ environment: 'prod' })
 *   .addComponent(CrudApi.define('UserApi', { entityName: 'User' }))
 *   .addComponent(CrudApi.define('ProductApi', { entityName: 'Product' }))
 *   .withMonitoring({ enabled: true, retentionDays: 90 })
 *   .build();
 * ```
 */
export function defineBackend(config: BackendConfig): BackendBuilder;

/**
 * Implementation of defineBackend with overload support.
 */
export function defineBackend<T extends ComponentMap>(
  componentsOrConfig: T | BackendConfig,
  config?: BackendConfig
): TypedBackend<T> | BackendBuilder {
  // Check if first argument is a BackendConfig (has known config keys)
  const isConfigOnly =
    componentsOrConfig &&
    typeof componentsOrConfig === 'object' &&
    !('componentId' in componentsOrConfig) &&
    (
      'monitoring' in componentsOrConfig ||
      'networking' in componentsOrConfig ||
      'naming' in componentsOrConfig ||
      'tags' in componentsOrConfig ||
      'providers' in componentsOrConfig ||
      'limits' in componentsOrConfig ||
      'environment' in componentsOrConfig ||
      'location' in componentsOrConfig
    );

  if (isConfigOnly) {
    // Config-only overload - return builder
    logger.debug('Creating backend builder with configuration');
    return new BackendBuilder(componentsOrConfig as BackendConfig);
  }

  // Components + config overload - create typed backend
  const components = componentsOrConfig as T;
  const backendConfig: BackendConfig = config ?? {};

  // Validate components
  if (!components || typeof components !== 'object') {
    throw new Error('Components must be an object mapping component IDs to definitions');
  }

  const componentCount = Object.keys(components).length;
  if (componentCount === 0) {
    throw new Error('Backend must have at least one component');
  }

  logger.debug(`Creating typed backend with ${componentCount} components`);

  // Ensure default providers are registered
  if (!backendConfig.providers) {
    (backendConfig as any).providers = getDefaultProviders();
    logger.debug('Registered default providers: cosmos, functions, storage');
  }

  // Create a temporary scope for the backend
  // The actual scope will be provided during initialization
  const tempScope = {
    node: {
      setContext: () => {},
      tryGetContext: () => undefined,
    },
  } as unknown as Construct;

  // Generate backend ID from first component or use 'Backend'
  const backendId = backendConfig.environment
    ? `Backend-${backendConfig.environment}`
    : 'Backend';

  // Create typed backend wrapper
  return new TypedBackendImpl(tempScope, backendId, components, backendConfig);
}

/**
 * Check if a construct is backend-managed.
 * Components can use this to detect if they're being used in a backend context.
 *
 * @param scope - Construct scope to check
 * @returns True if scope is backend-managed
 *
 * @example
 * ```typescript
 * if (isBackendManaged(this)) {
 *   // Component is in a backend context
 *   // Resources will be injected via initialize()
 * } else {
 *   // Component is standalone
 *   // Must create its own resources
 * }
 * ```
 */
export function isBackendManaged(scope: Construct): boolean {
  try {
    return scope.node.tryGetContext(BACKEND_CONTEXT_KEY) === true;
  } catch {
    return false;
  }
}

/**
 * Get the backend ID from a backend-managed scope.
 *
 * @param scope - Construct scope
 * @returns Backend ID or undefined if not backend-managed
 */
export function getBackendId(scope: Construct): string | undefined {
  try {
    const id = scope.node.tryGetContext(BACKEND_ID_CONTEXT_KEY);
    return typeof id === 'string' ? id : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Set backend context on a scope.
 * Used internally by backend initialization.
 *
 * @param scope - Construct scope
 * @param backendId - Backend identifier
 * @internal
 */
export function setBackendContext(scope: Construct, backendId: string): void {
  scope.node.setContext(BACKEND_CONTEXT_KEY, true);
  scope.node.setContext(BACKEND_ID_CONTEXT_KEY, backendId);
}
