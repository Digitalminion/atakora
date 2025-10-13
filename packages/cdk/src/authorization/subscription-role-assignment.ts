/**
 * Subscription-level role assignment - L2 construct.
 *
 * @packageDocumentation
 */

import { Construct, SubscriptionStack } from '@atakora/lib';
import { SubscriptionRoleAssignmentArm } from './subscription-role-assignment-arm';
import { SubscriptionRoleAssignmentProps, RoleAssignmentScope } from './subscription-role-assignment-types';

/**
 * L2 construct for subscription-level role assignments.
 *
 * @remarks
 * Grants Azure AD users, groups, or service principals access to subscriptions or resource groups.
 *
 * **Use Cases**:
 * - Grant dev team Contributor access to development resource group
 * - Grant security team Reader access to entire subscription
 * - Grant finance team Cost Management Reader for budget visibility
 * - Grant platform team Owner access for full subscription management
 *
 * **Key Differences from Resource-Scoped Role Assignments**:
 * - **Scope**: Subscription or resource group (not individual resources)
 * - **Principals**: Azure AD users/groups (not managed identities)
 * - **Purpose**: Human team access (not application-to-resource access)
 *
 * @public
 *
 * @example
 * Grant dev team contributor access to subscription:
 * ```typescript
 * import { SubscriptionRoleAssignment } from '@atakora/cdk';
 * import { WellKnownRoleIds, PrincipalType } from '@atakora/lib';
 *
 * const devTeamAccess = new SubscriptionRoleAssignment(subscriptionStack, 'DevTeamContributor', {
 *   principalId: '12345678-1234-1234-1234-123456789abc', // Dev Team Azure AD Group ID
 *   principalType: PrincipalType.Group,
 *   roleDefinitionId: WellKnownRoleIds.CONTRIBUTOR,
 *   description: 'Dev team can manage all resources in non-prod subscription'
 * });
 * ```
 *
 * @example
 * Grant security team reader access to resource group:
 * ```typescript
 * const securityReaderAccess = new SubscriptionRoleAssignment(resourceGroup, 'SecurityReader', {
 *   principalId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Security Team Group ID
 *   principalType: PrincipalType.Group,
 *   roleDefinitionId: WellKnownRoleIds.READER,
 *   description: 'Security team read access to production resource group for auditing'
 * });
 * ```
 *
 * @example
 * Grant finance team cost management reader:
 * ```typescript
 * const financeAccess = new SubscriptionRoleAssignment(subscriptionStack, 'FinanceCostReader', {
 *   principalId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Finance Team Group ID
 *   principalType: PrincipalType.Group,
 *   roleDefinitionId: '[subscriptionResourceId(\'Microsoft.Authorization/roleDefinitions\', \'72fafb9e-0641-4937-9268-a91bfd8191a3\')]', // Cost Management Reader
 *   description: 'Finance team can view cost data and budgets'
 * });
 * ```
 */
export class SubscriptionRoleAssignment extends Construct {
  /**
   * Underlying L1 construct.
   * @internal
   */
  private readonly armRoleAssignment: SubscriptionRoleAssignmentArm;

  /**
   * Role definition ID.
   */
  public readonly roleDefinitionId: string;

  /**
   * Scope of the assignment.
   */
  public readonly scope: string;

  /**
   * Principal that was granted access.
   */
  public readonly principalId: string;

  /**
   * Resource ID of the role assignment.
   */
  public readonly roleAssignmentId: string;

  /**
   * Creates a new SubscriptionRoleAssignment.
   *
   * @param scope - Parent construct (SubscriptionStack or ResourceGroupStack)
   * @param id - Unique construct ID
   * @param props - Role assignment properties
   *
   * @throws {Error} If scope is not a SubscriptionStack or ResourceGroupStack
   */
  constructor(scope: Construct, id: string, props: SubscriptionRoleAssignmentProps) {
    super(scope, id);

    // Determine the assignment scope
    const assignmentScope = this.resolveScope(scope);

    // Store properties
    this.roleDefinitionId = props.roleDefinitionId;
    this.scope = assignmentScope;
    this.principalId = props.principalId;

    // Create underlying L1 resource
    this.armRoleAssignment = new SubscriptionRoleAssignmentArm(this, 'Resource', {
      scope: assignmentScope,
      roleDefinitionId: props.roleDefinitionId,
      principalId: props.principalId,
      principalType: props.principalType,
      description: props.description,
      tenantId: props.tenantId,
      condition: props.condition,
      conditionVersion: props.conditionVersion,
    });

    this.roleAssignmentId = this.armRoleAssignment.resourceId;
  }

  /**
   * Resolves the ARM scope expression for the role assignment.
   *
   * @param scope - Parent construct
   * @returns ARM scope expression
   * @internal
   */
  private resolveScope(scope: Construct): string {
    // Try to find SubscriptionStack in parent hierarchy
    const subscriptionStack = this.findSubscriptionStack(scope);

    if (subscriptionStack) {
      // Subscription-level assignment
      return '[subscription().id]';
    }

    // Check if parent has resourceGroupId (ResourceGroupStack pattern)
    const parent = scope as any;
    if (parent.resourceGroupId) {
      // Resource group-level assignment
      return `[resourceGroup().id]`;
    }

    throw new Error(
      `SubscriptionRoleAssignment '${this.node.id}' must be created within a SubscriptionStack or ResourceGroupStack. ` +
        'Current parent scope does not appear to be a valid stack.'
    );
  }

  /**
   * Finds the SubscriptionStack in the construct hierarchy.
   *
   * @param construct - Starting construct
   * @returns SubscriptionStack if found, undefined otherwise
   * @internal
   */
  private findSubscriptionStack(construct: Construct): SubscriptionStack | undefined {
    let current: Construct | undefined = construct;

    while (current) {
      // Duck-type check for SubscriptionStack
      if (this.isSubscriptionStack(current)) {
        return current as SubscriptionStack;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Checks if a construct is a SubscriptionStack using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has SubscriptionStack properties
   * @internal
   */
  private isSubscriptionStack(construct: any): boolean {
    return (
      construct &&
      typeof construct.subscriptionId === 'string' &&
      typeof construct.generateResourceName === 'function' &&
      construct.scope === 'subscription'
    );
  }
}
