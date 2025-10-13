import { Construct } from '@atakora/cdk';
import type { NetworkSecurityGroupsProps, INetworkSecurityGroup, SecurityRuleProtocol, SecurityRuleAccess } from './network-security-group-types';
/**
 * L2 construct for Azure Network Security Group.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates NSG name using parent naming context
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Helper methods for adding inbound/outbound rules
 *
 * **ARM Resource Type**: `Microsoft.Network/networkSecurityGroups`
 * **API Version**: `2024-07-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { NetworkSecurityGroup } from '@atakora/cdk/network';
 *
 * const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');
 * ```
 *
 * @example
 * With helper methods:
 * ```typescript
 * const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');
 *
 * nsg.addInboundRule('AllowHTTP', {
 *   protocol: SecurityRuleProtocol.TCP,
 *   destinationPortRange: '80',
 *   sourceAddressPrefix: '*',
 *   priority: 100
 * });
 *
 * nsg.addInboundRule('AllowHTTPS', {
 *   protocol: SecurityRuleProtocol.TCP,
 *   destinationPortRange: '443',
 *   sourceAddressPrefix: '*',
 *   priority: 110
 * });
 * ```
 */
export declare class NetworkSecurityGroups extends Construct implements INetworkSecurityGroup {
    /**
     * Underlying L1 construct.
     */
    private readonly armNetworkSecurityGroup;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the network security group.
     */
    readonly networkSecurityGroupName: string;
    /**
     * Location of the network security group.
     */
    readonly location: string;
    /**
     * Resource group name where the NSG is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the network security group.
     */
    readonly networkSecurityGroupId: string;
    /**
     * Tags applied to the network security group (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * Security rules (accumulated from constructor and helper methods).
     */
    private securityRules;
    /**
     * Creates a new NetworkSecurityGroup construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Optional network security group properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     *
     * @example
     * ```typescript
     * const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG', {
     *   tags: { purpose: 'web-tier' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props?: NetworkSecurityGroupsProps);
    /**
     * Adds an inbound security rule to the NSG.
     *
     * @param name - Name of the rule
     * @param options - Rule configuration (protocol, ports, addresses, priority)
     * @returns This NSG instance for method chaining
     *
     * @remarks
     * This is a helper method that simplifies adding inbound rules.
     * Source and destination defaults to '*' if not specified.
     *
     * @example
     * ```typescript
     * nsg.addInboundRule('AllowHTTP', {
     *   protocol: SecurityRuleProtocol.TCP,
     *   destinationPortRange: '80',
     *   sourceAddressPrefix: 'Internet',
     *   priority: 100
     * });
     * ```
     */
    addInboundRule(name: string, options: {
        protocol: SecurityRuleProtocol;
        destinationPortRange?: string;
        destinationPortRanges?: string[];
        sourcePortRange?: string;
        sourcePortRanges?: string[];
        sourceAddressPrefix?: string;
        sourceAddressPrefixes?: string[];
        destinationAddressPrefix?: string;
        destinationAddressPrefixes?: string[];
        access?: SecurityRuleAccess;
        priority: number;
        description?: string;
    }): this;
    /**
     * Adds an outbound security rule to the NSG.
     *
     * @param name - Name of the rule
     * @param options - Rule configuration (protocol, ports, addresses, priority)
     * @returns This NSG instance for method chaining
     *
     * @remarks
     * This is a helper method that simplifies adding outbound rules.
     * Source and destination defaults to '*' if not specified.
     *
     * @example
     * ```typescript
     * nsg.addOutboundRule('AllowHTTPS', {
     *   protocol: SecurityRuleProtocol.TCP,
     *   destinationPortRange: '443',
     *   destinationAddressPrefix: 'Internet',
     *   priority: 100
     * });
     * ```
     */
    addOutboundRule(name: string, options: {
        protocol: SecurityRuleProtocol;
        destinationPortRange?: string;
        destinationPortRanges?: string[];
        sourcePortRange?: string;
        sourcePortRanges?: string[];
        sourceAddressPrefix?: string;
        sourceAddressPrefixes?: string[];
        destinationAddressPrefix?: string;
        destinationAddressPrefixes?: string[];
        access?: SecurityRuleAccess;
        priority: number;
        description?: string;
    }): this;
    /**
     * Gets the parent ResourceGroup from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The resource group interface
     * @throws {Error} If parent is not or doesn't contain a ResourceGroup
     */
    private getParentResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroup properties
     */
    private isResourceGroup;
    /**
     * Gets tags from parent construct hierarchy.
     *
     * @param scope - Parent construct
     * @returns Tags object (empty if no tags found)
     */
    private getParentTags;
    /**
     * Resolves the NSG name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - NSG properties
     * @returns Resolved NSG name
     */
    private resolveNetworkSecurityGroupName;
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
//# sourceMappingURL=network-security-groups.d.ts.map