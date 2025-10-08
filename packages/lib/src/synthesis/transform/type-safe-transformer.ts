/**
 * Type-safe transformation utilities for converting construct properties to ARM resources
 *
 * @remarks
 * This module provides strongly-typed transformers that replace the use of `any` types
 * in resource transformation. All transformations are validated at both compile-time
 * and runtime to ensure correct ARM template structure.
 *
 * @packageDocumentation
 */

import {
  ArmSubnet,
  ArmSubnetDelegation,
  ArmSubnetProperties,
  ArmServiceEndpoint,
  ArmSubresourceReference,
  ArmVirtualNetworkProperties,
  isValidArmSubnet,
  isValidArmSubnetDelegation,
} from './arm-network-types';

/**
 * Error thrown when transformation fails validation
 */
export class TransformationError extends Error {
  constructor(
    message: string,
    public readonly details?: string,
    public readonly path?: string
  ) {
    super(message);
    this.name = 'TransformationError';
  }
}

/**
 * Type-safe transformer for network resources
 *
 * @remarks
 * Replaces all `any` types with strongly-typed transformations.
 * Provides compile-time safety and runtime validation.
 */
export class NetworkResourceTransformer {
  /**
   * Transform inline subnet props to ARM subnet format
   *
   * @remarks
   * Converts from construct format: { name, addressPrefix, delegations, ... }
   * To ARM format: { name, properties: { addressPrefix, delegations, ... } }
   *
   * @param subnets - Subnet configurations from construct
   * @returns ARM-formatted subnet array
   * @throws {TransformationError} If subnet structure is invalid
   */
  transformSubnets(subnets: InlineSubnetInput[]): ArmSubnet[] {
    return subnets.map((subnet, index) => {
      try {
        const armSubnet = this.transformSingleSubnet(subnet);

        // Runtime validation with type guard
        if (!isValidArmSubnet(armSubnet)) {
          throw new TransformationError(
            `Invalid ARM subnet structure for subnet at index ${index}`,
            this.getSubnetValidationErrors(armSubnet),
            `subnets[${index}]`
          );
        }

        return armSubnet;
      } catch (error) {
        if (error instanceof TransformationError) {
          throw error;
        }
        throw new TransformationError(
          `Failed to transform subnet at index ${index}`,
          error instanceof Error ? error.message : String(error),
          `subnets[${index}]`
        );
      }
    });
  }

  /**
   * Transform a single subnet from construct format to ARM format
   */
  private transformSingleSubnet(subnet: InlineSubnetInput): ArmSubnet {
    // Extract name and other properties
    const { name, addressPrefix, delegations, networkSecurityGroup, serviceEndpoints, ...rest } =
      subnet;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      throw new TransformationError(
        'Subnet name is required and must be a string',
        `Received: ${typeof name}`,
        'subnet.name'
      );
    }

    if (!addressPrefix || typeof addressPrefix !== 'string') {
      throw new TransformationError(
        `Subnet '${name}' is missing addressPrefix`,
        'addressPrefix must be a string in CIDR notation (e.g., "10.0.1.0/24")',
        `subnet.${name}.addressPrefix`
      );
    }

    // Build subnet properties
    const properties: ArmSubnetProperties = {
      addressPrefix,
    };

    // Transform delegations if present
    if (delegations && Array.isArray(delegations)) {
      properties.delegations = this.transformDelegations(delegations, name);
    }

    // Add network security group reference if present
    if (networkSecurityGroup) {
      properties.networkSecurityGroup = this.transformSubresourceReference(
        networkSecurityGroup,
        `subnet.${name}.networkSecurityGroup`
      );
    }

    // Add service endpoints if present
    if (serviceEndpoints && Array.isArray(serviceEndpoints)) {
      properties.serviceEndpoints = this.transformServiceEndpoints(serviceEndpoints, name);
    }

    // Add any additional properties (routeTable, natGateway, etc.)
    if ('routeTable' in rest && rest.routeTable) {
      properties.routeTable = this.transformSubresourceReference(
        rest.routeTable,
        `subnet.${name}.routeTable`
      );
    }

    if ('natGateway' in rest && rest.natGateway) {
      properties.natGateway = this.transformSubresourceReference(
        rest.natGateway,
        `subnet.${name}.natGateway`
      );
    }

    if ('privateEndpointNetworkPolicies' in rest) {
      properties.privateEndpointNetworkPolicies = rest.privateEndpointNetworkPolicies as
        | 'Enabled'
        | 'Disabled';
    }

    if ('privateLinkServiceNetworkPolicies' in rest) {
      properties.privateLinkServiceNetworkPolicies = rest.privateLinkServiceNetworkPolicies as
        | 'Enabled'
        | 'Disabled';
    }

    return {
      name,
      properties,
    };
  }

  /**
   * Transform delegations to ARM format
   *
   * @remarks
   * Converts from construct format: { name, serviceName }
   * To ARM format: { name, properties: { serviceName } }
   *
   * ARM requires the properties wrapper even though it only contains serviceName.
   */
  private transformDelegations(
    delegations: DelegationInput[],
    subnetName: string
  ): ArmSubnetDelegation[] {
    return delegations.map((delegation, index) => {
      // Handle both formats: { name, serviceName } and { name, properties: { serviceName } }
      let serviceName: string | undefined;
      let delegationName: string | undefined;

      if ('name' in delegation) {
        delegationName = delegation.name;
      }

      // Check if serviceName is at top level (construct format)
      if ('serviceName' in delegation && typeof delegation.serviceName === 'string') {
        serviceName = delegation.serviceName;
      }
      // Or if it's in properties wrapper (already ARM format)
      else if (
        'properties' in delegation &&
        delegation.properties &&
        typeof delegation.properties === 'object'
      ) {
        const props = delegation.properties as any;
        if ('serviceName' in props && typeof props.serviceName === 'string') {
          serviceName = props.serviceName;
        }
      }

      if (!delegationName) {
        throw new TransformationError(
          `Delegation at index ${index} in subnet '${subnetName}' missing name`,
          'Each delegation must have a name property',
          `subnet.${subnetName}.delegations[${index}].name`
        );
      }

      if (!serviceName) {
        throw new TransformationError(
          `Delegation '${delegationName}' in subnet '${subnetName}' missing serviceName`,
          'Delegation must have serviceName (e.g., "Microsoft.Web/serverFarms")',
          `subnet.${subnetName}.delegations[${index}].serviceName`
        );
      }

      const armDelegation: ArmSubnetDelegation = {
        name: delegationName,
        properties: {
          serviceName,
        },
      };

      // Runtime validation
      if (!isValidArmSubnetDelegation(armDelegation)) {
        throw new TransformationError(
          `Invalid ARM delegation structure for '${delegationName}' in subnet '${subnetName}'`,
          'Delegation must have format: { name: string, properties: { serviceName: string } }',
          `subnet.${subnetName}.delegations[${index}]`
        );
      }

      return armDelegation;
    });
  }

  /**
   * Transform subresource reference (NSG, route table, NAT gateway)
   */
  private transformSubresourceReference(
    ref: SubresourceReferenceInput,
    path: string
  ): ArmSubresourceReference {
    if (typeof ref === 'string') {
      return { id: ref };
    }

    if (typeof ref === 'object' && ref !== null && 'id' in ref && typeof ref.id === 'string') {
      return { id: ref.id };
    }

    throw new TransformationError(
      'Invalid subresource reference',
      'Must be either a string (resource ID) or an object with an "id" property',
      path
    );
  }

  /**
   * Transform service endpoints
   */
  private transformServiceEndpoints(
    endpoints: ServiceEndpointInput[],
    subnetName: string
  ): ArmServiceEndpoint[] {
    return endpoints.map((endpoint, index) => {
      if (typeof endpoint === 'string') {
        return { service: endpoint };
      }

      if (typeof endpoint === 'object' && endpoint !== null && 'service' in endpoint) {
        const result: ArmServiceEndpoint = {
          service: endpoint.service,
        };

        if ('locations' in endpoint && Array.isArray(endpoint.locations)) {
          result.locations = endpoint.locations;
        }

        return result;
      }

      throw new TransformationError(
        `Invalid service endpoint at index ${index} in subnet '${subnetName}'`,
        'Must be either a string (service name) or an object with a "service" property',
        `subnet.${subnetName}.serviceEndpoints[${index}]`
      );
    });
  }

  /**
   * Transform virtual network properties
   */
  transformVirtualNetworkProperties(
    input: VirtualNetworkPropertiesInput
  ): ArmVirtualNetworkProperties {
    const properties: ArmVirtualNetworkProperties = {
      addressSpace: {
        addressPrefixes: input.addressSpace.addressPrefixes,
      },
    };

    // Transform subnets if present
    if (input.subnets && input.subnets.length > 0) {
      properties.subnets = this.transformSubnets(input.subnets);
    }

    // Add DHCP options if present
    if (input.dhcpOptions) {
      properties.dhcpOptions = {
        dnsServers: input.dhcpOptions.dnsServers,
      };
    }

    // Add optional boolean flags (only if true, to match ARM template conventions)
    if (input.enableDdosProtection === true) {
      properties.enableDdosProtection = true;
    }

    if (input.enableVmProtection === true) {
      properties.enableVmProtection = true;
    }

    return properties;
  }

  /**
   * Get validation error details for a subnet
   */
  private getSubnetValidationErrors(subnet: unknown): string {
    const errors: string[] = [];

    if (typeof subnet !== 'object' || subnet === null) {
      return 'Subnet must be an object';
    }

    const s = subnet as any;

    if (!s.name || typeof s.name !== 'string') {
      errors.push('Missing or invalid "name" property');
    }

    if (!s.properties || typeof s.properties !== 'object') {
      errors.push('Missing or invalid "properties" object');
    } else {
      if (!s.properties.addressPrefix || typeof s.properties.addressPrefix !== 'string') {
        errors.push('Missing or invalid "properties.addressPrefix"');
      }
    }

    return errors.join('; ');
  }
}

/**
 * Input types for transformation (construct format)
 */

interface InlineSubnetInput {
  name: string;
  addressPrefix: string;
  delegations?: DelegationInput[];
  networkSecurityGroup?: SubresourceReferenceInput;
  serviceEndpoints?: ServiceEndpointInput[];
  routeTable?: SubresourceReferenceInput;
  natGateway?: SubresourceReferenceInput;
  privateEndpointNetworkPolicies?: 'Enabled' | 'Disabled';
  privateLinkServiceNetworkPolicies?: 'Enabled' | 'Disabled';
  [key: string]: any;
}

interface DelegationInput {
  name: string;
  serviceName?: string;
  properties?: { serviceName?: string };
}

type SubresourceReferenceInput = string | { id: string };

type ServiceEndpointInput = string | { service: string; locations?: string[] };

interface VirtualNetworkPropertiesInput {
  addressSpace: {
    addressPrefixes: string[];
  };
  subnets?: InlineSubnetInput[];
  dhcpOptions?: {
    dnsServers: string[];
  };
  enableDdosProtection?: boolean;
  enableVmProtection?: boolean;
}
