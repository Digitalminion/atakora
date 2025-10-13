/**
 * Configuration validation framework for the Backend pattern.
 *
 * This module provides comprehensive validation utilities for ensuring
 * configurations are valid, compatible, and meet all constraints.
 *
 * @module @atakora/component/backend/merger/validators
 */

import type { MergeContext } from './strategies';

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  /**
   * Whether the validation passed.
   */
  readonly valid: boolean;

  /**
   * Error messages if validation failed.
   */
  readonly errors?: ReadonlyArray<ValidationError>;

  /**
   * Warning messages (non-fatal issues).
   */
  readonly warnings?: ReadonlyArray<string>;

  /**
   * Additional metadata about the validation.
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Validation error with context.
 */
export interface ValidationError {
  /**
   * Error message.
   */
  readonly message: string;

  /**
   * Path to the property that failed validation.
   */
  readonly path: string;

  /**
   * Source component that provided the invalid value.
   */
  readonly source?: string;

  /**
   * The actual value that failed validation.
   */
  readonly actualValue?: unknown;

  /**
   * The expected value or constraint.
   */
  readonly expected?: string;

  /**
   * Error code for programmatic handling.
   */
  readonly code?: string;
}

/**
 * Configuration conflict details.
 */
export interface ConfigConflict {
  /**
   * Path to the conflicting property.
   */
  readonly path: string;

  /**
   * Conflicting values from different sources.
   */
  readonly values: ReadonlyArray<{
    readonly value: unknown;
    readonly source: string;
    readonly priority: number;
  }>;

  /**
   * Type of conflict.
   */
  readonly conflictType: 'value' | 'type' | 'incompatible' | 'limit-exceeded';

  /**
   * Suggested resolution strategy.
   */
  readonly suggestedStrategy?: string;

  /**
   * Whether this conflict can be automatically resolved.
   */
  readonly resolvable: boolean;

  /**
   * Additional context about the conflict.
   */
  readonly reason?: string;
}

/**
 * Validator function type.
 */
export type ValidatorFn<T = unknown> = (
  value: T,
  context: ValidationContext
) => ValidationResult;

/**
 * Context provided to validators.
 */
export interface ValidationContext {
  /**
   * Path to the value being validated.
   */
  readonly path: string;

  /**
   * Source component ID.
   */
  readonly source: string;

  /**
   * Full configuration object for cross-field validation.
   */
  readonly fullConfig?: Record<string, unknown>;

  /**
   * Additional metadata.
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Schema definition for configuration validation.
 */
export interface ConfigSchema<T = unknown> {
  /**
   * Type of the configuration value.
   */
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';

  /**
   * Whether this field is required.
   */
  readonly required?: boolean;

  /**
   * Allowed enum values (for enum type).
   */
  readonly enum?: ReadonlyArray<T>;

  /**
   * Schema for array items (for array type).
   */
  readonly items?: ConfigSchema;

  /**
   * Schema for object properties (for object type).
   */
  readonly properties?: Record<string, ConfigSchema>;

  /**
   * Additional validators.
   */
  readonly validators?: ReadonlyArray<ValidatorFn<T>>;

  /**
   * Default value if not provided.
   */
  readonly default?: T;

  /**
   * Human-readable description.
   */
  readonly description?: string;

  /**
   * Examples of valid values.
   */
  readonly examples?: ReadonlyArray<T>;
}

/**
 * Conflict detector that identifies incompatible configurations.
 */
export class ConflictDetector {
  /**
   * Detect conflicts in merged configurations.
   *
   * @param values Values from different sources
   * @param context Merge context
   * @returns Array of detected conflicts
   */
  detectConflicts<T>(
    values: ReadonlyArray<T>,
    context: MergeContext
  ): ReadonlyArray<ConfigConflict> {
    const conflicts: ConfigConflict[] = [];

    if (values.length < 2) {
      return conflicts;
    }

    // Check for value conflicts (different non-undefined values)
    const uniqueValues = new Map<string, { value: T; source: string; priority: number }[]>();

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (value === undefined) continue;

      const key = JSON.stringify(value);
      const entry = {
        value,
        source: context.sources[i],
        priority: context.priorities[i]
      };

      if (!uniqueValues.has(key)) {
        uniqueValues.set(key, []);
      }
      uniqueValues.get(key)!.push(entry);
    }

    // If we have multiple different values, that's a conflict
    if (uniqueValues.size > 1) {
      const allEntries: Array<{ value: unknown; source: string; priority: number }> = [];
      for (const entries of uniqueValues.values()) {
        allEntries.push(...entries);
      }

      // Check if all priorities are the same (unresolvable conflict)
      const priorities = allEntries.map(e => e.priority);
      const allSamePriority = priorities.every(p => p === priorities[0]);

      conflicts.push({
        path: context.path,
        values: allEntries,
        conflictType: 'value',
        suggestedStrategy: allSamePriority ? 'manual-resolution' : 'priority',
        resolvable: !allSamePriority,
        reason: allSamePriority
          ? `Multiple sources with same priority (${priorities[0]}) have different values`
          : `Values differ but can be resolved by priority`
      });
    }

    return conflicts;
  }

  /**
   * Detect type conflicts (incompatible types).
   *
   * @param values Values to check
   * @param context Merge context
   * @returns Type conflicts if found
   */
  detectTypeConflicts(
    values: ReadonlyArray<unknown>,
    context: MergeContext
  ): ReadonlyArray<ConfigConflict> {
    const conflicts: ConfigConflict[] = [];

    if (values.length < 2) {
      return conflicts;
    }

    const types = values.map(v => {
      if (v === null) return 'null';
      if (Array.isArray(v)) return 'array';
      return typeof v;
    });

    const uniqueTypes = new Set(types.filter(t => t !== 'undefined'));

    if (uniqueTypes.size > 1) {
      conflicts.push({
        path: context.path,
        values: values.map((value, i) => ({
          value,
          source: context.sources[i],
          priority: context.priorities[i]
        })),
        conflictType: 'type',
        resolvable: false,
        reason: `Incompatible types: ${Array.from(uniqueTypes).join(', ')}`,
        suggestedStrategy: 'manual-resolution'
      });
    }

    return conflicts;
  }

  /**
   * Detect incompatible feature combinations.
   *
   * @param config Full configuration object
   * @param incompatibilityRules Rules defining incompatible combinations
   * @returns Incompatibility conflicts
   */
  detectIncompatibilities(
    config: Record<string, unknown>,
    incompatibilityRules: ReadonlyArray<IncompatibilityRule>
  ): ReadonlyArray<ConfigConflict> {
    const conflicts: ConfigConflict[] = [];

    for (const rule of incompatibilityRules) {
      if (rule.condition(config)) {
        conflicts.push({
          path: rule.path,
          values: rule.conflictingPaths.map(path => ({
            value: this.getNestedValue(config, path),
            source: 'merged-config',
            priority: 0
          })),
          conflictType: 'incompatible',
          resolvable: false,
          reason: rule.reason,
          suggestedStrategy: rule.suggestion
        });
      }
    }

    return conflicts;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}

/**
 * Rule for detecting incompatible configurations.
 */
export interface IncompatibilityRule {
  /**
   * Primary path where the conflict is detected.
   */
  readonly path: string;

  /**
   * Related paths involved in the incompatibility.
   */
  readonly conflictingPaths: ReadonlyArray<string>;

  /**
   * Function that returns true if the incompatibility exists.
   */
  readonly condition: (config: Record<string, unknown>) => boolean;

  /**
   * Human-readable reason for the incompatibility.
   */
  readonly reason: string;

  /**
   * Suggested resolution.
   */
  readonly suggestion?: string;
}

/**
 * Validator for ensuring configurations meet Azure resource constraints.
 */
export class ConfigValidator {
  private readonly schemas = new Map<string, ConfigSchema>();
  private readonly customValidators = new Map<string, ValidatorFn[]>();

  /**
   * Register a schema for a configuration path.
   *
   * @param path Configuration path
   * @param schema Schema definition
   */
  registerSchema(path: string, schema: ConfigSchema): void {
    this.schemas.set(path, schema);
  }

  /**
   * Register a custom validator for a path.
   *
   * @param path Configuration path
   * @param validator Validator function
   */
  registerValidator(path: string, validator: ValidatorFn): void {
    if (!this.customValidators.has(path)) {
      this.customValidators.set(path, []);
    }
    this.customValidators.get(path)!.push(validator);
  }

  /**
   * Validate a configuration value against its schema.
   *
   * @param value Value to validate
   * @param schema Schema to validate against
   * @param context Validation context
   * @returns Validation result
   */
  validateAgainstSchema<T>(
    value: T,
    schema: ConfigSchema<T>,
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Required check
    if (schema.required && (value === undefined || value === null)) {
      errors.push({
        message: `Required field is missing`,
        path: context.path,
        source: context.source,
        expected: `Non-null value of type ${schema.type}`,
        code: 'REQUIRED_FIELD_MISSING'
      });
      return { valid: false, errors };
    }

    // Skip validation if value is undefined and not required
    if (value === undefined || value === null) {
      return { valid: true };
    }

    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (schema.type === 'enum') {
      if (!schema.enum?.includes(value)) {
        errors.push({
          message: `Value is not a valid enum value`,
          path: context.path,
          source: context.source,
          actualValue: value,
          expected: `One of: ${schema.enum?.join(', ')}`,
          code: 'INVALID_ENUM_VALUE'
        });
      }
    } else if (actualType !== schema.type) {
      errors.push({
        message: `Type mismatch`,
        path: context.path,
        source: context.source,
        actualValue: value,
        expected: `Type: ${schema.type}`,
        code: 'TYPE_MISMATCH'
      });
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value) && schema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemResult = this.validateAgainstSchema(
          value[i],
          schema.items,
          { ...context, path: `${context.path}[${i}]` }
        );
        if (!itemResult.valid) {
          errors.push(...(itemResult.errors || []));
        }
        if (itemResult.warnings) {
          warnings.push(...itemResult.warnings);
        }
      }
    }

    // Object validation
    if (schema.type === 'object' && typeof value === 'object' && schema.properties) {
      const obj = value as Record<string, unknown>;
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propResult = this.validateAgainstSchema(
          obj[key],
          propSchema,
          { ...context, path: `${context.path}.${key}` }
        );
        if (!propResult.valid) {
          errors.push(...(propResult.errors || []));
        }
        if (propResult.warnings) {
          warnings.push(...propResult.warnings);
        }
      }
    }

    // Custom validators
    if (schema.validators) {
      for (const validator of schema.validators) {
        const result = validator(value, context);
        if (!result.valid) {
          errors.push(...(result.errors || []));
        }
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate a full configuration object.
   *
   * @param config Configuration to validate
   * @param context Validation context
   * @returns Validation result
   */
  validate(
    config: Record<string, unknown>,
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate against registered schemas
    for (const [path, schema] of this.schemas) {
      const value = this.getNestedValue(config, path);
      const result = this.validateAgainstSchema(value, schema, {
        ...context,
        path,
        fullConfig: config
      });

      if (!result.valid) {
        errors.push(...(result.errors || []));
      }
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    }

    // Run custom validators
    for (const [path, validators] of this.customValidators) {
      const value = this.getNestedValue(config, path);
      for (const validator of validators) {
        const result = validator(value, {
          ...context,
          path,
          fullConfig: config
        });

        if (!result.valid) {
          errors.push(...(result.errors || []));
        }
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}

/**
 * Common validators for Azure resources.
 */
export const AzureValidators = {
  /**
   * Validates Azure resource name constraints.
   * - Length: 1-260 characters (configurable)
   * - Pattern: alphanumeric, hyphens, underscores, periods
   * - No consecutive special characters
   * - Must start and end with alphanumeric
   */
  resourceName(minLength = 1, maxLength = 260): ValidatorFn<string> {
    return (value: string, context: ValidationContext): ValidationResult => {
      const errors: ValidationError[] = [];

      if (value.length < minLength || value.length > maxLength) {
        errors.push({
          message: `Resource name length must be between ${minLength} and ${maxLength} characters`,
          path: context.path,
          source: context.source,
          actualValue: value,
          expected: `Length: ${minLength}-${maxLength}`,
          code: 'INVALID_LENGTH'
        });
      }

      const pattern = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;
      if (!pattern.test(value)) {
        errors.push({
          message: `Resource name must start and end with alphanumeric, contain only alphanumeric, hyphens, underscores, and periods`,
          path: context.path,
          source: context.source,
          actualValue: value,
          expected: 'Pattern: ^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$',
          code: 'INVALID_PATTERN'
        });
      }

      return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    };
  },

  /**
   * Validates storage account name constraints.
   * - Length: 3-24 characters
   * - Lowercase letters and numbers only
   * - Globally unique
   */
  storageAccountName(): ValidatorFn<string> {
    return (value: string, context: ValidationContext): ValidationResult => {
      const errors: ValidationError[] = [];

      if (value.length < 3 || value.length > 24) {
        errors.push({
          message: `Storage account name must be 3-24 characters`,
          path: context.path,
          source: context.source,
          actualValue: value,
          expected: 'Length: 3-24',
          code: 'INVALID_LENGTH'
        });
      }

      const pattern = /^[a-z0-9]+$/;
      if (!pattern.test(value)) {
        errors.push({
          message: `Storage account name must contain only lowercase letters and numbers`,
          path: context.path,
          source: context.source,
          actualValue: value,
          expected: 'Pattern: lowercase letters and numbers only',
          code: 'INVALID_PATTERN'
        });
      }

      return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    };
  },

  /**
   * Validates that a number is within a specified range.
   */
  numberRange(min: number, max: number): ValidatorFn<number> {
    return (value: number, context: ValidationContext): ValidationResult => {
      const errors: ValidationError[] = [];

      if (value < min || value > max) {
        errors.push({
          message: `Value must be between ${min} and ${max}`,
          path: context.path,
          source: context.source,
          actualValue: value,
          expected: `Range: ${min}-${max}`,
          code: 'OUT_OF_RANGE'
        });
      }

      return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    };
  },

  /**
   * Validates array length constraints.
   */
  arrayLength(min: number, max: number): ValidatorFn<unknown[]> {
    return (value: unknown[], context: ValidationContext): ValidationResult => {
      const errors: ValidationError[] = [];

      if (value.length < min || value.length > max) {
        errors.push({
          message: `Array length must be between ${min} and ${max}`,
          path: context.path,
          source: context.source,
          actualValue: value.length,
          expected: `Length: ${min}-${max}`,
          code: 'INVALID_LENGTH'
        });
      }

      return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    };
  },

  /**
   * Validates that a string matches a regex pattern.
   */
  pattern(regex: RegExp, description: string): ValidatorFn<string> {
    return (value: string, context: ValidationContext): ValidationResult => {
      const errors: ValidationError[] = [];

      if (!regex.test(value)) {
        errors.push({
          message: `Value does not match required pattern: ${description}`,
          path: context.path,
          source: context.source,
          actualValue: value,
          expected: description,
          code: 'INVALID_PATTERN'
        });
      }

      return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    };
  }
};
