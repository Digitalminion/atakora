/**
 * REST Operation Builder
 *
 * Provides a type-safe fluent API for building REST operations with full TypeScript inference.
 * The builder pattern enables method chaining while maintaining type safety across parameter and response definitions.
 *
 * @see ADR-014 REST API Core Architecture - Section 2.2
 */

import type {
  HttpMethod,
  IRestOperation,
  PathParameterDefinition,
  QueryParameterDefinition,
  HeaderParameterDefinition,
  RequestBodyDefinition,
  ResponseDefinition,
  BackendConfiguration,
  SecurityRequirement,
  OperationPolicies,
  ExternalDocumentation,
  ServerConfiguration,
} from './operation';

/**
 * Mutable operation type for internal builder use
 */
type MutableRestOperation = {
  -readonly [K in keyof IRestOperation]: IRestOperation[K];
};

/**
 * Type-safe REST operation builder with fluent API
 *
 * @template TParams - Type of path parameters
 * @template TQuery - Type of query parameters
 * @template TBody - Type of request body
 * @template TResponse - Type of response body
 *
 * @example
 * ```typescript
 * const operation = new RestOperationBuilder('GET', '/users/{userId}')
 *   .operationId('getUser')
 *   .summary('Get user by ID')
 *   .pathParams<{ userId: string }>({ schema: { type: 'string', format: 'uuid' } })
 *   .responses<User>({ 200: { description: 'User found', content: { 'application/json': { schema: UserSchema } } } })
 *   .build();
 * ```
 */
export class RestOperationBuilder<TParams = {}, TQuery = {}, TBody = unknown, TResponse = unknown> {
  private operation: Partial<MutableRestOperation> = {};

  /**
   * Creates a new REST operation builder
   *
   * @param method - HTTP method for the operation
   * @param path - URL path template (e.g., '/users/{userId}')
   */
  constructor(method: HttpMethod, path: string) {
    this.operation.method = method;
    this.operation.path = path;
  }

  /**
   * Sets the operation ID (unique identifier for the operation)
   *
   * @param id - Unique operation identifier
   * @returns This builder for method chaining
   */
  operationId(id: string): this {
    this.operation.operationId = id;
    return this;
  }

  /**
   * Sets a brief summary of the operation
   *
   * @param text - Operation summary
   * @returns This builder for method chaining
   */
  summary(text: string): this {
    this.operation.summary = text;
    return this;
  }

  /**
   * Sets a detailed description of the operation
   *
   * @param text - Operation description
   * @returns This builder for method chaining
   */
  description(text: string): this {
    this.operation.description = text;
    return this;
  }

  /**
   * Sets tags for grouping and categorization
   *
   * @param tags - Tag names
   * @returns This builder for method chaining
   */
  tags(...tags: string[]): this {
    this.operation.tags = tags;
    return this;
  }

  /**
   * Marks the operation as deprecated
   *
   * @param isDeprecated - Whether the operation is deprecated (default: true)
   * @returns This builder for method chaining
   */
  deprecated(isDeprecated: boolean = true): this {
    this.operation.deprecated = isDeprecated;
    return this;
  }

  /**
   * Sets external documentation reference
   *
   * @param docs - External documentation
   * @returns This builder for method chaining
   */
  externalDocs(docs: ExternalDocumentation): this {
    this.operation.externalDocs = docs;
    return this;
  }

  /**
   * Sets server configurations for this operation
   *
   * @param servers - Server configurations
   * @returns This builder for method chaining
   */
  servers(...servers: ServerConfiguration[]): this {
    this.operation.servers = servers;
    return this;
  }

  /**
   * Defines path parameters with type inference
   *
   * @template T - Type of path parameters object
   * @param definition - Path parameter definition
   * @returns New builder with updated path parameter type
   *
   * @example
   * ```typescript
   * builder.pathParams<{ userId: string, orderId: string }>({
   *   schema: {
   *     type: 'object',
   *     properties: {
   *       userId: { type: 'string', format: 'uuid' },
   *       orderId: { type: 'string', format: 'uuid' }
   *     }
   *   }
   * })
   * ```
   */
  pathParams<T extends Record<string, any>>(
    definition: PathParameterDefinition<T>
  ): RestOperationBuilder<T, TQuery, TBody, TResponse> {
    this.operation.pathParameters = definition;
    return this as any;
  }

  /**
   * Defines query parameters with type inference
   *
   * @template T - Type of query parameters object
   * @param definition - Query parameter definition
   * @returns New builder with updated query parameter type
   *
   * @example
   * ```typescript
   * builder.queryParams<{ page?: number, pageSize?: number }>({
   *   schema: {
   *     type: 'object',
   *     properties: {
   *       page: { type: 'integer', minimum: 1, default: 1 },
   *       pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
   *     }
   *   }
   * })
   * ```
   */
  queryParams<T extends Record<string, any>>(
    definition: QueryParameterDefinition<T>
  ): RestOperationBuilder<TParams, T, TBody, TResponse> {
    this.operation.queryParameters = definition;
    return this as any;
  }

  /**
   * Defines header parameters
   *
   * @param definition - Header parameter definition
   * @returns This builder for method chaining
   */
  headerParams(definition: HeaderParameterDefinition): this {
    this.operation.headerParameters = definition;
    return this;
  }

  /**
   * Defines request body with type inference
   *
   * @template T - Type of request body
   * @param definition - Request body definition
   * @returns New builder with updated request body type
   *
   * @example
   * ```typescript
   * builder.body<CreateUserRequest>({
   *   required: true,
   *   content: {
   *     'application/json': {
   *       schema: CreateUserRequestSchema
   *     }
   *   }
   * })
   * ```
   */
  body<T>(
    definition: RequestBodyDefinition<T>
  ): RestOperationBuilder<TParams, TQuery, T, TResponse> {
    this.operation.requestBody = definition;
    return this as any;
  }

  /**
   * Defines response schemas with type inference
   *
   * @template T - Type of successful response body
   * @param definition - Response definition with status codes
   * @returns New builder with updated response type
   *
   * @example
   * ```typescript
   * builder.responses<User>({
   *   200: {
   *     description: 'User found',
   *     content: {
   *       'application/json': { schema: UserSchema }
   *     }
   *   },
   *   404: {
   *     description: 'User not found',
   *     content: {
   *       'application/json': { schema: ErrorResponseSchema }
   *     }
   *   }
   * })
   * ```
   */
  responses<T>(
    definition: ResponseDefinition<T>
  ): RestOperationBuilder<TParams, TQuery, TBody, T> {
    this.operation.responses = definition;
    return this as any;
  }

  /**
   * Configures the backend service for this operation
   *
   * @param config - Backend configuration
   * @returns This builder for method chaining
   */
  backend(config: BackendConfiguration): this {
    this.operation.backend = config;
    return this;
  }

  /**
   * Defines security requirements for this operation
   *
   * @param requirements - Security requirements (e.g., OAuth scopes, API key)
   * @returns This builder for method chaining
   */
  security(...requirements: SecurityRequirement[]): this {
    this.operation.security = requirements;
    return this;
  }

  /**
   * Defines operation-specific policies
   *
   * @param policies - Operation policies (inbound, backend, outbound, onError)
   * @returns This builder for method chaining
   */
  policies(policies: OperationPolicies): this {
    this.operation.policies = policies;
    return this;
  }

  /**
   * Builds the final REST operation
   *
   * @returns Complete REST operation with all type information
   * @throws Error if responses are not defined (required)
   */
  build(): IRestOperation<TParams, TQuery, TBody, TResponse> {
    if (!this.operation.responses) {
      throw new Error('Operation must define at least one response');
    }

    if (!this.operation.method) {
      throw new Error('Operation must have an HTTP method');
    }

    if (!this.operation.path) {
      throw new Error('Operation must have a path');
    }

    return this.operation as IRestOperation<TParams, TQuery, TBody, TResponse>;
  }
}
