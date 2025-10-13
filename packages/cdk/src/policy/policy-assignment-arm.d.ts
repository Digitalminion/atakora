/**
 * Azure Policy Assignment - L1 ARM construct.
 *
 * @packageDocumentation
 */
import { Resource, ArmResource, ResourceProps, Construct } from '@atakora/lib';
import { PolicyEnforcementMode, PolicyIdentityType } from './policy-assignment-types';
/**
 * ARM-level properties for policy assignments.
 *
 * @internal
 */
export interface PolicyAssignmentArmProps extends ResourceProps {
    readonly policyAssignmentName: string;
    readonly policyDefinitionId: string;
    readonly displayName: string;
    readonly description?: string;
    readonly metadata?: Record<string, any>;
    readonly parameters?: Record<string, {
        value: any;
    }>;
    readonly enforcementMode?: PolicyEnforcementMode;
    readonly identity?: {
        type: PolicyIdentityType;
        userAssignedIdentities?: Record<string, any>;
    };
    readonly resourceSelectors?: Array<{
        name: string;
        selectors: Array<{
            kind: string;
            in?: string[];
            notIn?: string[];
        }>;
    }>;
    readonly notScopes?: string[];
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
/**
 * L1 ARM construct for Azure Policy Assignments.
 *
 * @remarks
 * Creates Microsoft.Authorization/policyAssignments resources at subscription scope.
 *
 * **Deployment Scope**: Subscription
 *
 * **ARM Resource Type**: `Microsoft.Authorization/policyAssignments`
 * **API Version**: `2024-05-01`
 *
 * @internal
 */
export declare class PolicyAssignmentArm extends Resource {
    readonly resourceType = "Microsoft.Authorization/policyAssignments";
    readonly apiVersion = "2024-05-01";
    readonly name: string;
    readonly resourceId: string;
    private readonly props;
    constructor(scope: Construct, id: string, props: PolicyAssignmentArmProps);
    protected validateProps(props: PolicyAssignmentArmProps): void;
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=policy-assignment-arm.d.ts.map