import { describe, it, expect, beforeEach } from 'vitest';
import { App } from './app';
import { SubscriptionStack } from './subscription-stack';
import { ResourceGroupStack } from './resource-group-stack';
import { Subscription } from './azure/subscription';
import { Geography } from './azure/geography';
import { Organization } from './context/organization';
import { Project } from './context/project';
import { Environment } from './context/environment';
import { Instance } from './context/instance';
import { Construct } from './construct';
import { DeploymentScope } from './azure/scopes';

describe('core/ResourceGroupStack', () => {
  let app: App;
  let subscriptionStack: SubscriptionStack;

  beforeEach(() => {
    app = new App();

    const subscription = Subscription.fromId('12345678-1234-1234-1234-123456789abc');
    const geography = Geography.fromValue('eastus');
    const organization = Organization.fromValue('digital-minion');
    const project = new Project('authr');
    const environment = Environment.fromValue('nonprod');
    const instance = Instance.fromNumber(1);

    subscriptionStack = new SubscriptionStack(app, 'Foundation', {
      subscription,
      geography,
      organization,
      project,
      environment,
      instance,
      tags: {
        Environment: 'NonProd',
        Owner: 'Platform Team',
      },
    });
  });

  describe('constructor', () => {
    it('should create resource group stack', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-digital-minion-authr-data-nonprod-eus-00',
          location: 'eastus',
        },
      });

      expect(rgStack).toBeDefined();
      expect(rgStack.node.id).toBe('DataStack');
    });

    it('should set resource group name', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
      });

      expect(rgStack.resourceGroupName).toBe('rg-test');
    });

    it('should set location from resource group', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'westus2',
        },
      });

      expect(rgStack.location).toBe('westus2');
    });

    it('should have ResourceGroup scope', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
      });

      expect(rgStack.scope).toBe(DeploymentScope.ResourceGroup);
    });

    it('should store reference to parent subscription stack', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
      });

      expect(rgStack.subscriptionStack).toBe(subscriptionStack);
    });

    it('should inherit tags from parent stack', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
      });

      expect(rgStack.tags).toEqual({
        Environment: 'NonProd',
        Owner: 'Platform Team',
      });
    });

    it('should merge tags with parent stack', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
        tags: {
          Purpose: 'Data',
          CostCenter: '12345',
        },
      });

      expect(rgStack.tags).toEqual({
        Environment: 'NonProd',
        Owner: 'Platform Team',
        Purpose: 'Data',
        CostCenter: '12345',
      });
    });

    it('should override parent tags when same key provided', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
        tags: {
          Owner: 'Data Team', // Override parent's Owner
        },
      });

      expect(rgStack.tags.Owner).toBe('Data Team');
    });

    it('should be child of subscription stack in construct tree', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
      });

      expect(rgStack.node.scope).toBe(subscriptionStack);
      expect(subscriptionStack.node.children).toContainEqual(rgStack);
    });
  });

  describe('generateResourceName()', () => {
    it('should delegate to parent subscription stack', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
      });

      const name = rgStack.generateResourceName('storage');

      expect(name).toBeDefined();
      expect(name.length).toBeGreaterThan(0);
    });

    it('should generate same names as parent stack', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
      });

      const nameFromRg = rgStack.generateResourceName('storage', 'data');
      const nameFromSub = subscriptionStack.generateResourceName('storage', 'data');

      expect(nameFromRg).toBe(nameFromSub);
    });

    it('should include purpose when provided', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
      });

      const name = rgStack.generateResourceName('storage', 'backup');

      expect(name).toContain('backup');
    });

    it('should work for different resource types', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
      });

      const storageName = rgStack.generateResourceName('storage');
      const kvName = rgStack.generateResourceName('keyvault');
      const vnetName = rgStack.generateResourceName('vnet');

      expect(storageName).toBeDefined();
      expect(kvName).toBeDefined();
      expect(vnetName).toBeDefined();

      // All should be different
      expect(storageName).not.toBe(kvName);
      expect(kvName).not.toBe(vnetName);
    });
  });

  describe('Integration tests', () => {
    it('should work with different resource group locations', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'WestStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test-west',
          location: 'westus2',
        },
      });

      expect(rgStack.location).toBe('westus2');
      // Can still generate names using parent's geography context
      const name = rgStack.generateResourceName('storage');
      expect(name).toBeDefined();
    });

    it('should support multiple resource group stacks per subscription stack', () => {
      const dataStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-data',
          location: 'eastus',
        },
      });

      const appStack = new ResourceGroupStack(subscriptionStack, 'AppStack', {
        resourceGroup: {
          resourceGroupName: 'rg-app',
          location: 'eastus',
        },
      });

      const monitorStack = new ResourceGroupStack(subscriptionStack, 'MonitorStack', {
        resourceGroup: {
          resourceGroupName: 'rg-monitor',
          location: 'eastus',
        },
      });

      expect(subscriptionStack.node.children).toHaveLength(3);
      expect(subscriptionStack.node.children).toContainEqual(dataStack);
      expect(subscriptionStack.node.children).toContainEqual(appStack);
      expect(subscriptionStack.node.children).toContainEqual(monitorStack);
    });

    it('should maintain naming consistency across sibling stacks', () => {
      const dataStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-data',
          location: 'eastus',
        },
      });

      const appStack = new ResourceGroupStack(subscriptionStack, 'AppStack', {
        resourceGroup: {
          resourceGroupName: 'rg-app',
          location: 'eastus',
        },
      });

      const name1 = dataStack.generateResourceName('storage', 'data');
      const name2 = appStack.generateResourceName('storage', 'data');

      // Should generate same name (same purpose, same parent context)
      expect(name1).toBe(name2);
    });

    it('should support nested construct hierarchy', () => {
      const rgStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
        resourceGroup: {
          resourceGroupName: 'rg-test',
          location: 'eastus',
        },
      });

      const child = new Construct(rgStack, 'ChildConstruct');

      expect(child.node.scope).toBe(rgStack);
      expect(rgStack.node.children).toContainEqual(child);

      // Verify full hierarchy: App -> SubStack -> RgStack -> Child
      expect(rgStack.node.scope).toBe(subscriptionStack);
      expect(subscriptionStack.node.scope).toBe(app);
    });
  });
});
