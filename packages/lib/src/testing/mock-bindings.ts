/**
 * Mock bindings for testing Azure Functions
 *
 * Provides mock implementations of Azure Function bindings for local testing
 * without requiring actual Azure resources.
 *
 * @packageDocumentation
 */

/**
 * Binding direction
 */
export type BindingDirection = 'in' | 'out' | 'inout';

/**
 * Base binding configuration
 */
export interface BindingConfig {
  /**
   * Binding type (http, timer, queue, blob, etc.)
   */
  readonly type: string;

  /**
   * Binding direction
   */
  readonly direction: BindingDirection;

  /**
   * Binding name (used to access binding data)
   */
  readonly name: string;
}

/**
 * HTTP trigger binding configuration
 */
export interface HttpTriggerBinding extends BindingConfig {
  readonly type: 'http';
  readonly direction: 'in';
  readonly authLevel?: 'anonymous' | 'function' | 'admin';
  readonly methods?: readonly string[];
  readonly route?: string;
}

/**
 * Timer trigger binding configuration
 */
export interface TimerTriggerBinding extends BindingConfig {
  readonly type: 'timer';
  readonly direction: 'in';
  readonly schedule: string;
  readonly runOnStartup?: boolean;
  readonly useMonitor?: boolean;
}

/**
 * Queue trigger binding configuration
 */
export interface QueueTriggerBinding extends BindingConfig {
  readonly type: 'queue';
  readonly direction: 'in';
  readonly queueName: string;
  readonly connection: string;
}

/**
 * Blob binding configuration
 */
export interface BlobBinding extends BindingConfig {
  readonly type: 'blob';
  readonly path: string;
  readonly connection: string;
  readonly dataType?: 'binary' | 'string' | 'stream';
}

/**
 * Table binding configuration
 */
export interface TableBinding extends BindingConfig {
  readonly type: 'table';
  readonly tableName: string;
  readonly connection: string;
  readonly partitionKey?: string;
  readonly rowKey?: string;
  readonly filter?: string;
  readonly take?: number;
}

/**
 * Cosmos DB binding configuration
 */
export interface CosmosDbBinding extends BindingConfig {
  readonly type: 'cosmosDB';
  readonly databaseName: string;
  readonly collectionName: string;
  readonly connectionStringSetting: string;
  readonly id?: string;
  readonly sqlQuery?: string;
  readonly partitionKey?: string;
  readonly createIfNotExists?: boolean;
}

/**
 * Service Bus binding configuration
 */
export interface ServiceBusBinding extends BindingConfig {
  readonly type: 'serviceBus';
  readonly queueName?: string;
  readonly topicName?: string;
  readonly subscriptionName?: string;
  readonly connection: string;
  readonly accessRights?: 'manage' | 'listen' | 'send';
}

/**
 * Event Hub binding configuration
 */
export interface EventHubBinding extends BindingConfig {
  readonly type: 'eventHub';
  readonly eventHubName: string;
  readonly connection: string;
  readonly consumerGroup?: string;
  readonly cardinality?: 'one' | 'many';
}

/**
 * Mock binding store for testing
 *
 * Stores binding data and provides methods to set and retrieve binding values
 */
export class MockBindingStore {
  private readonly bindings: Map<string, unknown> = new Map();

  /**
   * Set a binding value
   *
   * @param name - Binding name
   * @param value - Binding value
   *
   * @example
   * ```typescript
   * const store = new MockBindingStore();
   * store.set('myBlob', Buffer.from('test data'));
   * ```
   */
  set(name: string, value: unknown): void {
    this.bindings.set(name, value);
  }

  /**
   * Get a binding value
   *
   * @param name - Binding name
   * @returns Binding value or undefined
   *
   * @example
   * ```typescript
   * const data = store.get<Buffer>('myBlob');
   * ```
   */
  get<T = unknown>(name: string): T | undefined {
    return this.bindings.get(name) as T | undefined;
  }

  /**
   * Check if a binding exists
   *
   * @param name - Binding name
   * @returns True if binding exists
   */
  has(name: string): boolean {
    return this.bindings.has(name);
  }

  /**
   * Delete a binding
   *
   * @param name - Binding name
   * @returns True if binding was deleted
   */
  delete(name: string): boolean {
    return this.bindings.delete(name);
  }

  /**
   * Clear all bindings
   */
  clear(): void {
    this.bindings.clear();
  }

  /**
   * Get all binding names
   *
   * @returns Array of binding names
   */
  getNames(): string[] {
    return Array.from(this.bindings.keys());
  }

  /**
   * Convert to plain object for context.bindings
   *
   * @returns Plain object with all bindings
   */
  toObject(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [name, value] of this.bindings.entries()) {
      obj[name] = value;
    }
    return obj;
  }
}

/**
 * Mock Blob storage for testing
 *
 * Simulates Azure Blob Storage operations
 */
export class MockBlobStorage {
  private readonly containers: Map<string, Map<string, Buffer>> = new Map();

  /**
   * Create a container
   *
   * @param containerName - Container name
   */
  createContainer(containerName: string): void {
    if (!this.containers.has(containerName)) {
      this.containers.set(containerName, new Map());
    }
  }

  /**
   * Upload a blob
   *
   * @param containerName - Container name
   * @param blobName - Blob name
   * @param data - Blob data
   *
   * @example
   * ```typescript
   * const storage = new MockBlobStorage();
   * storage.upload('mycontainer', 'myblob.txt', Buffer.from('test'));
   * ```
   */
  upload(containerName: string, blobName: string, data: Buffer | string): void {
    this.createContainer(containerName);
    const container = this.containers.get(containerName)!;
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    container.set(blobName, buffer);
  }

  /**
   * Download a blob
   *
   * @param containerName - Container name
   * @param blobName - Blob name
   * @returns Blob data or undefined
   *
   * @example
   * ```typescript
   * const data = storage.download('mycontainer', 'myblob.txt');
   * ```
   */
  download(containerName: string, blobName: string): Buffer | undefined {
    const container = this.containers.get(containerName);
    return container?.get(blobName);
  }

  /**
   * Delete a blob
   *
   * @param containerName - Container name
   * @param blobName - Blob name
   * @returns True if blob was deleted
   */
  delete(containerName: string, blobName: string): boolean {
    const container = this.containers.get(containerName);
    return container?.delete(blobName) ?? false;
  }

  /**
   * List blobs in a container
   *
   * @param containerName - Container name
   * @param prefix - Optional prefix filter
   * @returns Array of blob names
   */
  list(containerName: string, prefix?: string): string[] {
    const container = this.containers.get(containerName);
    if (!container) {
      return [];
    }
    const blobs = Array.from(container.keys());
    if (prefix) {
      return blobs.filter((name) => name.startsWith(prefix));
    }
    return blobs;
  }

  /**
   * Clear all containers
   */
  clear(): void {
    this.containers.clear();
  }
}

/**
 * Mock Queue storage for testing
 *
 * Simulates Azure Queue Storage operations
 */
export class MockQueueStorage {
  private readonly queues: Map<string, unknown[]> = new Map();

  /**
   * Create a queue
   *
   * @param queueName - Queue name
   */
  createQueue(queueName: string): void {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }
  }

  /**
   * Send a message to a queue
   *
   * @param queueName - Queue name
   * @param message - Message to send
   *
   * @example
   * ```typescript
   * const queue = new MockQueueStorage();
   * queue.send('myqueue', { orderId: '123' });
   * ```
   */
  send(queueName: string, message: unknown): void {
    this.createQueue(queueName);
    const queue = this.queues.get(queueName)!;
    queue.push(message);
  }

  /**
   * Receive a message from a queue
   *
   * @param queueName - Queue name
   * @returns Message or undefined if queue is empty
   *
   * @example
   * ```typescript
   * const message = queue.receive('myqueue');
   * ```
   */
  receive(queueName: string): unknown | undefined {
    const queue = this.queues.get(queueName);
    return queue?.shift();
  }

  /**
   * Peek at the next message without removing it
   *
   * @param queueName - Queue name
   * @returns Message or undefined
   */
  peek(queueName: string): unknown | undefined {
    const queue = this.queues.get(queueName);
    return queue?.[0];
  }

  /**
   * Get queue length
   *
   * @param queueName - Queue name
   * @returns Number of messages in queue
   */
  getLength(queueName: string): number {
    const queue = this.queues.get(queueName);
    return queue?.length ?? 0;
  }

  /**
   * Clear a queue
   *
   * @param queueName - Queue name
   */
  clearQueue(queueName: string): void {
    this.queues.set(queueName, []);
  }

  /**
   * Clear all queues
   */
  clear(): void {
    this.queues.clear();
  }
}

/**
 * Mock Table storage for testing
 *
 * Simulates Azure Table Storage operations
 */
export class MockTableStorage {
  private readonly tables: Map<string, Map<string, unknown>> = new Map();

  /**
   * Create a table
   *
   * @param tableName - Table name
   */
  createTable(tableName: string): void {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new Map());
    }
  }

  /**
   * Insert an entity
   *
   * @param tableName - Table name
   * @param entity - Entity to insert (must have PartitionKey and RowKey)
   *
   * @example
   * ```typescript
   * const table = new MockTableStorage();
   * table.insert('mytable', {
   *   PartitionKey: 'partition1',
   *   RowKey: 'row1',
   *   data: 'value'
   * });
   * ```
   */
  insert(tableName: string, entity: Record<string, unknown>): void {
    if (!entity.PartitionKey || !entity.RowKey) {
      throw new Error('Entity must have PartitionKey and RowKey');
    }
    this.createTable(tableName);
    const table = this.tables.get(tableName)!;
    const key = `${entity.PartitionKey}|${entity.RowKey}`;
    table.set(key, entity);
  }

  /**
   * Retrieve an entity
   *
   * @param tableName - Table name
   * @param partitionKey - Partition key
   * @param rowKey - Row key
   * @returns Entity or undefined
   */
  retrieve(tableName: string, partitionKey: string, rowKey: string): unknown | undefined {
    const table = this.tables.get(tableName);
    const key = `${partitionKey}|${rowKey}`;
    return table?.get(key);
  }

  /**
   * Query entities
   *
   * @param tableName - Table name
   * @param filter - Optional filter function
   * @returns Array of entities
   */
  query(
    tableName: string,
    filter?: (entity: Record<string, unknown>) => boolean
  ): unknown[] {
    const table = this.tables.get(tableName);
    if (!table) {
      return [];
    }
    const entities = Array.from(table.values());
    if (filter) {
      return entities.filter((e) => filter(e as Record<string, unknown>));
    }
    return entities;
  }

  /**
   * Delete an entity
   *
   * @param tableName - Table name
   * @param partitionKey - Partition key
   * @param rowKey - Row key
   * @returns True if entity was deleted
   */
  delete(tableName: string, partitionKey: string, rowKey: string): boolean {
    const table = this.tables.get(tableName);
    const key = `${partitionKey}|${rowKey}`;
    return table?.delete(key) ?? false;
  }

  /**
   * Clear all tables
   */
  clear(): void {
    this.tables.clear();
  }
}

/**
 * Mock Cosmos DB for testing
 *
 * Simulates Azure Cosmos DB operations
 */
export class MockCosmosDb {
  private readonly databases: Map<string, Map<string, Map<string, unknown>>> = new Map();

  /**
   * Create a database
   *
   * @param databaseName - Database name
   */
  createDatabase(databaseName: string): void {
    if (!this.databases.has(databaseName)) {
      this.databases.set(databaseName, new Map());
    }
  }

  /**
   * Create a collection
   *
   * @param databaseName - Database name
   * @param collectionName - Collection name
   */
  createCollection(databaseName: string, collectionName: string): void {
    this.createDatabase(databaseName);
    const database = this.databases.get(databaseName)!;
    if (!database.has(collectionName)) {
      database.set(collectionName, new Map());
    }
  }

  /**
   * Insert a document
   *
   * @param databaseName - Database name
   * @param collectionName - Collection name
   * @param document - Document to insert (must have id property)
   *
   * @example
   * ```typescript
   * const cosmos = new MockCosmosDb();
   * cosmos.insert('mydb', 'mycollection', { id: '123', name: 'Test' });
   * ```
   */
  insert(
    databaseName: string,
    collectionName: string,
    document: Record<string, unknown>
  ): void {
    if (!document.id) {
      throw new Error('Document must have an id property');
    }
    this.createCollection(databaseName, collectionName);
    const collection = this.databases.get(databaseName)!.get(collectionName)!;
    collection.set(document.id as string, document);
  }

  /**
   * Query documents
   *
   * @param databaseName - Database name
   * @param collectionName - Collection name
   * @param filter - Optional filter function
   * @returns Array of documents
   */
  query(
    databaseName: string,
    collectionName: string,
    filter?: (doc: Record<string, unknown>) => boolean
  ): unknown[] {
    const database = this.databases.get(databaseName);
    const collection = database?.get(collectionName);
    if (!collection) {
      return [];
    }
    const documents = Array.from(collection.values());
    if (filter) {
      return documents.filter((doc) => filter(doc as Record<string, unknown>));
    }
    return documents;
  }

  /**
   * Get a document by ID
   *
   * @param databaseName - Database name
   * @param collectionName - Collection name
   * @param id - Document ID
   * @returns Document or undefined
   */
  get(databaseName: string, collectionName: string, id: string): unknown | undefined {
    const database = this.databases.get(databaseName);
    const collection = database?.get(collectionName);
    return collection?.get(id);
  }

  /**
   * Delete a document
   *
   * @param databaseName - Database name
   * @param collectionName - Collection name
   * @param id - Document ID
   * @returns True if document was deleted
   */
  delete(databaseName: string, collectionName: string, id: string): boolean {
    const database = this.databases.get(databaseName);
    const collection = database?.get(collectionName);
    return collection?.delete(id) ?? false;
  }

  /**
   * Clear all databases
   */
  clear(): void {
    this.databases.clear();
  }
}

/**
 * Create a complete mock binding environment
 *
 * @returns Object containing all mock binding stores
 *
 * @example
 * ```typescript
 * const mocks = createMockBindings();
 * mocks.blob.upload('container', 'file.txt', 'data');
 * mocks.queue.send('myqueue', { message: 'test' });
 * ```
 */
export function createMockBindings() {
  return {
    store: new MockBindingStore(),
    blob: new MockBlobStorage(),
    queue: new MockQueueStorage(),
    table: new MockTableStorage(),
    cosmos: new MockCosmosDb(),
  };
}
