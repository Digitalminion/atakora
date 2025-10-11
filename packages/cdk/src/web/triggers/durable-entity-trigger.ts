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
export class DurableEntityTrigger {
  private entityName?: string;

  /**
   * Creates a new Durable Entity trigger builder.
   *
   * @returns New DurableEntityTrigger builder instance
   */
  public static create(): DurableEntityTrigger {
    return new DurableEntityTrigger();
  }

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
  public withEntityName(entityName: string): this {
    this.entityName = entityName;
    return this;
  }

  /**
   * Builds the Durable Entity trigger configuration.
   *
   * @returns Durable Entity trigger configuration object
   */
  public build(): DurableEntityTriggerConfig {
    return {
      type: 'entityTrigger',
      entityName: this.entityName,
    };
  }
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
export function durableEntityTrigger(
  options: {
    entityName?: string;
  } = {}
): DurableEntityTriggerConfig {
  return {
    type: 'entityTrigger',
    entityName: options.entityName,
  };
}
