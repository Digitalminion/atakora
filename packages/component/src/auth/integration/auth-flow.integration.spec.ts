/**
 * Integration Tests for Complete Authentication Flow
 *
 * Tests the end-to-end authentication flow including:
 * - Token validation
 * - Token introspection
 * - Rate limiting
 * - Middleware integration
 * - User context creation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenIntrospector } from '../token-introspection';
import { createAuthMiddleware } from '../../functions/middleware/auth-middleware';
import { TokenCache } from '../token-cache';
import { AuthRateLimiter } from '../rate-limiter';
import { validateJwtSignature } from '../token-validator';
import { createUserContext } from '../user-context';
import { milliseconds, minutes } from '../../common/duration';
import type { HttpRequest } from '@azure/functions';

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

describe('Complete Authentication Flow Integration', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('OAuth 2.0 Introspection + Middleware Flow', () => {
    it('should authenticate opaque token using introspection', async () => {
      // Setup introspector
      const introspector = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        cacheDuration: minutes(5),
      });

      // Mock introspection response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          active: true,
          sub: 'user-123',
          username: 'user@example.com',
          scope: 'read write',
          roles: ['user', 'editor'],
          client_id: 'test-client',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      });

      // Create validator using introspector
      const validator = async (token: string) => {
        return await introspector.introspect(token);
      };

      // Create middleware
      const middleware = createAuthMiddleware({
        validator,
        roleMapper: (claims) => claims.roles || [],
        providerName: 'oauth',
        extraction: {
          fromHeader: true,
        },
        authorization: {
          requiredRoles: ['user'],
        },
      });

      // Create test handler
      const handler = vi.fn().mockResolvedValue({
        message: 'Success',
        data: { value: 42 },
      });

      const wrappedHandler = middleware(handler);

      // Make request with opaque token
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer opaque-token-abc123',
        },
      });

      // Execute
      const result = await wrappedHandler({ input: 'test' }, request);

      // Verify success
      expect(result).toEqual({
        message: 'Success',
        data: { value: 42 },
      });

      // Verify handler was called with correct context
      expect(handler).toHaveBeenCalledWith(
        { input: 'test' },
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-123',
            email: 'user@example.com',
            roles: ['user', 'editor'],
            isAuthenticated: true,
          }),
          token: 'opaque-token-abc123',
          provider: 'oauth',
        })
      );

      // Verify introspection was called
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should cache introspection results for subsequent requests', async () => {
      const introspector = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        cacheDuration: minutes(5),
      });

      // Mock introspection response
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          active: true,
          sub: 'user-123',
          username: 'user@example.com',
        }),
      });

      const validator = async (token: string) => {
        return await introspector.introspect(token);
      };

      const middleware = createAuthMiddleware({
        validator,
        roleMapper: () => ['user'],
        providerName: 'oauth',
      });

      const handler = vi.fn().mockResolvedValue({ message: 'Success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer cached-token',
        },
      });

      // First request - should hit introspection endpoint
      await wrappedHandler({}, request);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      await wrappedHandler({}, request);
      expect(fetchMock).toHaveBeenCalledTimes(1); // No additional calls

      // Verify both requests succeeded
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should reject inactive tokens from introspection', async () => {
      const introspector = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      });

      // Mock inactive token response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          active: false, // Token is not active
        }),
      });

      const validator = async (token: string) => {
        return await introspector.introspect(token);
      };

      const middleware = createAuthMiddleware({
        validator,
        roleMapper: () => [],
        providerName: 'oauth',
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer inactive-token',
        },
      });

      const result = await wrappedHandler({}, request);

      // Verify rejection
      expect(result).toMatchObject({
        status: 401,
        body: {
          error: 'Unauthorized',
          code: 'INVALID_TOKEN',
        },
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce rate limits across failed authentication attempts', async () => {
      const introspector = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      });

      // Mock always inactive
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ active: false }),
      });

      const rateLimiter = new AuthRateLimiter({
        maxAttempts: 3,
        windowMs: minutes(15),
        blockDuration: minutes(60),
      });
      rateLimiter.stopCleanup();

      const validator = async (token: string) => {
        return await introspector.introspect(token);
      };

      const middleware = createAuthMiddleware({
        validator,
        roleMapper: () => [],
        providerName: 'oauth',
        rateLimiting: {
          enabled: true,
          rateLimiter,
        },
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer bad-token',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        const result = await wrappedHandler({}, request);
        expect(result).toMatchObject({
          status: 401,
          body: { code: 'INVALID_TOKEN' },
        });
      }

      // 4th attempt should be rate limited
      const result = await wrappedHandler({}, request);
      expect(result).toMatchObject({
        status: 429,
        body: {
          error: 'Unauthorized',
          code: 'RATE_LIMITED',
        },
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should reset rate limit after successful authentication', async () => {
      const introspector = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      });

      const rateLimiter = new AuthRateLimiter({
        maxAttempts: 3,
        windowMs: minutes(15),
        blockDuration: minutes(60),
      });
      rateLimiter.stopCleanup();

      const validator = async (token: string) => {
        return await introspector.introspect(token);
      };

      const middleware = createAuthMiddleware({
        validator,
        roleMapper: () => ['user'],
        providerName: 'oauth',
        rateLimiting: {
          enabled: true,
          rateLimiter,
        },
      });

      const handler = vi.fn().mockResolvedValue({ message: 'Success' });
      const wrappedHandler = middleware(handler);

      // Make 2 failed attempts
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ active: false }),
      });

      for (let i = 0; i < 2; i++) {
        const request = createMockRequest({
          headers: {
            authorization: 'Bearer bad-token',
            'x-forwarded-for': '192.168.1.1',
          },
        });
        await wrappedHandler({}, request);
      }

      // Now make a successful authentication
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          active: true,
          sub: 'user-123',
          username: 'user@example.com',
        }),
      });

      const successRequest = createMockRequest({
        headers: {
          authorization: 'Bearer good-token',
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const result = await wrappedHandler({}, successRequest);

      // Should succeed
      expect(result).toEqual({ message: 'Success' });

      // Rate limit should be reset - can make more attempts
      expect(rateLimiter.getAttemptCount('192.168.1.1')).toBe(0);
    });
  });

  describe('Multi-Source Token Extraction', () => {
    it('should extract token from header, cookie, or query parameter', async () => {
      const introspector = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      });

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          active: true,
          sub: 'user-123',
          username: 'user@example.com',
        }),
      });

      const validator = async (token: string) => {
        return await introspector.introspect(token);
      };

      const middleware = createAuthMiddleware({
        validator,
        roleMapper: () => ['user'],
        providerName: 'oauth',
        extraction: {
          fromHeader: true,
          fromCookie: true,
          fromQuery: true,
        },
      });

      const handler = vi.fn().mockResolvedValue({ message: 'Success' });
      const wrappedHandler = middleware(handler);

      // Test 1: Extract from Authorization header
      const headerRequest = createMockRequest({
        headers: {
          authorization: 'Bearer header-token',
        },
      });

      await wrappedHandler({}, headerRequest);
      expect(handler).toHaveBeenLastCalledWith(
        {},
        expect.objectContaining({
          token: 'header-token',
        })
      );

      // Test 2: Extract from cookie when header not present
      const cookieRequest = createMockRequest({
        headers: {
          cookie: 'auth_token=cookie-token',
        },
      });

      await wrappedHandler({}, cookieRequest);
      expect(handler).toHaveBeenLastCalledWith(
        {},
        expect.objectContaining({
          token: 'cookie-token',
        })
      );

      // Test 3: Extract from query parameter when header and cookie not present
      const queryRequest = createMockRequest({
        query: {
          api_key: 'query-token',
        },
      });

      await wrappedHandler({}, queryRequest);
      expect(handler).toHaveBeenLastCalledWith(
        {},
        expect.objectContaining({
          token: 'query-token',
        })
      );
    });
  });

  describe('Authorization with Multiple Roles', () => {
    it('should allow access to users with any required role', async () => {
      const introspector = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          active: true,
          sub: 'user-123',
          username: 'user@example.com',
          roles: ['editor', 'viewer'],
        }),
      });

      const validator = async (token: string) => {
        return await introspector.introspect(token);
      };

      const middleware = createAuthMiddleware({
        validator,
        roleMapper: (claims) => claims.roles || [],
        providerName: 'oauth',
        authorization: {
          requiredRoles: ['admin', 'editor', 'moderator'],
        },
      });

      const handler = vi.fn().mockResolvedValue({ message: 'Success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer editor-token',
        },
      });

      const result = await wrappedHandler({}, request);

      // Should succeed because user has 'editor' role
      expect(result).toEqual({ message: 'Success' });
    });

    it('should deny access to users without any required role', async () => {
      const introspector = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          active: true,
          sub: 'user-123',
          username: 'user@example.com',
          roles: ['viewer'],
        }),
      });

      const validator = async (token: string) => {
        return await introspector.introspect(token);
      };

      const middleware = createAuthMiddleware({
        validator,
        roleMapper: (claims) => claims.roles || [],
        providerName: 'oauth',
        authorization: {
          requiredRoles: ['admin', 'editor', 'moderator'],
        },
      });

      const handler = vi.fn();
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer viewer-token',
        },
      });

      const result = await wrappedHandler({}, request);

      // Should be denied
      expect(result).toMatchObject({
        status: 403,
        body: {
          error: 'Forbidden',
          code: 'MISSING_ROLE',
        },
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Custom Authorization Logic', () => {
    it('should support custom authorization checks', async () => {
      const introspector = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      });

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          active: true,
          sub: 'user-123',
          username: 'user@example.com',
          department: 'engineering',
        }),
      });

      const validator = async (token: string) => {
        return await introspector.introspect(token);
      };

      // Custom check: Only allow engineering department
      const customCheck = (user: any) => {
        return user.claims.department === 'engineering';
      };

      const middleware = createAuthMiddleware({
        validator,
        roleMapper: () => [],
        providerName: 'oauth',
        authorization: {
          customCheck,
        },
      });

      const handler = vi.fn().mockResolvedValue({ message: 'Success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer eng-token',
        },
      });

      const result = await wrappedHandler({}, request);

      // Should succeed
      expect(result).toEqual({ message: 'Success' });
    });
  });

  describe('Performance and Caching', () => {
    it('should demonstrate performance improvement with caching', async () => {
      const introspector = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        cacheDuration: minutes(10),
      });

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          active: true,
          sub: 'user-123',
          username: 'user@example.com',
        }),
      });

      const validator = async (token: string) => {
        return await introspector.introspect(token);
      };

      const middleware = createAuthMiddleware({
        validator,
        roleMapper: () => ['user'],
        providerName: 'oauth',
      });

      const handler = vi.fn().mockResolvedValue({ message: 'Success' });
      const wrappedHandler = middleware(handler);

      const request = createMockRequest({
        headers: {
          authorization: 'Bearer perf-token',
        },
      });

      // First request
      const start1 = Date.now();
      await wrappedHandler({}, request);
      const duration1 = Date.now() - start1;

      // Second request (cached)
      const start2 = Date.now();
      await wrappedHandler({}, request);
      const duration2 = Date.now() - start2;

      // Cached request should be faster
      // In practice, cached should be <1ms, uncached might be 50-100ms
      expect(fetchMock).toHaveBeenCalledTimes(1); // Only one network call

      // Verify cache statistics
      const stats = introspector.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
    });
  });
});
