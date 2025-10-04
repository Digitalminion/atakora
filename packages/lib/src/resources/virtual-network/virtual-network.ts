import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmVirtualNetwork } from './arm-virtual-network';
import type { VirtualNetworkProps, IVirtualNetwork, AddressSpace, InlineSubnetProps } from './types';

/**
 * L2 construct for Azure Virtual Network.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates VNet name using parent naming context
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Simplifies address space specification (string or array)
 * - Helper methods for subnet management (future)
 *
 * **ARM Resource Type**: `Microsoft.Network/virtualNetworks`
 * **API Version**: `2024-07-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { VirtualNetwork } from '@azure-arm-priv/lib';
 *
 * // Creates VNet with auto-generated name and defaults
 * const vnet = new VirtualNetwork(resourceGroup, 'MainVNet', {
 *   addressSpace: '10.0.0.0/16'
 * });
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const vnet = new VirtualNetwork(resourceGroup, 'MainVNet', {
 *   virtualNetworkName: 'my-custom-vnet',
 *   addressSpace: ['10.0.0.0/16', '10.1.0.0/16'],
 *   dnsServers: ['10.0.0.4', '10.0.0.5'],
 *   enableDdosProtection: true,
 *   tags: {
 *     costCenter: '1234'
 *   }
 * });
 * ```
 *
 * @example
 * Used as parent for subnets:
 * ```typescript
 * const vnet = new VirtualNetwork(resourceGroup, 'MainVNet', {
 *   addressSpace: '10.0.0.0/16'
 * });
 *
 * // Future: Subnets can be added with helper method
 * // const subnet = vnet.addSubnet({ name: 'app', addressPrefix: '10.0.1.0/24' });
 * ```
 */
export class VirtualNetwork extends Construct implements IVirtualNetwork {
  /**
   * Underlying L1 construct.
   */
  private readonly armVirtualNetwork: ArmVirtualNetwork;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the virtual network.
   */
  public readonly virtualNetworkName: string;

  /**
   * Location of the virtual network.
   */
  public readonly location: string;

  /**
   * Resource group name where the VNet is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Address space of the virtual network.
   */
  public readonly addressSpace: AddressSpace;

  /**
   * Tags applied to the virtual network (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * DNS servers configured for the VNet.
   */
  public readonly dnsServers?: string[];

  /**
   * DDoS protection enabled.
   */
  public readonly enableDdosProtection: boolean;

  /**
   * VM protection enabled.
   */
  public readonly enableVmProtection: boolean;

  /**
   * Virtual network ID (alias for resourceId).
   */
  public get vnetId(): string {
    return this.armVirtualNetwork.resourceId;
  }

  /**
   * Creates a new VirtualNetwork construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - Virtual network properties
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   * @throws {Error} If addressSpace is not provided
   *
   * @example
   * ```typescript
   * const vnet = new VirtualNetwork(resourceGroup, 'MainVNet', {
   *   addressSpace: '10.0.0.0/16',
   *   dnsServers: ['10.0.0.4']
   * });
   * ```
   */
  constructor(
    scope: Construct,
    id: string,
    props: VirtualNetworkProps
  ) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided virtual network name
    this.virtualNetworkName = this.resolveVirtualNetworkName(id, props);

    // Default location to resource group's location or use provided
    this.location = props.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Convert address space from string/array to AddressSpace format
    this.addressSpace = this.normalizeAddressSpace(props.addressSpace);

    // Store optional properties
    this.dnsServers = props.dnsServers;
    this.enableDdosProtection = props.enableDdosProtection ?? false;
    this.enableVmProtection = props.enableVmProtection ?? false;

    // Merge tags with parent (get tags from parent construct if available)
    this.tags = {
      ...this.getParentTags(scope),
      ...props.tags,
    };

    // Create underlying L1 resource
    this.armVirtualNetwork = new ArmVirtualNetwork(scope, `${id}VirtualNetwork`, {
      virtualNetworkName: this.virtualNetworkName,
      location: this.location,
      resourceGroupName: this.resourceGroupName,
      addressSpace: this.addressSpace,
      dhcpOptions: this.dnsServers ? { dnsServers: this.dnsServers } : undefined,
      enableDdosProtection: this.enableDdosProtection,
      enableVmProtection: this.enableVmProtection,
      tags: this.tags,
    });
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'VirtualNetwork must be created within or under a ResourceGroup. ' +
      'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  /**
   * Resolves the virtual network name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Virtual network properties
   * @returns Resolved virtual network name
   */
  private resolveVirtualNetworkName(
    id: string,
    props: VirtualNetworkProps
  ): string {
    // If name provided explicitly, use it
    if (props.virtualNetworkName) {
      return props.virtualNetworkName;
    }

    // Auto-generate name using parent's naming context
    // We need to get the SubscriptionStack for naming
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('vnet', purpose);
    }

    // Fallback: construct a basic name from ID
    return `vnet-${id.toLowerCase()}`;
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }

  /**
   * Normalizes address space from string or array to AddressSpace format.
   *
   * @param addressSpace - Address space as string or array
   * @returns AddressSpace object
   */
  private normalizeAddressSpace(addressSpace: string | string[]): AddressSpace {
    if (typeof addressSpace === 'string') {
      return {
        addressPrefixes: [addressSpace],
      };
    }

    return {
      addressPrefixes: addressSpace,
    };
  }

  /**
   * Future: Add a subnet to the virtual network.
   *
   * @param props - Subnet properties
   * @returns Subnet construct
   *
   * @remarks
   * This will be implemented when the Subnet construct is available.
   * For now, subnets should be created as separate resources.
   *
   * @example
   * ```typescript
   * const subnet = vnet.addSubnet({
   *   name: 'application',
   *   addressPrefix: '10.0.1.0/24'
   * });
   * ```
   */
  public addSubnet(props: InlineSubnetProps): any {
    throw new Error(
      'addSubnet() is not yet implemented. ' +
      'Subnets should be created as separate Subnet resources for now. ' +
      'This helper method will be available in a future release.'
    );
  }
}
