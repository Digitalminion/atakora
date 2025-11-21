/**
 * Core Type Definitions for Schema System
 *
 * This file contains the foundational type definitions that power
 * the schema-first backend framework.
 */

// ============================================================================
// Field Type Definitions
// ============================================================================

/**
 * Base field configuration
 */
export interface BaseFieldConfig {
  type: string;
  validations: ValidationRule[];
  default?: any;
  required?: boolean;
}

/**
 * String field configuration
 */
export interface StringFieldConfig extends BaseFieldConfig {
  type: 'string';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

/**
 * Number field configuration
 */
export interface NumberFieldConfig extends BaseFieldConfig {
  type: 'number';
  min?: number;
  max?: number;
  integer?: boolean;
}

/**
 * Boolean field configuration
 */
export interface BooleanFieldConfig extends BaseFieldConfig {
  type: 'boolean';
}

/**
 * Datetime field configuration
 */
export interface DatetimeFieldConfig extends BaseFieldConfig {
  type: 'datetime';
}

/**
 * ID field configuration
 */
export interface IdFieldConfig extends BaseFieldConfig {
  type: 'id';
  prefix?: string;
}

/**
 * Enum field configuration
 */
export interface EnumFieldConfig<T extends readonly string[]> extends BaseFieldConfig {
  type: 'enum';
  values: T;
}

/**
 * Array field configuration
 */
export interface ArrayFieldConfig extends BaseFieldConfig {
  type: 'array';
  itemType: any;
}

/**
 * Object field configuration
 */
export interface ObjectFieldConfig extends BaseFieldConfig {
  type: 'object';
  schema: Record<string, any>;
}

/**
 * JSON field configuration
 */
export interface JsonFieldConfig extends BaseFieldConfig {
  type: 'json';
}

/**
 * Binary field configuration
 */
export interface BinaryFieldConfig extends BaseFieldConfig {
  type: 'binary';
  maxSizeBytes?: number;
}

/**
 * Union of all field configurations
 */
export type FieldConfig =
  | StringFieldConfig
  | NumberFieldConfig
  | BooleanFieldConfig
  | DatetimeFieldConfig
  | IdFieldConfig
  | EnumFieldConfig<any>
  | ArrayFieldConfig
  | ObjectFieldConfig
  | JsonFieldConfig
  | BinaryFieldConfig;

// ============================================================================
// Validation Rules
// ============================================================================

/**
 * Validation rule types
 */
export type ValidationRule =
  | { type: 'required' }
  | { type: 'pattern'; pattern: RegExp; message: string }
  | { type: 'minLength'; value: number; message: string }
  | { type: 'maxLength'; value: number; message: string }
  | { type: 'min'; value: number; message: string }
  | { type: 'max'; value: number; message: string }
  | { type: 'integer'; message: string }
  | { type: 'email'; message: string }
  | { type: 'url'; message: string }
  | { type: 'custom'; validate: (value: any) => boolean | string; message: string };

// ============================================================================
// Model Configurations
// ============================================================================

/**
 * CRUD model configuration
 */
export interface CrudModelConfig<T = any> {
  type: 'crud';
  fields: Record<string, FieldConfig>;
  authorization: AuthorizationRule[];
  indexes: string[];
  partitionKey: string;
  timestamps: boolean;
  softDelete: boolean;
}

/**
 * Event model configuration
 */
export interface EventModelConfig<T = any> {
  type: 'event';
  fields: Record<string, FieldConfig>;
}

/**
 * Function model configuration
 */
export interface FunctionModelConfig<TInput = any, TOutput = any> {
  type: 'function';
  input: Record<string, FieldConfig>;
  output: Record<string, FieldConfig>;
  authorization: AuthorizationRule[];
}

/**
 * Union of all model configurations
 */
export type ModelConfig = CrudModelConfig | EventModelConfig | FunctionModelConfig;

// ============================================================================
// Authorization Rules
// ============================================================================

/**
 * Authorization rule types
 */
export type AuthorizationRule =
  | { type: 'owner'; field: string; operations?: Operation[] }
  | { type: 'groups'; groups: string[]; operations?: Operation[] }
  | { type: 'authenticated'; operations?: Operation[] }
  | { type: 'public'; operations?: Operation[] };

/**
 * CRUD operations
 */
export type Operation = 'create' | 'read' | 'update' | 'delete' | 'list';

// ============================================================================
// Schema Definition Types
// ============================================================================

/**
 * Schema definition input
 */
export interface SchemaDefinitionInput {
  schema: Record<string, any>;
}

/**
 * Processed schema model
 */
export interface ProcessedModel {
  name: string;
  config: ModelConfig;
  metadata: {
    isCrud: boolean;
    isEvent: boolean;
    isFunction: boolean;
  };
}

/**
 * Schema metadata
 */
export interface SchemaMetadata {
  version: string;
  createdAt: string;
  models: {
    crud: string[];
    events: string[];
    functions: string[];
  };
}

/**
 * Processed schema object
 */
export interface SchemaObject<T extends SchemaDefinitionInput = any> {
  schema: T['schema'];
  models: Record<string, ProcessedModel>;
  _metadata: SchemaMetadata;
  _raw: T;
}

// ============================================================================
// Type Inference Helpers
// ============================================================================

/**
 * Extract keys of CRUD models from schema
 */
export type ExtractCrudModels<T> = {
  [K in keyof T]: T[K] extends { _config: { type: 'crud' } } ? K : never;
}[keyof T];

/**
 * Extract keys of event models from schema
 */
export type ExtractEventModels<T> = {
  [K in keyof T]: T[K] extends { _config: { type: 'event' } } ? K : never;
}[keyof T];

/**
 * Extract keys of function models from schema
 */
export type ExtractFunctionModels<T> = {
  [K in keyof T]: T[K] extends { _config: { type: 'function' } } ? K : never;
}[keyof T];

/**
 * Schema model categorization
 */
export interface SchemaModelMap<T> {
  crud: Pick<T, ExtractCrudModels<T>>;
  events: Pick<T, ExtractEventModels<T>>;
  functions: Pick<T, ExtractFunctionModels<T>>;
}
