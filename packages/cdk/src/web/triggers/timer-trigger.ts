/**
 * Timer trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */

import type { TimerTriggerConfig } from '../function-app-types';

/**
 * Builder for creating Timer trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building timer trigger configurations with CRON expressions.
 *
 * @example
 * ```typescript
 * const trigger = TimerTrigger.create()
 *   .withSchedule('0 * /5 * * * *') // Every 5 minutes (avoid comment-close)
 *   .runOnStartup(false)
 *   .build();
 * ```
 */
export class TimerTrigger {
  private schedule?: string;
  private runOnStartupFlag: boolean = false;
  private useMonitorFlag: boolean = true;

  /**
   * Creates a new Timer trigger builder.
   *
   * @returns New TimerTrigger builder instance
   */
  public static create(): TimerTrigger {
    return new TimerTrigger();
  }

  /**
   * Sets the schedule using a CRON expression or TimeSpan format.
   *
   * @param schedule - CRON expression or TimeSpan (hh:mm:ss)
   * @returns This builder for chaining
   *
   * @remarks
   * CRON format: second minute hour day month day-of-week
   * - Example: '0 * /5 * * * *' (every 5 minutes)
   *
   * TimeSpan format: hh:mm:ss
   * - Example: '00:05:00' (every 5 minutes)
   *
   * @example
   * ```typescript
   * .withSchedule('0 0 2 * * *') // 2 AM daily
   * ```
   */
  public withSchedule(schedule: string): this {
    this.schedule = schedule;
    return this;
  }

  /**
   * Sets whether the function should run on startup.
   *
   * @param enable - True to run on startup
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .runOnStartup(true)
   * ```
   */
  public runOnStartup(enable: boolean = true): this {
    this.runOnStartupFlag = enable;
    return this;
  }

  /**
   * Sets whether to use schedule monitoring.
   *
   * @param enable - True to use monitor
   * @returns This builder for chaining
   *
   * @remarks
   * When enabled, Azure stores schedule status to prevent missed executions.
   *
   * @example
   * ```typescript
   * .useMonitor(true)
   * ```
   */
  public useMonitor(enable: boolean = true): this {
    this.useMonitorFlag = enable;
    return this;
  }

  /**
   * Builds the Timer trigger configuration.
   *
   * @returns Timer trigger configuration object
   *
   * @throws {Error} If schedule is not set
   */
  public build(): TimerTriggerConfig {
    if (!this.schedule) {
      throw new Error('Schedule must be set for timer trigger');
    }

    return {
      type: 'timer',
      schedule: this.schedule,
      runOnStartup: this.runOnStartupFlag,
      useMonitor: this.useMonitorFlag,
    };
  }
}

/**
 * Helper function to create a timer trigger configuration.
 *
 * @param schedule - CRON expression or TimeSpan
 * @param options - Optional configuration
 * @returns Complete timer trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = timerTrigger('0 * /5 * * * *', {
 *   runOnStartup: false,
 *   useMonitor: true
 * });
 * ```
 */
export function timerTrigger(
  schedule: string,
  options: {
    runOnStartup?: boolean;
    useMonitor?: boolean;
  } = {}
): TimerTriggerConfig {
  return {
    type: 'timer',
    schedule,
    runOnStartup: options.runOnStartup ?? false,
    useMonitor: options.useMonitor ?? true,
  };
}

/**
 * Common CRON schedule presets.
 */
export const CronSchedules = {
  /**
   * Every minute: '0 * * * * *'
   */
  EVERY_MINUTE: '0 * * * * *',

  /**
   * Every 5 minutes: 0 (star)(slash)5 (star) (star) (star) (star)
   */
  EVERY_5_MINUTES: '0 */5 * * * *',

  /**
   * Every 15 minutes: 0 (star)(slash)15 (star) (star) (star) (star)
   */
  EVERY_15_MINUTES: '0 */15 * * * *',

  /**
   * Every 30 minutes: 0 (star)(slash)30 (star) (star) (star) (star)
   */
  EVERY_30_MINUTES: '0 */30 * * * *',

  /**
   * Every hour: '0 0 * * * *'
   */
  EVERY_HOUR: '0 0 * * * *',

  /**
   * Daily at midnight: '0 0 0 * * *'
   */
  DAILY_MIDNIGHT: '0 0 0 * * *',

  /**
   * Daily at 2 AM: '0 0 2 * * *'
   */
  DAILY_2AM: '0 0 2 * * *',

  /**
   * Weekly on Sunday at midnight: '0 0 0 * * 0'
   */
  WEEKLY_SUNDAY: '0 0 0 * * 0',

  /**
   * Monthly on the 1st at midnight: '0 0 0 1 * *'
   */
  MONTHLY_FIRST: '0 0 0 1 * *',

  /**
   * Weekdays at 9 AM: '0 0 9 * * 1-5'
   */
  WEEKDAYS_9AM: '0 0 9 * * 1-5',
} as const;

/**
 * Validates a CRON expression for Azure Functions.
 *
 * @param schedule - CRON expression to validate
 * @returns True if valid, false otherwise
 *
 * @remarks
 * Azure Functions uses 6-field CRON expressions (including seconds).
 * Format: second minute hour day month day-of-week
 *
 * @example
 * ```typescript
 * const valid = validateCronExpression('0 * /5 * * * *'); // true
 * const invalid = validateCronExpression('invalid'); // false
 * ```
 */
export function validateCronExpression(schedule: string): boolean {
  if (!schedule || schedule.trim() === '') {
    return false;
  }

  // Check if it's a TimeSpan format (hh:mm:ss)
  const timeSpanPattern = /^\d{2}:\d{2}:\d{2}$/;
  if (timeSpanPattern.test(schedule)) {
    return validateTimeSpan(schedule);
  }

  // Validate CRON format (6 fields for Azure Functions)
  const parts = schedule.trim().split(/\s+/);

  // Azure Functions requires exactly 6 fields
  if (parts.length !== 6) {
    return false;
  }

  // Validate each field (basic validation)
  const fieldPatterns = [
    /^(\*|(\d+)|(\d+-\d+)|(\d+(,\d+)*)|(\*\/\d+))$/,  // second
    /^(\*|(\d+)|(\d+-\d+)|(\d+(,\d+)*)|(\*\/\d+))$/,  // minute
    /^(\*|(\d+)|(\d+-\d+)|(\d+(,\d+)*)|(\*\/\d+))$/,  // hour
    /^(\*|(\d+)|(\d+-\d+)|(\d+(,\d+)*)|(\*\/\d+)|(\?))$/,  // day
    /^(\*|(\d+)|(\d+-\d+)|(\d+(,\d+)*)|(\*\/\d+))$/,  // month
    /^(\*|(\d+)|(\d+-\d+)|(\d+(,\d+)*)|(\*\/\d+)|(\?))$/,  // day-of-week
  ];

  return parts.every((part, index) => {
    return fieldPatterns[index].test(part);
  });
}

/**
 * Validates a TimeSpan format schedule.
 *
 * @param timeSpan - TimeSpan string (hh:mm:ss)
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * const valid = validateTimeSpan('00:05:00'); // true
 * const invalid = validateTimeSpan('25:00:00'); // false (invalid hour)
 * ```
 */
export function validateTimeSpan(timeSpan: string): boolean {
  const pattern = /^(\d{2}):(\d{2}):(\d{2})$/;
  const match = pattern.exec(timeSpan);

  if (!match) {
    return false;
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);

  return hours <= 23 && minutes <= 59 && seconds <= 59;
}

/**
 * Converts a TimeSpan to a CRON expression.
 *
 * @param timeSpan - TimeSpan string (hh:mm:ss)
 * @returns Equivalent CRON expression
 *
 * @throws {Error} If timeSpan is invalid
 *
 * @example
 * ```typescript
 * const cron = timeSpanToCron('00:05:00');
 * // Returns: '0 (star)/5 (star) (star) (star) (star)' - every 5 minutes
 * ```
 */
export function timeSpanToCron(timeSpan: string): string {
  if (!validateTimeSpan(timeSpan)) {
    throw new Error(`Invalid TimeSpan format: ${timeSpan}`);
  }

  const pattern = /^(\d{2}):(\d{2}):(\d{2})$/;
  const match = pattern.exec(timeSpan)!;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);

  // Convert to interval-based CRON
  if (hours === 0 && minutes > 0 && seconds === 0) {
    // Minute-based interval
    return `0 */${minutes} * * * *`;
  } else if (hours > 0 && minutes === 0 && seconds === 0) {
    // Hour-based interval
    return `0 0 */${hours} * * *`;
  } else {
    // Complex interval - not directly convertible
    throw new Error(
      `Cannot convert complex TimeSpan ${timeSpan} to CRON. Use CRON expression directly.`
    );
  }
}

/**
 * Parses a CRON expression and returns a human-readable description.
 *
 * @param cronExpression - CRON expression
 * @returns Human-readable description
 *
 * @example
 * ```typescript
 * const description = describeCronExpression('0 * /5 * * * *');
 * // Returns: 'Every 5 minutes'
 * ```
 */
export function describeCronExpression(cronExpression: string): string {
  if (!validateCronExpression(cronExpression)) {
    return 'Invalid CRON expression';
  }

  const parts = cronExpression.trim().split(/\s+/);
  const [second, minute, hour, day, month, dayOfWeek] = parts;

  // Check for common patterns
  if (cronExpression === CronSchedules.EVERY_MINUTE) {
    return 'Every minute';
  }
  if (cronExpression === CronSchedules.EVERY_5_MINUTES) {
    return 'Every 5 minutes';
  }
  if (cronExpression === CronSchedules.EVERY_15_MINUTES) {
    return 'Every 15 minutes';
  }
  if (cronExpression === CronSchedules.EVERY_30_MINUTES) {
    return 'Every 30 minutes';
  }
  if (cronExpression === CronSchedules.EVERY_HOUR) {
    return 'Every hour';
  }
  if (cronExpression === CronSchedules.DAILY_MIDNIGHT) {
    return 'Daily at midnight';
  }
  if (cronExpression === CronSchedules.DAILY_2AM) {
    return 'Daily at 2 AM';
  }
  if (cronExpression === CronSchedules.WEEKLY_SUNDAY) {
    return 'Weekly on Sunday at midnight';
  }
  if (cronExpression === CronSchedules.MONTHLY_FIRST) {
    return 'Monthly on the 1st at midnight';
  }
  if (cronExpression === CronSchedules.WEEKDAYS_9AM) {
    return 'Weekdays at 9 AM';
  }

  // Generic description
  return `Custom schedule: ${cronExpression}`;
}
