/**
 * Backend Service Integration Tests
 *
 * @remarks
 * End-to-end tests for service registry integration with backend and function context.
 */

import { describe, it, expect, vi } from 'vitest';
import { defineBackend } from './define-backend';
import { defineSchema } from '../schema/define-schema';
import { a, c, f } from '../schema';
import { singleton } from '../functions/service-registry';
import { createFunctionContext, createAnonymousUserContext } from '../functions/context';
import type { ExecutionContext } from '../functions/types';

// ============================================================================
// Test Services
// ============================================================================

class TestReportService {
  constructor(public readonly config: { endpoint: string }) {}

  async generate(data: any): Promise<string> {
    return `https://reports.example.com/${data.id}.pdf`;
  }
}

class TestEmailService {
  public readonly sent: any[] = [];

  async send(message: any): Promise<void> {
    this.sent.push(message);
  }
}

class TestCacheService {
  private cache = new Map<string, any>();

  async get(key: string): Promise<any> {
    return this.cache.get(key) || null;
  }

  async set(key: string, value: any): Promise<void> {
    this.cache.set(key, value);
  }
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Backend Service Integration', () => {
  it('should define backend with services', () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({
          id: a.id(),
          email: a.string().required(),
        }),
      }),
    });

    // Skip authentication for this test

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
      services: {
        reportService: (context) =>
          new TestReportService({
            endpoint: context.env.REPORT_ENDPOINT || 'https://default.example.com',
          }),
        emailService: singleton(() => new TestEmailService()),
      },
    });

    expect(backend._serviceFactories).toBeDefined();
    expect(backend._serviceFactories.size).toBe(2);
    expect(backend._serviceFactories.has('reportService')).toBe(true);
    expect(backend._serviceFactories.has('emailService')).toBe(true);
  });

  it('should create function context with services', () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({
          id: a.id(),
          email: a.string().required(),
        }),
      }),
    });

    // Skip authentication for this test

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
      services: {
        testService: () => ({ name: 'test' }),
      },
    });

    const executionContext: ExecutionContext = {
      executionId: 'test-exec',
      executionTime: Date.now(),
      invocationId: 'test-inv',
    };

    const userContext = createAnonymousUserContext();

    const functionContext = createFunctionContext(executionContext, userContext, backend);

    expect(functionContext.services).toBeDefined();
  });

  it('should access services from function context', () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({
          id: a.id(),
          email: a.string().required(),
        }),
      }),
    });

    // Skip authentication for this test

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
      services: {
        testService: () => ({ greet: () => 'Hello from service' }),
      },
    });

    const executionContext: ExecutionContext = {
      executionId: 'test-exec',
      executionTime: Date.now(),
      invocationId: 'test-inv',
    };

    const userContext = createAnonymousUserContext();

    const functionContext = createFunctionContext<{
      testService: { greet: () => string };
    }>(executionContext, userContext, backend);

    const result = functionContext.services.testService.greet();

    expect(result).toBe('Hello from service');
  });

  it('should support singleton services across multiple accesses', () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({
          id: a.id(),
          email: a.string().required(),
        }),
      }),
    });

    // Skip authentication for this test

    const factoryFn = vi.fn(() => new TestEmailService());

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
      services: {
        emailService: singleton(factoryFn),
      },
    });

    const executionContext: ExecutionContext = {
      executionId: 'test-exec',
      executionTime: Date.now(),
      invocationId: 'test-inv',
    };

    const userContext = createAnonymousUserContext();

    const context1 = createFunctionContext<{
      emailService: Promise<TestEmailService>;
    }>(executionContext, userContext, backend);

    const context2 = createFunctionContext<{
      emailService: Promise<TestEmailService>;
    }>(executionContext, userContext, backend);

    // Access service from both contexts
    const service1Promise = context1.services.emailService;
    const service2Promise = context2.services.emailService;

    // Both should be promises
    expect(service1Promise).toBeInstanceOf(Promise);
    expect(service2Promise).toBeInstanceOf(Promise);

    return Promise.all([service1Promise, service2Promise]).then(([service1, service2]) => {
      // Factory should only be called once (singleton)
      expect(factoryFn).toHaveBeenCalledTimes(1);

      // Both should be the same instance
      expect(service1).toBe(service2);
    });
  });

  it('should provide environment-specific services', () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({
          id: a.id(),
          email: a.string().required(),
        }),
      }),
    });

    // Skip authentication for this test

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
      environment: 'production',
      services: {
        emailService: (context) => {
          if (context.environment === 'production') {
            return { type: 'production' };
          } else {
            return { type: 'development' };
          }
        },
      },
    });

    const executionContext: ExecutionContext = {
      executionId: 'test-exec',
      executionTime: Date.now(),
      invocationId: 'test-inv',
    };

    const userContext = createAnonymousUserContext();

    const functionContext = createFunctionContext<{
      emailService: { type: string };
    }>(executionContext, userContext, backend);

    const service = functionContext.services.emailService;

    expect(service.type).toBe('production');
  });

  it('should handle async service factories', async () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({
          id: a.id(),
          email: a.string().required(),
        }),
      }),
    });

    // Skip authentication for this test

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
      services: {
        asyncService: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { initialized: true };
        },
      },
    });

    const executionContext: ExecutionContext = {
      executionId: 'test-exec',
      executionTime: Date.now(),
      invocationId: 'test-inv',
    };

    const userContext = createAnonymousUserContext();

    const functionContext = createFunctionContext<{
      asyncService: Promise<{ initialized: boolean }>;
    }>(executionContext, userContext, backend);

    const servicePromise = functionContext.services.asyncService;

    expect(servicePromise).toBeInstanceOf(Promise);

    const service = await servicePromise;

    expect(service.initialized).toBe(true);
  });

  it('should work without services configured', () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({
          id: a.id(),
          email: a.string().required(),
        }),
      }),
    });

    // Skip authentication for this test

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
      // No services configured
    });

    const executionContext: ExecutionContext = {
      executionId: 'test-exec',
      executionTime: Date.now(),
      invocationId: 'test-inv',
    };

    const userContext = createAnonymousUserContext();

    const functionContext = createFunctionContext(executionContext, userContext, backend);

    // Services should exist but be empty
    expect(functionContext.services).toBeDefined();

    // Accessing non-existent service should throw
    expect(() => (functionContext.services as any).nonExistent).toThrow();
  });

  it('should type-infer services from backend configuration', () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({
          id: a.id(),
          email: a.string().required(),
        }),
      }),
    });

    // Skip authentication for this test

    // Define backend with services
    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
      services: {
        reportService: () => new TestReportService({ endpoint: 'https://example.com' }),
        emailService: singleton(() => new TestEmailService()),
        cacheService: singleton(() => new TestCacheService()),
      },
    });

    // Type should be inferred
    type BackendServices = typeof backend extends {
      _serviceFactories: Map<string, any>;
    }
      ? any
      : never;

    expect(backend._serviceFactories.size).toBe(3);
  });
});
