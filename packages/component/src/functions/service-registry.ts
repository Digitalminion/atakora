/**
 * Service Registry Implementation
 *
 * @remarks
 * Core service registry with dependency injection, lifecycle management,
 * and circular dependency detection.
 *
 * Implements ADR-022: Service Registry Injection Pattern
 *
 * @packageDocumentation
 */

import type { ResolvedBackendSettings, Environment } from '../backend/types';
import type { ExecutionContext, Logger } from './types';
import type {
  ServiceFactory,
  ServiceFactoryContext,
  ServiceLifecycle,
} from './service-registry-types';
import {
  ServiceNotFoundError,
  ServiceInstantiationError,
  CircularDependencyError,
} from './service-registry-types';

// ============================================================================
// Singleton Helper
// ============================================================================

/**
 * Singleton wrapper for services that should be shared across invocations
 *
 * @typeParam T - Service type
 *
 * @remarks
 * Wraps a service factory to create a singleton instance.
 * The factory is called only once, and the same instance is returned for all subsequent calls.
 *
 * Thread-safe for async factories - multiple concurrent requests will await the same promise.
 *
 * @param factory - Service factory function (without context parameter)
 * @returns Wrapped factory that implements singleton pattern
 *
 * @example
 * ```typescript
 * const backend = defineBackend({
 *   // ...
 *   services: {
 *     aiClient: singleton(() => new AISearchClient({
 *       endpoint: process.env.AZURE_SEARCH_ENDPOINT!,
 *       key: process.env.AZURE_SEARCH_KEY!,
 *     })),
 *   },
 * });
 * ```
 *
 * @public
 */
export function singleton<T>(factory: () => T | Promise<T>): ServiceFactory<T> {
  let instance: T | null = null;
  let promise: Promise<T> | null = null;

  return async (context: ServiceFactoryContext): Promise<T> => {
    // Return cached instance if available
    if (instance !== null) {
      return instance;
    }

    // If promise is in flight, await it
    if (promise !== null) {
      return promise;
    }

    // Create new instance
    promise = Promise.resolve(factory());
    instance = await promise;
    promise = null;

    context.logger.verbose(`Singleton service initialized`);
    return instance;
  };
}

// ============================================================================
// Service Registry
// ============================================================================

/**
 * Service registry options
 *
 * @internal
 */
interface ServiceRegistryOptions {
  /**
   * Service factories
   */
  readonly factories: Map<string, ServiceFactory<any>>;

  /**
   * Factory context
   */
  readonly factoryContext: ServiceFactoryContext;

  /**
   * Enable circular dependency detection
   * @defaultValue true
   */
  readonly detectCircularDependencies?: boolean;
}

/**
 * Create service registry from service factories
 *
 * @typeParam TServices - Service registry type
 *
 * @remarks
 * Creates a Proxy-based service registry that instantiates services on-demand.
 * Services are cached per function invocation (within the same registry instance).
 *
 * Features:
 * - Lazy instantiation (services created only when accessed)
 * - Per-invocation caching (same service instance within one function call)
 * - Async factory support (returns promises for async factories)
 * - Circular dependency detection
 * - Clear error messages for missing services
 *
 * @param serviceFactories - Map of service names to factory functions
 * @param executionContext - Execution context
 * @param backendSettings - Backend settings
 * @param environment - Current environment
 * @param logger - Logger instance
 * @returns Proxy-based service registry
 *
 * @internal
 */
export function createServiceRegistry<TServices extends Record<string, any>>(
  serviceFactories: Map<string, ServiceFactory<any>>,
  executionContext: ExecutionContext,
  backendSettings: ResolvedBackendSettings,
  environment: Environment,
  logger: Logger
): TServices {
  const factoryContext: ServiceFactoryContext = {
    env: process.env as Record<string, string | undefined>,
    settings: backendSettings,
    environment,
    logger,
  };

  return createServiceRegistryWithContext({
    factories: serviceFactories,
    factoryContext,
    detectCircularDependencies: true,
  });
}

/**
 * Create service registry with factory context
 *
 * @internal
 */
function createServiceRegistryWithContext<TServices extends Record<string, any>>(
  options: ServiceRegistryOptions
): TServices {
  const { factories, factoryContext, detectCircularDependencies = true } = options;

  // Cache for instantiated services within this invocation
  const serviceCache = new Map<string, any>();

  // Stack for circular dependency detection
  const instantiationStack: string[] = [];

  /**
   * Instantiate a service by name
   */
  const instantiateService = (serviceName: string): any => {
    // Check if service factory exists
    const factory = factories.get(serviceName);
    if (!factory) {
      throw new ServiceNotFoundError(serviceName, Array.from(factories.keys()));
    }

    // Check for circular dependencies
    if (detectCircularDependencies && instantiationStack.includes(serviceName)) {
      const dependencyChain = [...instantiationStack, serviceName];
      throw new CircularDependencyError(dependencyChain);
    }

    // Add to instantiation stack
    instantiationStack.push(serviceName);

    try {
      // Call factory
      const serviceOrPromise = factory(factoryContext);

      // Handle both sync and async factories
      if (serviceOrPromise instanceof Promise) {
        // Async factory - return promise
        const servicePromise = serviceOrPromise
          .then((service) => {
            factoryContext.logger.verbose(`Service '${serviceName}' instantiated (async)`);
            return service;
          })
          .catch((error) => {
            throw new ServiceInstantiationError(serviceName, error);
          })
          .finally(() => {
            // Remove from stack after async instantiation
            const index = instantiationStack.indexOf(serviceName);
            if (index !== -1) {
              instantiationStack.splice(index, 1);
            }
          });

        return servicePromise;
      } else {
        // Sync factory - return directly
        factoryContext.logger.verbose(`Service '${serviceName}' instantiated`);
        return serviceOrPromise;
      }
    } catch (error) {
      if (
        error instanceof ServiceNotFoundError ||
        error instanceof CircularDependencyError ||
        error instanceof ServiceInstantiationError
      ) {
        throw error;
      }
      throw new ServiceInstantiationError(serviceName, error as Error);
    } finally {
      // Remove from stack after sync instantiation
      const index = instantiationStack.indexOf(serviceName);
      if (index !== -1) {
        instantiationStack.splice(index, 1);
      }
    }
  };

  // Create proxy that instantiates services on-demand
  return new Proxy({} as TServices, {
    /**
     * Get service by name
     */
    get(target: any, serviceName: string | symbol): any {
      // Handle symbol access (e.g., Symbol.toStringTag)
      if (typeof serviceName === 'symbol') {
        return undefined;
      }

      // Check cache first
      if (serviceCache.has(serviceName)) {
        return serviceCache.get(serviceName);
      }

      // Instantiate service
      const service = instantiateService(serviceName);

      // Cache the service (or promise)
      serviceCache.set(serviceName, service);

      return service;
    },

    /**
     * Check if service exists
     */
    has(target: any, serviceName: string | symbol): boolean {
      if (typeof serviceName === 'symbol') {
        return false;
      }
      return factories.has(serviceName);
    },

    /**
     * Get list of available services
     */
    ownKeys(target: any): (string | symbol)[] {
      return Array.from(factories.keys());
    },

    /**
     * Get property descriptor
     */
    getOwnPropertyDescriptor(target: any, serviceName: string | symbol) {
      if (typeof serviceName === 'symbol') {
        return undefined;
      }

      if (factories.has(serviceName)) {
        return {
          enumerable: true,
          configurable: true,
        };
      }

      return undefined;
    },
  }) as TServices;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a service registry has a specific service
 *
 * @param registry - Service registry
 * @param serviceName - Service name to check
 * @returns True if service exists
 *
 * @public
 */
export function hasService(registry: any, serviceName: string): boolean {
  return serviceName in registry;
}

/**
 * Get list of available services
 *
 * @param registry - Service registry
 * @returns Array of service names
 *
 * @public
 */
export function getAvailableServices(registry: any): string[] {
  return Object.keys(registry);
}

/**
 * Create empty service registry
 *
 * @remarks
 * Returns an empty service registry with no services.
 * Useful for testing or backends without services.
 *
 * @returns Empty service registry
 *
 * @internal
 */
export function createEmptyServiceRegistry(): Record<string, never> {
  return new Proxy(
    {},
    {
      get(target, serviceName: string | symbol) {
        if (typeof serviceName === 'symbol') {
          return undefined;
        }
        throw new ServiceNotFoundError(serviceName, []);
      },
      has() {
        return false;
      },
      ownKeys() {
        return [];
      },
    }
  ) as Record<string, never>;
}
