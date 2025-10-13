/**
 * OpenAPI Importer
 *
 * Imports OpenAPI 3.0.x and 3.1.0 specifications and converts them to IRestOperation definitions.
 * Supports both YAML and JSON formats, handles $ref resolution, and validates against OpenAPI schema.
 *
 * Features:
 * - Parse YAML and JSON OpenAPI specifications
 * - Validate OpenAPI version (3.0.x and 3.1.0)
 * - Convert OpenAPI operations to IRestOperation
 * - Resolve $ref references (local only for Government cloud safety)
 * - Extract reusable components
 *
 * @see ADR-014 REST API Core Architecture - Section 3: OpenAPI Integration
 * @see docs/design/architecture/openapi-library-evaluation.md - Felix's recommendations
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  isReferenceObject,
  type OpenApiDefinition,
  type OpenApiOperation,
  type OpenApiPathItem,
  type ParameterObject,
  type ReferenceObject,
  type RequestBodyObject,
  type ResponseObject,
  type ResponsesObject,
  type SchemaObject,
  type ValidationResult,
  type ValidationError,
} from './types';
import type {
  IRestOperation,
  HttpMethod,
  PathParameterDefinition,
  QueryParameterDefinition,
  HeaderParameterDefinition,
  RequestBodyDefinition,
  ResponseDefinition,
  ResponseSchema,
  ParameterSchema,
  JsonSchema,
  ContentTypeDefinition,
  MediaTypeSchema,
  EncodingDefinition,
  HeaderDefinition,
} from '../operation';

/**
 * Result of OpenAPI import operation
 */
export interface OpenApiImportResult {
  readonly operations: readonly IRestOperation[];
  readonly info: OpenApiDefinition['info'];
  readonly servers?: OpenApiDefinition['servers'];
  readonly components?: OpenApiDefinition['components'];
  readonly security?: OpenApiDefinition['security'];
}

/**
 * Options for OpenAPI importer
 */
export interface OpenApiImporterOptions {
  /**
   * Validate the OpenAPI spec before importing
   * @default true
   */
  readonly validate?: boolean;

  /**
   * Resolve $ref references
   * @default true
   */
  readonly resolveReferences?: boolean;

  /**
   * Allow external references (HTTP/HTTPS URLs)
   * WARNING: Should be false for Government cloud
   * @default false
   */
  readonly allowExternalReferences?: boolean;

  /**
   * Base path for resolving relative file references
   */
  readonly basePath?: string;

  /**
   * Strict mode - fail on any validation warnings
   * @default false
   */
  readonly strict?: boolean;
}

/**
 * OpenAPI Importer class
 *
 * Loads and converts OpenAPI specifications to IRestOperation definitions
 *
 * @example
 * ```typescript
 * // Import from file
 * const importer = await OpenApiImporter.fromFile('./openapi.yaml');
 * const result = await importer.import();
 *
 * // Import from object
 * const importer2 = OpenApiImporter.fromObject(openapiSpec);
 * const result2 = await importer2.import();
 * ```
 */
export class OpenApiImporter {
  private readonly spec: OpenApiDefinition;
  private readonly options: Required<OpenApiImporterOptions>;
  private readonly validator: Ajv;
  private referenceCache: Map<string, any> = new Map();

  /**
   * Create importer from OpenAPI specification object
   *
   * @param spec - OpenAPI specification object
   * @param options - Importer options
   */
  constructor(spec: OpenApiDefinition, options: OpenApiImporterOptions = {}) {
    this.spec = spec;
    this.options = {
      validate: options.validate ?? true,
      resolveReferences: options.resolveReferences ?? true,
      allowExternalReferences: options.allowExternalReferences ?? false,
      basePath: options.basePath ?? process.cwd(),
      strict: options.strict ?? false,
    };

    // Initialize AJV validator
    this.validator = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true,
    });
    addFormats(this.validator);
  }

  /**
   * Load OpenAPI specification from file
   *
   * Supports both YAML and JSON formats. File extension determines parser.
   *
   * @param filePath - Path to OpenAPI file (.yaml, .yml, or .json)
   * @param options - Importer options
   * @returns OpenApiImporter instance
   *
   * @example
   * ```typescript
   * const importer = await OpenApiImporter.fromFile('./api.yaml');
   * ```
   */
  static async fromFile(
    filePath: string,
    options: OpenApiImporterOptions = {},
  ): Promise<OpenApiImporter> {
    const absolutePath = path.resolve(filePath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    const basePath = path.dirname(absolutePath);

    let spec: OpenApiDefinition;

    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      spec = parseYaml(content) as OpenApiDefinition;
    } else if (filePath.endsWith('.json')) {
      spec = JSON.parse(content) as OpenApiDefinition;
    } else {
      throw new Error(
        `Unsupported file format: ${filePath}. Use .yaml, .yml, or .json`,
      );
    }

    return new OpenApiImporter(spec, {
      ...options,
      basePath: options.basePath ?? basePath,
    });
  }

  /**
   * Create importer from OpenAPI specification object
   *
   * @param spec - OpenAPI specification object or JSON string
   * @param options - Importer options
   * @returns OpenApiImporter instance
   *
   * @example
   * ```typescript
   * const importer = OpenApiImporter.fromObject(openapiJson);
   * ```
   */
  static fromObject(
    spec: OpenApiDefinition | string,
    options: OpenApiImporterOptions = {},
  ): OpenApiImporter {
    const parsedSpec = typeof spec === 'string' ? JSON.parse(spec) : spec;
    return new OpenApiImporter(parsedSpec, options);
  }

  /**
   * Import OpenAPI specification and convert to REST operations
   *
   * @returns Import result with operations and metadata
   * @throws Error if validation fails or spec is invalid
   *
   * @example
   * ```typescript
   * const result = await importer.import();
   * for (const operation of result.operations) {
   *   console.log(operation.method, operation.path);
   * }
   * ```
   */
  async import(): Promise<OpenApiImportResult> {
    // Validate OpenAPI spec if requested
    if (this.options.validate) {
      const validation = this.validate();
      if (!validation.valid) {
        throw new OpenApiValidationError(
          'Invalid OpenAPI specification',
          validation.errors,
        );
      }
    }

    // Convert paths to operations
    const operations: IRestOperation[] = [];

    for (const [pathTemplate, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;

      const pathOperations = await this.convertPathItem(
        pathTemplate,
        pathItem,
      );
      operations.push(...pathOperations);
    }

    // Handle Azure x-ms-paths if present
    if (this.spec['x-ms-paths']) {
      for (const [pathTemplate, pathItem] of Object.entries(
        this.spec['x-ms-paths'],
      )) {
        if (!pathItem) continue;

        const pathOperations = await this.convertPathItem(
          pathTemplate,
          pathItem,
        );
        operations.push(...pathOperations);
      }
    }

    return {
      operations,
      info: this.spec.info,
      servers: this.spec.servers,
      components: this.spec.components,
      security: this.spec.security,
    };
  }

  /**
   * Validate OpenAPI specification
   *
   * @returns Validation result with any errors
   */
  validate(): ValidationResult {
    const errors: ValidationError[] = [];

    // Check OpenAPI version
    if (!this.isValidOpenApiVersion(this.spec.openapi)) {
      errors.push({
        message: `Unsupported OpenAPI version: ${this.spec.openapi}. Supported versions: 3.0.0, 3.0.1, 3.0.2, 3.0.3, 3.1.0`,
        path: '/openapi',
      });
    }

    // Validate required fields
    if (!this.spec.info) {
      errors.push({
        message: 'Missing required field: info',
        path: '/info',
      });
    }

    if (!this.spec.paths) {
      errors.push({
        message: 'Missing required field: paths',
        path: '/paths',
      });
    }

    // Validate operations have responses
    for (const [pathTemplate, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;

      const methods: (keyof OpenApiPathItem)[] = [
        'get',
        'put',
        'post',
        'delete',
        'options',
        'head',
        'patch',
        'trace',
      ];

      for (const method of methods) {
        const operation = pathItem[method] as OpenApiOperation | undefined;
        if (operation && !operation.responses) {
          errors.push({
            message: `Operation ${method.toUpperCase()} ${pathTemplate} missing required field: responses`,
            path: `/paths/${pathTemplate}/${method}/responses`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract components from OpenAPI spec
   *
   * @returns OpenAPI components object
   */
  extractComponents(): OpenApiDefinition['components'] {
    return this.spec.components;
  }

  /**
   * Convert OpenAPI path item to IRestOperation array
   */
  private async convertPathItem(
    pathTemplate: string,
    pathItem: OpenApiPathItem,
  ): Promise<IRestOperation[]> {
    const operations: IRestOperation[] = [];
    const methods: Array<{ key: keyof OpenApiPathItem; method: HttpMethod }> =
      [
        { key: 'get', method: 'GET' },
        { key: 'put', method: 'PUT' },
        { key: 'post', method: 'POST' },
        { key: 'delete', method: 'DELETE' },
        { key: 'options', method: 'OPTIONS' },
        { key: 'head', method: 'HEAD' },
        { key: 'patch', method: 'PATCH' },
        { key: 'trace', method: 'TRACE' },
      ];

    for (const { key, method } of methods) {
      const operation = pathItem[key] as OpenApiOperation | undefined;
      if (!operation) continue;

      const convertedOperation = await this.convertOperation(
        method,
        pathTemplate,
        operation,
        pathItem,
      );
      operations.push(convertedOperation);
    }

    return operations;
  }

  /**
   * Convert OpenAPI operation to IRestOperation
   */
  private async convertOperation(
    method: HttpMethod,
    pathTemplate: string,
    operation: OpenApiOperation,
    pathItem: OpenApiPathItem,
  ): Promise<IRestOperation> {
    // Merge path-level and operation-level parameters
    const allParameters = [
      ...(pathItem.parameters || []),
      ...(operation.parameters || []),
    ];

    // Resolve references in parameters
    const resolvedParameters = await Promise.all(
      allParameters.map((param) => this.resolveReference(param)),
    );

    return {
      method,
      path: pathTemplate,
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags,
      pathParameters: await this.extractPathParameters(resolvedParameters),
      queryParameters: await this.extractQueryParameters(resolvedParameters),
      headerParameters: await this.extractHeaderParameters(resolvedParameters),
      requestBody: operation.requestBody
        ? await this.convertRequestBody(operation.requestBody)
        : undefined,
      responses: await this.convertResponses(operation.responses),
      security: operation.security,
      deprecated: operation.deprecated,
      servers: operation.servers || pathItem.servers || this.spec.servers,
    };
  }

  /**
   * Extract path parameters from parameter list
   */
  private async extractPathParameters(
    parameters: ParameterObject[],
  ): Promise<PathParameterDefinition | undefined> {
    const pathParams = parameters.filter((p) => p.in === 'path');
    if (pathParams.length === 0) return undefined;

    const properties: Record<string, ParameterSchema> = {};
    const required: string[] = [];

    for (const param of pathParams) {
      const schema = await this.convertToParameterSchema(param.schema);
      properties[param.name] = {
        ...schema,
        description: param.description || schema.description,
      };
      if (param.required) {
        required.push(param.name);
      }
    }

    return {
      schema: {
        type: 'object',
        properties,
        required,
      },
    };
  }

  /**
   * Extract query parameters from parameter list
   */
  private async extractQueryParameters(
    parameters: ParameterObject[],
  ): Promise<QueryParameterDefinition | undefined> {
    const queryParams = parameters.filter((p) => p.in === 'query');
    if (queryParams.length === 0) return undefined;

    const properties: Record<string, ParameterSchema> = {};
    const required: string[] = [];

    for (const param of queryParams) {
      const schema = await this.convertToParameterSchema(param.schema);
      properties[param.name] = {
        ...schema,
        description: param.description || schema.description,
      };
      if (param.required) {
        required.push(param.name);
      }
    }

    return {
      schema: {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      },
      required: required.length > 0,
    };
  }

  /**
   * Extract header parameters from parameter list
   */
  private async extractHeaderParameters(
    parameters: ParameterObject[],
  ): Promise<HeaderParameterDefinition | undefined> {
    const headerParams = parameters.filter((p) => p.in === 'header');
    if (headerParams.length === 0) return undefined;

    const properties: Record<string, ParameterSchema> = {};

    for (const param of headerParams) {
      const schema = await this.convertToParameterSchema(param.schema);
      properties[param.name] = {
        ...schema,
        description: param.description || schema.description,
      };
    }

    return {
      schema: {
        type: 'object',
        properties,
      },
    };
  }

  /**
   * Convert OpenAPI schema to ParameterSchema
   */
  private async convertToParameterSchema(
    schema: SchemaObject | ReferenceObject | undefined,
  ): Promise<ParameterSchema> {
    if (!schema) {
      return { type: 'string' };
    }

    const resolved = await this.resolveReference(schema);

    return {
      type: resolved.type || 'string',
      format: resolved.format,
      enum: resolved.enum,
      default: resolved.default,
      minimum: resolved.minimum,
      maximum: resolved.maximum,
      minLength: resolved.minLength,
      maxLength: resolved.maxLength,
      pattern: resolved.pattern,
      items: resolved.items
        ? await this.convertToParameterSchema(resolved.items)
        : undefined,
      properties: resolved.properties
        ? await this.convertPropertiesMap(resolved.properties)
        : undefined,
      required: resolved.required,
      nullable: resolved.nullable,
      description: resolved.description,
    } as ParameterSchema;
  }

  /**
   * Convert properties map recursively
   */
  private async convertPropertiesMap(
    properties: Record<string, SchemaObject | ReferenceObject>,
  ): Promise<Record<string, ParameterSchema>> {
    const result: Record<string, ParameterSchema> = {};

    for (const [key, value] of Object.entries(properties)) {
      result[key] = await this.convertToParameterSchema(value);
    }

    return result;
  }

  /**
   * Convert OpenAPI request body to RequestBodyDefinition
   */
  private async convertRequestBody(
    requestBody: RequestBodyObject | ReferenceObject,
  ): Promise<RequestBodyDefinition> {
    const resolved = await this.resolveReference(requestBody);
    const contentEntries: Array<[string, MediaTypeSchema]> = [];

    for (const [mediaType, mediaTypeObject] of Object.entries(
      resolved.content,
    )) {
      const schema = mediaTypeObject.schema
        ? await this.convertToJsonSchema(mediaTypeObject.schema)
        : undefined;

      contentEntries.push([
        mediaType,
        {
          schema: schema!,
          examples: mediaTypeObject.examples,
          encoding: mediaTypeObject.encoding as Record<string, EncodingDefinition> | undefined,
        },
      ]);
    }

    return {
      description: resolved.description,
      required: resolved.required,
      content: Object.fromEntries(contentEntries) as ContentTypeDefinition,
    };
  }

  /**
   * Convert OpenAPI schema to JsonSchema
   */
  private async convertToJsonSchema(
    schema: SchemaObject | ReferenceObject,
  ): Promise<JsonSchema> {
    const resolved = await this.resolveReference(schema);

    return {
      type: resolved.type,
      format: resolved.format,
      title: resolved.title,
      description: resolved.description,
      default: resolved.default,
      multipleOf: resolved.multipleOf,
      maximum: resolved.maximum,
      exclusiveMaximum:
        typeof resolved.exclusiveMaximum === 'boolean'
          ? resolved.exclusiveMaximum
          : undefined,
      minimum: resolved.minimum,
      exclusiveMinimum:
        typeof resolved.exclusiveMinimum === 'boolean'
          ? resolved.exclusiveMinimum
          : undefined,
      maxLength: resolved.maxLength,
      minLength: resolved.minLength,
      pattern: resolved.pattern,
      maxItems: resolved.maxItems,
      minItems: resolved.minItems,
      uniqueItems: resolved.uniqueItems,
      maxProperties: resolved.maxProperties,
      minProperties: resolved.minProperties,
      required: resolved.required,
      enum: resolved.enum,
      properties: resolved.properties
        ? await this.convertJsonSchemaPropertiesMap(resolved.properties)
        : undefined,
      additionalProperties:
        typeof resolved.additionalProperties === 'boolean'
          ? resolved.additionalProperties
          : resolved.additionalProperties
            ? await this.convertToJsonSchema(resolved.additionalProperties)
            : undefined,
      items: resolved.items
        ? await this.convertToJsonSchema(resolved.items)
        : undefined,
      oneOf: resolved.oneOf
        ? await Promise.all(resolved.oneOf.map((s) => this.convertToJsonSchema(s)))
        : undefined,
      anyOf: resolved.anyOf
        ? await Promise.all(resolved.anyOf.map((s) => this.convertToJsonSchema(s)))
        : undefined,
      allOf: resolved.allOf
        ? await Promise.all(resolved.allOf.map((s) => this.convertToJsonSchema(s)))
        : undefined,
      not: resolved.not
        ? await this.convertToJsonSchema(resolved.not)
        : undefined,
      nullable: resolved.nullable,
      discriminator: resolved.discriminator,
      readOnly: resolved.readOnly,
      writeOnly: resolved.writeOnly,
      xml: resolved.xml,
      externalDocs: resolved.externalDocs,
      example: resolved.example,
      deprecated: resolved.deprecated,
      $ref: isReferenceObject(schema) ? schema.$ref : undefined,
    };
  }

  /**
   * Convert JSON Schema properties map recursively
   */
  private async convertJsonSchemaPropertiesMap(
    properties: Record<string, SchemaObject | ReferenceObject>,
  ): Promise<Record<string, JsonSchema>> {
    const result: Record<string, JsonSchema> = {};

    for (const [key, value] of Object.entries(properties)) {
      result[key] = await this.convertToJsonSchema(value);
    }

    return result;
  }

  /**
   * Convert OpenAPI responses to ResponseDefinition
   */
  private async convertResponses(
    responses: ResponsesObject,
  ): Promise<ResponseDefinition> {
    const convertedEntries: Array<[string | number, ResponseSchema]> = [];

    for (const [statusCode, response] of Object.entries(responses)) {
      if (!response) continue;

      const resolved = await this.resolveReference(response);
      const contentEntries: Array<[string, MediaTypeSchema]> = [];

      if (resolved.content) {
        for (const [mediaType, mediaTypeObject] of Object.entries(
          resolved.content,
        )) {
          const schema = mediaTypeObject.schema
            ? await this.convertToJsonSchema(mediaTypeObject.schema)
            : undefined;

          contentEntries.push([
            mediaType,
            {
              schema: schema!,
              examples: mediaTypeObject.examples,
            },
          ]);
        }
      }

      const responseSchema: ResponseSchema = {
        description: resolved.description,
        content: contentEntries.length > 0 ? (Object.fromEntries(contentEntries) as ContentTypeDefinition) : undefined,
        headers: resolved.headers as Record<string, HeaderDefinition> | undefined,
        links: resolved.links,
      };

      if (statusCode === 'default') {
        convertedEntries.push(['default', responseSchema]);
      } else {
        const code = parseInt(statusCode, 10);
        if (!isNaN(code)) {
          convertedEntries.push([code, responseSchema]);
        }
      }
    }

    return Object.fromEntries(convertedEntries) as ResponseDefinition;
  }

  /**
   * Resolve $ref reference
   *
   * For Government cloud safety, only local references are supported by default.
   * External HTTP/HTTPS references require explicit opt-in.
   */
  private async resolveReference<T>(item: T | ReferenceObject): Promise<T> {
    if (!isReferenceObject(item)) {
      return item as T;
    }

    const ref = item.$ref;

    // Check cache first
    if (this.referenceCache.has(ref)) {
      return this.referenceCache.get(ref) as T;
    }

    // Handle external references
    if (ref.startsWith('http://') || ref.startsWith('https://')) {
      if (!this.options.allowExternalReferences) {
        throw new Error(
          `External references are disabled for Government cloud safety: ${ref}`,
        );
      }
      throw new Error(`HTTP/HTTPS reference resolution not implemented: ${ref}`);
    }

    // Handle file references
    if (ref.startsWith('file://')) {
      throw new Error(`File reference resolution not implemented: ${ref}`);
    }

    // Handle local references (#/components/schemas/User)
    if (ref.startsWith('#/')) {
      const parts = ref.substring(2).split('/');
      let resolved: any = this.spec;

      for (const part of parts) {
        if (resolved === undefined || resolved === null) {
          throw new Error(`Invalid reference: ${ref}`);
        }
        resolved = resolved[part];
      }

      // Cache and return
      this.referenceCache.set(ref, resolved);
      return resolved as T;
    }

    throw new Error(`Unsupported reference format: ${ref}`);
  }

  /**
   * Check if OpenAPI version is valid
   */
  private isValidOpenApiVersion(version: string): boolean {
    return ['3.0.0', '3.0.1', '3.0.2', '3.0.3', '3.1.0'].includes(version);
  }
}

/**
 * OpenAPI validation error
 */
export class OpenApiValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: readonly ValidationError[],
  ) {
    super(message);
    this.name = 'OpenApiValidationError';
  }
}
