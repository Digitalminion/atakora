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
export class UserAssignedIdentity extends Resource implements IUserAssignedIdentity {
  /**
   * ARM resource type.
   */
  public readonly resourceType = 'Microsoft.ManagedIdentity/userAssignedIdentities';

  /**
   * API version for the resource.
   */
  public readonly apiVersion = '2023-01-31';

  /**
   * Name of the resource (same as identityName).
   */
  public readonly name: string;

  /**
   * Full resource ID.
   */
  public readonly resourceId: string;

  /**
   * Name of the identity.
   */
  public readonly identityName: string;

  /**
   * Full resource ID (alias for resourceId).
   */
  public readonly identityId: string;

  /**
   * Principal type for RBAC assignments.
   *
   * @remarks
   * User-assigned identities are ServicePrincipal type in Azure AD.
   */
  public readonly principalType = PrincipalType.ManagedIdentity;

  /**
   * Tenant ID (undefined for same-tenant scenarios).
   */
  public readonly tenantId?: string;

  /**
   * Location where the identity is deployed.
   */
  public readonly location: string;

  /**
   * Resource tags.
   */
  public readonly tags?: Record<string, string>;

  /**
   * Internal properties storage.
   */
  private readonly props: UserAssignedIdentityProps;

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
  constructor(scope: Construct, id: string, props: UserAssignedIdentityProps) {
    super(scope, id, props);
    this.validateProps(props);

    this.props = props;
    this.identityName = props.identityName;
    this.name = props.identityName;
    this.location = props.location || this.getDefaultLocation();
    this.tags = props.tags;

    // Construct resource ID
    // Note: {subscriptionId} and {resourceGroupName} will be resolved during synthesis
    this.resourceId = `[resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', '${this.name}')]`;
    this.identityId = this.resourceId;
  }

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
  public get principalId(): string {
    return `[reference(${this.resourceId}).principalId]`;
  }

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
  public get clientId(): string {
    return `[reference(${this.resourceId}).clientId]`;
  }

  /**
   * Validates constructor properties.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   *
   * @internal
   */
  protected validateProps(props: UserAssignedIdentityProps): void {
    if (!props.identityName || props.identityName.trim() === '') {
      throw new Error(
        'UserAssignedIdentity requires an identityName. ' +
          'Provide a valid name (3-128 characters, alphanumerics, hyphens, underscores).'
      );
    }

    // Validate identity name format
    const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
    if (!namePattern.test(props.identityName)) {
      throw new Error(
        `Invalid identityName '${props.identityName}'. ` +
          'Name must start with a letter or number and contain only alphanumerics, hyphens, and underscores.'
      );
    }

    if (props.identityName.length < 3 || props.identityName.length > 128) {
      throw new Error(
        `Invalid identityName '${props.identityName}'. ` +
          'Name must be between 3 and 128 characters.'
      );
    }
  }

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
  public toArmTemplate(): ArmResource {
    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      location: this.location,
      tags: this.tags || {},
    };
  }

  /**
   * Gets default location from parent scope.
   *
   * @returns Default location or 'eastus' if not found
   *
   * @internal
   */
  private getDefaultLocation(): string {
    // Try to get location from parent
    let current: Construct | undefined = this.node.scope;

    while (current) {
      const parent = current as any;
      if (parent && typeof parent.location === 'string') {
        return parent.location;
      }
      current = current.node.scope;
    }

    // Fallback to eastus
    return 'eastus';
  }

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
  public static fromIdentityName(
    scope: Construct,
    id: string,
    identityName: string,
    resourceGroupName?: string
  ): IUserAssignedIdentity {
    // Determine resource group name
    let rgName = resourceGroupName;
    if (!rgName) {
      // Try to get from parent scope
      let current: Construct | undefined = scope;
      while (current) {
        const parent = current as any;
        if (parent && typeof parent.resourceGroupName === 'string') {
          rgName = parent.resourceGroupName;
          break;
        }
        current = current.node.scope;
      }
    }

    const identityId = `[resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', '${identityName}')]`;
    const principalId = `[reference(${identityId}).principalId]`;
    const clientId = `[reference(${identityId}).clientId]`;

    return {
      identityName,
      identityId,
      principalId,
      clientId,
      principalType: PrincipalType.ManagedIdentity,
      tenantId: undefined,
    };
  }

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
  public static fromIdentityId(
    scope: Construct,
    id: string,
    identityId: string
  ): IUserAssignedIdentity {
    // Extract identity name from resource ID
    const match = identityId.match(/\/userAssignedIdentities\/([^\/]+)$/);
    const identityName = match ? match[1] : 'imported-identity';

    const principalId = `[reference('${identityId}', '2023-01-31').principalId]`;
    const clientId = `[reference('${identityId}', '2023-01-31').clientId]`;

    return {
      identityName,
      identityId,
      principalId,
      clientId,
      principalType: PrincipalType.ManagedIdentity,
      tenantId: undefined,
    };
  }
}
