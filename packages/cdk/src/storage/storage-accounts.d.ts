import { Construct } from '@atakora/cdk';
import type { IGrantable, IGrantResult } from '@atakora/lib';
import type { StorageAccountsProps, IStorageAccount, StorageAccountSkuName, StorageAccountKind } from './storage-account-types';
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
export declare class StorageAccounts extends Construct implements IStorageAccount {
    /**
     * Underlying L1 construct.
     */
    private readonly armStorageAccount;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the storage account.
     */
    readonly storageAccountName: string;
    /**
     * Location of the storage account.
     */
    readonly location: string;
    /**
     * Resource group name where the storage account is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the storage account.
     */
    readonly storageAccountId: string;
    /**
     * Tags applied to the storage account (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * SKU name.
     */
    readonly sku: StorageAccountSkuName;
    /**
     * Storage account kind.
     */
    readonly kind: StorageAccountKind;
    /**
     * Counter for generating unique grant IDs.
     */
    private grantCounter;
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
    constructor(scope: Construct, id: string, props?: StorageAccountsProps);
    /**
     * Gets the parent ResourceGroup from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The resource group interface
     * @throws {Error} If parent is not or doesn't contain a ResourceGroup
     */
    private getParentResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroup properties
     */
    private isResourceGroup;
    /**
     * Gets tags from parent construct hierarchy.
     *
     * @param scope - Parent construct
     * @returns Tags object (empty if no tags found)
     */
    private getParentTags;
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
    private resolveStorageAccountName;
    /**
     * Gets the SubscriptionStack from the construct tree.
     *
     * @returns SubscriptionStack or undefined if not found
     */
    private getSubscriptionStack;
    /**
     * Converts construct ID to purpose identifier for naming.
     *
     * @param id - Construct ID
     * @returns Purpose string for naming
     */
    private constructIdToPurpose;
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
    protected grant(grantable: IGrantable, roleDefinitionId: string, description?: string): IGrantResult;
    /**
     * Generates a unique ID for each grant.
     *
     * @returns Sequential grant number as string
     *
     * @internal
     */
    private generateGrantId;
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
    grantBlobRead(grantable: IGrantable): IGrantResult;
    /**
     * Grant write access to blob storage (includes read).
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     */
    grantBlobWrite(grantable: IGrantable): IGrantResult;
    /**
     * Grant full access to blob storage including POSIX ACLs.
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     */
    grantBlobFullAccess(grantable: IGrantable): IGrantResult;
    /**
     * Grant read access to table storage.
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     */
    grantTableRead(grantable: IGrantable): IGrantResult;
    /**
     * Grant write access to table storage (includes read).
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     */
    grantTableWrite(grantable: IGrantable): IGrantResult;
    /**
     * Grant read access to queue storage.
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     */
    grantQueueRead(grantable: IGrantable): IGrantResult;
    /**
     * Grant message processing access to queue storage (read and delete).
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     */
    grantQueueProcess(grantable: IGrantable): IGrantResult;
    /**
     * Grant message sending access to queue storage.
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     */
    grantQueueSend(grantable: IGrantable): IGrantResult;
    /**
     * Grant read access to file shares.
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     */
    grantFileRead(grantable: IGrantable): IGrantResult;
    /**
     * Grant write access to file shares (includes read).
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     */
    grantFileWrite(grantable: IGrantable): IGrantResult;
}
//# sourceMappingURL=storage-accounts.d.ts.map