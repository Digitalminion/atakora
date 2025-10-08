import { Construct } from '../../core/construct';
import { ArmSubnet } from './arm-subnet';
import type { SubnetProps, ISubnet, NetworkSecurityGroupReference } from './types';

/**
 * Interface for a Virtual Network (duck-typed).
 */
interface IVirtualNetwork {
  readonly virtualNetworkName: string;
  readonly location?: string;
  readonly resourceGroupName?: string;
}

/**
 * L2 construct for Azure Subnet.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates subnet name using parent naming context
 * - Inherits location and resource group from parent VNet
 * - Validates address prefix is within VNet address space (future)
 *
 * **ARM Resource Type**: `Microsoft.Network/virtualNetworks/subnets`
 * **API Version**: `2024-07-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates name):
 * ```typescript
 * import { Subnet } from '@atakora/lib';
 *
 * // Creates subnet with auto-generated name
 * const subnet = new Subnet(vnet, 'WebSubnet', {
 *   addressPrefix: '10.0.1.0/24'
 * });
 * ```
 *
 * @example
 * With Network Security Group:
 * ```typescript
 * const subnet = new Subnet(vnet, 'AppSubnet', {
 *   addressPrefix: '10.0.2.0/24',
 *   networkSecurityGroup: {
 *     id: nsg.resourceId
 *   }
 * });
 * ```
 *
 * @example
 * With service endpoints:
 * ```typescript
 * const subnet = new Subnet(vnet, 'DataSubnet', {
 *   addressPrefix: '10.0.3.0/24',
 *   serviceEndpoints: [
 *     { service: 'Microsoft.Storage' },
 *     { service: 'Microsoft.Sql', locations: ['eastus', 'westus'] }
 *   ]
 * });
 * ```
 */
export class Subnet extends Construct implements ISubnet {
  /**
   * Underlying L1 construct.
   */
  private readonly armSubnet: ArmSubnet;

  /**
   * Parent virtual network.
   */
  private readonly parentVirtualNetwork: IVirtualNetwork;

  /**
   * Name of the subnet.
   */
  public readonly subnetName: string;

  /**
   * Address prefix of the subnet.
   */
  public readonly addressPrefix: string;

  /**
   * Resource ID of the subnet.
   */
  public readonly subnetId: string;

  /**
   * Name of the parent virtual network.
   */
  public readonly virtualNetworkName: string;

  /**
   * Creates a new Subnet construct.
   *
   * @param scope - Parent construct (must be or contain a VirtualNetwork)
   * @param id - Unique identifier for this construct
   * @param props - Subnet properties
   *
   * @throws {Error} If scope does not contain a VirtualNetwork
   * @throws {Error} If addressPrefix is not provided
   *
   * @example
   * ```typescript
   * const subnet = new Subnet(vnet, 'WebSubnet', {
   *   addressPrefix: '10.0.1.0/24',
   *   networkSecurityGroup: { id: nsg.resourceId }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: SubnetProps) {
    super(scope, id);

    // Get parent virtual network
    this.parentVirtualNetwork = this.getParentVirtualNetwork(scope);

    // Store virtual network name
    this.virtualNetworkName = this.parentVirtualNetwork.virtualNetworkName;

    // Auto-generate or use provided subnet name
    this.subnetName = this.resolveSubnetName(id, props);

    // Store address prefix
    this.addressPrefix = props.addressPrefix;

    // Get parent Stack for creating L1 resource
    const parentStack = this.getParentStack(scope);

    // Create underlying L1 resource as child of Stack
    this.armSubnet = new ArmSubnet(parentStack, `${id}Subnet`, {
      name: this.subnetName,
      virtualNetworkName: this.virtualNetworkName,
      addressPrefix: props.addressPrefix,
      addressPrefixes: props.addressPrefixes,
      networkSecurityGroup: props.networkSecurityGroup,
      serviceEndpoints: props.serviceEndpoints,
      delegations: props.delegations,
      privateEndpointNetworkPolicies: props.privateEndpointNetworkPolicies,
      privateLinkServiceNetworkPolicies: props.privateLinkServiceNetworkPolicies,
      defaultOutboundAccess: props.defaultOutboundAccess,
      sharingScope: props.sharingScope,
    });

    // Set subnet ID from L1 resource
    this.subnetId = this.armSubnet.subnetId;
  }

  /**
   * Gets the parent Stack from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The stack
   * @throws {Error} If no Stack is found in the hierarchy
   */
  private getParentStack(scope: Construct): Construct {
    // Walk up the construct tree to find a Stack
    let current: Construct | undefined = scope;
    const path: string[] = [];

    while (current) {
      path.push(`${current.node.id} (${current.constructor.name})`);

      // Check if current is a Stack using duck typing
      // Stacks have a `stackName` property
      if (this.isStack(current)) {
        return current;
      }
      current = current.node.scope;
    }

    throw new Error(
      'Subnet must be created within a Stack hierarchy. ' +
        `Ensure the construct tree contains a SubscriptionStack or ResourceGroupStack.\n` +
        `Walked path: ${path.join(' <- ')}`
    );
  }

  /**
   * Checks if a construct is a Stack using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has Stack properties
   */
  private isStack(construct: Construct): boolean {
    return (
      construct &&
      (typeof (construct as any).resourceGroupName === 'string' ||
        typeof (construct as any).subscriptionId === 'string')
    );
  }

  /**
   * Gets the parent VirtualNetwork from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The virtual network interface
   * @throws {Error} If parent is not or doesn't contain a VirtualNetwork
   */
  private getParentVirtualNetwork(scope: Construct): IVirtualNetwork {
    // Walk up the construct tree to find VirtualNetwork
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IVirtualNetwork interface
      if (this.isVirtualNetwork(current)) {
        return current as IVirtualNetwork;
      }
      current = current.node.scope;
    }

    throw new Error(
      'Subnet must be created within or under a VirtualNetwork. ' +
        'Ensure the parent scope is a VirtualNetwork or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IVirtualNetwork interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has VirtualNetwork properties
   */
  private isVirtualNetwork(construct: any): construct is IVirtualNetwork {
    return construct && typeof construct.virtualNetworkName === 'string';
  }

  /**
   * Resolves the subnet name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Subnet properties
   * @returns Resolved subnet name
   */
  private resolveSubnetName(id: string, props: SubnetProps): string {
    // If name provided explicitly, use it
    if (props.name) {
      return props.name;
    }

    // Auto-generate name using parent's naming context
    // We need to get the SubscriptionStack for naming
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('snet', purpose);
    }

    // Fallback: construct a basic name from ID
    return `snet-${id.toLowerCase()}`;
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
}
