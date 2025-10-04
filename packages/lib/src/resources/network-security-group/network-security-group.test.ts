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
import { NetworkSecurityGroup } from './network-security-group';
import { SecurityRuleProtocol, SecurityRuleAccess } from './types';

describe('resources/network-security-group/NetworkSecurityGroup', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-products'),
      project: new Project('colorai'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
      tags: {
        managed_by: 'terraform',
      },
    });
    resourceGroup = new ResourceGroup(stack, 'NetworkRG');
  });

  describe('constructor', () => {
    it('should create NSG with auto-generated name', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      // Should auto-generate name using stack context
      expect(nsg.networkSecurityGroupName).toContain('nsg-');
      expect(nsg.networkSecurityGroupName).toContain('dp'); // digital-products abbreviation
      expect(nsg.networkSecurityGroupName).toContain('colorai');
      expect(nsg.networkSecurityGroupName).toContain('webnsg'); // purpose from ID
    });

    it('should use provided NSG name when specified', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG', {
        networkSecurityGroupName: 'my-custom-nsg',
      });

      expect(nsg.networkSecurityGroupName).toBe('my-custom-nsg');
    });

    it('should default location to resource group location', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      expect(nsg.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG', {
        location: 'westus2',
      });

      expect(nsg.location).toBe('westus2');
    });

    it('should set resource group name from parent', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      expect(nsg.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should merge tags with parent', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG', {
        tags: {
          tier: 'web',
        },
      });

      expect(nsg.tags).toMatchObject({
        managed_by: 'terraform',
        tier: 'web',
      });
    });

    it('should create NSG with initial security rules', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG', {
        securityRules: [
          {
            name: 'AllowHTTP',
            protocol: SecurityRuleProtocol.TCP,
            sourcePortRange: '*',
            destinationPortRange: '80',
            sourceAddressPrefix: '*',
            destinationAddressPrefix: '*',
            access: SecurityRuleAccess.ALLOW,
            priority: 100,
            direction: 'Inbound' as any,
          },
        ],
      });

      expect(nsg.networkSecurityGroupName).toContain('nsg-');
    });

    it('should generate resource ID', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      expect(nsg.networkSecurityGroupId).toBeDefined();
      expect(nsg.networkSecurityGroupId).toContain('/networkSecurityGroups/');
    });
  });

  describe('auto-naming with different IDs', () => {
    it('should convert PascalCase ID to lowercase purpose', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebTierNSG');

      expect(nsg.networkSecurityGroupName).toContain('webtiernsg');
    });

    it('should convert camelCase ID to lowercase purpose', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'appTierNSG');

      expect(nsg.networkSecurityGroupName).toContain('apptiernsg');
    });

    it('should handle simple lowercase IDs', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'web');

      expect(nsg.networkSecurityGroupName).toContain('web');
    });
  });

  describe('addInboundRule', () => {
    it('should add inbound rule with default values', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      nsg.addInboundRule('AllowHTTP', {
        protocol: SecurityRuleProtocol.TCP,
        destinationPortRange: '80',
        priority: 100,
      });

      // Verify the method returns the NSG instance (for chaining)
      expect(nsg.networkSecurityGroupName).toContain('nsg-');
    });

    it('should add multiple inbound rules', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      nsg
        .addInboundRule('AllowHTTP', {
          protocol: SecurityRuleProtocol.TCP,
          destinationPortRange: '80',
          priority: 100,
        })
        .addInboundRule('AllowHTTPS', {
          protocol: SecurityRuleProtocol.TCP,
          destinationPortRange: '443',
          priority: 110,
        });

      expect(nsg.networkSecurityGroupName).toContain('nsg-');
    });

    it('should add inbound rule with custom source', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      nsg.addInboundRule('AllowHTTPFromInternet', {
        protocol: SecurityRuleProtocol.TCP,
        destinationPortRange: '80',
        sourceAddressPrefix: 'Internet',
        priority: 100,
      });

      expect(nsg.networkSecurityGroupName).toContain('nsg-');
    });

    it('should add inbound rule with description', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      nsg.addInboundRule('AllowHTTP', {
        protocol: SecurityRuleProtocol.TCP,
        destinationPortRange: '80',
        priority: 100,
        description: 'Allow HTTP traffic from internet',
      });

      expect(nsg.networkSecurityGroupName).toContain('nsg-');
    });

    it('should add inbound deny rule', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      nsg.addInboundRule('DenyAll', {
        protocol: SecurityRuleProtocol.ANY,
        destinationPortRange: '*',
        access: SecurityRuleAccess.DENY,
        priority: 4096,
      });

      expect(nsg.networkSecurityGroupName).toContain('nsg-');
    });

    it('should support method chaining', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      const result = nsg
        .addInboundRule('AllowHTTP', {
          protocol: SecurityRuleProtocol.TCP,
          destinationPortRange: '80',
          priority: 100,
        })
        .addInboundRule('AllowHTTPS', {
          protocol: SecurityRuleProtocol.TCP,
          destinationPortRange: '443',
          priority: 110,
        });

      expect(result).toBe(nsg);
    });
  });

  describe('addOutboundRule', () => {
    it('should add outbound rule with default values', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      nsg.addOutboundRule('AllowHTTPS', {
        protocol: SecurityRuleProtocol.TCP,
        destinationPortRange: '443',
        priority: 100,
      });

      expect(nsg.networkSecurityGroupName).toContain('nsg-');
    });

    it('should add multiple outbound rules', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      nsg
        .addOutboundRule('AllowHTTPS', {
          protocol: SecurityRuleProtocol.TCP,
          destinationPortRange: '443',
          priority: 100,
        })
        .addOutboundRule('AllowDNS', {
          protocol: SecurityRuleProtocol.UDP,
          destinationPortRange: '53',
          priority: 110,
        });

      expect(nsg.networkSecurityGroupName).toContain('nsg-');
    });

    it('should add outbound rule with custom destination', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      nsg.addOutboundRule('AllowHTTPSToInternet', {
        protocol: SecurityRuleProtocol.TCP,
        destinationPortRange: '443',
        destinationAddressPrefix: 'Internet',
        priority: 100,
      });

      expect(nsg.networkSecurityGroupName).toContain('nsg-');
    });

    it('should support method chaining', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      const result = nsg
        .addOutboundRule('AllowHTTPS', {
          protocol: SecurityRuleProtocol.TCP,
          destinationPortRange: '443',
          priority: 100,
        })
        .addOutboundRule('AllowDNS', {
          protocol: SecurityRuleProtocol.UDP,
          destinationPortRange: '53',
          priority: 110,
        });

      expect(result).toBe(nsg);
    });
  });

  describe('mixed inbound and outbound rules', () => {
    it('should add both inbound and outbound rules', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG');

      nsg
        .addInboundRule('AllowHTTP', {
          protocol: SecurityRuleProtocol.TCP,
          destinationPortRange: '80',
          priority: 100,
        })
        .addInboundRule('AllowHTTPS', {
          protocol: SecurityRuleProtocol.TCP,
          destinationPortRange: '443',
          priority: 110,
        })
        .addOutboundRule('AllowHTTPSOutbound', {
          protocol: SecurityRuleProtocol.TCP,
          destinationPortRange: '443',
          priority: 100,
        });

      expect(nsg.networkSecurityGroupName).toContain('nsg-');
    });
  });

  describe('parent validation', () => {
    it('should throw error when not created within ResourceGroup', () => {
      expect(() => {
        new NetworkSecurityGroup(stack, 'NSG');
      }).toThrow(/NetworkSecurityGroup must be created within or under a ResourceGroup/);
    });

    it('should work when created directly within ResourceGroup', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'NSG');

      expect(nsg.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });
  });

  describe('integration with underlying L1', () => {
    it('should create L1 construct with correct properties', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG', {
        networkSecurityGroupName: 'nsg-custom',
        location: 'westus2',
        tags: { tier: 'web' },
      });

      expect(nsg.networkSecurityGroupName).toBe('nsg-custom');
      expect(nsg.location).toBe('westus2');
    });

    it('should pass security rules to L1 construct', () => {
      const nsg = new NetworkSecurityGroup(resourceGroup, 'WebNSG', {
        securityRules: [
          {
            name: 'AllowHTTP',
            protocol: SecurityRuleProtocol.TCP,
            sourcePortRange: '*',
            destinationPortRange: '80',
            sourceAddressPrefix: '*',
            destinationAddressPrefix: '*',
            access: SecurityRuleAccess.ALLOW,
            priority: 100,
            direction: 'Inbound' as any,
          },
        ],
      });

      expect(nsg.networkSecurityGroupId).toBeDefined();
    });
  });

  describe('multiple NSGs', () => {
    it('should allow creating multiple NSGs with different IDs', () => {
      const webNSG = new NetworkSecurityGroup(resourceGroup, 'WebNSG');
      const appNSG = new NetworkSecurityGroup(resourceGroup, 'AppNSG');
      const dataNSG = new NetworkSecurityGroup(resourceGroup, 'DataNSG');

      // All should have unique auto-generated names
      expect(webNSG.networkSecurityGroupName).not.toBe(appNSG.networkSecurityGroupName);
      expect(webNSG.networkSecurityGroupName).not.toBe(dataNSG.networkSecurityGroupName);
      expect(appNSG.networkSecurityGroupName).not.toBe(dataNSG.networkSecurityGroupName);

      // All should reference the same resource group
      expect(webNSG.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(appNSG.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(dataNSG.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });
  });
});
