import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmNetworkSecurityGroupProps, SecurityRule } from './types';

/**
 * L1 construct for Azure Network Security Group.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/networkSecurityGroups ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/networkSecurityGroups`
 * **API Version**: `2024-07-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link NetworkSecurityGroup} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmNetworkSecurityGroup, SecurityRuleProtocol, SecurityRuleAccess, SecurityRuleDirection } from '@atakora/lib';
 *
 * const nsg = new ArmNetworkSecurityGroup(resourceGroup, 'WebNSG', {
 *   networkSecurityGroupName: 'nsg-web-01',
 *   location: 'eastus',
 *   securityRules: [
 *     {
 *       name: 'AllowHTTP',
 *       protocol: SecurityRuleProtocol.TCP,
 *       sourcePortRange: '*',
 *       destinationPortRange: '80',
 *       sourceAddressPrefix: '*',
 *       destinationAddressPrefix: '*',
 *       access: SecurityRuleAccess.ALLOW,
 *       priority: 100,
 *       direction: SecurityRuleDirection.INBOUND
 *     }
 *   ]
 * });
 * ```
 */
export class ArmNetworkSecurityGroup extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Network/networkSecurityGroups';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-07-01';

  /**
   * Deployment scope for network security groups.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the network security group.
   */
  public readonly networkSecurityGroupName: string;

  /**
   * Resource name (same as networkSecurityGroupName).
   */
  public readonly name: string;

  /**
   * Azure region where the NSG is located.
   */
  public readonly location: string;

  /**
   * Security rules for the NSG.
   */
  public readonly securityRules: SecurityRule[];

  /**
   * Tags applied to the network security group.
   */
  public readonly tags: Record<string, string>;

  /**
   * Flush connection setting.
   */
  public readonly flushConnection?: boolean;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/networkSecurityGroups/{nsgName}`
   */
  public readonly resourceId: string;

  /**
   * Network security group resource ID (alias for resourceId).
   */
  public readonly networkSecurityGroupId: string;

  /**
   * Creates a new ArmNetworkSecurityGroup construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Network security group properties
   *
   * @throws {Error} If networkSecurityGroupName is empty
   * @throws {Error} If location is empty
   * @throws {Error} If security rule validation fails
   */
  constructor(scope: Construct, id: string, props: ArmNetworkSecurityGroupProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.networkSecurityGroupName = props.networkSecurityGroupName;
    this.name = props.networkSecurityGroupName;
    this.location = props.location;
    this.securityRules = props.securityRules ?? [];
    this.tags = props.tags ?? {};
    this.flushConnection = props.flushConnection;

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/networkSecurityGroups/${this.networkSecurityGroupName}`;
    this.networkSecurityGroupId = this.resourceId;
  }

  /**
   * Validates network security group properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmNetworkSecurityGroupProps): void {
    // Validate NSG name
    if (!props.networkSecurityGroupName || props.networkSecurityGroupName.trim() === '') {
      throw new Error('Network security group name cannot be empty');
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate security rules if provided
    if (props.securityRules) {
      props.securityRules.forEach((rule, index) => {
        this.validateSecurityRule(rule, index);
      });

      // Check for duplicate priorities
      this.validateUniquePriorities(props.securityRules);
    }
  }

  /**
   * Validates a security rule.
   *
   * @param rule - Security rule to validate
   * @param index - Index in the rules array (for error messages)
   * @throws {Error} If validation fails
   */
  private validateSecurityRule(rule: SecurityRule, index: number): void {
    // Validate name
    if (!rule.name || rule.name.trim() === '') {
      throw new Error(`Security rule at index ${index}: name cannot be empty`);
    }

    // Validate description length
    if (rule.description && rule.description.length > 140) {
      throw new Error(`Security rule '${rule.name}': description cannot exceed 140 characters`);
    }

    // Validate priority range
    if (rule.priority < 100 || rule.priority > 4096) {
      throw new Error(
        `Security rule '${rule.name}': priority must be between 100 and 4096 (got ${rule.priority})`
      );
    }

    // Validate that at least one source port is specified
    if (!rule.sourcePortRange && (!rule.sourcePortRanges || rule.sourcePortRanges.length === 0)) {
      throw new Error(
        `Security rule '${rule.name}': either sourcePortRange or sourcePortRanges must be specified`
      );
    }

    // Validate that at least one destination port is specified
    if (
      !rule.destinationPortRange &&
      (!rule.destinationPortRanges || rule.destinationPortRanges.length === 0)
    ) {
      throw new Error(
        `Security rule '${rule.name}': either destinationPortRange or destinationPortRanges must be specified`
      );
    }

    // Validate that at least one source address is specified
    if (
      !rule.sourceAddressPrefix &&
      (!rule.sourceAddressPrefixes || rule.sourceAddressPrefixes.length === 0)
    ) {
      throw new Error(
        `Security rule '${rule.name}': either sourceAddressPrefix or sourceAddressPrefixes must be specified`
      );
    }

    // Validate that at least one destination address is specified
    if (
      !rule.destinationAddressPrefix &&
      (!rule.destinationAddressPrefixes || rule.destinationAddressPrefixes.length === 0)
    ) {
      throw new Error(
        `Security rule '${rule.name}': either destinationAddressPrefix or destinationAddressPrefixes must be specified`
      );
    }
  }

  /**
   * Validates that all priorities are unique.
   *
   * @param rules - Security rules to validate
   * @throws {Error} If duplicate priorities are found
   */
  private validateUniquePriorities(rules: SecurityRule[]): void {
    const priorities = new Set<number>();
    const duplicates: number[] = [];

    rules.forEach((rule) => {
      if (priorities.has(rule.priority)) {
        duplicates.push(rule.priority);
      }
      priorities.add(rule.priority);
    });

    if (duplicates.length > 0) {
      throw new Error(
        `Security rules have duplicate priorities: ${duplicates.join(', ')}. ` +
          `Each rule must have a unique priority.`
      );
    }
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
    const properties: any = {};

    // Add security rules if present
    if (this.securityRules.length > 0) {
      properties.securityRules = this.securityRules.map((rule) => ({
        name: rule.name,
        properties: {
          description: rule.description,
          protocol: rule.protocol,
          sourcePortRange: rule.sourcePortRange,
          sourcePortRanges: rule.sourcePortRanges,
          destinationPortRange: rule.destinationPortRange,
          destinationPortRanges: rule.destinationPortRanges,
          sourceAddressPrefix: rule.sourceAddressPrefix,
          sourceAddressPrefixes: rule.sourceAddressPrefixes,
          destinationAddressPrefix: rule.destinationAddressPrefix,
          destinationAddressPrefixes: rule.destinationAddressPrefixes,
          access: rule.access,
          priority: rule.priority,
          direction: rule.direction,
        },
      }));
    }

    // Add flush connection if specified
    if (this.flushConnection !== undefined) {
      properties.flushConnection = this.flushConnection;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.networkSecurityGroupName,
      location: this.location,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
    };
  }
}
