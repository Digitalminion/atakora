import { describe, it, expect, beforeEach } from 'vitest';
import { Resource, type ResourceProps } from './resource';
import { Construct } from './construct';
import { App } from './app';
import { SubscriptionStack } from './subscription-stack';
import { ResourceGroupStack } from './resource-group-stack';
import { Subscription } from './azure/subscription';
import { Geography } from './azure/geography';
import { Organization } from './context/organization';
import { Project } from './context/project';
import { Environment } from './context/environment';
import { Instance } from './context/instance';

// Create a concrete test implementation of Resource
class TestResource extends Resource {
  readonly resourceType = 'Microsoft.Test/testResources';
  readonly resourceId: string;
  readonly name: string;

  constructor(scope: Construct, id: string, props: ResourceProps & { name: string }) {
    super(scope, id, props);
    this.name = props.name;
    this.resourceId = `/subscriptions/test/resourceGroups/test-rg/providers/${this.resourceType}/${this.name}`;
  }
}

describe('core/Resource', () => {
  let app: App;
  let subscriptionStack: SubscriptionStack;
  let resourceGroupStack: ResourceGroupStack;

  beforeEach(() => {
    app = new App();

    const subscription = Subscription.fromId('12345678-1234-1234-1234-123456789abc');
    const geography = Geography.fromValue('eastus');
    const organization = Organization.fromValue('digital-products');
    const project = new Project('colorai');
    const environment = Environment.fromValue('nonprod');
    const instance = Instance.fromNumber(1);

    subscriptionStack = new SubscriptionStack(app, 'Foundation', {
      subscription,
      geography,
      organization,
      project,
      environment,
      instance,
    });

    resourceGroupStack = new ResourceGroupStack(subscriptionStack, 'DataStack', {
      resourceGroup: {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      },
    });
  });

  describe('constructor', () => {
    it('should create resource with name', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
      });

      expect(resource.name).toBe('test-resource');
    });

    it('should set location from props', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
        location: 'westus2',
      });

      expect(resource.location).toBe('westus2');
    });

    it('should have undefined location when not provided', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
      });

      expect(resource.location).toBeUndefined();
    });

    it('should set tags from props', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
        tags: {
          Owner: 'Team A',
          Environment: 'Test',
        },
      });

      expect(resource.tags).toEqual({
        Owner: 'Team A',
        Environment: 'Test',
      });
    });

    it('should have undefined tags when not provided', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
      });

      expect(resource.tags).toBeUndefined();
    });

    it('should work without props', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
      });

      expect(resource).toBeDefined();
      expect(resource.name).toBe('test-resource');
    });
  });

  describe('Abstract properties', () => {
    it('should have resourceType defined by subclass', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
      });

      expect(resource.resourceType).toBe('Microsoft.Test/testResources');
    });

    it('should have resourceId defined by subclass', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
      });

      expect(resource.resourceId).toBeDefined();
      expect(resource.resourceId).toContain('Microsoft.Test/testResources');
      expect(resource.resourceId).toContain('test-resource');
    });

    it('should have name defined by subclass', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'my-test-resource',
      });

      expect(resource.name).toBe('my-test-resource');
    });
  });

  describe('Construct tree integration', () => {
    it('should be child of parent construct', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
      });

      expect(resource.node.scope).toBe(resourceGroupStack);
      expect(resourceGroupStack.node.children).toContainEqual(resource);
    });

    it('should work with different parent scopes', () => {
      const resource1 = new TestResource(resourceGroupStack, 'Resource1', {
        name: 'test-resource-1',
      });

      const resource2 = new TestResource(subscriptionStack, 'Resource2', {
        name: 'test-resource-2',
      });

      expect(resource1.node.scope).toBe(resourceGroupStack);
      expect(resource2.node.scope).toBe(subscriptionStack);
    });

    it('should have unique IDs within scope', () => {
      const resource1 = new TestResource(resourceGroupStack, 'Resource1', {
        name: 'test-1',
      });

      const resource2 = new TestResource(resourceGroupStack, 'Resource2', {
        name: 'test-2',
      });

      expect(resource1.node.id).toBe('Resource1');
      expect(resource2.node.id).toBe('Resource2');
      expect(resource1.node.id).not.toBe(resource2.node.id);
    });
  });

  describe('Multiple resource types', () => {
    // Create different resource types to test polymorphism
    class StorageAccountResource extends Resource {
      readonly resourceType = 'Microsoft.Storage/storageAccounts';
      readonly resourceId: string;
      readonly name: string;

      constructor(scope: Construct, id: string, props: ResourceProps & { accountName: string }) {
        super(scope, id, props);
        this.name = props.accountName;
        this.resourceId = `/subscriptions/test/resourceGroups/test-rg/providers/${this.resourceType}/${this.name}`;
      }
    }

    class KeyVaultResource extends Resource {
      readonly resourceType = 'Microsoft.KeyVault/vaults';
      readonly resourceId: string;
      readonly name: string;

      constructor(scope: Construct, id: string, props: ResourceProps & { vaultName: string }) {
        super(scope, id, props);
        this.name = props.vaultName;
        this.resourceId = `/subscriptions/test/resourceGroups/test-rg/providers/${this.resourceType}/${this.name}`;
      }
    }

    it('should support different resource types', () => {
      const storage = new StorageAccountResource(resourceGroupStack, 'Storage', {
        accountName: 'mystorageaccount',
        location: 'eastus',
      });

      const keyvault = new KeyVaultResource(resourceGroupStack, 'KeyVault', {
        vaultName: 'my-keyvault',
        location: 'eastus',
      });

      expect(storage.resourceType).toBe('Microsoft.Storage/storageAccounts');
      expect(keyvault.resourceType).toBe('Microsoft.KeyVault/vaults');
      expect(storage.resourceType).not.toBe(keyvault.resourceType);
    });

    it('should handle multiple resources of same type', () => {
      const storage1 = new StorageAccountResource(resourceGroupStack, 'Storage1', {
        accountName: 'storage1',
        location: 'eastus',
      });

      const storage2 = new StorageAccountResource(resourceGroupStack, 'Storage2', {
        accountName: 'storage2',
        location: 'eastus',
      });

      expect(storage1.resourceType).toBe(storage2.resourceType);
      expect(storage1.name).not.toBe(storage2.name);
      expect(storage1.node.id).not.toBe(storage2.node.id);
    });
  });

  describe('Resource properties', () => {
    it('should preserve all common properties', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
        location: 'eastus',
        tags: {
          Environment: 'Test',
          Owner: 'Platform',
        },
      });

      expect(resource.location).toBe('eastus');
      expect(resource.tags).toEqual({
        Environment: 'Test',
        Owner: 'Platform',
      });
      expect(resource.name).toBe('test-resource');
      expect(resource.resourceType).toBeDefined();
      expect(resource.resourceId).toBeDefined();
    });

    it('should handle empty tags object', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
        tags: {},
      });

      expect(resource.tags).toEqual({});
    });

    it('should handle complex tag values', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
        tags: {
          'CostCenter': '12345',
          'billing:department': 'engineering',
          'created-by': 'automation',
        },
      });

      expect(resource.tags).toBeDefined();
      expect(resource.tags!['CostCenter']).toBe('12345');
      expect(resource.tags!['billing:department']).toBe('engineering');
      expect(resource.tags!['created-by']).toBe('automation');
    });
  });

  describe('Integration with stack hierarchy', () => {
    it('should inherit context from parent stack', () => {
      const resource = new TestResource(resourceGroupStack, 'MyResource', {
        name: 'test-resource',
      });

      // Resource is in ResourceGroupStack, which is in SubscriptionStack, which is in App
      expect(resource.node.scope).toBe(resourceGroupStack);
      expect(resourceGroupStack.node.scope).toBe(subscriptionStack);
      expect(subscriptionStack.node.scope).toBe(app);
    });

    it('should support resource naming from stack context', () => {
      const resourceName = resourceGroupStack.generateResourceName('storage');

      const resource = new TestResource(resourceGroupStack, 'Storage', {
        name: resourceName,
        location: resourceGroupStack.location,
        tags: resourceGroupStack.tags,
      });

      expect(resource.name).toBe(resourceName);
      expect(resource.location).toBe(resourceGroupStack.location);
    });
  });
});
