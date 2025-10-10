/**
 * Azure RBAC - GrantableResource base class.
 *
 * @remarks
 * This module provides the base class for Azure resources that can grant permissions
 * to identities. It implements the IGrantable interface and provides infrastructure
 * for resource-specific grant methods.
 *
 * @packageDocumentation
 */

import { Resource, ResourceProps } from './resource';
import { Construct } from './construct';
import { IGrantable, PrincipalType, IGrantResult, MissingIdentityError } from './grants';
import { RoleAssignment } from '../authorization/role-assignment';
import { GrantResult } from '../authorization/grant-result';

/**
 * Managed identity types for Azure resources.
 *
 * @remarks
 * These values map to the `type` property in the Azure `identity` object.
 *
 * **ARM Template Format**:
 * ```json
 * {
 *   "identity": {
 *     "type": "SystemAssigned"
 *   }
 * }
 * ```
 *
 * @public
 */
export enum ManagedIdentityType {
  /**
   * No managed identity.
   *
   * @remarks
   * The resource does not have a managed identity configured.
   * Cannot be used as an IGrantable.
   */
  NONE = 'None',

  /**
   * System-assigned managed identity.
   *
   * @remarks
   * Lifecycle tied to the resource. When the resource is deleted,
   * the identity is automatically deleted.
   *
   * **Benefits**:
   * - Automatic lifecycle management
   * - No separate identity resource to manage
   * - Simpler for single-resource scenarios
   *
   * **Limitations**:
   * - Cannot be shared across resources
   * - Deleted when resource is deleted
   */
  SYSTEM_ASSIGNED = 'SystemAssigned',

  /**
   * User-assigned managed identity.
   *
   * @remarks
   * Independent lifecycle from resources. Can be assigned to multiple resources.
   *
   * **Benefits**:
   * - Can be shared across multiple resources
   * - Independent lifecycle
   * - Reusable across deployments
   *
   * **Use Cases**:
   * - Multiple resources need the same identity
   * - Identity needs to persist beyond resource lifecycle
   * - Cross-resource identity requirements
   */
  USER_ASSIGNED = 'UserAssigned',

  /**
   * Both system-assigned and user-assigned identities.
   *
   * @remarks
   * Resource has both a system-assigned identity and one or more user-assigned identities.
   */
  SYSTEM_ASSIGNED_USER_ASSIGNED = 'SystemAssigned,UserAssigned',
}

/**
 * Managed Service Identity configuration for Azure resources.
 *
 * @remarks
 * This interface represents the `identity` property on Azure resources.
 *
 * @public
 */
export interface ManagedServiceIdentity {
  /**
   * Type of managed identity.
   */
  readonly type: ManagedIdentityType;

  /**
   * User-assigned identities.
   *
   * @remarks
   * Map of user-assigned identity resource IDs to their configuration.
   * Only required when type includes USER_ASSIGNED.
   *
   * @example
   * ```typescript
   * {
   *   '/subscriptions/.../resourceGroups/.../providers/Microsoft.ManagedIdentity/userAssignedIdentities/myIdentity': {}
   * }
   * ```
   */
  readonly userAssignedIdentities?: Record<string, Record<string, unknown>>;
}

/**
 * Base class for Azure resources that can grant permissions.
 *
 * @remarks
 * Extends the base Resource class to add grant capabilities and optionally
 * act as an IGrantable if the resource has a managed identity.
 *
 * **Key Features**:
 * - Implements IGrantable for resources with managed identities
 * - Provides core `grant()` method for subclasses
 * - Auto-enables system-assigned identity when used as grantee
 * - Manages grant counter for unique IDs
 *
 * **Usage Pattern**:
 * Resources that support grant methods should extend this class instead of Resource:
 *
 * @public
 *
 * @example
 * Implementing a grantable resource:
 * ```typescript
 * export class StorageAccount extends GrantableResource {
 *   // ... resource implementation ...
 *
 *   public grantBlobRead(grantable: IGrantable): IGrantResult {
 *     return this.grant(
 *       grantable,
 *       WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
 *       `Read access to blobs in ${this.accountName}`
 *     );
 *   }
 *
 *   public grantBlobWrite(grantable: IGrantable): IGrantResult {
 *     return this.grant(
 *       grantable,
 *       WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR,
 *       `Write access to blobs in ${this.accountName}`
 *     );
 *   }
 * }
 * ```
 *
 * @example
 * Using a resource as both grantor and grantee:
 * ```typescript
 * const vm = new VirtualMachine(stack, 'VM', {
 *   // Identity will be auto-enabled when used as grantee
 * });
 *
 * const storage = new StorageAccount(stack, 'Storage', {});
 *
 * // VM receives blob read permission
 * // VM's system-assigned identity is automatically enabled
 * storage.grantBlobRead(vm);
 * ```
 */
export abstract class GrantableResource extends Resource implements IGrantable {
  /**
   * Managed identity configuration for this resource.
   *
   * @remarks
   * Protected to allow subclasses to initialize and manage identity.
   * When set, the resource can act as an IGrantable.
   *
   * @internal
   */
  protected identity?: ManagedServiceIdentity;

  /**
   * Counter for generating unique grant IDs.
   *
   * @remarks
   * Incremented each time a grant is created to ensure unique construct IDs.
   *
   * @internal
   */
  private grantCounter = 0;

  /**
   * Gets the principal ID for this resource's managed identity.
   *
   * @remarks
   * Returns an ARM reference that will be resolved at deployment time.
   * The reference uses the ARM `reference()` function to extract the principal ID
   * from the resource's identity property.
   *
   * **ARM Reference Format**:
   * `[reference(resourceId).identity.principalId]`
   *
   * This resolves during deployment to the actual GUID of the managed identity.
   *
   * **Requirements**:
   * - Resource must have a managed identity configured
   * - For system-assigned: Identity type must be SYSTEM_ASSIGNED or SYSTEM_ASSIGNED_USER_ASSIGNED
   * - For user-assigned: Use the UserAssignedIdentity construct directly instead
   *
   * @throws {MissingIdentityError} If resource has no managed identity
   * @throws {Error} If resource has only user-assigned identities
   *
   * @example
   * ```typescript
   * // When VM is used in a grant
   * storage.grantBlobRead(vm);
   *
   * // Internally generates ARM template:
   * {
   *   "type": "Microsoft.Authorization/roleAssignments",
   *   "properties": {
   *     "principalId": "[reference(resourceId('Microsoft.Compute/virtualMachines', 'vm-name')).identity.principalId]"
   *   }
   * }
   * ```
   */
  public get principalId(): string {
    if (!this.identity || this.identity.type === ManagedIdentityType.NONE) {
      throw new MissingIdentityError(this.node.id);
    }

    // For system-assigned identity, reference the principalId property
    if (
      this.identity.type === ManagedIdentityType.SYSTEM_ASSIGNED ||
      this.identity.type === ManagedIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED
    ) {
      // Return ARM reference expression
      // This will be resolved during deployment to the actual principal ID
      return `[reference(${this.resourceId}).identity.principalId]`;
    }

    // For user-assigned only, this resource cannot act as a grantable
    // User must use the UserAssignedIdentity construct directly
    throw new Error(
      `Resource '${this.node.id}' has only user-assigned identity. ` +
        `It cannot be used as a grantable directly. ` +
        `Use the UserAssignedIdentity construct as the grantee instead.`
    );
  }

  /**
   * Principal type for managed identities.
   *
   * @remarks
   * All managed identities use PrincipalType.ManagedIdentity (which maps to ServicePrincipal in ARM).
   */
  public readonly principalType = PrincipalType.ManagedIdentity;

  /**
   * Tenant ID (undefined for same-tenant scenarios).
   *
   * @remarks
   * Most scenarios don't require explicit tenant ID.
   * Only needed for cross-tenant role assignments.
   */
  public readonly tenantId?: string;

  /**
   * Core grant method used by all resource-specific grant methods.
   *
   * @remarks
   * This method creates a role assignment granting the specified role to the grantee
   * at this resource's scope.
   *
   * **Grant Process**:
   * 1. If grantable is this resource, auto-enable system-assigned identity
   * 2. Create RoleAssignment with appropriate properties
   * 3. Return GrantResult for further configuration or dependency management
   *
   * **Resource-Specific Grant Methods**:
   * Subclasses should create semantic grant methods that call this method:
   * - `grantBlobRead()` → calls `grant()` with STORAGE_BLOB_DATA_READER
   * - `grantSecretRead()` → calls `grant()` with KEY_VAULT_SECRETS_USER
   * - etc.
   *
   * @param grantable - Identity to grant permissions to
   * @param roleDefinitionId - Azure role definition resource ID (use WellKnownRoleIds)
   * @param description - Optional description for the role assignment
   * @returns Grant result with the created role assignment
   *
   * @internal
   *
   * @example
   * Implementing a grant method:
   * ```typescript
   * public grantBlobRead(grantable: IGrantable): IGrantResult {
   *   return this.grant(
   *     grantable,
   *     WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
   *     `Read access to blobs in ${this.storageAccountName}`
   *   );
   * }
   * ```
   *
   * @example
   * Self-grant (auto-enables identity):
   * ```typescript
   * // Grant this resource read access to storage
   * storageAccount.grantBlobRead(this);
   * // System-assigned identity is automatically enabled on 'this' resource
   * ```
   */
  protected grant(grantable: IGrantable, roleDefinitionId: string, description?: string): IGrantResult {
    // Auto-enable identity if granting to self
    if (grantable === this) {
      this.ensureIdentity();
    }

    // Create role assignment at this resource's scope
    const roleAssignment = new RoleAssignment(this, `Grant${this.generateGrantId()}`, {
      scope: this.resourceId,
      roleDefinitionId,
      principalId: grantable.principalId,
      principalType: grantable.principalType,
      tenantId: grantable.tenantId,
      description,
    });

    // Return result for further configuration
    return new GrantResult(roleAssignment, roleDefinitionId, grantable, this.resourceId);
  }

  /**
   * Generates a unique ID for each grant.
   *
   * @returns Sequential grant number as string
   *
   * @internal
   */
  private generateGrantId(): string {
    return `${this.grantCounter++}`;
  }

  /**
   * Ensures this resource has a managed identity.
   *
   * @remarks
   * Automatically called when the resource is used as a grantee.
   * If no identity is configured, enables system-assigned identity.
   *
   * **Behavior**:
   * - If identity is None or undefined: Enable system-assigned identity
   * - If identity already exists: No change
   * - Adds metadata note for transparency
   *
   * **Transparency**:
   * When identity is auto-enabled, a metadata note is added to the resource
   * indicating this was done automatically. This helps with debugging and
   * understanding infrastructure changes.
   *
   * @internal
   *
   * @example
   * Usage (internal):
   * ```typescript
   * protected grant(grantable: IGrantable, ...): IGrantResult {
   *   if (grantable === this) {
   *     this.ensureIdentity(); // Auto-enable if needed
   *   }
   *   // ... create role assignment
   * }
   * ```
   */
  protected ensureIdentity(): void {
    if (!this.identity || this.identity.type === ManagedIdentityType.NONE) {
      // Enable system-assigned identity
      this.identity = {
        type: ManagedIdentityType.SYSTEM_ASSIGNED,
      };

      // Add metadata for transparency
      // This helps developers understand that identity was auto-enabled
      this.node.addMetadata(
        'AutoEnabledIdentity',
        'System-assigned managed identity was automatically enabled because this resource is used as a grantee in a grant operation'
      );
    }
  }
}
