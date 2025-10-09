import { Construct } from '@atakora/lib';
import { Resource } from '@atakora/lib';
import { DeploymentScope } from '@atakora/lib';
import type { ArmNetworkSecurityGroupProps, SecurityRule } from './network-security-group-types';
import {
  ValidationResult,
  ValidationResultBuilder,
  ValidationError,
  isValidPortRange,
} from '@atakora/lib';

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
   * @throws {ValidationError} If validation fails
   */
  protected validateProps(props: ArmNetworkSecurityGroupProps): void {
    // Validate NSG name
    if (!props.networkSecurityGroupName || props.networkSecurityGroupName.trim() === '') {
      throw new ValidationError(
        'Network security group name cannot be empty',
        'NSG names are required for all network security groups',
        'Provide a valid network security group name'
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new ValidationError(
        'Location cannot be empty',
        'Network security groups must be deployed to a specific Azure region',
        'Provide a valid Azure region (e.g., "eastus", "westus2")'
      );
    }

    // Validate security rules if provided
    if (props.securityRules && props.securityRules.length > 0) {
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
   * @throws {ValidationError} If validation fails
   */
  private validateSecurityRule(rule: SecurityRule, index: number): void {
    // Validate name
    if (!rule.name || rule.name.trim() === '') {
      throw new ValidationError(
        `Security rule at index ${index}: name cannot be empty`,
        'All security rules must have a name',
        'Provide a descriptive name for the rule (e.g., "AllowHTTP")',
        `securityRules[${index}].name`
      );
    }

    // Validate description length
    if (rule.description && rule.description.length > 140) {
      throw new ValidationError(
        `Security rule '${rule.name}': description too long`,
        `Description has ${rule.description.length} characters but maximum is 140`,
        'Shorten the description to 140 characters or less',
        `securityRules[${index}].description`
      );
    }

    // Validate priority range
    if (rule.priority < 100 || rule.priority > 4096) {
      throw new ValidationError(
        `Security rule '${rule.name}': priority out of range`,
        `Priority ${rule.priority} is not within valid range 100-4096`,
        'Use a priority between 100 and 4096',
        `securityRules[${index}].priority`
      );
    }

    // Validate that at least one source port is specified
    if (!rule.sourcePortRange && (!rule.sourcePortRanges || rule.sourcePortRanges.length === 0)) {
      throw new ValidationError(
        `Security rule '${rule.name}': missing source port specification`,
        'Either sourcePortRange or sourcePortRanges must be specified',
        'Add sourcePortRange (e.g., "*" or "80" or "1000-2000")',
        `securityRules[${index}].sourcePortRange`
      );
    }

    // Validate source port range format
    if (rule.sourcePortRange && !isValidPortRange(rule.sourcePortRange)) {
      throw new ValidationError(
        `Security rule '${rule.name}': invalid source port range`,
        `Port range '${rule.sourcePortRange}' is not valid`,
        'Use format: "*", single port (e.g., "80"), or range (e.g., "1000-2000")',
        `securityRules[${index}].sourcePortRange`
      );
    }

    // Validate that at least one destination port is specified
    if (
      !rule.destinationPortRange &&
      (!rule.destinationPortRanges || rule.destinationPortRanges.length === 0)
    ) {
      throw new ValidationError(
        `Security rule '${rule.name}': missing destination port specification`,
        'Either destinationPortRange or destinationPortRanges must be specified',
        'Add destinationPortRange (e.g., "*" or "443" or "8000-9000")',
        `securityRules[${index}].destinationPortRange`
      );
    }

    // Validate destination port range format
    if (rule.destinationPortRange && !isValidPortRange(rule.destinationPortRange)) {
      throw new ValidationError(
        `Security rule '${rule.name}': invalid destination port range`,
        `Port range '${rule.destinationPortRange}' is not valid`,
        'Use format: "*", single port (e.g., "443"), or range (e.g., "8000-9000")',
        `securityRules[${index}].destinationPortRange`
      );
    }

    // Validate that at least one source address is specified
    if (
      !rule.sourceAddressPrefix &&
      (!rule.sourceAddressPrefixes || rule.sourceAddressPrefixes.length === 0)
    ) {
      throw new ValidationError(
        `Security rule '${rule.name}': missing source address specification`,
        'Either sourceAddressPrefix or sourceAddressPrefixes must be specified',
        'Add sourceAddressPrefix (e.g., "*", "Internet", or CIDR like "10.0.0.0/24")',
        `securityRules[${index}].sourceAddressPrefix`
      );
    }

    // Validate that at least one destination address is specified
    if (
      !rule.destinationAddressPrefix &&
      (!rule.destinationAddressPrefixes || rule.destinationAddressPrefixes.length === 0)
    ) {
      throw new ValidationError(
        `Security rule '${rule.name}': missing destination address specification`,
        'Either destinationAddressPrefix or destinationAddressPrefixes must be specified',
        'Add destinationAddressPrefix (e.g., "*", "VirtualNetwork", or CIDR like "10.0.1.0/24")',
        `securityRules[${index}].destinationAddressPrefix`
      );
    }

    // Validate protocol
    if (!rule.protocol) {
      throw new ValidationError(
        `Security rule '${rule.name}': missing protocol`,
        'Protocol is required for all security rules',
        'Specify protocol: "Tcp", "Udp", "Icmp", or "*"',
        `securityRules[${index}].protocol`
      );
    }

    // Validate access
    if (!rule.access) {
      throw new ValidationError(
        `Security rule '${rule.name}': missing access`,
        'Access (Allow/Deny) is required for all security rules',
        'Specify access: "Allow" or "Deny"',
        `securityRules[${index}].access`
      );
    }

    // Validate direction
    if (!rule.direction) {
      throw new ValidationError(
        `Security rule '${rule.name}': missing direction`,
        'Direction is required for all security rules',
        'Specify direction: "Inbound" or "Outbound"',
        `securityRules[${index}].direction`
      );
    }
  }

  /**
   * Validates that all priorities are unique.
   *
   * @param rules - Security rules to validate
   * @throws {ValidationError} If duplicate priorities are found
   */
  private validateUniquePriorities(rules: SecurityRule[]): void {
    const priorities = new Map<number, string>();
    const duplicates: Array<{ priority: number; rules: string[] }> = [];

    rules.forEach((rule) => {
      if (priorities.has(rule.priority)) {
        const existingRule = priorities.get(rule.priority)!;
        duplicates.push({
          priority: rule.priority,
          rules: [existingRule, rule.name],
        });
      }
      priorities.set(rule.priority, rule.name);
    });

    if (duplicates.length > 0) {
      const duplicateDetails = duplicates
        .map((d) => `Priority ${d.priority}: rules [${d.rules.join(', ')}]`)
        .join('; ');

      throw new ValidationError(
        'Security rules have duplicate priorities',
        duplicateDetails,
        'Each security rule must have a unique priority. Assign different priority values to each rule.',
        'securityRules[].priority'
      );
    }
  }

  /**
   * Validates ARM template structure before transformation.
   *
   * @remarks
   * Validates the ARM-specific structure requirements for network security groups.
   * Ensures security rules are properly formatted and have consistent direction/protocol combinations.
   *
   * @returns Validation result with any errors or warnings
   */
  public validateArmStructure(): ValidationResult {
    const builder = new ValidationResultBuilder();

    // Generate ARM template to validate structure
    const armTemplate = this.toArmTemplate() as any;

    // Validate security rules structure in ARM format
    if (armTemplate.properties?.securityRules) {
      armTemplate.properties.securityRules.forEach((rule: any, index: number) => {
        // Validate rule has properties wrapper
        if (!rule.properties) {
          builder.addError(
            `Security rule at index ${index} missing properties wrapper`,
            'ARM template security rules must have a properties object',
            'Ensure toArmTemplate() wraps rule properties correctly',
            `armTemplate.properties.securityRules[${index}]`
          );
          return;
        }

        // Validate priority is in properties
        if (rule.priority !== undefined && rule.properties.priority === undefined) {
          builder.addError(
            `Security rule ${rule.name} has priority at wrong nesting level`,
            'Priority must be inside properties object, not at rule root',
            'Move priority to properties.priority',
            `armTemplate.properties.securityRules[${index}].priority`
          );
        }

        // Validate direction consistency with port ranges
        if (
          rule.properties.direction === 'Inbound' &&
          rule.properties.destinationPortRange === '*'
        ) {
          builder.addWarning(
            `Security rule ${rule.name} allows all inbound ports`,
            'Inbound rule with destination port "*" may be overly permissive',
            'Consider restricting to specific ports for better security',
            `armTemplate.properties.securityRules[${index}].properties.destinationPortRange`
          );
        }

        // Validate protocol consistency with port specifications
        if (
          rule.properties.protocol === 'Icmp' &&
          (rule.properties.destinationPortRange !== '*' || rule.properties.sourcePortRange !== '*')
        ) {
          builder.addWarning(
            `Security rule ${rule.name} uses ICMP with specific ports`,
            'ICMP protocol does not use ports; port specifications are ignored',
            'Use "*" for both source and destination ports with ICMP',
            `armTemplate.properties.securityRules[${index}].properties.protocol`
          );
        }
      });
    }

    return builder.build();
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
