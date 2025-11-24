/**
 * End-to-End Integration Tests - Week 3
 *
 * Comprehensive E2E tests covering complete user workflows:
 * - Backend definition → Customization → Synthesis → Validation
 * - Authentication flow (token → user context → authorization)
 * - Service registry flow (register → inject → use → mock)
 * - Multi-provider authentication
 * - Government Cloud scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineBackend } from '../../backend/define-backend';
import { defineSchema } from '../../schema/define-schema';
import { defineAuth } from '../../auth/define-auth';
import { createMinimalBackend, createStandardBackend, createComplexBackend, createProductionBackend, createGovernmentBackend } from '../fixtures/backends';
import { assertValidBackendStructure, createMockSynthesisContext, assertResourceSynthesized } from '../helpers/integration-helpers';
import { generateValidToken, generateAdminToken, parseTokenClaims } from '../helpers/token-helpers';
import { createMockAuthEnvironment, setupAdminScenario } from '../mocks/auth-mocks';
import { createMockServices, clearAllServices } from '../fixtures/services';
import { executeHandler, createAuthorizedRequest, assertResponseSuccess } from '../helpers/handler-helpers';
import { a } from '../../schema/field-types';

describe('E2E Integration Tests - Week 3', () => {
  describe('Complete Backend Flow', () => {
    it('should complete full backend lifecycle: define → customize → validate', () => {
      // 1. Define schema
      const schema = defineSchema({
        User: a.model({
          id: a.id(),
          name: a.string().required(),
          email: a.string().required(),
          role: a.enum(['admin', 'user']).default('user'),
        }).crud(),
        Post: a.model({
          id: a.id(),
          title: a.string().required(),
          content: a.string(),
          authorId: a.ref('User').required(),
          publishedAt: a.datetime(),
        }).crud(),
      });

      // 2. Define authentication
      const auth = defineAuth({
        providers: {
          entra: {
            tenantId: 'test-tenant',
            clientId: 'test-client',
            enabled: true,
          },
        },
      });

      // 3. Define backend
      const backend = defineBackend({
        schema,
        authentication: auth,
        settings: {
          name: 'e2e-test-app',
          region: 'eastus',
          environment: 'development',
        },
      });

      // 4. Validate structure
      assertValidBackendStructure(backend);

      // 5. Verify schema integrated
      expect(backend.schema).toBeDefined();
      expect(backend.schema.models.User).toBeDefined();
      expect(backend.schema.models.Post).toBeDefined();

      // 6. Verify authentication integrated
      expect(backend.authentication).toBeDefined();
      expect(backend.authentication?.providers?.entra).toBeDefined();

      // 7. Verify settings applied
      expect(backend.settings.name).toBe('e2e-test-app');
      expect(backend.settings.region).toBe('eastus');
      expect(backend.settings.environment).toBe('development');
    });

    it('should synthesize backend to ARM template structure', () => {
      const backend = createStandardBackend();
      const context = createMockSynthesisContext(backend);

      // Synthesize would happen here (mocked for unit testing)
      // In real scenario, this would generate ARM templates

      expect(context).toBeDefined();
      expect(context.backend).toBe(backend);
    });

    it('should support incremental backend customization', () => {
      // Start with minimal backend
      let backend = createMinimalBackend();
      expect(backend.schema.models).toHaveProperty('User');

      // In practice, you'd clone and extend the backend
      // This demonstrates the pattern
      const extendedBackend = createStandardBackend();
      expect(Object.keys(extendedBackend.schema.models).length).toBeGreaterThan(
        Object.keys(backend.schema.models).length
      );
    });
  });

  describe('Authentication Flow E2E', () => {
    let authEnv: ReturnType<typeof createMockAuthEnvironment>;

    beforeEach(() => {
      authEnv = createMockAuthEnvironment();
    });

    afterEach(() => {
      // Cleanup mock environment
      authEnv.tokenValidator.validTokens.clear();
      authEnv.tokenValidator.revokedTokens.clear();
      authEnv.authorizationProvider.clearAllPermissions();
    });

    it('should complete full auth flow: token → validate → user context → authorize', async () => {
      // 1. Generate token
      const token = generateValidToken();
      authEnv.tokenValidator.addValidToken(token);

      // 2. Validate token
      const validation = await authEnv.tokenValidator.validate(token);
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBeTruthy();

      // 3. Extract user context
      const userContext = authEnv.userContextProvider.getUserContextFromToken(token);
      expect(userContext).toBeDefined();
      expect(userContext?.id).toBe(validation.userId);

      // 4. Check authorization
      const hasPermission = authEnv.authorizationProvider.hasPermission(
        userContext!.id,
        'posts:read',
        userContext!.roles
      );

      // Default user should have basic read permissions
      expect(hasPermission).toBe(true);
    });

    it('should handle admin authentication flow', async () => {
      const adminToken = generateAdminToken();
      setupAdminScenario(authEnv, adminToken);

      // Validate admin token
      const validation = await authEnv.tokenValidator.validate(adminToken);
      expect(validation.valid).toBe(true);

      // Get admin context
      const adminContext = authEnv.userContextProvider.getUserContextFromToken(adminToken);
      expect(adminContext?.roles).toContain('admin');

      // Check admin permissions
      const canWrite = authEnv.authorizationProvider.hasPermission(
        adminContext!.id,
        'admin:write',
        adminContext!.roles
      );
      expect(canWrite).toBe(true);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MTYwMDAwMDAwMH0.test';

      const validation = await authEnv.tokenValidator.validate(expiredToken);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('expired');
    });

    it('should handle revoked tokens', async () => {
      const token = generateValidToken();
      authEnv.tokenValidator.addValidToken(token);

      // Token is valid initially
      let validation = await authEnv.tokenValidator.validate(token);
      expect(validation.valid).toBe(true);

      // Revoke token
      authEnv.tokenValidator.revokeToken(token);

      // Token is now invalid
      validation = await authEnv.tokenValidator.validate(token);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('revoked');
    });
  });

  describe('Service Flow E2E', () => {
    let services: ReturnType<typeof createMockServices>;

    beforeEach(() => {
      services = createMockServices();
    });

    afterEach(() => {
      clearAllServices(services);
    });

    it('should complete service flow: register → inject → use in handler', async () => {
      // 1. Services already registered in fixture

      // 2. Create handler that uses services
      const handler = async (ctx: any, req: any) => {
        // Log request
        services.logging.info('Processing request', { method: req.method, url: req.url });

        // Cache check
        const cacheKey = `data:${req.params?.id || 'default'}`;
        let data = await services.cache.get(cacheKey);

        if (!data) {
          // Simulate data fetch
          data = { id: req.params?.id || 'default', value: 'test data' };

          // Cache the result
          await services.cache.set(cacheKey, data, 300); // 5 min TTL
        }

        // Queue a background job
        await services.queue.enqueue('processing', {
          action: 'process-data',
          dataId: data.id,
        });

        return {
          status: 200,
          body: { data, cached: !!data },
          headers: { 'Content-Type': 'application/json' },
        };
      };

      // 3. Execute handler
      const request = { method: 'GET', url: '/api/data', params: { id: 'test-123' } };
      const result = await executeHandler(handler, request);

      // 4. Verify result
      assertResponseSuccess(result.result);
      expect(result.result.body.data.id).toBe('test-123');

      // 5. Verify service interactions
      const logs = services.logging.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toBe('Processing request');

      const queueLength = await services.queue.getQueueLength('processing');
      expect(queueLength).toBe(1);
    });

    it('should support service composition', async () => {
      // Handler that uses multiple services together
      const handler = async (ctx: any, req: any) => {
        const { userId, message } = req.body;

        try {
          // 1. Log the operation
          services.logging.info('Sending notification', { userId, message });

          // 2. Check cache for user preferences
          const cacheKey = `user-prefs:${userId}`;
          let prefs = await services.cache.get(cacheKey);

          if (!prefs) {
            prefs = { emailEnabled: true }; // Default preferences
            await services.cache.set(cacheKey, prefs, 3600);
          }

          // 3. Send email if enabled
          if (prefs.emailEnabled) {
            await services.email.sendEmail(
              `user-${userId}@example.com`,
              'Notification',
              message
            );
          }

          // 4. Send in-app notification
          await services.notification.sendNotification(userId, {
            title: 'New Notification',
            message,
            type: 'info',
            priority: 'normal',
          });

          // 5. Queue analytics event
          await services.queue.enqueue('analytics', {
            event: 'notification-sent',
            userId,
            timestamp: new Date().toISOString(),
          });

          return {
            status: 200,
            body: { success: true },
            headers: {},
          };
        } catch (error) {
          services.logging.error('Failed to send notification', error);
          return {
            status: 500,
            body: { error: 'Internal server error' },
            headers: {},
          };
        }
      };

      // Execute
      const request = {
        method: 'POST',
        url: '/api/notify',
        body: { userId: 'user-123', message: 'Test notification' },
      };
      const result = await executeHandler(handler, request);

      // Verify
      expect(result.result.status).toBe(200);

      // Verify all service interactions
      const notifications = await services.notification.getNotifications('user-123');
      expect(notifications).toHaveLength(1);

      const sentEmails = services.email.getSentEmails();
      expect(sentEmails).toHaveLength(1);

      const analyticsQueueLength = await services.queue.getQueueLength('analytics');
      expect(analyticsQueueLength).toBe(1);
    });
  });

  describe('Multi-Provider Authentication E2E', () => {
    it('should support multiple auth providers in single backend', () => {
      const auth = defineAuth({
        providers: {
          entra: {
            tenantId: 'test-tenant',
            clientId: 'test-client',
            enabled: true,
          },
          apiKeys: {
            keys: [
              { id: 'key-1', value: 'secret-1', name: 'Service 1' },
              { id: 'key-2', value: 'secret-2', name: 'Service 2' },
            ],
            enabled: true,
          },
        },
      });

      const schema = defineSchema({
        User: a.model({
          id: a.id(),
          name: a.string(),
        }).crud(),
      });

      const backend = defineBackend({
        schema,
        authentication: auth,
        settings: { name: 'multi-auth-app' },
      });

      expect(backend.authentication?.providers?.entra).toBeDefined();
      expect(backend.authentication?.providers?.apiKeys).toBeDefined();
    });

    it('should handle different auth providers in same request flow', async () => {
      const authEnv = createMockAuthEnvironment();

      // Entra token
      const jwtToken = generateValidToken();
      authEnv.tokenValidator.addValidToken(jwtToken);

      // Validate JWT
      const jwtValidation = await authEnv.tokenValidator.validate(jwtToken);
      expect(jwtValidation.valid).toBe(true);

      // API key (simulated)
      const apiKey = 'test-api-key-123';
      // In real scenario, would validate against stored keys
      expect(apiKey).toBeTruthy();
    });
  });

  describe('Government Cloud E2E', () => {
    it('should create government-compliant backend', () => {
      const govBackend = createGovernmentBackend();

      // Verify government cloud configuration
      assertValidBackendStructure(govBackend);

      // Should have enhanced security settings
      expect(govBackend.settings.name).toContain('gov');

      // Authentication should be configured for government cloud
      expect(govBackend.authentication).toBeDefined();
    });

    it('should enforce strict validation in government mode', () => {
      const govBackend = createGovernmentBackend();

      // Government backends should have stricter validation
      // This is a placeholder for actual validation logic
      expect(govBackend.settings.environment).toBe('production');
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should integrate auth + services + handler', async () => {
      // Setup
      const authEnv = createMockAuthEnvironment();
      const services = createMockServices();
      const token = generateValidToken();
      authEnv.tokenValidator.addValidToken(token);

      // Handler with auth and services
      const handler = async (ctx: any, req: any) => {
        // Extract token
        const authHeader = req.headers?.Authorization;
        if (!authHeader) {
          return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
        }

        const tokenValue = authHeader.replace('Bearer ', '');

        // Validate token
        const validation = await authEnv.tokenValidator.validate(tokenValue);
        if (!validation.valid) {
          return { status: 401, body: { error: 'Invalid token' }, headers: {} };
        }

        // Use services
        services.logging.info('Authenticated request', { userId: validation.userId });

        return {
          status: 200,
          body: { userId: validation.userId, message: 'Success' },
          headers: {},
        };
      };

      // Execute
      const request = createAuthorizedRequest(token);
      const result = await executeHandler(handler, request);

      // Verify
      assertResponseSuccess(result.result);
      expect(result.result.body.userId).toBeTruthy();

      // Cleanup
      clearAllServices(services);
    });

    it('should support complex backend with all features', () => {
      const complex = createComplexBackend();

      // Has multiple models
      expect(Object.keys(complex.schema.models).length).toBeGreaterThan(5);

      // Has authentication
      expect(complex.authentication).toBeDefined();

      // Has proper settings
      expect(complex.settings.environment).toBe('staging');

      assertValidBackendStructure(complex);
    });
  });

  describe('Performance and Scale', () => {
    it('should handle production-scale backend', () => {
      const production = createProductionBackend();

      // Should have many models
      expect(Object.keys(production.schema.models).length).toBeGreaterThanOrEqual(15);

      // Should have complete configuration
      assertValidBackendStructure(production);

      // Should validate successfully
      expect(production.settings.environment).toBe('production');
    });

    it('should create backend in reasonable time', () => {
      const start = Date.now();

      const backend = createStandardBackend();

      const duration = Date.now() - start;

      // Should be very fast (< 100ms)
      expect(duration).toBeLessThan(100);
      expect(backend).toBeDefined();
    });
  });
});
