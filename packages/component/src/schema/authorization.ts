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

  /**
   * Custom authorization rule with a function
   *
   * @param fn - Custom authorization function
   *
   * @example
   * ```typescript
   * .authorization(allow => [
   *   allow.custom((user, resource) => {
   *     return user.id === resource.ownerId || user.groups.includes('admin');
   *   }).read()
   * ])
   * ```
   */
  custom(fn: (user: any, resource: any) => boolean): CustomRuleBuilder {
    return new CustomRuleBuilder(fn);
  }
}

// ============================================================================
// Owner Rule Builder
// ============================================================================

export class OwnerRuleBuilder {
  private field: string;
  private ops: Operation[] = [];

  constructor(field: string, operations?: Operation[]) {
    this.field = field;
    if (operations) {
      this.ops = [...operations];
    }
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
  create(): this {
    if (!this.ops.includes('create')) {
      this.ops.push('create');
    }
    return this;
  }

  /**
   * Allow read operation
   */
  read(): this {
    if (!this.ops.includes('read')) {
      this.ops.push('read');
    }
    return this;
  }

  /**
   * Allow update operation
   */
  update(fields?: string[]): this {
    if (!this.ops.includes('update')) {
      this.ops.push('update');
    }
    return this;
  }

  /**
   * Allow delete operation
   */
  delete(): this {
    if (!this.ops.includes('delete')) {
      this.ops.push('delete');
    }
    return this;
  }

  /**
   * Build with current operations
   */
  _build(): AuthorizationRule {
    return {
      type: 'owner',
      field: this.field,
      operations: this.ops.length > 0 ? this.ops : undefined,
    };
  }

  /**
   * Convert to authorization rule (default behavior when not chained)
   */
  toRule(): AuthorizationRule {
    return this._build();
  }
}

// ============================================================================
// Groups Rule Builder
// ============================================================================

export class GroupsRuleBuilder {
  private groupNames: string[];
  private ops: Operation[] = [];

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
  create(): this {
    if (!this.ops.includes('create')) {
      this.ops.push('create');
    }
    return this;
  }

  /**
   * Allow read operation
   */
  read(): this {
    if (!this.ops.includes('read')) {
      this.ops.push('read');
    }
    return this;
  }

  /**
   * Allow update operation
   */
  update(): this {
    if (!this.ops.includes('update')) {
      this.ops.push('update');
    }
    return this;
  }

  /**
   * Allow delete operation
   */
  delete(): this {
    if (!this.ops.includes('delete')) {
      this.ops.push('delete');
    }
    return this;
  }

  /**
   * Build with current operations
   */
  _build(): AuthorizationRule {
    return {
      type: 'groups',
      groups: this.groupNames,
      operations: this.ops.length > 0 ? this.ops : undefined,
    };
  }

  /**
   * Convert to authorization rule (default behavior when not chained)
   */
  toRule(): AuthorizationRule {
    return this._build();
  }
}

// ============================================================================
// Custom Rule Builder
// ============================================================================

export class CustomRuleBuilder {
  private fn: (user: any, resource: any) => boolean;
  private ops: Operation[] = [];

  constructor(fn: (user: any, resource: any) => boolean) {
    this.fn = fn;
  }

  /**
   * Allow all operations
   */
  all(): AuthorizationRule {
    return {
      type: 'custom',
      fn: this.fn,
      operations: undefined, // undefined means all
    } as any;
  }

  /**
   * Allow create operation
   */
  create(): this {
    if (!this.ops.includes('create')) {
      this.ops.push('create');
    }
    return this;
  }

  /**
   * Allow read operation
   */
  read(): this {
    if (!this.ops.includes('read')) {
      this.ops.push('read');
    }
    return this;
  }

  /**
   * Allow update operation
   */
  update(): this {
    if (!this.ops.includes('update')) {
      this.ops.push('update');
    }
    return this;
  }

  /**
   * Allow delete operation
   */
  delete(): this {
    if (!this.ops.includes('delete')) {
      this.ops.push('delete');
    }
    return this;
  }

  /**
   * Build with current operations
   */
  _build(): AuthorizationRule {
    return {
      type: 'custom',
      fn: this.fn,
      operations: this.ops.length > 0 ? this.ops : undefined,
    } as any;
  }

  /**
   * Convert to authorization rule (default behavior when not chained)
   */
  toRule(): AuthorizationRule {
    return this._build();
  }
}

// ============================================================================
// Type Export
// ============================================================================

/**
 * Authorization rule or builder type
 *
 * @remarks
 * Allows both completed authorization rules and builder instances
 * to be returned from authorization functions. Builders will be
 * automatically converted to rules.
 */
export type AuthorizationRuleOrBuilder =
  | AuthorizationRule
  | OwnerRuleBuilder
  | GroupsRuleBuilder
  | CustomRuleBuilder;

export type AuthorizationRulesFn = (builder: AuthorizationBuilder) => AuthorizationRuleOrBuilder[];
