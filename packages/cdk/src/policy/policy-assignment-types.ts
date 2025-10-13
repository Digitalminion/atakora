/**
 * Azure Policy Assignment types.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * Policy enforcement mode.
 */
export const PolicyEnforcementMode = schema.authorization.PolicyEnforcementMode;
export type PolicyEnforcementMode = typeof PolicyEnforcementMode[keyof typeof PolicyEnforcementMode];

/**
 * Policy assignment identity type.
 */
export const PolicyIdentityType = schema.authorization.PolicyIdentityType;
export type PolicyIdentityType = typeof PolicyIdentityType[keyof typeof PolicyIdentityType];

/**
 * Properties for Policy Assignments.
 *
 * @public
 */
export interface PolicyAssignmentProps {
  /**
   * Policy definition ID to assign.
   *
   * @remarks
   * Can be a built-in Azure policy or a custom policy definition.
   *
   * **Built-in Policy Format**:
   * `/providers/Microsoft.Authorization/policyDefinitions/{guid}`
   *
   * **Custom Policy Format**:
   * `/subscriptions/{sub}/providers/Microsoft.Authorization/policyDefinitions/{name}`
   *
   * @example
   * ```typescript
   * // Built-in policy
   * policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/404c3081-a854-4457-ae30-26a93ef643f9'
   *
   * // Using WellKnownPolicyIds helper
   * policyDefinitionId: WellKnownPolicyIds.STORAGE_HTTPS_ONLY
   * ```
   */
  readonly policyDefinitionId: string;

  /**
   * Display name for the policy assignment.
   *
   * @remarks
   * Maximum 128 characters. Shown in Azure Portal.
   *
   * @example
   * ```typescript
   * displayName: 'Require HTTPS for storage accounts'
   * ```
   */
  readonly displayName: string;

  /**
   * Optional description explaining the purpose of this policy assignment.
   *
   * @remarks
   * Maximum 512 characters.
   * **Best Practice**: Always include a description for audit and governance.
   *
   * @example
   * ```typescript
   * description: 'Ensures all storage accounts use HTTPS to meet security compliance requirements'
   * ```
   */
  readonly description?: string;

  /**
   * Optional metadata for the policy assignment.
   *
   * @remarks
   * Commonly used fields:
   * - `category`: Grouping for organization (e.g., "Security", "Cost Management")
   * - `version`: Policy version tracking
   * - `assignedBy`: Who created the assignment
   *
   * @example
   * ```typescript
   * metadata: {
   *   category: 'Security',
   *   assignedBy: 'Platform Team',
   *   version: '1.0'
   * }
   * ```
   */
  readonly metadata?: Record<string, any>;

  /**
   * Parameters to pass to the policy definition.
   *
   * @remarks
   * Must match the parameters defined in the policy definition.
   * Each parameter value is wrapped in a `{ value: ... }` object.
   *
   * **Important**: Check the policy definition for required vs optional parameters.
   *
   * @example
   * ```typescript
   * // Policy requiring list of allowed locations
   * parameters: {
   *   listOfAllowedLocations: {
   *     value: ['eastus', 'eastus2', 'westus2']
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Policy with tag requirement
   * parameters: {
   *   tagName: { value: 'costCenter' },
   *   tagValue: { value: '12345' }
   * }
   * ```
   */
  readonly parameters?: Record<string, { value: any }>;

  /**
   * Enforcement mode for the policy.
   *
   * @remarks
   * - `Default`: Policy is enforced (non-compliant operations blocked)
   * - `DoNotEnforce`: Policy is evaluated but not enforced (audit only)
   *
   * **Use DoNotEnforce for**:
   * - Testing new policies before enabling enforcement
   * - Gradual rollout strategies
   * - Monitoring compliance without blocking operations
   *
   * @defaultValue PolicyEnforcementMode.DEFAULT
   *
   * @example
   * ```typescript
   * // Test policy without blocking
   * enforcementMode: PolicyEnforcementMode.DO_NOT_ENFORCE
   * ```
   */
  readonly enforcementMode?: PolicyEnforcementMode;

  /**
   * Managed identity for policies that deploy or modify resources.
   *
   * @remarks
   * **Required for**:
   * - `DeployIfNotExists` effect policies
   * - `Modify` effect policies
   *
   * **Not needed for**:
   * - `Audit` effect policies
   * - `Deny` effect policies
   *
   * @example
   * ```typescript
   * identity: {
   *   type: PolicyIdentityType.SYSTEM_ASSIGNED
   * }
   * ```
   */
  readonly identity?: {
    type: PolicyIdentityType;
    userAssignedIdentities?: Record<string, any>;
  };

  /**
   * Resource selector to scope the policy to specific resources.
   *
   * @remarks
   * Allows fine-grained targeting of resources within the assignment scope.
   *
   * @example
   * ```typescript
   * resourceSelectors: [{
   *   name: 'OnlyProductionVMs',
   *   selectors: [{
   *     kind: 'resourceLocation',
   *     in: ['eastus', 'eastus2']
   *   }, {
   *     kind: 'resourceType',
   *     in: ['Microsoft.Compute/virtualMachines']
   *   }]
   * }]
   * ```
   */
  readonly resourceSelectors?: Array<{
    name: string;
    selectors: Array<{
      kind: string;
      in?: string[];
      notIn?: string[];
    }>;
  }>;

  /**
   * Array of resource types or locations to exclude from the policy.
   *
   * @remarks
   * **Not Scopes** are specific resources or resource groups to exclude.
   *
   * @example
   * ```typescript
   * notScopes: [
   *   '/subscriptions/{sub}/resourceGroups/legacy-rg',
   *   '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/special-storage'
   * ]
   * ```
   */
  readonly notScopes?: string[];

  /**
   * Policy assignment overrides.
   *
   * @remarks
   * Allows overriding specific selectors or parameters for subsets of resources.
   * Advanced feature for complex policy scenarios.
   *
   * @example
   * ```typescript
   * overrides: [{
   *   kind: 'policyEffect',
   *   value: 'Audit',
   *   selectors: [{
   *     kind: 'resourceLocation',
   *     in: ['westus']
   *   }]
   * }]
   * ```
   */
  readonly overrides?: Array<{
    kind: string;
    value: string;
    selectors?: Array<{
      kind: string;
      in?: string[];
      notIn?: string[];
    }>;
  }>;
}
