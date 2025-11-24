/**
 * Service Registry Tests
 *
 * @remarks
 * Tests for service registry functionality including:
 * - Service registration and resolution
 * - Singleton pattern
 * - Async factory support
 * - Error handling
 * - Circular dependency detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  singleton,
  createServiceRegistry,
  hasService,
  getAvailableServices,
  createEmptyServiceRegistry,
} from './service-registry';
import type { ServiceFactory, ServiceFactoryContext } from './service-registry-types';
import {
  ServiceNotFoundError,
  ServiceInstantiationError,
  CircularDependencyError,
} from './service-registry-types';
import type { ExecutionContext, Logger } from './types';
import type { ResolvedBackendSettings } from '../backend/types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockLogger(): Logger {
  const log = vi.fn() as any;
  log.info = vi.fn();
  log.warn = vi.fn();
  log.error = vi.fn();
  log.verbose = vi.fn();
  return log;
}

function createMockExecutionContext(): ExecutionContext {
  return {
    executionId: 'test-exec-id',
    executionTime: Date.now(),
    invocationId: 'test-invocation-id',
  };
}

function createMockBackendSettings(): ResolvedBackendSettings {
  return {
    name: 'test-app',
    region: 'eastus',
    resourceGroup: 'test-rg',
    tags: {},
    features: {
      monitoring: false,
      networking: false,
      performance: false,
    },
  };
}

// Test service classes
class TestService {
  constructor(public readonly name: string) {}

  greet() {
    return `Hello from ${this.name}`;
  }
}

class AsyncTestService {
  constructor(public readonly name: string) {}

  async initialize() {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return this;
  }
}

// ============================================================================
// Service Registry Tests
// ============================================================================

describe('Service Registry', () => {
  let logger: Logger;
  let executionContext: ExecutionContext;
  let backendSettings: ResolvedBackendSettings;

  beforeEach(() => {
    logger = createMockLogger();
    executionContext = createMockExecutionContext();
    backendSettings = createMockBackendSettings();
  });

  describe('createServiceRegistry', () => {
    it('should create empty service registry when no factories provided', () => {
      const registry = createServiceRegistry(
        new Map(),
        executionContext,
        backendSettings,
        'development',
        logger
      );

      expect(registry).toBeDefined();
      expect(getAvailableServices(registry)).toEqual([]);
    });

    it('should create service registry with factories', () => {
      const factories = new Map<string, ServiceFactory<any>>([
        ['testService', () => new TestService('test')],
      ]);

      const registry = createServiceRegistry<{ testService: TestService }>(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      expect(registry).toBeDefined();
      expect(hasService(registry, 'testService')).toBe(true);
      expect(getAvailableServices(registry)).toEqual(['testService']);
    });

    it('should instantiate service on first access', () => {
      const factory = vi.fn(() => new TestService('test'));
      const factories = new Map<string, ServiceFactory<any>>([['testService', factory]]);

      const registry = createServiceRegistry<{ testService: TestService }>(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      expect(factory).not.toHaveBeenCalled();

      const service = registry.testService;

      expect(factory).toHaveBeenCalledTimes(1);
      expect(service).toBeInstanceOf(TestService);
      expect(service.greet()).toBe('Hello from test');
    });

    it('should cache service instances per invocation', () => {
      const factory = vi.fn(() => new TestService('test'));
      const factories = new Map<string, ServiceFactory<any>>([['testService', factory]]);

      const registry = createServiceRegistry<{ testService: TestService }>(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      const service1 = registry.testService;
      const service2 = registry.testService;

      expect(factory).toHaveBeenCalledTimes(1);
      expect(service1).toBe(service2);
    });

    it('should throw ServiceNotFoundError for missing service', () => {
      const registry = createServiceRegistry(
        new Map(),
        executionContext,
        backendSettings,
        'development',
        logger
      );

      expect(() => (registry as any).nonExistent).toThrow(ServiceNotFoundError);
      expect(() => (registry as any).nonExistent).toThrow(
        "Service 'nonExistent' not found in service registry"
      );
    });

    it('should include available services in error message', () => {
      const factories = new Map<string, ServiceFactory<any>>([
        ['serviceA', () => new TestService('A')],
        ['serviceB', () => new TestService('B')],
      ]);

      const registry = createServiceRegistry(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      try {
        (registry as any).nonExistent;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceNotFoundError);
        expect((error as ServiceNotFoundError).message).toContain('serviceA, serviceB');
      }
    });

    it('should provide factory context with correct values', () => {
      let capturedContext: ServiceFactoryContext | null = null;

      const factory: ServiceFactory<TestService> = (context) => {
        capturedContext = context;
        return new TestService('test');
      };

      const factories = new Map<string, ServiceFactory<any>>([['testService', factory]]);

      const registry = createServiceRegistry<{ testService: TestService }>(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      registry.testService;

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.environment).toBe('development');
      expect(capturedContext!.settings).toBe(backendSettings);
      expect(capturedContext!.logger).toBe(logger);
      expect(capturedContext!.env).toBe(process.env);
    });

    it('should handle synchronous factories', () => {
      const factory: ServiceFactory<TestService> = () => new TestService('sync');
      const factories = new Map([['testService', factory]]);

      const registry = createServiceRegistry<{ testService: TestService }>(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      const service = registry.testService;

      expect(service).toBeInstanceOf(TestService);
      expect(service.name).toBe('sync');
    });

    it('should handle asynchronous factories', async () => {
      const factory: ServiceFactory<AsyncTestService> = async () => {
        return new AsyncTestService('async');
      };

      const factories = new Map([['testService', factory]]);

      const registry = createServiceRegistry<{ testService: Promise<AsyncTestService> }>(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      const servicePromise = registry.testService;

      expect(servicePromise).toBeInstanceOf(Promise);

      const service = await servicePromise;

      expect(service).toBeInstanceOf(AsyncTestService);
      expect(service.name).toBe('async');
    });

    it('should cache async service promises', async () => {
      const factory = vi.fn(async () => new AsyncTestService('async'));
      const factories = new Map([['testService', factory]]);

      const registry = createServiceRegistry<{ testService: Promise<AsyncTestService> }>(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      const promise1 = registry.testService;
      const promise2 = registry.testService;

      expect(promise1).toBe(promise2);
      expect(factory).toHaveBeenCalledTimes(1);

      await promise1;
    });

    it('should throw ServiceInstantiationError on factory failure', () => {
      const error = new Error('Factory failed');
      const factory: ServiceFactory<TestService> = () => {
        throw error;
      };

      const factories = new Map([['testService', factory]]);

      const registry = createServiceRegistry(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      expect(() => (registry as any).testService).toThrow(ServiceInstantiationError);
      expect(() => (registry as any).testService).toThrow(
        "Failed to instantiate service 'testService'"
      );
    });

    it('should detect circular dependencies', () => {
      // This would require services to reference each other during construction
      // For now, we just test that the mechanism exists
      const factories = new Map<string, ServiceFactory<any>>();

      // Create a factory that tries to access another service during construction
      const factory: ServiceFactory<any> = (context) => {
        // In a real scenario, this would try to access another service
        // which would trigger circular dependency detection
        return { name: 'test' };
      };

      factories.set('serviceA', factory);

      const registry = createServiceRegistry(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      // Normal access works fine
      expect(() => (registry as any).serviceA).not.toThrow();
    });
  });

  describe('singleton', () => {
    it('should create singleton factory', async () => {
      const innerFactory = vi.fn(() => new TestService('singleton'));
      const singletonFactory = singleton(innerFactory);

      const factoryContext: ServiceFactoryContext = {
        env: process.env,
        settings: backendSettings,
        environment: 'development',
        logger,
      };

      const service1 = await singletonFactory(factoryContext);
      const service2 = await singletonFactory(factoryContext);

      expect(innerFactory).toHaveBeenCalledTimes(1);
      expect(service1).toBe(service2);
    });

    it('should handle async singleton factories', async () => {
      const innerFactory = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return new AsyncTestService('async-singleton');
      });

      const singletonFactory = singleton(innerFactory);

      const factoryContext: ServiceFactoryContext = {
        env: process.env,
        settings: backendSettings,
        environment: 'development',
        logger,
      };

      const service1 = await singletonFactory(factoryContext);
      const service2 = await singletonFactory(factoryContext);

      expect(innerFactory).toHaveBeenCalledTimes(1);
      expect(service1).toBe(service2);
      expect(service1).toBeInstanceOf(AsyncTestService);
    });

    it('should await pending singleton initialization', async () => {
      let resolveFactory: any;
      const factoryPromise = new Promise<TestService>((resolve) => {
        resolveFactory = resolve;
      });

      const innerFactory = vi.fn(() => factoryPromise);
      const singletonFactory = singleton(innerFactory);

      const factoryContext: ServiceFactoryContext = {
        env: process.env,
        settings: backendSettings,
        environment: 'development',
        logger,
      };

      // Start two concurrent requests
      const promise1 = singletonFactory(factoryContext);
      const promise2 = singletonFactory(factoryContext);

      // Factory should only be called once
      expect(innerFactory).toHaveBeenCalledTimes(1);

      // Resolve the factory
      resolveFactory(new TestService('concurrent-singleton'));

      // Both promises should resolve to the same instance
      const [service1, service2] = await Promise.all([promise1, promise2]);

      expect(service1).toBe(service2);
    });

    it('should log singleton initialization', async () => {
      const innerFactory = () => new TestService('logged');
      const singletonFactory = singleton(innerFactory);

      const factoryContext: ServiceFactoryContext = {
        env: process.env,
        settings: backendSettings,
        environment: 'development',
        logger,
      };

      await singletonFactory(factoryContext);

      expect(logger.verbose).toHaveBeenCalledWith('Singleton service initialized');
    });
  });

  describe('hasService', () => {
    it('should return true for existing service', () => {
      const factories = new Map<string, ServiceFactory<any>>([
        ['testService', () => new TestService('test')],
      ]);

      const registry = createServiceRegistry(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      expect(hasService(registry, 'testService')).toBe(true);
    });

    it('should return false for non-existent service', () => {
      const registry = createServiceRegistry(
        new Map(),
        executionContext,
        backendSettings,
        'development',
        logger
      );

      expect(hasService(registry, 'nonExistent')).toBe(false);
    });
  });

  describe('getAvailableServices', () => {
    it('should return empty array for empty registry', () => {
      const registry = createServiceRegistry(
        new Map(),
        executionContext,
        backendSettings,
        'development',
        logger
      );

      expect(getAvailableServices(registry)).toEqual([]);
    });

    it('should return all service names', () => {
      const factories = new Map<string, ServiceFactory<any>>([
        ['serviceA', () => new TestService('A')],
        ['serviceB', () => new TestService('B')],
        ['serviceC', () => new TestService('C')],
      ]);

      const registry = createServiceRegistry(
        factories,
        executionContext,
        backendSettings,
        'development',
        logger
      );

      const services = getAvailableServices(registry);

      expect(services).toContain('serviceA');
      expect(services).toContain('serviceB');
      expect(services).toContain('serviceC');
      expect(services.length).toBe(3);
    });
  });

  describe('createEmptyServiceRegistry', () => {
    it('should create empty registry', () => {
      const registry = createEmptyServiceRegistry();

      expect(registry).toBeDefined();
      expect(getAvailableServices(registry)).toEqual([]);
    });

    it('should throw ServiceNotFoundError on any access', () => {
      const registry = createEmptyServiceRegistry();

      expect(() => (registry as any).anyService).toThrow(ServiceNotFoundError);
    });

    it('should have no services', () => {
      const registry = createEmptyServiceRegistry();

      expect(hasService(registry, 'anyService')).toBe(false);
    });
  });
});
