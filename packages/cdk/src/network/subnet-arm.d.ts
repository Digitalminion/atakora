import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
import type { ArmSubnetProps, PrivateEndpointNetworkPolicies, PrivateLinkServiceNetworkPolicies } from './subnet-types';
import type { ArmResource } from '@atakora/cdk';
/**
 * L1 construct for Azure Subnet.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/virtualNetworks/subnets ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/virtualNetworks/subnets`
 * **API Version**: `2024-07-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link Subnet} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmSubnet } from '@atakora/cdk/network';
 *
 * const subnet = new ArmSubnet(vnet, 'WebSubnet', {
 *   name: 'snet-web-01',
 *   virtualNetworkName: 'vnet-prod-eastus-01',
 *   addressPrefix: '10.0.1.0/24'
 * });
 * ```
 *
 * @example
 * With Network Security Group:
 * ```typescript
 * const subnet = new ArmSubnet(vnet, 'AppSubnet', {
 *   name: 'snet-app-01',
 *   virtualNetworkName: 'vnet-prod-eastus-01',
 *   addressPrefix: '10.0.2.0/24',
 *   networkSecurityGroup: {
 *     id: '/subscriptions/.../networkSecurityGroups/nsg-app'
 *   }
 * });
 * ```
 */
export declare class ArmSubnet extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for subnets.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the subnet.
     */
    readonly name: string;
    /**
     * Name of the parent virtual network.
     */
    readonly virtualNetworkName: string;
    /**
     * Address prefix for the subnet.
     */
    readonly addressPrefix?: string;
    /**
     * List of address prefixes for the subnet.
     */
    readonly addressPrefixes?: string[];
    /**
     * Network Security Group reference.
     */
    readonly networkSecurityGroup?: {
        readonly id: string;
    };
    /**
     * Service endpoints configuration.
     */
    readonly serviceEndpoints?: ReadonlyArray<{
        readonly service: string;
        readonly locations?: string[];
    }>;
    /**
     * Subnet delegations.
     */
    readonly delegations?: ReadonlyArray<{
        readonly name: string;
        readonly serviceName: string;
    }>;
    /**
     * Private endpoint network policies.
     */
    readonly privateEndpointNetworkPolicies?: PrivateEndpointNetworkPolicies;
    /**
     * Private link service network policies.
     */
    readonly privateLinkServiceNetworkPolicies?: PrivateLinkServiceNetworkPolicies;
    /**
     * Default outbound access setting.
     */
    readonly defaultOutboundAccess?: boolean;
    /**
     * Sharing scope for the subnet.
     */
    readonly sharingScope?: string;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}/subnets/{subnetName}`
     */
    readonly resourceId: string;
    /**
     * Subnet resource ID (alias for resourceId).
     */
    readonly subnetId: string;
    /**
     * Creates a new ArmSubnet construct.
     *
     * @param scope - Parent construct (typically a VirtualNetwork or ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Subnet properties
     *
     * @throws {Error} If name is empty
     * @throws {Error} If virtualNetworkName is empty
     * @throws {Error} If addressPrefix is empty (when addressPrefixes not provided)
     * @throws {Error} If both addressPrefix and addressPrefixes are provided
     */
    constructor(scope: Construct, id: string, props: ArmSubnetProps);
    /**
     * Builds an NSG reference for ARM templates.
     * Converts an NSG resource ID to a resourceId() expression.
     *
     * @param nsgId - Full resource ID of the Network Security Group
     * @returns ARM resourceId() expression
     */
    private buildNsgReference;
    /**
     * Validates subnet properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {ValidationError} If validation fails
     */
    protected validateProps(props: ArmSubnetProps): void;
    /**
     * Validates ARM template structure before transformation.
     *
     * @remarks
     * Validates the ARM-specific structure requirements for subnets.
     * Ensures delegations and other nested properties are properly formatted.
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
//# sourceMappingURL=subnet-arm.d.ts.map