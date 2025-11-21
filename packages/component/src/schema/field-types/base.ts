/**
 * Base field type builder
 *
 * @remarks
 * Provides common functionality for all field types including:
 * - Required/optional modifiers
 * - Default values
 * - Nullable support
 * - Type inference infrastructure
 */

/**
 * Validation rule types
 */
export type ValidationRule =
  | { type: 'required'; message?: string }
  | { type: 'optional'; message?: string }
  | { type: 'nullable'; message?: string }
  | { type: 'pattern'; pattern: RegExp; message?: string }
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'maxLength'; value: number; message?: string }
  | { type: 'min'; value: number; message?: string }
  | { type: 'max'; value: number; message?: string }
  | { type: 'integer'; message?: string }
  | { type: 'positive'; message?: string }
  | { type: 'negative'; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'url'; message?: string }
  | { type: 'regex'; pattern: RegExp; message?: string }
  | { type: 'custom'; validator: (value: any) => boolean; message?: string };

/**
 * Base field configuration
 */
export interface BaseFieldConfig {
  type: string;
  validations: ValidationRule[];
  defaultValue?: any;
  isRequired?: boolean;
  isOptional?: boolean;
  isNullable?: boolean;
}

/**
 * Base field builder class
 *
 * @remarks
 * All field type builders extend this class to inherit common functionality.
 * Implements the builder pattern for fluent API design.
 */
export abstract class BaseFieldBuilder<TValue, TConfig extends BaseFieldConfig = BaseFieldConfig> {
  protected config: TConfig;

  constructor(type: string) {
    this.config = {
      type,
      validations: [],
    } as TConfig;
  }

  /**
   * Mark field as required
   *
   * @remarks
   * Required fields must be provided when creating/updating records.
   *
   * @example
   * ```typescript
   * const email = a.string().required();
   * ```
   */
  required(): this {
    this.config.isRequired = true;
    this.config.isOptional = false;
    this.config.validations.push({ type: 'required', message: 'This field is required' });
    return this;
  }

  /**
   * Mark field as optional
   *
   * @remarks
   * Optional fields can be omitted when creating/updating records.
   * This is the default behavior.
   *
   * @example
   * ```typescript
   * const middleName = a.string().optional();
   * ```
   */
  optional(): this {
    this.config.isOptional = true;
    this.config.isRequired = false;
    this.config.validations.push({ type: 'optional' });
    return this;
  }

  /**
   * Allow null values
   *
   * @remarks
   * By default, fields do not accept null. Use this to explicitly allow null.
   *
   * @example
   * ```typescript
   * const deletedAt = a.datetime().nullable();
   * ```
   */
  nullable(): this {
    this.config.isNullable = true;
    this.config.validations.push({ type: 'nullable' });
    return this;
  }

  /**
   * Set default value for field
   *
   * @remarks
   * Default value is used when field is not provided during creation.
   *
   * @example
   * ```typescript
   * const status = a.string().default('pending');
   * const isActive = a.boolean().default(true);
   * ```
   *
   * @param value - The default value
   */
  default(value: TValue): this {
    this.config.defaultValue = value;
    return this;
  }

  /**
   * Add custom validation rule
   *
   * @remarks
   * Allows adding custom validation logic beyond built-in validators.
   *
   * @example
   * ```typescript
   * const age = a.number()
   *   .custom((value) => value >= 18, 'Must be 18 or older');
   * ```
   *
   * @param validator - Custom validation function
   * @param message - Error message if validation fails
   */
  custom(validator: (value: TValue) => boolean, message?: string): this {
    this.config.validations.push({
      type: 'custom',
      validator,
      message: message || 'Custom validation failed',
    });
    return this;
  }

  /**
   * Build final configuration (internal use)
   *
   * @internal
   */
  _build(): TConfig {
    return this.config;
  }

  /**
   * Get field type for type inference (internal use)
   *
   * @internal
   */
  _getType(): string {
    return this.config.type;
  }
}
