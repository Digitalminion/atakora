/**
 * Data Synthesizer Types
 *
 * Type definitions for the DataSynthesizer interface that generates Cosmos DB
 * resources from schema definitions.
 *
 * @module @atakora/component/synthesis/data-synthesizer-types
 */

import type {
  DatabaseAccounts,
  CosmosDBDatabase,
  CosmosDBContainer,
  ConsistencyLevel,
  IndexingPolicy,
} from '@atakora/cdk/documentdb';
import type { ResourceGroupStack } from '@atakora/lib';

/**
 * Schema object representing the data models to be synthesized.
 *
 * @remarks
 * This is the schema definition from the component/schema system.
 * Contains CRUD models, event models, and function models.
 */
export interface SchemaObject {
  /**
   * Schema name/identifier.
   */
  readonly name: string;

  /**
   * CRUD models in the schema.
   */
  readonly models: Record<string, any>;

  /**
   * Event models in the schema.
   */
  readonly events?: Record<string, any>;

  /**
   * Function models in the schema.
   */
  readonly functions?: Record<string, any>;

  /**
   * Schema metadata.
   */
  readonly metadata?: Record<string, any>;
}

/**
 * Data Synthesizer Interface
 *
 * Responsible for generating Cosmos DB resources from schema definitions.
 * Translates CRUD models into Cosmos DB containers with appropriate configuration.
 *
 * @remarks
 * The DataSynthesizer is invoked during the synthesis pipeline to create
 * the data layer infrastructure for a backend. It analyzes the schema and
 * creates:
 * - A Cosmos DB account (if not attached)
 * - A Cosmos DB database
 * - Containers for each CRUD model
 * - Indexing policies based on model fields
 * - Partition keys based on model structure
 *
 * @example
 * Basic usage in synthesis pipeline:
 * ```typescript
 * const dataSynthesizer = new DataSynthesizerImpl();
 * const dataResources = await dataSynthesizer.synthesize(schema, stack);
 *
 * // Access generated resources
 * console.log('Account:', dataResources.cosmosAccount.databaseAccountName);
 * console.log('Database:', dataResources.database.databaseName);
 * console.log('Containers:', dataResources.containers.map(c => c.containerName));
 * ```
 */
export interface DataSynthesizer {
  /**
   * Synthesize Cosmos DB resources from a schema definition.
   *
   * @param schema - Schema object containing data models
   * @param stack - Resource group stack to create resources in
   * @returns Promise resolving to data resources
   *
   * @throws {Error} If schema is invalid or missing required models
   * @throws {Error} If stack is not initialized
   *
   * @remarks
   * This method:
   * 1. Analyzes the schema to identify CRUD models
   * 2. Creates a Cosmos DB account with appropriate configuration
   * 3. Creates a database within the account
   * 4. Creates containers for each CRUD model
   * 5. Configures partition keys and indexing policies
   * 6. Returns references to all created resources
   *
   * The synthesizer applies sensible defaults:
   * - Session consistency level for account
   * - Serverless mode for dev environments
   * - Provisioned throughput for production
   * - Automatic indexing for all containers
   * - Partition key inference from model structure
   *
   * @example
   * ```typescript
   * const schema = {
   *   name: 'MyApp',
   *   models: {
   *     User: {
   *       id: field.id(),
   *       email: field.string(),
   *       name: field.string()
   *     },
   *     Product: {
   *       id: field.id(),
   *       categoryId: field.string(),
   *       name: field.string()
   *     }
   *   }
   * };
   *
   * const dataResources = await dataSynthesizer.synthesize(schema, stack);
   * // Creates account, database, and containers for User and Product
   * ```
   */
  synthesize(schema: SchemaObject, stack: ResourceGroupStack): Promise<DataResources>;
}

/**
 * Data Resources
 *
 * Result of data synthesis containing all generated Cosmos DB resources.
 *
 * @remarks
 * This type encapsulates all the CDK constructs created during data synthesis.
 * These resources can be referenced by other synthesis stages (compute, networking)
 * to establish connections and permissions.
 *
 * **Null Values:**
 * All properties are nullable to support placeholder implementations during
 * incremental development. Consumers should check for null before using.
 *
 * @example
 * Using data resources in compute synthesis:
 * ```typescript
 * const dataResources = await dataSynthesizer.synthesize(schema, stack);
 *
 * // Check for null before using
 * if (dataResources.cosmosAccount) {
 *   // Grant function app access to Cosmos DB
 *   const functionApp = new FunctionApp(stack, 'Api', {...});
 *   dataResources.cosmosAccount.grantDataWrite(functionApp);
 *
 *   // Add connection string to function app settings
 *   functionApp.addEnvironmentVariable(
 *     'COSMOS_ENDPOINT',
 *     dataResources.cosmosAccount.documentEndpoint
 *   );
 * }
 * ```
 */
export interface DataResources {
  /**
   * Cosmos DB account (L2 construct).
   *
   * @remarks
   * The database account is the top-level resource that contains databases.
   * It defines the consistency level, geo-replication, and throughput model.
   *
   * **Null in Placeholder Implementations:**
   * May be null during incremental development phases. Check before using.
   *
   * Use this to:
   * - Grant data plane access via grantDataRead/grantDataWrite
   * - Get the document endpoint for connection strings
   * - Reference the account in other resources
   */
  readonly cosmosAccount: DatabaseAccounts | null;

  /**
   * Cosmos DB database (L2 construct).
   *
   * @remarks
   * The database is a logical container for collections/containers.
   * It may have shared throughput (database-level) or delegate to containers.
   *
   * **Null in Placeholder Implementations:**
   * May be null during incremental development phases. Check before using.
   *
   * Use this to:
   * - Create additional containers programmatically
   * - Reference the database in connection strings
   * - Configure throughput at database level
   */
  readonly database: CosmosDBDatabase | null;

  /**
   * Cosmos DB containers (L2 constructs).
   *
   * @remarks
   * Each container corresponds to a CRUD model in the schema.
   * Containers have their own partition keys, indexing policies, and throughput.
   *
   * Use this to:
   * - Grant granular access to specific containers
   * - Reference containers in application configuration
   * - Query container metadata during synthesis
   *
   * The containers array is ordered by model name (alphabetically).
   */
  readonly containers: CosmosDBContainer[];
}

/**
 * Cosmos DB Account Configuration
 *
 * Configuration options for the Cosmos DB account.
 *
 * @remarks
 * These settings control the behavior and capabilities of the Cosmos DB account.
 * They can be specified via backend attachments or derived from environment context.
 *
 * @example
 * Production configuration with high availability:
 * ```typescript
 * const config: CosmosConfiguration = {
 *   accountName: 'cosdb-myapp-prod-01',
 *   databaseName: 'myapp-db',
 *   consistencyLevel: 'Session',
 *   enableServerless: false,
 *   throughput: 4000,
 *   enableMultiRegion: true,
 *   locations: ['eastus', 'westus']
 * };
 * ```
 *
 * @example
 * Development configuration with serverless:
 * ```typescript
 * const config: CosmosConfiguration = {
 *   consistencyLevel: 'Session',
 *   enableServerless: true
 * };
 * ```
 */
export interface CosmosConfiguration {
  /**
   * Cosmos DB account name (optional - auto-generated if not provided).
   *
   * @remarks
   * Must be globally unique across all of Azure.
   * Constraints:
   * - 3-44 characters
   * - Lowercase letters, numbers, and hyphens
   * - Cannot start or end with hyphen
   *
   * Pattern: ^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$
   *
   * If not provided, a name will be generated using the project naming convention.
   *
   * @example
   * ```typescript
   * accountName: 'cosdb-myapp-prod-001'
   * ```
   */
  readonly accountName?: string;

  /**
   * Database name (optional - defaults to project name).
   *
   * @remarks
   * Must be 1-255 characters.
   * If not provided, defaults to the project name from the naming context.
   *
   * @example
   * ```typescript
   * databaseName: 'myapp-db'
   * ```
   */
  readonly databaseName?: string;

  /**
   * Consistency level for the account (optional - defaults to Session).
   *
   * @remarks
   * Consistency levels (from weakest to strongest):
   * - Eventual: Best performance, eventual consistency
   * - Session: Default, read-your-writes within a session
   * - BoundedStaleness: Configurable lag, ordered reads
   * - Strong: Linearizability, lowest performance
   *
   * Session is recommended for most applications as it provides a good
   * balance between consistency and performance.
   *
   * @default 'Session'
   */
  readonly consistencyLevel?: ConsistencyLevel;

  /**
   * Enable serverless mode (optional - defaults based on environment).
   *
   * @remarks
   * Serverless mode:
   * - Pay per operation (request units consumed)
   * - No provisioned throughput
   * - Automatic scaling
   * - Best for dev/test and unpredictable workloads
   *
   * Provisioned mode:
   * - Fixed throughput allocation
   * - Predictable costs
   * - Better for consistent workloads
   *
   * @default true for 'development', false for 'production'
   *
   * @example
   * ```typescript
   * enableServerless: true  // Serverless mode
   * enableServerless: false // Provisioned mode
   * ```
   */
  readonly enableServerless?: boolean;

  /**
   * Provisioned throughput in RU/s (optional - only for provisioned mode).
   *
   * @remarks
   * Request Units per second for manual provisioned throughput.
   * Only used when enableServerless is false.
   *
   * Constraints:
   * - Minimum: 400 RU/s
   * - Increments: 100 RU/s
   *
   * Ignored if enableServerless is true.
   *
   * @example
   * ```typescript
   * throughput: 4000  // 4000 RU/s
   * ```
   */
  readonly throughput?: number;

  /**
   * Maximum throughput in RU/s for autoscale mode (optional).
   *
   * @remarks
   * Maximum Request Units per second for autoscale provisioned throughput.
   * Only used when enableServerless is false.
   *
   * Constraints:
   * - Minimum: 1000 RU/s
   * - Increments: 1000 RU/s
   *
   * Autoscale will automatically scale between 10% of max and the max value
   * based on load.
   *
   * Cannot be used with throughput (choose manual or autoscale, not both).
   *
   * @example
   * ```typescript
   * maxThroughput: 10000  // Autoscale up to 10000 RU/s
   * ```
   */
  readonly maxThroughput?: number;

  /**
   * Enable multi-region deployment (optional - defaults to false).
   *
   * @remarks
   * Enables geo-replication across multiple Azure regions for high availability.
   * Requires specifying locations array.
   *
   * @default false
   */
  readonly enableMultiRegion?: boolean;

  /**
   * Azure regions for multi-region deployment (optional).
   *
   * @remarks
   * List of Azure region names for geo-replication.
   * First location is the primary write region.
   * Subsequent locations are read replicas (or write regions if multi-master is enabled).
   *
   * Only used when enableMultiRegion is true.
   *
   * @example
   * ```typescript
   * locations: ['eastus', 'westus', 'northeurope']
   * ```
   */
  readonly locations?: string[];

  /**
   * Enable analytical storage (optional - defaults to false).
   *
   * @remarks
   * Azure Synapse Link for Cosmos DB enables HTAP scenarios.
   * Allows running analytics queries without impacting transactional workload.
   *
   * @default false
   */
  readonly enableAnalyticalStorage?: boolean;
}

/**
 * Container Configuration
 *
 * Configuration options for a Cosmos DB container.
 *
 * @remarks
 * These settings control the behavior of individual containers.
 * They are typically inferred from the schema model definition but can be
 * customized via model metadata or backend attachments.
 *
 * @example
 * Basic container configuration:
 * ```typescript
 * const config: ContainerConfiguration = {
 *   containerName: 'users',
 *   partitionKeyPath: '/userId',
 *   throughput: 400
 * };
 * ```
 *
 * @example
 * Advanced container with indexing and TTL:
 * ```typescript
 * const config: ContainerConfiguration = {
 *   containerName: 'sessions',
 *   partitionKeyPath: '/sessionId',
 *   defaultTtl: 3600, // 1 hour
 *   indexingPolicy: {
 *     automatic: true,
 *     indexingMode: 'consistent',
 *     includedPaths: [{ path: '/*' }],
 *     excludedPaths: [{ path: '/largeData/*' }]
 *   }
 * };
 * ```
 */
export interface ContainerConfiguration {
  /**
   * Container name (required).
   *
   * @remarks
   * Must be 1-255 characters.
   * Typically derived from the model name (pluralized and lowercased).
   *
   * @example
   * ```typescript
   * containerName: 'users'
   * containerName: 'products'
   * ```
   */
  readonly containerName: string;

  /**
   * Partition key path (required).
   *
   * @remarks
   * The property path used for partitioning data across physical partitions.
   *
   * Best practices:
   * - High cardinality (many unique values)
   * - Evenly distributed workload
   * - Frequently used in queries
   *
   * Common patterns:
   * - /id for single-tenant or unique per record
   * - /tenantId for multi-tenant applications
   * - /userId for user-scoped data
   * - /categoryId for category-based data
   *
   * @example
   * ```typescript
   * partitionKeyPath: '/userId'
   * partitionKeyPath: '/tenantId'
   * ```
   */
  readonly partitionKeyPath: string;

  /**
   * Provisioned throughput in RU/s (optional).
   *
   * @remarks
   * Request Units per second for this container.
   * Only used if:
   * - Database does not have shared throughput
   * - Account is in provisioned mode (not serverless)
   *
   * Constraints:
   * - Minimum: 400 RU/s
   * - Increments: 100 RU/s
   *
   * @example
   * ```typescript
   * throughput: 400  // 400 RU/s dedicated to this container
   * ```
   */
  readonly throughput?: number;

  /**
   * Maximum throughput in RU/s for autoscale (optional).
   *
   * @remarks
   * Maximum Request Units per second for autoscale mode.
   * Only used if account is in provisioned mode (not serverless).
   *
   * Constraints:
   * - Minimum: 1000 RU/s
   * - Increments: 1000 RU/s
   *
   * Cannot be used with throughput (choose manual or autoscale, not both).
   *
   * @example
   * ```typescript
   * maxThroughput: 4000  // Autoscale up to 4000 RU/s
   * ```
   */
  readonly maxThroughput?: number;

  /**
   * Indexing policy (optional - defaults to automatic indexing).
   *
   * @remarks
   * Controls how documents are indexed in the container.
   * Affects query performance and storage costs.
   *
   * If not specified, Cosmos DB will automatically index all paths.
   *
   * @example
   * ```typescript
   * indexingPolicy: {
   *   automatic: true,
   *   indexingMode: 'consistent',
   *   includedPaths: [{ path: '/*' }],
   *   excludedPaths: [{ path: '/largeData/*' }]
   * }
   * ```
   */
  readonly indexingPolicy?: IndexingPolicy;

  /**
   * Default time-to-live in seconds (optional).
   *
   * @remarks
   * Documents will be automatically deleted after this duration.
   *
   * Special values:
   * - -1: No expiration (default)
   * - 0: TTL disabled at container level (can override per document)
   * - >0: TTL in seconds
   *
   * Useful for:
   * - Session data
   * - Temporary caches
   * - Event logs with retention policies
   *
   * @example
   * ```typescript
   * defaultTtl: 3600     // 1 hour
   * defaultTtl: 86400    // 24 hours
   * defaultTtl: 2592000  // 30 days
   * ```
   */
  readonly defaultTtl?: number;

  /**
   * Analytical storage TTL in seconds (optional).
   *
   * @remarks
   * Time-to-live for analytical storage (Azure Synapse Link).
   * Only used if enableAnalyticalStorage is true on the account.
   *
   * Special values:
   * - -1: Infinite retention
   * - >0: TTL in seconds
   *
   * @example
   * ```typescript
   * analyticalStorageTtl: -1  // Keep forever
   * analyticalStorageTtl: 7776000  // 90 days
   * ```
   */
  readonly analyticalStorageTtl?: number;

  /**
   * Unique key policy (optional).
   *
   * @remarks
   * Defines uniqueness constraints on properties.
   * Enforced at the partition key level.
   *
   * @example
   * ```typescript
   * uniqueKeyPolicy: {
   *   uniqueKeys: [
   *     { paths: ['/email'] },
   *     { paths: ['/username'] }
   *   ]
   * }
   * ```
   */
  readonly uniqueKeyPolicy?: {
    readonly uniqueKeys: Array<{
      readonly paths: string[];
    }>;
  };

  /**
   * Conflict resolution policy (optional).
   *
   * @remarks
   * Defines how conflicts are resolved in multi-region write scenarios.
   *
   * Modes:
   * - LastWriterWins: Default, uses timestamp
   * - Custom: Use stored procedure for resolution
   *
   * @example
   * ```typescript
   * conflictResolutionPolicy: {
   *   mode: 'LastWriterWins',
   *   conflictResolutionPath: '/_ts'
   * }
   * ```
   */
  readonly conflictResolutionPolicy?: {
    readonly mode: 'LastWriterWins' | 'Custom';
    readonly conflictResolutionPath?: string;
    readonly conflictResolutionProcedure?: string;
  };
}

/**
 * Indexing Policy Configuration
 *
 * Detailed indexing policy for container optimization.
 *
 * @remarks
 * Re-exported from CDK types for convenience.
 * See {@link IndexingPolicy} for full documentation.
 *
 * @example
 * Exclude large binary fields from indexing:
 * ```typescript
 * const policy: IndexingPolicy = {
 *   automatic: true,
 *   indexingMode: 'consistent',
 *   includedPaths: [{ path: '/*' }],
 *   excludedPaths: [
 *     { path: '/attachments/*' },
 *     { path: '/binaryData/*' }
 *   ]
 * };
 * ```
 */
export type { IndexingPolicy };
