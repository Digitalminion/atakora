import { describe, it, expect, beforeEach } from 'vitest';
import { App, SubscriptionStack, Subscription, Geography, Organization, Project, Environment, Instance, Construct, ResourceGroup } from '@atakora/lib';
import { VirtualNetworks } from '../index';

describe('cdk/network/VirtualNetworks', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-minion'),
      project: new Project('authr'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
      tags: {
        managed_by: 'terraform',
        project: 'authr',
      },
    });
    resourceGroup = new ResourceGroup(stack, 'NetworkRG');
  });

  describe('constructor', () => {
    it('should create virtual network with auto-generated name', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      // Should auto-generate name using stack context
      expect(vnet.virtualNetworkName).toContain('vnet-');
      expect(vnet.virtualNetworkName).toContain('dp'); // digital-minion abbreviation
      expect(vnet.virtualNetworkName).toContain('authr');
      expect(vnet.virtualNetworkName).toContain('mainvnet'); // purpose from ID
    });

    it('should use provided virtual network name when specified', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        virtualNetworkName: 'my-custom-vnet',
        addressSpace: '10.0.0.0/16',
      });

      expect(vnet.virtualNetworkName).toBe('my-custom-vnet');
    });

    it('should default location to resource group location', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      expect(vnet.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
        location: 'westus2',
      });

      expect(vnet.location).toBe('westus2');
    });

    it('should set resource group name from parent', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      expect(vnet.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should normalize string address space to array', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      expect(vnet.addressSpace).toEqual({
        addressPrefixes: ['10.0.0.0/16'],
      });
    });

    it('should accept array of address spaces', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: ['10.0.0.0/16', '10.1.0.0/16'],
      });

      expect(vnet.addressSpace).toEqual({
        addressPrefixes: ['10.0.0.0/16', '10.1.0.0/16'],
      });
    });

    it('should merge tags with parent tags', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
        tags: {
          owner: 'network-team',
        },
      });

      expect(vnet.tags).toMatchObject({
        managed_by: 'terraform', // from stack/RG
        project: 'authr', // from stack/RG
        owner: 'network-team', // from props
      });
    });

    it('should override parent tags with provided tags', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
        tags: {
          project: 'custom-project', // overrides parent tag
        },
      });

      expect(vnet.tags.project).toBe('custom-project');
    });

    it('should store DNS servers when provided', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
        dnsServers: ['10.0.0.4', '10.0.0.5'],
      });

      expect(vnet.dnsServers).toEqual(['10.0.0.4', '10.0.0.5']);
    });

    it('should default DDoS protection to false', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      expect(vnet.enableDdosProtection).toBe(false);
    });

    it('should enable DDoS protection when specified', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
        enableDdosProtection: true,
      });

      expect(vnet.enableDdosProtection).toBe(true);
    });

    it('should default VM protection to false', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      expect(vnet.enableVmProtection).toBe(false);
    });

    it('should enable VM protection when specified', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
        enableVmProtection: true,
      });

      expect(vnet.enableVmProtection).toBe(true);
    });
  });

  describe('auto-naming', () => {
    it('should generate name with lowercase purpose', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      expect(vnet.virtualNetworkName).toContain('mainvnet');
    });

    it('should handle different construct ID formats', () => {
      const testCases = [
        { id: 'MainVNet', expectedPurpose: 'mainvnet' },
        { id: 'ApplicationVNet', expectedPurpose: 'applicationvnet' },
        { id: 'main-vnet', expectedPurpose: 'main-vnet' },
      ];

      testCases.forEach(({ id, expectedPurpose }) => {
        const vnet = new VirtualNetworks(resourceGroup, id, {
          addressSpace: '10.0.0.0/16',
        });
        expect(vnet.virtualNetworkName).toContain(expectedPurpose);
      });
    });

    it('should generate different names for different construct IDs', () => {
      const vnet1 = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });
      const vnet2 = new VirtualNetworks(resourceGroup, 'SecondaryVNet', {
        addressSpace: '10.1.0.0/16',
      });

      expect(vnet1.virtualNetworkName).not.toBe(vnet2.virtualNetworkName);
    });
  });

  describe('parent validation', () => {
    it('should throw error if not created within a ResourceGroup', () => {
      const plainConstruct = new Construct(app, 'PlainConstruct');

      expect(() => {
        new VirtualNetworks(plainConstruct, 'MainVNet', {
          addressSpace: '10.0.0.0/16',
        });
      }).toThrow(/VirtualNetworks must be created within or under a ResourceGroup/);
    });

    it('should work when created directly within ResourceGroup', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      expect(vnet.virtualNetworkName).toBeDefined();
    });

    it('should work when created within nested construct under ResourceGroup', () => {
      const nestedConstruct = new Construct(resourceGroup, 'Nested');
      const vnet = new VirtualNetworks(nestedConstruct, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      expect(vnet.virtualNetworkName).toBeDefined();
      expect(vnet.location).toBe(resourceGroup.location);
    });
  });

  describe('tag merging', () => {
    it('should inherit all parent tags when no tags provided', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      // Should include stack tags (propagated through resource group)
      expect(vnet.tags).toMatchObject({
        managed_by: 'terraform',
        project: 'authr',
      });
    });

    it('should add new tags to parent tags', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
        tags: {
          costCenter: '1234',
          owner: 'network-team',
        },
      });

      expect(vnet.tags).toMatchObject({
        managed_by: 'terraform',
        project: 'authr',
        costCenter: '1234',
        owner: 'network-team',
      });
    });

    it('should handle empty tags object', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
        tags: {},
      });

      expect(vnet.tags).toMatchObject({
        managed_by: 'terraform',
        project: 'authr',
      });
    });
  });

  describe('IVirtualNetwork interface', () => {
    it('should implement IVirtualNetwork interface', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      // Should have required properties
      expect(vnet).toHaveProperty('virtualNetworkName');
      expect(vnet).toHaveProperty('location');
      expect(vnet).toHaveProperty('resourceGroupName');
      expect(vnet).toHaveProperty('addressSpace');
    });
  });

  describe('addSubnet() helper', () => {
    it('should throw not implemented error', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      expect(() => {
        vnet.addSubnet({
          name: 'subnet-app',
          addressPrefix: '10.0.1.0/24',
        });
      }).toThrow(/addSubnet\(\) is not yet implemented/);
    });
  });

  describe('integration tests', () => {
    it('should create multiple virtual networks in same resource group', () => {
      const vnet1 = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });
      const vnet2 = new VirtualNetworks(resourceGroup, 'SecondaryVNet', {
        addressSpace: '10.1.0.0/16',
      });

      expect(vnet1.virtualNetworkName).not.toBe(vnet2.virtualNetworkName);
      expect(vnet1.resourceGroupName).toBe(vnet2.resourceGroupName);
    });

    it('should support different geographies', () => {
      const westStack = new SubscriptionStack(app, 'WestStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('westus2'),
        organization: Organization.fromValue('digital-minion'),
        project: new Project('authr'),
        environment: Environment.fromValue('nonprod'),
        instance: Instance.fromNumber(1),
      });

      const westRG = new ResourceGroup(westStack, 'NetworkRG');
      const vnet = new VirtualNetworks(westRG, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      expect(vnet.location).toBe('westus2');
      expect(vnet.virtualNetworkName).toContain('wus2'); // westus2 abbreviation
    });

    it('should be addable to construct tree', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      expect(vnet.node.scope).toBe(resourceGroup);
      expect(vnet.node.id).toBe('MainVNet');
    });

    it('should support nested constructs', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });
      const child = new Construct(vnet, 'ChildConstruct');

      expect(child.node.scope).toBe(vnet);
      expect(vnet.node.children).toContainEqual(child);
    });
  });

  describe('AuthR reference architecture', () => {
    it('should support AuthR VNet pattern', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
      });

      // AuthR uses single VNet with 4 subnets
      expect(vnet.addressSpace.addressPrefixes).toEqual(['10.0.0.0/16']);
      expect(vnet.location).toBe('eastus');
    });

    it('should support multiple address spaces', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: ['10.0.0.0/16', '10.1.0.0/16'],
      });

      expect(vnet.addressSpace.addressPrefixes).toHaveLength(2);
    });

    it('should support custom DNS servers', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        addressSpace: '10.0.0.0/16',
        dnsServers: ['10.0.0.4', '10.0.0.5'],
      });

      expect(vnet.dnsServers).toEqual(['10.0.0.4', '10.0.0.5']);
    });
  });

  describe('advanced scenarios', () => {
    it('should work with all properties specified', () => {
      const vnet = new VirtualNetworks(resourceGroup, 'MainVNet', {
        virtualNetworkName: 'vnet-explicit',
        location: 'westus2',
        addressSpace: ['10.0.0.0/16', '10.1.0.0/16'],
        dnsServers: ['10.0.0.4', '10.0.0.5'],
        enableDdosProtection: true,
        enableVmProtection: true,
        tags: {
          costCenter: '1234',
          environment: 'production',
        },
      });

      expect(vnet.virtualNetworkName).toBe('vnet-explicit');
      expect(vnet.location).toBe('westus2');
      expect(vnet.addressSpace.addressPrefixes).toHaveLength(2);
      expect(vnet.dnsServers).toHaveLength(2);
      expect(vnet.enableDdosProtection).toBe(true);
      expect(vnet.enableVmProtection).toBe(true);
      expect(vnet.tags).toMatchObject({
        costCenter: '1234',
        environment: 'production',
      });
    });
  });
});
