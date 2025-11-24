/**
 * Handler Utilities Tests
 *
 * @remarks
 * Tests for common handler utility functions including validation,
 * response formatting, error handling, CORS, and authorization.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  ValidationError,
  validateField,
  validateObject,
  validationRules,
  successResponse,
  errorResponse,
  withErrorHandler,
  getCorsHeaders,
  hasRole,
  requireAuth,
  requireRole,
  withRetry,
  paginate,
} from './handler-utilities';
import type { FunctionContext } from './types';

// ============================================================================
// Test Setup
// ============================================================================

/**
 * Create mock function context
 */
function createMockContext(userOverrides?: Partial<FunctionContext['user']>): FunctionContext {
  return {
    database: {} as any,
    storage: {} as any,
    user: {
      id: 'user-123',
      email: 'user@example.com',
      roles: ['user'],
      name: 'Test User',
      claims: {},
      ...userOverrides,
    },
    utils: {
      generateId: () => 'test-id',
      now: () => Date.now(),
      formatDate: (date) => date.toISOString(),
    },
    services: {} as any,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any,
    executionId: 'exec-123',
    executionTime: Date.now(),
    invocationId: 'inv-123',
  };
}

// ============================================================================
// Validation Tests
// ============================================================================

describe('Handler Utilities - Validation', () => {
  describe('validateField', () => {
    it('should return empty array for valid field', () => {
      const errors = validateField('test@example.com', [validationRules.required()], 'email');
      expect(errors).toEqual([]);
    });

    it('should return error for invalid field', () => {
      const errors = validateField('', [validationRules.required()], 'email');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('required');
    });

    it('should validate multiple rules', () => {
      const errors = validateField(
        'ab',
        [validationRules.required(), validationRules.minLength(3)],
        'username'
      );
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('3 characters');
    });
  });

  describe('validateObject', () => {
    it('should validate entire object', () => {
      const data = {
        email: 'invalid-email',
        password: '12',
      };

      const schema = {
        email: [validationRules.required(), validationRules.email()],
        password: [validationRules.required(), validationRules.minLength(8)],
      };

      const errors = validateObject(data, schema);

      expect(errors.email).toHaveLength(1);
      expect(errors.password).toHaveLength(1);
    });

    it('should return empty object for valid data', () => {
      const data = {
        email: 'test@example.com',
        password: 'securePassword123',
      };

      const schema = {
        email: [validationRules.required(), validationRules.email()],
        password: [validationRules.required(), validationRules.minLength(8)],
      };

      const errors = validateObject(data, schema);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('validationRules', () => {
    it('should validate required fields', () => {
      const rule = validationRules.required();
      expect(rule('')).not.toBe(true);
      expect(rule(null)).not.toBe(true);
      expect(rule(undefined)).not.toBe(true);
      expect(rule('value')).toBe(true);
    });

    it('should validate email format', () => {
      const rule = validationRules.email();
      expect(rule('test@example.com')).toBe(true);
      expect(rule('invalid')).not.toBe(true);
      expect(rule('')).toBe(true); // Optional by default
    });

    it('should validate min length', () => {
      const rule = validationRules.minLength(5);
      expect(rule('test')).not.toBe(true);
      expect(rule('testing')).toBe(true);
    });

    it('should validate max length', () => {
      const rule = validationRules.maxLength(10);
      expect(rule('short')).toBe(true);
      expect(rule('this is too long')).not.toBe(true);
    });

    it('should validate number range', () => {
      const rule = validationRules.range(1, 100);
      expect(rule(50)).toBe(true);
      expect(rule(0)).not.toBe(true);
      expect(rule(101)).not.toBe(true);
    });

    it('should validate regex pattern', () => {
      const rule = validationRules.pattern(/^[A-Z]+$/);
      expect(rule('ABC')).toBe(true);
      expect(rule('abc')).not.toBe(true);
    });
  });
});

// ============================================================================
// Response Formatting Tests
// ============================================================================

describe('Handler Utilities - Response Formatting', () => {
  describe('successResponse', () => {
    it('should create success response', () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(data);

      expect(response.data).toEqual(data);
      expect(response.error).toBeNull();
      expect(response.metadata?.timestamp).toBeDefined();
    });

    it('should include custom metadata', () => {
      const response = successResponse({ id: '123' }, { requestId: 'req-123' });

      expect(response.metadata?.requestId).toBe('req-123');
    });
  });

  describe('errorResponse', () => {
    it('should create error response', () => {
      const response = errorResponse('Something went wrong', 'ERROR_CODE');

      expect(response.data).toBeNull();
      expect(response.error?.message).toBe('Something went wrong');
      expect(response.error?.code).toBe('ERROR_CODE');
      expect(response.metadata?.timestamp).toBeDefined();
    });

    it('should include error details', () => {
      const response = errorResponse('Error', 'CODE', { field: 'email' });

      expect(response.error?.details).toEqual({ field: 'email' });
    });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Handler Utilities - Error Handling', () => {
  describe('withErrorHandler', () => {
    it('should return result on success', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      const wrapped = withErrorHandler(handler);
      const context = createMockContext();

      const result = await wrapped(context, { input: 'test' });

      expect(result).toEqual({ success: true });
    });

    it('should catch and format errors', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Test error'));
      const wrapped = withErrorHandler(handler);
      const context = createMockContext();

      const result = await wrapped(context, { input: 'test' });

      expect((result as any).data).toBeNull();
      expect((result as any).error?.message).toBe('Test error');
    });

    it('should log errors', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Test error'));
      const wrapped = withErrorHandler(handler);
      const context = createMockContext();

      await wrapped(context, { input: 'test' });

      expect(context.log.error).toHaveBeenCalled();
    });

    it('should handle ValidationError with 400 status', async () => {
      const error = new ValidationError('Invalid input', 'email');
      const handler = vi.fn().mockRejectedValue(error);
      const wrapped = withErrorHandler(handler);
      const context = createMockContext();

      const result = await wrapped(context, { input: 'test' });

      expect((result as any).error?.details?.statusCode).toBe(400);
    });
  });
});

// ============================================================================
// CORS Tests
// ============================================================================

describe('Handler Utilities - CORS', () => {
  describe('getCorsHeaders', () => {
    it('should allow all origins with wildcard', () => {
      const headers = getCorsHeaders({ origin: '*' });

      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should allow specific origin', () => {
      const headers = getCorsHeaders({ origin: 'https://example.com' });

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });

    it('should check origin against allowed list', () => {
      const headers = getCorsHeaders(
        {
          origin: ['https://example.com', 'https://app.example.com'],
        },
        'https://app.example.com'
      );

      expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    });

    it('should not set origin if not in allowed list', () => {
      const headers = getCorsHeaders(
        {
          origin: ['https://example.com'],
        },
        'https://malicious.com'
      );

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('should set allowed methods', () => {
      const headers = getCorsHeaders({
        origin: '*',
        methods: ['GET', 'POST', 'PUT'],
      });

      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT');
    });

    it('should set credentials flag', () => {
      const headers = getCorsHeaders({
        origin: '*',
        credentials: true,
      });

      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('should set max age', () => {
      const headers = getCorsHeaders({
        origin: '*',
        maxAge: 3600,
      });

      expect(headers['Access-Control-Max-Age']).toBe('3600');
    });
  });
});

// ============================================================================
// Authorization Tests
// ============================================================================

describe('Handler Utilities - Authorization', () => {
  describe('hasRole', () => {
    it('should return true if user has required role', () => {
      const context = createMockContext({ roles: ['admin', 'user'] });

      expect(hasRole(context, ['admin'])).toBe(true);
    });

    it('should return true if user has one of required roles', () => {
      const context = createMockContext({ roles: ['user'] });

      expect(hasRole(context, ['admin', 'user'])).toBe(true);
    });

    it('should return false if user lacks required role', () => {
      const context = createMockContext({ roles: ['user'] });

      expect(hasRole(context, ['admin'])).toBe(false);
    });
  });

  describe('requireAuth', () => {
    it('should not throw for authenticated user', () => {
      const context = createMockContext();

      expect(() => requireAuth(context)).not.toThrow();
    });

    it('should throw for anonymous user', () => {
      const context = createMockContext({ id: 'anonymous' });

      expect(() => requireAuth(context)).toThrow('Authentication required');
    });

    it('should throw for unknown user', () => {
      const context = createMockContext({ id: 'unknown' });

      expect(() => requireAuth(context)).toThrow('Authentication required');
    });
  });

  describe('requireRole', () => {
    it('should not throw if user has required role', () => {
      const context = createMockContext({ roles: ['admin'] });

      expect(() => requireRole(context, ['admin'])).not.toThrow();
    });

    it('should throw if user lacks required role', () => {
      const context = createMockContext({ roles: ['user'] });

      expect(() => requireRole(context, ['admin'])).toThrow('Requires one of these roles');
    });

    it('should throw if user is not authenticated', () => {
      const context = createMockContext({ id: 'anonymous' });

      expect(() => requireRole(context, ['admin'])).toThrow('Authentication required');
    });
  });
});

// ============================================================================
// Retry Tests
// ============================================================================

describe('Handler Utilities - Retry', () => {
  describe('withRetry', () => {
    it('should return result on first try if successful', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 1000,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 1000,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        withRetry(fn, {
          maxRetries: 2,
          initialDelayMs: 10,
          maxDelayMs: 1000,
        })
      ).rejects.toThrow('Always fails');

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should respect custom retry logic', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Non-retryable'));

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 1000,
          isRetryable: () => false,
        })
      ).rejects.toThrow('Non-retryable');

      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });
  });
});

// ============================================================================
// Pagination Tests
// ============================================================================

describe('Handler Utilities - Pagination', () => {
  describe('paginate', () => {
    it('should paginate items', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i }));

      const page1 = paginate(items, { page: 1, pageSize: 10 });

      expect(page1.items).toHaveLength(10);
      expect(page1.items[0].id).toBe(0);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBe(5);
      expect(page1.hasMore).toBe(true);
    });

    it('should handle last page', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));

      const lastPage = paginate(items, { page: 3, pageSize: 10 });

      expect(lastPage.items).toHaveLength(5);
      expect(lastPage.hasMore).toBe(false);
    });

    it('should use default page size', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i }));

      const page = paginate(items, { page: 1 });

      expect(page.pageSize).toBe(10);
      expect(page.items).toHaveLength(10);
    });

    it('should handle empty items', () => {
      const page = paginate([], { page: 1, pageSize: 10 });

      expect(page.items).toHaveLength(0);
      expect(page.totalPages).toBe(0);
      expect(page.hasMore).toBe(false);
    });
  });
});
