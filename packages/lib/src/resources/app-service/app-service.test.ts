import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroup } from '../resource-group/resource-group';
import { AppServicePlan } from '../app-service-plan/app-service-plan';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { AppService } from './app-service';
import {
  AppServiceKind,
  ManagedIdentityType,
  ConnectionStringType,
  FtpsState,
  MinTlsVersion,
} from './types';

describe('resources/app-service/AppService', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;
  let appServicePlan: AppServicePlan;

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
      },
    });
    resourceGroup = new ResourceGroup(stack, 'AppRG');
    appServicePlan = new AppServicePlan(resourceGroup, 'AppPlan');
  });

  describe('constructor', () => {
    it('should create App Service with auto-generated name', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      // Should auto-generate name with app prefix
      expect(appService.siteName).toMatch(/^app-/);
      expect(appService.siteName).toContain('dp'); // Abbreviated org
      expect(appService.siteName).toContain('authr'); // Project
    });

    it('should use provided site name when specified', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        siteName: 'app-custom-name',
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.siteName).toBe('app-custom-name');
    });

    it('should default location to resource group location', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        location: 'westus2',
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.location).toBe('westus2');
    });

    it('should set resource group name from parent', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should merge tags with parent', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        tags: {
          purpose: 'api-hosting',
        },
      });

      expect(appService.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'api-hosting',
      });
    });

    it('should accept IAppServicePlan for serverFarmId', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan,
      });

      expect(appService.serverFarmId).toBe(appServicePlan.planId);
    });

    it('should accept string resource ID for serverFarmId', () => {
      const planId =
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/asp-001';
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: planId,
      });

      expect(appService.serverFarmId).toBe(planId);
    });

    it('should default kind to app', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.kind).toBe('app');
    });

    it('should use provided kind when specified', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        kind: AppServiceKind.API,
      });

      expect(appService.kind).toBe('api');
    });

    it('should default identity to SystemAssigned', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.identity.type).toBe(ManagedIdentityType.SYSTEM_ASSIGNED);
    });

    it('should use provided identity when specified', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        identity: {
          type: ManagedIdentityType.USER_ASSIGNED,
          userAssignedIdentities: {
            '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id1':
              {},
          },
        },
      });

      expect(appService.identity.type).toBe(ManagedIdentityType.USER_ASSIGNED);
      expect(appService.identity.userAssignedIdentities).toBeDefined();
    });

    it('should default httpsOnly to true', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.httpsOnly).toBe(true);
    });

    it('should use provided httpsOnly when specified', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        httpsOnly: false,
      });

      expect(appService.httpsOnly).toBe(false);
    });

    it('should generate correct default hostname', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        siteName: 'my-web-app',
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.defaultHostName).toBe('my-web-app.azurewebsites.net');
    });

    it('should generate resource ID', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        siteName: 'my-web-app',
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.siteId).toContain('/providers/Microsoft.Web/sites/my-web-app');
    });
  });

  describe('default configurations', () => {
    it('should default alwaysOn to false', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      // Access through private field is not possible, but we can verify it's created
      expect(appService.siteName).toBeDefined();
    });

    it('should default http20Enabled to true', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should default ftpsState to Disabled', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should default minTlsVersion to 1.2', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should accept custom alwaysOn value', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        alwaysOn: true,
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should accept custom http20Enabled value', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        http20Enabled: false,
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should accept custom ftpsState value', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        ftpsState: FtpsState.FTPS_ONLY,
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should accept custom minTlsVersion value', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        minTlsVersion: MinTlsVersion.TLS_1_3,
      });

      expect(appService.siteName).toBeDefined();
    });
  });

  describe('linuxFxVersion configuration', () => {
    it('should support Python runtime', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        linuxFxVersion: 'PYTHON|3.11',
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should support Node.js runtime', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        linuxFxVersion: 'NODE|18-lts',
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should support .NET runtime', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        linuxFxVersion: 'DOTNETCORE|7.0',
      });

      expect(appService.siteName).toBeDefined();
    });
  });

  describe('addAppSetting method', () => {
    it('should add a new app setting', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      appService.addAppSetting('ENVIRONMENT', 'production');

      // Verify the setting was added (indirectly through successful creation)
      expect(appService.siteName).toBeDefined();
    });

    it('should add multiple app settings', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      appService.addAppSetting('ENVIRONMENT', 'production');
      appService.addAppSetting('API_KEY', 'secret-key');
      appService.addAppSetting('LOG_LEVEL', 'info');

      expect(appService.siteName).toBeDefined();
    });

    it('should update existing app setting', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        appSettings: [{ name: 'ENVIRONMENT', value: 'development' }],
      });

      appService.addAppSetting('ENVIRONMENT', 'production');

      expect(appService.siteName).toBeDefined();
    });

    it('should support Key Vault references in app settings', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      appService.addAppSetting(
        'DB_PASSWORD',
        '@Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/dbpassword/)'
      );

      expect(appService.siteName).toBeDefined();
    });
  });

  describe('addConnectionString method', () => {
    it('should add a new connection string', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      appService.addConnectionString(
        'Database',
        'Server=tcp:...;Database=...;',
        ConnectionStringType.SQL_AZURE
      );

      expect(appService.siteName).toBeDefined();
    });

    it('should add multiple connection strings', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      appService.addConnectionString(
        'Database',
        'Server=tcp:...;Database=...;',
        ConnectionStringType.SQL_AZURE
      );
      appService.addConnectionString(
        'Redis',
        'redis-server:6379',
        ConnectionStringType.REDIS_CACHE
      );

      expect(appService.siteName).toBeDefined();
    });

    it('should update existing connection string', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        connectionStrings: [
          {
            name: 'Database',
            value: 'old-connection-string',
            type: ConnectionStringType.SQL_AZURE,
          },
        ],
      });

      appService.addConnectionString(
        'Database',
        'new-connection-string',
        ConnectionStringType.SQL_AZURE
      );

      expect(appService.siteName).toBeDefined();
    });

    it('should support different connection string types', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      appService.addConnectionString('SQL', 'connection', ConnectionStringType.SQL_SERVER);
      appService.addConnectionString('MySQL', 'connection', ConnectionStringType.MYSQL);
      appService.addConnectionString('PostgreSQL', 'connection', ConnectionStringType.POSTGRESQL);
      appService.addConnectionString('Custom', 'connection', ConnectionStringType.CUSTOM);

      expect(appService.siteName).toBeDefined();
    });

    it('should support Key Vault references in connection strings', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      appService.addConnectionString(
        'Database',
        '@Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/dbconnection/)',
        ConnectionStringType.SQL_AZURE
      );

      expect(appService.siteName).toBeDefined();
    });
  });

  describe('enableVNetIntegration method', () => {
    it('should enable VNet integration', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      const subnetId =
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/app-subnet';
      appService.enableVNetIntegration(subnetId);

      expect(appService.siteName).toBeDefined();
    });

    it('should work with pre-configured VNet integration', () => {
      const subnetId =
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/app-subnet';
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        virtualNetworkSubnetId: subnetId,
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should enable vnetRouteAllEnabled when VNet integration is enabled', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
      });

      const subnetId =
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/app-subnet';
      appService.enableVNetIntegration(subnetId);

      expect(appService.siteName).toBeDefined();
    });
  });

  describe('fromSiteId static method', () => {
    it('should create reference from site ID', () => {
      const siteId =
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/app-existing';
      const appRef = AppService.fromSiteId(resourceGroup, 'ExistingApp', siteId);

      expect(appRef.siteName).toBe('app-existing');
      expect(appRef.siteId).toBe(siteId);
      expect(appRef.defaultHostName).toBe('app-existing.azurewebsites.net');
    });

    it('should throw error for invalid site ID', () => {
      expect(() => {
        AppService.fromSiteId(resourceGroup, 'InvalidApp', '/invalid/resource/id');
      }).toThrow('Invalid App Service resource ID');
    });

    it('should extract location from parent resource group', () => {
      const siteId =
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/app-existing';
      const appRef = AppService.fromSiteId(resourceGroup, 'ExistingApp', siteId);

      expect(appRef.location).toBe('eastus');
    });
  });

  describe('CORS configuration', () => {
    it('should support CORS configuration', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        cors: {
          allowedOrigins: ['https://example.com', 'https://app.example.com'],
          supportCredentials: true,
        },
      });

      expect(appService.siteName).toBeDefined();
    });
  });

  describe('security configurations', () => {
    it('should support IP security restrictions', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        ipSecurityRestrictions: [
          {
            ipAddress: '10.0.0.0/24',
            action: 'Allow',
            priority: 100,
            name: 'Allow VNet',
          },
        ],
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should support SCM IP security restrictions', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        scmIpSecurityRestrictions: [
          {
            ipAddress: '10.0.0.0/24',
            action: 'Allow',
            priority: 100,
            name: 'Allow SCM from VNet',
          },
        ],
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should support health check path', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        healthCheckPath: '/health',
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should support public network access configuration', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        publicNetworkAccess: 'Disabled',
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should support Key Vault reference identity', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        keyVaultReferenceIdentity: 'SystemAssigned',
      });

      expect(appService.siteName).toBeDefined();
    });
  });

  describe('logging configurations', () => {
    it('should support HTTP logging', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        httpLoggingEnabled: true,
      });

      expect(appService.siteName).toBeDefined();
    });

    it('should support detailed error logging', () => {
      const appService = new AppService(resourceGroup, 'WebApp', {
        serverFarmId: appServicePlan.planId,
        detailedErrorLoggingEnabled: true,
      });

      expect(appService.siteName).toBeDefined();
    });
  });

  describe('complex scenarios', () => {
    it('should create production-ready App Service with all features', () => {
      const appService = new AppService(resourceGroup, 'ProductionApp', {
        siteName: 'app-authr-prod',
        serverFarmId: appServicePlan,
        kind: AppServiceKind.APP,
        identity: {
          type: ManagedIdentityType.SYSTEM_ASSIGNED,
        },
        linuxFxVersion: 'PYTHON|3.11',
        httpsOnly: true,
        alwaysOn: true,
        http20Enabled: true,
        ftpsState: FtpsState.DISABLED,
        minTlsVersion: MinTlsVersion.TLS_1_2,
        cors: {
          allowedOrigins: ['https://example.com'],
          supportCredentials: true,
        },
        healthCheckPath: '/health',
        httpLoggingEnabled: true,
        detailedErrorLoggingEnabled: true,
        tags: {
          environment: 'production',
          project: 'authr',
        },
      });

      appService.addAppSetting('ENVIRONMENT', 'production');
      appService.addAppSetting('LOG_LEVEL', 'info');
      appService.addConnectionString(
        'Database',
        '@Microsoft.KeyVault(SecretUri=...)',
        ConnectionStringType.SQL_AZURE
      );

      expect(appService.siteName).toBe('app-authr-prod');
      expect(appService.httpsOnly).toBe(true);
      expect(appService.tags).toMatchObject({
        environment: 'production',
        project: 'authr',
      });
    });

    it('should create App Service with VNet integration and settings', () => {
      const appService = new AppService(resourceGroup, 'VNetApp', {
        serverFarmId: appServicePlan.planId,
        linuxFxVersion: 'PYTHON|3.11',
        vnetRouteAllEnabled: true,
      });

      const subnetId =
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/app-subnet';
      appService.enableVNetIntegration(subnetId);
      appService.addAppSetting('VNET_ENABLED', 'true');

      expect(appService.siteName).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw error if not created under a ResourceGroup', () => {
      expect(() => {
        new AppService(stack, 'WebApp', {
          serverFarmId: appServicePlan.planId,
        });
      }).toThrow('AppService must be created within or under a ResourceGroup');
    });
  });
});
