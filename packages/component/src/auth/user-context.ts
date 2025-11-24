/**
 * User Context for Authorization Integration
 *
 * This module provides the user context utilities that connect
 * authentication (Phase 2) with authorization (Phase 1).
 *
 * @packageDocumentation
 */

import type { TokenValidationResult, UserContext as BaseUserContext } from './types';

// ============================================================================
// Extended User Context Types
// ============================================================================

/**
 * Extended user context with authorization helper methods
 *
 * @remarks
 * This extends the base UserContext from types.ts with helper methods
 * for authorization checks. The base context is created during authentication,
 * and these helpers make it easier to evaluate authorization rules.
 *
 * @example
 * Creating user context from token validation
 * ```typescript
 * const validationResult: TokenValidationResult = await provider.validate(token);
 * const roles = ['user', 'editor'];
 * const userContext = createUserContext(validationResult, roles);
 *
 * // Check authorization
 * if (userContext.hasRole('editor')) {
 *   // Allow edit operation
 * }
 * ```
 */
export interface ExtendedUserContext extends BaseUserContext {
  /**
   * User name/display name
   * Optional, may not be present in all token types
   */
  readonly name?: string;

  /**
   * Groups (alias for roles)
   * Provided for convenience and clarity in authorization rules
   */
  readonly groups: readonly string[];

  /**
   * Whether user is authenticated
   * Always true for valid user contexts
   */
  readonly isAuthenticated: boolean;

  // Helper methods for role/group checking

  /**
   * Check if user has a specific role
   *
   * @param role - Role name to check
   * @returns True if user has the role
   *
   * @example
   * ```typescript
   * if (userContext.hasRole('admin')) {
   *   // Allow admin-only operation
   * }
   * ```
   */
  hasRole(role: string): boolean;

  /**
   * Check if user has any of the specified roles
   *
   * @param roles - Array of role names
   * @returns True if user has at least one of the roles
   *
   * @example
   * ```typescript
   * if (userContext.hasAnyRole(['admin', 'editor'])) {
   *   // Allow operation for admins or editors
   * }
   * ```
   */
  hasAnyRole(roles: string[]): boolean;

  /**
   * Check if user has all of the specified roles
   *
   * @param roles - Array of role names
   * @returns True if user has all of the roles
   *
   * @example
   * ```typescript
   * if (userContext.hasAllRoles(['user', 'verified'])) {
   *   // Allow operation only for verified users
   * }
   * ```
   */
  hasAllRoles(roles: string[]): boolean;

  /**
   * Check if user is in a specific group
   * Alias for hasRole() for clarity in group-based authorization
   *
   * @param group - Group name to check
   * @returns True if user is in the group
   *
   * @example
   * ```typescript
   * if (userContext.isInGroup('developers')) {
   *   // Allow operation for developers group
   * }
   * ```
   */
  isInGroup(group: string): boolean;
}

/**
 * Re-export base UserContext for convenience
 */
export type { BaseUserContext as UserContext };

// ============================================================================
// User Context Creation
// ============================================================================

/**
 * Create extended user context from authentication result
 *
 * This function bridges the gap between token validation (Phase 2) and
 * authorization rules (Phase 1) by creating a standardized user context
 * with helper methods.
 *
 * @param validationResult - Result from token validation
 * @param roles - Roles mapped from token claims
 * @param provider - Name of the authentication provider
 * @param sessionId - Optional session ID
 * @returns Extended user context for authorization
 *
 * @throws {Error} If validation result is invalid or user ID is missing
 *
 * @example
 * Complete authentication flow
 * ```typescript
 * // 1. Validate token
 * const validationResult = await authProvider.validate(token);
 *
 * if (!validationResult.valid) {
 *   throw new Error('Invalid token');
 * }
 *
 * // 2. Map roles
 * const roles = authProvider.mapRoles(validationResult.claims!);
 *
 * // 3. Create user context
 * const userContext = createUserContext(
 *   validationResult,
 *   roles,
 *   'entra',
 *   sessionId
 * );
 *
 * // 4. Use in authorization
 * const canEdit = userContext.hasAnyRole(['editor', 'admin']);
 * ```
 */
export function createUserContext(
  validationResult: TokenValidationResult,
  roles: string[],
  provider: string = 'unknown',
  sessionId?: string
): ExtendedUserContext {
  // Validate inputs
  if (!validationResult.valid) {
    throw new Error('Cannot create user context from invalid validation result');
  }

  if (!validationResult.userId) {
    throw new Error('User ID is required to create user context');
  }

  // Create readonly roles array
  const readonlyRoles = Object.freeze([...roles]);

  // Create user context with helper methods
  const context: ExtendedUserContext = {
    id: validationResult.userId,
    email: validationResult.email,
    name: validationResult.claims?.name,
    roles: [...roles], // Base context expects mutable array
    groups: readonlyRoles, // Alias for roles
    claims: Object.freeze({ ...(validationResult.claims || {}) }),
    isAuthenticated: true,
    provider,
    sessionId,

    // Helper methods
    hasRole(role: string): boolean {
      return this.roles.includes(role);
    },

    hasAnyRole(roles: string[]): boolean {
      return roles.some((role) => this.roles.includes(role));
    },

    hasAllRoles(roles: string[]): boolean {
      return roles.every((role) => this.roles.includes(role));
    },

    isInGroup(group: string): boolean {
      return this.groups.includes(group);
    },
  };

  // Make the context object immutable
  return Object.freeze(context);
}

/**
 * Anonymous user context for unauthenticated requests
 *
 * @remarks
 * This context represents an unauthenticated user and is used when
 * no valid authentication token is provided. It allows public
 * authorization rules to work correctly.
 *
 * @example
 * ```typescript
 * const userContext = getAnonymousUserContext();
 * console.log(userContext.isAuthenticated); // false
 * console.log(userContext.roles); // []
 * ```
 */
export function getAnonymousUserContext(): ExtendedUserContext {
  const context: ExtendedUserContext = {
    id: 'anonymous',
    email: undefined,
    name: undefined,
    roles: [],
    groups: Object.freeze([]),
    claims: {},
    isAuthenticated: false,
    provider: 'none',
    sessionId: undefined,

    hasRole(): boolean {
      return false;
    },

    hasAnyRole(): boolean {
      return false;
    },

    hasAllRoles(): boolean {
      return false;
    },

    isInGroup(): boolean {
      return false;
    },
  };

  return Object.freeze(context);
}

/**
 * Type guard to check if a value is a valid extended user context
 *
 * @param value - Value to check
 * @returns True if value is a valid ExtendedUserContext
 *
 * @example
 * ```typescript
 * if (isExtendedUserContext(context)) {
 *   // Safe to use as ExtendedUserContext
 *   console.log(context.hasRole('admin'));
 * }
 * ```
 */
export function isExtendedUserContext(value: any): value is ExtendedUserContext {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    Array.isArray(value.roles) &&
    Array.isArray(value.groups) &&
    typeof value.isAuthenticated === 'boolean' &&
    typeof value.hasRole === 'function' &&
    typeof value.hasAnyRole === 'function' &&
    typeof value.hasAllRoles === 'function' &&
    typeof value.isInGroup === 'function'
  );
}

/**
 * Type guard to check if a value is a base user context
 *
 * @param value - Value to check
 * @returns True if value is a valid UserContext
 *
 * @example
 * ```typescript
 * if (isUserContext(context)) {
 *   // Safe to use as UserContext
 *   console.log(context.id);
 * }
 * ```
 */
export function isUserContext(value: any): value is BaseUserContext {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    Array.isArray(value.roles) &&
    typeof value.provider === 'string'
  );
}
