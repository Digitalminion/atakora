# ADR-014: REST API Core Architecture

## Context

Building on the API Stack Architecture defined in ADR-010, we need a comprehensive REST API implementation that provides the same level of type safety, developer experience, and Azure integration as our GraphQL architecture (ADR-011, ADR-012). REST APIs remain the most widely adopted API pattern and require first-class support in Atakora.

Azure API Management supports REST APIs through:
1. **Operation-based definitions**: Programmatic API definition with routes, methods, and parameters
2. **OpenAPI import**: Import existing OpenAPI 3.0/3.1 specifications
3. **Policy-based transformation**: Request/response manipulation through XML policies
4. **Backend integration**: Proxy to Azure Functions, App Services, or external endpoints

Current requirements:
- Type-safe REST operation definitions with full TypeScript inference
- OpenAPI 3.0/3.1 import and export capabilities
- Compile-time validation of API definitions against OpenAPI schema
- TypeScript type generation from OpenAPI schemas
- Seamless Azure Functions backend integration
- Support for multiple content types (JSON, XML, form-data, binary)
- Request/response validation at build time and runtime
- Backend service management with health checks and circuit breakers
- Government and Commercial cloud compatibility

## Decision

We will implement a comprehensive REST API architecture that provides type safety, OpenAPI integration, and seamless Azure backend connectivity while maintaining consistency with our GraphQL architecture patterns.

### 1. REST Operation Interface Architecture

```typescript
// Core REST operation interface
export interface IRestOperation<TParams = any, TQuery = any, TBody = any, TResponse = any> {
  readonly method: HttpMethod;
  readonly path: string;
  readonly operationId?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly tags?: string[];

  // Parameters
  readonly pathParameters?: PathParameterDefinition<TParams>;
  readonly queryParameters?: QueryParameterDefinition<TQuery>;
  readonly headerParameters?: HeaderParameterDefinition;

  // Request body
  readonly requestBody?: RequestBodyDefinition<TBody>;

  // Responses
  readonly responses: ResponseDefinition<TResponse>;

  // Backend integration
  readonly backend?: BackendConfiguration;

  // Security and policies
  readonly security?: SecurityRequirement[];
  readonly policies?: OperationPolicies;

  // Advanced features
  readonly deprecated?: boolean;
  readonly externalDocs?: ExternalDocumentation;
  readonly servers?: ServerConfiguration[];
}

// HTTP methods supported by Azure API Management
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'TRACE';

// Path parameter definition with type inference
export interface PathParameterDefinition<T = any> {
  readonly schema: ParameterSchema<T>;
  readonly description?: string;
  readonly examples?: Record<string, ParameterExample>;
  readonly style?: 'simple' | 'label' | 'matrix';
  readonly explode?: boolean;
}

// Query parameter definition with type inference
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

// Header parameter definition
export interface HeaderParameterDefinition {
  readonly schema: ParameterSchema;
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly examples?: Record<string, ParameterExample>;
}

// Parameter schema with TypeScript type mapping
export interface ParameterSchema<T = any> {
  readonly type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  readonly format?: string; // 'date', 'date-time', 'uuid', 'email', etc.
  readonly enum?: readonly T[];
  readonly default?: T;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string; // Regex pattern
  readonly items?: ParameterSchema; // For array types
  readonly properties?: Record<string, ParameterSchema>; // For object types
  readonly nullable?: boolean;
}

// Request body definition
export interface RequestBodyDefinition<T = any> {
  readonly description?: string;
  readonly required?: boolean;
  readonly content: ContentTypeDefinition<T>;
}

// Content type definition for request/response bodies
export interface ContentTypeDefinition<T = any> {
  readonly 'application/json'?: MediaTypeSchema<T>;
  readonly 'application/xml'?: MediaTypeSchema<T>;
  readonly 'application/x-www-form-urlencoded'?: MediaTypeSchema<T>;
  readonly 'multipart/form-data'?: MediaTypeSchema<T>;
  readonly 'text/plain'?: MediaTypeSchema<T>;
  readonly 'application/octet-stream'?: MediaTypeSchema<T>;
  readonly [contentType: string]: MediaTypeSchema<T> | undefined;
}

// Media type schema
export interface MediaTypeSchema<T = any> {
  readonly schema: JsonSchema<T>;
  readonly examples?: Record<string, MediaTypeExample>;
  readonly encoding?: Record<string, EncodingDefinition>;
}

// JSON Schema definition (subset aligned with OpenAPI)
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

  // JSON Schema reference
  readonly $ref?: string;
}

// Response definition
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

// Response schema
export interface ResponseSchema<T = any> {
  readonly description: string;
  readonly content?: ContentTypeDefinition<T>;
  readonly headers?: Record<string, HeaderDefinition>;
  readonly links?: Record<string, LinkDefinition>;
}

// RFC 7807 Problem Details format
export interface ErrorResponse {
  readonly type?: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly [key: string]: any; // Additional properties
}
```

### 2. Type-Safe Operation Builder Pattern

```typescript
// Type-safe REST operation builder
export class RestOperationBuilder<TParams = {}, TQuery = {}, TBody = unknown, TResponse = unknown> {
  private operation: Partial<IRestOperation> = {};

  constructor(method: HttpMethod, path: string) {
    this.operation.method = method;
    this.operation.path = path;
  }

  // Metadata configuration
  operationId(id: string): this {
    this.operation.operationId = id;
    return this;
  }

  summary(text: string): this {
    this.operation.summary = text;
    return this;
  }

  description(text: string): this {
    this.operation.description = text;
    return this;
  }

  tags(...tags: string[]): this {
    this.operation.tags = tags;
    return this;
  }

  deprecated(isDeprecated: boolean = true): this {
    this.operation.deprecated = isDeprecated;
    return this;
  }

  // Path parameters with type inference
  pathParams<T extends Record<string, any>>(
    definition: PathParameterDefinition<T>
  ): RestOperationBuilder<T, TQuery, TBody, TResponse> {
    this.operation.pathParameters = definition;
    return this as any;
  }

  // Query parameters with type inference
  queryParams<T extends Record<string, any>>(
    definition: QueryParameterDefinition<T>
  ): RestOperationBuilder<TParams, T, TBody, TResponse> {
    this.operation.queryParameters = definition;
    return this as any;
  }

  // Request body with type inference
  body<T>(
    definition: RequestBodyDefinition<T>
  ): RestOperationBuilder<TParams, TQuery, T, TResponse> {
    this.operation.requestBody = definition;
    return this as any;
  }

  // Response definition with type inference
  responses<T>(
    definition: ResponseDefinition<T>
  ): RestOperationBuilder<TParams, TQuery, TBody, T> {
    this.operation.responses = definition;
    return this as any;
  }

  // Backend configuration
  backend(config: BackendConfiguration): this {
    this.operation.backend = config;
    return this;
  }

  // Security requirements
  security(...requirements: SecurityRequirement[]): this {
    this.operation.security = requirements;
    return this;
  }

  // Operation policies
  policies(policies: OperationPolicies): this {
    this.operation.policies = policies;
    return this;
  }

  // Build final operation
  build(): IRestOperation<TParams, TQuery, TBody, TResponse> {
    if (!this.operation.responses) {
      throw new Error('Operation must define at least one response');
    }
    return this.operation as IRestOperation<TParams, TQuery, TBody, TResponse>;
  }
}

// Fluent helper functions for common HTTP methods
export function get(path: string): RestOperationBuilder {
  return new RestOperationBuilder('GET', path);
}

export function post<TBody = unknown>(path: string): RestOperationBuilder<{}, {}, TBody, unknown> {
  return new RestOperationBuilder('POST', path);
}

export function put<TBody = unknown>(path: string): RestOperationBuilder<{}, {}, TBody, unknown> {
  return new RestOperationBuilder('PUT', path);
}

export function patch<TBody = unknown>(path: string): RestOperationBuilder<{}, {}, TBody, unknown> {
  return new RestOperationBuilder('PATCH', path);
}

export function del(path: string): RestOperationBuilder {
  return new RestOperationBuilder('DELETE', path);
}

// Usage example with type inference
const getUserOperation = get('/users/{userId}')
  .operationId('getUser')
  .summary('Get user by ID')
  .pathParams<{ userId: string }>({
    schema: {
      type: 'string',
      format: 'uuid',
      description: 'User unique identifier'
    }
  })
  .queryParams<{ includeDeleted?: boolean }>({
    schema: {
      type: 'object',
      properties: {
        includeDeleted: {
          type: 'boolean',
          default: false,
          description: 'Include deleted users in response'
        }
      }
    }
  })
  .responses<User>({
    200: {
      description: 'User found',
      content: {
        'application/json': {
          schema: UserSchema
        }
      }
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      }
    }
  })
  .backend({
    type: 'azureFunction',
    functionApp: userFunctionApp,
    functionName: 'GetUser'
  })
  .build();
```

### 3. OpenAPI Integration

```typescript
// OpenAPI definition interface
export interface OpenApiDefinition {
  readonly openapi: '3.0.0' | '3.0.1' | '3.0.2' | '3.0.3' | '3.1.0';
  readonly info: OpenApiInfo;
  readonly servers?: OpenApiServer[];
  readonly paths: OpenApiPaths;
  readonly components?: OpenApiComponents;
  readonly security?: SecurityRequirement[];
  readonly tags?: OpenApiTag[];
  readonly externalDocs?: ExternalDocumentation;
}

// OpenAPI info
export interface OpenApiInfo {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
  readonly termsOfService?: string;
  readonly contact?: OpenApiContact;
  readonly license?: OpenApiLicense;
}

// OpenAPI paths
export interface OpenApiPaths {
  readonly [path: string]: OpenApiPathItem;
}

// OpenAPI path item
export interface OpenApiPathItem {
  readonly summary?: string;
  readonly description?: string;
  readonly get?: OpenApiOperation;
  readonly post?: OpenApiOperation;
  readonly put?: OpenApiOperation;
  readonly delete?: OpenApiOperation;
  readonly patch?: OpenApiOperation;
  readonly head?: OpenApiOperation;
  readonly options?: OpenApiOperation;
  readonly trace?: OpenApiOperation;
  readonly parameters?: (ParameterObject | ReferenceObject)[];
  readonly servers?: OpenApiServer[];
}

// OpenAPI operation
export interface OpenApiOperation {
  readonly operationId?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly tags?: string[];
  readonly parameters?: (ParameterObject | ReferenceObject)[];
  readonly requestBody?: RequestBodyObject | ReferenceObject;
  readonly responses: ResponsesObject;
  readonly security?: SecurityRequirement[];
  readonly deprecated?: boolean;
  readonly servers?: OpenApiServer[];
}

// OpenAPI components
export interface OpenApiComponents {
  readonly schemas?: Record<string, JsonSchema | ReferenceObject>;
  readonly responses?: Record<string, ResponseSchema | ReferenceObject>;
  readonly parameters?: Record<string, ParameterObject | ReferenceObject>;
  readonly examples?: Record<string, ExampleObject | ReferenceObject>;
  readonly requestBodies?: Record<string, RequestBodyDefinition | ReferenceObject>;
  readonly headers?: Record<string, HeaderDefinition | ReferenceObject>;
  readonly securitySchemes?: Record<string, SecuritySchemeObject>;
  readonly links?: Record<string, LinkDefinition | ReferenceObject>;
  readonly callbacks?: Record<string, CallbackObject | ReferenceObject>;
}

// Reference object for $ref
export interface ReferenceObject {
  readonly $ref: string;
  readonly summary?: string;
  readonly description?: string;
}

// OpenAPI importer
export class OpenApiImporter {
  constructor(private readonly spec: OpenApiDefinition | string) {}

  // Import OpenAPI spec and convert to REST operations
  async import(): Promise<RestOperationCollection> {
    const spec = typeof this.spec === 'string'
      ? await this.loadSpec(this.spec)
      : this.spec;

    // Validate OpenAPI spec
    this.validate(spec);

    // Convert paths to operations
    const operations: IRestOperation[] = [];
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      operations.push(...this.convertPathItem(path, pathItem, spec));
    }

    return {
      operations,
      info: spec.info,
      servers: spec.servers,
      components: spec.components,
      security: spec.security
    };
  }

  private async loadSpec(path: string): Promise<OpenApiDefinition> {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      // Load from URL
      const response = await fetch(path);
      return await response.json();
    } else {
      // Load from file
      const content = await fs.readFile(path, 'utf-8');
      if (path.endsWith('.yaml') || path.endsWith('.yml')) {
        return yaml.parse(content);
      }
      return JSON.parse(content);
    }
  }

  private validate(spec: OpenApiDefinition): void {
    // Validate against OpenAPI JSON Schema
    const validator = new OpenApiValidator(spec.openapi);
    const errors = validator.validate(spec);

    if (errors.length > 0) {
      throw new OpenApiValidationError('Invalid OpenAPI specification', errors);
    }
  }

  private convertPathItem(
    path: string,
    pathItem: OpenApiPathItem,
    spec: OpenApiDefinition
  ): IRestOperation[] {
    const operations: IRestOperation[] = [];
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE'];

    for (const method of methods) {
      const operation = pathItem[method.toLowerCase() as keyof OpenApiPathItem];
      if (operation && typeof operation === 'object' && 'responses' in operation) {
        operations.push(this.convertOperation(method, path, operation, pathItem, spec));
      }
    }

    return operations;
  }

  private convertOperation(
    method: HttpMethod,
    path: string,
    operation: OpenApiOperation,
    pathItem: OpenApiPathItem,
    spec: OpenApiDefinition
  ): IRestOperation {
    // Merge path-level and operation-level parameters
    const parameters = [
      ...(pathItem.parameters || []),
      ...(operation.parameters || [])
    ];

    // Convert to our REST operation format
    return {
      method,
      path,
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags,
      pathParameters: this.extractPathParameters(parameters, spec),
      queryParameters: this.extractQueryParameters(parameters, spec),
      headerParameters: this.extractHeaderParameters(parameters, spec),
      requestBody: this.convertRequestBody(operation.requestBody, spec),
      responses: this.convertResponses(operation.responses, spec),
      security: operation.security,
      deprecated: operation.deprecated,
      servers: operation.servers || pathItem.servers || spec.servers
    };
  }

  private extractPathParameters(
    parameters: (ParameterObject | ReferenceObject)[],
    spec: OpenApiDefinition
  ): PathParameterDefinition | undefined {
    const pathParams = parameters
      .map(p => this.resolveReference(p, spec))
      .filter((p): p is ParameterObject => p.in === 'path');

    if (pathParams.length === 0) return undefined;

    // Combine path parameters into schema
    const properties: Record<string, ParameterSchema> = {};
    const required: string[] = [];

    for (const param of pathParams) {
      properties[param.name] = this.convertParameterSchema(param.schema);
      if (param.required) required.push(param.name);
    }

    return {
      schema: {
        type: 'object',
        properties,
        required
      }
    };
  }

  private extractQueryParameters(
    parameters: (ParameterObject | ReferenceObject)[],
    spec: OpenApiDefinition
  ): QueryParameterDefinition | undefined {
    const queryParams = parameters
      .map(p => this.resolveReference(p, spec))
      .filter((p): p is ParameterObject => p.in === 'query');

    if (queryParams.length === 0) return undefined;

    const properties: Record<string, ParameterSchema> = {};
    const required: string[] = [];

    for (const param of queryParams) {
      properties[param.name] = this.convertParameterSchema(param.schema);
      if (param.required) required.push(param.name);
    }

    return {
      schema: {
        type: 'object',
        properties,
        required
      },
      required: required.length > 0
    };
  }

  private resolveReference<T>(
    item: T | ReferenceObject,
    spec: OpenApiDefinition
  ): T {
    if ('$ref' in item) {
      // Resolve $ref
      const refPath = item.$ref.split('/').slice(1); // Remove leading '#'
      let resolved: any = spec;

      for (const part of refPath) {
        resolved = resolved[part];
        if (!resolved) {
          throw new Error(`Invalid reference: ${item.$ref}`);
        }
      }

      return resolved as T;
    }
    return item as T;
  }

  private convertParameterSchema(schema: any): ParameterSchema {
    // Convert OpenAPI schema to our parameter schema format
    return {
      type: schema.type,
      format: schema.format,
      enum: schema.enum,
      default: schema.default,
      minimum: schema.minimum,
      maximum: schema.maximum,
      minLength: schema.minLength,
      maxLength: schema.maxLength,
      pattern: schema.pattern,
      items: schema.items ? this.convertParameterSchema(schema.items) : undefined,
      properties: schema.properties ?
        Object.fromEntries(
          Object.entries(schema.properties).map(([key, val]) =>
            [key, this.convertParameterSchema(val)]
          )
        ) : undefined,
      nullable: schema.nullable
    };
  }

  private convertRequestBody(
    requestBody: RequestBodyObject | ReferenceObject | undefined,
    spec: OpenApiDefinition
  ): RequestBodyDefinition | undefined {
    if (!requestBody) return undefined;

    const resolved = this.resolveReference(requestBody, spec);
    const content: ContentTypeDefinition = {};

    for (const [mediaType, mediaTypeObject] of Object.entries(resolved.content)) {
      content[mediaType] = {
        schema: mediaTypeObject.schema,
        examples: mediaTypeObject.examples,
        encoding: mediaTypeObject.encoding
      };
    }

    return {
      description: resolved.description,
      required: resolved.required,
      content
    };
  }

  private convertResponses(
    responses: ResponsesObject,
    spec: OpenApiDefinition
  ): ResponseDefinition {
    const converted: ResponseDefinition = {};

    for (const [statusCode, response] of Object.entries(responses)) {
      const resolved = this.resolveReference(response, spec);
      const content: ContentTypeDefinition = {};

      if (resolved.content) {
        for (const [mediaType, mediaTypeObject] of Object.entries(resolved.content)) {
          content[mediaType] = {
            schema: mediaTypeObject.schema,
            examples: mediaTypeObject.examples
          };
        }
      }

      converted[statusCode === 'default' ? 'default' : parseInt(statusCode)] = {
        description: resolved.description,
        content: Object.keys(content).length > 0 ? content : undefined,
        headers: resolved.headers,
        links: resolved.links
      };
    }

    return converted;
  }
}

// OpenAPI exporter
export class OpenApiExporter {
  constructor(
    private readonly operations: IRestOperation[],
    private readonly info: OpenApiInfo
  ) {}

  // Export REST operations to OpenAPI spec
  export(version: '3.0.3' | '3.1.0' = '3.0.3'): OpenApiDefinition {
    const paths: OpenApiPaths = {};
    const components: OpenApiComponents = {
      schemas: {},
      responses: {},
      parameters: {},
      securitySchemes: {}
    };

    // Group operations by path
    const operationsByPath = this.groupByPath(this.operations);

    for (const [path, operations] of operationsByPath) {
      paths[path] = this.buildPathItem(operations, components);
    }

    return {
      openapi: version,
      info: this.info,
      paths,
      components: Object.keys(components.schemas!).length > 0 ? components : undefined
    };
  }

  private groupByPath(operations: IRestOperation[]): Map<string, IRestOperation[]> {
    const grouped = new Map<string, IRestOperation[]>();

    for (const operation of operations) {
      const existing = grouped.get(operation.path) || [];
      existing.push(operation);
      grouped.set(operation.path, existing);
    }

    return grouped;
  }

  private buildPathItem(
    operations: IRestOperation[],
    components: OpenApiComponents
  ): OpenApiPathItem {
    const pathItem: OpenApiPathItem = {};

    for (const operation of operations) {
      const method = operation.method.toLowerCase() as keyof OpenApiPathItem;
      pathItem[method] = this.buildOperation(operation, components);
    }

    return pathItem;
  }

  private buildOperation(
    operation: IRestOperation,
    components: OpenApiComponents
  ): OpenApiOperation {
    return {
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags,
      parameters: this.buildParameters(operation, components),
      requestBody: this.buildRequestBody(operation, components),
      responses: this.buildResponses(operation, components),
      security: operation.security,
      deprecated: operation.deprecated
    };
  }

  private buildParameters(
    operation: IRestOperation,
    components: OpenApiComponents
  ): (ParameterObject | ReferenceObject)[] | undefined {
    const parameters: ParameterObject[] = [];

    // Path parameters
    if (operation.pathParameters) {
      for (const [name, schema] of Object.entries(operation.pathParameters.schema.properties || {})) {
        parameters.push({
          name,
          in: 'path',
          required: true,
          schema: this.convertToOpenApiSchema(schema)
        });
      }
    }

    // Query parameters
    if (operation.queryParameters) {
      for (const [name, schema] of Object.entries(operation.queryParameters.schema.properties || {})) {
        parameters.push({
          name,
          in: 'query',
          required: operation.queryParameters.schema.required?.includes(name) || false,
          schema: this.convertToOpenApiSchema(schema)
        });
      }
    }

    // Header parameters
    if (operation.headerParameters) {
      for (const [name, schema] of Object.entries(operation.headerParameters.schema.properties || {})) {
        parameters.push({
          name,
          in: 'header',
          required: false,
          schema: this.convertToOpenApiSchema(schema)
        });
      }
    }

    return parameters.length > 0 ? parameters : undefined;
  }

  private buildRequestBody(
    operation: IRestOperation,
    components: OpenApiComponents
  ): RequestBodyObject | undefined {
    if (!operation.requestBody) return undefined;

    const content: Record<string, MediaTypeObject> = {};

    for (const [mediaType, mediaTypeSchema] of Object.entries(operation.requestBody.content)) {
      if (mediaTypeSchema) {
        content[mediaType] = {
          schema: this.convertToOpenApiSchema(mediaTypeSchema.schema),
          examples: mediaTypeSchema.examples
        };
      }
    }

    return {
      description: operation.requestBody.description,
      required: operation.requestBody.required,
      content
    };
  }

  private buildResponses(
    operation: IRestOperation,
    components: OpenApiComponents
  ): ResponsesObject {
    const responses: ResponsesObject = {};

    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (!response) continue;

      const content: Record<string, MediaTypeObject> = {};

      if (response.content) {
        for (const [mediaType, mediaTypeSchema] of Object.entries(response.content)) {
          if (mediaTypeSchema) {
            content[mediaType] = {
              schema: this.convertToOpenApiSchema(mediaTypeSchema.schema),
              examples: mediaTypeSchema.examples
            };
          }
        }
      }

      responses[statusCode] = {
        description: response.description,
        content: Object.keys(content).length > 0 ? content : undefined,
        headers: response.headers
      };
    }

    return responses;
  }

  private convertToOpenApiSchema(schema: JsonSchema): any {
    // Convert our schema to OpenAPI schema format
    return {
      type: schema.type,
      format: schema.format,
      title: schema.title,
      description: schema.description,
      default: schema.default,
      multipleOf: schema.multipleOf,
      maximum: schema.maximum,
      exclusiveMaximum: schema.exclusiveMaximum,
      minimum: schema.minimum,
      exclusiveMinimum: schema.exclusiveMinimum,
      maxLength: schema.maxLength,
      minLength: schema.minLength,
      pattern: schema.pattern,
      maxItems: schema.maxItems,
      minItems: schema.minItems,
      uniqueItems: schema.uniqueItems,
      maxProperties: schema.maxProperties,
      minProperties: schema.minProperties,
      required: schema.required,
      enum: schema.enum,
      properties: schema.properties ?
        Object.fromEntries(
          Object.entries(schema.properties).map(([key, val]) =>
            [key, this.convertToOpenApiSchema(val)]
          )
        ) : undefined,
      additionalProperties: schema.additionalProperties,
      items: schema.items ? this.convertToOpenApiSchema(schema.items) : undefined,
      oneOf: schema.oneOf?.map(s => this.convertToOpenApiSchema(s)),
      anyOf: schema.anyOf?.map(s => this.convertToOpenApiSchema(s)),
      allOf: schema.allOf?.map(s => this.convertToOpenApiSchema(s)),
      not: schema.not ? this.convertToOpenApiSchema(schema.not) : undefined,
      nullable: schema.nullable,
      discriminator: schema.discriminator,
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly,
      xml: schema.xml,
      externalDocs: schema.externalDocs,
      example: schema.example,
      deprecated: schema.deprecated,
      $ref: schema.$ref
    };
  }
}
```

### 4. Backend Integration

```typescript
// Backend configuration
export interface BackendConfiguration {
  readonly type: BackendType;
  readonly url?: string;
  readonly credentials?: BackendCredentials;
  readonly timeout?: number;
  readonly retryPolicy?: RetryPolicy;
  readonly circuitBreaker?: CircuitBreakerConfig;
  readonly healthCheck?: HealthCheckConfig;
  readonly loadBalancing?: LoadBalancingConfig;
}

export type BackendType =
  | 'azureFunction'
  | 'appService'
  | 'containerApp'
  | 'httpEndpoint'
  | 'serviceFabric'
  | 'logicApp';

// Azure Function backend
export interface AzureFunctionBackend extends BackendConfiguration {
  readonly type: 'azureFunction';
  readonly functionApp: IFunctionApp;
  readonly functionName: string;
  readonly authLevel?: 'anonymous' | 'function' | 'admin';
}

// App Service backend
export interface AppServiceBackend extends BackendConfiguration {
  readonly type: 'appService';
  readonly appService: IWebApp;
  readonly relativePath?: string;
}

// Container App backend
export interface ContainerAppBackend extends BackendConfiguration {
  readonly type: 'containerApp';
  readonly containerApp: IContainerApp;
  readonly port?: number;
}

// HTTP endpoint backend
export interface HttpEndpointBackend extends BackendConfiguration {
  readonly type: 'httpEndpoint';
  readonly url: string;
  readonly preserveHostHeader?: boolean;
}

// Backend credentials
export interface BackendCredentials {
  readonly type: 'none' | 'basic' | 'clientCertificate' | 'managedIdentity' | 'apiKey';
  readonly username?: string;
  readonly password?: string;
  readonly certificate?: string;
  readonly apiKey?: string;
  readonly header?: string;
}

// Retry policy
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly interval: number; // milliseconds
  readonly backoffMultiplier?: number;
  readonly maxInterval?: number;
  readonly retryOn?: number[]; // HTTP status codes
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  readonly enabled: boolean;
  readonly failureThreshold: number; // Number of failures before opening
  readonly successThreshold: number; // Number of successes before closing
  readonly timeout: number; // milliseconds
  readonly halfOpenRequests?: number; // Requests to allow in half-open state
}

// Health check configuration
export interface HealthCheckConfig {
  readonly enabled: boolean;
  readonly path: string;
  readonly interval: number; // seconds
  readonly timeout: number; // seconds
  readonly unhealthyThreshold: number;
  readonly healthyThreshold: number;
  readonly protocol?: 'http' | 'https' | 'tcp';
  readonly port?: number;
  readonly expectedStatusCode?: number;
  readonly expectedBody?: string;
}

// Load balancing configuration
export interface LoadBalancingConfig {
  readonly strategy: 'roundRobin' | 'leastConnections' | 'weighted' | 'ipHash';
  readonly backends: BackendPoolMember[];
  readonly stickySession?: StickySessionConfig;
}

export interface BackendPoolMember {
  readonly backend: BackendConfiguration;
  readonly weight?: number; // For weighted load balancing
  readonly priority?: number; // For priority-based routing
}

// Backend manager
export class BackendManager {
  constructor(private readonly apiManagement: IApiManagement) {}

  // Create backend from configuration
  createBackend(config: BackendConfiguration): IBackend {
    switch (config.type) {
      case 'azureFunction':
        return this.createAzureFunctionBackend(config as AzureFunctionBackend);
      case 'appService':
        return this.createAppServiceBackend(config as AppServiceBackend);
      case 'containerApp':
        return this.createContainerAppBackend(config as ContainerAppBackend);
      case 'httpEndpoint':
        return this.createHttpEndpointBackend(config as HttpEndpointBackend);
      default:
        throw new Error(`Unsupported backend type: ${config.type}`);
    }
  }

  private createAzureFunctionBackend(config: AzureFunctionBackend): IBackend {
    const functionUrl = this.getFunctionUrl(config.functionApp, config.functionName);

    return new Backend(this.apiManagement, `backend-${config.functionName}`, {
      url: functionUrl,
      protocol: 'http',
      credentials: this.createManagedIdentityCredentials(config.functionApp),
      timeout: config.timeout || 30,
      circuitBreaker: config.circuitBreaker,
      healthCheck: config.healthCheck
    });
  }

  private createAppServiceBackend(config: AppServiceBackend): IBackend {
    const appServiceUrl = config.appService.defaultHostName;
    const fullUrl = config.relativePath
      ? `https://${appServiceUrl}${config.relativePath}`
      : `https://${appServiceUrl}`;

    return new Backend(this.apiManagement, `backend-${config.appService.name}`, {
      url: fullUrl,
      protocol: 'http',
      credentials: this.createManagedIdentityCredentials(config.appService),
      timeout: config.timeout || 30,
      circuitBreaker: config.circuitBreaker,
      healthCheck: config.healthCheck
    });
  }

  private createContainerAppBackend(config: ContainerAppBackend): IBackend {
    const containerUrl = config.containerApp.configuration.ingress.fqdn;
    const port = config.port || config.containerApp.configuration.ingress.targetPort;

    return new Backend(this.apiManagement, `backend-${config.containerApp.name}`, {
      url: `https://${containerUrl}`,
      protocol: 'http',
      timeout: config.timeout || 30,
      circuitBreaker: config.circuitBreaker
    });
  }

  private createHttpEndpointBackend(config: HttpEndpointBackend): IBackend {
    return new Backend(this.apiManagement, 'backend-http', {
      url: config.url,
      protocol: 'http',
      credentials: config.credentials,
      timeout: config.timeout || 30,
      preserveHostHeader: config.preserveHostHeader,
      circuitBreaker: config.circuitBreaker,
      healthCheck: config.healthCheck
    });
  }

  private getFunctionUrl(functionApp: IFunctionApp, functionName: string): string {
    const defaultHostName = functionApp.defaultHostName;
    return `https://${defaultHostName}/api/${functionName}`;
  }

  private createManagedIdentityCredentials(resource: IResource): BackendCredentials {
    return {
      type: 'managedIdentity',
      // Azure API Management will use its managed identity to authenticate
    };
  }
}
```

### 5. RestApiStack Integration

```typescript
// Extend RestApiStack from ADR-010
export class RestApiStack extends ApiStackBase {
  private operations: Map<string, IRestOperation> = new Map();
  private openApiSpec?: OpenApiDefinition;
  private backendManager: BackendManager;

  constructor(scope: Construct, id: string, props: RestApiStackProps) {
    super(scope, id, props);

    this.backendManager = new BackendManager(props.apiManagementService);

    // Handle OpenAPI import if provided
    if (props.openApiSpec) {
      this.importOpenApiSpec(props.openApiSpec);
    }

    // Add programmatically defined operations
    if (props.operations) {
      for (const operation of props.operations) {
        this.addOperation(operation);
      }
    }
  }

  // Create API with REST operations
  protected createApi(props: RestApiStackProps): IServiceApi {
    const api = new ServiceApi(this, 'Api', {
      apiManagementService: props.apiManagementService,
      displayName: props.apiName || this.node.id,
      path: props.path,
      protocols: props.protocols || ['https'],
      apiType: 'http', // REST API type
      serviceUrl: props.serviceUrl
    });

    // Register all operations
    for (const operation of this.operations.values()) {
      this.registerOperation(api, operation);
    }

    return api;
  }

  // Add operation programmatically
  public addOperation(operation: IRestOperation): this {
    const operationId = operation.operationId ||
      `${operation.method.toLowerCase()}_${operation.path.replace(/[^a-zA-Z0-9]/g, '_')}`;

    this.operations.set(operationId, operation);

    // If API already created, register immediately
    if (this.api) {
      this.registerOperation(this.api, operation);
    }

    return this;
  }

  // Import OpenAPI specification
  public importOpenApiSpec(spec: string | OpenApiDefinition): this {
    const importer = new OpenApiImporter(spec);
    const result = importer.import();

    // Store OpenAPI spec
    this.openApiSpec = typeof spec === 'string' ? result : spec;

    // Add all operations
    for (const operation of result.operations) {
      this.addOperation(operation);
    }

    return this;
  }

  // Export current operations as OpenAPI spec
  public exportOpenApiSpec(info?: OpenApiInfo): OpenApiDefinition {
    const exporter = new OpenApiExporter(
      Array.from(this.operations.values()),
      info || {
        title: this.api?.displayName || 'API',
        version: '1.0.0'
      }
    );

    return exporter.export();
  }

  // Register operation with API Management
  private registerOperation(api: IServiceApi, operation: IRestOperation): void {
    // Create operation resource
    const apiOperation = new ApiOperation(api, operation.operationId!, {
      displayName: operation.summary || operation.operationId!,
      method: operation.method,
      urlTemplate: operation.path,
      description: operation.description,
      templateParameters: this.extractTemplateParameters(operation),
      request: this.buildOperationRequest(operation),
      responses: this.buildOperationResponses(operation)
    });

    // Create backend if configured
    if (operation.backend) {
      const backend = this.backendManager.createBackend(operation.backend);

      // Add backend policy
      this.addOperationPolicy(apiOperation, {
        inbound: [
          setBackendService(backend),
          ...(operation.backend.retryPolicy ? [retry(operation.backend.retryPolicy)] : [])
        ]
      });
    }

    // Apply operation-specific policies
    if (operation.policies) {
      this.addOperationPolicy(apiOperation, operation.policies);
    }
  }

  private extractTemplateParameters(operation: IRestOperation): TemplateParameter[] {
    const parameters: TemplateParameter[] = [];

    // Extract path parameters from path template
    const pathParamRegex = /{([^}]+)}/g;
    let match;

    while ((match = pathParamRegex.exec(operation.path)) !== null) {
      const paramName = match[1];
      const paramSchema = operation.pathParameters?.schema.properties?.[paramName];

      parameters.push({
        name: paramName,
        type: paramSchema?.type || 'string',
        required: true,
        description: paramSchema?.description
      });
    }

    return parameters;
  }

  private buildOperationRequest(operation: IRestOperation): OperationRequest | undefined {
    if (!operation.requestBody && !operation.queryParameters && !operation.headerParameters) {
      return undefined;
    }

    return {
      description: operation.requestBody?.description,
      queryParameters: this.buildQueryParameters(operation.queryParameters),
      headers: this.buildHeaderParameters(operation.headerParameters),
      representations: operation.requestBody ?
        this.buildRepresentations(operation.requestBody.content) : undefined
    };
  }

  private buildOperationResponses(operation: IRestOperation): OperationResponse[] {
    const responses: OperationResponse[] = [];

    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (!response) continue;

      responses.push({
        statusCode: statusCode === 'default' ? 0 : parseInt(statusCode),
        description: response.description,
        representations: response.content ?
          this.buildRepresentations(response.content) : undefined,
        headers: response.headers ?
          Object.entries(response.headers).map(([name, header]) => ({
            name,
            type: header.schema?.type || 'string',
            description: header.description
          })) : undefined
      });
    }

    return responses;
  }

  private buildQueryParameters(
    definition?: QueryParameterDefinition
  ): ParameterContract[] | undefined {
    if (!definition?.schema.properties) return undefined;

    return Object.entries(definition.schema.properties).map(([name, schema]) => ({
      name,
      type: schema.type,
      required: definition.schema.required?.includes(name) || false,
      description: schema.description,
      defaultValue: schema.default,
      values: schema.enum
    }));
  }

  private buildHeaderParameters(
    definition?: HeaderParameterDefinition
  ): ParameterContract[] | undefined {
    if (!definition?.schema.properties) return undefined;

    return Object.entries(definition.schema.properties).map(([name, schema]) => ({
      name,
      type: schema.type,
      required: false,
      description: schema.description
    }));
  }

  private buildRepresentations(
    content: ContentTypeDefinition
  ): RepresentationContract[] {
    return Object.entries(content)
      .filter(([, mediaType]) => mediaType !== undefined)
      .map(([contentType, mediaType]) => ({
        contentType,
        sample: mediaType!.examples ?
          JSON.stringify(Object.values(mediaType!.examples)[0]?.value) : undefined,
        schemaId: this.registerSchema(mediaType!.schema),
        typeName: mediaType!.schema.title
      }));
  }

  private registerSchema(schema: JsonSchema): string | undefined {
    if (!schema.$ref && !schema.type) return undefined;

    // Register schema in API Management
    // Implementation depends on schema registry
    return schema.title;
  }

  private addOperationPolicy(
    operation: IApiOperation,
    policies: OperationPolicies
  ): void {
    const policyDoc = new PolicyDocument();

    if (policies.inbound) {
      for (const policy of policies.inbound) {
        policyDoc.addInbound(policy);
      }
    }

    if (policies.backend) {
      for (const policy of policies.backend) {
        policyDoc.addBackend(policy);
      }
    }

    if (policies.outbound) {
      for (const policy of policies.outbound) {
        policyDoc.addOutbound(policy);
      }
    }

    if (policies.onError) {
      for (const policy of policies.onError) {
        policyDoc.addOnError(policy);
      }
    }

    operation.policy = policyDoc;
  }
}

// RestApiStack properties
export interface RestApiStackProps extends ApiStackBaseProps {
  // Option 1: OpenAPI import
  readonly openApiSpec?: string | OpenApiDefinition;

  // Option 2: Programmatic operations
  readonly operations?: IRestOperation[];

  // Service URL (required for REST)
  readonly serviceUrl?: string;

  // API configuration
  readonly apiName?: string;
  readonly path?: string;
  readonly protocols?: ('http' | 'https')[];
  readonly apiVersion?: string;
  readonly apiVersionSetId?: string;
}
```

## Alternatives Considered

### Alternative 1: DSL-Based API Definition

Create a custom DSL for defining REST APIs:

```typescript
const api = rest()
  .get('/users/:id', (req, res) => userSchema)
  .post('/users', (req, res) => createUserSchema);
```

**Rejected because:**
- Diverges from OpenAPI standard
- Harder to integrate with existing tools
- Less portable
- Reinvents the wheel

### Alternative 2: Code-First Only (No OpenAPI)

Skip OpenAPI support entirely and rely only on programmatic definitions:

**Rejected because:**
- OpenAPI is industry standard
- Many teams have existing OpenAPI specs
- Loses interoperability with OpenAPI ecosystem
- No standard for API documentation

### Alternative 3: Decorator-Based Definitions

Use TypeScript decorators for REST operations:

```typescript
@Controller('/users')
class UserController {
  @Get('/:id')
  @Response(200, UserSchema)
  getUser(@PathParam('id') id: string) {}
}
```

**Rejected because:**
- Requires experimental decorators
- Class-based pattern doesn't align with serverless
- Harder to synthesize to ARM
- More complex type inference

## Consequences

### Positive Consequences

1. **OpenAPI Integration**: Full OpenAPI 3.0/3.1 import and export
2. **Type Safety**: Complete TypeScript type inference throughout
3. **Flexibility**: Both programmatic and declarative API definition
4. **Azure Native**: Seamless integration with Azure backends
5. **Developer Experience**: Fluent API with IntelliSense support
6. **Standards Compliant**: Follows OpenAPI and REST best practices
7. **Validation**: Build-time and runtime validation of API definitions

### Negative Consequences

1. **Complexity**: Large type system with many interfaces
2. **Learning Curve**: Developers need to understand OpenAPI concepts
3. **Bundle Size**: Type definitions increase package size
4. **Validation Overhead**: Schema validation adds synthesis time

### Trade-offs

1. **Type Safety vs Flexibility**: Strict typing over dynamic definitions
2. **Standards vs Simplicity**: OpenAPI compliance over custom DSL
3. **Compile-time vs Runtime**: Build-time validation over runtime discovery
4. **Completeness vs Performance**: Full feature set over minimal implementation

## Success Criteria

1. **Type Coverage**: 100% TypeScript type safety for operations
2. **OpenAPI Compatibility**: Import/export of all OpenAPI 3.0/3.1 features
3. **Developer Velocity**: Create REST API in < 30 lines of code
4. **Validation**: Catch 95%+ of errors at build time
5. **Performance**: < 100ms synthesis time per operation
6. **Documentation**: Complete TSDoc for all public APIs
7. **Adoption**: 80% of new APIs use RestApiStack

## Implementation Roadmap

### Phase 1: Core Interfaces (Week 1)
- Define IRestOperation and related interfaces
- Create RestOperationBuilder with type inference
- Implement basic JsonSchema support
- Add unit tests for type system

### Phase 2: OpenAPI Integration (Week 2)
- Implement OpenApiImporter with validation
- Create OpenApiExporter
- Add $ref resolution
- Support OpenAPI 3.0 and 3.1

### Phase 3: Backend Integration (Week 3)
- Implement BackendManager
- Add Azure Function backend support
- Create App Service backend support
- Implement health checks and circuit breakers

### Phase 4: RestApiStack (Week 4)
- Extend ApiStackBase for REST
- Implement operation registration
- Add policy integration
- Create synthesis logic

### Phase 5: Type Generation (Week 5)
- Build TypeScript generator from OpenAPI
- Add schema validation
- Implement type inference helpers
- Create CLI for codegen

### Phase 6: Testing & Documentation (Week 6)
- Comprehensive integration tests
- Government cloud testing
- Complete documentation
- Migration guides

## Related Decisions

- **ADR-010**: API Stack Architecture - Foundation for RestApiStack
- **ADR-011**: GraphQL Resolver Architecture - Parallel architecture for GraphQL
- **ADR-006**: Azure Functions Architecture - Backend integration pattern

## References

- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [OpenAPI Specification 3.0](https://spec.openapis.org/oas/v3.0.3)
- [Azure API Management REST API](https://docs.microsoft.com/en-us/rest/api/apimanagement/)
- [JSON Schema Specification](https://json-schema.org/specification.html)
- [RFC 7807: Problem Details](https://tools.ietf.org/html/rfc7807)
- [Azure API Management Backend](https://docs.microsoft.com/en-us/azure/api-management/backends)
