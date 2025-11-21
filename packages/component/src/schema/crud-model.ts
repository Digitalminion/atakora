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
    this._config.authorization = rules(builder);
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
   * @internal
   * Build final configuration
   */
  _build(): CrudModelConfig<T> {
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
