/**
 * JSON field type builder
 *
 * @remarks
 * Provides JSON field for unstructured/dynamic data.
 * Use this for flexible data that doesn't have a fixed schema.
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';

/**
 * JSON field configuration
 */
export interface JsonFieldConfig extends BaseFieldConfig {
  type: 'json';
}

/**
 * JSON field builder
 *
 * @remarks
 * Implements fluent API for defining JSON fields.
 * JSON fields can store any valid JSON data without a predefined schema.
 *
 * Use `a.object()` if you have a known schema structure.
 * Use `a.json()` for truly dynamic/unstructured data.
 *
 * @example
 * ```typescript
 * // Dynamic metadata
 * const metadata = a.json().default({});
 *
 * // Optional JSON settings
 * const preferences = a.json().optional();
 *
 * // Required JSON config
 * const config = a.json().required();
 * ```
 */
export class JsonFieldBuilder extends BaseFieldBuilder<any, JsonFieldConfig> {
  constructor() {
    super('json');
  }

  /**
   * Validate JSON is an object (not array or primitive)
   *
   * @remarks
   * Ensures the JSON value is an object with key-value pairs.
   *
   * @example
   * ```typescript
   * const settings = a.json().objectOnly();
   * ```
   */
  objectOnly(): this {
    this.config.validations.push({
      type: 'custom',
      validator: (value: any) => {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      },
      message: 'Must be a JSON object',
    });
    return this;
  }

  /**
   * Validate JSON is an array
   *
   * @remarks
   * Ensures the JSON value is an array.
   *
   * @example
   * ```typescript
   * const data = a.json().arrayOnly();
   * ```
   */
  arrayOnly(): this {
    this.config.validations.push({
      type: 'custom',
      validator: (value: any) => Array.isArray(value),
      message: 'Must be a JSON array',
    });
    return this;
  }
}
