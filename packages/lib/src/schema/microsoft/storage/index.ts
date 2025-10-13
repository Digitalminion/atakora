/**
 * Azure Storage schema module (Microsoft.Storage).
 *
 * @remarks
 * Type definitions and enums for Azure Storage resources.
 *
 * @packageDocumentation
 */

// Export all enums
export {
  StorageAccountSkuName,
  StorageAccountKind,
  AccessTier,
  TlsVersion,
  PublicNetworkAccess,
  NetworkAclDefaultAction,
  NetworkAclBypass,
} from './enums';

// Export all types
export type {
  Sku,
  IPRule,
  IPv6Rule,
  VirtualNetworkRule,
  ResourceAccessRule,
  NetworkRuleSet,
  AzureFilesIdentityBasedAuthentication,
  CustomDomain,
  EncryptionService,
  EncryptionServices,
  EncryptionIdentity,
  KeyVaultProperties,
  Encryption,
  ImmutableStorageAccount,
  KeyPolicy,
  RoutingPreference,
  SasPolicy,
  StaticWebsite,
  StorageAccountPropertiesCreateParameters,
  Identity,
  ExtendedLocation,
} from './types';
