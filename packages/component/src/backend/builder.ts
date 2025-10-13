/**
 * Backend Builder Pattern
 *
 * Provides a fluent API for progressively building backends.
 * This is an alternative to the declarative defineBackend() API,
 * offering more flexibility for complex scenarios.
 *
 * @module @atakora/component/backend
 */

import type { Construct } from '@atakora/cdk';
import type {
  IBackend,
  IComponentDefinition,
  IResourceProvider,
  BackendConfig,
  MonitoringConfig,
  NetworkingConfig,
  NamingConvention,
  BackendBuilder as IBackendBuilder,
  ComponentMap,
  TypedBackend,
  AzureStack,
} from './interfaces';
import { defineBackend } from './define-backend';
import { getBackendLogger } from './logger';

const logger = getBackendLogger('builder');

/**
 * Builder implementation for creating backends with a fluent API.
 *
 * @example
 * ```typescript
 * import { BackendBuilder } from '@atakora/component/backend';
 * import { CrudApi } from '@atakora/component/crud';
 *
 * const backend = new BackendBuilder({ environment: 'prod' })
 *   .addComponent(CrudApi.define('UserApi', { entityName: 'User' }))
 *   .addComponent(CrudApi.define('ProductApi', { entityName: 'Product' }))
 *   .withMonitoring({ enabled: true, retentionDays: 90 })
 *   .withTags({ project: 'myapp', team: 'platform' })
 *   .build();
 *
 * backend.addToStack(stack);
 * ```
 */
export class BackendBuilder implements IBackendBuilder {
  private readonly components: Map<string, IComponentDefinition<any>> = new Map();
  private config: Partial<{ -readonly [K in keyof BackendConfig]: BackendConfig[K] }>;

  /**
   * Create a new backend builder.
   *
   * @param initialConfig - Initial backend configuration
   */
  constructor(initialConfig: BackendConfig = {}) {
    this.config = { ...initialConfig };
    logger.debug('Created backend builder');
  }

  /**
   * Add a component to the backend.
   *
   * @typeParam T - Component config type
   * @param component - Component definition to add
   * @returns This builder for chaining
   * @throws Error if component with same ID already exists
   *
   * @example
   * ```typescript
   * builder.addComponent(CrudApi.define('UserApi', {
   *   entityName: 'User',
   *   schema: { id: 'string', name: 'string' }
   * }));
   * ```
   */
  public addComponent<T>(component: IComponentDefinition<T>): this {
    if (!component.componentId) {
      throw new Error('Component must have a componentId');
    }

    if (this.components.has(component.componentId)) {
      throw new Error(
        `Component with ID "${component.componentId}" has already been added to this builder`
      );
    }

    this.components.set(component.componentId, component);
    logger.debug(`Added component to builder: ${component.componentId} (${component.componentType})`);

    return this;
  }

  /**
   * Add multiple components at once.
   *
   * @param components - Array of component definitions
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.addComponents([
   *   CrudApi.define('UserApi', { entityName: 'User' }),
   *   CrudApi.define('ProductApi', { entityName: 'Product' })
   * ]);
   * ```
   */
  public addComponents(components: ReadonlyArray<IComponentDefinition>): this {
    for (const component of components) {
      this.addComponent(component);
    }
    return this;
  }

  /**
   * Configure monitoring for the backend.
   *
   * @param config - Monitoring configuration
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.withMonitoring({
   *   enabled: true,
   *   retentionDays: 90,
   *   samplingPercentage: 50
   * });
   * ```
   */
  public withMonitoring(config: MonitoringConfig | boolean): this {
    this.config.monitoring = config;
    logger.debug('Configured monitoring');
    return this;
  }

  /**
   * Configure networking for the backend.
   *
   * @param config - Networking configuration
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.withNetworking({
   *   mode: 'isolated',
   *   vnetName: 'my-vnet',
   *   privateEndpoints: true
   * });
   * ```
   */
  public withNetworking(config: NetworkingConfig | 'public' | 'isolated'): this {
    this.config.networking = config;
    logger.debug('Configured networking');
    return this;
  }

  /**
   * Configure naming convention for resources.
   *
   * @param convention - Naming convention implementation
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.withNaming({
   *   formatResourceName: (type, backendId, suffix) =>
   *     `${type}-${backendId}${suffix ? `-${suffix}` : ''}`,
   *   formatResourceGroupName: (backendId, env) =>
   *     `rg-${backendId}${env ? `-${env}` : ''}`
   * });
   * ```
   */
  public withNaming(convention: NamingConvention): this {
    this.config.naming = convention;
    logger.debug('Configured naming convention');
    return this;
  }

  /**
   * Add tags to all resources in the backend.
   *
   * @param tags - Tags to add (will be merged with existing tags)
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.withTags({
   *   project: 'myapp',
   *   team: 'platform',
   *   cost-center: '12345'
   * });
   * ```
   */
  public withTags(tags: Record<string, string>): this {
    this.config.tags = {
      ...this.config.tags,
      ...tags,
    };
    logger.debug(`Added ${Object.keys(tags).length} tags`);
    return this;
  }

  /**
   * Add a custom resource provider.
   *
   * @param provider - Resource provider to add
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.withProvider(new CustomDatabaseProvider());
   * ```
   */
  public withProvider(provider: IResourceProvider): this {
    if (!this.config.providers) {
      this.config.providers = [];
    }

    // Create mutable copy if needed
    const providers = Array.isArray(this.config.providers)
      ? [...this.config.providers]
      : [this.config.providers];

    providers.push(provider);
    this.config.providers = providers;

    logger.debug(`Added provider: ${provider.providerId}`);
    return this;
  }

  /**
   * Add multiple custom resource providers.
   *
   * @param providers - Resource providers to add
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.withProviders([
   *   new CustomDatabaseProvider(),
   *   new CustomStorageProvider()
   * ]);
   * ```
   */
  public withProviders(providers: ReadonlyArray<IResourceProvider>): this {
    for (const provider of providers) {
      this.withProvider(provider);
    }
    return this;
  }

  /**
   * Set the environment name.
   *
   * @param environment - Environment name (e.g., 'dev', 'staging', 'prod')
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.withEnvironment('production');
   * ```
   */
  public withEnvironment(environment: string): this {
    this.config.environment = environment;
    logger.debug(`Set environment: ${environment}`);
    return this;
  }

  /**
   * Set the Azure region.
   *
   * @param location - Azure region (e.g., 'eastus', 'westeurope')
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.withLocation('eastus');
   * ```
   */
  public withLocation(location: string): this {
    this.config.location = location;
    logger.debug(`Set location: ${location}`);
    return this;
  }

  /**
   * Build the backend.
   * Converts the builder configuration into a typed backend instance.
   *
   * @returns Typed backend instance
   * @throws Error if no components have been added
   *
   * @example
   * ```typescript
   * const backend = builder.build();
   * backend.addToStack(stack);
   * ```
   */
  public build(): TypedBackend<ComponentMap> {
    if (this.components.size === 0) {
      throw new Error('Cannot build backend with no components. Add at least one component using addComponent()');
    }

    logger.info(`Building backend with ${this.components.size} components`);

    // Convert components map to object for defineBackend
    const componentsObj: ComponentMap = {};
    for (const [id, definition] of Array.from(this.components.entries())) {
      componentsObj[id] = definition;
    }

    // Use defineBackend to create the typed backend
    const backend = defineBackend(componentsObj, this.config as BackendConfig);

    logger.info('Backend built successfully');

    return backend;
  }

  /**
   * Build and immediately add the backend to a stack.
   * Convenience method that combines build() and addToStack().
   *
   * @param stack - CDK stack to add to
   * @returns Typed backend instance
   *
   * @example
   * ```typescript
   * const backend = builder.buildAndAddToStack(stack);
   * ```
   */
  public buildAndAddToStack(stack: AzureStack): IBackend {
    const backend = this.build();
    backend.addToStack(stack);
    return backend;
  }

  /**
   * Get the current component count.
   *
   * @returns Number of components added so far
   */
  public get componentCount(): number {
    return this.components.size;
  }

  /**
   * Get the list of component IDs.
   *
   * @returns Array of component IDs
   */
  public get componentIds(): ReadonlyArray<string> {
    return Array.from(this.components.keys());
  }

  /**
   * Check if a component with the given ID exists.
   *
   * @param id - Component ID to check
   * @returns True if component exists
   */
  public hasComponent(id: string): boolean {
    return this.components.has(id);
  }

  /**
   * Remove a component from the builder.
   *
   * @param id - Component ID to remove
   * @returns True if component was found and removed
   *
   * @example
   * ```typescript
   * builder.removeComponent('UserApi');
   * ```
   */
  public removeComponent(id: string): boolean {
    const removed = this.components.delete(id);
    if (removed) {
      logger.debug(`Removed component from builder: ${id}`);
    }
    return removed;
  }

  /**
   * Clear all components from the builder.
   *
   * @example
   * ```typescript
   * builder.clearComponents();
   * ```
   */
  public clearComponents(): void {
    const count = this.components.size;
    this.components.clear();
    logger.debug(`Cleared ${count} components from builder`);
  }

  /**
   * Reset the builder to initial state.
   * Clears all components and configuration.
   *
   * @example
   * ```typescript
   * builder.reset();
   * ```
   */
  public reset(): void {
    this.clearComponents();
    Object.keys(this.config).forEach(key => {
      delete this.config[key as keyof BackendConfig];
    });
    logger.debug('Reset builder to initial state');
  }

  /**
   * Clone the builder with current configuration.
   * Useful for creating variants of a backend.
   *
   * @returns New builder instance with same configuration
   *
   * @example
   * ```typescript
   * const devBackend = builder.clone()
   *   .withEnvironment('dev')
   *   .build();
   *
   * const prodBackend = builder.clone()
   *   .withEnvironment('prod')
   *   .build();
   * ```
   */
  public clone(): BackendBuilder {
    const cloned = new BackendBuilder({ ...this.config });

    // Copy components
    for (const [id, component] of Array.from(this.components.entries())) {
      cloned.components.set(id, component);
    }

    logger.debug('Cloned builder');
    return cloned;
  }
}

/**
 * Create a new backend builder.
 * Convenience function for creating builders.
 *
 * @param config - Initial backend configuration
 * @returns New builder instance
 *
 * @example
 * ```typescript
 * import { createBackendBuilder } from '@atakora/component/backend';
 *
 * const backend = createBackendBuilder({ environment: 'prod' })
 *   .addComponent(CrudApi.define('UserApi', { entityName: 'User' }))
 *   .withMonitoring(true)
 *   .build();
 * ```
 */
export function createBackendBuilder(config?: BackendConfig): BackendBuilder {
  return new BackendBuilder(config);
}
