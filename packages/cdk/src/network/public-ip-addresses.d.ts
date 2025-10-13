import { Construct } from '@atakora/cdk';
import type { PublicIPAddressesProps, IPublicIpAddress, PublicIPAddressSku, PublicIPAllocationMethod, IpVersion } from './public-ip-address-types';
/**
 * L2 construct for Azure Public IP Address.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates public IP address name if not provided
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Secure defaults: Standard SKU with Static allocation
 *
 * **ARM Resource Type**: `Microsoft.Network/publicIPAddresses`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { PublicIpAddress } from '@atakora/cdk/network';
 *
 * const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
 *   sku: PublicIPAddressSku.BASIC,
 *   publicIPAllocationMethod: PublicIPAllocationMethod.DYNAMIC,
 *   domainNameLabel: 'myapp'
 * });
 * ```
 */
export declare class PublicIPAddresses extends Construct implements IPublicIpAddress {
    /**
     * Underlying L1 construct.
     */
    private readonly armPublicIpAddress;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the public IP address.
     */
    readonly publicIpAddressName: string;
    /**
     * Location of the public IP address.
     */
    readonly location: string;
    /**
     * Resource group name where the public IP address is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the public IP address.
     */
    readonly publicIpAddressId: string;
    /**
     * Tags applied to the public IP address (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * SKU name.
     */
    readonly sku: PublicIPAddressSku;
    /**
     * IP address allocation method.
     */
    readonly publicIPAllocationMethod: PublicIPAllocationMethod;
    /**
     * IP address version.
     */
    readonly ipVersion: IpVersion;
    /**
     * Domain name label.
     */
    readonly domainNameLabel?: string;
    /**
     * Idle timeout in minutes.
     */
    readonly idleTimeoutInMinutes: number;
    /**
     * Creates a reference to an existing public IP address.
     *
     * @param publicIpId - Full ARM resource ID of the public IP address
     * @returns Public IP address reference
     *
     * @example
     * ```typescript
     * const publicIp = PublicIpAddress.fromPublicIpId(
     *   '/subscriptions/12345/resourceGroups/rg-app/providers/Microsoft.Network/publicIPAddresses/pip-app-001'
     * );
     * ```
     */
    static fromPublicIpId(publicIpId: string): IPublicIpAddress;
    /**
     * Creates a new PublicIpAddress construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Optional public IP address properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     *
     * @example
     * ```typescript
     * const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
     *   sku: PublicIPAddressSku.STANDARD,
     *   domainNameLabel: 'myapp',
     *   tags: { purpose: 'frontend' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props?: PublicIPAddressesProps);
    /**
     * Gets the parent ResourceGroup from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The resource group interface
     * @throws {Error} If parent is not or doesn't contain a ResourceGroup
     */
    private getParentResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroup properties
     */
    private isResourceGroup;
    /**
     * Gets tags from parent construct hierarchy.
     *
     * @param scope - Parent construct
     * @returns Tags object (empty if no tags found)
     */
    private getParentTags;
    /**
     * Resolves the public IP address name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Public IP address properties
     * @returns Resolved public IP address name
     *
     * @remarks
     * Public IP address names follow the pattern:
     * - pip-{org}-{project}-{purpose}-{env}-{geo}-{instance}
     * - Example: pip-dp-authr-app-np-eus-01
     */
    private resolvePublicIpAddressName;
    /**
     * Gets the SubscriptionStack from the construct tree.
     *
     * @returns SubscriptionStack or undefined if not found
     */
    private getSubscriptionStack;
    /**
     * Converts construct ID to purpose identifier for naming.
     *
     * @param id - Construct ID
     * @returns Purpose string for naming
     */
    private constructIdToPurpose;
}
//# sourceMappingURL=public-ip-addresses.d.ts.map