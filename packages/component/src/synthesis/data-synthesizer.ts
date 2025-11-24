/**
 * Data Synthesizer - Cosmos DB Resource Orchestration
 *
 * Coordinates the creation of Cosmos DB resources (account, database, containers)
 * from backend schema definitions using CDK L2 constructs.
 *
 * @module @atakora/component/synthesis/data-synthesizer
 *
 * @remarks
 * The DataSynthesizer is responsible for:
 * - Creating Cosmos DB accounts with proper naming and configuration
 * - Creating databases with appropriate throughput settings
 * - Creating containers for each CRUD model in the schema
 * - Configuring partition keys and indexing policies
 *
 * **Architecture:**
 * - Uses ResourceNamingUtility for Azure-compliant resource naming
 * - Uses SchemaIntrospector to discover CRUD models from schema
 * - Creates CDK L2 constructs (DatabaseAccounts, CosmosDBDatabase, CosmosDBContainer)
 * - Returns DataResources with references to created constructs
 *
 * @example
 * Basic usage:
 * ```typescript
 * const dataSynthesizer = new DataSynthesizer();
 * const dataResources = await dataSynthesizer.synthesize(context, stack, options);
 *
 * // Access created resources
 * console.log('Cosmos Account:', dataResources.cosmosAccount.databaseAccountName);
 * console.log('Database:', dataResources.database.databaseName);
 * console.log('Containers:', dataResources.containers.map(c => c.containerName));
 * ```
 */

import type { DataResources, CosmosConfiguration } from './data-synthesizer-types';
import { ResourceNamingUtility } from './naming-utils';
import { SchemaIntrospector } from './schema-introspection';
import { pluralize } from './pluralization';
import type { SynthesisContext, SchemaObject } from './types';
import type { ResourceGroupStack } from '@atakora/lib';
import { DatabaseAccounts, CosmosDBDatabase, CosmosDBContainer } from '@atakora/cdk/documentdb';
import type { IDatabaseAccount, ICosmosDBDatabase, ICosmosDBContainer } from '@atakora/cdk/documentdb';
import { ConsistencyLevel, PublicNetworkAccess, IndexingMode } from '@atakora/cdk/documentdb';

/**
 * Options for data synthesis
 *
 * @remarks
 * Configuration options that control Cosmos DB resource creation.
 */
export interface DataSynthesisOptions {
  /**
   * Cosmos DB account configuration
   *
   * @remarks
   * If not specified, sensible defaults are applied based on environment.
   */
  readonly cosmos?: CosmosConfiguration;
}

/**
 * Data Synthesizer Implementation
 *
 * @remarks
 * Implements the DataSynthesizer interface to orchestrate Cosmos DB resource creation.
 * Uses CDK L2 constructs for type-safe, immutable infrastructure definitions.
 *
 * **Key Features:**
 * - Automatic resource naming using organizational conventions
 * - Environment-aware defaults (serverless for dev, provisioned for prod)
 * - CRUD model discovery via schema introspection
 * - Type-safe construct creation with validation
 * - Proper dependency management between resources
 *
 * @example
 * With custom configuration:
 * ```typescript
 * const dataSynthesizer = new DataSynthesizer();
 * const dataResources = await dataSynthesizer.synthesize(context, stack, {
 *   cosmos: {
 *     consistencyLevel: 'Strong',
 *     enableServerless: false,
 *     throughput: 4000
 *   }
 * });
 * ```
 */
export class DataSynthesizer {
  private readonly namingUtility: ResourceNamingUtility;
  private readonly introspector: SchemaIntrospector;

  /**
   * Creates a new DataSynthesizer instance
   *
   * @example
   * ```typescript
   * const dataSynthesizer = new DataSynthesizer();
   * ```
   */
  constructor() {
    this.namingUtility = new ResourceNamingUtility();
    this.introspector = new SchemaIntrospector();
  }

  /**
   * Synthesize Cosmos DB resources from schema definition
   *
   * @param context - Synthesis context with naming and environment info
   * @param stack - CDK ResourceGroupStack to add resources to
   * @param options - Optional configuration overrides
   * @returns DataResources with created Cosmos DB constructs
   *
   * @throws {Error} If schema is invalid or missing required models
   * @throws {Error} If resource creation fails
   *
   * @remarks
   * Orchestrates the complete data layer synthesis:
   * 1. Create Cosmos DB account with proper naming
   * 2. Create database with throughput from settings
   * 3. Discover CRUD models from schema
   * 4. Create container for each CRUD model
   * 5. Return DataResources with all created constructs
   *
   * **Resource Naming:**
   * - Account: `cosdb-{org}-{project}-{env}-{geo}-{instance}`
   * - Database: `{project}-db`
   * - Containers: `{modelName}` (lowercased, pluralized)
   *
   * **Default Configuration:**
   * - Development: Serverless mode, Session consistency
   * - Production: Provisioned mode (400 RU/s), Session consistency
   *
   * @example
   * ```typescript
   * const dataSynthesizer = new DataSynthesizer();
   * const dataResources = await dataSynthesizer.synthesize(context, stack);
   *
   * // Grant function app access to Cosmos DB
   * dataResources.cosmosAccount.grantDataWrite(functionApp);
   * ```
   */
  async synthesize(
    context: SynthesisContext,
    stack: ResourceGroupStack,
    options?: DataSynthesisOptions
  ): Promise<DataResources> {
    // Validate inputs
    if (!context) {
      throw new Error('Synthesis context is required');
    }
    if (!stack) {
      throw new Error('ResourceGroupStack is required');
    }
    if (!context.backend?.schema) {
      throw new Error('Backend schema is required for data synthesis');
    }

    // Get schema, ensuring it matches the SchemaObject interface
    const schema: SchemaObject = context.backend.schema as any;

    // 1. Create Cosmos DB account
    const cosmosAccount = this.createCosmosAccount(context, stack, options?.cosmos);

    // 2. Create database
    const database = this.createDatabase(context, stack, cosmosAccount, options?.cosmos);

    // 3. Create containers for CRUD models
    const containers = this.createContainersForModels(context, stack, database);

    // Return data resources
    return {
      cosmosAccount,
      database,
      containers,
    };
  }

  /**
   * Create Cosmos DB account
   *
   * @param context - Synthesis context
   * @param stack - Resource group stack
   * @param config - Optional Cosmos configuration
   * @returns Created Cosmos DB account construct
   *
   * @remarks
   * Creates a DatabaseAccounts L2 construct with:
   * - Auto-generated name using naming utility
   * - Environment-specific defaults (serverless for dev, provisioned for prod)
   * - Session consistency level (default)
   * - Disabled public network access (default)
   * - Tags from context
   *
   * @example
   * ```typescript
   * const account = this.createCosmosAccount(context, stack, {
   *   consistencyLevel: 'Strong',
   *   enableServerless: false
   * });
   * ```
   */
  private createCosmosAccount(
    context: SynthesisContext,
    stack: ResourceGroupStack,
    config?: CosmosConfiguration
  ): DatabaseAccounts {
    // Generate account name using naming utility
    const accountName = config?.accountName ||
      this.namingUtility.generateCosmosAccountName(context);

    // Determine if serverless based on environment
    const isDevelopment = context.environment === 'development';
    const enableServerless = config?.enableServerless ?? isDevelopment;

    // Create Cosmos DB account using L2 construct
    const cosmosAccount = new DatabaseAccounts(stack, 'CosmosAccount', {
      databaseAccountName: accountName,
      location: context.region,
      consistencyLevel: config?.consistencyLevel || ConsistencyLevel.SESSION,
      enableServerless,
      publicNetworkAccess: PublicNetworkAccess.DISABLED,
      tags: {
        ...context.tags,
        Environment: context.environment,
        ManagedBy: 'Atakora',
      },
    });

    return cosmosAccount;
  }

  /**
   * Create Cosmos DB database
   *
   * @param context - Synthesis context
   * @param stack - Resource group stack
   * @param account - Parent Cosmos DB account
   * @param config - Optional Cosmos configuration
   * @returns Created database construct
   *
   * @remarks
   * Creates a CosmosDBDatabase L2 construct with:
   * - Auto-generated name from project name
   * - Throughput from config or environment-specific defaults
   * - Manual or autoscale mode based on config
   *
   * **Throughput Defaults:**
   * - Serverless: No throughput (pay-per-operation)
   * - Development: 400 RU/s manual
   * - Production: 4000 RU/s autoscale
   *
   * @example
   * ```typescript
   * const database = this.createDatabase(context, stack, account, {
   *   throughput: 1000
   * });
   * ```
   */
  private createDatabase(
    context: SynthesisContext,
    stack: ResourceGroupStack,
    account: DatabaseAccounts,
    config?: CosmosConfiguration
  ): CosmosDBDatabase {
    // Generate database name
    const databaseName = config?.databaseName || `${context.naming.project}-db`;

    // Determine throughput settings
    // Serverless accounts don't have database-level throughput
    const isServerless = config?.enableServerless ?? (context.environment === 'development');

    let throughput: number | undefined;
    let maxThroughput: number | undefined;

    if (!isServerless) {
      if (config?.maxThroughput) {
        // Use autoscale if maxThroughput is specified
        maxThroughput = config.maxThroughput;
      } else if (config?.throughput) {
        // Use manual provisioned throughput
        throughput = config.throughput;
      } else {
        // Default: autoscale for production, manual for others
        if (context.environment === 'production') {
          maxThroughput = 4000;
        } else {
          throughput = 400;
        }
      }
    }

    // Create database using L2 construct
    const database = new CosmosDBDatabase(stack, 'Database', {
      account,
      databaseName,
      throughput,
      maxThroughput,
      tags: {
        ...context.tags,
        Environment: context.environment,
      },
    });

    return database;
  }

  /**
   * Create containers for CRUD models
   *
   * @param context - Synthesis context
   * @param stack - Resource group stack
   * @param database - Parent database
   * @returns Array of created container constructs
   *
   * @remarks
   * Discovers CRUD models from schema using introspector and creates
   * a container for each model with:
   * - Container name from model name (lowercased, pluralized)
   * - Partition key: `/id` (default for single-entity partitioning)
   * - Automatic indexing enabled
   * - No container-level throughput (inherits from database)
   *
   * **Future Enhancements (DEV-1-011):**
   * - Custom partition key inference from model structure
   * - Optimized indexing policies based on field types
   * - TTL configuration for time-series data
   * - Unique key constraints from model validation rules
   *
   * @example
   * ```typescript
   * const containers = this.createContainersForModels(context, stack, database);
   * console.log(`Created ${containers.length} containers`);
   * ```
   */
  private createContainersForModels(
    context: SynthesisContext,
    stack: ResourceGroupStack,
    database: CosmosDBDatabase
  ): CosmosDBContainer[] {
    // Get CRUD models from schema using introspector
    // Type assertion needed due to different SchemaObject types in lib vs component
    const crudModels = this.introspector.getCrudModels(context.backend.schema as any);

    if (crudModels.length === 0) {
      // No CRUD models found - return empty array
      return [];
    }

    // Create container for each CRUD model
    const containers: CosmosDBContainer[] = [];

    for (const model of crudModels) {
      // Generate container name from model name
      // Convert to lowercase and pluralize (simple pluralization for now)
      const containerName = this.generateContainerName(model.name);

      // Create container using L2 construct
      const container = new CosmosDBContainer(stack, `Container-${model.name}`, {
        database,
        containerName,
        partitionKeyPath: '/id', // Default partition key
        indexingPolicy: {
          automatic: true,
          indexingMode: IndexingMode.CONSISTENT,
          includedPaths: [{ path: '/*' }],
        },
        tags: {
          ...context.tags,
          Model: model.name,
          ModelType: 'crud',
        },
      });

      containers.push(container);
    }

    // Return array of containers
    return containers;
  }

  /**
   * Generate container name from model name
   *
   * @param modelName - Model name
   * @returns Container name (lowercase, pluralized)
   *
   * @remarks
   * Uses the Wave 3 pluralization utility to convert model names to container names.
   * This handles all English pluralization rules including:
   * - Standard plurals (User -> users)
   * - Irregular plurals (Person -> people, Child -> children)
   * - Special endings (Category -> categories, Address -> addresses)
   *
   * @example
   * ```typescript
   * this.generateContainerName('User')     // 'users'
   * this.generateContainerName('Category') // 'categories'
   * this.generateContainerName('Address')  // 'addresses'
   * this.generateContainerName('Person')   // 'people'
   * ```
   */
  private generateContainerName(modelName: string): string {
    return pluralize(modelName).toLowerCase();
  }
}

/**
 * Convenience function to create a DataSynthesizer instance
 *
 * @returns New DataSynthesizer instance
 *
 * @example
 * ```typescript
 * import { createDataSynthesizer } from '@atakora/component/synthesis';
 *
 * const dataSynthesizer = createDataSynthesizer();
 * const dataResources = await dataSynthesizer.synthesize(context, stack);
 * ```
 */
export function createDataSynthesizer(): DataSynthesizer {
  return new DataSynthesizer();
}
