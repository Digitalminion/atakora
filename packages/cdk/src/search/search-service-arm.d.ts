import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmSearchServicesProps, SearchServiceSkuConfig, HostingMode, PublicNetworkAccess, NetworkRuleSet } from './search-service-types';
/**
 * L1 construct for Azure AI Search Service.
 *
 * @remarks
 * Direct mapping to Microsoft.Search/searchServices ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Search/searchServices`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link SearchService} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmSearchService, SearchServiceSku, HostingMode } from '@atakora/lib';
 *
 * const search = new ArmSearchService(resourceGroup, 'SearchService', {
 *   serviceName: 'srch-authr-001',
 *   location: 'eastus',
 *   sku: { name: SearchServiceSku.BASIC },
 *   properties: {
 *     replicaCount: 1,
 *     partitionCount: 1,
 *     hostingMode: HostingMode.DEFAULT,
 *     publicNetworkAccess: PublicNetworkAccess.DISABLED
 *   }
 * });
 * ```
 */
export declare class ArmSearchServices extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for search services.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the search service.
     */
    readonly serviceName: string;
    /**
     * Resource name (same as serviceName).
     */
    readonly name: string;
    /**
     * Azure region where the search service is located.
     */
    readonly location: string;
    /**
     * SKU configuration.
     */
    readonly sku: SearchServiceSkuConfig;
    /**
     * Replica count.
     */
    readonly replicaCount?: number;
    /**
     * Partition count.
     */
    readonly partitionCount?: number;
    /**
     * Hosting mode.
     */
    readonly hostingMode?: HostingMode;
    /**
     * Public network access setting.
     */
    readonly publicNetworkAccess?: PublicNetworkAccess;
    /**
     * Network rule set configuration.
     */
    readonly networkRuleSet?: NetworkRuleSet;
    /**
     * Tags applied to the search service.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Search/searchServices/{serviceName}`
     */
    readonly resourceId: string;
    /**
     * Search service resource ID (alias for resourceId).
     */
    readonly serviceId: string;
    /**
     * Creates a new ArmSearchService construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Search service properties
     *
     * @throws {Error} If serviceName is invalid
     * @throws {Error} If location is empty
     * @throws {Error} If SKU is not provided
     * @throws {Error} If replicaCount is out of valid range
     * @throws {Error} If partitionCount is not a valid value
     */
    constructor(scope: Construct, id: string, props: ArmSearchServicesProps);
    /**
     * Validates search service properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmSearchServicesProps): void;
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
//# sourceMappingURL=search-service-arm.d.ts.map