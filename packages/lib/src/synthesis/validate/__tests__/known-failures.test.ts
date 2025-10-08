/**
 * Known deployment failures test suite.
 *
 * @remarks
 * This test suite contains real-world deployment failures that occurred
 * in production. Each test documents the actual Azure error and ensures
 * our validation catches it during synthesis.
 *
 * CRITICAL: These tests MUST pass to prevent regressions.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { setupArmMatchers } from '../../../testing/arm-template-matchers';
import {
  createInvalidDelegationSubnet,
  createValidDelegationSubnet,
  createSubnetWithMisplacedAddressPrefix,
  createNetworkLockedStorageAccount,
  createNetworkLockedOpenAIService,
  InvalidResourceBuilder,
} from '../../../testing/validation-test-helpers';
import { DeploymentSimulator } from '../../../testing/deployment-simulator';
import { ArmTemplate } from '../../types';

// Setup custom matchers
beforeAll(() => {
  setupArmMatchers();
});

describe('Known Deployment Failures - MUST CATCH THESE', () => {
  describe('FAILURE 1: Subnet Delegation Without Properties Wrapper', () => {
    /**
     * Azure Error: InvalidServiceNameOnDelegation
     * Cause: delegation.serviceName instead of delegation.properties.serviceName
     * Impact: Deployment fails after template validation passes
     * Date: 2024-10-06
     */

    it('MUST reject subnet delegation without properties wrapper', () => {
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

    it('MUST accept subnet delegation WITH properties wrapper', () => {
      const validSubnet = createValidDelegationSubnet({
        name: 'AppServiceSubnet',
        addressPrefix: '10.0.1.0/24',
        delegationName: 'webapp-delegation',
        serviceName: 'Microsoft.Web/serverFarms',
      });

      expect(validSubnet.properties).toHaveDelegationPropertiesWrapper();
    });

    it('MUST reject VNet with inline subnet missing delegation properties', () => {
      const vnet = InvalidResourceBuilder.createVNetWithInvalidDelegation('vnet-prod');

      expect(() => {
        expect(vnet.properties.subnets[0]).toHaveDelegationPropertiesWrapper();
      }).toThrow(/serviceName at wrong level/);
    });

    it('MUST accept VNet with inline subnet having correct delegation', () => {
      const vnet = InvalidResourceBuilder.createVNetWithValidDelegation('vnet-prod');

      expect(vnet.properties.subnets[0]).toHaveDelegationPropertiesWrapper();
    });

    it('MUST catch all common delegation scenarios', () => {
      const testCases = [
        {
          service: 'Microsoft.Web/serverFarms',
          description: 'App Service',
        },
        {
          service: 'Microsoft.ContainerInstance/containerGroups',
          description: 'Container Instances',
        },
        {
          service: 'Microsoft.Sql/managedInstances',
          description: 'SQL Managed Instance',
        },
        {
          service: 'Microsoft.DBforPostgreSQL/flexibleServers',
          description: 'PostgreSQL Flexible Server',
        },
      ];

      for (const testCase of testCases) {
        // Invalid structure should fail
        const invalid = createInvalidDelegationSubnet({
          name: `subnet-${testCase.description}`,
          addressPrefix: '10.0.1.0/24',
          delegationName: `delegation-${testCase.description}`,
          serviceName: testCase.service,
        });

        expect(() => {
          expect(invalid.properties).toHaveDelegationPropertiesWrapper();
        }).toThrow(/serviceName at wrong level/);

        // Valid structure should pass
        const valid = createValidDelegationSubnet({
          name: `subnet-${testCase.description}`,
          addressPrefix: '10.0.1.0/24',
          delegationName: `delegation-${testCase.description}`,
          serviceName: testCase.service,
        });

        expect(valid.properties).toHaveDelegationPropertiesWrapper();
      }
    });
  });

  describe('FAILURE 2: Subnet AddressPrefix at Wrong Location', () => {
    /**
     * Azure Error: NoAddressPrefixOrPoolProvided
     * Cause: subnet.addressPrefix instead of subnet.properties.addressPrefix
     * Impact: Deployment fails - subnet has no address space
     * Date: 2024-10-06
     */

    it('MUST reject subnet with addressPrefix at root level', () => {
      const invalidSubnet = createSubnetWithMisplacedAddressPrefix({
        name: 'Subnet1',
        addressPrefix: '10.0.1.0/24',
      });

      expect(() => {
        expect(invalidSubnet).toHaveValidSubnetStructure();
      }).toThrow(/addressPrefix at wrong level/);
    });

    it('MUST accept subnet with addressPrefix in properties', () => {
      const validSubnet = {
        name: 'Subnet1',
        properties: {
          addressPrefix: '10.0.1.0/24',
        },
      };

      expect(validSubnet).toHaveValidSubnetStructure();
    });

    it('MUST reject VNet with inline subnet addressPrefix misplaced', () => {
      const vnet = InvalidResourceBuilder.createVNetWithMisplacedAddressPrefix('vnet-prod');

      expect(() => {
        expect(vnet.properties.subnets[0]).toHaveValidSubnetStructure();
      }).toThrow(/addressPrefix at wrong level/);
    });
  });

  describe('FAILURE 3: NSG Reference With Literal String', () => {
    /**
     * Issue: Using literal resource ID instead of resourceId() function
     * Cause: Hardcoded /subscriptions/... path
     * Impact: May work but is brittle and not best practice
     * Risk: Cross-subscription or cross-region deployments will fail
     */

    it('MUST reject NSG reference with literal resource ID', () => {
      const subnet = {
        name: 'Subnet1',
        properties: {
          addressPrefix: '10.0.1.0/24',
          networkSecurityGroup: {
            id: '/subscriptions/12345/resourceGroups/rg-network/providers/Microsoft.Network/networkSecurityGroups/nsg-web',
          },
        },
      };

      expect(() => {
        expect(subnet.properties).toHaveValidNsgReference();
      }).toThrow(/literal resource ID/);
    });

    it('MUST accept NSG reference with resourceId function', () => {
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
  });

  describe('FAILURE 4: Storage Account Network Lockdown Before Private Endpoint', () => {
    /**
     * Issue: publicNetworkAccess: Disabled before private endpoint ready
     * Cause: No dependency on private endpoint
     * Impact: Deployment times out - ARM provider cannot connect
     * Date: 2024-10-07
     * Solution: Keep public access enabled during deployment, lock down post-deployment
     */

    it('MUST detect storage account locked down without private endpoint', () => {
      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          createNetworkLockedStorageAccount({
            name: 'stgproddata',
            location: 'eastus',
            publicNetworkAccess: 'Disabled',
            hasPrivateEndpointDependency: false,
          }),
        ],
      };

      const simulator = new DeploymentSimulator();
      const result = simulator.simulate(template);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'NETWORK_LOCKDOWN_WITHOUT_ENDPOINT')).toBe(
        true
      );
      expect(result.timeoutRisks).toContain('Microsoft.Storage/storageAccounts/stgproddata');
    });

    it('MUST accept storage account with public access during deployment', () => {
      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          createNetworkLockedStorageAccount({
            name: 'stgproddata',
            location: 'eastus',
            publicNetworkAccess: 'Enabled',
            hasPrivateEndpointDependency: false,
          }),
        ],
      };

      const simulator = new DeploymentSimulator();
      const result = simulator.simulate(template);

      expect(result.success).toBe(true);
      expect(result.timeoutRisks).toHaveLength(0);
    });

    it('MUST accept storage account with private endpoint dependency', () => {
      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/privateEndpoints',
            apiVersion: '2024-07-01',
            name: 'stgproddata-pe',
            location: 'eastus',
            properties: {},
          },
          createNetworkLockedStorageAccount({
            name: 'stgproddata',
            location: 'eastus',
            publicNetworkAccess: 'Disabled',
            hasPrivateEndpointDependency: true,
          }),
        ],
      };

      const simulator = new DeploymentSimulator();
      const result = simulator.simulate(template);

      // Should still warn but not error if private endpoint exists
      expect(result.errors.length).toBeLessThan(1);
    });
  });

  describe('FAILURE 5: OpenAI Service Network Lockdown Before Private Endpoint', () => {
    /**
     * Issue: Network restrictions before private endpoint ready
     * Cause: publicNetworkAccess: Disabled or networkAcls.defaultAction: Deny
     * Impact: Deployment times out - ARM provider cannot connect
     * Date: 2024-10-07
     */

    it('MUST detect OpenAI service locked down without private endpoint', () => {
      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          createNetworkLockedOpenAIService({
            name: 'openai-prod',
            location: 'eastus',
            restrictPublicAccess: true,
            hasPrivateEndpointDependency: false,
          }),
        ],
      };

      const simulator = new DeploymentSimulator();
      const result = simulator.simulate(template);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.code === 'NETWORK_LOCKDOWN_WITHOUT_ENDPOINT')).toBe(
        true
      );
      expect(result.timeoutRisks).toContain('Microsoft.CognitiveServices/accounts/openai-prod');
    });

    it('MUST accept OpenAI service with public access during deployment', () => {
      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          createNetworkLockedOpenAIService({
            name: 'openai-prod',
            location: 'eastus',
            restrictPublicAccess: false,
            hasPrivateEndpointDependency: false,
          }),
        ],
      };

      const simulator = new DeploymentSimulator();
      const result = simulator.simulate(template);

      expect(result.success).toBe(true);
      expect(result.timeoutRisks).toHaveLength(0);
    });
  });

  describe('FAILURE 6: Circular Dependencies', () => {
    /**
     * Issue: Resources depend on each other in a cycle
     * Cause: Incorrect dependency chain
     * Impact: Deployment hangs forever
     */

    it('MUST detect simple circular dependency', () => {
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

  describe('FAILURE 7: Missing Dependencies', () => {
    /**
     * Issue: Resource depends on another resource not in template
     * Cause: Incomplete template or external dependency
     * Impact: Deployment fails - missing resource
     */

    it('MUST warn about missing dependency', () => {
      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Network/privateEndpoints',
            apiVersion: '2024-07-01',
            name: 'pe-storage',
            location: 'eastus',
            dependsOn: [
              "[resourceId('Microsoft.Storage/storageAccounts', 'nonexistent-storage')]",
            ],
            properties: {},
          },
        ],
      };

      const simulator = new DeploymentSimulator();
      const result = simulator.simulate(template);

      // Should have warning about missing dependency
      expect(result.warnings.some((w) => w.code === 'MISSING_DEPENDENCY')).toBe(true);
    });
  });

  describe('Regression Prevention - All Known Failures', () => {
    it('MUST catch all known failure patterns in single template', () => {
      // This is a comprehensive test to ensure multiple failure types
      // can be detected in a single template

      const template: ArmTemplate = {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          // FAIL: VNet with invalid delegation
          InvalidResourceBuilder.createVNetWithInvalidDelegation('vnet-invalid'),

          // FAIL: Storage with network lockdown
          createNetworkLockedStorageAccount({
            name: 'stginvalid',
            location: 'eastus',
            publicNetworkAccess: 'Disabled',
            hasPrivateEndpointDependency: false,
          }),
        ],
      };

      const simulator = new DeploymentSimulator();
      const result = simulator.simulate(template);

      // Should fail with network lockdown error
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Check delegation on VNet
      expect(() => {
        expect(template.resources[0].properties.subnets[0]).toHaveDelegationPropertiesWrapper();
      }).toThrow();
    });
  });
});
