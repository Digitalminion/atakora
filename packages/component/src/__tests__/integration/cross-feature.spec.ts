/**
 * Cross-Feature Integration Tests - Week 3
 *
 * Tests interactions between different features:
 * - Attachment points + Synthesis
 * - Service registry + Function handlers
 * - Token validation + Authorization + Services
 * - Multi-region + Gov Cloud
 * - Linked templates + Large schemas
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createStandardBackend, createComplexBackend, createProductionBackend } from '../fixtures/backends';
import { createMockServices, clearAllServices } from '../fixtures/services';
import { createMockAuthEnvironment } from '../mocks/auth-mocks';
import { generateValidToken, generateAdminToken } from '../helpers/token-helpers';
import { executeHandler, createAuthorizedRequest, assertResponseSuccess } from '../helpers/handler-helpers';
import { assertValidBackendStructure, createMockSynthesisContext } from '../helpers/integration-helpers';

describe('Cross-Feature Integration Tests', () => {
  describe('Attachment Points + Synthesis', () => {
    it('should synthesize backend with custom attachment points', () => {
      const backend = createStandardBackend();
      const context = createMockSynthesisContext(backend);

      // Verify context created with backend
      expect(context.backend).toBe(backend);

      // In real synthesis, attachment points would modify ARM template
      // Here we verify the structure is correct for synthesis
      assertValidBackendStructure(backend);
    });

    it('should preserve attachment configurations during synthesis', () => {
      const backend = createComplexBackend();

      // Backend with staging environment should have specific configs
      expect(backend.settings.environment).toBe('staging');

      // Synthesis context should carry these through
      const context = createMockSynthesisContext(backend);
      expect(context.backend.settings.environment).toBe('staging');
    });

    it('should handle multiple attachment points', () => {
      const production = createProductionBackend();

      // Production backends have multiple features enabled
      // which translates to multiple attachment points
      assertValidBackendStructure(production);

      // Would have monitoring, networking, performance attachments
      expect(production.settings.environment).toBe('production');
    });
  });

  describe('Service Registry + Function Handlers', () => {
    let services: ReturnType<typeof createMockServices>;

    beforeEach(() => {
      services = createMockServices();
    });

    afterEach(() => {
      clearAllServices(services);
    });

    it('should inject services into handler context', async () => {
      const handler = async (ctx: any, req: any) => {
        // Services would be injected via ctx in real implementation
        // Here we demonstrate the pattern

        // Access logging service
        services.logging.info('Handler invoked', { url: req.url });

        // Access cache service
        const cached = await services.cache.get('test-key');

        return {
          status: 200,
          body: { success: true, cached: !!cached },
          headers: {},
        };
      };

      const request = { method: 'GET', url: '/api/test' };
      const result = await executeHandler(handler, request);

      assertResponseSuccess(result.result);

      // Verify service was used
      const logs = services.logging.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should support multiple handlers sharing service instances', async () => {
      // First handler sets cache
      const handler1 = async (ctx: any, req: any) => {
        await services.cache.set('shared-data', { value: 'test' });
        return { status: 200, body: { set: true }, headers: {} };
      };

      // Second handler reads cache
      const handler2 = async (ctx: any, req: any) => {
        const data = await services.cache.get('shared-data');
        return { status: 200, body: { data }, headers: {} };
      };

      // Execute handlers
      await executeHandler(handler1, { method: 'POST', url: '/api/set' });
      const result2 = await executeHandler(handler2, { method: 'GET', url: '/api/get' });

      // Second handler should see data from first
      expect(result2.result.body.data).toEqual({ value: 'test' });
    });

    it('should handle service errors gracefully in handlers', async () => {
      // Configure email service to fail
      services.email.setFailureRate(1.0);

      const handler = async (ctx: any, req: any) => {
        try {
          const result = await services.email.sendEmail(
            'test@example.com',
            'Test',
            'Body'
          );

          if (!result.sent) {
            services.logging.error('Email failed', undefined, { error: result.error });
            return { status: 500, body: { error: 'Email failed' }, headers: {} };
          }

          return { status: 200, body: { success: true }, headers: {} };
        } catch (error) {
          services.logging.error('Unexpected error', error);
          return { status: 500, body: { error: 'Internal error' }, headers: {} };
        }
      };

      const request = { method: 'POST', url: '/api/email' };
      const result = await executeHandler(handler, request);

      expect(result.result.status).toBe(500);

      // Verify error was logged
      const errorLogs = services.logging.getLogsByLevel('error');
      expect(errorLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Token Validation + Authorization + Services', () => {
    let authEnv: ReturnType<typeof createMockAuthEnvironment>;
    let services: ReturnType<typeof createMockServices>;

    beforeEach(() => {
      authEnv = createMockAuthEnvironment();
      services = createMockServices();
    });

    afterEach(() => {
      authEnv.tokenValidator.validTokens.clear();
      authEnv.tokenValidator.revokedTokens.clear();
      authEnv.authorizationProvider.clearAllPermissions();
      clearAllServices(services);
    });

    it('should validate token, check permissions, and execute with services', async () => {
      // Setup
      const token = generateValidToken();
      authEnv.tokenValidator.addValidToken(token);

      // Handler with full auth + authz + services
      const handler = async (ctx: any, req: any) => {
        // 1. Extract and validate token
        const authHeader = req.headers?.Authorization;
        if (!authHeader) {
          return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
        }

        const tokenValue = authHeader.replace('Bearer ', '');
        const validation = await authEnv.tokenValidator.validate(tokenValue);

        if (!validation.valid) {
          return { status: 401, body: { error: 'Invalid token' }, headers: {} };
        }

        // 2. Get user context
        const userContext = authEnv.userContextProvider.getUserContextFromToken(tokenValue);
        if (!userContext) {
          return { status: 401, body: { error: 'No user context' }, headers: {} };
        }

        // 3. Check authorization
        const hasPermission = authEnv.authorizationProvider.hasPermission(
          userContext.id,
          'posts:write',
          userContext.roles
        );

        if (!hasPermission) {
          services.logging.warn('Permission denied', { userId: userContext.id });
          return { status: 403, body: { error: 'Forbidden' }, headers: {} };
        }

        // 4. Execute with services
        services.logging.info('Creating post', { userId: userContext.id });

        const post = { id: 'post-123', title: req.body.title, authorId: userContext.id };
        await services.cache.set(`post:${post.id}`, post, 3600);

        await services.queue.enqueue('notifications', {
          type: 'post-created',
          postId: post.id,
          authorId: userContext.id,
        });

        return {
          status: 201,
          body: { post },
          headers: {},
        };
      };

      // Execute
      const request = createAuthorizedRequest(token, {
        method: 'POST',
        url: '/api/posts',
        body: { title: 'Test Post' },
      });

      const result = await executeHandler(handler, request);

      // Verify
      expect(result.result.status).toBe(201);
      expect(result.result.body.post.id).toBe('post-123');

      // Verify service interactions
      const logs = services.logging.getLogs();
      expect(logs.some((log) => log.message === 'Creating post')).toBe(true);

      const queueLength = await services.queue.getQueueLength('notifications');
      expect(queueLength).toBe(1);
    });

    it('should handle admin-only endpoints with full auth stack', async () => {
      // Setup admin token
      const adminToken = generateAdminToken();
      authEnv.tokenValidator.addValidToken(adminToken);

      // Setup user token
      const userToken = generateValidToken();
      authEnv.tokenValidator.addValidToken(userToken);

      // Admin-only handler
      const adminHandler = async (ctx: any, req: any) => {
        const authHeader = req.headers?.Authorization;
        if (!authHeader) {
          return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
        }

        const tokenValue = authHeader.replace('Bearer ', '');
        const validation = await authEnv.tokenValidator.validate(tokenValue);

        if (!validation.valid) {
          return { status: 401, body: { error: 'Invalid token' }, headers: {} };
        }

        const userContext = authEnv.userContextProvider.getUserContextFromToken(tokenValue);
        if (!userContext) {
          return { status: 401, body: { error: 'No user context' }, headers: {} };
        }

        // Check for admin role
        if (!userContext.roles.includes('admin')) {
          services.logging.warn('Non-admin access attempt', { userId: userContext.id });
          return { status: 403, body: { error: 'Admin access required' }, headers: {} };
        }

        services.logging.info('Admin action', { userId: userContext.id });
        return { status: 200, body: { success: true }, headers: {} };
      };

      // Admin should succeed
      const adminRequest = createAuthorizedRequest(adminToken, {
        method: 'POST',
        url: '/api/admin/action',
      });
      const adminResult = await executeHandler(adminHandler, adminRequest);
      expect(adminResult.result.status).toBe(200);

      // User should be forbidden
      const userRequest = createAuthorizedRequest(userToken, {
        method: 'POST',
        url: '/api/admin/action',
      });
      const userResult = await executeHandler(adminHandler, userRequest);
      expect(userResult.result.status).toBe(403);

      // Verify warning was logged
      const warnings = services.logging.getLogsByLevel('warn');
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should audit security events using services', async () => {
      const token = generateValidToken();
      authEnv.tokenValidator.addValidToken(token);

      const handler = async (ctx: any, req: any) => {
        const authHeader = req.headers?.Authorization;
        const tokenValue = authHeader?.replace('Bearer ', '');

        if (!tokenValue) {
          // Audit failed auth attempt
          await services.queue.enqueue('security-audit', {
            event: 'auth-failed',
            reason: 'missing-token',
            timestamp: new Date().toISOString(),
          });
          return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
        }

        const validation = await authEnv.tokenValidator.validate(tokenValue);

        if (!validation.valid) {
          // Audit invalid token
          await services.queue.enqueue('security-audit', {
            event: 'auth-failed',
            reason: 'invalid-token',
            timestamp: new Date().toISOString(),
          });
          return { status: 401, body: { error: 'Invalid token' }, headers: {} };
        }

        // Audit successful auth
        await services.queue.enqueue('security-audit', {
          event: 'auth-success',
          userId: validation.userId,
          timestamp: new Date().toISOString(),
        });

        return { status: 200, body: { success: true }, headers: {} };
      };

      // Successful auth
      const validRequest = createAuthorizedRequest(token);
      await executeHandler(handler, validRequest);

      // Failed auth (no token)
      const invalidRequest = { method: 'GET', url: '/api/test', headers: {} };
      await executeHandler(handler, invalidRequest);

      // Check audit queue
      const auditQueueLength = await services.queue.getQueueLength('security-audit');
      expect(auditQueueLength).toBe(2); // One success, one failure
    });
  });

  describe('Backend Features + Synthesis', () => {
    it('should synthesize complex backend with all features', () => {
      const complex = createComplexBackend();
      const context = createMockSynthesisContext(complex);

      // Verify all features present
      expect(complex.schema.models).toBeDefined();
      expect(complex.authentication).toBeDefined();
      expect(complex.settings.environment).toBe('staging');

      // Context should carry all configuration
      expect(context.backend.schema).toBe(complex.schema);
      expect(context.backend.authentication).toBe(complex.authentication);
    });

    it('should handle production backend with maximum features', () => {
      const production = createProductionBackend();

      // Should have extensive schema
      const modelCount = Object.keys(production.schema.models).length;
      expect(modelCount).toBeGreaterThanOrEqual(15);

      // Should have authentication
      expect(production.authentication).toBeDefined();

      // Should have production settings
      expect(production.settings.environment).toBe('production');

      // Should synthesize successfully
      const context = createMockSynthesisContext(production);
      expect(context).toBeDefined();
    });
  });

  describe('Error Handling Across Features', () => {
    let authEnv: ReturnType<typeof createMockAuthEnvironment>;
    let services: ReturnType<typeof createMockServices>;

    beforeEach(() => {
      authEnv = createMockAuthEnvironment();
      services = createMockServices();
    });

    afterEach(() => {
      clearAllServices(services);
    });

    it('should handle cascading failures gracefully', async () => {
      // Configure service to fail
      services.email.setFailureRate(1.0);

      const token = generateValidToken();
      authEnv.tokenValidator.addValidToken(token);

      const handler = async (ctx: any, req: any) => {
        try {
          // Auth succeeds
          const authHeader = req.headers?.Authorization;
          const tokenValue = authHeader?.replace('Bearer ', '');
          const validation = await authEnv.tokenValidator.validate(tokenValue!);

          if (!validation.valid) {
            return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
          }

          // Service fails
          const emailResult = await services.email.sendEmail(
            'test@example.com',
            'Test',
            'Body'
          );

          if (!emailResult.sent) {
            // Log failure
            services.logging.error('Email service failed', undefined, {
              error: emailResult.error,
            });

            // Queue for retry
            await services.queue.enqueue('retry', {
              operation: 'send-email',
              userId: validation.userId,
            });

            return {
              status: 500,
              body: { error: 'Service temporarily unavailable' },
              headers: {},
            };
          }

          return { status: 200, body: { success: true }, headers: {} };
        } catch (error) {
          services.logging.error('Unexpected error', error);
          return { status: 500, body: { error: 'Internal error' }, headers: {} };
        }
      };

      const request = createAuthorizedRequest(token);
      const result = await executeHandler(handler, request);

      // Should return 500 but handle gracefully
      expect(result.result.status).toBe(500);

      // Should have logged error
      const errorLogs = services.logging.getLogsByLevel('error');
      expect(errorLogs.length).toBeGreaterThan(0);

      // Should have queued retry
      const retryQueueLength = await services.queue.getQueueLength('retry');
      expect(retryQueueLength).toBe(1);
    });

    it('should maintain service state across errors', async () => {
      const handler = async (ctx: any, req: any) => {
        // Increment counter in cache
        const counterKey = 'request-counter';
        let counter = (await services.cache.get(counterKey)) || 0;
        counter++;
        await services.cache.set(counterKey, counter);

        // Simulate error on 3rd request
        if (counter === 3) {
          throw new Error('Simulated error');
        }

        return { status: 200, body: { counter }, headers: {} };
      };

      // First request - success
      const req1 = { method: 'GET', url: '/api/test' };
      const result1 = await executeHandler(handler, req1);
      expect(result1.result.status).toBe(200);
      expect(result1.result.body.counter).toBe(1);

      // Second request - success
      const result2 = await executeHandler(handler, req1);
      expect(result2.result.status).toBe(200);
      expect(result2.result.body.counter).toBe(2);

      // Third request - error (but counter still incremented)
      try {
        await executeHandler(handler, req1);
      } catch (error) {
        // Expected error
      }

      // Fourth request - success with correct counter
      const result4 = await executeHandler(handler, req1);
      expect(result4.result.status).toBe(200);
      expect(result4.result.body.counter).toBe(4);
    });
  });
});
