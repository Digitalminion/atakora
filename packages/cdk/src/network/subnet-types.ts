/**
 * Type definitions for Subnet constructs.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * Network policies for private endpoints.
 */
export const PrivateEndpointNetworkPolicies = schema.network.PrivateEndpointNetworkPolicies;
export type PrivateEndpointNetworkPolicies = typeof PrivateEndpointNetworkPolicies[keyof typeof PrivateEndpointNetworkPolicies];

/**
 * Network policies for private link service.
 */
export const PrivateLinkServiceNetworkPolicies = schema.network.PrivateLinkServiceNetworkPolicies;
export type PrivateLinkServiceNetworkPolicies = typeof PrivateLinkServiceNetworkPolicies[keyof typeof PrivateLinkServiceNetworkPolicies];

/**
 * Sharing scope for the subnet.
 */
export const SharingScope = schema.network.SharingScope;
export type SharingScope = typeof SharingScope[keyof typeof SharingScope];

/**
 * Service endpoint configuration.
 *
 * @remarks
 * Defines a service endpoint to enable direct connectivity from the subnet
 * to specific Azure services.
 */
export interface ServiceEndpoint {
  /**
   * The type of the endpoint service (e.g., 'Microsoft.Storage', 'Microsoft.Sql').
   */
  readonly service: string;

  /**
   * A list of locations where the service endpoint is enabled.
   *
   * @remarks
   * If not specified, the service endpoint is enabled in all locations.
   */
  readonly locations?: string[];
}

/**
 * Delegation configuration for a subnet.
 *
 * @remarks
 * Allows delegating a subnet to a specific Azure service.
 */
export interface Delegation {
  /**
   * Name of the delegation.
   */
  readonly name: string;

  /**
   * The service name to which the subnet should be delegated.
   *
   * @example
   * 'Microsoft.Web/serverFarms', 'Microsoft.Sql/managedInstances'
   */
  readonly serviceName: string;
}

/**
 * Reference to a Network Security Group.
 */
export interface NetworkSecurityGroupReference {
  /**
   * Resource ID of the Network Security Group.
   */
  readonly id: string;
}

/**
 * Properties for ArmSubnet (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Network/virtualNetworks/subnets ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2024-07-01
 *
 * @example
 * ```typescript
 * const props: ArmSubnetProps = {
 *   name: 'subnet-web-01',
 *   virtualNetworkName: 'vnet-prod-eastus-01',
 *   addressPrefix: '10.0.1.0/24',
 *   networkSecurityGroup: {
 *     id: '/subscriptions/.../networkSecurityGroups/nsg-web'
 *   }
 * };
 * ```
 */
export interface ArmSubnetProps {
  /**
   * Name of the subnet.
   *
   * @remarks
   * Must be unique within the virtual network.
   */
  readonly name: string;

  /**
   * Name of the parent virtual network.
   *
   * @remarks
   * Required for constructing the resource ID and deployment path.
   */
  readonly virtualNetworkName: string;

  /**
   * The address prefix for the subnet in CIDR notation.
   *
   * @remarks
   * Example: '10.0.1.0/24'
   * Must be within the address space of the parent virtual network.
   * Either addressPrefix or addressPrefixes must be provided, but not both.
   */
  readonly addressPrefix?: string;

  /**
   * List of address prefixes for the subnet.
   *
   * @remarks
   * Use either addressPrefix or addressPrefixes, not both.
   */
  readonly addressPrefixes?: string[];

  /**
   * Reference to the Network Security Group resource.
   */
  readonly networkSecurityGroup?: NetworkSecurityGroupReference;

  /**
   * Array of service endpoints.
   */
  readonly serviceEndpoints?: ServiceEndpoint[];

  /**
   * Array of delegations for the subnet.
   */
  readonly delegations?: Delegation[];

  /**
   * Enable or disable network policies for private endpoints.
   *
   * @defaultValue 'Disabled'
   */
  readonly privateEndpointNetworkPolicies?: PrivateEndpointNetworkPolicies;

  /**
   * Enable or disable network policies for private link service.
   *
   * @defaultValue 'Enabled'
   */
  readonly privateLinkServiceNetworkPolicies?: PrivateLinkServiceNetworkPolicies;

  /**
   * Disable default outbound connectivity for all VMs in the subnet.
   *
   * @remarks
   * Can only be set at subnet creation time.
   */
  readonly defaultOutboundAccess?: boolean;

  /**
   * Sharing scope for the subnet.
   *
   * @remarks
   * Can only be set if defaultOutboundAccess is false.
   */
  readonly sharingScope?: SharingScope;
}

/**
 * Properties for Subnet (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name
 * const subnet = new Subnet(vnet, 'WebSubnet', {
 *   addressPrefix: '10.0.1.0/24'
 * });
 *
 * // With Network Security Group
 * const subnet = new Subnet(vnet, 'AppSubnet', {
 *   addressPrefix: '10.0.2.0/24',
 *   networkSecurityGroup: nsg
 * });
 * ```
 */
export interface SubnetsProps {
  /**
   * Name of the subnet.
   *
   * @remarks
   * If not provided, will be auto-generated using the parent's naming context:
   * - Format: `snet-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `snet-digital-minion-authr-web-nonprod-eus-00`
   *
   * The `purpose` is derived from the construct ID (e.g., 'WebSubnet' -> 'websubnet').
   */
  readonly name?: string;

  /**
   * The address prefix for the subnet in CIDR notation.
   *
   * @remarks
   * Example: '10.0.1.0/24'
   * Must be within the address space of the parent virtual network.
   */
  readonly addressPrefix: string;

  /**
   * List of address prefixes for the subnet.
   *
   * @remarks
   * Use either addressPrefix or addressPrefixes, not both.
   */
  readonly addressPrefixes?: string[];

  /**
   * Reference to a Network Security Group.
   *
   * @remarks
   * Can be an INetworkSecurityGroup construct or a reference object with id.
   */
  readonly networkSecurityGroup?: NetworkSecurityGroupReference;

  /**
   * Array of service endpoints.
   */
  readonly serviceEndpoints?: ServiceEndpoint[];

  /**
   * Array of delegations for the subnet.
   */
  readonly delegations?: Delegation[];

  /**
   * Enable or disable network policies for private endpoints.
   *
   * @defaultValue 'Disabled'
   */
  readonly privateEndpointNetworkPolicies?: PrivateEndpointNetworkPolicies;

  /**
   * Enable or disable network policies for private link service.
   *
   * @defaultValue 'Enabled'
   */
  readonly privateLinkServiceNetworkPolicies?: PrivateLinkServiceNetworkPolicies;

  /**
   * Disable default outbound connectivity for all VMs in the subnet.
   */
  readonly defaultOutboundAccess?: boolean;

  /**
   * Sharing scope for the subnet.
   */
  readonly sharingScope?: SharingScope;
}

/**
 * Interface for Subnet reference.
 *
 * @remarks
 * Allows resources to reference a subnet without depending on the construct class.
 */
export interface ISubnet {
  /**
   * Name of the subnet.
   */
  readonly subnetName: string;

  /**
   * Address prefix of the subnet.
   */
  readonly addressPrefix: string;

  /**
   * Resource ID of the subnet.
   */
  readonly subnetId: string;
}
