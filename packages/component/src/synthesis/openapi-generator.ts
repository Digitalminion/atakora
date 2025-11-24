/**
 * OpenAPI 3.0 Specification Generator
 *
 * Generates complete OpenAPI 3.0 specifications from component schema definitions.
 * Transforms field types, models, and validation rules into OpenAPI-compliant
 * schema objects and RESTful path operations.
 *
 * @module @atakora/component/synthesis/openapi-generator
 *
 * @remarks
 * The generator implements the SchemaToOpenApiMapper interface and provides:
 * - Complete OpenAPI 3.0.3 specification generation
 * - RESTful CRUD operations (GET, POST, PUT, DELETE) for all models
 * - Component schemas with full validation constraints
 * - Type-safe field mapping from component types to OpenAPI types
 * - Reusable input/output schemas for create and update operations
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { OpenApiGenerator } from '@atakora/component/synthesis';
 * import { defineSchema } from '@atakora/component/schema';
 *
 * const schema = defineSchema({
 *   User: a.model({
 *     id: a.id(),
 *     email: a.string().email().required(),
 *     name: a.string().required(),
 *     age: a.number().min(0).max(150)
 *   })
 * });
 *
 * const generator = new OpenApiGenerator();
 * const openApiSpec = generator.mapSchema(schema);
 *
 * console.log(openApiSpec.paths['/users']);        // List and create operations
 * console.log(openApiSpec.paths['/users/{id}']);  // Get, update, delete operations
 * console.log(openApiSpec.components.schemas);    // User, CreateUserInput, UpdateUserInput
 * ```
 */

import type {
  OpenAPISpec,
  PathsObject,
  PathItemObject,
  OperationObject,
  ComponentsObject,
  SchemaObject as OpenAPISchemaObject,
  ParameterObject,
  ResponsesObject,
} from './openapi-types';
import type { SchemaToOpenApiMapper } from './schema-mapper-types';
import { SchemaIntrospector, type ModelInfo, type FieldInfo as BaseFieldInfo } from './schema-introspection';
import { pluralize } from './pluralization';

/**
 * Enhanced field information for OpenAPI generation
 */
interface FieldInfo {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly constraints?: Readonly<Record<string, any>>;
  readonly refModelName?: string;
  readonly itemType?: string | FieldInfo;
  readonly format?: string;
  readonly description?: string;
  readonly default?: any;
  readonly nestedFields?: FieldInfo[];
  readonly refModel?: string;
}

/**
 * Generator for OpenAPI 3.0 specifications from component schemas.
 *
 * @remarks
 * The OpenApiGenerator transforms component schema definitions into complete
 * OpenAPI 3.0.3 specifications with:
 * - Info section with API metadata
 * - Paths for all CRUD operations (list, get, create, update, delete)
 * - Component schemas for models and input types
 * - Full validation constraint mapping
 *
 * The generator follows RESTful conventions:
 * - Collection endpoints: GET /users, POST /users
 * - Item endpoints: GET /users/{id}, PUT /users/{id}, DELETE /users/{id}
 *
 * @implements {SchemaToOpenApiMapper}
 */
export class OpenApiGenerator implements SchemaToOpenApiMapper {
  private readonly introspector: SchemaIntrospector;

  constructor() {
    this.introspector = new SchemaIntrospector();
  }

  /**
   * Generate complete OpenAPI specification from schema.
   *
   * @remarks
   * Orchestrates the full transformation process:
   * 1. Extract CRUD models from schema using introspector
   * 2. Generate RESTful paths for each model
   * 3. Generate component schemas for models and input types
   * 4. Assemble complete OpenAPI 3.0.3 specification
   *
   * @param schema - Schema object containing model definitions
   * @returns Complete OpenAPI 3.0.3 specification
   *
   * @example
   * ```typescript
   * const schema = defineSchema({
   *   User: a.model({ ... }),
   *   Project: a.model({ ... })
   * });
   *
   * const spec = generator.mapSchema(schema);
   * // Result:
   * {
   *   openapi: '3.0.3',
   *   info: { title: 'API', version: '1.0.0' },
   *   paths: { '/users': {...}, '/users/{id}': {...}, '/projects': {...}, ... },
   *   components: { schemas: { User, CreateUserInput, UpdateUserInput, ... } }
   * }
   * ```
   */
  mapSchema(schema: any): OpenAPISpec {
    const crudModels = this.introspector.getCrudModels(schema);

    return {
      openapi: '3.0.3',
      info: {
        title: `${schema._metadata?.name || 'API'} API`,
        version: schema._metadata?.version || '1.0.0',
        description:
          schema._metadata?.description ||
          `Auto-generated API specification for ${schema._metadata?.name || 'application'}`,
      },
      paths: this.generatePaths(crudModels),
      components: this.generateComponents(crudModels),
    };
  }

  /**
   * Generate paths for all CRUD models.
   *
   * @remarks
   * Creates RESTful paths for each model with standard CRUD operations:
   * - Collection path (e.g., /users): GET (list), POST (create)
   * - Item path (e.g., /users/{id}): GET (get), PUT (update), DELETE (delete)
   *
   * Model names are automatically pluralized for path generation.
   *
   * @param models - Array of model information
   * @returns OpenAPI paths object with all operations
   */
  private generatePaths(models: readonly ModelInfo[]): PathsObject {
    const paths: Record<string, PathItemObject> = {};

    for (const model of models) {
      const pluralName = pluralize(model.name);
      const basePath = `/${pluralName.toLowerCase()}`;
      const itemPath = `${basePath}/{id}`;

      // Collection operations (/users)
      paths[basePath] = {
        get: this.generateListOperation(model),
        post: this.generateCreateOperation(model),
      };

      // Item operations (/users/{id})
      paths[itemPath] = {
        get: this.generateGetOperation(model),
        put: this.generateUpdateOperation(model),
        delete: this.generateDeleteOperation(model),
      };
    }

    return paths as PathsObject;
  }

  /**
   * Generate LIST operation (GET /users).
   *
   * @remarks
   * Creates an operation for listing all model instances with pagination support.
   * Includes query parameters for limit and offset.
   *
   * @param model - Model information
   * @returns OpenAPI operation object for listing
   */
  private generateListOperation(model: ModelInfo): OperationObject {
    const pluralName = pluralize(model.name);

    return {
      operationId: `list${pluralName}`,
      summary: `List all ${pluralName.toLowerCase()}`,
      description: `Retrieve a paginated list of ${pluralName.toLowerCase()}`,
      tags: [model.name],
      parameters: [
        {
          name: 'limit',
          in: 'query',
          description: 'Maximum number of items to return',
          schema: { type: 'integer', default: 100, minimum: 1, maximum: 1000 },
        },
        {
          name: 'offset',
          in: 'query',
          description: 'Number of items to skip',
          schema: { type: 'integer', default: 0, minimum: 0 },
        },
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: { $ref: `#/components/schemas/${model.name}` },
                  },
                  hasMore: {
                    type: 'boolean',
                    description: 'Whether more items are available',
                  },
                  total: {
                    type: 'integer',
                    description: 'Total number of items',
                  },
                },
                required: ['items'],
              },
            },
          },
        },
        '400': {
          description: 'Bad request - invalid query parameters',
        },
        '500': {
          description: 'Internal server error',
        },
      },
    };
  }

  /**
   * Generate CREATE operation (POST /users).
   *
   * @remarks
   * Creates an operation for creating a new model instance.
   * Uses a CreateXInput schema that omits system fields like id and timestamps.
   *
   * @param model - Model information
   * @returns OpenAPI operation object for creating
   */
  private generateCreateOperation(model: ModelInfo): OperationObject {
    return {
      operationId: `create${model.name}`,
      summary: `Create a new ${model.name.toLowerCase()}`,
      description: `Create a new ${model.name.toLowerCase()} instance`,
      tags: [model.name],
      requestBody: {
        required: true,
        description: `${model.name} data for creation`,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/Create${model.name}Input` },
          },
        },
      },
      responses: {
        '201': {
          description: 'Created successfully',
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${model.name}` },
            },
          },
        },
        '400': {
          description: 'Bad request - validation failed',
        },
        '500': {
          description: 'Internal server error',
        },
      },
    };
  }

  /**
   * Generate GET operation (GET /users/{id}).
   *
   * @remarks
   * Creates an operation for retrieving a single model instance by ID.
   * Includes 404 response for non-existent resources.
   *
   * @param model - Model information
   * @returns OpenAPI operation object for getting a single instance
   */
  private generateGetOperation(model: ModelInfo): OperationObject {
    return {
      operationId: `get${model.name}`,
      summary: `Get a ${model.name.toLowerCase()} by ID`,
      description: `Retrieve a single ${model.name.toLowerCase()} by its unique identifier`,
      tags: [model.name],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: `Unique identifier of the ${model.name.toLowerCase()}`,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${model.name}` },
            },
          },
        },
        '404': {
          description: `${model.name} not found`,
        },
        '500': {
          description: 'Internal server error',
        },
      },
    };
  }

  /**
   * Generate UPDATE operation (PUT /users/{id}).
   *
   * @remarks
   * Creates an operation for updating an existing model instance.
   * Uses an UpdateXInput schema where all fields are optional.
   *
   * @param model - Model information
   * @returns OpenAPI operation object for updating
   */
  private generateUpdateOperation(model: ModelInfo): OperationObject {
    return {
      operationId: `update${model.name}`,
      summary: `Update a ${model.name.toLowerCase()}`,
      description: `Update an existing ${model.name.toLowerCase()} instance`,
      tags: [model.name],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: `Unique identifier of the ${model.name.toLowerCase()}`,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: true,
        description: `Updated ${model.name.toLowerCase()} data`,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/Update${model.name}Input` },
          },
        },
      },
      responses: {
        '200': {
          description: 'Updated successfully',
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${model.name}` },
            },
          },
        },
        '400': {
          description: 'Bad request - validation failed',
        },
        '404': {
          description: `${model.name} not found`,
        },
        '500': {
          description: 'Internal server error',
        },
      },
    };
  }

  /**
   * Generate DELETE operation (DELETE /users/{id}).
   *
   * @remarks
   * Creates an operation for deleting a model instance.
   * Returns 204 No Content on successful deletion.
   *
   * @param model - Model information
   * @returns OpenAPI operation object for deleting
   */
  private generateDeleteOperation(model: ModelInfo): OperationObject {
    return {
      operationId: `delete${model.name}`,
      summary: `Delete a ${model.name.toLowerCase()}`,
      description: `Delete an existing ${model.name.toLowerCase()} instance`,
      tags: [model.name],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: `Unique identifier of the ${model.name.toLowerCase()}`,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '204': {
          description: 'Deleted successfully',
        },
        '404': {
          description: `${model.name} not found`,
        },
        '500': {
          description: 'Internal server error',
        },
      },
    };
  }

  /**
   * Generate components section with schemas.
   *
   * @remarks
   * Creates reusable component schemas for:
   * - Main model schema (all fields)
   * - CreateXInput schema (omits id, timestamps)
   * - UpdateXInput schema (all fields optional)
   *
   * @param models - Array of model information
   * @returns OpenAPI components object with all schemas
   */
  private generateComponents(models: readonly ModelInfo[]): ComponentsObject {
    const schemas: Record<string, OpenAPISchemaObject> = {};

    for (const model of models) {
      // Main model schema
      schemas[model.name] = this.mapModel(model.name, model as any);

      // Create input schema
      schemas[`Create${model.name}Input`] = this.generateCreateInputSchema(model as any);

      // Update input schema
      schemas[`Update${model.name}Input`] = this.generateUpdateInputSchema(model as any);
    }

    return { schemas };
  }

  /**
   * Map model to OpenAPI schema.
   *
   * @remarks
   * Transforms a complete model definition into an OpenAPI schema object.
   * Maps all fields with their types, formats, and validation constraints.
   *
   * @param modelName - Name of the model
   * @param model - Model information with fields
   * @returns OpenAPI schema object for the model
   */
  mapModel(modelName: string, model: { fields: readonly FieldInfo[] }): OpenAPISchemaObject {
    const properties: Record<string, OpenAPISchemaObject> = {};
    const required: string[] = [];

    for (const field of model.fields) {
      properties[field.name] = this.mapField(field.name, field);

      if (field.required) {
        required.push(field.name);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * Map field to OpenAPI schema.
   *
   * @remarks
   * Transforms a field definition into an OpenAPI schema object.
   * Handles all field types and applies validation constraints:
   * - String fields: minLength, maxLength, pattern, format
   * - Number fields: minimum, maximum, integer type
   * - Array fields: items, minItems, maxItems, uniqueItems
   * - Object fields: nested properties
   * - Enum fields: enum values
   * - Ref fields: UUID format
   *
   * @param fieldName - Name of the field
   * @param field - Field information
   * @returns OpenAPI schema object for the field
   */
  mapField(fieldName: string, field: FieldInfo): OpenAPISchemaObject {
    // Map field type to OpenAPI type and format
    const typeMapping: Record<string, { type: string; format?: string }> = {
      string: { type: 'string' },
      email: { type: 'string', format: 'email' },
      url: { type: 'string', format: 'uri' },
      uuid: { type: 'string', format: 'uuid' },
      id: { type: 'string', format: 'uuid' },
      number: { type: 'number', format: 'double' },
      integer: { type: 'integer', format: 'int32' },
      boolean: { type: 'boolean' },
      date: { type: 'string', format: 'date' },
      datetime: { type: 'string', format: 'date-time' },
      binary: { type: 'string', format: 'binary' },
      json: { type: 'object' },
    };

    let mapping = typeMapping[field.type] || { type: 'string' };

    // Check if number field is integer type
    if (field.type === 'number' && field.constraints?.integer) {
      mapping = { type: 'integer', format: 'int32' };
    }

    // Override format if explicitly specified
    if (field.format) {
      mapping = { ...mapping, format: field.format };
    }

    // Handle array fields
    if (field.type === 'array') {
      let items: OpenAPISchemaObject;
      if (field.itemType) {
        if (typeof field.itemType === 'string') {
          // itemType is a string like 'string', 'number', etc.
          items = { type: field.itemType as any };
        } else {
          // itemType is a FieldInfo object
          items = this.mapField('item', field.itemType);
        }
      } else {
        items = { type: 'string' as const };
      }

      return {
        type: 'array' as const,
        description: field.description,
        items,
        ...(field.constraints?.minItems !== undefined && { minItems: field.constraints.minItems }),
        ...(field.constraints?.maxItems !== undefined && { maxItems: field.constraints.maxItems }),
        ...(field.constraints?.unique !== undefined && { uniqueItems: field.constraints.unique }),
      };
    }

    // Handle object fields
    if (field.type === 'object') {
      if (field.nestedFields && field.nestedFields.length > 0) {
        const properties: Record<string, OpenAPISchemaObject> = {};
        const required: string[] = [];

        for (const nestedField of field.nestedFields) {
          properties[nestedField.name] = this.mapField(nestedField.name, nestedField);
          if (nestedField.required) {
            required.push(nestedField.name);
          }
        }

        return {
          type: 'object' as const,
          description: field.description,
          properties,
          ...(required.length > 0 && { required }),
        };
      }

      return {
        type: 'object' as const,
        description: field.description,
      };
    }

    // Handle enum fields
    if (field.type === 'enum') {
      const enumValues = field.constraints?.enum || field.constraints?.values;
      return {
        type: 'string',
        description: field.description,
        ...(enumValues && { enum: enumValues }),
        ...(field.default !== undefined && { default: field.default }),
      };
    }

    // Handle ref fields
    if (field.type === 'ref') {
      return {
        type: 'string',
        format: 'uuid',
        description: field.description || `Reference to ${field.refModel || 'related model'}`,
      };
    }

    // Basic field with type and format
    return {
      type: mapping.type as any,
      ...(mapping.format && { format: mapping.format }),
      ...(field.description && { description: field.description }),
      ...(field.default !== undefined && { default: field.default }),
      ...(field.constraints?.min !== undefined && { minimum: field.constraints.min }),
      ...(field.constraints?.max !== undefined && { maximum: field.constraints.max }),
      ...(field.constraints?.minLength !== undefined && { minLength: field.constraints.minLength }),
      ...(field.constraints?.maxLength !== undefined && { maxLength: field.constraints.maxLength }),
      ...(field.constraints?.pattern && { pattern: field.constraints.pattern }),
      ...(field.constraints?.enum && { enum: field.constraints.enum }),
    };
  }

  /**
   * Generate Create input schema (omits id, timestamps).
   *
   * @remarks
   * Creates an input schema for POST operations that excludes:
   * - id (generated by system)
   * - createdAt (generated by system)
   * - updatedAt (generated by system)
   *
   * All required fields remain required in the input schema.
   *
   * @param model - Model with fields
   * @returns OpenAPI schema object for create input
   */
  private generateCreateInputSchema(model: { name: string; fields: readonly FieldInfo[] }): OpenAPISchemaObject {
    const excludedFields = new Set(['id', 'createdAt', 'updatedAt']);
    const properties: Record<string, OpenAPISchemaObject> = {};
    const required: string[] = [];

    for (const field of model.fields) {
      if (excludedFields.has(field.name)) continue;

      properties[field.name] = this.mapField(field.name, field);

      if (field.required) {
        required.push(field.name);
      }
    }

    return {
      type: 'object',
      description: `Input data for creating a new ${model.name}`,
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * Generate Update input schema (all fields optional).
   *
   * @remarks
   * Creates an input schema for PUT operations where:
   * - id is excluded (specified in path parameter)
   * - All fields are optional (partial update)
   * - System fields like timestamps are excluded
   *
   * @param model - Model with fields
   * @returns OpenAPI schema object for update input
   */
  private generateUpdateInputSchema(model: { name: string; fields: readonly FieldInfo[] }): OpenAPISchemaObject {
    const excludedFields = new Set(['id', 'createdAt', 'updatedAt']);
    const properties: Record<string, OpenAPISchemaObject> = {};

    for (const field of model.fields) {
      if (excludedFields.has(field.name)) continue;

      properties[field.name] = this.mapField(field.name, field);
    }

    return {
      type: 'object',
      description: `Input data for updating an existing ${model.name}`,
      properties,
      // No required fields - all are optional for partial updates
    };
  }
}

/**
 * Convenience function to generate OpenAPI spec from schema.
 *
 * @remarks
 * Creates a generator instance and produces an OpenAPI specification.
 * This is the recommended way to generate OpenAPI specs for one-off operations.
 *
 * @param schema - Schema object containing model definitions
 * @returns Complete OpenAPI 3.0.3 specification
 *
 * @example
 * ```typescript
 * import { generateOpenApiSpec } from '@atakora/component/synthesis';
 *
 * const schema = defineSchema({ ... });
 * const spec = generateOpenApiSpec(schema);
 *
 * // Write to file
 * import fs from 'fs';
 * fs.writeFileSync('./openapi.json', JSON.stringify(spec, null, 2));
 * ```
 */
export function generateOpenApiSpec(schema: any): OpenAPISpec {
  const generator = new OpenApiGenerator();
  return generator.mapSchema(schema);
}
