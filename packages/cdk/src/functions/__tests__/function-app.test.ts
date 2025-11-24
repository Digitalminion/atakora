/**
 * Unit tests for FunctionApp L2 construct.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { App, Construct } from '@atakora/cdk';
import { FunctionApp } from '../function-app';
import { FunctionRuntime } from '../types';
import { ManagedServiceIdentityType } from '../function-app-types';
import {
  MockResourceGroup,
  createMockPlan,
  createMockStorage,
} from '../../../__tests__/helpers/test-fixtures';

describe('cdk/functions/FunctionApp', () => {
  let app: App;
  let resourceGroup: MockResourceGroup;
  const mockPlan = createMockPlan();
  const mockStorage = createMockStorage();

  beforeEach(() => {
    app = new App();
    resourceGroup = new MockResourceGroup(app, 'TestRG', {
      resourceGroupName: 'test-rg',
      location: 'eastus',
      tags: {
        environment: 'test',
        project: 'authr',
      },
    });
  });

  describe('constructor', () => {
    it('should create function app with auto-generated name', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.functionAppName).toBeDefined();
      expect(functionApp.name).toBe(functionApp.functionAppName);
    });

    it('should use provided function app name when specified', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        functionAppName: 'my-custom-app',
      });

      expect(functionApp.functionAppName).toBe('my-custom-app');
    });

    it('should default location to parent resource group location', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        location: 'westus2',
      });

      expect(functionApp.location).toBe('westus2');
    });

    it('should default to Node runtime version 18', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.runtime).toBe(FunctionRuntime.NODE);
      expect(functionApp.runtimeVersion).toBe('18');
    });

    it('should use provided runtime and version', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        runtime: FunctionRuntime.DOTNET,
        runtimeVersion: '8.0',
      });

      expect(functionApp.runtime).toBe(FunctionRuntime.DOTNET);
      expect(functionApp.runtimeVersion).toBe('8.0');
    });

    it('should set storage account name from reference', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.storageAccountName).toBe(mockStorage.storageAccountName);
    });

    it('should set server farm ID from plan', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.serverFarmId).toBe(mockPlan.planId);
    });

    it('should set resource group name from parent', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.resourceGroupName).toBe('test-rg');
    });

    it('should set resourceId and functionAppId', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.resourceId).toBeDefined();
      expect(functionApp.functionAppId).toBe(functionApp.resourceId);
    });

    it('should set defaultHostName', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        functionAppName: 'test-app',
      });

      expect(functionApp.defaultHostName).toBe('test-app.azurewebsites.net');
    });

    it('should throw error if plan is not provided', () => {
      expect(() => {
        new FunctionApp(resourceGroup, 'Api', {
          storageAccount: mockStorage,
        } as any);
      }).toThrow(/requires a plan/);
    });

    it('should throw error if storageAccount is not provided', () => {
      expect(() => {
        new FunctionApp(resourceGroup, 'Api', {
          plan: mockPlan,
        } as any);
      }).toThrow(/requires a storageAccount/);
    });
  });

  describe('parent validation', () => {
    it('should throw error if not created within a ResourceGroup', () => {
      const plainConstruct = new Construct(app, 'PlainConstruct');

      expect(() => {
        new FunctionApp(plainConstruct, 'Api', {
          plan: mockPlan,
          storageAccount: mockStorage,
        });
      }).toThrow(/must be created within or under a ResourceGroup/);
    });

    it('should work when created directly within ResourceGroup', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.functionAppName).toBeDefined();
    });

    it('should work when created within nested construct under ResourceGroup', () => {
      const nestedConstruct = new Construct(resourceGroup, 'Nested');
      const functionApp = new FunctionApp(nestedConstruct, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.functionAppName).toBeDefined();
      expect(functionApp.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });
  });

  describe('tag merging', () => {
    it('should inherit tags from parent', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.tags).toMatchObject({
        environment: 'test',
        project: 'authr',
      });
    });

    it('should merge provided tags with parent tags', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        tags: {
          costCenter: '1234',
          owner: 'api-team',
        },
      });

      expect(functionApp.tags).toMatchObject({
        environment: 'test',
        project: 'authr',
        costCenter: '1234',
        owner: 'api-team',
      });
    });

    it('should override parent tags with provided tags', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        tags: {
          project: 'custom-project', // overrides parent
        },
      });

      expect(functionApp.tags.project).toBe('custom-project');
    });
  });

  describe('environment variables', () => {
    it('should initialize with empty environment when not provided', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.environment).toEqual({});
    });

    it('should use provided environment variables', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        environment: {
          NODE_ENV: 'production',
          LOG_LEVEL: 'info',
        },
      });

      expect(functionApp.environment).toEqual({
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      });
    });

    it('should add environment variable via addEnvironmentVariable', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      functionApp.addEnvironmentVariable('API_KEY', 'secret-key');

      expect(functionApp.environment.API_KEY).toBe('secret-key');
    });

    it('should add multiple environment variables via addEnvironmentVariables', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      functionApp.addEnvironmentVariables({
        API_KEY: 'secret-key',
        DATABASE_URL: 'postgres://localhost',
        CACHE_TTL: '3600',
      });

      expect(functionApp.environment).toMatchObject({
        API_KEY: 'secret-key',
        DATABASE_URL: 'postgres://localhost',
        CACHE_TTL: '3600',
      });
    });

    it('should update existing environment variable', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        environment: {
          LOG_LEVEL: 'info',
        },
      });

      functionApp.addEnvironmentVariable('LOG_LEVEL', 'debug');

      expect(functionApp.environment.LOG_LEVEL).toBe('debug');
    });
  });

  describe('runtime configuration', () => {
    it('should support Node.js runtime', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      expect(functionApp.runtime).toBe(FunctionRuntime.NODE);
      expect(functionApp.runtimeVersion).toBe('20');
    });

    it('should support Python runtime', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        runtime: FunctionRuntime.PYTHON,
        runtimeVersion: '3.11',
      });

      expect(functionApp.runtime).toBe(FunctionRuntime.PYTHON);
      expect(functionApp.runtimeVersion).toBe('3.11');
    });

    it('should support .NET runtime', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        runtime: FunctionRuntime.DOTNET,
        runtimeVersion: '8.0',
      });

      expect(functionApp.runtime).toBe(FunctionRuntime.DOTNET);
      expect(functionApp.runtimeVersion).toBe('8.0');
    });

    it('should support Java runtime', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        runtime: FunctionRuntime.JAVA,
        runtimeVersion: '17',
      });

      expect(functionApp.runtime).toBe(FunctionRuntime.JAVA);
      expect(functionApp.runtimeVersion).toBe('17');
    });

    it('should support PowerShell runtime', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        runtime: FunctionRuntime.POWERSHELL,
        runtimeVersion: '7.2',
      });

      expect(functionApp.runtime).toBe(FunctionRuntime.POWERSHELL);
      expect(functionApp.runtimeVersion).toBe('7.2');
    });
  });

  describe('identity configuration', () => {
    it('should support system-assigned identity', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
      });

      expect(functionApp.functionAppName).toBeDefined();
    });

    it('should support user-assigned identity', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.USER_ASSIGNED,
          userAssignedIdentities: {
            '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test-identity':
              {},
          },
        },
      });

      expect(functionApp.functionAppName).toBeDefined();
    });

    it('should support both system and user-assigned identities', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED,
          userAssignedIdentities: {
            '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test-identity':
              {},
          },
        },
      });

      expect(functionApp.functionAppName).toBeDefined();
    });
  });

  describe('CORS configuration', () => {
    it('should accept CORS settings', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        cors: {
          allowedOrigins: ['https://example.com', 'https://app.example.com'],
          supportCredentials: true,
        },
      });

      expect(functionApp.cors).toBeDefined();
      expect(functionApp.cors?.allowedOrigins).toContain('https://example.com');
      expect(functionApp.cors?.supportCredentials).toBe(true);
    });

    it('should have undefined CORS when not provided', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.cors).toBeUndefined();
    });
  });

  describe('VNet configuration', () => {
    it('should accept VNet configuration', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        vnetConfig: {
          subnetId:
            '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/app-subnet',
          swiftSupported: true,
        },
      });

      expect(functionApp.vnetConfig).toBeDefined();
      expect(functionApp.vnetConfig?.subnetId).toContain('app-subnet');
      expect(functionApp.vnetConfig?.swiftSupported).toBe(true);
    });

    it('should have undefined VNet config when not provided', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.vnetConfig).toBeUndefined();
    });
  });

  describe('IFunctionApp interface', () => {
    it('should implement IFunctionApp interface', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      // Should have required properties
      expect(functionApp).toHaveProperty('functionAppName');
      expect(functionApp).toHaveProperty('functionAppId');
      expect(functionApp).toHaveProperty('defaultHostName');
      expect(functionApp).toHaveProperty('location');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        functionAppName: 'test-app',
      });

      const template = functionApp.toArmTemplate();

      expect(template).toBeDefined();
      expect(template.type).toBe('Microsoft.Web/sites');
      expect(template.apiVersion).toBe('2023-01-01');
      expect(template.name).toBe('test-app');
      expect(template.kind).toBe('functionapp');
    });

    it('should include required app settings', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      const template = functionApp.toArmTemplate();
      const appSettings = template.properties.siteConfig.appSettings;

      // Check for required Azure Functions settings
      const settingNames = appSettings.map((s: any) => s.name);
      expect(settingNames).toContain('AzureWebJobsStorage');
      expect(settingNames).toContain('FUNCTIONS_EXTENSION_VERSION');
      expect(settingNames).toContain('FUNCTIONS_WORKER_RUNTIME');
    });

    it('should include user environment variables in app settings', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        environment: {
          CUSTOM_VAR: 'custom-value',
          LOG_LEVEL: 'debug',
        },
      });

      const template = functionApp.toArmTemplate();
      const appSettings = template.properties.siteConfig.appSettings;

      const customSetting = appSettings.find((s: any) => s.name === 'CUSTOM_VAR');
      expect(customSetting).toBeDefined();
      expect(customSetting.value).toBe('custom-value');

      const logLevelSetting = appSettings.find((s: any) => s.name === 'LOG_LEVEL');
      expect(logLevelSetting).toBeDefined();
      expect(logLevelSetting.value).toBe('debug');
    });

    it('should set FUNCTIONS_WORKER_RUNTIME based on runtime property', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        runtime: FunctionRuntime.PYTHON,
      });

      const template = functionApp.toArmTemplate();
      const appSettings = template.properties.siteConfig.appSettings;

      const runtimeSetting = appSettings.find((s: any) => s.name === 'FUNCTIONS_WORKER_RUNTIME');
      expect(runtimeSetting).toBeDefined();
      expect(runtimeSetting.value).toBe(FunctionRuntime.PYTHON);
    });

    it('should include identity when provided', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
      });

      const template = functionApp.toArmTemplate();

      expect(template.identity).toBeDefined();
    });

    it('should include tags', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        tags: {
          costCenter: '1234',
        },
      });

      const template = functionApp.toArmTemplate();

      expect(template.tags).toBeDefined();
      expect(template.tags.costCenter).toBe('1234');
    });

    it('should include serverFarmId', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      const template = functionApp.toArmTemplate();

      expect(template.properties.serverFarmId).toBeDefined();
    });

    it('should not duplicate reserved app settings', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        environment: {
          AzureWebJobsStorage: 'should-be-ignored',
          FUNCTIONS_WORKER_RUNTIME: 'should-be-ignored',
          CUSTOM_VAR: 'custom-value',
        },
      });

      const template = functionApp.toArmTemplate();
      const appSettings = template.properties.siteConfig.appSettings;

      // Count occurrences of reserved settings
      const azureWebJobsStorageCount = appSettings.filter(
        (s: any) => s.name === 'AzureWebJobsStorage'
      ).length;
      const functionsWorkerRuntimeCount = appSettings.filter(
        (s: any) => s.name === 'FUNCTIONS_WORKER_RUNTIME'
      ).length;

      expect(azureWebJobsStorageCount).toBe(1);
      expect(functionsWorkerRuntimeCount).toBe(1);

      // Custom var should be included
      const customVar = appSettings.find((s: any) => s.name === 'CUSTOM_VAR');
      expect(customVar).toBeDefined();
      expect(customVar.value).toBe('custom-value');
    });
  });

  describe('toMetadata', () => {
    it('should generate resource metadata', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      const metadata = functionApp.toMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.id).toBe('Api');
      expect(metadata.type).toBe('Microsoft.Web/sites');
      expect(metadata.sizeEstimate).toBeGreaterThan(0);
    });

    it('should include storage account in dependencies', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      const metadata = functionApp.toMetadata();

      expect(metadata.dependencies).toContain(mockStorage.storageAccountName);
    });

    it('should prefer compute tier placement', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      const metadata = functionApp.toMetadata();

      expect(metadata.templatePreference).toBe('compute');
    });
  });

  describe('fromFunctionAppName', () => {
    it('should import existing function app by name', () => {
      const imported = FunctionApp.fromFunctionAppName(
        resourceGroup,
        'ExistingApi',
        'func-existing-app',
        'westus2'
      );

      expect(imported.functionAppName).toBe('func-existing-app');
      expect(imported.location).toBe('westus2');
      expect(imported.defaultHostName).toBe('func-existing-app.azurewebsites.net');
    });
  });

  describe('integration scenarios', () => {
    it('should create multiple function apps in same resource group', () => {
      const api = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      const worker = new FunctionApp(resourceGroup, 'Worker', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(api.functionAppName).not.toBe(worker.functionAppName);
      expect(api.resourceGroupName).toBe(worker.resourceGroupName);
    });

    it('should be addable to construct tree', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      expect(functionApp.node.scope).toBe(resourceGroup);
      expect(functionApp.node.id).toBe('Api');
    });

    it('should support nested constructs', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
      });

      const child = new Construct(functionApp, 'ChildConstruct');

      expect(child.node.scope).toBe(functionApp);
      expect(functionApp.node.children).toContainEqual(child);
    });
  });

  describe('advanced scenarios', () => {
    it('should work with all properties specified', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        functionAppName: 'custom-func-app',
        location: 'westus2',
        runtime: FunctionRuntime.PYTHON,
        runtimeVersion: '3.11',
        environment: {
          LOG_LEVEL: 'debug',
          API_VERSION: 'v2',
        },
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
        cors: {
          allowedOrigins: ['https://example.com'],
          supportCredentials: true,
        },
        vnetConfig: {
          subnetId:
            '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/app-subnet',
          swiftSupported: true,
        },
        tags: {
          costCenter: '1234',
          environment: 'production',
        },
      });

      expect(functionApp.functionAppName).toBe('custom-func-app');
      expect(functionApp.location).toBe('westus2');
      expect(functionApp.runtime).toBe(FunctionRuntime.PYTHON);
      expect(functionApp.runtimeVersion).toBe('3.11');
      expect(functionApp.environment).toMatchObject({
        LOG_LEVEL: 'debug',
        API_VERSION: 'v2',
      });
      expect(functionApp.cors).toBeDefined();
      expect(functionApp.vnetConfig).toBeDefined();
      expect(functionApp.tags).toMatchObject({
        costCenter: '1234',
        environment: 'production',
      });
    });

    it('should support serverless consumption plan', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '18',
      });

      expect(functionApp.functionAppName).toBeDefined();
    });

    it('should support dedicated app service plan', () => {
      const functionApp = new FunctionApp(resourceGroup, 'Api', {
        plan: mockPlan,
        storageAccount: mockStorage,
        runtime: FunctionRuntime.DOTNET,
        runtimeVersion: '8.0',
      });

      expect(functionApp.functionAppName).toBeDefined();
    });
  });
});
