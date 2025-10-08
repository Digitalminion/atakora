/**
 * Azure Storage Account constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure storage accounts.
 *
 * **Resource Type**: Microsoft.Storage/storageAccounts
 * **API Version**: 2025-01-01
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmStorageAccount, StorageAccountSkuName, StorageAccountKind } from '@atakora/lib';
 *
 * const storage = new ArmStorageAccount(resourceGroup, 'Storage', {
 *   storageAccountName: 'stgauthr001',
 *   location: 'eastus',
 *   sku: { name: StorageAccountSkuName.STANDARD_LRS },
 *   kind: StorageAccountKind.STORAGE_V2
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { StorageAccount } from '@atakora/lib';
 *
 * const storage = new StorageAccount(resourceGroup, 'DataStorage');
 * // Auto-generates name, uses secure defaults
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmStorageAccount } from './arm-storage-account';

// L2 construct (intent-based)
export { StorageAccount } from './storage-account';

// Type definitions
export type {
  ArmStorageAccountProps,
  StorageAccountProps,
  IStorageAccount,
  StorageAccountSku,
  NetworkAcls,
} from './types';

// Enums
export {
  StorageAccountSkuName,
  StorageAccountKind,
  AccessTier,
  TlsVersion,
  PublicNetworkAccess as StoragePublicNetworkAccess,
  NetworkAclDefaultAction,
  NetworkAclBypass,
} from './types';
