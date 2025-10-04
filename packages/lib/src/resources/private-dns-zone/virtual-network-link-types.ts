/**
 * Azure Private DNS Zone Virtual Network Link type definitions.
 *
 * @remarks
 * Enums, interfaces, and types for Private DNS Zone Virtual Network Link resources.
 *
 * **Resource Type**: Microsoft.Network/privateDnsZones/virtualNetworkLinks
 * **API Version**: 2024-06-01
 *
 * @packageDocumentation
 */

import type { IVirtualNetwork } from '../virtual-network/types';

/**
 * Properties for L1 ArmVirtualNetworkLink construct.
 */
export interface ArmVirtualNetworkLinkProps {
  /**
   * Name of the virtual network link.
   *
   * @remarks
   * Must be unique within the Private DNS zone.
   * Pattern: ^[a-zA-Z0-9][-a-zA-Z0-9]{0,78}[a-zA-Z0-9]$
   */
  readonly linkName: string;

  /**
   * Name of the parent Private DNS zone.
   */
  readonly privateDnsZoneName: string;

  /**
   * Azure region for the virtual network link.
   *
   * @remarks
   * **CRITICAL**: Virtual network links MUST use location='global' (not regional)
   */
  readonly location: string;

  /**
   * Reference to the virtual network resource.
   *
   * @remarks
   * Must be a valid virtual network resource ID.
   */
  readonly virtualNetworkId: string;

  /**
   * Is auto-registration of virtual machine records enabled?
   *
   * @remarks
   * If true, VM DNS records are automatically registered in the private DNS zone.
   * Default: false
   */
  readonly registrationEnabled?: boolean;

  /**
   * Resource tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for L2 VirtualNetworkLink construct.
 */
export interface VirtualNetworkLinkProps {
  /**
   * Name of the virtual network link (optional - auto-generated if not provided).
   *
   * @remarks
   * If not provided, a name will be generated based on the construct ID.
   */
  readonly linkName?: string;

  /**
   * Name of the parent Private DNS zone.
   */
  readonly privateDnsZoneName: string;

  /**
   * Azure region (optional - always defaults to 'global').
   *
   * @remarks
   * This field is optional because it MUST always be 'global'.
   * If provided, it will be validated to ensure it's 'global'.
   */
  readonly location?: 'global';

  /**
   * Reference to the virtual network.
   *
   * @remarks
   * Can be either:
   * - A virtual network resource ID string
   * - An IVirtualNetwork interface reference
   */
  readonly virtualNetwork: string | IVirtualNetwork;

  /**
   * Enable auto-registration of VM DNS records (optional - defaults to false).
   *
   * @remarks
   * When true, VMs in the linked VNet will have their DNS records
   * automatically registered in the private DNS zone.
   */
  readonly registrationEnabled?: boolean;

  /**
   * Resource tags (optional - merged with parent tags).
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Virtual Network Link resources.
 */
export interface IVirtualNetworkLink {
  /**
   * The name of the virtual network link.
   */
  readonly linkName: string;

  /**
   * The Azure region (always 'global').
   */
  readonly location: string;

  /**
   * The resource ID of the virtual network link.
   */
  readonly linkId: string;

  /**
   * The resource ID of the virtual network link (alias for linkId).
   */
  readonly resourceId: string;

  /**
   * The resource ID of the linked virtual network.
   */
  readonly virtualNetworkId: string;

  /**
   * Whether auto-registration is enabled.
   */
  readonly registrationEnabled: boolean;
}
