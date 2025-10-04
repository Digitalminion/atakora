import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmNetworkSecurityGroup } from './arm-network-security-group';
import { SecurityRuleProtocol, SecurityRuleAccess, SecurityRuleDirection } from './types';
import type { ArmNetworkSecurityGroupProps } from './types';

describe('resources/network-security-group/ArmNetworkSecurityGroup', () => {
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
    it('should create NSG with required properties', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-web-01',
        location: 'eastus',
      });

      expect(nsg.networkSecurityGroupName).toBe('nsg-web-01');
      expect(nsg.name).toBe('nsg-web-01');
      expect(nsg.location).toBe('eastus');
      expect(nsg.securityRules).toEqual([]);
      expect(nsg.tags).toEqual({});
    });

    it('should create NSG with security rules', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-web-01',
        location: 'eastus',
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
            direction: SecurityRuleDirection.INBOUND,
          },
        ],
      });

      expect(nsg.securityRules).toHaveLength(1);
      expect(nsg.securityRules[0].name).toBe('AllowHTTP');
    });

    it('should create NSG with tags', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-test',
        location: 'eastus',
        tags: {
          environment: 'nonprod',
          tier: 'web',
        },
      });

      expect(nsg.tags).toEqual({
        environment: 'nonprod',
        tier: 'web',
      });
    });

    it('should set correct resource type', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-test',
        location: 'eastus',
      });

      expect(nsg.resourceType).toBe('Microsoft.Network/networkSecurityGroups');
    });

    it('should set correct API version', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-test',
        location: 'eastus',
      });

      expect(nsg.apiVersion).toBe('2024-07-01');
    });

    it('should generate resource ID', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-test',
        location: 'eastus',
      });

      expect(nsg.resourceId).toContain('/networkSecurityGroups/nsg-test');
      expect(nsg.networkSecurityGroupId).toBe(nsg.resourceId);
    });

    it('should have ResourceGroup deployment scope', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-test',
        location: 'eastus',
      });

      expect(nsg.scope).toBe('resourceGroup');
    });

    it('should create NSG with flush connection enabled', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-test',
        location: 'eastus',
        flushConnection: true,
      });

      expect(nsg.flushConnection).toBe(true);
    });
  });

  describe('validation', () => {
    it('should throw error for empty NSG name', () => {
      expect(() => {
        new ArmNetworkSecurityGroup(stack, 'NSG', {
          networkSecurityGroupName: '',
          location: 'eastus',
        });
      }).toThrow(/Network security group name cannot be empty/);
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmNetworkSecurityGroup(stack, 'NSG', {
          networkSecurityGroupName: 'nsg-test',
          location: '',
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error for security rule with empty name', () => {
      expect(() => {
        new ArmNetworkSecurityGroup(stack, 'NSG', {
          networkSecurityGroupName: 'nsg-test',
          location: 'eastus',
          securityRules: [
            {
              name: '',
              protocol: SecurityRuleProtocol.TCP,
              sourcePortRange: '*',
              destinationPortRange: '80',
              sourceAddressPrefix: '*',
              destinationAddressPrefix: '*',
              access: SecurityRuleAccess.ALLOW,
              priority: 100,
              direction: SecurityRuleDirection.INBOUND,
            },
          ],
        });
      }).toThrow(/name cannot be empty/);
    });

    it('should throw error for security rule with description over 140 chars', () => {
      expect(() => {
        new ArmNetworkSecurityGroup(stack, 'NSG', {
          networkSecurityGroupName: 'nsg-test',
          location: 'eastus',
          securityRules: [
            {
              name: 'Rule1',
              description: 'a'.repeat(141),
              protocol: SecurityRuleProtocol.TCP,
              sourcePortRange: '*',
              destinationPortRange: '80',
              sourceAddressPrefix: '*',
              destinationAddressPrefix: '*',
              access: SecurityRuleAccess.ALLOW,
              priority: 100,
              direction: SecurityRuleDirection.INBOUND,
            },
          ],
        });
      }).toThrow(/description cannot exceed 140 characters/);
    });

    it('should throw error for priority below 100', () => {
      expect(() => {
        new ArmNetworkSecurityGroup(stack, 'NSG', {
          networkSecurityGroupName: 'nsg-test',
          location: 'eastus',
          securityRules: [
            {
              name: 'Rule1',
              protocol: SecurityRuleProtocol.TCP,
              sourcePortRange: '*',
              destinationPortRange: '80',
              sourceAddressPrefix: '*',
              destinationAddressPrefix: '*',
              access: SecurityRuleAccess.ALLOW,
              priority: 99,
              direction: SecurityRuleDirection.INBOUND,
            },
          ],
        });
      }).toThrow(/priority must be between 100 and 4096/);
    });

    it('should throw error for priority above 4096', () => {
      expect(() => {
        new ArmNetworkSecurityGroup(stack, 'NSG', {
          networkSecurityGroupName: 'nsg-test',
          location: 'eastus',
          securityRules: [
            {
              name: 'Rule1',
              protocol: SecurityRuleProtocol.TCP,
              sourcePortRange: '*',
              destinationPortRange: '80',
              sourceAddressPrefix: '*',
              destinationAddressPrefix: '*',
              access: SecurityRuleAccess.ALLOW,
              priority: 4097,
              direction: SecurityRuleDirection.INBOUND,
            },
          ],
        });
      }).toThrow(/priority must be between 100 and 4096/);
    });

    it('should throw error for duplicate priorities', () => {
      expect(() => {
        new ArmNetworkSecurityGroup(stack, 'NSG', {
          networkSecurityGroupName: 'nsg-test',
          location: 'eastus',
          securityRules: [
            {
              name: 'Rule1',
              protocol: SecurityRuleProtocol.TCP,
              sourcePortRange: '*',
              destinationPortRange: '80',
              sourceAddressPrefix: '*',
              destinationAddressPrefix: '*',
              access: SecurityRuleAccess.ALLOW,
              priority: 100,
              direction: SecurityRuleDirection.INBOUND,
            },
            {
              name: 'Rule2',
              protocol: SecurityRuleProtocol.TCP,
              sourcePortRange: '*',
              destinationPortRange: '443',
              sourceAddressPrefix: '*',
              destinationAddressPrefix: '*',
              access: SecurityRuleAccess.ALLOW,
              priority: 100,
              direction: SecurityRuleDirection.INBOUND,
            },
          ],
        });
      }).toThrow(/duplicate priorities: 100/);
    });

    it('should accept valid priority range', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-test',
        location: 'eastus',
        securityRules: [
          {
            name: 'Rule1',
            protocol: SecurityRuleProtocol.TCP,
            sourcePortRange: '*',
            destinationPortRange: '80',
            sourceAddressPrefix: '*',
            destinationAddressPrefix: '*',
            access: SecurityRuleAccess.ALLOW,
            priority: 100,
            direction: SecurityRuleDirection.INBOUND,
          },
          {
            name: 'Rule2',
            protocol: SecurityRuleProtocol.TCP,
            sourcePortRange: '*',
            destinationPortRange: '443',
            sourceAddressPrefix: '*',
            destinationAddressPrefix: '*',
            access: SecurityRuleAccess.ALLOW,
            priority: 4096,
            direction: SecurityRuleDirection.INBOUND,
          },
        ],
      });

      expect(nsg.securityRules).toHaveLength(2);
    });

    it('should throw error when missing source port specification', () => {
      expect(() => {
        new ArmNetworkSecurityGroup(stack, 'NSG', {
          networkSecurityGroupName: 'nsg-test',
          location: 'eastus',
          securityRules: [
            {
              name: 'Rule1',
              protocol: SecurityRuleProtocol.TCP,
              destinationPortRange: '80',
              sourceAddressPrefix: '*',
              destinationAddressPrefix: '*',
              access: SecurityRuleAccess.ALLOW,
              priority: 100,
              direction: SecurityRuleDirection.INBOUND,
            } as any,
          ],
        });
      }).toThrow(/sourcePortRange or sourcePortRanges must be specified/);
    });

    it('should throw error when missing destination port specification', () => {
      expect(() => {
        new ArmNetworkSecurityGroup(stack, 'NSG', {
          networkSecurityGroupName: 'nsg-test',
          location: 'eastus',
          securityRules: [
            {
              name: 'Rule1',
              protocol: SecurityRuleProtocol.TCP,
              sourcePortRange: '*',
              sourceAddressPrefix: '*',
              destinationAddressPrefix: '*',
              access: SecurityRuleAccess.ALLOW,
              priority: 100,
              direction: SecurityRuleDirection.INBOUND,
            } as any,
          ],
        });
      }).toThrow(/destinationPortRange or destinationPortRanges must be specified/);
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with minimal properties', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-test',
        location: 'eastus',
      });

      const template = nsg.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Network/networkSecurityGroups',
        apiVersion: '2024-07-01',
        name: 'nsg-test',
        location: 'eastus',
        tags: undefined,
        properties: undefined,
      });
    });

    it('should generate ARM template with security rules', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-web',
        location: 'eastus',
        securityRules: [
          {
            name: 'AllowHTTP',
            description: 'Allow HTTP traffic',
            protocol: SecurityRuleProtocol.TCP,
            sourcePortRange: '*',
            destinationPortRange: '80',
            sourceAddressPrefix: '*',
            destinationAddressPrefix: '*',
            access: SecurityRuleAccess.ALLOW,
            priority: 100,
            direction: SecurityRuleDirection.INBOUND,
          },
        ],
      });

      const template: any = nsg.toArmTemplate();

      expect(template.properties.securityRules).toHaveLength(1);
      expect(template.properties.securityRules[0]).toEqual({
        name: 'AllowHTTP',
        properties: {
          description: 'Allow HTTP traffic',
          protocol: 'Tcp',
          sourcePortRange: '*',
          sourcePortRanges: undefined,
          destinationPortRange: '80',
          destinationPortRanges: undefined,
          sourceAddressPrefix: '*',
          sourceAddressPrefixes: undefined,
          destinationAddressPrefix: '*',
          destinationAddressPrefixes: undefined,
          access: 'Allow',
          priority: 100,
          direction: 'Inbound',
        },
      });
    });

    it('should generate ARM template with tags', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-test',
        location: 'eastus',
        tags: {
          tier: 'web',
        },
      });

      const template: any = nsg.toArmTemplate();

      expect(template.tags).toEqual({ tier: 'web' });
    });

    it('should generate ARM template with flush connection', () => {
      const nsg = new ArmNetworkSecurityGroup(stack, 'NSG', {
        networkSecurityGroupName: 'nsg-test',
        location: 'eastus',
        flushConnection: true,
      });

      const template: any = nsg.toArmTemplate();

      expect(template.properties.flushConnection).toBe(true);
    });
  });
});
