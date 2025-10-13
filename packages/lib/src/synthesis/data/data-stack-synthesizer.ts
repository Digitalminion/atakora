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
import { SchemaRegistry, validateSchema } from '../../schema/atakora/define-schema';
import { synthesizeCosmosContainer, type CosmosContainerConfig } from './cosmos-synthesizer';
import {
  synthesizeEventTopics,
  type EventSynthesisResult,
  type TopicConfig,
  type SubscriptionConfig,
} from './event-synthesizer';
import {
  synthesizeResolvers,
  type ResolverSynthesisResult,
  type ResolverConfig,
} from './resolver-synthesizer';

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
export class DataStackSynthesizer {
  private readonly registry: SchemaRegistry;

  constructor() {
    this.registry = new SchemaRegistry();
  }

  /**
   * Synthesize schemas into data stack infrastructure.
   *
   * @param schemas - Array of schema definitions
   * @param options - Synthesis options
   * @returns Data stack manifest
   */
  public synthesize(
    schemas: SchemaDefinition<any>[],
    options: DataStackSynthesisOptions
  ): DataStackManifest {
    // Validate individual schemas
    this.validateSchemas(schemas);

    // Register schemas for cross-validation
    this.registerSchemas(schemas);

    // Validate relationships across schemas
    this.validateRelationships();

    // Determine which schemas to synthesize (incremental or all)
    const schemasToSynthesize = this.selectSchemasToSynthesize(schemas, options);

    // Synthesize Cosmos DB containers
    const containers = this.synthesizeCosmosContainers(schemasToSynthesize);

    // Synthesize Service Bus topics and subscriptions
    const eventResult = this.synthesizeEvents(schemas, options);

    // Synthesize GraphQL resolvers
    const resolverResult = this.synthesizeGraphQLResolvers(schemasToSynthesize, options);

    // Build dependency graph
    const dependencies = this.buildDependencyGraph(
      containers,
      eventResult,
      resolverResult,
      options
    );

    // Create manifest
    const manifest: DataStackManifest = {
      cosmos: {
        databaseName: options.databaseName || 'MainDB',
        containers,
      },
      serviceBus: {
        topics: eventResult.topics,
        subscriptions: eventResult.subscriptions,
      },
      resolvers: {
        configs: resolverResult.resolvers,
        inputTypes: resolverResult.inputTypes,
        stats: resolverResult.stats,
      },
      dependencies,
      metadata: {
        schemaCount: schemas.length,
        entityNames: schemas.map((s) => s.name),
        synthesizedAt: new Date().toISOString(),
      },
    };

    return manifest;
  }

  /**
   * Validate all schemas.
   */
  private validateSchemas(schemas: SchemaDefinition<any>[]): void {
    const errors: string[] = [];

    for (const schema of schemas) {
      const validation = validateSchema(schema);
      if (!validation.valid) {
        errors.push(
          `Schema '${schema.name}' validation failed:\n  ${validation.errors.join('\n  ')}`
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(`Schema validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Register schemas in registry.
   */
  private registerSchemas(schemas: SchemaDefinition<any>[]): void {
    this.registry.clear();
    for (const schema of schemas) {
      this.registry.register(schema);
    }
  }

  /**
   * Validate relationships across schemas.
   */
  private validateRelationships(): void {
    const validation = this.registry.validateRelationships();
    if (!validation.valid) {
      throw new Error(
        `Cross-schema relationship validation failed:\n  ${validation.errors.join('\n  ')}`
      );
    }
  }

  /**
   * Select schemas to synthesize (for incremental synthesis).
   */
  private selectSchemasToSynthesize(
    schemas: SchemaDefinition<any>[],
    options: DataStackSynthesisOptions
  ): SchemaDefinition<any>[] {
    if (!options.incremental || !options.changedSchemas) {
      return schemas;
    }

    // Filter to only changed schemas and their dependents
    const changedSet = new Set(options.changedSchemas);
    const toSynthesize: SchemaDefinition<any>[] = [];

    for (const schema of schemas) {
      if (changedSet.has(schema.name)) {
        toSynthesize.push(schema);
        continue;
      }

      // Check if schema depends on any changed schema (via relationships)
      if (schema.relationships) {
        const dependsOnChanged = Object.values(schema.relationships).some((rel) => {
          const target = 'target' in rel ? rel.target : undefined;
          return target && changedSet.has(target);
        });

        if (dependsOnChanged) {
          toSynthesize.push(schema);
        }
      }
    }

    return toSynthesize;
  }

  /**
   * Synthesize Cosmos DB containers.
   */
  private synthesizeCosmosContainers(
    schemas: SchemaDefinition<any>[]
  ): CosmosContainerConfig[] {
    return schemas.map((schema) => synthesizeCosmosContainer(schema));
  }

  /**
   * Synthesize Service Bus events.
   */
  private synthesizeEvents(
    schemas: SchemaDefinition<any>[],
    options: DataStackSynthesisOptions
  ): EventSynthesisResult {
    if (options.enableEvents === false) {
      return { topics: [], subscriptions: [] };
    }

    return synthesizeEventTopics(schemas, this.registry);
  }

  /**
   * Synthesize GraphQL resolvers.
   */
  private synthesizeGraphQLResolvers(
    schemas: SchemaDefinition<any>[],
    options: DataStackSynthesisOptions
  ): ResolverSynthesisResult {
    if (options.enableGraphQL === false) {
      return {
        resolvers: [],
        inputTypes: new Map(),
        stats: {
          get: 0,
          list: 0,
          create: 0,
          update: 0,
          delete: 0,
          relationship: 0,
          computed: 0,
          subscription: 0,
        },
      };
    }

    // Synthesize resolvers for each schema
    const allResolvers: ResolverConfig[] = [];
    const allInputTypes = new Map<string, any>();
    const combinedStats = {
      get: 0,
      list: 0,
      create: 0,
      update: 0,
      delete: 0,
      relationship: 0,
      computed: 0,
      subscription: 0,
    };

    for (const schema of schemas) {
      const result = synthesizeResolvers(schema);
      allResolvers.push(...result.resolvers);

      // Merge input types
      for (const [name, type] of result.inputTypes.entries()) {
        allInputTypes.set(name, type);
      }

      // Accumulate stats
      combinedStats.get += result.stats.get;
      combinedStats.list += result.stats.list;
      combinedStats.create += result.stats.create;
      combinedStats.update += result.stats.update;
      combinedStats.delete += result.stats.delete;
      combinedStats.relationship += result.stats.relationship;
      combinedStats.computed += result.stats.computed;
      combinedStats.subscription += result.stats.subscription;
    }

    return {
      resolvers: allResolvers,
      inputTypes: allInputTypes,
      stats: combinedStats,
    };
  }

  /**
   * Build dependency graph for ARM resource ordering.
   */
  private buildDependencyGraph(
    containers: CosmosContainerConfig[],
    eventResult: EventSynthesisResult,
    resolverResult: ResolverSynthesisResult,
    options: DataStackSynthesisOptions
  ): DependencyGraph {
    const nodes: DependencyNode[] = [];
    const databaseId = `database:${options.databaseName || 'MainDB'}`;

    // Database node (no dependencies)
    nodes.push({
      type: 'database',
      id: databaseId,
      dependsOn: [],
    });

    // Container nodes (depend on database)
    for (const container of containers) {
      nodes.push({
        type: 'container',
        id: `container:${container.containerName}`,
        dependsOn: [databaseId],
        entityName: container.containerName,
      });
    }

    // Topic nodes (no dependencies)
    for (const topic of eventResult.topics) {
      nodes.push({
        type: 'topic',
        id: `topic:${topic.topicName}`,
        dependsOn: [],
        entityName: topic.entityName,
      });
    }

    // Subscription nodes (depend on topics)
    for (const sub of eventResult.subscriptions) {
      nodes.push({
        type: 'subscription',
        id: `subscription:${sub.subscriptionName}`,
        dependsOn: [`topic:${sub.topicName}`],
        entityName: sub.subscriberEntity,
      });
    }

    // Resolver/Function nodes (depend on containers)
    for (const resolver of resolverResult.resolvers) {
      nodes.push({
        type: 'resolver',
        id: `resolver:${resolver.resolverName}`,
        dependsOn: [`container:${resolver.entityName}`],
        entityName: resolver.entityName,
      });
    }

    // Topological sort
    const sortedIds = topologicalSort(nodes);

    return {
      nodes,
      sortedIds,
    };
  }

  /**
   * Get the schema registry.
   */
  public getRegistry(): SchemaRegistry {
    return this.registry;
  }
}

/**
 * Topological sort of dependency graph.
 *
 * @param nodes - Dependency nodes
 * @returns Topologically sorted resource IDs
 */
function topologicalSort(nodes: DependencyNode[]): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  // Build adjacency map
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function visit(id: string): void {
    if (visited.has(id)) return;

    if (visiting.has(id)) {
      throw new Error(`Circular dependency detected: ${id}`);
    }

    visiting.add(id);

    const node = nodeMap.get(id);
    if (node) {
      for (const dep of node.dependsOn) {
        visit(dep);
      }
    }

    visiting.delete(id);
    visited.add(id);
    sorted.push(id);
  }

  for (const node of nodes) {
    visit(node.id);
  }

  return sorted;
}

/**
 * Validate data stack manifest.
 */
export function validateDataStackManifest(
  manifest: DataStackManifest
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate Cosmos DB configuration
  if (!manifest.cosmos.databaseName) {
    errors.push('Database name is required');
  }

  if (manifest.cosmos.containers.length === 0) {
    errors.push('At least one container is required');
  }

  // Validate dependency graph
  if (manifest.dependencies.nodes.length === 0) {
    errors.push('Dependency graph is empty');
  }

  // Check for circular dependencies (should have been caught during sort)
  try {
    topologicalSort(manifest.dependencies.nodes);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`Dependency graph error: ${error.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
