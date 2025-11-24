/**
 * Backend Service Configuration
 *
 * @remarks
 * Service configuration types and utilities for backend definition.
 * Enables service registration in backend configuration.
 *
 * @packageDocumentation
 */

import type { ServiceFactory } from '../functions/service-registry-types';

// ============================================================================
// Service Configuration Types
// ============================================================================

/**
 * Services configuration for backend
 *
 * @typeParam TServices - Service registry type
 *
 * @remarks
 * Maps service names to factory functions.
 * Used in BackendConfig to define available services.
 *
 * Services defined here will be available via `context.services` in function handlers.
 *
 * @example
 * ```typescript
 * const backend = defineBackend({
 *   schema,
 *   authentication,
 *   settings: { name: 'my-app' },
 *   services: {
 *     reportGenerator: (context) => new ReportGeneratorService({
 *       storageAccount: context.env.STORAGE_ACCOUNT!,
 *     }),
 *     dataValidator: singleton(() => new DataValidatorService()),
 *   },
 * });
 * ```
 *
 * @public
 */
export type ServicesConfig<TServices extends Record<string, any> = Record<string, any>> = {
  [K in keyof TServices]: ServiceFactory<TServices[K]>;
};

/**
 * Extract service types from services configuration
 *
 * @typeParam TConfig - Services configuration type
 *
 * @remarks
 * Type utility that extracts service types from a services configuration object.
 * Used for type inference in backend objects.
 *
 * @public
 */
export type InferServices<TConfig extends ServicesConfig> = {
  [K in keyof TConfig]: TConfig[K] extends ServiceFactory<infer T> ? T : never;
};

// ============================================================================
// Service Builder Pattern (Optional Future Enhancement)
// ============================================================================

/**
 * Service builder for fluent service configuration
 *
 * @remarks
 * Optional builder pattern for more complex service configurations.
 * Not currently used, but reserved for future enhancements.
 *
 * @example
 * ```typescript
 * const emailService = serviceBuilder('emailService')
 *   .withFactory((context) => new EmailService(context.env.SENDGRID_KEY!))
 *   .withLifecycle('singleton')
 *   .withDescription('Email sending service')
 *   .build();
 * ```
 *
 * @internal
 */
export interface ServiceBuilder<T> {
  /**
   * Set service factory
   */
  withFactory(factory: ServiceFactory<T>): ServiceBuilder<T>;

  /**
   * Set service lifecycle
   */
  withLifecycle(lifecycle: 'transient' | 'singleton' | 'scoped'): ServiceBuilder<T>;

  /**
   * Set service description
   */
  withDescription(description: string): ServiceBuilder<T>;

  /**
   * Build service configuration
   */
  build(): ServiceFactory<T>;
}

/**
 * Create a service builder
 *
 * @param name - Service name
 * @returns Service builder
 *
 * @internal
 */
export function createServiceBuilder<T>(name: string): ServiceBuilder<T> {
  let factory: ServiceFactory<T> | undefined;
  let lifecycle: 'transient' | 'singleton' | 'scoped' = 'transient';
  let description: string | undefined;

  const builder: ServiceBuilder<T> = {
    withFactory(f: ServiceFactory<T>) {
      factory = f;
      return builder;
    },

    withLifecycle(l: 'transient' | 'singleton' | 'scoped') {
      lifecycle = l;
      return builder;
    },

    withDescription(d: string) {
      description = d;
      return builder;
    },

    build() {
      if (!factory) {
        throw new Error(`Service '${name}' factory not configured`);
      }
      return factory;
    },
  };

  return builder;
}

// ============================================================================
// Pre-configured Service Factories (Future Enhancement)
// ============================================================================

/**
 * Common service configurations
 *
 * @remarks
 * Pre-configured service factories for common use cases.
 * These can be imported and used directly in backend configuration.
 *
 * @example
 * ```typescript
 * import { CommonServices } from '@atakora/component';
 *
 * const backend = defineBackend({
 *   // ...
 *   services: {
 *     logging: CommonServices.logging(),
 *     cache: CommonServices.cache(),
 *   },
 * });
 * ```
 *
 * @internal
 */
export const CommonServices = {
  /**
   * Logging service factory
   */
  logging: () => {
    // Future: return pre-configured logging service factory
    throw new Error('CommonServices.logging not yet implemented');
  },

  /**
   * Caching service factory
   */
  cache: () => {
    // Future: return pre-configured caching service factory
    throw new Error('CommonServices.cache not yet implemented');
  },

  /**
   * Queue service factory
   */
  queue: () => {
    // Future: return pre-configured queue service factory
    throw new Error('CommonServices.queue not yet implemented');
  },
};
