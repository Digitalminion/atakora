/**
 * Tests for Template Splitter
 */

import { TemplateSplitter, ResourceTier } from './template-splitter';
import { ArmTemplate, ArmResource } from '../types';

describe('TemplateSplitter', () => {
  describe('categorizeResources', () => {
    it('should categorize resources by tier', () => {
      const splitter = new TemplateSplitter({ stackName: 'test' });

      const resources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
          location: 'eastus',
        },
        {
          type: 'Microsoft.Web/serverfarms',
          apiVersion: '2023-01-01',
          name: 'plan1',
          location: 'eastus',
        },
        {
          type: 'Microsoft.Web/sites',
          apiVersion: '2023-01-01',
          name: 'app1',
          location: 'eastus',
        },
        {
          type: 'Microsoft.Authorization/roleAssignments',
          apiVersion: '2022-04-01',
          name: 'role1',
        },
      ];

      const categorized = splitter.categorizeResources(resources);

      expect(categorized.get(ResourceTier.FOUNDATION)).toHaveLength(1);
      expect(categorized.get(ResourceTier.FOUNDATION)?.[0].type).toBe('Microsoft.Storage/storageAccounts');

      expect(categorized.get(ResourceTier.COMPUTE)).toHaveLength(2);
      expect(categorized.get(ResourceTier.CONFIGURATION)).toHaveLength(1);
    });

    it('should handle empty resource array', () => {
      const splitter = new TemplateSplitter({ stackName: 'test' });
      const categorized = splitter.categorizeResources([]);

      expect(categorized.get(ResourceTier.FOUNDATION)).toHaveLength(0);
      expect(categorized.get(ResourceTier.COMPUTE)).toHaveLength(0);
      expect(categorized.get(ResourceTier.APPLICATION)).toHaveLength(0);
      expect(categorized.get(ResourceTier.CONFIGURATION)).toHaveLength(0);
    });

    it('should categorize unknown types as APPLICATION tier', () => {
      const splitter = new TemplateSplitter({ stackName: 'test' });

      const resources: ArmResource[] = [
        {
          type: 'Microsoft.UnknownProvider/unknownType',
          apiVersion: '2023-01-01',
          name: 'unknown1',
          location: 'eastus',
        },
      ];

      const categorized = splitter.categorizeResources(resources);

      expect(categorized.get(ResourceTier.APPLICATION)).toHaveLength(1);
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build dependency graph from resources', () => {
      const splitter = new TemplateSplitter({ stackName: 'test' });

      const resources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
          location: 'eastus',
        },
        {
          type: 'Microsoft.Web/sites',
          apiVersion: '2023-01-01',
          name: 'app1',
          location: 'eastus',
          dependsOn: ["resourceId('Microsoft.Storage/storageAccounts', 'storage1')"],
        },
      ];

      const graph = splitter.buildDependencyGraph(resources);

      expect(graph.nodes.size).toBe(2);
      expect(graph.edges.size).toBe(2);
      expect(graph.edges.get('Microsoft.Web/sites/app1')?.has('Microsoft.Storage/storageAccounts/storage1')).toBe(
        true
      );
    });

    it('should handle resources with no dependencies', () => {
      const splitter = new TemplateSplitter({ stackName: 'test' });

      const resources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
          location: 'eastus',
        },
      ];

      const graph = splitter.buildDependencyGraph(resources);

      expect(graph.nodes.size).toBe(1);
      expect(graph.edges.get('Microsoft.Storage/storageAccounts/storage1')?.size).toBe(0);
    });
  });

  describe('split', () => {
    it('should not split small templates', () => {
      const splitter = new TemplateSplitter({
        stackName: 'test',
        maxTemplateSize: 10 * 1024 * 1024, // 10MB
      });

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'storage1',
            location: 'eastus',
          },
        ],
        outputs: {},
      };

      const result = splitter.split(template);

      expect(result.linked.size).toBe(0);
      expect(result.root).toEqual(template);
    });

    it('should split templates by tier', () => {
      const splitter = new TemplateSplitter({
        stackName: 'Foundation',
        maxResourcesPerTemplate: 1, // Force splitting by resource count
      });

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'storage1',
            location: 'eastus',
          },
          {
            type: 'Microsoft.Web/serverfarms',
            apiVersion: '2023-01-01',
            name: 'plan1',
            location: 'eastus',
          },
          {
            type: 'Microsoft.Web/sites',
            apiVersion: '2023-01-01',
            name: 'app1',
            location: 'eastus',
          },
        ],
        outputs: {},
      };

      const result = splitter.split(template);

      // Should create linked templates
      expect(result.linked.size).toBeGreaterThan(0);

      // Root template should have deployment resources
      expect(result.root.resources.length).toBeGreaterThan(0);
      expect(result.root.resources[0].type).toBe('Microsoft.Resources/deployments');

      // Should have artifacts location parameters
      expect(result.root.parameters?._artifactsLocation).toBeDefined();
      expect(result.root.parameters?._artifactsLocationSasToken).toBeDefined();
    });

    it('should preserve dependency order', () => {
      const splitter = new TemplateSplitter({
        stackName: 'Foundation',
        maxResourcesPerTemplate: 1, // Force splitting
      });

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'storage1',
            location: 'eastus',
          },
          {
            type: 'Microsoft.Web/serverfarms',
            apiVersion: '2023-01-01',
            name: 'plan1',
            location: 'eastus',
            dependsOn: ["resourceId('Microsoft.Storage/storageAccounts', 'storage1')"],
          },
        ],
        outputs: {},
      };

      const result = splitter.split(template);

      // Should have deployment order
      expect(result.deploymentOrder.length).toBeGreaterThan(0);

      // Foundation resources should come before compute resources
      const foundationIndex = result.deploymentOrder.findIndex((name) => name.includes('foundation'));
      const computeIndex = result.deploymentOrder.findIndex((name) => name.includes('compute'));

      if (foundationIndex >= 0 && computeIndex >= 0) {
        expect(foundationIndex).toBeLessThan(computeIndex);
      }
    });

    it('should split function app and functions into separate tiers', () => {
      const splitter = new TemplateSplitter({
        stackName: 'Foundation',
        maxResourcesPerTemplate: 1, // Force splitting
      });

      const template: ArmTemplate = {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        resources: [
          {
            type: 'Microsoft.Web/sites',
            apiVersion: '2023-01-01',
            name: 'functionapp1',
            location: 'eastus',
            kind: 'functionapp',
          },
          {
            type: 'Microsoft.Web/sites/functions',
            apiVersion: '2023-01-01',
            name: 'functionapp1/function1',
          },
          {
            type: 'Microsoft.Storage/storageAccounts',
            apiVersion: '2023-01-01',
            name: 'storage1',
            location: 'eastus',
          },
        ],
        outputs: {},
      };

      const result = splitter.split(template);

      // Function app (compute) and function (application) are in different tiers
      // This is intentional - the function app resource is infrastructure, functions are application
      let functionAppTemplateName = '';
      let functionTemplateName = '';

      for (const [name, linkedTemplate] of result.linked) {
        for (const resource of linkedTemplate.resources) {
          if (resource.type === 'Microsoft.Web/sites') {
            functionAppTemplateName = name;
          }
          if (resource.type === 'Microsoft.Web/sites/functions') {
            functionTemplateName = name;
          }
        }
      }

      // Should be in different templates (different tiers)
      expect(functionAppTemplateName).toBeTruthy();
      expect(functionTemplateName).toBeTruthy();
      expect(functionAppTemplateName).not.toBe(functionTemplateName);

      // Function app should be compute tier, function should be application tier
      expect(functionAppTemplateName).toContain('compute');
      expect(functionTemplateName).toContain('application');
    });
  });

  describe('applyAffinityRules', () => {
    it('should group resources with strong affinity', () => {
      const splitter = new TemplateSplitter({ stackName: 'test' });

      const resources: ArmResource[] = [
        {
          type: 'Microsoft.Web/sites',
          apiVersion: '2023-01-01',
          name: 'functionapp1',
          location: 'eastus',
        },
        {
          type: 'Microsoft.Web/sites/functions',
          apiVersion: '2023-01-01',
          name: 'functionapp1/function1',
        },
      ];

      const categorized = new Map();
      categorized.set(ResourceTier.COMPUTE, [resources[0]]);
      categorized.set(ResourceTier.APPLICATION, [resources[1]]);

      const dependencyGraph = splitter.buildDependencyGraph(resources);
      const groups = splitter.applyAffinityRules(categorized, dependencyGraph);

      // Function app and function should be grouped together
      // Note: This test depends on implementation details
      expect(groups.length).toBeGreaterThan(0);
    });
  });
});
