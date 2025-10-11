/**
 * Durable Orchestrator trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */

import type { DurableOrchestratorTriggerConfig } from '../function-app-types';

/**
 * Builder for creating Durable Orchestrator trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building durable orchestrator trigger configurations.
 *
 * @example
 * ```typescript
 * const trigger = DurableOrchestratorTrigger.create()
 *   .withOrchestrationName('ProcessOrder')
 *   .build();
 * ```
 */
export class DurableOrchestratorTrigger {
  private orchestration?: string;

  /**
   * Creates a new Durable Orchestrator trigger builder.
   *
   * @returns New DurableOrchestratorTrigger builder instance
   */
  public static create(): DurableOrchestratorTrigger {
    return new DurableOrchestratorTrigger();
  }

  /**
   * Sets the orchestration name.
   *
   * @param orchestration - Orchestration function name
   * @returns This builder for chaining
   *
   * @remarks
   * Optional. If not specified, defaults to the function name.
   *
   * @example
   * ```typescript
   * .withOrchestrationName('ProcessOrder')
   * ```
   */
  public withOrchestrationName(orchestration: string): this {
    this.orchestration = orchestration;
    return this;
  }

  /**
   * Builds the Durable Orchestrator trigger configuration.
   *
   * @returns Durable Orchestrator trigger configuration object
   */
  public build(): DurableOrchestratorTriggerConfig {
    return {
      type: 'orchestrationTrigger',
      orchestration: this.orchestration,
    };
  }
}

/**
 * Helper function to create a durable orchestrator trigger configuration.
 *
 * @param options - Optional configuration
 * @returns Complete durable orchestrator trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = durableOrchestratorTrigger({
 *   orchestration: 'ProcessOrder'
 * });
 * ```
 */
export function durableOrchestratorTrigger(
  options: {
    orchestration?: string;
  } = {}
): DurableOrchestratorTriggerConfig {
  return {
    type: 'orchestrationTrigger',
    orchestration: options.orchestration,
  };
}
