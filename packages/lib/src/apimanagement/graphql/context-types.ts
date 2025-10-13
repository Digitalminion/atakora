/**
 * GraphQL Resolver Context Types
 *
 * Defines the context object passed to all GraphQL resolvers.
 * Provides access to Azure services, authentication, data loaders, and observability.
 *
 * @see ADR-011 GraphQL Resolver Architecture - Section 2
 */

import type { DataLoaderRegistry } from './resolver-types';

/**
 * GraphQL resolver context with Azure service integrations
 *
 * This context is created for each GraphQL request and passed to all resolvers.
 * It provides access to Azure services, authentication, caching, and observability.
 */
export interface GraphQLResolverContext {
  // Azure service clients
  readonly cosmos?: CosmosClient;
  readonly storage?: StorageClient;
  readonly sql?: SqlClient;
  readonly serviceBus?: ServiceBusClient;
  readonly keyVault?: KeyVaultClient;
  readonly eventHub?: EventHubClient;
  readonly redis?: RedisClient;

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
  readonly headers?: Record<string, string>;
  readonly response?: ResponseContext;

  // Azure environment
  readonly environment: AzureEnvironment;
  readonly subscriptionId: string;
  readonly resourceGroup?: string;
  readonly region: string;
}

/**
 * Authenticated user from Azure AD or custom provider
 */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email?: string;
  readonly name?: string;
  readonly displayName?: string;
  readonly roles: readonly string[];
  readonly groups?: readonly string[];
  readonly claims: Record<string, any>;
  readonly provider: AuthenticationProvider;
  readonly tenantId?: string;
  readonly objectId?: string;
}

/**
 * Authentication provider type
 */
export type AuthenticationProvider =
  | 'azuread'      // Azure Active Directory
  | 'azureadb2c'   // Azure AD B2C
  | 'apikey'       // API key authentication
  | 'jwt'          // JWT token
  | 'oauth2'       // OAuth 2.0
  | 'custom';      // Custom authentication

/**
 * Permission set for authorization
 */
export interface PermissionSet {
  readonly canRead: (resource: string) => boolean;
  readonly canWrite: (resource: string) => boolean;
  readonly canDelete: (resource: string) => boolean;
  readonly canExecute: (action: string) => boolean;
  readonly hasRole: (role: string) => boolean;
  readonly hasPermission: (permission: string) => boolean;
  readonly hasClaim: (claim: string, value?: any) => boolean;
}

/**
 * Resolver cache interface
 */
export interface ResolverCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  invalidateByTag(tag: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Cache set options
 */
export interface CacheSetOptions {
  readonly ttl: number;              // Time to live in seconds
  readonly scope?: 'private' | 'public';
  readonly tags?: readonly string[]; // Tags for invalidation
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  child(metadata: Record<string, any>): Logger;
}

/**
 * Tracer interface for distributed tracing
 */
export interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
  getCurrentSpan(): Span | undefined;
  setContext(context: Record<string, any>): void;
}

/**
 * Span interface for distributed tracing
 */
export interface Span {
  readonly name: string;
  readonly spanId: string;
  readonly traceId: string;
  setAttributes(attributes: Record<string, any>): void;
  addEvent(name: string, attributes?: Record<string, any>): void;
  setStatus(status: SpanStatus): void;
  end(endTime?: Date): void;
  recordException(exception: Error): void;
}

/**
 * Span options
 */
export interface SpanOptions {
  readonly kind?: 'client' | 'server' | 'producer' | 'consumer' | 'internal';
  readonly attributes?: Record<string, any>;
  readonly startTime?: Date;
  readonly parent?: Span;
}

/**
 * Span status
 */
export interface SpanStatus {
  readonly code: 'ok' | 'error' | 'unset';
  readonly message?: string;
}

/**
 * Metrics collector interface
 */
export interface MetricsCollector {
  increment(name: string, tags?: Record<string, string>): void;
  decrement(name: string, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  timing(name: string, duration: number, tags?: Record<string, string>): void;
  record(name: string, value: number, tags?: Record<string, string>): void;
}

/**
 * Response context for setting headers and cache control
 */
export interface ResponseContext {
  setHeader(name: string, value: string): void;
  setCacheControl(maxAge: number, scope?: 'private' | 'public'): void;
  setStatus(statusCode: number): void;
}

/**
 * Azure environment type
 */
export type AzureEnvironment =
  | 'AzureCloud'           // Public Azure
  | 'AzureUSGovernment'    // Azure Government Cloud
  | 'AzureChinaCloud'      // Azure China Cloud
  | 'AzureGermanCloud';    // Azure German Cloud

/**
 * Cosmos DB client interface
 */
export interface CosmosClient {
  readonly endpoint: string;
  database(id: string): CosmosDatabase;
  getDatabaseAccount(): Promise<DatabaseAccount>;
}

export interface CosmosDatabase {
  readonly id: string;
  container(id: string): CosmosContainer;
  createContainer(config: ContainerConfig): Promise<CosmosContainer>;
}

export interface CosmosContainer {
  readonly id: string;
  readonly database: CosmosDatabase;
  item<T>(id: string, partitionKey?: string): CosmosItem<T>;
  items: CosmosItems;
}

export interface CosmosItem<T> {
  read(): Promise<ItemResponse<T>>;
  replace(body: T): Promise<ItemResponse<T>>;
  delete(): Promise<ItemResponse<T>>;
}

export interface CosmosItems {
  query<T>(query: SqlQuerySpec, options?: FeedOptions): QueryIterator<T>;
  create<T>(body: T, options?: RequestOptions): Promise<ItemResponse<T>>;
  upsert<T>(body: T, options?: RequestOptions): Promise<ItemResponse<T>>;
}

export interface SqlQuerySpec {
  readonly query: string;
  readonly parameters?: readonly QueryParameter[];
}

export interface QueryParameter {
  readonly name: string;
  readonly value: any;
}

export interface FeedOptions {
  readonly maxItemCount?: number;
  readonly continuationToken?: string;
  readonly partitionKey?: string;
}

export interface RequestOptions {
  readonly partitionKey?: string;
}

export interface ItemResponse<T> {
  readonly resource?: T;
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly requestCharge: number;
}

export interface QueryIterator<T> {
  fetchNext(): Promise<FeedResponse<T>>;
  fetchAll(): Promise<FeedResponse<T>>;
  hasMoreResults(): boolean;
  [Symbol.asyncIterator](): AsyncIterator<T>;
}

export interface FeedResponse<T> {
  readonly resources: readonly T[];
  readonly continuationToken?: string;
  readonly requestCharge: number;
  readonly count: number;
}

export interface DatabaseAccount {
  readonly consistencyPolicy: ConsistencyPolicy;
  readonly writableLocations: readonly Location[];
  readonly readableLocations: readonly Location[];
}

export interface ConsistencyPolicy {
  readonly defaultConsistencyLevel: ConsistencyLevel;
}

export type ConsistencyLevel = 'Strong' | 'BoundedStaleness' | 'Session' | 'ConsistentPrefix' | 'Eventual';

export interface Location {
  readonly name: string;
  readonly databaseAccountEndpoint: string;
}

export interface ContainerConfig {
  readonly id: string;
  readonly partitionKey: PartitionKeyDefinition;
  readonly throughput?: number;
}

export interface PartitionKeyDefinition {
  readonly paths: readonly string[];
  readonly kind?: 'Hash' | 'Range';
}

/**
 * Storage client interface
 */
export interface StorageClient {
  readonly accountName: string;
  getBlobContainerClient(containerName: string): BlobContainerClient;
  getQueueClient(queueName: string): QueueClient;
  getTableClient(tableName: string): TableClient;
}

export interface BlobContainerClient {
  readonly containerName: string;
  getBlobClient(blobName: string): BlobClient;
  listBlobsFlat(options?: ListBlobsOptions): AsyncIterableIterator<BlobItem>;
  createIfNotExists(): Promise<void>;
  deleteIfExists(): Promise<void>;
}

export interface BlobClient {
  readonly blobName: string;
  download(): Promise<BlobDownloadResponse>;
  upload(data: Buffer | string, length?: number): Promise<BlobUploadResponse>;
  delete(): Promise<void>;
  exists(): Promise<boolean>;
  getProperties(): Promise<BlobProperties>;
}

export interface BlobItem {
  readonly name: string;
  readonly properties: BlobProperties;
  readonly metadata?: Record<string, string>;
}

export interface BlobProperties {
  readonly contentType?: string;
  readonly contentLength?: number;
  readonly lastModified?: Date;
  readonly etag?: string;
}

export interface BlobDownloadResponse {
  readonly readableStreamBody?: NodeJS.ReadableStream;
  readonly contentType?: string;
  readonly contentLength?: number;
}

export interface BlobUploadResponse {
  readonly etag?: string;
  readonly lastModified?: Date;
}

export interface ListBlobsOptions {
  readonly prefix?: string;
  readonly maxResults?: number;
}

export interface QueueClient {
  readonly queueName: string;
  sendMessage(message: string): Promise<void>;
  receiveMessages(options?: ReceiveMessagesOptions): Promise<readonly QueueMessage[]>;
  deleteMessage(messageId: string, popReceipt: string): Promise<void>;
}

export interface QueueMessage {
  readonly messageId: string;
  readonly messageText: string;
  readonly popReceipt: string;
  readonly insertionTime: Date;
  readonly expirationTime: Date;
  readonly dequeueCount: number;
}

export interface ReceiveMessagesOptions {
  readonly maxMessages?: number;
  readonly visibilityTimeout?: number;
}

export interface TableClient {
  readonly tableName: string;
  getEntity<T>(partitionKey: string, rowKey: string): Promise<T>;
  createEntity<T>(entity: T): Promise<void>;
  updateEntity<T>(entity: T): Promise<void>;
  deleteEntity(partitionKey: string, rowKey: string): Promise<void>;
  listEntities<T>(options?: ListEntitiesOptions): AsyncIterableIterator<T>;
}

export interface ListEntitiesOptions {
  readonly filter?: string;
  readonly select?: readonly string[];
  readonly top?: number;
}

/**
 * SQL client interface
 */
export interface SqlClient {
  readonly server: string;
  readonly database: string;
  query<T>(query: string, parameters?: any[]): Promise<SqlResult<T>>;
  execute(query: string, parameters?: any[]): Promise<SqlExecuteResult>;
  transaction(): SqlTransaction;
}

export interface SqlResult<T> {
  readonly recordset: readonly T[];
  readonly rowsAffected: readonly number[];
  readonly returnValue?: any;
}

export interface SqlExecuteResult {
  readonly rowsAffected: readonly number[];
  readonly returnValue?: any;
}

export interface SqlTransaction {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  query<T>(query: string, parameters?: any[]): Promise<SqlResult<T>>;
  execute(query: string, parameters?: any[]): Promise<SqlExecuteResult>;
}

/**
 * Service Bus client interface
 */
export interface ServiceBusClient {
  readonly fullyQualifiedNamespace: string;
  createSender(queueOrTopicName: string): ServiceBusSender;
  createReceiver(queueOrTopicName: string, options?: ReceiverOptions): ServiceBusReceiver;
  close(): Promise<void>;
}

export interface ServiceBusSender {
  readonly entityPath: string;
  sendMessages(messages: ServiceBusMessage | readonly ServiceBusMessage[]): Promise<void>;
  scheduleMessages(messages: ServiceBusMessage | readonly ServiceBusMessage[], scheduledEnqueueTime: Date): Promise<readonly number[]>;
  close(): Promise<void>;
}

export interface ServiceBusReceiver {
  readonly entityPath: string;
  receiveMessages(maxMessageCount: number, options?: ReceiveOptions): Promise<readonly ServiceBusReceivedMessage[]>;
  peekMessages(maxMessageCount: number): Promise<readonly ServiceBusReceivedMessage[]>;
  completeMessage(message: ServiceBusReceivedMessage): Promise<void>;
  abandonMessage(message: ServiceBusReceivedMessage): Promise<void>;
  close(): Promise<void>;
}

export interface ServiceBusMessage {
  readonly body: any;
  readonly contentType?: string;
  readonly correlationId?: string;
  readonly messageId?: string;
  readonly partitionKey?: string;
  readonly replyTo?: string;
  readonly subject?: string;
  readonly timeToLive?: number;
  readonly applicationProperties?: Record<string, any>;
}

export interface ServiceBusReceivedMessage extends ServiceBusMessage {
  readonly deliveryCount: number;
  readonly enqueuedTime: Date;
  readonly sequenceNumber: number;
  readonly lockToken: string;
}

export interface ReceiverOptions {
  readonly receiveMode?: 'peekLock' | 'receiveAndDelete';
  readonly subQueueType?: 'deadLetter' | 'transferDeadLetter';
}

export interface ReceiveOptions {
  readonly maxWaitTimeInMs?: number;
}

/**
 * Key Vault client interface
 */
export interface KeyVaultClient {
  readonly vaultUrl: string;
  getSecret(secretName: string): Promise<KeyVaultSecret>;
  setSecret(secretName: string, value: string): Promise<KeyVaultSecret>;
  deleteSecret(secretName: string): Promise<void>;
  getKey(keyName: string): Promise<KeyVaultKey>;
  getCertificate(certificateName: string): Promise<KeyVaultCertificate>;
}

export interface KeyVaultSecret {
  readonly name: string;
  readonly value: string;
  readonly properties: SecretProperties;
}

export interface SecretProperties {
  readonly id: string;
  readonly enabled?: boolean;
  readonly notBefore?: Date;
  readonly expiresOn?: Date;
  readonly createdOn?: Date;
  readonly updatedOn?: Date;
  readonly tags?: Record<string, string>;
}

export interface KeyVaultKey {
  readonly name: string;
  readonly keyType: string;
  readonly keyOperations: readonly string[];
  readonly properties: KeyProperties;
}

export interface KeyProperties {
  readonly id: string;
  readonly enabled?: boolean;
  readonly notBefore?: Date;
  readonly expiresOn?: Date;
  readonly createdOn?: Date;
  readonly updatedOn?: Date;
}

export interface KeyVaultCertificate {
  readonly name: string;
  readonly properties: CertificateProperties;
  readonly cer?: Uint8Array;
}

export interface CertificateProperties {
  readonly id: string;
  readonly enabled?: boolean;
  readonly notBefore?: Date;
  readonly expiresOn?: Date;
  readonly createdOn?: Date;
  readonly updatedOn?: Date;
}

/**
 * Event Hub client interface
 */
export interface EventHubClient {
  readonly eventHubName: string;
  createProducer(options?: ProducerOptions): EventHubProducer;
  createConsumer(consumerGroup: string, options?: ConsumerOptions): EventHubConsumer;
  close(): Promise<void>;
}

export interface EventHubProducer {
  sendBatch(events: readonly EventData[]): Promise<void>;
  close(): Promise<void>;
}

export interface EventHubConsumer {
  subscribe(handlers: SubscriptionEventHandlers): void;
  close(): Promise<void>;
}

export interface EventData {
  readonly body: any;
  readonly properties?: Record<string, any>;
  readonly systemProperties?: Record<string, any>;
}

export interface ProducerOptions {
  readonly partitionId?: string;
}

export interface ConsumerOptions {
  readonly partitionId?: string;
  readonly startPosition?: EventPosition;
}

export interface EventPosition {
  readonly offset?: number;
  readonly sequenceNumber?: number;
  readonly enqueuedOn?: Date;
}

export interface SubscriptionEventHandlers {
  processEvents(events: readonly EventData[]): Promise<void>;
  processError(error: Error): Promise<void>;
}

/**
 * Redis client interface
 */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
}
