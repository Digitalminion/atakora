import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmVirtualNetworkProps, AddressSpace } from './types';

/**
 * L1 construct for Azure Virtual Network.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/virtualNetworks ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/virtualNetworks`
 * **API Version**: `2024-07-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link VirtualNetwork} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmVirtualNetwork } from '@azure-arm-priv/lib';
 *
 * const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
 *   virtualNetworkName: 'vnet-digital-products-colorai-nonprod-eastus-01',
 *   location: 'eastus',
 *   resourceGroupName: 'rg-network',
 *   addressSpace: {
 *     addressPrefixes: ['10.0.0.0/16']
 *   },
 *   tags: {
 *     environment: 'nonprod'
 *   }
 * });
 * ```
 *
 * @example
 * With subnets and DNS:
 * ```typescript
 * const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
 *   virtualNetworkName: 'vnet-main',
 *   location: 'eastus',
 *   resourceGroupName: 'rg-network',
 *   addressSpace: {
 *     addressPrefixes: ['10.0.0.0/16']
 *   },
 *   subnets: [
 *     {
 *       name: 'subnet-app',
 *       addressPrefix: '10.0.1.0/24'
 *     },
 *     {
 *       name: 'subnet-data',
 *       addressPrefix: '10.0.2.0/24'
 *     }
 *   ],
 *   dhcpOptions: {
 *     dnsServers: ['10.0.0.4', '10.0.0.5']
 *   }
 * });
 * ```
 */
export class ArmVirtualNetwork extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Network/virtualNetworks';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-07-01';

  /**
   * Deployment scope for virtual networks.
   */
  public readonly scope: DeploymentScope.ResourceGroup =
    DeploymentScope.ResourceGroup;

  /**
   * Name of the virtual network.
   */
  public readonly virtualNetworkName: string;

  /**
   * Resource name (same as virtualNetworkName).
   */
  public readonly name: string;

  /**
   * Azure region where the virtual network is located.
   */
  public readonly location: string;

  /**
   * Resource group name where the VNet is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Address space for the virtual network.
   */
  public readonly addressSpace: AddressSpace;

  /**
   * Tags applied to the virtual network.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{virtualNetworkName}`
   */
  public readonly resourceId: string;

  /**
   * Subnets defined inline.
   */
  public readonly subnets?: any[];

  /**
   * DHCP options.
   */
  public readonly dhcpOptions?: { dnsServers: string[] };

  /**
   * DDoS protection enabled.
   */
  public readonly enableDdosProtection: boolean;

  /**
   * VM protection enabled.
   */
  public readonly enableVmProtection: boolean;

  /**
   * Creates a new ArmVirtualNetwork construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Virtual network properties
   *
   * @throws {Error} If virtualNetworkName is empty
   * @throws {Error} If location is empty
   * @throws {Error} If addressSpace is empty or invalid
   */
  constructor(
    scope: Construct,
    id: string,
    props: ArmVirtualNetworkProps
  ) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.virtualNetworkName = props.virtualNetworkName;
    this.name = props.virtualNetworkName;
    this.location = props.location;
    this.resourceGroupName = props.resourceGroupName;
    this.addressSpace = props.addressSpace;
    this.tags = props.tags ?? {};
    this.subnets = props.subnets;
    this.dhcpOptions = props.dhcpOptions;
    this.enableDdosProtection = props.enableDdosProtection ?? false;
    this.enableVmProtection = props.enableVmProtection ?? false;

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/${this.resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${this.virtualNetworkName}`;
  }

  /**
   * Validates virtual network properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmVirtualNetworkProps): void {
    // Validate virtual network name
    if (!props.virtualNetworkName || props.virtualNetworkName.trim() === '') {
      throw new Error('Virtual network name cannot be empty');
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate resource group name
    if (!props.resourceGroupName || props.resourceGroupName.trim() === '') {
      throw new Error('Resource group name cannot be empty');
    }

    // Validate address space
    if (!props.addressSpace || !props.addressSpace.addressPrefixes) {
      throw new Error('Address space must be specified');
    }

    if (props.addressSpace.addressPrefixes.length === 0) {
      throw new Error('Address space must contain at least one address prefix');
    }

    // Validate CIDR notation for each address prefix
    props.addressSpace.addressPrefixes.forEach((prefix) => {
      if (!this.isValidCIDR(prefix)) {
        throw new Error(
          `Invalid CIDR notation: ${prefix}. Must be in format: x.x.x.x/y`
        );
      }
    });

    // Validate subnets if provided
    if (props.subnets) {
      props.subnets.forEach((subnet) => {
        if (!subnet.name || subnet.name.trim() === '') {
          throw new Error('Subnet name cannot be empty');
        }

        if (!subnet.addressPrefix || !this.isValidCIDR(subnet.addressPrefix)) {
          throw new Error(
            `Invalid subnet address prefix: ${subnet.addressPrefix}`
          );
        }
      });
    }
  }

  /**
   * Validates CIDR notation.
   *
   * @param cidr - CIDR string to validate
   * @returns True if valid CIDR notation
   */
  private isValidCIDR(cidr: string): boolean {
    // Basic CIDR validation: x.x.x.x/y
    const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    return cidrPattern.test(cidr);
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   * This will be implemented by Grace's synthesis pipeline.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): object {
    const template: any = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.virtualNetworkName,
      location: this.location,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      properties: {
        addressSpace: this.addressSpace,
      },
    };

    // Add optional properties
    if (this.subnets && this.subnets.length > 0) {
      template.properties.subnets = this.subnets;
    }

    if (this.dhcpOptions) {
      template.properties.dhcpOptions = this.dhcpOptions;
    }

    if (this.enableDdosProtection) {
      template.properties.enableDdosProtection = true;
    }

    if (this.enableVmProtection) {
      template.properties.enableVmProtection = true;
    }

    return template;
  }
}
