import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmStorageAccountsProps, StorageAccountSku, StorageAccountKind, AccessTier, TlsVersion, PublicNetworkAccess, NetworkAcls } from './storage-account-types';
/**
 * L1 construct for Azure Storage Account.
 *
 * @remarks
 * Direct mapping to Microsoft.Storage/storageAccounts ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Storage/storageAccounts`
 * **API Version**: `2025-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link StorageAccounts} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmStorageAccounts, StorageAccountSkuName, StorageAccountKind } from '@atakora/cdk/storage';
 *
 * const storage = new ArmStorageAccounts(resourceGroup, 'Storage', {
 *   storageAccountName: 'stgauthr001',
 *   location: 'eastus',
 *   sku: { name: StorageAccountSkuName.STANDARD_LRS },
 *   kind: StorageAccountKind.STORAGE_V2
 * });
 * ```
 */
export declare class ArmStorageAccounts extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for storage accounts.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the storage account.
     */
    readonly storageAccountName: string;
    /**
     * Resource name (same as storageAccountName).
     */
    readonly name: string;
    /**
     * Azure region where the storage account is located.
     */
    readonly location: string;
    /**
     * SKU configuration.
     */
    readonly sku: StorageAccountSku;
    /**
     * Storage account kind.
     */
    readonly kind: StorageAccountKind;
    /**
     * Access tier.
     */
    readonly accessTier?: AccessTier;
    /**
     * Minimum TLS version.
     */
    readonly minimumTlsVersion?: TlsVersion;
    /**
     * Allow blob public access.
     */
    readonly allowBlobPublicAccess?: boolean;
    /**
     * Supports HTTPS traffic only.
     */
    readonly supportsHttpsTrafficOnly?: boolean;
    /**
     * Public network access setting.
     */
    readonly publicNetworkAccess?: PublicNetworkAccess;
    /**
     * Network ACL configuration.
     */
    readonly networkAcls?: NetworkAcls;
    /**
     * Tags applied to the storage account.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/{storageAccountName}`
     */
    readonly resourceId: string;
    /**
     * Storage account resource ID (alias for resourceId).
     */
    readonly storageAccountId: string;
    /**
     * Creates a new ArmStorageAccounts construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Storage account properties
     *
     * @throws {Error} If storageAccountName is invalid
     * @throws {Error} If location is empty
     * @throws {Error} If SKU or kind is not provided
     */
    constructor(scope: Construct, id: string, props: ArmStorageAccountsProps);
    /**
     * Validates storage account properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmStorageAccountsProps): void;
    /**
     * Validates ARM template structure before transformation.
     *
     * @remarks
     * This validates the ARM-specific structure requirements that must be met
     * after the toArmTemplate transformation.
     *
     * @returns Validation result with any errors or warnings
     */
    validateArmStructure(): ValidationResult;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=storage-account-arm.d.ts.map