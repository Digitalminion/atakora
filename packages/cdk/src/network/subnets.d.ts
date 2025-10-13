import { Construct } from '@atakora/cdk';
import type { SubnetsProps, ISubnet } from './subnet-types';
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
 * import { Subnet } from '@atakora/cdk/network';
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
export declare class Subnets extends Construct implements ISubnet {
    /**
     * Underlying L1 construct.
     */
    private readonly armSubnet;
    /**
     * Parent virtual network.
     */
    private readonly parentVirtualNetwork;
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
    /**
     * Name of the parent virtual network.
     */
    readonly virtualNetworkName: string;
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
    constructor(scope: Construct, id: string, props: SubnetsProps);
    /**
     * Gets the parent Stack from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The stack
     * @throws {Error} If no Stack is found in the hierarchy
     */
    private getParentStack;
    /**
     * Checks if a construct is a Stack using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has Stack properties
     */
    private isStack;
    /**
     * Gets the parent VirtualNetwork from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The virtual network interface
     * @throws {Error} If parent is not or doesn't contain a VirtualNetwork
     */
    private getParentVirtualNetwork;
    /**
     * Checks if a construct implements IVirtualNetwork interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has VirtualNetwork properties
     */
    private isVirtualNetwork;
    /**
     * Resolves the subnet name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Subnet properties
     * @returns Resolved subnet name
     */
    private resolveSubnetName;
    /**
     * Gets the SubscriptionStack from the construct tree.
     *
     * @returns SubscriptionStack or undefined if not found
     */
    private getSubscriptionStack;
    /**
     * Converts construct ID to purpose identifier for naming.
     *
     * @param id - Construct ID
     * @returns Purpose string for naming
     */
    private constructIdToPurpose;
}
//# sourceMappingURL=subnets.d.ts.map