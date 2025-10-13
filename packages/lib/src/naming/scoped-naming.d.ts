import { DeploymentScope } from '../core/azure/scopes';
import type { NamingConventions, NameValidationResult } from './types';
/**
 * Parameters for scope-aware resource naming.
 *
 * @remarks
 * Different scopes require different naming parameters:
 * - **Tenant**: Only resourceType and purpose
 * - **ManagementGroup**: resourceType, organization, purpose
 * - **Subscription**: resourceType, organization, project, environment, geography, instance
 * - **ResourceGroup**: Full naming convention (same as Subscription)
 */
export interface ScopedResourceNameParams {
    /**
     * Deployment scope for this resource.
     */
    readonly scope: DeploymentScope;
    /**
     * Resource type identifier (e.g., 'rg', 'storage', 'vnet').
     */
    readonly resourceType: string;
    /**
     * Optional purpose identifier.
     */
    readonly purpose?: string;
    /**
     * Organization name.
     * Required for ManagementGroup, Subscription, and ResourceGroup scopes.
     */
    readonly organization?: string;
    /**
     * Project name.
     * Required for Subscription and ResourceGroup scopes.
     */
    readonly project?: string;
    /**
     * Environment identifier.
     * Required for Subscription and ResourceGroup scopes.
     */
    readonly environment?: string;
    /**
     * Geography/region identifier.
     * Required for Subscription and ResourceGroup scopes.
     */
    readonly geography?: string;
    /**
     * Instance identifier.
     * Required for Subscription and ResourceGroup scopes.
     */
    readonly instance?: string;
    /**
     * Additional suffix to append.
     */
    readonly additionalSuffix?: string;
}
/**
 * Generate resource name based on deployment scope.
 *
 * @param params - Scoped naming parameters
 * @param conventions - Optional naming conventions (uses defaults if not provided)
 * @returns Generated resource name appropriate for the scope
 *
 * @remarks
 * Different scopes have different naming patterns:
 * - **Tenant**: `{prefix}-{purpose}`
 * - **ManagementGroup**: `{prefix}-{org}-{purpose}`
 * - **Subscription**: `{prefix}-{purpose}-{org}-{project}-{env}-{geo}-{instance}`
 * - **ResourceGroup**: Same as Subscription
 *
 * @example
 * Subscription scope:
 * ```typescript
 * const name = generateScopedName({
 *   scope: DeploymentScope.Subscription,
 *   resourceType: 'rg',
 *   organization: 'digital-minion',
 *   project: 'authr',
 *   purpose: 'data',
 *   environment: 'nonprod',
 *   geography: 'eastus',
 *   instance: '01'
 * });
 * // Result: "rg-data-digital-minion-authr-nonprod-eastus-01"
 * ```
 *
 * @example
 * Management Group scope:
 * ```typescript
 * const name = generateScopedName({
 *   scope: DeploymentScope.ManagementGroup,
 *   resourceType: 'mg',
 *   organization: 'digital-minion',
 *   purpose: 'platform'
 * });
 * // Result: "mg-digital-minion-platform"
 * ```
 */
export declare function generateScopedName(params: ScopedResourceNameParams, conventions?: NamingConventions): string;
/**
 * Validate that required naming parameters are present for scope.
 *
 * @param params - Scoped naming parameters
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateScopedParams({
 *   scope: DeploymentScope.Subscription,
 *   resourceType: 'rg',
 *   organization: 'digital-minion',
 *   project: 'authr'
 *   // Missing: environment, geography, instance
 * });
 * // result.isValid === false
 * // result.errors === ['Missing required parameter: environment', ...]
 * ```
 */
export declare function validateScopedParams(params: ScopedResourceNameParams): NameValidationResult;
//# sourceMappingURL=scoped-naming.d.ts.map