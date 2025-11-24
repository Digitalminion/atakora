/**
 * Array field type builder
 *
 * @remarks
 * Provides array field for lists of items of a specific type.
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';
import type { UnifiedFieldDefinition } from '../unified-types';

/**
 * Array field configuration
 */
export interface ArrayFieldConfig extends BaseFieldConfig {
  type: 'array';
  itemType: any; // Field builder for array items (legacy)
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
 * Now stores item definitions directly instead of builders for better performance.
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
  constructor(itemType: any) {
    super('array');

    // If itemType is a field builder, build it immediately to get the definition
    if (itemType && typeof itemType === 'object' && '_buildUnified' in itemType) {
      // Store the definition directly in the unified structure
      this.definition.itemDefinition = itemType._buildUnified();
      // Keep builder in legacy config for backward compatibility
      this.config.itemType = itemType;
    } else if (itemType && typeof itemType === 'object' && '_build' in itemType) {
      // Fallback for legacy builders without _buildUnified
      const builtConfig = itemType._build();
      // Convert to unified definition
      this.definition.itemDefinition = {
        type: builtConfig.type,
        required: builtConfig.isRequired || false,
        nullable: builtConfig.isNullable || false,
        default: builtConfig.defaultValue,
        validations: builtConfig.validations || [],
      };
      this.config.itemType = itemType;
    } else {
      // Direct definition passed
      this.definition.itemDefinition = itemType;
      this.config.itemType = itemType;
    }
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
    this.definition.minItems = value;

    const rule = {
      type: 'custom' as const,
      validator: (arr: any[]) => arr.length >= value,
      message: `Must contain at least ${value} item${value !== 1 ? 's' : ''}`,
    };

    this.definition.validations.push(rule);
    this.config.validations = this.definition.validations;

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
    this.definition.maxItems = value;

    const rule = {
      type: 'custom' as const,
      validator: (arr: any[]) => arr.length <= value,
      message: `Must contain at most ${value} item${value !== 1 ? 's' : ''}`,
    };

    this.definition.validations.push(rule);
    this.config.validations = this.definition.validations;

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
   * const userIds = a.array(a.string()).unique(); // No duplicate IDs
   * ```
   */
  unique(): this {
    this.config.unique = true;
    this.definition.unique = true;

    const rule = {
      type: 'custom' as const,
      validator: (arr: any[]) => {
        const uniqueSet = new Set(arr.map((item) => JSON.stringify(item)));
        return uniqueSet.size === arr.length;
      },
      message: 'Array items must be unique',
    };

    this.definition.validations.push(rule);
    this.config.validations = this.definition.validations;

    return this;
  }

  /**
   * Alias for minItems(1) - require at least one item
   *
   * @remarks
   * Array must contain at least one item (cannot be empty).
   *
   * @example
   * ```typescript
   * const tags = a.array(a.string()).nonEmpty(); // At least one tag
   * ```
   */
  nonEmpty(): this {
    return this.minItems(1);
  }

  /**
   * Get the item type builder
   *
   * @remarks
   * Returns the field builder used for array items.
   *
   * @returns The item type builder
   */
  getItemType(): any {
    return this.config.itemType;
  }

  /**
   * Override syncLegacyToUnified to handle array-specific properties
   *
   * @internal
   */
  protected syncLegacyToUnified(): void {
    super.syncLegacyToUnified();

    // Sync array-specific properties
    if (this.config.minItems !== undefined) {
      this.definition.minItems = this.config.minItems;
    }
    if (this.config.maxItems !== undefined) {
      this.definition.maxItems = this.config.maxItems;
    }
    if (this.config.unique !== undefined) {
      this.definition.unique = this.config.unique;
    }

    // Ensure itemDefinition is set if we have itemType but no definition
    if (!this.definition.itemDefinition && this.config.itemType) {
      if (typeof this.config.itemType === 'object' && '_buildUnified' in this.config.itemType) {
        this.definition.itemDefinition = this.config.itemType._buildUnified();
      } else if (typeof this.config.itemType === 'object' && '_build' in this.config.itemType) {
        const builtConfig = this.config.itemType._build();
        this.definition.itemDefinition = {
          type: builtConfig.type,
          required: builtConfig.isRequired || false,
          nullable: builtConfig.isNullable || false,
          default: builtConfig.defaultValue,
          validations: builtConfig.validations || [],
        };
      }
    }
  }

  /**
   * Static helper for creating string arrays
   *
   * @example
   * ```typescript
   * const tags = ArrayFieldBuilder.stringArray().minItems(1);
   * ```
   */
  static stringArray(): ArrayFieldBuilder<string> {
    return new ArrayFieldBuilder({
      type: 'string' as const,
      required: false,
      nullable: false,
      validations: [],
    });
  }

  /**
   * Static helper for creating number arrays
   *
   * @example
   * ```typescript
   * const scores = ArrayFieldBuilder.numberArray().maxItems(10);
   * ```
   */
  static numberArray(): ArrayFieldBuilder<number> {
    return new ArrayFieldBuilder({
      type: 'number' as const,
      required: false,
      nullable: false,
      validations: [],
    });
  }

  /**
   * Static helper for creating boolean arrays
   *
   * @example
   * ```typescript
   * const flags = ArrayFieldBuilder.booleanArray();
   * ```
   */
  static booleanArray(): ArrayFieldBuilder<boolean> {
    return new ArrayFieldBuilder({
      type: 'boolean' as const,
      required: false,
      nullable: false,
      validations: [],
    });
  }
}
