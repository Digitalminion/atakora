/**
 * Durable Activity trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */
import type { DurableActivityTriggerConfig } from '../function-app-types';
/**
 * Builder for creating Durable Activity trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building durable activity trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = DurableActivityTrigger.create()
 *   .withActivityName('ProcessPayment')
 *   .build();
 * ```
 */
export declare class DurableActivityTrigger {
    private activity?;
    /**
     * Creates a new Durable Activity trigger builder.
     *
     * @returns New DurableActivityTrigger builder instance
     */
    static create(): DurableActivityTrigger;
    /**
     * Sets the activity name.
     *
     * @param activity - Activity function name
     * @returns This builder for chaining
     *
     * @remarks
     * Optional. If not specified, defaults to the function name.
     *
     * @example
     * ```typescript
     * .withActivityName('ProcessPayment')
     * ```
     */
    withActivityName(activity: string): this;
    /**
     * Builds the Durable Activity trigger configuration.
     *
     * @returns Durable Activity trigger configuration object
     */
    build(): DurableActivityTriggerConfig;
}
/**
 * Helper function to create a durable activity trigger configuration.
 *
 * @param options - Optional configuration
 * @returns Complete durable activity trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = durableActivityTrigger({
 *   activity: 'ProcessPayment'
 * });
 * ```
 */
export declare function durableActivityTrigger(options?: {
    activity?: string;
}): DurableActivityTriggerConfig;
//# sourceMappingURL=durable-activity-trigger.d.ts.map