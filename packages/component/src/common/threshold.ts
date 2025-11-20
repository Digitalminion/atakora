/**
 * Threshold Builders for Fluent APIs
 *
 * @remarks
 * Provides type-safe threshold values for monitoring, alerts, and comparisons.
 * Supports numeric values and Duration objects with evaluation methods.
 *
 * @example
 * ```typescript
 * import { greaterThan, lessThan, between, minutes } from '@atakora/component/common';
 *
 * // Numeric thresholds
 * const cpuAlert = greaterThan(80);
 * const lowMemory = lessThan(10);
 * const normalRange = between(20, 80);
 *
 * // Duration thresholds
 * const timeout = greaterThan(minutes(5));
 * const stale = olderThan(days(30));
 *
 * // Evaluate thresholds
 * if (cpuAlert.evaluate(85)) {
 *   console.log('CPU usage is high!');
 * }
 * ```
 *
 * @packageDocumentation
 */

import type { Duration } from './duration';

/**
 * Represents a threshold for comparison operations
 *
 * @typeParam T - The type of value being compared (number or Duration)
 * @public
 */
export interface Threshold<T = number> {
  /**
   * The type of threshold comparison
   */
  readonly type: 'greater' | 'less' | 'between' | 'equals' | 'older';

  /**
   * The threshold value for comparison
   */
  readonly value: T;

  /**
   * The upper bound value for 'between' thresholds
   */
  readonly upperValue?: T;

  /**
   * Evaluate if a current value meets the threshold condition
   *
   * @param current - The value to evaluate against the threshold
   * @returns True if the threshold condition is met
   */
  evaluate(current: T): boolean;

  /**
   * Get a string representation of the threshold
   */
  toString(): string;
}

/**
 * Implementation of Threshold interface
 * @internal
 */
class ThresholdImpl<T = number> implements Threshold<T> {
  constructor(
    readonly type: 'greater' | 'less' | 'between' | 'equals' | 'older',
    readonly value: T,
    readonly upperValue?: T
  ) {}

  evaluate(current: T): boolean {
    // Handle numeric comparisons
    if (typeof current === 'number' && typeof this.value === 'number') {
      switch (this.type) {
        case 'greater':
          return current > this.value;
        case 'less':
          return current < this.value;
        case 'between':
          return current >= this.value && current <= (this.upperValue as number);
        case 'equals':
          return current === this.value;
        case 'older':
          // For age-based comparisons (older means greater value)
          return current > this.value;
        default:
          return false;
      }
    }

    // Handle Duration comparisons
    if (this.isDuration(current) && this.isDuration(this.value)) {
      const currentMs = (current as any).toMilliseconds();
      const valueMs = (this.value as any).toMilliseconds();

      switch (this.type) {
        case 'greater':
          return currentMs > valueMs;
        case 'less':
          return currentMs < valueMs;
        case 'between':
          if (this.upperValue && this.isDuration(this.upperValue)) {
            const upperMs = (this.upperValue as any).toMilliseconds();
            return currentMs >= valueMs && currentMs <= upperMs;
          }
          return false;
        case 'equals':
          return currentMs === valueMs;
        case 'older':
          return currentMs > valueMs;
        default:
          return false;
      }
    }

    return false;
  }

  private isDuration(value: any): boolean {
    return value && typeof value.toMilliseconds === 'function';
  }

  toString(): string {
    switch (this.type) {
      case 'greater':
        return `> ${this.value}`;
      case 'less':
        return `< ${this.value}`;
      case 'between':
        return `${this.value} - ${this.upperValue}`;
      case 'equals':
        return `= ${this.value}`;
      case 'older':
        return `older than ${this.value}`;
      default:
        return '';
    }
  }
}

/**
 * Create a "greater than" threshold
 *
 * @param value - The threshold value
 * @returns Threshold object
 *
 * @example
 * ```typescript
 * // Numeric threshold
 * const highCpu = greaterThan(80);
 * if (highCpu.evaluate(85)) {
 *   console.log('CPU is above 80%');
 * }
 *
 * // Duration threshold
 * const longRunning = greaterThan(minutes(5));
 * if (longRunning.evaluate(seconds(360))) {
 *   console.log('Process is running longer than 5 minutes');
 * }
 * ```
 *
 * @public
 */
export function greaterThan(value: number): Threshold<number>;
export function greaterThan(value: Duration): Threshold<Duration>;
export function greaterThan<T>(value: T): Threshold<T> {
  return new ThresholdImpl('greater', value);
}

/**
 * Create a "less than" threshold
 *
 * @param value - The threshold value
 * @returns Threshold object
 *
 * @example
 * ```typescript
 * // Numeric threshold
 * const lowMemory = lessThan(10);
 * if (lowMemory.evaluate(5)) {
 *   console.log('Memory is below 10%');
 * }
 *
 * // Duration threshold
 * const quickResponse = lessThan(seconds(2));
 * if (quickResponse.evaluate(milliseconds(500))) {
 *   console.log('Response time is under 2 seconds');
 * }
 * ```
 *
 * @public
 */
export function lessThan(value: number): Threshold<number>;
export function lessThan(value: Duration): Threshold<Duration>;
export function lessThan<T>(value: T): Threshold<T> {
  return new ThresholdImpl('less', value);
}

/**
 * Create a "between" threshold (inclusive)
 *
 * @param min - The minimum threshold value (inclusive)
 * @param max - The maximum threshold value (inclusive)
 * @returns Threshold object
 *
 * @example
 * ```typescript
 * // Numeric threshold
 * const normalRange = between(20, 80);
 * if (normalRange.evaluate(50)) {
 *   console.log('Value is in normal range');
 * }
 *
 * // Duration threshold
 * const acceptableLatency = between(milliseconds(100), seconds(1));
 * if (acceptableLatency.evaluate(milliseconds(500))) {
 *   console.log('Latency is acceptable');
 * }
 * ```
 *
 * @public
 */
export function between(min: number, max: number): Threshold<number>;
export function between(min: Duration, max: Duration): Threshold<Duration>;
export function between<T>(min: T, max: T): Threshold<T> {
  return new ThresholdImpl('between', min, max);
}

/**
 * Create an "equals" threshold
 *
 * @param value - The threshold value to match exactly
 * @returns Threshold object
 *
 * @example
 * ```typescript
 * // Numeric threshold
 * const exactMatch = equals(100);
 * if (exactMatch.evaluate(100)) {
 *   console.log('Value matches exactly');
 * }
 *
 * // Duration threshold
 * const exactDuration = equals(hours(24));
 * if (exactDuration.evaluate(days(1))) {
 *   console.log('Duration is exactly 24 hours');
 * }
 * ```
 *
 * @public
 */
export function equals(value: number): Threshold<number>;
export function equals(value: Duration): Threshold<Duration>;
export function equals<T>(value: T): Threshold<T> {
  return new ThresholdImpl('equals', value);
}

/**
 * Create an "older than" threshold for age-based comparisons
 *
 * @param value - The age threshold as a Duration
 * @returns Threshold object
 *
 * @example
 * ```typescript
 * import { olderThan, days } from '@atakora/component/common';
 *
 * const staleData = olderThan(days(30));
 * const dataAge = days(45);
 *
 * if (staleData.evaluate(dataAge)) {
 *   console.log('Data is older than 30 days');
 * }
 * ```
 *
 * @public
 */
export function olderThan(value: Duration): Threshold<Duration> {
  return new ThresholdImpl('older', value);
}