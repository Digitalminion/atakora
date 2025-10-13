/**
 * Backend Implementation
 *
 * This file implements the main Backend class that orchestrates component registration,
 * resource provisioning, and dependency injection.
 *
 * @module @atakora/component/backend
 */

import { Construct } from '@atakora/cdk';
import type {
  IBackend,
  IBackendComponent,
  IComponentDefinition,
  IResourceRequirement,
  IResourceProvider,
  ResourceMap,
  BackendConfig,
  ValidationResult,
  ProviderContext,
  NamingConvention,
  AzureStack,
} from './interfaces';
import { ProviderRegistry } from './registry';
import {
  formatResourceKey,
  getResourceKeyFromRequirement,
  groupRequirementsByKey,
  getUniqueResourceTypes,
  sortRequirementsByPriority,
  markAsBackendManaged,
  setBackendId,
  validateRequirement,
  createMissingProviderError,
} from './utils';

/**
 * Default naming convention implementation.
 * Follows Azure naming best practices.
 */
class DefaultNamingConvention implements NamingConvention {
  public formatResourceName(
    resourceType: string,
    backendId: string,
    suffix?: string
  ): string {
    const parts = [resourceType, backendId];
    if (suffix) {
      parts.push(suffix);
    }
    return parts.join('-').toLowerCase();
  }

  public formatResourceGroupName(backendId: string, environment?: string): string {
    const parts = ['rg', backendId];
    if (environment) {
      parts.push(environment);
    }
    return parts.join('-').toLowerCase();
  }
}

/**
 * Backend implementation.
 * Orchestrates component registration, resource provisioning, and initialization.
 *
 * @example
 * ```typescript
 * const backend = new Backend(scope, 'MyBackend', {
 *   environment: 'prod',
 *   location: 'eastus',
 * });
 *
 * // Add components
 * backend.addComponent(CrudApi.define('UserApi', config));
 * backend.addComponent(CrudApi.define('ProductApi', config));
 *
 * // Initialize (provisions resources and components)
 * backend.initialize(scope);
 * ```
 */
export class Backend extends Construct implements IBackend {
  public readonly backendId: string;
  public readonly config: BackendConfig;

  private readonly componentDefinitions = new Map<string, IComponentDefinition>();
  private readonly _components = new Map<string, IBackendComponent>();
  private readonly _resources = new Map<string, unknown>();
  private readonly providerRegistry: ProviderRegistry;
  private readonly naming: NamingConvention;
  private initialized = false;

  /**
   * Create a new Backend instance.
   *
   * @param scope - CDK construct scope
   * @param id - Backend identifier
   * @param config - Backend configuration
   */
  constructor(scope: Construct, id: string, config: BackendConfig = {}) {
    super(scope, id);

    this.backendId = id;
    this.config = config;

    // Initialize naming convention
    this.naming = config.naming ?? new DefaultNamingConvention();

    // Initialize provider registry with custom providers
    this.providerRegistry = new ProviderRegistry();
    if (config.providers) {
      this.providerRegistry.registerAll(config.providers);
    }

    // Mark this scope as backend-managed
    markAsBackendManaged(this);
    setBackendId(this, id);
  }

  /**
   * Get all registered components (read-only).
   */
  public get components(): ReadonlyMap<string, IBackendComponent> {
    return this._components;
  }

  /**
   * Get all shared resources (read-only).
   */
  public get resources(): ResourceMap {
    return this._resources;
  }

  /**
   * Add a component to the backend.
   * Component is stored for later initialization.
   *
   * @param component - Component definition to add
   * @throws Error if component with same ID already exists
   */
  public addComponent(component: IComponentDefinition): void {
    if (this.initialized) {
      throw new Error('Cannot add components after backend has been initialized');
    }

    // Validate component
    if (!component.componentId) {
      throw new Error('Component must have a componentId');
    }

    // Check for duplicate component ID
    if (this.componentDefinitions.has(component.componentId)) {
      throw new Error(
        `Component with ID "${component.componentId}" already exists in backend "${this.backendId}"`
      );
    }

    // Store component definition
    this.componentDefinitions.set(component.componentId, component);
  }

  /**
   * Add multiple components at once.
   *
   * @param components - Array of component definitions
   */
  public addComponents(components: ReadonlyArray<IComponentDefinition>): void {
    for (const component of components) {
      this.addComponent(component);
    }
  }

  /**
   * Initialize all components and resources.
   * This is the main orchestration method that:
   * 1. Collects requirements from all components
   * 2. Merges and deduplicates requirements
   * 3. Provisions shared resources
   * 4. Initializes components with resources
   *
   * @param scope - CDK construct scope for resource creation
   * @throws Error if initialization fails
   */
  public initialize(scope: Construct): void {
    if (this.initialized) {
      throw new Error('Backend has already been initialized');
    }

    try {
      // Phase 1: Collect requirements from all components
      const allRequirements = this.collectRequirements();

      // Phase 2: Validate all requirements
      this.validateAllRequirements(allRequirements);

      // Phase 3: Merge and deduplicate requirements
      const mergedRequirements = this.mergeRequirements(allRequirements);

      // Phase 4: Provision shared resources
      this.provisionResources(mergedRequirements, scope);

      // Phase 5: Initialize components with resources
      this.initializeComponents(scope);

      this.initialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize backend "${this.backendId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Add backend to a CDK stack.
   * Convenience method that initializes the backend with the stack as scope.
   *
   * @param stack - CDK stack to add to
   */
  public addToStack(stack: AzureStack): void {
    this.initialize(stack);
  }

  /**
   * Get a specific resource by type and key.
   *
   * @typeParam T - Expected resource type
   * @param type - Resource type
   * @param key - Optional resource key (defaults to 'default')
   * @returns Resource or undefined if not found
   */
  public getResource<T = unknown>(type: string, key?: string): T | undefined {
    const resourceKey = formatResourceKey(type, key ?? 'default');
    return this._resources.get(resourceKey) as T | undefined;
  }

  /**
   * Get a component by ID.
   *
   * @typeParam T - Expected component type
   * @param id - Component ID
   * @returns Component or undefined if not found
   */
  public getComponent<T extends IBackendComponent = IBackendComponent>(
    id: string
  ): T | undefined {
    return this._components.get(id) as T | undefined;
  }

  /**
   * Validate all components and resources.
   *
   * @returns Validation result
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate that backend is initialized
    if (!this.initialized) {
      errors.push('Backend has not been initialized');
    }

    // Validate each component
    for (const [id, component] of Array.from(this._components.entries())) {
      try {
        const result = component.validateResources(this._resources);
        if (!result.valid) {
          errors.push(`Component "${id}" validation failed: ${result.errors?.join(', ')}`);
        }
        if (result.warnings) {
          warnings.push(...result.warnings.map((w) => `Component "${id}": ${w}`));
        }
      } catch (error) {
        errors.push(
          `Component "${id}" validation threw error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // ============================================================================
  // Private Methods - Requirement Collection and Analysis
  // ============================================================================

  /**
   * Collect requirements from all registered components.
   */
  private collectRequirements(): ReadonlyArray<IResourceRequirement> {
    const requirements: IResourceRequirement[] = [];

    for (const [id, definition] of Array.from(this.componentDefinitions.entries())) {
      try {
        // Create a temporary component instance to get requirements
        // We don't initialize it yet - just need the requirements
        const tempComponent = this.createTemporaryComponent(definition);
        const componentRequirements = tempComponent.getRequirements();

        // Validate and add requirements
        for (const requirement of componentRequirements) {
          validateRequirement(requirement);

          // Add source metadata if not present
          const enrichedRequirement: IResourceRequirement = {
            ...requirement,
            metadata: {
              source: id,
              version: '1.0',
              ...requirement.metadata,
            },
          };

          requirements.push(enrichedRequirement);
        }
      } catch (error) {
        throw new Error(
          `Failed to collect requirements from component "${id}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return requirements;
  }

  /**
   * Create a temporary component instance for requirement collection.
   * This doesn't fully initialize the component, just creates it to get requirements.
   */
  private createTemporaryComponent(definition: IComponentDefinition): IBackendComponent {
    // Create a temporary scope for requirement collection
    const tempScope = new Construct(this, `temp-${definition.componentId}`);

    // Create component instance with empty resources
    // Components should be able to declare requirements without resources
    const emptyResources: ResourceMap = new Map();

    try {
      return definition.factory(tempScope, definition.componentId, definition.config, emptyResources);
    } catch (error) {
      throw new Error(
        `Failed to create temporary component "${definition.componentId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Validate all requirements have providers.
   */
  private validateAllRequirements(requirements: ReadonlyArray<IResourceRequirement>): void {
    const validation = this.providerRegistry.validateRequirements(requirements);

    if (!validation.valid) {
      throw new Error(
        `Cannot satisfy all requirements. Missing providers for types: ${validation.missingTypes.join(', ')}`
      );
    }
  }

  // ============================================================================
  // Private Methods - Requirement Merging
  // ============================================================================

  /**
   * Merge and deduplicate requirements.
   * Requirements with the same resource key are merged using provider merge strategies.
   */
  private mergeRequirements(
    requirements: ReadonlyArray<IResourceRequirement>
  ): ReadonlyArray<IResourceRequirement> {
    // Group requirements by resource key
    const grouped = groupRequirementsByKey(requirements);

    const merged: IResourceRequirement[] = [];

    for (const [key, group] of Array.from(grouped.entries())) {
      if (group.length === 1) {
        // Single requirement, no merging needed
        merged.push(group[0]);
      } else {
        // Multiple requirements with same key, need to merge
        try {
          const mergedRequirement = this.mergeRequirementGroup(group);
          merged.push(mergedRequirement);
        } catch (error) {
          throw new Error(
            `Failed to merge requirements for key "${key}": ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }

    return merged;
  }

  /**
   * Merge a group of requirements with the same resource key.
   */
  private mergeRequirementGroup(
    requirements: ReadonlyArray<IResourceRequirement>
  ): IResourceRequirement {
    if (requirements.length === 0) {
      throw new Error('Cannot merge empty requirements group');
    }

    if (requirements.length === 1) {
      return requirements[0];
    }

    // All requirements should have same resource type and key
    const resourceType = requirements[0].resourceType;
    const requirementKey = requirements[0].requirementKey;

    // Find provider for this resource type
    const provider = this.providerRegistry.findProvider(requirements[0]);
    if (!provider) {
      throw createMissingProviderError(resourceType);
    }

    // Use provider's merge strategy
    return provider.mergeRequirements(requirements);
  }

  // ============================================================================
  // Private Methods - Resource Provisioning
  // ============================================================================

  /**
   * Provision shared resources based on merged requirements.
   */
  private provisionResources(
    requirements: ReadonlyArray<IResourceRequirement>,
    scope: Construct
  ): void {
    // Create provider context
    const context: ProviderContext = {
      backend: this,
      naming: this.naming,
      tags: this.config.tags ?? {},
      existingResources: this._resources,
      location: this.config.location ?? 'eastus',
      environment: this.config.environment ?? 'dev',
    };

    // Provision each resource
    for (const requirement of requirements) {
      try {
        const provider = this.providerRegistry.findProviderOrThrow(requirement);

        // Validate merged requirement
        const validation = provider.validateMerged(requirement);
        if (!validation.valid) {
          throw new Error(
            `Merged requirement validation failed: ${validation.errors?.join(', ')}`
          );
        }

        // Provision resource
        const resource = provider.provideResource(requirement, scope, context);

        // Store resource
        const resourceKey = getResourceKeyFromRequirement(requirement);
        this._resources.set(resourceKey, resource);
      } catch (error) {
        throw new Error(
          `Failed to provision resource "${requirement.resourceType}:${requirement.requirementKey}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  // ============================================================================
  // Private Methods - Component Initialization
  // ============================================================================

  /**
   * Initialize all components with provisioned resources.
   */
  private initializeComponents(scope: Construct): void {
    for (const [id, definition] of Array.from(this.componentDefinitions.entries())) {
      try {
        // Create component instance with resolved resources
        const component = definition.factory(
          scope,
          definition.componentId,
          definition.config,
          this._resources
        );

        // Initialize component
        component.initialize(this._resources, scope);

        // Store initialized component
        this._components.set(id, component);
      } catch (error) {
        throw new Error(
          `Failed to initialize component "${id}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }
}
