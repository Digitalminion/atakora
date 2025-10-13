import { Construct } from '@atakora/cdk';
import type { PublicDnsZonesProps, IPublicDnsZone } from './public-dns-zone-types';
import { DnsZoneType } from './public-dns-zone-types';
/**
 * L2 construct for Azure Public DNS Zone.
 *
 * @remarks
 * Intent-based API with sensible defaults.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Location always defaults to 'global' (as required by Azure)
 * - Merges tags with parent tags
 * - NO auto-naming: zone names are specific domain names (e.g., example.com)
 * - Automatic zone type defaulting to Public
 *
 * **ARM Resource Type**: `Microsoft.Network/dnsZones`
 * **API Version**: `2023-07-01-preview`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { PublicDnsZone } from '@atakora/cdk/network';
 *
 * const dnsZone = new PublicDnsZone(resourceGroup, 'MyDnsZone', {
 *   zoneName: 'example.com'
 * });
 * ```
 *
 * @example
 * With subdomain:
 * ```typescript
 * const apiDnsZone = new PublicDnsZone(resourceGroup, 'ApiDnsZone', {
 *   zoneName: 'api.example.com'
 * });
 * ```
 *
 * @example
 * With tags:
 * ```typescript
 * const dnsZone = new PublicDnsZone(resourceGroup, 'MyDnsZone', {
 *   zoneName: 'contoso.com',
 *   tags: {
 *     environment: 'production',
 *     managed-by: 'atakora'
 *   }
 * });
 * ```
 */
export declare class PublicDnsZones extends Construct implements IPublicDnsZone {
    /**
     * Underlying L1 construct.
     */
    private readonly armPublicDnsZone;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the Public DNS zone.
     */
    readonly zoneName: string;
    /**
     * Location of the Public DNS zone (always 'global').
     */
    readonly location: string;
    /**
     * Resource group name where the Public DNS zone is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the Public DNS zone.
     */
    readonly zoneId: string;
    /**
     * Zone type (always Public for this construct).
     */
    readonly zoneType: DnsZoneType;
    /**
     * Tags applied to the Public DNS zone (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * Name servers for this DNS zone.
     *
     * @remarks
     * These are the Azure DNS name servers that you need to configure
     * at your domain registrar. This is an ARM reference expression.
     */
    readonly nameServers?: string[];
    /**
     * Creates a new PublicDnsZone construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Public DNS zone properties (zoneName is REQUIRED)
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     * @throws {Error} If zoneName is not provided
     * @throws {Error} If zoneName is not a valid DNS name
     * @throws {Error} If location is provided but not 'global'
     *
     * @example
     * ```typescript
     * const zone = new PublicDnsZone(resourceGroup, 'MyDnsZone', {
     *   zoneName: 'example.com'
     * });
     *
     * // Access name servers (ARM reference)
     * console.log('Configure these name servers at your registrar:');
     * console.log(zone.nameServers);
     * ```
     */
    constructor(scope: Construct, id: string, props: PublicDnsZonesProps);
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
    /**
     * Gets the ARM reference expression for the name servers.
     *
     * @returns ARM reference expression to retrieve name servers
     *
     * @example
     * ```typescript
     * const zone = new PublicDnsZone(resourceGroup, 'MyDnsZone', {
     *   zoneName: 'example.com'
     * });
     *
     * // Use in ARM outputs
     * const nameServersRef = zone.getNameServersReference();
     * ```
     */
    getNameServersReference(): string;
}
//# sourceMappingURL=public-dns-zones.d.ts.map