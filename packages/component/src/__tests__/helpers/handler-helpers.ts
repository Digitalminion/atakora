/**
 * Function Handler Test Helpers
 *
 * @remarks
 * Provides utilities for testing Azure Function handlers including
 * mock request builders, response validators, and context creation.
 *
 * @module @atakora/component/__tests__/helpers/handler-helpers
 */

import { expect } from 'vitest';

// ============================================================================
// HTTP Request Types
// ============================================================================

export interface MockHttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  params: Record<string, string>;
  body?: any;
  rawBody?: string;
}

export interface MockHttpResponse {
  status: number;
  headers: Record<string, string>;
  body?: any;
  cookies?: Array<{
    name: string;
    value: string;
    options?: Record<string, any>;
  }>;
}

// ============================================================================
// Function Context Types
// ============================================================================

export interface MockFunctionContext {
  invocationId: string;
  functionName: string;
  executionContext: {
    invocationId: string;
    functionName: string;
    functionDirectory: string;
  };
  bindings: Record<string, any>;
  bindingData: Record<string, any>;
  log: LogFunction;
  done: (err?: Error | null, result?: any) => void;
  // Test helpers
  _logs: string[];
  _warnings: string[];
  _errors: string[];
  _bindings: Map<string, any>;
}

export interface LogFunction {
  (message: string): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  verbose(message: string, ...args: any[]): void;
}

// ============================================================================
// Mock HTTP Request Builders
// ============================================================================

export interface HttpRequestOptions {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  params?: Record<string, string>;
  body?: any;
  rawBody?: string;
}

/**
 * Create mock HTTP request
 */
export function createMockHttpRequest(options: HttpRequestOptions = {}): MockHttpRequest {
  return {
    method: options.method || 'GET',
    url: options.url || 'http://localhost:7071/api/test',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    query: options.query || {},
    params: options.params || {},
    body: options.body,
    rawBody: options.rawBody,
  };
}

/**
 * Create GET request
 */
export function createGetRequest(
  url: string = '/api/test',
  query: Record<string, string> = {}
): MockHttpRequest {
  return createMockHttpRequest({
    method: 'GET',
    url,
    query,
  });
}

/**
 * Create POST request
 */
export function createPostRequest(
  url: string = '/api/test',
  body: any = {}
): MockHttpRequest {
  return createMockHttpRequest({
    method: 'POST',
    url,
    body,
  });
}

/**
 * Create PUT request
 */
export function createPutRequest(
  url: string = '/api/test',
  body: any = {}
): MockHttpRequest {
  return createMockHttpRequest({
    method: 'PUT',
    url,
    body,
  });
}

/**
 * Create DELETE request
 */
export function createDeleteRequest(
  url: string = '/api/test',
  params: Record<string, string> = {}
): MockHttpRequest {
  return createMockHttpRequest({
    method: 'DELETE',
    url,
    params,
  });
}

/**
 * Create PATCH request
 */
export function createPatchRequest(
  url: string = '/api/test',
  body: any = {}
): MockHttpRequest {
  return createMockHttpRequest({
    method: 'PATCH',
    url,
    body,
  });
}

/**
 * Create request with authorization header
 */
export function createAuthorizedRequest(
  token: string,
  options: HttpRequestOptions = {}
): MockHttpRequest {
  return createMockHttpRequest({
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

/**
 * Create request with API key
 */
export function createApiKeyRequest(
  apiKey: string,
  options: HttpRequestOptions = {}
): MockHttpRequest {
  return createMockHttpRequest({
    ...options,
    headers: {
      'X-API-Key': apiKey,
      ...options.headers,
    },
  });
}

/**
 * Create request with custom headers
 */
export function createRequestWithHeaders(
  headers: Record<string, string>,
  options: HttpRequestOptions = {}
): MockHttpRequest {
  return createMockHttpRequest({
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}

// ============================================================================
// Mock Function Context
// ============================================================================

export interface FunctionContextOptions {
  functionName?: string;
  invocationId?: string;
  bindings?: Record<string, any>;
  bindingData?: Record<string, any>;
}

/**
 * Create mock function context
 */
export function createMockFunctionContext(
  options: FunctionContextOptions = {}
): MockFunctionContext {
  const invocationId = options.invocationId || `invocation-${Math.random().toString(36).substring(7)}`;
  const functionName = options.functionName || 'TestFunction';

  const logs: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const bindings = new Map<string, any>();

  const log: LogFunction = Object.assign(
    (message: string) => {
      logs.push(message);
    },
    {
      error: (message: string, ...args: any[]) => {
        errors.push(`ERROR: ${message}`);
        if (args.length > 0) {
          errors.push(JSON.stringify(args));
        }
      },
      warn: (message: string, ...args: any[]) => {
        warnings.push(`WARN: ${message}`);
        if (args.length > 0) {
          warnings.push(JSON.stringify(args));
        }
      },
      info: (message: string) => {
        logs.push(`INFO: ${message}`);
      },
      verbose: (message: string) => {
        logs.push(`VERBOSE: ${message}`);
      },
    }
  );

  return {
    invocationId,
    functionName,
    executionContext: {
      invocationId,
      functionName,
      functionDirectory: `/home/site/wwwroot/${functionName}`,
    },
    bindings: options.bindings || {},
    bindingData: options.bindingData || {},
    log,
    done: (err, result) => {
      // No-op in tests
    },
    _logs: logs,
    _warnings: warnings,
    _errors: errors,
    _bindings: bindings,
  };
}

// ============================================================================
// Mock Bindings
// ============================================================================

export interface CosmosBinding {
  id: string;
  [key: string]: any;
}

export interface BlobBinding {
  name: string;
  data: Buffer | string;
  properties: {
    contentType: string;
    length: number;
  };
}

export interface QueueBinding {
  id: string;
  dequeueCount: number;
  expirationTime: Date;
  insertionTime: Date;
  nextVisibleTime: Date;
  popReceipt: string;
}

/**
 * Create mock Cosmos DB binding
 */
export function createCosmosBinding(
  documents: CosmosBinding[]
): Record<string, CosmosBinding[]> {
  return {
    cosmosDocuments: documents,
  };
}

/**
 * Create mock Blob binding
 */
export function createBlobBinding(
  name: string,
  data: string | Buffer,
  contentType: string = 'application/octet-stream'
): BlobBinding {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

  return {
    name,
    data: buffer,
    properties: {
      contentType,
      length: buffer.length,
    },
  };
}

/**
 * Create mock Queue binding
 */
export function createQueueBinding(id: string): QueueBinding {
  const now = new Date();

  return {
    id,
    dequeueCount: 1,
    expirationTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
    insertionTime: now,
    nextVisibleTime: new Date(now.getTime() + 30 * 1000), // 30 seconds
    popReceipt: `receipt-${Math.random().toString(36).substring(7)}`,
  };
}

// ============================================================================
// Response Validators
// ============================================================================

/**
 * Create mock HTTP response
 */
export function createMockHttpResponse(
  status: number = 200,
  body?: any,
  headers: Record<string, string> = {}
): MockHttpResponse {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
    cookies: [],
  };
}

/**
 * Assert response has status code
 */
export function assertResponseStatus(response: MockHttpResponse, expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
}

/**
 * Assert response is success (2xx)
 */
export function assertResponseSuccess(response: MockHttpResponse) {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}

/**
 * Assert response is client error (4xx)
 */
export function assertResponseClientError(response: MockHttpResponse) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.status).toBeLessThan(500);
}

/**
 * Assert response is server error (5xx)
 */
export function assertResponseServerError(response: MockHttpResponse) {
  expect(response.status).toBeGreaterThanOrEqual(500);
  expect(response.status).toBeLessThan(600);
}

/**
 * Assert response has header
 */
export function assertResponseHasHeader(
  response: MockHttpResponse,
  headerName: string,
  expectedValue?: string
) {
  expect(response.headers).toHaveProperty(headerName);

  if (expectedValue !== undefined) {
    expect(response.headers[headerName]).toBe(expectedValue);
  }
}

/**
 * Assert response body matches expected
 */
export function assertResponseBody(response: MockHttpResponse, expectedBody: any) {
  expect(response.body).toEqual(expectedBody);
}

/**
 * Assert response body has property
 */
export function assertResponseBodyHasProperty(
  response: MockHttpResponse,
  propertyPath: string,
  expectedValue?: any
) {
  expect(response.body).toBeDefined();

  const parts = propertyPath.split('.');
  let current = response.body;

  for (const part of parts) {
    expect(current).toHaveProperty(part);
    current = current[part];
  }

  if (expectedValue !== undefined) {
    expect(current).toEqual(expectedValue);
  }
}

/**
 * Assert response is JSON
 */
export function assertResponseIsJson(response: MockHttpResponse) {
  assertResponseHasHeader(response, 'Content-Type', 'application/json');
  expect(response.body).toBeDefined();
  expect(typeof response.body).toBe('object');
}

/**
 * Assert response is empty
 */
export function assertResponseEmpty(response: MockHttpResponse) {
  expect(response.body).toBeUndefined();
}

// ============================================================================
// Error Response Validators
// ============================================================================

/**
 * Assert response is error with message
 */
export function assertErrorResponse(
  response: MockHttpResponse,
  expectedStatus: number,
  expectedMessage?: string
) {
  assertResponseStatus(response, expectedStatus);
  expect(response.body).toBeDefined();
  expect(response.body.error).toBeDefined();

  if (expectedMessage) {
    expect(response.body.error).toContain(expectedMessage);
  }
}

/**
 * Assert response is 400 Bad Request
 */
export function assertBadRequest(response: MockHttpResponse, expectedMessage?: string) {
  assertErrorResponse(response, 400, expectedMessage);
}

/**
 * Assert response is 401 Unauthorized
 */
export function assertUnauthorized(response: MockHttpResponse, expectedMessage?: string) {
  assertErrorResponse(response, 401, expectedMessage);
}

/**
 * Assert response is 403 Forbidden
 */
export function assertForbidden(response: MockHttpResponse, expectedMessage?: string) {
  assertErrorResponse(response, 403, expectedMessage);
}

/**
 * Assert response is 404 Not Found
 */
export function assertNotFound(response: MockHttpResponse, expectedMessage?: string) {
  assertErrorResponse(response, 404, expectedMessage);
}

/**
 * Assert response is 500 Internal Server Error
 */
export function assertInternalServerError(response: MockHttpResponse, expectedMessage?: string) {
  assertErrorResponse(response, 500, expectedMessage);
}

// ============================================================================
// Context Assertion Helpers
// ============================================================================

/**
 * Assert context logged message
 */
export function assertContextLogged(context: MockFunctionContext, message: string) {
  expect(context._logs.some((log) => log.includes(message))).toBe(true);
}

/**
 * Assert context logged error
 */
export function assertContextLoggedError(context: MockFunctionContext, message: string) {
  expect(context._errors.some((error) => error.includes(message))).toBe(true);
}

/**
 * Assert context logged warning
 */
export function assertContextLoggedWarning(context: MockFunctionContext, message: string) {
  expect(context._warnings.some((warning) => warning.includes(message))).toBe(true);
}

/**
 * Assert context has no errors
 */
export function assertContextNoErrors(context: MockFunctionContext) {
  expect(context._errors).toHaveLength(0);
}

/**
 * Assert context has binding
 */
export function assertContextHasBinding(context: MockFunctionContext, bindingName: string) {
  expect(context.bindings).toHaveProperty(bindingName);
}

// ============================================================================
// Request Format Validators
// ============================================================================

/**
 * Validate request has required headers
 */
export function validateRequestHeaders(
  request: MockHttpRequest,
  requiredHeaders: string[]
) {
  requiredHeaders.forEach((header) => {
    expect(request.headers).toHaveProperty(header);
  });
}

/**
 * Validate request has authorization
 */
export function validateRequestAuthorization(request: MockHttpRequest) {
  expect(request.headers).toHaveProperty('Authorization');
  expect(request.headers.Authorization).toBeTruthy();
}

/**
 * Validate request body is valid JSON
 */
export function validateRequestBodyJson(request: MockHttpRequest) {
  expect(request.body).toBeDefined();
  expect(typeof request.body).toBe('object');
}

/**
 * Validate request has required query parameters
 */
export function validateRequestQuery(
  request: MockHttpRequest,
  requiredParams: string[]
) {
  requiredParams.forEach((param) => {
    expect(request.query).toHaveProperty(param);
  });
}

/**
 * Validate request has required body fields
 */
export function validateRequestBodyFields(
  request: MockHttpRequest,
  requiredFields: string[]
) {
  validateRequestBodyJson(request);

  requiredFields.forEach((field) => {
    expect(request.body).toHaveProperty(field);
  });
}

// ============================================================================
// Handler Test Utilities
// ============================================================================

/**
 * Execute handler with request and context
 */
export async function executeHandler<T = any>(
  handler: (context: MockFunctionContext, req: MockHttpRequest) => Promise<T>,
  request: MockHttpRequest,
  context?: MockFunctionContext
): Promise<{
  result: T;
  context: MockFunctionContext;
}> {
  const ctx = context || createMockFunctionContext();

  const result = await handler(ctx, request);

  return {
    result,
    context: ctx,
  };
}

/**
 * Execute handler and expect success
 */
export async function executeHandlerExpectSuccess<T = any>(
  handler: (context: MockFunctionContext, req: MockHttpRequest) => Promise<MockHttpResponse>,
  request: MockHttpRequest
): Promise<MockHttpResponse> {
  const { result } = await executeHandler(handler, request);

  assertResponseSuccess(result);

  return result;
}

/**
 * Execute handler and expect error
 */
export async function executeHandlerExpectError(
  handler: (context: MockFunctionContext, req: MockHttpRequest) => Promise<MockHttpResponse>,
  request: MockHttpRequest,
  expectedStatus: number
): Promise<MockHttpResponse> {
  const { result } = await executeHandler(handler, request);

  assertResponseStatus(result, expectedStatus);

  return result;
}

/**
 * Measure handler execution time
 */
export async function measureHandlerPerformance(
  handler: (context: MockFunctionContext, req: MockHttpRequest) => Promise<any>,
  request: MockHttpRequest
): Promise<{
  result: any;
  executionTime: number;
}> {
  const start = performance.now();

  const { result } = await executeHandler(handler, request);

  const executionTime = performance.now() - start;

  return {
    result,
    executionTime,
  };
}

// ============================================================================
// Common Response Builders
// ============================================================================

/**
 * Create success response
 */
export function createSuccessResponse(data: any): MockHttpResponse {
  return createMockHttpResponse(200, data);
}

/**
 * Create created response
 */
export function createCreatedResponse(data: any): MockHttpResponse {
  return createMockHttpResponse(201, data);
}

/**
 * Create no content response
 */
export function createNoContentResponse(): MockHttpResponse {
  return createMockHttpResponse(204);
}

/**
 * Create error response
 */
export function createErrorResponse(status: number, message: string): MockHttpResponse {
  return createMockHttpResponse(status, { error: message });
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(errors: Array<{ field: string; message: string }>): MockHttpResponse {
  return createMockHttpResponse(400, {
    error: 'Validation failed',
    errors,
  });
}
