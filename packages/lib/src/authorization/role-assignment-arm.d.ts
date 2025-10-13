/**
 * Azure RBAC - RoleAssignment L1 construct.
 *
 * @remarks
 * This module provides the L1 (ARM template layer) construct for Azure role assignments.
 * It maps directly to the Microsoft.Authorization/roleAssignments ARM resource type.
 *
 * @packageDocumentation
 */
import { Resource, ArmResource, ResourceProps } from '../core/resource';
import { Construct } from '../core/construct';
import { PrincipalType } from '../core/grants';
/**
 * Properties for creating a role assignment (L1 construct).
 *
 * @remarks
 * Provides direct mapping to Azure ARM role assignment properties.
 * This is the low-level construct that maps 1:1 with ARM template format.
 *
 * @public
 */
export interface RoleAssignmentArmProps extends ResourceProps {
    /**
     * The scope where the role is assigned.
     *
     * @remarks
     * Can be:
     * - Management group: `/providers/Microsoft.Management/managementGroups/{id}`
     * - Subscription: `/subscriptions/{id}`
     * - Resource group: `/subscriptions/{id}/resourceGroups/{name}`
     * - Resource: Full resource ID
     *
     * @example
     * ```typescript
     * // Resource-level scope
     * scope: storageAccount.resourceId
     *
     * // Subscription-level scope
     * scope: '/subscriptions/12345678-1234-1234-1234-123456789abc'
     * ```
     */
    readonly scope: string;
    /**
     * Azure role definition ID.
     *
     * @remarks
     * Full resource ID of the role definition.
     * Format: `/subscriptions/{id}/providers/Microsoft.Authorization/roleDefinitions/{guid}`
     *
     * Use WellKnownRoleIds for built-in roles or provide custom role definition ID.
     *
     * @example
     * ```typescript
     * // Using WellKnownRoleIds
     * roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER
     *
     * // Custom role
     * roleDefinitionId: '/subscriptions/.../providers/Microsoft.Authorization/roleDefinitions/custom-role-guid'
     * ```
     */
    readonly roleDefinitionId: string;
    /**
     * Principal ID to assign the role to.
     *
     * @remarks
     * The object ID (GUID) of the identity in Azure AD.
     * - For managed identities: Use ARM reference expression
     * - For users/groups/service principals: Use their Azure AD object ID
     *
     * @example
     * ```typescript
     * // Dynamic reference to managed identity
     * principalId: `[reference(${vm.resourceId}).identity.principalId]`
     *
     * // Static principal ID
     * principalId: '12345678-1234-1234-1234-123456789abc'
     * ```
     */
    readonly principalId: string;
    /**
     * Type of the principal.
     *
     * @remarks
     * Determines how Azure interprets the principal ID.
     * Must match the actual type of the identity.
     *
     * @see {@link PrincipalType}
     */
    readonly principalType: PrincipalType;
    /**
     * Tenant ID for cross-tenant scenarios.
     *
     * @remarks
     * Required when assigning roles to identities from a different Azure AD tenant.
     * Defaults to the current deployment tenant if not specified.
     */
    readonly tenantId?: string;
    /**
     * Optional description for the assignment.
     *
     * @remarks
     * Helps document why the permission was granted.
     * Maximum length: 1024 characters.
     *
     * @example
     * ```typescript
     * description: 'VM needs read access to storage for application configs'
     * ```
     */
    readonly description?: string;
    /**
     * Optional ABAC condition that must be met for the role to be effective.
     *
     * @remarks
     * Azure ABAC (Attribute-Based Access Control) conditions allow fine-grained
     * access control based on resource attributes.
     *
     * **Important**: Not all roles support conditions. Only data plane roles support ABAC.
     *
     * @see {@link https://docs.microsoft.com/en-us/azure/role-based-access-control/conditions-format}
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
     * Currently only '2.0' is supported by Azure.
     * Required when condition is specified.
     *
     * @defaultValue '2.0'
     */
    readonly conditionVersion?: '2.0';
    /**
     * Whether to skip validation of the principal.
     *
     * @remarks
     * Set to true to allow role assignments to principals that don't exist yet
     * or that are not visible during validation.
     *
     * Use with caution - this bypasses Azure's principal existence check.
     *
     * @defaultValue false
     */
    readonly skipPrincipalValidation?: boolean;
}
/**
 * L1 construct for Azure role assignments.
 *
 * @remarks
 * Creates a Microsoft.Authorization/roleAssignments resource in the ARM template.
 * This is the low-level construct that provides direct ARM template mapping.
 *
 * **Key Features**:
 * - Deterministic GUID generation for idempotent deployments
 * - Direct ARM template property mapping
 * - Support for ABAC conditions
 * - Cross-tenant role assignment support
 *
 * **Usage Pattern**:
 * Use the L2 RoleAssignment construct for most scenarios. Use this L1 construct
 * when you need direct control over ARM template generation.
 *
 * @public
 *
 * @example
 * Basic role assignment:
 * ```typescript
 * const roleAssignment = new RoleAssignmentArm(stack, 'StorageReaderRole', {
 *   scope: storageAccount.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
 *   principalId: vm.principalId,
 *   principalType: PrincipalType.ManagedIdentity,
 *   description: 'VM needs read access to storage'
 * });
 * ```
 *
 * @example
 * With ABAC condition:
 * ```typescript
 * const roleAssignment = new RoleAssignmentArm(stack, 'ConditionalAccess', {
 *   scope: storageAccount.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR,
 *   principalId: app.principalId,
 *   principalType: PrincipalType.ManagedIdentity,
 *   condition: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'data'`,
 *   conditionVersion: '2.0'
 * });
 * ```
 */
export declare class RoleAssignmentArm extends Resource {
    readonly resourceType = "Microsoft.Authorization/roleAssignments";
    readonly apiVersion = "2022-04-01";
    readonly name: string;
    readonly resourceId: string;
    private readonly props;
    /**
     * Creates a new RoleAssignmentArm instance.
     *
     * @param scope - Parent construct
     * @param id - Unique construct ID
     * @param props - Role assignment properties
     */
    constructor(scope: Construct, id: string, props: RoleAssignmentArmProps);
    /**
     * Validates role assignment properties.
     *
     * @param props - Properties to validate
     * @throws {ValidationError} If validation fails
     *
     * @internal
     */
    protected validateProps(props: RoleAssignmentArmProps): void;
    /**
     * Transforms this role assignment to ARM template format.
     *
     * @returns ARM template resource object
     *
     * @example
     * Generated ARM template:
     * ```json
     * {
     *   "type": "Microsoft.Authorization/roleAssignments",
     *   "apiVersion": "2022-04-01",
     *   "scope": "/subscriptions/.../resourceGroups/.../providers/Microsoft.Storage/storageAccounts/myaccount",
     *   "name": "[guid('...', '...', '...')]",
     *   "properties": {
     *     "roleDefinitionId": "/subscriptions/.../providers/Microsoft.Authorization/roleDefinitions/...",
     *     "principalId": "[reference(...).identity.principalId]",
     *     "principalType": "ServicePrincipal",
     *     "description": "..."
     *   }
     * }
     * ```
     */
    toArmTemplate(): ArmResource;
    /**
     * Generates a deterministic GUID for the role assignment.
     *
     * @remarks
     * Using a deterministic GUID based on scope, role, and principal
     * ensures idempotent deployments. The same combination will always
     * generate the same GUID, preventing duplicate role assignments.
     *
     * **ARM guid() Function**:
     * The guid() function in ARM templates creates a deterministic GUID
     * from the input strings. We construct an ARM expression that will be
     * evaluated during deployment.
     *
     * @returns ARM expression that generates a GUID
     *
     * @internal
     *
     * @example
     * ```typescript
     * // Returns: "[guid('/subscriptions/.../storageAccounts/myaccount', 'role-id', 'principal-id')]"
     * ```
     */
    private generateAssignmentGuid;
}
//# sourceMappingURL=role-assignment-arm.d.ts.map