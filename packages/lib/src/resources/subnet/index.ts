/**
 * Azure Subnet constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure subnets within virtual networks.
 *
 * **Resource Type**: Microsoft.Network/virtualNetworks/subnets
 * **API Version**: 2024-07-01
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmSubnet } from '@azure-arm-priv/lib';
 *
 * const subnet = new ArmSubnet(vnet, 'WebSubnet', {
 *   name: 'snet-web-01',
 *   virtualNetworkName: 'vnet-prod-eastus-01',
 *   addressPrefix: '10.0.1.0/24'
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { Subnet } from '@azure-arm-priv/lib';
 *
 * const subnet = new Subnet(vnet, 'WebSubnet', {
 *   addressPrefix: '10.0.1.0/24'
 * });
 * // Auto-generates name from stack context
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmSubnet } from './arm-subnet';

// L2 construct (intent-based)
export { Subnet } from './subnet';

// Type definitions
export type {
  ArmSubnetProps,
  SubnetProps,
  ISubnet,
  ServiceEndpoint,
  Delegation,
  NetworkSecurityGroupReference,
} from './types';

// Enums
export {
  PrivateEndpointNetworkPolicies,
  PrivateLinkServiceNetworkPolicies,
  SharingScope,
} from './types';
