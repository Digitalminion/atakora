import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroup } from '../resource-group/resource-group';
import { VirtualNetwork } from '../virtual-network/virtual-network';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { Subnet } from './subnet';
import { PrivateEndpointNetworkPolicies } from './types';

describe('resources/subnet/Subnet', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;
  let vnet: VirtualNetwork;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-products'),
      project: new Project('colorai'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
    });
    resourceGroup = new ResourceGroup(stack, 'NetworkRG');
    vnet = new VirtualNetwork(resourceGroup, 'MainVNet', {
      addressSpace: '10.0.0.0/16',
    });
  });

  describe('constructor', () => {
    it('should create subnet with auto-generated name', () => {
      const subnet = new Subnet(vnet, 'WebSubnet', {
        addressPrefix: '10.0.1.0/24',
      });

      // Should auto-generate name using stack context
      expect(subnet.subnetName).toContain('snet-');
      expect(subnet.subnetName).toContain('dp'); // digital-products abbreviation
      expect(subnet.subnetName).toContain('colorai');
      expect(subnet.subnetName).toContain('websubnet'); // purpose from ID
    });

    it('should use provided subnet name when specified', () => {
      const subnet = new Subnet(vnet, 'WebSubnet', {
        name: 'my-custom-subnet',
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.subnetName).toBe('my-custom-subnet');
    });

    it('should store address prefix', () => {
      const subnet = new Subnet(vnet, 'WebSubnet', {
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.addressPrefix).toBe('10.0.1.0/24');
    });

    it('should set virtual network name from parent', () => {
      const subnet = new Subnet(vnet, 'WebSubnet', {
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.virtualNetworkName).toBe(vnet.virtualNetworkName);
    });

    it('should generate subnet ID', () => {
      const subnet = new Subnet(vnet, 'WebSubnet', {
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.subnetId).toContain('/virtualNetworks/');
      expect(subnet.subnetId).toContain('/subnets/');
    });

    it('should create subnet with network security group reference', () => {
      const subnet = new Subnet(vnet, 'WebSubnet', {
        addressPrefix: '10.0.1.0/24',
        networkSecurityGroup: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/networkSecurityGroups/nsg-web',
        },
      });

      expect(subnet.subnetName).toContain('snet-');
    });

    it('should create subnet with service endpoints', () => {
      const subnet = new Subnet(vnet, 'DataSubnet', {
        addressPrefix: '10.0.2.0/24',
        serviceEndpoints: [
          { service: 'Microsoft.Storage' },
          { service: 'Microsoft.Sql', locations: ['eastus'] },
        ],
      });

      expect(subnet.addressPrefix).toBe('10.0.2.0/24');
    });

    it('should create subnet with delegations', () => {
      const subnet = new Subnet(vnet, 'AppSubnet', {
        addressPrefix: '10.0.3.0/24',
        delegations: [
          {
            name: 'delegation1',
            serviceName: 'Microsoft.Web/serverFarms',
          },
        ],
      });

      expect(subnet.addressPrefix).toBe('10.0.3.0/24');
    });

    it('should create subnet with private endpoint network policies', () => {
      const subnet = new Subnet(vnet, 'PrivateSubnet', {
        addressPrefix: '10.0.4.0/24',
        privateEndpointNetworkPolicies: PrivateEndpointNetworkPolicies.ENABLED,
      });

      expect(subnet.addressPrefix).toBe('10.0.4.0/24');
    });

    it('should create subnet with default outbound access disabled', () => {
      const subnet = new Subnet(vnet, 'SecureSubnet', {
        addressPrefix: '10.0.5.0/24',
        defaultOutboundAccess: false,
      });

      expect(subnet.addressPrefix).toBe('10.0.5.0/24');
    });
  });

  describe('auto-naming with different IDs', () => {
    it('should convert PascalCase ID to lowercase purpose', () => {
      const subnet = new Subnet(vnet, 'WebTierSubnet', {
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.subnetName).toContain('webtiersubnet');
    });

    it('should convert camelCase ID to lowercase purpose', () => {
      const subnet = new Subnet(vnet, 'appTierSubnet', {
        addressPrefix: '10.0.2.0/24',
      });

      expect(subnet.subnetName).toContain('apptiersubnet');
    });

    it('should handle simple lowercase IDs', () => {
      const subnet = new Subnet(vnet, 'data', {
        addressPrefix: '10.0.3.0/24',
      });

      expect(subnet.subnetName).toContain('data');
    });

    it('should handle hyphenated IDs', () => {
      const subnet = new Subnet(vnet, 'app-tier', {
        addressPrefix: '10.0.4.0/24',
      });

      expect(subnet.subnetName).toContain('app-tier');
    });
  });

  describe('parent validation', () => {
    it('should throw error when not created within VirtualNetwork', () => {
      expect(() => {
        new Subnet(stack, 'Subnet', {
          addressPrefix: '10.0.1.0/24',
        });
      }).toThrow(/Subnet must be created within or under a VirtualNetwork/);
    });

    it('should throw error when parent is ResourceGroup without VirtualNetwork', () => {
      expect(() => {
        new Subnet(resourceGroup, 'Subnet', {
          addressPrefix: '10.0.1.0/24',
        });
      }).toThrow(/Subnet must be created within or under a VirtualNetwork/);
    });

    it('should work when created directly within VirtualNetwork', () => {
      const subnet = new Subnet(vnet, 'Subnet', {
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.virtualNetworkName).toBe(vnet.virtualNetworkName);
    });
  });

  describe('integration with underlying L1', () => {
    it('should pass all properties to underlying ArmSubnet', () => {
      const subnet = new Subnet(vnet, 'FullSubnet', {
        name: 'snet-custom',
        addressPrefix: '10.0.1.0/24',
        networkSecurityGroup: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/networkSecurityGroups/nsg',
        },
        serviceEndpoints: [{ service: 'Microsoft.Storage' }],
        delegations: [{ name: 'del1', serviceName: 'Microsoft.Web/serverFarms' }],
        privateEndpointNetworkPolicies: PrivateEndpointNetworkPolicies.ENABLED,
        defaultOutboundAccess: false,
      });

      expect(subnet.subnetName).toBe('snet-custom');
      expect(subnet.addressPrefix).toBe('10.0.1.0/24');
    });

    it('should create L1 construct with correct virtual network name', () => {
      const subnet = new Subnet(vnet, 'Subnet', {
        addressPrefix: '10.0.1.0/24',
      });

      // The underlying L1 should use the parent VNet's name
      expect(subnet.virtualNetworkName).toBe(vnet.virtualNetworkName);
    });

    it('should generate subnet ID through L1 construct', () => {
      const subnet = new Subnet(vnet, 'Subnet', {
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.subnetId).toBeDefined();
      expect(subnet.subnetId).toContain(vnet.virtualNetworkName);
      expect(subnet.subnetId).toContain(subnet.subnetName);
    });
  });

  describe('multiple subnets', () => {
    it('should allow creating multiple subnets with different IDs', () => {
      const webSubnet = new Subnet(vnet, 'WebSubnet', {
        addressPrefix: '10.0.1.0/24',
      });

      const appSubnet = new Subnet(vnet, 'AppSubnet', {
        addressPrefix: '10.0.2.0/24',
      });

      const dataSubnet = new Subnet(vnet, 'DataSubnet', {
        addressPrefix: '10.0.3.0/24',
      });

      // All should have unique auto-generated names
      expect(webSubnet.subnetName).not.toBe(appSubnet.subnetName);
      expect(webSubnet.subnetName).not.toBe(dataSubnet.subnetName);
      expect(appSubnet.subnetName).not.toBe(dataSubnet.subnetName);

      // All should reference the same VNet
      expect(webSubnet.virtualNetworkName).toBe(vnet.virtualNetworkName);
      expect(appSubnet.virtualNetworkName).toBe(vnet.virtualNetworkName);
      expect(dataSubnet.virtualNetworkName).toBe(vnet.virtualNetworkName);
    });

    it('should allow creating multiple subnets with explicit names', () => {
      const webSubnet = new Subnet(vnet, 'Web', {
        name: 'snet-web-01',
        addressPrefix: '10.0.1.0/24',
      });

      const appSubnet = new Subnet(vnet, 'App', {
        name: 'snet-app-01',
        addressPrefix: '10.0.2.0/24',
      });

      expect(webSubnet.subnetName).toBe('snet-web-01');
      expect(appSubnet.subnetName).toBe('snet-app-01');
    });
  });
});
