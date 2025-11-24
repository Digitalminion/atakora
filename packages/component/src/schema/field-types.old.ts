/**
 * Field Type Builders
 *
 * Fluent API for defining field types with validation.
 * Each builder provides chainable methods for configuration.
 */

import type {
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
  ValidationRule,
} from './types';

// ============================================================================
// Email and URL Regex Patterns
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/;

// ============================================================================
// String Field Builder
// ============================================================================

export class StringFieldBuilder {
  private config: StringFieldConfig = {
    type: 'string',
    validations: [],
  };

  required(): this {
    this.config.required = true;
    this.config.validations.push({ type: 'required' });
    return this;
  }

  email(): this {
    this.config.validations.push({
      type: 'email',
      message: 'Must be a valid email address',
    });
    this.config.pattern = EMAIL_REGEX;
    return this;
  }

  url(): this {
    this.config.validations.push({
      type: 'url',
      message: 'Must be a valid URL',
    });
    this.config.pattern = URL_REGEX;
    return this;
  }

  minLength(min: number): this {
    this.config.minLength = min;
    this.config.validations.push({
      type: 'minLength',
      value: min,
      message: `Must be at least ${min} characters`,
    });
    return this;
  }

  maxLength(max: number): this {
    this.config.maxLength = max;
    this.config.validations.push({
      type: 'maxLength',
      value: max,
      message: `Must be at most ${max} characters`,
    });
    return this;
  }

  pattern(regex: RegExp, message?: string): this {
    this.config.pattern = regex;
    this.config.validations.push({
      type: 'pattern',
      pattern: regex,
      message: message || 'Does not match required pattern',
    });
    return this;
  }

  default(value: string): this {
    this.config.default = value;
    return this;
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): StringFieldConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Number Field Builder
// ============================================================================

export class NumberFieldBuilder {
  private config: NumberFieldConfig = {
    type: 'number',
    validations: [],
  };

  required(): this {
    this.config.required = true;
    this.config.validations.push({ type: 'required' });
    return this;
  }

  min(value: number): this {
    this.config.min = value;
    this.config.validations.push({
      type: 'min',
      value,
      message: `Must be at least ${value}`,
    });
    return this;
  }

  max(value: number): this {
    this.config.max = value;
    this.config.validations.push({
      type: 'max',
      value,
      message: `Must be at most ${value}`,
    });
    return this;
  }

  integer(): this {
    this.config.integer = true;
    this.config.validations.push({
      type: 'integer',
      message: 'Must be an integer',
    });
    return this;
  }

  positive(): this {
    return this.min(0);
  }

  default(value: number): this {
    this.config.default = value;
    return this;
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): NumberFieldConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Boolean Field Builder
// ============================================================================

export class BooleanFieldBuilder {
  private config: BooleanFieldConfig = {
    type: 'boolean',
    validations: [],
  };

  required(): this {
    this.config.required = true;
    this.config.validations.push({ type: 'required' });
    return this;
  }

  default(value: boolean): this {
    this.config.default = value;
    return this;
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): BooleanFieldConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Datetime Field Builder
// ============================================================================

export class DatetimeFieldBuilder {
  private config: DatetimeFieldConfig = {
    type: 'datetime',
    validations: [],
  };

  required(): this {
    this.config.required = true;
    this.config.validations.push({ type: 'required' });
    return this;
  }

  default(value: string): this {
    this.config.default = value;
    return this;
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): DatetimeFieldConfig {
    return { ...this.config };
  }
}

// ============================================================================
// ID Field Builder
// ============================================================================

export class IdFieldBuilder {
  private config: IdFieldConfig = {
    type: 'id',
    validations: [],
  };

  prefix(value: string): this {
    this.config.prefix = value;
    return this;
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): IdFieldConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Enum Field Builder
// ============================================================================

export class EnumFieldBuilder<T extends readonly string[]> {
  private config: EnumFieldConfig<T>;

  constructor(values: T) {
    this.config = {
      type: 'enum',
      validations: [],
      values,
    };
  }

  required(): this {
    this.config.required = true;
    this.config.validations.push({ type: 'required' });
    return this;
  }

  default(value: T[number]): this {
    this.config.default = value;
    return this;
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): EnumFieldConfig<T> {
    return { ...this.config };
  }
}

// ============================================================================
// Array Field Builder
// ============================================================================

export class ArrayFieldBuilder<T = any> {
  private config: ArrayFieldConfig;

  constructor(itemType: T) {
    this.config = {
      type: 'array',
      validations: [],
      itemType,
    };
  }

  required(): this {
    this.config.required = true;
    this.config.validations.push({ type: 'required' });
    return this;
  }

  default(value: any[]): this {
    this.config.default = value;
    return this;
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): ArrayFieldConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Object Field Builder
// ============================================================================

export class ObjectFieldBuilder<T = any> {
  private config: ObjectFieldConfig;

  constructor(schema: T) {
    this.config = {
      type: 'object',
      validations: [],
      schema: schema as any,
    };
  }

  required(): this {
    this.config.required = true;
    this.config.validations.push({ type: 'required' });
    return this;
  }

  default(value: any): this {
    this.config.default = value;
    return this;
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): ObjectFieldConfig {
    return { ...this.config };
  }
}

// ============================================================================
// JSON Field Builder
// ============================================================================

export class JsonFieldBuilder {
  private config: JsonFieldConfig = {
    type: 'json',
    validations: [],
  };

  required(): this {
    this.config.required = true;
    this.config.validations.push({ type: 'required' });
    return this;
  }

  default(value: any): this {
    this.config.default = value;
    return this;
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): JsonFieldConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Binary Field Builder
// ============================================================================

export class BinaryFieldBuilder {
  private config: BinaryFieldConfig = {
    type: 'binary',
    validations: [],
  };

  required(): this {
    this.config.required = true;
    this.config.validations.push({ type: 'required' });
    return this;
  }

  maxSize(bytes: number): this {
    this.config.maxSizeBytes = bytes;
    return this;
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): BinaryFieldConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Field Type Factory (a namespace)
// ============================================================================

/**
 * Field type factory
 *
 * Provides fluent builders for all field types:
 * - a.string() - String fields with validation
 * - a.number() - Number fields with min/max
 * - a.boolean() - Boolean fields
 * - a.datetime() - ISO 8601 datetime strings
 * - a.id() - Auto-generated IDs
 * - a.enum() - Enumeration values
 * - a.array() - Arrays of any type
 * - a.object() - Nested objects
 * - a.json() - Arbitrary JSON
 * - a.binary() - Binary data (files, etc.)
 *
 * @example
 * ```typescript
 * email: a.string().required().email().maxLength(255)
 * age: a.number().min(0).max(120).integer()
 * role: a.enum(['user', 'admin']).default('user')
 * tags: a.array(a.string()).default([])
 * ```
 */
export const a = {
  /**
   * Create a string field
   */
  string: () => new StringFieldBuilder(),

  /**
   * Create a number field
   */
  number: () => new NumberFieldBuilder(),

  /**
   * Create a boolean field
   */
  boolean: () => new BooleanFieldBuilder(),

  /**
   * Create a datetime field (ISO 8601 format)
   */
  datetime: () => new DatetimeFieldBuilder(),

  /**
   * Create an ID field (auto-generated)
   */
  id: () => new IdFieldBuilder(),

  /**
   * Create an enum field with allowed values
   *
   * @param values - Array of allowed string values
   */
  enum: <T extends readonly string[]>(values: T) => new EnumFieldBuilder(values),

  /**
   * Create an array field
   *
   * @param itemType - Builder for array items
   */
  array: <T>(itemType: T) => new ArrayFieldBuilder(itemType),

  /**
   * Create an object field with nested schema
   *
   * @param schema - Object defining nested fields
   */
  object: <T>(schema: T) => new ObjectFieldBuilder(schema),

  /**
   * Create a JSON field (arbitrary JSON data)
   */
  json: () => new JsonFieldBuilder(),

  /**
   * Create a binary field (for file uploads, etc.)
   */
  binary: () => new BinaryFieldBuilder(),

  /**
   * Create a schema (used in defineSchema)
   *
   * @param models - Object containing model definitions
   */
  schema: <T>(models: T): T => models,
};

// ============================================================================
// Type Exports
// ============================================================================

export type FieldBuilder =
  | StringFieldBuilder
  | NumberFieldBuilder
  | BooleanFieldBuilder
  | DatetimeFieldBuilder
  | IdFieldBuilder
  | EnumFieldBuilder<any>
  | ArrayFieldBuilder
  | ObjectFieldBuilder
  | JsonFieldBuilder
  | BinaryFieldBuilder;
