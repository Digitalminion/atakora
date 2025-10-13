/**
 * GraphQL Resolver Builder for auto-generating resolvers.
 *
 * @remarks
 * Automatically generates resolvers for GraphQL APIs with Cosmos DB backend
 * and authorization middleware integration.
 *
 * @packageDocumentation
 */

import type {
  GraphQLSchemaDefinition,
  GraphQLObjectTypeDefinition,
  GraphQLFieldDefinition,
  GraphQLFieldResolver,
} from './types';
import { GraphQLResolverType } from './types';
import type { IDatabaseAccount } from '../../documentdb/cosmos-db-types';
import type { IFunctionApp } from '../../functions/function-app-types';
import type { AuthorizationConfig } from '../../functions/middleware/authorization';

/**
 * Data source configuration for resolvers.
 */
export interface DataSourceConfig {
  /**
   * Data source type.
   */
  readonly type: 'cosmosdb' | 'sql' | 'http' | 'function' | 'custom';

  /**
   * Cosmos DB configuration.
   */
  readonly cosmosDb?: {
    readonly account: IDatabaseAccount;
    readonly databaseName: string;
    readonly containerName: string;
    readonly partitionKeyPath?: string;
  };

  /**
   * SQL configuration.
   */
  readonly sql?: {
    readonly connectionString: string;
    readonly tableName: string;
  };

  /**
   * HTTP configuration.
   */
  readonly http?: {
    readonly baseUrl: string;
    readonly headers?: Record<string, string>;
  };

  /**
   * Azure Function configuration.
   */
  readonly function?: {
    readonly functionApp: IFunctionApp;
    readonly functionName: string;
  };

  /**
   * Custom resolver implementation.
   */
  readonly custom?: {
    readonly handler: string;
  };
}

/**
 * CRUD operation configuration.
 */
export interface CrudOperationConfig {
  /**
   * Entity type name (e.g., 'User', 'Post').
   */
  readonly entityType: string;

  /**
   * Primary key field name.
   */
  readonly idField: string;

  /**
   * Partition key field name (for Cosmos DB).
   */
  readonly partitionKeyField?: string;

  /**
   * Authorization configuration per operation.
   */
  readonly authorization?: {
    readonly create?: AuthorizationConfig;
    readonly read?: AuthorizationConfig;
    readonly update?: AuthorizationConfig;
    readonly delete?: AuthorizationConfig;
    readonly list?: AuthorizationConfig;
  };

  /**
   * Enable automatic timestamp fields.
   */
  readonly timestamps?: {
    readonly createdAt?: string;
    readonly updatedAt?: string;
  };

  /**
   * Soft delete field name.
   */
  readonly softDeleteField?: string;
}

/**
 * Resolver generation options.
 */
export interface ResolverGenerationOptions {
  /**
   * Data source configuration.
   */
  readonly dataSource: DataSourceConfig;

  /**
   * CRUD operation configurations per entity.
   */
  readonly crudOperations?: Record<string, CrudOperationConfig>;

  /**
   * Custom resolver implementations.
   */
  readonly customResolvers?: Record<string, Record<string, GraphQLFieldResolver>>;

  /**
   * Enable DataLoader for N+1 query optimization.
   */
  readonly enableDataLoader?: boolean;

  /**
   * Enable caching.
   */
  readonly enableCaching?: boolean;

  /**
   * Cache TTL in seconds.
   */
  readonly cacheTtl?: number;
}

/**
 * Generated resolver metadata.
 */
export interface GeneratedResolverMetadata {
  /**
   * Resolver type.
   */
  readonly type: GraphQLResolverType;

  /**
   * Field path (e.g., 'Query.getUser').
   */
  readonly fieldPath: string;

  /**
   * Data source type.
   */
  readonly dataSourceType: string;

  /**
   * Whether authorization is enabled.
   */
  readonly hasAuthorization: boolean;

  /**
   * Whether caching is enabled.
   */
  readonly hasCaching: boolean;
}

/**
 * GraphQL Resolver Builder.
 *
 * @remarks
 * Generates resolvers for GraphQL APIs with automatic CRUD operations,
 * authorization, and data source integration.
 *
 * @example
 * **Auto-generate CRUD resolvers:**
 * ```typescript
 * const builder = new GraphQLResolverBuilder({
 *   dataSource: {
 *     type: 'cosmosdb',
 *     cosmosDb: {
 *       account: cosmosAccount,
 *       databaseName: 'mydb',
 *       containerName: 'users',
 *       partitionKeyPath: '/tenantId'
 *     }
 *   },
 *   crudOperations: {
 *     'User': {
 *       entityType: 'User',
 *       idField: 'id',
 *       partitionKeyField: 'tenantId',
 *       authorization: {
 *         create: { rule: Allow.authenticated() },
 *         read: { rule: Allow.owner('userId').or(Allow.role('admin')) },
 *         update: { rule: Allow.owner('userId') },
 *         delete: { rule: Allow.role('admin') }
 *       }
 *     }
 *   }
 * });
 *
 * const schema = builder.generateSchema();
 * ```
 */
export class GraphQLResolverBuilder {
  private readonly options: ResolverGenerationOptions;
  private readonly resolverMetadata: Map<string, GeneratedResolverMetadata> = new Map();

  constructor(options: ResolverGenerationOptions) {
    this.options = options;
  }

  /**
   * Generate GraphQL schema with resolvers.
   *
   * @returns GraphQL schema definition
   */
  public generateSchema(): GraphQLSchemaDefinition {
    const schema: GraphQLSchemaDefinition = {
      query: this.generateQueryType(),
      mutation: this.generateMutationType(),
      subscription: this.generateSubscriptionType(),
      types: this.generateTypes(),
    };

    return schema;
  }

  /**
   * Generate Query type with CRUD read operations.
   */
  private generateQueryType(): GraphQLObjectTypeDefinition {
    const fields: Record<string, GraphQLFieldDefinition> = {};

    if (this.options.crudOperations) {
      for (const [entityType, config] of Object.entries(this.options.crudOperations)) {
        // Generate get{Entity} query
        fields[`get${entityType}`] = {
          type: entityType,
          description: `Get a single ${entityType} by ID`,
          args: {
            [config.idField]: { type: 'ID!' },
            ...(config.partitionKeyField && {
              [config.partitionKeyField]: { type: 'String!' },
            }),
          },
          resolver: this.generateGetResolver(entityType, config),
        };

        // Generate list{Entities} query
        fields[`list${entityType}s`] = {
          type: `${entityType}Connection!`,
          description: `List ${entityType} entities with pagination`,
          args: {
            filter: { type: `${entityType}Filter` },
            limit: { type: 'Int', defaultValue: 100 },
            nextToken: { type: 'String' },
            sortDirection: { type: 'SortDirection' },
          },
          resolver: this.generateListResolver(entityType, config),
        };
      }
    }

    return {
      name: 'Query',
      fields,
    };
  }

  /**
   * Generate Mutation type with CRUD write operations.
   */
  private generateMutationType(): GraphQLObjectTypeDefinition {
    const fields: Record<string, GraphQLFieldDefinition> = {};

    if (this.options.crudOperations) {
      for (const [entityType, config] of Object.entries(this.options.crudOperations)) {
        // Generate create{Entity} mutation
        fields[`create${entityType}`] = {
          type: `${entityType}!`,
          description: `Create a new ${entityType}`,
          args: {
            input: { type: `Create${entityType}Input!` },
          },
          resolver: this.generateCreateResolver(entityType, config),
        };

        // Generate update{Entity} mutation
        fields[`update${entityType}`] = {
          type: `${entityType}!`,
          description: `Update an existing ${entityType}`,
          args: {
            [config.idField]: { type: 'ID!' },
            input: { type: `Update${entityType}Input!` },
          },
          resolver: this.generateUpdateResolver(entityType, config),
        };

        // Generate delete{Entity} mutation
        fields[`delete${entityType}`] = {
          type: `${entityType}!`,
          description: `Delete an existing ${entityType}`,
          args: {
            [config.idField]: { type: 'ID!' },
          },
          resolver: this.generateDeleteResolver(entityType, config),
        };
      }
    }

    return {
      name: 'Mutation',
      fields,
    };
  }

  /**
   * Generate Subscription type for real-time updates.
   */
  private generateSubscriptionType(): GraphQLObjectTypeDefinition | undefined {
    const fields: Record<string, GraphQLFieldDefinition> = {};

    if (this.options.crudOperations) {
      for (const [entityType, config] of Object.entries(this.options.crudOperations)) {
        // Generate onCreate{Entity} subscription
        fields[`onCreate${entityType}`] = {
          type: entityType,
          description: `Subscribe to ${entityType} creation events`,
          args: {
            filter: { type: `${entityType}Filter` },
          },
          resolver: this.generateSubscriptionResolver(entityType, 'create', config),
        };

        // Generate onUpdate{Entity} subscription
        fields[`onUpdate${entityType}`] = {
          type: entityType,
          description: `Subscribe to ${entityType} update events`,
          args: {
            filter: { type: `${entityType}Filter` },
          },
          resolver: this.generateSubscriptionResolver(entityType, 'update', config),
        };

        // Generate onDelete{Entity} subscription
        fields[`onDelete${entityType}`] = {
          type: entityType,
          description: `Subscribe to ${entityType} deletion events`,
          args: {
            filter: { type: `${entityType}Filter` },
          },
          resolver: this.generateSubscriptionResolver(entityType, 'delete', config),
        };
      }
    }

    return Object.keys(fields).length > 0
      ? { name: 'Subscription', fields }
      : undefined;
  }

  /**
   * Generate additional types (filters, inputs, connections).
   */
  private generateTypes(): any[] {
    const types: any[] = [];

    // Add standard types
    types.push(this.generateSortDirectionEnum());

    if (this.options.crudOperations) {
      for (const [entityType] of Object.entries(this.options.crudOperations)) {
        types.push(this.generateFilterInput(entityType));
        types.push(this.generateCreateInput(entityType));
        types.push(this.generateUpdateInput(entityType));
        types.push(this.generateConnectionType(entityType));
      }
    }

    return types;
  }

  /**
   * Generate get resolver for an entity.
   */
  private generateGetResolver(
    entityType: string,
    config: CrudOperationConfig
  ): GraphQLFieldResolver {
    const metadata: GeneratedResolverMetadata = {
      type: this.getResolverType(),
      fieldPath: `Query.get${entityType}`,
      dataSourceType: this.options.dataSource.type,
      hasAuthorization: !!config.authorization?.read,
      hasCaching: this.options.enableCaching ?? false,
    };

    this.resolverMetadata.set(metadata.fieldPath, metadata);

    if (this.options.dataSource.type === 'cosmosdb') {
      return {
        type: this.getResolverType(),
        config: {
          accountEndpoint: this.options.dataSource.cosmosDb!.account.documentEndpoint,
          databaseName: this.options.dataSource.cosmosDb!.databaseName,
          containerName: this.options.dataSource.cosmosDb!.containerName,
          query: `SELECT * FROM c WHERE c.${config.idField} = @${config.idField}`,
          partitionKeyPath: this.options.dataSource.cosmosDb!.partitionKeyPath,
        },
      };
    }

    // Default to Azure Function resolver
    return {
      type: GraphQLResolverType.AZURE_FUNCTION,
      config: {
        functionAppId: '[function-app-id]',
        functionName: `get${entityType}`,
      },
    };
  }

  /**
   * Generate list resolver for an entity.
   */
  private generateListResolver(
    entityType: string,
    config: CrudOperationConfig
  ): GraphQLFieldResolver {
    const metadata: GeneratedResolverMetadata = {
      type: this.getResolverType(),
      fieldPath: `Query.list${entityType}s`,
      dataSourceType: this.options.dataSource.type,
      hasAuthorization: !!config.authorization?.list,
      hasCaching: this.options.enableCaching ?? false,
    };

    this.resolverMetadata.set(metadata.fieldPath, metadata);

    return {
      type: this.getResolverType(),
      config: {
        accountEndpoint: this.options.dataSource.cosmosDb?.account.documentEndpoint || '',
        databaseName: this.options.dataSource.cosmosDb?.databaseName || '',
        containerName: this.options.dataSource.cosmosDb?.containerName || '',
        query: `SELECT * FROM c ORDER BY c._ts DESC OFFSET @offset LIMIT @limit`,
      },
    };
  }

  /**
   * Generate create resolver for an entity.
   */
  private generateCreateResolver(
    entityType: string,
    config: CrudOperationConfig
  ): GraphQLFieldResolver {
    return {
      type: GraphQLResolverType.AZURE_FUNCTION,
      config: {
        functionAppId: '[function-app-id]',
        functionName: `create${entityType}`,
      },
    };
  }

  /**
   * Generate update resolver for an entity.
   */
  private generateUpdateResolver(
    entityType: string,
    config: CrudOperationConfig
  ): GraphQLFieldResolver {
    return {
      type: GraphQLResolverType.AZURE_FUNCTION,
      config: {
        functionAppId: '[function-app-id]',
        functionName: `update${entityType}`,
      },
    };
  }

  /**
   * Generate delete resolver for an entity.
   */
  private generateDeleteResolver(
    entityType: string,
    config: CrudOperationConfig
  ): GraphQLFieldResolver {
    return {
      type: GraphQLResolverType.AZURE_FUNCTION,
      config: {
        functionAppId: '[function-app-id]',
        functionName: `delete${entityType}`,
      },
    };
  }

  /**
   * Generate subscription resolver for an entity.
   */
  private generateSubscriptionResolver(
    entityType: string,
    operation: 'create' | 'update' | 'delete',
    config: CrudOperationConfig
  ): GraphQLFieldResolver {
    return {
      type: GraphQLResolverType.AZURE_FUNCTION,
      config: {
        functionAppId: '[function-app-id]',
        functionName: `on${operation}${entityType}Subscription`,
      },
    };
  }

  /**
   * Get resolver type based on data source.
   */
  private getResolverType(): GraphQLResolverType {
    switch (this.options.dataSource.type) {
      case 'cosmosdb':
        return GraphQLResolverType.COSMOS_DB;
      case 'sql':
        return GraphQLResolverType.SQL;
      case 'http':
        return GraphQLResolverType.HTTP;
      case 'function':
        return GraphQLResolverType.AZURE_FUNCTION;
      default:
        return GraphQLResolverType.CUSTOM;
    }
  }

  /**
   * Generate sort direction enum.
   */
  private generateSortDirectionEnum(): any {
    return {
      kind: 'ENUM',
      name: 'SortDirection',
      values: {
        ASC: { value: 'ASC', description: 'Ascending order' },
        DESC: { value: 'DESC', description: 'Descending order' },
      },
    };
  }

  /**
   * Generate filter input type.
   */
  private generateFilterInput(entityType: string): any {
    return {
      kind: 'INPUT_OBJECT',
      name: `${entityType}Filter`,
      description: `Filter criteria for ${entityType} queries`,
      fields: {
        and: { type: `[${entityType}Filter]` },
        or: { type: `[${entityType}Filter]` },
        not: { type: `${entityType}Filter` },
      },
    };
  }

  /**
   * Generate create input type.
   */
  private generateCreateInput(entityType: string): any {
    return {
      kind: 'INPUT_OBJECT',
      name: `Create${entityType}Input`,
      description: `Input for creating a new ${entityType}`,
      fields: {},
    };
  }

  /**
   * Generate update input type.
   */
  private generateUpdateInput(entityType: string): any {
    return {
      kind: 'INPUT_OBJECT',
      name: `Update${entityType}Input`,
      description: `Input for updating an existing ${entityType}`,
      fields: {},
    };
  }

  /**
   * Generate connection type for pagination.
   */
  private generateConnectionType(entityType: string): any {
    return {
      kind: 'OBJECT',
      name: `${entityType}Connection`,
      description: `Paginated ${entityType} results`,
      fields: {
        items: { type: `[${entityType}!]!` },
        nextToken: { type: 'String' },
      },
    };
  }

  /**
   * Get generated resolver metadata.
   */
  public getResolverMetadata(): Map<string, GeneratedResolverMetadata> {
    return this.resolverMetadata;
  }
}
