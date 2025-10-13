/**
 * Azure Key Vault type definitions.
 *
 * @remarks
 * Enums, interfaces, and types for Key Vault resources.
 *
 * **Resource Type**: Microsoft.KeyVault/vaults
 * **API Version**: 2024-11-01
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * Key Vault SKU names.
 */
export const KeyVaultSkuName = schema.keyvault.KeyVaultSkuName;
export type KeyVaultSkuName = typeof KeyVaultSkuName[keyof typeof KeyVaultSkuName];

/**
 * Public network access options.
 */
export const PublicNetworkAccess = schema.keyvault.PublicNetworkAccess;
export type PublicNetworkAccess = typeof PublicNetworkAccess[keyof typeof PublicNetworkAccess];

/**
 * Key Vault SKU details.
 */
export interface KeyVaultSku {
  /**
   * SKU family (always 'A' for Key Vault).
   */
  readonly family: 'A';

  /**
   * SKU name.
   */
  readonly name: KeyVaultSkuName;
}

/**
 * Network ACL bypass options.
 */
export const NetworkAclBypass = schema.keyvault.NetworkAclBypass;
export type NetworkAclBypass = typeof NetworkAclBypass[keyof typeof NetworkAclBypass];

/**
 * Network ACL default action.
 */
export const NetworkAclDefaultAction = schema.keyvault.NetworkAclDefaultAction;
export type NetworkAclDefaultAction = typeof NetworkAclDefaultAction[keyof typeof NetworkAclDefaultAction];

/**
 * IP rule for network ACLs.
 */
export interface IpRule {
  /**
   * IP address or CIDR range.
   */
  readonly value: string;
}

/**
 * Virtual network rule for network ACLs.
 */
export interface VirtualNetworkRule {
  /**
   * Full resource ID of a VNet subnet.
   */
  readonly id: string;

  /**
   * Whether to ignore missing VNet service endpoint.
   */
  readonly ignoreMissingVnetServiceEndpoint?: boolean;
}

/**
 * Network ACLs for Key Vault.
 */
export interface NetworkRuleSet {
  /**
   * Which traffic can bypass network rules.
   */
  readonly bypass?: NetworkAclBypass;

  /**
   * Default action when no rule matches.
   */
  readonly defaultAction?: NetworkAclDefaultAction;

  /**
   * IP firewall rules.
   */
  readonly ipRules?: IpRule[];

  /**
   * Virtual network rules.
   */
  readonly virtualNetworkRules?: VirtualNetworkRule[];
}

/**
 * Properties for L1 ArmVaults construct.
 */
export interface ArmVaultsProps {
  /**
   * Name of the Key Vault.
   *
   * @remarks
   * - 3-24 characters
   * - Alphanumeric and hyphens
   * - Pattern: ^[a-zA-Z0-9-]{3,24}$
   */
  readonly vaultName: string;

  /**
   * Azure region for the Key Vault.
   */
  readonly location: string;

  /**
   * Azure Active Directory tenant ID.
   *
   * @remarks
   * Must be a valid UUID.
   */
  readonly tenantId: string;

  /**
   * SKU details.
   */
  readonly sku: KeyVaultSku;

  /**
   * Optional properties for the Key Vault.
   */
  readonly properties?: {
    /**
     * Enable RBAC authorization (recommended).
     *
     * @remarks
     * When true, access is controlled via Azure RBAC.
     * When false, access policies are used.
     * Default: false
     */
    readonly enableRbacAuthorization?: boolean;

    /**
     * Enable soft delete protection.
     *
     * @remarks
     * Default: true (cannot be disabled once enabled)
     */
    readonly enableSoftDelete?: boolean;

    /**
     * Soft delete retention in days.
     *
     * @remarks
     * Range: 7-90 days
     * Default: 90
     */
    readonly softDeleteRetentionInDays?: number;

    /**
     * Enable purge protection.
     *
     * @remarks
     * When enabled, deleted vaults and objects cannot be purged.
     * Irreversible once enabled.
     */
    readonly enablePurgeProtection?: boolean;

    /**
     * Public network access setting.
     *
     * @remarks
     * Default: enabled
     */
    readonly publicNetworkAccess?: PublicNetworkAccess;

    /**
     * Network ACL rules.
     */
    readonly networkAcls?: NetworkRuleSet;

    /**
     * Enable for deployment (VM certificate retrieval).
     *
     * @remarks
     * Default: false
     */
    readonly enabledForDeployment?: boolean;

    /**
     * Enable for disk encryption.
     *
     * @remarks
     * Default: false
     */
    readonly enabledForDiskEncryption?: boolean;

    /**
     * Enable for template deployment.
     *
     * @remarks
     * Default: false
     */
    readonly enabledForTemplateDeployment?: boolean;
  };

  /**
   * Resource tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for L2 Vaults construct.
 */
export interface VaultsProps {
  /**
   * Explicit vault name (optional - auto-generated if not provided).
   *
   * @remarks
   * If not specified, name will be auto-generated following naming conventions.
   */
  readonly vaultName?: string;

  /**
   * Azure region (optional - defaults to parent resource group location).
   */
  readonly location?: string;

  /**
   * Azure Active Directory tenant ID (optional - retrieved from stack if available).
   *
   * @remarks
   * If not specified, will attempt to retrieve from SubscriptionStack.
   */
  readonly tenantId?: string;

  /**
   * SKU (optional - defaults based on environment).
   *
   * @remarks
   * - Prod: premium
   * - Nonprod: standard
   */
  readonly sku?: KeyVaultSkuName;

  /**
   * Enable RBAC authorization (optional - default: true for AuthR).
   */
  readonly enableRbacAuthorization?: boolean;

  /**
   * Enable soft delete (optional - default: true).
   */
  readonly enableSoftDelete?: boolean;

  /**
   * Soft delete retention days (optional - default: 90).
   */
  readonly softDeleteRetentionInDays?: number;

  /**
   * Enable purge protection (optional - default: true for prod, false for nonprod).
   */
  readonly enablePurgeProtection?: boolean;

  /**
   * Public network access (optional - default: disabled for AuthR).
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Network ACL rules (optional).
   */
  readonly networkAcls?: NetworkRuleSet;

  /**
   * Resource tags (optional - merged with parent tags).
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Key Vault resources.
 */
export interface IVault {
  /**
   * The name of the Key Vault.
   */
  readonly vaultName: string;

  /**
   * The Azure region.
   */
  readonly location: string;

  /**
   * The tenant ID.
   */
  readonly tenantId: string;

  /**
   * The SKU.
   */
  readonly sku: KeyVaultSku;

  /**
   * The resource ID of the Key Vault.
   */
  readonly vaultId: string;
}
