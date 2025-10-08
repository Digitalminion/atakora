/**
 * Type definitions for Storage Account constructs.
 *
 * @packageDocumentation
 */

/**
 * SKU name for storage account.
 */
export enum StorageAccountSkuName {
  STANDARD_LRS = 'Standard_LRS',
  STANDARD_GRS = 'Standard_GRS',
  STANDARD_RAGRS = 'Standard_RAGRS',
  STANDARD_ZRS = 'Standard_ZRS',
  PREMIUM_LRS = 'Premium_LRS',
  PREMIUM_ZRS = 'Premium_ZRS',
  STANDARD_GZRS = 'Standard_GZRS',
  STANDARD_RAGZRS = 'Standard_RAGZRS',
}

/**
 * Storage account kind.
 */
export enum StorageAccountKind {
  STORAGE = 'Storage',
  STORAGE_V2 = 'StorageV2',
  BLOB_STORAGE = 'BlobStorage',
  FILE_STORAGE = 'FileStorage',
  BLOCK_BLOB_STORAGE = 'BlockBlobStorage',
}

/**
 * Access tier for storage account.
 */
export enum AccessTier {
  HOT = 'Hot',
  COOL = 'Cool',
  PREMIUM = 'Premium',
  COLD = 'Cold',
}

/**
 * Minimum TLS version.
 */
export enum TlsVersion {
  TLS1_0 = 'TLS1_0',
  TLS1_1 = 'TLS1_1',
  TLS1_2 = 'TLS1_2',
  TLS1_3 = 'TLS1_3',
}

/**
 * Public network access setting.
 */
export enum PublicNetworkAccess {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
  SECURED_BY_PERIMETER = 'SecuredByPerimeter',
}

/**
 * Network ACL default action.
 */
export enum NetworkAclDefaultAction {
  ALLOW = 'Allow',
  DENY = 'Deny',
}

/**
 * Network ACL bypass setting.
 */
export enum NetworkAclBypass {
  NONE = 'None',
  LOGGING = 'Logging',
  METRICS = 'Metrics',
  AZURE_SERVICES = 'AzureServices',
}

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
  readonly ipRules?: Array<{ readonly value: string }>;

  /**
   * Virtual network rules.
   */
  readonly virtualNetworkRules?: Array<{ readonly id: string }>;
}

/**
 * Properties for ArmStorageAccount (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Storage/storageAccounts ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2025-01-01
 *
 * @example
 * ```typescript
 * const props: ArmStorageAccountProps = {
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
export interface ArmStorageAccountProps {
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
 * Properties for StorageAccount (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const storage = new StorageAccount(resourceGroup, 'DataStorage');
 *
 * // With custom properties
 * const storage = new StorageAccount(resourceGroup, 'DataStorage', {
 *   sku: StorageAccountSkuName.STANDARD_GRS,
 *   accessTier: AccessTier.COOL,
 *   enableBlobPublicAccess: false
 * });
 * ```
 */
export interface StorageAccountProps {
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
