/**
 * Base field type builder
 *
 * @remarks
 * Provides common functionality for all field types including:
 * - Required/optional modifiers
 * - Default values
 * - Nullable support
 * - ReadOnly/Computed field support
 * - Type inference infrastructure
 */

import type {
  UnifiedFieldDefinition,
  UnifiedValidationRule,
  FieldType,
  FieldMetadata,
} from '../unified-types';
import { createUnifiedFieldDefinition } from '../unified-types';

/**
 * Validation rule types
 * @deprecated Use UnifiedValidationRule from unified-types instead
 */
export type ValidationRule = UnifiedValidationRule;

/**
 * Base field configuration
 * @deprecated Use UnifiedFieldDefinition from unified-types instead
 */
export interface BaseFieldConfig {
  type: string;
  validations: ValidationRule[];
  defaultValue?: any;
  isRequired?: boolean;
  isOptional?: boolean;
  isNullable?: boolean;
  isReadOnly?: boolean;
  isComputed?: boolean;
  computeFn?: () => any;
}

/**
 * Base field builder class (new unified version)
 *
 * @remarks
 * All field type builders extend this class to inherit common functionality.
 * Now produces UnifiedFieldDefinition directly for both schema and validation.
 */
export abstract class BaseFieldBuilder<TValue, TConfig extends BaseFieldConfig = BaseFieldConfig> {
  protected definition: UnifiedFieldDefinition<TValue>;

  // Keep legacy config for backward compatibility during migration
  protected config: TConfig;

  constructor(type: FieldType | string) {
    // Initialize unified definition
    this.definition = createUnifiedFieldDefinition<TValue>(type as FieldType);

    // Initialize legacy config for backward compatibility
    this.config = {
      type,
      validations: [],
    } as unknown as TConfig;
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
    // Remove any existing optional validation (last call wins)
    this.definition.validations = this.definition.validations.filter((v) => v.type !== 'optional');
    // Remove any existing required validation (allow re-calling required())
    this.definition.validations = this.definition.validations.filter((v) => v.type !== 'required');

    this.definition.required = true;
    this.definition.validations.push({ type: 'required', message: 'This field is required' });

    // Update legacy config
    this.config.isRequired = true;
    this.config.isOptional = false;
    this.config.validations = this.definition.validations;

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
    // Remove any existing required validation (last call wins)
    this.definition.validations = this.definition.validations.filter((v) => v.type !== 'required');
    // Remove any existing optional validation (allow re-calling optional())
    this.definition.validations = this.definition.validations.filter((v) => v.type !== 'optional');

    this.definition.required = false;
    this.definition.validations.push({ type: 'optional' });

    // Update legacy config
    this.config.isOptional = true;
    this.config.isRequired = false;
    this.config.validations = this.definition.validations;

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
    this.definition.nullable = true;
    this.definition.validations.push({ type: 'nullable' });

    // Update legacy config
    this.config.isNullable = true;
    this.config.validations = this.definition.validations;

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
    this.definition.default = value;

    // Update legacy config
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
    const rule: UnifiedValidationRule = {
      type: 'custom' as const,
      validator,
      message: message || 'Custom validation failed',
    };
    this.definition.validations.push(rule);

    // Update legacy config
    this.config.validations = this.definition.validations;

    return this;
  }

  /**
   * Mark field as read-only
   *
   * @remarks
   * Read-only fields cannot be modified after creation.
   * They are excluded from update operations.
   *
   * @example
   * ```typescript
   * const createdAt = a.datetime().readOnly();
   * const id = a.id().readOnly();
   * ```
   */
  readOnly(): this {
    if (!this.definition.metadata) {
      this.definition.metadata = {};
    }
    this.definition.metadata.readOnly = true;

    // Update legacy config
    this.config.isReadOnly = true;

    return this;
  }

  /**
   * Mark field as computed
   *
   * @remarks
   * Computed fields are calculated from other fields or external sources.
   * They are always read-only and cannot be set directly.
   *
   * @example
   * ```typescript
   * const fullName = a.string().computed(() => {
   *   return `${firstName} ${lastName}`;
   * });
   * ```
   *
   * @param computeFn - Function to compute the field value
   */
  computed(computeFn: () => TValue): this {
    if (!this.definition.metadata) {
      this.definition.metadata = {};
    }
    this.definition.metadata.computed = true;
    this.definition.metadata.readOnly = true; // Computed fields are always read-only
    this.definition.metadata.computeFn = computeFn;

    // Update legacy config
    this.config.isComputed = true;
    this.config.isReadOnly = true;
    this.config.computeFn = computeFn;

    return this;
  }

  /**
   * Mark field as deprecated
   *
   * @remarks
   * Deprecated fields generate warnings when used and can be removed in future versions.
   *
   * @example
   * ```typescript
   * const oldField = a.string().deprecated('Use newField instead');
   * const phoneField = a.string().deprecated('Use contactInfo.phone instead', '3.0.0');
   * ```
   *
   * @param message - Deprecation message explaining what to use instead
   * @param removeInVersion - Optional version when this field will be removed
   */
  deprecated(message: string, removeInVersion?: string): this {
    if (!this.definition.metadata) {
      this.definition.metadata = {};
    }
    this.definition.metadata.deprecated = true;
    this.definition.metadata.deprecationMessage = message;

    if (removeInVersion) {
      this.definition.metadata.removeInVersion = removeInVersion;
    }

    return this;
  }

  /**
   * Add field description
   *
   * @remarks
   * Provides human-readable description for documentation and API schemas.
   *
   * @example
   * ```typescript
   * const email = a.string().describe('User email address for login');
   * ```
   *
   * @param description - Field description
   */
  describe(description: string): this {
    if (!this.definition.metadata) {
      this.definition.metadata = {};
    }
    this.definition.metadata.description = description;

    return this;
  }

  /**
   * Add example value
   *
   * @remarks
   * Provides example value for documentation and testing.
   *
   * @example
   * ```typescript
   * const email = a.string().example('user@example.com');
   * ```
   *
   * @param example - Example value
   */
  example(example: TValue): this {
    if (!this.definition.metadata) {
      this.definition.metadata = {};
    }
    this.definition.metadata.example = example;

    return this;
  }

  /**
   * Validate field configuration
   *
   * @remarks
   * Checks for conflicting modifiers and invalid configurations.
   * Called automatically during build.
   *
   * @internal
   */
  protected validateFieldConfig(): void {
    const metadata = this.definition.metadata || {};

    // Check for conflicting required/optional modifiers
    const hasRequired = this.definition.validations.some((v) => v.type === 'required');
    const hasOptional = this.definition.validations.some((v) => v.type === 'optional');
    if (hasRequired && hasOptional) {
      throw new Error(
        `Field cannot be both required and optional. Use either .required() or .optional(), not both.`
      );
    }

    // Check for required + nullable conflict (warning, not error as it can be valid)
    if (this.definition.required && this.definition.nullable) {
      console.warn(
        `Field is marked as both required and nullable. This means the field must be present but can be null.`
      );
    }

    // Check that computed fields have a compute function
    if (metadata.computed && !metadata.computeFn) {
      throw new Error(
        `Computed field must have a compute function. Use .computed(() => value) to provide one.`
      );
    }

    // Check that default value is not used with computed fields
    if (metadata.computed && this.definition.default !== undefined) {
      throw new Error(
        `Computed fields cannot have default values. The value is always calculated by the compute function.`
      );
    }

    // Type-specific validation can be added in derived classes
  }

  /**
   * Build final unified field definition
   *
   * @remarks
   * Returns the UnifiedFieldDefinition that can be used directly
   * by both schema builders and the validation engine.
   *
   * @internal
   */
  _buildUnified(): UnifiedFieldDefinition<TValue> {
    this.validateFieldConfig();

    // Sync legacy config properties to unified definition
    this.syncLegacyToUnified();

    return this.definition;
  }

  /**
   * Sync legacy config to unified definition
   *
   * @internal
   */
  protected syncLegacyToUnified(): void {
    // Sync basic properties
    this.definition.type = this.config.type as FieldType;
    this.definition.default = this.config.defaultValue;

    // Sync required/optional/nullable from config if not already set
    if (this.config.isRequired !== undefined) {
      this.definition.required = this.config.isRequired;
    }
    if (this.config.isNullable !== undefined) {
      this.definition.nullable = this.config.isNullable;
    }

    // Sync metadata
    if (this.config.isReadOnly || this.config.isComputed || this.config.computeFn) {
      if (!this.definition.metadata) {
        this.definition.metadata = {};
      }
      if (this.config.isReadOnly !== undefined) {
        this.definition.metadata.readOnly = this.config.isReadOnly;
      }
      if (this.config.isComputed !== undefined) {
        this.definition.metadata.computed = this.config.isComputed;
      }
      if (this.config.computeFn !== undefined) {
        this.definition.metadata.computeFn = this.config.computeFn;
      }
    }
  }

  /**
   * Build final configuration (legacy compatibility)
   *
   * @deprecated Use _buildUnified() instead
   * @internal
   */
  _build(): TConfig {
    // Build unified definition first
    const unified = this._buildUnified();

    // Update legacy config from unified definition
    this.config.type = unified.type;
    this.config.validations = unified.validations;
    this.config.defaultValue = unified.default;
    this.config.isRequired = unified.required;
    this.config.isOptional = !unified.required;
    // Only set isNullable if it was explicitly set to true
    if (unified.nullable) {
      this.config.isNullable = true;
    }

    // Also include unified property names for compatibility
    (this.config as any).required = unified.required;
    (this.config as any).nullable = unified.nullable;
    (this.config as any).default = unified.default;

    if (unified.metadata) {
      this.config.isReadOnly = unified.metadata.readOnly;
      this.config.isComputed = unified.metadata.computed;
      this.config.computeFn = unified.metadata.computeFn;

      // Include metadata in config
      (this.config as any).metadata = unified.metadata;
    }

    return this.config;
  }

  /**
   * Get field type for type inference (internal use)
   *
   * @internal
   */
  _getType(): string {
    return this.definition.type;
  }
}
