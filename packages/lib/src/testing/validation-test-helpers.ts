/**
 * Validation test helpers for creating invalid resources and testing validation errors.
 *
 * @packageDocumentation
 */

import { ArmResource } from '../synthesis/types';

/**
 * Error codes that should be caught during validation
 */
export enum KnownValidationErrorCode {
  INVALID_DELEGATION_STRUCTURE = 'INVALID_DELEGATION_STRUCTURE',
  MISSING_ADDRESS_PREFIX = 'MISSING_ADDRESS_PREFIX',
  INVALID_NSG_REFERENCE = 'INVALID_NSG_REFERENCE',
  NETWORK_LOCKDOWN_WITHOUT_ENDPOINT = 'NETWORK_LOCKDOWN_WITHOUT_ENDPOINT',
  SUBNET_ADDRESS_PREFIX_LOCATION = 'SUBNET_ADDRESS_PREFIX_LOCATION',
  MISSING_DELEGATION_PROPERTIES = 'MISSING_DELEGATION_PROPERTIES',
}

/**
 * Helper to create an invalid subnet with delegation missing properties wrapper
 *
 * @remarks
 * This creates a delegation structure that will fail Azure deployment with:
 * "InvalidServiceNameOnDelegation"
 *
 * The correct structure requires: delegation.properties.serviceName
 * The invalid structure uses: delegation.serviceName (flat)
 */
export function createInvalidDelegationSubnet(options: {
  name: string;
  addressPrefix: string;
  delegationName: string;
  serviceName: string;
}): any {
  return {
    name: options.name,
    properties: {
      addressPrefix: options.addressPrefix,
      delegations: [
        {
          name: options.delegationName,
          // INVALID: serviceName at wrong level (should be in properties)
          serviceName: options.serviceName,
        },
      ],
    },
  };
}

/**
 * Helper to create a valid subnet with delegation
 *
 * @remarks
 * This creates a delegation structure that will pass Azure deployment.
 */
export function createValidDelegationSubnet(options: {
  name: string;
  addressPrefix: string;
  delegationName: string;
  serviceName: string;
}): any {
  return {
    name: options.name,
    properties: {
      addressPrefix: options.addressPrefix,
      delegations: [
        {
          name: options.delegationName,
          properties: {
            // VALID: serviceName wrapped in properties
            serviceName: options.serviceName,
          },
        },
      ],
    },
  };
}

/**
 * Helper to create a subnet with addressPrefix at wrong location
 *
 * @remarks
 * This creates a subnet where addressPrefix is at the root level instead of
 * inside properties, causing "NoAddressPrefixOrPoolProvided" error.
 */
export function createSubnetWithMisplacedAddressPrefix(options: {
  name: string;
  addressPrefix: string;
}): any {
  return {
    name: options.name,
    addressPrefix: options.addressPrefix, // INVALID: should be in properties
    properties: {},
  };
}

/**
 * Helper to create an NSG reference with literal string (invalid)
 *
 * @remarks
 * Creates an NSG reference using a literal string instead of resourceId() function.
 * This may work during deployment but is not best practice and could fail in
 * certain scenarios.
 */
export function createLiteralNsgReference(nsgResourceId: string): any {
  return {
    id: nsgResourceId, // INVALID: literal string instead of resourceId()
  };
}

/**
 * Helper to create an NSG reference with resourceId function (valid)
 */
export function createValidNsgReference(
  subscriptionId: string,
  resourceGroup: string,
  nsgName: string
): any {
  return {
    id: `[resourceId('Microsoft.Network/networkSecurityGroups', '${nsgName}')]`,
  };
}

/**
 * Helper to create a storage account with network lockdown before private endpoint
 *
 * @remarks
 * This simulates the scenario where publicNetworkAccess is disabled but no
 * private endpoint dependency exists, causing deployment timeouts.
 */
export function createNetworkLockedStorageAccount(options: {
  name: string;
  location: string;
  publicNetworkAccess: 'Enabled' | 'Disabled';
  hasPrivateEndpointDependency?: boolean;
}): ArmResource {
  const resource: ArmResource = {
    type: 'Microsoft.Storage/storageAccounts',
    apiVersion: '2023-01-01',
    name: options.name,
    location: options.location,
    properties: {
      publicNetworkAccess: options.publicNetworkAccess,
    },
    sku: {
      name: 'Standard_LRS',
    },
  };

  if (options.hasPrivateEndpointDependency) {
    resource.dependsOn = [
      `[resourceId('Microsoft.Network/privateEndpoints', '${options.name}-pe')]`,
    ];
  }

  return resource;
}

/**
 * Helper to create an OpenAI service with network restrictions
 *
 * @remarks
 * Similar to storage account - if network access is restricted before
 * private endpoint is available, ARM provider cannot connect.
 */
export function createNetworkLockedOpenAIService(options: {
  name: string;
  location: string;
  restrictPublicAccess: boolean;
  hasPrivateEndpointDependency?: boolean;
}): ArmResource {
  const resource: ArmResource = {
    type: 'Microsoft.CognitiveServices/accounts',
    apiVersion: '2023-05-01',
    name: options.name,
    location: options.location,
    kind: 'OpenAI',
    properties: {
      publicNetworkAccess: options.restrictPublicAccess ? 'Disabled' : 'Enabled',
      networkAcls: options.restrictPublicAccess
        ? {
            defaultAction: 'Deny',
          }
        : undefined,
    },
    sku: {
      name: 'S0',
    },
  };

  if (options.hasPrivateEndpointDependency) {
    resource.dependsOn = [
      `[resourceId('Microsoft.Network/privateEndpoints', '${options.name}-pe')]`,
    ];
  }

  return resource;
}

/**
 * Test data builder for common invalid scenarios
 */
export class InvalidResourceBuilder {
  /**
   * Create a virtual network with invalid inline subnet delegation
   */
  static createVNetWithInvalidDelegation(vnetName: string): ArmResource {
    return {
      type: 'Microsoft.Network/virtualNetworks',
      apiVersion: '2024-07-01',
      name: vnetName,
      location: 'eastus',
      properties: {
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        subnets: [
          createInvalidDelegationSubnet({
            name: 'AppServiceSubnet',
            addressPrefix: '10.0.1.0/24',
            delegationName: 'webapp-delegation',
            serviceName: 'Microsoft.Web/serverFarms',
          }),
        ],
      },
    };
  }

  /**
   * Create a virtual network with valid inline subnet delegation
   */
  static createVNetWithValidDelegation(vnetName: string): ArmResource {
    return {
      type: 'Microsoft.Network/virtualNetworks',
      apiVersion: '2024-07-01',
      name: vnetName,
      location: 'eastus',
      properties: {
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        subnets: [
          createValidDelegationSubnet({
            name: 'AppServiceSubnet',
            addressPrefix: '10.0.1.0/24',
            delegationName: 'webapp-delegation',
            serviceName: 'Microsoft.Web/serverFarms',
          }),
        ],
      },
    };
  }

  /**
   * Create a virtual network with subnet addressPrefix at wrong location
   */
  static createVNetWithMisplacedAddressPrefix(vnetName: string): ArmResource {
    return {
      type: 'Microsoft.Network/virtualNetworks',
      apiVersion: '2024-07-01',
      name: vnetName,
      location: 'eastus',
      properties: {
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        subnets: [
          createSubnetWithMisplacedAddressPrefix({
            name: 'Subnet1',
            addressPrefix: '10.0.1.0/24',
          }),
        ],
      },
    };
  }
}

/**
 * Helper to expect a specific validation error
 */
export function expectValidationError(
  fn: () => void,
  expectedCode: KnownValidationErrorCode,
  expectedMessage?: string
): void {
  let error: any;
  try {
    fn();
  } catch (e) {
    error = e;
  }

  if (!error) {
    throw new Error(`Expected validation error with code ${expectedCode} but no error was thrown`);
  }

  if (error.code !== expectedCode) {
    throw new Error(
      `Expected validation error with code ${expectedCode} but got ${error.code}: ${error.message}`
    );
  }

  if (expectedMessage && !error.message.includes(expectedMessage)) {
    throw new Error(
      `Expected error message to include "${expectedMessage}" but got: ${error.message}`
    );
  }
}

/**
 * Helper to expect no validation errors
 */
export function expectNoValidationError(fn: () => void): void {
  try {
    fn();
  } catch (error: any) {
    throw new Error(`Expected no validation error but got: ${error.message}`);
  }
}
