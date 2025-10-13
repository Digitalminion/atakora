/**
 * Enums for Azure Authorization (Microsoft.Authorization).
 *
 * @remarks
 * Curated enums extracted from Microsoft.Authorization Azure schema.
 *
 * **Resource Types**:
 * - Microsoft.Authorization/roleAssignments
 * - Microsoft.Authorization/policyAssignments
 * - Microsoft.Authorization/locks
 *
 * **API Version**: 2022-04-01
 *
 * @packageDocumentation
 */

// Role Assignment enums

/**
 * Scope for subscription-level role assignments.
 */
export enum RoleAssignmentScope {
  /**
   * Assign role at subscription level (access to all resources in subscription).
   */
  SUBSCRIPTION = 'subscription',

  /**
   * Assign role at resource group level (access to all resources in specific resource group).
   */
  RESOURCE_GROUP = 'resourceGroup',
}

// Policy Assignment enums

/**
 * Policy enforcement mode.
 */
export enum PolicyEnforcementMode {
  /**
   * Policy is actively enforced (non-compliant operations blocked).
   */
  DEFAULT = 'Default',

  /**
   * Policy is not enforced, but compliance is still evaluated.
   */
  DO_NOT_ENFORCE = 'DoNotEnforce',
}

/**
 * Policy assignment identity type.
 */
export enum PolicyIdentityType {
  /**
   * System-assigned managed identity.
   */
  SYSTEM_ASSIGNED = 'SystemAssigned',

  /**
   * User-assigned managed identity.
   */
  USER_ASSIGNED = 'UserAssigned',

  /**
   * No identity.
   */
  NONE = 'None',
}
