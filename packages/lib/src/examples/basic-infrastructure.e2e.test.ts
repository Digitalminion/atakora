import { describe, it, expect } from 'vitest';
import { createBasicInfrastructure, createColorAIInfrastructure, createMultiRegionInfrastructure } from './basic-infrastructure.example';

describe('E2E: basic-infrastructure example', () => {
  describe('createBasicInfrastructure()', () => {
    it('should create app with correct structure', () => {
      const app = createBasicInfrastructure();

      expect(app).toBeDefined();
      expect(app.allStacks).toHaveLength(1);
      expect(app.allStacks[0].node.id).toBe('Foundation');
    });

    it('should have Foundation stack with correct properties', () => {
      const app = createBasicInfrastructure();
      const foundation = app.allStacks[0];

      expect(foundation.node.id).toBe('Foundation');
      expect(foundation.node.scope).toBe(app);
    });

    it('should create ResourceGroup constructs', () => {
      const app = createBasicInfrastructure();
      const foundation = app.allStacks[0];

      const children = foundation.node.children;
      const resourceGroups = children.filter(c => c.constructor.name === 'ResourceGroup');

      expect(resourceGroups.length).toBe(2);
    });

    it('should create VirtualNetwork construct', () => {
      const app = createBasicInfrastructure();
      const foundation = app.allStacks[0];

      // Find VirtualNetwork in the construct tree
      const allChildren: any[] = [];
      function collectChildren(node: any): void {
        for (const child of node.node.children) {
          allChildren.push(child);
          collectChildren(child);
        }
      }
      collectChildren(foundation);

      const vnets = allChildren.filter(c => c.constructor.name === 'VirtualNetwork');
      expect(vnets.length).toBe(1);
    });

    it('should configure VirtualNetwork with correct address space', () => {
      const app = createBasicInfrastructure();
      const foundation = app.allStacks[0];

      const allChildren: any[] = [];
      function collectChildren(node: any): void {
        for (const child of node.node.children) {
          allChildren.push(child);
          collectChildren(child);
        }
      }
      collectChildren(foundation);

      const vnet = allChildren.find(c => c.constructor.name === 'VirtualNetwork');
      expect(vnet).toBeDefined();
      expect(vnet.addressSpace).toBeDefined();
      expect(vnet.addressSpace.addressPrefixes).toContain('10.0.0.0/16');
    });

    it('should apply correct naming convention to resources', () => {
      const app = createBasicInfrastructure();
      const foundation = app.allStacks[0];

      const children = foundation.node.children;
      const networkRG = children.find(c => c.node.id === 'NetworkRG');

      expect(networkRG).toBeDefined();
      expect((networkRG as any).resourceGroupName).toMatch(/^rg-dp-colorai-/);
      expect((networkRG as any).resourceGroupName).toContain('nonprod');
      expect((networkRG as any).resourceGroupName).toContain('eus');
    });

    it('should apply tags to resources', () => {
      const app = createBasicInfrastructure();
      const foundation = app.allStacks[0];

      const children = foundation.node.children;
      const networkRG = children.find(c => c.node.id === 'NetworkRG');

      expect(networkRG).toBeDefined();
      expect((networkRG as any).tags).toBeDefined();
      expect((networkRG as any).tags.managed_by).toBe('azure-arm-priv');
      expect((networkRG as any).tags.purpose).toBe('networking');
    });
  });

  describe('createColorAIInfrastructure()', () => {
    it('should create app with 5 resource groups', () => {
      const app = createColorAIInfrastructure();
      const foundation = app.allStacks[0];

      const children = foundation.node.children;
      const resourceGroups = children.filter(c => c.constructor.name === 'ResourceGroup');

      expect(resourceGroups.length).toBe(5);
    });

    it('should name resource groups according to purpose', () => {
      const app = createColorAIInfrastructure();
      const foundation = app.allStacks[0];

      const children = foundation.node.children;
      const foundationRG = children.find(c => c.node.id === 'FoundationRG');
      const connectivityRG = children.find(c => c.node.id === 'ConnectivityRG');

      expect(foundationRG).toBeDefined();
      expect(connectivityRG).toBeDefined();
      expect((foundationRG as any).tags.purpose).toBe('foundation-resources');
      expect((connectivityRG as any).tags.purpose).toBe('networking');
    });

    it('should create virtual network in connectivity RG', () => {
      const app = createColorAIInfrastructure();
      const foundation = app.allStacks[0];

      const allChildren: any[] = [];
      function collectChildren(node: any): void {
        for (const child of node.node.children) {
          allChildren.push(child);
          collectChildren(child);
        }
      }
      collectChildren(foundation);

      const vnet = allChildren.find(c => c.constructor.name === 'VirtualNetwork');
      expect(vnet).toBeDefined();
      expect(vnet.addressSpace.addressPrefixes).toContain('10.0.0.0/16');
    });
  });

  describe('createMultiRegionInfrastructure()', () => {
    it('should create two stacks for different regions', () => {
      const app = createMultiRegionInfrastructure();

      expect(app.allStacks).toHaveLength(2);
      expect(app.allStacks.map(s => s.node.id)).toContain('EastStack');
      expect(app.allStacks.map(s => s.node.id)).toContain('WestStack');
    });

    it('should create resources in both regions', () => {
      const app = createMultiRegionInfrastructure();

      const eastStack = app.allStacks.find(s => s.node.id === 'EastStack');
      const westStack = app.allStacks.find(s => s.node.id === 'WestStack');

      expect(eastStack).toBeDefined();
      expect(westStack).toBeDefined();

      expect(eastStack!.node.children.length).toBeGreaterThan(0);
      expect(westStack!.node.children.length).toBeGreaterThan(0);
    });

    it('should use different address spaces per region', () => {
      const app = createMultiRegionInfrastructure();

      const eastStack = app.allStacks.find(s => s.node.id === 'EastStack');
      const westStack = app.allStacks.find(s => s.node.id === 'WestStack');

      function findVNet(stack: any): any {
        const allChildren: any[] = [];
        function collectChildren(node: any): void {
          for (const child of node.node.children) {
            allChildren.push(child);
            collectChildren(child);
          }
        }
        collectChildren(stack);
        return allChildren.find(c => c.constructor.name === 'VirtualNetwork');
      }

      const eastVNet = findVNet(eastStack);
      const westVNet = findVNet(westStack);

      expect(eastVNet.addressSpace.addressPrefixes).toContain('10.0.0.0/16');
      expect(westVNet.addressSpace.addressPrefixes).toContain('10.1.0.0/16');
    });
  });
});
