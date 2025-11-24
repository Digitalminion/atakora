/**
 * Function Handler Utilities
 *
 * @remarks
 * Common helper functions and middleware patterns for function handlers.
 * Provides request validation, response formatting, error handling,
 * CORS configuration, and authentication/authorization middleware.
 *
 * @packageDocumentation
 */

import type { FunctionContext } from './types';

// ============================================================================
// Request Validation
// ============================================================================

/**
 * Validation error class
 *
 * @public
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validation rule function
 *
 * @public
 */
export type ValidationRule<T> = (value: T) => boolean | string;

/**
 * Validate a single field
 *
 * @param value - Field value
 * @param rules - Validation rules to apply
 * @param fieldName - Name of the field (for error messages)
 * @returns Array of error messages (empty if valid)
 *
 * @example
 * ```typescript
 * const errors = validateField(email, [
 *   (v) => !!v || 'Email is required',
 *   (v) => v.includes('@') || 'Email must be valid'
 * ], 'email');
 * ```
 *
 * @public
 */
export function validateField<T>(
  value: T,
  rules: ValidationRule<T>[],
  fieldName: string
): string[] {
  const errors: string[] = [];

  for (const rule of rules) {
    const result = rule(value);
    if (result !== true) {
      errors.push(typeof result === 'string' ? result : `${fieldName} is invalid`);
    }
  }

  return errors;
}

/**
 * Validate an entire object
 *
 * @param data - Object to validate
 * @param schema - Validation schema (field name -> rules)
 * @returns Validation errors (empty object if valid)
 *
 * @throws ValidationError if validation fails
 *
 * @example
 * ```typescript
 * const schema = {
 *   email: [(v) => !!v || 'Required', (v) => v.includes('@') || 'Invalid email'],
 *   age: [(v) => v >= 18 || 'Must be 18+']
 * };
 *
 * const errors = validateObject(userData, schema);
 * if (Object.keys(errors).length > 0) {
 *   throw new ValidationError('Validation failed', undefined, errors);
 * }
 * ```
 *
 * @public
 */
export function validateObject<T extends Record<string, any>>(
  data: T,
  schema: Record<keyof T, ValidationRule<any>[]>
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const fieldErrors = validateField(data[field], rules, field);
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  }

  return errors;
}

/**
 * Common validation rules
 *
 * @public
 */
export const validationRules = {
  /**
   * Check if value is required (not null/undefined/empty)
   */
  required: (message = 'This field is required'): ValidationRule<any> => {
    return (value: any) => {
      if (value === null || value === undefined || value === '') {
        return message;
      }
      return true;
    };
  },

  /**
   * Check if string matches email format
   */
  email: (message = 'Must be a valid email'): ValidationRule<string> => {
    return (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !value || emailRegex.test(value) || message;
    };
  },

  /**
   * Check minimum length
   */
  minLength: (min: number, message?: string): ValidationRule<string> => {
    return (value: string) => {
      return !value || value.length >= min || message || `Must be at least ${min} characters`;
    };
  },

  /**
   * Check maximum length
   */
  maxLength: (max: number, message?: string): ValidationRule<string> => {
    return (value: string) => {
      return !value || value.length <= max || message || `Must be at most ${max} characters`;
    };
  },

  /**
   * Check if number is within range
   */
  range: (min: number, max: number, message?: string): ValidationRule<number> => {
    return (value: number) => {
      return (
        value === null ||
        value === undefined ||
        (value >= min && value <= max) ||
        message ||
        `Must be between ${min} and ${max}`
      );
    };
  },

  /**
   * Check if value matches regex pattern
   */
  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => {
    return (value: string) => {
      return !value || regex.test(value) || message;
    };
  },
};

// ============================================================================
// Response Formatting
// ============================================================================

/**
 * Standard API response format
 *
 * @public
 */
export interface ApiResponse<T = any> {
  /**
   * Response data (null on error)
   */
  data: T | null;

  /**
   * Error information (null on success)
   */
  error: {
    message: string;
    code?: string;
    details?: any;
  } | null;

  /**
   * Response metadata
   */
  metadata?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

/**
 * Create success response
 *
 * @param data - Response data
 * @param metadata - Optional metadata
 * @returns Formatted success response
 *
 * @example
 * ```typescript
 * return successResponse({ id: '123', name: 'John' });
 * ```
 *
 * @public
 */
export function successResponse<T>(data: T, metadata?: Record<string, any>): ApiResponse<T> {
  return {
    data,
    error: null,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Create error response
 *
 * @param message - Error message
 * @param code - Error code (optional)
 * @param details - Additional error details (optional)
 * @param metadata - Optional metadata
 * @returns Formatted error response
 *
 * @example
 * ```typescript
 * return errorResponse('User not found', 'USER_NOT_FOUND', { userId: '123' });
 * ```
 *
 * @public
 */
export function errorResponse(
  message: string,
  code?: string,
  details?: any,
  metadata?: Record<string, any>
): ApiResponse<null> {
  return {
    data: null,
    error: {
      message,
      code,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

// ============================================================================
// Error Handling Middleware
// ============================================================================

/**
 * HTTP status code for error
 *
 * @internal
 */
function getStatusCodeForError(error: Error): number {
  if (error instanceof ValidationError) {
    return 400;
  }
  if (error.name === 'NotFoundError') {
    return 404;
  }
  if (error.name === 'UnauthorizedError') {
    return 401;
  }
  if (error.name === 'ForbiddenError') {
    return 403;
  }
  if (error.name === 'DatabaseError') {
    return 500;
  }
  if (error.name === 'StorageError') {
    return 500;
  }
  return 500;
}

/**
 * Wrap a handler function with error handling
 *
 * @param handler - Handler function to wrap
 * @returns Wrapped handler with error handling
 *
 * @remarks
 * Automatically catches errors and formats them as error responses.
 * Logs errors to the context logger with appropriate severity.
 *
 * @example
 * ```typescript
 * export const myHandler = withErrorHandler(async (context, input) => {
 *   // If this throws, it will be caught and formatted automatically
 *   const data = await context.database.users.get(input.userId);
 *   return successResponse(data);
 * });
 * ```
 *
 * @public
 */
export function withErrorHandler<TInput, TOutput>(
  handler: (context: FunctionContext, input: TInput) => Promise<TOutput>
): (context: FunctionContext, input: TInput) => Promise<TOutput | ApiResponse<null>> {
  return async (context: FunctionContext, input: TInput) => {
    try {
      return await handler(context, input);
    } catch (error: any) {
      // Log error with context
      context.log.error('Handler error:', error.message, {
        stack: error.stack,
        executionId: context.executionId,
      });

      // Format error response
      const statusCode = getStatusCodeForError(error);
      const errorCode = error.code || error.name || 'INTERNAL_ERROR';

      return errorResponse(
        error.message || 'An error occurred',
        errorCode,
        {
          statusCode,
          ...(error.details || {}),
        },
        {
          requestId: context.executionId,
        }
      ) as any;
    }
  };
}

// ============================================================================
// CORS Handling
// ============================================================================

/**
 * CORS configuration options
 *
 * @public
 */
export interface CorsOptions {
  /**
   * Allowed origins (use '*' for all)
   */
  origin: string | string[];

  /**
   * Allowed HTTP methods
   */
  methods?: string[];

  /**
   * Allowed headers
   */
  allowedHeaders?: string[];

  /**
   * Exposed headers
   */
  exposedHeaders?: string[];

  /**
   * Allow credentials
   */
  credentials?: boolean;

  /**
   * Max age for preflight cache (seconds)
   */
  maxAge?: number;
}

/**
 * Generate CORS headers
 *
 * @param options - CORS configuration
 * @param requestOrigin - Origin from request headers
 * @returns CORS headers object
 *
 * @example
 * ```typescript
 * const headers = getCorsHeaders({
 *   origin: ['https://app.example.com'],
 *   methods: ['GET', 'POST'],
 *   credentials: true
 * }, requestOrigin);
 * ```
 *
 * @public
 */
export function getCorsHeaders(
  options: CorsOptions,
  requestOrigin?: string
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Determine allowed origin
  if (options.origin === '*') {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (typeof options.origin === 'string') {
    headers['Access-Control-Allow-Origin'] = options.origin;
  } else if (Array.isArray(options.origin) && requestOrigin) {
    if (options.origin.includes(requestOrigin)) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
    }
  }

  // Add other CORS headers
  if (options.methods && options.methods.length > 0) {
    headers['Access-Control-Allow-Methods'] = options.methods.join(', ');
  }

  if (options.allowedHeaders && options.allowedHeaders.length > 0) {
    headers['Access-Control-Allow-Headers'] = options.allowedHeaders.join(', ');
  }

  if (options.exposedHeaders && options.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = options.exposedHeaders.join(', ');
  }

  if (options.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  if (options.maxAge !== undefined) {
    headers['Access-Control-Max-Age'] = String(options.maxAge);
  }

  return headers;
}

// ============================================================================
// Authentication/Authorization Middleware
// ============================================================================

/**
 * Check if user has required role
 *
 * @param context - Function context
 * @param requiredRoles - Required roles (user must have at least one)
 * @returns True if user has required role
 *
 * @example
 * ```typescript
 * if (!hasRole(context, ['admin', 'moderator'])) {
 *   throw new Error('Insufficient permissions');
 * }
 * ```
 *
 * @public
 */
export function hasRole(context: FunctionContext, requiredRoles: string[]): boolean {
  const userRoles = context.user.roles || [];
  return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Require authentication (user must not be anonymous)
 *
 * @param context - Function context
 * @throws Error if user is not authenticated
 *
 * @example
 * ```typescript
 * export const handler = async (context, input) => {
 *   requireAuth(context);
 *   // Handler logic...
 * };
 * ```
 *
 * @public
 */
export function requireAuth(context: FunctionContext): void {
  if (!context.user || context.user.id === 'anonymous' || context.user.id === 'unknown') {
    const error: any = new Error('Authentication required');
    error.name = 'UnauthorizedError';
    throw error;
  }
}

/**
 * Require specific role
 *
 * @param context - Function context
 * @param requiredRoles - Required roles (user must have at least one)
 * @throws Error if user doesn't have required role
 *
 * @example
 * ```typescript
 * export const handler = async (context, input) => {
 *   requireRole(context, ['admin']);
 *   // Handler logic...
 * };
 * ```
 *
 * @public
 */
export function requireRole(context: FunctionContext, requiredRoles: string[]): void {
  requireAuth(context);

  if (!hasRole(context, requiredRoles)) {
    const error: any = new Error(`Requires one of these roles: ${requiredRoles.join(', ')}`);
    error.name = 'ForbiddenError';
    throw error;
  }
}

// ============================================================================
// Retry Utilities
// ============================================================================

/**
 * Retry options
 *
 * @public
 */
export interface RetryOptions {
  /**
   * Maximum retry attempts
   */
  maxRetries: number;

  /**
   * Initial delay in milliseconds
   */
  initialDelayMs: number;

  /**
   * Maximum delay in milliseconds
   */
  maxDelayMs: number;

  /**
   * Backoff multiplier (exponential backoff)
   */
  backoffMultiplier?: number;

  /**
   * Function to determine if error is retryable
   */
  isRetryable?: (error: Error) => boolean;
}

/**
 * Execute function with retry logic
 *
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns Promise resolving to function result
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => externalApi.call(),
 *   { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 5000 }
 * );
 * ```
 *
 * @public
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier = 2, isRetryable } = options;

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = isRetryable ? isRetryable(error) : true;

      if (attempt === maxRetries || !shouldRetry) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError || new Error('Retry failed');
}

// ============================================================================
// Pagination Utilities
// ============================================================================

/**
 * Pagination options
 *
 * @public
 */
export interface PaginationOptions {
  /**
   * Page number (1-indexed)
   */
  page?: number;

  /**
   * Items per page
   */
  pageSize?: number;

  /**
   * Continuation token (for cursor-based pagination)
   */
  continuationToken?: string;
}

/**
 * Paginated response
 *
 * @public
 */
export interface PaginatedResponse<T> {
  /**
   * Items in current page
   */
  items: T[];

  /**
   * Total number of items (if known)
   */
  total?: number;

  /**
   * Current page number
   */
  page?: number;

  /**
   * Items per page
   */
  pageSize?: number;

  /**
   * Total pages (if known)
   */
  totalPages?: number;

  /**
   * Continuation token for next page
   */
  continuationToken?: string;

  /**
   * Whether there are more pages
   */
  hasMore?: boolean;
}

/**
 * Create paginated response
 *
 * @param items - All items
 * @param options - Pagination options
 * @returns Paginated response
 *
 * @example
 * ```typescript
 * const allUsers = await context.database.users.list();
 * return paginate(allUsers, { page: 1, pageSize: 20 });
 * ```
 *
 * @public
 */
export function paginate<T>(items: T[], options: PaginationOptions): PaginatedResponse<T> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 10;

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedItems = items.slice(startIndex, endIndex);
  const totalPages = Math.ceil(items.length / pageSize);

  return {
    items: paginatedItems,
    total: items.length,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
}
