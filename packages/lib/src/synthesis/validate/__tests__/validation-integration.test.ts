/**
 * Comprehensive validation integration tests.
 *
 * @remarks
 * Tests the entire validation pipeline to ensure deployment failures
 * are caught during synthesis, not at Azure deployment time.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { setupArmMatchers } from '../../../testing/arm-template-matchers';
import {
  createInvalidDelegationSubnet,
  createValidDelegationSubnet,
  createSubnetWithMisplacedAddressPrefix,
  InvalidResourceBuilder,
} from '../../../testing/validation-test-helpers';
import { DeploymentSimulator } from '../../../testing/deployment-simulator';
import { ArmTemplate, ArmResource } from '../../types';

// Setup custom matchers
beforeAll(() => {
  setupArmMatchers();
});

describe('ARM Template Validation Integration', () => {
  describe('Template Structure Validation', () => {
    it('should validate well-formed ARM template', () => {
      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [],
      };

      expect(template).toHaveValidArmStructure();
    });

    it('should reject template missing required fields', () => {
      const invalidTemplate = {
        contentVersion: '1.0.0.0',
      } as any;

      expect(() => {
        expect(invalidTemplate).toHaveValidArmStructure();
      }).toThrow();
    });

    it('should validate template has specific resource type', () => {
      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2024-07-01',
            name: 'vnet-test',
            location: 'eastus',
            properties: {},
          },
        ],
      };

      expect(template).toHaveResourceType('Microsoft.Network/virtualNetworks');
    });

    it('should validate template has resource with specific name', () => {
      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'stgtestaccount',
            location: 'eastus',
            sku: { name: 'Standard_LRS' },
            properties: {},
          },
        ],
      };

      expect(template).toHaveResourceWithName('stgtestaccount');
    });
  });

  describe('Subnet Delegation Validation', () => {
    it('should validate delegation with correct properties wrapper', () => {
      const validSubnet = createValidDelegationSubnet({
        name: 'AppServiceSubnet',
        addressPrefix: '10.0.1.0/24',
        delegationName: 'webapp-delegation',
        serviceName: 'Microsoft.Web/serverFarms',
      });

      expect(validSubnet.properties).toHaveDelegationPropertiesWrapper();
    });

    it('should reject delegation without properties wrapper', () => {
      const invalidSubnet = createInvalidDelegationSubnet({
        name: 'AppServiceSubnet',
        addressPrefix: '10.0.1.0/24',
        delegationName: 'webapp-delegation',
        serviceName: 'Microsoft.Web/serverFarms',
      });

      expect(() => {
        expect(invalidSubnet.properties).toHaveDelegationPropertiesWrapper();
      }).toThrow(/serviceName at wrong level/);
    });

    it('should validate VNet with valid delegation structure', () => {
      const vnet = InvalidResourceBuilder.createVNetWithValidDelegation('vnet-test');

      expect(vnet.properties.subnets[0]).toHaveDelegationPropertiesWrapper();
    });

    it('should reject VNet with invalid delegation structure', () => {
      const vnet = InvalidResourceBuilder.createVNetWithInvalidDelegation('vnet-test');

      expect(() => {
        expect(vnet.properties.subnets[0]).toHaveDelegationPropertiesWrapper();
      }).toThrow(/serviceName at wrong level/);
    });
  });

  describe('Subnet AddressPrefix Location Validation', () => {
    it('should validate subnet with addressPrefix in properties', () => {
      const validSubnet = {
        name: 'Subnet1',
        properties: {
          addressPrefix: '10.0.1.0/24',
        },
      };

      expect(validSubnet).toHaveValidSubnetStructure();
    });

    it('should reject subnet with addressPrefix at wrong level', () => {
      const invalidSubnet = createSubnetWithMisplacedAddressPrefix({
        name: 'Subnet1',
        addressPrefix: '10.0.1.0/24',
      });

      expect(() => {
        expect(invalidSubnet).toHaveValidSubnetStructure();
      }).toThrow(/addressPrefix at wrong level/);
    });

    it('should reject VNet with subnet addressPrefix at wrong location', () => {
      const vnet = InvalidResourceBuilder.createVNetWithMisplacedAddressPrefix('vnet-test');

      expect(() => {
        expect(vnet.properties.subnets[0]).toHaveValidSubnetStructure();
      }).toThrow(/addressPrefix at wrong level/);
    });
  });

  describe('NSG Reference Validation', () => {
    it('should validate NSG reference using resourceId function', () => {
      const subnet = {
        name: 'Subnet1',
        properties: {
          addressPrefix: '10.0.1.0/24',
          networkSecurityGroup: {
            id: "[resourceId('Microsoft.Network/networkSecurityGroups', 'nsg-web')]",
          },
        },
      };

      expect(subnet.properties).toHaveValidNsgReference();
    });

    it('should reject NSG reference with literal string', () => {
      const subnet = {
        name: 'Subnet1',
        properties: {
          addressPrefix: '10.0.1.0/24',
          networkSecurityGroup: {
            id: '/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/networkSecurityGroups/nsg-web',
          },
        },
      };

      expect(() => {
        expect(subnet.properties).toHaveValidNsgReference();
      }).toThrow(/literal resource ID/);
    });
  });

  describe('Resource Dependency Validation', () => {
    it('should validate resource has expected dependency', () => {
      const resource: ArmResource = {
        type: 'Microsoft.Network/privateEndpoints',
        apiVersion: '2024-07-01',
        name: 'pe-storage',
        location: 'eastus',
        dependsOn: [
          "[resourceId('Microsoft.Storage/storageAccounts', 'stgaccount')]",
          "[resourceId('Microsoft.Network/virtualNetworks/subnets', 'vnet', 'subnet')]",
        ],
        properties: {},
      };

      expect(resource).toContainDependency('storageAccounts');
      expect(resource).toContainDependency('subnets');
    });

    it('should reject resource missing expected dependency', () => {
      const resource: ArmResource = {
        type: 'Microsoft.Network/privateEndpoints',
        apiVersion: '2024-07-01',
        name: 'pe-storage',
        location: 'eastus',
        dependsOn: ["[resourceId('Microsoft.Storage/storageAccounts', 'stgaccount')]"],
        properties: {},
      };

      expect(() => {
        expect(resource).toContainDependency('virtualNetworks');
      }).toThrow();
    });
  });

  describe('Deployment Simulation', () => {
    it('should simulate successful deployment with correct dependencies', () => {
      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2024-07-01',
            name: 'vnet',
            location: 'eastus',
            properties: {
              addressSpace: {
                addressPrefixes: ['10.0.0.0/16'],
              },
            },
          },
          {
            type: 'Microsoft.Network/privateEndpoints',
            apiVersion: '2024-07-01',
            name: 'pe-storage',
            location: 'eastus',
            dependsOn: ["[resourceId('Microsoft.Network/virtualNetworks', 'vnet')]"],
            properties: {},
          },
        ],
      };

      const simulator = new DeploymentSimulator();
      const result = simulator.simulate(template);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect circular dependencies', () => {
      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2024-07-01',
            name: 'vnet-a',
            location: 'eastus',
            dependsOn: ["[resourceId('Microsoft.Network/virtualNetworks', 'vnet-b')]"],
            properties: {},
          },
          {
            type: 'Microsoft.Network/virtualNetworks',
            apiVersion: '2024-07-01',
            name: 'vnet-b',
            location: 'eastus',
            dependsOn: ["[resourceId('Microsoft.Network/virtualNetworks', 'vnet-a')]"],
            properties: {},
          },
        ],
      };

      const simulator = new DeploymentSimulator();
      const result = simulator.simulate(template);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });
  });
});
