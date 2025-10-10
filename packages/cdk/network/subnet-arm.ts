import { Construct } from '@atakora/lib';
import { Resource } from '@atakora/lib';
import { DeploymentScope } from '@atakora/lib';
import type {
  ArmSubnetProps,
  PrivateEndpointNetworkPolicies,
  PrivateLinkServiceNetworkPolicies,
} from './subnet-types';
import {
  ValidationResult,
  ValidationResultBuilder, ArmResource,
  ValidationError,
  isValidCIDR,
} from '@atakora/lib';

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
   * @throws {ValidationError} If validation fails
   */
  protected validateProps(props: ArmSubnetProps): void {
    // Validate subnet name
    if (!props.name || props.name.trim() === '') {
      throw new ValidationError(
        'Subnet name cannot be empty',
        'Subnet names are required for all subnets',
        'Provide a valid subnet name',
        'name'
      );
    }

    // Validate virtual network name
    if (!props.virtualNetworkName || props.virtualNetworkName.trim() === '') {
      throw new ValidationError(
        'Virtual network name cannot be empty',
        'Subnets must specify the parent virtual network name',
        'Provide the name of the virtual network this subnet belongs to',
        'virtualNetworkName'
      );
    }

    // Validate address prefix
    if (props.addressPrefixes && props.addressPrefixes.length > 0) {
      // Using addressPrefixes
      if (props.addressPrefix) {
        throw new ValidationError(
          'Cannot specify both addressPrefix and addressPrefixes',
          'Use either addressPrefix or addressPrefixes, not both',
          'Remove one of these properties',
          'addressPrefix/addressPrefixes'
        );
      }

      // Validate each prefix
      props.addressPrefixes.forEach((prefix, index) => {
        if (!isValidCIDR(prefix)) {
          throw new ValidationError(
            `Invalid CIDR notation in addressPrefixes`,
            `Address prefix at index ${index}: '${prefix}' is not valid CIDR notation`,
            'Use format: xxx.xxx.xxx.xxx/yy (e.g., "10.0.1.0/24")',
            `addressPrefixes[${index}]`
          );
        }
      });
    } else {
      // Using addressPrefix
      if (!props.addressPrefix || props.addressPrefix.trim() === '') {
        throw new ValidationError(
          'Either addressPrefix or addressPrefixes must be provided',
          'Subnets require an address range',
          'Provide addressPrefix with a valid CIDR notation (e.g., "10.0.1.0/24")',
          'addressPrefix'
        );
      }

      // Validate CIDR format
      if (!isValidCIDR(props.addressPrefix)) {
        throw new ValidationError(
          'Invalid CIDR notation for addressPrefix',
          `Value '${props.addressPrefix}' is not valid CIDR notation`,
          'Use format: xxx.xxx.xxx.xxx/yy (e.g., "10.0.1.0/24")',
          'addressPrefix'
        );
      }
    }

    // Validate delegations structure
    if (props.delegations && props.delegations.length > 0) {
      props.delegations.forEach((delegation, index) => {
        if (!delegation.name || delegation.name.trim() === '') {
          throw new ValidationError(
            'Delegation missing name',
            `Delegation at index ${index} has no name`,
            'Add a name for the delegation (e.g., "delegation")',
            `delegations[${index}].name`
          );
        }

        if (!delegation.serviceName || delegation.serviceName.trim() === '') {
          throw new ValidationError(
            'Delegation missing serviceName',
            `Delegation '${delegation.name}' has no serviceName`,
            'Add a serviceName (e.g., "Microsoft.Web/serverFarms")',
            `delegations[${index}].serviceName`
          );
        }
      });
    }

    // Validate service endpoints
    if (props.serviceEndpoints && props.serviceEndpoints.length > 0) {
      props.serviceEndpoints.forEach((endpoint, index) => {
        if (!endpoint.service || endpoint.service.trim() === '') {
          throw new ValidationError(
            'Service endpoint missing service',
            `Service endpoint at index ${index} has no service`,
            'Add a service name (e.g., "Microsoft.Storage")',
            `serviceEndpoints[${index}].service`
          );
        }
      });
    }

    // Validate sharingScope requirements
    if (props.sharingScope && props.defaultOutboundAccess !== false) {
      throw new ValidationError(
        'Invalid sharingScope configuration',
        'sharingScope can only be set when defaultOutboundAccess is set to false',
        'Set defaultOutboundAccess to false or remove sharingScope',
        'sharingScope/defaultOutboundAccess'
      );
    }
  }

  /**
   * Validates ARM template structure before transformation.
   *
   * @remarks
   * Validates the ARM-specific structure requirements for subnets.
   * Ensures delegations and other nested properties are properly formatted.
   *
   * @returns Validation result with any errors or warnings
   */
  public validateArmStructure(): ValidationResult {
    const builder = new ValidationResultBuilder();

    // Generate ARM template to validate structure
    const armTemplate = this.toArmTemplate() as any;

    // Validate properties wrapper exists
    if (!armTemplate.properties) {
      builder.addError(
        'Subnet ARM template missing properties wrapper',
        'ARM template subnets must have a properties object',
        'Ensure toArmTemplate() includes a properties object',
        'armTemplate.properties'
      );
      return builder.build();
    }

    // Validate delegation structure (CRITICAL - matches VNet inline subnet validation)
    if (armTemplate.properties.delegations) {
      armTemplate.properties.delegations.forEach((delegation: any, index: number) => {
        // Check if delegation has properties wrapper
        if (!delegation.properties) {
          builder.addError(
            `Delegation at index ${index} missing properties wrapper`,
            `ARM requires delegations to have format: { name: "...", properties: { serviceName: "..." } }`,
            `Current structure is invalid. Expected: { name: "${delegation.name}", properties: { serviceName: "${delegation.serviceName || 'SERVICE_NAME'}" } }`,
            `armTemplate.properties.delegations[${index}]`
          );
        } else if (!delegation.properties.serviceName) {
          builder.addError(
            `Delegation at index ${index} missing serviceName in properties`,
            'Delegation properties must contain serviceName',
            'Add serviceName to delegation.properties',
            `armTemplate.properties.delegations[${index}].properties.serviceName`
          );
        }

        // Validate serviceName is not at delegation root level
        if (delegation.serviceName && !delegation.properties?.serviceName) {
          builder.addError(
            `Delegation at index ${index} has serviceName at wrong level`,
            'serviceName must be inside properties object, not at delegation root',
            `Move serviceName to properties: { name: "${delegation.name}", properties: { serviceName: "${delegation.serviceName}" } }`,
            `armTemplate.properties.delegations[${index}]`
          );
        }
      });
    }

    // Validate NSG reference format if present
    if (armTemplate.properties.networkSecurityGroup) {
      const nsgId = armTemplate.properties.networkSecurityGroup.id;

      // Check if it's a literal string (wrong) vs ARM expression (correct)
      if (
        typeof nsgId === 'string' &&
        !nsgId.startsWith('[') &&
        nsgId.includes('/networkSecurityGroups/')
      ) {
        builder.addWarning(
          'NSG reference may be using literal ID instead of ARM expression',
          `NSG ID: ${nsgId}`,
          "Consider using ARM resourceId() expression: [resourceId('Microsoft.Network/networkSecurityGroups', 'nsg-name')]",
          'armTemplate.properties.networkSecurityGroup.id'
        );
      }
    }

    // Validate addressPrefix is in properties
    if (!armTemplate.properties.addressPrefix && !armTemplate.properties.addressPrefixes) {
      builder.addError(
        'Subnet missing address prefix in ARM template',
        'ARM template must have either addressPrefix or addressPrefixes in properties',
        'Ensure toArmTemplate() includes address prefix',
        'armTemplate.properties.addressPrefix'
      );
    }

    return builder.build();
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
  public toArmTemplate(): ArmResource {
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
