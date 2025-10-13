/**
 * Azure Policy constructs for compliance and governance.
 *
 * @remarks
 * This module provides constructs for assigning Azure policies at subscription scope
 * to enforce compliance rules and governance policies.
 *
 * **Policy vs RBAC**:
 * - **Policy**: Controls WHAT resources are allowed (compliance/governance)
 * - **RBAC**: Controls WHO can access resources (authentication/authorization)
 *
 * @packageDocumentation
 */

// L2 constructs
export * from './policy-assignment';

// Types
export * from './policy-assignment-types';

// Well-known policy IDs
export * from './well-known-policy-ids';

// L1 constructs (typically not used directly)
export * from './policy-assignment-arm';
