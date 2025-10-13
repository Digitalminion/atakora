/**
 * OpenAPI Type Interfaces
 *
 * Defines TypeScript interfaces for OpenAPI 3.0.x and 3.1.0 specifications.
 * These types provide a type-safe representation of OpenAPI documents that can be
 * imported from external specifications or exported from IRestOperation definitions.
 *
 * Based on the official OpenAPI Specification:
 * - OpenAPI 3.0.3: https://spec.openapis.org/oas/v3.0.3
 * - OpenAPI 3.1.0: https://spec.openapis.org/oas/v3.1.0
 *
 * @see ADR-014 REST API Core Architecture - Section 3: OpenAPI Integration
 * @see docs/design/architecture/openapi-library-evaluation.md - Felix's library recommendations
 */
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
/**
 * Union type for supported OpenAPI versions
 */
export type OpenApiVersion = '3.0.0' | '3.0.1' | '3.0.2' | '3.0.3' | '3.1.0';
/**
 * Root OpenAPI document interface supporting both 3.0.x and 3.1.0
 *
 * @example
 * ```typescript
 * const spec: OpenApiDefinition = {
 *   openapi: '3.0.3',
 *   info: {
 *     title: 'My API',
 *     version: '1.0.0'
 *   },
 *   paths: {
 *     '/users/{id}': {
 *       get: {
 *         operationId: 'getUser',
 *         responses: {
 *           '200': {
 *             description: 'User found'
 *           }
 *         }
 *       }
 *     }
 *   }
 * };
 * ```
 */
export interface OpenApiDefinition {
    readonly openapi: OpenApiVersion;
    readonly info: OpenApiInfo;
    readonly servers?: readonly OpenApiServer[];
    readonly paths: OpenApiPaths;
    readonly components?: OpenApiComponents;
    readonly security?: readonly SecurityRequirement[];
    readonly tags?: readonly OpenApiTag[];
    readonly externalDocs?: ExternalDocumentation;
    readonly 'x-ms-paths'?: OpenApiPaths;
}
/**
 * OpenAPI info object
 */
export interface OpenApiInfo {
    readonly title: string;
    readonly version: string;
    readonly description?: string;
    readonly termsOfService?: string;
    readonly contact?: OpenApiContact;
    readonly license?: OpenApiLicense;
    readonly 'x-ms-code-generation-settings'?: Record<string, any>;
}
/**
 * Contact information
 */
export interface OpenApiContact {
    readonly name?: string;
    readonly url?: string;
    readonly email?: string;
}
/**
 * License information
 */
export interface OpenApiLicense {
    readonly name: string;
    readonly url?: string;
}
/**
 * Server configuration
 */
export interface OpenApiServer {
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
/**
 * Paths object - maps URL paths to their operations
 */
export interface OpenApiPaths {
    readonly [path: string]: OpenApiPathItem | undefined;
}
/**
 * Path item - defines operations available on a path
 */
export interface OpenApiPathItem {
    readonly $ref?: string;
    readonly summary?: string;
    readonly description?: string;
    readonly get?: OpenApiOperation;
    readonly put?: OpenApiOperation;
    readonly post?: OpenApiOperation;
    readonly delete?: OpenApiOperation;
    readonly options?: OpenApiOperation;
    readonly head?: OpenApiOperation;
    readonly patch?: OpenApiOperation;
    readonly trace?: OpenApiOperation;
    readonly servers?: readonly OpenApiServer[];
    readonly parameters?: readonly (ParameterObject | ReferenceObject)[];
}
/**
 * Operation object - defines a single API operation
 */
export interface OpenApiOperation {
    readonly operationId?: string;
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly externalDocs?: ExternalDocumentation;
    readonly parameters?: readonly (ParameterObject | ReferenceObject)[];
    readonly requestBody?: RequestBodyObject | ReferenceObject;
    readonly responses: ResponsesObject;
    readonly callbacks?: Record<string, CallbackObject | ReferenceObject>;
    readonly deprecated?: boolean;
    readonly security?: readonly SecurityRequirement[];
    readonly servers?: readonly OpenApiServer[];
    readonly 'x-ms-long-running-operation'?: boolean;
    readonly 'x-ms-long-running-operation-options'?: Record<string, any>;
    readonly 'x-ms-pageable'?: {
        readonly nextLinkName?: string;
        readonly itemName?: string;
    };
    readonly 'x-ms-examples'?: Record<string, any>;
}
/**
 * Parameter object - defines a parameter for an operation
 */
export interface ParameterObject {
    readonly name: string;
    readonly in: 'query' | 'header' | 'path' | 'cookie';
    readonly description?: string;
    readonly required?: boolean;
    readonly deprecated?: boolean;
    readonly allowEmptyValue?: boolean;
    readonly style?: 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
    readonly explode?: boolean;
    readonly allowReserved?: boolean;
    readonly schema?: SchemaObject | ReferenceObject;
    readonly example?: any;
    readonly examples?: Record<string, ExampleObject | ReferenceObject>;
    readonly content?: Record<string, MediaTypeObject>;
    readonly 'x-ms-parameter-location'?: 'method' | 'client';
    readonly 'x-ms-skip-url-encoding'?: boolean;
}
/**
 * Request body object
 */
export interface RequestBodyObject {
    readonly description?: string;
    readonly content: Record<string, MediaTypeObject>;
    readonly required?: boolean;
}
/**
 * Media type object - defines a media type representation
 */
export interface MediaTypeObject {
    readonly schema?: SchemaObject | ReferenceObject;
    readonly example?: any;
    readonly examples?: Record<string, ExampleObject | ReferenceObject>;
    readonly encoding?: Record<string, EncodingObject>;
}
/**
 * Encoding object - for multipart and form-data
 */
export interface EncodingObject {
    readonly contentType?: string;
    readonly headers?: Record<string, HeaderObject | ReferenceObject>;
    readonly style?: string;
    readonly explode?: boolean;
    readonly allowReserved?: boolean;
}
/**
 * Responses object - maps status codes to response definitions
 */
export interface ResponsesObject {
    readonly default?: ResponseObject | ReferenceObject;
    readonly [statusCode: string]: ResponseObject | ReferenceObject | undefined;
}
/**
 * Response object - defines a response from an API operation
 */
export interface ResponseObject {
    readonly description: string;
    readonly headers?: Record<string, HeaderObject | ReferenceObject>;
    readonly content?: Record<string, MediaTypeObject>;
    readonly links?: Record<string, LinkObject | ReferenceObject>;
    readonly 'x-ms-error-response'?: boolean;
}
/**
 * Header object - defines a header parameter
 */
export interface HeaderObject {
    readonly description?: string;
    readonly required?: boolean;
    readonly deprecated?: boolean;
    readonly allowEmptyValue?: boolean;
    readonly style?: 'simple';
    readonly explode?: boolean;
    readonly allowReserved?: boolean;
    readonly schema?: SchemaObject | ReferenceObject;
    readonly example?: any;
    readonly examples?: Record<string, ExampleObject | ReferenceObject>;
    readonly content?: Record<string, MediaTypeObject>;
}
/**
 * Schema object - JSON Schema definition compatible with OpenAPI
 *
 * This is a subset of JSON Schema Draft 2020-12 with OpenAPI-specific extensions
 */
export interface SchemaObject {
    readonly type?: 'null' | 'boolean' | 'object' | 'array' | 'number' | 'string' | 'integer';
    readonly title?: string;
    readonly description?: string;
    readonly default?: any;
    readonly deprecated?: boolean;
    readonly readOnly?: boolean;
    readonly writeOnly?: boolean;
    readonly example?: any;
    readonly multipleOf?: number;
    readonly maximum?: number;
    readonly exclusiveMaximum?: boolean | number;
    readonly minimum?: number;
    readonly exclusiveMinimum?: boolean | number;
    readonly maxLength?: number;
    readonly minLength?: number;
    readonly pattern?: string;
    readonly format?: string;
    readonly maxItems?: number;
    readonly minItems?: number;
    readonly uniqueItems?: boolean;
    readonly items?: SchemaObject | ReferenceObject;
    readonly maxProperties?: number;
    readonly minProperties?: number;
    readonly required?: readonly string[];
    readonly properties?: Record<string, SchemaObject | ReferenceObject>;
    readonly additionalProperties?: boolean | SchemaObject | ReferenceObject;
    readonly patternProperties?: Record<string, SchemaObject | ReferenceObject>;
    readonly allOf?: readonly (SchemaObject | ReferenceObject)[];
    readonly oneOf?: readonly (SchemaObject | ReferenceObject)[];
    readonly anyOf?: readonly (SchemaObject | ReferenceObject)[];
    readonly not?: SchemaObject | ReferenceObject;
    readonly discriminator?: DiscriminatorObject;
    readonly xml?: XmlObject;
    readonly externalDocs?: ExternalDocumentation;
    readonly enum?: readonly any[];
    readonly nullable?: boolean;
    readonly 'x-ms-enum'?: {
        readonly name?: string;
        readonly modelAsString?: boolean;
        readonly values?: Array<{
            readonly value: any;
            readonly description?: string;
            readonly name?: string;
        }>;
    };
    readonly 'x-ms-discriminator-value'?: string;
    readonly 'x-ms-client-flatten'?: boolean;
    readonly 'x-ms-external'?: boolean;
    readonly 'x-ms-azure-resource'?: boolean;
    readonly 'x-ms-mutability'?: Array<'create' | 'read' | 'update'>;
    readonly 'x-ms-secret'?: boolean;
}
/**
 * Discriminator object - for polymorphic types
 */
export interface DiscriminatorObject {
    readonly propertyName: string;
    readonly mapping?: Record<string, string>;
}
/**
 * XML object - for XML serialization hints
 */
export interface XmlObject {
    readonly name?: string;
    readonly namespace?: string;
    readonly prefix?: string;
    readonly attribute?: boolean;
    readonly wrapped?: boolean;
}
/**
 * Example object
 */
export interface ExampleObject {
    readonly summary?: string;
    readonly description?: string;
    readonly value?: any;
    readonly externalValue?: string;
}
/**
 * Link object - for HATEOAS
 */
export interface LinkObject {
    readonly operationRef?: string;
    readonly operationId?: string;
    readonly parameters?: Record<string, any>;
    readonly requestBody?: any;
    readonly description?: string;
    readonly server?: OpenApiServer;
}
/**
 * Callback object - for webhook definitions
 */
export interface CallbackObject {
    readonly [expression: string]: OpenApiPathItem | undefined;
}
/**
 * Tag object - for grouping operations
 */
export interface OpenApiTag {
    readonly name: string;
    readonly description?: string;
    readonly externalDocs?: ExternalDocumentation;
}
/**
 * External documentation reference
 */
export interface ExternalDocumentation {
    readonly description?: string;
    readonly url: string;
}
/**
 * Security requirement object
 */
export interface SecurityRequirement {
    readonly [name: string]: readonly string[];
}
/**
 * Components object - reusable schemas and other objects
 */
export interface OpenApiComponents {
    readonly schemas?: Record<string, SchemaObject | ReferenceObject>;
    readonly responses?: Record<string, ResponseObject | ReferenceObject>;
    readonly parameters?: Record<string, ParameterObject | ReferenceObject>;
    readonly examples?: Record<string, ExampleObject | ReferenceObject>;
    readonly requestBodies?: Record<string, RequestBodyObject | ReferenceObject>;
    readonly headers?: Record<string, HeaderObject | ReferenceObject>;
    readonly securitySchemes?: Record<string, SecuritySchemeObject>;
    readonly links?: Record<string, LinkObject | ReferenceObject>;
    readonly callbacks?: Record<string, CallbackObject | ReferenceObject>;
    readonly 'x-ms-paths'?: OpenApiPaths;
}
/**
 * Security scheme object - defines a security mechanism
 */
export interface SecuritySchemeObject {
    readonly type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
    readonly description?: string;
    readonly name?: string;
    readonly in?: 'query' | 'header' | 'cookie';
    readonly scheme?: string;
    readonly bearerFormat?: string;
    readonly flows?: OAuthFlowsObject;
    readonly openIdConnectUrl?: string;
}
/**
 * OAuth flows object
 */
export interface OAuthFlowsObject {
    readonly implicit?: OAuthFlowObject;
    readonly password?: OAuthFlowObject;
    readonly clientCredentials?: OAuthFlowObject;
    readonly authorizationCode?: OAuthFlowObject;
}
/**
 * OAuth flow object
 */
export interface OAuthFlowObject {
    readonly authorizationUrl?: string;
    readonly tokenUrl?: string;
    readonly refreshUrl?: string;
    readonly scopes: Record<string, string>;
}
/**
 * Reference object - for $ref pointers
 *
 * @example
 * ```typescript
 * const ref: ReferenceObject = {
 *   $ref: '#/components/schemas/User'
 * };
 * ```
 */
export interface ReferenceObject {
    readonly $ref: string;
    readonly summary?: string;
    readonly description?: string;
}
/**
 * Validation result from OpenAPI spec validation
 */
export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: readonly ValidationError[];
}
/**
 * Validation error details
 */
export interface ValidationError {
    readonly message: string;
    readonly path?: string;
    readonly keyword?: string;
    readonly params?: Record<string, any>;
    readonly schemaPath?: string;
}
/**
 * Type guard to check if an object is a ReferenceObject
 *
 * @param obj - Object to check
 * @returns true if object is a ReferenceObject
 */
export declare function isReferenceObject(obj: any): obj is ReferenceObject;
/**
 * Type guard to check if an object is a SchemaObject
 *
 * @param obj - Object to check
 * @returns true if object is a SchemaObject
 */
export declare function isSchemaObject(obj: any): obj is SchemaObject;
/**
 * Re-export OpenAPI types from openapi-types package for compatibility
 */
export type { OpenAPIV3, OpenAPIV3_1 };
//# sourceMappingURL=types.d.ts.map