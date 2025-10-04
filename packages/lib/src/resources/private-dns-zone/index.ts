/**
 * Azure Private DNS Zone constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure Private DNS Zones and Virtual Network Links.
 *
 * **Resource Type**: Microsoft.Network/privateDnsZones
 * **API Version**: 2024-06-01
 * **Deployment Scope**: ResourceGroup
 *
 * **CRITICAL**: Private DNS zones MUST use location='global' (not regional)
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmPrivateDnsZone } from '@azure-arm-priv/lib';
 *
 * const zone = new ArmPrivateDnsZone(resourceGroup, 'BlobDnsZone', {
 *   zoneName: 'privatelink.blob.core.windows.net',
 *   location: 'global'
 * });
 * ```
 *
 * @example
 * L2 usage (with defaults):
 * ```typescript
 * import { PrivateDnsZone } from '@azure-arm-priv/lib';
 *
 * const zone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
 *   zoneName: 'privatelink.blob.core.windows.net'
 * });
 * // Location defaults to 'global'
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmPrivateDnsZone } from './arm-private-dns-zone';
export { ArmVirtualNetworkLink } from './arm-virtual-network-link';

// L2 construct (intent-based)
export { PrivateDnsZone } from './private-dns-zone';
export { VirtualNetworkLink } from './virtual-network-link';

// Type definitions
export type {
  ArmPrivateDnsZoneProps,
  PrivateDnsZoneProps,
  IPrivateDnsZone,
} from './types';

export type {
  ArmVirtualNetworkLinkProps,
  VirtualNetworkLinkProps,
  IVirtualNetworkLink,
} from './virtual-network-link-types';
