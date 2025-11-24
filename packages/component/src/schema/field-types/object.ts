/**
 * Object field type builder
 *
 * @remarks
 * Provides object field for nested structured data with defined schema.
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';
import type { UnifiedFieldDefinition } from '../unified-types';

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
 * Now stores field definitions directly instead of builders for better performance.
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
export class ObjectFieldBuilder<T extends Record<string, any>> extends BaseFieldBuilder<
  T,
  ObjectFieldConfig
> {
  constructor(schema: T) {
    super('object');

    if (!schema || typeof schema !== 'object') {
      throw new Error('Object field must have a schema definition');
    }

    // Process schema to convert builders to definitions
    const processedSchema: Record<string, UnifiedFieldDefinition> = {};

    for (const [key, value] of Object.entries(schema)) {
      if (value && typeof value === 'object' && '_buildUnified' in value) {
        // Modern builder with unified support
        processedSchema[key] = value._buildUnified();
      } else if (value && typeof value === 'object' && '_build' in value) {
        // Legacy builder without unified support
        const builtConfig = value._build();
        processedSchema[key] = {
          type: builtConfig.type,
          required: builtConfig.isRequired || false,
          nullable: builtConfig.isNullable || false,
          default: builtConfig.defaultValue,
          validations: builtConfig.validations || [],
        };
      } else if (value && typeof value === 'object' && 'type' in value) {
        // Direct definition passed
        processedSchema[key] = value as UnifiedFieldDefinition;
      } else {
        throw new Error(`Invalid field definition for object property "${key}"`);
      }
    }

    // Store the processed definitions in the unified structure
    this.definition.schema = processedSchema;

    // Keep original schema in legacy config for backward compatibility
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

  /**
   * Get unified schema definitions
   *
   * @remarks
   * Returns the unified field definitions for object properties.
   *
   * @internal
   */
  getUnifiedSchema(): Record<string, UnifiedFieldDefinition> | undefined {
    return this.definition.schema;
  }

  /**
   * Override syncLegacyToUnified to handle object-specific properties
   *
   * @internal
   */
  protected syncLegacyToUnified(): void {
    super.syncLegacyToUnified();

    // Ensure schema is properly converted to unified definitions
    if (!this.definition.schema && this.config.schema) {
      const processedSchema: Record<string, UnifiedFieldDefinition> = {};

      for (const [key, value] of Object.entries(this.config.schema)) {
        if (value && typeof value === 'object' && '_buildUnified' in value) {
          processedSchema[key] = value._buildUnified();
        } else if (value && typeof value === 'object' && '_build' in value) {
          const builtConfig = value._build();
          processedSchema[key] = {
            type: builtConfig.type,
            required: builtConfig.isRequired || false,
            nullable: builtConfig.isNullable || false,
            default: builtConfig.defaultValue,
            validations: builtConfig.validations || [],
          };
        } else if (value && typeof value === 'object' && 'type' in value) {
          processedSchema[key] = value as UnifiedFieldDefinition;
        }
      }

      this.definition.schema = processedSchema;
    }
  }

  /**
   * Add a field to the object schema
   *
   * @remarks
   * Dynamically add a field after creation.
   *
   * @example
   * ```typescript
   * const person = a.object({
   *   name: a.string().required()
   * }).addField('age', a.number().min(0));
   * ```
   *
   * @param name - Field name
   * @param field - Field builder or definition
   */
  addField(name: string, field: any): this {
    let fieldDef: UnifiedFieldDefinition;

    if (field && typeof field === 'object' && '_buildUnified' in field) {
      fieldDef = field._buildUnified();
    } else if (field && typeof field === 'object' && '_build' in field) {
      const builtConfig = field._build();
      fieldDef = {
        type: builtConfig.type,
        required: builtConfig.isRequired || false,
        nullable: builtConfig.isNullable || false,
        default: builtConfig.defaultValue,
        validations: builtConfig.validations || [],
      };
    } else if (field && typeof field === 'object' && 'type' in field) {
      fieldDef = field as UnifiedFieldDefinition;
    } else {
      throw new Error(`Invalid field definition for "${name}"`);
    }

    // Add to unified schema
    if (!this.definition.schema) {
      this.definition.schema = {};
    }
    this.definition.schema[name] = fieldDef;

    // Add to legacy schema
    this.config.schema[name] = field;

    return this;
  }

  /**
   * Remove a field from the object schema
   *
   * @remarks
   * Dynamically remove a field after creation.
   *
   * @example
   * ```typescript
   * const person = a.object({
   *   name: a.string(),
   *   tempField: a.string()
   * }).removeField('tempField');
   * ```
   *
   * @param name - Field name to remove
   */
  removeField(name: string): this {
    if (this.definition.schema) {
      delete this.definition.schema[name];
    }
    delete this.config.schema[name];
    return this;
  }
}
