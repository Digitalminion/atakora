import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmSubnet } from './arm-subnet';
import {
  PrivateEndpointNetworkPolicies,
  PrivateLinkServiceNetworkPolicies,
  SharingScope,
} from './types';
import type { ArmSubnetProps } from './types';

describe('resources/subnet/ArmSubnet', () => {
  let app: App;
  let stack: SubscriptionStack;

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
  });

  describe('constructor', () => {
    it('should create subnet with required properties', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-web-01',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.name).toBe('snet-web-01');
      expect(subnet.virtualNetworkName).toBe('vnet-test');
      expect(subnet.addressPrefix).toBe('10.0.1.0/24');
    });

    it('should create subnet with network security group', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-web-01',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.1.0/24',
        networkSecurityGroup: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/networkSecurityGroups/nsg-web',
        },
      });

      expect(subnet.networkSecurityGroup).toEqual({
        id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/networkSecurityGroups/nsg-web',
      });
    });

    it('should create subnet with service endpoints', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-data-01',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.2.0/24',
        serviceEndpoints: [
          { service: 'Microsoft.Storage' },
          { service: 'Microsoft.Sql', locations: ['eastus', 'westus'] },
        ],
      });

      expect(subnet.serviceEndpoints).toEqual([
        { service: 'Microsoft.Storage' },
        { service: 'Microsoft.Sql', locations: ['eastus', 'westus'] },
      ]);
    });

    it('should create subnet with delegations', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-app-01',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.3.0/24',
        delegations: [
          {
            name: 'delegation1',
            serviceName: 'Microsoft.Web/serverFarms',
          },
        ],
      });

      expect(subnet.delegations).toEqual([
        {
          name: 'delegation1',
          serviceName: 'Microsoft.Web/serverFarms',
        },
      ]);
    });

    it('should set correct resource type', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-test',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.resourceType).toBe('Microsoft.Network/virtualNetworks/subnets');
    });

    it('should set correct API version', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-test',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.apiVersion).toBe('2024-07-01');
    });

    it('should generate resource ID', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-test',
        virtualNetworkName: 'vnet-prod',
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.resourceId).toContain('/virtualNetworks/vnet-prod/subnets/snet-test');
      expect(subnet.subnetId).toBe(subnet.resourceId);
    });

    it('should have ResourceGroup deployment scope', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-test',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.1.0/24',
      });

      expect(subnet.scope).toBe('resourceGroup');
    });

    it('should create subnet with addressPrefixes array', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-multi',
        virtualNetworkName: 'vnet-test',
        addressPrefixes: ['10.0.1.0/24', '10.0.2.0/24'],
      });

      expect(subnet.addressPrefixes).toEqual(['10.0.1.0/24', '10.0.2.0/24']);
    });

    it('should create subnet with private endpoint network policies', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-test',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.1.0/24',
        privateEndpointNetworkPolicies: PrivateEndpointNetworkPolicies.ENABLED,
      });

      expect(subnet.privateEndpointNetworkPolicies).toBe('Enabled');
    });

    it('should create subnet with private link service network policies', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-test',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.1.0/24',
        privateLinkServiceNetworkPolicies: PrivateLinkServiceNetworkPolicies.DISABLED,
      });

      expect(subnet.privateLinkServiceNetworkPolicies).toBe('Disabled');
    });
  });

  describe('validation', () => {
    it('should throw error for empty subnet name', () => {
      expect(() => {
        new ArmSubnet(stack, 'Subnet', {
          name: '',
          virtualNetworkName: 'vnet-test',
          addressPrefix: '10.0.1.0/24',
        });
      }).toThrow(/Subnet name cannot be empty/);
    });

    it('should throw error for whitespace-only subnet name', () => {
      expect(() => {
        new ArmSubnet(stack, 'Subnet', {
          name: '   ',
          virtualNetworkName: 'vnet-test',
          addressPrefix: '10.0.1.0/24',
        });
      }).toThrow(/Subnet name cannot be empty/);
    });

    it('should throw error for empty virtual network name', () => {
      expect(() => {
        new ArmSubnet(stack, 'Subnet', {
          name: 'snet-test',
          virtualNetworkName: '',
          addressPrefix: '10.0.1.0/24',
        });
      }).toThrow(/Virtual network name cannot be empty/);
    });

    it('should throw error for empty address prefix when addressPrefixes not provided', () => {
      expect(() => {
        new ArmSubnet(stack, 'Subnet', {
          name: 'snet-test',
          virtualNetworkName: 'vnet-test',
          addressPrefix: '',
        });
      }).toThrow(/Either addressPrefix or addressPrefixes must be provided/);
    });

    it('should throw error for invalid CIDR notation', () => {
      expect(() => {
        new ArmSubnet(stack, 'Subnet', {
          name: 'snet-test',
          virtualNetworkName: 'vnet-test',
          addressPrefix: 'invalid-cidr',
        });
      }).toThrow(/Invalid CIDR notation/);
    });

    it('should accept valid CIDR notation', () => {
      const validCidrs = ['10.0.1.0/24', '192.168.0.0/16', '172.16.0.0/12', '10.0.0.0/8'];

      validCidrs.forEach((cidr) => {
        const subnet = new ArmSubnet(stack, `Subnet-${cidr.replace(/[./]/g, '-')}`, {
          name: `snet-${cidr.replace(/[./]/g, '-')}`,
          virtualNetworkName: 'vnet-test',
          addressPrefix: cidr,
        });

        expect(subnet.addressPrefix).toBe(cidr);
      });
    });

    it('should throw error when both addressPrefix and addressPrefixes are provided', () => {
      expect(() => {
        new ArmSubnet(stack, 'Subnet', {
          name: 'snet-test',
          virtualNetworkName: 'vnet-test',
          addressPrefix: '10.0.1.0/24',
          addressPrefixes: ['10.0.1.0/24'],
        });
      }).toThrow(/Cannot specify both addressPrefix and addressPrefixes/);
    });

    it('should throw error when sharingScope is set without defaultOutboundAccess=false', () => {
      expect(() => {
        new ArmSubnet(stack, 'Subnet', {
          name: 'snet-test',
          virtualNetworkName: 'vnet-test',
          addressPrefix: '10.0.1.0/24',
          sharingScope: SharingScope.TENANT,
        });
      }).toThrow(/sharingScope can only be set when defaultOutboundAccess is set to false/);
    });

    it('should allow sharingScope when defaultOutboundAccess is false', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-test',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.1.0/24',
        defaultOutboundAccess: false,
        sharingScope: SharingScope.TENANT,
      });

      expect(subnet.sharingScope).toBe('Tenant');
      expect(subnet.defaultOutboundAccess).toBe(false);
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with minimal properties', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-test',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.1.0/24',
      });

      const template = subnet.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Network/virtualNetworks/subnets',
        apiVersion: '2024-07-01',
        name: 'vnet-test/snet-test',
        properties: {
          addressPrefix: '10.0.1.0/24',
        },
      });
    });

    it('should generate ARM template with network security group', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-web',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.1.0/24',
        networkSecurityGroup: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/networkSecurityGroups/nsg-web',
        },
      });

      const template = subnet.toArmTemplate();

      expect(template).toMatchObject({
        properties: {
          networkSecurityGroup: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/networkSecurityGroups/nsg-web',
          },
        },
      });
    });

    it('should generate ARM template with service endpoints', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-data',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.2.0/24',
        serviceEndpoints: [
          { service: 'Microsoft.Storage' },
          { service: 'Microsoft.Sql', locations: ['eastus'] },
        ],
      });

      const template = subnet.toArmTemplate();

      expect(template).toMatchObject({
        properties: {
          serviceEndpoints: [
            { service: 'Microsoft.Storage' },
            { service: 'Microsoft.Sql', locations: ['eastus'] },
          ],
        },
      });
    });

    it('should generate ARM template with delegations', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-app',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.3.0/24',
        delegations: [
          {
            name: 'delegation1',
            serviceName: 'Microsoft.Web/serverFarms',
          },
        ],
      });

      const template = subnet.toArmTemplate();

      expect(template).toMatchObject({
        properties: {
          delegations: [
            {
              name: 'delegation1',
              properties: {
                serviceName: 'Microsoft.Web/serverFarms',
              },
            },
          ],
        },
      });
    });

    it('should generate ARM template with all optional properties', () => {
      const subnet = new ArmSubnet(stack, 'Subnet', {
        name: 'snet-full',
        virtualNetworkName: 'vnet-test',
        addressPrefix: '10.0.1.0/24',
        networkSecurityGroup: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/networkSecurityGroups/nsg',
        },
        serviceEndpoints: [{ service: 'Microsoft.Storage' }],
        delegations: [{ name: 'del1', serviceName: 'Microsoft.Web/serverFarms' }],
        privateEndpointNetworkPolicies: PrivateEndpointNetworkPolicies.ENABLED,
        privateLinkServiceNetworkPolicies: PrivateLinkServiceNetworkPolicies.DISABLED,
        defaultOutboundAccess: false,
        sharingScope: SharingScope.TENANT,
      });

      const template = subnet.toArmTemplate();

      expect(template).toMatchObject({
        type: 'Microsoft.Network/virtualNetworks/subnets',
        apiVersion: '2024-07-01',
        name: 'vnet-test/snet-full',
        properties: {
          addressPrefix: '10.0.1.0/24',
          networkSecurityGroup: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/networkSecurityGroups/nsg',
          },
          serviceEndpoints: [{ service: 'Microsoft.Storage' }],
          delegations: [
            {
              name: 'del1',
              properties: { serviceName: 'Microsoft.Web/serverFarms' },
            },
          ],
          privateEndpointNetworkPolicies: 'Enabled',
          privateLinkServiceNetworkPolicies: 'Disabled',
          defaultOutboundAccess: false,
          sharingScope: 'Tenant',
        },
      });
    });
  });
});
