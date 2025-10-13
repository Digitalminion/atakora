/**
 * Enums for Azure Resources (Microsoft.Authorization/locks).
 *
 * @remarks
 * Curated enums for Azure Resource Locks.
 *
 * **Resource Type**: Microsoft.Authorization/locks
 * **API Version**: 2020-05-01
 *
 * @packageDocumentation
 */

/**
 * Lock level that controls what operations are blocked.
 */
export enum LockLevel {
  /**
   * CanNotDelete - Authorized users can read and modify resources, but cannot delete.
   *
   * @remarks
   * This is the recommended lock level for production resources.
   * Users with appropriate permissions can still update resources, but cannot delete them.
   *
   * **Use cases**:
   * - Production databases
   * - Critical networking infrastructure
   * - Shared storage accounts
   * - Key vaults with secrets
   */
  CAN_NOT_DELETE = 'CanNotDelete',

  /**
   * ReadOnly - Authorized users can read resources, but cannot modify or delete.
   *
   * @remarks
   * This is the most restrictive lock level.
   * Prevents all modifications, including updates and deletes.
   *
   * **WARNING**: This can prevent expected operations:
   * - Virtual machines cannot be started/stopped
   * - Storage accounts cannot write new data
   * - Network Security Groups cannot be modified
   *
   * **Use cases**:
   * - Compliance archives
   * - Audited resource configurations
   * - Immutable infrastructure
   */
  READ_ONLY = 'ReadOnly',
}

/**
 * Scope type for lock deployment.
 */
export enum LockScope {
  SUBSCRIPTION = 'subscription',
  RESOURCE_GROUP = 'resourceGroup',
}
