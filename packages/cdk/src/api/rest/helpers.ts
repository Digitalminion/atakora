/**
 * REST API Helper Functions
 *
 * Convenience functions for creating REST operations with full type inference.
 * These helpers provide a concise API for common HTTP methods.
 *
 * @see ADR-014 REST API Core Architecture - Section 2.2
 */

import { RestOperationBuilder } from './builder';

/**
 * Creates a GET operation builder
 *
 * GET operations should be idempotent and safe (no side effects).
 * Typically used for retrieving resources.
 *
 * @param path - URL path template (e.g., '/users/{userId}')
 * @returns Operation builder for GET method
 *
 * @example
 * ```typescript
 * const getUserOperation = get('/users/{userId}')
 *   .operationId('getUser')
 *   .summary('Get user by ID')
 *   .pathParams<{ userId: string }>({
 *     schema: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' } } }
 *   })
 *   .responses<User>({
 *     200: { description: 'User found', content: { 'application/json': { schema: UserSchema } } }
 *   })
 *   .build();
 * ```
 */
export function get(path: string): RestOperationBuilder {
  return new RestOperationBuilder('GET', path);
}

/**
 * Creates a POST operation builder
 *
 * POST operations are typically used for creating new resources.
 * Not idempotent - multiple calls may create multiple resources.
 *
 * @template TBody - Type of request body (defaults to unknown)
 * @param path - URL path template (e.g., '/users')
 * @returns Operation builder for POST method
 *
 * @example
 * ```typescript
 * const createUserOperation = post<CreateUserRequest>('/users')
 *   .operationId('createUser')
 *   .summary('Create a new user')
 *   .body<CreateUserRequest>({
 *     required: true,
 *     content: { 'application/json': { schema: CreateUserRequestSchema } }
 *   })
 *   .responses<User>({
 *     201: { description: 'User created', content: { 'application/json': { schema: UserSchema } } }
 *   })
 *   .build();
 * ```
 */
export function post<TBody = unknown>(path: string): RestOperationBuilder<{}, {}, TBody, unknown> {
  return new RestOperationBuilder('POST', path);
}

/**
 * Creates a PUT operation builder
 *
 * PUT operations are used for full resource updates or creation at a specific URI.
 * Should be idempotent - multiple identical calls should have the same effect as a single call.
 *
 * @template TBody - Type of request body (defaults to unknown)
 * @param path - URL path template (e.g., '/users/{userId}')
 * @returns Operation builder for PUT method
 *
 * @example
 * ```typescript
 * const updateUserOperation = put<UpdateUserRequest>('/users/{userId}')
 *   .operationId('updateUser')
 *   .summary('Update user by ID')
 *   .pathParams<{ userId: string }>({
 *     schema: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' } } }
 *   })
 *   .body<UpdateUserRequest>({
 *     required: true,
 *     content: { 'application/json': { schema: UpdateUserRequestSchema } }
 *   })
 *   .responses<User>({
 *     200: { description: 'User updated', content: { 'application/json': { schema: UserSchema } } }
 *   })
 *   .build();
 * ```
 */
export function put<TBody = unknown>(path: string): RestOperationBuilder<{}, {}, TBody, unknown> {
  return new RestOperationBuilder('PUT', path);
}

/**
 * Creates a PATCH operation builder
 *
 * PATCH operations are used for partial resource updates.
 * Typically accepts partial representations of the resource.
 *
 * @template TBody - Type of request body (defaults to unknown)
 * @param path - URL path template (e.g., '/users/{userId}')
 * @returns Operation builder for PATCH method
 *
 * @example
 * ```typescript
 * const patchUserOperation = patch<Partial<User>>('/users/{userId}')
 *   .operationId('patchUser')
 *   .summary('Partially update user')
 *   .pathParams<{ userId: string }>({
 *     schema: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' } } }
 *   })
 *   .body<Partial<User>>({
 *     required: true,
 *     content: { 'application/json': { schema: PartialUserSchema } }
 *   })
 *   .responses<User>({
 *     200: { description: 'User patched', content: { 'application/json': { schema: UserSchema } } }
 *   })
 *   .build();
 * ```
 */
export function patch<TBody = unknown>(path: string): RestOperationBuilder<{}, {}, TBody, unknown> {
  return new RestOperationBuilder('PATCH', path);
}

/**
 * Creates a DELETE operation builder
 *
 * DELETE operations are used for removing resources.
 * Should be idempotent - deleting a non-existent resource is not an error.
 *
 * @param path - URL path template (e.g., '/users/{userId}')
 * @returns Operation builder for DELETE method
 *
 * @example
 * ```typescript
 * const deleteUserOperation = del('/users/{userId}')
 *   .operationId('deleteUser')
 *   .summary('Delete user by ID')
 *   .pathParams<{ userId: string }>({
 *     schema: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' } } }
 *   })
 *   .responses({
 *     204: { description: 'User deleted' },
 *     404: { description: 'User not found' }
 *   })
 *   .build();
 * ```
 */
export function del(path: string): RestOperationBuilder {
  return new RestOperationBuilder('DELETE', path);
}

/**
 * Creates a HEAD operation builder
 *
 * HEAD operations are identical to GET but without the response body.
 * Used for checking resource existence or getting metadata via headers.
 *
 * @param path - URL path template
 * @returns Operation builder for HEAD method
 *
 * @example
 * ```typescript
 * const checkUserOperation = head('/users/{userId}')
 *   .operationId('checkUser')
 *   .summary('Check if user exists')
 *   .pathParams<{ userId: string }>({
 *     schema: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' } } }
 *   })
 *   .responses({
 *     200: { description: 'User exists' },
 *     404: { description: 'User not found' }
 *   })
 *   .build();
 * ```
 */
export function head(path: string): RestOperationBuilder {
  return new RestOperationBuilder('HEAD', path);
}

/**
 * Creates an OPTIONS operation builder
 *
 * OPTIONS operations are used for CORS preflight requests and capability discovery.
 * Returns allowed HTTP methods and other communication options.
 *
 * @param path - URL path template
 * @returns Operation builder for OPTIONS method
 *
 * @example
 * ```typescript
 * const optionsOperation = options('/users/{userId}')
 *   .operationId('userOptions')
 *   .summary('Get allowed operations for user resource')
 *   .responses({
 *     200: {
 *       description: 'Available options',
 *       headers: {
 *         'Allow': { schema: { type: 'string' } }
 *       }
 *     }
 *   })
 *   .build();
 * ```
 */
export function options(path: string): RestOperationBuilder {
  return new RestOperationBuilder('OPTIONS', path);
}

/**
 * Creates a TRACE operation builder
 *
 * TRACE operations perform a message loop-back test along the path to the target resource.
 * Primarily used for debugging purposes.
 *
 * @param path - URL path template
 * @returns Operation builder for TRACE method
 *
 * @example
 * ```typescript
 * const traceOperation = trace('/users/{userId}')
 *   .operationId('traceUser')
 *   .summary('Trace request to user endpoint')
 *   .responses({
 *     200: { description: 'Trace successful' }
 *   })
 *   .build();
 * ```
 */
export function trace(path: string): RestOperationBuilder {
  return new RestOperationBuilder('TRACE', path);
}
