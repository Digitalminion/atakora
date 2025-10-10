/**
 * Testing utilities for Azure Functions
 *
 * Provides test helpers for Azure Functions including context mocking,
 * request/response handling, and function invocation utilities.
 *
 * @packageDocumentation
 */

/**
 * Azure Function execution context
 *
 * Represents the context object passed to Azure Functions
 */
export interface AzureFunctionContext {
  /**
   * Unique invocation identifier
   */
  readonly invocationId: string;

  /**
   * Function name
   */
  readonly executionContext: {
    readonly invocationId: string;
    readonly functionName: string;
    readonly functionDirectory: string;
  };

  /**
   * Logging functions
   */
  readonly log: Logger;

  /**
   * Input and output bindings
   */
  bindings: Record<string, unknown>;

  /**
   * Binding data (metadata about the trigger)
   */
  readonly bindingData: Record<string, unknown>;

  /**
   * Trace context for distributed tracing
   */
  readonly traceContext: {
    readonly traceparent: string;
    readonly tracestate?: string;
    readonly attributes?: Record<string, string>;
  };

  /**
   * Callback for async completion (v1 model)
   */
  done: (err?: Error, result?: unknown) => void;
}

/**
 * Logger interface for Azure Functions
 */
export interface Logger {
  /**
   * Log information message
   */
  info(...args: unknown[]): void;

  /**
   * Log warning message
   */
  warn(...args: unknown[]): void;

  /**
   * Log error message
   */
  error(...args: unknown[]): void;

  /**
   * Log verbose message
   */
  verbose(...args: unknown[]): void;

  /**
   * Default log method
   */
  (...args: unknown[]): void;
}

/**
 * HTTP request object for HTTP-triggered functions
 */
export interface HttpRequest {
  /**
   * HTTP method
   */
  readonly method: string;

  /**
   * Request URL
   */
  readonly url: string;

  /**
   * Request headers
   */
  readonly headers: Record<string, string>;

  /**
   * Query parameters
   */
  readonly query: Record<string, string>;

  /**
   * Route parameters
   */
  readonly params: Record<string, string>;

  /**
   * Request body
   */
  readonly body?: unknown;

  /**
   * Raw body buffer
   */
  readonly rawBody?: Buffer;
}

/**
 * HTTP response object returned from HTTP-triggered functions
 */
export interface HttpResponse {
  /**
   * HTTP status code
   */
  readonly status?: number;

  /**
   * Response headers
   */
  readonly headers?: Record<string, string>;

  /**
   * Response body
   */
  readonly body?: unknown;

  /**
   * Cookies to set
   */
  readonly cookies?: Array<{
    readonly name: string;
    readonly value: string;
    readonly maxAge?: number;
    readonly path?: string;
    readonly domain?: string;
    readonly secure?: boolean;
    readonly httpOnly?: boolean;
    readonly sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
}

/**
 * Timer trigger information
 */
export interface TimerInfo {
  /**
   * Whether the timer is past due
   */
  readonly isPastDue: boolean;

  /**
   * Schedule status
   */
  readonly scheduleStatus: {
    /**
     * Last time the function was invoked
     */
    readonly last: string;

    /**
     * Next time the function should be invoked
     */
    readonly next: string;

    /**
     * Last time the schedule was updated
     */
    readonly lastUpdated: string;
  };

  /**
   * CRON schedule expression
   */
  readonly schedule?: {
    readonly adjustForDST: boolean;
  };
}

/**
 * HTTP handler function type
 */
export type HttpHandler = (
  context: AzureFunctionContext,
  req: HttpRequest
) => Promise<HttpResponse | void> | HttpResponse | void;

/**
 * Timer handler function type
 */
export type TimerHandler = (
  context: AzureFunctionContext,
  timer: TimerInfo
) => Promise<void> | void;

/**
 * Queue handler function type
 */
export type QueueHandler<T = unknown> = (
  context: AzureFunctionContext,
  message: T
) => Promise<void> | void;

/**
 * Generic trigger handler function type
 */
export type TriggerHandler<T = unknown> = (
  context: AzureFunctionContext,
  trigger: T
) => Promise<unknown> | unknown;

/**
 * Function testing utilities
 *
 * Provides helper methods for testing Azure Functions
 */
export class FunctionTestUtils {
  /**
   * Create a mock Azure Function context
   *
   * @param options - Optional context configuration
   * @returns Mock context object
   *
   * @example
   * ```typescript
   * const context = FunctionTestUtils.createMockContext({
   *   functionName: 'MyFunction',
   *   bindings: { inputData: 'test' }
   * });
   * ```
   */
  static createMockContext(options: {
    readonly invocationId?: string;
    readonly functionName?: string;
    readonly functionDirectory?: string;
    readonly bindings?: Record<string, unknown>;
    readonly bindingData?: Record<string, unknown>;
    readonly logs?: unknown[];
  } = {}): AzureFunctionContext {
    const invocationId = options.invocationId ?? this.generateInvocationId();
    const logs: unknown[][] = options.logs ? [options.logs] : [];

    const logger: Logger = Object.assign(
      (...args: unknown[]) => logs.push(args),
      {
        info: (...args: unknown[]) => logs.push(['INFO', ...args]),
        warn: (...args: unknown[]) => logs.push(['WARN', ...args]),
        error: (...args: unknown[]) => logs.push(['ERROR', ...args]),
        verbose: (...args: unknown[]) => logs.push(['VERBOSE', ...args]),
      }
    );

    return {
      invocationId,
      executionContext: {
        invocationId,
        functionName: options.functionName ?? 'TestFunction',
        functionDirectory: options.functionDirectory ?? '/functions/test',
      },
      log: logger,
      bindings: options.bindings ?? {},
      bindingData: options.bindingData ?? {},
      traceContext: {
        traceparent: `00-${this.generateTraceId()}-${this.generateSpanId()}-01`,
        tracestate: undefined,
        attributes: {},
      },
      done: (err?: Error, result?: unknown) => {
        if (err) {
          throw err;
        }
        return result;
      },
    };
  }

  /**
   * Create a mock HTTP request
   *
   * @param options - Request configuration
   * @returns Mock HTTP request object
   *
   * @example
   * ```typescript
   * const request = FunctionTestUtils.createMockHttpRequest({
   *   method: 'POST',
   *   url: '/api/users',
   *   body: { name: 'John' }
   * });
   * ```
   */
  static createMockHttpRequest(options: {
    readonly method?: string;
    readonly url?: string;
    readonly headers?: Record<string, string>;
    readonly query?: Record<string, string>;
    readonly params?: Record<string, string>;
    readonly body?: unknown;
    readonly rawBody?: Buffer;
  } = {}): HttpRequest {
    return {
      method: options.method ?? 'GET',
      url: options.url ?? '/',
      headers: options.headers ?? {},
      query: options.query ?? {},
      params: options.params ?? {},
      body: options.body,
      rawBody: options.rawBody,
    };
  }

  /**
   * Create a mock timer trigger
   *
   * @param options - Timer configuration
   * @returns Mock timer info object
   *
   * @example
   * ```typescript
   * const timer = FunctionTestUtils.createMockTimer({
   *   isPastDue: false
   * });
   * ```
   */
  static createMockTimer(options: {
    readonly isPastDue?: boolean;
    readonly last?: string;
    readonly next?: string;
    readonly lastUpdated?: string;
  } = {}): TimerInfo {
    const now = new Date();
    const last = options.last ?? new Date(now.getTime() - 60000).toISOString();
    const next = options.next ?? new Date(now.getTime() + 60000).toISOString();
    const lastUpdated = options.lastUpdated ?? now.toISOString();

    return {
      isPastDue: options.isPastDue ?? false,
      scheduleStatus: {
        last,
        next,
        lastUpdated,
      },
      schedule: {
        adjustForDST: true,
      },
    };
  }

  /**
   * Invoke an HTTP handler for testing
   *
   * @param handler - The HTTP handler function to test
   * @param request - Mock HTTP request
   * @param context - Optional mock context (created if not provided)
   * @returns Promise resolving to the HTTP response
   *
   * @example
   * ```typescript
   * const response = await FunctionTestUtils.invokeHttpHandler(
   *   handler,
   *   FunctionTestUtils.createMockHttpRequest({ method: 'GET', url: '/api/users' })
   * );
   * expect(response.status).toBe(200);
   * ```
   */
  static async invokeHttpHandler(
    handler: HttpHandler,
    request: HttpRequest,
    context?: AzureFunctionContext
  ): Promise<HttpResponse | void> {
    const ctx = context ?? this.createMockContext();
    return await handler(ctx, request);
  }

  /**
   * Invoke a timer handler for testing
   *
   * @param handler - The timer handler function to test
   * @param timer - Optional mock timer info
   * @param context - Optional mock context
   * @returns Promise resolving when handler completes
   *
   * @example
   * ```typescript
   * await FunctionTestUtils.invokeTimerHandler(handler);
   * ```
   */
  static async invokeTimerHandler(
    handler: TimerHandler,
    timer?: TimerInfo,
    context?: AzureFunctionContext
  ): Promise<void> {
    const ctx = context ?? this.createMockContext();
    const timerInfo = timer ?? this.createMockTimer();
    return await handler(ctx, timerInfo);
  }

  /**
   * Invoke a queue handler for testing
   *
   * @param handler - The queue handler function to test
   * @param message - Queue message
   * @param context - Optional mock context
   * @returns Promise resolving when handler completes
   *
   * @example
   * ```typescript
   * await FunctionTestUtils.invokeQueueHandler(
   *   handler,
   *   { orderId: '123', items: ['item1'] }
   * );
   * ```
   */
  static async invokeQueueHandler<T>(
    handler: QueueHandler<T>,
    message: T,
    context?: AzureFunctionContext
  ): Promise<void> {
    const ctx = context ?? this.createMockContext();
    return await handler(ctx, message);
  }

  /**
   * Extract logs from a mock context
   *
   * @param context - The context to extract logs from
   * @returns Array of log entries
   *
   * @example
   * ```typescript
   * const context = FunctionTestUtils.createMockContext();
   * await handler(context, request);
   * const logs = FunctionTestUtils.getLogs(context);
   * expect(logs).toContainEqual(['INFO', 'Processing request']);
   * ```
   */
  static getLogs(context: AzureFunctionContext): unknown[][] {
    // Access internal logs array (stored in closure)
    const logger = context.log as unknown as { _logs?: unknown[][] };
    return logger._logs ?? [];
  }

  /**
   * Validate HTTP response structure
   *
   * @param response - Response to validate
   * @throws Error if response is invalid
   *
   * @example
   * ```typescript
   * const response = await handler(context, request);
   * FunctionTestUtils.validateHttpResponse(response);
   * ```
   */
  static validateHttpResponse(response: HttpResponse | void): void {
    if (!response) {
      return;
    }

    if (response.status !== undefined) {
      if (!Number.isInteger(response.status) || response.status < 100 || response.status > 599) {
        throw new Error(`Invalid HTTP status code: ${response.status}`);
      }
    }

    if (response.headers) {
      if (typeof response.headers !== 'object') {
        throw new Error('Response headers must be an object');
      }
    }

    if (response.cookies) {
      if (!Array.isArray(response.cookies)) {
        throw new Error('Response cookies must be an array');
      }
      for (const cookie of response.cookies) {
        if (!cookie.name || !cookie.value) {
          throw new Error('Cookie must have name and value');
        }
      }
    }
  }

  /**
   * Generate a unique invocation ID
   *
   * @returns UUID-style invocation ID
   */
  private static generateInvocationId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate a trace ID for distributed tracing
   *
   * @returns 32-character hex trace ID
   */
  private static generateTraceId(): string {
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  /**
   * Generate a span ID for distributed tracing
   *
   * @returns 16-character hex span ID
   */
  private static generateSpanId(): string {
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}

/**
 * Assert that a function throws an error
 *
 * @param fn - Function to test
 * @param errorMessage - Optional expected error message
 * @returns Promise resolving to the error
 *
 * @example
 * ```typescript
 * await expectFunctionToThrow(
 *   async () => handler(context, invalidRequest),
 *   'Invalid request'
 * );
 * ```
 */
export async function expectFunctionToThrow(
  fn: () => Promise<unknown>,
  errorMessage?: string | RegExp
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (error instanceof Error) {
      if (errorMessage) {
        if (typeof errorMessage === 'string') {
          if (!error.message.includes(errorMessage)) {
            throw new Error(
              `Expected error message to include "${errorMessage}", but got "${error.message}"`
            );
          }
        } else {
          if (!errorMessage.test(error.message)) {
            throw new Error(
              `Expected error message to match ${errorMessage}, but got "${error.message}"`
            );
          }
        }
      }
      return error;
    }
    throw new Error(`Expected Error instance, but got ${typeof error}`);
  }
}

/**
 * Assert that an HTTP response has a specific status code
 *
 * @param response - HTTP response
 * @param expectedStatus - Expected status code
 * @throws Error if status does not match
 *
 * @example
 * ```typescript
 * const response = await handler(context, request);
 * expectResponseStatus(response, 200);
 * ```
 */
export function expectResponseStatus(
  response: HttpResponse | void,
  expectedStatus: number
): void {
  if (!response) {
    throw new Error('Expected response, but got undefined');
  }
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, but got ${response.status ?? 'undefined'}`
    );
  }
}

/**
 * Assert that an HTTP response contains specific headers
 *
 * @param response - HTTP response
 * @param expectedHeaders - Expected headers
 * @throws Error if headers do not match
 *
 * @example
 * ```typescript
 * const response = await handler(context, request);
 * expectResponseHeaders(response, { 'content-type': 'application/json' });
 * ```
 */
export function expectResponseHeaders(
  response: HttpResponse | void,
  expectedHeaders: Record<string, string>
): void {
  if (!response) {
    throw new Error('Expected response, but got undefined');
  }
  if (!response.headers) {
    throw new Error('Response has no headers');
  }
  for (const [key, value] of Object.entries(expectedHeaders)) {
    const actualValue = response.headers[key] ?? response.headers[key.toLowerCase()];
    if (actualValue !== value) {
      throw new Error(
        `Expected header "${key}" to be "${value}", but got "${actualValue ?? 'undefined'}"`
      );
    }
  }
}
