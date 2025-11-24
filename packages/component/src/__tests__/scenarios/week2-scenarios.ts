/**
 * Week 2 Integration Test Scenarios
 *
 * @remarks
 * End-to-end test scenarios for Week 2 features including:
 * - Service injection in function handlers
 * - Token validation flows
 * - Authenticated request handling
 * - Service composition
 * - Error handling flows
 *
 * @module @atakora/component/__tests__/scenarios/week2-scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createMockServices,
  clearAllServices,
  type ServiceRegistry,
  MockEmailService,
  MockLoggingService,
} from '../fixtures/services';
import {
  generateValidToken,
  generateExpiredToken,
  generateAdminToken,
  generateUserToken,
  createBearerHeader,
  assertValidationSuccess,
  assertValidationFailure,
} from '../helpers/token-helpers';
import {
  createMockHttpRequest,
  createPostRequest,
  createAuthorizedRequest,
  createMockFunctionContext,
  assertResponseSuccess,
  assertUnauthorized,
  assertForbidden,
  executeHandler,
  type MockHttpRequest,
  type MockFunctionContext,
  type MockHttpResponse,
} from '../helpers/handler-helpers';
import {
  createMockAuthEnvironment,
  clearMockAuthEnvironment,
  setupAdminScenario,
  setupUserScenario,
  setupUnauthenticatedScenario,
  type MockAuthEnvironment,
} from '../mocks/auth-mocks';

// ============================================================================
// Scenario 1: Service Injection in Function Handlers
// ============================================================================

export function testServiceInjectionScenario() {
  describe('Scenario: Service Injection in Function Handlers', () => {
    let services: ServiceRegistry;
    let context: MockFunctionContext;

    beforeEach(() => {
      services = createMockServices();
      context = createMockFunctionContext();
    });

    afterEach(() => {
      clearAllServices(services);
    });

    it('should inject email service into handler', async () => {
      // Arrange
      const handler = async (ctx: MockFunctionContext, req: MockHttpRequest) => {
        const { to, subject, body } = req.body;

        // Use injected email service
        const result = await services.email.sendEmail(to, subject, body);

        return {
          status: 200,
          body: { messageId: result.messageId, sent: result.sent },
          headers: {},
        };
      };

      const request = createPostRequest('/api/send-email', {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'Hello, World!',
      });

      // Act
      const { result } = await executeHandler(handler, request, context);

      // Assert
      assertResponseSuccess(result);
      expect(result.body.sent).toBe(true);
      expect(result.body.messageId).toBeTruthy();

      // Verify email was sent
      const sentEmails = (services.email as MockEmailService).getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].to).toBe('test@example.com');
    });

    it('should inject multiple services into handler', async () => {
      // Arrange
      const handler = async (ctx: MockFunctionContext, req: MockHttpRequest) => {
        const { userId, message } = req.body;

        // Use logging service
        services.logging.info('Processing notification', { userId });

        // Use cache service
        const cachedUser = await services.cache.get(`user:${userId}`);

        if (!cachedUser) {
          await services.cache.set(`user:${userId}`, { id: userId, lastSeen: new Date() });
        }

        // Use notification service
        await services.notification.sendNotification(userId, {
          title: 'New Message',
          message,
          type: 'info',
          priority: 'normal',
        });

        return {
          status: 200,
          body: { success: true },
          headers: {},
        };
      };

      const request = createPostRequest('/api/notify', {
        userId: 'user-123',
        message: 'Test notification',
      });

      // Act
      const { result } = await executeHandler(handler, request, context);

      // Assert
      assertResponseSuccess(result);

      // Verify logging
      const logs = (services.logging as MockLoggingService).getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Processing notification');

      // Verify cache
      const cached = await services.cache.get('user:user-123');
      expect(cached).toBeTruthy();

      // Verify notification
      const notifications = await services.notification.getNotifications('user-123');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Test notification');
    });

    it('should handle service composition', async () => {
      // Arrange - Handler that uses multiple services in sequence
      const handler = async (ctx: MockFunctionContext, req: MockHttpRequest) => {
        const { datasetId, userId } = req.body;

        // Log start
        services.logging.info('Starting data processing', { datasetId, userId });

        // Queue processing job
        const jobId = await services.queue.enqueue('processing', {
          datasetId,
          userId,
          timestamp: new Date(),
        });

        // Cache job status
        await services.cache.set(`job:${jobId}`, {
          status: 'queued',
          datasetId,
          userId,
        });

        // Send notification
        await services.notification.sendNotification(userId, {
          title: 'Processing Started',
          message: `Your dataset ${datasetId} is being processed`,
          type: 'info',
          priority: 'normal',
        });

        return {
          status: 202,
          body: { jobId, status: 'queued' },
          headers: {},
        };
      };

      const request = createPostRequest('/api/process', {
        datasetId: 'dataset-123',
        userId: 'user-123',
      });

      // Act
      const { result } = await executeHandler(handler, request, context);

      // Assert
      expect(result.status).toBe(202);
      expect(result.body.status).toBe('queued');

      // Verify all services were used
      const logs = (services.logging as MockLoggingService).getLogs();
      expect(logs.length).toBeGreaterThan(0);

      const queueLength = await services.queue.getQueueLength('processing');
      expect(queueLength).toBe(1);

      const notifications = await services.notification.getNotifications('user-123');
      expect(notifications.length).toBeGreaterThan(0);
    });
  });
}

// ============================================================================
// Scenario 2: Token Validation Flow
// ============================================================================

export function testTokenValidationScenario() {
  describe('Scenario: Token Validation Flow', () => {
    let authEnv: MockAuthEnvironment;

    beforeEach(() => {
      authEnv = createMockAuthEnvironment();
    });

    afterEach(() => {
      clearMockAuthEnvironment(authEnv);
    });

    it('should validate valid token successfully', async () => {
      // Arrange
      const token = generateValidToken();
      authEnv.tokenValidator.addValidToken(token);

      // Act
      const result = await authEnv.tokenValidator.validate(token);

      // Assert
      assertValidationSuccess(result);
      expect(result.userId).toBe('test-user-123');
    });

    it('should reject expired token', async () => {
      // Arrange
      const token = generateExpiredToken();

      // Act
      const result = await authEnv.tokenValidator.validate(token);

      // Assert
      assertValidationFailure(result, 'expired');
    });

    it('should cache validated tokens', async () => {
      // Arrange
      const token = generateValidToken();
      authEnv.tokenValidator.addValidToken(token);

      // First validation
      const result1 = await authEnv.tokenValidator.validate(token);

      // Cache the token
      authEnv.tokenCache.set(token, {
        userId: result1.userId!,
        claims: result1.claims!,
        expiresAt: Date.now() + 3600000,
      });

      // Act - Get from cache
      const cached = authEnv.tokenCache.get(token);

      // Assert
      expect(cached).toBeTruthy();
      expect(cached?.userId).toBe(result1.userId);
    });

    it('should handle token revocation', async () => {
      // Arrange
      const token = generateValidToken();
      authEnv.tokenValidator.addValidToken(token);

      // Validate successfully first
      const result1 = await authEnv.tokenValidator.validate(token);
      assertValidationSuccess(result1);

      // Act - Revoke token
      authEnv.tokenValidator.revokeToken(token);

      // Validate again
      const result2 = await authEnv.tokenValidator.validate(token);

      // Assert
      assertValidationFailure(result2, 'revoked');
    });
  });
}

// ============================================================================
// Scenario 3: Authenticated Request Handling
// ============================================================================

export function testAuthenticatedRequestScenario() {
  describe('Scenario: Authenticated Request Handling', () => {
    let authEnv: MockAuthEnvironment;
    let context: MockFunctionContext;

    beforeEach(() => {
      authEnv = createMockAuthEnvironment();
      context = createMockFunctionContext();
    });

    afterEach(() => {
      clearMockAuthEnvironment(authEnv);
    });

    it('should allow authenticated admin request', async () => {
      // Arrange
      const token = generateAdminToken();
      setupAdminScenario(authEnv, token);

      const handler = async (ctx: MockFunctionContext, req: MockHttpRequest) => {
        // Extract and validate token
        const authHeader = req.headers.Authorization;
        const tokenValue = authHeader?.replace('Bearer ', '');

        if (!tokenValue) {
          return { status: 401, body: { error: 'Missing token' }, headers: {} };
        }

        const validation = await authEnv.tokenValidator.validate(tokenValue);

        if (!validation.valid) {
          return { status: 401, body: { error: 'Invalid token' }, headers: {} };
        }

        // Check admin permission
        const userContext = authEnv.userContextProvider.getUserContextFromToken(tokenValue);
        const hasPermission = authEnv.authorizationProvider.hasPermission(
          userContext!.id,
          'admin:read',
          userContext!.roles
        );

        if (!hasPermission) {
          return { status: 403, body: { error: 'Forbidden' }, headers: {} };
        }

        return {
          status: 200,
          body: { message: 'Admin access granted', userId: validation.userId },
          headers: {},
        };
      };

      const request = createAuthorizedRequest(token, {
        method: 'GET',
        url: '/api/admin/users',
      });

      // Act
      const { result } = await executeHandler(handler, request, context);

      // Assert
      assertResponseSuccess(result);
      expect(result.body.message).toBe('Admin access granted');
    });

    it('should reject unauthenticated request', async () => {
      // Arrange
      const handler = async (ctx: MockFunctionContext, req: MockHttpRequest) => {
        const authHeader = req.headers.Authorization;

        if (!authHeader) {
          return { status: 401, body: { error: 'Missing authorization header' }, headers: {} };
        }

        return { status: 200, body: { success: true }, headers: {} };
      };

      const request = createMockHttpRequest({
        method: 'GET',
        url: '/api/protected',
      });

      // Act
      const { result } = await executeHandler(handler, request, context);

      // Assert
      assertUnauthorized(result);
    });

    it('should reject user without required permission', async () => {
      // Arrange
      const token = generateUserToken('user-123', 'user@example.com');
      setupUserScenario(authEnv, token);

      const handler = async (ctx: MockFunctionContext, req: MockHttpRequest) => {
        const authHeader = req.headers.Authorization;
        const tokenValue = authHeader?.replace('Bearer ', '');

        if (!tokenValue) {
          return { status: 401, body: { error: 'Missing token' }, headers: {} };
        }

        const validation = await authEnv.tokenValidator.validate(tokenValue);

        if (!validation.valid) {
          return { status: 401, body: { error: 'Invalid token' }, headers: {} };
        }

        // Check admin permission (user doesn't have this)
        const userContext = authEnv.userContextProvider.getUserContextFromToken(tokenValue);
        const hasPermission = authEnv.authorizationProvider.hasPermission(
          userContext!.id,
          'admin:write',
          userContext!.roles
        );

        if (!hasPermission) {
          return { status: 403, body: { error: 'Insufficient permissions' }, headers: {} };
        }

        return { status: 200, body: { success: true }, headers: {} };
      };

      const request = createAuthorizedRequest(token, {
        method: 'POST',
        url: '/api/admin/settings',
      });

      // Act
      const { result } = await executeHandler(handler, request, context);

      // Assert
      assertForbidden(result);
      expect(result.body.error).toContain('permissions');
    });
  });
}

// ============================================================================
// Scenario 4: Service Composition with Authentication
// ============================================================================

export function testServiceCompositionWithAuthScenario() {
  describe('Scenario: Service Composition with Authentication', () => {
    let services: ServiceRegistry;
    let authEnv: MockAuthEnvironment;
    let context: MockFunctionContext;

    beforeEach(() => {
      services = createMockServices();
      authEnv = createMockAuthEnvironment();
      context = createMockFunctionContext();
    });

    afterEach(() => {
      clearAllServices(services);
      clearMockAuthEnvironment(authEnv);
    });

    it('should process authenticated request with service composition', async () => {
      // Arrange
      const token = generateValidToken();
      setupUserScenario(authEnv, token);

      const handler = async (ctx: MockFunctionContext, req: MockHttpRequest) => {
        // 1. Authenticate
        const authHeader = req.headers.Authorization;
        const tokenValue = authHeader?.replace('Bearer ', '');

        if (!tokenValue) {
          return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
        }

        const validation = await authEnv.tokenValidator.validate(tokenValue);

        if (!validation.valid) {
          return { status: 401, body: { error: 'Invalid token' }, headers: {} };
        }

        // 2. Log the request
        services.logging.info('Processing authenticated request', {
          userId: validation.userId,
          endpoint: req.url,
        });

        // 3. Check cache for user data
        const cacheKey = `user:${validation.userId}`;
        let userData = await services.cache.get(cacheKey);

        if (!userData) {
          userData = {
            id: validation.userId,
            email: validation.email,
            lastAccess: new Date(),
          };
          await services.cache.set(cacheKey, userData, 3600);
        }

        // 4. Send notification
        await services.notification.sendNotification(validation.userId!, {
          title: 'Action Completed',
          message: 'Your request was processed successfully',
          type: 'success',
          priority: 'normal',
        });

        return {
          status: 200,
          body: {
            success: true,
            userId: validation.userId,
            cached: !!userData,
          },
          headers: {},
        };
      };

      const request = createAuthorizedRequest(token, {
        method: 'POST',
        url: '/api/process',
        body: { action: 'test' },
      });

      // Act
      const { result } = await executeHandler(handler, request, context);

      // Assert
      assertResponseSuccess(result);
      expect(result.body.success).toBe(true);

      // Verify all services were used
      const logs = (services.logging as MockLoggingService).getLogs();
      expect(logs.length).toBeGreaterThan(0);

      const cached = await services.cache.get('user:test-user-123');
      expect(cached).toBeTruthy();

      const notifications = await services.notification.getNotifications('test-user-123');
      expect(notifications.length).toBeGreaterThan(0);
    });
  });
}

// ============================================================================
// Scenario 5: Error Handling Flow
// ============================================================================

export function testErrorHandlingScenario() {
  describe('Scenario: Error Handling Flow', () => {
    let services: ServiceRegistry;
    let authEnv: MockAuthEnvironment;
    let context: MockFunctionContext;

    beforeEach(() => {
      services = createMockServices();
      authEnv = createMockAuthEnvironment();
      context = createMockFunctionContext();
    });

    afterEach(() => {
      clearAllServices(services);
      clearMockAuthEnvironment(authEnv);
    });

    it('should handle service failure gracefully', async () => {
      // Arrange
      const token = generateValidToken();
      setupUserScenario(authEnv, token);

      // Configure email service to fail
      (services.email as MockEmailService).setFailureRate(1.0); // 100% failure

      const handler = async (ctx: MockFunctionContext, req: MockHttpRequest) => {
        try {
          const { to, subject, body } = req.body;

          const result = await services.email.sendEmail(to, subject, body);

          if (!result.sent) {
            services.logging.error('Email sending failed', undefined, { error: result.error });

            return {
              status: 500,
              body: { error: 'Failed to send email', details: result.error },
              headers: {},
            };
          }

          return {
            status: 200,
            body: { success: true, messageId: result.messageId },
            headers: {},
          };
        } catch (error) {
          services.logging.error('Unexpected error', error as Error);

          return {
            status: 500,
            body: { error: 'Internal server error' },
            headers: {},
          };
        }
      };

      const request = createAuthorizedRequest(token, {
        method: 'POST',
        url: '/api/send-email',
        body: {
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test email',
        },
      });

      // Act
      const { result } = await executeHandler(handler, request, context);

      // Assert
      expect(result.status).toBe(500);
      expect(result.body.error).toBeTruthy();

      // Verify error was logged
      const logs = (services.logging as MockLoggingService).getLogsByLevel('error');
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should handle expired token gracefully', async () => {
      // Arrange
      const token = generateExpiredToken();

      const handler = async (ctx: MockFunctionContext, req: MockHttpRequest) => {
        const authHeader = req.headers.Authorization;
        const tokenValue = authHeader?.replace('Bearer ', '');

        if (!tokenValue) {
          return { status: 401, body: { error: 'Missing token' }, headers: {} };
        }

        const validation = await authEnv.tokenValidator.validate(tokenValue);

        if (!validation.valid) {
          services.logging.warn('Token validation failed', { error: validation.error });

          return {
            status: 401,
            body: { error: validation.error },
            headers: {},
          };
        }

        return { status: 200, body: { success: true }, headers: {} };
      };

      const request = createAuthorizedRequest(token);

      // Act
      const { result } = await executeHandler(handler, request, context);

      // Assert
      assertUnauthorized(result);

      // Verify warning was logged
      const warnings = (services.logging as MockLoggingService).getLogsByLevel('warn');
      expect(warnings.length).toBeGreaterThan(0);
    });
  });
}

// ============================================================================
// Export All Scenarios
// ============================================================================

/**
 * Run all Week 2 integration scenarios
 */
export function runAllWeek2Scenarios() {
  testServiceInjectionScenario();
  testTokenValidationScenario();
  testAuthenticatedRequestScenario();
  testServiceCompositionWithAuthScenario();
  testErrorHandlingScenario();
}
