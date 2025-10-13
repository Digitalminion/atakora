/**
 * Azure Management Group - L1 ARM construct.
 *
 * @packageDocumentation
 */
import { Resource, ArmResource, ResourceProps, Construct } from '@atakora/lib';
/**
 * ARM-level properties for management groups.
 *
 * @internal
 */
export interface ManagementGroupArmProps extends ResourceProps {
    readonly managementGroupName: string;
    readonly displayName: string;
    readonly parentId?: string;
    readonly description?: string;
}
/**
 * L1 ARM construct for Azure Management Groups.
 *
 * @remarks
 * Creates Microsoft.Management/managementGroups resources at tenant scope.
 *
 * **Deployment Scope**: Tenant (or ManagementGroup)
 *
 * **ARM Resource Type**: `Microsoft.Management/managementGroups`
 * **API Version**: `2021-04-01`
 *
 * @internal
 */
export declare class ManagementGroupArm extends Resource {
    readonly resourceType = "Microsoft.Management/managementGroups";
    readonly apiVersion = "2021-04-01";
    readonly name: string;
    readonly resourceId: string;
    private readonly props;
    constructor(scope: Construct, id: string, props: ManagementGroupArmProps);
    protected validateProps(props: ManagementGroupArmProps): void;
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=management-group-arm.d.ts.map