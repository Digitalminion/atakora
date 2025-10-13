import { Construct, Resource, DeploymentScope, ValidationResult, ValidationResultBuilder, ValidationError, isValidCIDR, isWithinCIDR, cidrsOverlap } from '@atakora/cdk';
import type { ArmVirtualNetworkProps, AddressSpace, InlineSubnetProps } from './virtual-network-types';
import type { ArmResource } from '@atakora/cdk';

/**
 * L1 construct for Azure Virtual Network.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/virtualNetworks ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/virtualNetworks`
 * **API Version**: `2024-07-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link VirtualNetwork} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmVirtualNetwork } from '@atakora/cdk/network';
 *
 * const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
 *   virtualNetworkName: 'vnet-digital-minion-authr-nonprod-eastus-01',
 *   location: 'eastus',
 *   resourceGroupName: 'rg-network',
 *   addressSpace: {
 *     addressPrefixes: ['10.0.0.0/16']
 *   },
 *   tags: {
 *     environment: 'nonprod'
 *   }
 * });
 * ```
 *
 * @example
 * With subnets and DNS:
 * ```typescript
 * const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
 *   virtualNetworkName: 'vnet-main',
 *   location: 'eastus',
 *   resourceGroupName: 'rg-network',
 *   addressSpace: {
 *     addressPrefixes: ['10.0.0.0/16']
 *   },
 *   subnets: [
 *     {
 *       name: 'subnet-app',
 *       addressPrefix: '10.0.1.0/24'
 *     },
 *     {
 *       name: 'subnet-data',
 *       addressPrefix: '10.0.2.0/24'
 *     }
 *   ],
 *   dhcpOptions: {
 *     dnsServers: ['10.0.0.4', '10.0.0.5']
 *   }
 * });
 * ```
 */
export class ArmVirtualNetwork extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Network/virtualNetworks';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-07-01';

  /**
   * Deployment scope for virtual networks.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the virtual network.
   */
  public readonly virtualNetworkName: string;

  /**
   * Resource name (same as virtualNetworkName).
   */
  public readonly name: string;

  /**
   * Azure region where the virtual network is located.
   */
  public readonly location: string;

  /**
   * Resource group name where the VNet is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Address space for the virtual network.
   */
  public readonly addressSpace: AddressSpace;

  /**
   * Tags applied to the virtual network.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{virtualNetworkName}`
   */
  public readonly resourceId: string;

  /**
   * Subnets defined inline within the VNet resource.
   *
   * @remarks
   * **IMPORTANT**: Inline subnets prevent "AnotherOperationInProgress" errors.
   *
   * When subnets are defined inline (as part of the VNet's properties.subnets array),
   * Azure creates them atomically with the VNet in a single operation. This is the
   * recommended approach for most scenarios.
   *
   * **Inline Subnets (Recommended)**:
   * - All subnets created in one atomic VNet operation
   * - No concurrent modification conflicts
   * - Faster deployment (single operation)
   * - Defined in properties.subnets[] of the VNet ARM template
   *
   * **Separate Subnet Resources (Not Recommended)**:
   * - Each subnet is a separate Microsoft.Network/virtualNetworks/subnets resource
   * - Multiple concurrent updates to the VNet
   * - Risk of "AnotherOperationInProgress" errors
   * - Slower deployment (N+1 operations for N subnets)
   *
   * @example
   * ```typescript
   * const vnet = new ArmVirtualNetwork(scope, 'VNet', {
   *   virtualNetworkName: 'my-vnet',
   *   location: 'eastus',
   *   addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
   *   subnets: [
   *     {
   *       name: 'subnet-1',
   *       addressPrefix: '10.0.1.0/24',
   *       networkSecurityGroup: { id: nsgId }
   *     },
   *     {
   *       name: 'subnet-2',
   *       addressPrefix: '10.0.2.0/24'
   *     }
   *   ]
   * });
   * ```
   */
  public readonly subnets?: InlineSubnetProps[];

  /**
   * DHCP options.
   */
  public readonly dhcpOptions?: { dnsServers: string[] };

  /**
   * DDoS protection enabled.
   */
  public readonly enableDdosProtection: boolean;

  /**
   * VM protection enabled.
   */
  public readonly enableVmProtection: boolean;

  /**
   * Creates a new ArmVirtualNetwork construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Virtual network properties
   *
   * @throws {Error} If virtualNetworkName is empty
   * @throws {Error} If location is empty
   * @throws {Error} If addressSpace is empty or invalid
   */
  constructor(scope: Construct, id: string, props: ArmVirtualNetworkProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.virtualNetworkName = props.virtualNetworkName;
    this.name = props.virtualNetworkName;
    this.location = props.location;
    this.resourceGroupName = props.resourceGroupName;
    this.addressSpace = props.addressSpace;
    this.tags = props.tags ?? {};
    this.subnets = props.subnets;
    this.dhcpOptions = props.dhcpOptions;
    this.enableDdosProtection = props.enableDdosProtection ?? false;
    this.enableVmProtection = props.enableVmProtection ?? false;

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/${this.resourceGroupName}/providers/Microsoft.Network/virtualNetworks/${this.virtualNetworkName}`;
  }

  /**
   * Validates virtual network properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {ValidationError} If validation fails
   */
  protected validateProps(props: ArmVirtualNetworkProps): void {
    // Validate virtual network name
    if (!props.virtualNetworkName || props.virtualNetworkName.trim() === '') {
      throw new ValidationError(
        'Virtual network name cannot be empty',
        'VNet names are required for all virtual networks',
        'Provide a valid virtual network name'
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new ValidationError(
        'Location cannot be empty',
        'Virtual networks must be deployed to a specific Azure region',
        'Provide a valid Azure region (e.g., "eastus", "westus2")'
      );
    }

    // Validate resource group name
    if (!props.resourceGroupName || props.resourceGroupName.trim() === '') {
      throw new ValidationError(
        'Resource group name cannot be empty',
        'Virtual networks must be deployed to a resource group',
        'Provide a valid resource group name'
      );
    }

    // Validate address space
    if (!props.addressSpace || !props.addressSpace.addressPrefixes) {
      throw new ValidationError(
        'Address space must be specified',
        'Virtual networks require at least one address space',
        'Add addressSpace with addressPrefixes array (e.g., { addressPrefixes: ["10.0.0.0/16"] })'
      );
    }

    if (props.addressSpace.addressPrefixes.length === 0) {
      throw new ValidationError(
        'Address space must contain at least one address prefix',
        'The addressPrefixes array is empty',
        'Add at least one CIDR range (e.g., "10.0.0.0/16")'
      );
    }

    // Validate CIDR notation for each address prefix
    props.addressSpace.addressPrefixes.forEach((prefix, index) => {
      if (!isValidCIDR(prefix)) {
        throw new ValidationError(
          `Invalid CIDR notation in address prefix`,
          `Address prefix at index ${index}: '${prefix}' is not valid CIDR notation`,
          'Use format: xxx.xxx.xxx.xxx/yy (e.g., "10.0.0.0/16")',
          `addressSpace.addressPrefixes[${index}]`
        );
      }
    });

    // Validate subnets if provided
    if (props.subnets && props.subnets.length > 0) {
      this.validateInlineSubnets(props.subnets, props.addressSpace);
    }
  }

  /**
   * Validates inline subnet configurations.
   *
   * @param subnets - Inline subnet configurations
   * @param addressSpace - VNet address space for range validation
   * @throws {ValidationError} If validation fails
   */
  private validateInlineSubnets(subnets: InlineSubnetProps[], addressSpace: AddressSpace): void {
    const subnetNames = new Set<string>();

    subnets.forEach((subnet, index) => {
      // Validate subnet name
      if (!subnet.name || subnet.name.trim() === '') {
        throw new ValidationError(
          'Subnet name cannot be empty',
          `Subnet at index ${index} has no name`,
          'Provide a valid subnet name',
          `subnets[${index}].name`
        );
      }

      // Check for duplicate subnet names
      if (subnetNames.has(subnet.name)) {
        throw new ValidationError(
          `Duplicate subnet name: ${subnet.name}`,
          'Subnet names must be unique within a virtual network',
          'Use a different name for this subnet',
          `subnets[${index}].name`
        );
      }
      subnetNames.add(subnet.name);

      // Validate address prefix
      if (!subnet.addressPrefix || subnet.addressPrefix.trim() === '') {
        throw new ValidationError(
          `Subnet ${subnet.name} missing addressPrefix`,
          'Each inline subnet must have an addressPrefix property',
          'Add addressPrefix with a valid CIDR notation (e.g., "10.0.1.0/24")',
          `subnets[${index}].addressPrefix`
        );
      }

      if (!isValidCIDR(subnet.addressPrefix)) {
        throw new ValidationError(
          `Invalid subnet address prefix for ${subnet.name}`,
          `Address prefix '${subnet.addressPrefix}' is not valid CIDR notation`,
          'Use format: xxx.xxx.xxx.xxx/yy (e.g., "10.0.1.0/24")',
          `subnets[${index}].addressPrefix`
        );
      }

      // Validate subnet is within VNet address space
      const isWithinVnet = addressSpace.addressPrefixes.some((vnetCidr) =>
        isWithinCIDR(subnet.addressPrefix, vnetCidr)
      );

      if (!isWithinVnet) {
        throw new ValidationError(
          `Subnet ${subnet.name} address prefix not within VNet address space`,
          `Subnet CIDR '${subnet.addressPrefix}' is not within any VNet address prefix: ${addressSpace.addressPrefixes.join(', ')}`,
          'Use an address prefix that falls within the VNet address space',
          `subnets[${index}].addressPrefix`
        );
      }

      // Validate delegations structure (CRITICAL - this caused deployment failure)
      if (subnet.delegations && subnet.delegations.length > 0) {
        subnet.delegations.forEach((delegation, delegationIndex) => {
          if (!delegation.name || delegation.name.trim() === '') {
            throw new ValidationError(
              `Delegation in subnet ${subnet.name} missing name`,
              'Each delegation must have a name property',
              'Add a name for the delegation (e.g., "delegation")',
              `subnets[${index}].delegations[${delegationIndex}].name`
            );
          }

          if (!delegation.serviceName || delegation.serviceName.trim() === '') {
            throw new ValidationError(
              `Delegation in subnet ${subnet.name} missing serviceName`,
              'Each delegation must have a serviceName property',
              'Add a serviceName (e.g., "Microsoft.Web/serverFarms")',
              `subnets[${index}].delegations[${delegationIndex}].serviceName`
            );
          }

          // Note: The ARM transformation will wrap serviceName in properties object
          // This is validated in validateArmStructure() after transformation
        });
      }

      // Validate service endpoints
      if (subnet.serviceEndpoints && subnet.serviceEndpoints.length > 0) {
        subnet.serviceEndpoints.forEach((endpoint, endpointIndex) => {
          if (!endpoint.service || endpoint.service.trim() === '') {
            throw new ValidationError(
              `Service endpoint in subnet ${subnet.name} missing service`,
              'Each service endpoint must have a service property',
              'Add a service name (e.g., "Microsoft.Storage")',
              `subnets[${index}].serviceEndpoints[${endpointIndex}].service`
            );
          }
        });
      }
    });

    // Check for overlapping subnet ranges
    for (let i = 0; i < subnets.length; i++) {
      for (let j = i + 1; j < subnets.length; j++) {
        if (cidrsOverlap(subnets[i].addressPrefix, subnets[j].addressPrefix)) {
          throw new ValidationError(
            `Overlapping subnet address ranges`,
            `Subnet '${subnets[i].name}' (${subnets[i].addressPrefix}) overlaps with subnet '${subnets[j].name}' (${subnets[j].addressPrefix})`,
            'Use non-overlapping CIDR ranges for subnets',
            `subnets[${i}].addressPrefix, subnets[${j}].addressPrefix`
          );
        }
      }
    }
  }

  /**
   * Validates ARM template structure before transformation.
   *
   * @remarks
   * This validates the ARM-specific structure requirements that must be met
   * after the toArmTemplate transformation. This catches issues that would
   * cause deployment failures.
   *
   * **Critical Validations**:
   * - Delegation structure has properties wrapper (caused "InvalidServiceNameOnDelegation" error)
   * - Subnet address prefixes are at correct nesting level
   * - NSG references use ARM expressions, not literal strings
   *
   * @returns Validation result with any errors or warnings
   */
  public validateArmStructure(): ValidationResult {
    const builder = new ValidationResultBuilder();

    // Generate ARM template to validate structure
    const armTemplate = this.toArmTemplate() as any;

    // Validate inline subnets in ARM format
    if (armTemplate.properties?.subnets) {
      armTemplate.properties.subnets.forEach((subnet: any, index: number) => {
        // Validate subnet has properties wrapper
        if (!subnet.properties) {
          builder.addError(
            `Subnet at index ${index} missing properties wrapper`,
            'ARM template subnets must have a properties object',
            'Ensure toArmTemplate() wraps subnet properties correctly',
            `armTemplate.properties.subnets[${index}]`
          );
          return;
        }

        // Validate addressPrefix is in properties, not at root
        if (subnet.addressPrefix && !subnet.properties.addressPrefix) {
          builder.addError(
            `Subnet ${subnet.name} has addressPrefix at wrong nesting level`,
            'addressPrefix must be inside properties object, not at subnet root',
            'Move addressPrefix to properties.addressPrefix',
            `armTemplate.properties.subnets[${index}].addressPrefix`
          );
        }

        // Validate delegation structure (CRITICAL - this caused deployment failure)
        if (subnet.properties.delegations) {
          subnet.properties.delegations.forEach((delegation: any, delegationIndex: number) => {
            // Check if delegation has properties wrapper
            if (!delegation.properties) {
              builder.addError(
                `Delegation in subnet ${subnet.name} missing properties wrapper`,
                `ARM requires delegations to have format: { name: "...", properties: { serviceName: "..." } }`,
                `Current structure is invalid. Expected: { name: "${delegation.name}", properties: { serviceName: "${delegation.serviceName || 'SERVICE_NAME'}" } }`,
                `armTemplate.properties.subnets[${index}].properties.delegations[${delegationIndex}]`
              );
            } else if (!delegation.properties.serviceName) {
              builder.addError(
                `Delegation in subnet ${subnet.name} missing serviceName in properties`,
                'Delegation properties must contain serviceName',
                'Add serviceName to delegation.properties',
                `armTemplate.properties.subnets[${index}].properties.delegations[${delegationIndex}].properties.serviceName`
              );
            }

            // Validate serviceName is not at delegation root level
            if (delegation.serviceName && !delegation.properties?.serviceName) {
              builder.addError(
                `Delegation in subnet ${subnet.name} has serviceName at wrong level`,
                'serviceName must be inside properties object, not at delegation root',
                `Move serviceName to properties: { name: "${delegation.name}", properties: { serviceName: "${delegation.serviceName}" } }`,
                `armTemplate.properties.subnets[${index}].properties.delegations[${delegationIndex}]`
              );
            }
          });
        }

        // Validate NSG reference format if present
        if (subnet.properties.networkSecurityGroup) {
          const nsgId = subnet.properties.networkSecurityGroup.id;

          // Check if it's a literal string (wrong) vs ARM expression (correct)
          if (
            typeof nsgId === 'string' &&
            !nsgId.startsWith('[') &&
            nsgId.includes('/networkSecurityGroups/')
          ) {
            builder.addWarning(
              `NSG reference in subnet ${subnet.name} may be using literal ID instead of ARM expression`,
              `NSG ID: ${nsgId}`,
              "Consider using ARM resourceId() expression: [resourceId('Microsoft.Network/networkSecurityGroups', 'nsg-name')]",
              `armTemplate.properties.subnets[${index}].properties.networkSecurityGroup.id`
            );
          }
        }
      });
    }

    return builder.build();
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   *
   * **Inline Subnets**: If subnets are defined, they will be included in the
   * `properties.subnets` array of the VNet resource. This causes Azure to create
   * all subnets atomically with the VNet in a single deployment operation,
   * preventing "AnotherOperationInProgress" errors.
   *
   * **Generated Template Structure**:
   * ```json
   * {
   *   "type": "Microsoft.Network/virtualNetworks",
   *   "name": "vnet-name",
   *   "properties": {
   *     "addressSpace": { "addressPrefixes": ["10.0.0.0/16"] },
   *     "subnets": [
   *       {
   *         "name": "subnet-1",
   *         "properties": {
   *           "addressPrefix": "10.0.1.0/24",
   *           "networkSecurityGroup": { "id": "[resourceId(...)]" },
   *           "delegations": [
   *             {
   *               "name": "delegation",
   *               "properties": { "serviceName": "Microsoft.Web/serverFarms" }
   *             }
   *           ]
   *         }
   *       }
   *     ]
   *   },
   *   "dependsOn": [
   *     "[resourceId('Microsoft.Network/networkSecurityGroups', 'nsg-1')]"
   *   ]
   * }
   * ```
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): ArmResource {
    const properties: any = {
      addressSpace: {
        addressPrefixes: this.addressSpace.addressPrefixes,
      },
    };

    // Add inline subnets if provided
    if (this.subnets && this.subnets.length > 0) {
      properties.subnets = this.subnets.map((subnet) => {
        const subnetProps: any = {
          addressPrefix: subnet.addressPrefix,
        };

        // Add NSG reference if provided
        if (subnet.networkSecurityGroup) {
          const nsgId = subnet.networkSecurityGroup.id;
          // Check if ID is already an ARM expression (starts with '[')
          if (nsgId.startsWith('[')) {
            // Already an ARM expression, use as-is
            subnetProps.networkSecurityGroup = {
              id: nsgId,
            };
          } else {
            // Convert NSG ID to ARM resourceId() expression
            const nsgName = nsgId.split('/').pop();
            subnetProps.networkSecurityGroup = {
              id: `[resourceId('Microsoft.Network/networkSecurityGroups', '${nsgName}')]`,
            };
          }
        }

        // Add service endpoints if provided
        if (subnet.serviceEndpoints && subnet.serviceEndpoints.length > 0) {
          subnetProps.serviceEndpoints = subnet.serviceEndpoints.map((endpoint) => ({
            service: endpoint.service,
          }));
        }

        // Add delegations if provided (CRITICAL - must use properties wrapper)
        if (subnet.delegations && subnet.delegations.length > 0) {
          subnetProps.delegations = subnet.delegations.map((delegation) => ({
            name: delegation.name,
            properties: {
              serviceName: delegation.serviceName,
            },
          }));
        }

        return {
          name: subnet.name,
          properties: subnetProps,
        };
      });
    }

    // Add DHCP options if provided
    if (this.dhcpOptions) {
      properties.dhcpOptions = {
        dnsServers: this.dhcpOptions.dnsServers,
      };
    }

    // Add DDoS protection
    if (this.enableDdosProtection) {
      properties.enableDdosProtection = this.enableDdosProtection;
    }

    // Add VM protection
    if (this.enableVmProtection) {
      properties.enableVmProtection = this.enableVmProtection;
    }

    // Build dependsOn array for explicit dependencies
    const dependsOn: string[] = [];
    const uniqueDeps = new Set<string>();

    // Add NSG dependencies from inline subnets
    if (this.subnets) {
      this.subnets.forEach((subnet) => {
        if (subnet.networkSecurityGroup) {
          const nsgId = subnet.networkSecurityGroup.id;
          // Check if ID is already an ARM expression (starts with '[')
          if (nsgId.startsWith('[')) {
            // Already an ARM expression, use as-is
            uniqueDeps.add(nsgId);
          } else {
            // Convert NSG ID to ARM resourceId() expression
            const nsgName = nsgId.split('/').pop();
            const nsgResourceId = `[resourceId('Microsoft.Network/networkSecurityGroups', '${nsgName}')]`;
            uniqueDeps.add(nsgResourceId);
          }
        }
      });
    }

    // Convert set to array
    dependsOn.push(...Array.from(uniqueDeps));

    const template: any = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.virtualNetworkName,
      location: this.location,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      properties,
    };

    // Only include dependsOn if there are dependencies
    if (dependsOn.length > 0) {
      template.dependsOn = dependsOn;
    }

    return template;
  }
}
