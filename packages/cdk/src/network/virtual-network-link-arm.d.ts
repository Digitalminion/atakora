import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmVirtualNetworkLinkProps, IVirtualNetworkLink } from './virtual-network-link-types';
/**
 * L1 construct for Azure Private DNS Zone Virtual Network Link.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/privateDnsZones/virtualNetworkLinks ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/privateDnsZones/virtualNetworkLinks`
 * **API Version**: `2024-06-01`
 * **Deployment Scope**: ResourceGroup
 *
 * **CRITICAL CONSTRAINT**: Location MUST be 'global' (not regional)
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * defaults, use the {@link VirtualNetworkLink} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmVirtualNetworkLink } from '@atakora/cdk/network';
 *
 * const link = new ArmVirtualNetworkLink(resourceGroup, 'VNetLink', {
 *   privateDnsZoneName: 'privatelink.blob.core.windows.net',
 *   linkName: 'vnet-link',
 *   location: 'global',
 *   virtualNetworkId: '/subscriptions/.../virtualNetworks/my-vnet',
 *   registrationEnabled: false
 * });
 * ```
 */
export declare class ArmVirtualNetworkLink extends Resource implements IVirtualNetworkLink {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for Virtual Network Link.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the parent Private DNS zone.
     */
    readonly privateDnsZoneName: string;
    /**
     * Name of the virtual network link.
     */
    readonly linkName: string;
    /**
     * Resource name (same as linkName).
     */
    readonly name: string;
    /**
     * Azure region (always 'global').
     */
    readonly location: string;
    /**
     * Virtual network resource ID.
     */
    readonly virtualNetworkId: string;
    /**
     * Whether auto-registration is enabled.
     */
    readonly registrationEnabled: boolean;
    /**
     * Tags applied to the virtual network link.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/privateDnsZones/{zoneName}/virtualNetworkLinks/{linkName}`
     */
    readonly resourceId: string;
    /**
     * Virtual network link resource ID (alias for resourceId).
     */
    readonly linkId: string;
    constructor(scope: Construct, id: string, props: ArmVirtualNetworkLinkProps);
    /**
     * Validates the properties for the Virtual Network Link.
     */
    protected validateProps(props: ArmVirtualNetworkLinkProps): void;
    /**
     * Validates the ARM structure of this resource.
     *
     * @remarks
     * Called during synthesis to validate the ARM template structure.
     * Ensures all required properties are present and properly formatted.
     *
     * @returns Validation result with any errors or warnings
     */
    validateArmStructure(): ValidationResult;
    /**
     * Converts the Virtual Network Link to an ARM template resource definition.
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=virtual-network-link-arm.d.ts.map