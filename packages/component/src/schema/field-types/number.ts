/**
 * Number field type builder
 *
 * @remarks
 * Provides number field with common validation options:
 * - Min/max constraints
 * - Integer validation
 * - Positive/negative constraints
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';

/**
 * Number field configuration
 */
export interface NumberFieldConfig extends BaseFieldConfig {
  type: 'number';
  min?: number;
  max?: number;
  isInteger?: boolean;
  isPositive?: boolean;
  isNegative?: boolean;
}

/**
 * Number field builder
 *
 * @remarks
 * Implements fluent API for defining number fields with validation.
 *
 * @example
 * ```typescript
 * // Basic number
 * const count = a.number().required();
 *
 * // With min/max constraints
 * const age = a.number().min(0).max(120);
 *
 * // Integer only
 * const quantity = a.number().integer().positive();
 *
 * // Price (positive decimal)
 * const price = a.number().positive().min(0.01);
 * ```
 */
export class NumberFieldBuilder extends BaseFieldBuilder<number, NumberFieldConfig> {
  constructor() {
    super('number');
  }

  /**
   * Set minimum value
   *
   * @remarks
   * Number must be greater than or equal to this value.
   *
   * @example
   * ```typescript
   * const age = a.number().min(0); // Non-negative
   * const temperature = a.number().min(-273.15); // Above absolute zero
   * ```
   *
   * @param value - Minimum value (inclusive)
   */
  min(value: number): this {
    this.config.min = value;
    this.config.validations.push({
      type: 'min',
      value,
      message: `Must be at least ${value}`,
    });
    return this;
  }

  /**
   * Set maximum value
   *
   * @remarks
   * Number must be less than or equal to this value.
   *
   * @example
   * ```typescript
   * const age = a.number().max(120);
   * const percentage = a.number().min(0).max(100);
   * ```
   *
   * @param value - Maximum value (inclusive)
   */
  max(value: number): this {
    this.config.max = value;
    this.config.validations.push({
      type: 'max',
      value,
      message: `Must be at most ${value}`,
    });
    return this;
  }

  /**
   * Require integer values only
   *
   * @remarks
   * Number must be a whole number (no decimals).
   *
   * @example
   * ```typescript
   * const quantity = a.number().integer();
   * const year = a.number().integer().min(1900).max(2100);
   * ```
   */
  integer(): this {
    this.config.isInteger = true;
    this.config.validations.push({
      type: 'integer',
      message: 'Must be an integer (whole number)',
    });
    return this;
  }

  /**
   * Require positive values only
   *
   * @remarks
   * Number must be greater than zero.
   *
   * @example
   * ```typescript
   * const price = a.number().positive();
   * const quantity = a.number().integer().positive();
   * ```
   */
  positive(): this {
    this.config.isPositive = true;
    this.config.validations.push({
      type: 'positive',
      message: 'Must be a positive number',
    });
    return this;
  }

  /**
   * Require negative values only
   *
   * @remarks
   * Number must be less than zero.
   *
   * @example
   * ```typescript
   * const debt = a.number().negative();
   * ```
   */
  negative(): this {
    this.config.isNegative = true;
    this.config.validations.push({
      type: 'negative',
      message: 'Must be a negative number',
    });
    return this;
  }

  /**
   * Alias for positive() - require non-negative values
   *
   * @remarks
   * Number must be greater than or equal to zero.
   *
   * @example
   * ```typescript
   * const age = a.number().nonNegative();
   * ```
   */
  nonNegative(): this {
    return this.min(0);
  }

  /**
   * Alias for negative() - require non-positive values
   *
   * @remarks
   * Number must be less than or equal to zero.
   *
   * @example
   * ```typescript
   * const balance = a.number().nonPositive(); // Debt balance
   * ```
   */
  nonPositive(): this {
    return this.max(0);
  }
}
