/**
 * Helper function to grant resource-level RBAC roles.
 *
 * @remarks
 * Simplifies granting Azure RBAC roles at the resource scope.
 *
 * @packageDocumentation
 */

import { Construct } from 'constructs';
import { RoleAssignment } from './role-assignment';
import type { PrincipalType } from '../core/grants/principal-type';

/**
 * Properties for granting a resource role.
 */
export interface GrantResourceRoleProps {
  /**
   * The principal to grant the role to.
   * Can be a user, group, service principal, or managed identity.
   */
  readonly principal: any;

  /**
   * The role definition ID.
   * Format: /providers/Microsoft.Authorization/roleDefinitions/{guid}
   */
  readonly roleDefinitionId: string;

  /**
   * The scope at which to assign the role (resource ID).
   */
  readonly scope: string;

  /**
   * Optional principal type override.
   */
  readonly principalType?: PrincipalType;

  /**
   * Optional condition for the role assignment.
   */
  readonly condition?: string;

  /**
   * Optional condition version.
   */
  readonly conditionVersion?: '2.0';
}

/**
 * Grant a role to a principal at resource scope.
 *
 * @param scope - CDK construct scope
 * @param id - Construct ID for the role assignment
 * @param props - Grant properties
 * @returns The created RoleAssignment
 *
 * @example
 * ```typescript
 * // Grant Storage Blob Data Reader role
 * grantResourceRole(this, 'BlobReaderGrant', {
 *   principal: managedIdentity,
 *   roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/2a2b9908-6ea1-4ae2-8e65-a410df84e7d1',
 *   scope: storageAccount.resourceId
 * });
 * ```
 */
export function grantResourceRole(
  scope: Construct,
  id: string,
  props: GrantResourceRoleProps
): RoleAssignment {
  // Extract principal ID (handle both managed identities and other principals)
  const principalId = props.principal.principalId ||
                      props.principal.identityId ||
                      props.principal.objectId ||
                      props.principal.id;

  if (!principalId) {
    throw new Error(
      `Unable to determine principal ID from principal. ` +
      `Expected principal to have one of: principalId, identityId, objectId, or id properties.`
    );
  }

  const roleProps: any = {
    principalId,
    roleDefinitionId: props.roleDefinitionId,
    scope: props.scope,
  };

  if (props.principalType) {
    roleProps.principalType = props.principalType;
  }

  if (props.condition) {
    roleProps.condition = props.condition;
    roleProps.conditionVersion = props.conditionVersion;
  }

  return new RoleAssignment(scope, id, roleProps);
}
