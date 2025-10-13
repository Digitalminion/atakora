/**
 * Enums for Azure Managed Identity (Microsoft.ManagedIdentity).
 *
 * @remarks
 * Curated enums for Azure Managed Identity resources.
 *
 * **Resource Types**:
 * - Microsoft.ManagedIdentity/userAssignedIdentities
 * - Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials
 *
 * **API Version**: 2024-11-30
 *
 * @packageDocumentation
 */

// User-Assigned Identity enums

/**
 * Isolation scope for user-assigned managed identity.
 *
 * @remarks
 * Configures regional restrictions on identity assignment.
 */
export enum IsolationScope {
  /**
   * No isolation restrictions.
   */
  NONE = 'None',

  /**
   * Regional isolation - identity can only be assigned within the same region.
   */
  REGIONAL = 'Regional',
}
