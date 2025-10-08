/**
 * Custom Vitest matchers for ARM template validation.
 *
 * @packageDocumentation
 */

import { expect } from 'vitest';
import { ArmTemplate, ArmResource, ValidationError } from '../synthesis/types';

/**
 * Extended matchers interface for TypeScript
 */
interface CustomMatchers<R = unknown> {
  toHaveValidArmStructure(): R;
  toHaveDelegationPropertiesWrapper(): R;
  toHaveResourceType(resourceType: string): R;
  toHaveResourceWithName(resourceName: string): R;
  toHaveValidSubnetStructure(): R;
  toHaveValidNsgReference(): R;
  toThrowValidationError(expectedMessage?: string, expectedCode?: string): R;
  toHaveValidationError(code: string): R;
  toHaveValidationWarning(code: string): R;
  toContainDependency(dependencyResourceId: string): R;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends CustomMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

/**
 * Custom matchers for ARM template validation
 */
export const armTemplateMatchers = {
  /**
   * Validates that an ARM template has valid basic structure
   */
  toHaveValidArmStructure(received: ArmTemplate) {
    const required = ['$schema', 'contentVersion', 'resources'];
    const missing = required.filter((key) => !(key in received));

    if (missing.length > 0) {
      return {
        pass: false,
        message: () =>
          `Expected ARM template to have valid structure. Missing required fields: ${missing.join(', ')}`,
      };
    }

    if (!Array.isArray(received.resources)) {
      return {
        pass: false,
        message: () => 'Expected ARM template resources to be an array',
      };
    }

    return {
      pass: true,
      message: () => 'ARM template has valid structure',
    };
  },

  /**
   * Validates that a delegation has the required properties wrapper
   */
  toHaveDelegationPropertiesWrapper(received: any) {
    // Handle both subnet.properties and direct subnet objects
    let delegations = received.delegations;

    // If the received object has a properties field, check there too
    if (!delegations && received.properties && received.properties.delegations) {
      delegations = received.properties.delegations;
    }

    if (!delegations || !Array.isArray(delegations)) {
      return {
        pass: false,
        message: () => 'Expected object to have delegations array',
      };
    }

    for (const delegation of delegations) {
      // Check if serviceName is at the wrong level (flat structure)
      if ('serviceName' in delegation && !('properties' in delegation)) {
        return {
          pass: false,
          message: () =>
            `Delegation "${delegation.name}" has serviceName at wrong level. ` +
            'Must be wrapped in properties object: { name: "...", properties: { serviceName: "..." } }',
        };
      }

      // Check if properties.serviceName exists (correct structure)
      if (!delegation.properties || !delegation.properties.serviceName) {
        return {
          pass: false,
          message: () =>
            `Delegation "${delegation.name}" missing properties.serviceName. ` +
            'Correct structure: { name: "...", properties: { serviceName: "..." } }',
        };
      }
    }

    return {
      pass: true,
      message: () => 'All delegations have valid properties wrapper',
    };
  },

  /**
   * Validates that a template contains a specific resource type
   */
  toHaveResourceType(received: ArmTemplate, resourceType: string) {
    const hasType = received.resources.some((r) => r.type === resourceType);

    return {
      pass: hasType,
      message: () =>
        hasType
          ? `Expected template not to have resource type ${resourceType}`
          : `Expected template to have resource type ${resourceType}`,
    };
  },

  /**
   * Validates that a template contains a resource with specific name
   */
  toHaveResourceWithName(received: ArmTemplate, resourceName: string) {
    const hasName = received.resources.some((r) => {
      // Handle ARM expressions like [parameters('name')]
      if (typeof r.name === 'string') {
        return r.name === resourceName || r.name.includes(resourceName);
      }
      return false;
    });

    return {
      pass: hasName,
      message: () =>
        hasName
          ? `Expected template not to have resource named ${resourceName}`
          : `Expected template to have resource named ${resourceName}`,
    };
  },

  /**
   * Validates that subnet properties are in the correct location
   */
  toHaveValidSubnetStructure(received: any) {
    // Check if this looks like a subnet resource or subnet object
    const isSubnetResource =
      received.type === 'Microsoft.Network/virtualNetworks/subnets' ||
      (received.properties && 'addressPrefix' in received.properties) ||
      'name' in received;

    if (!isSubnetResource) {
      return {
        pass: false,
        message: () => 'Expected object to be a subnet resource or subnet configuration',
      };
    }

    // For inline subnets in VNet (no type field), addressPrefix should be in properties
    if (!received.type && 'addressPrefix' in received) {
      // Check if addressPrefix is at root level (wrong)
      if (!received.properties || !received.properties.addressPrefix) {
        return {
          pass: false,
          message: () =>
            'Subnet has addressPrefix at wrong level. ' +
            'Must be inside properties: { name: "...", properties: { addressPrefix: "..." } }',
        };
      }
    }

    // For subnet resources, addressPrefix should be in properties
    if (received.type === 'Microsoft.Network/virtualNetworks/subnets') {
      if (!received.properties || !received.properties.addressPrefix) {
        return {
          pass: false,
          message: () => 'Subnet resource missing properties.addressPrefix',
        };
      }
    }

    return {
      pass: true,
      message: () => 'Subnet has valid structure',
    };
  },

  /**
   * Validates that an NSG reference uses resourceId() function
   */
  toHaveValidNsgReference(received: any) {
    if (!received.networkSecurityGroup) {
      return {
        pass: false,
        message: () => 'Expected object to have networkSecurityGroup property',
      };
    }

    const nsgId = received.networkSecurityGroup.id;

    // Check if it's a literal string (starts with /)
    if (typeof nsgId === 'string' && nsgId.startsWith('/subscriptions/')) {
      return {
        pass: false,
        message: () =>
          'NSG reference uses literal resource ID. ' +
          'Should use resourceId() function: [resourceId("Microsoft.Network/networkSecurityGroups", "nsg-name")]',
      };
    }

    // Check if it uses resourceId() function (starts with [resourceId)
    if (typeof nsgId === 'string' && !nsgId.includes('resourceId(')) {
      return {
        pass: false,
        message: () =>
          'NSG reference should use resourceId() function: ' +
          '[resourceId("Microsoft.Network/networkSecurityGroups", "nsg-name")]',
      };
    }

    return {
      pass: true,
      message: () => 'NSG reference uses resourceId() function',
    };
  },

  /**
   * Validates that a function throws a validation error
   */
  toThrowValidationError(received: () => void, expectedMessage?: string, expectedCode?: string) {
    let thrownError: any;
    try {
      received();
    } catch (error) {
      thrownError = error;
    }

    if (!thrownError) {
      return {
        pass: false,
        message: () => 'Expected function to throw a validation error but it did not throw',
      };
    }

    // Check if it's a validation error (has code or is Error instance)
    const isValidationError =
      thrownError instanceof Error ||
      (typeof thrownError === 'object' && ('code' in thrownError || 'message' in thrownError));

    if (!isValidationError) {
      return {
        pass: false,
        message: () => `Expected validation error but got: ${JSON.stringify(thrownError, null, 2)}`,
      };
    }

    // Check message if provided
    if (expectedMessage && !thrownError.message.includes(expectedMessage)) {
      return {
        pass: false,
        message: () =>
          `Expected error message to include "${expectedMessage}" but got: ${thrownError.message}`,
      };
    }

    // Check code if provided
    if (expectedCode && thrownError.code !== expectedCode) {
      return {
        pass: false,
        message: () =>
          `Expected error code "${expectedCode}" but got: ${thrownError.code || 'none'}`,
      };
    }

    return {
      pass: true,
      message: () => 'Function threw expected validation error',
    };
  },

  /**
   * Validates that validation result contains an error with specific code
   */
  toHaveValidationError(received: { errors: ValidationError[] }, code: string) {
    const hasError = received.errors.some((e) => e.code === code);

    return {
      pass: hasError,
      message: () =>
        hasError
          ? `Expected validation result not to have error with code ${code}`
          : `Expected validation result to have error with code ${code}. ` +
            `Got: ${received.errors.map((e) => e.code).join(', ')}`,
    };
  },

  /**
   * Validates that validation result contains a warning with specific code
   */
  toHaveValidationWarning(received: { warnings: ValidationError[] }, code: string) {
    const hasWarning = received.warnings.some((w) => w.code === code);

    return {
      pass: hasWarning,
      message: () =>
        hasWarning
          ? `Expected validation result not to have warning with code ${code}`
          : `Expected validation result to have warning with code ${code}. ` +
            `Got: ${received.warnings.map((w) => w.code).join(', ')}`,
    };
  },

  /**
   * Validates that a resource has a dependency on another resource
   */
  toContainDependency(received: ArmResource, dependencyResourceId: string) {
    if (!received.dependsOn) {
      return {
        pass: false,
        message: () => 'Expected resource to have dependsOn array',
      };
    }

    const hasDependency = received.dependsOn.some((dep) => dep.includes(dependencyResourceId));

    return {
      pass: hasDependency,
      message: () =>
        hasDependency
          ? `Expected resource not to depend on ${dependencyResourceId}`
          : `Expected resource to depend on ${dependencyResourceId}. ` +
            `Got dependencies: ${received.dependsOn.join(', ')}`,
    };
  },
};

/**
 * Setup custom matchers - call this in your test setup
 */
export function setupArmMatchers() {
  expect.extend(armTemplateMatchers);
}
