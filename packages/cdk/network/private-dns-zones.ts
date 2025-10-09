import { Construct } from '@atakora/lib';
import type { IResourceGroup } from '@atakora/lib';
import type { IVirtualNetwork } from './virtual-network-types';
import { ArmPrivateDnsZone } from './private-dns-zone-arm';
import { ArmVirtualNetworkLink } from './virtual-network-link-arm';
import type { PrivateDnsZonesProps, IPrivateDnsZone } from './private-dns-zone-types';

/**
 * L2 construct for Azure Private DNS Zone.
 *
 * @remarks
 * Intent-based API with sensible defaults.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Location always defaults to 'global' (as required by Azure)
 * - Merges tags with parent tags
 * - NO auto-naming: zone names are specific (e.g., privatelink.blob.core.windows.net)
 *
 * **ARM Resource Type**: `Microsoft.Network/privateDnsZones`
 * **API Version**: `2024-06-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { PrivateDnsZone } from '@atakora/lib';
 *
 * const blobDnsZone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
 *   zoneName: 'privatelink.blob.core.windows.net'
 * });
 * ```
 *
 * @example
 * With virtual network links:
 * ```typescript
 * const blobDnsZone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
 *   zoneName: 'privatelink.blob.core.windows.net',
 *   virtualNetworks: vnet, // or vnet.vnetId or [vnet1, vnet2]
 *   registrationEnabled: false
 * });
 * ```
 *
 * @example
 * With tags:
 * ```typescript
 * const vaultDnsZone = new PrivateDnsZone(resourceGroup, 'VaultDnsZone', {
 *   zoneName: 'privatelink.vaultcore.azure.net',
 *   tags: { purpose: 'key-vault-connectivity' }
 * });
 * ```
 */
export class PrivateDnsZones extends Construct implements IPrivateDnsZone {
  /**
   * Underlying L1 construct.
   */
  private readonly armPrivateDnsZone: ArmPrivateDnsZone;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Virtual network links created for this DNS zone.
   */
  private readonly vnetLinks: ArmVirtualNetworkLink[] = [];

  /**
   * Name of the Private DNS zone.
   */
  public readonly zoneName: string;

  /**
   * Location of the Private DNS zone (always 'global').
   */
  public readonly location: string;

  /**
   * Resource group name where the Private DNS zone is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the Private DNS zone.
   */
  public readonly zoneId: string;

  /**
   * Tags applied to the Private DNS zone (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * Creates a new PrivateDnsZone construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - Private DNS zone properties (zoneName is REQUIRED)
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   * @throws {Error} If zoneName is not provided
   * @throws {Error} If location is provided but not 'global'
   *
   * @example
   * ```typescript
   * const zone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
   *   zoneName: 'privatelink.blob.core.windows.net'
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: PrivateDnsZonesProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Zone name is always explicit (no auto-naming for DNS zones)
    this.zoneName = props.zoneName;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Location MUST be 'global' for Private DNS zones
    // Validate if user provided a location
    if (props.location && props.location !== 'global') {
      throw new Error(
        `Private DNS zone location must be 'global', got '${props.location}'. ` +
          `Private DNS zones are global resources.`
      );
    }
    this.location = 'global';

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props.tags,
    };

    // Create underlying L1 resource
    this.armPrivateDnsZone = new ArmPrivateDnsZone(scope, `${id}-Resource`, {
      zoneName: this.zoneName,
      location: this.location,
      tags: this.tags,
    });

    // Get resource ID from L1
    this.zoneId = this.armPrivateDnsZone.zoneId;

    // Create virtual network links if provided
    if (props.virtualNetworks) {
      this.createVirtualNetworkLinks(scope, id, props);
    }
  }

  /**
   * Creates virtual network links for the Private DNS zone.
   *
   * @param scope - Parent construct
   * @param id - Base identifier for link constructs
   * @param props - Private DNS zone properties
   */
  private createVirtualNetworkLinks(
    scope: Construct,
    id: string,
    props: PrivateDnsZonesProps
  ): void {
    // Normalize virtualNetworks to an array
    const vnets = Array.isArray(props.virtualNetworks)
      ? props.virtualNetworks
      : [props.virtualNetworks!];

    // Create a link for each VNet
    vnets.forEach((vnet, index) => {
      // Resolve VNet ID
      const vnetId = typeof vnet === 'string' ? vnet : vnet.vnetId;

      // Generate a unique link name based on VNet
      const linkName = this.generateLinkName(vnetId, index);

      // Create the L1 virtual network link
      const link = new ArmVirtualNetworkLink(scope, `${id}-VNetLink-${index}`, {
        privateDnsZoneName: this.zoneName,
        linkName: linkName,
        location: 'global',
        virtualNetworkId: vnetId,
        registrationEnabled: props.registrationEnabled ?? false,
        tags: this.tags,
      });

      this.vnetLinks.push(link);
    });
  }

  /**
   * Generates a link name from a VNet resource ID.
   *
   * @param vnetId - Virtual network resource ID
   * @param index - Index for uniqueness
   * @returns Generated link name
   */
  private generateLinkName(vnetId: string, index: number): string {
    // Extract VNet name from resource ID
    const match = vnetId.match(/\/virtualNetworks\/([^/]+)/);
    const vnetName = match ? match[1] : `vnet-${index}`;

    // Generate link name: vnet-{name}-link
    let linkName = `${vnetName}-link`;

    // Sanitize name to match pattern: ^[a-zA-Z0-9][-a-zA-Z0-9]{0,78}[a-zA-Z0-9]$
    linkName = linkName.replace(/[^a-zA-Z0-9-]/g, '-');
    linkName = linkName.replace(/-+/g, '-');
    linkName = linkName.replace(/^-+|-+$/g, '');

    // Truncate to 80 characters if needed
    if (linkName.length > 80) {
      linkName = linkName.substring(0, 80).replace(/-+$/, '');
    }

    // Ensure it starts and ends with alphanumeric
    if (!/^[a-zA-Z0-9]/.test(linkName)) {
      linkName = `link-${linkName}`;
    }
    if (!/[a-zA-Z0-9]$/.test(linkName)) {
      linkName = `${linkName}-0`;
    }

    return linkName;
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'PrivateDnsZone must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }
}
