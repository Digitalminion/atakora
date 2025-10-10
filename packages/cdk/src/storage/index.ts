/**
 * Microsoft.Storage resource constructs
 *
 * This namespace contains Azure storage resources including:
 * - Storage Accounts (Microsoft.Storage/storageAccounts)
 *
 * @packageDocumentation
 */

// Storage Account exports
export { ArmStorageAccounts } from './storage-account-arm';
export { StorageAccounts } from './storage-accounts';
export type {
  ArmStorageAccountsProps,
  StorageAccountsProps,
  IStorageAccount,
  StorageAccountSku,
  NetworkAcls,
} from './storage-account-types';
export {
  StorageAccountSkuName,
  StorageAccountKind,
  AccessTier,
  TlsVersion,
  PublicNetworkAccess,
  NetworkAclDefaultAction,
  NetworkAclBypass,
} from './storage-account-types';
