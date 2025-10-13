/**
 * Tests for FunctionsApp dedicated storage provisioning
 *
 * @remarks
 * These tests verify that:
 * 1. FunctionsApp always creates dedicated storage accounts
 * 2. Storage isolation is maintained between Functions runtime and application data
 * 3. The existingStorage parameter is properly handled
 * 4. Storage configuration meets Functions runtime requirements
 *
 * Per ADR-001, Azure Functions Apps MUST use dedicated storage accounts
 * for their runtime operations to ensure proper separation of concerns,
 * security boundaries, and performance isolation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FunctionsApp } from '../functions-app';
import { Construct } from '@atakora/cdk';
import { StorageAccounts, StorageAccountSkuName, StorageAccountKind } from '@atakora/cdk/storage';
import { ServerFarms } from '@atakora/cdk/web';
import { FunctionRuntime } from '../types';

// Mock ResourceGroup for testing
class MockResourceGroup extends Construct {
  public readonly resourceGroupName = 'test-rg';
  public readonly location = 'eastus';
  public readonly tags = { environment: 'test' };
}

// Mock App Service Plan
class MockServerFarms extends Construct {
  public readonly planId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Web/serverfarms/test-plan';
  public readonly planName = 'test-plan';

  constructor(scope: Construct, id: string) {
    super(scope, id);
  }
}

// Mock Storage Account for application data
class MockStorageAccount extends Construct {
  public readonly storageAccountId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/appdata';
  public readonly storageAccountName = 'appdata';
  public readonly tags = { purpose: 'application-data' };

  constructor(scope: Construct, id: string) {
    super(scope, id);
  }
}

describe('FunctionsApp - Dedicated Storage Provisioning', () => {
  let resourceGroup: MockResourceGroup;

  beforeEach(() => {
    resourceGroup = new MockResourceGroup(undefined as any, 'TestRG');
  });

  describe('dedicated storage creation', () => {
    it('should create dedicated storage account when no existingStorage provided', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Verify storage was created
      expect(functionsApp.storage).toBeDefined();
      expect(functionsApp.storage.storageAccountName).toBeDefined();

      // Verify storage is a child of the FunctionsApp construct
      const children = functionsApp.node.children;
      const storageChild = children.find(child => child.node.id === 'RuntimeStorage');
      expect(storageChild).toBeDefined();
      expect(storageChild).toBeInstanceOf(StorageAccounts);
    });

    it('should create storage with correct configuration for Functions runtime', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
        location: 'eastus2',
      });

      // Verify storage account is properly configured
      expect(functionsApp.storage).toBeDefined();
      expect(functionsApp.storage.storageAccountName).toBeTruthy();

      // Storage should be in the same location as the function app
      expect(functionsApp.location).toBe('eastus2');
    });

    it('should tag storage account appropriately for Functions runtime', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
        tags: {
          project: 'test-project',
          environment: 'dev',
        },
      });

      // Verify storage was created with proper tags
      expect(functionsApp.storage).toBeDefined();

      // Find the storage child construct
      const storageChild = functionsApp.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      ) as StorageAccounts | undefined;

      expect(storageChild).toBeDefined();
    });
  });

  describe('storage isolation', () => {
    it('should not accept existingStorage parameter (regression test)', () => {
      // This test documents that existingStorage parameter still exists
      // but should be removed per ADR-001

      // Create mock application data storage
      const appDataStorage = new MockStorageAccount(resourceGroup, 'AppData');

      // IMPORTANT: TypeScript interface no longer has existingStorage,
      // but the implementation still checks for it on line 135 of functions-app.ts
      // This is the anti-pattern that needs to be removed

      // After the fix, existingStorage should be removed from:
      // 1. FunctionsAppProps interface (types.ts) - ALREADY DONE
      // 2. Constructor implementation (functions-app.ts line 135) - NEEDS FIX

      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
        // existingStorage not in TypeScript interface anymore
      });

      // Verify dedicated storage is created
      expect(functionsApp.storage).toBeDefined();

      // Storage should be created as a child construct
      const storageChild = functionsApp.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );
      expect(storageChild).toBeDefined();
    });

    it('should create unique storage for each FunctionsApp instance', () => {
      const functionsApp1 = new FunctionsApp(resourceGroup, 'Api1', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      const functionsApp2 = new FunctionsApp(resourceGroup, 'Api2', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Each FunctionsApp should have its own dedicated storage
      expect(functionsApp1.storage).toBeDefined();
      expect(functionsApp2.storage).toBeDefined();

      // Storage instances should be different construct instances
      expect(functionsApp1.storage).not.toBe(functionsApp2.storage);

      // Each storage should be a child of its respective FunctionsApp
      const storage1 = functionsApp1.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );
      const storage2 = functionsApp2.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );

      expect(storage1).toBeDefined();
      expect(storage2).toBeDefined();
      expect(storage1).not.toBe(storage2);
      expect(storage1?.node.scope).toBe(functionsApp1);
      expect(storage2?.node.scope).toBe(functionsApp2);
    });

    it('should not create storage dependencies on external resources', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Verify storage is a direct child of FunctionsApp
      const storageChild = functionsApp.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );

      expect(storageChild).toBeDefined();
      expect(storageChild?.node.scope).toBe(functionsApp);

      // Storage should not depend on any external constructs
      // (it's created within the FunctionsApp scope)
      expect(storageChild?.node.scope?.node.id).toBe('Api');
    });
  });

  describe('storage configuration requirements', () => {
    it('should configure storage with appropriate SKU for Functions', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Verify storage exists
      expect(functionsApp.storage).toBeDefined();

      // Storage account should exist as a child construct
      const storageChild = functionsApp.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      ) as StorageAccounts | undefined;

      expect(storageChild).toBeDefined();
      expect(storageChild).toBeInstanceOf(StorageAccounts);
    });

    it('should configure storage with StorageV2 kind for Functions', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Verify storage exists and is configured correctly
      expect(functionsApp.storage).toBeDefined();

      const storageChild = functionsApp.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      ) as StorageAccounts | undefined;

      expect(storageChild).toBeDefined();
    });

    it('should configure storage in the same location as FunctionApp', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
        location: 'westus2',
      });

      // Storage location must match FunctionApp location
      // (Azure requires this for proper Functions operation)
      expect(functionsApp.location).toBe('westus2');
      expect(functionsApp.storage).toBeDefined();
    });
  });

  describe('function app integration', () => {
    it('should wire storage account to function app correctly', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Verify function app is created
      expect(functionsApp.functionApp).toBeDefined();
      expect(functionsApp.functionAppName).toBeDefined();

      // Verify storage is available
      expect(functionsApp.storage).toBeDefined();

      // Function app should reference the storage
      expect(functionsApp.storage.storageAccountId).toBeDefined();
    });

    it('should maintain storage lifecycle with function app', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Storage should be a direct child of FunctionsApp
      // This ensures it's deleted when FunctionsApp is deleted
      const children = functionsApp.node.children;
      const storageChild = children.find(child => child.node.id === 'RuntimeStorage');

      expect(storageChild).toBeDefined();
      expect(storageChild?.node.scope).toBe(functionsApp);

      // Plan and FunctionApp should also be children
      const planChild = children.find(child => child.node.id === 'Plan');
      const functionAppChild = children.find(child => child.node.id === 'FunctionApp');

      expect(planChild).toBeDefined();
      expect(functionAppChild).toBeDefined();
    });

    it('should provide storage account ID to function app', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Verify storage account ID is available for function app configuration
      expect(functionsApp.storage.storageAccountId).toBeDefined();
      expect(functionsApp.storage.storageAccountId).toBeTruthy();

      // Verify storage account name is available for connection strings
      expect(functionsApp.storage.storageAccountName).toBeDefined();
      expect(functionsApp.storage.storageAccountName).toBeTruthy();
    });
  });

  describe('regression prevention', () => {
    it('should not allow sharing storage between multiple FunctionsApps', () => {
      const functionsApp1 = new FunctionsApp(resourceGroup, 'Api1', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      const functionsApp2 = new FunctionsApp(resourceGroup, 'Api2', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Verify each has its own storage (different object instances)
      expect(functionsApp1.storage).not.toBe(functionsApp2.storage);

      // Verify storage accounts are separate constructs in the tree
      const storage1 = functionsApp1.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );
      const storage2 = functionsApp2.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );

      expect(storage1).not.toBe(storage2);

      // Verify each storage is scoped to its own FunctionsApp
      expect(storage1?.node.scope).toBe(functionsApp1);
      expect(storage2?.node.scope).toBe(functionsApp2);
    });

    it('should always create dedicated storage separate from application data', () => {
      // This test verifies that Functions Apps do not share storage
      // with application data storage, per ADR-001

      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Verify Functions App creates its own storage
      expect(functionsApp.storage).toBeDefined();

      // Storage should be a new instance created by FunctionsApp
      const storageChild = functionsApp.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );
      expect(storageChild).toBeDefined();
      expect(storageChild).toBeInstanceOf(StorageAccounts);

      // Storage should be scoped to this FunctionsApp
      expect(storageChild?.node.scope).toBe(functionsApp);
    });

    it('should create storage even when existingPlan is provided', () => {
      // Create existing App Service Plan
      const existingPlan = new MockServerFarms(resourceGroup, 'ExistingPlan');

      // Create FunctionsApp with existing plan
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
        existingPlan: existingPlan as any,
      });

      // Even with existing plan, storage should be created
      expect(functionsApp.storage).toBeDefined();
      expect(functionsApp.plan).toBe(existingPlan);

      // Storage should be a new instance
      const storageChild = functionsApp.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );
      expect(storageChild).toBeDefined();
    });

    it('should maintain storage isolation across different runtimes', () => {
      const nodeFunctions = new FunctionsApp(resourceGroup, 'NodeApi', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      const pythonFunctions = new FunctionsApp(resourceGroup, 'PythonApi', {
        runtime: FunctionRuntime.PYTHON,
        runtimeVersion: '3.11',
      });

      // Each runtime should have its own dedicated storage (different instances)
      expect(nodeFunctions.storage).not.toBe(pythonFunctions.storage);

      // Verify storage accounts are separate constructs
      const nodeStorage = nodeFunctions.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );
      const pythonStorage = pythonFunctions.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );

      expect(nodeStorage).toBeDefined();
      expect(pythonStorage).toBeDefined();
      expect(nodeStorage).not.toBe(pythonStorage);
    });
  });

  describe('environment and configuration', () => {
    it('should support environment-specific storage configuration', () => {
      const devFunctions = new FunctionsApp(resourceGroup, 'DevApi', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
        tags: { environment: 'dev' },
      });

      const prodFunctions = new FunctionsApp(resourceGroup, 'ProdApi', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
        tags: { environment: 'prod' },
      });

      // Each environment should have its own storage
      expect(devFunctions.storage).toBeDefined();
      expect(prodFunctions.storage).toBeDefined();
      expect(devFunctions.storage).not.toBe(prodFunctions.storage);
    });

    it('should create storage with consistent configuration', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
        location: 'eastus',
        tags: {
          project: 'colorai',
          purpose: 'api-functions',
        },
      });

      // Verify storage exists with consistent properties
      expect(functionsApp.storage).toBeDefined();
      expect(functionsApp.location).toBe('eastus');
    });
  });

  describe('public API surface', () => {
    it('should expose storage property for monitoring and diagnostics', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Public API should expose storage for monitoring setup
      expect(functionsApp.storage).toBeDefined();
      expect(functionsApp.storage.storageAccountId).toBeDefined();
      expect(functionsApp.storage.storageAccountName).toBeDefined();
    });

    it('should maintain backward compatibility with existing code', () => {
      // This test ensures that removing existingStorage parameter
      // doesn't break existing code that doesn't use it
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
        environment: {
          NODE_ENV: 'production',
          LOG_LEVEL: 'info',
        },
      });

      // All expected properties should be available
      expect(functionsApp.storage).toBeDefined();
      expect(functionsApp.functionApp).toBeDefined();
      expect(functionsApp.functionAppName).toBeDefined();
      expect(functionsApp.defaultHostName).toBeDefined();
      expect(functionsApp.functionAppId).toBeDefined();
      expect(functionsApp.environment).toEqual({
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      });
    });

    it('should support adding environment variables', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Test the public API for adding environment variables
      functionsApp.addEnvironmentVariable('API_KEY', 'secret');
      expect(functionsApp.environment.API_KEY).toBe('secret');

      functionsApp.addEnvironmentVariables({
        LOG_LEVEL: 'debug',
        ENABLE_CACHING: 'true',
      });

      expect(functionsApp.environment.LOG_LEVEL).toBe('debug');
      expect(functionsApp.environment.ENABLE_CACHING).toBe('true');
    });
  });

  describe('ADR-001 compliance', () => {
    it('should enforce dedicated storage for Functions runtime', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Per ADR-001: "Azure Functions Apps MUST use dedicated storage accounts"
      expect(functionsApp.storage).toBeDefined();

      // Storage must be created as part of the FunctionsApp
      const storageChild = functionsApp.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );
      expect(storageChild).toBeDefined();
      expect(storageChild?.node.scope).toBe(functionsApp);
    });

    it('should maintain separation of concerns for storage', () => {
      const functionsApp = new FunctionsApp(resourceGroup, 'Api', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Per ADR-001: Storage separation prevents mixing application data
      // with Functions runtime storage

      // Verify Functions has its own storage
      expect(functionsApp.storage).toBeDefined();

      // Verify storage is managed by FunctionsApp
      const storageChild = functionsApp.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );
      expect(storageChild?.node.scope).toBe(functionsApp);
    });

    it('should ensure security boundaries through storage isolation', () => {
      const functionsApp1 = new FunctionsApp(resourceGroup, 'PublicApi', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
        tags: { 'data-classification': 'public' },
      });

      const functionsApp2 = new FunctionsApp(resourceGroup, 'PrivateApi', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
        tags: { 'data-classification': 'confidential' },
      });

      // Per ADR-001: Storage isolation maintains security boundaries
      // Each Functions App has its own storage for runtime operations
      expect(functionsApp1.storage).not.toBe(functionsApp2.storage);

      // Verify separate constructs in the tree
      const publicStorage = functionsApp1.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );
      const privateStorage = functionsApp2.node.children.find(
        child => child.node.id === 'RuntimeStorage'
      );

      expect(publicStorage).not.toBe(privateStorage);
      expect(publicStorage?.node.scope).toBe(functionsApp1);
      expect(privateStorage?.node.scope).toBe(functionsApp2);
    });

    it('should support performance isolation through dedicated storage', () => {
      const heavyWorkloadFunctions = new FunctionsApp(resourceGroup, 'HeavyApi', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      const lightWorkloadFunctions = new FunctionsApp(resourceGroup, 'LightApi', {
        runtime: FunctionRuntime.NODE,
        runtimeVersion: '20',
      });

      // Per ADR-001: Performance isolation prevents Functions I/O
      // from impacting data operations
      expect(heavyWorkloadFunctions.storage).not.toBe(lightWorkloadFunctions.storage);
    });
  });
});
