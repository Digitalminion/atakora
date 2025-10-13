/**
 * Subscription-level role assignment - L1 ARM construct.
 *
 * @packageDocumentation
 */
import { Resource, ArmResource, ResourceProps, Construct } from '@atakora/lib';
import { PrincipalType } from '@atakora/lib';
/**
 * ARM-level properties for subscription role assignments.
 *
 * @internal
 */
export interface SubscriptionRoleAssignmentArmProps extends ResourceProps {
    readonly scope: string;
    readonly roleDefinitionId: string;
    readonly principalId: string;
    readonly principalType: PrincipalType;
    readonly description?: string;
    readonly tenantId?: string;
    readonly condition?: string;
    readonly conditionVersion?: '2.0';
}
/**
 * L1 ARM construct for subscription-level role assignments.
 *
 * @remarks
 * This construct creates Microsoft.Authorization/roleAssignments resources
 * at subscription or resource group scope.
 *
 * **Deployment Scope**: Subscription
 *
 * **ARM Resource Type**: `Microsoft.Authorization/roleAssignments`
 * **API Version**: `2022-04-01`
 *
 * @internal
 */
export declare class SubscriptionRoleAssignmentArm extends Resource {
    readonly resourceType = "Microsoft.Authorization/roleAssignments";
    readonly apiVersion = "2022-04-01";
    readonly name: string;
    readonly resourceId: string;
    private readonly props;
    constructor(scope: Construct, id: string, props: SubscriptionRoleAssignmentArmProps);
    protected validateProps(props: SubscriptionRoleAssignmentArmProps): void;
    toArmTemplate(): ArmResource;
    /**
     * Generates a deterministic GUID for the role assignment.
     *
     * @returns ARM expression that generates a GUID
     * @internal
     */
    private generateAssignmentGuid;
}
//# sourceMappingURL=subscription-role-assignment-arm.d.ts.map