import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type {
  ArmSubnetProps,
  PrivateEndpointNetworkPolicies,
  PrivateLinkServiceNetworkPolicies,
} from './types';

/**
 * L1 construct for Azure Subnet.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/virtualNetworks/subnets ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/virtualNetworks/subnets`
 * **API Version**: `2024-07-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link Subnet} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmSubnet } from '@atakora/lib';
 *
 * const subnet = new ArmSubnet(vnet, 'WebSubnet', {
 *   name: 'snet-web-01',
 *   virtualNetworkName: 'vnet-prod-eastus-01',
 *   addressPrefix: '10.0.1.0/24'
 * });
 * ```
 *
 * @example
 * With Network Security Group:
 * ```typescript
 * const subnet = new ArmSubnet(vnet, 'AppSubnet', {
 *   name: 'snet-app-01',
 *   virtualNetworkName: 'vnet-prod-eastus-01',
 *   addressPrefix: '10.0.2.0/24',
 *   networkSecurityGroup: {
 *     id: '/subscriptions/.../networkSecurityGroups/nsg-app'
 *   }
 * });
 * ```
 */
export class ArmSubnet extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Network/virtualNetworks/subnets';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-07-01';

  /**
   * Deployment scope for subnets.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the subnet.
   */
  public readonly name: string;

  /**
   * Name of the parent virtual network.
   */
  public readonly virtualNetworkName: string;

  /**
   * Address prefix for the subnet.
   */
  public readonly addressPrefix?: string;

  /**
   * List of address prefixes for the subnet.
   */
  public readonly addressPrefixes?: string[];

  /**
   * Network Security Group reference.
   */
  public readonly networkSecurityGroup?: { readonly id: string };

  /**
   * Service endpoints configuration.
   */
  public readonly serviceEndpoints?: ReadonlyArray<{
    readonly service: string;
    readonly locations?: string[];
  }>;

  /**
   * Subnet delegations.
   */
  public readonly delegations?: ReadonlyArray<{
    readonly name: string;
    readonly serviceName: string;
  }>;

  /**
   * Private endpoint network policies.
   */
  public readonly privateEndpointNetworkPolicies?: PrivateEndpointNetworkPolicies;

  /**
   * Private link service network policies.
   */
  public readonly privateLinkServiceNetworkPolicies?: PrivateLinkServiceNetworkPolicies;

  /**
   * Default outbound access setting.
   */
  public readonly defaultOutboundAccess?: boolean;

  /**
   * Sharing scope for the subnet.
   */
  public readonly sharingScope?: string;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}/subnets/{subnetName}`
   */
  public readonly resourceId: string;

  /**
   * Subnet resource ID (alias for resourceId).
   */
  public readonly subnetId: string;

  /**
   * Creates a new ArmSubnet construct.
   *
   * @param scope - Parent construct (typically a VirtualNetwork or ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Subnet properties
   *
   * @throws {Error} If name is empty
   * @throws {Error} If virtualNetworkName is empty
   * @throws {Error} If addressPrefix is empty (when addressPrefixes not provided)
   * @throws {Error} If both addressPrefix and addressPrefixes are provided
   */
  constructor(scope: Construct, id: string, props: ArmSubnetProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.name = props.name;
    this.virtualNetworkName = props.virtualNetworkName;
    this.addressPrefix = props.addressPrefix;
    this.addressPrefixes = props.addressPrefixes;
    this.networkSecurityGroup = props.networkSecurityGroup;
    this.serviceEndpoints = props.serviceEndpoints;
    this.delegations = props.delegations;
    this.privateEndpointNetworkPolicies = props.privateEndpointNetworkPolicies;
    this.privateLinkServiceNetworkPolicies = props.privateLinkServiceNetworkPolicies;
    this.defaultOutboundAccess = props.defaultOutboundAccess;
    this.sharingScope = props.sharingScope;

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${this.virtualNetworkName}/subnets/${this.name}`;
    this.subnetId = this.resourceId;
  }

  /**
   * Builds an NSG reference for ARM templates.
   * Converts an NSG resource ID to a resourceId() expression.
   *
   * @param nsgId - Full resource ID of the Network Security Group
   * @returns ARM resourceId() expression
   */
  private buildNsgReference(nsgId: string): string {
    // Extract NSG name from resource ID
    // Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/networkSecurityGroups/{nsgName}
    const parts = nsgId.split('/');
    const nsgName = parts[parts.length - 1];

    // Generate ARM resourceId() expression
    return `[resourceId('Microsoft.Network/networkSecurityGroups', '${nsgName}')]`;
  }

  /**
   * Validates subnet properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmSubnetProps): void {
    // Validate subnet name
    if (!props.name || props.name.trim() === '') {
      throw new Error('Subnet name cannot be empty');
    }

    // Validate virtual network name
    if (!props.virtualNetworkName || props.virtualNetworkName.trim() === '') {
      throw new Error('Virtual network name cannot be empty');
    }

    // Validate address prefix
    if (props.addressPrefixes && props.addressPrefixes.length > 0) {
      // Using addressPrefixes
      if (props.addressPrefix) {
        throw new Error(
          'Cannot specify both addressPrefix and addressPrefixes. Use one or the other.'
        );
      }
    } else {
      // Using addressPrefix
      if (!props.addressPrefix || props.addressPrefix.trim() === '') {
        throw new Error('Either addressPrefix or addressPrefixes must be provided');
      }

      // Basic CIDR validation
      const cidrPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;
      if (!cidrPattern.test(props.addressPrefix)) {
        throw new Error(
          `Invalid CIDR notation for addressPrefix: ${props.addressPrefix}. ` +
            `Expected format: xxx.xxx.xxx.xxx/xx (e.g., 10.0.1.0/24)`
        );
      }
    }

    // Validate sharingScope requirements
    if (props.sharingScope && props.defaultOutboundAccess !== false) {
      throw new Error('sharingScope can only be set when defaultOutboundAccess is set to false');
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

    // Always include addressPrefix if provided
    if (this.addressPrefix) {
      properties.addressPrefix = this.addressPrefix;
    }

    // Include addressPrefixes if provided
    if (this.addressPrefixes && this.addressPrefixes.length > 0) {
      properties.addressPrefixes = this.addressPrefixes;
    }

    // Optional properties
    if (this.networkSecurityGroup) {
      // Convert NSG ID to ARM resourceId() expression for properties
      const nsgResourceId = this.buildNsgReference(this.networkSecurityGroup.id);
      properties.networkSecurityGroup = {
        id: nsgResourceId,
      };
    }

    if (this.serviceEndpoints && this.serviceEndpoints.length > 0) {
      properties.serviceEndpoints = this.serviceEndpoints.map((endpoint) => ({
        service: endpoint.service,
        ...(endpoint.locations && endpoint.locations.length > 0
          ? { locations: endpoint.locations }
          : {}),
      }));
    }

    if (this.delegations && this.delegations.length > 0) {
      properties.delegations = this.delegations.map((delegation) => ({
        name: delegation.name,
        properties: {
          serviceName: delegation.serviceName,
        },
      }));
    }

    if (this.privateEndpointNetworkPolicies) {
      properties.privateEndpointNetworkPolicies = this.privateEndpointNetworkPolicies;
    }

    if (this.privateLinkServiceNetworkPolicies) {
      properties.privateLinkServiceNetworkPolicies = this.privateLinkServiceNetworkPolicies;
    }

    if (this.defaultOutboundAccess !== undefined) {
      properties.defaultOutboundAccess = this.defaultOutboundAccess;
    }

    if (this.sharingScope) {
      properties.sharingScope = this.sharingScope;
    }

    // Build dependsOn array for explicit dependencies
    const dependsOn: string[] = [];

    // Add NSG dependency if referenced
    if (this.networkSecurityGroup) {
      // Convert NSG ID to ARM resourceId() expression
      const nsgResourceId = this.buildNsgReference(this.networkSecurityGroup.id);
      dependsOn.push(nsgResourceId);
    }

    const template: any = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.virtualNetworkName}/${this.name}`,
      properties,
    };

    // Only include dependsOn if there are dependencies
    if (dependsOn.length > 0) {
      template.dependsOn = dependsOn;
    }

    return template;
  }
}
