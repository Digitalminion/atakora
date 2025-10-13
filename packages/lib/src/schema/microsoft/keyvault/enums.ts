/**
 * Enums for Azure Key Vault (Microsoft.KeyVault).
 *
 * @remarks
 * Curated enums for Azure Key Vault resources.
 *
 * **Resource Type**: Microsoft.KeyVault/vaults
 * **API Version**: 2024-11-01
 *
 * @packageDocumentation
 */

/**
 * Key Vault SKU names.
 */
export enum KeyVaultSkuName {
  /**
   * Standard vault.
   */
  STANDARD = 'standard',

  /**
   * Premium vault with HSM-backed keys.
   */
  PREMIUM = 'premium',
}

/**
 * Public network access options.
 */
export enum PublicNetworkAccess {
  /**
   * Public network access is enabled.
   */
  ENABLED = 'enabled',

  /**
   * Public network access is disabled.
   */
  DISABLED = 'disabled',
}

/**
 * Network ACL bypass options.
 */
export enum NetworkAclBypass {
  /**
   * Allow Azure services to bypass.
   */
  AZURE_SERVICES = 'AzureServices',

  /**
   * No bypass.
   */
  NONE = 'None',
}

/**
 * Network ACL default action.
 */
export enum NetworkAclDefaultAction {
  /**
   * Allow traffic by default.
   */
  ALLOW = 'Allow',

  /**
   * Deny traffic by default.
   */
  DENY = 'Deny',
}
