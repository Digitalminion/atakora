/**
 * Array field type builder
 *
 * @remarks
 * Provides array field for lists of items of a specific type.
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';

/**
 * Array field configuration
 */
export interface ArrayFieldConfig extends BaseFieldConfig {
  type: 'array';
  itemType: any; // Field builder for array items
  minItems?: number;
  maxItems?: number;
  unique?: boolean;
}

/**
 * Array field builder
 *
 * @remarks
 * Implements fluent API for defining array fields.
 * Arrays contain multiple values of a specified item type.
 *
 * @example
 * ```typescript
 * // Array of strings
 * const tags = a.array(a.string());
 *
 * // Array with constraints
 * const emails = a.array(a.string().email()).minItems(1).maxItems(5);
 *
 * // Array with default value
 * const categories = a.array(a.string()).default([]);
 *
 * // Array with unique items
 * const userIds = a.array(a.string()).unique();
 * ```
 */
export class ArrayFieldBuilder<T> extends BaseFieldBuilder<T[], ArrayFieldConfig> {
  constructor(itemType: T) {
    super('array');
    this.config.itemType = itemType;
  }

  /**
   * Set minimum number of items
   *
   * @remarks
   * Array must contain at least this many items.
   *
   * @example
   * ```typescript
   * const tags = a.array(a.string()).minItems(1); // At least one tag
   * ```
   *
   * @param value - Minimum number of items
   */
  minItems(value: number): this {
    this.config.minItems = value;
    this.config.validations.push({
      type: 'custom',
      validator: (arr: any[]) => arr.length >= value,
      message: `Must contain at least ${value} item${value !== 1 ? 's' : ''}`,
    });
    return this;
  }

  /**
   * Set maximum number of items
   *
   * @remarks
   * Array cannot contain more than this many items.
   *
   * @example
   * ```typescript
   * const tags = a.array(a.string()).maxItems(10); // Maximum 10 tags
   * ```
   *
   * @param value - Maximum number of items
   */
  maxItems(value: number): this {
    this.config.maxItems = value;
    this.config.validations.push({
      type: 'custom',
      validator: (arr: any[]) => arr.length <= value,
      message: `Must contain at most ${value} item${value !== 1 ? 's' : ''}`,
    });
    return this;
  }

  /**
   * Require unique items
   *
   * @remarks
   * Array items must be unique (no duplicates).
   *
   * @example
   * ```typescript
   * const userIds = a.array(a.string()).unique();
   * ```
   */
  unique(): this {
    this.config.unique = true;
    this.config.validations.push({
      type: 'custom',
      validator: (arr: any[]) => new Set(arr).size === arr.length,
      message: 'Array items must be unique',
    });
    return this;
  }

  /**
   * Require non-empty array
   *
   * @remarks
   * Convenience method for minItems(1).
   *
   * @example
   * ```typescript
   * const tags = a.array(a.string()).nonEmpty();
   * ```
   */
  nonEmpty(): this {
    return this.minItems(1);
  }

  /**
   * Get item type
   *
   * @remarks
   * Returns the field builder for array items.
   *
   * @internal
   */
  getItemType(): T {
    return this.config.itemType;
  }
}
