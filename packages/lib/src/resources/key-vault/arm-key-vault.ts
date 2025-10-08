import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmKeyVaultProps, KeyVaultSku, PublicNetworkAccess, NetworkRuleSet } from './types';

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
 * auto-naming and defaults, use the {@link KeyVault} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmKeyVault, KeyVaultSkuName } from '@atakora/lib';
 *
 * const vault = new ArmKeyVault(resourceGroup, 'Vault', {
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
export class ArmKeyVault extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.KeyVault/vaults';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-11-01';

  /**
   * Deployment scope for Key Vault.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the Key Vault.
   */
  public readonly vaultName: string;

  /**
   * Resource name (same as vaultName).
   */
  public readonly name: string;

  /**
   * Azure region where the Key Vault is located.
   */
  public readonly location: string;

  /**
   * Azure Active Directory tenant ID.
   */
  public readonly tenantId: string;

  /**
   * SKU configuration.
   */
  public readonly sku: KeyVaultSku;

  /**
   * Enable RBAC authorization.
   */
  public readonly enableRbacAuthorization?: boolean;

  /**
   * Enable soft delete.
   */
  public readonly enableSoftDelete?: boolean;

  /**
   * Soft delete retention in days.
   */
  public readonly softDeleteRetentionInDays?: number;

  /**
   * Enable purge protection.
   */
  public readonly enablePurgeProtection?: boolean;

  /**
   * Public network access setting.
   */
  public readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Network ACL rules.
   */
  public readonly networkAcls?: NetworkRuleSet;

  /**
   * Enable for deployment.
   */
  public readonly enabledForDeployment?: boolean;

  /**
   * Enable for disk encryption.
   */
  public readonly enabledForDiskEncryption?: boolean;

  /**
   * Enable for template deployment.
   */
  public readonly enabledForTemplateDeployment?: boolean;

  /**
   * Resource tags.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.KeyVault/vaults/{vaultName}`
   */
  public readonly resourceId: string;

  /**
   * Key Vault resource ID (alias for resourceId).
   */
  public readonly vaultId: string;

  constructor(scope: Construct, id: string, props: ArmKeyVaultProps) {
    super(scope, id);

    // Validate props
    this.validateProps(props);

    // Assign required properties
    this.vaultName = props.vaultName;
    this.name = props.vaultName;
    this.location = props.location;
    this.tenantId = props.tenantId;
    this.sku = props.sku;

    // Assign optional properties
    this.enableRbacAuthorization = props.properties?.enableRbacAuthorization;
    this.enableSoftDelete = props.properties?.enableSoftDelete;
    this.softDeleteRetentionInDays = props.properties?.softDeleteRetentionInDays;
    this.enablePurgeProtection = props.properties?.enablePurgeProtection;
    this.publicNetworkAccess = props.properties?.publicNetworkAccess;
    this.networkAcls = props.properties?.networkAcls;
    this.enabledForDeployment = props.properties?.enabledForDeployment;
    this.enabledForDiskEncryption = props.properties?.enabledForDiskEncryption;
    this.enabledForTemplateDeployment = props.properties?.enabledForTemplateDeployment;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.KeyVault/vaults/${this.vaultName}`;
    this.vaultId = this.resourceId;
  }

  /**
   * Validates the properties for the Key Vault.
   */
  private validateProps(props: ArmKeyVaultProps): void {
    // Validate vault name
    if (!props.vaultName || props.vaultName.trim() === '') {
      throw new Error('Key Vault name cannot be empty');
    }

    // Vault name pattern: 3-24 characters, alphanumeric and hyphens
    const namePattern = /^[a-zA-Z0-9-]{3,24}$/;
    if (!namePattern.test(props.vaultName)) {
      throw new Error(
        `Key Vault name '${props.vaultName}' must be 3-24 characters and contain only alphanumeric characters and hyphens`
      );
    }

    // Cannot start or end with hyphen
    if (props.vaultName.startsWith('-') || props.vaultName.endsWith('-')) {
      throw new Error(`Key Vault name '${props.vaultName}' cannot start or end with a hyphen`);
    }

    // Cannot have consecutive hyphens
    if (props.vaultName.includes('--')) {
      throw new Error(`Key Vault name '${props.vaultName}' cannot contain consecutive hyphens`);
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate tenant ID (must be UUID)
    if (!props.tenantId || props.tenantId.trim() === '') {
      throw new Error('Tenant ID cannot be empty');
    }

    const tenantIdPattern =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!tenantIdPattern.test(props.tenantId)) {
      throw new Error(`Tenant ID '${props.tenantId}' must be a valid UUID`);
    }

    // Validate SKU
    if (!props.sku) {
      throw new Error('SKU must be provided');
    }

    if (props.sku.family !== 'A') {
      throw new Error(`SKU family must be 'A', got '${props.sku.family}'`);
    }

    // Validate soft delete retention days if provided
    if (
      props.properties?.softDeleteRetentionInDays !== undefined &&
      (props.properties.softDeleteRetentionInDays < 7 ||
        props.properties.softDeleteRetentionInDays > 90)
    ) {
      throw new Error(
        `Soft delete retention days must be between 7 and 90, got ${props.properties.softDeleteRetentionInDays}`
      );
    }
  }

  /**
   * Converts the Key Vault to an ARM template resource definition.
   */
  public toArmTemplate(): Record<string, unknown> {
    const properties: Record<string, unknown> = {
      tenantId: this.tenantId,
      sku: this.sku,
    };

    // Add optional properties if defined
    if (this.enableRbacAuthorization !== undefined) {
      properties.enableRbacAuthorization = this.enableRbacAuthorization;
    }

    if (this.enableSoftDelete !== undefined) {
      properties.enableSoftDelete = this.enableSoftDelete;
    }

    if (this.softDeleteRetentionInDays !== undefined) {
      properties.softDeleteRetentionInDays = this.softDeleteRetentionInDays;
    }

    if (this.enablePurgeProtection !== undefined) {
      properties.enablePurgeProtection = this.enablePurgeProtection;
    }

    if (this.publicNetworkAccess !== undefined) {
      properties.publicNetworkAccess = this.publicNetworkAccess;
    }

    if (this.networkAcls !== undefined) {
      properties.networkAcls = this.networkAcls;
    }

    if (this.enabledForDeployment !== undefined) {
      properties.enabledForDeployment = this.enabledForDeployment;
    }

    if (this.enabledForDiskEncryption !== undefined) {
      properties.enabledForDiskEncryption = this.enabledForDiskEncryption;
    }

    if (this.enabledForTemplateDeployment !== undefined) {
      properties.enabledForTemplateDeployment = this.enabledForTemplateDeployment;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.vaultName,
      location: this.location,
      properties,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    };
  }
}
