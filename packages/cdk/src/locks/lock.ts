/**
 * Azure Resource Lock - L2 construct.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/lib';
import { ResourceLockArm, LockScope } from './lock-arm';
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
export class ResourceLock extends Construct {
  /**
   * Underlying L1 construct.
   * @internal
   */
  private readonly armLock: ResourceLockArm;

  /**
   * Lock level.
   */
  public readonly level: LockLevel;

  /**
   * Lock name.
   */
  public readonly lockName: string;

  /**
   * Resource ID of the lock.
   */
  public readonly lockId: string;

  /**
   * Scope of the lock (subscription or resource group).
   */
  public readonly scope: LockScope;

  /**
   * Creates a new ResourceLock.
   *
   * @param scope - Parent construct (SubscriptionStack or ResourceGroupStack)
   * @param id - Unique construct ID
   * @param props - Resource lock properties
   *
   * @throws {Error} If scope is not a SubscriptionStack or ResourceGroupStack
   */
  constructor(scope: Construct, id: string, props: ResourceLockProps) {
    super(scope, id);

    // Determine scope (subscription or resource group)
    this.scope = this.resolveScope(scope);

    // Store properties
    this.level = props.level;

    // Generate lock name from construct ID or use display name
    this.lockName = this.generateLockName(props.displayName || id);

    // Create underlying L1 resource
    this.armLock = new ResourceLockArm(this, 'Resource', {
      lockName: this.lockName,
      level: props.level,
      notes: props.notes,
      scope: this.scope,
    });

    this.lockId = this.armLock.resourceId;
  }

  /**
   * Resolves the deployment scope from parent construct.
   *
   * @param scope - Parent construct
   * @returns Lock scope
   * @throws {Error} If parent is neither SubscriptionStack nor ResourceGroupStack
   * @internal
   */
  private resolveScope(scope: Construct): LockScope {
    // Walk up the tree to find the appropriate stack
    let current: Construct | undefined = scope;

    while (current) {
      // Check for ResourceGroupStack first (more specific)
      if (this.isResourceGroupStack(current)) {
        return LockScope.RESOURCE_GROUP;
      }

      // Check for SubscriptionStack
      if (this.isSubscriptionStack(current)) {
        return LockScope.SUBSCRIPTION;
      }

      current = current.node.scope;
    }

    throw new Error(
      `ResourceLock '${this.node.id}' must be created within a SubscriptionStack or ResourceGroupStack.`
    );
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
   * Checks if a construct is a ResourceGroupStack using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroupStack properties
   * @internal
   */
  private isResourceGroupStack(construct: any): boolean {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      construct.scope === 'resourceGroup'
    );
  }

  /**
   * Generates a lock name from display name or construct ID.
   *
   * @param name - Display name or construct ID
   * @returns Lock name
   * @internal
   */
  private generateLockName(name: string): string {
    // Convert PascalCase/camelCase to kebab-case and limit length
    const kebabCase = name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Azure lock names have a 260 character limit
    return kebabCase.substring(0, 260);
  }
}
