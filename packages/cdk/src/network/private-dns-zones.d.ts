import { Construct } from '@atakora/cdk';
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
 * import { PrivateDnsZone } from '@atakora/cdk/network';
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
export declare class PrivateDnsZones extends Construct implements IPrivateDnsZone {
    /**
     * Underlying L1 construct.
     */
    private readonly armPrivateDnsZone;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Virtual network links created for this DNS zone.
     */
    private readonly vnetLinks;
    /**
     * Name of the Private DNS zone.
     */
    readonly zoneName: string;
    /**
     * Location of the Private DNS zone (always 'global').
     */
    readonly location: string;
    /**
     * Resource group name where the Private DNS zone is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the Private DNS zone.
     */
    readonly zoneId: string;
    /**
     * Tags applied to the Private DNS zone (merged with parent tags).
     */
    readonly tags: Record<string, string>;
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
    constructor(scope: Construct, id: string, props: PrivateDnsZonesProps);
    /**
     * Creates virtual network links for the Private DNS zone.
     *
     * @param scope - Parent construct
     * @param id - Base identifier for link constructs
     * @param props - Private DNS zone properties
     */
    private createVirtualNetworkLinks;
    /**
     * Generates a link name from a VNet resource ID.
     *
     * @param vnetId - Virtual network resource ID
     * @param index - Index for uniqueness
     * @returns Generated link name
     */
    private generateLinkName;
    /**
     * Gets the parent ResourceGroup from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The resource group interface
     * @throws {Error} If parent is not or doesn't contain a ResourceGroup
     */
    private getParentResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroup properties
     */
    private isResourceGroup;
    /**
     * Gets tags from parent construct hierarchy.
     *
     * @param scope - Parent construct
     * @returns Tags object (empty if no tags found)
     */
    private getParentTags;
}
//# sourceMappingURL=private-dns-zones.d.ts.map