import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroup } from '../resource-group/resource-group';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmVirtualNetwork } from './arm-virtual-network';
import type { ArmVirtualNetworkProps } from './types';

describe('resources/virtual-network/ArmVirtualNetwork', () => {
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
    });
    resourceGroup = new ResourceGroup(stack, 'NetworkRG');
  });

  describe('constructor', () => {
    it('should create virtual network with required properties', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
      });

      expect(vnet.virtualNetworkName).toBe('vnet-test');
      expect(vnet.name).toBe('vnet-test');
      expect(vnet.location).toBe('eastus');
      expect(vnet.resourceGroupName).toBe('rg-network');
      expect(vnet.addressSpace.addressPrefixes).toEqual(['10.0.0.0/16']);
      expect(vnet.tags).toEqual({});
    });

    it('should create virtual network with multiple address prefixes', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16', '10.1.0.0/16'],
        },
      });

      expect(vnet.addressSpace.addressPrefixes).toEqual(['10.0.0.0/16', '10.1.0.0/16']);
    });

    it('should create virtual network with tags', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        tags: {
          environment: 'nonprod',
          project: 'authr',
        },
      });

      expect(vnet.tags).toEqual({
        environment: 'nonprod',
        project: 'authr',
      });
    });

    it('should set correct resource type', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
      });

      expect(vnet.resourceType).toBe('Microsoft.Network/virtualNetworks');
    });

    it('should set correct API version', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
      });

      expect(vnet.apiVersion).toBe('2024-07-01');
    });

    it('should generate resource ID', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
      });

      expect(vnet.resourceId).toContain('/resourceGroups/rg-network');
      expect(vnet.resourceId).toContain('/virtualNetworks/vnet-test');
    });

    it('should have ResourceGroup deployment scope', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
      });

      expect(vnet.scope).toBe('resourceGroup');
    });

    it('should default DDoS protection to false', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
      });

      expect(vnet.enableDdosProtection).toBe(false);
    });

    it('should default VM protection to false', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
      });

      expect(vnet.enableVmProtection).toBe(false);
    });

    it('should enable DDoS protection when specified', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        enableDdosProtection: true,
      });

      expect(vnet.enableDdosProtection).toBe(true);
    });

    it('should store DNS servers when provided', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        dhcpOptions: {
          dnsServers: ['10.0.0.4', '10.0.0.5'],
        },
      });

      expect(vnet.dhcpOptions?.dnsServers).toEqual(['10.0.0.4', '10.0.0.5']);
    });

    it('should store inline subnets when provided', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        subnets: [
          { name: 'subnet-app', addressPrefix: '10.0.1.0/24' },
          { name: 'subnet-data', addressPrefix: '10.0.2.0/24' },
        ],
      });

      expect(vnet.subnets).toHaveLength(2);
      expect(vnet.subnets?.[0].name).toBe('subnet-app');
      expect(vnet.subnets?.[1].name).toBe('subnet-data');
    });
  });

  describe('validation', () => {
    it('should throw error for empty virtual network name', () => {
      expect(() => {
        new ArmVirtualNetwork(resourceGroup, 'VNet', {
          virtualNetworkName: '',
          location: 'eastus',
          resourceGroupName: 'rg-network',
          addressSpace: {
            addressPrefixes: ['10.0.0.0/16'],
          },
        });
      }).toThrow(/Virtual network name cannot be empty/);
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmVirtualNetwork(resourceGroup, 'VNet', {
          virtualNetworkName: 'vnet-test',
          location: '',
          resourceGroupName: 'rg-network',
          addressSpace: {
            addressPrefixes: ['10.0.0.0/16'],
          },
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error for empty resource group name', () => {
      expect(() => {
        new ArmVirtualNetwork(resourceGroup, 'VNet', {
          virtualNetworkName: 'vnet-test',
          location: 'eastus',
          resourceGroupName: '',
          addressSpace: {
            addressPrefixes: ['10.0.0.0/16'],
          },
        });
      }).toThrow(/Resource group name cannot be empty/);
    });

    it('should throw error for missing address space', () => {
      expect(() => {
        new ArmVirtualNetwork(resourceGroup, 'VNet', {
          virtualNetworkName: 'vnet-test',
          location: 'eastus',
          resourceGroupName: 'rg-network',
          addressSpace: undefined as any,
        });
      }).toThrow(/Address space must be specified/);
    });

    it('should throw error for empty address prefixes array', () => {
      expect(() => {
        new ArmVirtualNetwork(resourceGroup, 'VNet', {
          virtualNetworkName: 'vnet-test',
          location: 'eastus',
          resourceGroupName: 'rg-network',
          addressSpace: {
            addressPrefixes: [],
          },
        });
      }).toThrow(/Address space must contain at least one address prefix/);
    });

    it('should throw error for invalid CIDR notation', () => {
      expect(() => {
        new ArmVirtualNetwork(resourceGroup, 'VNet', {
          virtualNetworkName: 'vnet-test',
          location: 'eastus',
          resourceGroupName: 'rg-network',
          addressSpace: {
            addressPrefixes: ['invalid-cidr'],
          },
        });
      }).toThrow(/Invalid CIDR notation/);
    });

    it('should accept valid CIDR notations', () => {
      const validCIDRs = ['10.0.0.0/16', '192.168.0.0/24', '172.16.0.0/12', '10.1.2.0/28'];

      validCIDRs.forEach((cidr) => {
        const vnet = new ArmVirtualNetwork(resourceGroup, `VNet-${cidr}`, {
          virtualNetworkName: `vnet-${cidr.replace(/[./]/g, '-')}`,
          location: 'eastus',
          resourceGroupName: 'rg-network',
          addressSpace: {
            addressPrefixes: [cidr],
          },
        });

        expect(vnet.addressSpace.addressPrefixes).toContain(cidr);
      });
    });

    it('should throw error for empty subnet name', () => {
      expect(() => {
        new ArmVirtualNetwork(resourceGroup, 'VNet', {
          virtualNetworkName: 'vnet-test',
          location: 'eastus',
          resourceGroupName: 'rg-network',
          addressSpace: {
            addressPrefixes: ['10.0.0.0/16'],
          },
          subnets: [{ name: '', addressPrefix: '10.0.1.0/24' }],
        });
      }).toThrow(/Subnet name cannot be empty/);
    });

    it('should throw error for invalid subnet address prefix', () => {
      expect(() => {
        new ArmVirtualNetwork(resourceGroup, 'VNet', {
          virtualNetworkName: 'vnet-test',
          location: 'eastus',
          resourceGroupName: 'rg-network',
          addressSpace: {
            addressPrefixes: ['10.0.0.0/16'],
          },
          subnets: [{ name: 'subnet-app', addressPrefix: 'invalid' }],
        });
      }).toThrow(/Invalid subnet address prefix/);
    });
  });

  describe('toArmTemplate()', () => {
    it('should generate correct ARM template structure', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        tags: {
          environment: 'nonprod',
        },
      });

      const template = vnet.toArmTemplate() as any;

      expect(template.type).toBe('Microsoft.Network/virtualNetworks');
      expect(template.apiVersion).toBe('2024-07-01');
      expect(template.name).toBe('vnet-test');
      expect(template.location).toBe('eastus');
      expect(template.tags).toEqual({ environment: 'nonprod' });
      expect(template.properties.addressSpace).toEqual({
        addressPrefixes: ['10.0.0.0/16'],
      });
    });

    it('should include DNS servers in template', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        dhcpOptions: {
          dnsServers: ['10.0.0.4', '10.0.0.5'],
        },
      });

      const template = vnet.toArmTemplate() as any;

      expect(template.properties.dhcpOptions).toEqual({
        dnsServers: ['10.0.0.4', '10.0.0.5'],
      });
    });

    it('should include subnets in template', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        subnets: [{ name: 'subnet-app', addressPrefix: '10.0.1.0/24' }],
      });

      const template = vnet.toArmTemplate() as any;

      expect(template.properties.subnets).toHaveLength(1);
      expect(template.properties.subnets[0].name).toBe('subnet-app');
    });

    it('should include DDoS protection when enabled', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        enableDdosProtection: true,
      });

      const template = vnet.toArmTemplate() as any;

      expect(template.properties.enableDdosProtection).toBe(true);
    });

    it('should not include DDoS protection when disabled', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        enableDdosProtection: false,
      });

      const template = vnet.toArmTemplate() as any;

      expect(template.properties.enableDdosProtection).toBeUndefined();
    });
  });

  describe('integration tests', () => {
    it('should work with different locations', () => {
      const locations = ['eastus', 'westus2', 'centralus'];

      locations.forEach((location) => {
        const vnet = new ArmVirtualNetwork(resourceGroup, `VNet-${location}`, {
          virtualNetworkName: `vnet-${location}`,
          location,
          resourceGroupName: 'rg-network',
          addressSpace: {
            addressPrefixes: ['10.0.0.0/16'],
          },
        });

        expect(vnet.location).toBe(location);
      });
    });

    it('should support AuthR VNet pattern', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'AuthRVNet', {
        virtualNetworkName: 'vnet-authr-nonprod-eastus-01',
        location: 'eastus',
        resourceGroupName: 'rg-connectivity',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
        subnets: [
          { name: 'subnet-gateway', addressPrefix: '10.0.0.0/24' },
          { name: 'subnet-application', addressPrefix: '10.0.1.0/24' },
          { name: 'subnet-data', addressPrefix: '10.0.2.0/24' },
          { name: 'subnet-private-endpoints', addressPrefix: '10.0.3.0/24' },
        ],
      });

      expect(vnet.subnets).toHaveLength(4);
      expect(vnet.addressSpace.addressPrefixes).toEqual(['10.0.0.0/16']);
    });

    it('should be addable to construct tree', () => {
      const vnet = new ArmVirtualNetwork(resourceGroup, 'VNet', {
        virtualNetworkName: 'vnet-test',
        location: 'eastus',
        resourceGroupName: 'rg-network',
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16'],
        },
      });

      expect(vnet.node.scope).toBe(resourceGroup);
      expect(vnet.node.id).toBe('VNet');
    });
  });
});
