/**
 * Tests for Authentication Middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAuthMiddleware,
  extractToken,
  requireAuthentication,
  requireRoles,
  optionalAuthentication,
  AuthenticationError,
  AuthorizationError,
  type AuthMiddlewareConfig,
  type TokenExtractionConfig,
} from './auth-middleware';
import type { HttpRequest } from '@azure/functions';
import type { TokenValidationResult, TokenValidator } from '../../auth/types';
import { createLoginRateLimiter } from '../../auth/rate-limiter';
import { milliseconds } from '../../common/duration';

// Mock HTTP Request builder
function createMockRequest(options: {
  headers?: Record<string, string>;
  query?: Record<string, string>;
}): HttpRequest {
  const headersMap = new Map(Object.entries(options.headers || {}));
  const queryMap = new Map(Object.entries(options.query || {}));

  return {
    headers: headersMap as any,
    query: queryMap as any,
  } as HttpRequest;
}

describe('Token Extraction', () => {
  describe('extractToken()', () => {
    it('should extract Bearer token from Authorization header', () => {
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer test-token-123',
        },
      });

      const token = extractToken(request, { fromHeader: true });
      expect(token).toBe('test-token-123');
    });

    it('should extract token from custom header', () => {
      const request = createMockRequest({
        headers: {
          'x-api-key': 'api-key-123',
        },
      });

      const token = extractToken(request, {
        fromCustomHeader: true,
        customHeaderName: 'x-api-key',
      });
      expect(token).toBe('api-key-123');
    });

    it('should extract token from cookie', () => {
      const request = createMockRequest({
        headers: {
          cookie: 'session_id=xyz; auth_token=cookie-token-123; other=value',
        },
      });

      const token = extractToken(request, {
        fromCookie: true,
        cookieName: 'auth_token',
      });
      expect(token).toBe('cookie-token-123');
    });

    it('should extract token from query parameter', () => {
      const request = createMockRequest({
        query: {
          api_key: 'query-token-123',
        },
      });

      const token = extractToken(request, {
        fromQuery: true,
        queryParamName: 'api_key',
      });
      expect(token).toBe('query-token-123');
    });

    it('should prioritize header over cookie', () => {
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer header-token',
          cookie: 'auth_token=cookie-token',
        },
      });

      const token = extractToken(request, {
        fromHeader: true,
        fromCookie: true,
      });
      expect(token).toBe('header-token');
    });

    it('should fall back to cookie if header missing', () => {
      const request = createMockRequest({
        headers: {
          cookie: 'auth_token=cookie-token',
        },
      });

      const token = extractToken(request, {
        fromHeader: true,
        fromCookie: true,
      });
      expect(token).toBe('cookie-token');
    });

    it('should return null if no token found', () => {
      const request = createMockRequest({
        headers: {},
      });

      const token = extractToken(request, {
        fromHeader: true,
        fromCookie: true,
        fromQuery: true,
      });
      expect(token).toBeNull();
    });

    it('should handle malformed Authorization header', () => {
      const request = createMockRequest({
        headers: {
          authorization: 'Invalid header format',
        },
      });

      const token = extractToken(request, { fromHeader: true });
      expect(token).toBeNull();
    });

    it('should handle malformed cookie', () => {
      const request = createMockRequest({
        headers: {
          cookie: 'malformed',
        },
      });

      const token = extractToken(request, {
        fromCookie: true,
        cookieName: 'auth_token',
      });
      expect(token).toBeNull();
    });

    it('should decode URL-encoded cookie values', () => {
      const request = createMockRequest({
        headers: {
          cookie: 'auth_token=token%20with%20spaces',
        },
      });

      const token = extractToken(request, {
        fromCookie: true,
        cookieName: 'auth_token',
      });
      expect(token).toBe('token with spaces');
    });
  });
});

describe('Auth Middleware', () => {
  let mockValidator: TokenValidator;
  let mockRoleMapper: (claims: Record<string, any>) => string[];

  beforeEach(() => {
    // Default successful validator
    mockValidator = vi.fn().mockResolvedValue({
      valid: true,
      userId: 'user-123',
      email: 'user@example.com',
      claims: {
        sub: 'user-123',
        email: 'user@example.com',
        roles: ['user'],
      },
    } as TokenValidationResult);

    mockRoleMapper = vi.fn().mockReturnValue(['user']);
  });

  describe('createAuthMiddleware()', () => {
    it('should authenticate valid token', async () => {
      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        providerName: 'test',
      });

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toEqual({ message: 'success' });
      expect(mockValidator).toHaveBeenCalledWith('valid-token', expect.any(Object));
      expect(handler).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-123',
            email: 'user@example.com',
            roles: ['user'],
            isAuthenticated: true,
          }),
          token: 'valid-token',
          provider: 'test',
        })
      );
    });

    it('should reject missing token when not allowing anonymous', async () => {
      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {},
      });

      const result = await wrappedHandler({}, request);

      expect(result).toMatchObject({
        status: 401,
        body: {
          error: 'Unauthorized',
          code: 'MISSING_TOKEN',
        },
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow anonymous access when configured', async () => {
      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        authorization: {
          allowAnonymous: true,
        },
      });

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {},
      });

      const result = await wrappedHandler({}, request);

      expect(result).toEqual({ message: 'success' });
      expect(handler).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'anonymous',
            isAuthenticated: false,
          }),
        })
      );
    });

    it('should reject invalid token', async () => {
      mockValidator = vi.fn().mockResolvedValue({
        valid: false,
        error: 'Invalid signature',
      } as TokenValidationResult);

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toMatchObject({
        status: 401,
        body: {
          error: 'Unauthorized',
          code: 'INVALID_TOKEN',
        },
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      mockValidator = vi.fn().mockResolvedValue({
        valid: false,
        error: 'Token has expired',
      } as TokenValidationResult);

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer expired-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toMatchObject({
        status: 401,
        body: {
          error: 'Unauthorized',
          code: 'EXPIRED_TOKEN',
        },
      });
    });

    it('should pass validation context to validator', async () => {
      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
      });

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer test-token',
          'user-agent': 'Test Agent',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      await wrappedHandler({}, request);

      expect(mockValidator).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          ip: '192.168.1.1',
          userAgent: 'Test Agent',
          headers: expect.objectContaining({
            authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('Authorization Checks', () => {
    it('should allow user with required role', async () => {
      mockRoleMapper = vi.fn().mockReturnValue(['admin', 'user']);

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        authorization: {
          requiredRoles: ['admin'],
        },
      });

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer admin-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toEqual({ message: 'success' });
      expect(handler).toHaveBeenCalled();
    });

    it('should reject user without required role', async () => {
      mockRoleMapper = vi.fn().mockReturnValue(['user']);

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        authorization: {
          requiredRoles: ['admin'],
        },
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer user-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toMatchObject({
        status: 403,
        body: {
          error: 'Forbidden',
          code: 'MISSING_ROLE',
        },
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow user with any of required roles', async () => {
      mockRoleMapper = vi.fn().mockReturnValue(['editor', 'viewer']);

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        authorization: {
          requiredRoles: ['admin', 'editor', 'moderator'],
        },
      });

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer editor-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toEqual({ message: 'success' });
    });

    it('should enforce custom authorization check', async () => {
      const customCheck = vi.fn().mockReturnValue(false);

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        authorization: {
          customCheck,
        },
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toMatchObject({
        status: 403,
        body: {
          error: 'Forbidden',
          code: 'CUSTOM_CHECK_FAILED',
        },
      });
      expect(customCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
        })
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it('should support async custom authorization check', async () => {
      const customCheck = vi.fn().mockResolvedValue(true);

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        authorization: {
          customCheck,
        },
      });

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toEqual({ message: 'success' });
      expect(customCheck).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting when enabled', async () => {
      const rateLimiter = createLoginRateLimiter();
      rateLimiter.stopCleanup(); // Prevent background cleanup during tests

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        rateLimiting: {
          enabled: true,
          rateLimiter,
        },
      });

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer test-token',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      // First request should succeed
      const result = await wrappedHandler({}, request);
      expect(result).toEqual({ message: 'success' });
    });

    it('should block after rate limit exceeded', async () => {
      const rateLimiter = {
        checkLimit: vi.fn().mockResolvedValue({
          allowed: false,
          retryAfter: 60000, // 60 seconds
        }),
        recordAttempt: vi.fn(),
      };

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        rateLimiting: {
          enabled: true,
          rateLimiter: rateLimiter as any,
        },
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer test-token',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toMatchObject({
        status: 429,
        body: {
          error: 'Unauthorized',
          code: 'RATE_LIMITED',
        },
        headers: {
          'Retry-After': '60',
        },
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should record failed authentication attempts', async () => {
      mockValidator = vi.fn().mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      const rateLimiter = {
        checkLimit: vi.fn().mockResolvedValue({ allowed: true }),
        recordAttempt: vi.fn(),
      };

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        rateLimiting: {
          enabled: true,
          rateLimiter: rateLimiter as any,
        },
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      await wrappedHandler({}, request);

      expect(rateLimiter.recordAttempt).toHaveBeenCalledWith('192.168.1.1', false);
    });

    it('should record successful authentication attempts', async () => {
      const rateLimiter = {
        checkLimit: vi.fn().mockResolvedValue({ allowed: true }),
        recordAttempt: vi.fn(),
      };

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        rateLimiting: {
          enabled: true,
          rateLimiter: rateLimiter as any,
        },
      });

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer valid-token',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      await wrappedHandler({}, request);

      expect(rateLimiter.recordAttempt).toHaveBeenCalledWith('192.168.1.1', true);
    });
  });

  describe('Custom Error Handlers', () => {
    it('should use custom authentication error handler', async () => {
      const onAuthError = vi.fn().mockReturnValue({
        status: 400,
        body: { error: 'Custom auth error' },
      });

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        onAuthError,
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {},
      });

      const result = await wrappedHandler({}, request);

      expect(result).toEqual({
        status: 400,
        body: { error: 'Custom auth error' },
      });
      expect(onAuthError).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should use custom authorization error handler', async () => {
      const onAuthzError = vi.fn().mockReturnValue({
        status: 400,
        body: { error: 'Custom authz error' },
      });

      mockRoleMapper = vi.fn().mockReturnValue(['user']);

      const middleware = createAuthMiddleware({
        validator: mockValidator,
        roleMapper: mockRoleMapper,
        authorization: {
          requiredRoles: ['admin'],
        },
        onAuthzError,
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer user-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toEqual({
        status: 400,
        body: { error: 'Custom authz error' },
      });
      expect(onAuthzError).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });
  });
});

describe('Middleware Factories', () => {
  let mockValidator: TokenValidator;
  let mockRoleMapper: (claims: Record<string, any>) => string[];

  beforeEach(() => {
    mockValidator = vi.fn().mockResolvedValue({
      valid: true,
      userId: 'user-123',
      claims: { roles: ['user'] },
    });

    mockRoleMapper = vi.fn().mockReturnValue(['user']);
  });

  describe('requireAuthentication()', () => {
    it('should create middleware requiring authentication', async () => {
      const middleware = requireAuthentication(mockValidator, mockRoleMapper, 'test');

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toEqual({ message: 'success' });
    });

    it('should reject unauthenticated requests', async () => {
      const middleware = requireAuthentication(mockValidator, mockRoleMapper);

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {},
      });

      const result = await wrappedHandler({}, request);

      expect(result).toMatchObject({
        status: 401,
      });
    });
  });

  describe('requireRoles()', () => {
    it('should create middleware requiring specific roles', async () => {
      mockRoleMapper = vi.fn().mockReturnValue(['admin']);

      const middleware = requireRoles(mockValidator, ['admin'], mockRoleMapper, 'test');

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer admin-token',
        },
      });

      mockValidator = vi.fn().mockResolvedValue({
        valid: true,
        userId: 'admin-123',
        claims: { roles: ['admin'] },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toEqual({ message: 'success' });
    });

    it('should reject users without required role', async () => {
      mockRoleMapper = vi.fn().mockReturnValue(['user']);

      const middleware = requireRoles(mockValidator, ['admin'], mockRoleMapper);

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer user-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toMatchObject({
        status: 403,
      });
    });
  });

  describe('optionalAuthentication()', () => {
    it('should allow authenticated requests', async () => {
      const middleware = optionalAuthentication(mockValidator, mockRoleMapper, 'test');

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = await wrappedHandler({}, request);

      expect(result).toEqual({ message: 'success' });
      expect(handler).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          user: expect.objectContaining({
            isAuthenticated: true,
          }),
        })
      );
    });

    it('should allow anonymous requests', async () => {
      const middleware = optionalAuthentication(mockValidator, mockRoleMapper);

      const handler = vi.fn().mockResolvedValue({ message: 'success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {},
      });

      const result = await wrappedHandler({}, request);

      expect(result).toEqual({ message: 'success' });
      expect(handler).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'anonymous',
            isAuthenticated: false,
          }),
        })
      );
    });
  });
});
