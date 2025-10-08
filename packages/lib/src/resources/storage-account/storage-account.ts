import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmStorageAccount } from './arm-storage-account';
import type {
  StorageAccountProps,
  IStorageAccount,
  StorageAccountSkuName,
  StorageAccountKind,
  AccessTier,
  TlsVersion,
  PublicNetworkAccess,
} from './types';

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
 * import { StorageAccount } from '@atakora/lib';
 *
 * const storage = new StorageAccount(resourceGroup, 'DataStorage');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const storage = new StorageAccount(resourceGroup, 'DataStorage', {
 *   sku: StorageAccountSkuName.STANDARD_GRS,
 *   accessTier: AccessTier.COOL,
 *   enableBlobPublicAccess: false
 * });
 * ```
 */
export class StorageAccount extends Construct implements IStorageAccount {
  /**
   * Underlying L1 construct.
   */
  private readonly armStorageAccount: ArmStorageAccount;

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
   * Creates a new StorageAccount construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - Optional storage account properties
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   *
   * @example
   * ```typescript
   * const storage = new StorageAccount(resourceGroup, 'DataStorage', {
   *   sku: StorageAccountSkuName.STANDARD_GRS,
   *   tags: { purpose: 'data-storage' }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props?: StorageAccountProps) {
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
    this.armStorageAccount = new ArmStorageAccount(scope, `${id}-Resource`, {
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
      'StorageAccount must be created within or under a ResourceGroup. ' +
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
   * - Example: stocolorai0312ab34cd
   */
  private resolveStorageAccountName(id: string, props?: StorageAccountProps): string {
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
}
