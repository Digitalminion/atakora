import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
import type { ArmVirtualNetworkProps, AddressSpace, InlineSubnetProps } from './virtual-network-types';
import type { ArmResource } from '@atakora/cdk';
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
 * import { ArmVirtualNetwork } from '@atakora/cdk/network';
 *
 * const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
 *   virtualNetworkName: 'vnet-digital-minion-authr-nonprod-eastus-01',
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
export declare class ArmVirtualNetwork extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for virtual networks.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the virtual network.
     */
    readonly virtualNetworkName: string;
    /**
     * Resource name (same as virtualNetworkName).
     */
    readonly name: string;
    /**
     * Azure region where the virtual network is located.
     */
    readonly location: string;
    /**
     * Resource group name where the VNet is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Address space for the virtual network.
     */
    readonly addressSpace: AddressSpace;
    /**
     * Tags applied to the virtual network.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{virtualNetworkName}`
     */
    readonly resourceId: string;
    /**
     * Subnets defined inline within the VNet resource.
     *
     * @remarks
     * **IMPORTANT**: Inline subnets prevent "AnotherOperationInProgress" errors.
     *
     * When subnets are defined inline (as part of the VNet's properties.subnets array),
     * Azure creates them atomically with the VNet in a single operation. This is the
     * recommended approach for most scenarios.
     *
     * **Inline Subnets (Recommended)**:
     * - All subnets created in one atomic VNet operation
     * - No concurrent modification conflicts
     * - Faster deployment (single operation)
     * - Defined in properties.subnets[] of the VNet ARM template
     *
     * **Separate Subnet Resources (Not Recommended)**:
     * - Each subnet is a separate Microsoft.Network/virtualNetworks/subnets resource
     * - Multiple concurrent updates to the VNet
     * - Risk of "AnotherOperationInProgress" errors
     * - Slower deployment (N+1 operations for N subnets)
     *
     * @example
     * ```typescript
     * const vnet = new ArmVirtualNetwork(scope, 'VNet', {
     *   virtualNetworkName: 'my-vnet',
     *   location: 'eastus',
     *   addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
     *   subnets: [
     *     {
     *       name: 'subnet-1',
     *       addressPrefix: '10.0.1.0/24',
     *       networkSecurityGroup: { id: nsgId }
     *     },
     *     {
     *       name: 'subnet-2',
     *       addressPrefix: '10.0.2.0/24'
     *     }
     *   ]
     * });
     * ```
     */
    readonly subnets?: InlineSubnetProps[];
    /**
     * DHCP options.
     */
    readonly dhcpOptions?: {
        dnsServers: string[];
    };
    /**
     * DDoS protection enabled.
     */
    readonly enableDdosProtection: boolean;
    /**
     * VM protection enabled.
     */
    readonly enableVmProtection: boolean;
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
    constructor(scope: Construct, id: string, props: ArmVirtualNetworkProps);
    /**
     * Validates virtual network properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {ValidationError} If validation fails
     */
    protected validateProps(props: ArmVirtualNetworkProps): void;
    /**
     * Validates inline subnet configurations.
     *
     * @param subnets - Inline subnet configurations
     * @param addressSpace - VNet address space for range validation
     * @throws {ValidationError} If validation fails
     */
    private validateInlineSubnets;
    /**
     * Validates ARM template structure before transformation.
     *
     * @remarks
     * This validates the ARM-specific structure requirements that must be met
     * after the toArmTemplate transformation. This catches issues that would
     * cause deployment failures.
     *
     * **Critical Validations**:
     * - Delegation structure has properties wrapper (caused "InvalidServiceNameOnDelegation" error)
     * - Subnet address prefixes are at correct nesting level
     * - NSG references use ARM expressions, not literal strings
     *
     * @returns Validation result with any errors or warnings
     */
    validateArmStructure(): ValidationResult;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     *
     * **Inline Subnets**: If subnets are defined, they will be included in the
     * `properties.subnets` array of the VNet resource. This causes Azure to create
     * all subnets atomically with the VNet in a single deployment operation,
     * preventing "AnotherOperationInProgress" errors.
     *
     * **Generated Template Structure**:
     * ```json
     * {
     *   "type": "Microsoft.Network/virtualNetworks",
     *   "name": "vnet-name",
     *   "properties": {
     *     "addressSpace": { "addressPrefixes": ["10.0.0.0/16"] },
     *     "subnets": [
     *       {
     *         "name": "subnet-1",
     *         "properties": {
     *           "addressPrefix": "10.0.1.0/24",
     *           "networkSecurityGroup": { "id": "[resourceId(...)]" },
     *           "delegations": [
     *             {
     *               "name": "delegation",
     *               "properties": { "serviceName": "Microsoft.Web/serverFarms" }
     *             }
     *           ]
     *         }
     *       }
     *     ]
     *   },
     *   "dependsOn": [
     *     "[resourceId('Microsoft.Network/networkSecurityGroups', 'nsg-1')]"
     *   ]
     * }
     * ```
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=virtual-network-arm.d.ts.map