import { Construct } from '@atakora/cdk';
import type { SearchServicesProps, ISearchService, SearchServiceSku } from './search-service-types';
/**
 * L2 construct for Azure AI Search Service.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates search service name
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Secure defaults: basic SKU, 1 replica/partition, public network disabled
 *
 * **ARM Resource Type**: `Microsoft.Search/searchServices`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { SearchService } from '@atakora/lib';
 *
 * const searchService = new SearchService(resourceGroup, 'DataSearch');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const searchService = new SearchService(resourceGroup, 'DataSearch', {
 *   sku: SearchServiceSku.STANDARD,
 *   replicaCount: 3,
 *   partitionCount: 2
 * });
 * ```
 */
export declare class SearchServices extends Construct implements ISearchService {
    /**
     * Underlying L1 construct.
     */
    private readonly armSearchService;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the search service.
     */
    readonly serviceName: string;
    /**
     * Location of the search service.
     */
    readonly location: string;
    /**
     * Resource group name where the search service is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the search service.
     */
    readonly serviceId: string;
    /**
     * Tags applied to the search service (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * SKU name.
     */
    readonly sku: SearchServiceSku;
    /**
     * Creates a new SearchService construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Optional search service properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     *
     * @example
     * ```typescript
     * const searchService = new SearchService(resourceGroup, 'DataSearch', {
     *   sku: SearchServiceSku.STANDARD,
     *   tags: { purpose: 'ai-search' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props?: SearchServicesProps);
    /**
     * Creates a SearchService reference from an existing service ID.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for this construct
     * @param serviceId - Resource ID of the existing search service
     * @returns SearchService reference
     *
     * @example
     * ```typescript
     * const serviceId = '/subscriptions/12345/resourceGroups/rg-data/providers/Microsoft.Search/searchServices/srch-authr-001';
     * const searchService = SearchService.fromServiceId(stack, 'ExistingSearch', serviceId);
     * ```
     */
    static fromServiceId(scope: Construct, id: string, serviceId: string): ISearchService;
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
     * Resolves the search service name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Search service properties
     * @returns Resolved service name
     *
     * @remarks
     * Search service names have constraints:
     * - 2-60 characters
     * - Lowercase letters, numbers, and hyphens
     * - Cannot start or end with hyphen
     */
    private resolveServiceName;
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
//# sourceMappingURL=search-service.d.ts.map