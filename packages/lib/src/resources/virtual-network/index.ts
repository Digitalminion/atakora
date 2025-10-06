/**
 * Azure Virtual Network constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure virtual networks.
 *
 * **Resource Type**: Microsoft.Network/virtualNetworks
 * **API Version**: 2024-07-01
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmVirtualNetwork } from '@atakora/lib';
 *
 * const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
 *   virtualNetworkName: 'vnet-explicit-name',
 *   location: 'eastus',
 *   resourceGroupName: 'rg-network',
 *   addressSpace: {
 *     addressPrefixes: ['10.0.0.0/16']
 *   },
 *   tags: { env: 'prod' }
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { VirtualNetwork } from '@atakora/lib';
 *
 * const vnet = new VirtualNetwork(resourceGroup, 'MainVNet', {
 *   addressSpace: '10.0.0.0/16'
 * });
 * // Auto-generates name, location, tags from parent context
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmVirtualNetwork } from './arm-virtual-network';

// L2 construct (intent-based)
export { VirtualNetwork } from './virtual-network';

// Type definitions
export type {
  ArmVirtualNetworkProps,
  VirtualNetworkProps,
  IVirtualNetwork,
  AddressSpace,
  DhcpOptions,
  InlineSubnetProps,
} from './types';
