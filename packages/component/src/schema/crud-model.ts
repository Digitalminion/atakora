/**
 * CRUD Model Builder
 *
 * Builds CRUD (Create, Read, Update, Delete) models that automatically
 * generate REST APIs and database containers.
 */

import type { CrudModelConfig, AuthorizationRule } from './types';
import type { AuthorizationRulesFn } from './authorization';
import { AuthorizationBuilder } from './authorization';
import { processFields } from './utils';
import { registerRefValidation } from './ref-validation';

// ============================================================================
// CRUD Model Builder
// ============================================================================

/**
 * CRUD model builder
 *
 * Creates a database-backed REST API with full CRUD operations.
 *
 * Auto-generates:
 * - POST /api/{model-name}
 * - GET /api/{model-name}/:id
 * - PUT /api/{model-name}/:id
 * - DELETE /api/{model-name}/:id
 * - GET /api/{model-name} (list with filtering, pagination, sorting)
 * - Cosmos DB container
 * - TypeScript types
 *
 * @example
 * ```typescript
 * User: c.model({
 *   id: a.id(),
 *   email: a.string().required().email(),
 *   name: a.string().required(),
 * })
 *   .authorization(allow => [
 *     allow.owner('id'),
 *     allow.groups(['admin']).all(),
 *   ])
 *   .indexes(['email'])
 * ```
 */
export class CrudModelBuilder<T = any> {
  public readonly _config: CrudModelConfig<T>;
  private modelName?: string;

  constructor(fields: T) {
    this._config = {
      type: 'crud',
      fields: processFields(fields),
      authorization: [],
      indexes: [],
      partitionKey: 'id',
      timestamps: false,
      softDelete: false,
    };
  }

  /**
   * Set model name (used for ref validation)
   *
   * @internal
   */
  _setModelName(name: string): this {
    this.modelName = name;
    return this;
  }

  /**
   * Define authorization rules
   *
   * @param rules - Function that receives authorization builder
   *
   * @example
   * ```typescript
   * .authorization(allow => [
   *   allow.owner('userId'),
   *   allow.groups(['admin']).all(),
   * ])
   * ```
   */
  authorization(rules: AuthorizationRulesFn): this {
    const builder = new AuthorizationBuilder();
    const rawRules = rules(builder);

    // Process rules - convert any rule builders to rules
    this._config.authorization = rawRules.map((rule) => {
      // If it's a rule builder (has _build method), convert it
      if (rule && typeof rule === 'object' && '_build' in rule) {
        return (rule as any)._build();
      }
      return rule;
    });

    return this;
  }

  /**
   * Define database indexes
   *
   * @param fields - Array of field names to index
   *
   * @example
   * ```typescript
   * .indexes(['email', 'organizationId', 'status'])
   * ```
   */
  indexes(fields: string[]): this {
    this._config.indexes = fields;
    return this;
  }

  /**
   * Define partition key for Cosmos DB
   *
   * @param field - Field name to use as partition key
   *
   * @example
   * ```typescript
   * .partitionKey('organizationId')
   * ```
   */
  partitionKey(field: string): this {
    this._config.partitionKey = field;
    return this;
  }

  /**
   * Enable automatic timestamps (createdAt, updatedAt)
   *
   * @param enable - Whether to enable timestamps
   *
   * @example
   * ```typescript
   * .timestamps(true)
   * ```
   */
  timestamps(enable: boolean): this {
    this._config.timestamps = enable;
    return this;
  }

  /**
   * Enable soft delete (marks records as deleted instead of removing)
   *
   * @param enable - Whether to enable soft delete
   *
   * @example
   * ```typescript
   * .softDelete(true)
   * ```
   */
  softDelete(enable: boolean): this {
    this._config.softDelete = enable;
    return this;
  }

  /**
   * Validate model configuration
   *
   * @internal
   * Checks for invalid configurations and throws descriptive errors
   */
  private validate(): void {
    const fields = this._config.fields;
    const fieldCount = Object.keys(fields).length;

    // Validate against reserved Cosmos DB field names
    const reservedFields = ['__typename', '_id', '_etag', '_rid', '_self', '_ts', '_attachments'];
    for (const fieldName of Object.keys(fields)) {
      if (reservedFields.includes(fieldName)) {
        throw new Error(
          `Field name "${fieldName}" is reserved for Cosmos DB system fields. ` +
            `Reserved names: ${reservedFields.join(', ')}`
        );
      }
    }

    // Check if all fields are computed or readonly (no real data fields)
    const hasNonComputedFields = Object.values(fields).some(
      (field) => !field.isComputed && !field.isReadOnly
    );

    // Validate partition key exists in fields (skip for empty models or computed-only models)
    if (
      fieldCount > 0 &&
      hasNonComputedFields &&
      this._config.partitionKey &&
      !fields[this._config.partitionKey]
    ) {
      throw new Error(
        `Partition key field "${this._config.partitionKey}" does not exist in model. ` +
          `Available fields: ${Object.keys(fields).join(', ')}`
      );
    }

    // Validate index fields exist
    for (const indexField of this._config.indexes) {
      if (!fields[indexField]) {
        throw new Error(
          `Index field "${indexField}" does not exist in model. ` +
            `Available fields: ${Object.keys(fields).join(', ')}`
        );
      }
    }

    // Validate authorization field references
    for (const rule of this._config.authorization) {
      if (rule.type === 'owner' && 'field' in rule) {
        const ownerField = rule.field;
        if (ownerField && !fields[ownerField]) {
          throw new Error(
            `Authorization owner field "${ownerField}" does not exist in model. ` +
              `Available fields: ${Object.keys(fields).join(', ')}`
          );
        }
      }
    }

    // Validate soft delete compatibility with nullable fields
    if (this._config.softDelete) {
      // When soft delete is enabled, we'll add a deletedAt field automatically
      // No specific validation needed here, but we could check for conflicts
    }

    // Validate timestamps compatibility
    if (this._config.timestamps) {
      // Check if user already defined createdAt or updatedAt
      if (fields['createdAt'] && !fields['createdAt'].isReadOnly) {
        console.warn(
          'Model has timestamps enabled and defines a "createdAt" field. ' +
            'Consider marking it as .readOnly() to prevent manual updates.'
        );
      }
      if (fields['updatedAt'] && !fields['updatedAt'].isReadOnly) {
        console.warn(
          'Model has timestamps enabled and defines an "updatedAt" field. ' +
            'Consider marking it as .readOnly() to prevent manual updates.'
        );
      }
    }

    // Validate field configurations and register ref fields
    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
      try {
        // Field validation happens in the field builder's _build() method
        // which is already called by processFields

        // Register ref field validations for deferred checking
        if (fieldConfig.type === 'ref') {
          const refConfig = fieldConfig as any;
          if (this.modelName) {
            registerRefValidation(
              this.modelName,
              fieldName,
              refConfig.modelName,
              refConfig.onDelete
            );
          }
        }
      } catch (error: any) {
        throw new Error(`Field "${fieldName}" validation failed: ${error.message}`);
      }
    }

    // Check for reserved field names
    const reservedFieldNames = ['__typename', '_id', '_etag'];
    for (const fieldName of Object.keys(fields)) {
      if (reservedFieldNames.includes(fieldName)) {
        throw new Error(
          `Field name "${fieldName}" is reserved and cannot be used. ` +
            `Reserved names: ${reservedFieldNames.join(', ')}`
        );
      }
    }
  }

  /**
   * @internal
   * Build final configuration
   */
  _build(): CrudModelConfig<T> {
    this.validate();
    return { ...this._config };
  }
}

// ============================================================================
// CRUD Model Factory (c namespace)
// ============================================================================

/**
 * CRUD model factory
 *
 * Creates database-backed REST APIs.
 *
 * @example
 * ```typescript
 * import { c, a } from '@atakora/component';
 *
 * const User = c.model({
 *   id: a.id(),
 *   email: a.string().required().email(),
 *   name: a.string().required(),
 * });
 * ```
 */
export const c = {
  /**
   * Create a CRUD model
   *
   * @param fields - Object defining model fields
   * @returns CRUD model builder
   */
  model: <T>(fields: T) => new CrudModelBuilder(fields),
};
