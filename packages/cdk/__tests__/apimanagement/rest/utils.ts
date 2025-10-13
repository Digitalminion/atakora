/**
 * Test utilities and mock helpers for REST API testing.
 *
 * This module provides utilities for:
 * - Mocking Azure resources
 * - Building test operations
 * - Generating fixtures
 * - Assertion helpers
 * - Policy testing
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// Type Definitions (Templates - will be replaced with actual imports)
// ============================================================================

/**
 * Placeholder types until devon completes the actual interfaces.
 * These will be replaced with actual imports from the CDK package.
 */

export interface IRestOperation<TParams = any, TQuery = any, TBody = any, TResponse = any> {
  readonly method: HttpMethod;
  readonly path: string;
  readonly operationId?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly tags?: string[];
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE';

export interface OpenApiDefinition {
  readonly openapi: '3.0.0' | '3.0.1' | '3.0.2' | '3.0.3' | '3.1.0';
  readonly info: {
    readonly title: string;
    readonly version: string;
  };
  readonly paths: Record<string, any>;
}

export interface JsonSchema<T = any> {
  readonly type?: string;
  readonly properties?: Record<string, JsonSchema>;
  readonly required?: readonly string[];
}

export interface IApiManagement {
  readonly name: string;
  readonly resourceGroup: string;
}

export interface IFunctionApp {
  readonly name: string;
  readonly defaultHostName: string;
}

export interface IWebApp {
  readonly name: string;
  readonly defaultHostName: string;
}

export interface IContainerApp {
  readonly name: string;
  readonly configuration: {
    readonly ingress: {
      readonly fqdn: string;
      readonly targetPort: number;
    };
  };
}

export interface IPolicy {
  readonly type: string;
  readonly config?: any;
}

export interface PolicyContext {
  readonly request: {
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string>;
    readonly body?: any;
  };
  readonly response?: {
    readonly statusCode: number;
    readonly headers: Record<string, string>;
    readonly body?: any;
  };
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

// ============================================================================
// Azure Resource Mocks
// ============================================================================

/**
 * Creates a mock API Management service for testing.
 */
export function mockApiManagementService(
  props?: Partial<IApiManagement>
): IApiManagement {
  return {
    name: props?.name || 'mock-apim-service',
    resourceGroup: props?.resourceGroup || 'mock-rg',
    ...props,
  };
}

/**
 * Creates a mock Azure Function App for testing.
 */
export function mockFunctionApp(
  props?: Partial<IFunctionApp>
): IFunctionApp {
  return {
    name: props?.name || 'mock-function-app',
    defaultHostName: props?.defaultHostName || 'mock-function-app.azurewebsites.net',
    ...props,
  };
}

/**
 * Creates a mock App Service for testing.
 */
export function mockAppService(
  props?: Partial<IWebApp>
): IWebApp {
  return {
    name: props?.name || 'mock-app-service',
    defaultHostName: props?.defaultHostName || 'mock-app-service.azurewebsites.net',
    ...props,
  };
}

/**
 * Creates a mock Container App for testing.
 */
export function mockContainerApp(
  props?: Partial<IContainerApp>
): IContainerApp {
  return {
    name: props?.name || 'mock-container-app',
    configuration: {
      ingress: {
        fqdn: props?.configuration?.ingress?.fqdn || 'mock-container-app.azurecontainerapps.io',
        targetPort: props?.configuration?.ingress?.targetPort || 80,
      },
    },
    ...props,
  };
}

// ============================================================================
// Operation Builders
// ============================================================================

/**
 * Creates a sample REST operation for testing.
 */
export function createSampleOperation(
  overrides?: Partial<IRestOperation>
): IRestOperation {
  return {
    method: 'GET',
    path: '/test',
    operationId: 'testOperation',
    summary: 'Test operation',
    description: 'A test operation for unit testing',
    tags: ['test'],
    ...overrides,
  };
}

/**
 * Creates a basic GET operation.
 */
export function createGetOperation(path: string): IRestOperation {
  return {
    method: 'GET',
    path,
    operationId: `get${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
    summary: `Get ${path}`,
  };
}

/**
 * Creates a basic POST operation.
 */
export function createPostOperation(path: string): IRestOperation {
  return {
    method: 'POST',
    path,
    operationId: `post${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
    summary: `Create ${path}`,
  };
}

/**
 * Creates a PUT operation.
 */
export function createPutOperation(path: string): IRestOperation {
  return {
    method: 'PUT',
    path,
    operationId: `put${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
    summary: `Update ${path}`,
  };
}

/**
 * Creates a DELETE operation.
 */
export function createDeleteOperation(path: string): IRestOperation {
  return {
    method: 'DELETE',
    path,
    operationId: `delete${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
    summary: `Delete ${path}`,
  };
}

/**
 * Creates an authenticated operation template.
 */
export function createAuthenticatedOperation(): IRestOperation {
  return {
    method: 'GET',
    path: '/protected',
    operationId: 'getProtectedResource',
    summary: 'Get protected resource',
    description: 'Requires authentication',
    tags: ['auth'],
  };
}

/**
 * Creates a paginated operation template.
 */
export function createPaginatedOperation(): IRestOperation {
  return {
    method: 'GET',
    path: '/items',
    operationId: 'listItems',
    summary: 'List items with pagination',
    description: 'Supports offset, cursor, and page-based pagination',
    tags: ['pagination'],
  };
}

/**
 * Creates a filtered operation template.
 */
export function createFilteredOperation(): IRestOperation {
  return {
    method: 'GET',
    path: '/search',
    operationId: 'searchItems',
    summary: 'Search items with filters',
    description: 'Supports RSQL, OData, and simple filtering',
    tags: ['filtering'],
  };
}

/**
 * Creates a cached operation template.
 */
export function createCachedOperation(): IRestOperation {
  return {
    method: 'GET',
    path: '/cached-resource',
    operationId: 'getCachedResource',
    summary: 'Get cached resource',
    description: 'Supports ETag and Last-Modified caching',
    tags: ['caching'],
  };
}

/**
 * Creates a rate-limited operation template.
 */
export function createRateLimitedOperation(): IRestOperation {
  return {
    method: 'POST',
    path: '/limited',
    operationId: 'rateLimitedOperation',
    summary: 'Rate limited operation',
    description: 'Subject to rate limiting policies',
    tags: ['rate-limiting'],
  };
}

// ============================================================================
// Fixture Generators
// ============================================================================

/**
 * Generates a minimal OpenAPI specification for testing.
 */
export function generateMinimalOpenApiSpec(
  version: '3.0.3' | '3.1.0' = '3.0.3'
): OpenApiDefinition {
  return {
    openapi: version,
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {
      '/test': {
        get: {
          operationId: 'getTest',
          summary: 'Test endpoint',
          responses: {
            '200': {
              description: 'Success',
            },
          },
        },
      },
    },
  };
}

/**
 * Generates a complete OpenAPI specification with all features.
 */
export function generateCompleteOpenApiSpec(): OpenApiDefinition {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Complete Test API',
      version: '2.0.0',
    },
    paths: {
      '/users/{userId}': {
        get: {
          operationId: 'getUser',
          summary: 'Get user by ID',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'includeDeleted',
              in: 'query',
              schema: { type: 'boolean', default: false },
            },
          ],
          responses: {
            '200': {
              description: 'User found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User',
                  },
                },
              },
            },
            '404': {
              description: 'User not found',
            },
          },
        },
      },
    },
  };
}

/**
 * Generates a JSON Schema for testing.
 */
export function generateJsonSchema(type: 'string' | 'number' | 'object' | 'array'): JsonSchema {
  switch (type) {
    case 'string':
      return {
        type: 'string',
        properties: {},
      };
    case 'number':
      return {
        type: 'number',
        properties: {},
      };
    case 'object':
      return {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['id'],
      };
    case 'array':
      return {
        type: 'array',
        properties: {},
      };
    default:
      return { type: 'object', properties: {} };
  }
}

/**
 * Generates a parameter schema for testing.
 */
export function generateParameterSchema(type: string): JsonSchema {
  return {
    type,
    properties: {},
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Validates that an operation has the correct structure.
 */
export function expectValidOperation(operation: IRestOperation): void {
  expect(operation).toBeDefined();
  expect(operation.method).toBeDefined();
  expect(operation.path).toBeDefined();

  // Validate HTTP method
  const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE'];
  expect(validMethods).toContain(operation.method);

  // Validate path format
  expect(operation.path).toMatch(/^\//);
}

/**
 * Validates that an OpenAPI spec has the correct structure.
 */
export function expectValidOpenApiSpec(spec: OpenApiDefinition): void {
  expect(spec).toBeDefined();
  expect(spec.openapi).toBeDefined();
  expect(spec.info).toBeDefined();
  expect(spec.info.title).toBeDefined();
  expect(spec.info.version).toBeDefined();
  expect(spec.paths).toBeDefined();
  expect(typeof spec.paths).toBe('object');
}

/**
 * Validates that an ARM template has the correct structure.
 */
export function expectValidArmTemplate(template: any): void {
  expect(template).toBeDefined();
  expect(template.$schema).toBeDefined();
  expect(template.contentVersion).toBeDefined();
  expect(template.resources).toBeDefined();
  expect(Array.isArray(template.resources)).toBe(true);
}

/**
 * Type inference assertion helper.
 */
export function expectTypeInference<T>(value: T, expected: T): void {
  expect(value).toEqual(expected);
}

// ============================================================================
// Policy Testing
// ============================================================================

/**
 * Creates a mock policy context for testing.
 */
export function mockPolicyContext(overrides?: Partial<PolicyContext>): PolicyContext {
  return {
    request: {
      method: 'GET',
      url: 'https://api.example.com/test',
      headers: {
        'Content-Type': 'application/json',
      },
      ...overrides?.request,
    },
    response: {
      statusCode: 200,
      headers: {},
      ...overrides?.response,
    },
  };
}

/**
 * Validates policy output against expected XML.
 *
 * Note: This is a placeholder. Actual implementation will depend on
 * the policy system from devon's implementation.
 */
export function expectPolicyOutput(policy: IPolicy, expectedXml: string): void {
  expect(policy).toBeDefined();
  expect(policy.type).toBeDefined();
  // TODO: Implement actual XML comparison when policy system is ready
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates data against a JSON Schema.
 */
export function validateJsonSchema(data: any, schema: JsonSchema): boolean {
  // Simplified validation - in production, use a proper JSON Schema validator
  if (schema.type && typeof data !== schema.type) {
    return false;
  }

  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Validates an OpenAPI specification.
 */
export function validateOpenApiSpec(spec: OpenApiDefinition): ValidationResult {
  const errors: string[] = [];

  if (!spec.openapi) {
    errors.push('Missing openapi version');
  }

  if (!spec.info) {
    errors.push('Missing info object');
  } else {
    if (!spec.info.title) {
      errors.push('Missing info.title');
    }
    if (!spec.info.version) {
      errors.push('Missing info.version');
    }
  }

  if (!spec.paths) {
    errors.push('Missing paths object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates parameter types in an operation.
 */
export function validateParameterTypes(operation: IRestOperation): boolean {
  // Simplified validation
  return operation.method !== undefined && operation.path !== undefined;
}

// ============================================================================
// Test Data Builders (Fluent API)
// ============================================================================

/**
 * Fluent builder for creating test operations.
 */
export class OperationTestBuilder {
  private operation: Partial<IRestOperation> = {};

  withMethod(method: HttpMethod): this {
    this.operation.method = method;
    return this;
  }

  withPath(path: string): this {
    this.operation.path = path;
    return this;
  }

  withOperationId(id: string): this {
    this.operation.operationId = id;
    return this;
  }

  withSummary(summary: string): this {
    this.operation.summary = summary;
    return this;
  }

  withDescription(description: string): this {
    this.operation.description = description;
    return this;
  }

  withTags(...tags: string[]): this {
    this.operation.tags = tags;
    return this;
  }

  build(): IRestOperation {
    if (!this.operation.method || !this.operation.path) {
      throw new Error('Operation must have method and path');
    }

    return this.operation as IRestOperation;
  }
}

/**
 * Fluent builder for creating test OpenAPI specs.
 */
export class OpenApiSpecTestBuilder {
  private spec: Partial<OpenApiDefinition> = {
    paths: {},
  };

  withVersion(version: '3.0.0' | '3.0.1' | '3.0.2' | '3.0.3' | '3.1.0'): this {
    this.spec.openapi = version;
    return this;
  }

  withInfo(title: string, version: string): this {
    this.spec.info = { title, version };
    return this;
  }

  withPath(path: string, pathItem: any): this {
    this.spec.paths![path] = pathItem;
    return this;
  }

  build(): OpenApiDefinition {
    if (!this.spec.openapi || !this.spec.info || !this.spec.paths) {
      throw new Error('OpenAPI spec must have version, info, and paths');
    }

    return this.spec as OpenApiDefinition;
  }
}

// ============================================================================
// Performance Measurement Utilities
// ============================================================================

/**
 * Measures execution time of a function.
 */
export async function measureExecutionTime<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  return {
    result,
    duration: end - start,
  };
}

/**
 * Asserts that a function executes within a time limit.
 */
export async function expectExecutionTime<T>(
  fn: () => T | Promise<T>,
  maxDuration: number,
  description?: string
): Promise<T> {
  const { result, duration } = await measureExecutionTime(fn);

  expect(duration).toBeLessThan(maxDuration);

  return result;
}

// ============================================================================
// Memory Usage Utilities
// ============================================================================

/**
 * Gets current memory usage.
 */
export function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }
  return 0;
}

/**
 * Measures memory usage of a function.
 */
export async function measureMemoryUsage<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; memoryDelta: number }> {
  if (global.gc) {
    global.gc(); // Force garbage collection if available
  }

  const before = getMemoryUsage();
  const result = await fn();
  const after = getMemoryUsage();

  return {
    result,
    memoryDelta: after - before,
  };
}

// ============================================================================
// HTTP Status Code Helpers
// ============================================================================

/**
 * Common HTTP status codes for testing.
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Validates HTTP status code range.
 */
export function isSuccessStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

export function isClientErrorStatus(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500;
}

export function isServerErrorStatus(statusCode: number): boolean {
  return statusCode >= 500 && statusCode < 600;
}

// ============================================================================
// Export all utilities
// ============================================================================

export const testUtils = {
  // Mocks
  mockApiManagementService,
  mockFunctionApp,
  mockAppService,
  mockContainerApp,

  // Operation builders
  createSampleOperation,
  createGetOperation,
  createPostOperation,
  createPutOperation,
  createDeleteOperation,
  createAuthenticatedOperation,
  createPaginatedOperation,
  createFilteredOperation,
  createCachedOperation,
  createRateLimitedOperation,

  // Fixture generators
  generateMinimalOpenApiSpec,
  generateCompleteOpenApiSpec,
  generateJsonSchema,
  generateParameterSchema,

  // Assertions
  expectValidOperation,
  expectValidOpenApiSpec,
  expectValidArmTemplate,
  expectTypeInference,

  // Policy testing
  mockPolicyContext,
  expectPolicyOutput,

  // Validation
  validateJsonSchema,
  validateOpenApiSpec,
  validateParameterTypes,

  // Performance
  measureExecutionTime,
  expectExecutionTime,
  measureMemoryUsage,
  getMemoryUsage,

  // HTTP
  HTTP_STATUS,
  isSuccessStatus,
  isClientErrorStatus,
  isServerErrorStatus,
};

export default testUtils;
