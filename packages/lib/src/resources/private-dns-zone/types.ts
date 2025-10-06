/**
 * Azure Private DNS Zone type definitions.
 *
 * @remarks
 * Enums, interfaces, and types for Private DNS Zone resources.
 *
 * **Resource Type**: Microsoft.Network/privateDnsZones
 * **API Version**: 2024-06-01
 *
 * @packageDocumentation
 */

import type { IVirtualNetwork } from '../virtual-network/types';

/**
 * Properties for L1 ArmPrivateDnsZone construct.
 */
export interface ArmPrivateDnsZoneProps {
  /**
   * Name of the Private DNS zone (without a terminating dot).
   *
   * @remarks
   * Zone names are FQDN format (e.g., privatelink.blob.core.windows.net)
   * No specific pattern validation as zone names follow DNS conventions
   */
  readonly zoneName: string;

  /**
   * Azure region for the Private DNS zone.
   *
   * @remarks
   * **CRITICAL**: Private DNS zones MUST use location='global' (not regional)
   */
  readonly location: string;

  /**
   * Resource tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for L2 PrivateDnsZone construct.
 */
export interface PrivateDnsZoneProps {
  /**
   * Name of the Private DNS zone (REQUIRED - no auto-naming).
   *
   * @remarks
   * Private DNS zone names are specific and cannot be auto-generated.
   * Common examples:
   * - privatelink.blob.core.windows.net
   * - privatelink.vaultcore.azure.net
   * - privatelink.documents.azure.com
   * - privatelink.search.windows.net
   * - privatelink.openai.azure.com
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
   * Virtual networks to link to this Private DNS zone (optional).
   *
   * @remarks
   * When provided, virtual network links will be automatically created.
   * Can be a single VNet or an array of VNets.
   * Each VNet can be either a string (resource ID) or IVirtualNetwork reference.
   *
   * For more control over link properties (like auto-registration),
   * use the VirtualNetworkLink construct separately.
   */
  readonly virtualNetworks?: string | IVirtualNetwork | Array<string | IVirtualNetwork>;

  /**
   * Enable auto-registration of VM DNS records (optional - defaults to false).
   *
   * @remarks
   * Only applies when virtualNetworks are provided.
   * When true, VMs in the linked VNets will have their DNS records
   * automatically registered in the private DNS zone.
   */
  readonly registrationEnabled?: boolean;

  /**
   * Resource tags (optional - merged with parent tags).
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Private DNS Zone resources.
 */
export interface IPrivateDnsZone {
  /**
   * The name of the Private DNS zone.
   */
  readonly zoneName: string;

  /**
   * The Azure region (always 'global').
   */
  readonly location: string;

  /**
   * The resource ID of the Private DNS zone.
   */
  readonly zoneId: string;
}
