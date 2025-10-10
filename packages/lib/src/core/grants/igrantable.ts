/**
 * Azure RBAC grant system - IGrantable interface.
 *
 * @remarks
 * This module defines the core interface for Azure identities that can receive
 * role-based access control (RBAC) permissions through the grant pattern.
 *
 * @packageDocumentation
 */

import { PrincipalType } from './principal-type';

/**
 * Represents an Azure identity that can be granted permissions.
 *
 * @remarks
 * Implemented by resources with managed identities and identity constructs.
 * The grant system uses this interface to extract principal information
 * for role assignments.
 *
 * **Implementation Guidelines**:
 * - Resources with managed identities should implement this interface
 * - The principalId must be the object ID from Azure AD
 * - For managed identities, principalId is populated after deployment
 * - Use string for static/imported identities or ARM expressions for dynamic identities
 *
 * @public
 *
 * @example
 * Basic implementation:
 * ```typescript
 * export class VirtualMachine extends Resource implements IGrantable {
 *   public readonly principalId: string;
 *   public readonly principalType = PrincipalType.ManagedIdentity;
 *
 *   constructor(scope: Construct, id: string, props: VirtualMachineProps) {
 *     super(scope, id);
 *     // Enable managed identity and extract principal ID
 *     this.principalId = this.getManagedIdentityPrincipalId();
 *   }
 * }
 * ```
 *
 * @example
 * Cross-tenant scenario:
 * ```typescript
 * export class ExternalIdentity implements IGrantable {
 *   constructor(
 *     public readonly principalId: string,
 *     public readonly principalType: PrincipalType,
 *     public readonly tenantId: string
 *   ) {}
 * }
 * ```
 */
export interface IGrantable {
  /**
   * The principal ID (object ID) of the identity.
   *
   * @remarks
   * This is the unique identifier for the identity in Azure AD.
   * - For managed identities, this is populated after the resource is deployed
   * - For user-assigned identities, this is the identity's principal ID
   * - For service principals, this is the object ID (not the application ID)
   * - For users and groups, this is their Azure AD object ID
   *
   * When using dynamic references (ARM expressions), the value will be resolved
   * during ARM template deployment.
   */
  readonly principalId: string;

  /**
   * Type of principal for role assignment.
   *
   * @remarks
   * Determines how Azure interprets the principal ID during role assignment.
   * - Use `PrincipalType.User` for Azure AD users
   * - Use `PrincipalType.Group` for Azure AD groups
   * - Use `PrincipalType.ServicePrincipal` for service principals
   * - Use `PrincipalType.ManagedIdentity` for managed identities (alias for ServicePrincipal)
   * - Use `PrincipalType.ForeignGroup` for groups from external tenants
   * - Use `PrincipalType.Device` for Azure AD devices
   *
   * @see {@link PrincipalType}
   */
  readonly principalType: PrincipalType;

  /**
   * Optional tenant ID for cross-tenant scenarios.
   *
   * @remarks
   * Required when granting permissions to identities from a different Azure AD tenant.
   * Defaults to the current tenant if not specified.
   *
   * **Cross-Tenant Use Cases**:
   * - Guest users from partner organizations
   * - Service principals from external tenants
   * - Groups from federated directories
   *
   * @defaultValue Current deployment tenant
   */
  readonly tenantId?: string;
}
