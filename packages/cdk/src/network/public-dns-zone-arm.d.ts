import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmPublicDnsZoneProps } from './public-dns-zone-types';
import { DnsZoneType } from './public-dns-zone-types';
/**
 * L1 construct for Azure Public DNS Zone.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/dnsZones ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/dnsZones`
 * **API Version**: `2023-07-01-preview`
 * **Deployment Scope**: ResourceGroup
 *
 * **CRITICAL CONSTRAINT**: Location MUST be 'global' (not regional)
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * defaults, use the {@link PublicDnsZone} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmPublicDnsZone } from '@atakora/cdk/network';
 *
 * const zone = new ArmPublicDnsZone(resourceGroup, 'MyDnsZone', {
 *   zoneName: 'example.com',
 *   location: 'global'
 * });
 * ```
 */
export declare class ArmPublicDnsZone extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for Public DNS Zone.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the Public DNS zone.
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
     * Zone type (Public or Private).
     */
    readonly zoneType: DnsZoneType;
    /**
     * Tags applied to the Public DNS zone.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/dnsZones/{zoneName}`
     */
    readonly resourceId: string;
    /**
     * Public DNS zone resource ID (alias for resourceId).
     */
    readonly zoneId: string;
    constructor(scope: Construct, id: string, props: ArmPublicDnsZoneProps);
    /**
     * Validates the properties for the Public DNS Zone.
     */
    protected validateProps(props: ArmPublicDnsZoneProps): void;
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
     * Converts the Public DNS Zone to an ARM template resource definition.
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=public-dns-zone-arm.d.ts.map