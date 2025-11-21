/**
 * @atakora/component/schema - Schema Definition System
 *
 * @remarks
 * Schema-first backend framework that auto-generates infrastructure from data models.
 *
 * ## Core Concepts
 *
 * - **CRUD Models** (`c.model`): Database-backed REST APIs
 * - **Event Models** (`e.model`): Async event processing
 * - **Function Models** (`f.model`): Custom HTTP endpoints
 *
 * ## Usage
 *
 * ```typescript
 * import { defineSchema, a, c, e, f } from '@atakora/component';
 *
 * export const schema = defineSchema({
 *   schema: a.schema({
 *     User: c.model({
 *       id: a.id(),
 *       email: a.string().required().email(),
 *       name: a.string().required(),
 *     }),
 *
 *     DataUploaded: e.model({
 *       datasetId: a.string().required(),
 *       fileUrl: a.string().url().required(),
 *     }),
 *
 *     GenerateReport: f.model({
 *       input: {
 *         datasetId: a.string().required(),
 *       },
 *       output: {
 *         reportUrl: a.string().url().required(),
 *       },
 *     }),
 *   }),
 * });
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Schema Definition
// ============================================================================

export {
  defineSchema,
  getModelNames,
  getCrudModelNames,
  getEventModelNames,
  getFunctionModelNames,
  getModel,
  hasModel,
  getSchemaMetadata,
  getSchemaStats,
} from './define-schema';

// ============================================================================
// Field Type Builders
// ============================================================================

export { a } from './field-types';

export type {
  StringFieldBuilder,
  NumberFieldBuilder,
  BooleanFieldBuilder,
  DatetimeFieldBuilder,
  IdFieldBuilder,
  EnumFieldBuilder,
  ArrayFieldBuilder,
  ObjectFieldBuilder,
  JsonFieldBuilder,
  BinaryFieldBuilder,
  FieldBuilder,
} from './field-types';

// ============================================================================
// Model Builders
// ============================================================================

export { c } from './crud-model';
export { e } from './event-model';
export { f } from './function-model';

export type { CrudModelBuilder } from './crud-model';
export type { EventModelBuilder } from './event-model';
export type { FunctionModelBuilder } from './function-model';

// ============================================================================
// Authorization
// ============================================================================

export type { AuthorizationBuilder, AuthorizationRulesFn } from './authorization';

// ============================================================================
// Core Types
// ============================================================================

export type {
  // Field configurations
  FieldConfig,
  StringFieldConfig,
  NumberFieldConfig,
  BooleanFieldConfig,
  DatetimeFieldConfig,
  IdFieldConfig,
  EnumFieldConfig,
  ArrayFieldConfig,
  ObjectFieldConfig,
  JsonFieldConfig,
  BinaryFieldConfig,

  // Model configurations
  ModelConfig,
  CrudModelConfig,
  EventModelConfig,
  FunctionModelConfig,

  // Authorization
  AuthorizationRule,
  Operation,

  // Validation
  ValidationRule,

  // Schema
  SchemaDefinitionInput,
  SchemaObject,
  ProcessedModel,
  SchemaMetadata,

  // Categorization
  ExtractCrudModels,
  ExtractEventModels,
  ExtractFunctionModels,
  SchemaModelMap,
} from './types';

// ============================================================================
// Type Inference Utilities
// ============================================================================

export type {
  // Field type inference
  InferFieldType,
  InferFieldTypes,

  // Model type inference
  InferModelType,
  InferCreateInput,
  InferUpdateInput,
  InferFilterType,
  FilterOperators,

  // Event type inference
  InferEventType,
  InferEventPublishInput,

  // Function type inference
  InferFunctionInput,
  InferFunctionOutput,

  // List types
  ListResponse,
  InferListResponse,
  PaginationMetadata,

  // Utility types
  RequireKeys,
  OptionalKeys,
  DeepPartial,
  DeepReadonly,
  KeysOfType,
  Nullable,
  Maybe,
  Expand,
} from './type-inference';

// ============================================================================
// Utilities
// ============================================================================

export {
  processFields,
  processModels,
  extractModelNames,
  validateSchemaDefinition,
  isFieldBuilder,
  isCrudModel,
  isEventModel,
  isFunctionModel,
} from './utils';

// ============================================================================
// Version
// ============================================================================

export const SCHEMA_API_VERSION = '2.0.0';
