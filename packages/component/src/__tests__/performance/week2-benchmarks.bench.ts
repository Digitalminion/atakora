/**
 * Week 2 Performance Benchmarks
 *
 * @remarks
 * Performance benchmarks for Week 2 features:
 * - Service resolution performance
 * - Token validation speed
 * - Cache performance
 * - Handler middleware overhead
 *
 * @module @atakora/component/__tests__/performance/week2-benchmarks
 */

import { bench, describe } from 'vitest';
import {
  createMockServices,
  MockEmailService,
  MockCacheService,
  MockQueueService,
  type ServiceRegistry,
} from '../fixtures/services';
import {
  generateValidToken,
  generateTokenWithClaims,
  parseTokenClaims,
  isTokenExpired,
} from '../helpers/token-helpers';
import {
  createMockHttpRequest,
  createPostRequest,
  createAuthorizedRequest,
  createMockFunctionContext,
} from '../helpers/handler-helpers';
import {
  MockTokenValidatorRealistic,
  MockTokenCache,
  createMockAuthEnvironment,
  type MockAuthEnvironment,
} from '../mocks/auth-mocks';

// ============================================================================
// Service Resolution Performance
// ============================================================================

describe('Service Resolution Performance', () => {
  let services: ServiceRegistry;

  bench('get email service from registry', () => {
    services = createMockServices();
    const email = services.email;
    email; // Use to prevent optimization
  });

  bench('get multiple services from registry', () => {
    services = createMockServices();
    const { email, logging, cache, queue, notification } = services;
    email; logging; cache; queue; notification; // Use to prevent optimization
  });

  bench('create new service registry', () => {
    createMockServices();
  });
});

// ============================================================================
// Token Validation Performance
// ============================================================================

describe('Token Validation Performance', () => {
  const token = generateValidToken();
  let validator: MockTokenValidatorRealistic;
  let cache: MockTokenCache;

  bench('parse token claims', () => {
    parseTokenClaims(token);
  });

  bench('check token expiration', () => {
    isTokenExpired(token);
  });

  bench('validate token (realistic validator)', async () => {
    validator = new MockTokenValidatorRealistic();
    validator.addValidToken(token);
    await validator.validate(token);
  });

  bench('validate token with cache hit', async () => {
    validator = new MockTokenValidatorRealistic();
    cache = new MockTokenCache();

    // Pre-populate cache
    const claims = parseTokenClaims(token)!;
    cache.set(token, {
      userId: claims.sub!,
      claims,
      expiresAt: Date.now() + 3600000,
    });

    // Get from cache (should be fast)
    cache.get(token);
  });

  bench('validate token with cache miss', async () => {
    validator = new MockTokenValidatorRealistic();
    cache = new MockTokenCache();
    validator.addValidToken(token);

    // Cache miss - need to validate
    const cached = cache.get(token);
    if (!cached) {
      await validator.validate(token);
    }
  });

  bench('generate new token', () => {
    generateValidToken();
  });

  bench('generate token with custom claims', () => {
    generateTokenWithClaims({
      userId: 'user-123',
      tenantId: 'tenant-456',
      roles: ['admin', 'user'],
      permissions: ['read', 'write'],
    });
  });
});

// ============================================================================
// Cache Performance
// ============================================================================

describe('Cache Performance', () => {
  let cache: MockCacheService;

  bench('cache set operation', async () => {
    cache = new MockCacheService();
    await cache.set('test-key', { data: 'test-value' });
  });

  bench('cache get operation (hit)', async () => {
    cache = new MockCacheService();
    await cache.set('test-key', { data: 'test-value' });
    await cache.get('test-key');
  });

  bench('cache get operation (miss)', async () => {
    cache = new MockCacheService();
    await cache.get('nonexistent-key');
  });

  bench('cache has operation', async () => {
    cache = new MockCacheService();
    await cache.set('test-key', { data: 'test-value' });
    await cache.has('test-key');
  });

  bench('cache delete operation', async () => {
    cache = new MockCacheService();
    await cache.set('test-key', { data: 'test-value' });
    await cache.delete('test-key');
  });

  bench('cache set with TTL', async () => {
    cache = new MockCacheService();
    await cache.set('test-key', { data: 'test-value' }, 3600);
  });

  bench('cache bulk operations (10 items)', async () => {
    cache = new MockCacheService();

    for (let i = 0; i < 10; i++) {
      await cache.set(`key-${i}`, { data: `value-${i}` });
    }
  });

  bench('cache bulk operations (100 items)', async () => {
    cache = new MockCacheService();

    for (let i = 0; i < 100; i++) {
      await cache.set(`key-${i}`, { data: `value-${i}` });
    }
  });
});

// ============================================================================
// Service Operations Performance
// ============================================================================

describe('Service Operations Performance', () => {
  let services: ServiceRegistry;

  bench('email service - send single email', async () => {
    services = createMockServices();
    await services.email.sendEmail('test@example.com', 'Test', 'Body');
  });

  bench('email service - send bulk email (10 recipients)', async () => {
    services = createMockServices();
    const recipients = Array.from({ length: 10 }, (_, i) => `user${i}@example.com`);
    await services.email.sendBulkEmail(recipients, 'Test', 'Body');
  });

  bench('queue service - enqueue message', async () => {
    services = createMockServices();
    await services.queue.enqueue('test-queue', { data: 'test' });
  });

  bench('queue service - enqueue and dequeue', async () => {
    services = createMockServices();
    await services.queue.enqueue('test-queue', { data: 'test' });
    await services.queue.dequeue('test-queue');
  });

  bench('notification service - send notification', async () => {
    services = createMockServices();
    await services.notification.sendNotification('user-123', {
      title: 'Test',
      message: 'Test notification',
      type: 'info',
      priority: 'normal',
    });
  });

  bench('logging service - log message', () => {
    services = createMockServices();
    services.logging.info('Test log message', { context: 'test' });
  });

  bench('logging service - log error', () => {
    services = createMockServices();
    services.logging.error('Test error', new Error('Test'), { context: 'test' });
  });
});

// ============================================================================
// Handler Middleware Overhead
// ============================================================================

describe('Handler Middleware Overhead', () => {
  let authEnv: MockAuthEnvironment;

  bench('create function context', () => {
    createMockFunctionContext();
  });

  bench('create HTTP request', () => {
    createMockHttpRequest();
  });

  bench('create POST request with body', () => {
    createPostRequest('/api/test', { data: 'test' });
  });

  bench('create authorized request', () => {
    const token = generateValidToken();
    createAuthorizedRequest(token);
  });

  bench('simple handler (no auth, no services)', async () => {
    const context = createMockFunctionContext();
    const request = createMockHttpRequest();

    const handler = async () => ({
      status: 200,
      body: { success: true },
      headers: {},
    });

    await handler();
  });

  bench('handler with authentication', async () => {
    authEnv = createMockAuthEnvironment();
    const token = generateValidToken();
    authEnv.tokenValidator.addValidToken(token);

    const context = createMockFunctionContext();
    const request = createAuthorizedRequest(token);

    const handler = async () => {
      const authHeader = request.headers.Authorization;
      const tokenValue = authHeader?.replace('Bearer ', '');

      if (!tokenValue) {
        return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
      }

      const validation = await authEnv.tokenValidator.validate(tokenValue);

      if (!validation.valid) {
        return { status: 401, body: { error: 'Invalid token' }, headers: {} };
      }

      return {
        status: 200,
        body: { success: true, userId: validation.userId },
        headers: {},
      };
    };

    await handler();
  });

  bench('handler with service injection', async () => {
    const services = createMockServices();
    const context = createMockFunctionContext();
    const request = createPostRequest('/api/test', { data: 'test' });

    const handler = async () => {
      services.logging.info('Processing request');
      await services.cache.set('test-key', { data: 'test' });

      return {
        status: 200,
        body: { success: true },
        headers: {},
      };
    };

    await handler();
  });

  bench('handler with auth and services', async () => {
    authEnv = createMockAuthEnvironment();
    const services = createMockServices();
    const token = generateValidToken();
    authEnv.tokenValidator.addValidToken(token);

    const context = createMockFunctionContext();
    const request = createAuthorizedRequest(token);

    const handler = async () => {
      // Authenticate
      const authHeader = request.headers.Authorization;
      const tokenValue = authHeader?.replace('Bearer ', '');

      if (!tokenValue) {
        return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
      }

      const validation = await authEnv.tokenValidator.validate(tokenValue);

      if (!validation.valid) {
        return { status: 401, body: { error: 'Invalid token' }, headers: {} };
      }

      // Use services
      services.logging.info('Processing authenticated request', { userId: validation.userId });
      await services.cache.set(`user:${validation.userId}`, { lastSeen: new Date() });

      return {
        status: 200,
        body: { success: true, userId: validation.userId },
        headers: {},
      };
    };

    await handler();
  });
});

// ============================================================================
// Composite Operations
// ============================================================================

describe('Composite Operations', () => {
  let services: ServiceRegistry;
  let authEnv: MockAuthEnvironment;

  bench('full request lifecycle (auth + multiple services)', async () => {
    // Setup
    authEnv = createMockAuthEnvironment();
    services = createMockServices();
    const token = generateValidToken();
    authEnv.tokenValidator.addValidToken(token);

    const request = createAuthorizedRequest(token, {
      method: 'POST',
      url: '/api/process',
      body: { action: 'test' },
    });

    // Handler
    const handler = async () => {
      // 1. Authenticate
      const authHeader = request.headers.Authorization;
      const tokenValue = authHeader?.replace('Bearer ', '');

      if (!tokenValue) {
        return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
      }

      const validation = await authEnv.tokenValidator.validate(tokenValue);

      if (!validation.valid) {
        return { status: 401, body: { error: 'Invalid token' }, headers: {} };
      }

      // 2. Log
      services.logging.info('Processing request', { userId: validation.userId });

      // 3. Cache check
      const cacheKey = `user:${validation.userId}`;
      let cached = await services.cache.get(cacheKey);

      if (!cached) {
        cached = { id: validation.userId, timestamp: new Date() };
        await services.cache.set(cacheKey, cached, 3600);
      }

      // 4. Queue job
      await services.queue.enqueue('processing', {
        userId: validation.userId,
        action: request.body.action,
      });

      // 5. Send notification
      await services.notification.sendNotification(validation.userId!, {
        title: 'Processing Started',
        message: 'Your request is being processed',
        type: 'info',
        priority: 'normal',
      });

      return {
        status: 202,
        body: { success: true, status: 'queued' },
        headers: {},
      };
    };

    await handler();
  });

  bench('parallel service operations', async () => {
    services = createMockServices();

    await Promise.all([
      services.cache.set('key1', { data: 'value1' }),
      services.cache.set('key2', { data: 'value2' }),
      services.cache.set('key3', { data: 'value3' }),
      services.queue.enqueue('queue1', { data: 'test1' }),
      services.queue.enqueue('queue2', { data: 'test2' }),
    ]);
  });

  bench('sequential service operations', async () => {
    services = createMockServices();

    await services.cache.set('key1', { data: 'value1' });
    await services.cache.set('key2', { data: 'value2' });
    await services.cache.set('key3', { data: 'value3' });
    await services.queue.enqueue('queue1', { data: 'test1' });
    await services.queue.enqueue('queue2', { data: 'test2' });
  });
});

// ============================================================================
// Scalability Tests
// ============================================================================

describe('Scalability Tests', () => {
  bench('validate 100 tokens', async () => {
    const validator = new MockTokenValidatorRealistic();
    const tokens = Array.from({ length: 100 }, () => generateValidToken());

    tokens.forEach((token) => validator.addValidToken(token));

    await Promise.all(tokens.map((token) => validator.validate(token)));
  });

  bench('cache 1000 items', async () => {
    const cache = new MockCacheService();

    for (let i = 0; i < 1000; i++) {
      await cache.set(`key-${i}`, { data: `value-${i}` });
    }
  });

  bench('enqueue 1000 messages', async () => {
    const queue = new MockQueueService();

    for (let i = 0; i < 1000; i++) {
      await queue.enqueue('test-queue', { id: i, data: `message-${i}` });
    }
  });
});
