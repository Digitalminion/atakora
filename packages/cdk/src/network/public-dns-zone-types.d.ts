/**
 * Azure Public DNS Zone type definitions.
 *
 * @remarks
 * Enums, interfaces, and types for Public DNS Zone resources.
 *
 * **Resource Type**: Microsoft.Network/dnsZones
 * **API Version**: 2023-07-01-preview
 *
 * @packageDocumentation
 */
import { schema } from '@atakora/lib';
/**
 * DNS Zone type.
 */
export declare const DnsZoneType: typeof schema.network.DnsZoneType;
export type DnsZoneType = typeof DnsZoneType[keyof typeof DnsZoneType];
/**
 * Properties for L1 ArmPublicDnsZone construct.
 */
export interface ArmPublicDnsZoneProps {
    /**
     * Name of the Public DNS zone (without a terminating dot).
     *
     * @remarks
     * Zone names must be valid DNS names (e.g., example.com, subdomain.example.com)
     * Pattern: ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$
     */
    readonly zoneName: string;
    /**
     * Azure region for the Public DNS zone.
     *
     * @remarks
     * **CRITICAL**: Public DNS zones MUST use location='global' (not regional)
     */
    readonly location: string;
    /**
     * Resource tags.
     */
    readonly tags?: Record<string, string>;
    /**
     * Zone type (optional - defaults to Public).
     *
     * @remarks
     * For public DNS zones, this should always be 'Public'.
     */
    readonly zoneType?: DnsZoneType;
}
/**
 * Properties for L2 PublicDnsZone construct.
 */
export interface PublicDnsZonesProps {
    /**
     * Name of the Public DNS zone (REQUIRED).
     *
     * @remarks
     * Public DNS zone names must be valid DNS domain names.
     * Examples:
     * - example.com
     * - subdomain.example.com
     * - api.contoso.com
     *
     * The zone name cannot end with a dot.
     */
    readonly zoneName: string;
    /**
     * Azure region (optional - always defaults to 'global').
     *
     * @remarks
     * This field is optional because it MUST always be 'global'.
     * If provided, it will be validated to ensure it's 'global'.
     */
    readonly location?: 'global';
    /**
     * Zone type (optional - defaults to Public).
     *
     * @remarks
     * For public DNS zones, this should always be 'Public'.
     * This property is rarely needed as it defaults correctly.
     */
    readonly zoneType?: DnsZoneType;
    /**
     * Resource tags (optional - merged with parent tags).
     */
    readonly tags?: Record<string, string>;
}
/**
 * Interface for Public DNS Zone resources.
 */
export interface IPublicDnsZone {
    /**
     * The name of the Public DNS zone.
     */
    readonly zoneName: string;
    /**
     * The Azure region (always 'global').
     */
    readonly location: string;
    /**
     * The resource ID of the Public DNS zone.
     */
    readonly zoneId: string;
    /**
     * The name servers for this DNS zone.
     *
     * @remarks
     * Available after zone creation. These are the Azure DNS name servers
     * that you need to configure at your domain registrar.
     */
    readonly nameServers?: string[];
}
//# sourceMappingURL=public-dns-zone-types.d.ts.map