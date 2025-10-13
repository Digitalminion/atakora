import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmPrivateEndpointProps, PrivateLinkServiceConnection, SubnetReference, PrivateDnsZoneGroup } from './private-endpoint-types';
/**
 * L1 construct for Azure Private Endpoint.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/privateEndpoints ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/privateEndpoints`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link PrivateEndpoint} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmPrivateEndpoint } from '@atakora/cdk/network';
 *
 * const endpoint = new ArmPrivateEndpoint(resourceGroup, 'StorageEndpoint', {
 *   privateEndpointName: 'pe-storage-blob-01',
 *   location: 'eastus',
 *   subnet: {
 *     id: '/subscriptions/.../subnets/snet-pe-01'
 *   },
 *   privateLinkServiceConnections: [{
 *     name: 'storage-connection',
 *     privateLinkServiceId: '/subscriptions/.../storageAccounts/mystg',
 *     groupIds: ['blob']
 *   }]
 * });
 * ```
 *
 * @example
 * With DNS integration:
 * ```typescript
 * const endpoint = new ArmPrivateEndpoint(resourceGroup, 'StorageEndpoint', {
 *   privateEndpointName: 'pe-storage-blob-01',
 *   location: 'eastus',
 *   subnet: {
 *     id: '/subscriptions/.../subnets/snet-pe-01'
 *   },
 *   privateLinkServiceConnections: [{
 *     name: 'storage-connection',
 *     privateLinkServiceId: '/subscriptions/.../storageAccounts/mystg',
 *     groupIds: ['blob']
 *   }],
 *   privateDnsZoneGroup: {
 *     name: 'default',
 *     privateDnsZoneConfigs: [{
 *       name: 'blob-config',
 *       privateDnsZoneId: '/subscriptions/.../privateDnsZones/privatelink.blob.core.windows.net'
 *     }]
 *   }
 * });
 * ```
 */
export declare class ArmPrivateEndpoint extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for private endpoints.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the private endpoint.
     */
    readonly privateEndpointName: string;
    /**
     * Resource name (same as privateEndpointName).
     */
    readonly name: string;
    /**
     * Azure region where the private endpoint is located.
     */
    readonly location: string;
    /**
     * Subnet reference.
     */
    readonly subnet: SubnetReference;
    /**
     * Private link service connections.
     */
    readonly privateLinkServiceConnections: ReadonlyArray<PrivateLinkServiceConnection>;
    /**
     * Custom network interface name.
     */
    readonly customNetworkInterfaceName?: string;
    /**
     * Private DNS zone group configuration.
     */
    readonly privateDnsZoneGroup?: PrivateDnsZoneGroup;
    /**
     * Resource tags.
     */
    readonly tags?: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/privateEndpoints/{privateEndpointName}`
     */
    readonly resourceId: string;
    /**
     * Private endpoint resource ID (alias for resourceId).
     */
    readonly privateEndpointId: string;
    /**
     * Creates a new ArmPrivateEndpoint construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Private endpoint properties
     *
     * @throws {Error} If privateEndpointName is invalid
     * @throws {Error} If location is empty
     * @throws {Error} If subnet is not provided
     * @throws {Error} If privateLinkServiceConnections is empty
     */
    constructor(scope: Construct, id: string, props: ArmPrivateEndpointProps);
    /**
     * Validates private endpoint properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmPrivateEndpointProps): void;
    /**
     * Builds a subnet reference for ARM templates.
     * Converts a subnet resource ID to a resourceId() expression.
     *
     * @param subnetId - Full resource ID of the subnet
     * @returns ARM resourceId() expression
     */
    private buildSubnetReference;
    /**
     * Builds a private DNS zone reference for ARM templates.
     * Converts a DNS zone resource ID to a resourceId() expression.
     *
     * @param dnsZoneId - Full resource ID of the private DNS zone
     * @returns ARM resourceId() expression
     */
    private buildPrivateDnsZoneReference;
    /**
     * Builds a generic resource reference for ARM templates.
     * Converts a resource ID to a resourceId() expression by extracting the resource type and name.
     *
     * @param resourceId - Full resource ID
     * @returns ARM resourceId() expression
     */
    private buildResourceReference;
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
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=private-endpoint-arm.d.ts.map