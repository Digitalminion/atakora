/**
 * Azure Public IP Address constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure public IP addresses.
 *
 * **Resource Type**: Microsoft.Network/publicIPAddresses
 * **API Version**: 2023-11-01
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmPublicIpAddress, PublicIPAddressSku, PublicIPAllocationMethod } from '@azure-arm-priv/lib';
 *
 * const publicIp = new ArmPublicIpAddress(resourceGroup, 'PublicIp', {
 *   publicIpAddressName: 'pip-myapp-001',
 *   location: 'eastus',
 *   sku: { name: PublicIPAddressSku.STANDARD },
 *   properties: {
 *     publicIPAllocationMethod: PublicIPAllocationMethod.STATIC
 *   }
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { PublicIpAddress } from '@azure-arm-priv/lib';
 *
 * const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');
 * // Auto-generates name, uses secure defaults
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmPublicIpAddress } from './arm-public-ip-address';

// L2 construct (intent-based)
export { PublicIpAddress } from './public-ip-address';

// Type definitions
export type {
  ArmPublicIpAddressProps,
  PublicIpAddressProps,
  IPublicIpAddress,
  PublicIPAddressSkuConfig,
} from './types';

// Enums
export {
  PublicIPAddressSku,
  PublicIPAllocationMethod,
  IpVersion,
} from './types';
