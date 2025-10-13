/**
 * REST API Examples
 *
 * Demonstrates usage of the REST API core foundation with real-world examples.
 * These examples show type-safe operation definitions with various patterns.
 */

import { get, post, put, patch, del } from './helpers';
import type { JsonSchema, ErrorResponse } from './operation';

/**
 * Example domain types
 */
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    page: number;
    pageSize: number;
    totalCount: number;
    hasNextPage: boolean;
  };
}

/**
 * Example schemas
 */
const UserSchema: JsonSchema<User> = {
  type: 'object',
  required: ['id', 'name', 'email', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const CreateUserRequestSchema: JsonSchema<CreateUserRequest> = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
  },
};

const UpdateUserRequestSchema: JsonSchema<UpdateUserRequest> = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
  },
};

const ErrorResponseSchema: JsonSchema<ErrorResponse> = {
  type: 'object',
  required: ['title', 'status'],
  properties: {
    type: { type: 'string', format: 'uri' },
    title: { type: 'string' },
    status: { type: 'integer' },
    detail: { type: 'string' },
    instance: { type: 'string', format: 'uri' },
  },
};

/**
 * Example 1: Simple GET operation
 */
export const getUserOperation = get('/users/{userId}')
  .operationId('getUser')
  .summary('Get user by ID')
  .description('Retrieves a single user by their unique identifier')
  .tags('Users')
  .pathParams<{ userId: string }>({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          format: 'uuid',
          description: 'User unique identifier',
        },
      },
    },
  })
  .responses<User>({
    200: {
      description: 'User found',
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  })
  .build();

/**
 * Example 2: GET with query parameters and pagination
 */
export const listUsersOperation = get('/users')
  .operationId('listUsers')
  .summary('List users')
  .description('Retrieves a paginated list of users with optional filtering')
  .tags('Users')
  .queryParams<{ page?: number; pageSize?: number; search?: string; role?: string }>({
    schema: {
      type: 'object',
      properties: {
        page: {
          type: 'integer',
          minimum: 1,
          default: 1,
          description: 'Page number',
        },
        pageSize: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20,
          description: 'Number of items per page',
        },
        search: {
          type: 'string',
          description: 'Search term for name or email',
        },
        role: {
          type: 'string',
          enum: ['admin', 'user', 'guest'],
          description: 'Filter by user role',
        },
      },
    },
  })
  .responses<PaginatedResponse<User>>({
    200: {
      description: 'List of users',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['data', 'metadata'],
            properties: {
              data: {
                type: 'array',
                items: UserSchema,
              },
              metadata: {
                type: 'object',
                required: ['page', 'pageSize', 'totalCount', 'hasNextPage'],
                properties: {
                  page: { type: 'integer' },
                  pageSize: { type: 'integer' },
                  totalCount: { type: 'integer' },
                  hasNextPage: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  })
  .build();

/**
 * Example 3: POST operation with request body
 */
export const createUserOperation = post<CreateUserRequest>('/users')
  .operationId('createUser')
  .summary('Create a new user')
  .description('Creates a new user with the provided information')
  .tags('Users')
  .body<CreateUserRequest>({
    required: true,
    description: 'User creation data',
    content: {
      'application/json': {
        schema: CreateUserRequestSchema,
      },
    },
  })
  .responses<User>({
    201: {
      description: 'User created successfully',
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'User with this email already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  })
  .build();

/**
 * Example 4: PUT operation for full update
 */
export const updateUserOperation = put<UpdateUserRequest>('/users/{userId}')
  .operationId('updateUser')
  .summary('Update user')
  .description('Updates an existing user with new information')
  .tags('Users')
  .pathParams<{ userId: string }>({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
  })
  .body<UpdateUserRequest>({
    required: true,
    description: 'Updated user data',
    content: {
      'application/json': {
        schema: UpdateUserRequestSchema,
      },
    },
  })
  .responses<User>({
    200: {
      description: 'User updated successfully',
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  })
  .build();

/**
 * Example 5: PATCH operation for partial update
 */
export const patchUserOperation = patch<Partial<UpdateUserRequest>>('/users/{userId}')
  .operationId('patchUser')
  .summary('Partially update user')
  .description('Updates specific fields of an existing user')
  .tags('Users')
  .pathParams<{ userId: string }>({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
  })
  .body<Partial<UpdateUserRequest>>({
    required: true,
    description: 'Partial user update data',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            email: { type: 'string', format: 'email' },
          },
        },
      },
    },
  })
  .responses<User>({
    200: {
      description: 'User updated successfully',
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  })
  .build();

/**
 * Example 6: DELETE operation
 */
export const deleteUserOperation = del('/users/{userId}')
  .operationId('deleteUser')
  .summary('Delete user')
  .description('Deletes an existing user')
  .tags('Users')
  .pathParams<{ userId: string }>({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
  })
  .responses({
    204: {
      description: 'User deleted successfully',
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  })
  .build();

/**
 * Example 7: Operation with Azure Function backend
 */
export const getUserWithBackendOperation = get('/users/{userId}')
  .operationId('getUserWithBackend')
  .summary('Get user by ID (with backend)')
  .tags('Users')
  .pathParams<{ userId: string }>({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', format: 'uuid' },
      },
    },
  })
  .backend({
    type: 'azureFunction',
    functionApp: {
      id: '/subscriptions/.../resourceGroups/.../providers/Microsoft.Web/sites/my-function-app',
      name: 'my-function-app',
      defaultHostName: 'my-function-app.azurewebsites.net',
    },
    functionName: 'GetUser',
    authLevel: 'function',
    retryPolicy: {
      maxAttempts: 3,
      interval: 1000,
      backoffMultiplier: 2,
      retryOn: [500, 502, 503, 504],
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
    },
  })
  .responses<User>({
    200: {
      description: 'User found',
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  })
  .build();

/**
 * Example 8: Operation with external HTTP endpoint backend
 */
export const getUserWithHttpBackendOperation = get('/users/{userId}')
  .operationId('getUserWithHttpBackend')
  .summary('Get user from external API')
  .tags('Users')
  .pathParams<{ userId: string }>({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', format: 'uuid' },
      },
    },
  })
  .backend({
    type: 'httpEndpoint',
    url: 'https://api.example.com/users',
    preserveHostHeader: true,
    credentials: {
      type: 'apiKey',
      header: 'X-API-Key',
      value: 'my-secret-api-key',
    },
    timeout: 30000,
    healthCheck: {
      enabled: true,
      path: '/health',
      interval: 30,
      timeout: 5,
      unhealthyThreshold: 3,
      healthyThreshold: 2,
      expectedStatusCode: 200,
    },
  })
  .responses<User>({
    200: {
      description: 'User found',
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
    },
  })
  .build();
