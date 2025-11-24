/**
 * Authorization Integration Utilities
 *
 * This module provides runtime utilities that connect the authentication
 * system (Phase 2) with the authorization system (Phase 1).
 *
 * @packageDocumentation
 */

import type { ExtendedUserContext } from './user-context';
import type { Operation, AuthorizationRule as SchemaAuthorizationRule } from '../schema/types';

/**
 * User context type for authorization (can be base or extended)
 */
export type UserContext = ExtendedUserContext | import('./types').UserContext;

/**
 * Re-export authorization rule type for convenience
 */
export type AuthorizationRule = SchemaAuthorizationRule;

// ============================================================================
// Runtime Context Types
// ============================================================================

/**
 * Authorization runtime context
 *
 * This context is provided when evaluating authorization rules at runtime.
 * It contains the authenticated user, the record being accessed (if applicable),
 * and the operation being performed.
 *
 * @example
 * ```typescript
 * const context: AuthorizationRuntimeContext = {
 *   user: userContext,
 *   record: { id: '123', userId: 'user-456', title: 'My Post' },
 *   operation: 'update'
 * };
 *
 * // Evaluate authorization rules
 * const isOwner = checkOwnership(context.user, context.record, 'userId');
 * ```
 */
export interface AuthorizationRuntimeContext {
  /**
   * Authenticated user context
   */
  user: UserContext;

  /**
   * Record being accessed (optional)
   * Present for read, update, delete operations
   * Absent for create, list operations
   */
  record?: any;

  /**
   * Operation being performed
   */
  operation: Operation;
}

// ============================================================================
// Authorization Rule Evaluators
// ============================================================================

/**
 * Check if user owns a record
 * Used by: allow.owner('userId')
 *
 * @param user - User context
 * @param record - Record to check ownership of
 * @param ownerField - Field name that contains the owner's user ID
 * @returns True if user owns the record
 *
 * @remarks
 * This function implements the ownership check for the `allow.owner()` rule.
 * It compares the user's ID with the value of the specified field in the record.
 *
 * @example
 * Authorization rule:
 * ```typescript
 * .authorization(allow => [
 *   allow.owner('userId')  // Record must have userId === user.id
 * ])
 * ```
 *
 * Runtime check:
 * ```typescript
 * const record = { id: '1', userId: 'user-123', title: 'My Post' };
 * const user = createUserContext(...); // user.id === 'user-123'
 *
 * const isOwner = checkOwnership(user, record, 'userId');
 * console.log(isOwner); // true
 * ```
 */
export function checkOwnership(user: UserContext, record: any, ownerField: string): boolean {
  // Check if user is authenticated (handle both context types)
  const isAuth = 'isAuthenticated' in user ? user.isAuthenticated : true;
  if (!isAuth) {
    return false;
  }

  // Record must exist
  if (!record || typeof record !== 'object') {
    return false;
  }

  // Owner field must exist in record
  if (!(ownerField in record)) {
    return false;
  }

  // Compare user ID with owner field value
  const ownerValue = record[ownerField];
  return ownerValue === user.id;
}

/**
 * Check if user has required groups
 * Used by: allow.groups(['admin'])
 *
 * @param user - User context
 * @param requiredGroups - Array of group names (user needs at least one)
 * @returns True if user is in any of the required groups
 *
 * @remarks
 * This function implements the group check for the `allow.groups()` rule.
 * The user must have at least one of the specified groups/roles.
 *
 * @example
 * Authorization rule:
 * ```typescript
 * .authorization(allow => [
 *   allow.groups(['admin', 'editor']).all()
 * ])
 * ```
 *
 * Runtime check:
 * ```typescript
 * const user = createUserContext(...); // user.roles = ['editor', 'user']
 *
 * const hasAccess = checkGroups(user, ['admin', 'editor']);
 * console.log(hasAccess); // true (user has 'editor' role)
 * ```
 */
export function checkGroups(user: UserContext, requiredGroups: string[]): boolean {
  // Check if user is authenticated (handle both context types)
  const isAuth = 'isAuthenticated' in user ? user.isAuthenticated : true;
  if (!isAuth) {
    return false;
  }

  // User must have at least one of the required groups
  // Use hasAnyRole if available, otherwise check roles array directly
  if ('hasAnyRole' in user && typeof user.hasAnyRole === 'function') {
    return user.hasAnyRole(requiredGroups);
  }

  return requiredGroups.some((group) => user.roles.includes(group));
}

/**
 * Check if user is authenticated
 * Used by: allow.authenticated()
 *
 * @param user - User context
 * @returns True if user is authenticated
 *
 * @remarks
 * This function implements the authentication check for the `allow.authenticated()` rule.
 * It simply verifies that the user has a valid authentication token.
 *
 * @example
 * Authorization rule:
 * ```typescript
 * .authorization(allow => [
 *   allow.authenticated(['read', 'list'])
 * ])
 * ```
 *
 * Runtime check:
 * ```typescript
 * const user = createUserContext(...);
 *
 * const hasAccess = checkAuthenticated(user);
 * console.log(hasAccess); // true if user is authenticated
 * ```
 */
export function checkAuthenticated(user: UserContext): boolean {
  // If the context has isAuthenticated, use it; otherwise assume authenticated
  return 'isAuthenticated' in user ? user.isAuthenticated : true;
}

/**
 * Check public access
 * Used by: allow.public()
 *
 * @returns Always returns true
 *
 * @remarks
 * This function implements the public access rule for `allow.public()`.
 * Public rules always allow access, regardless of authentication.
 *
 * @example
 * Authorization rule:
 * ```typescript
 * .authorization(allow => [
 *   allow.public(['read', 'list'])
 * ])
 * ```
 *
 * Runtime check:
 * ```typescript
 * const hasAccess = checkPublic();
 * console.log(hasAccess); // always true
 * ```
 */
export function checkPublic(): boolean {
  return true;
}

// ============================================================================
// Authorization Rule Evaluation
// ============================================================================

/**
 * Evaluate a single authorization rule
 *
 * @param rule - Authorization rule to evaluate
 * @param context - Runtime context
 * @returns True if the rule allows access
 *
 * @remarks
 * This is the main evaluation function that routes to the appropriate
 * checker based on the rule type.
 *
 * @example
 * ```typescript
 * const rule = { type: 'owner', field: 'userId', operations: ['update'] };
 * const context = {
 *   user: userContext,
 *   record: { userId: 'user-123' },
 *   operation: 'update'
 * };
 *
 * const allowed = evaluateAuthorizationRule(rule, context);
 * ```
 */
export function evaluateAuthorizationRule(
  rule: AuthorizationRule,
  context: AuthorizationRuntimeContext
): boolean {
  // Check if rule applies to this operation
  if (rule.operations && !rule.operations.includes(context.operation)) {
    return false;
  }

  // Evaluate based on rule type
  switch (rule.type) {
    case 'owner':
      // Owner rules require a record
      if (!context.record) {
        return false;
      }
      return checkOwnership(context.user, context.record, rule.field);

    case 'groups':
      return checkGroups(context.user, rule.groups);

    case 'authenticated':
      return checkAuthenticated(context.user);

    case 'public':
      return checkPublic();

    default:
      // Unknown rule type - deny by default
      return false;
  }
}

/**
 * Evaluate all authorization rules (OR logic)
 *
 * @param rules - Array of authorization rules
 * @param context - Runtime context
 * @returns True if ANY rule allows access
 *
 * @remarks
 * Authorization rules use OR logic - if any rule allows access, the
 * operation is permitted. This allows flexible access control where
 * different paths can grant access (e.g., owner OR admin).
 *
 * @example
 * ```typescript
 * const rules = [
 *   { type: 'owner', field: 'userId' },
 *   { type: 'groups', groups: ['admin'] }
 * ];
 *
 * // Access granted if user is owner OR admin
 * const allowed = evaluateAuthorizationRules(rules, context);
 * ```
 */
export function evaluateAuthorizationRules(
  rules: AuthorizationRule[],
  context: AuthorizationRuntimeContext
): boolean {
  // No rules = deny access
  if (!rules || rules.length === 0) {
    return false;
  }

  // OR logic - any rule can grant access
  return rules.some((rule) => evaluateAuthorizationRule(rule, context));
}
