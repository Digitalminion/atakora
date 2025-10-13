/**
 * Backward Compatibility Tests
 *
 * Verifies that backend-enabled components (CrudApi, FunctionsApp) maintain
 * backward compatibility with existing code that doesn't use the backend pattern.
 *
 * Key requirements:
 * - Traditional usage (without backend) must continue to work unchanged
 * - Backend usage (with defineBackend) must work correctly
 * - No breaking changes between the two modes
 * - Both modes produce functional resources
 *
 * @module @atakora/component/__tests__
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App, ResourceGroupStack } from '@atakora/cdk';
import { CrudApi } from '../src/crud/crud-api';
import { FunctionsApp } from '../src/functions/functions-app';
import { defineBackend } from '../src/backend';

describe('Backward Compatibility Tests', () => {
  let app: App;
  let stack: ResourceGroupStack;

  beforeEach(() => {
    // Create fresh app and stack for each test
    app = new App();
    stack = new ResourceGroupStack(app, 'TestStack', {
      resourceGroupName: 'rg-test-compatibility',
      location: 'eastus',
    });
  });

  // ==========================================================================
  // CrudApi Backward Compatibility Tests
  // ==========================================================================

  describe('CrudApi - Traditional Mode', () => {
    it('should work in traditional mode without backend', () => {
      // Traditional usage - no backend pattern
      const api = new CrudApi(stack, 'UserApi', {
        entityName: 'User',
        schema: {
          id: 'string',
          name: 'string',
          email: 'string',
        },
        partitionKey: '/id',
      });

      // Verify component is created and functional
      expect(api).toBeDefined();
      expect(api.componentId).toBe('UserApi');
      expect(api.componentType).toBe('CrudApi');
      expect(api.entityName).toBe('User');
      expect(api.entityNamePlural).toBe('Users');
      expect(api.databaseName).toBe('user-db');
      expect(api.containerName).toBe('users');
      expect(api.partitionKey).toBe('/id');
    });

    it('should create all required resources in traditional mode', () => {
      const api = new CrudApi(stack, 'ProductApi', {
        entityName: 'Product',
        schema: {
          id: 'string',
          name: 'string',
        },
        partitionKey: '/id',
      });

      // Verify all resources are created
      expect(api.database).toBeDefined();
      expect(api.functionsApp).toBeDefined();
      expect(api.database.documentEndpoint).toBeDefined();
      expect(api.functionsApp.functionApp).toBeDefined();
      expect(api.functionsApp.functionAppName).toBeDefined();
    });

    it('should generate CRUD operations in traditional mode', () => {
      const api = new CrudApi(stack, 'OrderApi', {
        entityName: 'Order',
        schema: {
          id: 'string',
          total: 'number',
        },
        partitionKey: '/id',
      });

      // Verify operations are generated
      expect(api.operations).toBeDefined();
      expect(Array.isArray(api.operations)).toBe(true);
      expect(api.operations.length).toBe(5); // create, read, update, delete, list

      // Verify operation types
      const operationNames = api.operations.map(op => op.operation);
      expect(operationNames).toContain('create');
      expect(operationNames).toContain('read');
      expect(operationNames).toContain('update');
      expect(operationNames).toContain('delete');
      expect(operationNames).toContain('list');
    });

    it('should create independent resources for multiple components', () => {
      const userApi = new CrudApi(stack, 'UserApi', {
        entityName: 'User',
        schema: { id: 'string', name: 'string' },
        partitionKey: '/id',
      });

      const productApi = new CrudApi(stack, 'ProductApi', {
        entityName: 'Product',
        schema: { id: 'string', name: 'string' },
        partitionKey: '/id',
      });

      // In traditional mode, each component should have its own resources
      expect(userApi.database).toBeDefined();
      expect(productApi.database).toBeDefined();

      // They should be different instances
      expect(userApi.database).not.toBe(productApi.database);
      expect(userApi.functionsApp).not.toBe(productApi.functionsApp);

      // Each should have unique database and container names
      expect(userApi.databaseName).toBe('user-db');
      expect(productApi.databaseName).toBe('product-db');
      expect(userApi.containerName).toBe('users');
      expect(productApi.containerName).toBe('products');
    });

    it('should respect custom configuration in traditional mode', () => {
      const api = new CrudApi(stack, 'CustomApi', {
        entityName: 'Item',
        entityNamePlural: 'Items',
        databaseName: 'custom-database',
        containerName: 'custom-container',
        partitionKey: '/customId',
        schema: { customId: 'string' },
        location: 'westus',
      });

      // Verify custom configuration is applied
      expect(api.entityName).toBe('Item');
      expect(api.entityNamePlural).toBe('Items');
      expect(api.databaseName).toBe('custom-database');
      expect(api.containerName).toBe('custom-container');
      expect(api.partitionKey).toBe('/customId');
    });

    it('should support monitoring configuration in traditional mode', () => {
      const api = new CrudApi(stack, 'MonitoredApi', {
        entityName: 'Event',
        schema: { id: 'string' },
        enableMonitoring: true,
        logRetentionInDays: 60,
      });

      // Verify monitoring resources are created
      expect(api.logAnalyticsWorkspace).toBeDefined();
      expect(api.applicationInsights).toBeDefined();
    });

    it('should generate function code in traditional mode', () => {
      const api = new CrudApi(stack, 'FunctionApi', {
        entityName: 'Record',
        schema: {
          id: 'string',
          data: 'string',
        },
      });

      // Verify generated functions
      expect(api.generatedFunctions).toBeDefined();
      expect(api.generatedFunctions.functions).toBeDefined();
      expect(api.generatedFunctions.functions.length).toBeGreaterThan(0);
      expect(api.generatedFunctions.environmentVariables).toBeDefined();
    });
  });

  describe('CrudApi - Backend Mode', () => {
    it('should work in backend mode with defineBackend', () => {
      // Backend pattern usage
      const backend = defineBackend({
        userApi: CrudApi.define('UserApi', {
          entityName: 'User',
          schema: {
            id: 'string',
            name: 'string',
          },
          partitionKey: '/id',
        }),
      });

      backend.addToStack(stack);

      // Verify component is created via backend
      expect(backend.components.userApi).toBeDefined();
      expect(backend.components.userApi.componentId).toBe('UserApi');
      expect(backend.components.userApi.componentType).toBe('CrudApi');
      expect(backend.components.userApi.entityName).toBe('User');
      expect(backend.components.userApi.databaseName).toBeDefined();
      expect(backend.components.userApi.partitionKey).toBe('/id');
    });

    it('should create resources for multiple components in backend mode', () => {
      const backend = defineBackend({
        userApi: CrudApi.define('UserApi', {
          entityName: 'User',
          schema: { id: 'string' },
        }),
        productApi: CrudApi.define('ProductApi', {
          entityName: 'Product',
          schema: { id: 'string' },
        }),
      });

      backend.addToStack(stack);

      // Verify both components are created
      expect(backend.components.userApi).toBeDefined();
      expect(backend.components.productApi).toBeDefined();

      // Verify each has proper configuration
      expect(backend.components.userApi.entityName).toBe('User');
      expect(backend.components.productApi.entityName).toBe('Product');
    });

    it('should generate operations in backend mode', () => {
      const backend = defineBackend({
        orderApi: CrudApi.define('OrderApi', {
          entityName: 'Order',
          schema: { id: 'string' },
        }),
      });

      backend.addToStack(stack);

      // Verify operations are generated
      const api = backend.components.orderApi;
      expect(api.operations).toBeDefined();
      expect(api.operations.length).toBe(5);
    });

    it('should validate backend resources', () => {
      const backend = defineBackend({
        testApi: CrudApi.define('TestApi', {
          entityName: 'Test',
          schema: { id: 'string' },
        }),
      });

      backend.addToStack(stack);

      // Validate backend
      const validation = backend.validate();
      expect(validation).toBeDefined();
      expect(validation.valid).toBe(true);
    });

    it('should provide resource access in backend mode', () => {
      const backend = defineBackend({
        dataApi: CrudApi.define('DataApi', {
          entityName: 'Data',
          schema: { id: 'string' },
        }),
      });

      backend.addToStack(stack);

      // Verify resource access
      expect(backend.resources).toBeDefined();
      expect(backend.resources.size).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // FunctionsApp Backward Compatibility Tests
  // ==========================================================================

  describe('FunctionsApp - Traditional Mode', () => {
    it('should work in traditional mode without backend', () => {
      const functionsApp = new FunctionsApp(stack, 'ApiFunction', {
        runtime: 'node',
        runtimeVersion: '20',
        environment: {
          NODE_ENV: 'production',
        },
      });

      // Verify component is created
      expect(functionsApp).toBeDefined();
      expect(functionsApp.componentId).toBe('ApiFunction');
      expect(functionsApp.componentType).toBe('FunctionsApp');
      expect(functionsApp.location).toBe('eastus');
    });

    it('should create all required resources in traditional mode', () => {
      const functionsApp = new FunctionsApp(stack, 'WebFunction', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      // Verify all resources are created
      expect(functionsApp.functionApp).toBeDefined();
      expect(functionsApp.plan).toBeDefined();
      expect(functionsApp.storage).toBeDefined();
      expect(functionsApp.functionAppName).toBeDefined();
      expect(functionsApp.defaultHostName).toBeDefined();
      expect(functionsApp.functionAppId).toBeDefined();
    });

    it('should add environment variables in traditional mode', () => {
      const functionsApp = new FunctionsApp(stack, 'ConfiguredFunction', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      // Add environment variable
      functionsApp.addEnvironmentVariable('API_KEY', 'test-key-value');

      // Verify environment variable is added
      expect(functionsApp.environment['API_KEY']).toBe('test-key-value');
    });

    it('should add multiple environment variables in traditional mode', () => {
      const functionsApp = new FunctionsApp(stack, 'MultiEnvFunction', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      // Add multiple environment variables
      functionsApp.addEnvironmentVariables({
        API_KEY: 'test-key',
        LOG_LEVEL: 'debug',
        FEATURE_FLAG: 'enabled',
      });

      // Verify all environment variables are added
      expect(functionsApp.environment['API_KEY']).toBe('test-key');
      expect(functionsApp.environment['LOG_LEVEL']).toBe('debug');
      expect(functionsApp.environment['FEATURE_FLAG']).toBe('enabled');
    });

    it('should support different runtimes in traditional mode', () => {
      const nodeApp = new FunctionsApp(stack, 'NodeFunction', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      const pythonApp = new FunctionsApp(stack, 'PythonFunction', {
        runtime: 'python',
        runtimeVersion: '3.11',
      });

      // Verify both are created
      expect(nodeApp.functionApp).toBeDefined();
      expect(pythonApp.functionApp).toBeDefined();
    });

    it('should create independent resources for multiple functions apps', () => {
      const api1 = new FunctionsApp(stack, 'ApiFunction1', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      const api2 = new FunctionsApp(stack, 'ApiFunction2', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      // Each should have its own resources
      expect(api1.storage).not.toBe(api2.storage);
      expect(api1.functionApp).not.toBe(api2.functionApp);
      expect(api1.plan).toBeDefined();
      expect(api2.plan).toBeDefined();
    });
  });

  describe('FunctionsApp - Backend Mode', () => {
    it('should work in backend mode with defineBackend', () => {
      const backend = defineBackend({
        functions: FunctionsApp.define('ApiFunction', {
          runtime: 'node',
          runtimeVersion: '20',
        }),
      });

      backend.addToStack(stack);

      // Verify component is created
      expect(backend.components.functions).toBeDefined();
      expect(backend.components.functions.componentId).toBe('ApiFunction');
      expect(backend.components.functions.functionApp).toBeDefined();
    });

    it('should support environment variables in backend mode', () => {
      const backend = defineBackend({
        functions: FunctionsApp.define('ConfiguredFunction', {
          runtime: 'node',
          runtimeVersion: '20',
          environment: {
            API_KEY: 'backend-key',
            LOG_LEVEL: 'info',
          },
        }),
      });

      backend.addToStack(stack);

      // Verify environment variables
      const functionsApp = backend.components.functions;
      expect(functionsApp.environment['API_KEY']).toBe('backend-key');
      expect(functionsApp.environment['LOG_LEVEL']).toBe('info');
    });

    it('should allow environment variable additions in backend mode', () => {
      const backend = defineBackend({
        functions: FunctionsApp.define('DynamicFunction', {
          runtime: 'node',
          runtimeVersion: '20',
        }),
      });

      backend.addToStack(stack);

      // Add environment variable after initialization
      const functionsApp = backend.components.functions;
      functionsApp.addEnvironmentVariable('DYNAMIC_KEY', 'dynamic-value');

      // Verify it's added
      expect(functionsApp.environment['DYNAMIC_KEY']).toBe('dynamic-value');
    });

    it('should validate backend resources', () => {
      const backend = defineBackend({
        functions: FunctionsApp.define('ValidatedFunction', {
          runtime: 'node',
          runtimeVersion: '20',
        }),
      });

      backend.addToStack(stack);

      // Validate backend
      const validation = backend.validate();
      expect(validation).toBeDefined();
      expect(validation.valid).toBe(true);
    });
  });

  // ==========================================================================
  // Mixed Usage Tests
  // ==========================================================================

  describe('Mixed Usage - Traditional and Backend Together', () => {
    it('should allow traditional and backend components in same stack', () => {
      // Create traditional component
      const traditionalApi = new CrudApi(stack, 'TraditionalApi', {
        entityName: 'Traditional',
        schema: { id: 'string' },
      });

      // Create backend components
      const backend = defineBackend({
        backendApi: CrudApi.define('BackendApi', {
          entityName: 'Backend',
          schema: { id: 'string' },
        }),
      });

      backend.addToStack(stack);

      // Both should exist
      expect(traditionalApi).toBeDefined();
      expect(backend.components.backendApi).toBeDefined();

      // They should be independent
      expect(traditionalApi.database).toBeDefined();
      expect(backend.components.backendApi.database).toBeDefined();
    });

    it('should allow traditional functions and backend functions together', () => {
      // Traditional functions app
      const traditionalFunc = new FunctionsApp(stack, 'TraditionalFunc', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      // Backend functions app
      const backend = defineBackend({
        backendFunc: FunctionsApp.define('BackendFunc', {
          runtime: 'node',
          runtimeVersion: '20',
        }),
      });

      backend.addToStack(stack);

      // Both should exist
      expect(traditionalFunc.functionApp).toBeDefined();
      expect(backend.components.backendFunc.functionApp).toBeDefined();

      // They should be independent
      expect(traditionalFunc.storage).not.toBe(backend.components.backendFunc.storage);
    });

    it('should not interfere with each other', () => {
      // Create traditional component with specific config
      const traditional = new CrudApi(stack, 'TraditionalMixed', {
        entityName: 'TradItem',
        databaseName: 'trad-db',
      });

      // Create backend component with different config
      const backend = defineBackend({
        backendMixed: CrudApi.define('BackendMixed', {
          entityName: 'BackItem',
          databaseName: 'back-db',
        }),
      });

      backend.addToStack(stack);

      // Verify they don't interfere
      expect(traditional.databaseName).toBe('trad-db');
      expect(backend.components.backendMixed.databaseName).toBe('back-db');
    });
  });

  // ==========================================================================
  // API Compatibility Tests
  // ==========================================================================

  describe('API Compatibility - Same Public Interface', () => {
    it('should maintain same public API surface for CrudApi', () => {
      // Traditional mode
      const traditional = new CrudApi(stack, 'TraditionalCompatApi', {
        entityName: 'User',
        schema: { id: 'string' },
      });

      // Backend mode
      const backend = defineBackend({
        backendCompatApi: CrudApi.define('BackendCompatApi', {
          entityName: 'User',
          schema: { id: 'string' },
        }),
      });
      backend.addToStack(stack);

      // Both should have the same core properties
      const traditionalProps = [
        'componentId',
        'componentType',
        'database',
        'functionsApp',
        'databaseName',
        'containerName',
        'entityName',
        'entityNamePlural',
        'operations',
        'partitionKey',
        'config',
      ];

      for (const prop of traditionalProps) {
        expect(traditional).toHaveProperty(prop);
        expect(backend.components.backendCompatApi).toHaveProperty(prop);
      }
    });

    it('should maintain same public API surface for FunctionsApp', () => {
      // Traditional mode
      const traditional = new FunctionsApp(stack, 'TraditionalFuncCompat', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      // Backend mode
      const backend = defineBackend({
        backendFuncCompat: FunctionsApp.define('BackendFuncCompat', {
          runtime: 'node',
          runtimeVersion: '20',
        }),
      });
      backend.addToStack(stack);

      // Both should have the same core properties
      const functionsProps = [
        'componentId',
        'componentType',
        'functionApp',
        'plan',
        'storage',
        'functionAppName',
        'defaultHostName',
        'functionAppId',
        'location',
        'environment',
        'config',
      ];

      for (const prop of functionsProps) {
        expect(traditional).toHaveProperty(prop);
        expect(backend.components.backendFuncCompat).toHaveProperty(prop);
      }
    });

    it('should maintain same method interfaces for FunctionsApp', () => {
      // Traditional mode
      const traditional = new FunctionsApp(stack, 'TraditionalMethodApi', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      // Backend mode
      const backend = defineBackend({
        backendMethodApi: FunctionsApp.define('BackendMethodApi', {
          runtime: 'node',
          runtimeVersion: '20',
        }),
      });
      backend.addToStack(stack);

      // Both should have the same methods
      expect(typeof traditional.addEnvironmentVariable).toBe('function');
      expect(typeof traditional.addEnvironmentVariables).toBe('function');
      expect(typeof traditional.getRequirements).toBe('function');
      expect(typeof traditional.validateResources).toBe('function');
      expect(typeof traditional.getOutputs).toBe('function');

      expect(typeof backend.components.backendMethodApi.addEnvironmentVariable).toBe('function');
      expect(typeof backend.components.backendMethodApi.addEnvironmentVariables).toBe('function');
      expect(typeof backend.components.backendMethodApi.getRequirements).toBe('function');
      expect(typeof backend.components.backendMethodApi.validateResources).toBe('function');
      expect(typeof backend.components.backendMethodApi.getOutputs).toBe('function');
    });

    it('should maintain same getter behavior', () => {
      // Traditional mode
      const traditional = new CrudApi(stack, 'TraditionalGetterApi', {
        entityName: 'Product',
        schema: { id: 'string' },
      });

      // Backend mode
      const backend = defineBackend({
        backendGetterApi: CrudApi.define('BackendGetterApi', {
          entityName: 'Product',
          schema: { id: 'string' },
        }),
      });
      backend.addToStack(stack);

      // Both should have apiEndpoint getter
      expect(traditional.apiEndpoint).toBeDefined();
      expect(typeof traditional.apiEndpoint).toBe('string');
      expect(backend.components.backendGetterApi.apiEndpoint).toBeDefined();
      expect(typeof backend.components.backendGetterApi.apiEndpoint).toBe('string');
    });
  });

  // ==========================================================================
  // Configuration Preservation Tests
  // ==========================================================================

  describe('Configuration Preservation', () => {
    it('should preserve custom partition key in both modes', () => {
      // Traditional
      const traditional = new CrudApi(stack, 'TraditionalPartition', {
        entityName: 'Item',
        schema: { customKey: 'string' },
        partitionKey: '/customKey',
      });

      // Backend
      const backend = defineBackend({
        backendPartition: CrudApi.define('BackendPartition', {
          entityName: 'Item',
          schema: { customKey: 'string' },
          partitionKey: '/customKey',
        }),
      });
      backend.addToStack(stack);

      // Both should preserve custom partition key
      expect(traditional.partitionKey).toBe('/customKey');
      expect(backend.components.backendPartition.partitionKey).toBe('/customKey');
    });

    it('should preserve custom entity names in both modes', () => {
      // Traditional
      const traditional = new CrudApi(stack, 'TraditionalEntity', {
        entityName: 'Person',
        entityNamePlural: 'People',
        schema: { id: 'string' },
      });

      // Backend
      const backend = defineBackend({
        backendEntity: CrudApi.define('BackendEntity', {
          entityName: 'Person',
          entityNamePlural: 'People',
          schema: { id: 'string' },
        }),
      });
      backend.addToStack(stack);

      // Both should preserve custom entity names
      expect(traditional.entityName).toBe('Person');
      expect(traditional.entityNamePlural).toBe('People');
      expect(backend.components.backendEntity.entityName).toBe('Person');
      expect(backend.components.backendEntity.entityNamePlural).toBe('People');
    });

    it('should preserve runtime configuration in both modes', () => {
      // Traditional
      const traditional = new FunctionsApp(stack, 'TraditionalRuntime', {
        runtime: 'python',
        runtimeVersion: '3.11',
      });

      // Backend
      const backend = defineBackend({
        backendRuntime: FunctionsApp.define('BackendRuntime', {
          runtime: 'python',
          runtimeVersion: '3.11',
        }),
      });
      backend.addToStack(stack);

      // Both should have function apps created
      expect(traditional.functionApp).toBeDefined();
      expect(backend.components.backendRuntime.functionApp).toBeDefined();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling Consistency', () => {
    it('should throw error when accessing backend components before initialization', () => {
      const backend = defineBackend({
        uninitApi: CrudApi.define('UninitApi', {
          entityName: 'Test',
          schema: { id: 'string' },
        }),
      });

      // Should throw when accessing components before initialization
      expect(() => {
        backend.components.uninitApi;
      }).toThrow(/Cannot access components before backend initialization/);
    });

    it('should throw error when adding components after initialization', () => {
      const backend = defineBackend({
        initialApi: CrudApi.define('InitialApi', {
          entityName: 'Test',
          schema: { id: 'string' },
        }),
      });

      backend.addToStack(stack);

      // Should throw when adding components after initialization
      expect(() => {
        backend.addComponent(
          CrudApi.define('LateApi', {
            entityName: 'Late',
            schema: { id: 'string' },
          })
        );
      }).toThrow(/Cannot add components after backend has been initialized/);
    });

    it('should throw error when initializing twice', () => {
      const backend = defineBackend({
        doubleApi: CrudApi.define('DoubleApi', {
          entityName: 'Test',
          schema: { id: 'string' },
        }),
      });

      backend.addToStack(stack);

      // Should throw when initializing again
      expect(() => {
        backend.addToStack(stack);
      }).toThrow(/Backend has already been initialized/);
    });
  });

  // ==========================================================================
  // Type Safety Tests
  // ==========================================================================

  describe('Type Safety', () => {
    it('should provide type-safe component access in backend mode', () => {
      const backend = defineBackend({
        typedApi: CrudApi.define('TypedApi', {
          entityName: 'TypedEntity',
          schema: { id: 'string' },
        }),
        typedFunc: FunctionsApp.define('TypedFunc', {
          runtime: 'node',
          runtimeVersion: '20',
        }),
      });

      backend.addToStack(stack);

      // Type-safe access should work
      const api = backend.components.typedApi;
      const func = backend.components.typedFunc;

      expect(api.componentType).toBe('CrudApi');
      expect(func.componentType).toBe('FunctionsApp');
    });

    it('should maintain component type information', () => {
      // Traditional
      const traditionalApi = new CrudApi(stack, 'TraditionalType', {
        entityName: 'Item',
        schema: { id: 'string' },
      });

      const traditionalFunc = new FunctionsApp(stack, 'TraditionalFuncType', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      // Backend
      const backend = defineBackend({
        backendType: CrudApi.define('BackendType', {
          entityName: 'Item',
          schema: { id: 'string' },
        }),
        backendFuncType: FunctionsApp.define('BackendFuncType', {
          runtime: 'node',
          runtimeVersion: '20',
        }),
      });
      backend.addToStack(stack);

      // All should maintain correct type
      expect(traditionalApi.componentType).toBe('CrudApi');
      expect(traditionalFunc.componentType).toBe('FunctionsApp');
      expect(backend.components.backendType.componentType).toBe('CrudApi');
      expect(backend.components.backendFuncType.componentType).toBe('FunctionsApp');
    });
  });

  // ==========================================================================
  // Resource Access Tests
  // ==========================================================================

  describe('Resource Access', () => {
    it('should provide access to all resources in traditional mode', () => {
      const api = new CrudApi(stack, 'ResourceApi', {
        entityName: 'Resource',
        schema: { id: 'string' },
      });

      // All resources should be accessible
      expect(api.database).toBeDefined();
      expect(api.functionsApp).toBeDefined();
      expect(api.operations).toBeDefined();
      expect(api.generatedFunctions).toBeDefined();
    });

    it('should provide access to all resources in backend mode', () => {
      const backend = defineBackend({
        resourceApi: CrudApi.define('ResourceApi', {
          entityName: 'Resource',
          schema: { id: 'string' },
        }),
      });

      backend.addToStack(stack);

      const api = backend.components.resourceApi;

      // All resources should be accessible
      expect(api.database).toBeDefined();
      expect(api.functionsApp).toBeDefined();
      expect(api.operations).toBeDefined();
    });

    it('should allow method calls on components in both modes', () => {
      // Traditional
      const traditional = new FunctionsApp(stack, 'MethodTraditional', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      // Backend
      const backend = defineBackend({
        methodBackend: FunctionsApp.define('MethodBackend', {
          runtime: 'node',
          runtimeVersion: '20',
        }),
      });
      backend.addToStack(stack);

      // Both should allow addEnvironmentVariable calls
      expect(() => {
        traditional.addEnvironmentVariable('TEST_VAR', 'test-value');
      }).not.toThrow();

      expect(() => {
        backend.components.methodBackend.addEnvironmentVariable('TEST_VAR', 'test-value');
      }).not.toThrow();

      // Verify variables were added
      expect(traditional.environment['TEST_VAR']).toBe('test-value');
      expect(backend.components.methodBackend.environment['TEST_VAR']).toBe('test-value');
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration - Full Workflow', () => {
    it('should support complete traditional workflow', () => {
      // Create CRUD API
      const api = new CrudApi(stack, 'FullTraditionalApi', {
        entityName: 'Order',
        schema: {
          id: 'string',
          customerId: 'string',
          total: 'number',
        },
        partitionKey: '/customerId',
      });

      // Verify API is created
      expect(api).toBeDefined();
      expect(api.database).toBeDefined();
      expect(api.functionsApp).toBeDefined();

      // Add environment variables
      api.functionsApp.addEnvironmentVariable('CUSTOM_CONFIG', 'value');
      expect(api.functionsApp.environment['CUSTOM_CONFIG']).toBe('value');

      // Verify operations
      expect(api.operations.length).toBe(5);

      // Verify API endpoint
      expect(api.apiEndpoint).toBeDefined();
    });

    it('should support complete backend workflow', () => {
      // Create backend with multiple components
      const backend = defineBackend(
        {
          userApi: CrudApi.define('UserApi', {
            entityName: 'User',
            schema: {
              id: 'string',
              email: 'string',
            },
          }),
          orderApi: CrudApi.define('OrderApi', {
            entityName: 'Order',
            schema: {
              id: 'string',
              userId: 'string',
            },
          }),
          functions: FunctionsApp.define('SharedFunctions', {
            runtime: 'node',
            runtimeVersion: '20',
          }),
        },
        {
          environment: 'test',
          location: 'eastus',
        }
      );

      // Initialize backend
      backend.addToStack(stack);

      // Verify all components are created
      expect(backend.components.userApi).toBeDefined();
      expect(backend.components.orderApi).toBeDefined();
      expect(backend.components.functions).toBeDefined();

      // Verify component properties
      expect(backend.components.userApi.entityName).toBe('User');
      expect(backend.components.orderApi.entityName).toBe('Order');

      // Add environment variables
      backend.components.functions.addEnvironmentVariable('SHARED_CONFIG', 'shared-value');
      expect(backend.components.functions.environment['SHARED_CONFIG']).toBe('shared-value');

      // Validate backend
      const validation = backend.validate();
      expect(validation.valid).toBe(true);
    });

    it('should support mixed traditional and backend workflow', () => {
      // Create traditional components
      const traditionalApi = new CrudApi(stack, 'LegacyApi', {
        entityName: 'Legacy',
        schema: { id: 'string' },
      });

      const traditionalFunc = new FunctionsApp(stack, 'LegacyFunc', {
        runtime: 'node',
        runtimeVersion: '20',
      });

      // Create backend components
      const backend = defineBackend({
        modernApi: CrudApi.define('ModernApi', {
          entityName: 'Modern',
          schema: { id: 'string' },
        }),
        modernFunc: FunctionsApp.define('ModernFunc', {
          runtime: 'node',
          runtimeVersion: '20',
        }),
      });

      backend.addToStack(stack);

      // Verify all components coexist
      expect(traditionalApi).toBeDefined();
      expect(traditionalFunc).toBeDefined();
      expect(backend.components.modernApi).toBeDefined();
      expect(backend.components.modernFunc).toBeDefined();

      // Verify independence
      expect(traditionalApi.database).not.toBe(backend.components.modernApi.database);
      expect(traditionalFunc.storage).not.toBe(backend.components.modernFunc.storage);
    });
  });
});
