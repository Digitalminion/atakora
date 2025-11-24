/**
 * Cosmos DB Database Client
 *
 * @remarks
 * Production-ready implementation of database client with connection pooling,
 * error handling, and performance optimizations.
 *
 * @packageDocumentation
 */

import { CosmosClient, Container, Database, SqlQuerySpec } from '@azure/cosmos';
import type { ExecutionContext, ModelOperations } from './types';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Database error with context
 *
 * @public
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly code?: string | number,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'DatabaseError';
    Error.captureStackTrace(this, DatabaseError);
  }
}

/**
 * Configuration error
 *
 * @public
 */
export class ConfigurationError extends DatabaseError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Not found error
 *
 * @public
 */
export class NotFoundError extends DatabaseError {
  constructor(modelName: string, id: string) {
    super(`${modelName} with id '${id}' not found`, undefined, 'NotFound', 404);
    this.name = 'NotFoundError';
  }
}

// ============================================================================
// Connection Pool Configuration
// ============================================================================

/**
 * Connection pool configuration
 *
 * @internal
 */
interface PoolConfig {
  /**
   * Maximum number of connections in the pool
   * @defaultValue 50
   */
  maxConnections?: number;

  /**
   * Request timeout in milliseconds
   * @defaultValue 10000
   */
  requestTimeout?: number;

  /**
   * Enable endpoint discovery for multi-region failover
   * @defaultValue true
   */
  enableEndpointDiscovery?: boolean;

  /**
   * Retry configuration
   */
  retry?: {
    /**
     * Maximum retry attempts
     * @defaultValue 3
     */
    maxRetries?: number;

    /**
     * Initial retry delay in milliseconds
     * @defaultValue 100
     */
    initialDelayMs?: number;

    /**
     * Maximum retry delay in milliseconds
     * @defaultValue 5000
     */
    maxDelayMs?: number;
  };
}

/**
 * Required retry configuration
 */
interface RequiredRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

/**
 * Required pool configuration
 */
interface RequiredPoolConfig {
  maxConnections: number;
  requestTimeout: number;
  enableEndpointDiscovery: boolean;
  retry: RequiredRetryConfig;
}

/**
 * Default pool configuration
 */
const DEFAULT_POOL_CONFIG: RequiredPoolConfig = {
  maxConnections: 50,
  requestTimeout: 10000,
  enableEndpointDiscovery: true,
  retry: {
    maxRetries: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
  },
};

// ============================================================================
// Cosmos DB Connection Pool
// ============================================================================

/**
 * Global connection pool for Cosmos DB
 *
 * @remarks
 * Implements singleton pattern to share connections across function invocations.
 * Provides lazy initialization and container caching for optimal performance.
 *
 * @internal
 */
export class CosmosConnectionPool {
  private static instance: CosmosConnectionPool | null = null;
  private client: CosmosClient | null = null;
  private database: Database | null = null;
  private containers: Map<string, Container> = new Map();
  private config: RequiredPoolConfig;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor(config?: PoolConfig) {
    this.config = {
      ...DEFAULT_POOL_CONFIG,
      ...config,
      retry: {
        ...DEFAULT_POOL_CONFIG.retry,
        ...(config?.retry || {}),
      },
    };
  }

  /**
   * Get singleton instance
   *
   * @param config - Optional configuration (only used on first call)
   * @returns Connection pool instance
   */
  public static getInstance(config?: PoolConfig): CosmosConnectionPool {
    if (!CosmosConnectionPool.instance) {
      CosmosConnectionPool.instance = new CosmosConnectionPool(config);
    }
    return CosmosConnectionPool.instance;
  }

  /**
   * Reset singleton instance (for testing)
   *
   * @internal
   */
  public static resetInstance(): void {
    if (CosmosConnectionPool.instance) {
      CosmosConnectionPool.instance.containers.clear();
      CosmosConnectionPool.instance.client = null;
      CosmosConnectionPool.instance.database = null;
      CosmosConnectionPool.instance.initialized = false;
      CosmosConnectionPool.instance.initializationPromise = null;
    }
    CosmosConnectionPool.instance = null;
  }

  /**
   * Get container by name
   *
   * @param containerName - Container name (typically model name)
   * @returns Cosmos DB container
   */
  public async getContainer(containerName: string): Promise<Container> {
    // Ensure initialized
    await this.ensureInitialized();

    // Return cached container
    if (!this.containers.has(containerName)) {
      const container = this.database!.container(containerName);
      this.containers.set(containerName, container);
    }

    return this.containers.get(containerName)!;
  }

  /**
   * Ensure connection is initialized
   *
   * @remarks
   * Uses double-check locking pattern to handle concurrent initialization
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this.initialize();
    await this.initializationPromise;
    this.initializationPromise = null;
  }

  /**
   * Initialize Cosmos DB connection
   */
  private async initialize(): Promise<void> {
    try {
      // Get configuration from environment
      const endpoint = process.env.COSMOS_ENDPOINT;
      const key = process.env.COSMOS_KEY;
      const databaseId = process.env.COSMOS_DATABASE_ID || 'default';

      if (!endpoint) {
        throw new ConfigurationError('COSMOS_ENDPOINT environment variable is required');
      }

      if (!key) {
        throw new ConfigurationError('COSMOS_KEY environment variable is required');
      }

      // Create client with connection pooling
      this.client = new CosmosClient({
        endpoint,
        key,
        connectionPolicy: {
          requestTimeout: this.config.requestTimeout,
          enableEndpointDiscovery: this.config.enableEndpointDiscovery,
        },
      });

      // Get database reference
      this.database = this.client.database(databaseId);

      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      this.client = null;
      this.database = null;

      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError('Failed to initialize Cosmos DB connection', error as Error);
    }
  }

  /**
   * Execute operation with retry logic
   *
   * @param operation - Operation to execute
   * @param operationName - Name for error messages
   * @returns Operation result
   */
  public async executeWithRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | undefined;
    const { maxRetries, initialDelayMs, maxDelayMs } = this.config.retry;
    let delay = initialDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if error is retriable
        const isRetriable = this.isRetriableError(error);

        // Don't retry on last attempt or non-retriable errors
        if (attempt === maxRetries || !isRetriable) {
          break;
        }

        // Wait before retry with exponential backoff
        await this.sleep(delay);
        delay = Math.min(delay * 2, maxDelayMs);
      }
    }

    // All retries failed
    throw new DatabaseError(
      `${operationName} failed after ${maxRetries + 1} attempts`,
      lastError,
      (lastError as any)?.code,
      (lastError as any)?.statusCode
    );
  }

  /**
   * Check if error is retriable
   *
   * @param error - Error to check
   * @returns True if error should be retried
   */
  private isRetriableError(error: any): boolean {
    // Retry on network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Retry on throttling (429)
    if (error.statusCode === 429 || error.code === 429) {
      return true;
    }

    // Retry on service unavailable (503)
    if (error.statusCode === 503 || error.code === 503) {
      return true;
    }

    // Don't retry client errors (4xx) except 429
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return false;
    }

    // Retry server errors (5xx)
    if (error.statusCode >= 500) {
      return true;
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Query Builder
// ============================================================================

/**
 * Build SQL query from filter object
 *
 * @param modelName - Model name (for container)
 * @param filter - Filter object with field values
 * @returns SQL query specification
 *
 * @internal
 */
function buildQueryFromFilter<T>(modelName: string, filter?: Partial<T>): SqlQuerySpec {
  // No filter - return all documents
  if (!filter || Object.keys(filter).length === 0) {
    return {
      query: `SELECT * FROM c`,
    };
  }

  // Build WHERE clause
  const conditions: string[] = [];
  const parameters: Array<{ name: string; value: any }> = [];

  let paramIndex = 0;
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined) {
      continue;
    }

    const paramName = `@param${paramIndex}`;
    conditions.push(`c.${key} = ${paramName}`);
    parameters.push({ name: paramName, value });
    paramIndex++;
  }

  return {
    query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
    parameters,
  };
}

/**
 * Generate unique ID
 *
 * @returns Unique identifier
 *
 * @internal
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${random}`;
}

// ============================================================================
// Model Operations Implementation
// ============================================================================

/**
 * Options for model operations
 *
 * @internal
 */
export interface ModelOperationsOptions {
  /**
   * Partition key field name (defaults to 'id')
   *
   * @remarks
   * Specifies which field to use as the Cosmos DB partition key.
   * If not provided, defaults to 'id' (standard pattern).
   *
   * @example
   * ```typescript
   * { partitionKey: 'tenantId' }
   * ```
   */
  partitionKey?: string;
}

/**
 * Get partition key value from a document
 *
 * @param doc - Document object
 * @param partitionKeyField - Field name to use as partition key
 * @returns Partition key value
 *
 * @internal
 */
function getPartitionKeyValue(doc: any, partitionKeyField: string): string {
  // If partition key field is 'id', return the id
  if (partitionKeyField === 'id' || !partitionKeyField) {
    return doc.id || doc._id || 'unknown';
  }

  // Get nested field value using dot notation (e.g., 'user.tenantId')
  const value = partitionKeyField.split('.').reduce((obj, key) => obj?.[key], doc);

  if (!value) {
    throw new DatabaseError(
      `Partition key field '${partitionKeyField}' not found in document`,
      undefined,
      'MISSING_PARTITION_KEY',
      400
    );
  }

  return String(value);
}

/**
 * Create model operations for a specific model
 *
 * @param modelName - Model name (container name)
 * @param executionContext - Execution context
 * @param options - Model operation options (partition key, etc.)
 * @param pool - Connection pool (optional, for testing)
 * @returns Model operations
 *
 * @internal
 */
export function createModelOperations<T extends { id?: string }>(
  modelName: string,
  executionContext: ExecutionContext,
  options?: ModelOperationsOptions,
  pool?: CosmosConnectionPool
): ModelOperations<T> {
  const connectionPool = pool || CosmosConnectionPool.getInstance();
  const partitionKeyField = options?.partitionKey || 'id';

  return {
    /**
     * Get a document by ID
     */
    async get(id: string): Promise<T | null> {
      return connectionPool.executeWithRetry(async () => {
        const container = await connectionPool.getContainer(modelName);

        try {
          // For partition key = id, use id as partition key value
          // Otherwise, we need to query to find the document
          if (partitionKeyField === 'id') {
            const { resource } = await container.item(id, id).read<T>();
            return resource || null;
          } else {
            // When partition key != id, we need to query
            // This is less efficient but necessary for custom partition keys
            const query: SqlQuerySpec = {
              query: `SELECT * FROM c WHERE c.id = @id`,
              parameters: [{ name: '@id', value: id }],
            };
            const { resources } = await container.items.query<T>(query).fetchAll();
            return resources[0] || null;
          }
        } catch (error: any) {
          // 404 is expected for missing items
          if (error.code === 404 || error.statusCode === 404) {
            return null;
          }
          // Add context to error
          throw new DatabaseError(
            `Failed to get ${modelName}:${id}`,
            error,
            error.code,
            error.statusCode
          );
        }
      }, `${modelName}.get(${id})`);
    },

    /**
     * List documents with optional filtering
     */
    async list(filter?: Partial<T>): Promise<T[]> {
      return connectionPool.executeWithRetry(async () => {
        const container = await connectionPool.getContainer(modelName);

        // Build query from filter
        const query = buildQueryFromFilter<T>(modelName, filter);

        // Execute query
        const { resources } = await container.items.query<T>(query).fetchAll();
        return resources;
      }, `${modelName}.list()`);
    },

    /**
     * Create a new document
     */
    async create(data: Partial<T>): Promise<T> {
      return connectionPool.executeWithRetry(async () => {
        const container = await connectionPool.getContainer(modelName);

        // Generate ID if not provided
        const item = {
          id: (data as any).id || generateId(),
          ...data,
        } as T;

        // Validate partition key exists for custom partition keys
        if (partitionKeyField !== 'id') {
          const partitionKeyValue = getPartitionKeyValue(item, partitionKeyField);
          if (!partitionKeyValue) {
            throw new DatabaseError(
              `Partition key field '${partitionKeyField}' is required for ${modelName}`,
              undefined,
              'MISSING_PARTITION_KEY',
              400
            );
          }
        }

        // Create document
        const { resource } = await container.items.create<T>(item);

        if (!resource) {
          throw new DatabaseError(
            `Failed to create ${modelName}`,
            undefined,
            'CREATE_FAILED',
            500
          );
        }

        return resource;
      }, `${modelName}.create()`);
    },

    /**
     * Update an existing document
     */
    async update(id: string, data: Partial<T>): Promise<T> {
      return connectionPool.executeWithRetry(async () => {
        const container = await connectionPool.getContainer(modelName);

        // Read current document
        const current = await this.get(id);
        if (!current) {
          throw new NotFoundError(modelName, id);
        }

        // Merge updates
        const updated = {
          ...current,
          ...data,
          id, // Ensure ID is preserved
        };

        // Get partition key value from the current document
        const partitionKeyValue = getPartitionKeyValue(current, partitionKeyField);

        // Replace document with correct partition key
        const { resource } = await container.item(id, partitionKeyValue).replace<T>(updated);

        if (!resource) {
          throw new DatabaseError(
            `Failed to update ${modelName}:${id}`,
            undefined,
            'UPDATE_FAILED',
            500
          );
        }

        return resource;
      }, `${modelName}.update(${id})`);
    },

    /**
     * Delete a document
     */
    async delete(id: string): Promise<void> {
      return connectionPool.executeWithRetry(async () => {
        const container = await connectionPool.getContainer(modelName);

        try {
          // For partition key = id, we can delete directly
          if (partitionKeyField === 'id') {
            await container.item(id, id).delete();
          } else {
            // For custom partition keys, we need to get the document first
            const current = await this.get(id);
            if (current) {
              const partitionKeyValue = getPartitionKeyValue(current, partitionKeyField);
              await container.item(id, partitionKeyValue).delete();
            }
          }
        } catch (error: any) {
          // 404 is acceptable for delete (idempotent)
          if (error.code !== 404 && error.statusCode !== 404) {
            throw new DatabaseError(
              `Failed to delete ${modelName}:${id}`,
              error,
              error.code,
              error.statusCode
            );
          }
        }
      }, `${modelName}.delete(${id})`);
    },
  };
}
