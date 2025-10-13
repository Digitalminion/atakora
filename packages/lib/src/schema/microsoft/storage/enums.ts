/**
 * Enums for Azure Storage (Microsoft.Storage).
 *
 * @remarks
 * Curated enums extracted from Microsoft.Storage Azure schema.
 *
 * **Resource Type**: Microsoft.Storage/storageAccounts
 * **API Version**: 2025-01-01
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
