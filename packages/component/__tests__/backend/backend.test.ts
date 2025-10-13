/**
 * Unit tests for Backend class
 *
 * Tests the core Backend orchestration, component registration,
 * requirement collection, and resource provisioning.
 *
 * @module @atakora/component/__tests__/backend/backend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Backend } from '../../src/backend/backend';
import { ProviderRegistry } from '../../src/backend/registry';
import type {
  IComponentDefinition,
  IResourceRequirement,
  BackendConfig,
} from '../../src/backend/interfaces';
import {
  MockConstruct,
  MockComponent,
  MockResourceProvider,
  createMockComponentDefinition,
  createMockBackendConfig,
  createMockProviderContext,
  createMockComponents,
} from './fixtures';

describe('Backend', () => {
  let scope: MockConstruct;
  let config: BackendConfig;

  beforeEach(() => {
    scope = new MockConstruct(undefined, 'test-scope');
    config = createMockBackendConfig();
  });

  describe('constructor', () => {
    it('should create backend with default config', () => {
      const backend = new Backend(scope as any, 'TestBackend');

      expect(backend.backendId).toBe('TestBackend');
      expect(backend.config).toBeDefined();
      expect(backend.components.size).toBe(0);
      expect(backend.resources.size).toBe(0);
    });

    it('should create backend with custom config', () => {
      const customConfig = createMockBackendConfig({
        environment: 'production',
        location: 'westus',
        tags: { app: 'myapp', env: 'prod' },
      });

      const backend = new Backend(scope as any, 'TestBackend', customConfig);

      expect(backend.config.environment).toBe('production');
      expect(backend.config.location).toBe('westus');
      expect(backend.config.tags).toEqual({ app: 'myapp', env: 'prod' });
    });

    it('should register custom providers', () => {
      const mockProvider = new MockResourceProvider('custom', ['custom']);
      const customConfig = createMockBackendConfig({
        providers: [mockProvider],
      });

      const backend = new Backend(scope as any, 'TestBackend', customConfig);

      expect(backend.config.providers).toContain(mockProvider);
    });

    it('should mark scope as backend-managed', () => {
      new Backend(scope as any, 'TestBackend', config);

      const isManaged = scope.node.tryGetContext('atakora:backend-managed');
      const backendId = scope.node.tryGetContext('atakora:backend-id');

      expect(isManaged).toBe(true);
      expect(backendId).toBe('TestBackend');
    });
  });

  describe('addComponent', () => {
    it('should add a single component', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);
      const component = createMockComponentDefinition('user-api');

      backend.addComponent(component);

      // Components are not accessible until initialization
      expect(backend.components.size).toBe(0);
    });

    it('should add multiple components', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);
      const components = createMockComponents(3);

      backend.addComponents(Object.values(components));

      // Components are not accessible until initialization
      expect(backend.components.size).toBe(0);
    });

    it('should throw on duplicate component ID', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);
      const component = createMockComponentDefinition('user-api');

      backend.addComponent(component);

      expect(() => backend.addComponent(component)).toThrow(
        'Component with ID "user-api" already exists'
      );
    });

    it('should throw on missing component ID', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);
      const invalidComponent = {
        componentId: '',
        componentType: 'Test',
        config: {},
        factory: () => ({}) as any,
      };

      expect(() => backend.addComponent(invalidComponent)).toThrow(
        'Component must have a componentId'
      );
    });

    it('should throw when adding after initialization', () => {
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [new MockResourceProvider('mock', ['mock'])],
      });

      const component = createMockComponentDefinition('api1', {
        entityName: 'Entity1',
        requireCosmos: false,
      });

      backend.addComponent(component);
      backend.initialize(scope as any);

      const component2 = createMockComponentDefinition('api2');

      expect(() => backend.addComponent(component2)).toThrow(
        'Cannot add components after backend has been initialized'
      );
    });
  });

  describe('initialize', () => {
    it('should initialize backend with single component', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const component = createMockComponentDefinition('user-api');
      backend.addComponent(component);

      backend.initialize(scope as any);

      expect(backend.components.size).toBe(1);
      expect(mockProvider.provisionCalled).toBe(true);
    });

    it('should initialize backend with multiple components', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const components = createMockComponents(3);
      backend.addComponents(Object.values(components));

      backend.initialize(scope as any);

      expect(backend.components.size).toBe(3);
      expect(mockProvider.provisionCalled).toBe(true);
    });

    it('should throw if already initialized', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const component = createMockComponentDefinition('api1', {
        entityName: 'Entity1',
        requireCosmos: false,
      });
      backend.addComponent(component);

      backend.initialize(scope as any);

      expect(() => backend.initialize(scope as any)).toThrow(
        'Backend has already been initialized'
      );
    });

    it('should throw if no provider for requirement', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      const component = createMockComponentDefinition('user-api');
      backend.addComponent(component);

      expect(() => backend.initialize(scope as any)).toThrow(
        'Cannot satisfy all requirements'
      );
    });

    it('should call component initialize methods', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const component = createMockComponentDefinition('user-api');
      backend.addComponent(component);

      backend.initialize(scope as any);

      const initializedComponent = backend.getComponent('user-api') as MockComponent;
      expect(initializedComponent).toBeDefined();
      expect(initializedComponent.initializeCalled).toBe(true);
    });

    it('should merge requirements with same key', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      // Both components require cosmos with same key
      const components = createMockComponents(2);
      backend.addComponents(Object.values(components));

      backend.initialize(scope as any);

      expect(mockProvider.mergeRequirementsCalled).toBe(true);
    });
  });

  describe('addToStack', () => {
    it('should initialize backend when added to stack', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const component = createMockComponentDefinition('user-api');
      backend.addComponent(component);

      backend.addToStack(scope as any);

      expect(backend.components.size).toBe(1);
      expect(mockProvider.provisionCalled).toBe(true);
    });
  });

  describe('getResource', () => {
    it('should return resource by type and key', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const component = createMockComponentDefinition('user-api');
      backend.addComponent(component);
      backend.initialize(scope as any);

      const resource = backend.getResource('cosmos', 'shared');

      expect(resource).toBeDefined();
    });

    it('should return undefined for non-existent resource', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const component = createMockComponentDefinition('user-api');
      backend.addComponent(component);
      backend.initialize(scope as any);

      const resource = backend.getResource('nonexistent', 'key');

      expect(resource).toBeUndefined();
    });
  });

  describe('getComponent', () => {
    it('should return component by ID', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const component = createMockComponentDefinition('user-api');
      backend.addComponent(component);
      backend.initialize(scope as any);

      const retrievedComponent = backend.getComponent('user-api');

      expect(retrievedComponent).toBeDefined();
      expect(retrievedComponent?.componentId).toBe('user-api');
    });

    it('should return undefined for non-existent component', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const component = createMockComponentDefinition('user-api');
      backend.addComponent(component);
      backend.initialize(scope as any);

      const retrievedComponent = backend.getComponent('nonexistent');

      expect(retrievedComponent).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('should validate successfully after initialization', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const component = createMockComponentDefinition('user-api');
      backend.addComponent(component);
      backend.initialize(scope as any);

      const result = backend.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should fail validation before initialization', () => {
      const backend = new Backend(scope as any, 'TestBackend', config);

      const result = backend.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Backend has not been initialized');
    });

    it('should call component validate methods', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const component = createMockComponentDefinition('user-api');
      backend.addComponent(component);
      backend.initialize(scope as any);

      backend.validate();

      const validatedComponent = backend.getComponent('user-api') as MockComponent;
      expect(validatedComponent.validateCalled).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw descriptive error on initialization failure', () => {
      const failingProvider = new MockResourceProvider('failing', ['cosmos']);
      failingProvider.provideResource = () => {
        throw new Error('Provision failed');
      };

      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [failingProvider],
      });

      const component = createMockComponentDefinition('user-api');
      backend.addComponent(component);

      expect(() => backend.initialize(scope as any)).toThrow(
        'Failed to initialize backend "TestBackend"'
      );
    });

    it('should throw descriptive error on component initialization failure', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const failingComponent: IComponentDefinition = {
        componentId: 'failing-component',
        componentType: 'Failing',
        config: {},
        factory: () => {
          throw new Error('Component creation failed');
        },
      };

      backend.addComponent(failingComponent);

      expect(() => backend.initialize(scope as any)).toThrow(
        'Failed to initialize backend "TestBackend"'
      );
    });
  });

  describe('resource provisioning', () => {
    it('should provision resources in correct order', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos', 'functions', 'storage']);
      const provisionOrder: string[] = [];

      mockProvider.provideResource = (req) => {
        provisionOrder.push(req.resourceType);
        return { type: req.resourceType };
      };

      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const component = createMockComponentDefinition('user-api', {
        entityName: 'User',
        requireCosmos: true,
        requireFunctions: true,
        requireStorage: true,
      });

      backend.addComponent(component);
      backend.initialize(scope as any);

      expect(provisionOrder.length).toBeGreaterThan(0);
    });

    it('should deduplicate resources with same key', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      // Both components require the same cosmos resource
      const components = createMockComponents(2);
      backend.addComponents(Object.values(components));

      backend.initialize(scope as any);

      // Should only provision once due to deduplication
      expect(mockProvider.provisionedResources.length).toBe(1);
    });
  });

  describe('complex scenarios', () => {
    it('should handle 10 components sharing resources', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      const components = createMockComponents(10);
      backend.addComponents(Object.values(components));

      backend.initialize(scope as any);

      expect(backend.components.size).toBe(10);
      expect(mockProvider.provisionedResources.length).toBe(1); // Shared resource
    });

    it('should handle components with mixed requirements', () => {
      const mockProvider = new MockResourceProvider('mock', ['cosmos', 'functions', 'storage']);
      const backend = new Backend(scope as any, 'TestBackend', {
        ...config,
        providers: [mockProvider],
      });

      backend.addComponent(
        createMockComponentDefinition('api1', {
          entityName: 'User',
          requireCosmos: true,
          requireFunctions: false,
        })
      );

      backend.addComponent(
        createMockComponentDefinition('api2', {
          entityName: 'Product',
          requireCosmos: true,
          requireFunctions: true,
        })
      );

      backend.addComponent(
        createMockComponentDefinition('api3', {
          entityName: 'Order',
          requireCosmos: false,
          requireStorage: true,
        })
      );

      backend.initialize(scope as any);

      expect(backend.components.size).toBe(3);
      expect(mockProvider.provisionedResources.length).toBeGreaterThan(0);
    });
  });
});
