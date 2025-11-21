/**
 * DateTime field type builder
 *
 * @remarks
 * Provides datetime field with validation options for timestamps and dates.
 * Values are stored as ISO 8601 strings.
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';

/**
 * DateTime field configuration
 */
export interface DateTimeFieldConfig extends BaseFieldConfig {
  type: 'datetime';
  min?: Date | string;
  max?: Date | string;
  isFuture?: boolean;
  isPast?: boolean;
}

/**
 * DateTime field builder
 *
 * @remarks
 * Implements fluent API for defining datetime fields.
 * Values are stored as ISO 8601 strings for portability.
 *
 * @example
 * ```typescript
 * // Basic datetime
 * const createdAt = a.datetime().required();
 *
 * // Future date only
 * const scheduledFor = a.datetime().future();
 *
 * // Past date only
 * const birthDate = a.datetime().past();
 *
 * // With min/max constraints
 * const startDate = a.datetime()
 *   .min(new Date('2024-01-01'))
 *   .max(new Date('2024-12-31'));
 * ```
 */
export class DateTimeFieldBuilder extends BaseFieldBuilder<string, DateTimeFieldConfig> {
  constructor() {
    super('datetime');
  }

  /**
   * Set minimum date/time
   *
   * @remarks
   * DateTime must be on or after this value.
   *
   * @example
   * ```typescript
   * const startDate = a.datetime().min(new Date('2024-01-01'));
   * const eventDate = a.datetime().min('2024-06-01T00:00:00Z');
   * ```
   *
   * @param value - Minimum date (Date object or ISO string)
   */
  min(value: Date | string): this {
    this.config.min = value;
    const dateStr = value instanceof Date ? value.toISOString() : value;
    this.config.validations.push({
      type: 'min',
      value: new Date(dateStr).getTime(),
      message: `Must be on or after ${dateStr}`,
    });
    return this;
  }

  /**
   * Set maximum date/time
   *
   * @remarks
   * DateTime must be on or before this value.
   *
   * @example
   * ```typescript
   * const endDate = a.datetime().max(new Date('2024-12-31'));
   * const deadline = a.datetime().max('2024-12-31T23:59:59Z');
   * ```
   *
   * @param value - Maximum date (Date object or ISO string)
   */
  max(value: Date | string): this {
    this.config.max = value;
    const dateStr = value instanceof Date ? value.toISOString() : value;
    this.config.validations.push({
      type: 'max',
      value: new Date(dateStr).getTime(),
      message: `Must be on or before ${dateStr}`,
    });
    return this;
  }

  /**
   * Require future date/time
   *
   * @remarks
   * DateTime must be in the future (after current time).
   *
   * @example
   * ```typescript
   * const scheduledFor = a.datetime().future().required();
   * ```
   */
  future(): this {
    this.config.isFuture = true;
    this.config.validations.push({
      type: 'custom',
      validator: (value: string) => new Date(value).getTime() > Date.now(),
      message: 'Must be a future date/time',
    });
    return this;
  }

  /**
   * Require past date/time
   *
   * @remarks
   * DateTime must be in the past (before current time).
   *
   * @example
   * ```typescript
   * const birthDate = a.datetime().past().required();
   * ```
   */
  past(): this {
    this.config.isPast = true;
    this.config.validations.push({
      type: 'custom',
      validator: (value: string) => new Date(value).getTime() < Date.now(),
      message: 'Must be a past date/time',
    });
    return this;
  }

  /**
   * Alias for past() - require date before today
   *
   * @remarks
   * DateTime must be before the current date/time.
   */
  beforeNow(): this {
    return this.past();
  }

  /**
   * Alias for future() - require date after today
   *
   * @remarks
   * DateTime must be after the current date/time.
   */
  afterNow(): this {
    return this.future();
  }
}
