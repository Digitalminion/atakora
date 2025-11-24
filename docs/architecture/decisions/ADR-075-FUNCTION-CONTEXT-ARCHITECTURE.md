# ADR-024: Function Context Architecture

**Status**: Proposed
**Date**: 2025-11-22
**Author**: Becky (Staff Architect)
**Relates to**: STUB_IMPLEMENTATION_PLAN.md Phase 1

---

## Context

The Function Context (`FunctionContext`) is the primary runtime API that function handlers use to interact with Azure resources. Currently, it has stub implementations that log warnings. We need to implement production-ready database, storage, and logger clients.

**Key Design Challenges:**

1. **Connection Lifecycle**: Azure Functions can have multiple concurrent executions. How do we manage database connections efficiently?

2. **Performance**: Connection setup to Cosmos DB takes ~100ms. Creating new connections per invocation would add unacceptable latency.

3. **Resource Limits**: Cosmos DB has connection limits. We need to pool connections across invocations.

4. **Type Safety**: Operations must be fully type-safe, with model types inferred from schema.

5. **Error Handling**: Clear, actionable error messages for development and production.

6. **Observability**: All operations should be traceable through Application Insights.

**Current Stub Implementation:**

```typescript
function createDatabaseClient(executionContext: ExecutionContext): DatabaseClient {
  return new Proxy({} as DatabaseClient, {
    get(target, modelName: string) {
      if (!(modelName in target)) {
        (target as any)[modelName] = createModelOperations(modelName, executionContext);
      }
      return (target as any)[modelName];
    },
  });
}

function createModelOperations<T>(
  modelName: string,
  executionContext: ExecutionContext
): ModelOperations<T> {
  return {
    async get(id: string): Promise<T | null> {
      console.warn(`Database operation not yet implemented: ${modelName}.get(${id})`);
      return null;
    },
    // ... other operations stub out similarly
  };
}
```

This works for compilation but provides no actual functionality.

---

## Decision

We will implement a **pooled connection architecture** with the following characteristics:

### 1. Global Connection Pool

```typescript
/**
 * Global connection pool shared across all function invocations.
 * Initialized on first use and reused across warm starts.
 */
class CosmosConnectionPool {
  private static instance: CosmosConnectionPool;
  private client: CosmosClient | null = null;
  private database: Database | null = null;
  private containers: Map<string, Container> = new Map();

  private constructor() {}

  public static getInstance(): CosmosConnectionPool {
    if (!CosmosConnectionPool.instance) {
      CosmosConnectionPool.instance = new CosmosConnectionPool();
    }
    return CosmosConnectionPool.instance;
  }

  public async getContainer(containerName: string): Promise<Container> {
    // Lazy initialization on first use
    if (!this.client) {
      await this.initialize();
    }

    // Cache containers
    if (!this.containers.has(containerName)) {
      const container = this.database!.container(containerName);
      this.containers.set(containerName, container);
    }

    return this.containers.get(containerName)!;
  }

  private async initialize(): Promise<void> {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;

    if (!endpoint || !key) {
      throw new Error('COSMOS_ENDPOINT and COSMOS_KEY environment variables required');
    }

    this.client = new CosmosClient({
      endpoint,
      key,
      connectionPolicy: {
        requestTimeout: 10000,
        enableEndpointDiscovery: true,
      },
    });

    const databaseId = process.env.COSMOS_DATABASE_ID || 'default';
    this.database = this.client.database(databaseId);
  }
}
```

### 2. Type-Safe Model Operations

```typescript
function createModelOperations<T>(
  modelName: string,
  executionContext: ExecutionContext
): ModelOperations<T> {
  const pool = CosmosConnectionPool.getInstance();

  return {
    async get(id: string): Promise<T | null> {
      const container = await pool.getContainer(modelName);

      try {
        const { resource } = await container.item(id, id).read<T>();
        return resource || null;
      } catch (error: any) {
        if (error.code === 404) {
          return null;
        }
        throw new DatabaseError(`Failed to get ${modelName}:${id}`, error);
      }
    },

    async list(filter?: Partial<T>): Promise<T[]> {
      const container = await pool.getContainer(modelName);

      // Build query from filter
      const query = buildQueryFromFilter(modelName, filter);

      const { resources } = await container.items.query<T>(query).fetchAll();
      return resources;
    },

    async create(data: Partial<T>): Promise<T> {
      const container = await pool.getContainer(modelName);

      // Generate ID if not provided
      const item = {
        id: (data as any).id || generateId(),
        ...data,
      };

      const { resource } = await container.items.create<T>(item);
      return resource!;
    },

    async update(id: string, data: Partial<T>): Promise<T> {
      const container = await pool.getContainer(modelName);

      // Read current item to preserve fields
      const current = await this.get(id);
      if (!current) {
        throw new DatabaseError(`${modelName}:${id} not found`);
      }

      const updated = { ...current, ...data, id };
      const { resource } = await container.item(id, id).replace<T>(updated);
      return resource!;
    },

    async delete(id: string): Promise<void> {
      const container = await pool.getContainer(modelName);
      await container.item(id, id).delete();
    },
  };
}
```

### 3. Proxy-Based Dynamic Access

We keep the Proxy pattern for dynamic model access, but with real implementations:

```typescript
function createDatabaseClient(executionContext: ExecutionContext): DatabaseClient {
  const cache: Record<string, ModelOperations<any>> = {};

  return new Proxy({} as DatabaseClient, {
    get(target, modelName: string) {
      // Cache model operations to avoid recreation
      if (!cache[modelName]) {
        cache[modelName] = createModelOperations(modelName, executionContext);
      }
      return cache[modelName];
    },
  });
}
```

**Type Safety**: TypeScript will infer model types from schema definition:

```typescript
// User model defined in schema
const user = await context.database.User.get('user-123');
// TypeScript knows: user is User | null

const users = await context.database.User.list({ role: 'admin' });
// TypeScript knows: users is User[]
```

### 4. Observability Integration

All database operations are instrumented:

```typescript
async get(id: string): Promise<T | null> {
  const span = context.trace.startSpan('database.get', {
    'db.model': modelName,
    'db.id': id,
  });

  try {
    const container = await pool.getContainer(modelName);
    const { resource } = await container.item(id, id).read<T>();

    span.setStatus({ code: SpanStatusCode.OK });
    return resource || null;
  } catch (error: any) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);

    if (error.code === 404) {
      return null;
    }

    throw new DatabaseError(`Failed to get ${modelName}:${id}`, error);
  } finally {
    span.end();
  }
}
```

### 5. Blob Storage Client (Similar Pattern)

```typescript
class BlobConnectionPool {
  private static instance: BlobConnectionPool;
  private client: BlobServiceClient | null = null;
  private containers: Map<string, ContainerClient> = new Map();

  // Similar implementation to CosmosConnectionPool
}

function createBlobOperations(executionContext: ExecutionContext): BlobOperations {
  const pool = BlobConnectionPool.getInstance();

  return {
    async upload(path: string, data: Buffer | string, options?: UploadOptions): Promise<string> {
      const containerClient = await pool.getContainer(options?.container || 'default');
      const blobClient = containerClient.getBlockBlobClient(path);

      await blobClient.upload(data, data.length, {
        blobHTTPHeaders: {
          blobContentType: options?.contentType,
        },
        metadata: options?.metadata,
      });

      return blobClient.url;
    },

    async download(url: string): Promise<Buffer> {
      // Parse container and blob from URL
      const { container, blob } = parseStorageUrl(url);
      const containerClient = await pool.getContainer(container);
      const blobClient = containerClient.getBlobClient(blob);

      const downloadResponse = await blobClient.download();
      return await streamToBuffer(downloadResponse.readableStreamBody!);
    },

    // ... other operations
  };
}
```

---

## Alternatives Considered

### Alternative 1: Per-Invocation Connections

**Approach**: Create new connection for each function invocation.

```typescript
async function createDatabaseClient(executionContext: ExecutionContext): Promise<DatabaseClient> {
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT!,
    key: process.env.COSMOS_KEY!,
  });

  const database = client.database(process.env.COSMOS_DATABASE_ID!);

  return new Proxy({} as DatabaseClient, {
    get(target, modelName: string) {
      return createModelOperations(modelName, database);
    },
  });
}
```

**Pros:**

- Simple, no shared state
- Clean lifecycle (connection dies with invocation)
- No connection leak concerns

**Cons:**

- ~100ms connection overhead per invocation
- Unacceptable latency for production workloads
- Wastes Azure Functions cold start mitigation
- Higher Cosmos DB connection count

**Rejected**: Performance unacceptable for production.

---

### Alternative 2: Singleton with Lazy Initialization

**Approach**: Single global client created on first use, never closed.

```typescript
let globalClient: CosmosClient | null = null;

function getGlobalClient(): CosmosClient {
  if (!globalClient) {
    globalClient = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      key: process.env.COSMOS_KEY!,
    });
  }
  return globalClient;
}
```

**Pros:**

- Very simple implementation
- No overhead after first invocation
- Works well for most cases

**Cons:**

- No connection health monitoring
- Can't handle credential rotation
- Harder to test (global state)
- No graceful shutdown

**Rejected**: Too simplistic, lacks production features like health checks and credential rotation.

---

### Alternative 3: Full Connection Pool with Health Checks

**Approach**: Sophisticated pool with health monitoring, credential rotation, metrics.

```typescript
class CosmosConnectionPool {
  private clients: CosmosClient[] = [];
  private healthCheckInterval: NodeJS.Timeout;
  private lastCredentialCheck: number = 0;

  async getClient(): Promise<CosmosClient> {
    // Check for credential rotation
    if (Date.now() - this.lastCredentialCheck > 60000) {
      await this.rotateCredentials();
    }

    // Return healthy client
    return this.selectHealthyClient();
  }

  private async rotateCredentials(): Promise<void> {
    // Check for updated credentials in environment
    // Gradually replace clients with new credentials
  }

  private async selectHealthyClient(): Promise<CosmosClient> {
    // Health check, return healthy client
    // Create new client if all unhealthy
  }
}
```

**Pros:**

- Production-grade robustness
- Handles edge cases (credential rotation, unhealthy connections)
- Metrics and monitoring built-in

**Cons:**

- Significantly more complex
- Over-engineered for most use cases
- Higher maintenance burden
- More potential failure modes

**Rejected**: Too complex for initial implementation. We can add health checks later if needed.

---

## Consequences

### Positive

1. **Performance**: Connection pooling eliminates ~100ms overhead per invocation
2. **Scalability**: Handles concurrent invocations efficiently
3. **Type Safety**: Full TypeScript type inference from schema
4. **Simplicity**: Implementation is straightforward, easy to understand
5. **Observability**: All operations traced through Application Insights
6. **Testability**: Can inject mock pools for testing

### Negative

1. **Global State**: Connection pool is global, requires careful testing
2. **Cold Starts**: First invocation still pays connection cost (~100ms)
3. **Credential Rotation**: Doesn't handle mid-execution credential updates
4. **Resource Leaks**: Must ensure containers are properly cached

### Mitigations

**Global State Testing**: Use dependency injection in tests:

```typescript
// Production
const pool = CosmosConnectionPool.getInstance();

// Tests
const pool = new MockConnectionPool();
context.setConnectionPool(pool);
```

**Cold Start**: Accept this as Azure Functions limitation. 100ms on first invocation is acceptable.

**Credential Rotation**: Document that credential updates require function app restart. Add health check endpoint that validates connections.

**Resource Leaks**: Container caching is bounded by number of models (typically <50). Worst case: ~5MB memory for container metadata.

---

## Success Criteria

### Functional

- [ ] All CRUD operations work correctly
- [ ] Type safety maintained throughout
- [ ] Error handling is comprehensive
- [ ] Observability captures all operations

### Performance

- [ ] First invocation: <150ms connection overhead
- [ ] Subsequent invocations: <10ms overhead
- [ ] p95 latency for get(): <50ms (excluding Cosmos latency)
- [ ] p95 latency for list(): <100ms (excluding Cosmos latency)

### Quality

- [ ] 90%+ test coverage
- [ ] Integration tests with Cosmos Emulator
- [ ] Error scenario tests (network failures, throttling)
- [ ] Type safety validated via TypeScript compiler tests

---

## Implementation Notes

**Phase 1.1 Tasks**:

1. Create `CosmosConnectionPool` class
2. Implement `createDatabaseClient` with pooling
3. Implement all CRUD operations
4. Add error handling and observability
5. Write integration tests

**Dependencies**:

- `@azure/cosmos`: ^4.0.0 (latest stable)
- `@opentelemetry/api`: ^1.7.0 (for tracing)

**Configuration Required**:

```typescript
// Environment variables
COSMOS_ENDPOINT: string; // Required
COSMOS_KEY: string; // Required
COSMOS_DATABASE_ID: string; // Optional, defaults to 'default'
```

**Error Types**:

```typescript
class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}
```

---

## Related Decisions

- ADR-025: Builder Validation Strategy (affects how we validate inputs)
- ADR-020: Component Auth System (affects how we handle user context)

---

## References

- [Azure Cosmos DB SDK Documentation](https://docs.microsoft.com/en-us/javascript/api/@azure/cosmos/)
- [Azure Functions Best Practices](https://docs.microsoft.com/en-us/azure/azure-functions/functions-best-practices)
- [Connection Pooling Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/connection-pooling)

---

**Document Control:**

- **Status**: Proposed
- **Decision Date**: Pending team review
- **Review Date**: Before Phase 1.1 implementation
- **Supersedes**: None (new decision)
