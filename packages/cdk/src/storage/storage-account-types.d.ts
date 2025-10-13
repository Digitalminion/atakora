/**
 * Type definitions for Storage Account constructs.
 *
 * @packageDocumentation
 */
import { schema } from '@atakora/lib';
/**
 * SKU name for storage account.
 */
export declare const StorageAccountSkuName: typeof schema.storage.StorageAccountSkuName;
export type StorageAccountSkuName = typeof StorageAccountSkuName[keyof typeof StorageAccountSkuName];
/**
 * Storage account kind.
 */
export declare const StorageAccountKind: typeof schema.storage.StorageAccountKind;
export type StorageAccountKind = typeof StorageAccountKind[keyof typeof StorageAccountKind];
/**
 * Access tier for storage account.
 */
export declare const AccessTier: typeof schema.storage.AccessTier;
export type AccessTier = typeof AccessTier[keyof typeof AccessTier];
/**
 * Minimum TLS version.
 */
export declare const TlsVersion: typeof schema.storage.TlsVersion;
export type TlsVersion = typeof TlsVersion[keyof typeof TlsVersion];
/**
 * Public network access setting.
 */
export declare const PublicNetworkAccess: typeof schema.storage.PublicNetworkAccess;
export type PublicNetworkAccess = typeof PublicNetworkAccess[keyof typeof PublicNetworkAccess];
/**
 * Network ACL default action.
 */
export declare const NetworkAclDefaultAction: typeof schema.storage.NetworkAclDefaultAction;
export type NetworkAclDefaultAction = typeof NetworkAclDefaultAction[keyof typeof NetworkAclDefaultAction];
/**
 * Network ACL bypass setting.
 */
export declare const NetworkAclBypass: typeof schema.storage.NetworkAclBypass;
export type NetworkAclBypass = typeof NetworkAclBypass[keyof typeof NetworkAclBypass];
/**
 * SKU configuration.
 */
export interface StorageAccountSku {
    /**
     * SKU name.
     */
    readonly name: StorageAccountSkuName;
}
/**
 * Network ACL configuration.
 */
export interface NetworkAcls {
    /**
     * Traffic bypass configuration.
     */
    readonly bypass?: NetworkAclBypass;
    /**
     * Default action when no rule matches.
     */
    readonly defaultAction: NetworkAclDefaultAction;
    /**
     * IP ACL rules.
     */
    readonly ipRules?: Array<{
        readonly value: string;
    }>;
    /**
     * Virtual network rules.
     */
    readonly virtualNetworkRules?: Array<{
        readonly id: string;
    }>;
}
/**
 * Properties for ArmStorageAccounts (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Storage/storageAccounts ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2025-01-01
 *
 * @example
 * ```typescript
 * const props: ArmStorageAccountsProps = {
 *   storageAccountName: 'stgauthr001',
 *   location: 'eastus',
 *   sku: { name: StorageAccountSkuName.STANDARD_LRS },
 *   kind: StorageAccountKind.STORAGE_V2,
 *   properties: {
 *     accessTier: AccessTier.HOT,
 *     minimumTlsVersion: TlsVersion.TLS1_2,
 *     allowBlobPublicAccess: false,
 *     supportsHttpsTrafficOnly: true
 *   }
 * };
 * ```
 */
export interface ArmStorageAccountsProps {
    /**
     * Storage account name.
     *
     * @remarks
     * - Must be 3-24 characters
     * - Lowercase alphanumeric only (no hyphens or special characters)
     * - Must be globally unique across Azure
     * - Pattern: ^[a-z0-9]{3,24}$
     */
    readonly storageAccountName: string;
    /**
     * Azure region where the storage account will be created.
     */
    readonly location: string;
    /**
     * SKU configuration (required).
     */
    readonly sku: StorageAccountSku;
    /**
     * Kind of storage account (required).
     */
    readonly kind: StorageAccountKind;
    /**
     * Storage account properties.
     */
    readonly properties?: {
        /**
         * Access tier (Hot, Cool, Premium, Cold).
         *
         * @remarks
         * Required for BlobStorage kind.
         */
        readonly accessTier?: AccessTier;
        /**
         * Minimum TLS version for requests.
         */
        readonly minimumTlsVersion?: TlsVersion;
        /**
         * Allow or disallow public access to blobs/containers.
         */
        readonly allowBlobPublicAccess?: boolean;
        /**
         * Only allow HTTPS traffic.
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
    };
    /**
     * Tags to apply to the storage account.
     */
    readonly tags?: Record<string, string>;
}
/**
 * Properties for StorageAccounts (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const storage = new StorageAccounts(resourceGroup, 'DataStorage');
 *
 * // With custom properties
 * const storage = new StorageAccounts(resourceGroup, 'DataStorage', {
 *   sku: StorageAccountSkuName.STANDARD_GRS,
 *   accessTier: AccessTier.COOL,
 *   enableBlobPublicAccess: false
 * });
 * ```
 */
export interface StorageAccountsProps {
    /**
     * Storage account name.
     *
     * @remarks
     * If not provided, will be auto-generated using the stack's naming context.
     * Special handling: no hyphens, lowercase only, max 24 chars.
     * - Format: `st{org}{project}{purpose}{env}{geo}{instance}`
     * - Example: `stdpauthrdatanpeus01`
     *
     * The `purpose` is derived from the construct ID.
     */
    readonly storageAccountName?: string;
    /**
     * Azure region where the storage account will be created.
     *
     * @remarks
     * If not provided, defaults to the parent resource group's location.
     */
    readonly location?: string;
    /**
     * SKU name.
     *
     * @remarks
     * Defaults to Standard_LRS.
     */
    readonly sku?: StorageAccountSkuName;
    /**
     * Storage account kind.
     *
     * @remarks
     * Defaults to StorageV2.
     */
    readonly kind?: StorageAccountKind;
    /**
     * Access tier.
     *
     * @remarks
     * Defaults to Hot.
     */
    readonly accessTier?: AccessTier;
    /**
     * Minimum TLS version.
     *
     * @remarks
     * Defaults to TLS1_2.
     */
    readonly minimumTlsVersion?: TlsVersion;
    /**
     * Allow or disallow public access to blobs/containers.
     *
     * @remarks
     * Defaults to false (disabled) for security.
     */
    readonly enableBlobPublicAccess?: boolean;
    /**
     * Public network access setting.
     *
     * @remarks
     * Defaults to Disabled for AuthR security pattern.
     */
    readonly publicNetworkAccess?: PublicNetworkAccess;
    /**
     * Network ACL configuration.
     */
    readonly networkAcls?: NetworkAcls;
    /**
     * Tags to apply to the storage account.
     *
     * @remarks
     * These tags will be merged with the parent's tags.
     */
    readonly tags?: Record<string, string>;
}
/**
 * Interface for Storage Account reference.
 *
 * @remarks
 * Allows resources to reference a storage account without depending on the construct class.
 */
export interface IStorageAccount {
    /**
     * Name of the storage account.
     */
    readonly storageAccountName: string;
    /**
     * Location of the storage account.
     */
    readonly location: string;
    /**
     * Resource ID of the storage account.
     */
    readonly storageAccountId: string;
}
//# sourceMappingURL=storage-account-types.d.ts.map