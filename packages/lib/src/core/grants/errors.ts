/**
 * Azure RBAC grant system - Error classes.
 *
 * @remarks
 * This module defines specialized error types for grant operations.
 * All errors extend ValidationError to maintain consistency with the
 * framework's validation system.
 *
 * @packageDocumentation
 */

import { ValidationError } from '../validation';

/**
 * Error thrown when grant operations fail.
 *
 * @remarks
 * Base error class for all grant-related errors.
 * Provides structured error information with context-aware messages.
 *
 * **Error Structure**:
 * - **message**: Short description of the problem
 * - **details**: Detailed explanation of what went wrong
 * - **suggestion**: Recommended remediation steps
 *
 * @public
 *
 * @example
 * ```typescript
 * throw new GrantError(
 *   'Failed to create role assignment',
 *   'Role definition ID is invalid or does not exist',
 *   'Verify the role definition exists and you have permission to assign it'
 * );
 * ```
 */
export class GrantError extends ValidationError {
  /**
   * Creates a new GrantError.
   *
   * @param message - Short description of the problem
   * @param details - Detailed explanation of what went wrong
   * @param suggestion - Suggested fix or remediation steps
   */
  constructor(message: string, details?: string, suggestion?: string) {
    super(message, details, suggestion);
    this.name = 'GrantError';
  }
}

/**
 * Error thrown when a resource doesn't have a managed identity.
 *
 * @remarks
 * This error indicates that a grant operation was attempted on a resource
 * that doesn't implement IGrantable or doesn't have an identity configured.
 *
 * **Common Causes**:
 * - Resource doesn't have managed identity enabled
 * - Resource type doesn't support managed identities
 * - Identity configuration is incomplete
 *
 * **Resolution Steps**:
 * 1. Enable system-assigned or user-assigned identity on the resource
 * 2. Verify the resource type supports managed identities
 * 3. Use an explicit identity construct if the resource doesn't support identities
 *
 * @public
 *
 * @example
 * Thrown when attempting to grant to a resource without identity:
 * ```typescript
 * const storage = new StorageAccount(stack, 'Storage', {
 *   // No identity configured
 * });
 *
 * const vm = new VirtualMachine(stack, 'VM', {
 *   // No identity configured
 * });
 *
 * // This will throw MissingIdentityError
 * storage.grantRead(vm);
 * ```
 *
 * @example
 * Correct usage with identity:
 * ```typescript
 * const vm = new VirtualMachine(stack, 'VM', {
 *   identity: { type: ManagedIdentityType.SystemAssigned }
 * });
 *
 * // Now this works
 * storage.grantRead(vm);
 * ```
 */
export class MissingIdentityError extends GrantError {
  /**
   * Creates a new MissingIdentityError.
   *
   * @param resourceId - Identifier of the resource missing an identity
   *
   * @example
   * ```typescript
   * if (!resource.identity) {
   *   throw new MissingIdentityError(resource.node.path);
   * }
   * ```
   */
  constructor(resourceId: string) {
    super(
      `Resource '${resourceId}' does not have a managed identity`,
      'Grant operations require the grantee to have a managed identity',
      'Enable a managed identity on the resource or use an explicit identity construct'
    );
    this.name = 'MissingIdentityError';
  }
}

/**
 * Error thrown when role assignment validation fails.
 *
 * @remarks
 * This error indicates that the role assignment configuration is invalid
 * according to Azure RBAC rules.
 *
 * **Common Validation Failures**:
 * - Invalid role definition ID format
 * - Invalid principal ID (not a valid GUID)
 * - Invalid principal type for the given identity
 * - Scope is not a valid Azure resource ID
 * - ABAC condition syntax errors
 * - Role doesn't support conditions
 * - Cross-tenant assignment without tenant ID
 *
 * **Azure Requirements**:
 * - Principal ID must be a valid GUID
 * - Role definition ID must be a valid Azure resource ID
 * - Scope must be a valid Azure resource ID
 * - ABAC conditions must use version 2.0 syntax
 * - Only data plane roles support conditions
 *
 * @public
 *
 * @example
 * Invalid principal ID:
 * ```typescript
 * throw new InvalidRoleAssignmentError(
 *   'Invalid principal ID format',
 *   'Principal ID must be a valid GUID'
 * );
 * ```
 *
 * @example
 * Invalid ABAC condition:
 * ```typescript
 * throw new InvalidRoleAssignmentError(
 *   'Role does not support conditions',
 *   'Storage Blob Data Reader supports conditions, but Reader does not'
 * );
 * ```
 *
 * @example
 * Missing tenant ID for cross-tenant:
 * ```typescript
 * throw new InvalidRoleAssignmentError(
 *   'Cross-tenant assignment requires tenant ID',
 *   'When using PrincipalType.ForeignGroup, tenantId must be specified'
 * );
 * ```
 */
export class InvalidRoleAssignmentError extends GrantError {
  /**
   * Creates a new InvalidRoleAssignmentError.
   *
   * @param message - Short description of the validation failure
   * @param details - Detailed explanation of what is invalid
   *
   * @example
   * ```typescript
   * if (!isValidGuid(principalId)) {
   *   throw new InvalidRoleAssignmentError(
   *     'Invalid principal ID format',
   *     `Expected a valid GUID, got: ${principalId}`
   *   );
   * }
   * ```
   *
   * @example
   * ```typescript
   * if (principalType === PrincipalType.ForeignGroup && !tenantId) {
   *   throw new InvalidRoleAssignmentError(
   *     'Missing tenant ID for foreign group',
   *     'ForeignGroup principal type requires tenantId to be specified'
   *   );
   * }
   * ```
   */
  constructor(message: string, details?: string) {
    super(
      message,
      details,
      'Check the Azure RBAC documentation for valid role assignment configurations'
    );
    this.name = 'InvalidRoleAssignmentError';
  }
}
