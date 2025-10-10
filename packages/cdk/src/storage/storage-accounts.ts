import { Construct } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import type { IGrantable, IGrantResult } from '@atakora/lib';
import { WellKnownRoleIds, RoleAssignment, GrantResult } from '@atakora/lib';
import { ArmStorageAccounts } from './storage-account-arm';
import type {
  StorageAccountsProps,
  IStorageAccount,
  StorageAccountSkuName,
  StorageAccountKind,
  AccessTier,
  TlsVersion,
  PublicNetworkAccess,
} from './storage-account-types';

/**
 * L2 construct for Azure Storage Account.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates storage account name (special handling: no hyphens, max 24 chars)
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Secure defaults: TLS 1.2, no public blob access, public network disabled
 *
 * **ARM Resource Type**: `Microsoft.Storage/storageAccounts`
 * **API Version**: `2025-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { StorageAccounts } from '@atakora/cdk/storage';
 *
 * const storage = new StorageAccounts(resourceGroup, 'DataStorage');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const storage = new StorageAccounts(resourceGroup, 'DataStorage', {
 *   sku: StorageAccountSkuName.STANDARD_GRS,
 *   accessTier: AccessTier.COOL,
 *   enableBlobPublicAccess: false
 * });
 * ```
 */
export class StorageAccounts extends Construct implements IStorageAccount {
  /**
   * Underlying L1 construct.
   */
  private readonly armStorageAccount: ArmStorageAccounts;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the storage account.
   */
  public readonly storageAccountName: string;

  /**
   * Location of the storage account.
   */
  public readonly location: string;

  /**
   * Resource group name where the storage account is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the storage account.
   */
  public readonly storageAccountId: string;

  /**
   * Tags applied to the storage account (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * SKU name.
   */
  public readonly sku: StorageAccountSkuName;

  /**
   * Storage account kind.
   */
  public readonly kind: StorageAccountKind;

  /**
   * Counter for generating unique grant IDs.
   */
  private grantCounter = 0;

  /**
   * Creates a new StorageAccounts construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - Optional storage account properties
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   *
   * @example
   * ```typescript
   * const storage = new StorageAccounts(resourceGroup, 'DataStorage', {
   *   sku: StorageAccountSkuName.STANDARD_GRS,
   *   tags: { purpose: 'data-storage' }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props?: StorageAccountsProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided storage account name
    this.storageAccountName = this.resolveStorageAccountName(id, props);

    // Default location to resource group's location or use provided
    this.location = props?.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Default SKU to Standard_LRS
    this.sku = props?.sku ?? ('Standard_LRS' as StorageAccountSkuName);

    // Default kind to StorageV2
    this.kind = props?.kind ?? ('StorageV2' as StorageAccountKind);

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Create underlying L1 resource
    this.armStorageAccount = new ArmStorageAccounts(scope, `${id}StorageAccount`, {
      storageAccountName: this.storageAccountName,
      location: this.location,
      sku: { name: this.sku },
      kind: this.kind,
      properties: {
        accessTier: props?.accessTier ?? ('Hot' as AccessTier),
        minimumTlsVersion: props?.minimumTlsVersion ?? ('TLS1_2' as TlsVersion),
        allowBlobPublicAccess: props?.enableBlobPublicAccess ?? false,
        supportsHttpsTrafficOnly: true,
        publicNetworkAccess: props?.publicNetworkAccess ?? ('Disabled' as PublicNetworkAccess),
        networkAcls: props?.networkAcls,
      },
      tags: this.tags,
    });

    // Get resource ID from L1
    this.storageAccountId = this.armStorageAccount.storageAccountId;
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'StorageAccounts must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  /**
   * Resolves the storage account name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Storage account properties
   * @returns Resolved storage account name
   *
   * @remarks
   * Storage account names have special constraints:
   * - 3-24 characters
   * - Lowercase alphanumeric only (NO HYPHENS)
   * - Globally unique across Azure
   *
   * New naming convention for global uniqueness:
   * - Format: sto<project><instance><8-char-hash>
   * - Hash is generated from full resource name to ensure uniqueness
   * - Example: stoauthr0312ab34cd
   */
  private resolveStorageAccountName(id: string, props?: StorageAccountsProps): string {
    // If name provided explicitly, use it
    if (props?.storageAccountName) {
      return props.storageAccountName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);

      // New format: sto<project><instance><hash>
      // Storage accounts don't allow hyphens, so no separators
      // Use NamingService for truly unique hash per synthesis
      const project = subscriptionStack.project.resourceName;
      const instance = subscriptionStack.instance.resourceName;
      const hash = subscriptionStack.namingService.getResourceHash(8);

      const generatedName = `sto${project}${instance}${hash}`.toLowerCase();

      // Ensure it fits within 24 characters
      if (generatedName.length > 24) {
        // Truncate project name if needed
        const maxProjectLen = 24 - 11; // 24 - (3 + 8) = 13 chars for project+instance
        const truncatedProject = project.substring(0, maxProjectLen);
        const truncatedInstance = instance.substring(0, Math.min(2, 24 - 3 - maxProjectLen - 8));
        return `sto${truncatedProject}${truncatedInstance}${hash}`.toLowerCase().substring(0, 24);
      }

      return generatedName;
    }

    // Fallback: construct a basic name from ID (no hyphens)
    const fallbackName = `sto${id.toLowerCase()}`.replace(/-/g, '');
    return fallbackName.substring(0, 24);
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }

  /**
   * Core grant method used by all resource-specific grant methods.
   *
   * @param grantable - Identity to grant permissions to
   * @param roleDefinitionId - Azure role definition resource ID
   * @param description - Optional description for the role assignment
   * @returns Grant result with the created role assignment
   *
   * @internal
   */
  protected grant(grantable: IGrantable, roleDefinitionId: string, description?: string): IGrantResult {
    // Create role assignment at this storage account's scope
    const roleAssignment = new RoleAssignment(this, `Grant${this.generateGrantId()}`, {
      scope: this.storageAccountId,
      roleDefinitionId,
      principalId: grantable.principalId,
      principalType: grantable.principalType,
      tenantId: grantable.tenantId,
      description,
    });

    // Return result for further configuration
    return new GrantResult(roleAssignment, roleDefinitionId, grantable, this.storageAccountId);
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
   * Grant read access to blob storage.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   *
   * @example
   * ```typescript
   * const storage = new StorageAccounts(stack, 'Storage', { ... });
   * const functionApp = new FunctionApp(stack, 'Function', { ... });
   * storage.grantBlobRead(functionApp);
   * ```
   */
  public grantBlobRead(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
      `Read access to blobs in ${this.storageAccountName}`
    );
  }

  /**
   * Grant write access to blob storage (includes read).
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantBlobWrite(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR,
      `Write access to blobs in ${this.storageAccountName}`
    );
  }

  /**
   * Grant full access to blob storage including POSIX ACLs.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantBlobFullAccess(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_BLOB_DATA_OWNER,
      `Full access to blobs in ${this.storageAccountName}`
    );
  }

  /**
   * Grant read access to table storage.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantTableRead(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_TABLE_DATA_READER,
      `Read access to tables in ${this.storageAccountName}`
    );
  }

  /**
   * Grant write access to table storage (includes read).
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantTableWrite(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_TABLE_DATA_CONTRIBUTOR,
      `Write access to tables in ${this.storageAccountName}`
    );
  }

  /**
   * Grant read access to queue storage.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantQueueRead(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_QUEUE_DATA_READER,
      `Read access to queues in ${this.storageAccountName}`
    );
  }

  /**
   * Grant message processing access to queue storage (read and delete).
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantQueueProcess(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_QUEUE_DATA_MESSAGE_PROCESSOR,
      `Process queue messages in ${this.storageAccountName}`
    );
  }

  /**
   * Grant message sending access to queue storage.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantQueueSend(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_QUEUE_DATA_MESSAGE_SENDER,
      `Send queue messages in ${this.storageAccountName}`
    );
  }

  /**
   * Grant read access to file shares.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantFileRead(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_FILE_DATA_SMB_SHARE_READER,
      `Read access to files in ${this.storageAccountName}`
    );
  }

  /**
   * Grant write access to file shares (includes read).
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantFileWrite(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_FILE_DATA_SMB_SHARE_CONTRIBUTOR,
      `Write access to files in ${this.storageAccountName}`
    );
  }
}
