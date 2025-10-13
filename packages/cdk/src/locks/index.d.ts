/**
 * Azure Resource Lock constructs for resource protection.
 *
 * @remarks
 * This module provides constructs for creating resource locks to protect Azure resources
 * from accidental deletion or modification.
 *
 * **Lock vs Policy**:
 * - **Lock**: Prevents operations on resources (deletion/modification)
 * - **Policy**: Prevents creation of non-compliant resources
 *
 * **Lock vs RBAC**:
 * - **Lock**: Applies to ALL users regardless of permissions
 * - **RBAC**: Controls WHO can access resources
 *
 * **Key Behaviors**:
 * - Locks inherit from parent scopes (subscription → resource group → resource)
 * - ReadOnly locks prevent expected operations (VM start/stop, storage writes)
 * - Only Owner/User Access Administrator roles can manage locks
 * - Locks apply to management plane only (not data plane APIs)
 *
 * @packageDocumentation
 */
export * from './lock';
export * from './lock-types';
export * from './lock-arm';
//# sourceMappingURL=index.d.ts.map