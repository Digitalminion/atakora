/**
 * Strongly-typed ARM template definitions for Microsoft.Network resources
 *
 * @remarks
 * These types ensure compile-time safety when transforming constructs to ARM JSON.
 * All types map 1:1 to the Azure ARM API schema to prevent runtime errors.
 *
 * @packageDocumentation
 */

/**
 * ARM subnet resource within a virtual network
 *
 * @remarks
 * Maps to properties.subnets[] in Microsoft.Network/virtualNetworks
 */
export interface ArmSubnet {
  /**
   * Name of the subnet
   */
  name: string;

  /**
   * Subnet properties wrapper (required by ARM schema)
   */
  properties: ArmSubnetProperties;
}

/**
 * Properties for an ARM subnet
 */
export interface ArmSubnetProperties {
  /**
   * Address prefix in CIDR notation (e.g., "10.0.1.0/24")
   */
  addressPrefix: string;

  /**
   * Network security group reference
   */
  networkSecurityGroup?: ArmSubresourceReference;

  /**
   * Service endpoints for the subnet
   */
  serviceEndpoints?: ArmServiceEndpoint[];

  /**
   * Subnet delegations to Azure services
   */
  delegations?: ArmSubnetDelegation[];

  /**
   * Route table reference
   */
  routeTable?: ArmSubresourceReference;

  /**
   * NAT gateway reference
   */
  natGateway?: ArmSubresourceReference;

  /**
   * Private endpoint network policies
   */
  privateEndpointNetworkPolicies?: 'Enabled' | 'Disabled';

  /**
   * Private link service network policies
   */
  privateLinkServiceNetworkPolicies?: 'Enabled' | 'Disabled';
}

/**
 * Service endpoint configuration for a subnet
 */
export interface ArmServiceEndpoint {
  /**
   * Service type (e.g., "Microsoft.Storage", "Microsoft.Sql")
   */
  service: string;

  /**
   * List of locations (optional)
   */
  locations?: string[];
}

/**
 * Subnet delegation to an Azure service
 *
 * @remarks
 * ARM requires delegations to be in format:
 * { name: "string", properties: { serviceName: "string" } }
 */
export interface ArmSubnetDelegation {
  /**
   * Name of the delegation
   */
  name: string;

  /**
   * Delegation properties wrapper (required by ARM schema)
   */
  properties: {
    /**
     * Service name to delegate to (e.g., "Microsoft.Web/serverFarms")
     */
    serviceName: string;
  };
}

/**
 * Reference to another ARM subresource
 *
 * @remarks
 * Used for NSG, route table, NAT gateway references
 */
export interface ArmSubresourceReference {
  /**
   * Full ARM resource ID or ARM expression
   * @example "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/networkSecurityGroups/{nsg}"
   * @example "[resourceId('Microsoft.Network/networkSecurityGroups', 'nsg-name')]"
   */
  id: string;
}

/**
 * Virtual network address space
 */
export interface ArmAddressSpace {
  /**
   * Array of address prefixes in CIDR notation
   * @example ["10.0.0.0/16", "10.1.0.0/16"]
   */
  addressPrefixes: string[];
}

/**
 * DHCP options for virtual network
 */
export interface ArmDhcpOptions {
  /**
   * List of DNS server IP addresses
   * @example ["10.0.0.4", "10.0.0.5"]
   */
  dnsServers: string[];
}

/**
 * Properties for Microsoft.Network/virtualNetworks ARM resource
 */
export interface ArmVirtualNetworkProperties {
  /**
   * Address space for the virtual network (required)
   */
  addressSpace: ArmAddressSpace;

  /**
   * Subnets defined inline within the VNet
   */
  subnets?: ArmSubnet[];

  /**
   * DHCP options configuration
   */
  dhcpOptions?: ArmDhcpOptions;

  /**
   * Enable DDoS protection
   */
  enableDdosProtection?: boolean;

  /**
   * Enable VM protection
   */
  enableVmProtection?: boolean;
}

/**
 * Type guard to validate ArmSubnet structure
 */
export function isValidArmSubnet(subnet: unknown): subnet is ArmSubnet {
  if (typeof subnet !== 'object' || subnet === null) {
    return false;
  }

  const s = subnet as any;

  // Must have name and properties
  if (typeof s.name !== 'string' || !s.name) {
    return false;
  }

  if (typeof s.properties !== 'object' || s.properties === null) {
    return false;
  }

  // Properties must have addressPrefix
  if (typeof s.properties.addressPrefix !== 'string' || !s.properties.addressPrefix) {
    return false;
  }

  return true;
}

/**
 * Type guard to validate ArmSubnetDelegation structure
 */
export function isValidArmSubnetDelegation(delegation: unknown): delegation is ArmSubnetDelegation {
  if (typeof delegation !== 'object' || delegation === null) {
    return false;
  }

  const d = delegation as any;

  // Must have name and properties wrapper
  if (typeof d.name !== 'string' || !d.name) {
    return false;
  }

  if (typeof d.properties !== 'object' || d.properties === null) {
    return false;
  }

  // Properties must have serviceName
  if (typeof d.properties.serviceName !== 'string' || !d.properties.serviceName) {
    return false;
  }

  return true;
}

/**
 * Type guard to validate ArmVirtualNetworkProperties structure
 */
export function isValidArmVirtualNetworkProperties(
  props: unknown
): props is ArmVirtualNetworkProperties {
  if (typeof props !== 'object' || props === null) {
    return false;
  }

  const p = props as any;

  // Must have addressSpace
  if (typeof p.addressSpace !== 'object' || p.addressSpace === null) {
    return false;
  }

  // addressSpace must have addressPrefixes array
  if (!Array.isArray(p.addressSpace.addressPrefixes) || p.addressSpace.addressPrefixes.length === 0) {
    return false;
  }

  // All addressPrefixes must be strings
  if (!p.addressSpace.addressPrefixes.every((prefix: any) => typeof prefix === 'string')) {
    return false;
  }

  // If subnets exist, validate them
  if (p.subnets !== undefined) {
    if (!Array.isArray(p.subnets)) {
      return false;
    }

    if (!p.subnets.every((subnet: any) => isValidArmSubnet(subnet))) {
      return false;
    }
  }

  return true;
}
