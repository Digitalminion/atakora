/**
 * Azure RBAC - RoleAssignment L2 construct.
 *
 * @remarks
 * This module provides the L2 (developer-friendly layer) construct for Azure role assignments.
 * It wraps the L1 RoleAssignmentArm construct with a cleaner API.
 *
 * @packageDocumentation
 */
import { Construct } from '../core/construct';
import { PrincipalType } from '../core/grants';
import { RoleAssignmentArm } from './role-assignment-arm';
/**
 * Properties for creating a role assignment (L2 construct).
 *
 * @remarks
 * Provides a developer-friendly API for creating role assignments.
 * This is the recommended construct for most use cases.
 *
 * @public
 */
export interface RoleAssignmentProps {
    /**
     * The scope where the role is assigned (resource ID).
     *
     * @remarks
     * Can be any valid Azure resource ID:
     * - Resource: Full resource ID
     * - Resource group: `/subscriptions/{id}/resourceGroups/{name}`
     * - Subscription: `/subscriptions/{id}`
     * - Management group: `/providers/Microsoft.Management/managementGroups/{id}`
     *
     * @example
     * ```typescript
     * // Assign at resource level
     * scope: storageAccount.resourceId
     *
     * // Assign at resource group level
     * scope: resourceGroup.resourceId
     * ```
     */
    readonly scope: string;
    /**
     * Azure role definition ID (full resource ID).
     *
     * @remarks
     * Use WellKnownRoleIds for built-in roles.
     * For custom roles, provide the full role definition resource ID.
     *
     * @example
     * ```typescript
     * // Built-in role
     * roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER
     *
     * // Custom role
     * roleDefinitionId: '/subscriptions/.../providers/Microsoft.Authorization/roleDefinitions/...'
     * ```
     */
    readonly roleDefinitionId: string;
    /**
     * Principal ID to assign the role to.
     *
     * @remarks
     * The Azure AD object ID of the identity receiving the role.
     * Can be a static GUID or an ARM reference expression.
     *
     * @example
     * ```typescript
     * // From an IGrantable
     * principalId: vm.principalId
     *
     * // Static principal ID
     * principalId: '12345678-1234-1234-1234-123456789abc'
     * ```
     */
    readonly principalId: string;
    /**
     * Type of principal.
     *
     * @remarks
     * Must match the actual type of the identity.
     *
     * @see {@link PrincipalType}
     */
    readonly principalType: PrincipalType;
    /**
     * Tenant ID for cross-tenant scenarios.
     *
     * @remarks
     * Required when assigning to identities from a different Azure AD tenant.
     *
     * @example
     * ```typescript
     * tenantId: '87654321-4321-4321-4321-210987654321'
     * ```
     */
    readonly tenantId?: string;
    /**
     * Optional description for the assignment.
     *
     * @remarks
     * Helpful for documenting why the permission was granted.
     * Maximum 1024 characters.
     *
     * @example
     * ```typescript
     * description: 'Function app needs to read blobs for processing'
     * ```
     */
    readonly description?: string;
    /**
     * Condition for the role assignment (Azure ABAC conditions).
     *
     * @remarks
     * ABAC (Attribute-Based Access Control) allows fine-grained control
     * based on resource attributes.
     *
     * **Note**: Only data plane roles support conditions.
     *
     * @example
     * ```typescript
     * condition: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'logs'`
     * ```
     */
    readonly condition?: string;
    /**
     * Version of the condition syntax.
     *
     * @remarks
     * Required when condition is specified.
     * Currently only '2.0' is supported.
     *
     * @defaultValue '2.0'
     */
    readonly conditionVersion?: '2.0';
    /**
     * Whether to skip validation of the principal.
     *
     * @remarks
     * Set to true to allow assignments to principals that don't exist yet.
     * Use with caution.
     *
     * @defaultValue false
     */
    readonly skipPrincipalValidation?: boolean;
}
/**
 * L2 construct for Azure role assignments with developer-friendly API.
 *
 * @remarks
 * This is the recommended construct for creating role assignments.
 * It provides a clean API and wraps the L1 RoleAssignmentArm construct.
 *
 * **Key Features**:
 * - Developer-friendly property names
 * - Clean API with sensible defaults
 * - Immutability enforced
 * - Wraps L1 construct for ARM template generation
 *
 * **Design Philosophy**:
 * Role assignments are immutable by design. All configuration must be
 * provided at construction time. This ensures consistency and prevents
 * surprising runtime mutations.
 *
 * @public
 *
 * @example
 * Basic role assignment:
 * ```typescript
 * const assignment = new RoleAssignment(stack, 'BlobReaderRole', {
 *   scope: storageAccount.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
 *   principalId: vm.principalId,
 *   principalType: PrincipalType.ManagedIdentity,
 *   description: 'VM reads configuration from blob storage'
 * });
 * ```
 *
 * @example
 * With ABAC condition:
 * ```typescript
 * const assignment = new RoleAssignment(stack, 'ConditionalWrite', {
 *   scope: storageAccount.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR,
 *   principalId: app.principalId,
 *   principalType: PrincipalType.ManagedIdentity,
 *   condition: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringStartsWith 'data-'`,
 *   conditionVersion: '2.0',
 *   description: 'App can only write to data-* containers'
 * });
 * ```
 *
 * @example
 * Establishing dependencies:
 * ```typescript
 * const grant = new RoleAssignment(stack, 'KeyVaultAccess', {
 *   scope: keyVault.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.KEY_VAULT_SECRETS_USER,
 *   principalId: functionApp.principalId,
 *   principalType: PrincipalType.ManagedIdentity
 * });
 *
 * // Ensure function app configuration waits for KeyVault access
 * appSettings.node.addDependency(grant);
 * ```
 */
export declare class RoleAssignment extends Construct {
    /**
     * Underlying L1 construct.
     *
     * @internal
     */
    private readonly armRoleAssignment;
    /**
     * Role definition ID.
     *
     * @remarks
     * The full Azure role definition resource ID that was assigned.
     */
    readonly roleDefinitionId: string;
    /**
     * Scope of the assignment.
     *
     * @remarks
     * The Azure resource ID where permissions were granted.
     */
    readonly scope: string;
    /**
     * Principal that was granted access.
     *
     * @remarks
     * The Azure AD object ID of the identity that received the role.
     */
    readonly principalId: string;
    /**
     * Resource ID of the role assignment.
     *
     * @remarks
     * The full Azure resource ID of this role assignment.
     * Can be used for dependencies or references.
     */
    readonly roleAssignmentId: string;
    /**
     * Creates a new RoleAssignment instance.
     *
     * @param scope - Parent construct
     * @param id - Unique construct ID
     * @param props - Role assignment properties
     */
    constructor(scope: Construct, id: string, props: RoleAssignmentProps);
    /**
     * Adds a description to the role assignment.
     *
     * @remarks
     * **NOTE**: This method throws an error because role assignments are immutable.
     * Descriptions must be set during construction for immutability.
     *
     * This method exists to satisfy the IGrantResult interface but enforces
     * the immutability principle.
     *
     * @param description - Description to add
     * @throws {Error} Always throws - descriptions must be set at construction
     *
     * @internal
     */
    addDescription(description: string): void;
    /**
     * Adds an Azure ABAC condition to the assignment.
     *
     * @remarks
     * **NOTE**: This method throws an error because role assignments are immutable.
     * Conditions must be set during construction for immutability.
     *
     * This method exists to satisfy the IGrantResult interface but enforces
     * the immutability principle.
     *
     * @param condition - ABAC condition to add
     * @param version - Condition version (default '2.0')
     * @throws {Error} Always throws - conditions must be set at construction
     *
     * @internal
     */
    addCondition(condition: string, version?: '2.0'): void;
    /**
     * Gets a reference to the underlying L1 construct.
     *
     * @remarks
     * Provides access to the ARM resource for advanced scenarios.
     * Most users should not need to access this.
     *
     * @internal
     */
    get armResource(): RoleAssignmentArm;
}
//# sourceMappingURL=role-assignment.d.ts.map