/**
 * Durable Entity trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */
import type { DurableEntityTriggerConfig } from '../function-app-types';
/**
 * Builder for creating Durable Entity trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building durable entity trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = DurableEntityTrigger.create()
 *   .withEntityName('Counter')
 *   .build();
 * ```
 */
export declare class DurableEntityTrigger {
    private entityName?;
    /**
     * Creates a new Durable Entity trigger builder.
     *
     * @returns New DurableEntityTrigger builder instance
     */
    static create(): DurableEntityTrigger;
    /**
     * Sets the entity name.
     *
     * @param entityName - Entity function name
     * @returns This builder for chaining
     *
     * @remarks
     * Optional. If not specified, defaults to the function name.
     *
     * @example
     * ```typescript
     * .withEntityName('Counter')
     * ```
     */
    withEntityName(entityName: string): this;
    /**
     * Builds the Durable Entity trigger configuration.
     *
     * @returns Durable Entity trigger configuration object
     */
    build(): DurableEntityTriggerConfig;
}
/**
 * Helper function to create a durable entity trigger configuration.
 *
 * @param options - Optional configuration
 * @returns Complete durable entity trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = durableEntityTrigger({
 *   entityName: 'Counter'
 * });
 * ```
 */
export declare function durableEntityTrigger(options?: {
    entityName?: string;
}): DurableEntityTriggerConfig;
//# sourceMappingURL=durable-entity-trigger.d.ts.map