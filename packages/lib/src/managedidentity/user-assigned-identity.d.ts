/**
 * Azure Managed Identity - User-Assigned Identity construct.
 *
 * @remarks
 * This module provides the UserAssignedIdentity construct, which represents
 * a user-assigned managed identity that can be assigned to multiple Azure resources
 * and used as a grantable identity in the RBAC grant pattern.
 *
 * @packageDocumentation
 */
import { Resource, ResourceProps, ArmResource } from '../core/resource';
import { Construct } from '../core/construct';
import { IGrantable, PrincipalType } from '../core/grants';
/**
 * Properties for creating a user-assigned managed identity.
 *
 * @public
 */
export interface UserAssignedIdentityProps extends ResourceProps {
    /**
     * Name of the user-assigned identity.
     *
     * @remarks
     * Must be unique within the resource group.
     * - Length: 3-128 characters
     * - Allowed characters: alphanumerics, hyphens, and underscores
     * - Must start with a letter or number
     *
     * @example "app-identity"
     * @example "vm-managed-identity-01"
     */
    readonly identityName: string;
}
/**
 * Interface for user-assigned managed identity resources.
 *
 * @remarks
 * Enables cross-resource references and resource imports.
 *
 * @public
 */
export interface IUserAssignedIdentity extends IGrantable {
    /**
     * Name of the identity.
     */
    readonly identityName: string;
    /**
     * Full resource ID of the identity.
     *
     * @remarks
     * Format: `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/{name}`
     */
    readonly identityId: string;
    /**
     * Client ID of the identity.
     *
     * @remarks
     * This is the application ID associated with the managed identity.
     * Resolved at deployment time via ARM reference expression.
     */
    readonly clientId: string;
}
/**
 * User-assigned managed identity resource.
 *
 * @remarks
 * A user-assigned managed identity is an Azure resource that can be assigned
 * to multiple resources (VMs, Function Apps, etc.) and used to authenticate
 * to Azure services without storing credentials in code.
 *
 * **Key Features**:
 * - Implements IGrantable for use in grant methods
 * - Can be assigned to multiple resources
 * - Independent lifecycle from resources
 * - Reusable across deployments
 *
 * **ARM Resource Type**: `Microsoft.ManagedIdentity/userAssignedIdentities`
 * **API Version**: `2023-01-31`
 *
 * @public
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { UserAssignedIdentity } from '@atakora/lib/managedidentity';
 *
 * const identity = new UserAssignedIdentity(resourceGroup, 'AppIdentity', {
 *   identityName: 'app-identity',
 *   location: 'eastus'
 * });
 *
 * // Use as grantee
 * storageAccount.grantBlobRead(identity);
 * ```
 *
 * @example
 * Assign to multiple resources:
 * ```typescript
 * const sharedIdentity = new UserAssignedIdentity(rg, 'SharedIdentity', {
 *   identityName: 'shared-identity',
 *   location: 'eastus'
 * });
 *
 * // Assign to Function App
 * const functionApp = new FunctionApp(rg, 'Api', {
 *   plan: plan,
 *   storageAccount: storage,
 *   identity: createUserAssignedIdentity([sharedIdentity.identityId])
 * });
 *
 * // Assign to VM
 * const vm = new VirtualMachine(rg, 'VM', {
 *   identity: createUserAssignedIdentity([sharedIdentity.identityId])
 * });
 *
 * // Grant permissions to the shared identity
 * keyVault.grantSecretRead(sharedIdentity);
 * ```
 *
 * @example
 * Import existing identity:
 * ```typescript
 * const existingIdentity = UserAssignedIdentity.fromIdentityName(
 *   scope,
 *   'ExistingIdentity',
 *   'my-existing-identity'
 * );
 * ```
 */
export declare class UserAssignedIdentity extends Resource implements IUserAssignedIdentity {
    /**
     * ARM resource type.
     */
    readonly resourceType = "Microsoft.ManagedIdentity/userAssignedIdentities";
    /**
     * API version for the resource.
     */
    readonly apiVersion = "2023-01-31";
    /**
     * Name of the resource (same as identityName).
     */
    readonly name: string;
    /**
     * Full resource ID.
     */
    readonly resourceId: string;
    /**
     * Name of the identity.
     */
    readonly identityName: string;
    /**
     * Full resource ID (alias for resourceId).
     */
    readonly identityId: string;
    /**
     * Principal type for RBAC assignments.
     *
     * @remarks
     * User-assigned identities are ServicePrincipal type in Azure AD.
     */
    readonly principalType = PrincipalType.ServicePrincipal;
    /**
     * Tenant ID (undefined for same-tenant scenarios).
     */
    readonly tenantId?: string;
    /**
     * Location where the identity is deployed.
     */
    readonly location: string;
    /**
     * Resource tags.
     */
    readonly tags?: Record<string, string>;
    /**
     * Internal properties storage.
     */
    private readonly props;
    /**
     * Creates a new UserAssignedIdentity construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - User-assigned identity properties
     *
     * @throws {Error} If identityName is not provided or invalid
     *
     * @example
     * ```typescript
     * const identity = new UserAssignedIdentity(resourceGroup, 'AppIdentity', {
     *   identityName: 'app-identity',
     *   location: 'eastus',
     *   tags: { environment: 'production' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props: UserAssignedIdentityProps);
    /**
     * Gets the principal ID for this user-assigned identity.
     *
     * @remarks
     * Returns an ARM reference expression that resolves at deployment time
     * to the actual principal ID (object ID) of the managed identity.
     *
     * **ARM Reference Format**:
     * `[reference(resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', 'name')).principalId]`
     *
     * This value is used in role assignments to grant permissions to the identity.
     *
     * @example
     * ```typescript
     * const identity = new UserAssignedIdentity(rg, 'Identity', {
     *   identityName: 'my-identity'
     * });
     *
     * // principalId is used internally by grant methods
     * console.log(identity.principalId);
     * // Output: "[reference(resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', 'my-identity')).principalId]"
     * ```
     */
    get principalId(): string;
    /**
     * Gets the client ID for this user-assigned identity.
     *
     * @remarks
     * Returns an ARM reference expression that resolves at deployment time
     * to the client ID (application ID) of the managed identity.
     *
     * The client ID is used when configuring resources to use this identity.
     *
     * @example
     * ```typescript
     * const identity = new UserAssignedIdentity(rg, 'Identity', {
     *   identityName: 'my-identity'
     * });
     *
     * console.log(identity.clientId);
     * // Output: "[reference(resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', 'my-identity')).clientId]"
     * ```
     */
    get clientId(): string;
    /**
     * Validates constructor properties.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     *
     * @internal
     */
    protected validateProps(props: UserAssignedIdentityProps): void;
    /**
     * Transforms this resource to ARM template JSON representation.
     *
     * @returns ARM template resource object
     *
     * @example
     * Generated ARM template:
     * ```json
     * {
     *   "type": "Microsoft.ManagedIdentity/userAssignedIdentities",
     *   "apiVersion": "2023-01-31",
     *   "name": "app-identity",
     *   "location": "eastus",
     *   "tags": {
     *     "environment": "production"
     *   }
     * }
     * ```
     */
    toArmTemplate(): ArmResource;
    /**
     * Gets default location from parent scope.
     *
     * @returns Default location or 'eastus' if not found
     *
     * @internal
     */
    private getDefaultLocation;
    /**
     * Imports an existing user-assigned identity by name.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for the imported construct
     * @param identityName - Name of the existing identity
     * @param resourceGroupName - Optional resource group name (defaults to parent's RG)
     * @returns User-assigned identity interface
     *
     * @remarks
     * Use this method to reference an existing user-assigned identity that was
     * created outside of this CDK application.
     *
     * @example
     * ```typescript
     * const existingIdentity = UserAssignedIdentity.fromIdentityName(
     *   scope,
     *   'ExistingIdentity',
     *   'my-existing-identity'
     * );
     *
     * // Use in grants
     * storageAccount.grantBlobRead(existingIdentity);
     * ```
     */
    static fromIdentityName(scope: Construct, id: string, identityName: string, resourceGroupName?: string): IUserAssignedIdentity;
    /**
     * Imports an existing user-assigned identity by resource ID.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for the imported construct
     * @param identityId - Full resource ID of the identity
     * @returns User-assigned identity interface
     *
     * @remarks
     * Use this method when you have the full resource ID of an existing identity.
     *
     * @example
     * ```typescript
     * const existingIdentity = UserAssignedIdentity.fromIdentityId(
     *   scope,
     *   'ExistingIdentity',
     *   '/subscriptions/12345/resourceGroups/my-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/my-identity'
     * );
     * ```
     */
    static fromIdentityId(scope: Construct, id: string, identityId: string): IUserAssignedIdentity;
}
//# sourceMappingURL=user-assigned-identity.d.ts.map