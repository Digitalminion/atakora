import { Construct } from '@atakora/cdk';
import type { PrivateEndpointsProps, IPrivateEndpoint, IPrivateDnsZone } from './private-endpoint-types';
/**
 * L2 construct for Azure Private Endpoint.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates private endpoint name using parent naming context
 * - Inherits location from parent resource group
 * - Accepts both construct references and resource IDs
 * - Simplified DNS integration with addDnsZoneGroup() helper
 *
 * **ARM Resource Type**: `Microsoft.Network/privateEndpoints`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates name):
 * ```typescript
 * import { PrivateEndpoint } from '@atakora/cdk/network';
 *
 * // Creates private endpoint with auto-generated name
 * const endpoint = new PrivateEndpoint(resourceGroup, 'StorageEndpoint', {
 *   subnet: subnet,
 *   privateLinkServiceId: storageAccount.storageAccountId,
 *   groupIds: ['blob']
 * });
 * ```
 *
 * @example
 * With DNS integration:
 * ```typescript
 * const endpoint = new PrivateEndpoint(resourceGroup, 'StorageEndpoint', {
 *   subnet: subnet,
 *   privateLinkServiceId: storageAccount.storageAccountId,
 *   groupIds: ['blob'],
 *   privateDnsZoneId: dnsZone.zoneId
 * });
 * ```
 *
 * @example
 * With explicit configuration:
 * ```typescript
 * const endpoint = new PrivateEndpoint(resourceGroup, 'StorageEndpoint', {
 *   privateEndpointName: 'pe-storage-blob-01',
 *   location: 'eastus',
 *   subnet: '/subscriptions/.../subnets/snet-pe-01',
 *   privateLinkServiceId: '/subscriptions/.../storageAccounts/mystg',
 *   groupIds: ['blob'],
 *   connectionName: 'storage-blob-connection'
 * });
 * ```
 */
export declare class PrivateEndpoints extends Construct implements IPrivateEndpoint {
    /**
     * Creates a PrivateEndpoint from an existing endpoint ID.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for this construct
     * @param endpointId - Resource ID of the existing private endpoint
     * @returns PrivateEndpoint instance
     *
     * @example
     * ```typescript
     * const endpoint = PrivateEndpoint.fromEndpointId(
     *   resourceGroup,
     *   'ImportedEndpoint',
     *   '/subscriptions/.../privateEndpoints/pe-storage-01'
     * );
     * ```
     */
    static fromEndpointId(scope: Construct, id: string, endpointId: string): IPrivateEndpoint;
    /**
     * Underlying L1 construct.
     */
    private readonly armPrivateEndpoint;
    /**
     * Name of the private endpoint.
     */
    readonly privateEndpointName: string;
    /**
     * Location of the private endpoint.
     */
    readonly location: string;
    /**
     * Resource ID of the private endpoint.
     */
    readonly privateEndpointId: string;
    /**
     * Subnet ID where the private endpoint is located.
     */
    readonly subnetId: string;
    /**
     * Creates a new PrivateEndpoint construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Private endpoint properties
     *
     * @throws {Error} If subnet is not provided
     * @throws {Error} If privateLinkServiceId is not provided
     * @throws {Error} If groupIds is not provided or empty
     *
     * @example
     * ```typescript
     * const endpoint = new PrivateEndpoint(resourceGroup, 'StorageEndpoint', {
     *   subnet: subnet,
     *   privateLinkServiceId: storageAccount.storageAccountId,
     *   groupIds: ['blob']
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props: PrivateEndpointsProps);
    /**
     * Adds a DNS zone group to the private endpoint.
     *
     * @param dnsZoneId - Private DNS zone ID or IPrivateDnsZone construct
     * @param groupName - Name for the DNS zone group (defaults to 'default')
     * @param configName - Name for the DNS zone config (defaults to 'config')
     *
     * @remarks
     * This is a helper method for adding DNS integration after construction.
     * Prefer using the privateDnsZoneId property in the constructor when possible.
     *
     * @example
     * ```typescript
     * endpoint.addDnsZoneGroup(dnsZone.zoneId);
     * ```
     */
    addDnsZoneGroup(dnsZoneId: IPrivateDnsZone | string, groupName?: string, configName?: string): void;
    /**
     * Resolves the location from props or parent.
     *
     * @param scope - Parent construct
     * @param props - Private endpoint properties
     * @returns Resolved location
     */
    private resolveLocation;
    /**
     * Gets the parent ResourceGroup from the construct tree.
     *
     * @param scope - Parent construct
     * @returns Resource group interface or undefined
     */
    private getResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroup properties
     */
    private isResourceGroup;
    /**
     * Resolves the private endpoint name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Private endpoint properties
     * @returns Resolved private endpoint name
     */
    private resolvePrivateEndpointName;
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
     *
     * @remarks
     * For private endpoints, we extract the service type from the ID
     * and use the service abbreviation as the purpose.
     * Example: "DataCosmosPrivateEndpoint" -> "cosdb"
     */
    private constructIdToPurpose;
    /**
     * Resolves subnet ID from ISubnet or string.
     *
     * @param subnet - Subnet reference or ID string
     * @returns Subnet ID
     */
    private resolveSubnetId;
    /**
     * Resolves private link service ID from IPrivateLinkResource or string.
     *
     * @param privateLinkServiceId - Resource reference or ID string
     * @returns Resource ID
     */
    private resolvePrivateLinkServiceId;
    /**
     * Builds DNS zone group configuration from props.
     *
     * @param props - Private endpoint properties
     * @returns DNS zone group or undefined
     */
    private buildDnsZoneGroup;
}
//# sourceMappingURL=private-endpoints.d.ts.map