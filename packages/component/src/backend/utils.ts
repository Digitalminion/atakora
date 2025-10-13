/**
 * Backend Pattern Utility Functions
 *
 * This file contains utility functions for resource key formatting,
 * backward compatibility detection, and common helper operations.
 *
 * @module @atakora/component/backend/utils
 */

import type { Construct } from '@atakora/cdk';
import type { IResourceRequirement } from './interfaces';

// ============================================================================
// Resource Key Formatting
// ============================================================================

/**
 * Format a resource key from resource type and requirement key.
 * Uses the pattern: `{resourceType}:{requirementKey}`
 *
 * @param resourceType - Type of resource (e.g., 'cosmos', 'functions')
 * @param requirementKey - Unique requirement key
 * @returns Formatted resource key
 *
 * @example
 * ```typescript
 * const key = formatResourceKey('cosmos', 'shared-database');
 * // Returns: 'cosmos:shared-database'
 * ```
 */
export function formatResourceKey(resourceType: string, requirementKey: string): string {
  if (!resourceType || !requirementKey) {
    throw new Error('Resource type and requirement key are required');
  }
  return `${resourceType}:${requirementKey}`;
}

/**
 * Parse a resource key into its components.
 * Reverses the formatResourceKey operation.
 *
 * @param resourceKey - Formatted resource key
 * @returns Object with resourceType and requirementKey
 * @throws Error if key format is invalid
 *
 * @example
 * ```typescript
 * const parsed = parseResourceKey('cosmos:shared-database');
 * // Returns: { resourceType: 'cosmos', requirementKey: 'shared-database' }
 * ```
 */
export function parseResourceKey(resourceKey: string): {
  readonly resourceType: string;
  readonly requirementKey: string;
} {
  const parts = resourceKey.split(':');
  if (parts.length !== 2) {
    throw new Error(
      `Invalid resource key format: "${resourceKey}". Expected format: "resourceType:requirementKey"`
    );
  }

  const [resourceType, requirementKey] = parts;
  if (!resourceType || !requirementKey) {
    throw new Error(`Invalid resource key format: "${resourceKey}". Both parts must be non-empty`);
  }

  return { resourceType, requirementKey };
}

/**
 * Get resource key from a requirement.
 * Convenience function that extracts type and key from requirement.
 *
 * @param requirement - Resource requirement
 * @returns Formatted resource key
 *
 * @example
 * ```typescript
 * const requirement: IResourceRequirement = {
 *   resourceType: 'cosmos',
 *   requirementKey: 'shared-database',
 *   config: {}
 * };
 * const key = getResourceKeyFromRequirement(requirement);
 * // Returns: 'cosmos:shared-database'
 * ```
 */
export function getResourceKeyFromRequirement(requirement: IResourceRequirement): string {
  return formatResourceKey(requirement.resourceType, requirement.requirementKey);
}

/**
 * Create a suffixed resource key for resource splitting.
 * Used when resource limits are exceeded and additional resources are needed.
 *
 * @param resourceType - Type of resource
 * @param requirementKey - Base requirement key
 * @param suffix - Numeric suffix
 * @returns Formatted resource key with suffix
 *
 * @example
 * ```typescript
 * const key = formatResourceKeyWithSuffix('cosmos', 'shared-database', 2);
 * // Returns: 'cosmos:shared-database-2'
 * ```
 */
export function formatResourceKeyWithSuffix(
  resourceType: string,
  requirementKey: string,
  suffix: number
): string {
  if (suffix < 1) {
    throw new Error('Suffix must be a positive integer');
  }
  return formatResourceKey(resourceType, `${requirementKey}-${suffix}`);
}

// ============================================================================
// Backward Compatibility Detection
// ============================================================================

/**
 * Check if a construct scope is backend-managed.
 * Uses CDK context to detect if component is being used within a backend.
 *
 * Components can use this to determine whether to create their own resources
 * (traditional mode) or expect resources to be injected (backend mode).
 *
 * @param scope - CDK construct scope
 * @returns True if scope is backend-managed
 *
 * @example
 * ```typescript
 * export class CrudApi extends Construct {
 *   constructor(scope: Construct, id: string, props: CrudApiProps) {
 *     super(scope, id);
 *
 *     if (isBackendManaged(scope)) {
 *       // New path: use injected resources
 *       this.useSharedResources();
 *     } else {
 *       // Old path: create own resources
 *       this.createOwnResources(props);
 *     }
 *   }
 * }
 * ```
 */
export function isBackendManaged(scope: Construct): boolean {
  return scope.node.tryGetContext('backend-managed') === true;
}

/**
 * Mark a construct scope as backend-managed.
 * This is called by the backend when initializing components.
 *
 * @param scope - CDK construct scope to mark
 *
 * @internal
 */
export function markAsBackendManaged(scope: Construct): void {
  scope.node.setContext('backend-managed', true);
}

/**
 * Get the backend ID from a construct scope.
 * Returns undefined if scope is not backend-managed.
 *
 * @param scope - CDK construct scope
 * @returns Backend ID or undefined
 */
export function getBackendId(scope: Construct): string | undefined {
  return scope.node.tryGetContext('backend-id') as string | undefined;
}

/**
 * Set the backend ID in a construct scope.
 *
 * @param scope - CDK construct scope
 * @param backendId - Backend identifier
 *
 * @internal
 */
export function setBackendId(scope: Construct, backendId: string): void {
  scope.node.setContext('backend-id', backendId);
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that a requirement has all required fields.
 *
 * @param requirement - Requirement to validate
 * @throws Error if validation fails
 */
export function validateRequirement(requirement: IResourceRequirement): void {
  if (!requirement.resourceType) {
    throw new Error('Resource requirement must have a resourceType');
  }

  if (!requirement.requirementKey) {
    throw new Error('Resource requirement must have a requirementKey');
  }

  if (!requirement.config) {
    throw new Error('Resource requirement must have a config');
  }

  if (typeof requirement.config !== 'object') {
    throw new Error('Resource requirement config must be an object');
  }
}

/**
 * Validate requirement key format.
 * Keys should be lowercase with hyphens, no spaces or special characters.
 *
 * @param key - Requirement key to validate
 * @returns True if key is valid
 */
export function isValidRequirementKey(key: string): boolean {
  // Allow lowercase letters, numbers, and hyphens only
  return /^[a-z0-9-]+$/.test(key);
}

/**
 * Sanitize a requirement key to ensure it's valid.
 *
 * @param key - Key to sanitize
 * @returns Sanitized key
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeRequirementKey('My Database_Name');
 * // Returns: 'my-database-name'
 * ```
 */
export function sanitizeRequirementKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace invalid chars with hyphen
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// ============================================================================
// Requirement Analysis
// ============================================================================

/**
 * Group requirements by their resource keys.
 * Used for requirement aggregation and merging.
 *
 * @param requirements - Array of requirements
 * @returns Map of resource key to array of requirements
 *
 * @example
 * ```typescript
 * const grouped = groupRequirementsByKey([req1, req2, req3]);
 * // Returns: Map {
 * //   'cosmos:shared-database' => [req1, req2],
 * //   'functions:api-functions' => [req3]
 * // }
 * ```
 */
export function groupRequirementsByKey(
  requirements: ReadonlyArray<IResourceRequirement>
): Map<string, IResourceRequirement[]> {
  const grouped = new Map<string, IResourceRequirement[]>();

  for (const requirement of requirements) {
    const key = getResourceKeyFromRequirement(requirement);
    const group = grouped.get(key) ?? [];
    group.push(requirement);
    grouped.set(key, group);
  }

  return grouped;
}

/**
 * Group requirements by resource type.
 *
 * @param requirements - Array of requirements
 * @returns Map of resource type to array of requirements
 *
 * @example
 * ```typescript
 * const grouped = groupRequirementsByType([req1, req2, req3]);
 * // Returns: Map {
 * //   'cosmos' => [req1, req2],
 * //   'functions' => [req3]
 * // }
 * ```
 */
export function groupRequirementsByType(
  requirements: ReadonlyArray<IResourceRequirement>
): Map<string, IResourceRequirement[]> {
  const grouped = new Map<string, IResourceRequirement[]>();

  for (const requirement of requirements) {
    const group = grouped.get(requirement.resourceType) ?? [];
    group.push(requirement);
    grouped.set(requirement.resourceType, group);
  }

  return grouped;
}

/**
 * Get unique resource types from requirements.
 *
 * @param requirements - Array of requirements
 * @returns Set of unique resource types
 */
export function getUniqueResourceTypes(
  requirements: ReadonlyArray<IResourceRequirement>
): Set<string> {
  return new Set(requirements.map((req) => req.resourceType));
}

/**
 * Filter requirements by resource type.
 *
 * @param requirements - Array of requirements
 * @param resourceType - Type to filter by
 * @returns Filtered requirements
 */
export function filterRequirementsByType(
  requirements: ReadonlyArray<IResourceRequirement>,
  resourceType: string
): ReadonlyArray<IResourceRequirement> {
  return requirements.filter((req) => req.resourceType === resourceType);
}

// ============================================================================
// Priority Handling
// ============================================================================

/**
 * Default priority for requirements
 */
export const DEFAULT_REQUIREMENT_PRIORITY = 10;

/**
 * Get effective priority for a requirement.
 * Returns default priority if none specified.
 *
 * @param requirement - Resource requirement
 * @returns Effective priority value
 */
export function getEffectivePriority(requirement: IResourceRequirement): number {
  return requirement.priority ?? DEFAULT_REQUIREMENT_PRIORITY;
}

/**
 * Sort requirements by priority (highest first).
 *
 * @param requirements - Array of requirements
 * @returns Sorted array (new array, original unchanged)
 */
export function sortRequirementsByPriority(
  requirements: ReadonlyArray<IResourceRequirement>
): ReadonlyArray<IResourceRequirement> {
  return [...requirements].sort((a, b) => {
    return getEffectivePriority(b) - getEffectivePriority(a);
  });
}

/**
 * Get highest priority requirement from a group.
 *
 * @param requirements - Array of requirements
 * @returns Requirement with highest priority
 * @throws Error if array is empty
 */
export function getHighestPriorityRequirement(
  requirements: ReadonlyArray<IResourceRequirement>
): IResourceRequirement {
  if (requirements.length === 0) {
    throw new Error('Cannot get highest priority from empty requirements array');
  }

  return sortRequirementsByPriority(requirements)[0];
}

// ============================================================================
// Deep Merge Utilities
// ============================================================================

/**
 * Deep merge two objects.
 * Later object takes precedence for conflicts.
 *
 * @param target - Target object
 * @param source - Source object
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        // Both are objects, merge recursively
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        // Primitive or array, take source value
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Deep merge multiple objects.
 *
 * @param objects - Array of objects to merge
 * @returns Merged object
 */
export function deepMergeAll<T extends Record<string, unknown>>(
  objects: ReadonlyArray<Partial<T>>
): T {
  if (objects.length === 0) {
    return {} as T;
  }

  let result = objects[0] as T;
  for (let i = 1; i < objects.length; i++) {
    result = deepMerge(result, objects[i]);
  }

  return result;
}

// ============================================================================
// Environment Variable Utilities
// ============================================================================

/**
 * Create namespaced environment variable name.
 * Prevents conflicts when merging environment variables from multiple components.
 *
 * @param componentId - Component identifier
 * @param variableName - Variable name
 * @returns Namespaced variable name
 *
 * @example
 * ```typescript
 * const name = namespaceEnvironmentVariable('UserApi', 'COSMOS_ENDPOINT');
 * // Returns: 'USER_API_COSMOS_ENDPOINT'
 * ```
 */
export function namespaceEnvironmentVariable(
  componentId: string,
  variableName: string
): string {
  const prefix = componentId
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toUpperCase();

  return `${prefix}_${variableName}`;
}

/**
 * Merge environment variables from multiple sources.
 * Later sources take precedence for conflicts.
 *
 * @param sources - Array of environment variable objects
 * @returns Merged environment variables
 */
export function mergeEnvironmentVariables(
  sources: ReadonlyArray<Record<string, string>>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      result[key] = value;
    }
  }

  return result;
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Create an error for duplicate requirement keys.
 *
 * @param key - Duplicate key
 * @param componentIds - Components with duplicate key
 * @returns Error instance
 */
export function createDuplicateKeyError(
  key: string,
  componentIds: ReadonlyArray<string>
): Error {
  return new Error(
    `Duplicate requirement key "${key}" found in components: ${componentIds.join(', ')}`
  );
}

/**
 * Create an error for unsupported resource type.
 *
 * @param resourceType - Unsupported type
 * @returns Error instance
 */
export function createUnsupportedResourceTypeError(resourceType: string): Error {
  return new Error(`Unsupported resource type: "${resourceType}"`);
}

/**
 * Create an error for missing provider.
 *
 * @param resourceType - Resource type with no provider
 * @returns Error instance
 */
export function createMissingProviderError(resourceType: string): Error {
  return new Error(
    `No provider found for resource type: "${resourceType}". ` +
    'Register a custom provider or ensure the resource type is supported.'
  );
}

/**
 * Create an error for resource limit exceeded.
 *
 * @param resourceType - Resource type
 * @param limit - Exceeded limit
 * @returns Error instance
 */
export function createResourceLimitError(resourceType: string, limit: number): Error {
  return new Error(
    `Resource limit exceeded for "${resourceType}". Maximum: ${limit}. ` +
    'Consider splitting resources or increasing limits.'
  );
}
