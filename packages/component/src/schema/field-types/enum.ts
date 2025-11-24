/**
 * Enum field type builder
 *
 * @remarks
 * Provides enum field for restricting values to a predefined set.
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';

/**
 * Enum field configuration
 */
export interface EnumFieldConfig<T extends readonly string[]> extends BaseFieldConfig {
  type: 'enum';
  values: T;
}

/**
 * Enum field builder
 *
 * @remarks
 * Implements fluent API for defining enum fields.
 * Values are restricted to a predefined set of strings.
 *
 * @example
 * ```typescript
 * // Basic enum
 * const status = a.enum(['pending', 'active', 'archived']);
 *
 * // With default value
 * const role = a.enum(['user', 'admin', 'analyst']).default('user');
 *
 * // Required enum
 * const priority = a.enum(['low', 'medium', 'high', 'critical']).required();
 * ```
 */
export class EnumFieldBuilder<T extends readonly string[]> extends BaseFieldBuilder<
  T[number],
  EnumFieldConfig<T>
> {
  constructor(values: T) {
    super('enum');

    if (!values || values.length === 0) {
      throw new Error('Enum must have at least one value');
    }

    this.config.values = values;

    // Add validation for allowed values
    const rule = {
      type: 'custom' as const,
      validator: (value: string) => values.includes(value),
      message: `Must be one of: ${values.join(', ')}`,
    };

    this.definition.validations.push(rule);
    this.config.validations = this.definition.validations;
  }

  /**
   * Get enum values
   *
   * @remarks
   * Returns the array of allowed enum values.
   *
   * @internal
   */
  getValues(): T {
    return this.config.values;
  }
}
