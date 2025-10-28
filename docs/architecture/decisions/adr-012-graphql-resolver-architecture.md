# ADR-011: GraphQL Resolver Architecture

## Context

Azure API Management supports GraphQL APIs in two modes:
1. **Pass-through mode**: Proxies GraphQL requests to a backend GraphQL service
2. **Synthetic mode**: Executes GraphQL queries directly in API Management using configured resolvers

Our architecture needs to support both modes while providing a type-safe, developer-friendly experience for defining and managing GraphQL resolvers. The resolver architecture must integrate seamlessly with Azure Functions, Azure data sources, and our existing handler.ts + resource.ts pattern established in ADR-006.

Current challenges:
- GraphQL resolvers need access to various Azure data sources (Cosmos DB, SQL, Storage, Service Bus)
- Type safety must be maintained between GraphQL schema, resolver implementations, and TypeScript
- Field-level resolution requires efficient batching to prevent N+1 query problems
- Resolvers must support both synchronous and asynchronous operations
- Error handling needs to provide meaningful GraphQL-compliant error responses
- Authorization needs to be applied at the field level, not just the operation level

## Decision

We will implement a multi-layered resolver architecture that provides type safety, efficient data loading, and seamless Azure integration.

### 1. Resolver Interface Architecture

```typescript
// Base resolver interface - all resolvers implement this
export interface IGraphQLResolver<TSource = any, TContext = any, TArgs = any, TReturn = any> {
  readonly fieldName: string;
  readonly typeName: string;
  readonly resolve: ResolverFunction<TSource, TContext, TArgs, TReturn>;
  readonly subscribe?: SubscriptionResolver<TSource, TContext, TArgs, TReturn>;
  readonly authorization?: FieldAuthorization;
  readonly caching?: FieldCachingStrategy;
  readonly complexity?: ComplexityCalculator;
}

// Core resolver function type
export type ResolverFunction<TSource, TContext, TArgs, TReturn> = (
  source: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TReturn> | TReturn;

// Subscription resolver for real-time updates
export type SubscriptionResolver<TSource, TContext, TArgs, TReturn> = {
  subscribe: ResolverFunction<TSource, TContext, TArgs, AsyncIterable<TReturn>>;
  resolve?: ResolverFunction<TSource, TContext, TArgs, TReturn>;
};

// GraphQL resolve info with Azure extensions
export interface GraphQLResolveInfo {
  readonly fieldName: string;
  readonly fieldNodes: ReadonlyArray<FieldNode>;
  readonly returnType: GraphQLOutputType;
  readonly parentType: GraphQLObjectType;
  readonly path: Path;
  readonly schema: GraphQLSchema;
  readonly fragments: Record<string, FragmentDefinition>;
  readonly rootValue: any;
  readonly operation: OperationDefinition;
  readonly variableValues: Record<string, any>;
  readonly cacheControl?: CacheControlHint;
  readonly azure?: AzureResolveExtensions;
}

// Azure-specific resolver extensions
export interface AzureResolveExtensions {
  readonly correlationId: string;
  readonly subscriptionId: string;
  readonly resourceGroup: string;
  readonly isGovernmentCloud: boolean;
  readonly managedIdentity?: ManagedIdentityToken;
  readonly dataLoaders: DataLoaderRegistry;
}
```

### 2. Resolver Context Architecture

The context object provides access to Azure services, authentication, and shared resources:

```typescript
// Resolver context passed to all resolvers
export interface GraphQLResolverContext {
  // Azure service clients
  readonly cosmos: CosmosClient;
  readonly storage: StorageClient;
  readonly sql: SqlClient;
  readonly serviceBus: ServiceBusClient;
  readonly keyVault: KeyVaultClient;

  // Authentication & Authorization
  readonly user?: AuthenticatedUser;
  readonly token?: string;
  readonly permissions: PermissionSet;

  // Data loading & caching
  readonly loaders: DataLoaderRegistry;
  readonly cache: ResolverCache;

  // Observability
  readonly logger: Logger;
  readonly tracer: Tracer;
  readonly metrics: MetricsCollector;

  // Request metadata
  readonly requestId: string;
  readonly correlationId: string;
  readonly timestamp: Date;
}

// User information from Azure AD or custom provider
export interface AuthenticatedUser {
  readonly id: string;
  readonly email?: string;
  readonly name?: string;
  readonly roles: string[];
  readonly claims: Record<string, any>;
  readonly provider: 'azuread' | 'b2c' | 'custom';
}

// DataLoader registry for batching
export interface DataLoaderRegistry {
  get<K, V>(key: string): DataLoader<K, V> | undefined;
  set<K, V>(key: string, loader: DataLoader<K, V>): void;
  create<K, V>(key: string, batchFn: BatchLoadFn<K, V>, options?: DataLoaderOptions<K, V>): DataLoader<K, V>;
}
```

### 3. Resolver Builder Pattern

A fluent API for building resolvers with type safety:

```typescript
// Resolver builder for type-safe resolver creation
export class GraphQLResolverBuilder<TSource = any, TContext = GraphQLResolverContext> {
  private resolvers: Map<string, Map<string, IGraphQLResolver>> = new Map();

  // Define a type resolver
  type<T extends string>(typeName: T): TypeResolverBuilder<TSource, TContext, T> {
    if (!this.resolvers.has(typeName)) {
      this.resolvers.set(typeName, new Map());
    }
    return new TypeResolverBuilder(this, typeName, this.resolvers.get(typeName)!);
  }

  // Build final resolver map
  build(): ResolverMap {
    const result: ResolverMap = {};
    for (const [typeName, fields] of this.resolvers) {
      result[typeName] = {};
      for (const [fieldName, resolver] of fields) {
        result[typeName][fieldName] = resolver.resolve;
      }
    }
    return result;
  }

  // Export for API Management
  toApiManagementResolvers(): AzureApiManagementResolver[] {
    const resolvers: AzureApiManagementResolver[] = [];
    for (const [typeName, fields] of this.resolvers) {
      for (const [fieldName, resolver] of fields) {
        resolvers.push({
          path: `${typeName}.${fieldName}`,
          resolver: this.serializeResolver(resolver)
        });
      }
    }
    return resolvers;
  }

  private serializeResolver(resolver: IGraphQLResolver): SerializedResolver {
    // Convert resolver to API Management format
    return {
      type: 'http' | 'cosmos' | 'sql' | 'cache',
      config: this.extractResolverConfig(resolver)
    };
  }
}

// Type-specific resolver builder
export class TypeResolverBuilder<TSource, TContext, TType extends string> {
  constructor(
    private parent: GraphQLResolverBuilder<TSource, TContext>,
    private typeName: TType,
    private resolvers: Map<string, IGraphQLResolver>
  ) {}

  // Define a field resolver with type inference
  field<TField extends string, TArgs = {}, TReturn = any>(
    fieldName: TField,
    resolver: ResolverFunction<TSource, TContext, TArgs, TReturn>
  ): FieldResolverBuilder<TSource, TContext, TType, TField, TArgs, TReturn> {
    const fieldResolver: IGraphQLResolver = {
      fieldName,
      typeName: this.typeName,
      resolve: resolver
    };
    this.resolvers.set(fieldName, fieldResolver);
    return new FieldResolverBuilder(this, fieldResolver);
  }

  // Add all fields at once
  fields(resolvers: Record<string, ResolverFunction>): this {
    for (const [fieldName, resolver] of Object.entries(resolvers)) {
      this.field(fieldName, resolver);
    }
    return this;
  }

  // Return to parent builder
  and(): GraphQLResolverBuilder<TSource, TContext> {
    return this.parent;
  }
}

// Field-specific configuration builder
export class FieldResolverBuilder<TSource, TContext, TType extends string, TField extends string, TArgs, TReturn> {
  constructor(
    private parent: TypeResolverBuilder<TSource, TContext, TType>,
    private resolver: IGraphQLResolver
  ) {}

  // Add authorization
  authorize(auth: FieldAuthorization): this {
    this.resolver.authorization = auth;
    return this;
  }

  // Add caching
  cache(strategy: FieldCachingStrategy): this {
    this.resolver.caching = strategy;
    return this;
  }

  // Add complexity calculation
  complexity(calculator: ComplexityCalculator): this {
    this.resolver.complexity = calculator;
    return this;
  }

  // Add subscription support
  subscribe(subscription: SubscriptionResolver<TSource, TContext, TArgs, TReturn>): this {
    this.resolver.subscribe = subscription;
    return this;
  }

  // Continue building
  and(): TypeResolverBuilder<TSource, TContext, TType> {
    return this.parent;
  }
}
```

### 4. Data Source Access Patterns

Resolvers access Azure data sources through typed clients:

```typescript
// Cosmos DB resolver utilities
export class CosmosResolverUtils {
  static query<T>(
    container: Container,
    query: SqlQuerySpec,
    options?: FeedOptions
  ): AsyncIterable<T> {
    return container.items.query<T>(query, options);
  }

  static async queryOne<T>(
    container: Container,
    query: SqlQuerySpec,
    options?: FeedOptions
  ): Promise<T | null> {
    const { resources } = await container.items
      .query<T>(query, { ...options, maxItemCount: 1 })
      .fetchNext();
    return resources[0] || null;
  }

  static batchGet<T>(
    container: Container,
    ids: string[],
    partitionKey?: string
  ): Promise<T[]> {
    // Implement efficient batch retrieval
    return Promise.all(
      ids.map(id =>
        container.item(id, partitionKey).read<T>()
          .then(r => r.resource)
          .catch(() => null)
      )
    ).then(items => items.filter(Boolean) as T[]);
  }
}

// SQL Database resolver utilities
export class SqlResolverUtils {
  static async query<T>(
    client: SqlClient,
    query: string,
    params?: any[]
  ): Promise<T[]> {
    const request = client.request();
    params?.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    const result = await request.query(query);
    return result.recordset as T[];
  }

  static async queryOne<T>(
    client: SqlClient,
    query: string,
    params?: any[]
  ): Promise<T | null> {
    const results = await this.query<T>(client, query, params);
    return results[0] || null;
  }

  static prepareBatchQuery<T, K>(
    tableName: string,
    keyField: string,
    keys: K[]
  ): [string, any[]] {
    const placeholders = keys.map((_, i) => `@param${i}`).join(',');
    const query = `SELECT * FROM ${tableName} WHERE ${keyField} IN (${placeholders})`;
    return [query, keys];
  }
}

// Storage resolver utilities
export class StorageResolverUtils {
  static async getBlob(
    containerClient: ContainerClient,
    blobName: string
  ): Promise<Buffer> {
    const blobClient = containerClient.getBlobClient(blobName);
    const response = await blobClient.download();
    return this.streamToBuffer(response.readableStreamBody!);
  }

  static async listBlobs(
    containerClient: ContainerClient,
    prefix?: string,
    maxResults?: number
  ): Promise<string[]> {
    const blobs: string[] = [];
    const iter = containerClient.listBlobsFlat({ prefix });

    for await (const blob of iter) {
      blobs.push(blob.name);
      if (maxResults && blobs.length >= maxResults) break;
    }

    return blobs;
  }

  private static async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
```

### 5. Resolver Registration and Discovery

Resolvers are discovered and registered through a convention-based system:

```typescript
// Resolver module interface
export interface IResolverModule {
  readonly name: string;
  readonly typeDefs?: string | DocumentNode;
  readonly resolvers: ResolverMap | (() => ResolverMap);
  readonly dataSources?: () => DataSources;
  readonly directives?: SchemaDirectives;
  readonly context?: (ctx: GraphQLResolverContext) => any;
}

// Resolver discovery service
export class ResolverDiscoveryService {
  private modules: Map<string, IResolverModule> = new Map();

  // Auto-discover resolvers from filesystem
  async discover(patterns: string[]): Promise<IResolverModule[]> {
    const modules: IResolverModule[] = [];

    for (const pattern of patterns) {
      const files = await glob(pattern);
      for (const file of files) {
        const module = await this.loadModule(file);
        if (module) {
          modules.push(module);
          this.modules.set(module.name, module);
        }
      }
    }

    return modules;
  }

  // Load a resolver module
  private async loadModule(path: string): Promise<IResolverModule | null> {
    try {
      const module = await import(path);

      // Check for default export with resolver pattern
      if (module.default && this.isResolverModule(module.default)) {
        return module.default;
      }

      // Check for named exports
      if (this.isResolverModule(module)) {
        return module as IResolverModule;
      }

      return null;
    } catch (error) {
      console.error(`Failed to load resolver module from ${path}:`, error);
      return null;
    }
  }

  // Type guard for resolver modules
  private isResolverModule(obj: any): obj is IResolverModule {
    return obj &&
      typeof obj.name === 'string' &&
      (typeof obj.resolvers === 'object' || typeof obj.resolvers === 'function');
  }

  // Merge all discovered resolvers
  merge(): MergedResolvers {
    const merged: MergedResolvers = {
      typeDefs: [],
      resolvers: {},
      directives: {},
      dataSources: {},
      context: {}
    };

    for (const module of this.modules.values()) {
      // Merge type definitions
      if (module.typeDefs) {
        merged.typeDefs.push(module.typeDefs);
      }

      // Merge resolvers
      const resolvers = typeof module.resolvers === 'function'
        ? module.resolvers()
        : module.resolvers;

      for (const [type, fields] of Object.entries(resolvers)) {
        if (!merged.resolvers[type]) {
          merged.resolvers[type] = {};
        }
        Object.assign(merged.resolvers[type], fields);
      }

      // Merge directives
      if (module.directives) {
        Object.assign(merged.directives, module.directives);
      }
    }

    return merged;
  }
}

// Convention-based resolver file structure
export interface ResolverFileStructure {
  'resolvers/': {
    'user/': {
      'index.ts': IResolverModule;      // User type resolvers
      'queries.ts': QueryResolvers;      // User-related queries
      'mutations.ts': MutationResolvers; // User-related mutations
      'schema.graphql': string;          // User type definitions
    };
    'product/': {
      'index.ts': IResolverModule;
      'queries.ts': QueryResolvers;
      'mutations.ts': MutationResolvers;
      'schema.graphql': string;
    };
    'index.ts': {                        // Root resolver aggregation
      modules: IResolverModule[];
    };
  };
}
```

### 6. Error Handling

GraphQL-compliant error handling with Azure-specific extensions:

```typescript
// GraphQL error with Azure extensions
export class GraphQLAzureError extends GraphQLError {
  constructor(
    message: string,
    code?: string,
    statusCode?: number,
    extensions?: Record<string, any>
  ) {
    super(message, undefined, undefined, undefined, undefined, undefined, {
      code: code || 'INTERNAL_ERROR',
      statusCode: statusCode || 500,
      timestamp: new Date().toISOString(),
      ...extensions
    });
  }

  static notFound(resource: string, id?: string): GraphQLAzureError {
    return new GraphQLAzureError(
      `${resource} not found${id ? `: ${id}` : ''}`,
      'RESOURCE_NOT_FOUND',
      404
    );
  }

  static unauthorized(message?: string): GraphQLAzureError {
    return new GraphQLAzureError(
      message || 'Unauthorized',
      'UNAUTHORIZED',
      401
    );
  }

  static forbidden(resource?: string): GraphQLAzureError {
    return new GraphQLAzureError(
      `Access forbidden${resource ? ` to ${resource}` : ''}`,
      'FORBIDDEN',
      403
    );
  }

  static validationFailed(errors: ValidationError[]): GraphQLAzureError {
    return new GraphQLAzureError(
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      { validationErrors: errors }
    );
  }

  static rateLimitExceeded(limit: number, window: string): GraphQLAzureError {
    return new GraphQLAzureError(
      `Rate limit exceeded: ${limit} requests per ${window}`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { limit, window }
    );
  }
}

// Error handling middleware for resolvers
export function withErrorHandling<TSource, TContext, TArgs, TReturn>(
  resolver: ResolverFunction<TSource, TContext, TArgs, TReturn>
): ResolverFunction<TSource, TContext, TArgs, TReturn> {
  return async (source, args, context, info) => {
    try {
      return await resolver(source, args, context, info);
    } catch (error) {
      // Log error with context
      context.logger.error('Resolver error', {
        type: info.parentType.name,
        field: info.fieldName,
        path: info.path,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        args: JSON.stringify(args)
      });

      // Transform known errors
      if (error instanceof GraphQLError) {
        throw error;
      }

      if (error instanceof CosmosError) {
        if (error.code === 404) {
          throw GraphQLAzureError.notFound('Document');
        }
        if (error.code === 429) {
          throw GraphQLAzureError.rateLimitExceeded(1000, '1m');
        }
      }

      // Wrap unknown errors
      throw new GraphQLAzureError(
        'Internal server error',
        'INTERNAL_ERROR',
        500,
        {
          originalError: error instanceof Error ? error.message : String(error)
        }
      );
    }
  };
}

// Batch error handling for DataLoader
export function handleBatchError<K, V>(
  keys: readonly K[],
  error: Error
): Array<V | Error> {
  return keys.map(() => error);
}
```

### 7. Type Safety Integration

Ensuring type safety between GraphQL schema and TypeScript:

```typescript
// Type mapping for GraphQL to TypeScript
export interface GraphQLTypeMap {
  // Scalars
  ID: string;
  String: string;
  Int: number;
  Float: number;
  Boolean: boolean;
  DateTime: Date;
  JSON: Record<string, any>;

  // Custom scalars for Azure
  AzureResourceId: string;
  AzureLocation: string;
  AzureSubscriptionId: string;
}

// Generated resolver types from schema
export interface GeneratedResolverTypes<TContext = GraphQLResolverContext> {
  Query: {
    [field: string]: ResolverFunction<{}, TContext, any, any>;
  };
  Mutation: {
    [field: string]: ResolverFunction<{}, TContext, any, any>;
  };
  Subscription: {
    [field: string]: SubscriptionResolver<{}, TContext, any, any>;
  };
  [typeName: string]: {
    [field: string]: ResolverFunction<any, TContext, any, any>;
  };
}

// Type-safe resolver definition
export function defineResolvers<TContext = GraphQLResolverContext>(
  schema: GraphQLSchema,
  resolvers: GeneratedResolverTypes<TContext>
): ValidatedResolvers<TContext> {
  // Validate resolvers against schema at build time
  validateResolversAgainstSchema(schema, resolvers);
  return resolvers as ValidatedResolvers<TContext>;
}

// Schema-first type generation
export interface SchemaFirstTypes {
  // Input types from schema
  inputs: {
    [inputType: string]: Record<string, any>;
  };

  // Object types from schema
  objects: {
    [objectType: string]: Record<string, any>;
  };

  // Enum types from schema
  enums: {
    [enumType: string]: string;
  };

  // Union types from schema
  unions: {
    [unionType: string]: any;
  };

  // Interface types from schema
  interfaces: {
    [interfaceType: string]: Record<string, any>;
  };
}
```

## Alternatives Considered

### Alternative 1: Direct Azure Function Integration

Each resolver as a separate Azure Function:

```typescript
// Each resolver is an Azure Function
export const getUserResolver: HttpHandler = async (context, req) => {
  const { userId } = req.body.variables;
  // Resolver logic
};
```

**Rejected because:**
- Poor performance due to function cold starts for each field
- Complex orchestration required for nested queries
- Difficult to share context between resolvers
- No built-in batching or caching

### Alternative 2: Single Monolithic Resolver

One large resolver function handling all fields:

```typescript
export const resolveGraphQL = (typeName: string, fieldName: string, ...args: any[]) => {
  switch (`${typeName}.${fieldName}`) {
    case 'Query.user': return resolveUser(...args);
    case 'User.posts': return resolveUserPosts(...args);
    // ... hundreds of cases
  }
};
```

**Rejected because:**
- Poor maintainability and scalability
- No type safety
- Difficult to test individual resolvers
- No clear separation of concerns

### Alternative 3: Class-Based Resolvers

Using classes with decorators for resolvers:

```typescript
@Resolver('User')
class UserResolver {
  @Field()
  async posts(@Parent() user: User, @Context() ctx: Context) {
    // Resolver logic
  }
}
```

**Rejected because:**
- Requires experimental decorator support
- Less functional, more OOP complexity
- Harder to compose and test
- Not aligned with Azure Functions serverless model

## Consequences

### Positive Consequences

1. **Type Safety**: Full type safety from GraphQL schema to TypeScript implementation
2. **Performance**: Built-in DataLoader support prevents N+1 queries
3. **Modularity**: Resolvers can be organized by domain/feature
4. **Testability**: Individual resolvers can be unit tested in isolation
5. **Azure Integration**: Native support for all Azure data sources
6. **Error Handling**: Consistent, GraphQL-compliant error responses
7. **Developer Experience**: Intuitive builder pattern with IntelliSense support

### Negative Consequences

1. **Complexity**: Multi-layered architecture has learning curve
2. **Bundle Size**: Resolver framework adds to deployment size
3. **Memory Usage**: DataLoader caching increases memory consumption
4. **Debugging**: Async resolver chains can be harder to debug

### Trade-offs

1. **Flexibility vs Simplicity**: We optimize for flexibility and type safety over simple implementation
2. **Performance vs Memory**: DataLoader caching trades memory for reduced database calls
3. **Type Safety vs Dynamic**: Compile-time safety over runtime flexibility
4. **Modularity vs Cohesion**: Distributed resolvers over centralized logic

## Success Criteria

1. **Type Safety**: 100% type coverage between schema and resolvers
2. **Performance**: < 10ms overhead for resolver framework
3. **Batching**: N+1 queries eliminated through DataLoader
4. **Error Rate**: < 0.1% framework-related errors
5. **Developer Velocity**: New resolver implementation in < 10 minutes
6. **Test Coverage**: > 90% unit test coverage for resolvers
7. **Documentation**: Complete IntelliSense and TSDoc for all APIs

## Implementation Roadmap

### Phase 1: Core Resolver Framework (Week 1)
- Implement base resolver interfaces and types
- Create resolver builder pattern
- Add basic error handling

### Phase 2: Data Source Integration (Week 2)
- Implement Cosmos DB resolver utilities
- Add SQL Database resolver utilities
- Create Storage resolver utilities
- Implement DataLoader integration

### Phase 3: Discovery & Registration (Week 3)
- Build resolver discovery service
- Implement module loading
- Create resolver merging logic

### Phase 4: Type Safety & Validation (Week 4)
- Add schema validation
- Implement type generation
- Create build-time validation

## Related Decisions

- **ADR-010**: API Stack Architecture - GraphQLApiStack uses this resolver architecture
- **ADR-012**: GraphQL Advanced Features - Builds on this resolver foundation
- **Azure Functions API Design**: Resolver integration with Functions runtime

## References

- [GraphQL Specification](https://spec.graphql.org/)
- [Azure API Management GraphQL](https://docs.microsoft.com/en-us/azure/api-management/graphql-api)
- [DataLoader Pattern](https://github.com/graphql/dataloader)
- [GraphQL Resolver Best Practices](https://www.apollographql.com/docs/apollo-server/data/resolvers/)