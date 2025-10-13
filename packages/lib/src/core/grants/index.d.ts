/**
 * Azure RBAC grant system - Core foundation module.
 *
 * @remarks
 * This module provides the foundational types and interfaces for Azure's
 * role-based access control (RBAC) grant pattern. It enables type-safe,
 * intent-based permission management across Azure resources.
 *
 * **Phase 1: Core Foundation**
 * - {@link IGrantable} - Interface for identities that can receive permissions
 * - {@link PrincipalType} - Enum for Azure AD principal types
 * - {@link IGrantResult} - Interface for grant operation results
 * - Error classes for grant operations
 *
 * **Design Principles**:
 * - Type-safe identity management
 * - Fluent API for grant configuration
 * - Comprehensive error handling
 * - Azure RBAC best practices enforcement
 *
 * @packageDocumentation
 *
 * @example
 * Basic grant pattern (Phase 2+):
 * ```typescript
 * import { IGrantable, PrincipalType } from '@atakora/lib';
 *
 * // Resource with managed identity implements IGrantable
 * const vm = new VirtualMachine(stack, 'VM', {
 *   identity: { type: ManagedIdentityType.SystemAssigned }
 * });
 *
 * // Grant access using the grant pattern
 * const grant = storageAccount.grantRead(vm);
 *
 * // Optionally add description or conditions
 * grant.addDescription('VM needs read access for application configs');
 * ```
 *
 * @example
 * Working with external identities:
 * ```typescript
 * import { IGrantable, PrincipalType } from '@atakora/lib';
 *
 * // Create an explicit identity reference
 * const externalIdentity: IGrantable = {
 *   principalId: '12345678-1234-1234-1234-123456789abc',
 *   principalType: PrincipalType.ServicePrincipal
 * };
 *
 * // Grant access to the external identity
 * keyVault.grantSecretRead(externalIdentity);
 * ```
 *
 * @example
 * Error handling:
 * ```typescript
 * import { MissingIdentityError } from '@atakora/lib';
 *
 * try {
 *   storageAccount.grantRead(resource);
 * } catch (error) {
 *   if (error instanceof MissingIdentityError) {
 *     console.error('Resource needs a managed identity enabled');
 *     console.error(error.suggestion);
 *   }
 * }
 * ```
 */
export type { IGrantable } from './igrantable';
export { PrincipalType } from './principal-type';
export type { IGrantResult } from './grant-result';
export { GrantError, MissingIdentityError, InvalidRoleAssignmentError } from './errors';
//# sourceMappingURL=index.d.ts.map