/**
 * Backend Pattern Error Classes
 *
 * This file defines custom error classes for the backend pattern,
 * providing structured error handling and debugging information.
 *
 * @module @atakora/component/backend/errors
 */

/**
 * Base error class for all backend-related errors.
 * Extends Error with additional context properties.
 */
export class BackendError extends Error {
  /**
   * Error code for programmatic error handling
   */
  public readonly code: string;

  /**
   * Additional context about the error
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Create a new BackendError.
   *
   * @param message - Error message
   * @param code - Error code
   * @param context - Additional context
   */
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when a component is invalid or misconfigured.
 */
export class ComponentError extends BackendError {
  /**
   * Component ID that caused the error
   */
  public readonly componentId?: string;

  constructor(message: string, componentId?: string, context?: Record<string, unknown>) {
    super(message, 'COMPONENT_ERROR', { ...context, componentId });
    this.name = 'ComponentError';
    this.componentId = componentId;
  }
}

/**
 * Error thrown when a resource requirement is invalid.
 */
export class RequirementError extends BackendError {
  /**
   * Resource type that caused the error
   */
  public readonly resourceType?: string;

  /**
   * Requirement key that caused the error
   */
  public readonly requirementKey?: string;

  constructor(
    message: string,
    resourceType?: string,
    requirementKey?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'REQUIREMENT_ERROR', { ...context, resourceType, requirementKey });
    this.name = 'RequirementError';
    this.resourceType = resourceType;
    this.requirementKey = requirementKey;
  }
}

/**
 * Error thrown when a resource provider is missing or fails.
 */
export class ProviderError extends BackendError {
  /**
   * Provider ID that caused the error
   */
  public readonly providerId?: string;

  constructor(message: string, providerId?: string, context?: Record<string, unknown>) {
    super(message, 'PROVIDER_ERROR', { ...context, providerId });
    this.name = 'ProviderError';
    this.providerId = providerId;
  }
}

/**
 * Error thrown when resource provisioning fails.
 */
export class ProvisioningError extends BackendError {
  /**
   * Resource type being provisioned
   */
  public readonly resourceType?: string;

  /**
   * Resource key being provisioned
   */
  public readonly resourceKey?: string;

  constructor(
    message: string,
    resourceType?: string,
    resourceKey?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'PROVISIONING_ERROR', { ...context, resourceType, resourceKey });
    this.name = 'ProvisioningError';
    this.resourceType = resourceType;
    this.resourceKey = resourceKey;
  }
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends BackendError {
  /**
   * Validation errors
   */
  public readonly errors: ReadonlyArray<string>;

  /**
   * Validation warnings
   */
  public readonly warnings?: ReadonlyArray<string>;

  constructor(
    message: string,
    errors: ReadonlyArray<string>,
    warnings?: ReadonlyArray<string>,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', { ...context, errors, warnings });
    this.name = 'ValidationError';
    this.errors = errors;
    this.warnings = warnings;
  }
}

/**
 * Error thrown when configuration merging fails.
 */
export class MergeError extends BackendError {
  /**
   * Configurations that couldn't be merged
   */
  public readonly conflictingConfigs?: ReadonlyArray<unknown>;

  constructor(message: string, conflictingConfigs?: ReadonlyArray<unknown>, context?: Record<string, unknown>) {
    super(message, 'MERGE_ERROR', { ...context, conflictingConfigs });
    this.name = 'MergeError';
    this.conflictingConfigs = conflictingConfigs;
  }
}

/**
 * Error thrown when a resource limit is exceeded.
 */
export class ResourceLimitError extends BackendError {
  /**
   * Resource type that exceeded limit
   */
  public readonly resourceType: string;

  /**
   * Limit that was exceeded
   */
  public readonly limit: number;

  /**
   * Current count
   */
  public readonly current: number;

  constructor(
    message: string,
    resourceType: string,
    limit: number,
    current: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'RESOURCE_LIMIT_ERROR', { ...context, resourceType, limit, current });
    this.name = 'ResourceLimitError';
    this.resourceType = resourceType;
    this.limit = limit;
    this.current = current;
  }
}

/**
 * Error thrown when backend initialization fails.
 */
export class InitializationError extends BackendError {
  /**
   * Backend ID that failed to initialize
   */
  public readonly backendId?: string;

  /**
   * Phase where initialization failed
   */
  public readonly phase?: string;

  constructor(
    message: string,
    backendId?: string,
    phase?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'INITIALIZATION_ERROR', { ...context, backendId, phase });
    this.name = 'InitializationError';
    this.backendId = backendId;
    this.phase = phase;
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create a ComponentError for duplicate component ID.
 */
export function createDuplicateComponentError(
  componentId: string,
  backendId: string
): ComponentError {
  return new ComponentError(
    `Component with ID "${componentId}" already exists in backend "${backendId}"`,
    componentId,
    { backendId }
  );
}

/**
 * Create a ComponentError for missing component.
 */
export function createComponentNotFoundError(
  componentId: string,
  backendId: string
): ComponentError {
  return new ComponentError(
    `Component "${componentId}" not found in backend "${backendId}"`,
    componentId,
    { backendId }
  );
}

/**
 * Create a RequirementError for invalid requirement.
 */
export function createInvalidRequirementError(
  reason: string,
  resourceType?: string,
  requirementKey?: string
): RequirementError {
  return new RequirementError(
    `Invalid requirement: ${reason}`,
    resourceType,
    requirementKey
  );
}

/**
 * Create a ProviderError for missing provider.
 */
export function createMissingProviderError(resourceType: string): ProviderError {
  return new ProviderError(
    `No provider found for resource type "${resourceType}". ` +
    'Register a custom provider or ensure the resource type is supported.',
    undefined,
    { resourceType }
  );
}

/**
 * Create a ProviderError for provider failure.
 */
export function createProviderFailureError(
  providerId: string,
  operation: string,
  reason: string
): ProviderError {
  return new ProviderError(
    `Provider "${providerId}" failed during ${operation}: ${reason}`,
    providerId,
    { operation, reason }
  );
}

/**
 * Create a ProvisioningError for resource provisioning failure.
 */
export function createProvisioningFailureError(
  resourceType: string,
  resourceKey: string,
  reason: string
): ProvisioningError {
  return new ProvisioningError(
    `Failed to provision resource "${resourceType}:${resourceKey}": ${reason}`,
    resourceType,
    resourceKey,
    { reason }
  );
}

/**
 * Create a ValidationError from validation result.
 */
export function createValidationFailureError(
  errors: ReadonlyArray<string>,
  warnings?: ReadonlyArray<string>
): ValidationError {
  return new ValidationError(
    `Validation failed with ${errors.length} error(s)`,
    errors,
    warnings
  );
}

/**
 * Create a MergeError for incompatible configurations.
 */
export function createIncompatibleConfigsError(
  resourceType: string,
  reason: string,
  configs?: ReadonlyArray<unknown>
): MergeError {
  return new MergeError(
    `Cannot merge configurations for "${resourceType}": ${reason}`,
    configs,
    { resourceType, reason }
  );
}

/**
 * Create a ResourceLimitError for exceeded limit.
 */
export function createLimitExceededError(
  resourceType: string,
  limit: number,
  current: number
): ResourceLimitError {
  return new ResourceLimitError(
    `Resource limit exceeded for "${resourceType}". Maximum: ${limit}, Current: ${current}`,
    resourceType,
    limit,
    current
  );
}

/**
 * Create an InitializationError for backend initialization failure.
 */
export function createInitializationFailureError(
  backendId: string,
  phase: string,
  reason: string
): InitializationError {
  return new InitializationError(
    `Backend "${backendId}" failed to initialize during ${phase}: ${reason}`,
    backendId,
    phase,
    { reason }
  );
}
