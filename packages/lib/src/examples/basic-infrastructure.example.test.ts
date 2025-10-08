import { describe, it, expect } from 'vitest';
import {
  createBasicInfrastructure,
  createColorAIInfrastructure,
  createMultiRegionInfrastructure,
} from './basic-infrastructure.example';

describe('examples/basic-infrastructure', () => {
  describe('createBasicInfrastructure()', () => {
    it('should create app with subscription stack', () => {
      const app = createBasicInfrastructure();

      expect(app).toBeDefined();
      expect(app.allStacks).toHaveLength(1);
    });

    it('should create resource groups with auto-generated names', () => {
      const app = createBasicInfrastructure();
      const stack = app.allStacks[0];

      // Find resource groups in construct tree
      const resourceGroups = stack.node.children.filter(
        (child: any) => child.constructor.name === 'ResourceGroup'
      );

      expect(resourceGroups).toHaveLength(2);
    });

    it('should create virtual network with correct address space', () => {
      const app = createBasicInfrastructure();

      // Navigate construct tree to find VNet
      const stack = app.allStacks[0];
      const networkRG = stack.node.children.find((child: any) => child.node.id === 'NetworkRG');

      expect(networkRG).toBeDefined();

      const vnet = networkRG?.node.children.find(
        (child: any) => child.constructor.name === 'VirtualNetwork'
      ) as any;

      expect(vnet).toBeDefined();
      expect(vnet.addressSpace.addressPrefixes).toEqual(['10.0.0.0/16']);
    });

    it('should properly merge tags through hierarchy', () => {
      const app = createBasicInfrastructure();
      const stack = app.allStacks[0];

      const networkRG = stack.node.children.find(
        (child: any) => child.node.id === 'NetworkRG'
      ) as any;

      // Should have stack tags plus RG-specific tags
      expect(networkRG.tags).toMatchObject({
        managed_by: 'atakora',
        cost_center: '1234',
        department: 'engineering',
        purpose: 'networking',
      });
    });

    it('should set correct locations based on geography', () => {
      const app = createBasicInfrastructure();
      const stack = app.allStacks[0] as any;

      expect(stack.location).toBe('eastus');

      const networkRG = stack.node.children.find(
        (child: any) => child.node.id === 'NetworkRG'
      ) as any;

      expect(networkRG.location).toBe('eastus');
    });
  });

  describe('createColorAIInfrastructure()', () => {
    it('should create 5 resource groups', () => {
      const app = createColorAIInfrastructure();
      const stack = app.allStacks[0];

      const resourceGroups = stack.node.children.filter(
        (child: any) => child.constructor.name === 'ResourceGroup'
      );

      expect(resourceGroups).toHaveLength(5);
    });

    it('should create resource groups with correct purposes', () => {
      const app = createColorAIInfrastructure();
      const stack = app.allStacks[0];

      const foundationRG = stack.node.children.find(
        (child: any) => child.node.id === 'FoundationRG'
      ) as any;

      const connectivityRG = stack.node.children.find(
        (child: any) => child.node.id === 'ConnectivityRG'
      ) as any;

      expect(foundationRG.tags.purpose).toBe('foundation-resources');
      expect(connectivityRG.tags.purpose).toBe('networking');
    });

    it('should create virtual network in connectivity RG', () => {
      const app = createColorAIInfrastructure();
      const stack = app.allStacks[0];

      const connectivityRG = stack.node.children.find(
        (child: any) => child.node.id === 'ConnectivityRG'
      );

      const vnet = connectivityRG?.node.children.find(
        (child: any) => child.constructor.name === 'VirtualNetwork'
      ) as any;

      expect(vnet).toBeDefined();
      expect(vnet.addressSpace.addressPrefixes).toEqual(['10.0.0.0/16']);
      expect(vnet.tags.tier).toBe('connectivity');
    });

    it('should use correct naming convention', () => {
      const app = createColorAIInfrastructure();
      const stack = app.allStacks[0];

      const connectivityRG = stack.node.children.find(
        (child: any) => child.node.id === 'ConnectivityRG'
      ) as any;

      // Should follow pattern: rg-{org}-{project}-{purpose}-{env}-{geo}-{instance}
      expect(connectivityRG.resourceGroupName).toContain('rg-');
      expect(connectivityRG.resourceGroupName).toContain('dp'); // digital-products
      expect(connectivityRG.resourceGroupName).toContain('colorai');
      expect(connectivityRG.resourceGroupName).toContain('nonprod');
      expect(connectivityRG.resourceGroupName).toContain('eus'); // eastus
      expect(connectivityRG.resourceGroupName).toContain('01');
    });
  });

  describe('createMultiRegionInfrastructure()', () => {
    it('should create 2 subscription stacks', () => {
      const app = createMultiRegionInfrastructure();

      expect(app.allStacks).toHaveLength(2);
    });

    it('should create stacks in different regions', () => {
      const app = createMultiRegionInfrastructure();
      const [eastStack, westStack] = app.allStacks as any[];

      expect(eastStack.location).toBe('eastus');
      expect(westStack.location).toBe('westus2');
    });

    it('should create resources in both regions', () => {
      const app = createMultiRegionInfrastructure();
      const [eastStack, westStack] = app.allStacks as any[];

      const eastRGs = eastStack.node.children.filter(
        (child: any) => child.constructor.name === 'ResourceGroup'
      );

      const westRGs = westStack.node.children.filter(
        (child: any) => child.constructor.name === 'ResourceGroup'
      );

      expect(eastRGs).toHaveLength(1);
      expect(westRGs).toHaveLength(1);
    });

    it('should use different address spaces for different regions', () => {
      const app = createMultiRegionInfrastructure();
      const [eastStack, westStack] = app.allStacks as any[];

      const eastRG = eastStack.node.children[0];
      const westRG = westStack.node.children[0];

      const eastVNet = eastRG.node.children.find(
        (child: any) => child.constructor.name === 'VirtualNetwork'
      ) as any;

      const westVNet = westRG.node.children.find(
        (child: any) => child.constructor.name === 'VirtualNetwork'
      ) as any;

      expect(eastVNet.addressSpace.addressPrefixes).toEqual(['10.0.0.0/16']);
      expect(westVNet.addressSpace.addressPrefixes).toEqual(['10.1.0.0/16']);
    });

    it('should use different instance numbers for different regions', () => {
      const app = createMultiRegionInfrastructure();
      const [eastStack, westStack] = app.allStacks as any[];

      const eastRG = eastStack.node.children[0] as any;
      const westRG = westStack.node.children[0] as any;

      // Instance 1 for eastus
      expect(eastRG.resourceGroupName).toContain('01');

      // Instance 2 for westus2
      expect(westRG.resourceGroupName).toContain('02');
    });
  });

  describe('integration validation', () => {
    it('should support construct tree navigation', () => {
      const app = createBasicInfrastructure();
      const stack = app.allStacks[0];

      // Navigate to VNet through the tree
      const networkRG = stack.node.children.find((child: any) => child.node.id === 'NetworkRG');

      const vnet = networkRG?.node.children.find(
        (child: any) => child.constructor.name === 'VirtualNetwork'
      );

      // Verify parent-child relationships
      expect(vnet?.node.scope).toBe(networkRG);
      expect(networkRG?.node.scope).toBe(stack);
      expect(stack.node.scope).toBe(app);
    });

    it('should maintain consistent naming across examples', () => {
      const app1 = createBasicInfrastructure();
      const app2 = createBasicInfrastructure();

      const stack1 = app1.allStacks[0];
      const stack2 = app2.allStacks[0];

      const rg1 = stack1.node.children.find((child: any) => child.node.id === 'NetworkRG') as any;

      const rg2 = stack2.node.children.find((child: any) => child.node.id === 'NetworkRG') as any;

      // Same inputs should produce same names
      expect(rg1.resourceGroupName).toBe(rg2.resourceGroupName);
    });

    it('should support all implemented resource types', () => {
      const app = createBasicInfrastructure();
      const stack = app.allStacks[0];

      // Should have at least ResourceGroup and VirtualNetwork constructs
      const hasResourceGroup = stack.node.children.some(
        (child: any) => child.constructor.name === 'ResourceGroup'
      );

      const networkRG = stack.node.children.find((child: any) => child.node.id === 'NetworkRG');

      const hasVirtualNetwork = networkRG?.node.children.some(
        (child: any) => child.constructor.name === 'VirtualNetwork'
      );

      expect(hasResourceGroup).toBe(true);
      expect(hasVirtualNetwork).toBe(true);
    });
  });
});
