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
import { ArmApplicationGateway } from './arm-application-gateway';
import type { ArmApplicationGatewayProps } from './types';
import {
  ApplicationGatewaySkuName,
  ApplicationGatewayTier,
  ApplicationGatewayProtocol,
  ApplicationGatewayCookieBasedAffinity,
  ApplicationGatewayRequestRoutingRuleType,
} from './types';

describe('resources/application-gateway/ArmApplicationGateway', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;

  const createValidProps = (): ArmApplicationGatewayProps => ({
    gatewayName: 'appgw-test',
    location: 'eastus',
    resourceGroupName: 'rg-network',
    sku: {
      name: ApplicationGatewaySkuName.WAF_v2,
      tier: ApplicationGatewayTier.WAF_v2,
      capacity: 1,
    },
    gatewayIPConfigurations: [
      {
        name: 'gateway-ip-config',
        subnet: {
          id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/appgw',
        },
      },
    ],
    frontendIPConfigurations: [
      {
        name: 'frontend-ip',
        publicIPAddress: {
          id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/publicIPAddresses/pip',
        },
      },
    ],
    frontendPorts: [
      { name: 'port-80', port: 80 },
      { name: 'port-443', port: 443 },
    ],
    backendAddressPools: [
      {
        name: 'backend-pool',
        backendAddresses: [{ fqdn: 'backend.example.com' }],
      },
    ],
    backendHttpSettingsCollection: [
      {
        name: 'backend-settings',
        port: 443,
        protocol: ApplicationGatewayProtocol.Https,
        cookieBasedAffinity: ApplicationGatewayCookieBasedAffinity.Disabled,
        requestTimeout: 30,
      },
    ],
    httpListeners: [
      {
        name: 'http-listener',
        frontendIPConfiguration: {
          id: "[resourceId('Microsoft.Network/applicationGateways/frontendIPConfigurations', 'appgw-test', 'frontend-ip')]",
        },
        frontendPort: {
          id: "[resourceId('Microsoft.Network/applicationGateways/frontendPorts', 'appgw-test', 'port-80')]",
        },
        protocol: ApplicationGatewayProtocol.Http,
      },
    ],
    requestRoutingRules: [
      {
        name: 'routing-rule',
        ruleType: ApplicationGatewayRequestRoutingRuleType.Basic,
        priority: 100,
        httpListener: {
          id: "[resourceId('Microsoft.Network/applicationGateways/httpListeners', 'appgw-test', 'http-listener')]",
        },
        backendAddressPool: {
          id: "[resourceId('Microsoft.Network/applicationGateways/backendAddressPools', 'appgw-test', 'backend-pool')]",
        },
        backendHttpSettings: {
          id: "[resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', 'appgw-test', 'backend-settings')]",
        },
      },
    ],
  });

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
    it('should create application gateway with required properties', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);

      expect(appgw.gatewayName).toBe('appgw-test');
      expect(appgw.name).toBe('appgw-test');
      expect(appgw.location).toBe('eastus');
      expect(appgw.resourceGroupName).toBe('rg-network');
      expect(appgw.sku.name).toBe(ApplicationGatewaySkuName.WAF_v2);
      expect(appgw.sku.tier).toBe(ApplicationGatewayTier.WAF_v2);
      expect(appgw.sku.capacity).toBe(1);
    });

    it('should set correct resource type', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);

      expect(appgw.resourceType).toBe('Microsoft.Network/applicationGateways');
    });

    it('should set correct API version', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);

      expect(appgw.apiVersion).toBe('2023-11-01');
    });

    it('should construct correct resource ID', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);

      expect(appgw.resourceId).toBe(
        '/subscriptions/{subscriptionId}/resourceGroups/rg-network/providers/Microsoft.Network/applicationGateways/appgw-test'
      );
    });

    it('should create application gateway with tags', () => {
      const props = createValidProps();
      props.tags = {
        environment: 'nonprod',
        project: 'colorai',
      };

      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);

      expect(appgw.tags).toEqual({
        environment: 'nonprod',
        project: 'colorai',
      });
    });

    it('should throw error if gateway name is empty', () => {
      const props = createValidProps();
      props.gatewayName = '';

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('Application gateway name cannot be empty');
    });

    it('should throw error if gateway name is too long', () => {
      const props = createValidProps();
      props.gatewayName = 'a'.repeat(81);

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('Application gateway name must be 80 characters or less');
    });

    it('should throw error if location is empty', () => {
      const props = createValidProps();
      props.location = '';

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('Location cannot be empty');
    });

    it('should throw error if resource group name is empty', () => {
      const props = createValidProps();
      props.resourceGroupName = '';

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('Resource group name cannot be empty');
    });

    it('should throw error if SKU is not provided', () => {
      const props = createValidProps();
      (props as any).sku = undefined;

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('SKU must be specified');
    });

    it('should throw error if gateway IP configurations are empty', () => {
      const props = createValidProps();
      props.gatewayIPConfigurations = [];

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('At least one gateway IP configuration must be specified');
    });

    it('should throw error if frontend IP configurations are empty', () => {
      const props = createValidProps();
      props.frontendIPConfigurations = [];

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('At least one frontend IP configuration must be specified');
    });

    it('should throw error if frontend ports are empty', () => {
      const props = createValidProps();
      props.frontendPorts = [];

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('At least one frontend port must be specified');
    });

    it('should throw error if backend address pools are empty', () => {
      const props = createValidProps();
      props.backendAddressPools = [];

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('At least one backend address pool must be specified');
    });

    it('should throw error if backend HTTP settings are empty', () => {
      const props = createValidProps();
      props.backendHttpSettingsCollection = [];

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('At least one backend HTTP settings must be specified');
    });

    it('should throw error if HTTP listeners are empty', () => {
      const props = createValidProps();
      props.httpListeners = [];

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('At least one HTTP listener must be specified');
    });

    it('should throw error if request routing rules are empty', () => {
      const props = createValidProps();
      props.requestRoutingRules = [];

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('At least one request routing rule must be specified');
    });

    it('should throw error if gateway IP configuration name is empty', () => {
      const props = createValidProps();
      props.gatewayIPConfigurations[0].name = '';

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('Gateway IP configuration name cannot be empty');
    });

    it('should throw error if gateway IP configuration subnet is missing', () => {
      const props = createValidProps();
      (props.gatewayIPConfigurations[0] as any).subnet = undefined;

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('Gateway IP configuration must have a subnet ID');
    });

    it('should throw error if frontend port name is empty', () => {
      const props = createValidProps();
      props.frontendPorts[0].name = '';

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('Frontend port name cannot be empty');
    });

    it('should throw error if frontend port is invalid', () => {
      const props = createValidProps();
      props.frontendPorts[0].port = 0;

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('Frontend port must be between 1 and 65535');
    });

    it('should throw error if request routing rule name is empty', () => {
      const props = createValidProps();
      props.requestRoutingRules[0].name = '';

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('Request routing rule name cannot be empty');
    });

    it('should throw error if request routing rule priority is invalid', () => {
      const props = createValidProps();
      props.requestRoutingRules[0].priority = 0;

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('Request routing rule priority must be between 1 and 20000');
    });

    it('should throw error if request routing rule has no HTTP listener', () => {
      const props = createValidProps();
      (props.requestRoutingRules[0] as any).httpListener = undefined;

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow('Request routing rule must have an HTTP listener');
    });

    it('should throw error if request routing rule has no backend or redirect', () => {
      const props = createValidProps();
      delete (props.requestRoutingRules[0] as any).backendAddressPool;
      delete (props.requestRoutingRules[0] as any).backendHttpSettings;

      expect(() => {
        new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      }).toThrow(
        'Request routing rule must have either backend pool + settings, redirect configuration, or URL path map'
      );
    });
  });

  describe('toArmTemplate', () => {
    it('should generate correct ARM template structure', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template = appgw.toArmTemplate();

      expect(template).toHaveProperty('type', 'Microsoft.Network/applicationGateways');
      expect(template).toHaveProperty('apiVersion', '2023-11-01');
      expect(template).toHaveProperty('name', 'appgw-test');
      expect(template).toHaveProperty('location', 'eastus');
      expect(template).toHaveProperty('properties');
    });

    it('should include SKU in ARM template', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.sku).toEqual({
        name: ApplicationGatewaySkuName.WAF_v2,
        tier: ApplicationGatewayTier.WAF_v2,
        capacity: 1,
      });
    });

    it('should include gateway IP configurations in ARM template', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.gatewayIPConfigurations).toHaveLength(1);
      expect(template.properties.gatewayIPConfigurations[0]).toEqual({
        name: 'gateway-ip-config',
        properties: {
          subnet: {
            id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/appgw',
          },
        },
      });
    });

    it('should include frontend IP configurations in ARM template', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.frontendIPConfigurations).toHaveLength(1);
      expect(template.properties.frontendIPConfigurations[0].name).toBe('frontend-ip');
    });

    it('should include frontend ports in ARM template', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.frontendPorts).toHaveLength(2);
      expect(template.properties.frontendPorts[0]).toEqual({
        name: 'port-80',
        properties: { port: 80 },
      });
    });

    it('should include backend address pools in ARM template', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.backendAddressPools).toHaveLength(1);
      expect(template.properties.backendAddressPools[0].name).toBe('backend-pool');
    });

    it('should include backend HTTP settings in ARM template', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.backendHttpSettingsCollection).toHaveLength(1);
      expect(template.properties.backendHttpSettingsCollection[0].properties).toMatchObject({
        port: 443,
        protocol: ApplicationGatewayProtocol.Https,
        cookieBasedAffinity: ApplicationGatewayCookieBasedAffinity.Disabled,
        requestTimeout: 30,
      });
    });

    it('should include HTTP listeners in ARM template', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.httpListeners).toHaveLength(1);
      expect(template.properties.httpListeners[0].name).toBe('http-listener');
    });

    it('should include request routing rules in ARM template', () => {
      const props = createValidProps();
      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.requestRoutingRules).toHaveLength(1);
      expect(template.properties.requestRoutingRules[0].properties).toMatchObject({
        ruleType: ApplicationGatewayRequestRoutingRuleType.Basic,
        priority: 100,
      });
    });

    it('should include optional probes in ARM template when provided', () => {
      const props = createValidProps();
      props.probes = [
        {
          name: 'health-probe',
          protocol: ApplicationGatewayProtocol.Https,
          path: '/health',
          interval: 30,
          timeout: 30,
          unhealthyThreshold: 3,
          pickHostNameFromBackendHttpSettings: true,
        },
      ];

      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.probes).toHaveLength(1);
      expect(template.properties.probes[0].name).toBe('health-probe');
    });

    it('should include optional SSL certificates in ARM template when provided', () => {
      const props = createValidProps();
      props.sslCertificates = [
        {
          name: 'ssl-cert',
          keyVaultSecretId: 'https://keyvault.vault.azure.net/secrets/ssl-cert',
        },
      ];

      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.sslCertificates).toHaveLength(1);
      expect(template.properties.sslCertificates[0].name).toBe('ssl-cert');
    });

    it('should include optional redirect configurations in ARM template when provided', () => {
      const props = createValidProps();
      props.redirectConfigurations = [
        {
          name: 'http-to-https',
          redirectType: 'Permanent' as any,
          targetListener: {
            id: "[resourceId('Microsoft.Network/applicationGateways/httpListeners', 'appgw-test', 'https-listener')]",
          },
        },
      ];

      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.redirectConfigurations).toHaveLength(1);
      expect(template.properties.redirectConfigurations[0].name).toBe('http-to-https');
    });

    it('should include WAF configuration in ARM template when provided', () => {
      const props = createValidProps();
      props.webApplicationFirewallConfiguration = {
        enabled: true,
        firewallMode: 'Prevention',
        ruleSetType: 'OWASP',
        ruleSetVersion: '3.2',
      };

      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.webApplicationFirewallConfiguration).toEqual({
        enabled: true,
        firewallMode: 'Prevention',
        ruleSetType: 'OWASP',
        ruleSetVersion: '3.2',
      });
    });

    it('should include firewall policy in ARM template when provided', () => {
      const props = createValidProps();
      props.firewallPolicy = {
        id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/waf-policy',
      };

      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.firewallPolicy).toEqual({
        id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/waf-policy',
      });
    });

    it('should include enableHttp2 in ARM template when provided', () => {
      const props = createValidProps();
      props.enableHttp2 = true;

      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.properties.enableHttp2).toBe(true);
    });

    it('should include tags in ARM template when provided', () => {
      const props = createValidProps();
      props.tags = { environment: 'test' };

      const appgw = new ArmApplicationGateway(resourceGroup, 'AppGw', props);
      const template: any = appgw.toArmTemplate();

      expect(template.tags).toEqual({ environment: 'test' });
    });
  });
});
