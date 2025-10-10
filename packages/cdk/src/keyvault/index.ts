/**
 * Microsoft.KeyVault resource constructs
 *
 * This namespace contains Azure Key Vault resources including:
 * - Key Vaults (Microsoft.KeyVault/vaults)
 *
 * @packageDocumentation
 */

// Key Vault exports
export { ArmVaults } from './vaults-arm';
export { Vaults } from './vaults';
export type {
  ArmVaultsProps,
  VaultsProps,
  IVault,
  KeyVaultSku,
  NetworkRuleSet,
  IpRule,
  VirtualNetworkRule,
} from './vault-types';
export {
  KeyVaultSkuName,
  PublicNetworkAccess,
  NetworkAclBypass,
  NetworkAclDefaultAction,
} from './vault-types';
