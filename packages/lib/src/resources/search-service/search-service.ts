import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmSearchService } from './arm-search-service';
import { constructIdToPurpose as utilConstructIdToPurpose } from '../../naming/construct-id-utils';
import type {
  SearchServiceProps,
  ISearchService,
  SearchServiceSku,
  HostingMode,
  PublicNetworkAccess,
} from './types';

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
export class SearchService extends Construct implements ISearchService {
  /**
   * Underlying L1 construct.
   */
  private readonly armSearchService: ArmSearchService;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the search service.
   */
  public readonly serviceName: string;

  /**
   * Location of the search service.
   */
  public readonly location: string;

  /**
   * Resource group name where the search service is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the search service.
   */
  public readonly serviceId: string;

  /**
   * Tags applied to the search service (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * SKU name.
   */
  public readonly sku: SearchServiceSku;

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
  constructor(scope: Construct, id: string, props?: SearchServiceProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided service name
    this.serviceName = this.resolveServiceName(id, props);

    // Default location to resource group's location or use provided
    this.location = props?.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Default SKU to basic
    this.sku = props?.sku ?? ('basic' as SearchServiceSku);

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Create underlying L1 resource
    this.armSearchService = new ArmSearchService(scope, `${id}-Resource`, {
      serviceName: this.serviceName,
      location: this.location,
      sku: { name: this.sku },
      properties: {
        replicaCount: props?.replicaCount ?? 1,
        partitionCount: props?.partitionCount ?? 1,
        hostingMode: props?.hostingMode ?? ('default' as HostingMode),
        publicNetworkAccess: props?.publicNetworkAccess ?? ('disabled' as PublicNetworkAccess),
        networkRuleSet: props?.networkRuleSet,
      },
      tags: this.tags,
    });

    // Get resource ID from L1
    this.serviceId = this.armSearchService.serviceId;
  }

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
   * const serviceId = '/subscriptions/12345/resourceGroups/rg-data/providers/Microsoft.Search/searchServices/srch-colorai-001';
   * const searchService = SearchService.fromServiceId(stack, 'ExistingSearch', serviceId);
   * ```
   */
  public static fromServiceId(scope: Construct, id: string, serviceId: string): ISearchService {
    // Parse the service ID to extract serviceName and location
    const parts = serviceId.split('/');
    const serviceName = parts[parts.length - 1];

    // Create a minimal implementation of ISearchService
    return {
      serviceName,
      location: 'unknown', // Location cannot be inferred from ID
      serviceId,
    };
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'SearchService must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

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
  private resolveServiceName(id: string, props?: SearchServiceProps): string {
    // If name provided explicitly, use it
    if (props?.serviceName) {
      return props.serviceName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      // Use 'srch' prefix for search service
      return subscriptionStack.generateResourceName('srch', purpose);
    }

    // Fallback: construct a basic name from ID
    return `srch-${id.toLowerCase()}`;
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string | undefined {
    return utilConstructIdToPurpose(id, 'search', ['searchservice', 'srch']);
  }
}
