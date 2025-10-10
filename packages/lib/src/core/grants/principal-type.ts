/**
 * Azure RBAC grant system - PrincipalType enumeration.
 *
 * @remarks
 * This module defines the types of Azure AD principals that can be assigned
 * roles through the Azure RBAC system.
 *
 * @packageDocumentation
 */

/**
 * Azure principal types for role assignments.
 *
 * @remarks
 * These values map directly to Azure's role assignment `principalType` field.
 * The correct principal type ensures proper identity resolution and access control
 * enforcement in Azure Resource Manager.
 *
 * **Azure ARM Mapping**:
 * ```json
 * {
 *   "type": "Microsoft.Authorization/roleAssignments",
 *   "properties": {
 *     "principalId": "...",
 *     "principalType": "ServicePrincipal",
 *     "roleDefinitionId": "..."
 *   }
 * }
 * ```
 *
 * **Important Notes**:
 * - `ManagedIdentity` and `ServicePrincipal` both map to "ServicePrincipal" in ARM
 * - Use `ManagedIdentity` for clarity when working with managed identities
 * - Use `ServicePrincipal` for application registrations and explicit service principals
 * - `ForeignGroup` is used for groups from external Azure AD tenants
 *
 * @public
 *
 * @example
 * Using with managed identity:
 * ```typescript
 * const vm = new VirtualMachine(stack, 'VM', {
 *   identity: { type: ManagedIdentityType.SystemAssigned }
 * });
 *
 * // VM implements IGrantable with principalType = PrincipalType.ManagedIdentity
 * storageAccount.grantRead(vm);
 * ```
 *
 * @example
 * Using with explicit service principal:
 * ```typescript
 * const servicePrincipal: IGrantable = {
 *   principalId: '12345678-1234-1234-1234-123456789abc',
 *   principalType: PrincipalType.ServicePrincipal
 * };
 *
 * keyVault.grantSecretRead(servicePrincipal);
 * ```
 *
 * @example
 * Using with Azure AD group:
 * ```typescript
 * const devGroup: IGrantable = {
 *   principalId: 'abcdef01-2345-6789-abcd-ef0123456789',
 *   principalType: PrincipalType.Group
 * };
 *
 * subscription.grantBuiltInRole(devGroup, 'Reader');
 * ```
 */
export enum PrincipalType {
  /**
   * Azure AD user principal.
   *
   * @remarks
   * Use for individual user accounts in Azure Active Directory.
   * Requires the user's object ID from Azure AD.
   *
   * **Common Use Cases**:
   * - Granting personal access to resources
   * - Development environment access
   * - Break-glass administrative access
   *
   * **Not Recommended For**:
   * - Production service-to-service authentication
   * - Automated workloads
   */
  User = 'User',

  /**
   * Azure AD group principal.
   *
   * @remarks
   * Use for Azure AD security groups (both cloud-only and synced from on-premises).
   * Recommended for managing access to multiple users with the same permissions.
   *
   * **Common Use Cases**:
   * - Team-based access control
   * - Department-wide permissions
   * - Role-based access patterns
   *
   * **Benefits**:
   * - Centralized access management
   * - Reduced role assignment overhead
   * - Simplified auditing
   */
  Group = 'Group',

  /**
   * Service principal (includes application registrations).
   *
   * @remarks
   * Use for Azure AD application registrations and explicit service principals.
   * This is the ARM-native value used for both service principals and managed identities.
   *
   * **Common Use Cases**:
   * - Application service principals
   * - Multi-tenant applications
   * - CI/CD pipeline identities
   *
   * **Note**: For managed identities, prefer using `PrincipalType.ManagedIdentity`
   * for better code clarity, even though both map to "ServicePrincipal" in ARM.
   */
  ServicePrincipal = 'ServicePrincipal',

  /**
   * Managed identity (alias for ServicePrincipal).
   *
   * @remarks
   * Semantic alias for managed identities to improve code readability.
   * Maps to "ServicePrincipal" in Azure ARM templates.
   *
   * **Types of Managed Identities**:
   * - System-assigned: Lifecycle tied to resource
   * - User-assigned: Independent lifecycle, shared across resources
   *
   * **Common Use Cases**:
   * - Azure VM accessing Key Vault
   * - App Service connecting to Storage
   * - Function App accessing SQL Database
   *
   * **Benefits**:
   * - No credential management required
   * - Automatic credential rotation
   * - Azure-managed lifecycle
   *
   * @see {@link https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview}
   */
  ManagedIdentity = 'ServicePrincipal',

  /**
   * Group from external Azure AD tenant.
   *
   * @remarks
   * Use for groups from a different Azure AD tenant (cross-tenant scenarios).
   * Requires specifying the `tenantId` in the role assignment.
   *
   * **Common Use Cases**:
   * - Partner organization access
   * - Multi-tenant SaaS scenarios
   * - Federated identity scenarios
   *
   * **Requirements**:
   * - Guest access must be configured
   * - Appropriate trust relationship between tenants
   * - `tenantId` must be specified in IGrantable
   */
  ForeignGroup = 'ForeignGroup',

  /**
   * Azure AD device principal.
   *
   * @remarks
   * Use for Azure AD-joined or registered devices.
   * Less commonly used in automated infrastructure scenarios.
   *
   * **Common Use Cases**:
   * - Device-based conditional access
   * - Intune-managed device policies
   * - Zero Trust device compliance
   *
   * **Requirements**:
   * - Device must be Azure AD-joined or registered
   * - Device object ID from Azure AD
   */
  Device = 'Device',
}
