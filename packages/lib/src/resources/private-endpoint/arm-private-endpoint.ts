import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type {
  ArmPrivateEndpointProps,
  PrivateLinkServiceConnection,
  SubnetReference,
  PrivateDnsZoneGroup,
} from './types';

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
 * import { ArmPrivateEndpoint } from '@atakora/lib';
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
export class ArmPrivateEndpoint extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Network/privateEndpoints';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-11-01';

  /**
   * Deployment scope for private endpoints.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the private endpoint.
   */
  public readonly privateEndpointName: string;

  /**
   * Resource name (same as privateEndpointName).
   */
  public readonly name: string;

  /**
   * Azure region where the private endpoint is located.
   */
  public readonly location: string;

  /**
   * Subnet reference.
   */
  public readonly subnet: SubnetReference;

  /**
   * Private link service connections.
   */
  public readonly privateLinkServiceConnections: ReadonlyArray<PrivateLinkServiceConnection>;

  /**
   * Custom network interface name.
   */
  public readonly customNetworkInterfaceName?: string;

  /**
   * Private DNS zone group configuration.
   */
  public readonly privateDnsZoneGroup?: PrivateDnsZoneGroup;

  /**
   * Resource tags.
   */
  public readonly tags?: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/privateEndpoints/{privateEndpointName}`
   */
  public readonly resourceId: string;

  /**
   * Private endpoint resource ID (alias for resourceId).
   */
  public readonly privateEndpointId: string;

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
  constructor(scope: Construct, id: string, props: ArmPrivateEndpointProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.privateEndpointName = props.privateEndpointName;
    this.name = props.privateEndpointName;
    this.location = props.location;
    this.subnet = props.subnet;
    this.privateLinkServiceConnections = props.privateLinkServiceConnections;
    this.customNetworkInterfaceName = props.customNetworkInterfaceName;
    this.privateDnsZoneGroup = props.privateDnsZoneGroup;
    this.tags = props.tags;

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/privateEndpoints/${this.privateEndpointName}`;
    this.privateEndpointId = this.resourceId;
  }

  /**
   * Validates private endpoint properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmPrivateEndpointProps): void {
    // Validate private endpoint name
    if (!props.privateEndpointName || props.privateEndpointName.trim() === '') {
      throw new Error('Private endpoint name cannot be empty');
    }

    // Validate name length (1-80 characters)
    if (props.privateEndpointName.length < 1 || props.privateEndpointName.length > 80) {
      throw new Error(
        `Private endpoint name must be 1-80 characters. Got: ${props.privateEndpointName.length}`
      );
    }

    // Validate name pattern: alphanumerics, underscores, periods, and hyphens
    // Start with alphanumeric, end with alphanumeric or underscore
    const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9_]$|^[a-zA-Z0-9]$/;
    if (!namePattern.test(props.privateEndpointName)) {
      throw new Error(
        `Invalid private endpoint name: ${props.privateEndpointName}. ` +
          `Must start with alphanumeric, end with alphanumeric or underscore, ` +
          `and contain only alphanumerics, underscores, periods, and hyphens.`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate subnet
    if (!props.subnet || !props.subnet.id || props.subnet.id.trim() === '') {
      throw new Error('Subnet must be provided with a valid ID');
    }

    // Validate private link service connections
    if (!props.privateLinkServiceConnections || props.privateLinkServiceConnections.length === 0) {
      throw new Error('At least one private link service connection must be provided');
    }

    // Validate each connection
    props.privateLinkServiceConnections.forEach((connection, index) => {
      if (!connection.name || connection.name.trim() === '') {
        throw new Error(`Private link service connection at index ${index} must have a name`);
      }

      if (!connection.privateLinkServiceId || connection.privateLinkServiceId.trim() === '') {
        throw new Error(
          `Private link service connection '${connection.name}' must have a privateLinkServiceId`
        );
      }

      if (!connection.groupIds || connection.groupIds.length === 0) {
        throw new Error(
          `Private link service connection '${connection.name}' must have at least one groupId`
        );
      }
    });

    // Validate DNS zone group if provided
    if (props.privateDnsZoneGroup) {
      if (!props.privateDnsZoneGroup.name || props.privateDnsZoneGroup.name.trim() === '') {
        throw new Error('Private DNS zone group must have a name');
      }

      if (
        !props.privateDnsZoneGroup.privateDnsZoneConfigs ||
        props.privateDnsZoneGroup.privateDnsZoneConfigs.length === 0
      ) {
        throw new Error('Private DNS zone group must have at least one configuration');
      }

      props.privateDnsZoneGroup.privateDnsZoneConfigs.forEach((config, index) => {
        if (!config.name || config.name.trim() === '') {
          throw new Error(`Private DNS zone config at index ${index} must have a name`);
        }

        if (!config.privateDnsZoneId || config.privateDnsZoneId.trim() === '') {
          throw new Error(`Private DNS zone config '${config.name}' must have a privateDnsZoneId`);
        }
      });
    }
  }

  /**
   * Builds a subnet reference for ARM templates.
   * Converts a subnet resource ID to a resourceId() expression.
   *
   * @param subnetId - Full resource ID of the subnet
   * @returns ARM resourceId() expression
   */
  private buildSubnetReference(subnetId: string): string {
    // Extract subnet and VNet name from resource ID
    // Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/virtualNetworks/{vnet}/subnets/{subnet}
    const parts = subnetId.split('/');
    const subnetName = parts[parts.length - 1];
    const vnetName = parts[parts.length - 3];

    // Generate ARM resourceId() expression
    return `[resourceId('Microsoft.Network/virtualNetworks/subnets', '${vnetName}', '${subnetName}')]`;
  }

  /**
   * Builds a private DNS zone reference for ARM templates.
   * Converts a DNS zone resource ID to a resourceId() expression.
   *
   * @param dnsZoneId - Full resource ID of the private DNS zone
   * @returns ARM resourceId() expression
   */
  private buildPrivateDnsZoneReference(dnsZoneId: string): string {
    // Extract DNS zone name from resource ID
    // Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/privateDnsZones/{zoneName}
    const parts = dnsZoneId.split('/');
    const zoneName = parts[parts.length - 1];

    // Generate ARM resourceId() expression
    return `[resourceId('Microsoft.Network/privateDnsZones', '${zoneName}')]`;
  }

  /**
   * Builds a generic resource reference for ARM templates.
   * Converts a resource ID to a resourceId() expression by extracting the resource type and name.
   *
   * @param resourceId - Full resource ID
   * @returns ARM resourceId() expression
   */
  private buildResourceReference(resourceId: string): string {
    // Extract resource type and name from resource ID
    // Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/{provider}/{type}/{name}
    const parts = resourceId.split('/');

    // Find the providers index
    const providersIndex = parts.indexOf('providers');
    if (providersIndex === -1 || providersIndex + 2 >= parts.length) {
      // If we can't parse it, return as-is (shouldn't happen with valid IDs)
      return resourceId;
    }

    // Get provider namespace and remaining path
    const provider = parts[providersIndex + 1];
    const resourceTypeParts = parts.slice(providersIndex + 2);

    // Build resource type (e.g., "Microsoft.Storage/storageAccounts" or "Microsoft.KeyVault/vaults")
    // Resource types can be nested like "Microsoft.Network/virtualNetworks/subnets"
    const resourceType = `${provider}/${resourceTypeParts[resourceTypeParts.length - 2]}`;
    const resourceName = resourceTypeParts[resourceTypeParts.length - 1];

    // Generate ARM resourceId() expression
    return `[resourceId('${resourceType}', '${resourceName}')]`;
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): object {
    const properties: any = {
      subnet: {
        // Convert subnet ID to proper ARM expression
        id: this.subnet.id.startsWith('[')
          ? this.subnet.id
          : this.buildSubnetReference(this.subnet.id),
      },
      privateLinkServiceConnections: this.privateLinkServiceConnections.map((connection) => ({
        name: connection.name,
        properties: {
          // Convert private link service ID to proper ARM expression
          privateLinkServiceId: connection.privateLinkServiceId.startsWith('[')
            ? connection.privateLinkServiceId
            : this.buildResourceReference(connection.privateLinkServiceId),
          groupIds: connection.groupIds,
          ...(connection.requestMessage ? { requestMessage: connection.requestMessage } : {}),
        },
      })),
    };

    // Optional custom network interface name
    if (this.customNetworkInterfaceName) {
      properties.customNetworkInterfaceName = this.customNetworkInterfaceName;
    }

    // Build dependsOn array for explicit dependencies
    const dependsOn: string[] = [];

    // Add subnet dependency - convert to resourceId() expression
    const subnetResourceId = this.buildSubnetReference(this.subnet.id);
    dependsOn.push(subnetResourceId);

    // Add dependencies for all target resources (private link services)
    this.privateLinkServiceConnections.forEach((connection) => {
      const resourceId = this.buildResourceReference(connection.privateLinkServiceId);
      dependsOn.push(resourceId);
    });

    // Add private DNS zone dependencies if using DNS zone group
    if (this.privateDnsZoneGroup) {
      this.privateDnsZoneGroup.privateDnsZoneConfigs.forEach((config) => {
        const dnsZoneResourceId = this.buildPrivateDnsZoneReference(config.privateDnsZoneId);
        dependsOn.push(dnsZoneResourceId);
      });
    }

    // Optional private DNS zone group (as a sub-resource)
    const resources: any[] = [];
    if (this.privateDnsZoneGroup) {
      resources.push({
        type: 'privateDnsZoneGroups', // Just the child type when nested
        apiVersion: '2023-11-01',
        name: this.privateDnsZoneGroup.name, // Just the child name when nested
        properties: {
          privateDnsZoneConfigs: this.privateDnsZoneGroup.privateDnsZoneConfigs.map((config) => ({
            name: config.name,
            properties: {
              // Convert DNS zone ID to proper ARM expression
              privateDnsZoneId: config.privateDnsZoneId.startsWith('[')
                ? config.privateDnsZoneId
                : this.buildPrivateDnsZoneReference(config.privateDnsZoneId),
            },
          })),
        },
        dependsOn: [this.privateEndpointName],
      });
    }

    const template: any = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.privateEndpointName,
      location: this.location,
      properties,
      dependsOn,
    };

    // Optional tags
    if (this.tags && Object.keys(this.tags).length > 0) {
      template.tags = this.tags;
    }

    // Return template with sub-resources if any
    if (resources.length > 0) {
      return {
        ...template,
        resources,
      };
    }

    return template;
  }
}
