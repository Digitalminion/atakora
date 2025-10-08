/**
 * Type definitions for Network Security Group constructs.
 *
 * @packageDocumentation
 */

/**
 * Network protocol for security rules.
 */
export enum SecurityRuleProtocol {
  TCP = 'Tcp',
  UDP = 'Udp',
  ICMP = 'Icmp',
  ESP = 'Esp',
  AH = 'Ah',
  ANY = '*',
}

/**
 * Access type for security rules.
 */
export enum SecurityRuleAccess {
  ALLOW = 'Allow',
  DENY = 'Deny',
}

/**
 * Direction for security rules.
 */
export enum SecurityRuleDirection {
  INBOUND = 'Inbound',
  OUTBOUND = 'Outbound',
}

/**
 * Security rule configuration.
 *
 * @remarks
 * Defines a single security rule for network traffic filtering.
 */
export interface SecurityRule {
  /**
   * Name of the security rule.
   *
   * @remarks
   * Must be unique within the network security group.
   */
  readonly name: string;

  /**
   * Description of the security rule.
   *
   * @remarks
   * Restricted to 140 characters.
   */
  readonly description?: string;

  /**
   * Network protocol this rule applies to.
   */
  readonly protocol: SecurityRuleProtocol;

  /**
   * Source port or range.
   *
   * @remarks
   * Integer or range between 0 and 65535.
   * Asterisk '*' can be used to match all ports.
   * Examples: '80', '8000-8999', '*'
   */
  readonly sourcePortRange?: string;

  /**
   * Source port ranges.
   *
   * @remarks
   * Alternative to sourcePortRange for specifying multiple ranges.
   */
  readonly sourcePortRanges?: string[];

  /**
   * Destination port or range.
   *
   * @remarks
   * Integer or range between 0 and 65535.
   * Asterisk '*' can be used to match all ports.
   */
  readonly destinationPortRange?: string;

  /**
   * Destination port ranges.
   */
  readonly destinationPortRanges?: string[];

  /**
   * Source address prefix.
   *
   * @remarks
   * CIDR or source IP range. Asterisk '*' matches all source IPs.
   * Default tags: 'VirtualNetwork', 'AzureLoadBalancer', 'Internet'
   */
  readonly sourceAddressPrefix?: string;

  /**
   * Source address prefixes.
   */
  readonly sourceAddressPrefixes?: string[];

  /**
   * Destination address prefix.
   *
   * @remarks
   * CIDR or destination IP range.
   */
  readonly destinationAddressPrefix?: string;

  /**
   * Destination address prefixes.
   */
  readonly destinationAddressPrefixes?: string[];

  /**
   * Access type (Allow or Deny).
   */
  readonly access: SecurityRuleAccess;

  /**
   * Priority of the rule.
   *
   * @remarks
   * Value between 100 and 4096.
   * Lower priority number = higher priority.
   * Must be unique within the NSG.
   */
  readonly priority: number;

  /**
   * Direction of the rule (Inbound or Outbound).
   */
  readonly direction: SecurityRuleDirection;
}

/**
 * Properties for ArmNetworkSecurityGroup (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Network/networkSecurityGroups ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2024-07-01
 *
 * @example
 * ```typescript
 * const props: ArmNetworkSecurityGroupProps = {
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
 * };
 * ```
 */
export interface ArmNetworkSecurityGroupProps {
  /**
   * Name of the network security group.
   */
  readonly networkSecurityGroupName: string;

  /**
   * Azure region where the NSG will be created.
   *
   * @remarks
   * Examples: 'eastus', 'westus2', 'centralus'
   */
  readonly location: string;

  /**
   * Security rules for the NSG.
   *
   * @remarks
   * Array of security rule configurations.
   */
  readonly securityRules?: SecurityRule[];

  /**
   * Tags to apply to the network security group.
   */
  readonly tags?: Record<string, string>;

  /**
   * Flush connections when rules are updated.
   *
   * @remarks
   * When enabled, flows created from NSG connections will be
   * re-evaluated when rules are updated.
   */
  readonly flushConnection?: boolean;
}

/**
 * Properties for NetworkSecurityGroup (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses parent location
 * const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');
 *
 * // With initial rules
 * const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG', {
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
 */
export interface NetworkSecurityGroupProps {
  /**
   * Name of the network security group.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context:
   * - Format: `nsg-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `nsg-digital-minion-authr-web-nonprod-eus-00`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly networkSecurityGroupName?: string;

  /**
   * Azure region where the NSG will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * Initial security rules for the NSG.
   */
  readonly securityRules?: SecurityRule[];

  /**
   * Tags to apply to the network security group.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;

  /**
   * Flush connections when rules are updated.
   */
  readonly flushConnection?: boolean;
}

/**
 * Interface for Network Security Group reference.
 *
 * @remarks
 * Allows resources to reference an NSG without depending on the construct class.
 */
export interface INetworkSecurityGroup {
  /**
   * Name of the network security group.
   */
  readonly networkSecurityGroupName: string;

  /**
   * Location of the network security group.
   */
  readonly location: string;

  /**
   * Resource ID of the network security group.
   */
  readonly networkSecurityGroupId: string;
}
