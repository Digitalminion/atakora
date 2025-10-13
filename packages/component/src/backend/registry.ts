/**
 * Resource Provider Registry
 *
 * This file implements the provider registry system that manages resource providers
 * and handles provider discovery for different resource types.
 *
 * @module @atakora/component/backend/registry
 */

import type {
  IResourceProvider,
  IResourceRequirement,
} from './interfaces';
import {
  createUnsupportedResourceTypeError,
  createMissingProviderError,
} from './utils';

/**
 * Registry for resource providers.
 * Manages provider registration, discovery, and retrieval.
 *
 * @example
 * ```typescript
 * const registry = new ProviderRegistry();
 *
 * // Register providers
 * registry.register(new CosmosResourceProvider());
 * registry.register(new FunctionAppResourceProvider());
 *
 * // Find provider for requirement
 * const provider = registry.findProvider(requirement);
 * ```
 */
export class ProviderRegistry {
  private readonly providers: Map<string, IResourceProvider> = new Map();
  private readonly typeToProvidersMap: Map<string, Set<string>> = new Map();

  /**
   * Register a resource provider.
   * Provider is indexed by its ID and supported types.
   *
   * @param provider - Provider to register
   * @throws Error if provider with same ID already exists
   */
  public register(provider: IResourceProvider): void {
    // Validate provider
    if (!provider.providerId) {
      throw new Error('Provider must have a providerId');
    }

    if (!provider.supportedTypes || provider.supportedTypes.length === 0) {
      throw new Error(`Provider "${provider.providerId}" must support at least one resource type`);
    }

    // Check for duplicate provider ID
    if (this.providers.has(provider.providerId)) {
      throw new Error(`Provider with ID "${provider.providerId}" is already registered`);
    }

    // Register provider
    this.providers.set(provider.providerId, provider);

    // Index by supported types
    for (const type of provider.supportedTypes) {
      const providerIds = this.typeToProvidersMap.get(type) ?? new Set<string>();
      providerIds.add(provider.providerId);
      this.typeToProvidersMap.set(type, providerIds);
    }
  }

  /**
   * Register multiple providers.
   *
   * @param providers - Array of providers to register
   */
  public registerAll(providers: ReadonlyArray<IResourceProvider>): void {
    for (const provider of providers) {
      this.register(provider);
    }
  }

  /**
   * Unregister a provider by ID.
   *
   * @param providerId - ID of provider to unregister
   * @returns True if provider was found and removed
   */
  public unregister(providerId: string): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return false;
    }

    // Remove from main map
    this.providers.delete(providerId);

    // Remove from type index
    for (const type of provider.supportedTypes) {
      const providerIds = this.typeToProvidersMap.get(type);
      if (providerIds) {
        providerIds.delete(providerId);
        if (providerIds.size === 0) {
          this.typeToProvidersMap.delete(type);
        }
      }
    }

    return true;
  }

  /**
   * Get a provider by ID.
   *
   * @param providerId - Provider ID
   * @returns Provider or undefined if not found
   */
  public getProvider(providerId: string): IResourceProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers.
   *
   * @returns Array of all providers
   */
  public getAllProviders(): ReadonlyArray<IResourceProvider> {
    return Array.from(this.providers.values());
  }

  /**
   * Get all providers that support a specific resource type.
   *
   * @param resourceType - Resource type to query
   * @returns Array of providers that support this type
   */
  public getProvidersByType(resourceType: string): ReadonlyArray<IResourceProvider> {
    const providerIds = this.typeToProvidersMap.get(resourceType);
    if (!providerIds || providerIds.size === 0) {
      return [];
    }

    const providers: IResourceProvider[] = [];
    for (const providerId of Array.from(providerIds)) {
      const provider = this.providers.get(providerId);
      if (provider) {
        providers.push(provider);
      }
    }

    return providers;
  }

  /**
   * Find the best provider for a requirement.
   * Returns the first provider that can handle the requirement.
   *
   * @param requirement - Resource requirement
   * @returns Provider or undefined if none found
   */
  public findProvider(requirement: IResourceRequirement): IResourceProvider | undefined {
    // First, try providers that support this resource type
    const candidateProviders = this.getProvidersByType(requirement.resourceType);

    for (const provider of candidateProviders) {
      if (provider.canProvide(requirement)) {
        return provider;
      }
    }

    // No suitable provider found
    return undefined;
  }

  /**
   * Find the best provider for a requirement, throwing if not found.
   *
   * @param requirement - Resource requirement
   * @returns Provider
   * @throws Error if no provider found
   */
  public findProviderOrThrow(requirement: IResourceRequirement): IResourceProvider {
    const provider = this.findProvider(requirement);
    if (!provider) {
      throw createMissingProviderError(requirement.resourceType);
    }
    return provider;
  }

  /**
   * Check if a resource type is supported by any provider.
   *
   * @param resourceType - Resource type to check
   * @returns True if at least one provider supports this type
   */
  public isTypeSupported(resourceType: string): boolean {
    const providerIds = this.typeToProvidersMap.get(resourceType);
    return !!providerIds && providerIds.size > 0;
  }

  /**
   * Get all supported resource types.
   *
   * @returns Set of all supported resource types
   */
  public getSupportedTypes(): Set<string> {
    return new Set(this.typeToProvidersMap.keys());
  }

  /**
   * Check if a requirement can be provided.
   *
   * @param requirement - Requirement to check
   * @returns True if any provider can handle this requirement
   */
  public canProvide(requirement: IResourceRequirement): boolean {
    return this.findProvider(requirement) !== undefined;
  }

  /**
   * Validate that all requirements can be provided.
   *
   * @param requirements - Requirements to validate
   * @returns Object with validation result and missing types
   */
  public validateRequirements(requirements: ReadonlyArray<IResourceRequirement>): {
    readonly valid: boolean;
    readonly missingTypes: ReadonlyArray<string>;
  } {
    const missingTypes = new Set<string>();

    for (const requirement of requirements) {
      if (!this.canProvide(requirement)) {
        missingTypes.add(requirement.resourceType);
      }
    }

    return {
      valid: missingTypes.size === 0,
      missingTypes: Array.from(missingTypes),
    };
  }

  /**
   * Clear all registered providers.
   * Useful for testing.
   */
  public clear(): void {
    this.providers.clear();
    this.typeToProvidersMap.clear();
  }

  /**
   * Get the number of registered providers.
   *
   * @returns Provider count
   */
  public get size(): number {
    return this.providers.size;
  }

  /**
   * Check if registry has any providers.
   *
   * @returns True if registry is empty
   */
  public get isEmpty(): boolean {
    return this.providers.size === 0;
  }
}

/**
 * Global provider registry instance.
 * Used as default registry for backends.
 */
export const globalRegistry = new ProviderRegistry();

/**
 * Register a provider in the global registry.
 * Convenience function for global registration.
 *
 * @param provider - Provider to register
 */
export function registerGlobalProvider(provider: IResourceProvider): void {
  globalRegistry.register(provider);
}

/**
 * Register multiple providers in the global registry.
 *
 * @param providers - Providers to register
 */
export function registerGlobalProviders(providers: ReadonlyArray<IResourceProvider>): void {
  globalRegistry.registerAll(providers);
}

/**
 * Get a provider from the global registry.
 *
 * @param providerId - Provider ID
 * @returns Provider or undefined
 */
export function getGlobalProvider(providerId: string): IResourceProvider | undefined {
  return globalRegistry.getProvider(providerId);
}

/**
 * Check if a resource type is supported globally.
 *
 * @param resourceType - Resource type to check
 * @returns True if supported
 */
export function isGloballySupported(resourceType: string): boolean {
  return globalRegistry.isTypeSupported(resourceType);
}
