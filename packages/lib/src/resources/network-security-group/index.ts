/**
 * Azure Network Security Group constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure network security groups.
 *
 * **Resource Type**: Microsoft.Network/networkSecurityGroups
 * **API Version**: 2024-07-01
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmNetworkSecurityGroup, SecurityRuleProtocol, SecurityRuleAccess, SecurityRuleDirection } from '@azure-arm-priv/lib';
 *
 * const nsg = new ArmNetworkSecurityGroup(resourceGroup, 'WebNSG', {
 *   networkSecurityGroupName: 'nsg-web-01',
 *   location: 'eastus',
 *   securityRules: [
 *     {
 *       name: 'AllowHTTP',
 *       protocol: SecurityRuleProtocol.TCP,
 *       sourcePortRange: '*',
 *       destinationPortRange: '80',
 *       sourceAddressPrefix: '*',
 *       destinationAddressPrefix: '*',
 *       access: SecurityRuleAccess.ALLOW,
 *       priority: 100,
 *       direction: SecurityRuleDirection.INBOUND
 *     }
 *   ]
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation with helper methods):
 * ```typescript
 * import { NetworkSecurityGroup, SecurityRuleProtocol } from '@azure-arm-priv/lib';
 *
 * const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');
 *
 * nsg.addInboundRule('AllowHTTP', {
 *   protocol: SecurityRuleProtocol.TCP,
 *   destinationPortRange: '80',
 *   sourceAddressPrefix: 'Internet',
 *   priority: 100
 * });
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmNetworkSecurityGroup } from './arm-network-security-group';

// L2 construct (intent-based)
export { NetworkSecurityGroup } from './network-security-group';

// Type definitions
export type {
  ArmNetworkSecurityGroupProps,
  NetworkSecurityGroupProps,
  INetworkSecurityGroup,
  SecurityRule,
} from './types';

// Enums
export {
  SecurityRuleProtocol,
  SecurityRuleAccess,
  SecurityRuleDirection,
} from './types';
