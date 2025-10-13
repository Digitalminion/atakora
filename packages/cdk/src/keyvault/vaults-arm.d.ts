import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmVaultsProps, KeyVaultSku, PublicNetworkAccess, NetworkRuleSet } from './vault-types';
/**
 * L1 construct for Azure Key Vault.
 *
 * @remarks
 * Direct mapping to Microsoft.KeyVault/vaults ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.KeyVault/vaults`
 * **API Version**: `2024-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link Vaults} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmVaults, KeyVaultSkuName } from '@atakora/cdk/keyvault';
 *
 * const vault = new ArmVaults(resourceGroup, 'Vault', {
 *   vaultName: 'kv-authr-001',
 *   location: 'eastus',
 *   tenantId: '12345678-1234-1234-1234-123456789abc',
 *   sku: {
 *     family: 'A',
 *     name: KeyVaultSkuName.STANDARD
 *   }
 * });
 * ```
 */
export declare class ArmVaults extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for Key Vault.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the Key Vault.
     */
    readonly vaultName: string;
    /**
     * Resource name (same as vaultName).
     */
    readonly name: string;
    /**
     * Azure region where the Key Vault is located.
     */
    readonly location: string;
    /**
     * Azure Active Directory tenant ID.
     */
    readonly tenantId: string;
    /**
     * SKU configuration.
     */
    readonly sku: KeyVaultSku;
    /**
     * Enable RBAC authorization.
     */
    readonly enableRbacAuthorization?: boolean;
    /**
     * Enable soft delete.
     */
    readonly enableSoftDelete?: boolean;
    /**
     * Soft delete retention in days.
     */
    readonly softDeleteRetentionInDays?: number;
    /**
     * Enable purge protection.
     */
    readonly enablePurgeProtection?: boolean;
    /**
     * Public network access setting.
     */
    readonly publicNetworkAccess?: PublicNetworkAccess;
    /**
     * Network ACL rules.
     */
    readonly networkAcls?: NetworkRuleSet;
    /**
     * Enable for deployment.
     */
    readonly enabledForDeployment?: boolean;
    /**
     * Enable for disk encryption.
     */
    readonly enabledForDiskEncryption?: boolean;
    /**
     * Enable for template deployment.
     */
    readonly enabledForTemplateDeployment?: boolean;
    /**
     * Resource tags.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.KeyVault/vaults/{vaultName}`
     */
    readonly resourceId: string;
    /**
     * Key Vault resource ID (alias for resourceId).
     */
    readonly vaultId: string;
    constructor(scope: Construct, id: string, props: ArmVaultsProps);
    /**
     * Validates the properties for the Key Vault.
     */
    protected validateProps(props: ArmVaultsProps): void;
    /**
     * Converts the Key Vault to an ARM template resource definition.
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=vaults-arm.d.ts.map