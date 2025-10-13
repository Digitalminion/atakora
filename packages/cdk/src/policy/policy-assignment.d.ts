/**
 * Azure Policy Assignment - L2 construct.
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/lib';
import { PolicyAssignmentProps } from './policy-assignment-types';
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
export declare class PolicyAssignment extends Construct {
    /**
     * Underlying L1 construct.
     * @internal
     */
    private readonly armPolicyAssignment;
    /**
     * Policy definition ID.
     */
    readonly policyDefinitionId: string;
    /**
     * Display name of the policy assignment.
     */
    readonly displayName: string;
    /**
     * Name of the policy assignment resource.
     */
    readonly policyAssignmentName: string;
    /**
     * Resource ID of the policy assignment.
     */
    readonly policyAssignmentId: string;
    /**
     * Creates a new PolicyAssignment.
     *
     * @param scope - Parent construct (must be SubscriptionStack)
     * @param id - Unique construct ID
     * @param props - Policy assignment properties
     *
     * @throws {Error} If scope is not a SubscriptionStack
     */
    constructor(scope: Construct, id: string, props: PolicyAssignmentProps);
    /**
     * Validates that the parent scope is a SubscriptionStack or ManagementGroupStack.
     *
     * @param scope - Parent construct
     * @throws {Error} If parent is neither SubscriptionStack nor ManagementGroupStack
     * @internal
     */
    private validateParentScope;
    /**
     * Checks if a construct is a SubscriptionStack using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has SubscriptionStack properties
     * @internal
     */
    private isSubscriptionStack;
    /**
     * Checks if a construct is a ManagementGroupStack using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ManagementGroupStack properties
     * @internal
     */
    private isManagementGroupStack;
    /**
     * Generates a policy assignment name from construct ID.
     *
     * @param id - Construct ID
     * @returns Policy assignment name
     * @internal
     */
    private generatePolicyAssignmentName;
}
//# sourceMappingURL=policy-assignment.d.ts.map