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
export declare class DurableOrchestratorTrigger {
    private orchestration?;
    /**
     * Creates a new Durable Orchestrator trigger builder.
     *
     * @returns New DurableOrchestratorTrigger builder instance
     */
    static create(): DurableOrchestratorTrigger;
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
    withOrchestrationName(orchestration: string): this;
    /**
     * Builds the Durable Orchestrator trigger configuration.
     *
     * @returns Durable Orchestrator trigger configuration object
     */
    build(): DurableOrchestratorTriggerConfig;
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
export declare function durableOrchestratorTrigger(options?: {
    orchestration?: string;
}): DurableOrchestratorTriggerConfig;
//# sourceMappingURL=durable-orchestrator-trigger.d.ts.map