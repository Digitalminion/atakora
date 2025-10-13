/**
 * Unit tests for IRestOperation interface and related types.
 *
 * These tests validate:
 * - Interface structure and type safety
 * - HTTP method validation
 * - Parameter type inference
 * - Response type inference
 * - Content type definitions
 * - JSON Schema validation
 *
 * @note Tests activated for Devon's Phase 1 implementation
 */

import { describe, it, expect } from 'vitest';
import {
  createSampleOperation,
  createGetOperation,
  createPostOperation,
  expectValidOperation,
  HTTP_STATUS,
} from '../utils';

// Import actual implementation from Devon's Phase 1
import type { IRestOperation, HttpMethod, JsonSchema, ErrorResponse } from '../../../../src/api/rest/operation';

describe('IRestOperation Interface', () => {
  describe('Basic Structure', () => {
    it('should have required method and path properties', () => {
      const operation = createSampleOperation();

      expect(operation.method).toBeDefined();
      expect(operation.path).toBeDefined();
      expect(operation.path).toMatch(/^\//);
    });

    it('should support optional metadata properties', () => {
      const operation = createSampleOperation({
        operationId: 'testOp',
        summary: 'Test operation',
        description: 'A test operation',
        tags: ['test', 'sample'],
      });

      expect(operation.operationId).toBe('testOp');
      expect(operation.summary).toBe('Test operation');
      expect(operation.description).toBe('A test operation');
      expect(operation.tags).toEqual(['test', 'sample']);
    });

    it('should allow operations without metadata', () => {
      const operation = createSampleOperation({
        operationId: undefined,
        summary: undefined,
        description: undefined,
        tags: undefined,
      });

      expectValidOperation(operation);
    });
  });

  describe('HTTP Methods', () => {
    it('should support GET method', () => {
      const operation = createGetOperation('/test');
      expect(operation.method).toBe('GET');
    });

    it('should support POST method', () => {
      const operation = createPostOperation('/test');
      expect(operation.method).toBe('POST');
    });

    it('should support PUT method', () => {
      const operation = createSampleOperation({ method: 'PUT' });
      expect(operation.method).toBe('PUT');
    });

    it('should support DELETE method', () => {
      const operation = createSampleOperation({ method: 'DELETE' });
      expect(operation.method).toBe('DELETE');
    });

    it('should support PATCH method', () => {
      const operation = createSampleOperation({ method: 'PATCH' });
      expect(operation.method).toBe('PATCH');
    });

    it('should support HEAD method', () => {
      const operation = createSampleOperation({ method: 'HEAD' });
      expect(operation.method).toBe('HEAD');
    });

    it('should support OPTIONS method', () => {
      const operation = createSampleOperation({ method: 'OPTIONS' });
      expect(operation.method).toBe('OPTIONS');
    });

    it('should support TRACE method', () => {
      const operation = createSampleOperation({ method: 'TRACE' });
      expect(operation.method).toBe('TRACE');
    });

    it('should reject invalid HTTP methods at compile time', () => {
      // @ts-expect-error - Invalid method should cause type error
      const operation: IRestOperation = {
        method: 'INVALID',
        path: '/test',
        responses: { 200: { description: 'OK' } },
      };

      // This test validates type safety at compile time
      expect(operation).toBeDefined();
    });
  });

  describe('Path Patterns', () => {
    it('should support simple paths', () => {
      const operation = createGetOperation('/users');
      expect(operation.path).toBe('/users');
    });

    it('should support paths with parameters', () => {
      const operation = createGetOperation('/users/{userId}');
      expect(operation.path).toContain('{userId}');
    });

    it('should support nested paths', () => {
      const operation = createGetOperation('/users/{userId}/orders/{orderId}');
      expect(operation.path).toMatch(/\/users\/\{userId\}\/orders\/\{orderId\}/);
    });

    it('should support query strings in path', () => {
      const operation = createGetOperation('/users');
      expect(operation.path).toBe('/users');
      // Query parameters are handled separately, not in the path
    });

    it('should require paths to start with /', () => {
      const operation = createSampleOperation({ path: '/test' });
      expect(operation.path).toMatch(/^\//);
    });
  });

  describe('Tags', () => {
    it('should support single tag', () => {
      const operation = createSampleOperation({ tags: ['users'] });
      expect(operation.tags).toEqual(['users']);
    });

    it('should support multiple tags', () => {
      const operation = createSampleOperation({
        tags: ['users', 'admin', 'v1'],
      });
      expect(operation.tags).toHaveLength(3);
      expect(operation.tags).toContain('users');
      expect(operation.tags).toContain('admin');
      expect(operation.tags).toContain('v1');
    });

    it('should allow empty tags array', () => {
      const operation = createSampleOperation({ tags: [] });
      expect(operation.tags).toEqual([]);
    });

    it('should allow undefined tags', () => {
      const operation = createSampleOperation({ tags: undefined });
      expect(operation.tags).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should infer path parameter types', () => {
      interface PathParams {
        userId: string;
        orderId: string;
      }

      const operation: IRestOperation<PathParams> = {
        method: 'GET',
        path: '/users/{userId}/orders/{orderId}',
        pathParameters: {
          schema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              orderId: { type: 'string' },
            },
          },
        },
        responses: { 200: { description: 'OK' } },
      };

      expect(operation.pathParameters).toBeDefined();
      expect(operation.pathParameters?.schema.type).toBe('object');
    });

    it('should infer query parameter types', () => {
      interface QueryParams {
        page?: number;
        pageSize?: number;
      }

      const operation: IRestOperation<{}, QueryParams> = {
        method: 'GET',
        path: '/users',
        queryParameters: {
          schema: {
            type: 'object',
            properties: {
              page: { type: 'integer', minimum: 1, default: 1 },
              pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
          },
        },
        responses: { 200: { description: 'OK' } },
      };

      expect(operation.queryParameters).toBeDefined();
      expect(operation.queryParameters?.schema.properties?.page.default).toBe(1);
    });

    it('should infer request body types', () => {
      interface CreateUserRequest {
        name: string;
        email: string;
      }

      const operation: IRestOperation<{}, {}, CreateUserRequest> = {
        method: 'POST',
        path: '/users',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      };

      expect(operation.requestBody).toBeDefined();
      expect(operation.requestBody?.required).toBe(true);
    });

    it('should infer response types', () => {
      interface User {
        id: string;
        name: string;
      }

      const operation: IRestOperation<{}, {}, unknown, User> = {
        method: 'GET',
        path: '/users/{userId}',
        responses: {
          200: {
            description: 'User found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id', 'name'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      };

      expect(operation.responses[200]).toBeDefined();
      expect(operation.responses[200]?.description).toBe('User found');
    });

    it('should enforce readonly properties', () => {
      const operation: IRestOperation = {
        method: 'GET',
        path: '/test',
        responses: { 200: { description: 'OK' } },
      };

      // TypeScript should prevent modification of readonly properties
      // @ts-expect-error - Cannot assign to 'method' because it is a read-only property
      operation.method = 'POST';

      // @ts-expect-error - Cannot assign to 'path' because it is a read-only property
      operation.path = '/modified';

      expect(operation.method).toBe('GET');
      expect(operation.path).toBe('/test');
    });
  });
});

describe('HttpMethod Type', () => {
  it('should be a union of valid HTTP methods', () => {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE'];

    for (const method of validMethods) {
      const operation = createSampleOperation({ method: method as any });
      expect(operation.method).toBe(method);
    }
  });

  it('should reject invalid methods at compile time', () => {
    // @ts-expect-error - INVALID is not a valid HttpMethod
    const method: HttpMethod = 'INVALID';

    // This validates compile-time type safety
    expect(method).toBe('INVALID');
  });
});

describe('Path Parameter Definition', () => {
  it('should define path parameter schema', () => {
    const operation = createSampleOperation({
      pathParameters: {
        schema: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
      },
    });

    expect(operation.pathParameters?.schema.type).toBe('object');
    expect(operation.pathParameters?.schema.properties?.userId.type).toBe('string');
  });

  it('should support required path parameters', () => {
    const operation = createSampleOperation({
      path: '/users/{userId}',
      pathParameters: {
        schema: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
      },
    });

    expect(operation.pathParameters?.schema.required).toContain('userId');
  });

  it('should support parameter descriptions', () => {
    const operation = createSampleOperation({
      pathParameters: {
        schema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User unique identifier',
            },
          },
        },
        description: 'Path parameters for user operations',
      },
    });

    expect(operation.pathParameters?.description).toBe('Path parameters for user operations');
    expect(operation.pathParameters?.schema.properties?.userId.description).toBe('User unique identifier');
  });

  it('should support parameter examples', () => {
    const operation = createSampleOperation({
      pathParameters: {
        schema: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
        examples: {
          validUser: {
            summary: 'Valid user ID',
            value: '550e8400-e29b-41d4-a716-446655440000',
          },
        },
      },
    });

    expect(operation.pathParameters?.examples?.validUser).toBeDefined();
    expect(operation.pathParameters?.examples?.validUser.summary).toBe('Valid user ID');
  });

  it('should validate parameter types', () => {
    const stringParam = createSampleOperation({
      pathParameters: {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    });

    const numberParam = createSampleOperation({
      pathParameters: {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
          },
        },
      },
    });

    expect(stringParam.pathParameters?.schema.properties?.id.type).toBe('string');
    expect(numberParam.pathParameters?.schema.properties?.id.type).toBe('integer');
  });
});

describe('Query Parameter Definition', () => {
  it('should define query parameter schema', () => {
    const operation = createSampleOperation({
      queryParameters: {
        schema: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
          },
        },
      },
    });

    expect(operation.queryParameters?.schema.type).toBe('object');
    expect(operation.queryParameters?.schema.properties?.page.minimum).toBe(1);
  });

  it('should support optional query parameters', () => {
    const operation = createSampleOperation({
      queryParameters: {
        schema: {
          type: 'object',
          properties: {
            search: { type: 'string' },
          },
        },
        required: false,
      },
    });

    expect(operation.queryParameters?.required).toBe(false);
  });

  it('should support default values', () => {
    const operation = createSampleOperation({
      queryParameters: {
        schema: {
          type: 'object',
          properties: {
            pageSize: { type: 'integer', default: 20 },
          },
        },
      },
    });

    expect(operation.queryParameters?.schema.properties?.pageSize.default).toBe(20);
  });

  it('should support enum values', () => {
    const operation = createSampleOperation({
      queryParameters: {
        schema: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['admin', 'user', 'guest'] },
          },
        },
      },
    });

    expect(operation.queryParameters?.schema.properties?.role.enum).toEqual(['admin', 'user', 'guest']);
  });

  it('should support array parameters', () => {
    const operation = createSampleOperation({
      queryParameters: {
        schema: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    });

    expect(operation.queryParameters?.schema.properties?.tags.type).toBe('array');
    expect(operation.queryParameters?.schema.properties?.tags.items?.type).toBe('string');
  });
});

describe('Request Body Definition', () => {
  it('should define request body schema', () => {
    const operation = createSampleOperation({
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const schema = operation.requestBody?.content?.['application/json']?.schema;
    expect(schema?.type).toBe('object');
    expect(schema?.properties?.name.type).toBe('string');
  });

  it('should support required request body', () => {
    const operation = createSampleOperation({
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      },
    });

    expect(operation.requestBody?.required).toBe(true);
  });

  it('should support multiple content types', () => {
    const operation = createSampleOperation({
      requestBody: {
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
          'application/xml': {
            schema: { type: 'object' },
          },
        },
      },
    });

    expect(operation.requestBody?.content?.['application/json']).toBeDefined();
    expect(operation.requestBody?.content?.['application/xml']).toBeDefined();
  });

  it('should validate against JSON Schema', () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
      },
    };

    const operation = createSampleOperation({
      requestBody: {
        content: {
          'application/json': { schema },
        },
      },
    });

    const bodySchema = operation.requestBody?.content?.['application/json']?.schema;
    expect(bodySchema?.required).toContain('name');
    expect(bodySchema?.required).toContain('email');
  });
});

describe('Response Definition', () => {
  it('should define responses by status code', () => {
    const operation = createSampleOperation({
      responses: {
        200: { description: 'Success' },
        404: { description: 'Not found' },
      },
    });

    expect(operation.responses[200]?.description).toBe('Success');
    expect(operation.responses[404]?.description).toBe('Not found');
  });

  it('should support multiple status codes', () => {
    const operation = createSampleOperation({
      responses: {
        200: { description: 'OK' },
        201: { description: 'Created' },
        400: { description: 'Bad Request' },
        404: { description: 'Not Found' },
        500: { description: 'Internal Server Error' },
      },
    });

    expect(Object.keys(operation.responses)).toHaveLength(5);
  });

  it('should support default response', () => {
    const operation = createSampleOperation({
      responses: {
        200: { description: 'Success' },
        default: { description: 'Unexpected error' },
      },
    });

    expect(operation.responses.default?.description).toBe('Unexpected error');
  });

  it('should include response descriptions', () => {
    const operation = createSampleOperation({
      responses: {
        200: { description: 'User retrieved successfully' },
      },
    });

    expect(operation.responses[200]?.description).toBe('User retrieved successfully');
  });

  it('should support multiple content types in response', () => {
    const operation = createSampleOperation({
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
            'application/xml': {
              schema: { type: 'object' },
            },
          },
        },
      },
    });

    expect(operation.responses[200]?.content?.['application/json']).toBeDefined();
    expect(operation.responses[200]?.content?.['application/xml']).toBeDefined();
  });
});

describe('Content Type Definition', () => {
  it('should support application/json', () => {
    const operation = createSampleOperation({
      requestBody: {
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
    });

    expect(operation.requestBody?.content?.['application/json']).toBeDefined();
  });

  it('should support application/xml', () => {
    const operation = createSampleOperation({
      requestBody: {
        content: {
          'application/xml': {
            schema: { type: 'object' },
          },
        },
      },
    });

    expect(operation.requestBody?.content?.['application/xml']).toBeDefined();
  });

  it('should support application/x-www-form-urlencoded', () => {
    const operation = createSampleOperation({
      requestBody: {
        content: {
          'application/x-www-form-urlencoded': {
            schema: { type: 'object' },
          },
        },
      },
    });

    expect(operation.requestBody?.content?.['application/x-www-form-urlencoded']).toBeDefined();
  });

  it('should support multipart/form-data', () => {
    const operation = createSampleOperation({
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: { type: 'object' },
          },
        },
      },
    });

    expect(operation.requestBody?.content?.['multipart/form-data']).toBeDefined();
  });

  it('should support text/plain', () => {
    const operation = createSampleOperation({
      requestBody: {
        content: {
          'text/plain': {
            schema: { type: 'string' },
          },
        },
      },
    });

    expect(operation.requestBody?.content?.['text/plain']).toBeDefined();
  });

  it('should support application/octet-stream', () => {
    const operation = createSampleOperation({
      requestBody: {
        content: {
          'application/octet-stream': {
            schema: { type: 'string', format: 'binary' },
          },
        },
      },
    });

    expect(operation.requestBody?.content?.['application/octet-stream']).toBeDefined();
  });

  it('should support custom content types', () => {
    const operation = createSampleOperation({
      requestBody: {
        content: {
          'application/vnd.api+json': {
            schema: { type: 'object' },
          },
        },
      },
    });

    expect(operation.requestBody?.content?.['application/vnd.api+json']).toBeDefined();
  });
});

describe('JSON Schema', () => {
  it('should validate string types', () => {
    const schema: JsonSchema = {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[a-zA-Z]+$',
    };

    expect(schema.type).toBe('string');
    expect(schema.minLength).toBe(1);
    expect(schema.maxLength).toBe(100);
  });

  it('should validate number types', () => {
    const schema: JsonSchema = {
      type: 'number',
      minimum: 0,
      maximum: 100,
      multipleOf: 0.5,
    };

    expect(schema.type).toBe('number');
    expect(schema.minimum).toBe(0);
    expect(schema.maximum).toBe(100);
  });

  it('should validate integer types', () => {
    const schema: JsonSchema = {
      type: 'integer',
      minimum: 1,
      maximum: 10,
    };

    expect(schema.type).toBe('integer');
  });

  it('should validate boolean types', () => {
    const schema: JsonSchema = {
      type: 'boolean',
    };

    expect(schema.type).toBe('boolean');
  });

  it('should validate array types', () => {
    const schema: JsonSchema = {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 10,
      uniqueItems: true,
    };

    expect(schema.type).toBe('array');
    expect(schema.items?.type).toBe('string');
    expect(schema.uniqueItems).toBe(true);
  });

  it('should validate object types', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: false,
    };

    expect(schema.type).toBe('object');
    expect(schema.required).toContain('id');
    expect(schema.additionalProperties).toBe(false);
  });

  it('should validate null types', () => {
    const schema: JsonSchema = {
      type: 'null',
    };

    expect(schema.type).toBe('null');
  });

  it('should support enum values', () => {
    const schema: JsonSchema = {
      type: 'string',
      enum: ['admin', 'user', 'guest'],
    };

    expect(schema.enum).toEqual(['admin', 'user', 'guest']);
  });

  it('should support required properties', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['name', 'email'],
    };

    expect(schema.required).toHaveLength(2);
    expect(schema.required).toContain('name');
    expect(schema.required).toContain('email');
  });

  it('should support additional properties', () => {
    const schema: JsonSchema = {
      type: 'object',
      additionalProperties: { type: 'string' },
    };

    expect(schema.additionalProperties).toBeDefined();
    expect(typeof schema.additionalProperties).toBe('object');
  });

  it('should support oneOf, anyOf, allOf', () => {
    const schema: JsonSchema = {
      oneOf: [{ type: 'string' }, { type: 'number' }],
    };

    expect(schema.oneOf).toHaveLength(2);

    const anyOfSchema: JsonSchema = {
      anyOf: [{ type: 'string' }, { type: 'null' }],
    };

    expect(anyOfSchema.anyOf).toHaveLength(2);

    const allOfSchema: JsonSchema = {
      allOf: [{ type: 'object', properties: { id: { type: 'string' } } }, { required: ['id'] }],
    };

    expect(allOfSchema.allOf).toHaveLength(2);
  });

  it('should support $ref references', () => {
    const schema: JsonSchema = {
      $ref: '#/components/schemas/User',
    };

    expect(schema.$ref).toBe('#/components/schemas/User');
  });
});

describe('Error Response (RFC 7807)', () => {
  it('should define type property', () => {
    const error: ErrorResponse = {
      type: 'https://api.example.com/errors/not-found',
      title: 'Not Found',
      status: 404,
    };

    expect(error.type).toBe('https://api.example.com/errors/not-found');
  });

  it('should define title property', () => {
    const error: ErrorResponse = {
      title: 'Resource Not Found',
      status: 404,
    };

    expect(error.title).toBe('Resource Not Found');
  });

  it('should define status property', () => {
    const error: ErrorResponse = {
      title: 'Bad Request',
      status: 400,
    };

    expect(error.status).toBe(400);
  });

  it('should support optional detail property', () => {
    const error: ErrorResponse = {
      title: 'Validation Error',
      status: 422,
      detail: 'The email field is required',
    };

    expect(error.detail).toBe('The email field is required');
  });

  it('should support optional instance property', () => {
    const error: ErrorResponse = {
      title: 'Not Found',
      status: 404,
      instance: '/users/12345',
    };

    expect(error.instance).toBe('/users/12345');
  });

  it('should support additional properties', () => {
    const error: ErrorResponse = {
      title: 'Validation Error',
      status: 422,
      errors: [{ field: 'email', message: 'Invalid format' }],
      requestId: 'req-123',
    };

    expect(error.errors).toBeDefined();
    expect(error.requestId).toBe('req-123');
  });
});

/**
 * Performance tests
 */
describe('Performance', () => {
  it('should create operation in < 1ms', () => {
    const start = performance.now();

    const operation = createSampleOperation();

    const duration = performance.now() - start;

    expect(operation).toBeDefined();
    expect(duration).toBeLessThan(1);
  });

  it('should validate operation in < 10ms', () => {
    const operation = createSampleOperation({
      pathParameters: {
        schema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
      },
      queryParameters: {
        schema: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
          },
        },
      },
    });

    const start = performance.now();

    expectValidOperation(operation);

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });
});
