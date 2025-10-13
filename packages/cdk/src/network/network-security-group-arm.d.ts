import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
import type { ArmNetworkSecurityGroupProps, SecurityRule } from './network-security-group-types';
import type { ArmResource } from '@atakora/cdk';
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
 * import { ArmNetworkSecurityGroup, SecurityRuleProtocol, SecurityRuleAccess, SecurityRuleDirection } from '@atakora/cdk/network';
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
export declare class ArmNetworkSecurityGroup extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for network security groups.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the network security group.
     */
    readonly networkSecurityGroupName: string;
    /**
     * Resource name (same as networkSecurityGroupName).
     */
    readonly name: string;
    /**
     * Azure region where the NSG is located.
     */
    readonly location: string;
    /**
     * Security rules for the NSG.
     */
    readonly securityRules: SecurityRule[];
    /**
     * Tags applied to the network security group.
     */
    readonly tags: Record<string, string>;
    /**
     * Flush connection setting.
     */
    readonly flushConnection?: boolean;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/networkSecurityGroups/{nsgName}`
     */
    readonly resourceId: string;
    /**
     * Network security group resource ID (alias for resourceId).
     */
    readonly networkSecurityGroupId: string;
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
    constructor(scope: Construct, id: string, props: ArmNetworkSecurityGroupProps);
    /**
     * Validates network security group properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {ValidationError} If validation fails
     */
    protected validateProps(props: ArmNetworkSecurityGroupProps): void;
    /**
     * Validates a security rule.
     *
     * @param rule - Security rule to validate
     * @param index - Index in the rules array (for error messages)
     * @throws {ValidationError} If validation fails
     */
    private validateSecurityRule;
    /**
     * Validates that all priorities are unique.
     *
     * @param rules - Security rules to validate
     * @throws {ValidationError} If duplicate priorities are found
     */
    private validateUniquePriorities;
    /**
     * Validates ARM template structure before transformation.
     *
     * @remarks
     * Validates the ARM-specific structure requirements for network security groups.
     * Ensures security rules are properly formatted and have consistent direction/protocol combinations.
     *
     * @returns Validation result with any errors or warnings
     */
    validateArmStructure(): ValidationResult;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     * This will be implemented by Grace's synthesis pipeline.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=network-security-group-arm.d.ts.map