/**
 * Duration Utilities for Fluent APIs
 *
 * @remarks
 * Provides type-safe duration values with conversion methods for various formats
 * including ISO 8601 durations and ARM template duration strings.
 *
 * @example
 * ```typescript
 * import { seconds, minutes, hours } from '@atakora/component/common';
 *
 * // Create durations
 * const timeout = seconds(30);
 * const interval = minutes(5);
 * const retention = days(7);
 *
 * // Convert to different formats
 * console.log(timeout.toMilliseconds());  // 30000
 * console.log(interval.toISOString());    // PT5M
 * console.log(retention.toArmDuration()); // 7.00:00:00
 * ```
 *
 * @packageDocumentation
 */

/**
 * Represents a duration value with unit conversions
 *
 * @public
 */
export interface Duration {
  /**
   * The numeric value of the duration
   */
  readonly value: number;

  /**
   * The unit of the duration
   */
  readonly unit: 'ms' | 's' | 'm' | 'h' | 'd';

  /**
   * Convert to milliseconds
   */
  toMilliseconds(): number;

  /**
   * Convert to seconds
   */
  toSeconds(): number;

  /**
   * Convert to minutes
   */
  toMinutes(): number;

  /**
   * Convert to hours
   */
  toHours(): number;

  /**
   * Convert to days
   */
  toDays(): number;

  /**
   * Convert to ISO 8601 duration string (e.g., P7D, PT1H30M)
   * @returns ISO 8601 duration string
   */
  toISOString(): string;

  /**
   * Convert to ARM template duration format (e.g., 7.00:00:00)
   * @returns ARM duration string in days.hours:minutes:seconds format
   */
  toArmDuration(): string;

  /**
   * Get human-readable string representation
   */
  toString(): string;
}

/**
 * Implementation of Duration interface
 * @internal
 */
class DurationImpl implements Duration {
  readonly value!: number;
  readonly unit!: 'ms' | 's' | 'm' | 'h' | 'd';

  constructor(value: number, unit: 'ms' | 's' | 'm' | 'h' | 'd') {
    Object.defineProperty(this, 'value', {
      value,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    Object.defineProperty(this, 'unit', {
      value: unit,
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }

  toMilliseconds(): number {
    const conversions = {
      ms: 1,
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };
    return this.value * conversions[this.unit];
  }

  toSeconds(): number {
    return Math.floor(this.toMilliseconds() / 1000);
  }

  toMinutes(): number {
    return Math.floor(this.toMilliseconds() / 60000);
  }

  toHours(): number {
    return Math.floor(this.toMilliseconds() / 3600000);
  }

  toDays(): number {
    return Math.floor(this.toMilliseconds() / 86400000);
  }

  toISOString(): string {
    const totalSeconds = this.toSeconds();
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let result = 'P';
    if (days > 0) result += `${days}D`;

    const timePart = [];
    if (hours > 0) timePart.push(`${hours}H`);
    if (minutes > 0) timePart.push(`${minutes}M`);
    if (seconds > 0) timePart.push(`${seconds}S`);

    if (timePart.length > 0) {
      result += 'T' + timePart.join('');
    }

    return result === 'P' ? 'PT0S' : result;
  }

  toArmDuration(): string {
    const totalSeconds = this.toSeconds();
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days}.${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  toString(): string {
    if (this.value === 1) {
      const units = {
        ms: 'millisecond',
        s: 'second',
        m: 'minute',
        h: 'hour',
        d: 'day',
      };
      return `${this.value} ${units[this.unit]}`;
    }
    const units = {
      ms: 'milliseconds',
      s: 'seconds',
      m: 'minutes',
      h: 'hours',
      d: 'days',
    };
    return `${this.value} ${units[this.unit]}`;
  }
}

/**
 * Create a duration in milliseconds
 *
 * @param value - Number of milliseconds
 * @returns Duration object
 *
 * @example
 * ```typescript
 * const timeout = milliseconds(500);
 * console.log(timeout.toString()); // "500 milliseconds"
 * ```
 *
 * @public
 */
export function milliseconds(value: number): Duration {
  return new DurationImpl(value, 'ms');
}

/**
 * Create a duration in seconds
 *
 * @param value - Number of seconds
 * @returns Duration object
 *
 * @example
 * ```typescript
 * const timeout = seconds(30);
 * console.log(timeout.toMilliseconds()); // 30000
 * console.log(timeout.toISOString());    // PT30S
 * ```
 *
 * @public
 */
export function seconds(value: number): Duration {
  return new DurationImpl(value, 's');
}

/**
 * Create a duration in minutes
 *
 * @param value - Number of minutes
 * @returns Duration object
 *
 * @example
 * ```typescript
 * const interval = minutes(5);
 * console.log(interval.toSeconds());   // 300
 * console.log(interval.toISOString()); // PT5M
 * ```
 *
 * @public
 */
export function minutes(value: number): Duration {
  return new DurationImpl(value, 'm');
}

/**
 * Create a duration in hours
 *
 * @param value - Number of hours
 * @returns Duration object
 *
 * @example
 * ```typescript
 * const workDay = hours(8);
 * console.log(workDay.toMinutes());    // 480
 * console.log(workDay.toArmDuration()); // 0.08:00:00
 * ```
 *
 * @public
 */
export function hours(value: number): Duration {
  return new DurationImpl(value, 'h');
}

/**
 * Create a duration in days
 *
 * @param value - Number of days
 * @returns Duration object
 *
 * @example
 * ```typescript
 * const retention = days(30);
 * console.log(retention.toHours());     // 720
 * console.log(retention.toISOString()); // P30D
 * console.log(retention.toArmDuration()); // 30.00:00:00
 * ```
 *
 * @public
 */
export function days(value: number): Duration {
  return new DurationImpl(value, 'd');
}
