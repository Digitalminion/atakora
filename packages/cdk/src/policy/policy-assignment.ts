/**
 * Azure Policy Assignment - L2 construct.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/lib';
import { PolicyAssignmentArm } from './policy-assignment-arm';
import { PolicyAssignmentProps, PolicyEnforcementMode } from './policy-assignment-types';

/**
 * L2 construct for Azure Policy Assignments.
 *
 * @remarks
 * Assigns Azure policies at subscription scope to enforce compliance rules.
 *
 * **Use Cases**:
 * - Require HTTPS on all storage accounts
 * - Enforce allowed resource locations
 * - Require specific tags on resources
 * - Audit VM SKU sizes
 * - Block public IP addresses
 * - Require encryption at rest
 *
 * **Policy vs RBAC**:
 * - **Policy**: Controls WHAT resources are allowed (compliance/governance)
 * - **RBAC**: Controls WHO can access resources (authentication/authorization)
 *
 * @public
 *
 * @example
 * Require HTTPS on storage accounts:
 * ```typescript
 * import { PolicyAssignment } from '@atakora/cdk';
 * import { WellKnownPolicyIds } from '@atakora/cdk';
 *
 * const httpsPolicy = new PolicyAssignment(subscriptionStack, 'RequireHTTPS', {
 *   policyDefinitionId: WellKnownPolicyIds.STORAGE_HTTPS_ONLY,
 *   displayName: 'Require secure transfer for storage accounts',
 *   description: 'Ensures all storage accounts require HTTPS for security compliance'
 * });
 * ```
 *
 * @example
 * Enforce allowed resource locations:
 * ```typescript
 * const locationPolicy = new PolicyAssignment(subscriptionStack, 'AllowedLocations', {
 *   policyDefinitionId: WellKnownPolicyIds.ALLOWED_LOCATIONS,
 *   displayName: 'Allowed resource locations',
 *   description: 'Restrict resource deployment to approved Azure regions',
 *   parameters: {
 *     listOfAllowedLocations: {
 *       value: ['eastus', 'eastus2', 'westus2']
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * Require tags on resources:
 * ```typescript
 * const tagPolicy = new PolicyAssignment(subscriptionStack, 'RequireCostCenter', {
 *   policyDefinitionId: WellKnownPolicyIds.REQUIRE_TAG_ON_RESOURCES,
 *   displayName: 'Require cost center tag',
 *   description: 'All resources must have a cost center tag for billing',
 *   parameters: {
 *     tagName: { value: 'costCenter' }
 *   }
 * });
 * ```
 *
 * @example
 * Test policy without enforcement:
 * ```typescript
 * const testPolicy = new PolicyAssignment(subscriptionStack, 'TestPolicy', {
 *   policyDefinitionId: WellKnownPolicyIds.AUDIT_VM_MANAGED_DISKS,
 *   displayName: 'Test: Audit VMs without managed disks',
 *   description: 'Testing policy before full enforcement',
 *   enforcementMode: PolicyEnforcementMode.DO_NOT_ENFORCE // Audit only
 * });
 * ```
 */
export class PolicyAssignment extends Construct {
  /**
   * Underlying L1 construct.
   * @internal
   */
  private readonly armPolicyAssignment: PolicyAssignmentArm;

  /**
   * Policy definition ID.
   */
  public readonly policyDefinitionId: string;

  /**
   * Display name of the policy assignment.
   */
  public readonly displayName: string;

  /**
   * Name of the policy assignment resource.
   */
  public readonly policyAssignmentName: string;

  /**
   * Resource ID of the policy assignment.
   */
  public readonly policyAssignmentId: string;

  /**
   * Creates a new PolicyAssignment.
   *
   * @param scope - Parent construct (must be SubscriptionStack)
   * @param id - Unique construct ID
   * @param props - Policy assignment properties
   *
   * @throws {Error} If scope is not a SubscriptionStack
   */
  constructor(scope: Construct, id: string, props: PolicyAssignmentProps) {
    super(scope, id);

    // Validate parent is SubscriptionStack
    this.validateParentScope(scope);

    // Store properties
    this.policyDefinitionId = props.policyDefinitionId;
    this.displayName = props.displayName;

    // Generate assignment name from construct ID
    this.policyAssignmentName = this.generatePolicyAssignmentName(id);

    // Create underlying L1 resource
    this.armPolicyAssignment = new PolicyAssignmentArm(this, 'Resource', {
      policyAssignmentName: this.policyAssignmentName,
      policyDefinitionId: props.policyDefinitionId,
      displayName: props.displayName,
      description: props.description,
      metadata: props.metadata,
      parameters: props.parameters,
      enforcementMode: props.enforcementMode || PolicyEnforcementMode.DEFAULT,
      identity: props.identity,
      resourceSelectors: props.resourceSelectors,
      notScopes: props.notScopes,
      overrides: props.overrides,
    });

    this.policyAssignmentId = this.armPolicyAssignment.resourceId;
  }

  /**
   * Validates that the parent scope is a SubscriptionStack or ManagementGroupStack.
   *
   * @param scope - Parent construct
   * @throws {Error} If parent is neither SubscriptionStack nor ManagementGroupStack
   * @internal
   */
  private validateParentScope(scope: Construct): void {
    // Walk up the tree to find SubscriptionStack or ManagementGroupStack
    let current: Construct | undefined = scope;
    let foundValidStack = false;

    while (current) {
      // Duck-type check for SubscriptionStack or ManagementGroupStack
      if (this.isSubscriptionStack(current) || this.isManagementGroupStack(current)) {
        foundValidStack = true;
        break;
      }
      current = current.node.scope;
    }

    if (!foundValidStack) {
      throw new Error(
        `PolicyAssignment '${this.node.id}' must be created within a SubscriptionStack or ManagementGroupStack. ` +
          'Policy assignments can be deployed at subscription or management group scope.'
      );
    }
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
      construct.scope === 'subscription'
    );
  }

  /**
   * Checks if a construct is a ManagementGroupStack using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ManagementGroupStack properties
   * @internal
   */
  private isManagementGroupStack(construct: any): boolean {
    return (
      construct &&
      typeof construct.managementGroupId === 'string' &&
      construct.scope === 'managementGroup'
    );
  }

  /**
   * Generates a policy assignment name from construct ID.
   *
   * @param id - Construct ID
   * @returns Policy assignment name
   * @internal
   */
  private generatePolicyAssignmentName(id: string): string {
    // Convert PascalCase/camelCase to kebab-case and limit length
    const kebabCase = id
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Azure policy assignment names have a 64 character limit
    return kebabCase.substring(0, 64);
  }
}
