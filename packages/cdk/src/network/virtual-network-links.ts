import { Construct } from '@atakora/cdk';
import type { IVirtualNetwork } from './virtual-network-types';
import { ArmVirtualNetworkLink } from './virtual-network-link-arm';
import type { VirtualNetworkLinksProps, IVirtualNetworkLink } from './virtual-network-link-types';

/**
 * L2 construct for Azure Private DNS Zone Virtual Network Link.
 *
 * @remarks
 * Intent-based construct that provides sensible defaults and type-safe configuration
 * for creating Virtual Network Links to Private DNS Zones.
 *
 * **Resource Type**: Microsoft.Network/privateDnsZones/virtualNetworkLinks
 * **API Version**: 2024-06-01
 * **Deployment Scope**: ResourceGroup
 *
 * **Key Features**:
 * - Auto-generates link name if not provided
 * - Accepts both string IDs and IVirtualNetwork references
 * - Defaults location to 'global'
 * - Defaults registrationEnabled to false
 *
 * For maximum control over ARM properties, use {@link ArmVirtualNetworkLink} instead.
 *
 * @example
 * Link a VNet to a Private DNS zone:
 * ```typescript
 * import { VirtualNetworkLink } from '@atakora/cdk/network';
 *
 * const link = new VirtualNetworkLink(resourceGroup, 'VNetLink', {
 *   privateDnsZoneName: 'privatelink.blob.core.windows.net',
 *   virtualNetwork: vnet, // or vnet.vnetId
 *   registrationEnabled: false
 * });
 * ```
 *
 * @example
 * With auto-registration enabled:
 * ```typescript
 * const link = new VirtualNetworkLink(resourceGroup, 'VNetLink', {
 *   privateDnsZoneName: zone.zoneName,
 *   virtualNetwork: vnet,
 *   registrationEnabled: true
 * });
 * ```
 */
export class VirtualNetworkLinks extends Construct implements IVirtualNetworkLink {
  /**
   * The underlying L1 construct.
   */
  private readonly armLink: ArmVirtualNetworkLink;

  /**
   * Name of the virtual network link.
   */
  public readonly linkName: string;

  /**
   * Azure region (always 'global').
   */
  public readonly location: string;

  /**
   * Virtual network resource ID.
   */
  public readonly virtualNetworkId: string;

  /**
   * Whether auto-registration is enabled.
   */
  public readonly registrationEnabled: boolean;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * Virtual network link resource ID (alias for resourceId).
   */
  public readonly linkId: string;

  constructor(scope: Construct, id: string, props: VirtualNetworkLinksProps) {
    super(scope, id);

    // Resolve link name (auto-generate if not provided)
    this.linkName = props.linkName ?? this.generateLinkName(id);

    // Resolve location (always 'global')
    this.location = this.resolveLocation(props.location);

    // Resolve virtual network ID
    this.virtualNetworkId = this.resolveVirtualNetworkId(props.virtualNetwork);

    // Resolve registration setting
    this.registrationEnabled = props.registrationEnabled ?? false;

    // Create underlying L1 construct
    this.armLink = new ArmVirtualNetworkLink(scope, `${id}-Resource`, {
      privateDnsZoneName: props.privateDnsZoneName,
      linkName: this.linkName,
      location: this.location,
      virtualNetworkId: this.virtualNetworkId,
      registrationEnabled: this.registrationEnabled,
      tags: props.tags,
    });

    // Expose properties
    this.resourceId = this.armLink.resourceId;
    this.linkId = this.armLink.linkId;
  }

  /**
   * Generates a link name from the construct ID.
   */
  private generateLinkName(id: string): string {
    // Convert to lowercase and replace invalid characters with hyphens
    let name = id.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Remove consecutive hyphens
    name = name.replace(/-+/g, '-');

    // Ensure it starts and ends with alphanumeric
    name = name.replace(/^-+|-+$/g, '');

    // Ensure it starts with alphanumeric (prepend 'link-' if it doesn't)
    if (!/^[a-z0-9]/.test(name)) {
      name = `link-${name}`;
    }

    // Ensure it ends with alphanumeric (append '-link' if it doesn't)
    if (!/[a-z0-9]$/.test(name)) {
      name = `${name}-link`;
    }

    // Truncate to 80 characters if needed
    if (name.length > 80) {
      name = name.substring(0, 80);
      // Ensure still ends with alphanumeric after truncation
      name = name.replace(/-+$/, '');
    }

    return name;
  }

  /**
   * Resolves and validates the location.
   */
  private resolveLocation(location?: 'global'): string {
    if (location !== undefined && location !== 'global') {
      throw new Error(
        `Virtual network link location must be 'global' if specified, got '${location}'`
      );
    }
    return 'global';
  }

  /**
   * Resolves virtual network ID from string or IVirtualNetwork reference.
   */
  private resolveVirtualNetworkId(virtualNetwork: string | IVirtualNetwork): string {
    if (typeof virtualNetwork === 'string') {
      return virtualNetwork;
    }
    return virtualNetwork.vnetId;
  }

  /**
   * Import an existing Virtual Network Link by its resource ID.
   *
   * @param scope - The parent construct
   * @param id - The construct ID
   * @param linkId - The full resource ID of the virtual network link
   * @returns An IVirtualNetworkLink reference
   */
  public static fromLinkId(scope: Construct, id: string, linkId: string): IVirtualNetworkLink {
    class Import extends Construct implements IVirtualNetworkLink {
      public readonly linkId = linkId;
      public readonly resourceId = linkId;
      public readonly linkName: string;
      public readonly location = 'global';
      public readonly virtualNetworkId: string;
      public readonly registrationEnabled = false;

      constructor() {
        super(scope, id);

        // Parse link name from resource ID
        const match = linkId.match(/\/virtualNetworkLinks\/([^/]+)$/);
        if (!match) {
          throw new Error(
            `Invalid virtual network link resource ID: ${linkId}. ` +
              `Expected format: .../privateDnsZones/{zoneName}/virtualNetworkLinks/{linkName}`
          );
        }
        this.linkName = match[1];

        // We can't determine the actual virtual network ID from the link ID
        // Set to empty string as it's not needed for reference purposes
        this.virtualNetworkId = '';
      }
    }

    return new Import();
  }
}
