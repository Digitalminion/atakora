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
export declare class TimerTrigger {
    private schedule?;
    private runOnStartupFlag;
    private useMonitorFlag;
    /**
     * Creates a new Timer trigger builder.
     *
     * @returns New TimerTrigger builder instance
     */
    static create(): TimerTrigger;
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
    withSchedule(schedule: string): this;
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
    runOnStartup(enable?: boolean): this;
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
    useMonitor(enable?: boolean): this;
    /**
     * Builds the Timer trigger configuration.
     *
     * @returns Timer trigger configuration object
     *
     * @throws {Error} If schedule is not set
     */
    build(): TimerTriggerConfig;
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
export declare function timerTrigger(schedule: string, options?: {
    runOnStartup?: boolean;
    useMonitor?: boolean;
}): TimerTriggerConfig;
/**
 * Common CRON schedule presets.
 */
export declare const CronSchedules: {
    /**
     * Every minute: '0 * * * * *'
     */
    readonly EVERY_MINUTE: "0 * * * * *";
    /**
     * Every 5 minutes: 0 (star)(slash)5 (star) (star) (star) (star)
     */
    readonly EVERY_5_MINUTES: "0 */5 * * * *";
    /**
     * Every 15 minutes: 0 (star)(slash)15 (star) (star) (star) (star)
     */
    readonly EVERY_15_MINUTES: "0 */15 * * * *";
    /**
     * Every 30 minutes: 0 (star)(slash)30 (star) (star) (star) (star)
     */
    readonly EVERY_30_MINUTES: "0 */30 * * * *";
    /**
     * Every hour: '0 0 * * * *'
     */
    readonly EVERY_HOUR: "0 0 * * * *";
    /**
     * Daily at midnight: '0 0 0 * * *'
     */
    readonly DAILY_MIDNIGHT: "0 0 0 * * *";
    /**
     * Daily at 2 AM: '0 0 2 * * *'
     */
    readonly DAILY_2AM: "0 0 2 * * *";
    /**
     * Weekly on Sunday at midnight: '0 0 0 * * 0'
     */
    readonly WEEKLY_SUNDAY: "0 0 0 * * 0";
    /**
     * Monthly on the 1st at midnight: '0 0 0 1 * *'
     */
    readonly MONTHLY_FIRST: "0 0 0 1 * *";
    /**
     * Weekdays at 9 AM: '0 0 9 * * 1-5'
     */
    readonly WEEKDAYS_9AM: "0 0 9 * * 1-5";
};
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
export declare function validateCronExpression(schedule: string): boolean;
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
export declare function validateTimeSpan(timeSpan: string): boolean;
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
export declare function timeSpanToCron(timeSpan: string): string;
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
export declare function describeCronExpression(cronExpression: string): string;
//# sourceMappingURL=timer-trigger.d.ts.map