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

// L1 (ARM-level) constructs
export * from './role-assignment-arm';

// L2 (developer-friendly) constructs
export * from './role-assignment';

// Grant result implementation
export * from './grant-result';

// Well-known role definitions
export * from './well-known-role-ids';

// Cross-stack grant utilities
export * from './cross-stack-grant';
