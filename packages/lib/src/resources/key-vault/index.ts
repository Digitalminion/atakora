/**
 * Azure Key Vault constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure Key Vaults.
 *
 * **Resource Type**: Microsoft.KeyVault/vaults
 * **API Version**: 2024-11-01
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmKeyVault, KeyVaultSkuName } from '@atakora/lib';
 *
 * const vault = new ArmKeyVault(resourceGroup, 'Vault', {
 *   vaultName: 'kv-colorai-001',
 *   location: 'eastus',
 *   tenantId: '12345678-1234-1234-1234-123456789abc',
 *   sku: {
 *     family: 'A',
 *     name: KeyVaultSkuName.STANDARD
 *   }
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { KeyVault } from '@atakora/lib';
 *
 * const vault = new KeyVault(resourceGroup, 'AppSecrets', {
 *   tenantId: '12345678-1234-1234-1234-123456789abc'
 * });
 * // Auto-generates name, uses secure defaults
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmKeyVault } from './arm-key-vault';

// L2 construct (intent-based)
export { KeyVault } from './key-vault';

// Type definitions
export type {
  ArmKeyVaultProps,
  KeyVaultProps,
  IKeyVault,
  KeyVaultSku,
  NetworkRuleSet,
  IpRule,
  VirtualNetworkRule,
} from './types';

// Enums
export {
  KeyVaultSkuName,
  PublicNetworkAccess as KeyVaultPublicNetworkAccess,
  NetworkAclBypass,
  NetworkAclDefaultAction,
} from './types';
