/**
 * Week 2 Test Infrastructure Validation
 *
 * @remarks
 * Validates that all Week 2 test infrastructure is working correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createMockServices,
  clearAllServices,
  MockEmailService,
  MockLoggingService,
  type ServiceRegistry,
} from './fixtures/services';
import {
  generateValidToken,
  generateExpiredToken,
  parseTokenClaims,
  isTokenExpired,
  assertValidTokenFormat,
} from './helpers/token-helpers';
import {
  createMockHttpRequest,
  createPostRequest,
  createAuthorizedRequest,
  createMockFunctionContext,
  assertResponseSuccess,
  executeHandler,
  type MockHttpRequest,
  type MockFunctionContext,
} from './helpers/handler-helpers';
import {
  createMockAuthEnvironment,
  clearMockAuthEnvironment,
  setupUserScenario,
  type MockAuthEnvironment,
} from './mocks/auth-mocks';

describe('Week 2 Test Infrastructure Validation', () => {
  describe('Service Fixtures', () => {
    let services: ServiceRegistry;

    beforeEach(() => {
      services = createMockServices();
    });

    afterEach(() => {
      clearAllServices(services);
    });

    it('should create mock service registry', () => {
      expect(services).toBeDefined();
      expect(services.email).toBeDefined();
      expect(services.logging).toBeDefined();
      expect(services.cache).toBeDefined();
      expect(services.queue).toBeDefined();
      expect(services.notification).toBeDefined();
    });

    it('should send email', async () => {
      const result = await services.email.sendEmail('test@example.com', 'Test', 'Body');

      expect(result.sent).toBe(true);
      expect(result.messageId).toBeTruthy();
    });

    it('should log messages', () => {
      services.logging.info('Test message', { context: 'test' });

      const logs = (services.logging as MockLoggingService).getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test message');
    });

    it('should cache values', async () => {
      await services.cache.set('test-key', { data: 'test-value' });

      const cached = await services.cache.get('test-key');
      expect(cached).toEqual({ data: 'test-value' });
    });

    it('should queue messages', async () => {
      const messageId = await services.queue.enqueue('test-queue', { data: 'test' });

      expect(messageId).toBeTruthy();

      const length = await services.queue.getQueueLength('test-queue');
      expect(length).toBe(1);
    });

    it('should send notifications', async () => {
      const result = await services.notification.sendNotification('user-123', {
        title: 'Test',
        message: 'Test notification',
        type: 'info',
        priority: 'normal',
      });

      expect(result.sent).toBe(true);
      expect(result.notificationId).toBeTruthy();
    });
  });

  describe('Token Helpers', () => {
    it('should generate valid token', () => {
      const token = generateValidToken();

      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3);
      assertValidTokenFormat(token);
    });

    it('should parse token claims', () => {
      const token = generateValidToken();
      const claims = parseTokenClaims(token);

      expect(claims).toBeTruthy();
      expect(claims?.sub).toBeTruthy();
      expect(claims?.exp).toBeTruthy();
    });

    it('should detect expired tokens', () => {
      const validToken = generateValidToken();
      const expiredToken = generateExpiredToken();

      expect(isTokenExpired(validToken)).toBe(false);
      expect(isTokenExpired(expiredToken)).toBe(true);
    });
  });

  describe('Handler Helpers', () => {
    it('should create mock HTTP request', () => {
      const request = createMockHttpRequest();

      expect(request).toBeDefined();
      expect(request.method).toBe('GET');
      expect(request.headers).toBeDefined();
    });

    it('should create POST request', () => {
      const request = createPostRequest('/api/test', { data: 'test' });

      expect(request.method).toBe('POST');
      expect(request.body).toEqual({ data: 'test' });
    });

    it('should create authorized request', () => {
      const token = generateValidToken();
      const request = createAuthorizedRequest(token);

      expect(request.headers.Authorization).toBe(`Bearer ${token}`);
    });

    it('should create function context', () => {
      const context = createMockFunctionContext();

      expect(context).toBeDefined();
      expect(context.invocationId).toBeTruthy();
      expect(context.log).toBeDefined();
    });

    it('should execute handler', async () => {
      const handler = async (ctx: MockFunctionContext, req: MockHttpRequest) => ({
        status: 200,
        body: { success: true },
        headers: {},
      });

      const request = createMockHttpRequest();
      const { result } = await executeHandler(handler, request);

      assertResponseSuccess(result);
      expect(result.body.success).toBe(true);
    });
  });

  describe('Auth Mocks', () => {
    let authEnv: MockAuthEnvironment;

    beforeEach(() => {
      authEnv = createMockAuthEnvironment();
    });

    afterEach(() => {
      clearMockAuthEnvironment(authEnv);
    });

    it('should create mock auth environment', () => {
      expect(authEnv).toBeDefined();
      expect(authEnv.tokenValidator).toBeDefined();
      expect(authEnv.userContextProvider).toBeDefined();
      expect(authEnv.authorizationProvider).toBeDefined();
      expect(authEnv.introspectionEndpoint).toBeDefined();
      expect(authEnv.tokenCache).toBeDefined();
    });

    it('should validate tokens', async () => {
      const token = generateValidToken();
      authEnv.tokenValidator.addValidToken(token);

      const result = await authEnv.tokenValidator.validate(token);

      expect(result.valid).toBe(true);
      expect(result.userId).toBeTruthy();
    });

    it('should setup user scenario', () => {
      const token = generateValidToken();
      setupUserScenario(authEnv, token);

      const claims = parseTokenClaims(token);
      const userId = claims?.sub || 'user-123';

      const userContext = authEnv.userContextProvider.getUserContext(userId);
      expect(userContext).toBeDefined();
      expect(userContext?.roles).toContain('user');
    });
  });

  describe('Integration Test', () => {
    let services: ServiceRegistry;
    let authEnv: MockAuthEnvironment;

    beforeEach(() => {
      services = createMockServices();
      authEnv = createMockAuthEnvironment();
    });

    afterEach(() => {
      clearAllServices(services);
      clearMockAuthEnvironment(authEnv);
    });

    it('should handle authenticated request with services', async () => {
      // Setup
      const token = generateValidToken();
      setupUserScenario(authEnv, token);

      // Handler
      const handler = async (ctx: MockFunctionContext, req: MockHttpRequest) => {
        // Authenticate
        const authHeader = req.headers.Authorization;
        const tokenValue = authHeader?.replace('Bearer ', '');

        if (!tokenValue) {
          return { status: 401, body: { error: 'Unauthorized' }, headers: {} };
        }

        const validation = await authEnv.tokenValidator.validate(tokenValue);

        if (!validation.valid) {
          return { status: 401, body: { error: 'Invalid token' }, headers: {} };
        }

        // Use services
        services.logging.info('Processing request', { userId: validation.userId });
        await services.cache.set(`user:${validation.userId}`, { lastSeen: new Date() });

        return {
          status: 200,
          body: { success: true, userId: validation.userId },
          headers: {},
        };
      };

      // Execute
      const request = createAuthorizedRequest(token);
      const { result } = await executeHandler(handler, request);

      // Assert
      assertResponseSuccess(result);
      expect(result.body.success).toBe(true);

      // Verify services were used
      const logs = (services.logging as MockLoggingService).getLogs();
      expect(logs.length).toBeGreaterThan(0);

      const cached = await services.cache.get('user:test-user-123');
      expect(cached).toBeTruthy();
    });
  });
});
