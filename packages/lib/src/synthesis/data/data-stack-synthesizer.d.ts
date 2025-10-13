/**
 * Data Stack Synthesizer - Main orchestrator for Atakora data infrastructure synthesis.
 *
 * @remarks
 * Coordinates all sub-synthesizers to transform schemas into complete Azure infrastructure:
 * - Cosmos DB containers (via CosmosDbSynthesizer)
 * - Service Bus topics/subscriptions (via EventSynthesizer)
 * - GraphQL resolvers (via ResolverSynthesizer)
 * - Validates schema relationships
 * - Generates dependency graph for ARM resources
 *
 * @packageDocumentation
 */
import type { SchemaDefinition } from '../../schema/atakora/schema-types';
import type { SynthesisOptions } from '../types';
import { SchemaRegistry } from '../../schema/atakora/define-schema';
import { type CosmosContainerConfig } from './cosmos-synthesizer';
import { type TopicConfig, type SubscriptionConfig } from './event-synthesizer';
import { type ResolverConfig } from './resolver-synthesizer';
/**
 * Data stack manifest containing all synthesized infrastructure configurations.
 */
export interface DataStackManifest {
    /**
     * Cosmos DB configurations.
     */
    readonly cosmos: {
        readonly databaseName: string;
        readonly containers: CosmosContainerConfig[];
    };
    /**
     * Service Bus configurations.
     */
    readonly serviceBus: {
        readonly topics: TopicConfig[];
        readonly subscriptions: SubscriptionConfig[];
    };
    /**
     * GraphQL resolver configurations.
     */
    readonly resolvers: {
        readonly configs: ResolverConfig[];
        readonly inputTypes: Map<string, any>;
        readonly stats: Record<string, number>;
    };
    /**
     * Resource dependency graph.
     */
    readonly dependencies: DependencyGraph;
    /**
     * Synthesis metadata.
     */
    readonly metadata: {
        readonly schemaCount: number;
        readonly entityNames: string[];
        readonly synthesizedAt: string;
    };
}
/**
 * Dependency node in the graph.
 */
export interface DependencyNode {
    /**
     * Resource type.
     */
    readonly type: 'database' | 'container' | 'topic' | 'subscription' | 'resolver' | 'function';
    /**
     * Resource identifier.
     */
    readonly id: string;
    /**
     * Resource dependencies (resource IDs this depends on).
     */
    readonly dependsOn: string[];
    /**
     * Entity name (if applicable).
     */
    readonly entityName?: string;
}
/**
 * Resource dependency graph for proper ARM ordering.
 */
export interface DependencyGraph {
    /**
     * All nodes in the graph.
     */
    readonly nodes: DependencyNode[];
    /**
     * Topologically sorted resource IDs.
     */
    readonly sortedIds: string[];
}
/**
 * Data stack synthesis options.
 */
export interface DataStackSynthesisOptions extends SynthesisOptions {
    /**
     * Database name (optional - defaults to 'MainDB').
     */
    readonly databaseName?: string;
    /**
     * Enable event-driven architecture (Service Bus).
     */
    readonly enableEvents?: boolean;
    /**
     * Enable GraphQL API.
     */
    readonly enableGraphQL?: boolean;
    /**
     * Generate resolver code files.
     */
    readonly generateResolverCode?: boolean;
    /**
     * Incremental synthesis (only changed schemas).
     */
    readonly incremental?: boolean;
    /**
     * Changed schema names (for incremental synthesis).
     */
    readonly changedSchemas?: string[];
}
/**
 * Main Data Stack Synthesizer.
 *
 * @remarks
 * Orchestrates the synthesis of Atakora schemas into Azure infrastructure.
 *
 * @example
 * ```typescript
 * const synthesizer = new DataStackSynthesizer();
 * const manifest = synthesizer.synthesize(
 *   [UserSchema, PostSchema, CommentSchema],
 *   {
 *     outdir: './cdk.out',
 *     databaseName: 'BlogDB',
 *     enableEvents: true,
 *     enableGraphQL: true
 *   }
 * );
 * ```
 */
export declare class DataStackSynthesizer {
    private readonly registry;
    constructor();
    /**
     * Synthesize schemas into data stack infrastructure.
     *
     * @param schemas - Array of schema definitions
     * @param options - Synthesis options
     * @returns Data stack manifest
     */
    synthesize(schemas: SchemaDefinition<any>[], options: DataStackSynthesisOptions): DataStackManifest;
    /**
     * Validate all schemas.
     */
    private validateSchemas;
    /**
     * Register schemas in registry.
     */
    private registerSchemas;
    /**
     * Validate relationships across schemas.
     */
    private validateRelationships;
    /**
     * Select schemas to synthesize (for incremental synthesis).
     */
    private selectSchemasToSynthesize;
    /**
     * Synthesize Cosmos DB containers.
     */
    private synthesizeCosmosContainers;
    /**
     * Synthesize Service Bus events.
     */
    private synthesizeEvents;
    /**
     * Synthesize GraphQL resolvers.
     */
    private synthesizeGraphQLResolvers;
    /**
     * Build dependency graph for ARM resource ordering.
     */
    private buildDependencyGraph;
    /**
     * Get the schema registry.
     */
    getRegistry(): SchemaRegistry;
}
/**
 * Validate data stack manifest.
 */
export declare function validateDataStackManifest(manifest: DataStackManifest): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=data-stack-synthesizer.d.ts.map