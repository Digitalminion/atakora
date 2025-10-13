import { Construct } from '@atakora/cdk';
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
export declare class VirtualNetworkLinks extends Construct implements IVirtualNetworkLink {
    /**
     * The underlying L1 construct.
     */
    private readonly armLink;
    /**
     * Name of the virtual network link.
     */
    readonly linkName: string;
    /**
     * Azure region (always 'global').
     */
    readonly location: string;
    /**
     * Virtual network resource ID.
     */
    readonly virtualNetworkId: string;
    /**
     * Whether auto-registration is enabled.
     */
    readonly registrationEnabled: boolean;
    /**
     * ARM resource ID.
     */
    readonly resourceId: string;
    /**
     * Virtual network link resource ID (alias for resourceId).
     */
    readonly linkId: string;
    constructor(scope: Construct, id: string, props: VirtualNetworkLinksProps);
    /**
     * Generates a link name from the construct ID.
     */
    private generateLinkName;
    /**
     * Resolves and validates the location.
     */
    private resolveLocation;
    /**
     * Resolves virtual network ID from string or IVirtualNetwork reference.
     */
    private resolveVirtualNetworkId;
    /**
     * Import an existing Virtual Network Link by its resource ID.
     *
     * @param scope - The parent construct
     * @param id - The construct ID
     * @param linkId - The full resource ID of the virtual network link
     * @returns An IVirtualNetworkLink reference
     */
    static fromLinkId(scope: Construct, id: string, linkId: string): IVirtualNetworkLink;
}
//# sourceMappingURL=virtual-network-links.d.ts.map