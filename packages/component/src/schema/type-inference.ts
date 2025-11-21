/**
 * Type Inference Utilities
 *
 * Helper types for inferring TypeScript types from schema definitions.
 */

import type { CrudModelBuilder } from './crud-model';
import type { EventModelBuilder } from './event-model';
import type { FunctionModelBuilder } from './function-model';
import type {
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
} from './field-types';

// ============================================================================
// Field Type Inference
// ============================================================================

/**
 * Infer TypeScript type from field builder
 */
export type InferFieldType<T> =
  T extends StringFieldBuilder ? string :
  T extends NumberFieldBuilder ? number :
  T extends BooleanFieldBuilder ? boolean :
  T extends DatetimeFieldBuilder ? string : // ISO 8601 string
  T extends IdFieldBuilder ? string :
  T extends EnumFieldBuilder<infer Values> ? Values[number] :
  T extends ArrayFieldBuilder ? InferArrayItemType<T>[] :
  T extends ObjectFieldBuilder ? InferObjectType<T> :
  T extends JsonFieldBuilder ? any :
  T extends BinaryFieldBuilder ? Buffer :
  unknown;

/**
 * Infer array item type
 */
type InferArrayItemType<T> =
  T extends ArrayFieldBuilder<infer ItemType>
    ? InferFieldType<ItemType>
    : unknown;

/**
 * Infer object field types
 */
type InferObjectType<T> =
  T extends ObjectFieldBuilder<infer Schema>
    ? InferFieldTypes<Schema>
    : unknown;

/**
 * Infer types for all fields in an object
 */
export type InferFieldTypes<T> = {
  [K in keyof T]: InferFieldType<T[K]>;
};

// ============================================================================
// Model Type Inference
// ============================================================================

/**
 * Infer full model type from CRUD model builder
 *
 * Includes auto-generated fields (id, createdAt, updatedAt)
 */
export type InferModelType<T> =
  T extends CrudModelBuilder<infer Fields>
    ? InferFieldTypes<Fields> & {
        id: string;
        createdAt?: string;
        updatedAt?: string;
        deletedAt?: string;
      }
    : never;

/**
 * Infer create input type (omits auto-generated fields)
 */
export type InferCreateInput<T> =
  T extends CrudModelBuilder<infer Fields>
    ? Omit<InferFieldTypes<Fields>, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
    : never;

/**
 * Infer update input type (all fields optional)
 */
export type InferUpdateInput<T> =
  T extends CrudModelBuilder<infer Fields>
    ? Partial<Omit<InferFieldTypes<Fields>, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>
    : never;

/**
 * Infer filter type for list queries
 */
export type InferFilterType<T> =
  T extends CrudModelBuilder<infer Fields>
    ? {
        [K in keyof InferFieldTypes<Fields>]?:
          | InferFieldTypes<Fields>[K]
          | FilterOperators<InferFieldTypes<Fields>[K]>;
      }
    : never;

/**
 * Filter operators for field types
 */
export interface FilterOperators<T> {
  /** Equal to */
  eq?: T;
  /** Not equal to */
  ne?: T;
  /** Greater than */
  gt?: T;
  /** Greater than or equal to */
  gte?: T;
  /** Less than */
  lt?: T;
  /** Less than or equal to */
  lte?: T;
  /** In array */
  in?: T[];
  /** Not in array */
  nin?: T[];
  /** Contains (for strings) */
  contains?: T extends string ? string : never;
  /** Starts with (for strings) */
  startsWith?: T extends string ? string : never;
  /** Ends with (for strings) */
  endsWith?: T extends string ? string : never;
}

// ============================================================================
// Event Type Inference
// ============================================================================

/**
 * Infer event type from event model builder
 */
export type InferEventType<T> =
  T extends EventModelBuilder<infer Fields>
    ? InferFieldTypes<Fields>
    : never;

/**
 * Infer event publish input (adds metadata)
 */
export type InferEventPublishInput<T> =
  T extends EventModelBuilder<infer Fields>
    ? InferFieldTypes<Fields>
    : never;

// ============================================================================
// Function Type Inference
// ============================================================================

/**
 * Infer function input type from function model builder
 */
export type InferFunctionInput<T> =
  T extends FunctionModelBuilder<infer Input, any>
    ? InferFieldTypes<Input>
    : never;

/**
 * Infer function output type from function model builder
 */
export type InferFunctionOutput<T> =
  T extends FunctionModelBuilder<any, infer Output>
    ? InferFieldTypes<Output>
    : never;

// ============================================================================
// List Response Types
// ============================================================================

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * List response type
 */
export interface ListResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

/**
 * Infer list response type
 */
export type InferListResponse<T> =
  T extends CrudModelBuilder<any>
    ? ListResponse<InferModelType<T>>
    : never;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep partial
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Deep readonly
 */
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

/**
 * Extract keys of specific type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Nullable
 */
export type Nullable<T> = T | null;

/**
 * Maybe (null or undefined)
 */
export type Maybe<T> = T | null | undefined;

/**
 * Expand type for better IntelliSense display
 */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
