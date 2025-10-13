/**
 * Authorization rule builder for schema definitions.
 *
 * @remarks
 * Provides declarative authorization rules that integrate with
 * the authorization middleware in Azure Functions.
 *
 * @packageDocumentation
 */

import type {
  AuthorizationRule,
  AuthorizationRuleConfig,
  AuthorizationRuleFunction,
  AuthorizationContext,
} from './schema-types';

/**
 * Authorization rule builder with composable methods.
 */
export class AuthRuleBuilder {
  private constructor(private config: AuthorizationRuleConfig) {}

  /**
   * Allow public access (no authentication required).
   */
  static public(): AuthRuleBuilder {
    return new AuthRuleBuilder({
      type: 'public',
    });
  }

  /**
   * Require authentication (any authenticated user).
   */
  static authenticated(): AuthRuleBuilder {
    return new AuthRuleBuilder({
      type: 'authenticated',
    });
  }

  /**
   * Owner-based authorization (user owns the record).
   *
   * @param ownerField - Field name containing the owner ID
   */
  static owner(ownerField: string): AuthRuleBuilder {
    return new AuthRuleBuilder({
      type: 'owner',
      ownerField,
    });
  }

  /**
   * Role-based authorization (user has specific role).
   *
   * @param role - Required role
   */
  static role(role: string): AuthRuleBuilder {
    return new AuthRuleBuilder({
      type: 'role',
      role,
    });
  }

  /**
   * Role-based authorization (user has any of the specified roles).
   *
   * @param roles - Array of acceptable roles
   */
  static roles(roles: string[]): AuthRuleBuilder {
    return new AuthRuleBuilder({
      type: 'role',
      roles,
    });
  }

  /**
   * Group-based authorization (user is member of specific group).
   *
   * @param group - Azure AD group ID
   */
  static group(group: string): AuthRuleBuilder {
    return new AuthRuleBuilder({
      type: 'group',
      group,
    });
  }

  /**
   * Group-based authorization (user is member of any specified group).
   *
   * @param groups - Array of Azure AD group IDs
   */
  static groups(groups: string[]): AuthRuleBuilder {
    return new AuthRuleBuilder({
      type: 'group',
      groups,
    });
  }

  /**
   * Custom authorization logic.
   *
   * @param fn - Custom authorization function
   */
  static custom(fn: AuthorizationRuleFunction): AuthRuleBuilder {
    return new AuthRuleBuilder({
      type: 'custom',
      custom: fn,
    });
  }

  /**
   * Conditional authorization based on a condition.
   *
   * @param fn - Condition function
   */
  static if(fn: AuthorizationRuleFunction): AuthRuleBuilder {
    return new AuthRuleBuilder({
      type: 'custom',
      custom: fn,
    });
  }

  /**
   * Combine with another rule using AND logic.
   *
   * @param other - Other authorization rule
   */
  and(other: AuthRuleBuilder | AuthorizationRule): AuthRuleBuilder {
    const otherConfig = other instanceof AuthRuleBuilder ? other.build() : other;

    return new AuthRuleBuilder({
      type: 'custom',
      and: [this.config, otherConfig],
    });
  }

  /**
   * Combine with another rule using OR logic.
   *
   * @param other - Other authorization rule
   */
  or(other: AuthRuleBuilder | AuthorizationRule): AuthRuleBuilder {
    const otherConfig = other instanceof AuthRuleBuilder ? other.build() : other;

    return new AuthRuleBuilder({
      type: 'custom',
      or: [this.config, otherConfig],
    });
  }

  /**
   * Negate the rule.
   */
  not(): AuthRuleBuilder {
    return new AuthRuleBuilder({
      type: 'custom',
      not: this.config,
    });
  }

  /**
   * Build the authorization rule configuration.
   */
  build(): AuthorizationRuleConfig {
    return this.config;
  }
}

/**
 * Authorization rule helpers (exported as `allow` for schema definitions).
 */
export const allow = {
  /**
   * Allow public access (no authentication required).
   */
  public: () => AuthRuleBuilder.public().build(),

  /**
   * Require authentication (any authenticated user).
   */
  authenticated: () => AuthRuleBuilder.authenticated().build(),

  /**
   * Owner-based authorization (user owns the record).
   *
   * @param ownerField - Field name containing the owner ID
   */
  owner: (ownerField: string) => AuthRuleBuilder.owner(ownerField).build(),

  /**
   * Role-based authorization (user has specific role).
   *
   * @param role - Required role
   */
  role: (role: string) => AuthRuleBuilder.role(role).build(),

  /**
   * Role-based authorization (user has any of the specified roles).
   *
   * @param roles - Array of acceptable roles
   */
  roles: (roles: string[]) => AuthRuleBuilder.roles(roles).build(),

  /**
   * Group-based authorization (user is member of specific group).
   *
   * @param group - Azure AD group ID
   */
  group: (group: string) => AuthRuleBuilder.group(group).build(),

  /**
   * Group-based authorization (user is member of any specified group).
   *
   * @param groups - Array of Azure AD group IDs
   */
  groups: (groups: string[]) => AuthRuleBuilder.groups(groups).build(),

  /**
   * Custom authorization logic.
   *
   * @param fn - Custom authorization function
   */
  custom: (fn: AuthorizationRuleFunction) => AuthRuleBuilder.custom(fn).build(),

  /**
   * Conditional authorization based on a condition.
   *
   * @param fn - Condition function
   */
  if: (fn: AuthorizationRuleFunction) => AuthRuleBuilder.if(fn).build(),
};

/**
 * Evaluate an authorization rule.
 *
 * @param rule - Authorization rule to evaluate
 * @param context - Authorization context
 * @param record - Record being accessed (optional)
 * @returns Authorization result
 */
export async function evaluateAuthorizationRule(
  rule: AuthorizationRule,
  context: AuthorizationContext,
  record?: any
): Promise<boolean> {
  // If rule is a function, evaluate it directly
  if (typeof rule === 'function') {
    return await rule(context, record);
  }

  // Otherwise, evaluate based on rule config
  const config = rule as AuthorizationRuleConfig;

  switch (config.type) {
    case 'public':
      return true;

    case 'authenticated':
      return !!context.user;

    case 'owner':
      if (!context.user || !record || !config.ownerField) {
        return false;
      }
      return record[config.ownerField] === context.user.id;

    case 'role':
      if (!context.user?.roles) {
        return false;
      }
      if (config.role) {
        return context.user.roles.includes(config.role);
      }
      if (config.roles) {
        return config.roles.some(role => context.user!.roles!.includes(role));
      }
      return false;

    case 'group':
      if (!context.user?.groups) {
        return false;
      }
      if (config.group) {
        return context.user.groups.includes(config.group);
      }
      if (config.groups) {
        return config.groups.some(group => context.user!.groups!.includes(group));
      }
      return false;

    case 'custom':
      // Handle AND logic
      if (config.and) {
        const results = await Promise.all(
          config.and.map(r => evaluateAuthorizationRule(r, context, record))
        );
        return results.every(r => r);
      }

      // Handle OR logic
      if (config.or) {
        const results = await Promise.all(
          config.or.map(r => evaluateAuthorizationRule(r, context, record))
        );
        return results.some(r => r);
      }

      // Handle NOT logic
      if (config.not) {
        const result = await evaluateAuthorizationRule(config.not, context, record);
        return !result;
      }

      // Handle custom function
      if (config.custom) {
        return await config.custom(context, record);
      }

      return false;

    default:
      return false;
  }
}

/**
 * Convert schema authorization rule to Function middleware authorization config.
 *
 * @param rule - Schema authorization rule
 * @returns Function middleware authorization config
 */
export function toFunctionAuthConfig(rule: AuthorizationRule): any {
  // This will be implemented to bridge schema auth rules with Function middleware
  // For now, return the rule as-is
  return {
    rule: async (context: any, record?: any) => {
      return evaluateAuthorizationRule(rule, context, record);
    },
  };
}

/**
 * Validate authorization rules in a schema.
 *
 * @param rules - Authorization rules object
 * @returns Validation result
 */
export function validateAuthorizationRules(
  rules: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const validOperations = ['create', 'read', 'update', 'delete', 'list', 'fields'];

  for (const [operation, rule] of Object.entries(rules)) {
    if (!validOperations.includes(operation)) {
      errors.push(`Invalid authorization operation: '${operation}'`);
      continue;
    }

    if (operation === 'fields') {
      // Validate field-level rules
      if (typeof rule !== 'object' || Array.isArray(rule)) {
        errors.push(`Field-level authorization must be an object`);
      }
    } else {
      // Validate operation-level rules
      if (typeof rule !== 'function' && typeof rule !== 'object') {
        errors.push(`Authorization rule for '${operation}' must be a function or config object`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
