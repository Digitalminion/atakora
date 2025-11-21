/**
 * Authorization Rule Builder
 *
 * Provides fluent API for defining authorization rules on models.
 */

import type { AuthorizationRule, Operation } from './types';

// ============================================================================
// Authorization Builder
// ============================================================================

export class AuthorizationBuilder {
  private rules: AuthorizationRule[] = [];

  /**
   * Allow access based on ownership of a field
   *
   * @param field - Field name that contains the user ID
   * @param operations - Optional array of allowed operations (default: all)
   *
   * @example
   * ```typescript
   * .authorization(allow => [
   *   allow.owner('userId')
   * ])
   * ```
   */
  owner(field: string, operations?: Operation[]): OwnerRuleBuilder {
    return new OwnerRuleBuilder(field, operations);
  }

  /**
   * Allow access to specific user groups
   *
   * @param groups - Array of group names
   *
   * @example
   * ```typescript
   * .authorization(allow => [
   *   allow.groups(['admin', 'editor']).all()
   * ])
   * ```
   */
  groups(groups: string[]): GroupsRuleBuilder {
    return new GroupsRuleBuilder(groups);
  }

  /**
   * Allow access to any authenticated user
   *
   * @param operations - Optional array of allowed operations
   *
   * @example
   * ```typescript
   * .authorization(allow => [
   *   allow.authenticated(['read', 'list'])
   * ])
   * ```
   */
  authenticated(operations?: Operation[]): AuthorizationRule {
    return {
      type: 'authenticated',
      operations,
    };
  }

  /**
   * Allow public access (no authentication required)
   *
   * @param operations - Optional array of allowed operations
   *
   * @example
   * ```typescript
   * .authorization(allow => [
   *   allow.public(['read', 'list'])
   * ])
   * ```
   */
  public(operations?: Operation[]): AuthorizationRule {
    return {
      type: 'public',
      operations,
    };
  }
}

// ============================================================================
// Owner Rule Builder
// ============================================================================

class OwnerRuleBuilder {
  private field: string;
  private ops?: Operation[];

  constructor(field: string, operations?: Operation[]) {
    this.field = field;
    this.ops = operations;
  }

  /**
   * Allow all operations
   */
  all(): AuthorizationRule {
    return {
      type: 'owner',
      field: this.field,
      operations: undefined, // undefined means all
    };
  }

  /**
   * Allow create operation
   */
  create(): AuthorizationRule {
    return {
      type: 'owner',
      field: this.field,
      operations: ['create'],
    };
  }

  /**
   * Allow read operation
   */
  read(): AuthorizationRule {
    return {
      type: 'owner',
      field: this.field,
      operations: ['read'],
    };
  }

  /**
   * Allow update operation
   */
  update(fields?: string[]): AuthorizationRule {
    return {
      type: 'owner',
      field: this.field,
      operations: ['update'],
    };
  }

  /**
   * Allow delete operation
   */
  delete(): AuthorizationRule {
    return {
      type: 'owner',
      field: this.field,
      operations: ['delete'],
    };
  }

  /**
   * Build with current operations
   */
  _build(): AuthorizationRule {
    return {
      type: 'owner',
      field: this.field,
      operations: this.ops,
    };
  }
}

// ============================================================================
// Groups Rule Builder
// ============================================================================

class GroupsRuleBuilder {
  private groupNames: string[];
  private ops?: Operation[];

  constructor(groups: string[]) {
    this.groupNames = groups;
  }

  /**
   * Allow all operations
   */
  all(): AuthorizationRule {
    return {
      type: 'groups',
      groups: this.groupNames,
      operations: undefined, // undefined means all
    };
  }

  /**
   * Allow create operation
   */
  create(): AuthorizationRule {
    return {
      type: 'groups',
      groups: this.groupNames,
      operations: ['create'],
    };
  }

  /**
   * Allow read operation
   */
  read(): AuthorizationRule {
    return {
      type: 'groups',
      groups: this.groupNames,
      operations: ['read'],
    };
  }

  /**
   * Allow update operation
   */
  update(): AuthorizationRule {
    return {
      type: 'groups',
      groups: this.groupNames,
      operations: ['update'],
    };
  }

  /**
   * Allow delete operation
   */
  delete(): AuthorizationRule {
    return {
      type: 'groups',
      groups: this.groupNames,
      operations: ['delete'],
    };
  }
}

// ============================================================================
// Type Export
// ============================================================================

export type AuthorizationRulesFn = (builder: AuthorizationBuilder) => AuthorizationRule[];
