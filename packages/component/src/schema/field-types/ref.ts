/**
 * Reference field type builder
 *
 * @remarks
 * Provides reference field for relationships between models.
 * Stores the ID of another model as a foreign key.
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';

/**
 * Reference field configuration
 */
export interface RefFieldConfig extends BaseFieldConfig {
  type: 'ref';
  modelName: string;
  onDelete?: 'cascade' | 'set_null' | 'restrict';
}

/**
 * Reference field builder
 *
 * @remarks
 * Implements fluent API for defining reference fields.
 * References store the ID of another model for relationships.
 *
 * @example
 * ```typescript
 * // Basic reference
 * const userId = a.ref('User').required();
 *
 * // Reference with cascade delete
 * const projectId = a.ref('Project').onDelete('cascade');
 *
 * // Optional reference
 * const parentId = a.ref('Category').optional();
 * ```
 */
export class RefFieldBuilder extends BaseFieldBuilder<string, RefFieldConfig> {
  constructor(modelName: string) {
    super('ref');

    if (!modelName) {
      throw new Error('Reference field must specify a valid model name');
    }

    this.config.modelName = modelName;
  }

  /**
   * Set delete behavior
   *
   * @remarks
   * Defines what happens when the referenced model is deleted:
   * - 'cascade': Delete this record when referenced record is deleted
   * - 'set_null': Set this field to null when referenced record is deleted
   * - 'restrict': Prevent deletion of referenced record if this field references it
   *
   * @example
   * ```typescript
   * // Cascade delete comments when user is deleted
   * const userId = a.ref('User').onDelete('cascade');
   *
   * // Set to null when project is deleted
   * const projectId = a.ref('Project').onDelete('set_null').nullable();
   *
   * // Prevent deletion if referenced
   * const ownerId = a.ref('User').onDelete('restrict');
   * ```
   *
   * @param behavior - Delete behavior ('cascade', 'set_null', or 'restrict')
   */
  onDelete(behavior: 'cascade' | 'set_null' | 'restrict'): this {
    this.config.onDelete = behavior;

    if (behavior === 'set_null' && !this.config.isNullable) {
      // Auto-mark as nullable if set_null is specified
      this.nullable();
    }

    return this;
  }

  /**
   * Get referenced model name
   *
   * @remarks
   * Returns the name of the model this field references.
   *
   * @internal
   */
  getModelName(): string {
    return this.config.modelName;
  }

  /**
   * Validate ref field configuration
   *
   * @remarks
   * Validates ref field specific constraints.
   * Called automatically during build.
   *
   * @internal
   */
  protected validateFieldConfig(): void {
    // Call parent validation first
    super.validateFieldConfig();

    // Validate model name is not empty
    if (!this.config.modelName || this.config.modelName.trim() === '') {
      throw new Error('Reference field must specify a valid model name');
    }

    // Validate onDelete behavior with nullable
    if (this.config.onDelete === 'set_null' && !this.config.isNullable) {
      throw new Error(
        `Reference field with onDelete('set_null') must be nullable. ` +
          `Add .nullable() to this field or use a different onDelete behavior.`
      );
    }

    // Validate onDelete with required
    if (this.config.onDelete === 'set_null' && this.config.isRequired) {
      throw new Error(
        `Reference field cannot be both required and have onDelete('set_null'). ` +
          `Either remove .required() or use a different onDelete behavior.`
      );
    }
  }
}
