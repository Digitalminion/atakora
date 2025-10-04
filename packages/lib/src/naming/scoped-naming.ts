import { DeploymentScope } from '../core/azure/scopes';
import type { NamingConventions, ValidationResult } from './types';
import { DEFAULT_CONVENTIONS, getSpecialCaseRules } from './conventions';

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
 *   organization: 'digital-products',
 *   project: 'colorai',
 *   purpose: 'data',
 *   environment: 'nonprod',
 *   geography: 'eastus',
 *   instance: '01'
 * });
 * // Result: "rg-data-digital-products-colorai-nonprod-eastus-01"
 * ```
 *
 * @example
 * Management Group scope:
 * ```typescript
 * const name = generateScopedName({
 *   scope: DeploymentScope.ManagementGroup,
 *   resourceType: 'mg',
 *   organization: 'digital-products',
 *   purpose: 'platform'
 * });
 * // Result: "mg-digital-products-platform"
 * ```
 */
export function generateScopedName(
  params: ScopedResourceNameParams,
  conventions?: NamingConventions
): string {
  const conv = conventions ?? DEFAULT_CONVENTIONS;

  // Validate parameters for scope
  const validation = validateScopedParams(params);
  if (!validation.isValid) {
    throw new Error(
      `Invalid scoped naming parameters: ${validation.errors.join(', ')}`
    );
  }

  // Get resource pattern
  const pattern = conv.patterns[params.resourceType] ?? params.resourceType;

  // Import DeploymentScope enum to use in switch

  // Build name based on scope
  const components: string[] = [pattern];

  switch (params.scope) {
    case DeploymentScope.Tenant:
      // Tenant: {prefix}-{purpose}
      if (params.purpose) {
        components.push(params.purpose);
      }
      break;

    case DeploymentScope.ManagementGroup:
      // ManagementGroup: {prefix}-{org}-{purpose}
      if (params.organization) {
        components.push(params.organization);
      }
      if (params.purpose) {
        components.push(params.purpose);
      }
      break;

    case DeploymentScope.Subscription:
    case DeploymentScope.ResourceGroup:
      // Subscription/ResourceGroup: Full naming convention
      // {prefix}-{purpose}-{org}-{project}-{env}-{geo}-{instance}
      if (params.purpose) components.push(params.purpose);
      if (params.organization) components.push(params.organization);
      if (params.project) components.push(params.project);
      if (params.environment) components.push(params.environment);
      if (params.geography) components.push(params.geography);
      if (params.instance) components.push(params.instance);
      break;
  }

  // Add additional suffix if provided
  if (params.additionalSuffix) {
    components.push(params.additionalSuffix);
  }

  // Join with separator
  let name = components.join(conv.separator);

  // Apply resource-specific transformations
  const specialRules = getSpecialCaseRules(params.resourceType);

  if (specialRules) {
    if (specialRules.removeHyphens) {
      name = name.replace(/-/g, '');
    }
    if (specialRules.forceLowercase) {
      name = name.toLowerCase();
    }
  }

  // Apply length limits
  const maxLength =
    conv.maxLengths[params.resourceType] ?? conv.maxLength;
  if (name.length > maxLength) {
    name = name.substring(0, maxLength);
  }

  return name;
}

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
 *   organization: 'digital-products',
 *   project: 'colorai'
 *   // Missing: environment, geography, instance
 * });
 * // result.isValid === false
 * // result.errors === ['Missing required parameter: environment', ...]
 * ```
 */
export function validateScopedParams(
  params: ScopedResourceNameParams
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Import DeploymentScope enum

  // Check resourceType
  if (!params.resourceType || params.resourceType.trim().length === 0) {
    errors.push('resourceType is required');
  }

  // Scope-specific validation
  switch (params.scope) {
    case DeploymentScope.Tenant:
      // Tenant: No additional required params
      break;

    case DeploymentScope.ManagementGroup:
      // ManagementGroup: Requires organization
      if (!params.organization) {
        errors.push('organization is required for ManagementGroup scope');
      }
      break;

    case DeploymentScope.Subscription:
    case DeploymentScope.ResourceGroup:
      // Subscription/ResourceGroup: Requires full naming context
      const requiredParams = [
        'organization',
        'project',
        'environment',
        'geography',
        'instance',
      ] as const;

      for (const param of requiredParams) {
        if (!params[param] || params[param]?.trim().length === 0) {
          errors.push(
            `${param} is required for ${params.scope === DeploymentScope.Subscription ? 'Subscription' : 'ResourceGroup'} scope`
          );
        }
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  };
}
