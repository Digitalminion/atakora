/**
 * Schema-to-OpenAPI Mapper Type Definitions
 *
 * This module provides type definitions for mapping component schema definitions
 * to OpenAPI 3.0 specifications. These mappers transform field types, models, and
 * validation rules into OpenAPI-compliant schema objects and path operations.
 *
 * @module @atakora/component/synthesis/schema-mapper-types
 */

import type {
  OpenAPISpec,
  SchemaObject as OpenAPISchemaObject,
  PathsObject,
  PathItemObject,
  OperationObject,
  ParameterObject,
  RequestBodyObject,
  ResponsesObject,
  ComponentsObject,
} from './openapi-types';
import type { UnifiedFieldDefinition } from '../schema/unified-types';

// ============================================================================
// Field Type Mapping
// ============================================================================

/**
 * Mapping configuration from component field types to OpenAPI types and formats.
 *
 * @remarks
 * Defines how each component field type translates to OpenAPI schema properties.
 * This ensures consistent transformation across the codebase.
 *
 * Mapping Table:
 *
 * | Component Field       | OpenAPI Type | OpenAPI Format  | Notes                           |
 * |-----------------------|--------------|-----------------|----------------------------------|
 * | `a.string()`          | string       | -               | Basic string type               |
 * | `a.string().email()`  | string       | email           | Email validation                |
 * | `a.string().url()`    | string       | uri             | URL/URI validation              |
 * | `a.string().uuid()`   | string       | uuid            | UUID format                     |
 * | `a.id()`              | string       | uuid            | Auto-generated UUID             |
 * | `a.number()`          | number       | double          | Floating-point number           |
 * | `a.number().integer()`| integer      | int32           | 32-bit integer                  |
 * | `a.boolean()`         | boolean      | -               | True/false values               |
 * | `a.datetime()`        | string       | date-time       | ISO 8601 timestamp              |
 * | `a.array(type)`       | array        | -               | Array with items schema         |
 * | `a.object(schema)`    | object       | -               | Nested object with properties   |
 * | `a.ref('Model')`      | string       | uuid            | Reference to model ID           |
 * | `a.enum([...])`       | string       | -               | String with enum values         |
 * | `a.binary()`          | string       | binary          | Binary/file data                |
 * | `a.json()`            | object       | -               | Unstructured JSON               |
 *
 * @example
 * ```typescript
 * const mapping: FieldTypeMapping = {
 *   componentType: 'string',
 *   openApiType: 'string',
 *   openApiFormat: 'email'
 * };
 * ```
 */
export interface FieldTypeMapping {
  /**
   * Component field type
   *
   * @example 'string', 'number', 'boolean', 'array', 'object'
   */
  readonly componentType: string;

  /**
   * OpenAPI type
   *
   * @example 'string', 'number', 'integer', 'boolean', 'array', 'object'
   */
  readonly openApiType: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

  /**
   * OpenAPI format (optional)
   *
   * @example 'email', 'uuid', 'date-time', 'uri', 'binary', 'int32', 'int64', 'double'
   */
  readonly openApiFormat?: string;

  /**
   * Additional notes about the mapping
   */
  readonly notes?: string;
}

// ============================================================================
// Constraint Mapping
// ============================================================================

/**
 * Mapping configuration from component validation constraints to OpenAPI properties.
 *
 * @remarks
 * Defines how validation rules translate to OpenAPI schema constraints.
 *
 * Constraint Mapping Table:
 *
 * | Component Constraint      | OpenAPI Property       | Example                          |
 * |---------------------------|------------------------|----------------------------------|
 * | `.required()`             | Add to required array  | required: ['email', 'name']      |
 * | `.min(n)` (number)        | minimum: n             | minimum: 0                       |
 * | `.max(n)` (number)        | maximum: n             | maximum: 150                     |
 * | `.minLength(n)`           | minLength: n           | minLength: 3                     |
 * | `.maxLength(n)`           | maxLength: n           | maxLength: 100                   |
 * | `.pattern(regex)`         | pattern: regex         | pattern: "^[A-Z]{3}-\\d{4}$"     |
 * | `.enum([...])`            | enum: [...]            | enum: ['pending', 'active']      |
 * | `.minItems(n)`            | minItems: n            | minItems: 1                      |
 * | `.maxItems(n)`            | maxItems: n            | maxItems: 10                     |
 * | `.unique()`               | uniqueItems: true      | uniqueItems: true                |
 * | `.integer()`              | type: 'integer'        | type: 'integer'                  |
 * | `.positive()`             | minimum: 0             | minimum: 0, exclusiveMinimum: 0  |
 *
 * @example
 * ```typescript
 * const mapping: ConstraintMapping = {
 *   constraintType: 'minLength',
 *   openApiProperty: 'minLength',
 *   transformValue: (value) => value
 * };
 * ```
 */
export interface ConstraintMapping {
  /**
   * Component constraint type
   *
   * @example 'minLength', 'maxLength', 'min', 'max', 'pattern', 'enum'
   */
  readonly constraintType: string;

  /**
   * OpenAPI property name
   *
   * @example 'minLength', 'maxLength', 'minimum', 'maximum', 'pattern', 'enum'
   */
  readonly openApiProperty: string;

  /**
   * Optional value transformation function
   *
   * @remarks
   * Some constraints may need transformation before being applied to OpenAPI.
   * For example, converting RegExp to string pattern.
   *
   * @param value - The constraint value from the component definition
   * @returns The transformed value for OpenAPI
   */
  transformValue?: (value: any) => any;
}

// ============================================================================
// Component Schema Definition
// ============================================================================

/**
 * Represents a single component schema for the OpenAPI components section.
 *
 * @remarks
 * This is the result of mapping a component model to an OpenAPI schema object.
 * Each model becomes a reusable schema component in the OpenAPI spec.
 *
 * @example
 * ```typescript
 * const userSchema: ComponentSchemaDefinition = {
 *   name: 'User',
 *   schema: {
 *     type: 'object',
 *     required: ['id', 'email', 'name'],
 *     properties: {
 *       id: { type: 'string', format: 'uuid' },
 *       email: { type: 'string', format: 'email' },
 *       name: { type: 'string' },
 *       age: { type: 'integer', minimum: 0, maximum: 150 }
 *     }
 *   }
 * };
 * ```
 */
export interface ComponentSchemaDefinition {
  /**
   * Name of the schema component (typically the model name)
   *
   * @example 'User', 'Project', 'Task'
   */
  readonly name: string;

  /**
   * OpenAPI schema object defining the component structure
   *
   * @remarks
   * This schema can be referenced via $ref in request/response bodies.
   */
  readonly schema: OpenAPISchemaObject;

  /**
   * Optional description for the schema
   *
   * @example 'User profile information and credentials'
   */
  readonly description?: string;
}

// ============================================================================
// Field Mapper Interface
// ============================================================================

/**
 * Interface for mapping component field definitions to OpenAPI schema objects.
 *
 * @remarks
 * The FieldMapper provides specialized methods for each field type, ensuring
 * accurate transformation of validation rules and constraints to OpenAPI format.
 *
 * @example
 * ```typescript
 * class DefaultFieldMapper implements FieldMapper {
 *   mapStringField(field: UnifiedFieldDefinition): OpenAPISchemaObject {
 *     const schema: OpenAPISchemaObject = {
 *       type: 'string',
 *       ...(field.minLength && { minLength: field.minLength }),
 *       ...(field.maxLength && { maxLength: field.maxLength }),
 *       ...(field.pattern && { pattern: field.pattern.source }),
 *       ...(field.format && { format: field.format }),
 *     };
 *     return schema;
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface FieldMapper {
  /**
   * Map a string field to OpenAPI schema
   *
   * @remarks
   * Handles string validation constraints including:
   * - Length constraints (minLength, maxLength)
   * - Pattern matching (regex)
   * - Format validation (email, url, uuid, phone)
   *
   * @param field - Unified field definition for a string field
   * @returns OpenAPI schema object for the string field
   *
   * @example
   * ```typescript
   * // Input: a.string().email().minLength(3).maxLength(100)
   * // Output:
   * {
   *   type: 'string',
   *   format: 'email',
   *   minLength: 3,
   *   maxLength: 100
   * }
   * ```
   */
  mapStringField(field: UnifiedFieldDefinition): OpenAPISchemaObject;

  /**
   * Map a number field to OpenAPI schema
   *
   * @remarks
   * Handles number validation constraints including:
   * - Value constraints (minimum, maximum)
   * - Integer type enforcement
   * - Positive/negative constraints
   *
   * @param field - Unified field definition for a number field
   * @returns OpenAPI schema object for the number field
   *
   * @example
   * ```typescript
   * // Input: a.number().min(0).max(150).integer()
   * // Output:
   * {
   *   type: 'integer',
   *   minimum: 0,
   *   maximum: 150
   * }
   * ```
   */
  mapNumberField(field: UnifiedFieldDefinition): OpenAPISchemaObject;

  /**
   * Map a boolean field to OpenAPI schema
   *
   * @param field - Unified field definition for a boolean field
   * @returns OpenAPI schema object for the boolean field
   *
   * @example
   * ```typescript
   * // Input: a.boolean().default(true)
   * // Output:
   * {
   *   type: 'boolean',
   *   default: true
   * }
   * ```
   */
  mapBooleanField(field: UnifiedFieldDefinition): OpenAPISchemaObject;

  /**
   * Map an array field to OpenAPI schema
   *
   * @remarks
   * Handles array validation constraints including:
   * - Item type definition (recursive mapping)
   * - Size constraints (minItems, maxItems)
   * - Uniqueness enforcement
   *
   * @param field - Unified field definition for an array field
   * @returns OpenAPI schema object for the array field
   *
   * @example
   * ```typescript
   * // Input: a.array(a.string().email()).minItems(1).maxItems(5)
   * // Output:
   * {
   *   type: 'array',
   *   items: { type: 'string', format: 'email' },
   *   minItems: 1,
   *   maxItems: 5
   * }
   * ```
   */
  mapArrayField(field: UnifiedFieldDefinition): OpenAPISchemaObject;

  /**
   * Map an object field to OpenAPI schema
   *
   * @remarks
   * Handles nested object schemas with recursive field mapping.
   * Each property in the object schema is mapped individually.
   *
   * @param field - Unified field definition for an object field
   * @returns OpenAPI schema object for the object field
   *
   * @example
   * ```typescript
   * // Input: a.object({ street: a.string().required(), city: a.string().required() })
   * // Output:
   * {
   *   type: 'object',
   *   required: ['street', 'city'],
   *   properties: {
   *     street: { type: 'string' },
   *     city: { type: 'string' }
   *   }
   * }
   * ```
   */
  mapObjectField(field: UnifiedFieldDefinition): OpenAPISchemaObject;

  /**
   * Map a reference field to OpenAPI schema
   *
   * @remarks
   * Reference fields can be mapped as either:
   * - Direct string/UUID fields (the referenced ID)
   * - $ref pointers to component schemas
   *
   * @param field - Unified field definition for a reference field
   * @returns OpenAPI schema object for the reference field
   *
   * @example
   * ```typescript
   * // Input: a.ref('User')
   * // Output (as ID):
   * { type: 'string', format: 'uuid' }
   * // Or (as reference):
   * { $ref: '#/components/schemas/User' }
   * ```
   */
  mapRefField(field: UnifiedFieldDefinition): OpenAPISchemaObject;

  /**
   * Map an enum field to OpenAPI schema
   *
   * @param field - Unified field definition for an enum field
   * @returns OpenAPI schema object for the enum field
   *
   * @example
   * ```typescript
   * // Input: a.enum(['pending', 'active', 'archived']).default('pending')
   * // Output:
   * {
   *   type: 'string',
   *   enum: ['pending', 'active', 'archived'],
   *   default: 'pending'
   * }
   * ```
   */
  mapEnumField(field: UnifiedFieldDefinition): OpenAPISchemaObject;

  /**
   * Map a datetime field to OpenAPI schema
   *
   * @param field - Unified field definition for a datetime field
   * @returns OpenAPI schema object for the datetime field
   *
   * @example
   * ```typescript
   * // Input: a.datetime().required()
   * // Output:
   * {
   *   type: 'string',
   *   format: 'date-time'
   * }
   * ```
   */
  mapDateTimeField(field: UnifiedFieldDefinition): OpenAPISchemaObject;

  /**
   * Map a binary field to OpenAPI schema
   *
   * @remarks
   * Binary fields represent file uploads and binary data.
   *
   * @param field - Unified field definition for a binary field
   * @returns OpenAPI schema object for the binary field
   *
   * @example
   * ```typescript
   * // Input: a.binary().maxSize(10485760)
   * // Output:
   * {
   *   type: 'string',
   *   format: 'binary'
   * }
   * ```
   */
  mapBinaryField(field: UnifiedFieldDefinition): OpenAPISchemaObject;

  /**
   * Map a generic field to OpenAPI schema
   *
   * @remarks
   * Fallback method for fields that don't match specific types.
   * Dispatches to appropriate type-specific method based on field type.
   *
   * @param fieldName - Name of the field
   * @param field - Unified field definition
   * @returns OpenAPI schema object for the field
   */
  mapField(fieldName: string, field: UnifiedFieldDefinition): OpenAPISchemaObject;
}

// ============================================================================
// Model Mapper Interface
// ============================================================================

/**
 * Interface for mapping component models to OpenAPI component schemas.
 *
 * @remarks
 * The ModelMapper handles the transformation of entire models (collections of fields)
 * into OpenAPI schema components. This includes extracting required fields,
 * mapping all properties, and generating proper schema structure.
 *
 * @example
 * ```typescript
 * class DefaultModelMapper implements ModelMapper {
 *   generateComponentSchema(modelName: string, model: any): ComponentSchemaDefinition {
 *     const required = this.extractRequiredFields(model);
 *     const properties = this.extractProperties(model);
 *
 *     return {
 *       name: modelName,
 *       schema: {
 *         type: 'object',
 *         required,
 *         properties
 *       }
 *     };
 *   }
 * }
 * ```
 */
export interface ModelMapper {
  /**
   * Generate OpenAPI component schema from a model definition
   *
   * @remarks
   * Transforms a complete model into a reusable OpenAPI component schema.
   * The generated schema can be referenced in paths using $ref.
   *
   * @param modelName - Name of the model
   * @param model - Model definition with fields
   * @returns Component schema definition ready for OpenAPI components section
   *
   * @example
   * ```typescript
   * const userModel = c.model({
   *   id: a.id(),
   *   email: a.string().email().required(),
   *   name: a.string().required(),
   *   age: a.number().min(0).max(150)
   * });
   *
   * const schema = modelMapper.generateComponentSchema('User', userModel);
   * // Result:
   * {
   *   name: 'User',
   *   schema: {
   *     type: 'object',
   *     required: ['id', 'email', 'name'],
   *     properties: {
   *       id: { type: 'string', format: 'uuid' },
   *       email: { type: 'string', format: 'email' },
   *       name: { type: 'string' },
   *       age: { type: 'integer', minimum: 0, maximum: 150 }
   *     }
   *   }
   * }
   * ```
   */
  generateComponentSchema(modelName: string, model: any): ComponentSchemaDefinition;

  /**
   * Extract required field names from a model
   *
   * @remarks
   * Identifies fields marked as required in the model definition.
   * These field names populate the OpenAPI `required` array.
   *
   * @param model - Model definition with fields
   * @returns Array of required field names
   *
   * @example
   * ```typescript
   * const model = c.model({
   *   id: a.id(),
   *   email: a.string().required(),
   *   name: a.string().required(),
   *   bio: a.string().optional()
   * });
   *
   * const required = modelMapper.extractRequiredFields(model);
   * // Result: ['id', 'email', 'name']
   * ```
   */
  extractRequiredFields(model: any): string[];

  /**
   * Extract and map properties from a model
   *
   * @remarks
   * Maps all fields in a model to their OpenAPI schema representations.
   * Uses the FieldMapper to transform individual fields.
   *
   * @param model - Model definition with fields
   * @returns Record of property names to OpenAPI schema objects
   *
   * @example
   * ```typescript
   * const model = c.model({
   *   id: a.id(),
   *   email: a.string().email().required(),
   *   age: a.number().min(0).max(150)
   * });
   *
   * const properties = modelMapper.extractProperties(model);
   * // Result:
   * {
   *   id: { type: 'string', format: 'uuid' },
   *   email: { type: 'string', format: 'email' },
   *   age: { type: 'integer', minimum: 0, maximum: 150 }
   * }
   * ```
   */
  extractProperties(model: any): Record<string, OpenAPISchemaObject>;
}

// ============================================================================
// Path Generator Interface
// ============================================================================

/**
 * Interface for generating OpenAPI path operations from models.
 *
 * @remarks
 * The PathGenerator creates RESTful API path definitions for CRUD models.
 * For each model, it generates standard operations (list, get, create, update, delete)
 * with appropriate request/response schemas.
 *
 * @example
 * ```typescript
 * class DefaultPathGenerator implements PathGenerator {
 *   generatePaths(modelName: string): PathsObject {
 *     return {
 *       [`/${modelName.toLowerCase()}s`]: {
 *         get: this.generateListOperation(modelName),
 *         post: this.generateCreateOperation(modelName)
 *       },
 *       [`/${modelName.toLowerCase()}s/{id}`]: {
 *         get: this.generateGetOperation(modelName),
 *         put: this.generateUpdateOperation(modelName),
 *         delete: this.generateDeleteOperation(modelName)
 *       }
 *     };
 *   }
 * }
 * ```
 */
export interface PathGenerator {
  /**
   * Generate all API paths for a model
   *
   * @remarks
   * Creates RESTful paths for standard CRUD operations:
   * - `GET /models` - List all instances
   * - `POST /models` - Create new instance
   * - `GET /models/{id}` - Get single instance
   * - `PUT /models/{id}` - Update instance
   * - `DELETE /models/{id}` - Delete instance
   *
   * @param modelName - Name of the model
   * @returns Complete paths object for the model
   *
   * @example
   * ```typescript
   * const paths = pathGenerator.generatePaths('User');
   * // Result:
   * {
   *   '/users': {
   *     get: { ... list operation ... },
   *     post: { ... create operation ... }
   *   },
   *   '/users/{id}': {
   *     get: { ... get operation ... },
   *     put: { ... update operation ... },
   *     delete: { ... delete operation ... }
   *   }
   * }
   * ```
   */
  generatePaths(modelName: string): PathsObject;

  /**
   * Generate list operation (GET /models)
   *
   * @remarks
   * Creates an operation for listing all model instances with pagination support.
   *
   * @param modelName - Name of the model
   * @returns OpenAPI operation object for listing
   *
   * @example
   * ```typescript
   * const operation = pathGenerator.generateListOperation('User');
   * // Result:
   * {
   *   summary: 'List users',
   *   operationId: 'listUsers',
   *   parameters: [
   *     { name: 'limit', in: 'query', schema: { type: 'integer' } },
   *     { name: 'offset', in: 'query', schema: { type: 'integer' } }
   *   ],
   *   responses: {
   *     '200': {
   *       description: 'List of users',
   *       content: {
   *         'application/json': {
   *           schema: {
   *             type: 'array',
   *             items: { $ref: '#/components/schemas/User' }
   *           }
   *         }
   *       }
   *     }
   *   }
   * }
   * ```
   */
  generateListOperation(modelName: string): OperationObject;

  /**
   * Generate get operation (GET /models/{id})
   *
   * @remarks
   * Creates an operation for retrieving a single model instance by ID.
   *
   * @param modelName - Name of the model
   * @returns OpenAPI operation object for getting a single instance
   *
   * @example
   * ```typescript
   * const operation = pathGenerator.generateGetOperation('User');
   * // Result:
   * {
   *   summary: 'Get user by ID',
   *   operationId: 'getUserById',
   *   parameters: [
   *     { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
   *   ],
   *   responses: {
   *     '200': {
   *       description: 'User details',
   *       content: {
   *         'application/json': {
   *           schema: { $ref: '#/components/schemas/User' }
   *         }
   *       }
   *     },
   *     '404': { description: 'User not found' }
   *   }
   * }
   * ```
   */
  generateGetOperation(modelName: string): OperationObject;

  /**
   * Generate create operation (POST /models)
   *
   * @remarks
   * Creates an operation for creating a new model instance.
   *
   * @param modelName - Name of the model
   * @returns OpenAPI operation object for creating
   *
   * @example
   * ```typescript
   * const operation = pathGenerator.generateCreateOperation('User');
   * // Result:
   * {
   *   summary: 'Create user',
   *   operationId: 'createUser',
   *   requestBody: {
   *     required: true,
   *     content: {
   *       'application/json': {
   *         schema: { $ref: '#/components/schemas/User' }
   *       }
   *     }
   *   },
   *   responses: {
   *     '201': {
   *       description: 'User created',
   *       content: {
   *         'application/json': {
   *           schema: { $ref: '#/components/schemas/User' }
   *         }
   *       }
   *     }
   *   }
   * }
   * ```
   */
  generateCreateOperation(modelName: string): OperationObject;

  /**
   * Generate update operation (PUT /models/{id})
   *
   * @remarks
   * Creates an operation for updating an existing model instance.
   *
   * @param modelName - Name of the model
   * @returns OpenAPI operation object for updating
   *
   * @example
   * ```typescript
   * const operation = pathGenerator.generateUpdateOperation('User');
   * // Result:
   * {
   *   summary: 'Update user',
   *   operationId: 'updateUser',
   *   parameters: [
   *     { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
   *   ],
   *   requestBody: {
   *     required: true,
   *     content: {
   *       'application/json': {
   *         schema: { $ref: '#/components/schemas/User' }
   *       }
   *     }
   *   },
   *   responses: {
   *     '200': {
   *       description: 'User updated',
   *       content: {
   *         'application/json': {
   *           schema: { $ref: '#/components/schemas/User' }
   *         }
   *       }
   *     },
   *     '404': { description: 'User not found' }
   *   }
   * }
   * ```
   */
  generateUpdateOperation(modelName: string): OperationObject;

  /**
   * Generate delete operation (DELETE /models/{id})
   *
   * @remarks
   * Creates an operation for deleting a model instance.
   *
   * @param modelName - Name of the model
   * @returns OpenAPI operation object for deleting
   *
   * @example
   * ```typescript
   * const operation = pathGenerator.generateDeleteOperation('User');
   * // Result:
   * {
   *   summary: 'Delete user',
   *   operationId: 'deleteUser',
   *   parameters: [
   *     { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
   *   ],
   *   responses: {
   *     '204': { description: 'User deleted' },
   *     '404': { description: 'User not found' }
   *   }
   * }
   * ```
   */
  generateDeleteOperation(modelName: string): OperationObject;
}

// ============================================================================
// Schema-to-OpenAPI Mapper Interface
// ============================================================================

/**
 * Main interface for transforming component schemas to OpenAPI specifications.
 *
 * @remarks
 * The SchemaToOpenApiMapper orchestrates the complete transformation process,
 * coordinating FieldMapper, ModelMapper, and PathGenerator to produce a
 * complete OpenAPI specification from a component schema definition.
 *
 * @example
 * ```typescript
 * const schema = defineSchema({
 *   schema: a.schema({
 *     User: c.model({
 *       id: a.id(),
 *       email: a.string().email().required(),
 *       name: a.string().required()
 *     })
 *   })
 * });
 *
 * const mapper = new DefaultSchemaToOpenApiMapper();
 * const openApiSpec = mapper.mapSchema(schema);
 *
 * // Result: Complete OpenAPI 3.0 specification with:
 * // - Component schemas for all models
 * // - RESTful paths for CRUD operations
 * // - Request/response schemas
 * // - Validation constraints
 * ```
 */
export interface SchemaToOpenApiMapper {
  /**
   * Transform a complete component schema to OpenAPI specification
   *
   * @remarks
   * Orchestrates the full transformation process:
   * 1. Map all models to component schemas
   * 2. Generate API paths for CRUD models
   * 3. Create request/response schemas
   * 4. Apply validation constraints
   * 5. Assemble complete OpenAPI spec
   *
   * @param schema - Component schema object
   * @returns Complete OpenAPI 3.0 specification
   *
   * @example
   * ```typescript
   * const openApiSpec = mapper.mapSchema(schema);
   * // Result:
   * {
   *   openapi: '3.0.3',
   *   info: {
   *     title: 'My App API',
   *     version: '1.0.0'
   *   },
   *   paths: {
   *     '/users': { ... },
   *     '/users/{id}': { ... }
   *   },
   *   components: {
   *     schemas: {
   *       User: {
   *         type: 'object',
   *         required: ['id', 'email', 'name'],
   *         properties: { ... }
   *       }
   *     }
   *   }
   * }
   * ```
   */
  mapSchema(schema: any): OpenAPISpec;

  /**
   * Map a single model to OpenAPI component schema
   *
   * @remarks
   * Transforms a model definition into a reusable OpenAPI schema component.
   * This schema can be referenced in paths using $ref.
   *
   * @param modelName - Name of the model
   * @param modelDefinition - Model definition with fields
   * @returns OpenAPI schema object for the model
   *
   * @example
   * ```typescript
   * const userModel = c.model({
   *   id: a.id(),
   *   email: a.string().email().required()
   * });
   *
   * const schema = mapper.mapModel('User', userModel);
   * // Result:
   * {
   *   type: 'object',
   *   required: ['id', 'email'],
   *   properties: {
   *     id: { type: 'string', format: 'uuid' },
   *     email: { type: 'string', format: 'email' }
   *   }
   * }
   * ```
   */
  mapModel(modelName: string, modelDefinition: any): OpenAPISchemaObject;

  /**
   * Map a single field to OpenAPI schema
   *
   * @remarks
   * Transforms a field definition into an OpenAPI schema object,
   * including all validation constraints.
   *
   * @param fieldName - Name of the field
   * @param fieldDefinition - Field definition with type and validation
   * @returns OpenAPI schema object for the field
   *
   * @example
   * ```typescript
   * const emailField = a.string().email().required().maxLength(100);
   *
   * const schema = mapper.mapField('email', emailField);
   * // Result:
   * {
   *   type: 'string',
   *   format: 'email',
   *   maxLength: 100
   * }
   * ```
   */
  mapField(fieldName: string, fieldDefinition: any): OpenAPISchemaObject;
}
