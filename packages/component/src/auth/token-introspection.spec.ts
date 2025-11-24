/**
 * Tests for OAuth 2.0 Token Introspection
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  TokenIntrospector,
  createEntraIntrospector,
  createOAuthIntrospector,
  type IntrospectionResponse,
} from './token-introspection';
import { milliseconds, minutes } from '../common/duration';

describe('TokenIntrospector', () => {
  let introspector: TokenIntrospector;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock global fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    introspector = new TokenIntrospector({
      introspectionEndpoint: 'https://auth.example.com/introspect',
      clientId: 'test-client',
      clientSecret: 'test-secret',
      cacheDuration: milliseconds(5 * 60 * 1000),
      cacheMaxSize: 100,
      maxRetries: 3,
      retryDelayMs: 100, // Shorter for tests
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create introspector with default config', () => {
      const defaultIntrospector = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'client',
        clientSecret: 'secret',
      });

      expect(defaultIntrospector).toBeDefined();
    });

    it('should create introspector with custom config', () => {
      const customIntrospector = new TokenIntrospector({
        introspectionEndpoint: 'https://custom.example.com/introspect',
        clientId: 'custom-client',
        clientSecret: 'custom-secret',
        cacheDuration: minutes(10),
        cacheMaxSize: 500,
        timeoutMs: 10000,
        maxRetries: 5,
        retryDelayMs: 2000,
        customHeaders: { 'X-Custom-Header': 'value' },
        tokenTypeHint: 'access_token',
      });

      expect(customIntrospector).toBeDefined();
    });
  });

  describe('introspect()', () => {
    it('should successfully introspect an active token', async () => {
      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
        username: 'user@example.com',
        client_id: 'test-client',
        token_type: 'Bearer',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        scope: 'read write',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await introspector.introspect('test-token');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.email).toBe('user@example.com');
      expect(result.introspectionResponse).toEqual(mockResponse);
      expect(result.fromCache).toBe(false);

      // Verify fetch was called correctly
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://auth.example.com/introspect');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(options.headers.Authorization).toMatch(/^Basic /);
    });

    it('should handle inactive token', async () => {
      const mockResponse: IntrospectionResponse = {
        active: false,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await introspector.introspect('inactive-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is not active');
      expect(result.introspectionResponse).toEqual(mockResponse);
    });

    it('should return cached result on second call', async () => {
      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
        username: 'user@example.com',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // First call - should hit endpoint
      const result1 = await introspector.introspect('cached-token');
      expect(result1.fromCache).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await introspector.introspect('cached-token');
      expect(result2.fromCache).toBe(true);
      expect(result2.valid).toBe(true);
      expect(result2.userId).toBe('user-123');
      expect(fetchMock).toHaveBeenCalledTimes(1); // No additional calls
    });

    it('should reject invalid token input', async () => {
      const result1 = await introspector.introspect('');
      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('Invalid token format');

      const result2 = await introspector.introspect(null as any);
      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('Invalid token format');

      const result3 = await introspector.introspect(undefined as any);
      expect(result3.valid).toBe(false);
      expect(result3.error).toBe('Invalid token format');

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should extract user ID from username if sub is missing', async () => {
      const mockResponse: IntrospectionResponse = {
        active: true,
        username: 'john.doe',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await introspector.introspect('test-token');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('john.doe');
    });

    it('should detect email from username field', async () => {
      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
        username: 'user@example.com',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await introspector.introspect('test-token');

      expect(result.valid).toBe(true);
      expect(result.email).toBe('user@example.com');
    });

    it('should include all claims in the result', async () => {
      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
        username: 'user@example.com',
        scope: 'read write admin',
        custom_claim: 'custom_value',
        roles: ['admin', 'editor'],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await introspector.introspect('test-token');

      expect(result.valid).toBe(true);
      expect(result.claims).toMatchObject({
        active: true,
        sub: 'user-123',
        username: 'user@example.com',
        scope: 'read write admin',
        custom_claim: 'custom_value',
        roles: ['admin', 'editor'],
      });
    });

    it('should use custom timeout if provided', async () => {
      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await introspector.introspect('test-token', { timeoutMs: 10000 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      // Timeout is handled internally via AbortController
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network errors', async () => {
      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
      };

      // Fail twice, succeed on third attempt
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        });

      const result = await introspector.introspect('test-token');

      expect(result.valid).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should retry on HTTP errors', async () => {
      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
      };

      // Fail with 500, then succeed
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        });

      const result = await introspector.introspect('test-token');

      expect(result.valid).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries exhausted', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(introspector.introspect('test-token')).rejects.toThrow(
        /Token introspection failed after 3 attempts/
      );

      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should not retry on validation errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invalid: 'response' }), // Missing 'active' field
      });

      await expect(introspector.introspect('test-token')).rejects.toThrow(
        /missing required "active" field/
      );

      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(introspector.introspect('test-token')).rejects.toThrow();
    });

    it('should handle non-object response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => 'not an object',
      });

      await expect(introspector.introspect('test-token')).rejects.toThrow(
        /Invalid introspection response format/
      );
    });

    it('should handle null response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => null,
      });

      await expect(introspector.introspect('test-token')).rejects.toThrow(
        /Invalid introspection response format/
      );
    });

    it('should handle missing active field', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ sub: 'user-123' }),
      });

      await expect(introspector.introspect('test-token')).rejects.toThrow(
        /missing required "active" field/
      );
    });

    it('should handle HTTP 401 error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(introspector.introspect('test-token')).rejects.toThrow(
        /Introspection endpoint returned status 401/
      );
    });

    it('should handle HTTP 403 error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(introspector.introspect('test-token')).rejects.toThrow(
        /Introspection endpoint returned status 403/
      );
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
      };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // First call
      await introspector.introspect('test-token');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call (cached)
      await introspector.introspect('test-token');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Clear cache
      introspector.clearCache();

      // Third call (should hit endpoint again)
      await introspector.introspect('test-token');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', async () => {
      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
      };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      // No cache activity yet
      let stats = introspector.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);

      // First call - cache miss
      await introspector.introspect('token1');
      stats = introspector.getCacheStats();
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);

      // Second call to same token - cache hit
      await introspector.introspect('token1');
      stats = introspector.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.size).toBe(1);

      // Call different token - cache miss
      await introspector.introspect('token2');
      stats = introspector.getCacheStats();
      expect(stats.misses).toBe(2);
      expect(stats.size).toBe(2);
    });
  });

  describe('Security', () => {
    it('should use HTTP Basic Auth', async () => {
      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await introspector.introspect('test-token');

      const [, options] = fetchMock.mock.calls[0];
      const authHeader = options.headers.Authorization;

      expect(authHeader).toMatch(/^Basic /);

      // Decode and verify credentials
      const base64Credentials = authHeader.replace('Basic ', '');
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      expect(credentials).toBe('test-client:test-secret');
    });

    it('should include custom headers if configured', async () => {
      const introspectorWithHeaders = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        customHeaders: {
          'X-Custom-Header': 'custom-value',
          'X-Request-ID': 'request-123',
        },
      });

      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await introspectorWithHeaders.introspect('test-token');

      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers['X-Custom-Header']).toBe('custom-value');
      expect(options.headers['X-Request-ID']).toBe('request-123');
    });

    it('should include token_type_hint if configured', async () => {
      const introspectorWithHint = new TokenIntrospector({
        introspectionEndpoint: 'https://auth.example.com/introspect',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenTypeHint: 'access_token',
      });

      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await introspectorWithHint.introspect('test-token');

      const [, options] = fetchMock.mock.calls[0];
      const body = options.body;
      expect(body).toContain('token_type_hint=access_token');
    });

    it('should not leak tokens in error messages', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      try {
        await introspector.introspect('secret-token-12345');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).not.toContain('secret-token-12345');
      }
    });
  });
});

describe('Factory Functions', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createEntraIntrospector()', () => {
    it('should create introspector with Entra ID endpoint', async () => {
      const introspector = createEntraIntrospector({
        tenantId: 'tenant-123',
        clientId: 'client-456',
        clientSecret: 'secret-789',
      });

      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await introspector.introspect('test-token');

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://login.microsoftonline.com/tenant-123/oauth2/v2.0/introspect'
      );
      expect(options.body).toContain('token_type_hint=access_token');
    });

    it('should support custom cache configuration', () => {
      const introspector = createEntraIntrospector({
        tenantId: 'tenant-123',
        clientId: 'client-456',
        clientSecret: 'secret-789',
        cacheDuration: minutes(10),
        cacheMaxSize: 500,
      });

      expect(introspector).toBeDefined();
    });
  });

  describe('createOAuthIntrospector()', () => {
    it('should create introspector with custom endpoint', async () => {
      const introspector = createOAuthIntrospector({
        introspectionEndpoint: 'https://custom.oauth.com/introspect',
        clientId: 'custom-client',
        clientSecret: 'custom-secret',
      });

      const mockResponse: IntrospectionResponse = {
        active: true,
        sub: 'user-123',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await introspector.introspect('test-token');

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('https://custom.oauth.com/introspect');
    });
  });
});
