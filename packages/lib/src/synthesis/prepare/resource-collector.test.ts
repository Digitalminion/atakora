import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceCollector, DeploymentScope } from './resource-collector';
import { App } from '../../core/app';
import { Construct } from '../../core/construct';
import { Resource, type ResourceProps } from '../../core/resource';
import { TreeTraverser } from './tree-traverser';

// Test resource implementation
class TestResource extends Resource {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly name: string;

  constructor(
    scope: Construct,
    id: string,
    props: ResourceProps & { resourceType: string; name: string }
  ) {
    super(scope, id, props);
    this.resourceType = props.resourceType;
    this.name = props.name;
    this.resourceId = `/test/${this.resourceType}/${this.name}`;
  }
}

describe('synthesis/prepare/ResourceCollector', () => {
  let app: App;
  let collector: ResourceCollector;
  let traverser: TreeTraverser;

  beforeEach(() => {
    app = new App();
    collector = new ResourceCollector();
    traverser = new TreeTraverser();
  });

  describe('collect()', () => {
    it('should collect resources from single stack', () => {
      const stack = new Construct(app, 'TestStack');
      stack.node.addMetadata('azure:arm:stack', {});
      Object.defineProperty(stack.constructor, 'name', { value: 'ResourceGroupStack' });

      const resource1 = new TestResource(stack, 'Resource1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });
      const resource2 = new TestResource(stack, 'Resource2', {
        resourceType: 'Microsoft.Network/virtualNetworks',
        name: 'vnet1',
      });

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      expect(stackMap.size).toBe(1);
      const stackInfo = stackMap.get(stack.node.path)!;
      expect(stackInfo.name).toBe('TestStack');
      expect(stackInfo.resources).toHaveLength(2);
      expect(stackInfo.resources).toContain(resource1);
      expect(stackInfo.resources).toContain(resource2);
    });

    it('should determine deployment scope for subscription stack', () => {
      const stack = new Construct(app, 'SubStack');
      stack.node.addMetadata('azure:arm:stack', {});
      Object.defineProperty(stack.constructor, 'name', { value: 'SubscriptionStack' });

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      const stackInfo = stackMap.get(stack.node.path)!;
      expect(stackInfo.scope).toBe(DeploymentScope.SUBSCRIPTION);
    });

    it('should determine deployment scope for resource group stack', () => {
      const stack = new Construct(app, 'RgStack');
      stack.node.addMetadata('azure:arm:stack', {});
      Object.defineProperty(stack.constructor, 'name', { value: 'ResourceGroupStack' });

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      const stackInfo = stackMap.get(stack.node.path)!;
      expect(stackInfo.scope).toBe(DeploymentScope.RESOURCE_GROUP);
    });

    it('should default to resource group scope for unknown stack types', () => {
      const stack = new Construct(app, 'CustomStack');
      stack.node.addMetadata('azure:arm:stack', {});
      Object.defineProperty(stack.constructor, 'name', { value: 'CustomStack' });

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      const stackInfo = stackMap.get(stack.node.path)!;
      expect(stackInfo.scope).toBe(DeploymentScope.RESOURCE_GROUP);
    });

    it('should collect resources from multiple stacks', () => {
      const stack1 = new Construct(app, 'Stack1');
      const stack2 = new Construct(app, 'Stack2');
      stack1.node.addMetadata('azure:arm:stack', {});
      stack2.node.addMetadata('azure:arm:stack', {});

      const resource1 = new TestResource(stack1, 'Resource1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });
      const resource2 = new TestResource(stack2, 'Resource2', {
        resourceType: 'Microsoft.Network/virtualNetworks',
        name: 'vnet1',
      });

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      expect(stackMap.size).toBe(2);
      expect(stackMap.get(stack1.node.path)!.resources).toContain(resource1);
      expect(stackMap.get(stack2.node.path)!.resources).toContain(resource2);
    });

    it('should ignore non-resource constructs', () => {
      const stack = new Construct(app, 'Stack');
      stack.node.addMetadata('azure:arm:stack', {});

      const resource = new TestResource(stack, 'Resource', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });
      const nonResource = new Construct(stack, 'NotAResource');

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      const stackInfo = stackMap.get(stack.node.path)!;
      expect(stackInfo.resources).toHaveLength(1);
      expect(stackInfo.resources).toContain(resource);
      expect(stackInfo.resources).not.toContain(nonResource);
    });

    it('should throw error for resource not in any stack', () => {
      const orphanResource = new TestResource(app, 'Orphan', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'orphan',
      });

      const traversal = traverser.traverse(app);

      expect(() => {
        collector.collect(traversal.constructs, traversal.stacks);
      }).toThrow(/Resource .* is not part of any stack/);
    });

    it('should handle nested resources correctly', () => {
      const stack = new Construct(app, 'Stack');
      stack.node.addMetadata('azure:arm:stack', {});

      const parent = new Construct(stack, 'Parent');
      const resource = new TestResource(parent, 'Resource', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      const stackInfo = stackMap.get(stack.node.path)!;
      expect(stackInfo.resources).toContain(resource);
    });

    it('should handle empty stacks', () => {
      const stack = new Construct(app, 'EmptyStack');
      stack.node.addMetadata('azure:arm:stack', {});

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      const stackInfo = stackMap.get(stack.node.path)!;
      expect(stackInfo.resources).toHaveLength(0);
    });
  });

  describe('validateResources()', () => {
    it('should allow resource group in subscription stack', () => {
      const stack = new Construct(app, 'SubStack');
      stack.node.addMetadata('azure:arm:stack', {});
      Object.defineProperty(stack.constructor, 'name', { value: 'SubscriptionStack' });

      const resource = new TestResource(stack, 'ResourceGroup', {
        resourceType: 'Microsoft.Resources/resourceGroups',
        name: 'rg1',
      });

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      expect(() => {
        collector.validateResources(stackMap);
      }).not.toThrow();
    });

    it('should throw error for subscription-scoped resource in resource group stack', () => {
      const stack = new Construct(app, 'RgStack');
      stack.node.addMetadata('azure:arm:stack', {});
      Object.defineProperty(stack.constructor, 'name', { value: 'ResourceGroupStack' });

      const resource = new TestResource(stack, 'ResourceGroup', {
        resourceType: 'Microsoft.Resources/resourceGroups',
        name: 'rg1',
      });

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      expect(() => {
        collector.validateResources(stackMap);
      }).toThrow(/Subscription-scoped resource .* cannot be deployed in ResourceGroupStack/);
    });

    it('should allow regular resources in resource group stack', () => {
      const stack = new Construct(app, 'RgStack');
      stack.node.addMetadata('azure:arm:stack', {});
      Object.defineProperty(stack.constructor, 'name', { value: 'ResourceGroupStack' });

      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      expect(() => {
        collector.validateResources(stackMap);
      }).not.toThrow();
    });

    it('should detect policy definitions as subscription-scoped', () => {
      const stack = new Construct(app, 'RgStack');
      stack.node.addMetadata('azure:arm:stack', {});
      Object.defineProperty(stack.constructor, 'name', { value: 'ResourceGroupStack' });

      const resource = new TestResource(stack, 'Policy', {
        resourceType: 'Microsoft.Authorization/policyDefinitions',
        name: 'policy1',
      });

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      expect(() => {
        collector.validateResources(stackMap);
      }).toThrow(/Subscription-scoped resource/);
    });

    it('should validate multiple resources correctly', () => {
      const stack = new Construct(app, 'RgStack');
      stack.node.addMetadata('azure:arm:stack', {});
      Object.defineProperty(stack.constructor, 'name', { value: 'ResourceGroupStack' });

      new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });
      new TestResource(stack, 'VNet', {
        resourceType: 'Microsoft.Network/virtualNetworks',
        name: 'vnet1',
      });

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      expect(() => {
        collector.validateResources(stackMap);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle stack with no resources', () => {
      const stack = new Construct(app, 'EmptyStack');
      stack.node.addMetadata('azure:arm:stack', {});

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      expect(stackMap.size).toBe(1);
      expect(stackMap.get(stack.node.path)!.resources).toHaveLength(0);
    });

    it('should handle app with no stacks', () => {
      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      expect(stackMap.size).toBe(0);
    });

    it('should handle many resources in single stack', () => {
      const stack = new Construct(app, 'Stack');
      stack.node.addMetadata('azure:arm:stack', {});

      const resources = [];
      for (let i = 0; i < 50; i++) {
        resources.push(
          new TestResource(stack, `Resource${i}`, {
            resourceType: 'Microsoft.Storage/storageAccounts',
            name: `storage${i}`,
          })
        );
      }

      const traversal = traverser.traverse(app);
      const stackMap = collector.collect(traversal.constructs, traversal.stacks);

      const stackInfo = stackMap.get(stack.node.path)!;
      expect(stackInfo.resources).toHaveLength(50);
    });
  });
});
