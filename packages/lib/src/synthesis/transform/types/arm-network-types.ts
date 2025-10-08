/**
 * Strongly-typed ARM template interfaces for Azure Network resources
 *
 * These types exactly match the ARM JSON schema requirements to prevent
 * deployment failures caused by incorrect nesting or missing wrappers.
 *
 * API Version: 2023-04-01
 */

/**
 * ARM Resource ID expression type
 * Enforces proper ARM template expression format for resource references
 *
 * Valid formats:
 * - [resourceId('resourceType', 'name')]
 * - [resourceId('namespace/resourceType', 'name')]
 * - [resourceId('namespace/resourceType/subType', 'name', 'subName')]
 *
 * @example
 * const nsgId: ArmResourceId = "[resourceId('Microsoft.Network/networkSecurityGroups', 'myNSG')]";
 */
export type ArmResourceId = string; // Template literal type would be too restrictive for runtime

/**
 * ARM template expression
 * Any ARM expression starting with '[' and ending with ']'
 */
export type ArmExpression = string;

/**
 * Service endpoint configuration
 *
 * @example
 * {
 *   service: 'Microsoft.Storage',
 *   locations: ['eastus', 'westus']
 * }
 */
export interface ArmServiceEndpoint {
  /**
   * Service endpoint type
   *
   * Common values:
   * - Microsoft.Storage
   * - Microsoft.Sql
   * - Microsoft.AzureCosmosDB
   * - Microsoft.KeyVault
   * - Microsoft.ServiceBus
   * - Microsoft.EventHub
   * - Microsoft.AzureActiveDirectory
   */
  readonly service: string;

  /**
   * Azure regions where the service endpoint is available
   * @default All regions
   */
  readonly locations?: readonly string[];
}

/**
 * Subnet delegation configuration
 *
 * CRITICAL: This interface models the exact ARM schema structure.
 * The properties wrapper is REQUIRED - omitting it causes deployment failure.
 *
 * Correct structure:
 * ```json
 * {
 *   "name": "delegation-name",
 *   "properties": {
 *     "serviceName": "Microsoft.Web/serverFarms"
 *   }
 * }
 * ```
 *
 * WRONG (missing properties wrapper - will fail deployment):
 * ```json
 * {
 *   "name": "delegation-name",
 *   "serviceName": "Microsoft.Web/serverFarms"
 * }
 * ```
 *
 * @example
 * const delegation: ArmSubnetDelegation = {
 *   name: 'aci-delegation',
 *   properties: {
 *     serviceName: 'Microsoft.ContainerInstance/containerGroups'
 *   }
 * };
 */
export interface ArmSubnetDelegation {
  /**
   * Delegation name
   * Must be unique within the subnet
   */
  readonly name: string;

  /**
   * Delegation properties wrapper (REQUIRED)
   *
   * WARNING: This properties wrapper is mandatory in ARM templates.
   * Omitting it will cause deployment to fail with validation errors.
   */
  readonly properties: {
    /**
     * Service to delegate the subnet to
     *
     * Common delegation targets:
     * - Microsoft.Web/serverFarms (App Service Environment)
     * - Microsoft.ContainerInstance/containerGroups (Azure Container Instances)
     * - Microsoft.Netapp/volumes (Azure NetApp Files)
     * - Microsoft.DBforPostgreSQL/flexibleServers (PostgreSQL Flexible Server)
     * - Microsoft.DBforMySQL/flexibleServers (MySQL Flexible Server)
     * - Microsoft.Sql/managedInstances (SQL Managed Instance)
     * - Microsoft.HardwareSecurityModules/dedicatedHSMs (Dedicated HSM)
     * - Microsoft.MachineLearningServices/workspaces (Azure ML)
     * - Microsoft.Databricks/workspaces (Databricks)
     */
    readonly serviceName: string;
  };
}

/**
 * Network Security Group reference
 *
 * References an NSG by its ARM resource ID expression
 *
 * @example
 * {
 *   id: "[resourceId('Microsoft.Network/networkSecurityGroups', 'myNSG')]"
 * }
 */
export interface ArmNetworkSecurityGroupReference {
  /**
   * NSG resource ID (must be ARM expression)
   *
   * Format: [resourceId('Microsoft.Network/networkSecurityGroups', 'nsgName')]
   *
   * CRITICAL: This must be an ARM expression, not a literal string.
   * Using a literal string will cause deployment failure.
   *
   * @example "[resourceId('Microsoft.Network/networkSecurityGroups', 'myNSG')]"
   */
  readonly id: ArmResourceId;
}

/**
 * Route table reference
 *
 * @example
 * {
 *   id: "[resourceId('Microsoft.Network/routeTables', 'myRouteTable')]"
 * }
 */
export interface ArmRouteTableReference {
  /**
   * Route table resource ID (must be ARM expression)
   *
   * Format: [resourceId('Microsoft.Network/routeTables', 'routeTableName')]
   */
  readonly id: ArmResourceId;
}

/**
 * NAT Gateway reference
 *
 * @example
 * {
 *   id: "[resourceId('Microsoft.Network/natGateways', 'myNatGateway')]"
 * }
 */
export interface ArmNatGatewayReference {
  /**
   * NAT Gateway resource ID (must be ARM expression)
   *
   * Format: [resourceId('Microsoft.Network/natGateways', 'natGatewayName')]
   */
  readonly id: ArmResourceId;
}

/**
 * Subnet properties for inline subnet definition
 *
 * CRITICAL: This interface models the inline subnet format used within
 * a Virtual Network resource. The properties wrapper is REQUIRED.
 *
 * Correct inline subnet structure:
 * ```json
 * {
 *   "name": "subnet-name",
 *   "properties": {
 *     "addressPrefix": "10.0.1.0/24",
 *     "delegations": [...]
 *   }
 * }
 * ```
 *
 * @example
 * const subnet: ArmSubnet = {
 *   name: 'default',
 *   properties: {
 *     addressPrefix: '10.0.1.0/24',
 *     networkSecurityGroup: {
 *       id: "[resourceId('Microsoft.Network/networkSecurityGroups', 'myNSG')]"
 *     },
 *     delegations: [{
 *       name: 'aci-delegation',
 *       properties: {
 *         serviceName: 'Microsoft.ContainerInstance/containerGroups'
 *       }
 *     }]
 *   }
 * };
 */
export interface ArmSubnet {
  /**
   * Subnet name
   *
   * Constraints:
   * - Length: 1-80 characters
   * - Pattern: alphanumerics, underscores, periods, hyphens
   * - Must start with alphanumeric or underscore
   * - Must end with alphanumeric, underscore, or period
   */
  readonly name: string;

  /**
   * Subnet properties wrapper (REQUIRED)
   *
   * WARNING: This properties wrapper is mandatory for inline subnets.
   * Omitting it will cause deployment to fail.
   */
  readonly properties: {
    /**
     * Subnet address prefix in CIDR notation
     *
     * Must be a valid IPv4 CIDR range within the VNet's address space
     *
     * @example '10.0.1.0/24'
     * @example '192.168.1.0/26'
     */
    readonly addressPrefix: string;

    /**
     * IPv6 address prefix in CIDR notation
     *
     * @example '2001:db8::/64'
     */
    readonly addressPrefixes?: readonly string[];

    /**
     * Network Security Group reference
     *
     * Associates an NSG with this subnet for traffic filtering
     */
    readonly networkSecurityGroup?: ArmNetworkSecurityGroupReference;

    /**
     * Route table reference
     *
     * Associates a route table with this subnet for custom routing
     */
    readonly routeTable?: ArmRouteTableReference;

    /**
     * NAT Gateway reference
     *
     * Associates a NAT Gateway with this subnet for outbound connectivity
     */
    readonly natGateway?: ArmNatGatewayReference;

    /**
     * Service endpoints enabled on the subnet
     *
     * Allows direct connectivity to Azure services without public IPs
     */
    readonly serviceEndpoints?: readonly ArmServiceEndpoint[];

    /**
     * Subnet delegations
     *
     * Delegates the subnet to a specific Azure service
     *
     * CRITICAL: Each delegation must include the properties wrapper.
     * See ArmSubnetDelegation documentation for correct structure.
     */
    readonly delegations?: readonly ArmSubnetDelegation[];

    /**
     * Enable/disable private endpoint network policies
     *
     * Valid values:
     * - 'Enabled': Network policies are enforced (default)
     * - 'Disabled': Network policies are not enforced
     */
    readonly privateEndpointNetworkPolicies?: 'Enabled' | 'Disabled';

    /**
     * Enable/disable private link service network policies
     *
     * Valid values:
     * - 'Enabled': Network policies are enforced (default)
     * - 'Disabled': Network policies are not enforced
     */
    readonly privateLinkServiceNetworkPolicies?: 'Enabled' | 'Disabled';
  };
}

/**
 * Virtual Network properties
 *
 * @example
 * {
 *   addressSpace: {
 *     addressPrefixes: ['10.0.0.0/16']
 *   },
 *   subnets: [...]
 * }
 */
export interface ArmVirtualNetworkProperties {
  /**
   * Address space for the virtual network
   */
  readonly addressSpace: {
    /**
     * List of address prefixes in CIDR notation
     *
     * @example ['10.0.0.0/16', '192.168.0.0/16']
     */
    readonly addressPrefixes: readonly string[];
  };

  /**
   * Subnets defined inline within the Virtual Network
   *
   * CRITICAL: Use inline subnets (this property) OR separate subnet resources,
   * but NOT both. Mixing inline and separate subnets causes deployment failures.
   *
   * Each subnet must follow the ArmSubnet structure with properties wrapper.
   */
  readonly subnets?: readonly ArmSubnet[];

  /**
   * Enable DDoS protection
   *
   * @default false
   */
  readonly enableDdosProtection?: boolean;

  /**
   * Enable VM protection
   *
   * Prevents deletion of VMs with NICs in this VNet
   *
   * @default false
   */
  readonly enableVmProtection?: boolean;

  /**
   * DDoS protection plan reference
   *
   * Required if enableDdosProtection is true
   */
  readonly ddosProtectionPlan?: {
    readonly id: ArmResourceId;
  };

  /**
   * DNS servers for the virtual network
   *
   * If not specified, Azure-provided DNS is used
   */
  readonly dhcpOptions?: {
    readonly dnsServers?: readonly string[];
  };
}

/**
 * Complete ARM Virtual Network resource
 *
 * This is the top-level resource definition that appears in the
 * ARM template's resources array.
 *
 * @example
 * const vnet: ArmVirtualNetwork = {
 *   type: 'Microsoft.Network/virtualNetworks',
 *   apiVersion: '2023-04-01',
 *   name: 'my-vnet',
 *   location: 'eastus',
 *   properties: {
 *     addressSpace: {
 *       addressPrefixes: ['10.0.0.0/16']
 *     },
 *     subnets: [{
 *       name: 'default',
 *       properties: {
 *         addressPrefix: '10.0.1.0/24',
 *         delegations: [{
 *           name: 'aci-delegation',
 *           properties: {
 *             serviceName: 'Microsoft.ContainerInstance/containerGroups'
 *           }
 *         }]
 *       }
 *     }]
 *   }
 * };
 */
export interface ArmVirtualNetwork {
  /**
   * Resource type (MUST be 'Microsoft.Network/virtualNetworks')
   */
  readonly type: 'Microsoft.Network/virtualNetworks';

  /**
   * API version
   *
   * Recommended: '2023-04-01' (latest stable as of template generation)
   */
  readonly apiVersion: string;

  /**
   * Virtual Network name
   *
   * Constraints:
   * - Length: 2-64 characters
   * - Pattern: alphanumerics, underscores, periods, hyphens
   * - Must start with alphanumeric or underscore
   * - Must end with alphanumeric, underscore, or period
   *
   * @example 'my-vnet'
   * @example 'vnet-prod-eastus-001'
   */
  readonly name: string;

  /**
   * Azure region
   *
   * @example 'eastus'
   * @example 'westeurope'
   */
  readonly location: string;

  /**
   * Resource tags
   */
  readonly tags?: Record<string, string>;

  /**
   * Virtual Network properties (REQUIRED)
   */
  readonly properties: ArmVirtualNetworkProperties;

  /**
   * Resource dependencies
   *
   * Array of ARM resource ID expressions
   *
   * @example ["[resourceId('Microsoft.Network/networkSecurityGroups', 'myNSG')]"]
   */
  readonly dependsOn?: readonly ArmResourceId[];
}

/**
 * Network Security Rule properties
 */
export interface ArmSecurityRule {
  /**
   * Security rule name
   */
  readonly name: string;

  /**
   * Security rule properties wrapper (REQUIRED)
   */
  readonly properties: {
    /**
     * Rule description
     */
    readonly description?: string;

    /**
     * Network protocol
     */
    readonly protocol: 'Tcp' | 'Udp' | 'Icmp' | '*';

    /**
     * Source port or range
     *
     * @example '80'
     * @example '8000-8999'
     * @example '*'
     */
    readonly sourcePortRange?: string;

    /**
     * Source port ranges
     */
    readonly sourcePortRanges?: readonly string[];

    /**
     * Destination port or range
     */
    readonly destinationPortRange?: string;

    /**
     * Destination port ranges
     */
    readonly destinationPortRanges?: readonly string[];

    /**
     * Source address prefix
     *
     * @example 'Internet'
     * @example 'VirtualNetwork'
     * @example '10.0.0.0/16'
     * @example '*'
     */
    readonly sourceAddressPrefix?: string;

    /**
     * Source address prefixes
     */
    readonly sourceAddressPrefixes?: readonly string[];

    /**
     * Destination address prefix
     */
    readonly destinationAddressPrefix?: string;

    /**
     * Destination address prefixes
     */
    readonly destinationAddressPrefixes?: readonly string[];

    /**
     * Traffic access decision
     */
    readonly access: 'Allow' | 'Deny';

    /**
     * Rule priority
     *
     * Constraints:
     * - Range: 100-4096
     * - Must be unique within the NSG
     * - Lower numbers have higher priority
     */
    readonly priority: number;

    /**
     * Traffic direction
     */
    readonly direction: 'Inbound' | 'Outbound';
  };
}

/**
 * Network Security Group properties
 */
export interface ArmNetworkSecurityGroupProperties {
  /**
   * Security rules
   */
  readonly securityRules?: readonly ArmSecurityRule[];
}

/**
 * ARM Network Security Group resource
 *
 * @example
 * const nsg: ArmNetworkSecurityGroup = {
 *   type: 'Microsoft.Network/networkSecurityGroups',
 *   apiVersion: '2023-04-01',
 *   name: 'my-nsg',
 *   location: 'eastus',
 *   properties: {
 *     securityRules: [{
 *       name: 'allow-http',
 *       properties: {
 *         protocol: 'Tcp',
 *         sourcePortRange: '*',
 *         destinationPortRange: '80',
 *         sourceAddressPrefix: '*',
 *         destinationAddressPrefix: '*',
 *         access: 'Allow',
 *         priority: 100,
 *         direction: 'Inbound'
 *       }
 *     }]
 *   }
 * };
 */
export interface ArmNetworkSecurityGroup {
  /**
   * Resource type (MUST be 'Microsoft.Network/networkSecurityGroups')
   */
  readonly type: 'Microsoft.Network/networkSecurityGroups';

  /**
   * API version
   */
  readonly apiVersion: string;

  /**
   * NSG name
   *
   * Constraints:
   * - Length: 1-80 characters
   * - Pattern: alphanumerics, underscores, periods, hyphens
   * - Must start with alphanumeric or underscore
   * - Must end with alphanumeric, underscore, or period
   */
  readonly name: string;

  /**
   * Azure region
   */
  readonly location: string;

  /**
   * Resource tags
   */
  readonly tags?: Record<string, string>;

  /**
   * NSG properties
   */
  readonly properties?: ArmNetworkSecurityGroupProperties;
}
