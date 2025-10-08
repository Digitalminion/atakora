import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyResolver } from './dependency-resolver';
import { Resource, type ResourceProps } from '../../core/resource';
import { App } from '../../core/app';
import { Construct } from '../../core/construct';
import { ArmResource } from '../types';

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

describe('synthesis/transform/DependencyResolver', () => {
  let resolver: DependencyResolver;
  let app: App;
  let stack: Construct;

  beforeEach(() => {
    resolver = new DependencyResolver();
    app = new App();
    stack = new Construct(app, 'TestStack');
  });

  describe('resolve()', () => {
    it('should resolve no dependencies for single resource', () => {
      const resource = new TestResource(stack, 'Storage', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
        },
      ];

      const resolved = resolver.resolve(armResources, [resource]);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].dependsOn).toBeUndefined();
    });

    it('should detect dependency from property reference', () => {
      const vnet = new TestResource(stack, 'VNet', {
        resourceType: 'Microsoft.Network/virtualNetworks',
        name: 'vnet1',
      });

      const subnet = new TestResource(stack, 'Subnet', {
        resourceType: 'Microsoft.Network/virtualNetworks/subnets',
        name: 'subnet1',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Network/virtualNetworks',
          apiVersion: '2023-04-01',
          name: 'vnet1',
        },
        {
          type: 'Microsoft.Network/virtualNetworks/subnets',
          apiVersion: '2023-04-01',
          name: 'subnet1',
          properties: {
            virtualNetworkName: 'vnet1',
          },
        },
      ];

      const resolved = resolver.resolve(armResources, [vnet, subnet]);

      expect(resolved[1].dependsOn).toHaveLength(1);
      expect(resolved[1].dependsOn![0]).toBe(
        "[resourceId('Microsoft.Network/virtualNetworks', 'vnet1')]"
      );
    });

    it('should auto-detect VM dependency on subnet', () => {
      const subnet = new TestResource(stack, 'Subnet', {
        resourceType: 'Microsoft.Network/virtualNetworks/subnets',
        name: 'subnet1',
      });

      const vm = new TestResource(stack, 'VM', {
        resourceType: 'Microsoft.Compute/virtualMachines',
        name: 'vm1',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Network/virtualNetworks/subnets',
          apiVersion: '2023-04-01',
          name: 'subnet1',
        },
        {
          type: 'Microsoft.Compute/virtualMachines',
          apiVersion: '2023-03-01',
          name: 'vm1',
        },
      ];

      const resolved = resolver.resolve(armResources, [subnet, vm]);

      expect(resolved[1].dependsOn).toHaveLength(1);
      expect(resolved[1].dependsOn![0]).toContain('subnets');
    });

    it('should auto-detect VM dependency on network interface', () => {
      const nic = new TestResource(stack, 'NIC', {
        resourceType: 'Microsoft.Network/networkInterfaces',
        name: 'nic1',
      });

      const vm = new TestResource(stack, 'VM', {
        resourceType: 'Microsoft.Compute/virtualMachines',
        name: 'vm1',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Network/networkInterfaces',
          apiVersion: '2023-04-01',
          name: 'nic1',
        },
        {
          type: 'Microsoft.Compute/virtualMachines',
          apiVersion: '2023-03-01',
          name: 'vm1',
        },
      ];

      const resolved = resolver.resolve(armResources, [nic, vm]);

      expect(resolved[1].dependsOn).toHaveLength(1);
      expect(resolved[1].dependsOn![0]).toContain('networkInterfaces');
    });

    it('should detect explicit dependencies from construct node', () => {
      const resource1 = new TestResource(stack, 'Resource1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const resource2 = new TestResource(stack, 'Resource2', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage2',
      });

      resource2.node.addDependency(resource1);

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage2',
        },
      ];

      const resolved = resolver.resolve(armResources, [resource1, resource2]);

      expect(resolved[1].dependsOn).toHaveLength(1);
    });

    it('should detect existing dependsOn in ARM resource', () => {
      const resource1 = new TestResource(stack, 'Resource1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const resource2 = new TestResource(stack, 'Resource2', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage2',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage2',
          dependsOn: ['storage1'],
        },
      ];

      const resolved = resolver.resolve(armResources, [resource1, resource2]);

      expect(resolved[1].dependsOn).toHaveLength(1);
    });

    it('should throw error on circular dependencies', () => {
      const resource1 = new TestResource(stack, 'Resource1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const resource2 = new TestResource(stack, 'Resource2', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage2',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
          properties: {
            ref: 'storage2', // depends on storage2
          },
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage2',
          properties: {
            ref: 'storage1', // depends on storage1
          },
        },
      ];

      expect(() => {
        resolver.resolve(armResources, [resource1, resource2]);
      }).toThrow(/Circular dependency detected/);
    });

    it('should handle multiple dependencies', () => {
      const resource1 = new TestResource(stack, 'Resource1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const resource2 = new TestResource(stack, 'Resource2', {
        resourceType: 'Microsoft.Network/virtualNetworks',
        name: 'vnet1',
      });

      const resource3 = new TestResource(stack, 'Resource3', {
        resourceType: 'Microsoft.Compute/virtualMachines',
        name: 'vm1',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
        },
        {
          type: 'Microsoft.Network/virtualNetworks',
          apiVersion: '2023-04-01',
          name: 'vnet1',
        },
        {
          type: 'Microsoft.Compute/virtualMachines',
          apiVersion: '2023-03-01',
          name: 'vm1',
          properties: {
            storageAccount: 'storage1',
            virtualNetwork: 'vnet1',
          },
        },
      ];

      const resolved = resolver.resolve(armResources, [resource1, resource2, resource3]);

      expect(resolved[2].dependsOn).toHaveLength(2);
    });

    it('should not create self-dependencies', () => {
      const resource = new TestResource(stack, 'Resource', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
          properties: {
            selfRef: 'storage1', // self-reference
          },
        },
      ];

      const resolved = resolver.resolve(armResources, [resource]);

      expect(resolved[0].dependsOn).toBeUndefined();
    });

    it('should combine detected and explicit dependencies', () => {
      const resource1 = new TestResource(stack, 'Resource1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const resource2 = new TestResource(stack, 'Resource2', {
        resourceType: 'Microsoft.Network/virtualNetworks',
        name: 'vnet1',
      });

      const resource3 = new TestResource(stack, 'Resource3', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage2',
      });

      resource3.node.addDependency(resource1);

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
        },
        {
          type: 'Microsoft.Network/virtualNetworks',
          apiVersion: '2023-04-01',
          name: 'vnet1',
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage2',
          properties: {
            virtualNetwork: 'vnet1', // detected dependency
          },
        },
      ];

      const resolved = resolver.resolve(armResources, [resource1, resource2, resource3]);

      expect(resolved[2].dependsOn).toHaveLength(2);
    });
  });

  describe('topologicalSort()', () => {
    it('should sort resources by dependencies', () => {
      const resource1 = new TestResource(stack, 'Resource1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const resource2 = new TestResource(stack, 'Resource2', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage2',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage2',
          properties: {
            dependsOn: 'storage1',
          },
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
        },
      ];

      resolver.resolve(armResources, [resource2, resource1]);
      const sorted = resolver.topologicalSort(armResources);

      // storage1 should come before storage2
      expect(sorted[0].name).toBe('storage1');
      expect(sorted[1].name).toBe('storage2');
    });

    it('should handle complex dependency chains', () => {
      const r1 = new TestResource(stack, 'R1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'r1',
      });

      const r2 = new TestResource(stack, 'R2', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'r2',
      });

      const r3 = new TestResource(stack, 'R3', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'r3',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'r3',
          properties: { ref: 'r2' }, // r3 depends on r2
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'r2',
          properties: { ref: 'r1' }, // r2 depends on r1
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'r1',
        },
      ];

      resolver.resolve(armResources, [r3, r2, r1]);
      const sorted = resolver.topologicalSort(armResources);

      // Should be r1, r2, r3
      expect(sorted[0].name).toBe('r1');
      expect(sorted[1].name).toBe('r2');
      expect(sorted[2].name).toBe('r3');
    });

    it('should handle resources with no dependencies', () => {
      const resource1 = new TestResource(stack, 'Resource1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const resource2 = new TestResource(stack, 'Resource2', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage2',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage2',
        },
      ];

      resolver.resolve(armResources, [resource1, resource2]);
      const sorted = resolver.topologicalSort(armResources);

      expect(sorted).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty resource list', () => {
      const resolved = resolver.resolve([], []);

      expect(resolved).toHaveLength(0);
    });

    it('should handle resource without dependencies gracefully', () => {
      const resource1 = new TestResource(stack, 'Resource1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const resource2 = new TestResource(stack, 'Resource2', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage2',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage2',
        },
      ];

      const resolved = resolver.resolve(armResources, [resource1, resource2]);

      expect(resolved).toHaveLength(2);
      expect(resolved[0].dependsOn).toBeUndefined();
      expect(resolved[1].dependsOn).toBeUndefined();
    });

    it('should handle three-way circular dependency', () => {
      const r1 = new TestResource(stack, 'R1', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'r1',
      });

      const r2 = new TestResource(stack, 'R2', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'r2',
      });

      const r3 = new TestResource(stack, 'R3', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'r3',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'r1',
          properties: { ref: 'r2' }, // r1 -> r2
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'r2',
          properties: { ref: 'r3' }, // r2 -> r3
        },
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'r3',
          properties: { ref: 'r1' }, // r3 -> r1 (cycle!)
        },
      ];

      expect(() => {
        resolver.resolve(armResources, [r1, r2, r3]);
      }).toThrow(/Circular dependency detected/);
    });

    it('should not add dependencies if none detected', () => {
      const resource = new TestResource(stack, 'Resource', {
        resourceType: 'Microsoft.Storage/storageAccounts',
        name: 'storage1',
      });

      const armResources: ArmResource[] = [
        {
          type: 'Microsoft.Storage/storageAccounts',
          apiVersion: '2023-01-01',
          name: 'storage1',
          properties: {
            someProperty: 'value',
          },
        },
      ];

      const resolved = resolver.resolve(armResources, [resource]);

      expect(resolved[0].dependsOn).toBeUndefined();
    });
  });
});
