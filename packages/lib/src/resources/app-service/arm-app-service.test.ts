import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmAppService } from './arm-app-service';
import {
  AppServiceKind,
  ManagedIdentityType,
  FtpsState,
  MinTlsVersion,
  ConnectionStringType,
} from './types';
import type { ArmAppServiceProps } from './types';

describe('resources/app-service/ArmAppService', () => {
  let app: App;
  let stack: SubscriptionStack;

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
  });

  describe('constructor', () => {
    it('should create App Service with required properties', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-test-001',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
      });

      expect(appService.siteName).toBe('app-test-001');
      expect(appService.name).toBe('app-test-001');
      expect(appService.location).toBe('eastus');
      expect(appService.serverFarmId).toBe(
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001'
      );
      expect(appService.tags).toEqual({});
      expect(appService.defaultHostName).toBe('app-test-001.azurewebsites.net');
    });

    it('should create App Service with all properties', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-test-002',
        location: 'westus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-002',
        kind: 'app,linux',
        identity: {
          type: ManagedIdentityType.SYSTEM_ASSIGNED,
        },
        siteConfig: {
          linuxFxVersion: 'PYTHON|3.11',
          alwaysOn: true,
          http20Enabled: true,
          ftpsState: FtpsState.DISABLED,
          minTlsVersion: MinTlsVersion.TLS_1_2,
        },
        httpsOnly: true,
        virtualNetworkSubnetId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/subnet1',
        tags: {
          environment: 'test',
        },
      });

      expect(appService.kind).toBe('app,linux');
      expect(appService.identity?.type).toBe(ManagedIdentityType.SYSTEM_ASSIGNED);
      expect(appService.httpsOnly).toBe(true);
      expect(appService.virtualNetworkSubnetId).toBe(
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/subnet1'
      );
      expect(appService.tags).toEqual({ environment: 'test' });
    });

    it('should set correct resource type', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-test-003',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-003',
      });

      expect(appService.resourceType).toBe('Microsoft.Web/sites');
    });

    it('should set correct API version', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-test-004',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-004',
      });

      expect(appService.apiVersion).toBe('2023-01-01');
    });

    it('should generate correct resource ID', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-test-005',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-005',
      });

      expect(appService.resourceId).toBe(
        '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/app-test-005'
      );
      expect(appService.siteId).toBe(appService.resourceId);
    });

    it('should generate correct default hostname', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'my-app-service',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-006',
      });

      expect(appService.defaultHostName).toBe('my-app-service.azurewebsites.net');
    });
  });

  describe('validation', () => {
    it('should throw error if site name is empty', () => {
      expect(() => {
        new ArmAppService(stack, 'WebApp', {
          siteName: '',
          location: 'eastus',
          serverFarmId:
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        });
      }).toThrow('App Service name cannot be empty');
    });

    it('should throw error if site name is too short', () => {
      expect(() => {
        new ArmAppService(stack, 'WebApp', {
          siteName: 'a',
          location: 'eastus',
          serverFarmId:
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        });
      }).toThrow('App Service name must be 2-60 characters');
    });

    it('should throw error if site name is too long', () => {
      expect(() => {
        new ArmAppService(stack, 'WebApp', {
          siteName: 'a'.repeat(61),
          location: 'eastus',
          serverFarmId:
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        });
      }).toThrow('App Service name must be 2-60 characters');
    });

    it('should throw error if site name starts with hyphen', () => {
      expect(() => {
        new ArmAppService(stack, 'WebApp', {
          siteName: '-app-test',
          location: 'eastus',
          serverFarmId:
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        });
      }).toThrow('App Service name must start and end with alphanumeric characters');
    });

    it('should throw error if site name ends with hyphen', () => {
      expect(() => {
        new ArmAppService(stack, 'WebApp', {
          siteName: 'app-test-',
          location: 'eastus',
          serverFarmId:
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        });
      }).toThrow('App Service name must start and end with alphanumeric characters');
    });

    it('should throw error if site name contains invalid characters', () => {
      expect(() => {
        new ArmAppService(stack, 'WebApp', {
          siteName: 'app_test_001',
          location: 'eastus',
          serverFarmId:
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        });
      }).toThrow('App Service name must start and end with alphanumeric characters');
    });

    it('should accept valid site name with hyphens', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-test-001',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
      });

      expect(appService.siteName).toBe('app-test-001');
    });

    it('should throw error if location is empty', () => {
      expect(() => {
        new ArmAppService(stack, 'WebApp', {
          siteName: 'app-test-001',
          location: '',
          serverFarmId:
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        });
      }).toThrow('Location cannot be empty');
    });

    it('should throw error if serverFarmId is empty', () => {
      expect(() => {
        new ArmAppService(stack, 'WebApp', {
          siteName: 'app-test-001',
          location: 'eastus',
          serverFarmId: '',
        });
      }).toThrow('App Service Plan ID (serverFarmId) cannot be empty');
    });
  });

  describe('identity configurations', () => {
    it('should support SystemAssigned identity', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-identity-sa',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        identity: {
          type: ManagedIdentityType.SYSTEM_ASSIGNED,
        },
      });

      expect(appService.identity?.type).toBe(ManagedIdentityType.SYSTEM_ASSIGNED);
    });

    it('should support UserAssigned identity', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-identity-ua',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        identity: {
          type: ManagedIdentityType.USER_ASSIGNED,
          userAssignedIdentities: {
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id1':
              {},
          },
        },
      });

      expect(appService.identity?.type).toBe(ManagedIdentityType.USER_ASSIGNED);
      expect(appService.identity?.userAssignedIdentities).toBeDefined();
    });

    it('should support SystemAssigned,UserAssigned identity', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-identity-both',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        identity: {
          type: ManagedIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED,
          userAssignedIdentities: {
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id1':
              {},
          },
        },
      });

      expect(appService.identity?.type).toBe(ManagedIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED);
    });

    it('should support None identity', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-identity-none',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        identity: {
          type: ManagedIdentityType.NONE,
        },
      });

      expect(appService.identity?.type).toBe(ManagedIdentityType.NONE);
    });
  });

  describe('site configuration', () => {
    it('should support linuxFxVersion configuration', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-config-linux',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          linuxFxVersion: 'PYTHON|3.11',
        },
      });

      expect(appService.siteConfig?.linuxFxVersion).toBe('PYTHON|3.11');
    });

    it('should support netFrameworkVersion configuration', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-config-dotnet',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          netFrameworkVersion: 'v6.0',
        },
      });

      expect(appService.siteConfig?.netFrameworkVersion).toBe('v6.0');
    });

    it('should support app settings', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-config-appsettings',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          appSettings: [
            { name: 'ENVIRONMENT', value: 'production' },
            { name: 'API_KEY', value: '@Microsoft.KeyVault(SecretUri=...)' },
          ],
        },
      });

      expect(appService.siteConfig?.appSettings).toHaveLength(2);
      expect(appService.siteConfig?.appSettings?.[0].name).toBe('ENVIRONMENT');
      expect(appService.siteConfig?.appSettings?.[0].value).toBe('production');
    });

    it('should support connection strings', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-config-connstr',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          connectionStrings: [
            {
              name: 'Database',
              value: 'Server=...;Database=...;',
              type: ConnectionStringType.SQL_AZURE,
            },
          ],
        },
      });

      expect(appService.siteConfig?.connectionStrings).toHaveLength(1);
      expect(appService.siteConfig?.connectionStrings?.[0].name).toBe('Database');
      expect(appService.siteConfig?.connectionStrings?.[0].type).toBe(
        ConnectionStringType.SQL_AZURE
      );
    });

    it('should support alwaysOn configuration', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-config-alwayson',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          alwaysOn: true,
        },
      });

      expect(appService.siteConfig?.alwaysOn).toBe(true);
    });

    it('should support http20Enabled configuration', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-config-http2',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          http20Enabled: true,
        },
      });

      expect(appService.siteConfig?.http20Enabled).toBe(true);
    });

    it('should support ftpsState configuration', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-config-ftps',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          ftpsState: FtpsState.DISABLED,
        },
      });

      expect(appService.siteConfig?.ftpsState).toBe(FtpsState.DISABLED);
    });

    it('should support minTlsVersion configuration', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-config-tls',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          minTlsVersion: MinTlsVersion.TLS_1_2,
        },
      });

      expect(appService.siteConfig?.minTlsVersion).toBe(MinTlsVersion.TLS_1_2);
    });

    it('should support CORS configuration', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-config-cors',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          cors: {
            allowedOrigins: ['https://example.com', 'https://app.example.com'],
            supportCredentials: true,
          },
        },
      });

      expect(appService.siteConfig?.cors?.allowedOrigins).toHaveLength(2);
      expect(appService.siteConfig?.cors?.supportCredentials).toBe(true);
    });

    it('should support vnetRouteAllEnabled configuration', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-config-vnet',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          vnetRouteAllEnabled: true,
        },
      });

      expect(appService.siteConfig?.vnetRouteAllEnabled).toBe(true);
    });

    it('should support IP security restrictions', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-config-iprestrict',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          ipSecurityRestrictions: [
            {
              ipAddress: '10.0.0.0/24',
              action: 'Allow',
              priority: 100,
              name: 'Allow VNet',
            },
          ],
        },
      });

      expect(appService.siteConfig?.ipSecurityRestrictions).toHaveLength(1);
      expect(appService.siteConfig?.ipSecurityRestrictions?.[0].ipAddress).toBe('10.0.0.0/24');
    });
  });

  describe('VNet integration', () => {
    it('should support VNet integration with subnet ID', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-vnet-integration',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        virtualNetworkSubnetId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/app-subnet',
      });

      expect(appService.virtualNetworkSubnetId).toBe(
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/app-subnet'
      );
    });

    it('should work without VNet integration', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-no-vnet',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
      });

      expect(appService.virtualNetworkSubnetId).toBeUndefined();
    });
  });

  describe('toArmTemplate', () => {
    it('should generate valid ARM template with minimal properties', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-minimal',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
      });

      const template = appService.toArmTemplate() as any;

      expect(template.type).toBe('Microsoft.Web/sites');
      expect(template.apiVersion).toBe('2023-01-01');
      expect(template.name).toBe('app-minimal');
      expect(template.location).toBe('eastus');
      expect(template.properties.serverFarmId).toBe(
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001'
      );
    });

    it('should include identity in ARM template', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-with-identity',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        identity: {
          type: ManagedIdentityType.SYSTEM_ASSIGNED,
        },
      });

      const template = appService.toArmTemplate() as any;

      expect(template.identity).toBeDefined();
      expect(template.identity.type).toBe('SystemAssigned');
    });

    it('should include site config in ARM template', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-with-config',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        siteConfig: {
          linuxFxVersion: 'PYTHON|3.11',
          alwaysOn: true,
          http20Enabled: true,
        },
      });

      const template = appService.toArmTemplate() as any;

      expect(template.properties.siteConfig).toBeDefined();
      expect(template.properties.siteConfig.linuxFxVersion).toBe('PYTHON|3.11');
      expect(template.properties.siteConfig.alwaysOn).toBe(true);
      expect(template.properties.siteConfig.http20Enabled).toBe(true);
    });

    it('should include httpsOnly in ARM template', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-https-only',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        httpsOnly: true,
      });

      const template = appService.toArmTemplate() as any;

      expect(template.properties.httpsOnly).toBe(true);
    });

    it('should include tags in ARM template', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-with-tags',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        tags: {
          environment: 'production',
          project: 'authr',
        },
      });

      const template = appService.toArmTemplate() as any;

      expect(template.tags).toEqual({
        environment: 'production',
        project: 'authr',
      });
    });

    it('should include kind in ARM template', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-with-kind',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        kind: 'app,linux',
      });

      const template = appService.toArmTemplate() as any;

      expect(template.kind).toBe('app,linux');
    });

    it('should include VNet subnet ID in ARM template', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-with-vnet',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        virtualNetworkSubnetId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/app-subnet',
      });

      const template = appService.toArmTemplate() as any;

      expect(template.properties.virtualNetworkSubnetId).toBe(
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/app-subnet'
      );
    });
  });

  describe('additional properties', () => {
    it('should support keyVaultReferenceIdentity', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-kv-identity',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        keyVaultReferenceIdentity: 'SystemAssigned',
      });

      expect(appService.keyVaultReferenceIdentity).toBe('SystemAssigned');
    });

    it('should support clientAffinityEnabled', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-client-affinity',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        clientAffinityEnabled: false,
      });

      expect(appService.clientAffinityEnabled).toBe(false);
    });

    it('should support storageAccountRequired', () => {
      const appService = new ArmAppService(stack, 'WebApp', {
        siteName: 'app-storage-required',
        location: 'eastus',
        serverFarmId:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001',
        storageAccountRequired: false,
      });

      expect(appService.storageAccountRequired).toBe(false);
    });
  });
});
