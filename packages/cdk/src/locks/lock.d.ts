/**
 * Azure Resource Lock - L2 construct.
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/lib';
import { LockScope } from './lock-arm';
import { ResourceLockProps, LockLevel } from './lock-types';
/**
 * L2 construct for Azure Resource Locks.
 *
 * @remarks
 * Protects Azure resources from accidental deletion or modification by applying
 * locks at subscription or resource group scope.
 *
 * **Lock Inheritance**:
 * - Locks applied at subscription level apply to all resources in the subscription
 * - Locks applied at resource group level apply to all resources in the resource group
 * - Child resources inherit locks from parent scopes
 * - You cannot override a parent lock at a child level
 *
 * **Lock Levels**:
 * - **CanNotDelete**: Prevents deletion but allows modifications (recommended for production)
 * - **ReadOnly**: Prevents all modifications and deletions (use with caution)
 *
 * **Important Behaviors**:
 * - ReadOnly locks prevent expected operations (e.g., VM start/stop, storage writes)
 * - Locks don't prevent access through data plane APIs (e.g., accessing blob storage)
 * - Locks require management plane permission to remove
 * - Users with Owner or User Access Administrator role can manage locks
 *
 * **Use Cases**:
 * - Protect critical production infrastructure
 * - Prevent accidental deletion during incidents
 * - Enforce compliance requirements
 * - Protect shared resources in multi-team environments
 *
 * @public
 *
 * @example
 * Prevent deletion of production subscription:
 * ```typescript
 * import { ResourceLock, LockLevel } from '@atakora/cdk';
 *
 * const productionLock = new ResourceLock(subscriptionStack, 'ProductionLock', {
 *   level: LockLevel.CAN_NOT_DELETE,
 *   notes: 'Prevent accidental deletion of production resources. Contact SRE team to remove.'
 * });
 * ```
 *
 * @example
 * Read-only lock for compliance:
 * ```typescript
 * const complianceLock = new ResourceLock(subscriptionStack, 'ComplianceFreeze', {
 *   level: LockLevel.READ_ONLY,
 *   notes: 'Compliance audit in progress - no modifications allowed until 2024-12-31'
 * });
 * ```
 *
 * @example
 * Lock specific resource group:
 * ```typescript
 * const rgLock = new ResourceLock(resourceGroupStack, 'SharedResourcesLock', {
 *   level: LockLevel.CAN_NOT_DELETE,
 *   notes: 'Shared infrastructure - requires approval from platform team to delete'
 * });
 * ```
 *
 * @example
 * Temporary lock during maintenance:
 * ```typescript
 * const maintenanceLock = new ResourceLock(resourceGroupStack, 'MaintenanceWindow', {
 *   level: LockLevel.READ_ONLY,
 *   notes: 'Maintenance window - no changes allowed. Lock expires 2024-01-15 09:00 UTC',
 *   displayName: 'Maintenance Window Lock'
 * });
 * ```
 */
export declare class ResourceLock extends Construct {
    /**
     * Underlying L1 construct.
     * @internal
     */
    private readonly armLock;
    /**
     * Lock level.
     */
    readonly level: LockLevel;
    /**
     * Lock name.
     */
    readonly lockName: string;
    /**
     * Resource ID of the lock.
     */
    readonly lockId: string;
    /**
     * Scope of the lock (subscription or resource group).
     */
    readonly scope: LockScope;
    /**
     * Creates a new ResourceLock.
     *
     * @param scope - Parent construct (SubscriptionStack or ResourceGroupStack)
     * @param id - Unique construct ID
     * @param props - Resource lock properties
     *
     * @throws {Error} If scope is not a SubscriptionStack or ResourceGroupStack
     */
    constructor(scope: Construct, id: string, props: ResourceLockProps);
    /**
     * Resolves the deployment scope from parent construct.
     *
     * @param scope - Parent construct
     * @returns Lock scope
     * @throws {Error} If parent is neither SubscriptionStack nor ResourceGroupStack
     * @internal
     */
    private resolveScope;
    /**
     * Checks if a construct is a SubscriptionStack using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has SubscriptionStack properties
     * @internal
     */
    private isSubscriptionStack;
    /**
     * Checks if a construct is a ResourceGroupStack using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroupStack properties
     * @internal
     */
    private isResourceGroupStack;
    /**
     * Generates a lock name from display name or construct ID.
     *
     * @param name - Display name or construct ID
     * @returns Lock name
     * @internal
     */
    private generateLockName;
}
//# sourceMappingURL=lock.d.ts.map