import { Construct } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { Vaults, type IVault } from '@atakora/cdk/keyvault';
import { PrivateEndpoints, PrivateDnsZones, type IPrivateEndpoint, type ISubnet, type IPrivateDnsZone } from '@atakora/cdk/network';

/**
 * Configuration for Key Vault Stack
 */
export interface KeyVaultStackProps {
  /**
   * Resource Group to deploy Key Vault into
   */
  resourceGroup: IResourceGroup;

  /**
   * Subnet for the private endpoint
   */
  privateEndpointSubnet: ISubnet;

  /**
   * Whether to create a new Private DNS Zone (default: true)
   *
   * @remarks
   * If false, you must provide existingPrivateDnsZone
   */
  createPrivateDnsZone?: boolean;

  /**
   * Existing Private DNS Zone to use for DNS integration
   *
   * @remarks
   * Only used if createPrivateDnsZone is false
   */
  existingPrivateDnsZone?: IPrivateDnsZone;

  /**
   * Enable soft delete (default: true)
   */
  enableSoftDelete?: boolean;

  /**
   * Soft delete retention days (default: 90)
   */
  softDeleteRetentionInDays?: number;

  /**
   * Enable purge protection (default: false)
   *
   * @remarks
   * When enabled, vaults and objects cannot be purged during retention period
   */
  enablePurgeProtection?: boolean;

  /**
   * Enable RBAC authorization (default: true)
   *
   * @remarks
   * When true, uses Azure RBAC for data plane authorization.
   * When false, uses vault access policies.
   */
  enableRbacAuthorization?: boolean;

  /**
   * Tenant ID for the Key Vault
   *
   * @remarks
   * Defaults to the current tenant if not specified
   */
  tenantId?: string;

  /**
   * Log Analytics Workspace ID for diagnostic settings
   */
  logAnalyticsWorkspaceId?: string;

  /**
   * Additional tags
   */
  tags?: Record<string, string>;
}

/**
 * Key Vault Capability Stack
 *
 * @remarks
 * Self-contained stack that creates a complete Key Vault deployment including:
 * - Key Vault
 * - Private Endpoint for secure connectivity
 * - Private DNS Zone (or uses existing)
 * - DNS integration
 *
 * This stack follows the single responsibility principle - it creates
 * everything needed for a fully functional, privately accessible key vault.
 *
 * @example
 * Basic usage with auto-created DNS zone:
 * ```typescript
 * const vaultStack = new KeyVaultStack(app, 'KeyVault', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet
 * });
 *
 * // Access the resources
 * const vault = vaultStack.keyVault;
 * const endpoint = vaultStack.privateEndpoint;
 * ```
 *
 * @example
 * With purge protection enabled:
 * ```typescript
 * const vaultStack = new KeyVaultStack(app, 'KeyVault', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   enablePurgeProtection: true,
 *   softDeleteRetentionInDays: 90,
 *   tags: { criticality: 'high' }
 * });
 * ```
 *
 * @example
 * Using existing DNS zone:
 * ```typescript
 * const vaultStack = new KeyVaultStack(app, 'KeyVault', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   createPrivateDnsZone: false,
 *   existingPrivateDnsZone: sharedDnsZone
 * });
 * ```
 */
export class KeyVaultStack extends Construct {
  /**
   * Key Vault
   */
  public readonly keyVault: IVault;

  /**
   * Private Endpoint for Key Vault
   */
  public readonly privateEndpoint: IPrivateEndpoint;

  /**
   * Private DNS Zone for Key Vault
   */
  public readonly privateDnsZone: IPrivateDnsZone;

  /**
   * Resource Group where Key Vault is deployed
   */
  public readonly resourceGroup: IResourceGroup;

  constructor(scope: Construct, id: string, props: KeyVaultStackProps) {
    super(scope, id);

    this.resourceGroup = props.resourceGroup;

    // Merge stack tag with provided tags
    const stackTags = {
      stack: 'keyvault',
      service: 'data',
      ...props.tags,
    };

    // Create Key Vault
    this.keyVault = new Vaults(this, 'Vault', {
      location: props.resourceGroup.location,
      enableSoftDelete: props.enableSoftDelete ?? true,
      softDeleteRetentionInDays: props.softDeleteRetentionInDays ?? 90,
      enablePurgeProtection: props.enablePurgeProtection ?? false,
      enableRbacAuthorization: props.enableRbacAuthorization ?? true,
      tenantId: props.tenantId,
      tags: stackTags,
    });

    // Create or use existing Private DNS Zone
    if (props.createPrivateDnsZone !== false) {
      // Create new Private DNS Zone
      this.privateDnsZone = new PrivateDnsZones(this, 'PrivateDnsZone', {
        zoneName: 'privatelink.vaultcore.azure.net',
        tags: stackTags,
      });
    } else {
      // Use existing Private DNS Zone
      if (!props.existingPrivateDnsZone) {
        throw new Error(
          'When createPrivateDnsZone is false, existingPrivateDnsZone must be provided'
        );
      }
      this.privateDnsZone = props.existingPrivateDnsZone;
    }

    // Create Private Endpoint with DNS integration
    this.privateEndpoint = new PrivateEndpoints(this, 'KeyVaultPrivateEndpoint', {
      subnet: props.privateEndpointSubnet,
      privateLinkServiceId: (this.keyVault as Vaults).resourceId,
      groupIds: ['vault'],
      privateDnsZoneId: this.privateDnsZone.zoneId,
      tags: stackTags,
    });
  }

  /**
   * Get deployed configuration
   */
  public getDeployedConfig() {
    return {
      keyVault: {
        id: (this.keyVault as Vaults).resourceId,
        name: this.keyVault.vaultName,
        uri: `https://${this.keyVault.vaultName}.vault.azure.net/`,
      },
      privateEndpoint: {
        id: this.privateEndpoint.privateEndpointId,
        name: this.privateEndpoint.privateEndpointName,
      },
      privateDnsZone: {
        id: this.privateDnsZone.zoneId,
        name: this.privateDnsZone.zoneName,
      },
    };
  }
}
