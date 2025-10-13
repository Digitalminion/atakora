/**
 * Azure RBAC Authorization module.
 *
 * @remarks
 * This module provides role assignment constructs and utilities for
 * implementing Azure RBAC permissions in infrastructure code.
 *
 * **Core Components**:
 * - RoleAssignment constructs (L1 and L2)
 * - WellKnownRoleIds registry
 * - GrantResult implementation
 *
 * **Related Modules**:
 * - `@atakora/lib/core/grants` - IGrantable interface and grant system foundations
 * - `@atakora/lib/core/grantable-resource` - GrantableResource base class
 *
 * @packageDocumentation
 */
export * from './role-assignment-arm';
export * from './role-assignment';
export * from './grant-result';
export * from './well-known-role-ids';
export * from './cross-stack-grant';
export * from './grant-resource-role';
//# sourceMappingURL=index.d.ts.map