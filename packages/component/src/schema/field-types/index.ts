/**
 * Field Types API
 *
 * @remarks
 * Exports the `a` namespace containing all field type builders.
 * Use these to define schema fields with validation.
 *
 * @example
 * ```typescript
 * import { a } from '@atakora/component';
 *
 * const schema = a.schema({
 *   User: c.model({
 *     id: a.id(),
 *     email: a.string().required().email(),
 *     name: a.string().required(),
 *     age: a.number().optional().min(0).max(120),
 *     role: a.enum(['user', 'admin']).default('user'),
 *     createdAt: a.datetime().required(),
 *   })
 * });
 * ```
 */

// Export field type classes
export { BaseFieldBuilder, type BaseFieldConfig, type ValidationRule } from './base';
export { StringFieldBuilder, type StringFieldConfig } from './string';
export { NumberFieldBuilder, type NumberFieldConfig } from './number';
export { BooleanFieldBuilder, type BooleanFieldConfig } from './boolean';
export { DateTimeFieldBuilder, type DateTimeFieldConfig } from './datetime';
export { IdFieldBuilder, type IdFieldConfig } from './id';
export { EnumFieldBuilder, type EnumFieldConfig } from './enum';
export { ArrayFieldBuilder, type ArrayFieldConfig } from './array';
export { RefFieldBuilder, type RefFieldConfig } from './ref';
export { ObjectFieldBuilder, type ObjectFieldConfig } from './object';
export { JsonFieldBuilder, type JsonFieldConfig } from './json';
export { BinaryFieldBuilder, type BinaryFieldConfig } from './binary';

// Import builders for namespace
import { StringFieldBuilder } from './string';
import { NumberFieldBuilder } from './number';
import { BooleanFieldBuilder } from './boolean';
import { DateTimeFieldBuilder } from './datetime';
import { IdFieldBuilder } from './id';
import { EnumFieldBuilder } from './enum';
import { ArrayFieldBuilder } from './array';
import { RefFieldBuilder } from './ref';
import { ObjectFieldBuilder } from './object';
import { JsonFieldBuilder } from './json';
import { BinaryFieldBuilder } from './binary';

/**
 * Field type builder namespace
 *
 * @remarks
 * The `a` namespace provides factory functions for all field types.
 * Each function returns a fluent builder for that field type.
 *
 * Available field types:
 * - `a.string()` - String fields with validation (email, url, length, etc.)
 * - `a.number()` - Number fields with constraints (min, max, integer, etc.)
 * - `a.boolean()` - Boolean fields (true/false)
 * - `a.datetime()` - DateTime fields with date constraints
 * - `a.id()` - Auto-generated ID fields
 * - `a.enum([...])` - Enumerated values
 * - `a.array(type)` - Arrays of a specific type
 * - `a.ref('Model')` - References to other models
 * - `a.object({...})` - Nested objects with schema
 * - `a.json()` - Unstructured JSON data
 * - `a.binary()` - Binary data (files)
 *
 * @example
 * ```typescript
 * // String field
 * const email = a.string().required().email();
 *
 * // Number field
 * const age = a.number().min(0).max(120);
 *
 * // Enum field
 * const status = a.enum(['pending', 'active', 'archived']).default('pending');
 *
 * // Array field
 * const tags = a.array(a.string()).default([]);
 *
 * // Reference field
 * const userId = a.ref('User').required();
 *
 * // Object field
 * const address = a.object({
 *   street: a.string().required(),
 *   city: a.string().required(),
 * });
 * ```
 */
export const a = {
  /**
   * Create a string field
   *
   * @remarks
   * String fields support various validation options:
   * - `.email()` - Validate email format
   * - `.url()` - Validate URL format
   * - `.uuid()` - Validate UUID format
   * - `.phone()` - Validate phone number format
   * - `.min(n)` / `.max(n)` - Length constraints
   * - `.regex(pattern)` - Custom pattern matching
   *
   * @example
   * ```typescript
   * const name = a.string().required();
   * const email = a.string().email().required();
   * const website = a.string().url();
   * const bio = a.string().max(500);
   * ```
   */
  string: () => new StringFieldBuilder(),

  /**
   * Create a number field
   *
   * @remarks
   * Number fields support various validation options:
   * - `.min(n)` / `.max(n)` - Value constraints
   * - `.integer()` - Require whole numbers
   * - `.positive()` - Require positive values
   * - `.negative()` - Require negative values
   *
   * @example
   * ```typescript
   * const age = a.number().min(0).max(120);
   * const quantity = a.number().integer().positive();
   * const price = a.number().positive().required();
   * ```
   */
  number: () => new NumberFieldBuilder(),

  /**
   * Create a boolean field
   *
   * @remarks
   * Boolean fields store true/false values.
   *
   * @example
   * ```typescript
   * const isActive = a.boolean().default(true);
   * const agreedToTerms = a.boolean().required();
   * ```
   */
  boolean: () => new BooleanFieldBuilder(),

  /**
   * Create a datetime field
   *
   * @remarks
   * DateTime fields store ISO 8601 timestamp strings.
   * Supports validation options:
   * - `.min(date)` / `.max(date)` - Date range constraints
   * - `.future()` - Require future dates
   * - `.past()` - Require past dates
   *
   * @example
   * ```typescript
   * const createdAt = a.datetime().required();
   * const scheduledFor = a.datetime().future();
   * const birthDate = a.datetime().past();
   * ```
   */
  datetime: () => new DateTimeFieldBuilder(),

  /**
   * Create an auto-generated ID field
   *
   * @remarks
   * ID fields are auto-generated by default.
   * Format: {prefix}_{randomString}
   *
   * @example
   * ```typescript
   * const id = a.id();
   * const userId = a.id().prefix('user'); // user_abc123
   * ```
   */
  id: () => new IdFieldBuilder(),

  /**
   * Create an enum field
   *
   * @remarks
   * Enum fields restrict values to a predefined set of strings.
   *
   * @example
   * ```typescript
   * const status = a.enum(['pending', 'active', 'archived']);
   * const role = a.enum(['user', 'admin', 'analyst']).default('user');
   * const priority = a.enum(['low', 'medium', 'high']).required();
   * ```
   *
   * @param values - Array of allowed string values
   */
  enum: <T extends readonly string[]>(values: T) => new EnumFieldBuilder(values),

  /**
   * Create an array field
   *
   * @remarks
   * Array fields contain multiple values of a specific type.
   * Supports validation options:
   * - `.minItems(n)` / `.maxItems(n)` - Size constraints
   * - `.unique()` - Require unique items
   * - `.nonEmpty()` - Require at least one item
   *
   * @example
   * ```typescript
   * const tags = a.array(a.string()).default([]);
   * const emails = a.array(a.string().email()).minItems(1);
   * const userIds = a.array(a.string()).unique();
   * ```
   *
   * @param itemType - Field type for array items
   */
  array: <T>(itemType: T) => new ArrayFieldBuilder(itemType),

  /**
   * Create a reference field
   *
   * @remarks
   * Reference fields store the ID of another model (foreign key).
   * Supports delete behavior options:
   * - `.onDelete('cascade')` - Delete this record when referenced record is deleted
   * - `.onDelete('set_null')` - Set to null when referenced record is deleted
   * - `.onDelete('restrict')` - Prevent deletion of referenced record
   *
   * @example
   * ```typescript
   * const userId = a.ref('User').required();
   * const projectId = a.ref('Project').onDelete('cascade');
   * const parentId = a.ref('Category').optional();
   * ```
   *
   * @param modelName - Name of the referenced model
   */
  ref: (modelName: string) => new RefFieldBuilder(modelName),

  /**
   * Create an object field
   *
   * @remarks
   * Object fields have a defined schema for nested properties.
   * Use this when you know the structure of the nested data.
   * Use `a.json()` for unstructured data.
   *
   * @example
   * ```typescript
   * const address = a.object({
   *   street: a.string().required(),
   *   city: a.string().required(),
   *   state: a.string().required(),
   *   zip: a.string().required(),
   * });
   *
   * const settings = a.object({
   *   theme: a.enum(['light', 'dark']).default('light'),
   *   notifications: a.boolean().default(true),
   * }).default({});
   * ```
   *
   * @param schema - Schema definition for object properties
   */
  object: <T extends Record<string, any>>(schema: T) => new ObjectFieldBuilder(schema),

  /**
   * Create a JSON field
   *
   * @remarks
   * JSON fields store unstructured/dynamic JSON data.
   * Use `a.object()` if you have a known schema structure.
   * Use `a.json()` for truly dynamic data.
   *
   * @example
   * ```typescript
   * const metadata = a.json().default({});
   * const preferences = a.json().optional();
   * const config = a.json().required().objectOnly();
   * ```
   */
  json: () => new JsonFieldBuilder(),

  /**
   * Create a binary field
   *
   * @remarks
   * Binary fields are used for file uploads and binary data.
   * Supports validation options:
   * - `.maxSize(bytes)` - Maximum file size
   * - `.mimeTypes([...])` - Allowed MIME types
   *
   * @example
   * ```typescript
   * const file = a.binary().required();
   * const image = a.binary()
   *   .maxSize(10 * 1024 * 1024) // 10MB
   *   .mimeTypes(['image/png', 'image/jpeg']);
   * const pdf = a.binary()
   *   .mimeTypes(['application/pdf'])
   *   .maxSize(5 * 1024 * 1024); // 5MB
   * ```
   */
  binary: () => new BinaryFieldBuilder(),

  /**
   * Create a schema (placeholder for schema builder)
   *
   * @remarks
   * This will be implemented in Phase 2 as part of the schema builder.
   * Placeholder to match the API from the implementation plan.
   *
   * @example
   * ```typescript
   * const schema = a.schema({
   *   User: c.model({ ... }),
   *   Project: c.model({ ... }),
   * });
   * ```
   */
  schema: <T>(models: T): T => {
    // Placeholder - will be implemented in Phase 2
    return models;
  },
};

/**
 * Type inference helper types
 *
 * @remarks
 * These types enable TypeScript to infer the correct types from field builders.
 */

/**
 * Infer the TypeScript type from a field builder
 */
export type InferFieldType<T> =
  T extends StringFieldBuilder ? string :
  T extends NumberFieldBuilder ? number :
  T extends BooleanFieldBuilder ? boolean :
  T extends DateTimeFieldBuilder ? string :
  T extends IdFieldBuilder ? string :
  T extends EnumFieldBuilder<infer Values> ? Values[number] :
  T extends ArrayFieldBuilder<infer Item> ? InferFieldType<Item>[] :
  T extends RefFieldBuilder ? string :
  T extends ObjectFieldBuilder<infer Schema> ? { [K in keyof Schema]: InferFieldType<Schema[K]> } :
  T extends JsonFieldBuilder ? any :
  T extends BinaryFieldBuilder ? Buffer | Uint8Array :
  unknown;

/**
 * Infer field types from a schema definition
 */
export type InferFieldTypes<T> = {
  [K in keyof T]: InferFieldType<T[K]>;
};
