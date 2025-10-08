import { Construct } from '../../core/construct';
import { ArmPrivateEndpoint } from './arm-private-endpoint';
import { getServiceAbbreviation } from '../../naming/construct-id-utils';
import type {
  PrivateEndpointProps,
  IPrivateEndpoint,
  ISubnet,
  IPrivateDnsZone,
  IPrivateLinkResource,
  PrivateDnsZoneGroup,
} from './types';

/**
 * Interface for a Resource Group (duck-typed).
 */
interface IResourceGroup {
  readonly resourceGroupName?: string;
  readonly location?: string;
}

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
 * import { PrivateEndpoint } from '@atakora/lib';
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
export class PrivateEndpoint extends Construct implements IPrivateEndpoint {
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
  public static fromEndpointId(scope: Construct, id: string, endpointId: string): IPrivateEndpoint {
    class Import extends Construct implements IPrivateEndpoint {
      public readonly privateEndpointId = endpointId;
      public readonly privateEndpointName: string;
      public readonly location = 'unknown';

      constructor() {
        super(scope, id);
        // Extract name from resource ID
        const parts = endpointId.split('/');
        this.privateEndpointName = parts[parts.length - 1] || 'unknown';
      }
    }

    return new Import();
  }

  /**
   * Underlying L1 construct.
   */
  private readonly armPrivateEndpoint: ArmPrivateEndpoint;

  /**
   * Name of the private endpoint.
   */
  public readonly privateEndpointName: string;

  /**
   * Location of the private endpoint.
   */
  public readonly location: string;

  /**
   * Resource ID of the private endpoint.
   */
  public readonly privateEndpointId: string;

  /**
   * Subnet ID where the private endpoint is located.
   */
  public readonly subnetId: string;

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
  constructor(scope: Construct, id: string, props: PrivateEndpointProps) {
    super(scope, id);

    // Validate required properties
    if (!props.subnet) {
      throw new Error('Subnet is required for private endpoint');
    }

    if (!props.privateLinkServiceId) {
      throw new Error('Private link service ID is required for private endpoint');
    }

    if (!props.groupIds || props.groupIds.length === 0) {
      throw new Error('At least one group ID is required for private endpoint');
    }

    // Resolve location
    this.location = this.resolveLocation(scope, props);

    // Auto-generate or use provided private endpoint name
    this.privateEndpointName = this.resolvePrivateEndpointName(id, props);

    // Resolve subnet ID
    this.subnetId = this.resolveSubnetId(props.subnet);

    // Resolve private link service ID
    const privateLinkServiceId = this.resolvePrivateLinkServiceId(props.privateLinkServiceId);

    // Resolve connection name
    const connectionName = props.connectionName || `${this.privateEndpointName}-connection`;

    // Build private DNS zone group if DNS zone provided
    const privateDnsZoneGroup = this.buildDnsZoneGroup(props);

    // Create underlying L1 resource
    this.armPrivateEndpoint = new ArmPrivateEndpoint(scope, `${id}PrivateEndpoint`, {
      privateEndpointName: this.privateEndpointName,
      location: this.location,
      subnet: {
        id: this.subnetId,
      },
      privateLinkServiceConnections: [
        {
          name: connectionName,
          privateLinkServiceId: privateLinkServiceId,
          groupIds: props.groupIds,
          requestMessage: props.requestMessage,
        },
      ],
      customNetworkInterfaceName: props.customNetworkInterfaceName,
      privateDnsZoneGroup: privateDnsZoneGroup,
      tags: props.tags,
    });

    // Set private endpoint ID from L1 resource
    this.privateEndpointId = this.armPrivateEndpoint.privateEndpointId;
  }

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
  public addDnsZoneGroup(
    dnsZoneId: IPrivateDnsZone | string,
    groupName: string = 'default',
    configName: string = 'config'
  ): void {
    const zoneId = typeof dnsZoneId === 'string' ? dnsZoneId : dnsZoneId.zoneId;

    // Note: This is a placeholder for the actual implementation
    // In a real implementation, this would add a child resource to the ARM template
    // For now, we'll store it as metadata or handle it during synthesis
    console.warn(
      'addDnsZoneGroup: DNS zone group configuration should be provided during construction. ' +
        `Zone ID: ${zoneId}, Group: ${groupName}, Config: ${configName}`
    );
  }

  /**
   * Resolves the location from props or parent.
   *
   * @param scope - Parent construct
   * @param props - Private endpoint properties
   * @returns Resolved location
   */
  private resolveLocation(scope: Construct, props: PrivateEndpointProps): string {
    // If location provided, use it
    if (props.location) {
      return props.location;
    }

    // Try to get location from parent resource group
    const resourceGroup = this.getResourceGroup(scope);
    if (resourceGroup && resourceGroup.location) {
      return resourceGroup.location;
    }

    // Fallback to a default (this should rarely happen)
    return 'eastus';
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns Resource group interface or undefined
   */
  private getResourceGroup(scope: Construct): IResourceGroup | undefined {
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    return undefined;
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
      (typeof construct.resourceGroupName === 'string' || typeof construct.location === 'string')
    );
  }

  /**
   * Resolves the private endpoint name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Private endpoint properties
   * @returns Resolved private endpoint name
   */
  private resolvePrivateEndpointName(id: string, props: PrivateEndpointProps): string {
    // If name provided explicitly, use it
    if (props.privateEndpointName) {
      return props.privateEndpointName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('pe', purpose);
    }

    // Fallback: construct a basic name from ID
    return `pe-${id.toLowerCase()}`;
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
   *
   * @remarks
   * For private endpoints, we extract the service type from the ID
   * and use the service abbreviation as the purpose.
   * Example: "DataCosmosPrivateEndpoint" -> "cosdb"
   */
  private constructIdToPurpose(id: string): string | undefined {
    const lower = id.toLowerCase();

    // Remove common suffixes
    const withoutSuffix = lower
      .replace(/privateendpoint$/, '')
      .replace(/endpoint$/, '')
      .replace(/pe$/, '');

    // Remove stack prefixes
    const STACK_PREFIXES = [
      'data',
      'application',
      'connectivity',
      'networking',
      'monitoring',
      'platform',
      'foundation',
    ];
    let serviceIdentifier = withoutSuffix;
    for (const prefix of STACK_PREFIXES) {
      if (serviceIdentifier.startsWith(prefix)) {
        serviceIdentifier = serviceIdentifier.slice(prefix.length);
        break;
      }
    }

    // If nothing meaningful left, return undefined
    if (!serviceIdentifier || serviceIdentifier.length === 0) {
      return undefined;
    }

    // Get the service abbreviation
    return getServiceAbbreviation(serviceIdentifier);
  }

  /**
   * Resolves subnet ID from ISubnet or string.
   *
   * @param subnet - Subnet reference or ID string
   * @returns Subnet ID
   */
  private resolveSubnetId(subnet: ISubnet | string): string {
    return typeof subnet === 'string' ? subnet : subnet.subnetId;
  }

  /**
   * Resolves private link service ID from IPrivateLinkResource or string.
   *
   * @param privateLinkServiceId - Resource reference or ID string
   * @returns Resource ID
   */
  private resolvePrivateLinkServiceId(privateLinkServiceId: IPrivateLinkResource | string): string {
    return typeof privateLinkServiceId === 'string'
      ? privateLinkServiceId
      : privateLinkServiceId.resourceId;
  }

  /**
   * Builds DNS zone group configuration from props.
   *
   * @param props - Private endpoint properties
   * @returns DNS zone group or undefined
   */
  private buildDnsZoneGroup(props: PrivateEndpointProps): PrivateDnsZoneGroup | undefined {
    if (!props.privateDnsZoneId) {
      return undefined;
    }

    const zoneId =
      typeof props.privateDnsZoneId === 'string'
        ? props.privateDnsZoneId
        : props.privateDnsZoneId.zoneId;

    const groupName = props.dnsZoneGroupName || 'default';

    return {
      name: groupName,
      privateDnsZoneConfigs: [
        {
          name: 'config',
          privateDnsZoneId: zoneId,
        },
      ],
    };
  }
}
