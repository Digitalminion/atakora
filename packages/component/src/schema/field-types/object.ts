/**
 * Object field type builder
 *
 * @remarks
 * Provides object field for nested structured data with defined schema.
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';

/**
 * Object field configuration
 */
export interface ObjectFieldConfig extends BaseFieldConfig {
  type: 'object';
  schema: Record<string, any>; // Schema definition for object properties
}

/**
 * Object field builder
 *
 * @remarks
 * Implements fluent API for defining object fields.
 * Objects have a defined schema for nested properties.
 *
 * @example
 * ```typescript
 * // Address object
 * const address = a.object({
 *   street: a.string().required(),
 *   city: a.string().required(),
 *   state: a.string().required(),
 *   zip: a.string().required(),
 * });
 *
 * // Nested settings object
 * const settings = a.object({
 *   theme: a.enum(['light', 'dark']).default('light'),
 *   notifications: a.object({
 *     email: a.boolean().default(true),
 *     sms: a.boolean().default(false),
 *   }),
 * }).default({});
 * ```
 */
export class ObjectFieldBuilder<T extends Record<string, any>> extends BaseFieldBuilder<T, ObjectFieldConfig> {
  constructor(schema: T) {
    super('object');

    if (!schema || typeof schema !== 'object') {
      throw new Error('Object field must have a schema definition');
    }

    this.config.schema = schema;
  }

  /**
   * Get object schema
   *
   * @remarks
   * Returns the schema definition for object properties.
   *
   * @internal
   */
  getSchema(): T {
    return this.config.schema as T;
  }
}
