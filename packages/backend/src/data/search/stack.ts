import { Construct } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { SearchServices, type ISearchService, SearchServiceSku } from '@atakora/cdk/search';
import { PrivateEndpoints, PrivateDnsZones, type IPrivateEndpoint, type ISubnet, type IPrivateDnsZone } from '@atakora/cdk/network';

/**
 * Configuration for Azure AI Search Stack
 */
export interface SearchStackProps {
  /**
   * Resource Group to deploy Search Service into
   */
  resourceGroup: IResourceGroup;

  /**
   * Subnet for the private endpoint
   */
  privateEndpointSubnet: ISubnet;

  /**
   * Whether to create a new Private DNS Zone (default: true)
   *
   * @remarks
   * If false, you must provide existingPrivateDnsZone
   */
  createPrivateDnsZone?: boolean;

  /**
   * Existing Private DNS Zone to use for DNS integration
   *
   * @remarks
   * Only used if createPrivateDnsZone is false
   */
  existingPrivateDnsZone?: IPrivateDnsZone;

  /**
   * Search service SKU (default: BASIC)
   *
   * @remarks
   * Options: FREE, BASIC, STANDARD, STANDARD2, STANDARD3, STORAGE_OPTIMIZED_L1, STORAGE_OPTIMIZED_L2
   */
  sku?: SearchServiceSku;

  /**
   * Replica count (default: 1)
   */
  replicaCount?: number;

  /**
   * Partition count (default: 1)
   */
  partitionCount?: number;

  /**
   * Log Analytics Workspace ID for diagnostic settings
   */
  logAnalyticsWorkspaceId?: string;

  /**
   * Additional tags
   */
  tags?: Record<string, string>;
}

/**
 * Azure AI Search Capability Stack
 *
 * @remarks
 * Self-contained stack that creates a complete Azure AI Search deployment including:
 * - Azure AI Search Service
 * - Private Endpoint for secure connectivity
 * - Private DNS Zone (or uses existing)
 * - DNS integration
 *
 * This stack follows the single responsibility principle - it creates
 * everything needed for a fully functional, privately accessible search service.
 *
 * @example
 * Basic usage with auto-created DNS zone:
 * ```typescript
 * const searchStack = new SearchStack(app, 'Search', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet
 * });
 *
 * // Access the resources
 * const searchService = searchStack.searchService;
 * const endpoint = searchStack.privateEndpoint;
 * ```
 *
 * @example
 * With custom SKU and scaling:
 * ```typescript
 * const searchStack = new SearchStack(app, 'Search', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   sku: SearchServiceSku.STANDARD,
 *   replicaCount: 2,
 *   partitionCount: 1,
 *   tags: { service: 'search-platform' }
 * });
 * ```
 *
 * @example
 * Using existing DNS zone:
 * ```typescript
 * const searchStack = new SearchStack(app, 'Search', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   createPrivateDnsZone: false,
 *   existingPrivateDnsZone: sharedDnsZone
 * });
 * ```
 */
export class SearchStack extends Construct {
  /**
   * Azure AI Search Service
   */
  public readonly searchService: ISearchService;

  /**
   * Private Endpoint for Search Service
   */
  public readonly privateEndpoint: IPrivateEndpoint;

  /**
   * Private DNS Zone for Search Service
   */
  public readonly privateDnsZone: IPrivateDnsZone;

  /**
   * Resource Group where Search Service is deployed
   */
  public readonly resourceGroup: IResourceGroup;

  constructor(scope: Construct, id: string, props: SearchStackProps) {
    super(scope, id);

    this.resourceGroup = props.resourceGroup;

    // Merge stack tag with provided tags
    const stackTags = {
      stack: 'search',
      service: 'data',
      ...props.tags,
    };

    // Create Azure AI Search Service
    this.searchService = new SearchServices(this, 'Service', {
      location: props.resourceGroup.location,
      sku: props.sku ?? SearchServiceSku.BASIC,
      replicaCount: props.replicaCount ?? 1,
      partitionCount: props.partitionCount ?? 1,
      tags: stackTags,
    });

    // Create or use existing Private DNS Zone
    if (props.createPrivateDnsZone !== false) {
      // Create new Private DNS Zone
      this.privateDnsZone = new PrivateDnsZones(this, 'PrivateDnsZone', {
        zoneName: 'privatelink.search.windows.net',
        tags: stackTags,
      });
    } else {
      // Use existing Private DNS Zone
      if (!props.existingPrivateDnsZone) {
        throw new Error(
          'When createPrivateDnsZone is false, existingPrivateDnsZone must be provided'
        );
      }
      this.privateDnsZone = props.existingPrivateDnsZone;
    }

    // Create Private Endpoint with DNS integration
    this.privateEndpoint = new PrivateEndpoints(this, 'SearchPrivateEndpoint', {
      subnet: props.privateEndpointSubnet,
      privateLinkServiceId: this.searchService.serviceId,
      groupIds: ['searchService'],
      privateDnsZoneId: this.privateDnsZone.zoneId,
      tags: stackTags,
    });
  }

  /**
   * Get deployed configuration
   */
  public getDeployedConfig() {
    return {
      searchService: {
        id: this.searchService.serviceId,
        name: this.searchService.serviceName,
        endpoint: `https://${this.searchService.serviceName}.search.windows.net`,
      },
      privateEndpoint: {
        id: this.privateEndpoint.privateEndpointId,
        name: this.privateEndpoint.privateEndpointName,
      },
      privateDnsZone: {
        id: this.privateDnsZone.zoneId,
        name: this.privateDnsZone.zoneName,
      },
    };
  }
}
