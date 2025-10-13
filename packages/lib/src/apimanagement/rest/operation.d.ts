/**
 * REST API Operation Interfaces
 *
 * Defines type-safe REST operation interfaces following OpenAPI 3.0/3.1 specifications.
 * Provides full TypeScript type inference for path parameters, query parameters, request bodies, and responses.
 *
 * @see ADR-014 REST API Core Architecture - Section 1
 */
/**
 * HTTP methods supported by Azure API Management
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE';
/**
 * Core REST operation interface with full type safety
 *
 * @template TParams - Type of path parameters (e.g., { userId: string })
 * @template TQuery - Type of query parameters (e.g., { includeDeleted?: boolean })
 * @template TBody - Type of request body
 * @template TResponse - Type of response body
 *
 * @example
 * ```typescript
 * const operation: IRestOperation<{ userId: string }, { includeDeleted?: boolean }, never, User> = {
 *   method: 'GET',
 *   path: '/users/{userId}',
 *   operationId: 'getUser',
 *   // ...
 * };
 * ```
 */
export interface IRestOperation<TParams = any, TQuery = any, TBody = any, TResponse = any> {
    readonly method: HttpMethod;
    readonly path: string;
    readonly operationId?: string;
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly pathParameters?: PathParameterDefinition<TParams>;
    readonly queryParameters?: QueryParameterDefinition<TQuery>;
    readonly headerParameters?: HeaderParameterDefinition;
    readonly requestBody?: RequestBodyDefinition<TBody>;
    readonly responses: ResponseDefinition<TResponse>;
    readonly backend?: BackendConfiguration;
    readonly security?: readonly SecurityRequirement[];
    readonly policies?: OperationPolicies;
    readonly deprecated?: boolean;
    readonly externalDocs?: ExternalDocumentation;
    readonly servers?: readonly ServerConfiguration[];
}
/**
 * Path parameter definition with type inference
 *
 * @template T - The type of path parameters object
 */
export interface PathParameterDefinition<T = any> {
    readonly schema: ParameterSchema<T>;
    readonly description?: string;
    readonly examples?: Record<string, ParameterExample>;
    readonly style?: 'simple' | 'label' | 'matrix';
    readonly explode?: boolean;
}
/**
 * Query parameter definition with type inference
 *
 * @template T - The type of query parameters object
 */
export interface QueryParameterDefinition<T = any> {
    readonly schema: ParameterSchema<T>;
    readonly description?: string;
    readonly required?: boolean;
    readonly deprecated?: boolean;
    readonly allowEmptyValue?: boolean;
    readonly style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
    readonly explode?: boolean;
    readonly examples?: Record<string, ParameterExample>;
}
/**
 * Header parameter definition
 */
export interface HeaderParameterDefinition {
    readonly schema: ParameterSchema;
    readonly description?: string;
    readonly required?: boolean;
    readonly deprecated?: boolean;
    readonly examples?: Record<string, ParameterExample>;
}
/**
 * Parameter schema with TypeScript type mapping
 *
 * @template T - The TypeScript type this schema represents
 */
export interface ParameterSchema<T = any> {
    readonly type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
    readonly format?: string;
    readonly enum?: readonly T[];
    readonly default?: T;
    readonly minimum?: number;
    readonly maximum?: number;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly pattern?: string;
    readonly items?: ParameterSchema;
    readonly properties?: Record<string, ParameterSchema>;
    readonly required?: readonly string[];
    readonly nullable?: boolean;
    readonly description?: string;
}
/**
 * Parameter example for documentation
 */
export interface ParameterExample {
    readonly summary?: string;
    readonly description?: string;
    readonly value: any;
    readonly externalValue?: string;
}
/**
 * Request body definition
 *
 * @template T - The type of request body
 */
export interface RequestBodyDefinition<T = any> {
    readonly description?: string;
    readonly required?: boolean;
    readonly content: ContentTypeDefinition<T>;
}
/**
 * Content type definition for request/response bodies
 *
 * @template T - The type of the content
 */
export interface ContentTypeDefinition<T = any> {
    readonly 'application/json'?: MediaTypeSchema<T>;
    readonly 'application/xml'?: MediaTypeSchema<T>;
    readonly 'application/x-www-form-urlencoded'?: MediaTypeSchema<T>;
    readonly 'multipart/form-data'?: MediaTypeSchema<T>;
    readonly 'text/plain'?: MediaTypeSchema<T>;
    readonly 'application/octet-stream'?: MediaTypeSchema<T>;
    readonly [contentType: string]: MediaTypeSchema<T> | undefined;
}
/**
 * Media type schema
 *
 * @template T - The type of the media content
 */
export interface MediaTypeSchema<T = any> {
    readonly schema: JsonSchema<T>;
    readonly examples?: Record<string, MediaTypeExample>;
    readonly encoding?: Record<string, EncodingDefinition>;
}
/**
 * Media type example
 */
export interface MediaTypeExample {
    readonly summary?: string;
    readonly description?: string;
    readonly value?: any;
    readonly externalValue?: string;
}
/**
 * Encoding definition for multipart/form-data
 */
export interface EncodingDefinition {
    readonly contentType?: string;
    readonly headers?: Record<string, HeaderDefinition>;
    readonly style?: string;
    readonly explode?: boolean;
    readonly allowReserved?: boolean;
}
/**
 * JSON Schema definition (subset aligned with OpenAPI)
 *
 * @template T - The TypeScript type this schema represents
 */
export interface JsonSchema<T = any> {
    readonly type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
    readonly format?: string;
    readonly title?: string;
    readonly description?: string;
    readonly default?: T;
    readonly multipleOf?: number;
    readonly maximum?: number;
    readonly exclusiveMaximum?: boolean;
    readonly minimum?: number;
    readonly exclusiveMinimum?: boolean;
    readonly maxLength?: number;
    readonly minLength?: number;
    readonly pattern?: string;
    readonly maxItems?: number;
    readonly minItems?: number;
    readonly uniqueItems?: boolean;
    readonly maxProperties?: number;
    readonly minProperties?: number;
    readonly required?: readonly string[];
    readonly enum?: readonly any[];
    readonly properties?: Record<string, JsonSchema>;
    readonly additionalProperties?: boolean | JsonSchema;
    readonly items?: JsonSchema;
    readonly oneOf?: readonly JsonSchema[];
    readonly anyOf?: readonly JsonSchema[];
    readonly allOf?: readonly JsonSchema[];
    readonly not?: JsonSchema;
    readonly nullable?: boolean;
    readonly discriminator?: DiscriminatorDefinition;
    readonly readOnly?: boolean;
    readonly writeOnly?: boolean;
    readonly xml?: XmlDefinition;
    readonly externalDocs?: ExternalDocumentation;
    readonly example?: any;
    readonly deprecated?: boolean;
    readonly $ref?: string;
}
/**
 * Discriminator for polymorphic types
 */
export interface DiscriminatorDefinition {
    readonly propertyName: string;
    readonly mapping?: Record<string, string>;
}
/**
 * XML serialization configuration
 */
export interface XmlDefinition {
    readonly name?: string;
    readonly namespace?: string;
    readonly prefix?: string;
    readonly attribute?: boolean;
    readonly wrapped?: boolean;
}
/**
 * Response definition with status code mapping
 *
 * @template T - The type of successful response body
 */
export interface ResponseDefinition<T = any> {
    readonly 200?: ResponseSchema<T>;
    readonly 201?: ResponseSchema<T>;
    readonly 202?: ResponseSchema<T>;
    readonly 204?: ResponseSchema<T>;
    readonly 400?: ResponseSchema<ErrorResponse>;
    readonly 401?: ResponseSchema<ErrorResponse>;
    readonly 403?: ResponseSchema<ErrorResponse>;
    readonly 404?: ResponseSchema<ErrorResponse>;
    readonly 409?: ResponseSchema<ErrorResponse>;
    readonly 422?: ResponseSchema<ErrorResponse>;
    readonly 429?: ResponseSchema<ErrorResponse>;
    readonly 500?: ResponseSchema<ErrorResponse>;
    readonly 502?: ResponseSchema<ErrorResponse>;
    readonly 503?: ResponseSchema<ErrorResponse>;
    readonly [statusCode: number]: ResponseSchema | undefined;
    readonly default?: ResponseSchema;
}
/**
 * Response schema for a specific status code
 *
 * @template T - The type of response body
 */
export interface ResponseSchema<T = any> {
    readonly description: string;
    readonly content?: ContentTypeDefinition<T>;
    readonly headers?: Record<string, HeaderDefinition>;
    readonly links?: Record<string, LinkDefinition>;
}
/**
 * Header definition
 */
export interface HeaderDefinition {
    readonly schema: ParameterSchema;
    readonly description?: string;
    readonly required?: boolean;
    readonly deprecated?: boolean;
    readonly allowEmptyValue?: boolean;
    readonly style?: string;
    readonly explode?: boolean;
    readonly examples?: Record<string, ParameterExample>;
}
/**
 * Link definition for HATEOAS
 */
export interface LinkDefinition {
    readonly operationRef?: string;
    readonly operationId?: string;
    readonly parameters?: Record<string, any>;
    readonly requestBody?: any;
    readonly description?: string;
    readonly server?: ServerConfiguration;
}
/**
 * RFC 7807 Problem Details format for error responses
 *
 * @see https://tools.ietf.org/html/rfc7807
 */
export interface ErrorResponse {
    readonly type?: string;
    readonly title: string;
    readonly status: number;
    readonly detail?: string;
    readonly instance?: string;
    readonly [key: string]: any;
}
/**
 * Backend configuration (forward declaration - defined in backend-types.ts)
 */
export interface BackendConfiguration {
    readonly type: string;
    readonly [key: string]: any;
}
/**
 * Security requirement
 */
export interface SecurityRequirement {
    readonly [name: string]: readonly string[];
}
/**
 * Operation policies
 */
export interface OperationPolicies {
    readonly inbound?: readonly IPolicy[];
    readonly backend?: readonly IPolicy[];
    readonly outbound?: readonly IPolicy[];
    readonly onError?: readonly IPolicy[];
}
/**
 * Policy interface (simplified - full definition in policy package)
 */
export interface IPolicy {
    readonly type: string;
    readonly [key: string]: any;
}
/**
 * External documentation reference
 */
export interface ExternalDocumentation {
    readonly description?: string;
    readonly url: string;
}
/**
 * Server configuration
 */
export interface ServerConfiguration {
    readonly url: string;
    readonly description?: string;
    readonly variables?: Record<string, ServerVariable>;
}
/**
 * Server variable for URL templating
 */
export interface ServerVariable {
    readonly enum?: readonly string[];
    readonly default: string;
    readonly description?: string;
}
//# sourceMappingURL=operation.d.ts.map