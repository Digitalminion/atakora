/**
 * Strongly-typed ARM template interfaces for Azure Storage resources
 *
 * These types exactly match the ARM JSON schema requirements to prevent
 * deployment failures caused by incorrect nesting or missing wrappers.
 *
 * API Version: 2023-01-01
 */

import { ArmResourceId } from './arm-network-types';

/**
 * Storage account SKU
 *
 * Defines the performance tier and redundancy level
 *
 * @example
 * {
 *   name: 'Standard_LRS'
 * }
 */
export interface ArmStorageSku {
  /**
   * SKU name
   *
   * Performance tiers:
   * - Standard: Cost-effective, suitable for most workloads
   * - Premium: High-performance, low-latency storage (SSD-based)
   *
   * Redundancy levels:
   * - LRS (Locally Redundant Storage): 3 copies in single datacenter
   * - ZRS (Zone Redundant Storage): 3 copies across availability zones
   * - GRS (Geo Redundant Storage): 6 copies across two regions
   * - GZRS (Geo-Zone Redundant Storage): ZRS + GRS
   * - RA-GRS (Read-Access GRS): GRS with read access to secondary region
   * - RA-GZRS (Read-Access GZRS): GZRS with read access to secondary region
   *
   * Valid combinations:
   * - Standard_LRS: Standard performance, locally redundant
   * - Standard_GRS: Standard performance, geo-redundant
   * - Standard_RAGRS: Standard performance, geo-redundant with read access
   * - Standard_ZRS: Standard performance, zone-redundant
   * - Standard_GZRS: Standard performance, geo-zone-redundant
   * - Standard_RAGZRS: Standard performance, geo-zone-redundant with read access
   * - Premium_LRS: Premium performance, locally redundant
   * - Premium_ZRS: Premium performance, zone-redundant
   */
  readonly name:
    | 'Standard_LRS'
    | 'Standard_GRS'
    | 'Standard_RAGRS'
    | 'Standard_ZRS'
    | 'Standard_GZRS'
    | 'Standard_RAGZRS'
    | 'Premium_LRS'
    | 'Premium_ZRS';

  /**
   * SKU tier (optional)
   *
   * Usually inferred from the SKU name
   */
  readonly tier?: 'Standard' | 'Premium';
}

/**
 * Storage account kind
 *
 * Determines available features and pricing
 */
export type ArmStorageKind =
  | 'Storage' // Legacy general-purpose v1 (not recommended for new accounts)
  | 'StorageV2' // General-purpose v2 (recommended for most use cases)
  | 'BlobStorage' // Blob-only storage (legacy, use StorageV2 instead)
  | 'FileStorage' // Premium file shares only
  | 'BlockBlobStorage'; // Premium block blobs only

/**
 * Storage access tier
 *
 * Optimizes cost based on data access patterns
 */
export type ArmStorageAccessTier =
  | 'Hot' // Frequently accessed data
  | 'Cool'; // Infrequently accessed data (30-day minimum)

/**
 * Network ACL rule action
 */
export type ArmNetworkRuleAction = 'Allow' | 'Deny';

/**
 * Network ACL default action
 */
export type ArmNetworkRuleDefaultAction = 'Allow' | 'Deny';

/**
 * Virtual network rule for storage account
 *
 * @example
 * {
 *   id: "[resourceId('Microsoft.Network/virtualNetworks/subnets', 'myVNet', 'mySubnet')]",
 *   action: 'Allow'
 * }
 */
export interface ArmVirtualNetworkRule {
  /**
   * Subnet resource ID (must be ARM expression)
   *
   * Format: [resourceId('Microsoft.Network/virtualNetworks/subnets', 'vnetName', 'subnetName')]
   *
   * CRITICAL: This must be an ARM expression, not a literal string.
   */
  readonly id: ArmResourceId;

  /**
   * Rule action
   *
   * @default 'Allow'
   */
  readonly action?: ArmNetworkRuleAction;

  /**
   * Resource state
   *
   * Internal Azure state - usually not set manually
   */
  readonly state?: string;
}

/**
 * IP address rule for storage account
 *
 * @example
 * {
 *   value: '40.74.28.0/24',
 *   action: 'Allow'
 * }
 */
export interface ArmIpRule {
  /**
   * IP address or CIDR range
   *
   * @example '40.74.28.0/24'
   * @example '40.74.28.10'
   */
  readonly value: string;

  /**
   * Rule action
   *
   * @default 'Allow'
   */
  readonly action?: ArmNetworkRuleAction;
}

/**
 * Resource access rule for storage account
 *
 * Allows specific Azure resources to access the storage account
 *
 * @example
 * {
 *   tenantId: '00000000-0000-0000-0000-000000000000',
 *   resourceId: "[resourceId('Microsoft.Synapse/workspaces', 'myWorkspace')]"
 * }
 */
export interface ArmResourceAccessRule {
  /**
   * Tenant ID
   *
   * Use ARM expression for current tenant:
   * '[subscription().tenantId]'
   */
  readonly tenantId?: string;

  /**
   * Resource ID that should have access
   *
   * Must be an ARM expression
   */
  readonly resourceId: ArmResourceId;
}

/**
 * Network ACL configuration for storage account
 *
 * Controls network access to the storage account
 *
 * @example
 * {
 *   bypass: 'AzureServices',
 *   defaultAction: 'Deny',
 *   virtualNetworkRules: [{
 *     id: "[resourceId('Microsoft.Network/virtualNetworks/subnets', 'myVNet', 'mySubnet')]"
 *   }],
 *   ipRules: [{
 *     value: '40.74.28.0/24'
 *   }]
 * }
 */
export interface ArmNetworkAcls {
  /**
   * Services that can bypass network rules
   *
   * Options:
   * - None: No bypass
   * - AzureServices: Allow trusted Azure services
   * - Logging: Allow logging services
   * - Metrics: Allow metrics services
   *
   * Multiple values can be combined (comma-separated or as flags)
   *
   * @default 'AzureServices'
   */
  readonly bypass?: 'None' | 'AzureServices' | 'Logging' | 'Metrics' | string;

  /**
   * Default action when no rules match
   *
   * - Allow: Allow all traffic by default
   * - Deny: Deny all traffic by default (recommended for security)
   *
   * @default 'Allow'
   */
  readonly defaultAction: ArmNetworkRuleDefaultAction;

  /**
   * Virtual network rules
   *
   * Subnets that can access the storage account
   */
  readonly virtualNetworkRules?: readonly ArmVirtualNetworkRule[];

  /**
   * IP address rules
   *
   * IP addresses or ranges that can access the storage account
   */
  readonly ipRules?: readonly ArmIpRule[];

  /**
   * Resource access rules
   *
   * Azure resources that can access the storage account
   */
  readonly resourceAccessRules?: readonly ArmResourceAccessRule[];
}

/**
 * Azure Files configuration
 *
 * @example
 * {
 *   enabled: true,
 *   activeDirectoryProperties: {
 *     domainName: 'contoso.com',
 *     domainGuid: '00000000-0000-0000-0000-000000000000'
 *   }
 * }
 */
export interface ArmAzureFilesIdentityBasedAuthentication {
  /**
   * Directory service type
   *
   * - None: No identity-based auth
   * - AD: Active Directory Domain Services
   * - AADDS: Azure Active Directory Domain Services
   * - AADKERB: Azure AD Kerberos
   */
  readonly directoryServiceOptions: 'None' | 'AD' | 'AADDS' | 'AADKERB';

  /**
   * Active Directory properties (required for AD)
   */
  readonly activeDirectoryProperties?: {
    /**
     * AD domain name
     */
    readonly domainName: string;

    /**
     * AD domain GUID
     */
    readonly domainGuid: string;

    /**
     * AD forest name
     */
    readonly forestName?: string;

    /**
     * AD NetBIOS domain name
     */
    readonly netBiosDomainName?: string;

    /**
     * AD domain SID
     */
    readonly domainSid?: string;

    /**
     * Azure Storage SID
     */
    readonly azureStorageSid?: string;

    /**
     * SAM account name
     */
    readonly samAccountName?: string;

    /**
     * Account type
     */
    readonly accountType?: string;
  };
}

/**
 * Blob service properties
 *
 * @example
 * {
 *   deleteRetentionPolicy: {
 *     enabled: true,
 *     days: 7
 *   },
 *   containerDeleteRetentionPolicy: {
 *     enabled: true,
 *     days: 7
 *   }
 * }
 */
export interface ArmBlobServiceProperties {
  /**
   * Soft delete retention policy for blobs
   */
  readonly deleteRetentionPolicy?: {
    /**
     * Enable soft delete
     */
    readonly enabled: boolean;

    /**
     * Retention days
     *
     * Constraints:
     * - Range: 1-365 days
     * - Required if enabled is true
     */
    readonly days?: number;
  };

  /**
   * Soft delete retention policy for containers
   */
  readonly containerDeleteRetentionPolicy?: {
    /**
     * Enable soft delete
     */
    readonly enabled: boolean;

    /**
     * Retention days
     *
     * Constraints:
     * - Range: 1-365 days
     */
    readonly days?: number;
  };

  /**
   * Versioning enabled
   */
  readonly isVersioningEnabled?: boolean;

  /**
   * Change feed enabled
   */
  readonly changeFeed?: {
    readonly enabled: boolean;
  };
}

/**
 * Storage account encryption configuration
 *
 * @example
 * {
 *   services: {
 *     blob: { enabled: true },
 *     file: { enabled: true }
 *   },
 *   keySource: 'Microsoft.Storage'
 * }
 */
export interface ArmEncryption {
  /**
   * Encryption services
   */
  readonly services?: {
    /**
     * Blob service encryption
     */
    readonly blob?: {
      readonly enabled: boolean;
      readonly keyType?: 'Account' | 'Service';
    };

    /**
     * File service encryption
     */
    readonly file?: {
      readonly enabled: boolean;
      readonly keyType?: 'Account' | 'Service';
    };

    /**
     * Table service encryption
     */
    readonly table?: {
      readonly enabled: boolean;
      readonly keyType?: 'Account' | 'Service';
    };

    /**
     * Queue service encryption
     */
    readonly queue?: {
      readonly enabled: boolean;
      readonly keyType?: 'Account' | 'Service';
    };
  };

  /**
   * Encryption key source
   *
   * - Microsoft.Storage: Use Microsoft-managed keys (default)
   * - Microsoft.Keyvault: Use customer-managed keys from Key Vault
   */
  readonly keySource: 'Microsoft.Storage' | 'Microsoft.Keyvault';

  /**
   * Key Vault properties (required if keySource is Microsoft.Keyvault)
   */
  readonly keyvaultproperties?: {
    /**
     * Key Vault key name
     */
    readonly keyname?: string;

    /**
     * Key Vault key version
     */
    readonly keyversion?: string;

    /**
     * Key Vault URI
     */
    readonly keyvaulturi?: string;
  };

  /**
   * Require infrastructure encryption
   *
   * Enables double encryption at the infrastructure level
   */
  readonly requireInfrastructureEncryption?: boolean;
}

/**
 * Storage account properties
 *
 * @example
 * {
 *   accessTier: 'Hot',
 *   supportsHttpsTrafficOnly: true,
 *   minimumTlsVersion: 'TLS1_2',
 *   allowBlobPublicAccess: false,
 *   networkAcls: {
 *     defaultAction: 'Deny',
 *     bypass: 'AzureServices'
 *   }
 * }
 */
export interface ArmStorageAccountProperties {
  /**
   * Access tier
   *
   * Determines default access tier for blobs
   *
   * @default 'Hot'
   */
  readonly accessTier?: ArmStorageAccessTier;

  /**
   * Custom domain configuration
   */
  readonly customDomain?: {
    readonly name: string;
    readonly useSubDomainName?: boolean;
  };

  /**
   * Encryption configuration
   */
  readonly encryption?: ArmEncryption;

  /**
   * Network ACL rules
   */
  readonly networkAcls?: ArmNetworkAcls;

  /**
   * Require HTTPS traffic only
   *
   * @default true
   * @recommended true for security
   */
  readonly supportsHttpsTrafficOnly?: boolean;

  /**
   * Minimum TLS version
   *
   * @default 'TLS1_0'
   * @recommended 'TLS1_2' for security
   */
  readonly minimumTlsVersion?: 'TLS1_0' | 'TLS1_1' | 'TLS1_2';

  /**
   * Allow public access to blobs
   *
   * @default true
   * @recommended false for security
   */
  readonly allowBlobPublicAccess?: boolean;

  /**
   * Allow shared key access
   *
   * @default true
   * @recommended false for enhanced security (use Azure AD instead)
   */
  readonly allowSharedKeyAccess?: boolean;

  /**
   * Enable hierarchical namespace (Data Lake Storage Gen2)
   *
   * Cannot be changed after account creation
   *
   * @default false
   */
  readonly isHnsEnabled?: boolean;

  /**
   * Enable NFSv3 protocol
   *
   * Requires Premium_LRS or Premium_ZRS SKU and isHnsEnabled: true
   *
   * @default false
   */
  readonly isNfsV3Enabled?: boolean;

  /**
   * Enable large file shares
   *
   * @default false
   */
  readonly largeFileSharesState?: 'Disabled' | 'Enabled';

  /**
   * Azure Files identity-based authentication
   */
  readonly azureFilesIdentityBasedAuthentication?: ArmAzureFilesIdentityBasedAuthentication;

  /**
   * Blob service properties
   */
  readonly blobServiceProperties?: ArmBlobServiceProperties;

  /**
   * Enable SFTP
   *
   * Requires isHnsEnabled: true
   *
   * @default false
   */
  readonly isSftpEnabled?: boolean;

  /**
   * Enable local user accounts
   *
   * @default false
   */
  readonly isLocalUserEnabled?: boolean;

  /**
   * Allow cross-tenant replication
   *
   * @default true
   */
  readonly allowCrossTenantReplication?: boolean;

  /**
   * Default to Azure AD authorization in Azure portal
   *
   * @default false
   */
  readonly defaultToOAuthAuthentication?: boolean;

  /**
   * Public network access
   *
   * - Enabled: Allow public access (subject to network ACLs)
   * - Disabled: Deny all public access (private endpoints only)
   *
   * @default 'Enabled'
   */
  readonly publicNetworkAccess?: 'Enabled' | 'Disabled';
}

/**
 * ARM Storage Account resource
 *
 * @example
 * const storageAccount: ArmStorageAccount = {
 *   type: 'Microsoft.Storage/storageAccounts',
 *   apiVersion: '2023-01-01',
 *   name: 'mystorageaccount',
 *   location: 'eastus',
 *   kind: 'StorageV2',
 *   sku: {
 *     name: 'Standard_LRS'
 *   },
 *   properties: {
 *     accessTier: 'Hot',
 *     supportsHttpsTrafficOnly: true,
 *     minimumTlsVersion: 'TLS1_2',
 *     allowBlobPublicAccess: false,
 *     networkAcls: {
 *       defaultAction: 'Deny',
 *       bypass: 'AzureServices'
 *     }
 *   }
 * };
 */
export interface ArmStorageAccount {
  /**
   * Resource type (MUST be 'Microsoft.Storage/storageAccounts')
   */
  readonly type: 'Microsoft.Storage/storageAccounts';

  /**
   * API version
   *
   * Recommended: '2023-01-01' (latest stable as of template generation)
   */
  readonly apiVersion: string;

  /**
   * Storage account name
   *
   * Constraints:
   * - Length: 3-24 characters
   * - Pattern: lowercase letters and numbers only (no hyphens, underscores, or uppercase)
   * - Must be globally unique across all Azure storage accounts
   *
   * @example 'mystorageaccount123'
   */
  readonly name: string;

  /**
   * Azure region
   *
   * @example 'eastus'
   * @example 'westeurope'
   */
  readonly location: string;

  /**
   * Storage account kind
   *
   * @default 'StorageV2'
   * @recommended 'StorageV2' for most use cases
   */
  readonly kind: ArmStorageKind;

  /**
   * Storage account SKU (REQUIRED)
   *
   * Defines performance tier and redundancy
   */
  readonly sku: ArmStorageSku;

  /**
   * Resource tags
   */
  readonly tags?: Record<string, string>;

  /**
   * Storage account properties
   */
  readonly properties?: ArmStorageAccountProperties;

  /**
   * Managed identity configuration
   */
  readonly identity?: {
    /**
     * Identity type
     *
     * - SystemAssigned: Azure-managed identity
     * - UserAssigned: Customer-managed identity
     * - SystemAssigned,UserAssigned: Both
     */
    readonly type: 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned';

    /**
     * User-assigned identities
     *
     * Required if type includes UserAssigned
     */
    readonly userAssignedIdentities?: Record<string, Record<string, never>>;
  };

  /**
   * Resource dependencies
   *
   * Array of ARM resource ID expressions
   */
  readonly dependsOn?: readonly ArmResourceId[];
}

/**
 * Blob container public access level
 */
export type ArmBlobContainerPublicAccess = 'None' | 'Blob' | 'Container';

/**
 * Blob container properties
 */
export interface ArmBlobContainerProperties {
  /**
   * Public access level
   *
   * - None: No public access (default, recommended)
   * - Blob: Public read access for blobs only
   * - Container: Public read access for container and blobs
   *
   * @default 'None'
   * @recommended 'None' for security
   */
  readonly publicAccess?: ArmBlobContainerPublicAccess;

  /**
   * Container metadata
   */
  readonly metadata?: Record<string, string>;
}

/**
 * ARM Blob Container resource
 *
 * Child resource of storage account
 *
 * @example
 * const container: ArmBlobContainer = {
 *   type: 'Microsoft.Storage/storageAccounts/blobServices/containers',
 *   apiVersion: '2023-01-01',
 *   name: 'mystorageaccount/default/mycontainer',
 *   properties: {
 *     publicAccess: 'None'
 *   },
 *   dependsOn: [
 *     "[resourceId('Microsoft.Storage/storageAccounts', 'mystorageaccount')]"
 *   ]
 * };
 */
export interface ArmBlobContainer {
  /**
   * Resource type (MUST be 'Microsoft.Storage/storageAccounts/blobServices/containers')
   */
  readonly type: 'Microsoft.Storage/storageAccounts/blobServices/containers';

  /**
   * API version
   */
  readonly apiVersion: string;

  /**
   * Container name in format: 'storageAccountName/default/containerName'
   *
   * The middle segment 'default' refers to the default blob service
   *
   * Container name constraints:
   * - Length: 3-63 characters
   * - Pattern: lowercase letters, numbers, hyphens
   * - Must start with letter or number
   * - Cannot contain consecutive hyphens
   *
   * @example 'mystorageaccount/default/mycontainer'
   */
  readonly name: string;

  /**
   * Container properties
   */
  readonly properties?: ArmBlobContainerProperties;

  /**
   * Resource dependencies
   *
   * Must depend on the parent storage account
   *
   * @example ["[resourceId('Microsoft.Storage/storageAccounts', 'mystorageaccount')]"]
   */
  readonly dependsOn?: readonly ArmResourceId[];
}
