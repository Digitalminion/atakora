/**
 * OpenAPI Exporter
 *
 * Exports IRestOperation definitions to OpenAPI 3.0.3 or 3.1.0 specifications.
 * Supports both YAML and JSON output formats.
 *
 * Features:
 * - Convert IRestOperation to OpenAPI operations
 * - Generate OpenAPI paths, components, schemas
 * - Support both YAML and JSON output
 * - Include Azure extensions where appropriate
 * - Component extraction and deduplication
 *
 * @see ADR-014 REST API Core Architecture - Section 3: OpenAPI Integration
 * @see docs/design/architecture/openapi-library-evaluation.md - Felix's recommendations
 */

import * as fs from 'fs/promises';
import { stringify as stringifyYaml } from 'yaml';
import type {
  OpenApiDefinition,
  OpenApiInfo,
  OpenApiOperation,
  OpenApiPathItem,
  OpenApiPaths,
  OpenApiComponents,
  OpenApiServer,
  OpenApiVersion,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  ResponsesObject,
  SchemaObject,
  MediaTypeObject,
} from './types';
import type {
  IRestOperation,
  PathParameterDefinition,
  QueryParameterDefinition,
  HeaderParameterDefinition,
  RequestBodyDefinition,
  ResponseDefinition,
  ParameterSchema,
  JsonSchema,
  ContentTypeDefinition,
  MediaTypeSchema,
} from '../operation';

/**
 * Options for OpenAPI exporter
 */
export interface OpenApiExporterOptions {
  /**
   * OpenAPI version to export
   * @default '3.0.3'
   */
  readonly version?: OpenApiVersion;

  /**
   * Extract schemas to components/schemas
   * @default true
   */
  readonly extractComponents?: boolean;

  /**
   * Include Azure x-ms-* extensions
   * @default true
   */
  readonly includeAzureExtensions?: boolean;

  /**
   * Pretty print JSON output
   * @default true
   */
  readonly prettyPrint?: boolean;

  /**
   * YAML indentation
   * @default 2
   */
  readonly yamlIndent?: number;
}

/**
 * OpenAPI Exporter class
 *
 * Converts IRestOperation definitions to OpenAPI specifications
 *
 * @example
 * ```typescript
 * const exporter = new OpenApiExporter(operations, {
 *   title: 'My API',
 *   version: '1.0.0'
 * });
 *
 * // Export to OpenAPI object
 * const spec = exporter.export();
 *
 * // Export to YAML string
 * const yaml = exporter.toYaml();
 *
 * // Write to file
 * await exporter.writeToFile('./openapi.yaml', 'yaml');
 * ```
 */
export class OpenApiExporter {
  private readonly operations: readonly IRestOperation[];
  private readonly info: OpenApiInfo;
  private readonly options: Required<OpenApiExporterOptions>;
  private readonly servers?: readonly OpenApiServer[];
  private components: OpenApiComponents = {
    schemas: {},
    responses: {},
    parameters: {},
    requestBodies: {},
    headers: {},
    securitySchemes: {},
  };
  private schemaNameCounter: Map<string, number> = new Map();

  /**
   * Create OpenAPI exporter
   *
   * @param operations - REST operations to export
   * @param info - OpenAPI info object
   * @param servers - Optional server configurations
   * @param options - Exporter options
   */
  constructor(
    operations: readonly IRestOperation[],
    info: OpenApiInfo,
    servers?: readonly OpenApiServer[],
    options: OpenApiExporterOptions = {},
  ) {
    this.operations = operations;
    this.info = info;
    this.servers = servers;
    this.options = {
      version: options.version ?? '3.0.3',
      extractComponents: options.extractComponents ?? true,
      includeAzureExtensions: options.includeAzureExtensions ?? true,
      prettyPrint: options.prettyPrint ?? true,
      yamlIndent: options.yamlIndent ?? 2,
    };
  }

  /**
   * Export to OpenAPI specification object
   *
   * @returns OpenAPI specification
   *
   * @example
   * ```typescript
   * const spec = exporter.export();
   * ```
   */
  export(): OpenApiDefinition {
    // Use mutable object during construction
    const paths: Record<string, OpenApiPathItem> = {};

    // Group operations by path
    const operationsByPath = this.groupOperationsByPath();

    // Convert each path
    for (const [path, operations] of operationsByPath) {
      paths[path] = this.buildPathItem(operations);
    }

    return {
      openapi: this.options.version,
      info: this.info,
      servers: this.servers,
      paths: paths as OpenApiPaths,
      components:
        this.options.extractComponents &&
        Object.keys(this.components.schemas || {}).length > 0
          ? this.components
          : undefined,
    };
  }

  /**
   * Export to JSON string
   *
   * @returns JSON representation of OpenAPI spec
   *
   * @example
   * ```typescript
   * const json = exporter.toJson();
   * ```
   */
  toJson(): string {
    const spec = this.export();
    return this.options.prettyPrint
      ? JSON.stringify(spec, null, 2)
      : JSON.stringify(spec);
  }

  /**
   * Export to YAML string
   *
   * @returns YAML representation of OpenAPI spec
   *
   * @example
   * ```typescript
   * const yaml = exporter.toYaml();
   * ```
   */
  toYaml(): string {
    const spec = this.export();
    return stringifyYaml(spec, {
      indent: this.options.yamlIndent,
      lineWidth: 120,
      defaultStringType: 'QUOTE_DOUBLE',
    });
  }

  /**
   * Write OpenAPI spec to file
   *
   * @param filePath - Output file path
   * @param format - Output format ('yaml' or 'json')
   *
   * @example
   * ```typescript
   * await exporter.writeToFile('./openapi.yaml', 'yaml');
   * ```
   */
  async writeToFile(
    filePath: string,
    format: 'yaml' | 'json' = 'yaml',
  ): Promise<void> {
    const content = format === 'yaml' ? this.toYaml() : this.toJson();
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Group operations by path template
   */
  private groupOperationsByPath(): Map<string, IRestOperation[]> {
    const grouped = new Map<string, IRestOperation[]>();

    for (const operation of this.operations) {
      const existing = grouped.get(operation.path) || [];
      existing.push(operation);
      grouped.set(operation.path, existing);
    }

    return grouped;
  }

  /**
   * Build OpenAPI path item from operations
   */
  private buildPathItem(operations: IRestOperation[]): OpenApiPathItem {
    // Use mutable structure for construction
    type MutablePathItem = {
      -readonly [K in keyof OpenApiPathItem]: OpenApiPathItem[K];
    };

    const pathItem: Partial<MutablePathItem> = {};

    // Extract path-level parameters if common across all operations
    const commonParameters = this.extractCommonParameters(operations);
    if (commonParameters.length > 0) {
      pathItem.parameters = commonParameters;
    }

    // Add each operation
    for (const operation of operations) {
      const method = operation.method.toLowerCase() as keyof OpenApiPathItem;
      if (method === 'get' || method === 'put' || method === 'post' ||
          method === 'delete' || method === 'options' || method === 'head' ||
          method === 'patch' || method === 'trace') {
        pathItem[method] = this.buildOperation(operation);
      }
    }

    return pathItem as OpenApiPathItem;
  }

  /**
   * Extract parameters common to all operations on a path
   */
  private extractCommonParameters(
    operations: IRestOperation[],
  ): ParameterObject[] {
    // For simplicity, we don't extract common parameters yet
    // Could be enhanced to detect common path/header parameters
    return [];
  }

  /**
   * Build OpenAPI operation from IRestOperation
   */
  private buildOperation(operation: IRestOperation): OpenApiOperation {
    return {
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags,
      externalDocs: operation.externalDocs,
      parameters: this.buildParameters(operation),
      requestBody: operation.requestBody
        ? this.buildRequestBody(operation.requestBody)
        : undefined,
      responses: this.buildResponses(operation.responses),
      deprecated: operation.deprecated,
      security: operation.security,
      servers: operation.servers,
    };
  }

  /**
   * Build parameters array from operation
   */
  private buildParameters(
    operation: IRestOperation,
  ): ParameterObject[] | undefined {
    const parameters: ParameterObject[] = [];

    // Path parameters
    if (operation.pathParameters) {
      parameters.push(...this.buildPathParameters(operation.pathParameters));
    }

    // Query parameters
    if (operation.queryParameters) {
      parameters.push(...this.buildQueryParameters(operation.queryParameters));
    }

    // Header parameters
    if (operation.headerParameters) {
      parameters.push(
        ...this.buildHeaderParameters(operation.headerParameters),
      );
    }

    return parameters.length > 0 ? parameters : undefined;
  }

  /**
   * Build path parameters
   */
  private buildPathParameters(
    definition: PathParameterDefinition,
  ): ParameterObject[] {
    const parameters: ParameterObject[] = [];
    const properties = definition.schema.properties || {};

    for (const [name, schema] of Object.entries(properties)) {
      parameters.push({
        name,
        in: 'path',
        required: true,
        description: schema.description || definition.description,
        schema: this.convertParameterSchemaToOpenApi(schema),
        style: definition.style,
        explode: definition.explode,
      });
    }

    return parameters;
  }

  /**
   * Build query parameters
   */
  private buildQueryParameters(
    definition: QueryParameterDefinition,
  ): ParameterObject[] {
    const parameters: ParameterObject[] = [];
    const properties = definition.schema.properties || {};
    const required = definition.schema.required || [];

    for (const [name, schema] of Object.entries(properties)) {
      parameters.push({
        name,
        in: 'query',
        required: required.includes(name),
        description: schema.description || definition.description,
        deprecated: definition.deprecated,
        allowEmptyValue: definition.allowEmptyValue,
        schema: this.convertParameterSchemaToOpenApi(schema),
        style: definition.style,
        explode: definition.explode,
      });
    }

    return parameters;
  }

  /**
   * Build header parameters
   */
  private buildHeaderParameters(
    definition: HeaderParameterDefinition,
  ): ParameterObject[] {
    const parameters: ParameterObject[] = [];
    const properties = definition.schema.properties || {};

    for (const [name, schema] of Object.entries(properties)) {
      parameters.push({
        name,
        in: 'header',
        required: definition.required || false,
        description: schema.description || definition.description,
        deprecated: definition.deprecated,
        schema: this.convertParameterSchemaToOpenApi(schema),
      });
    }

    return parameters;
  }

  /**
   * Convert ParameterSchema to OpenAPI SchemaObject
   */
  private convertParameterSchemaToOpenApi(
    schema: ParameterSchema,
  ): SchemaObject {
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
      items: schema.items
        ? this.convertParameterSchemaToOpenApi(schema.items)
        : undefined,
      properties: schema.properties
        ? this.convertParameterPropertiesMap(schema.properties)
        : undefined,
      required: schema.required,
      nullable: schema.nullable,
      description: schema.description,
    };
  }

  /**
   * Convert parameter properties map
   */
  private convertParameterPropertiesMap(
    properties: Record<string, ParameterSchema>,
  ): Record<string, SchemaObject> {
    const result: Record<string, SchemaObject> = {};

    for (const [key, value] of Object.entries(properties)) {
      result[key] = this.convertParameterSchemaToOpenApi(value);
    }

    return result;
  }

  /**
   * Build request body from definition
   */
  private buildRequestBody(
    definition: RequestBodyDefinition,
  ): RequestBodyObject {
    const content: Record<string, MediaTypeObject> = {};

    for (const [mediaType, mediaTypeSchema] of Object.entries(
      definition.content,
    )) {
      if (!mediaTypeSchema) continue;

      content[mediaType] = this.buildMediaTypeObject(mediaTypeSchema);
    }

    return {
      description: definition.description,
      required: definition.required,
      content,
    };
  }

  /**
   * Build media type object
   */
  private buildMediaTypeObject(
    mediaTypeSchema: MediaTypeSchema,
  ): MediaTypeObject {
    return {
      schema: this.convertJsonSchemaToOpenApi(mediaTypeSchema.schema),
      examples: mediaTypeSchema.examples,
      // Cast encoding - types are compatible, just readonly differences
      encoding: mediaTypeSchema.encoding as MediaTypeObject['encoding'],
    };
  }

  /**
   * Convert JsonSchema to OpenAPI SchemaObject
   */
  private convertJsonSchemaToOpenApi(schema: JsonSchema): SchemaObject {
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
      properties: schema.properties
        ? this.convertJsonSchemaPropertiesMap(schema.properties)
        : undefined,
      additionalProperties:
        typeof schema.additionalProperties === 'boolean'
          ? schema.additionalProperties
          : schema.additionalProperties
            ? this.convertJsonSchemaToOpenApi(schema.additionalProperties)
            : undefined,
      items: schema.items
        ? this.convertJsonSchemaToOpenApi(schema.items)
        : undefined,
      oneOf: schema.oneOf?.map((s) => this.convertJsonSchemaToOpenApi(s)),
      anyOf: schema.anyOf?.map((s) => this.convertJsonSchemaToOpenApi(s)),
      allOf: schema.allOf?.map((s) => this.convertJsonSchemaToOpenApi(s)),
      not: schema.not ? this.convertJsonSchemaToOpenApi(schema.not) : undefined,
      nullable: schema.nullable,
      discriminator: schema.discriminator,
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly,
      xml: schema.xml,
      externalDocs: schema.externalDocs,
      example: schema.example,
      deprecated: schema.deprecated,
    };
  }

  /**
   * Convert JSON Schema properties map
   */
  private convertJsonSchemaPropertiesMap(
    properties: Record<string, JsonSchema>,
  ): Record<string, SchemaObject> {
    const result: Record<string, SchemaObject> = {};

    for (const [key, value] of Object.entries(properties)) {
      result[key] = this.convertJsonSchemaToOpenApi(value);
    }

    return result;
  }

  /**
   * Build responses object from ResponseDefinition
   */
  private buildResponses(definition: ResponseDefinition): ResponsesObject {
    // Use mutable structure for construction
    const responses: Record<string, ResponseObject> = {};

    for (const [statusCode, response] of Object.entries(definition)) {
      if (!response) continue;

      const content: Record<string, MediaTypeObject> = {};

      if (response.content) {
        for (const [mediaType, mediaTypeSchema] of Object.entries(
          response.content,
        )) {
          // Type narrowing: mediaTypeSchema could be undefined from the index signature
          if (!mediaTypeSchema) continue;
          // Type assertion: after the check, we know mediaTypeSchema is not undefined
          const schema = mediaTypeSchema as MediaTypeSchema;
          if (!schema.schema) continue;

          content[mediaType] = this.buildMediaTypeObject(schema);
        }
      }

      const responseObject: ResponseObject = {
        description: response.description,
        content: Object.keys(content).length > 0 ? content : undefined,
        headers: response.headers,
        links: response.links,
      };

      responses[statusCode] = responseObject;
    }

    return responses as ResponsesObject;
  }

  /**
   * Generate unique schema name for component extraction
   */
  private generateSchemaName(baseName: string): string {
    const count = this.schemaNameCounter.get(baseName) || 0;
    this.schemaNameCounter.set(baseName, count + 1);

    return count === 0 ? baseName : `${baseName}${count}`;
  }
}
