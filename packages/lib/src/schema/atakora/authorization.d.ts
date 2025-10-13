/**
 * Authorization rule builder for schema definitions.
 *
 * @remarks
 * Provides declarative authorization rules that integrate with
 * the authorization middleware in Azure Functions.
 *
 * @packageDocumentation
 */
import type { AuthorizationRule, AuthorizationRuleConfig, AuthorizationRuleFunction, AuthorizationContext } from './schema-types';
/**
 * Authorization rule builder with composable methods.
 */
export declare class AuthRuleBuilder {
    private config;
    private constructor();
    /**
     * Allow public access (no authentication required).
     */
    static public(): AuthRuleBuilder;
    /**
     * Require authentication (any authenticated user).
     */
    static authenticated(): AuthRuleBuilder;
    /**
     * Owner-based authorization (user owns the record).
     *
     * @param ownerField - Field name containing the owner ID
     */
    static owner(ownerField: string): AuthRuleBuilder;
    /**
     * Role-based authorization (user has specific role).
     *
     * @param role - Required role
     */
    static role(role: string): AuthRuleBuilder;
    /**
     * Role-based authorization (user has any of the specified roles).
     *
     * @param roles - Array of acceptable roles
     */
    static roles(roles: string[]): AuthRuleBuilder;
    /**
     * Group-based authorization (user is member of specific group).
     *
     * @param group - Azure AD group ID
     */
    static group(group: string): AuthRuleBuilder;
    /**
     * Group-based authorization (user is member of any specified group).
     *
     * @param groups - Array of Azure AD group IDs
     */
    static groups(groups: string[]): AuthRuleBuilder;
    /**
     * Custom authorization logic.
     *
     * @param fn - Custom authorization function
     */
    static custom(fn: AuthorizationRuleFunction): AuthRuleBuilder;
    /**
     * Conditional authorization based on a condition.
     *
     * @param fn - Condition function
     */
    static if(fn: AuthorizationRuleFunction): AuthRuleBuilder;
    /**
     * Combine with another rule using AND logic.
     *
     * @param other - Other authorization rule
     */
    and(other: AuthRuleBuilder | AuthorizationRule): AuthRuleBuilder;
    /**
     * Combine with another rule using OR logic.
     *
     * @param other - Other authorization rule
     */
    or(other: AuthRuleBuilder | AuthorizationRule): AuthRuleBuilder;
    /**
     * Negate the rule.
     */
    not(): AuthRuleBuilder;
    /**
     * Build the authorization rule configuration.
     */
    build(): AuthorizationRuleConfig;
}
/**
 * Authorization rule helpers (exported as `allow` for schema definitions).
 */
export declare const allow: {
    /**
     * Allow public access (no authentication required).
     */
    public: () => AuthorizationRuleConfig;
    /**
     * Require authentication (any authenticated user).
     */
    authenticated: () => AuthorizationRuleConfig;
    /**
     * Owner-based authorization (user owns the record).
     *
     * @param ownerField - Field name containing the owner ID
     */
    owner: (ownerField: string) => AuthorizationRuleConfig;
    /**
     * Role-based authorization (user has specific role).
     *
     * @param role - Required role
     */
    role: (role: string) => AuthorizationRuleConfig;
    /**
     * Role-based authorization (user has any of the specified roles).
     *
     * @param roles - Array of acceptable roles
     */
    roles: (roles: string[]) => AuthorizationRuleConfig;
    /**
     * Group-based authorization (user is member of specific group).
     *
     * @param group - Azure AD group ID
     */
    group: (group: string) => AuthorizationRuleConfig;
    /**
     * Group-based authorization (user is member of any specified group).
     *
     * @param groups - Array of Azure AD group IDs
     */
    groups: (groups: string[]) => AuthorizationRuleConfig;
    /**
     * Custom authorization logic.
     *
     * @param fn - Custom authorization function
     */
    custom: (fn: AuthorizationRuleFunction) => AuthorizationRuleConfig;
    /**
     * Conditional authorization based on a condition.
     *
     * @param fn - Condition function
     */
    if: (fn: AuthorizationRuleFunction) => AuthorizationRuleConfig;
};
/**
 * Evaluate an authorization rule.
 *
 * @param rule - Authorization rule to evaluate
 * @param context - Authorization context
 * @param record - Record being accessed (optional)
 * @returns Authorization result
 */
export declare function evaluateAuthorizationRule(rule: AuthorizationRule, context: AuthorizationContext, record?: any): Promise<boolean>;
/**
 * Convert schema authorization rule to Function middleware authorization config.
 *
 * @param rule - Schema authorization rule
 * @returns Function middleware authorization config
 */
export declare function toFunctionAuthConfig(rule: AuthorizationRule): any;
/**
 * Validate authorization rules in a schema.
 *
 * @param rules - Authorization rules object
 * @returns Validation result
 */
export declare function validateAuthorizationRules(rules: any): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=authorization.d.ts.map