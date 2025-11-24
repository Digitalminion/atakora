/**
 * String field type builder
 *
 * @remarks
 * Provides string field with common validation options:
 * - Email validation
 * - URL validation
 * - Length constraints
 * - Pattern matching
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';
import type { UnifiedFieldDefinition } from '../unified-types';

/**
 * String field configuration
 */
export interface StringFieldConfig extends BaseFieldConfig {
  type: 'string';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  format?: 'email' | 'url' | 'uuid' | 'phone';
}

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * URL validation regex
 */
const URL_REGEX = /^https?:\/\/.+/;

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Phone validation regex (basic international format)
 */
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

/**
 * String field builder
 *
 * @remarks
 * Implements fluent API for defining string fields with validation.
 *
 * @example
 * ```typescript
 * // Basic string
 * const name = a.string().required();
 *
 * // Email validation
 * const email = a.string().email().required();
 *
 * // URL validation
 * const website = a.string().url();
 *
 * // Length constraints
 * const username = a.string().min(3).max(20).required();
 *
 * // Pattern matching
 * const code = a.string().regex(/^[A-Z]{3}-\d{4}$/);
 * ```
 */
export class StringFieldBuilder extends BaseFieldBuilder<string, StringFieldConfig> {
  constructor() {
    super('string');
  }

  /**
   * Set minimum length
   *
   * @remarks
   * String must have at least this many characters.
   *
   * @example
   * ```typescript
   * const username = a.string().min(3); // At least 3 characters
   * ```
   *
   * @param value - Minimum length
   */
  min(value: number): this {
    this.definition.minLength = value;
    this.definition.validations.push({
      type: 'minLength',
      value,
      message: `Must be at least ${value} character${value !== 1 ? 's' : ''}`,
    });

    // Update legacy config
    this.config.minLength = value;
    this.config.validations = this.definition.validations;

    return this;
  }

  /**
   * Set maximum length
   *
   * @remarks
   * String cannot exceed this many characters.
   *
   * @example
   * ```typescript
   * const bio = a.string().max(500); // Maximum 500 characters
   * ```
   *
   * @param value - Maximum length
   */
  max(value: number): this {
    this.definition.maxLength = value;
    this.definition.validations.push({
      type: 'maxLength',
      value,
      message: `Must be at most ${value} character${value !== 1 ? 's' : ''}`,
    });

    // Update legacy config
    this.config.maxLength = value;
    this.config.validations = this.definition.validations;

    return this;
  }

  /**
   * Alias for min() for better semantics
   *
   * @param value - Minimum length
   */
  minLength(value: number): this {
    return this.min(value);
  }

  /**
   * Alias for max() for better semantics
   *
   * @param value - Maximum length
   */
  maxLength(value: number): this {
    return this.max(value);
  }

  /**
   * Validate email format
   *
   * @remarks
   * Ensures string matches email pattern (user@domain.com).
   *
   * @example
   * ```typescript
   * const email = a.string().email().required();
   * ```
   */
  email(): this {
    this.definition.format = 'email';
    this.definition.pattern = EMAIL_REGEX;
    this.definition.validations.push({
      type: 'email',
      message: 'Must be a valid email address',
    });

    // Update legacy config
    this.config.format = 'email';
    this.config.pattern = EMAIL_REGEX;
    this.config.validations = this.definition.validations;

    return this;
  }

  /**
   * Validate URL format
   *
   * @remarks
   * Ensures string matches URL pattern (http:// or https://).
   *
   * @example
   * ```typescript
   * const website = a.string().url();
   * ```
   */
  url(): this {
    this.definition.format = 'url';
    this.definition.pattern = URL_REGEX;
    this.definition.validations.push({
      type: 'url',
      message: 'Must be a valid URL starting with http:// or https://',
    });

    // Update legacy config
    this.config.format = 'url';
    this.config.pattern = URL_REGEX;
    this.config.validations = this.definition.validations;

    return this;
  }

  /**
   * Validate UUID format
   *
   * @remarks
   * Ensures string matches UUID v4 pattern.
   *
   * @example
   * ```typescript
   * const correlationId = a.string().uuid();
   * ```
   */
  uuid(): this {
    this.definition.format = 'uuid';
    this.definition.pattern = UUID_REGEX;
    this.definition.validations.push({
      type: 'pattern',
      pattern: UUID_REGEX,
      message: 'Must be a valid UUID',
    });

    // Update legacy config
    this.config.format = 'uuid';
    this.config.pattern = UUID_REGEX;
    this.config.validations = this.definition.validations;

    return this;
  }

  /**
   * Validate phone number format
   *
   * @remarks
   * Ensures string matches international phone format.
   *
   * @example
   * ```typescript
   * const phone = a.string().phone();
   * ```
   */
  phone(): this {
    this.definition.format = 'phone';
    this.definition.pattern = PHONE_REGEX;
    this.definition.validations.push({
      type: 'pattern',
      pattern: PHONE_REGEX,
      message: 'Must be a valid phone number',
    });

    // Update legacy config
    this.config.format = 'phone';
    this.config.pattern = PHONE_REGEX;
    this.config.validations = this.definition.validations;

    return this;
  }

  /**
   * Validate against custom regex pattern
   *
   * @remarks
   * Allows custom pattern matching validation.
   *
   * @example
   * ```typescript
   * // Validate postal code format
   * const postalCode = a.string().regex(/^\d{5}(-\d{4})?$/);
   *
   * // With custom message
   * const code = a.string().regex(/^[A-Z]{3}-\d{4}$/, 'Must be format ABC-1234');
   * ```
   *
   * @param pattern - Regular expression pattern
   * @param message - Optional custom error message
   */
  regex(pattern: RegExp, message?: string): this {
    this.definition.pattern = pattern;
    this.definition.validations.push({
      type: 'regex',
      pattern,
      message: message || 'Must match the required pattern',
    });

    // Update legacy config
    this.config.pattern = pattern;
    this.config.validations = this.definition.validations;

    return this;
  }

  /**
   * Alias for regex() - validate against custom pattern
   *
   * @param pattern - Regular expression pattern
   * @param message - Optional custom error message
   */
  pattern(pattern: RegExp, message?: string): this {
    return this.regex(pattern, message);
  }

  /**
   * Override syncLegacyToUnified to handle string-specific properties
   *
   * @internal
   */
  protected syncLegacyToUnified(): void {
    super.syncLegacyToUnified();

    // Sync string-specific properties
    if (this.config.minLength !== undefined) {
      this.definition.minLength = this.config.minLength;
    }
    if (this.config.maxLength !== undefined) {
      this.definition.maxLength = this.config.maxLength;
    }
    if (this.config.pattern !== undefined) {
      this.definition.pattern = this.config.pattern;
    }
    if (this.config.format !== undefined) {
      this.definition.format = this.config.format;
    }
  }
}
