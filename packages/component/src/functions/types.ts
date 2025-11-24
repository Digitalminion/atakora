/**
 * Function Customization Types
 *
 * @remarks
 * Type definitions for function configuration, handlers, and execution context.
 * Provides type-safe function handler implementation with database, storage,
 * and user context access.
 *
 * @packageDocumentation
 */

import type { Duration } from '../common/duration';
import type { Threshold } from '../common/threshold';

// ============================================================================
// Function Configuration
// ============================================================================

/**
 * Configuration for a custom function handler
 *
 * @public
 */
export interface FunctionConfig {
  /**
   * The function name (must match function model name)
   */
  readonly name: string;

  /**
   * Memory allocation in megabytes
   * @defaultValue 256
   */
  readonly memory: number;

  /**
   * Execution timeout in milliseconds
   * @defaultValue 30000 (30 seconds)
   */
  readonly timeout: number;

  /**
   * Custom handler implementation
   * @optional
   */
  readonly handler?: FunctionHandler;

  /**
   * Output bindings (storage, queue, etc.)
   * @optional
   */
  readonly bindings?: BindingConfig;

  /**
   * Environment variables
   * @optional
   */
  readonly environment?: EnvironmentConfig;

  /**
   * Monitoring and alerting configuration
   * @optional
   */
  readonly monitoring?: MonitoringConfig;
}

// ============================================================================
// Function Handler
// ============================================================================

/**
 * Function handler implementation
 *
 * @typeParam TInput - The input type (inferred from function model)
 * @typeParam TOutput - The output type (inferred from function model)
 *
 * @param context - Execution context with database, storage, and utilities
 * @param input - Input data matching the function model input schema
 * @returns Promise resolving to output matching the function model output schema
 *
 * @example
 * ```typescript
 * const handler: FunctionHandler<GenerateReportInput, GenerateReportOutput> = async (context, input) => {
 *   const dataset = await context.database.datasets.get(input.datasetId);
 *   const reportUrl = await generateReport(dataset);
 *   return { reportUrl, status: 'completed' };
 * };
 * ```
 *
 * @public
 */
export type FunctionHandler<TInput = any, TOutput = any> = (
  context: FunctionContext,
  input: TInput
) => Promise<TOutput>;

// ============================================================================
// Function Context
// ============================================================================

/**
 * Execution context provided to function handlers
 *
 * @remarks
 * Provides access to database operations, storage operations, user context,
 * and utility functions during function execution.
 *
 * @public
 */
export interface FunctionContext {
  /**
   * Database client for CRUD operations
   *
   * @remarks
   * Auto-generated database client based on schema models.
   * Provides typed methods for all CRUD operations.
   *
   * @example
   * ```typescript
   * const user = await context.database.users.get(userId);
   * await context.database.reports.create({ ... });
   * ```
   */
  readonly database: DatabaseClient;

  /**
   * Storage client for blob operations
   *
   * @remarks
   * Provides access to blob storage containers defined in backend configuration.
   *
   * @example
   * ```typescript
   * const url = await context.storage.blobs.upload('reports/report.pdf', data);
   * const content = await context.storage.blobs.download(url);
   * ```
   */
  readonly storage: StorageClient;

  /**
   * Current user context
   *
   * @remarks
   * Contains authenticated user information from the request.
   * Populated by authentication middleware.
   */
  readonly user: UserContext;

  /**
   * Utility functions
   */
  readonly utils: FunctionUtils;

  /**
   * Service registry for custom services
   *
   * @remarks
   * Access to injected services like report generators, data validators,
   * AI search, and other custom business logic services.
   *
   * @example
   * ```typescript
   * const report = await context.services.reportGenerator.generate(data);
   * const isValid = await context.services.dataValidator.validate(input);
   * const results = await context.services.aiSearch.search(query);
   * ```
   */
  readonly services: ServiceRegistry;

  /**
   * Logging interface
   *
   * @remarks
   * Provides methods for logging at different severity levels.
   * Integrated with Azure Application Insights.
   *
   * @example
   * ```typescript
   * context.log('Processing started');
   * context.log.info('User action completed');
   * context.log.error('Failed to process', error);
   * ```
   */
  readonly log: Logger;

  /**
   * Binding data from triggers
   *
   * @remarks
   * Contains trigger-specific metadata. For HTTP triggers, this includes
   * request metadata. For queue/service bus triggers, this includes message properties.
   *
   * @optional
   * @example
   * ```typescript
   * const messageId = context.bindingData.messageId;
   * const enqueuedTime = context.bindingData.enqueuedTimeUtc;
   * ```
   */
  readonly bindingData?: Record<string, any>;

  /**
   * Unique execution identifier
   *
   * @remarks
   * Unique ID for this function execution, useful for logging and tracing.
   */
  readonly executionId: string;

  /**
   * Execution start time (milliseconds since epoch)
   */
  readonly executionTime: number;

  /**
   * Azure Functions invocation ID
   *
   * @remarks
   * The Azure Functions runtime invocation ID for correlation.
   */
  readonly invocationId: string;
}

/**
 * Service registry for custom services
 *
 * @remarks
 * Registry of custom services that can be injected into function context.
 * Services are defined in the backend configuration and made available to all functions.
 *
 * @public
 */
export interface ServiceRegistry {
  /**
   * Report generator service
   * @optional
   */
  reportGenerator?: any;

  /**
   * Data validator service
   * @optional
   */
  dataValidator?: any;

  /**
   * Data transformer service
   * @optional
   */
  dataTransformer?: any;

  /**
   * AI search service
   * @optional
   */
  aiSearch?: any;

  /**
   * Custom service registry
   *
   * @remarks
   * Allows access to any custom service by name
   */
  [serviceName: string]: any;
}

/**
 * User context from authentication
 *
 * @public
 */
export interface UserContext {
  /**
   * User identifier
   */
  readonly id: string;

  /**
   * User email address
   */
  readonly email: string;

  /**
   * User roles/groups
   */
  readonly roles: string[];

  /**
   * User display name
   * @optional
   */
  readonly name?: string;

  /**
   * Custom claims from authentication provider
   * @optional
   */
  readonly claims?: Record<string, any>;
}

/**
 * Utility functions available in function context
 *
 * @public
 */
export interface FunctionUtils {
  /**
   * Generate a unique ID with optional prefix
   *
   * @param prefix - Prefix for the ID (e.g., 'rpt' for report IDs)
   * @returns Unique identifier string
   *
   * @example
   * ```typescript
   * const reportId = context.utils.generateId('rpt'); // 'rpt_abc123xyz'
   * ```
   */
  generateId(prefix?: string): string;

  /**
   * Current timestamp (milliseconds since epoch)
   */
  now(): number;

  /**
   * Format a date to ISO string
   */
  formatDate(date: Date): string;
}

/**
 * Logging interface for function execution
 *
 * @remarks
 * Provides structured logging capabilities integrated with Azure Application Insights.
 * Supports multiple log levels and structured data.
 *
 * @public
 */
export interface Logger {
  /**
   * Log a message (default info level)
   *
   * @param message - The log message
   * @param data - Optional structured data to log
   */
  (message: string, ...data: any[]): void;

  /**
   * Log an informational message
   */
  info(message: string, ...data: any[]): void;

  /**
   * Log a warning message
   */
  warn(message: string, ...data: any[]): void;

  /**
   * Log an error message
   */
  error(message: string, error?: Error, ...data: any[]): void;

  /**
   * Log a verbose/debug message
   */
  verbose(message: string, ...data: any[]): void;
}

// ============================================================================
// Database Client
// ============================================================================

/**
 * Database client for CRUD operations
 *
 * @remarks
 * Auto-generated based on schema models. Provides typed methods for
 * all CRUD models defined in the schema.
 *
 * @public
 */
export interface DatabaseClient {
  /**
   * Access model operations by model name
   *
   * @example
   * ```typescript
   * const user = await context.database.users.get(userId);
   * const users = await context.database.users.list({ status: 'active' });
   * await context.database.users.create({ email: 'user@example.com' });
   * await context.database.users.update(userId, { name: 'New Name' });
   * await context.database.users.delete(userId);
   * ```
   */
  [modelName: string]: ModelOperations<any>;
}

/**
 * CRUD operations for a model
 *
 * @typeParam T - The model type
 * @public
 */
export interface ModelOperations<T> {
  /**
   * Get a single record by ID
   */
  get(id: string): Promise<T | null>;

  /**
   * List records with optional filtering
   */
  list(filter?: Partial<T>): Promise<T[]>;

  /**
   * Create a new record
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Update an existing record
   */
  update(id: string, data: Partial<T>): Promise<T>;

  /**
   * Delete a record
   */
  delete(id: string): Promise<void>;
}

// ============================================================================
// Storage Client
// ============================================================================

/**
 * Storage client for blob operations
 *
 * @public
 */
export interface StorageClient {
  /**
   * Blob storage operations
   */
  readonly blobs: BlobOperations;

  /**
   * File share operations (if configured)
   * @optional
   */
  readonly files?: FileOperations;
}

/**
 * Blob storage operations
 *
 * @public
 */
export interface BlobOperations {
  /**
   * Upload a blob
   *
   * @param path - Blob path within container
   * @param data - Blob data (Buffer or string)
   * @param options - Upload options
   * @returns URL of uploaded blob
   */
  upload(path: string, data: Buffer | string, options?: UploadOptions): Promise<string>;

  /**
   * Download a blob
   *
   * @param url - Blob URL or path
   * @returns Blob data as Buffer
   */
  download(url: string): Promise<Buffer>;

  /**
   * Delete a blob
   *
   * @param url - Blob URL or path
   */
  delete(url: string): Promise<void>;

  /**
   * Check if a blob exists
   *
   * @param url - Blob URL or path
   */
  exists(url: string): Promise<boolean>;
}

/**
 * File share operations
 *
 * @public
 */
export interface FileOperations {
  /**
   * Upload a file
   */
  upload(path: string, data: Buffer | string): Promise<string>;

  /**
   * Download a file
   */
  download(path: string): Promise<Buffer>;

  /**
   * Delete a file
   */
  delete(path: string): Promise<void>;
}

/**
 * Blob upload options
 *
 * @public
 */
export interface UploadOptions {
  /**
   * Content type (MIME type)
   */
  contentType?: string;

  /**
   * Cache control header
   */
  cacheControl?: string;

  /**
   * Custom metadata
   */
  metadata?: Record<string, string>;
}

// ============================================================================
// Bindings
// ============================================================================

/**
 * Output bindings configuration
 *
 * @remarks
 * Define output bindings for storage, queues, event grid, etc.
 *
 * @public
 */
export interface BindingConfig {
  /**
   * Blob storage binding
   * @optional
   */
  storage?: StorageBinding;

  /**
   * Queue binding
   * @optional
   */
  queue?: QueueBinding;

  /**
   * Event Grid binding
   * @optional
   */
  event?: EventBinding;

  /**
   * Service Bus binding
   * @optional
   */
  serviceBus?: ServiceBusBinding;
}

/**
 * Storage binding configuration
 *
 * @public
 */
export interface StorageBinding {
  /**
   * Binding type
   */
  readonly type: 'blob';

  /**
   * Container name
   */
  readonly container: string;

  /**
   * Blob path (supports template variables)
   *
   * @example
   * ```typescript
   * path: 'reports/{reportId}.pdf'
   * ```
   */
  readonly path: string;

  /**
   * Connection string reference (defaults to primary storage account)
   * @optional
   */
  readonly connection?: string;
}

/**
 * Queue binding configuration
 *
 * @public
 */
export interface QueueBinding {
  /**
   * Binding type
   */
  readonly type: 'queue';

  /**
   * Queue name
   */
  readonly name: string;

  /**
   * Message to send (supports template variables)
   * @optional
   */
  readonly message?: Record<string, any>;

  /**
   * Connection string reference (defaults to primary storage account)
   * @optional
   */
  readonly connection?: string;
}

/**
 * Event Grid binding configuration
 *
 * @public
 */
export interface EventBinding {
  /**
   * Binding type
   */
  readonly type: 'eventGrid';

  /**
   * Event Grid topic name
   */
  readonly topicName: string;

  /**
   * Event type
   * @optional
   */
  readonly eventType?: string;

  /**
   * Event subject
   * @optional
   */
  readonly subject?: string;
}

/**
 * Service Bus binding configuration
 *
 * @public
 */
export interface ServiceBusBinding {
  /**
   * Binding type
   */
  readonly type: 'serviceBus';

  /**
   * Queue name (mutually exclusive with topicName)
   * @optional
   */
  readonly queueName?: string;

  /**
   * Topic name (mutually exclusive with queueName)
   * @optional
   */
  readonly topicName?: string;

  /**
   * Connection string reference
   * @optional
   */
  readonly connection?: string;
}

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Environment variables configuration
 *
 * @remarks
 * Define required and optional environment variables with default values.
 *
 * @example
 * ```typescript
 * {
 *   STORAGE_ACCOUNT: 'required',
 *   MAX_FILE_SIZE: '100',
 *   ENABLE_DEBUG: 'false'
 * }
 * ```
 *
 * @public
 */
export interface EnvironmentConfig {
  /**
   * Environment variable definitions
   *
   * @remarks
   * - String value: Default value (variable is optional)
   * - 'required': Variable must be set at runtime
   */
  [key: string]: string | 'required';
}

// ============================================================================
// Monitoring Configuration
// ============================================================================

/**
 * Monitoring and alerting configuration
 *
 * @public
 */
export interface MonitoringConfig {
  /**
   * Enable custom metrics collection
   * @defaultValue false
   */
  readonly metrics?: boolean;

  /**
   * Enable distributed tracing
   * @defaultValue false
   */
  readonly tracing?: boolean;

  /**
   * Alert rules
   * @optional
   */
  readonly alerts?: AlertRule[];
}

/**
 * Alert rule configuration
 *
 * @public
 */
export interface AlertRule {
  /**
   * Alert metric (executionTime, memoryUsage, failureRate)
   */
  readonly metric: 'executionTime' | 'memoryUsage' | 'failureRate' | string;

  /**
   * Threshold condition
   */
  readonly condition: 'greaterThan' | 'lessThan' | 'equals';

  /**
   * Threshold value
   */
  readonly value: number | Duration;

  /**
   * Alert severity
   */
  readonly severity: 'info' | 'warn' | 'error' | 'critical';

  /**
   * Email notification recipients
   * @optional
   */
  readonly emails?: string[];

  /**
   * Actions to take when the alert triggers
   * @optional
   */
  readonly actions?: readonly AlertAction[];
}

/**
 * Mutable alert rule for building
 * @internal
 */
export interface MutableAlertRule {
  metric: 'executionTime' | 'memoryUsage' | 'failureRate' | string;
  condition: 'greaterThan' | 'lessThan' | 'equals';
  value: number | Duration;
  severity?: 'info' | 'warn' | 'error' | 'critical';
  emails?: string[];
  actions?: AlertAction[];
}

/**
 * Action to take when an alert is triggered
 *
 * @public
 */
export interface AlertAction {
  /**
   * The type of action
   */
  readonly type: 'email' | 'webhook' | 'sms';

  /**
   * The target for the action (email address, webhook URL, phone number)
   */
  readonly target: string;
}

// ============================================================================
// Execution Context (Internal)
// ============================================================================

/**
 * Internal execution context
 *
 * @remarks
 * Used internally to create FunctionContext.
 *
 * @internal
 */
export interface ExecutionContext {
  /**
   * Execution ID
   */
  readonly executionId: string;

  /**
   * Execution start time
   */
  readonly executionTime: number;

  /**
   * Invocation ID
   */
  readonly invocationId: string;

  /**
   * Backend configuration
   */
  readonly backend?: any;
}
