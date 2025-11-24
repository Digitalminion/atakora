/**
 * Model Type Extractors
 *
 * @remarks
 * Utility functions for extracting TypeScript type information from schema models.
 * These enable type-safe code generation and validation during the synthesis process.
 *
 * This module provides utilities to:
 * - Extract TypeScript types from field definitions
 * - Generate TypeScript interface strings from models
 * - Create input types for CRUD operations (Create, Update)
 * - Extract metadata about model structure
 *
 * @module @atakora/component/synthesis/type-extraction
 *
 * @example
 * Basic type extraction:
 * ```typescript
 * import { getTypeScriptType, generateInterface } from './type-extraction';
 *
 * // Extract TypeScript type from field type
 * const tsType = getTypeScriptType('string'); // 'string'
 * const numType = getTypeScriptType('number'); // 'number'
 *
 * // Generate interface from model
 * const model = { name: 'User', fields: [...] };
 * const interfaceCode = generateInterface(model);
 * ```
 */

import type { ModelInfo } from './types';
import type { UnifiedFieldDefinition } from '../schema/unified-types';

/**
 * Extended field information for type extraction
 *
 * @remarks
 * Provides additional context about fields beyond the basic ModelInfo
 * structure, including validation rules and metadata.
 */
export interface FieldInfo {
  /**
   * Field name
   */
  name: string;

  /**
   * Field type identifier (string, number, boolean, etc.)
   */
  type: string;

  /**
   * Whether the field is required
   */
  required: boolean;

  /**
   * Field definition with full metadata
   */
  definition?: UnifiedFieldDefinition;
}

/**
 * Type mapping from schema field types to TypeScript types
 *
 * @remarks
 * Defines the default TypeScript type for each schema field type.
 * Can be extended for custom field types or overridden per-field.
 */
const TYPE_MAP: Record<string, string> = {
  // String types
  string: 'string',
  email: 'string',
  url: 'string',
  uuid: 'string',
  phone: 'string',

  // Numeric types
  number: 'number',
  integer: 'number',

  // Boolean type
  boolean: 'boolean',

  // Date/time types
  date: 'string', // ISO 8601 date string (YYYY-MM-DD)
  datetime: 'string', // ISO 8601 datetime string

  // Special types
  id: 'string', // UUID or generated ID
  binary: 'Buffer', // Binary data
  json: 'any', // Arbitrary JSON (can be refined to Record<string, any>)

  // Complex types
  array: 'any[]', // Will be refined by array item type
  object: 'Record<string, any>', // Structured object
  ref: 'string', // Reference stored as ID string

  // Enum type
  enum: 'string', // Will be refined to union type
};

/**
 * Extract TypeScript type string from field type
 *
 * @remarks
 * Converts a schema field type identifier to its TypeScript type representation.
 * This is the foundation for generating TypeScript interfaces and type definitions.
 *
 * For complex types (array, enum, object), additional processing may be needed
 * to refine the type based on field configuration.
 *
 * @param fieldType - Schema field type identifier
 * @returns TypeScript type string
 *
 * @example
 * Basic types:
 * ```typescript
 * getTypeScriptType('string');   // 'string'
 * getTypeScriptType('number');   // 'number'
 * getTypeScriptType('boolean');  // 'boolean'
 * getTypeScriptType('datetime'); // 'string' (ISO 8601)
 * ```
 *
 * @example
 * Special types:
 * ```typescript
 * getTypeScriptType('id');     // 'string'
 * getTypeScriptType('ref');    // 'string' (reference ID)
 * getTypeScriptType('binary'); // 'Buffer'
 * getTypeScriptType('json');   // 'any'
 * ```
 *
 * @example
 * Complex types (require additional refinement):
 * ```typescript
 * getTypeScriptType('array');  // 'any[]'
 * getTypeScriptType('enum');   // 'string'
 * getTypeScriptType('object'); // 'Record<string, any>'
 * ```
 */
export function getTypeScriptType(fieldType: string): string {
  return TYPE_MAP[fieldType] || 'any';
}

/**
 * Generate TypeScript interface for a model
 *
 * @remarks
 * Creates a TypeScript interface definition from a model's field definitions.
 * The interface includes:
 * - All model fields with their TypeScript types
 * - Optional field markers (?) for non-required fields
 * - JSDoc comments from field descriptions (if available)
 *
 * @param model - Model information with fields
 * @returns TypeScript interface definition as string
 *
 * @example
 * Basic usage:
 * ```typescript
 * const model: ModelInfo = {
 *   name: 'User',
 *   type: 'crud',
 *   definition: {
 *     fields: [
 *       { name: 'id', type: 'id', required: true },
 *       { name: 'email', type: 'email', required: true },
 *       { name: 'name', type: 'string', required: true },
 *       { name: 'age', type: 'number', required: false },
 *       { name: 'bio', type: 'string', required: false },
 *     ]
 *   }
 * };
 *
 * const interfaceCode = generateInterface(model);
 * // Output:
 * // export interface User {
 * //   id: string;
 * //   email: string;
 * //   name: string;
 * //   age?: number;
 * //   bio?: string;
 * // }
 * ```
 */
export function generateInterface(model: ModelInfo): string {
  const fields = extractFieldsFromModel(model);
  const lines: string[] = [];

  lines.push(`export interface ${model.name} {`);

  for (const field of fields) {
    const optional = field.required ? '' : '?';
    const tsType = getFieldTypeScriptType(field);
    lines.push(`  ${field.name}${optional}: ${tsType};`);
  }

  lines.push(`}`);

  return lines.join('\n');
}

/**
 * Generate Create input type for a model
 *
 * @remarks
 * Creates a TypeScript interface for creating new instances of a model.
 * Automatically excludes system-managed fields:
 * - `id` (generated by the system)
 * - `createdAt` (auto-generated timestamp)
 * - `updatedAt` (auto-generated timestamp)
 *
 * All other fields maintain their required/optional status from the model.
 *
 * @param model - Model information
 * @returns TypeScript interface definition for create input
 *
 * @example
 * ```typescript
 * const model: ModelInfo = {
 *   name: 'User',
 *   type: 'crud',
 *   definition: {
 *     fields: [
 *       { name: 'id', type: 'id', required: true },
 *       { name: 'email', type: 'email', required: true },
 *       { name: 'name', type: 'string', required: true },
 *       { name: 'age', type: 'number', required: false },
 *       { name: 'createdAt', type: 'datetime', required: true },
 *       { name: 'updatedAt', type: 'datetime', required: true },
 *     ]
 *   }
 * };
 *
 * const createInputCode = generateCreateInputType(model);
 * // Output:
 * // export interface CreateUserInput {
 * //   email: string;
 * //   name: string;
 * //   age?: number;
 * // }
 * ```
 */
export function generateCreateInputType(model: ModelInfo): string {
  const fields = extractFieldsFromModel(model);
  const excludedFields = new Set(['id', 'createdAt', 'updatedAt']);
  const lines: string[] = [];

  lines.push(`export interface Create${model.name}Input {`);

  for (const field of fields) {
    if (excludedFields.has(field.name)) continue;

    const optional = field.required ? '' : '?';
    const tsType = getFieldTypeScriptType(field);
    lines.push(`  ${field.name}${optional}: ${tsType};`);
  }

  lines.push(`}`);

  return lines.join('\n');
}

/**
 * Generate Update input type for a model
 *
 * @remarks
 * Creates a TypeScript interface for updating existing instances of a model.
 * Key characteristics:
 * - `id` field is required (to identify which record to update)
 * - All other fields are optional (partial updates supported)
 * - System fields like `createdAt` are excluded (cannot be modified)
 * - `updatedAt` is excluded (automatically managed by the system)
 *
 * @param model - Model information
 * @returns TypeScript interface definition for update input
 *
 * @example
 * ```typescript
 * const model: ModelInfo = {
 *   name: 'User',
 *   type: 'crud',
 *   definition: {
 *     fields: [
 *       { name: 'id', type: 'id', required: true },
 *       { name: 'email', type: 'email', required: true },
 *       { name: 'name', type: 'string', required: true },
 *       { name: 'age', type: 'number', required: false },
 *       { name: 'createdAt', type: 'datetime', required: true },
 *       { name: 'updatedAt', type: 'datetime', required: true },
 *     ]
 *   }
 * };
 *
 * const updateInputCode = generateUpdateInputType(model);
 * // Output:
 * // export interface UpdateUserInput {
 * //   id: string; // Required for updates
 * //   email?: string;
 * //   name?: string;
 * //   age?: number;
 * // }
 * ```
 */
export function generateUpdateInputType(model: ModelInfo): string {
  const fields = extractFieldsFromModel(model);
  const excludedFields = new Set(['createdAt', 'updatedAt']);
  const lines: string[] = [];

  lines.push(`export interface Update${model.name}Input {`);
  lines.push(`  id: string; // Required for updates`);

  for (const field of fields) {
    if (field.name === 'id') continue;
    if (excludedFields.has(field.name)) continue;

    const tsType = getFieldTypeScriptType(field);
    lines.push(`  ${field.name}?: ${tsType};`);
  }

  lines.push(`}`);

  return lines.join('\n');
}

/**
 * Generate all TypeScript types for a model
 *
 * @remarks
 * Convenience function that generates all three TypeScript type definitions
 * for a model in one call:
 * - Main interface (full model structure)
 * - Create input interface (for creating new records)
 * - Update input interface (for updating existing records)
 *
 * @param model - Model information
 * @returns Object with all generated type definitions
 *
 * @example
 * ```typescript
 * const model: ModelInfo = {
 *   name: 'User',
 *   type: 'crud',
 *   definition: { fields: [...] }
 * };
 *
 * const types = generateModelTypes(model);
 * console.log(types.interface);    // Main User interface
 * console.log(types.createInput);  // CreateUserInput interface
 * console.log(types.updateInput);  // UpdateUserInput interface
 *
 * // Write to file
 * const allTypes = [
 *   types.interface,
 *   '',
 *   types.createInput,
 *   '',
 *   types.updateInput,
 * ].join('\n');
 * ```
 */
export function generateModelTypes(model: ModelInfo): {
  interface: string;
  createInput: string;
  updateInput: string;
} {
  return {
    interface: generateInterface(model),
    createInput: generateCreateInputType(model),
    updateInput: generateUpdateInputType(model),
  };
}

/**
 * Extract partition key field from model
 *
 * @remarks
 * Identifies the partition key field for Cosmos DB container configuration.
 * Partition keys are critical for performance and scalability in Cosmos DB.
 *
 * The function looks for:
 * 1. Field with `_partitionKey` metadata property
 * 2. Falls back to 'id' if no partition key is explicitly set
 *
 * @param model - Model information
 * @returns Name of the partition key field
 *
 * @example
 * Explicit partition key:
 * ```typescript
 * const model: ModelInfo = {
 *   name: 'Order',
 *   type: 'crud',
 *   definition: {
 *     fields: [
 *       { name: 'id', type: 'id', required: true },
 *       { name: 'userId', type: 'ref', required: true, _partitionKey: true },
 *       { name: 'total', type: 'number', required: true },
 *     ]
 *   }
 * };
 *
 * getPartitionKeyField(model); // 'userId'
 * ```
 *
 * @example
 * Default partition key:
 * ```typescript
 * const model: ModelInfo = {
 *   name: 'User',
 *   type: 'crud',
 *   definition: {
 *     fields: [
 *       { name: 'id', type: 'id', required: true },
 *       { name: 'email', type: 'email', required: true },
 *     ]
 *   }
 * };
 *
 * getPartitionKeyField(model); // 'id' (default)
 * ```
 */
export function getPartitionKeyField(model: ModelInfo): string {
  const fields = extractFieldsFromModel(model);

  // Look for field with _partitionKey metadata
  for (const field of fields) {
    if ((field as any)._partitionKey) {
      return field.name;
    }
    // Also check in definition metadata
    if (field.definition?.metadata && (field.definition.metadata as any)._partitionKey) {
      return field.name;
    }
  }

  // Default to 'id'
  return 'id';
}

/**
 * Get required fields from model
 *
 * @remarks
 * Extracts all fields marked as required in the model definition.
 * Useful for validation and form generation.
 *
 * @param model - Model information
 * @returns Array of required field names
 *
 * @example
 * ```typescript
 * const model: ModelInfo = {
 *   name: 'User',
 *   type: 'crud',
 *   definition: {
 *     fields: [
 *       { name: 'id', type: 'id', required: true },
 *       { name: 'email', type: 'email', required: true },
 *       { name: 'name', type: 'string', required: true },
 *       { name: 'age', type: 'number', required: false },
 *       { name: 'bio', type: 'string', required: false },
 *     ]
 *   }
 * };
 *
 * const requiredFields = getRequiredFields(model);
 * // ['id', 'email', 'name']
 * ```
 */
export function getRequiredFields(model: ModelInfo): string[] {
  const fields = extractFieldsFromModel(model);
  return fields.filter((field) => field.required).map((field) => field.name);
}

/**
 * Get optional fields from model
 *
 * @remarks
 * Extracts all fields marked as optional in the model definition.
 * Useful for partial updates and flexible data handling.
 *
 * @param model - Model information
 * @returns Array of optional field names
 *
 * @example
 * ```typescript
 * const model: ModelInfo = {
 *   name: 'User',
 *   type: 'crud',
 *   definition: {
 *     fields: [
 *       { name: 'id', type: 'id', required: true },
 *       { name: 'email', type: 'email', required: true },
 *       { name: 'name', type: 'string', required: true },
 *       { name: 'age', type: 'number', required: false },
 *       { name: 'bio', type: 'string', required: false },
 *     ]
 *   }
 * };
 *
 * const optionalFields = getOptionalFields(model);
 * // ['age', 'bio']
 * ```
 */
export function getOptionalFields(model: ModelInfo): string[] {
  const fields = extractFieldsFromModel(model);
  return fields.filter((field) => !field.required).map((field) => field.name);
}

/**
 * Get all field names from model
 *
 * @remarks
 * Extracts all field names from a model definition regardless of their
 * required/optional status. Useful for iterating over all fields.
 *
 * @param model - Model information
 * @returns Array of all field names
 *
 * @example
 * ```typescript
 * const model: ModelInfo = {
 *   name: 'User',
 *   type: 'crud',
 *   definition: {
 *     fields: [
 *       { name: 'id', type: 'id', required: true },
 *       { name: 'email', type: 'email', required: true },
 *       { name: 'age', type: 'number', required: false },
 *     ]
 *   }
 * };
 *
 * const fieldNames = getFieldNames(model);
 * // ['id', 'email', 'age']
 * ```
 */
export function getFieldNames(model: ModelInfo): string[] {
  const fields = extractFieldsFromModel(model);
  return fields.map((field) => field.name);
}

/**
 * Get read-only fields from model
 *
 * @remarks
 * Extracts all fields marked as read-only in the model definition.
 * Read-only fields cannot be modified after creation (e.g., id, createdAt).
 *
 * @param model - Model information
 * @returns Array of read-only field names
 *
 * @example
 * ```typescript
 * const model: ModelInfo = {
 *   name: 'User',
 *   type: 'crud',
 *   definition: {
 *     fields: [
 *       { name: 'id', type: 'id', required: true, definition: { metadata: { readOnly: true } } },
 *       { name: 'email', type: 'email', required: true },
 *       { name: 'createdAt', type: 'datetime', required: true, definition: { metadata: { readOnly: true } } },
 *     ]
 *   }
 * };
 *
 * const readOnlyFields = getReadOnlyFields(model);
 * // ['id', 'createdAt']
 * ```
 */
export function getReadOnlyFields(model: ModelInfo): string[] {
  const fields = extractFieldsFromModel(model);
  return fields
    .filter((field) => field.definition?.metadata?.readOnly)
    .map((field) => field.name);
}

/**
 * Get computed fields from model
 *
 * @remarks
 * Extracts all fields marked as computed in the model definition.
 * Computed fields are calculated at runtime and cannot be set directly.
 *
 * @param model - Model information
 * @returns Array of computed field names
 *
 * @example
 * ```typescript
 * const model: ModelInfo = {
 *   name: 'User',
 *   type: 'crud',
 *   definition: {
 *     fields: [
 *       { name: 'firstName', type: 'string', required: true },
 *       { name: 'lastName', type: 'string', required: true },
 *       { name: 'fullName', type: 'string', required: false, definition: { metadata: { computed: true } } },
 *     ]
 *   }
 * };
 *
 * const computedFields = getComputedFields(model);
 * // ['fullName']
 * ```
 */
export function getComputedFields(model: ModelInfo): string[] {
  const fields = extractFieldsFromModel(model);
  return fields
    .filter((field) => field.definition?.metadata?.computed)
    .map((field) => field.name);
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

/**
 * Extract fields from model definition
 *
 * @internal
 * @remarks
 * Normalizes field extraction from different model definition formats.
 * Handles both legacy and unified field definition structures.
 */
function extractFieldsFromModel(model: ModelInfo): FieldInfo[] {
  const fields: FieldInfo[] = [];

  // Handle case where definition has fields array
  if (model.definition && Array.isArray((model.definition as any).fields)) {
    const fieldDefs = (model.definition as any).fields;
    for (const field of fieldDefs) {
      // Preserve any custom properties from the field object
      const fieldInfo: any = {
        name: field.name,
        type: field.type,
        required: field.required ?? false,
        definition: field.definition,
      };

      // Copy over custom properties like _partitionKey
      for (const key of Object.keys(field)) {
        if (key !== 'name' && key !== 'type' && key !== 'required' && key !== 'definition') {
          fieldInfo[key] = field[key];
        }
      }

      fields.push(fieldInfo);
    }
  }
  // Handle case where definition is a field map (schema definition)
  else if (model.definition && typeof model.definition === 'object') {
    for (const [fieldName, fieldDef] of Object.entries(model.definition)) {
      if (isFieldDefinition(fieldDef)) {
        fields.push({
          name: fieldName,
          type: fieldDef.type,
          required: fieldDef.required ?? false,
          definition: fieldDef as UnifiedFieldDefinition,
        });
      }
    }
  }

  return fields;
}

/**
 * Get TypeScript type for a field
 *
 * @internal
 * @remarks
 * Refines the TypeScript type based on field configuration.
 * Handles special cases like enum unions and array item types.
 */
function getFieldTypeScriptType(field: FieldInfo): string {
  let tsType = getTypeScriptType(field.type);

  // Refine enum type to union type
  if (field.type === 'enum' && field.definition?.values) {
    const enumValues = field.definition.values.map((v) => `'${v}'`).join(' | ');
    tsType = enumValues;
  }

  // Refine array type with item type
  if (field.type === 'array' && field.definition?.itemDefinition) {
    const itemType = getTypeScriptType(field.definition.itemDefinition.type);
    tsType = `${itemType}[]`;
  }

  // Handle nullable types
  if (field.definition?.nullable) {
    tsType = `${tsType} | null`;
  }

  return tsType;
}

/**
 * Type guard to check if value is a field definition
 *
 * @internal
 */
function isFieldDefinition(value: any): value is UnifiedFieldDefinition {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.type === 'string' &&
    'required' in value
  );
}
