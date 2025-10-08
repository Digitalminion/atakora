/**
 * Strongly-typed ARM template interfaces
 *
 * This module exports all ARM resource type definitions and type guards
 * to ensure compile-time type safety and runtime validation.
 *
 * @module synthesis/transform/types
 */

// Export all types
export * from './arm-resource-types';
export * from './arm-network-types';
export * from './arm-storage-types';

// Import types for type guards
import type {
  ArmResourceBase,
  ArmTemplateDocument,
  ArmParameter,
  ArmOutput,
  ArmManagedIdentity,
  ArmSku,
} from './arm-resource-types';

import type {
  ArmVirtualNetwork,
  ArmNetworkSecurityGroup,
  ArmSubnet,
  ArmSubnetDelegation,
  ArmSecurityRule,
  ArmServiceEndpoint,
} from './arm-network-types';

import type {
  ArmStorageAccount,
  ArmBlobContainer,
  ArmStorageSku,
  ArmNetworkAcls,
} from './arm-storage-types';

/**
 * Type guard utilities for runtime validation of ARM resource structures
 */

/**
 * Checks if a value is a valid ARM resource
 *
 * @param obj - Object to check
 * @returns True if the object is a valid ARM resource
 *
 * @example
 * if (isArmResource(resource)) {
 *   console.log(resource.type, resource.apiVersion);
 * }
 */
export function isArmResource(obj: unknown): obj is ArmResourceBase {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const resource = obj as Record<string, unknown>;

  return (
    typeof resource.type === 'string' &&
    typeof resource.apiVersion === 'string' &&
    typeof resource.name === 'string' &&
    resource.type.length > 0 &&
    resource.apiVersion.length > 0 &&
    resource.name.length > 0
  );
}

/**
 * Checks if a resource is an ARM Virtual Network
 *
 * @param obj - Object to check
 * @returns True if the object is an ARM Virtual Network
 *
 * @example
 * if (isArmVirtualNetwork(resource)) {
 *   const addressPrefixes = resource.properties.addressSpace.addressPrefixes;
 * }
 */
export function isArmVirtualNetwork(obj: unknown): obj is ArmVirtualNetwork {
  if (!isArmResource(obj)) {
    return false;
  }

  return obj.type === 'Microsoft.Network/virtualNetworks';
}

/**
 * Checks if a resource is an ARM Network Security Group
 *
 * @param obj - Object to check
 * @returns True if the object is an ARM Network Security Group
 *
 * @example
 * if (isArmNetworkSecurityGroup(resource)) {
 *   const rules = resource.properties?.securityRules || [];
 * }
 */
export function isArmNetworkSecurityGroup(obj: unknown): obj is ArmNetworkSecurityGroup {
  if (!isArmResource(obj)) {
    return false;
  }

  return obj.type === 'Microsoft.Network/networkSecurityGroups';
}

/**
 * Checks if a resource is an ARM Storage Account
 *
 * @param obj - Object to check
 * @returns True if the object is an ARM Storage Account
 *
 * @example
 * if (isArmStorageAccount(resource)) {
 *   console.log(resource.sku.name, resource.kind);
 * }
 */
export function isArmStorageAccount(obj: unknown): obj is ArmStorageAccount {
  if (!isArmResource(obj)) {
    return false;
  }

  const resource = obj as ArmResourceBase;
  return (
    resource.type === 'Microsoft.Storage/storageAccounts' && 'sku' in resource && 'kind' in resource
  );
}

/**
 * Checks if a resource is an ARM Blob Container
 *
 * @param obj - Object to check
 * @returns True if the object is an ARM Blob Container
 *
 * @example
 * if (isArmBlobContainer(resource)) {
 *   console.log(resource.properties?.publicAccess);
 * }
 */
export function isArmBlobContainer(obj: unknown): obj is ArmBlobContainer {
  if (!isArmResource(obj)) {
    return false;
  }

  return obj.type === 'Microsoft.Storage/storageAccounts/blobServices/containers';
}

/**
 * Checks if an object is a valid ARM template document
 *
 * @param obj - Object to check
 * @returns True if the object is a valid ARM template
 *
 * @example
 * if (isArmTemplateDocument(template)) {
 *   console.log(`Template has ${template.resources.length} resources`);
 * }
 */
export function isArmTemplateDocument(obj: unknown): obj is ArmTemplateDocument {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const template = obj as Record<string, unknown>;

  return (
    typeof template.$schema === 'string' &&
    typeof template.contentVersion === 'string' &&
    Array.isArray(template.resources) &&
    template.$schema.length > 0 &&
    template.contentVersion.length > 0
  );
}

/**
 * Checks if a delegation object has the required properties wrapper
 *
 * CRITICAL: This validates the exact ARM schema structure for delegations.
 * The properties wrapper is REQUIRED - missing it causes deployment failure.
 *
 * @param obj - Object to check
 * @returns True if the delegation has correct structure
 *
 * @example
 * const delegation = {
 *   name: 'aci-delegation',
 *   properties: {
 *     serviceName: 'Microsoft.ContainerInstance/containerGroups'
 *   }
 * };
 * isValidArmSubnetDelegation(delegation); // true
 *
 * const badDelegation = {
 *   name: 'aci-delegation',
 *   serviceName: 'Microsoft.ContainerInstance/containerGroups' // WRONG - missing properties wrapper
 * };
 * isValidArmSubnetDelegation(badDelegation); // false
 */
export function isValidArmSubnetDelegation(obj: unknown): obj is ArmSubnetDelegation {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const delegation = obj as Record<string, unknown>;

  // Must have name property
  if (typeof delegation.name !== 'string' || delegation.name.length === 0) {
    return false;
  }

  // CRITICAL: Must have properties wrapper
  if (typeof delegation.properties !== 'object' || delegation.properties === null) {
    return false;
  }

  const props = delegation.properties as Record<string, unknown>;

  // Properties wrapper must contain serviceName
  return typeof props.serviceName === 'string' && props.serviceName.length > 0;
}

/**
 * Checks if a subnet has the required properties wrapper
 *
 * CRITICAL: This validates the inline subnet structure used in Virtual Networks.
 * The properties wrapper is REQUIRED - missing it causes deployment failure.
 *
 * @param obj - Object to check
 * @returns True if the subnet has correct structure
 *
 * @example
 * const subnet = {
 *   name: 'default',
 *   properties: {
 *     addressPrefix: '10.0.1.0/24'
 *   }
 * };
 * isValidArmSubnet(subnet); // true
 *
 * const badSubnet = {
 *   name: 'default',
 *   addressPrefix: '10.0.1.0/24' // WRONG - missing properties wrapper
 * };
 * isValidArmSubnet(badSubnet); // false
 */
export function isValidArmSubnet(obj: unknown): obj is ArmSubnet {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const subnet = obj as Record<string, unknown>;

  // Must have name property
  if (typeof subnet.name !== 'string' || subnet.name.length === 0) {
    return false;
  }

  // CRITICAL: Must have properties wrapper
  if (typeof subnet.properties !== 'object' || subnet.properties === null) {
    return false;
  }

  const props = subnet.properties as Record<string, unknown>;

  // Properties wrapper must contain addressPrefix
  if (typeof props.addressPrefix !== 'string' || props.addressPrefix.length === 0) {
    return false;
  }

  // If delegations exist, validate each one has correct structure
  if (Array.isArray(props.delegations)) {
    for (const delegation of props.delegations) {
      if (!isValidArmSubnetDelegation(delegation)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Checks if a string is an ARM expression (starts with '[' and ends with ']')
 *
 * ARM expressions are used for:
 * - Function calls: [resourceId(...)]
 * - Parameter references: [parameters('paramName')]
 * - Variable references: [variables('varName')]
 * - Concatenation: [concat(...)]
 * - Other ARM template functions
 *
 * @param value - String to check
 * @returns True if the string is an ARM expression
 *
 * @example
 * isArmExpression("[resourceId('Microsoft.Network/virtualNetworks', 'myVNet')]"); // true
 * isArmExpression("[parameters('location')]"); // true
 * isArmExpression("literal-string"); // false
 * isArmExpression("eastus"); // false
 */
export function isArmExpression(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  return value.startsWith('[') && value.endsWith(']') && value.length > 2;
}

/**
 * Checks if a string is a resourceId ARM expression
 *
 * @param value - String to check
 * @returns True if the string is a resourceId expression
 *
 * @example
 * isResourceIdExpression("[resourceId('Microsoft.Network/virtualNetworks', 'myVNet')]"); // true
 * isResourceIdExpression("[parameters('vnetId')]"); // false
 * isResourceIdExpression("literal-string"); // false
 */
export function isResourceIdExpression(value: unknown): boolean {
  if (!isArmExpression(value)) {
    return false;
  }

  const strValue = value as string;
  // Remove outer brackets and check if it starts with resourceId(
  const inner = strValue.slice(1, -1).trim();
  return inner.startsWith('resourceId(');
}

/**
 * Checks if a string is a parameters() ARM expression
 *
 * @param value - String to check
 * @returns True if the string is a parameters expression
 *
 * @example
 * isParameterReference("[parameters('location')]"); // true
 * isParameterReference("[resourceId(...)]"); // false
 */
export function isParameterReference(value: unknown): boolean {
  if (!isArmExpression(value)) {
    return false;
  }

  const strValue = value as string;
  const inner = strValue.slice(1, -1).trim();
  return inner.startsWith('parameters(');
}

/**
 * Checks if a string is a variables() ARM expression
 *
 * @param value - String to check
 * @returns True if the string is a variables expression
 *
 * @example
 * isVariableReference("[variables('vnetName')]"); // true
 * isVariableReference("[parameters('location')]"); // false
 */
export function isVariableReference(value: unknown): boolean {
  if (!isArmExpression(value)) {
    return false;
  }

  const strValue = value as string;
  const inner = strValue.slice(1, -1).trim();
  return inner.startsWith('variables(');
}

/**
 * Validates that an NSG reference uses an ARM expression, not a literal string
 *
 * CRITICAL: NSG references must use resourceId() expressions.
 * Using literal strings causes deployment failures.
 *
 * @param nsgRef - NSG reference object to validate
 * @returns True if the NSG reference uses an ARM expression
 *
 * @example
 * const goodNsgRef = {
 *   id: "[resourceId('Microsoft.Network/networkSecurityGroups', 'myNSG')]"
 * };
 * isValidNsgReference(goodNsgRef); // true
 *
 * const badNsgRef = {
 *   id: "/subscriptions/.../resourceGroups/.../providers/Microsoft.Network/networkSecurityGroups/myNSG"
 * };
 * isValidNsgReference(badNsgRef); // false - literal string not allowed
 */
export function isValidNsgReference(nsgRef: unknown): boolean {
  if (typeof nsgRef !== 'object' || nsgRef === null) {
    return false;
  }

  const ref = nsgRef as Record<string, unknown>;

  if (typeof ref.id !== 'string') {
    return false;
  }

  // CRITICAL: ID must be an ARM expression, not a literal resource ID
  return isArmExpression(ref.id);
}

/**
 * Validates that a subnet's NSG reference uses an ARM expression
 *
 * @param subnet - Subnet object to validate
 * @returns True if the subnet's NSG reference (if present) is valid
 */
export function hasValidNsgReference(subnet: unknown): boolean {
  if (!isValidArmSubnet(subnet)) {
    return false;
  }

  const props = subnet.properties as Record<string, unknown>;

  // If no NSG reference, validation passes
  if (!props.networkSecurityGroup) {
    return true;
  }

  // If NSG reference exists, it must be valid
  return isValidNsgReference(props.networkSecurityGroup);
}

/**
 * Type assertion helpers
 */

/**
 * Assert that a value is an ARM resource
 *
 * @param obj - Object to assert
 * @throws TypeError if the object is not a valid ARM resource
 */
export function assertArmResource(obj: unknown): asserts obj is ArmResourceBase {
  if (!isArmResource(obj)) {
    throw new TypeError('Object is not a valid ARM resource');
  }
}

/**
 * Assert that a value is an ARM template document
 *
 * @param obj - Object to assert
 * @throws TypeError if the object is not a valid ARM template
 */
export function assertArmTemplateDocument(obj: unknown): asserts obj is ArmTemplateDocument {
  if (!isArmTemplateDocument(obj)) {
    throw new TypeError('Object is not a valid ARM template document');
  }
}

/**
 * Assert that a subnet delegation has correct structure
 *
 * @param obj - Object to assert
 * @throws TypeError if the delegation is invalid
 */
export function assertValidSubnetDelegation(obj: unknown): asserts obj is ArmSubnetDelegation {
  if (!isValidArmSubnetDelegation(obj)) {
    throw new TypeError(
      'Invalid subnet delegation structure. Must include properties wrapper with serviceName. ' +
        'Correct format: { name: "...", properties: { serviceName: "..." } }'
    );
  }
}

/**
 * Assert that a subnet has correct structure
 *
 * @param obj - Object to assert
 * @throws TypeError if the subnet is invalid
 */
export function assertValidSubnet(obj: unknown): asserts obj is ArmSubnet {
  if (!isValidArmSubnet(obj)) {
    throw new TypeError(
      'Invalid subnet structure. Must include properties wrapper with addressPrefix. ' +
        'Correct format: { name: "...", properties: { addressPrefix: "..." } }'
    );
  }
}
