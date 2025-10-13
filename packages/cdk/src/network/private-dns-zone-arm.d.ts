import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmPrivateDnsZoneProps } from './private-dns-zone-types';
/**
 * L1 construct for Azure Private DNS Zone.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/privateDnsZones ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/privateDnsZones`
 * **API Version**: `2024-06-01`
 * **Deployment Scope**: ResourceGroup
 *
 * **CRITICAL CONSTRAINT**: Location MUST be 'global' (not regional)
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * defaults, use the {@link PrivateDnsZone} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmPrivateDnsZone } from '@atakora/cdk/network';
 *
 * const zone = new ArmPrivateDnsZone(resourceGroup, 'BlobDnsZone', {
 *   zoneName: 'privatelink.blob.core.windows.net',
 *   location: 'global'
 * });
 * ```
 */
export declare class ArmPrivateDnsZone extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for Private DNS Zone.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the Private DNS zone.
     */
    readonly zoneName: string;
    /**
     * Resource name (same as zoneName).
     */
    readonly name: string;
    /**
     * Azure region (always 'global').
     */
    readonly location: string;
    /**
     * Tags applied to the Private DNS zone.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/privateDnsZones/{zoneName}`
     */
    readonly resourceId: string;
    /**
     * Private DNS zone resource ID (alias for resourceId).
     */
    readonly zoneId: string;
    constructor(scope: Construct, id: string, props: ArmPrivateDnsZoneProps);
    /**
     * Validates the properties for the Private DNS Zone.
     */
    protected validateProps(props: ArmPrivateDnsZoneProps): void;
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
     * Converts the Private DNS Zone to an ARM template resource definition.
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=private-dns-zone-arm.d.ts.map