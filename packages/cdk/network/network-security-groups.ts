import { Construct } from '@atakora/lib';
import type { IResourceGroup } from '@atakora/lib';
import { ArmNetworkSecurityGroup } from './network-security-group-arm';
import type {
  NetworkSecurityGroupsProps,
  INetworkSecurityGroup,
  SecurityRule,
  SecurityRuleProtocol,
  SecurityRuleAccess,
  SecurityRuleDirection,
} from './network-security-group-types';

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
 * import { NetworkSecurityGroup } from '@atakora/lib';
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
export class NetworkSecurityGroups extends Construct implements INetworkSecurityGroup {
  /**
   * Underlying L1 construct.
   */
  private readonly armNetworkSecurityGroup: ArmNetworkSecurityGroup;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the network security group.
   */
  public readonly networkSecurityGroupName: string;

  /**
   * Location of the network security group.
   */
  public readonly location: string;

  /**
   * Resource group name where the NSG is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the network security group.
   */
  public readonly networkSecurityGroupId: string;

  /**
   * Tags applied to the network security group (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * Security rules (accumulated from constructor and helper methods).
   */
  private securityRules: SecurityRule[];

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
  constructor(scope: Construct, id: string, props?: NetworkSecurityGroupsProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided NSG name
    this.networkSecurityGroupName = this.resolveNetworkSecurityGroupName(id, props);

    // Default location to resource group's location or use provided
    this.location = props?.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Initialize security rules from props
    this.securityRules = props?.securityRules ? [...props.securityRules] : [];

    // Merge tags with parent (get tags from parent construct if available)
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Create underlying L1 resource
    this.armNetworkSecurityGroup = new ArmNetworkSecurityGroup(scope, `${id}NetworkSecurityGroup`, {
      networkSecurityGroupName: this.networkSecurityGroupName,
      location: this.location,
      securityRules: this.securityRules,
      tags: this.tags,
      flushConnection: props?.flushConnection,
    });

    // Get resource ID from L1
    this.networkSecurityGroupId = this.armNetworkSecurityGroup.networkSecurityGroupId;
  }

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
  public addInboundRule(
    name: string,
    options: {
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
    }
  ): this {
    const rule: SecurityRule = {
      name,
      description: options.description,
      protocol: options.protocol,
      sourcePortRange: options.sourcePortRange ?? '*',
      sourcePortRanges: options.sourcePortRanges,
      destinationPortRange: options.destinationPortRange,
      destinationPortRanges: options.destinationPortRanges,
      sourceAddressPrefix: options.sourceAddressPrefix ?? '*',
      sourceAddressPrefixes: options.sourceAddressPrefixes,
      destinationAddressPrefix: options.destinationAddressPrefix ?? '*',
      destinationAddressPrefixes: options.destinationAddressPrefixes,
      access: options.access ?? ('Allow' as SecurityRuleAccess),
      priority: options.priority,
      direction: 'Inbound' as SecurityRuleDirection,
    };

    this.securityRules.push(rule);
    return this;
  }

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
  public addOutboundRule(
    name: string,
    options: {
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
    }
  ): this {
    const rule: SecurityRule = {
      name,
      description: options.description,
      protocol: options.protocol,
      sourcePortRange: options.sourcePortRange ?? '*',
      sourcePortRanges: options.sourcePortRanges,
      destinationPortRange: options.destinationPortRange,
      destinationPortRanges: options.destinationPortRanges,
      sourceAddressPrefix: options.sourceAddressPrefix ?? '*',
      sourceAddressPrefixes: options.sourceAddressPrefixes,
      destinationAddressPrefix: options.destinationAddressPrefix ?? '*',
      destinationAddressPrefixes: options.destinationAddressPrefixes,
      access: options.access ?? ('Allow' as SecurityRuleAccess),
      priority: options.priority,
      direction: 'Outbound' as SecurityRuleDirection,
    };

    this.securityRules.push(rule);
    return this;
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
      'NetworkSecurityGroup must be created within or under a ResourceGroup. ' +
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
   * Resolves the NSG name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - NSG properties
   * @returns Resolved NSG name
   */
  private resolveNetworkSecurityGroupName(id: string, props?: NetworkSecurityGroupsProps): string {
    // If name provided explicitly, use it
    if (props?.networkSecurityGroupName) {
      return props.networkSecurityGroupName;
    }

    // Auto-generate name using parent's naming context
    // We need to get the SubscriptionStack for naming
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('nsg', purpose);
    }

    // Fallback: construct a basic name from ID
    return `nsg-${id.toLowerCase()}`;
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
