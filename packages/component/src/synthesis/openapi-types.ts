/**
 * OpenAPI 3.0 Specification Type Definitions
 *
 * Complete TypeScript type definitions for OpenAPI 3.0.3 specification.
 * These types enable type-safe generation of OpenAPI/Swagger documentation
 * from schema definitions.
 *
 * @module @atakora/component/synthesis/openapi-types
 * @see https://spec.openapis.org/oas/v3.0.3
 */

// ============================================================================
// OpenAPI Root Object
// ============================================================================

/**
 * OpenAPI 3.0 Specification root object.
 *
 * This is the root object of the OpenAPI document. It describes the overall
 * API, including available paths, operations, authentication schemes, and
 * reusable components.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#openapi-object
 */
export interface OpenAPISpec {
  /**
   * REQUIRED. This string MUST be the semantic version number of the OpenAPI
   * Specification version that the OpenAPI document uses.
   */
  readonly openapi: '3.0.0' | '3.0.1' | '3.0.2' | '3.0.3';

  /**
   * REQUIRED. Provides metadata about the API.
   */
  readonly info: InfoObject;

  /**
   * An array of Server Objects, which provide connectivity information to a
   * target server. If not provided, the default URL is /.
   */
  readonly servers?: readonly ServerObject[];

  /**
   * REQUIRED. The available paths and operations for the API.
   */
  readonly paths: PathsObject;

  /**
   * An element to hold various schemas for the specification.
   */
  readonly components?: ComponentsObject;

  /**
   * A declaration of which security mechanisms can be used across the API.
   */
  readonly security?: readonly SecurityRequirementObject[];

  /**
   * A list of tags used by the specification with additional metadata.
   */
  readonly tags?: readonly TagObject[];

  /**
   * Additional external documentation.
   */
  readonly externalDocs?: ExternalDocumentationObject;
}

// ============================================================================
// Info Object
// ============================================================================

/**
 * Provides metadata about the API.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#info-object
 */
export interface InfoObject {
  /**
   * REQUIRED. The title of the API.
   *
   * @example 'Atakora Backend API'
   */
  readonly title: string;

  /**
   * REQUIRED. The version of the OpenAPI document (which is distinct from
   * the OpenAPI Specification version or the API implementation version).
   *
   * @example '1.0.0'
   */
  readonly version: string;

  /**
   * A short description of the API. CommonMark syntax MAY be used for rich
   * text representation.
   *
   * @example 'REST API for Atakora backend services'
   */
  readonly description?: string;

  /**
   * A URL to the Terms of Service for the API. MUST be in the format of a URL.
   *
   * @example 'https://example.com/terms'
   */
  readonly termsOfService?: string;

  /**
   * The contact information for the exposed API.
   */
  readonly contact?: ContactObject;

  /**
   * The license information for the exposed API.
   */
  readonly license?: LicenseObject;
}

/**
 * Contact information for the exposed API.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#contact-object
 */
export interface ContactObject {
  /**
   * The identifying name of the contact person/organization.
   *
   * @example 'API Support Team'
   */
  readonly name?: string;

  /**
   * The URL pointing to the contact information. MUST be in the format of a URL.
   *
   * @example 'https://example.com/support'
   */
  readonly url?: string;

  /**
   * The email address of the contact person/organization. MUST be in the
   * format of an email address.
   *
   * @example 'support@example.com'
   */
  readonly email?: string;
}

/**
 * License information for the exposed API.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#license-object
 */
export interface LicenseObject {
  /**
   * REQUIRED. The license name used for the API.
   *
   * @example 'MIT'
   */
  readonly name: string;

  /**
   * A URL to the license used for the API. MUST be in the format of a URL.
   *
   * @example 'https://opensource.org/licenses/MIT'
   */
  readonly url?: string;
}

// ============================================================================
// Server Object
// ============================================================================

/**
 * An object representing a Server.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#server-object
 */
export interface ServerObject {
  /**
   * REQUIRED. A URL to the target host. This URL supports Server Variables
   * and MAY be relative, to indicate that the host location is relative to
   * the location where the OpenAPI document is being served.
   *
   * @example 'https://api.example.com/v1'
   */
  readonly url: string;

  /**
   * An optional string describing the host designated by the URL.
   *
   * @example 'Production server'
   */
  readonly description?: string;

  /**
   * A map between a variable name and its value. The value is used for
   * substitution in the server's URL template.
   */
  readonly variables?: Record<string, ServerVariableObject>;
}

/**
 * An object representing a Server Variable for server URL template substitution.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#server-variable-object
 */
export interface ServerVariableObject {
  /**
   * REQUIRED. The default value to use for substitution.
   *
   * @example 'v1'
   */
  readonly default: string;

  /**
   * An enumeration of string values to be used if the substitution options
   * are from a limited set.
   *
   * @example ['v1', 'v2', 'v3']
   */
  readonly enum?: readonly string[];

  /**
   * An optional description for the server variable.
   *
   * @example 'API version'
   */
  readonly description?: string;
}

// ============================================================================
// Paths Object
// ============================================================================

/**
 * Holds the relative paths to the individual endpoints and their operations.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#paths-object
 */
export interface PathsObject {
  /**
   * A relative path to an individual endpoint. The field name MUST begin
   * with a forward slash (/). Path templating is allowed.
   *
   * @example '/users/{userId}'
   */
  readonly [path: string]: PathItemObject;
}

/**
 * Describes the operations available on a single path.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#path-item-object
 */
export interface PathItemObject {
  /**
   * An optional, string summary, intended to apply to all operations in this path.
   *
   * @example 'User operations'
   */
  readonly summary?: string;

  /**
   * An optional, string description, intended to apply to all operations in
   * this path. CommonMark syntax MAY be used for rich text representation.
   *
   * @example 'Operations for managing user resources'
   */
  readonly description?: string;

  /**
   * A definition of a GET operation on this path.
   */
  readonly get?: OperationObject;

  /**
   * A definition of a PUT operation on this path.
   */
  readonly put?: OperationObject;

  /**
   * A definition of a POST operation on this path.
   */
  readonly post?: OperationObject;

  /**
   * A definition of a DELETE operation on this path.
   */
  readonly delete?: OperationObject;

  /**
   * A definition of an OPTIONS operation on this path.
   */
  readonly options?: OperationObject;

  /**
   * A definition of a HEAD operation on this path.
   */
  readonly head?: OperationObject;

  /**
   * A definition of a PATCH operation on this path.
   */
  readonly patch?: OperationObject;

  /**
   * A definition of a TRACE operation on this path.
   */
  readonly trace?: OperationObject;

  /**
   * An alternative server array to service all operations in this path.
   */
  readonly servers?: readonly ServerObject[];

  /**
   * A list of parameters that are applicable for all the operations described
   * under this path. These parameters can be overridden at the operation level.
   */
  readonly parameters?: readonly (ParameterObject | ReferenceObject)[];
}

// ============================================================================
// Operation Object
// ============================================================================

/**
 * Describes a single API operation on a path.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#operation-object
 */
export interface OperationObject {
  /**
   * A list of tags for API documentation control.
   *
   * @example ['users', 'authentication']
   */
  readonly tags?: readonly string[];

  /**
   * A short summary of what the operation does.
   *
   * @example 'Get user by ID'
   */
  readonly summary?: string;

  /**
   * A verbose explanation of the operation behavior. CommonMark syntax MAY be
   * used for rich text representation.
   *
   * @example 'Retrieves a single user by their unique identifier'
   */
  readonly description?: string;

  /**
   * Additional external documentation for this operation.
   */
  readonly externalDocs?: ExternalDocumentationObject;

  /**
   * Unique string used to identify the operation. MUST be unique among all
   * operations described in the API.
   *
   * @example 'getUserById'
   */
  readonly operationId?: string;

  /**
   * A list of parameters that are applicable for this operation.
   */
  readonly parameters?: readonly (ParameterObject | ReferenceObject)[];

  /**
   * The request body applicable for this operation.
   */
  readonly requestBody?: RequestBodyObject | ReferenceObject;

  /**
   * REQUIRED. The list of possible responses as they are returned from
   * executing this operation.
   */
  readonly responses: ResponsesObject;

  /**
   * A map of possible out-of band callbacks related to the parent operation.
   */
  readonly callbacks?: Record<string, CallbackObject | ReferenceObject>;

  /**
   * Declares this operation to be deprecated. Consumers SHOULD refrain from
   * usage of the declared operation.
   */
  readonly deprecated?: boolean;

  /**
   * A declaration of which security mechanisms can be used for this operation.
   */
  readonly security?: readonly SecurityRequirementObject[];

  /**
   * An alternative server array to service this operation.
   */
  readonly servers?: readonly ServerObject[];
}

// ============================================================================
// External Documentation Object
// ============================================================================

/**
 * Allows referencing an external resource for extended documentation.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#external-documentation-object
 */
export interface ExternalDocumentationObject {
  /**
   * A short description of the target documentation.
   *
   * @example 'User Management Documentation'
   */
  readonly description?: string;

  /**
   * REQUIRED. The URL for the target documentation. MUST be in the format of a URL.
   *
   * @example 'https://docs.example.com/users'
   */
  readonly url: string;
}

// ============================================================================
// Parameter Object
// ============================================================================

/**
 * Describes a single operation parameter.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#parameter-object
 */
export interface ParameterObject {
  /**
   * REQUIRED. The name of the parameter. Parameter names are case sensitive.
   *
   * @example 'userId'
   */
  readonly name: string;

  /**
   * REQUIRED. The location of the parameter.
   */
  readonly in: 'query' | 'header' | 'path' | 'cookie';

  /**
   * A brief description of the parameter. CommonMark syntax MAY be used for
   * rich text representation.
   *
   * @example 'The unique identifier of the user'
   */
  readonly description?: string;

  /**
   * Determines whether this parameter is mandatory. If the parameter location
   * is "path", this property is REQUIRED and its value MUST be true.
   */
  readonly required?: boolean;

  /**
   * Specifies that a parameter is deprecated and SHOULD be transitioned out
   * of usage.
   */
  readonly deprecated?: boolean;

  /**
   * Sets the ability to pass empty-valued parameters.
   */
  readonly allowEmptyValue?: boolean;

  /**
   * Describes how the parameter value will be serialized depending on the
   * type of the parameter value.
   */
  readonly style?: 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';

  /**
   * When this is true, parameter values of type array or object generate
   * separate parameters for each value of the array or key-value pair of the map.
   */
  readonly explode?: boolean;

  /**
   * Determines whether the parameter value SHOULD allow reserved characters.
   */
  readonly allowReserved?: boolean;

  /**
   * The schema defining the type used for the parameter.
   */
  readonly schema?: SchemaObject | ReferenceObject;

  /**
   * Example of the parameter's potential value.
   */
  readonly example?: any;

  /**
   * Examples of the parameter's potential value.
   */
  readonly examples?: Record<string, ExampleObject | ReferenceObject>;

  /**
   * A map containing the representations for the parameter.
   */
  readonly content?: Record<string, MediaTypeObject>;
}

// ============================================================================
// Request Body Object
// ============================================================================

/**
 * Describes a single request body.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#request-body-object
 */
export interface RequestBodyObject {
  /**
   * A brief description of the request body. CommonMark syntax MAY be used
   * for rich text representation.
   *
   * @example 'User data for creation'
   */
  readonly description?: string;

  /**
   * REQUIRED. The content of the request body. The key is a media type or
   * media type range and the value describes it.
   */
  readonly content: Record<string, MediaTypeObject>;

  /**
   * Determines if the request body is required in the request. Defaults to false.
   */
  readonly required?: boolean;
}

// ============================================================================
// Media Type Object
// ============================================================================

/**
 * Provides schema and examples for the media type identified by its key.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#media-type-object
 */
export interface MediaTypeObject {
  /**
   * The schema defining the content of the request, response, or parameter.
   */
  readonly schema?: SchemaObject | ReferenceObject;

  /**
   * Example of the media type.
   */
  readonly example?: any;

  /**
   * Examples of the media type.
   */
  readonly examples?: Record<string, ExampleObject | ReferenceObject>;

  /**
   * A map between a property name and its encoding information.
   */
  readonly encoding?: Record<string, EncodingObject>;
}

/**
 * A single encoding definition applied to a single schema property.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#encoding-object
 */
export interface EncodingObject {
  /**
   * The Content-Type for encoding a specific property.
   *
   * @example 'application/json'
   */
  readonly contentType?: string;

  /**
   * A map allowing additional information to be provided as headers.
   */
  readonly headers?: Record<string, HeaderObject | ReferenceObject>;

  /**
   * Describes how a specific property value will be serialized depending on its type.
   */
  readonly style?: string;

  /**
   * When this is true, property values of type array or object generate
   * separate parameters for each value of the array.
   */
  readonly explode?: boolean;

  /**
   * Determines whether the parameter value SHOULD allow reserved characters.
   */
  readonly allowReserved?: boolean;
}

// ============================================================================
// Responses Object
// ============================================================================

/**
 * A container for the expected responses of an operation.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#responses-object
 */
export interface ResponsesObject {
  /**
   * Any HTTP status code can be used as the property name, but only one
   * property per code, to describe the expected response for that HTTP status code.
   *
   * Special key "default" can be used for undeclared responses.
   *
   * @example '200', '404', '500', 'default'
   */
  readonly [statusCode: string]: ResponseObject | ReferenceObject;
}

/**
 * Describes a single response from an API Operation.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#response-object
 */
export interface ResponseObject {
  /**
   * REQUIRED. A short description of the response. CommonMark syntax MAY be
   * used for rich text representation.
   *
   * @example 'Successful operation'
   */
  readonly description: string;

  /**
   * Maps a header name to its definition.
   */
  readonly headers?: Record<string, HeaderObject | ReferenceObject>;

  /**
   * A map containing descriptions of potential response payloads. The key is
   * a media type or media type range and the value describes it.
   */
  readonly content?: Record<string, MediaTypeObject>;

  /**
   * A map of operations links that can be followed from the response.
   */
  readonly links?: Record<string, LinkObject | ReferenceObject>;
}

// ============================================================================
// Callback Object
// ============================================================================

/**
 * A map of possible out-of band callbacks related to the parent operation.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#callback-object
 */
export interface CallbackObject {
  /**
   * A Path Item Object used to define a callback request and expected responses.
   */
  readonly [expression: string]: PathItemObject;
}

// ============================================================================
// Example Object
// ============================================================================

/**
 * An object that contains example data.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#example-object
 */
export interface ExampleObject {
  /**
   * Short description for the example.
   *
   * @example 'Example user object'
   */
  readonly summary?: string;

  /**
   * Long description for the example. CommonMark syntax MAY be used for rich
   * text representation.
   */
  readonly description?: string;

  /**
   * Embedded literal example. The value field and externalValue field are
   * mutually exclusive.
   */
  readonly value?: any;

  /**
   * A URL that points to the literal example. This provides the capability to
   * reference examples that cannot easily be included in JSON or YAML documents.
   */
  readonly externalValue?: string;
}

// ============================================================================
// Link Object
// ============================================================================

/**
 * Represents a possible design-time link for a response.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#link-object
 */
export interface LinkObject {
  /**
   * A relative or absolute URI reference to an OAS operation.
   */
  readonly operationRef?: string;

  /**
   * The name of an existing, resolvable OAS operation, as defined with a
   * unique operationId.
   */
  readonly operationId?: string;

  /**
   * A map representing parameters to pass to an operation as specified with
   * operationId or identified via operationRef.
   */
  readonly parameters?: Record<string, any>;

  /**
   * A literal value or {expression} to use as a request body when calling
   * the target operation.
   */
  readonly requestBody?: any;

  /**
   * A description of the link. CommonMark syntax MAY be used for rich text
   * representation.
   */
  readonly description?: string;

  /**
   * A server object to be used by the target operation.
   */
  readonly server?: ServerObject;
}

// ============================================================================
// Header Object
// ============================================================================

/**
 * Follows the structure of the Parameter Object but with location removed.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#header-object
 */
export interface HeaderObject {
  /**
   * A brief description of the header.
   */
  readonly description?: string;

  /**
   * Determines whether this header is mandatory.
   */
  readonly required?: boolean;

  /**
   * Specifies that a header is deprecated.
   */
  readonly deprecated?: boolean;

  /**
   * Sets the ability to pass empty-valued headers.
   */
  readonly allowEmptyValue?: boolean;

  /**
   * Describes how the header value will be serialized.
   */
  readonly style?: 'simple';

  /**
   * When this is true, header values of type array or object generate separate
   * parameters for each value of the array.
   */
  readonly explode?: boolean;

  /**
   * Determines whether the header value SHOULD allow reserved characters.
   */
  readonly allowReserved?: boolean;

  /**
   * The schema defining the type used for the header.
   */
  readonly schema?: SchemaObject | ReferenceObject;

  /**
   * Example of the header's potential value.
   */
  readonly example?: any;

  /**
   * Examples of the header's potential value.
   */
  readonly examples?: Record<string, ExampleObject | ReferenceObject>;

  /**
   * A map containing the representations for the header.
   */
  readonly content?: Record<string, MediaTypeObject>;
}

// ============================================================================
// Tag Object
// ============================================================================

/**
 * Adds metadata to a single tag that is used by the Operation Object.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#tag-object
 */
export interface TagObject {
  /**
   * REQUIRED. The name of the tag.
   *
   * @example 'users'
   */
  readonly name: string;

  /**
   * A short description for the tag. CommonMark syntax MAY be used for rich
   * text representation.
   *
   * @example 'User management operations'
   */
  readonly description?: string;

  /**
   * Additional external documentation for this tag.
   */
  readonly externalDocs?: ExternalDocumentationObject;
}

// ============================================================================
// Reference Object
// ============================================================================

/**
 * A simple object to allow referencing other components in the specification.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#reference-object
 */
export interface ReferenceObject {
  /**
   * REQUIRED. The reference string.
   *
   * @example '#/components/schemas/User'
   */
  readonly $ref: string;
}

// ============================================================================
// Schema Object
// ============================================================================

/**
 * The Schema Object allows the definition of input and output data types.
 * These types can be objects, but also primitives and arrays.
 *
 * Based on JSON Schema Draft 07 with OpenAPI-specific extensions.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#schema-object
 * @see https://json-schema.org/draft-07/schema
 */
export interface SchemaObject {
  // JSON Schema Core vocabulary
  readonly $id?: string;
  readonly $schema?: string;
  readonly $ref?: string;
  readonly $comment?: string;

  // JSON Schema Type
  readonly type?: 'null' | 'boolean' | 'object' | 'array' | 'number' | 'string' | 'integer';

  // String validation
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: 'date' | 'date-time' | 'password' | 'byte' | 'binary' | 'email' | 'uuid' | 'uri' | 'hostname' | 'ipv4' | 'ipv6' | string;

  // Number/Integer validation
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly multipleOf?: number;

  // Object validation
  readonly properties?: Record<string, SchemaObject | ReferenceObject>;
  readonly additionalProperties?: boolean | SchemaObject | ReferenceObject;
  readonly required?: readonly string[];
  readonly minProperties?: number;
  readonly maxProperties?: number;
  readonly propertyNames?: SchemaObject | ReferenceObject;
  readonly patternProperties?: Record<string, SchemaObject | ReferenceObject>;

  // Array validation
  readonly items?: SchemaObject | ReferenceObject;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly uniqueItems?: boolean;
  readonly contains?: SchemaObject | ReferenceObject;

  // Conditional validation
  readonly if?: SchemaObject | ReferenceObject;
  readonly then?: SchemaObject | ReferenceObject;
  readonly else?: SchemaObject | ReferenceObject;

  // Composition
  readonly allOf?: readonly (SchemaObject | ReferenceObject)[];
  readonly anyOf?: readonly (SchemaObject | ReferenceObject)[];
  readonly oneOf?: readonly (SchemaObject | ReferenceObject)[];
  readonly not?: SchemaObject | ReferenceObject;

  // Generic validation
  readonly enum?: readonly any[];
  readonly const?: any;

  // Metadata
  readonly title?: string;
  readonly description?: string;
  readonly default?: any;
  readonly examples?: readonly any[];

  // OpenAPI-specific extensions
  readonly nullable?: boolean;
  readonly discriminator?: DiscriminatorObject;
  readonly readOnly?: boolean;
  readonly writeOnly?: boolean;
  readonly xml?: XMLObject;
  readonly externalDocs?: ExternalDocumentationObject;
  readonly deprecated?: boolean;
}

/**
 * Discriminator object for polymorphism.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#discriminator-object
 */
export interface DiscriminatorObject {
  /**
   * REQUIRED. The name of the property in the payload that will hold the
   * discriminator value.
   *
   * @example 'type'
   */
  readonly propertyName: string;

  /**
   * An object to hold mappings between payload values and schema names or references.
   *
   * @example { 'dog': '#/components/schemas/Dog', 'cat': '#/components/schemas/Cat' }
   */
  readonly mapping?: Record<string, string>;
}

/**
 * A metadata object that allows for more fine-tuned XML model definitions.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#xml-object
 */
export interface XMLObject {
  /**
   * Replaces the name of the element/attribute used for the described schema property.
   *
   * @example 'user'
   */
  readonly name?: string;

  /**
   * The URI of the namespace definition.
   *
   * @example 'http://example.com/schema/user'
   */
  readonly namespace?: string;

  /**
   * The prefix to be used for the name.
   *
   * @example 'usr'
   */
  readonly prefix?: string;

  /**
   * Declares whether the property definition translates to an attribute instead
   * of an element. Default value is false.
   */
  readonly attribute?: boolean;

  /**
   * MAY be used only for an array definition. Signifies whether the array is
   * wrapped. Default value is false.
   */
  readonly wrapped?: boolean;
}

// ============================================================================
// Security Scheme Object
// ============================================================================

/**
 * Defines a security scheme that can be used by the operations.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#security-scheme-object
 */
export type SecuritySchemeObject =
  | APIKeySecurityScheme
  | HTTPSecurityScheme
  | OAuth2SecurityScheme
  | OpenIdConnectSecurityScheme;

/**
 * API Key security scheme.
 */
export interface APIKeySecurityScheme {
  readonly type: 'apiKey';
  readonly description?: string;
  readonly name: string;
  readonly in: 'query' | 'header' | 'cookie';
}

/**
 * HTTP authentication security scheme.
 */
export interface HTTPSecurityScheme {
  readonly type: 'http';
  readonly description?: string;
  readonly scheme: string;
  readonly bearerFormat?: string;
}

/**
 * OAuth2 security scheme.
 */
export interface OAuth2SecurityScheme {
  readonly type: 'oauth2';
  readonly description?: string;
  readonly flows: OAuthFlowsObject;
}

/**
 * OpenID Connect security scheme.
 */
export interface OpenIdConnectSecurityScheme {
  readonly type: 'openIdConnect';
  readonly description?: string;
  readonly openIdConnectUrl: string;
}

/**
 * Allows configuration of the supported OAuth Flows.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#oauth-flows-object
 */
export interface OAuthFlowsObject {
  readonly implicit?: OAuthFlowObject;
  readonly password?: OAuthFlowObject;
  readonly clientCredentials?: OAuthFlowObject;
  readonly authorizationCode?: OAuthFlowObject;
}

/**
 * Configuration details for a supported OAuth Flow.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#oauth-flow-object
 */
export interface OAuthFlowObject {
  readonly authorizationUrl?: string;
  readonly tokenUrl?: string;
  readonly refreshUrl?: string;
  readonly scopes: Record<string, string>;
}

/**
 * Lists the required security schemes to execute this operation.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#security-requirement-object
 */
export interface SecurityRequirementObject {
  /**
   * Each named security scheme MUST correspond to a security scheme declared
   * in the Security Schemes under the Components Object.
   *
   * @example { 'api_key': [] } or { 'oauth2': ['read:users', 'write:users'] }
   */
  readonly [name: string]: readonly string[];
}

// ============================================================================
// Components Object
// ============================================================================

/**
 * Holds a set of reusable objects for different aspects of the OAS.
 *
 * @see https://spec.openapis.org/oas/v3.0.3#components-object
 */
export interface ComponentsObject {
  /**
   * An object to hold reusable Schema Objects.
   */
  readonly schemas?: Record<string, SchemaObject | ReferenceObject>;

  /**
   * An object to hold reusable Response Objects.
   */
  readonly responses?: Record<string, ResponseObject | ReferenceObject>;

  /**
   * An object to hold reusable Parameter Objects.
   */
  readonly parameters?: Record<string, ParameterObject | ReferenceObject>;

  /**
   * An object to hold reusable Example Objects.
   */
  readonly examples?: Record<string, ExampleObject | ReferenceObject>;

  /**
   * An object to hold reusable Request Body Objects.
   */
  readonly requestBodies?: Record<string, RequestBodyObject | ReferenceObject>;

  /**
   * An object to hold reusable Header Objects.
   */
  readonly headers?: Record<string, HeaderObject | ReferenceObject>;

  /**
   * An object to hold reusable Security Scheme Objects.
   */
  readonly securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject>;

  /**
   * An object to hold reusable Link Objects.
   */
  readonly links?: Record<string, LinkObject | ReferenceObject>;

  /**
   * An object to hold reusable Callback Objects.
   */
  readonly callbacks?: Record<string, CallbackObject | ReferenceObject>;
}
