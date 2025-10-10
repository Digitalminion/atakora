/**
 * OpenAPI types and interfaces for the Atakora synthesis pipeline.
 *
 * This module provides type-safe definitions for working with OpenAPI 3.0 and 3.1
 * specifications, with support for Azure-specific extensions.
 */

/**
 * JSON Schema types following Draft 2020-12.
 */
export type JsonSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

/**
 * JSON Schema constraint definitions.
 */
export interface JsonSchema {
  // Type definition
  readonly type?: JsonSchemaType | readonly JsonSchemaType[];
  readonly enum?: readonly unknown[];
  readonly const?: unknown;

  // String constraints
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: string;

  // Number constraints
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number | boolean;
  readonly exclusiveMaximum?: number | boolean;
  readonly multipleOf?: number;

  // Array constraints
  readonly items?: JsonSchema | readonly JsonSchema[];
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly uniqueItems?: boolean;
  readonly contains?: JsonSchema;

  // Object constraints
  readonly properties?: Record<string, JsonSchema>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean | JsonSchema;
  readonly minProperties?: number;
  readonly maxProperties?: number;
  readonly propertyNames?: JsonSchema;
  readonly patternProperties?: Record<string, JsonSchema>;

  // Composition
  readonly allOf?: readonly JsonSchema[];
  readonly anyOf?: readonly JsonSchema[];
  readonly oneOf?: readonly JsonSchema[];
  readonly not?: JsonSchema;

  // References
  readonly $ref?: string;
  readonly $defs?: Record<string, JsonSchema>;
  readonly definitions?: Record<string, JsonSchema>;

  // Metadata
  readonly title?: string;
  readonly description?: string;
  readonly default?: unknown;
  readonly examples?: readonly unknown[];
  readonly deprecated?: boolean;
  readonly readOnly?: boolean;
  readonly writeOnly?: boolean;

  // OpenAPI 3.0 nullable (deprecated in 3.1)
  readonly nullable?: boolean;

  // OpenAPI discriminator
  readonly discriminator?: {
    readonly propertyName: string;
    readonly mapping?: Record<string, string>;
  };

  // Azure-specific extensions
  readonly 'x-ms-enum'?: AzureMsEnum;
  readonly 'x-ms-discriminator-value'?: string;
  readonly 'x-ms-client-flatten'?: boolean;
  readonly 'x-ms-azure-resource'?: boolean;
  readonly 'x-ms-mutability'?: readonly ('create' | 'read' | 'update')[];

  // Allow additional properties for unknown extensions
  readonly [key: string]: unknown;
}

/**
 * Azure x-ms-enum extension for enhanced enum metadata.
 */
export interface AzureMsEnum {
  readonly name: string;
  readonly modelAsString?: boolean;
  readonly values?: readonly {
    readonly value: string;
    readonly description?: string;
    readonly name?: string;
  }[];
}

/**
 * OpenAPI 3.x definition (supports both 3.0 and 3.1).
 */
export interface OpenApiDefinition {
  readonly openapi: string;
  readonly info: OpenApiInfo;
  readonly servers?: readonly OpenApiServer[];
  readonly paths: Record<string, OpenApiPathItem>;
  readonly components?: OpenApiComponents;
  readonly security?: readonly OpenApiSecurityRequirement[];
  readonly tags?: readonly OpenApiTag[];
  readonly externalDocs?: OpenApiExternalDocs;

  // Azure-specific extension for query parameter versioning
  readonly 'x-ms-paths'?: Record<string, OpenApiPathItem>;

  // Allow additional properties
  readonly [key: string]: unknown;
}

/**
 * OpenAPI info object.
 */
export interface OpenApiInfo {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
  readonly termsOfService?: string;
  readonly contact?: OpenApiContact;
  readonly license?: OpenApiLicense;
}

/**
 * OpenAPI contact information.
 */
export interface OpenApiContact {
  readonly name?: string;
  readonly url?: string;
  readonly email?: string;
}

/**
 * OpenAPI license information.
 */
export interface OpenApiLicense {
  readonly name: string;
  readonly url?: string;
}

/**
 * OpenAPI server object.
 */
export interface OpenApiServer {
  readonly url: string;
  readonly description?: string;
  readonly variables?: Record<string, OpenApiServerVariable>;
}

/**
 * OpenAPI server variable.
 */
export interface OpenApiServerVariable {
  readonly default: string;
  readonly enum?: readonly string[];
  readonly description?: string;
}

/**
 * OpenAPI path item object.
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
  readonly parameters?: readonly (OpenApiParameter | OpenApiReference)[];
}

/**
 * OpenAPI operation object.
 */
export interface OpenApiOperation {
  readonly operationId?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly parameters?: readonly (OpenApiParameter | OpenApiReference)[];
  readonly requestBody?: OpenApiRequestBody | OpenApiReference;
  readonly responses: Record<string, OpenApiResponse | OpenApiReference>;
  readonly callbacks?: Record<string, OpenApiCallback>;
  readonly deprecated?: boolean;
  readonly security?: readonly OpenApiSecurityRequirement[];
  readonly servers?: readonly OpenApiServer[];
  readonly externalDocs?: OpenApiExternalDocs;

  // Azure-specific extensions
  readonly 'x-ms-long-running-operation'?: boolean;
  readonly 'x-ms-pageable'?: {
    readonly nextLinkName?: string;
    readonly itemName?: string;
  };

  readonly [key: string]: unknown;
}

/**
 * OpenAPI parameter object.
 */
export interface OpenApiParameter {
  readonly name: string;
  readonly in: 'query' | 'header' | 'path' | 'cookie';
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly allowEmptyValue?: boolean;
  readonly schema?: JsonSchema | OpenApiReference;
  readonly example?: unknown;
  readonly examples?: Record<string, OpenApiExample | OpenApiReference>;
  readonly content?: Record<string, OpenApiMediaType>;

  // Parameter serialization
  readonly style?: string;
  readonly explode?: boolean;
  readonly allowReserved?: boolean;

  readonly [key: string]: unknown;
}

/**
 * OpenAPI request body object.
 */
export interface OpenApiRequestBody {
  readonly description?: string;
  readonly content: Record<string, OpenApiMediaType>;
  readonly required?: boolean;
}

/**
 * OpenAPI response object.
 */
export interface OpenApiResponse {
  readonly description: string;
  readonly headers?: Record<string, OpenApiHeader | OpenApiReference>;
  readonly content?: Record<string, OpenApiMediaType>;
  readonly links?: Record<string, OpenApiLink | OpenApiReference>;
}

/**
 * OpenAPI media type object.
 */
export interface OpenApiMediaType {
  readonly schema?: JsonSchema | OpenApiReference;
  readonly example?: unknown;
  readonly examples?: Record<string, OpenApiExample | OpenApiReference>;
  readonly encoding?: Record<string, OpenApiEncoding>;
}

/**
 * OpenAPI encoding object.
 */
export interface OpenApiEncoding {
  readonly contentType?: string;
  readonly headers?: Record<string, OpenApiHeader | OpenApiReference>;
  readonly style?: string;
  readonly explode?: boolean;
  readonly allowReserved?: boolean;
}

/**
 * OpenAPI header object.
 */
export interface OpenApiHeader {
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly allowEmptyValue?: boolean;
  readonly schema?: JsonSchema | OpenApiReference;
  readonly example?: unknown;
  readonly examples?: Record<string, OpenApiExample | OpenApiReference>;
}

/**
 * OpenAPI example object.
 */
export interface OpenApiExample {
  readonly summary?: string;
  readonly description?: string;
  readonly value?: unknown;
  readonly externalValue?: string;
}

/**
 * OpenAPI link object.
 */
export interface OpenApiLink {
  readonly operationRef?: string;
  readonly operationId?: string;
  readonly parameters?: Record<string, unknown>;
  readonly requestBody?: unknown;
  readonly description?: string;
  readonly server?: OpenApiServer;
}

/**
 * OpenAPI callback object.
 */
export type OpenApiCallback = Record<string, OpenApiPathItem>;

/**
 * OpenAPI components object.
 */
export interface OpenApiComponents {
  readonly schemas?: Record<string, JsonSchema | OpenApiReference>;
  readonly responses?: Record<string, OpenApiResponse | OpenApiReference>;
  readonly parameters?: Record<string, OpenApiParameter | OpenApiReference>;
  readonly examples?: Record<string, OpenApiExample | OpenApiReference>;
  readonly requestBodies?: Record<string, OpenApiRequestBody | OpenApiReference>;
  readonly headers?: Record<string, OpenApiHeader | OpenApiReference>;
  readonly securitySchemes?: Record<string, OpenApiSecurityScheme | OpenApiReference>;
  readonly links?: Record<string, OpenApiLink | OpenApiReference>;
  readonly callbacks?: Record<string, OpenApiCallback | OpenApiReference>;
}

/**
 * OpenAPI reference object.
 */
export interface OpenApiReference {
  readonly $ref: string;
}

/**
 * OpenAPI security requirement object.
 */
export type OpenApiSecurityRequirement = Record<string, readonly string[]>;

/**
 * OpenAPI security scheme object.
 */
export interface OpenApiSecurityScheme {
  readonly type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  readonly description?: string;
  readonly name?: string;
  readonly in?: 'query' | 'header' | 'cookie';
  readonly scheme?: string;
  readonly bearerFormat?: string;
  readonly flows?: OpenApiOAuthFlows;
  readonly openIdConnectUrl?: string;
}

/**
 * OpenAPI OAuth flows object.
 */
export interface OpenApiOAuthFlows {
  readonly implicit?: OpenApiOAuthFlow;
  readonly password?: OpenApiOAuthFlow;
  readonly clientCredentials?: OpenApiOAuthFlow;
  readonly authorizationCode?: OpenApiOAuthFlow;
}

/**
 * OpenAPI OAuth flow object.
 */
export interface OpenApiOAuthFlow {
  readonly authorizationUrl?: string;
  readonly tokenUrl?: string;
  readonly refreshUrl?: string;
  readonly scopes: Record<string, string>;
}

/**
 * OpenAPI tag object.
 */
export interface OpenApiTag {
  readonly name: string;
  readonly description?: string;
  readonly externalDocs?: OpenApiExternalDocs;
}

/**
 * OpenAPI external documentation object.
 */
export interface OpenApiExternalDocs {
  readonly description?: string;
  readonly url: string;
}

/**
 * Validation result with detailed error information.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

/**
 * Detailed validation error.
 */
export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly keyword?: string;
  readonly params?: Record<string, unknown>;
  readonly value?: unknown;
  readonly constraint?: string | number | boolean;
}

/**
 * RFC 7807 Problem Details for HTTP APIs.
 */
export interface ProblemDetails {
  readonly type?: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: unknown;
}

/**
 * Validation problem details with typed errors.
 */
export interface ValidationProblemDetails extends ProblemDetails {
  readonly errors: readonly ValidationError[];
}

/**
 * Circular reference information.
 */
export interface CircularReference {
  readonly path: string;
  readonly referencedFrom: string;
  readonly schemaName: string;
}

/**
 * Type generation options.
 */
export interface TypeGeneratorOptions {
  readonly output?: string;
  readonly readonly?: boolean;
  readonly strictNullChecks?: boolean;
  readonly exportType?: boolean;
  readonly includeConstraints?: boolean;
  readonly generateEnums?: boolean;
  readonly typePrefix?: string;
  readonly typeSuffix?: string;
  readonly typeMappings?: Record<string, string>;
}

/**
 * Generated type definition.
 */
export interface TypeDefinition {
  readonly name: string;
  readonly code: string;
  readonly dependencies: readonly string[];
  readonly isCircular: boolean;
  readonly documentation?: string;
}

/**
 * Generated types output.
 */
export interface GeneratedTypes {
  readonly types: readonly TypeDefinition[];
  readonly code: string;
  readonly metadata: {
    readonly totalTypes: number;
    readonly circularTypes: readonly string[];
    readonly warnings: readonly string[];
  };
}

/**
 * Schema constraint metadata.
 */
export interface SchemaConstraints {
  // String constraints
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: string;

  // Number constraints
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: boolean;
  readonly exclusiveMaximum?: boolean;
  readonly multipleOf?: number;

  // Array constraints
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly uniqueItems?: boolean;

  // Object constraints
  readonly minProperties?: number;
  readonly maxProperties?: number;
  readonly required?: readonly string[];

  // Additional metadata
  readonly description?: string;
  readonly example?: unknown;
  readonly deprecated?: boolean;
}

/**
 * Reference resolution options.
 */
export interface ReferenceResolverOptions {
  readonly resolveExternal?: boolean;
  readonly allowedSchemes?: readonly string[];
  readonly allowedPaths?: readonly string[];
  readonly maxDepth?: number;
  readonly continueOnError?: boolean;
}

/**
 * Government cloud configuration for OpenAPI processing.
 */
export interface GovernmentCloudConfig {
  readonly refParser: {
    readonly resolve: {
      readonly http: boolean;
      readonly https: boolean;
      readonly file: {
        readonly read?: (file: { url: string }) => Promise<string>;
      };
    };
  };
  readonly validation: {
    readonly schemaId: string;
    readonly loadSchema: boolean;
    readonly strict: boolean;
    readonly validateFormats: boolean;
  };
  readonly typeGeneration: {
    readonly remote: boolean;
    readonly localOnly: boolean;
  };
}

/**
 * Default Government cloud configuration.
 */
export const GOVERNMENT_CLOUD_CONFIG: GovernmentCloudConfig = {
  refParser: {
    resolve: {
      http: false,
      https: false,
      file: {
        read: undefined, // Must be provided by consumer
      },
    },
  },
  validation: {
    schemaId: 'auto',
    loadSchema: false,
    strict: true,
    validateFormats: true,
  },
  typeGeneration: {
    remote: false,
    localOnly: true,
  },
};
