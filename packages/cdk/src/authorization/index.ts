/**
 * Subscription-level RBAC authorization constructs.
 *
 * @remarks
 * This module provides constructs for managing subscription and resource group level
 * role assignments for human users and groups.
 *
 * **Key Difference from @atakora/lib/authorization**:
 * - `@atakora/lib/authorization` - Resource-scoped RBAC for managed identities
 * - `@atakora/cdk/authorization` - Subscription-scoped RBAC for human users/groups
 *
 * @packageDocumentation
 */

// L2 constructs
export * from './subscription-role-assignment';

// Types
export * from './subscription-role-assignment-types';

// L1 constructs (typically not used directly)
export * from './subscription-role-assignment-arm';
