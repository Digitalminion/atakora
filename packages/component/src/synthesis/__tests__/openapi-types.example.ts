/**
 * Example usage of OpenAPI type definitions
 *
 * This file demonstrates how to use the OpenAPI types to build
 * a type-safe OpenAPI specification.
 */

import type {
  OpenAPISpec,
  InfoObject,
  PathsObject,
  OperationObject,
  SchemaObject,
  ComponentsObject,
  SecuritySchemeObject,
  ParameterObject,
  RequestBodyObject,
  ResponsesObject,
} from '../openapi-types';

/**
 * Example: Complete OpenAPI specification for a simple API
 */
export const exampleOpenAPISpec: OpenAPISpec = {
  openapi: '3.0.3',
  info: {
    title: 'Atakora Backend API',
    version: '1.0.0',
    description: 'REST API for Atakora backend services',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
      url: 'https://example.com/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'https://api.example.com/v1',
      description: 'Production server',
    },
    {
      url: 'https://api-staging.example.com/v1',
      description: 'Staging server',
    },
  ],
  paths: {
    '/users': {
      summary: 'User management',
      get: {
        operationId: 'listUsers',
        summary: 'List all users',
        description: 'Retrieves a paginated list of users',
        tags: ['users'],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of users to return',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of users to skip',
            required: false,
            schema: {
              type: 'integer',
              minimum: 0,
              default: 0,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Successful operation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    users: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/User',
                      },
                    },
                    total: {
                      type: 'integer',
                      description: 'Total number of users',
                    },
                  },
                  required: ['users', 'total'],
                },
              },
            },
          },
          '400': {
            description: 'Invalid request parameters',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      post: {
        operationId: 'createUser',
        summary: 'Create a new user',
        description: 'Creates a new user with the provided data',
        tags: ['users'],
        requestBody: {
          description: 'User data for creation',
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateUserRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
          '400': {
            description: 'Invalid user data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '409': {
            description: 'User with email already exists',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    },
    '/users/{userId}': {
      summary: 'Individual user operations',
      parameters: [
        {
          name: 'userId',
          in: 'path',
          description: 'The unique identifier of the user',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      get: {
        operationId: 'getUserById',
        summary: 'Get user by ID',
        description: 'Retrieves a single user by their unique identifier',
        tags: ['users'],
        responses: {
          '200': {
            description: 'Successful operation',
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
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      put: {
        operationId: 'updateUser',
        summary: 'Update user',
        description: 'Updates an existing user',
        tags: ['users'],
        requestBody: {
          description: 'Updated user data',
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateUserRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
          '400': {
            description: 'Invalid user data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      delete: {
        operationId: 'deleteUser',
        summary: 'Delete user',
        description: 'Deletes a user',
        tags: ['users'],
        responses: {
          '204': {
            description: 'User deleted successfully',
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        description: 'User entity',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique user identifier',
            readOnly: true,
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
            maxLength: 255,
          },
          name: {
            type: 'string',
            description: 'User full name',
            minLength: 1,
            maxLength: 100,
          },
          role: {
            type: 'string',
            description: 'User role',
            enum: ['admin', 'user', 'guest'],
            default: 'user',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp of user creation',
            readOnly: true,
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp of last update',
            readOnly: true,
          },
        },
        required: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
      },
      CreateUserRequest: {
        type: 'object',
        description: 'Request payload for creating a user',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
            maxLength: 255,
          },
          name: {
            type: 'string',
            description: 'User full name',
            minLength: 1,
            maxLength: 100,
          },
          role: {
            type: 'string',
            description: 'User role',
            enum: ['admin', 'user', 'guest'],
            default: 'user',
          },
        },
        required: ['email', 'name'],
      },
      UpdateUserRequest: {
        type: 'object',
        description: 'Request payload for updating a user',
        properties: {
          name: {
            type: 'string',
            description: 'User full name',
            minLength: 1,
            maxLength: 100,
          },
          role: {
            type: 'string',
            description: 'User role',
            enum: ['admin', 'user', 'guest'],
          },
        },
      },
      Error: {
        type: 'object',
        description: 'Error response',
        properties: {
          code: {
            type: 'string',
            description: 'Error code',
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          details: {
            type: 'array',
            description: 'Additional error details',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Field that caused the error',
                },
                message: {
                  type: 'string',
                  description: 'Field-specific error message',
                },
              },
            },
          },
        },
        required: ['code', 'message'],
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT bearer token authentication',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key authentication',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'users',
      description: 'User management operations',
    },
  ],
};

/**
 * Example: Building an OpenAPI spec programmatically
 */
export function buildOpenAPISpec(
  title: string,
  version: string,
  baseUrl: string
): OpenAPISpec {
  const info: InfoObject = {
    title,
    version,
    description: `REST API for ${title}`,
  };

  const paths: PathsObject = {};

  const components: ComponentsObject = {
    schemas: {},
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  };

  return {
    openapi: '3.0.3',
    info,
    servers: [
      {
        url: baseUrl,
        description: 'API server',
      },
    ],
    paths,
    components,
    security: [
      {
        bearerAuth: [],
      },
    ],
  };
}

/**
 * Example: Adding a CRUD endpoint to an OpenAPI spec
 */
export function addCrudEndpoint(
  spec: OpenAPISpec,
  path: string,
  resourceName: string,
  schemaRef: string
): void {
  const paths = { ...spec.paths };

  // List and Create
  paths[path] = {
    get: {
      operationId: `list${resourceName}`,
      summary: `List ${resourceName}`,
      tags: [resourceName.toLowerCase()],
      responses: {
        '200': {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  $ref: schemaRef,
                },
              },
            },
          },
        },
      },
    },
    post: {
      operationId: `create${resourceName}`,
      summary: `Create ${resourceName}`,
      tags: [resourceName.toLowerCase()],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: schemaRef,
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Created successfully',
          content: {
            'application/json': {
              schema: {
                $ref: schemaRef,
              },
            },
          },
        },
      },
    },
  };

  // Get, Update, Delete
  paths[`${path}/{id}`] = {
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
      },
    ],
    get: {
      operationId: `get${resourceName}ById`,
      summary: `Get ${resourceName} by ID`,
      tags: [resourceName.toLowerCase()],
      responses: {
        '200': {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: {
                $ref: schemaRef,
              },
            },
          },
        },
        '404': {
          description: 'Not found',
        },
      },
    },
    put: {
      operationId: `update${resourceName}`,
      summary: `Update ${resourceName}`,
      tags: [resourceName.toLowerCase()],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: schemaRef,
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Updated successfully',
          content: {
            'application/json': {
              schema: {
                $ref: schemaRef,
              },
            },
          },
        },
        '404': {
          description: 'Not found',
        },
      },
    },
    delete: {
      operationId: `delete${resourceName}`,
      summary: `Delete ${resourceName}`,
      tags: [resourceName.toLowerCase()],
      responses: {
        '204': {
          description: 'Deleted successfully',
        },
        '404': {
          description: 'Not found',
        },
      },
    },
  };

  // Type-safe mutation (in practice, you'd modify in-place or return a new spec)
  Object.assign(spec.paths, paths);
}
