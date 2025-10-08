/**
 * Type definitions for Virtual Network constructs.
 *
 * @packageDocumentation
 */

/**
 * Address space for virtual network.
 *
 * @remarks
 * Contains array of IP address ranges in CIDR notation.
 */
export interface AddressSpace {
  /**
   * Array of IP address ranges in CIDR notation.
   *
   * @example ['10.0.0.0/16', '10.1.0.0/16']
   */
  readonly addressPrefixes: string[];
}

/**
 * DHCP options for virtual network.
 */
export interface DhcpOptions {
  /**
   * Array of DNS server IP addresses.
   *
   * @example ['10.0.0.4', '10.0.0.5']
   */
  readonly dnsServers: string[];
}

/**
 * Subnet configuration for inline subnet definition.
 *
 * @remarks
 * **RECOMMENDED APPROACH**: Use inline subnets to prevent deployment conflicts.
 *
 * Inline subnets are defined within the VNet's `properties.subnets` array in the
 * ARM template. This causes Azure to create all subnets atomically as part of the
 * VNet creation operation, preventing "AnotherOperationInProgress" errors that
 * occur when deploying subnets as separate resources.
 *
 * **Benefits of Inline Subnets**:
 * - Single atomic VNet creation (no concurrent updates)
 * - No "AnotherOperationInProgress" errors
 * - Faster deployment (one operation instead of N+1)
 * - Simpler dependency management
 *
 * **When to Use Separate Subnet Resources**:
 * - When you need to add subnets to an existing VNet
 * - When subnets need to be managed independently (rare)
 * - When using external VNet management tools
 *
 * @example
 * ```typescript
 * const inlineSubnet: InlineSubnetProps = {
 *   name: 'app-subnet',
 *   addressPrefix: '10.0.1.0/24',
 *   networkSecurityGroup: {
 *     id: nsg.networkSecurityGroupId
 *   },
 *   serviceEndpoints: [
 *     { service: 'Microsoft.Storage' }
 *   ]
 * };
 * ```
 */
export interface InlineSubnetProps {
  /**
   * Name of the subnet.
   */
  readonly name: string;

  /**
   * Address prefix for the subnet in CIDR notation.
   *
   * @remarks
   * Must be within the VNet's address space.
   *
   * @example '10.0.1.0/24'
   */
  readonly addressPrefix: string;

  /**
   * Network security group ID to associate with the subnet.
   *
   * @example '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/networkSecurityGroups/{nsg}'
   */
  readonly networkSecurityGroup?: { id: string };

  /**
   * Service endpoints for the subnet.
   *
   * @example [{ service: 'Microsoft.Storage' }, { service: 'Microsoft.Sql' }]
   */
  readonly serviceEndpoints?: Array<{ service: string }>;

  /**
   * Delegations for the subnet.
   *
   * @example [{ name: 'delegation', serviceName: 'Microsoft.Web/serverFarms' }]
   */
  readonly delegations?: Array<{ name: string; serviceName: string }>;
}

/**
 * Properties for ArmVirtualNetwork (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Network/virtualNetworks ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2024-07-01
 *
 * @example
 * ```typescript
 * const props: ArmVirtualNetworkProps = {
 *   virtualNetworkName: 'vnet-digital-minion-authr-nonprod-eastus-01',
 *   location: 'eastus',
 *   addressSpace: {
 *     addressPrefixes: ['10.0.0.0/16']
 *   },
 *   tags: {
 *     environment: 'nonprod'
 *   }
 * };
 * ```
 */
export interface ArmVirtualNetworkProps {
  /**
   * Name of the virtual network.
   */
  readonly virtualNetworkName: string;

  /**
   * Azure region where the virtual network will be created.
   */
  readonly location: string;

  /**
   * Resource group name where the VNet will be deployed.
   *
   * @remarks
   * Required for generating the full resource ID.
   */
  readonly resourceGroupName: string;

  /**
   * Address space for the virtual network.
   *
   * @remarks
   * Must contain at least one address prefix in CIDR notation.
   */
  readonly addressSpace: AddressSpace;

  /**
   * Subnets to create within the virtual network.
   *
   * @remarks
   * Can be defined inline or created separately after VNet deployment.
   */
  readonly subnets?: InlineSubnetProps[];

  /**
   * DHCP options (DNS servers).
   */
  readonly dhcpOptions?: DhcpOptions;

  /**
   * Enable DDoS protection.
   *
   * @default false
   */
  readonly enableDdosProtection?: boolean;

  /**
   * Enable VM protection.
   *
   * @default false
   */
  readonly enableVmProtection?: boolean;

  /**
   * Tags to apply to the virtual network.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for VirtualNetwork (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name, uses stack location and RG
 * const vnet = new VirtualNetwork(resourceGroup, 'MainVNet', {
 *   addressSpace: '10.0.0.0/16'
 * });
 *
 * // With custom properties
 * const vnet = new VirtualNetwork(resourceGroup, 'MainVNet', {
 *   virtualNetworkName: 'my-custom-vnet',
 *   addressSpace: ['10.0.0.0/16', '10.1.0.0/16'],
 *   dnsServers: ['10.0.0.4', '10.0.0.5']
 * });
 * ```
 */
export interface VirtualNetworkProps {
  /**
   * Name of the virtual network.
   *
   * @remarks
   * If not provided, will be auto-generated using the parent's naming context.
   */
  readonly virtualNetworkName?: string;

  /**
   * Azure region where the virtual network will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * Address space for the virtual network.
   *
   * @remarks
   * Can be specified as:
   * - Single string: '10.0.0.0/16'
   * - Array of strings: ['10.0.0.0/16', '10.1.0.0/16']
   *
   * Will be converted to AddressSpace format internally.
   */
  readonly addressSpace: string | string[];

  /**
   * DNS servers for the virtual network.
   *
   * @remarks
   * If not specified, VMs will use Azure-provided DNS.
   */
  readonly dnsServers?: string[];

  /**
   * Enable DDoS protection.
   *
   * @default false
   */
  readonly enableDdosProtection?: boolean;

  /**
   * Enable VM protection.
   *
   * @default false
   */
  readonly enableVmProtection?: boolean;

  /**
   * Tags to apply to the virtual network.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   * Tags specified here take precedence over parent tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Virtual Network reference.
 *
 * @remarks
 * Allows resources to reference a virtual network without depending on the construct class.
 */
export interface IVirtualNetwork {
  /**
   * Name of the virtual network.
   */
  readonly virtualNetworkName: string;

  /**
   * Location of the virtual network.
   */
  readonly location: string;

  /**
   * Resource group name where the VNet is deployed.
   */
  readonly resourceGroupName: string;

  /**
   * Address space of the virtual network.
   */
  readonly addressSpace: AddressSpace;

  /**
   * Resource ID of the virtual network.
   */
  readonly vnetId: string;
}
