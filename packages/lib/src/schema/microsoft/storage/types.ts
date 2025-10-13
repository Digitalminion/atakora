/**
 * Type definitions for Azure Storage (Microsoft.Storage).
 *
 * @remarks
 * Complete type definitions extracted from Microsoft.Storage Azure schema.
 *
 * **Resource Type**: Microsoft.Storage/storageAccounts
 * **API Version**: 2025-01-01
 *
 * @packageDocumentation
 */

import type {
  StorageAccountSkuName,
  StorageAccountKind,
  AccessTier,
  TlsVersion,
  PublicNetworkAccess,
  NetworkAclDefaultAction,
  NetworkAclBypass,
} from './enums';

/**
 * SKU configuration for storage account.
 */
export interface Sku {
  /**
   * SKU name.
   */
  readonly name: StorageAccountSkuName;
}

/**
 * IP rule for network ACLs.
 */
export interface IPRule {
  /**
   * IP address or CIDR range.
   */
  readonly value: string;

  /**
   * Action to take for this IP rule.
   *
   * @remarks
   * Defaults to Allow.
   */
  readonly action?: 'Allow';
}

/**
 * Virtual network rule for network ACLs.
 */
export interface VirtualNetworkRule {
  /**
   * Resource ID of the virtual network subnet.
   */
  readonly id: string;

  /**
   * Action to take for this virtual network rule.
   *
   * @remarks
   * Defaults to Allow.
   */
  readonly action?: 'Allow';

  /**
   * State of the virtual network rule.
   *
   * @remarks
   * Values: 'Provisioning' | 'Deprovisioning' | 'Succeeded' | 'Failed' | 'NetworkSourceDeleted'
   */
  readonly state?: string;
}

/**
 * Resource access rule.
 */
export interface ResourceAccessRule {
  /**
   * Resource ID.
   */
  readonly resourceId?: string;

  /**
   * Tenant ID.
   */
  readonly tenantId?: string;
}

/**
 * IPv6 rule for network ACLs.
 */
export interface IPv6Rule {
  /**
   * IPv6 address or CIDR range.
   *
   * @remarks
   * Example: '2001:db8::/32'
   */
  readonly value: string;

  /**
   * Action to take for this IPv6 rule.
   *
   * @remarks
   * Defaults to Allow.
   */
  readonly action?: 'Allow';
}

/**
 * Network ACL configuration.
 */
export interface NetworkRuleSet {
  /**
   * Services that can bypass network rules.
   *
   * @remarks
   * Comma-separated values: None, Logging, Metrics, AzureServices
   */
  readonly bypass?: NetworkAclBypass | string;

  /**
   * Default action when no rule matches.
   */
  readonly defaultAction: NetworkAclDefaultAction;

  /**
   * IP ACL rules.
   */
  readonly ipRules?: IPRule[];

  /**
   * IPv6 ACL rules.
   */
  readonly ipv6Rules?: IPv6Rule[];

  /**
   * Virtual network rules.
   */
  readonly virtualNetworkRules?: VirtualNetworkRule[];

  /**
   * Resource access rules.
   */
  readonly resourceAccessRules?: ResourceAccessRule[];
}

/**
 * Azure Files identity-based authentication settings.
 */
export interface AzureFilesIdentityBasedAuthentication {
  /**
   * Directory service type.
   *
   * @remarks
   * Values: 'None' | 'AADDS' | 'AD' | 'AADKERB'
   */
  readonly directoryServiceOptions: 'None' | 'AADDS' | 'AD' | 'AADKERB';

  /**
   * Active Directory properties.
   */
  readonly activeDirectoryProperties?: {
    /**
     * Domain name.
     */
    readonly domainName: string;

    /**
     * NetBIOS domain name.
     */
    readonly netBiosDomainName: string;

    /**
     * Forest name.
     */
    readonly forestName: string;

    /**
     * Domain GUID.
     */
    readonly domainGuid: string;

    /**
     * Domain SID.
     */
    readonly domainSid: string;

    /**
     * Azure Storage SID.
     */
    readonly azureStorageSid: string;

    /**
     * SAM account name.
     */
    readonly samAccountName?: string;

    /**
     * Account type.
     */
    readonly accountType?: string;
  };

  /**
   * Default share permission.
   *
   * @remarks
   * Values: 'None' | 'StorageFileDataSmbShareReader' | 'StorageFileDataSmbShareContributor' | 'StorageFileDataSmbShareElevatedContributor'
   */
  readonly defaultSharePermission?: string;
}

/**
 * Custom domain configuration.
 */
export interface CustomDomain {
  /**
   * Custom domain name.
   */
  readonly name: string;

  /**
   * Use sub-domain indirect CNAME validation.
   */
  readonly useSubDomainName?: boolean;
}

/**
 * Encryption service (Blob, File, Table, Queue).
 */
export interface EncryptionService {
  /**
   * Enable encryption for this service.
   */
  readonly enabled?: boolean;

  /**
   * Key type.
   *
   * @remarks
   * Values: 'Service' | 'Account'
   */
  readonly keyType?: 'Service' | 'Account';
}

/**
 * Encryption services configuration.
 */
export interface EncryptionServices {
  /**
   * Blob service encryption.
   */
  readonly blob?: EncryptionService;

  /**
   * File service encryption.
   */
  readonly file?: EncryptionService;

  /**
   * Table service encryption.
   */
  readonly table?: EncryptionService;

  /**
   * Queue service encryption.
   */
  readonly queue?: EncryptionService;
}

/**
 * Encryption identity configuration.
 */
export interface EncryptionIdentity {
  /**
   * Resource ID of user assigned identity for encryption.
   */
  readonly userAssignedIdentity?: string;

  /**
   * Federated identity client ID.
   */
  readonly federatedIdentityClientId?: string;
}

/**
 * Key vault properties for encryption.
 */
export interface KeyVaultProperties {
  /**
   * Key vault URI.
   */
  readonly keyvaulturi?: string;

  /**
   * Key name in key vault.
   */
  readonly keyname?: string;

  /**
   * Key version.
   */
  readonly keyversion?: string;

  /**
   * Current versioned key identifier.
   */
  readonly currentVersionedKeyIdentifier?: string;

  /**
   * Last key rotation timestamp.
   */
  readonly lastKeyRotationTimestamp?: string;

  /**
   * Current versioned key expiration timestamp.
   */
  readonly currentVersionedKeyExpirationTimestamp?: string;
}

/**
 * Encryption configuration.
 */
export interface Encryption {
  /**
   * Encryption services configuration.
   */
  readonly services?: EncryptionServices;

  /**
   * Key source.
   *
   * @remarks
   * Values: 'Microsoft.Storage' | 'Microsoft.Keyvault'
   */
  readonly keySource?: 'Microsoft.Storage' | 'Microsoft.Keyvault';

  /**
   * Require infrastructure encryption.
   */
  readonly requireInfrastructureEncryption?: boolean;

  /**
   * Key vault properties.
   */
  readonly keyvaultproperties?: KeyVaultProperties;

  /**
   * Encryption identity.
   */
  readonly identity?: EncryptionIdentity;
}

/**
 * Immutability policy properties.
 */
export interface ImmutableStorageAccount {
  /**
   * Enable account-level immutability.
   */
  readonly enabled?: boolean;

  /**
   * Immutability policy.
   */
  readonly immutabilityPolicy?: {
    /**
     * Immutability period in days.
     */
    readonly immutabilityPeriodSinceCreationInDays?: number;

    /**
     * Policy state.
     *
     * @remarks
     * Values: 'Unlocked' | 'Locked' | 'Disabled'
     */
    readonly state?: 'Unlocked' | 'Locked' | 'Disabled';

    /**
     * Allow protected append writes.
     */
    readonly allowProtectedAppendWrites?: boolean;
  };
}

/**
 * Key policy for key expiration.
 */
export interface KeyPolicy {
  /**
   * Number of days for key expiration.
   */
  readonly keyExpirationPeriodInDays: number;
}

/**
 * Routing preference settings.
 */
export interface RoutingPreference {
  /**
   * Routing choice.
   *
   * @remarks
   * Values: 'MicrosoftRouting' | 'InternetRouting'
   */
  readonly routingChoice?: 'MicrosoftRouting' | 'InternetRouting';

  /**
   * Publish Microsoft endpoints.
   */
  readonly publishMicrosoftEndpoints?: boolean;

  /**
   * Publish internet endpoints.
   */
  readonly publishInternetEndpoints?: boolean;
}

/**
 * SAS policy configuration.
 */
export interface SasPolicy {
  /**
   * SAS expiration period.
   *
   * @remarks
   * Format: DD.HH:MM:SS
   */
  readonly sasExpirationPeriod: string;

  /**
   * SAS expiration action.
   *
   * @remarks
   * Values: 'Log' | 'Block'
   */
  readonly expirationAction?: 'Log' | 'Block';
}

/**
 * Properties for storage account static website.
 */
export interface StaticWebsite {
  /**
   * Enable static website.
   */
  readonly enabled: boolean;

  /**
   * Index document path.
   *
   * @remarks
   * Example: 'index.html'
   */
  readonly indexDocument?: string;

  /**
   * Error document (404) path.
   *
   * @remarks
   * Example: '404.html'
   */
  readonly errorDocument404Path?: string;

  /**
   * Default index document path.
   */
  readonly defaultIndexDocumentPath?: string;
}

/**
 * Storage account properties.
 */
export interface StorageAccountPropertiesCreateParameters {
  /**
   * Custom domain configuration.
   */
  readonly customDomain?: CustomDomain;

  /**
   * Encryption configuration.
   */
  readonly encryption?: Encryption;

  /**
   * Network rule set.
   */
  readonly networkAcls?: NetworkRuleSet;

  /**
   * Access tier (Hot, Cool, Premium, Cold).
   *
   * @remarks
   * Required for BlobStorage and StorageV2 kind.
   */
  readonly accessTier?: AccessTier;

  /**
   * Azure Files identity-based authentication.
   */
  readonly azureFilesIdentityBasedAuthentication?: AzureFilesIdentityBasedAuthentication;

  /**
   * Enable hierarchical namespace (Data Lake Storage Gen2).
   */
  readonly isHnsEnabled?: boolean;

  /**
   * Enable large file shares.
   */
  readonly largeFileSharesState?: 'Disabled' | 'Enabled';

  /**
   * Routing preference.
   */
  readonly routingPreference?: RoutingPreference;

  /**
   * Allow blob public access.
   */
  readonly allowBlobPublicAccess?: boolean;

  /**
   * Minimum TLS version.
   */
  readonly minimumTlsVersion?: TlsVersion;

  /**
   * Allow shared key access.
   */
  readonly allowSharedKeyAccess?: boolean;

  /**
   * Enable NFS v3.
   */
  readonly isNfsV3Enabled?: boolean;

  /**
   * Allow cross-tenant replication.
   */
  readonly allowCrossTenantReplication?: boolean;

  /**
   * Restrict copy operations scope.
   *
   * @remarks
   * Valid values:
   * - 'AAD': Restrict to same Azure AD tenant
   * - 'PrivateLink': Restrict to private link
   */
  readonly allowedCopyScope?: 'AAD' | 'PrivateLink';

  /**
   * Default to OAuth authentication.
   */
  readonly defaultToOAuthAuthentication?: boolean;

  /**
   * Public network access.
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Immutable storage with versioning.
   */
  readonly immutableStorageWithVersioning?: ImmutableStorageAccount;

  /**
   * SAS policy.
   */
  readonly sasPolicy?: SasPolicy;

  /**
   * Key policy.
   */
  readonly keyPolicy?: KeyPolicy;

  /**
   * Key creation time.
   */
  readonly keyCreationTime?: {
    readonly key1?: string;
    readonly key2?: string;
  };

  /**
   * Only allow HTTPS traffic.
   */
  readonly supportsHttpsTrafficOnly?: boolean;

  /**
   * Enable SFTP.
   */
  readonly isSftpEnabled?: boolean;

  /**
   * Enable local user.
   */
  readonly isLocalUserEnabled?: boolean;

  /**
   * Enable extended groups.
   */
  readonly enableExtendedGroups?: boolean;

  /**
   * DNS endpoint type.
   *
   * @remarks
   * Values: 'Standard' | 'AzureDnsZone'
   */
  readonly dnsEndpointType?: 'Standard' | 'AzureDnsZone';

  /**
   * Dual stack (IPv4/IPv6) endpoint preference.
   *
   * @remarks
   * Valid values:
   * - 'Ipv4Only': IPv4 endpoints only
   * - 'Ipv6Only': IPv6 endpoints only
   * - 'DualStack': Both IPv4 and IPv6 endpoints
   */
  readonly dualStackEndpointPreference?: 'Ipv4Only' | 'Ipv6Only' | 'DualStack';
}

/**
 * Storage account identity.
 */
export interface Identity {
  /**
   * Identity type.
   *
   * @remarks
   * Values: 'None' | 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned'
   */
  readonly type: 'None' | 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned';

  /**
   * User assigned identities.
   *
   * @remarks
   * Map of user assigned identity resource IDs to empty objects.
   */
  readonly userAssignedIdentities?: Record<string, {}>;
}

/**
 * Extended location for edge zones.
 */
export interface ExtendedLocation {
  /**
   * Name of the extended location.
   */
  readonly name?: string;

  /**
   * Type of extended location.
   *
   * @remarks
   * Values: 'EdgeZone'
   */
  readonly type?: 'EdgeZone';
}
