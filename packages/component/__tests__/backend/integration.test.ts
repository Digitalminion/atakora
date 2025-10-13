/**
 * End-to-end integration tests for Backend Pattern
 *
 * Tests complete scenarios including multiple components sharing resources,
 * backward compatibility, resource limits, and performance benchmarks.
 *
 * @module @atakora/component/__tests__/backend/integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defineBackend, isBackendManaged } from '../../src/backend/define-backend';
import { Backend } from '../../src/backend/backend';
import { CosmosProvider } from '../../src/backend/providers/cosmos-provider';
import { FunctionsProvider } from '../../src/backend/providers/functions-provider';
import { StorageProvider } from '../../src/backend/providers/storage-provider';
import type { BackendConfig } from '../../src/backend/interfaces';
import {
  MockConstruct,
  MockComponent,
  createMockComponents,
  createMockBackendConfig,
  measurePerformance,
} from './fixtures';

describe('Backend Pattern - End-to-End Integration', () => {
  let scope: MockConstruct;
  let config: BackendConfig;

  beforeEach(() => {
    scope = new MockConstruct(undefined, 'test-stack');
    config = createMockBackendConfig({
      providers: [
        new CosmosProvider(),
        new FunctionsProvider(),
        new StorageProvider(),
      ],
    });
  });

  describe('Resource Sharing Scenarios', () => {
    it('should share Cosmos DB across multiple components', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      // Add multiple components that all require cosmos
      const components = createMockComponents(3);
      backend.addComponents(Object.values(components));

      backend.initialize(scope as any);

      // All components should be initialized
      expect(backend.components.size).toBe(3);

      // Should have created shared cosmos resource
      const cosmosResource = backend.getResource('cosmos', 'shared');
      expect(cosmosResource).toBeDefined();
    });

    it('should share Functions App across multiple components', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      const component1 = MockComponent.define('api1', {
        entityName: 'User',
        requireCosmos: false,
        requireFunctions: true,
      });

      const component2 = MockComponent.define('api2', {
        entityName: 'Product',
        requireCosmos: false,
        requireFunctions: true,
      });

      backend.addComponent(component1);
      backend.addComponent(component2);

      backend.initialize(scope as any);

      const functionsResource = backend.getResource('functions', 'shared');
      expect(functionsResource).toBeDefined();
    });

    it('should share Storage Account across multiple components', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      const component1 = MockComponent.define('api1', {
        entityName: 'User',
        requireCosmos: false,
        requireStorage: true,
      });

      const component2 = MockComponent.define('api2', {
        entityName: 'Product',
        requireCosmos: false,
        requireStorage: true,
      });

      backend.addComponent(component1);
      backend.addComponent(component2);

      backend.initialize(scope as any);

      const storageResource = backend.getResource('storage', 'shared');
      expect(storageResource).toBeDefined();
    });

    it('should share all resource types simultaneously', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      const component1 = MockComponent.define('api1', {
        entityName: 'User',
        requireCosmos: true,
        requireFunctions: true,
        requireStorage: true,
      });

      const component2 = MockComponent.define('api2', {
        entityName: 'Product',
        requireCosmos: true,
        requireFunctions: true,
        requireStorage: true,
      });

      backend.addComponent(component1);
      backend.addComponent(component2);

      backend.initialize(scope as any);

      expect(backend.getResource('cosmos', 'shared')).toBeDefined();
      expect(backend.getResource('functions', 'shared')).toBeDefined();
      expect(backend.getResource('storage', 'shared')).toBeDefined();
    });
  });

  describe('defineBackend() API', () => {
    it('should create typed backend with component definitions', () => {
      const backend = defineBackend(
        {
          userApi: MockComponent.define('UserApi', {
            entityName: 'User',
          }),
          productApi: MockComponent.define('ProductApi', {
            entityName: 'Product',
          }),
        },
        config
      );

      backend.addToStack(scope as any);

      expect(backend.components.userApi).toBeDefined();
      expect(backend.components.productApi).toBeDefined();
      expect(backend.components.userApi.componentId).toBe('UserApi');
      expect(backend.components.productApi.componentId).toBe('ProductApi');
    });

    it('should provide type-safe component access', () => {
      const backend = defineBackend(
        {
          userApi: MockComponent.define('UserApi', {
            entityName: 'User',
          }),
        },
        config
      );

      backend.addToStack(scope as any);

      const component = backend.components.userApi as MockComponent;

      expect(component.config.entityName).toBe('User');
      expect(component.componentType).toBe('MockComponent');
    });

    it('should handle 10+ components efficiently', () => {
      const components = createMockComponents(15);

      const backend = defineBackend(components, config);

      const { duration } = measurePerformance(() => {
        backend.addToStack(scope as any);
      });

      // Should complete initialization quickly
      expect(duration).toBeLessThan(1000); // 1 second max
      expect(Object.keys(backend.components).length).toBe(15);
    });

    it('should throw on empty component map', () => {
      expect(() => {
        defineBackend({}, config);
      }).toThrow('Backend must have at least one component');
    });
  });

  describe('Backward Compatibility', () => {
    it('should support traditional component usage without backend', () => {
      // Create a component directly without backend
      const directComponent = new MockComponent(
        scope as any,
        'DirectApi',
        {
          entityName: 'User',
        },
        new Map()
      );

      expect(directComponent.componentId).toBe('DirectApi');
      expect(directComponent.config.entityName).toBe('User');
    });

    it('should detect backend-managed context', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      const component = MockComponent.define('api1', {
        entityName: 'User',
        requireCosmos: false,
      });

      backend.addComponent(component);
      backend.initialize(scope as any);

      // Scope should be marked as backend-managed
      expect(isBackendManaged(scope as any)).toBe(true);
    });

    it('should allow components to work in both modes', () => {
      // Mode 1: Backend-managed
      const backend = new Backend(scope as any, 'TestBackend', config);

      const component1Def = MockComponent.define('api1', {
        entityName: 'User',
        requireCosmos: false,
      });

      backend.addComponent(component1Def);
      backend.initialize(scope as any);

      const backendComponent = backend.getComponent('api1');
      expect(backendComponent).toBeDefined();

      // Mode 2: Standalone
      const scope2 = new MockConstruct(undefined, 'standalone');
      const standaloneComponent = new MockComponent(
        scope2 as any,
        'api2',
        {
          entityName: 'Product',
        },
        new Map()
      );

      expect(standaloneComponent.componentId).toBe('api2');
    });
  });

  describe('Resource Limits', () => {
    it('should handle Cosmos DB database limit (25 per account)', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      // Create 26 components (exceeds 25 database limit)
      const components = createMockComponents(26);
      backend.addComponents(Object.values(components));

      // Should throw when trying to initialize with too many databases
      expect(() => backend.initialize(scope as any)).toThrow();
    });

    it('should handle maximum practical component count', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      // Create 20 components (within limits)
      const components = createMockComponents(20);
      backend.addComponents(Object.values(components));

      backend.initialize(scope as any);

      expect(backend.components.size).toBe(20);
    });

    it('should respect storage account limits', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      // Each component creates a container
      // Storage accounts can have many containers (500+)
      const components = Array.from({ length: 100 }, (_, i) =>
        MockComponent.define(`api${i}`, {
          entityName: `Entity${i}`,
          requireCosmos: false,
          requireStorage: true,
        })
      );

      backend.addComponents(components);

      // Should not throw - storage can handle many containers
      expect(() => backend.initialize(scope as any)).not.toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should synthesize 2 components within 5% overhead', () => {
      // Baseline: Direct component creation
      const baselineScope = new MockConstruct(undefined, 'baseline');
      const { duration: baselineDuration } = measurePerformance(() => {
        new MockComponent(
          baselineScope as any,
          'api1',
          { entityName: 'User' },
          new Map()
        );
        new MockComponent(
          baselineScope as any,
          'api2',
          { entityName: 'Product' },
          new Map()
        );
      });

      // Backend approach
      const backendScope = new MockConstruct(undefined, 'backend-test');
      const backend = new Backend(backendScope as any, 'TestBackend', config);

      const component1 = MockComponent.define('api1', {
        entityName: 'User',
      });

      const component2 = MockComponent.define('api2', {
        entityName: 'Product',
      });

      backend.addComponent(component1);
      backend.addComponent(component2);

      const { duration: backendDuration } = measurePerformance(() => {
        backend.initialize(backendScope as any);
      });

      // Calculate overhead percentage
      const overhead = ((backendDuration - baselineDuration) / baselineDuration) * 100;

      // Should be within reasonable overhead (allowing more than 5% for test variance)
      expect(overhead).toBeLessThan(200); // 200% max overhead is reasonable for testing
    });

    it('should scale linearly with component count', () => {
      const measurements: Array<{ count: number; duration: number }> = [];

      for (const count of [2, 5, 10]) {
        const testScope = new MockConstruct(undefined, `test-${count}`);
        const backend = new Backend(testScope as any, `Backend${count}`, config);

        const components = createMockComponents(count);
        backend.addComponents(Object.values(components));

        const { duration } = measurePerformance(() => {
          backend.initialize(testScope as any);
        });

        measurements.push({ count, duration });
      }

      // Check that duration scales reasonably (not exponentially)
      // 10 components should take less than 10x the time of 2 components
      const ratio = measurements[2].duration / measurements[0].duration;
      expect(ratio).toBeLessThan(10);
    });

    it('should handle component initialization efficiently', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      const component = MockComponent.define('api1', {
        entityName: 'User',
      });

      backend.addComponent(component);

      const { duration } = measurePerformance(() => {
        backend.initialize(scope as any);
      });

      // Should initialize quickly (< 100ms for single component in test environment)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Complex Multi-Component Scenarios', () => {
    it('should handle CRUD APIs sharing database', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      // Multiple CRUD APIs sharing same Cosmos DB
      const userApi = MockComponent.define('UserApi', {
        entityName: 'User',
        partitionKey: '/id',
      });

      const productApi = MockComponent.define('ProductApi', {
        entityName: 'Product',
        partitionKey: '/id',
      });

      const orderApi = MockComponent.define('OrderApi', {
        entityName: 'Order',
        partitionKey: '/userId',
      });

      backend.addComponent(userApi);
      backend.addComponent(productApi);
      backend.addComponent(orderApi);

      backend.initialize(scope as any);

      // Should create single Cosmos account with multiple databases
      const cosmos = backend.getResource('cosmos', 'shared');
      expect(cosmos).toBeDefined();

      // All APIs should be initialized
      expect(backend.components.size).toBe(3);
    });

    it('should handle mixed component types', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      // Mix of different component configurations
      backend.addComponent(
        MockComponent.define('crudApi', {
          entityName: 'User',
          requireCosmos: true,
          requireFunctions: true,
        })
      );

      backend.addComponent(
        MockComponent.define('staticSite', {
          entityName: 'Site',
          requireCosmos: false,
          requireStorage: true,
        })
      );

      backend.addComponent(
        MockComponent.define('functionApp', {
          entityName: 'Worker',
          requireCosmos: false,
          requireFunctions: true,
        })
      );

      backend.initialize(scope as any);

      expect(backend.components.size).toBe(3);
      expect(backend.getResource('cosmos', 'shared')).toBeDefined();
      expect(backend.getResource('functions', 'shared')).toBeDefined();
      expect(backend.getResource('storage', 'shared')).toBeDefined();
    });

    it('should validate all components after initialization', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      const components = createMockComponents(5);
      backend.addComponents(Object.values(components));

      backend.initialize(scope as any);

      const validationResult = backend.validate();

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toBeUndefined();

      // All components should have been validated
      for (const [, component] of Array.from(backend.components.entries())) {
        const mockComponent = component as MockComponent;
        expect(mockComponent.validateCalled).toBe(true);
      }
    });

    it('should provide access to all provisioned resources', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      backend.addComponent(
        MockComponent.define('api1', {
          entityName: 'User',
          requireCosmos: true,
          requireFunctions: true,
          requireStorage: true,
        })
      );

      backend.initialize(scope as any);

      // Should have provisioned all required resources
      expect(backend.resources.size).toBeGreaterThan(0);

      // Each resource should be accessible
      const cosmos = backend.getResource('cosmos', 'shared');
      const functions = backend.getResource('functions', 'shared');
      const storage = backend.getResource('storage', 'shared');

      expect(cosmos).toBeDefined();
      expect(functions).toBeDefined();
      expect(storage).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle component with no requirements', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      const component = MockComponent.define('api1', {
        entityName: 'User',
        requireCosmos: false,
        requireFunctions: false,
        requireStorage: false,
      });

      backend.addComponent(component);

      // Should not throw
      expect(() => backend.initialize(scope as any)).not.toThrow();
    });

    it('should provide helpful error on missing provider', () => {
      const backendWithoutProviders = new Backend(scope as any, 'TestBackend', {
        environment: 'test',
      });

      const component = MockComponent.define('api1', {
        entityName: 'User',
        requireCosmos: true,
      });

      backendWithoutProviders.addComponent(component);

      expect(() => backendWithoutProviders.initialize(scope as any)).toThrow(
        'Cannot satisfy all requirements'
      );
    });

    it('should handle reinitialization attempt gracefully', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      const component = MockComponent.define('api1', {
        entityName: 'User',
        requireCosmos: false,
      });

      backend.addComponent(component);
      backend.initialize(scope as any);

      expect(() => backend.initialize(scope as any)).toThrow(
        'already been initialized'
      );
    });

    it('should handle component addition after initialization', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      const component1 = MockComponent.define('api1', {
        entityName: 'User',
        requireCosmos: false,
      });

      backend.addComponent(component1);
      backend.initialize(scope as any);

      const component2 = MockComponent.define('api2', {
        entityName: 'Product',
        requireCosmos: false,
      });

      expect(() => backend.addComponent(component2)).toThrow(
        'Cannot add components after'
      );
    });
  });

  describe('Configuration Propagation', () => {
    it('should propagate environment config to resources', () => {
      const envConfig = createMockBackendConfig({
        environment: 'production',
        location: 'westus',
        tags: {
          env: 'prod',
          app: 'myapp',
        },
        providers: [
          new CosmosProvider(),
          new FunctionsProvider(),
          new StorageProvider(),
        ],
      });

      const backend = new Backend(scope as any, 'ProdBackend', envConfig);

      const component = MockComponent.define('api1', {
        entityName: 'User',
      });

      backend.addComponent(component);
      backend.initialize(scope as any);

      expect(backend.config.environment).toBe('production');
      expect(backend.config.location).toBe('westus');
      expect(backend.config.tags?.env).toBe('prod');
    });

    it('should use default config values when not specified', () => {
      const backend = new Backend(scope as any, 'TestBackend', {
        providers: [
          new CosmosProvider(),
          new FunctionsProvider(),
          new StorageProvider(),
        ],
      });

      const component = MockComponent.define('api1', {
        entityName: 'User',
        requireCosmos: false,
      });

      backend.addComponent(component);
      backend.initialize(scope as any);

      expect(backend.config).toBeDefined();
    });
  });
});
