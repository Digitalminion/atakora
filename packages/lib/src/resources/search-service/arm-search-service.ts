import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type {
  ArmSearchServiceProps,
  SearchServiceSkuConfig,
  HostingMode,
  PublicNetworkAccess,
  NetworkRuleSet,
} from './types';

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
 * import { ArmSearchService, SearchServiceSku, HostingMode } from '@azure-arm-priv/lib';
 *
 * const search = new ArmSearchService(resourceGroup, 'SearchService', {
 *   serviceName: 'srch-colorai-001',
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
export class ArmSearchService extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Search/searchServices';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-11-01';

  /**
   * Deployment scope for search services.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the search service.
   */
  public readonly serviceName: string;

  /**
   * Resource name (same as serviceName).
   */
  public readonly name: string;

  /**
   * Azure region where the search service is located.
   */
  public readonly location: string;

  /**
   * SKU configuration.
   */
  public readonly sku: SearchServiceSkuConfig;

  /**
   * Replica count.
   */
  public readonly replicaCount?: number;

  /**
   * Partition count.
   */
  public readonly partitionCount?: number;

  /**
   * Hosting mode.
   */
  public readonly hostingMode?: HostingMode;

  /**
   * Public network access setting.
   */
  public readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Network rule set configuration.
   */
  public readonly networkRuleSet?: NetworkRuleSet;

  /**
   * Tags applied to the search service.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Search/searchServices/{serviceName}`
   */
  public readonly resourceId: string;

  /**
   * Search service resource ID (alias for resourceId).
   */
  public readonly serviceId: string;

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
  constructor(scope: Construct, id: string, props: ArmSearchServiceProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.serviceName = props.serviceName;
    this.name = props.serviceName;
    this.location = props.location;
    this.sku = props.sku;
    this.replicaCount = props.properties?.replicaCount;
    this.partitionCount = props.properties?.partitionCount;
    this.hostingMode = props.properties?.hostingMode;
    this.publicNetworkAccess = props.properties?.publicNetworkAccess;
    this.networkRuleSet = props.properties?.networkRuleSet;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Search/searchServices/${this.serviceName}`;
    this.serviceId = this.resourceId;
  }

  /**
   * Validates search service properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmSearchServiceProps): void {
    // Validate service name
    if (!props.serviceName || props.serviceName.trim() === '') {
      throw new Error('Search service name cannot be empty');
    }

    if (props.serviceName.length < 2 || props.serviceName.length > 60) {
      throw new Error(
        `Search service name must be 2-60 characters (got ${props.serviceName.length})`
      );
    }

    // Validate name pattern: ^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$
    // - Must start and end with lowercase letter or number
    // - Can contain lowercase letters, numbers, and hyphens in between
    const namePattern = /^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$/;
    if (!namePattern.test(props.serviceName)) {
      throw new Error(
        `Search service name must contain only lowercase letters, numbers, and hyphens, ` +
        `and cannot start or end with a hyphen (got: ${props.serviceName})`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate SKU
    if (!props.sku || !props.sku.name) {
      throw new Error('SKU must be provided');
    }

    // Validate replica count (1-12)
    if (props.properties?.replicaCount !== undefined) {
      const replicaCount = props.properties.replicaCount;
      if (replicaCount < 1 || replicaCount > 12) {
        throw new Error(
          `Replica count must be between 1 and 12 (got ${replicaCount})`
        );
      }
    }

    // Validate partition count (1, 2, 3, 4, 6, 12)
    if (props.properties?.partitionCount !== undefined) {
      const partitionCount = props.properties.partitionCount;
      const validPartitions = [1, 2, 3, 4, 6, 12];
      if (!validPartitions.includes(partitionCount)) {
        throw new Error(
          `Partition count must be one of ${validPartitions.join(', ')} (got ${partitionCount})`
        );
      }
    }
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   * This will be implemented by Grace's synthesis pipeline.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): object {
    const properties: any = {};

    // Add optional properties
    if (this.replicaCount !== undefined) {
      properties.replicaCount = this.replicaCount;
    }

    if (this.partitionCount !== undefined) {
      properties.partitionCount = this.partitionCount;
    }

    if (this.hostingMode !== undefined) {
      properties.hostingMode = this.hostingMode;
    }

    if (this.publicNetworkAccess !== undefined) {
      properties.publicNetworkAccess = this.publicNetworkAccess;
    }

    if (this.networkRuleSet !== undefined) {
      properties.networkRuleSet = {
        ...(this.networkRuleSet.ipRules && { ipRules: this.networkRuleSet.ipRules }),
      };
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.serviceName,
      location: this.location,
      sku: {
        name: this.sku.name,
      },
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    };
  }
}
