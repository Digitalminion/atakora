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
import { ApplicationGateway } from './application-gateway';
import type { ApplicationGatewayProps } from './types';
import {
  ApplicationGatewaySkuName,
  ApplicationGatewayTier,
  ApplicationGatewayProtocol,
} from './types';

describe('resources/application-gateway/ApplicationGateway', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;

  const validSubnetId =
    '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/appgw';
  const validPublicIpId =
    '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/publicIPAddresses/pip';

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
  });

  describe('constructor', () => {
    it('should create application gateway with minimal properties', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      expect(appgw.gatewayName).toBeDefined();
      expect(appgw.location).toBe(resourceGroup.location);
      expect(appgw.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(appgw.subnetId).toBe(validSubnetId);
      expect(appgw.publicIpAddressId).toBe(validPublicIpId);
    });

    it('should use custom gateway name when provided', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        gatewayName: 'my-custom-appgw',
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      expect(appgw.gatewayName).toBe('my-custom-appgw');
    });

    it('should auto-generate gateway name when not provided', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      // Should have a generated name
      expect(appgw.gatewayName).toBeTruthy();
      expect(appgw.gatewayName.length).toBeGreaterThan(0);
    });

    it('should use custom location when provided', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        location: 'westus',
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      expect(appgw.location).toBe('westus');
    });

    it('should default location to resource group location', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      expect(appgw.location).toBe(resourceGroup.location);
    });

    it('should default SKU to WAF_v2 with capacity 1', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      expect(appgw.sku.name).toBe(ApplicationGatewaySkuName.WAF_v2);
      expect(appgw.sku.tier).toBe(ApplicationGatewayTier.WAF_v2);
      expect(appgw.sku.capacity).toBe(1);
    });

    it('should use custom SKU when provided', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
        sku: {
          name: ApplicationGatewaySkuName.Standard_v2,
          tier: ApplicationGatewayTier.Standard_v2,
          capacity: 2,
        },
      });

      expect(appgw.sku.name).toBe(ApplicationGatewaySkuName.Standard_v2);
      expect(appgw.sku.tier).toBe(ApplicationGatewayTier.Standard_v2);
      expect(appgw.sku.capacity).toBe(2);
    });

    it('should set WAF policy ID when provided', () => {
      const wafPolicyId =
        '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/waf-policy';

      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
        wafPolicyId,
      });

      expect(appgw.wafPolicyId).toBe(wafPolicyId);
    });

    it('should default enableHttp2 to false', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      expect(appgw.enableHttp2).toBe(false);
    });

    it('should set enableHttp2 when provided', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
        enableHttp2: true,
      });

      expect(appgw.enableHttp2).toBe(true);
    });

    it('should merge tags with parent tags', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
        tags: {
          custom: 'tag',
        },
      });

      expect(appgw.tags).toHaveProperty('custom', 'tag');
    });

    it('should create application gateway without public IP (private only)', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
      });

      expect(appgw.publicIpAddressId).toBeUndefined();
      expect(appgw.subnetId).toBe(validSubnetId);
    });

    it('should set resource group name from parent', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      expect(appgw.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should throw error if parent is not a ResourceGroup', () => {
      const invalidScope = new App();

      expect(() => {
        new ApplicationGateway(invalidScope, 'AppGw', {
          subnetId: validSubnetId,
          publicIpAddressId: validPublicIpId,
        });
      }).toThrow('ApplicationGateway must be created within or under a ResourceGroup');
    });
  });

  describe('fromGatewayId', () => {
    it('should import existing application gateway by ID', () => {
      const gatewayId =
        '/subscriptions/12345/resourceGroups/rg-network/providers/Microsoft.Network/applicationGateways/appgw-prod';

      const appgw = ApplicationGateway.fromGatewayId(stack, 'ImportedAppGw', gatewayId);

      expect(appgw.gatewayName).toBe('appgw-prod');
      expect(appgw.resourceGroupName).toBe('rg-network');
    });

    it('should parse resource ID correctly', () => {
      const gatewayId =
        '/subscriptions/sub-123/resourceGroups/my-rg/providers/Microsoft.Network/applicationGateways/my-gateway';

      const appgw = ApplicationGateway.fromGatewayId(stack, 'ImportedAppGw', gatewayId);

      expect(appgw.gatewayName).toBe('my-gateway');
      expect(appgw.resourceGroupName).toBe('my-rg');
    });
  });

  describe('helper methods', () => {
    it('should throw error when addBackend is called (not yet implemented)', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      expect(() => {
        appgw.addBackend('api-backend', ['api.example.com']);
      }).toThrow('addBackend() is not yet implemented');
    });

    it('should throw error when addListener is called (not yet implemented)', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      expect(() => {
        appgw.addListener('api-listener', 8080, ApplicationGatewayProtocol.Http);
      }).toThrow('addListener() is not yet implemented');
    });

    it('should throw error when addRoutingRule is called (not yet implemented)', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      expect(() => {
        appgw.addRoutingRule('api-rule', 'api-listener', 'api-backend');
      }).toThrow('addRoutingRule() is not yet implemented');
    });
  });

  describe('default configuration', () => {
    it('should create default gateway IP configuration', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      // Access the underlying L1 construct to verify configuration
      const armAppGw = (appgw as any).armApplicationGateway;
      expect(armAppGw.gatewayIPConfigurations).toHaveLength(1);
      expect(armAppGw.gatewayIPConfigurations[0].name).toBe('gateway-ip-config');
      expect(armAppGw.gatewayIPConfigurations[0].subnet.id).toBe(validSubnetId);
    });

    it('should create default frontend IP configuration with public IP', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      const armAppGw = (appgw as any).armApplicationGateway;
      expect(armAppGw.frontendIPConfigurations).toHaveLength(1);
      expect(armAppGw.frontendIPConfigurations[0].name).toBe('frontend-ip-public');
      expect(armAppGw.frontendIPConfigurations[0].publicIPAddress.id).toBe(validPublicIpId);
    });

    it('should create default frontend IP configuration with private IP when no public IP', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
      });

      const armAppGw = (appgw as any).armApplicationGateway;
      expect(armAppGw.frontendIPConfigurations).toHaveLength(1);
      expect(armAppGw.frontendIPConfigurations[0].name).toBe('frontend-ip-private');
      expect(armAppGw.frontendIPConfigurations[0].subnet.id).toBe(validSubnetId);
    });

    it('should create default frontend ports (80 and 443)', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      const armAppGw = (appgw as any).armApplicationGateway;
      expect(armAppGw.frontendPorts).toHaveLength(2);
      expect(armAppGw.frontendPorts[0]).toMatchObject({ name: 'port-80', port: 80 });
      expect(armAppGw.frontendPorts[1]).toMatchObject({ name: 'port-443', port: 443 });
    });

    it('should create default backend address pool', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      const armAppGw = (appgw as any).armApplicationGateway;
      expect(armAppGw.backendAddressPools).toHaveLength(1);
      expect(armAppGw.backendAddressPools[0].name).toBe('default-backend-pool');
      expect(armAppGw.backendAddressPools[0].backendAddresses).toEqual([]);
    });

    it('should create default backend HTTP settings', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      const armAppGw = (appgw as any).armApplicationGateway;
      expect(armAppGw.backendHttpSettingsCollection).toHaveLength(1);
      expect(armAppGw.backendHttpSettingsCollection[0].name).toBe('default-backend-settings');
      expect(armAppGw.backendHttpSettingsCollection[0].port).toBe(80);
      expect(armAppGw.backendHttpSettingsCollection[0].protocol).toBe(
        ApplicationGatewayProtocol.Http
      );
    });

    it('should create default HTTP listener', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      const armAppGw = (appgw as any).armApplicationGateway;
      expect(armAppGw.httpListeners).toHaveLength(1);
      expect(armAppGw.httpListeners[0].name).toBe('default-http-listener');
      expect(armAppGw.httpListeners[0].protocol).toBe(ApplicationGatewayProtocol.Http);
    });

    it('should create default request routing rule', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
      });

      const armAppGw = (appgw as any).armApplicationGateway;
      expect(armAppGw.requestRoutingRules).toHaveLength(1);
      expect(armAppGw.requestRoutingRules[0].name).toBe('default-routing-rule');
      expect(armAppGw.requestRoutingRules[0].priority).toBe(100);
    });
  });

  describe('tags handling', () => {
    it('should handle empty tags', () => {
      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
        tags: {},
      });

      expect(appgw.tags).toBeDefined();
    });

    it('should preserve custom tags', () => {
      const customTags = {
        environment: 'test',
        costCenter: '1234',
      };

      const appgw = new ApplicationGateway(resourceGroup, 'AppGw', {
        subnetId: validSubnetId,
        publicIpAddressId: validPublicIpId,
        tags: customTags,
      });

      expect(appgw.tags).toMatchObject(customTags);
    });
  });
});
