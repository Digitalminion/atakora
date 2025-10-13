/**
 * Subscription-level role assignment types.
 *
 * @packageDocumentation
 */
import { PrincipalType, schema } from '@atakora/lib';
/**
 * Properties for subscription-level role assignments.
 *
 * @remarks
 * Designed for granting human users and groups access to subscriptions or resource groups.
 * Different from resource-scoped role assignments which are typically for managed identities.
 *
 * @public
 */
export interface SubscriptionRoleAssignmentProps {
    /**
     * Azure AD principal ID (object ID) to grant access to.
     *
     * @remarks
     * This is the Azure AD object ID of the user, group, or service principal.
     * **Important**: Use the **Object ID**, not Application ID or User Principal Name.
     *
     * **Finding Object IDs**:
     * - Azure Portal: Azure Active Directory → Users/Groups → Select entity → Object ID
     * - Azure CLI: `az ad user show --id user@domain.com --query id -o tsv`
     * - PowerShell: `(Get-AzADUser -UserPrincipalName user@domain.com).Id`
     *
     * @example
     * ```typescript
     * // Azure AD group object ID
     * principalId: '12345678-1234-1234-1234-123456789abc'
     * ```
     */
    readonly principalId: string;
    /**
     * Type of principal receiving the role.
     *
     * @remarks
     * Must match the actual type of the identity in Azure AD.
     *
     * **Common Values**:
     * - `PrincipalType.Group` - Azure AD group
     * - `PrincipalType.User` - Azure AD user
     * - `PrincipalType.ServicePrincipal` - Service principal (application)
     *
     * @see {@link PrincipalType}
     */
    readonly principalType: PrincipalType;
    /**
     * Azure role definition ID.
     *
     * @remarks
     * Use `WellKnownRoleIds` for built-in roles or provide custom role definition ID.
     *
     * **Common Roles**:
     * - `WellKnownRoleIds.OWNER` - Full access including role assignment
     * - `WellKnownRoleIds.CONTRIBUTOR` - Manage resources but not access
     * - `WellKnownRoleIds.READER` - Read-only access
     * - `WellKnownRoleIds.USER_ACCESS_ADMINISTRATOR` - Manage user access only
     *
     * @example
     * ```typescript
     * import { WellKnownRoleIds } from '@atakora/lib';
     *
     * roleDefinitionId: WellKnownRoleIds.CONTRIBUTOR
     * ```
     */
    readonly roleDefinitionId: string;
    /**
     * Optional description of why this access was granted.
     *
     * @remarks
     * **Best Practice**: Always include a description for audit and governance purposes.
     * Maximum 1024 characters.
     *
     * @example
     * ```typescript
     * description: 'Platform team requires contributor access to manage infrastructure in non-prod subscription'
     * ```
     */
    readonly description?: string;
    /**
     * Tenant ID for cross-tenant scenarios.
     *
     * @remarks
     * Only required when granting access to identities from a different Azure AD tenant.
     * Defaults to the current tenant.
     *
     * **Cross-Tenant Use Cases**:
     * - Partner organizations accessing shared resources
     * - Managed service providers
     * - Federated identity scenarios
     *
     * @example
     * ```typescript
     * tenantId: '87654321-4321-4321-4321-210987654321'
     * ```
     */
    readonly tenantId?: string;
    /**
     * Azure ABAC condition for fine-grained access control.
     *
     * @remarks
     * **Important**: ABAC conditions are only supported on data plane roles.
     * Control plane roles (Owner, Contributor, Reader) do not support conditions.
     *
     * @see {@link https://learn.microsoft.com/en-us/azure/role-based-access-control/conditions-format}
     *
     * @example
     * ```typescript
     * // Only allow access to resources with specific tags
     * condition: `@Resource[Microsoft.Storage/storageAccounts:tags] StringEquals 'env:dev'`
     * ```
     */
    readonly condition?: string;
    /**
     * Condition version.
     *
     * @remarks
     * Required when condition is specified. Currently only '2.0' is supported.
     *
     * @defaultValue '2.0'
     */
    readonly conditionVersion?: '2.0';
}
/**
 * Scope for subscription-level role assignments.
 *
 * @public
 */
export declare const RoleAssignmentScope: typeof schema.authorization.RoleAssignmentScope;
export type RoleAssignmentScope = typeof RoleAssignmentScope[keyof typeof RoleAssignmentScope];
//# sourceMappingURL=subscription-role-assignment-types.d.ts.map