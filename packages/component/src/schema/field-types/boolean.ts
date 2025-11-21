/**
 * Boolean field type builder
 *
 * @remarks
 * Provides boolean field for true/false values.
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';

/**
 * Boolean field configuration
 */
export interface BooleanFieldConfig extends BaseFieldConfig {
  type: 'boolean';
}

/**
 * Boolean field builder
 *
 * @remarks
 * Implements fluent API for defining boolean fields.
 *
 * @example
 * ```typescript
 * // Basic boolean
 * const isActive = a.boolean().default(true);
 *
 * // Required boolean
 * const agreedToTerms = a.boolean().required();
 *
 * // Optional boolean
 * const receiveNewsletter = a.boolean().optional();
 * ```
 */
export class BooleanFieldBuilder extends BaseFieldBuilder<boolean, BooleanFieldConfig> {
  constructor() {
    super('boolean');
  }
}
