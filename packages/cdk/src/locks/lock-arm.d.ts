/**
 * Azure Resource Lock - L1 ARM construct.
 *
 * @packageDocumentation
 */
import { Resource, ArmResource, ResourceProps, Construct, schema } from '@atakora/lib';
import { LockLevel } from './lock-types';
/**
 * Scope type for lock deployment.
 *
 * @internal
 */
export declare const LockScope: typeof schema.resources.LockScope;
export type LockScope = typeof LockScope[keyof typeof LockScope];
/**
 * ARM-level properties for resource locks.
 *
 * @internal
 */
export interface ResourceLockArmProps extends ResourceProps {
    readonly lockName: string;
    readonly level: LockLevel;
    readonly notes?: string;
    readonly scope: LockScope;
}
/**
 * L1 ARM construct for Azure Resource Locks.
 *
 * @remarks
 * Creates Microsoft.Authorization/locks resources at subscription or resource group scope.
 *
 * **Deployment Scope**: Subscription or ResourceGroup
 *
 * **ARM Resource Type**: `Microsoft.Authorization/locks`
 * **API Version**: `2020-05-01`
 *
 * @internal
 */
export declare class ResourceLockArm extends Resource {
    readonly resourceType = "Microsoft.Authorization/locks";
    readonly apiVersion = "2020-05-01";
    readonly name: string;
    readonly resourceId: string;
    private readonly props;
    constructor(scope: Construct, id: string, props: ResourceLockArmProps);
    protected validateProps(props: ResourceLockArmProps): void;
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=lock-arm.d.ts.map