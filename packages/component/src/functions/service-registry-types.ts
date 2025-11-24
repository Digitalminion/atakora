/**
 * Service Registry Type Definitions
 *
 * @remarks
 * Type-safe service definitions for dependency injection in function handlers.
 * Implements the architecture from ADR-022: Service Registry Injection Pattern.
 *
 * @packageDocumentation
 */

import type { ResolvedBackendSettings, Environment } from '../backend/types';
import type { Logger } from './types';

// ============================================================================
// Service Factory Types
// ============================================================================

/**
 * Service factory context
 *
 * @remarks
 * Provides access to environment, configuration, and utilities during service creation.
 * Passed to service factories when they are instantiated.
 *
 * @public
 */
export interface ServiceFactoryContext {
  /**
   * Environment variables
   *
   * @remarks
   * Access to process.env for configuration.
   * Prefer using typed environment configurations in backend settings.
   */
  readonly env: Record<string, string | undefined>;

  /**
   * Backend settings
   *
   * @remarks
   * Resolved backend settings with all defaults applied.
   * Use this for backend-specific configuration.
   */
  readonly settings: ResolvedBackendSettings;

  /**
   * Current environment (development, staging, production)
   *
   * @remarks
   * Allows services to adapt behavior based on environment.
   */
  readonly environment: Environment;

  /**
   * Logger for service initialization
   *
   * @remarks
   * Use this logger during service construction to log initialization events.
   * Integrated with Azure Application Insights.
   */
  readonly logger: Logger;
}

/**
 * Service factory function
 *
 * @typeParam T - Service type
 *
 * @remarks
 * Factory function that creates service instances.
 * Called once per function invocation (unless wrapped with singleton()).
 * Has access to execution context for environment variables, configuration, etc.
 *
 * Supports both synchronous and asynchronous service creation.
 *
 * @param context - Service factory context
 * @returns Service instance or Promise resolving to service instance
 *
 * @example
 * ```typescript
 * const reportFactory: ServiceFactory<ReportGenerator> = (context) => {
 *   return new ReportGeneratorService({
 *     storageAccount: context.env.STORAGE_ACCOUNT!,
 *     aiEndpoint: context.env.AI_ENDPOINT!,
 *   });
 * };
 * ```
 *
 * @public
 */
export type ServiceFactory<T> = (context: ServiceFactoryContext) => T | Promise<T>;

// ============================================================================
// Service Definition
// ============================================================================

/**
 * Service definition
 *
 * @typeParam T - Service type
 *
 * @remarks
 * Describes a service with its factory, lifecycle, and metadata.
 *
 * @public
 */
export interface ServiceDefinition<T> {
  /**
   * Service name
   *
   * @remarks
   * Unique identifier for the service.
   * Used to access the service via context.services[name]
   */
  readonly name: string;

  /**
   * Service factory function
   *
   * @remarks
   * Function that creates the service instance.
   */
  readonly factory: ServiceFactory<T>;

  /**
   * Service lifecycle
   *
   * @remarks
   * - 'transient': New instance per function invocation
   * - 'singleton': Shared instance across all invocations
   * - 'scoped': New instance per request (not yet implemented)
   *
   * @defaultValue 'transient'
   */
  readonly lifecycle?: ServiceLifecycle;

  /**
   * Service metadata
   *
   * @remarks
   * Optional metadata for documentation and tooling.
   */
  readonly metadata?: ServiceMetadata;
}

/**
 * Service lifecycle
 *
 * @remarks
 * Determines how service instances are created and cached.
 *
 * @public
 */
export type ServiceLifecycle = 'transient' | 'singleton' | 'scoped';

/**
 * Service metadata
 *
 * @remarks
 * Optional metadata about the service for documentation and debugging.
 *
 * @public
 */
export interface ServiceMetadata {
  /**
   * Service description
   */
  readonly description?: string;

  /**
   * Service version
   */
  readonly version?: string;

  /**
   * Service dependencies (for documentation)
   */
  readonly dependencies?: readonly string[];
}

// ============================================================================
// Service Configuration
// ============================================================================

/**
 * Service configuration map
 *
 * @typeParam TServices - Service registry type
 *
 * @remarks
 * Maps service names to factory functions.
 * Used in backend configuration to define available services.
 *
 * @example
 * ```typescript
 * const services: ServiceConfig<{
 *   reportGenerator: ReportGenerator;
 *   dataValidator: DataValidator;
 * }> = {
 *   reportGenerator: (context) => new ReportGeneratorService(),
 *   dataValidator: (context) => new DataValidatorService(),
 * };
 * ```
 *
 * @public
 */
export type ServiceConfig<TServices extends Record<string, any>> = {
  [K in keyof TServices]: ServiceFactory<TServices[K]>;
};

/**
 * Registered services type map
 *
 * @remarks
 * Type utility for extracting service types from service config.
 *
 * @public
 */
export type RegisteredServices<TConfig extends Record<string, ServiceFactory<any>>> = {
  [K in keyof TConfig]: TConfig[K] extends ServiceFactory<infer T> ? T : never;
};

// ============================================================================
// Service Errors
// ============================================================================

/**
 * Service not found error
 *
 * @remarks
 * Thrown when attempting to access a service that hasn't been registered.
 *
 * @public
 */
export class ServiceNotFoundError extends Error {
  /**
   * Service name that was not found
   */
  public readonly serviceName: string;

  /**
   * Available service names
   */
  public readonly availableServices: readonly string[];

  /**
   * Create a ServiceNotFoundError
   *
   * @param serviceName - Service name that was not found
   * @param availableServices - List of available service names
   */
  constructor(serviceName: string, availableServices: readonly string[]) {
    const message =
      `Service '${serviceName}' not found in service registry. ` +
      `Available services: ${availableServices.length > 0 ? availableServices.join(', ') : 'none'}`;

    super(message);
    this.name = 'ServiceNotFoundError';
    this.serviceName = serviceName;
    this.availableServices = availableServices;
  }
}

/**
 * Service instantiation error
 *
 * @remarks
 * Thrown when a service factory fails to create a service instance.
 *
 * @public
 */
export class ServiceInstantiationError extends Error {
  /**
   * Service name that failed to instantiate
   */
  public readonly serviceName: string;

  /**
   * Original error
   */
  public readonly cause: Error;

  /**
   * Create a ServiceInstantiationError
   *
   * @param serviceName - Service name
   * @param cause - Original error
   */
  constructor(serviceName: string, cause: Error) {
    super(`Failed to instantiate service '${serviceName}': ${cause.message}`);
    this.name = 'ServiceInstantiationError';
    this.serviceName = serviceName;
    this.cause = cause;
  }
}

/**
 * Circular dependency error
 *
 * @remarks
 * Thrown when a circular service dependency is detected.
 *
 * @public
 */
export class CircularDependencyError extends Error {
  /**
   * Dependency chain that caused the circular reference
   */
  public readonly dependencyChain: readonly string[];

  /**
   * Create a CircularDependencyError
   *
   * @param dependencyChain - Chain of dependencies
   */
  constructor(dependencyChain: readonly string[]) {
    const chain = dependencyChain.join(' -> ');
    super(`Circular service dependency detected: ${chain}`);
    this.name = 'CircularDependencyError';
    this.dependencyChain = dependencyChain;
  }
}
