/**
 * Azure RBAC - GrantResult implementation.
 *
 * @remarks
 * This module provides the concrete implementation of the IGrantResult interface.
 * It wraps a RoleAssignment and provides access to grant metadata.
 *
 * @packageDocumentation
 */
import { IGrantResult, IGrantable } from '../core/grants';
import { RoleAssignment } from './role-assignment';
/**
 * Implementation of IGrantResult.
 *
 * @remarks
 * This class is returned by all grant methods to provide access to:
 * - The created role assignment
 * - Grant metadata (role, grantee, scope)
 * - Methods for adding descriptions and conditions
 *
 * **Immutability Note**:
 * While this class implements methods like `addDescription` and `addCondition`,
 * these methods throw errors because RoleAssignment is immutable.
 * All configuration must be provided at construction time.
 *
 * @internal
 *
 * @example
 * ```typescript
 * const result = storageAccount.grantBlobRead(vm);
 *
 * // Access the role assignment for dependencies
 * appConfig.node.addDependency(result.roleAssignment);
 *
 * // Access grant metadata
 * console.log(`Granted role: ${result.roleDefinitionId}`);
 * console.log(`To principal: ${result.grantee.principalId}`);
 * console.log(`At scope: ${result.scope}`);
 * ```
 */
export declare class GrantResult implements IGrantResult {
    /**
     * The role assignment created by the grant.
     *
     * @remarks
     * This is the underlying RoleAssignment construct.
     * Use this for:
     * - Establishing resource dependencies
     * - Accessing the role assignment resource ID
     * - Referencing the assignment in other constructs
     */
    readonly roleAssignment: RoleAssignment;
    /**
     * The role that was granted.
     *
     * @remarks
     * Full Azure role definition resource ID.
     * Format: `/subscriptions/{id}/providers/Microsoft.Authorization/roleDefinitions/{guid}`
     */
    readonly roleDefinitionId: string;
    /**
     * The identity that was granted access.
     *
     * @remarks
     * Reference to the IGrantable that received the permissions.
     * Useful for auditing and programmatic inspection.
     */
    readonly grantee: IGrantable;
    /**
     * The scope where access was granted.
     *
     * @remarks
     * The Azure resource ID where the role assignment was created.
     * Permissions apply to this resource and may cascade to child resources.
     */
    readonly scope: string;
    /**
     * Creates a new GrantResult.
     *
     * @param roleAssignment - The RoleAssignment construct
     * @param roleDefinitionId - The role definition ID
     * @param grantee - The identity that received the role
     * @param scope - The scope where the role was assigned
     *
     * @internal
     */
    constructor(roleAssignment: RoleAssignment, roleDefinitionId: string, grantee: IGrantable, scope: string);
    /**
     * Adds a description to the role assignment.
     *
     * @remarks
     * **NOTE**: This method throws an error because RoleAssignment is immutable.
     * Descriptions must be provided when calling the grant method.
     *
     * This method exists to satisfy the IGrantResult interface contract,
     * but enforces the immutability principle by throwing at runtime.
     *
     * **Alternative Approach**:
     * Pass the description when calling the grant method:
     * ```typescript
     * protected grant(grantable: IGrantable, roleDefinitionId: string, description: string)
     * ```
     *
     * @param description - Description to add
     * @throws {Error} Always throws - descriptions must be set during construction
     *
     * @example
     * Correct approach (in grant method implementation):
     * ```typescript
     * public grantBlobRead(grantable: IGrantable): IGrantResult {
     *   return this.grant(
     *     grantable,
     *     WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
     *     'Read access to blob storage' // Description provided here
     *   );
     * }
     * ```
     */
    addDescription(description: string): void;
    /**
     * Adds an Azure ABAC condition to the assignment.
     *
     * @remarks
     * **NOTE**: This method throws an error because RoleAssignment is immutable.
     * Conditions must be provided when creating the RoleAssignment.
     *
     * This method exists to satisfy the IGrantResult interface contract,
     * but enforces the immutability principle by throwing at runtime.
     *
     * **Alternative Approach**:
     * For conditional grants, create the RoleAssignment directly with the condition:
     * ```typescript
     * new RoleAssignment(scope, id, {
     *   scope: resource.resourceId,
     *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR,
     *   principalId: grantable.principalId,
     *   principalType: grantable.principalType,
     *   condition: "...",
     *   conditionVersion: "2.0"
     * });
     * ```
     *
     * @param condition - ABAC expression
     * @param version - Condition version (default '2.0')
     * @throws {Error} Always throws - conditions must be set during construction
     *
     * @example
     * For advanced scenarios requiring conditions, use RoleAssignment directly:
     * ```typescript
     * const assignment = new RoleAssignment(this, 'ConditionalGrant', {
     *   scope: this.resourceId,
     *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR,
     *   principalId: grantable.principalId,
     *   principalType: grantable.principalType,
     *   condition: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'logs'`,
     *   conditionVersion: '2.0',
     *   description: 'Conditional access to logs container only'
     * });
     *
     * return new GrantResult(assignment, WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR, grantable, this.resourceId);
     * ```
     */
    addCondition(condition: string, version?: '2.0'): void;
}
//# sourceMappingURL=grant-result.d.ts.map