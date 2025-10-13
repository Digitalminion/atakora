import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmPublicIpAddressProps, PublicIPAddressSkuConfig, PublicIPAllocationMethod, IpVersion } from './public-ip-address-types';
/**
 * L1 construct for Azure Public IP Address.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/publicIPAddresses ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/publicIPAddresses`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link PublicIpAddress} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmPublicIpAddress, PublicIPAddressSku, PublicIPAllocationMethod } from '@atakora/cdk/network';
 *
 * const publicIp = new ArmPublicIpAddress(resourceGroup, 'PublicIp', {
 *   publicIpAddressName: 'pip-myapp-001',
 *   location: 'eastus',
 *   sku: { name: PublicIPAddressSku.STANDARD },
 *   properties: {
 *     publicIPAllocationMethod: PublicIPAllocationMethod.STATIC
 *   }
 * });
 * ```
 */
export declare class ArmPublicIpAddress extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for public IP addresses.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the public IP address.
     */
    readonly publicIpAddressName: string;
    /**
     * Resource name (same as publicIpAddressName).
     */
    readonly name: string;
    /**
     * Azure region where the public IP address is located.
     */
    readonly location: string;
    /**
     * SKU configuration.
     */
    readonly sku: PublicIPAddressSkuConfig;
    /**
     * IP address allocation method.
     */
    readonly publicIPAllocationMethod: PublicIPAllocationMethod;
    /**
     * IP address version.
     */
    readonly ipVersion?: IpVersion;
    /**
     * Domain name label.
     */
    readonly domainNameLabel?: string;
    /**
     * Idle timeout in minutes.
     */
    readonly idleTimeoutInMinutes?: number;
    /**
     * Tags applied to the public IP address.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/publicIPAddresses/{publicIpAddressName}`
     */
    readonly resourceId: string;
    /**
     * Public IP address resource ID (alias for resourceId).
     */
    readonly publicIpAddressId: string;
    /**
     * Creates a new ArmPublicIpAddress construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Public IP address properties
     *
     * @throws {Error} If publicIpAddressName is invalid
     * @throws {Error} If location is empty
     * @throws {Error} If SKU is not provided
     * @throws {Error} If Standard SKU is used with Dynamic allocation
     * @throws {Error} If idleTimeoutInMinutes is outside valid range
     */
    constructor(scope: Construct, id: string, props: ArmPublicIpAddressProps);
    /**
     * Validates public IP address properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmPublicIpAddressProps): void;
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
//# sourceMappingURL=public-ip-address-arm.d.ts.map