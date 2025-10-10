/**
 * Type definitions for Azure Functions constructs.
 *
 * @packageDocumentation
 */

/**
 * Supported Azure Functions runtimes.
 */
export enum FunctionRuntime {
  NODE = 'node',
  PYTHON = 'python',
  DOTNET = 'dotnet',
  JAVA = 'java',
  POWERSHELL = 'powershell',
  CUSTOM = 'custom',
}

/**
 * HTTP methods for HTTP triggers.
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

/**
 * Authentication levels for HTTP triggers.
 */
export enum AuthLevel {
  ANONYMOUS = 'anonymous',
  FUNCTION = 'function',
  ADMIN = 'admin',
}

/**
 * Packaging strategies for function deployment.
 */
export enum PackagingStrategy {
  INLINE = 'inline',
  STORAGE = 'storage',
  CONTAINER = 'container',
  EXTERNAL = 'external',
}

/**
 * Log levels for function logging.
 */
export enum LogLevel {
  TRACE = 'Trace',
  DEBUG = 'Debug',
  INFORMATION = 'Information',
  WARNING = 'Warning',
  ERROR = 'Error',
  CRITICAL = 'Critical',
  NONE = 'None',
}

/**
 * Direction for bindings.
 */
export type BindingDirection = 'in' | 'out' | 'inout';

/**
 * Webhook types for HTTP triggers.
 */
export type WebhookType = 'github' | 'slack' | 'genericJson';

/**
 * Duration helper type.
 */
export interface Duration {
  readonly seconds: number;
  readonly minutes?: number;
  readonly hours?: number;
}

/**
 * Duration factory for creating duration objects.
 */
export class DurationFactory {
  /**
   * Create a duration from seconds.
   */
  public static seconds(seconds: number): Duration {
    return { seconds };
  }

  /**
   * Create a duration from minutes.
   */
  public static minutes(minutes: number): Duration {
    return { seconds: minutes * 60, minutes };
  }

  /**
   * Create a duration from hours.
   */
  public static hours(hours: number): Duration {
    return { seconds: hours * 3600, hours };
  }
}

/**
 * Base trigger configuration.
 */
export interface BaseTriggerConfig {
  readonly type: string;
  readonly name?: string;
}

/**
 * HTTP trigger configuration.
 */
export interface HttpTriggerConfig extends BaseTriggerConfig {
  readonly type: 'http';
  readonly route?: string;
  readonly methods?: HttpMethod[];
  readonly authLevel?: AuthLevel;
  readonly webhookType?: WebhookType;
}

/**
 * Timer trigger configuration.
 */
export interface TimerTriggerConfig extends BaseTriggerConfig {
  readonly type: 'timer';
  readonly schedule: string;
  readonly runOnStartup?: boolean;
  readonly useMonitor?: boolean;
}

/**
 * Queue trigger configuration.
 */
export interface QueueTriggerConfig extends BaseTriggerConfig {
  readonly type: 'queue';
  readonly queueName: string;
  readonly connection: string;
  readonly batchSize?: number;
  readonly visibilityTimeout?: Duration;
  readonly maxDequeueCount?: number;
}

/**
 * Service Bus trigger configuration.
 */
export interface ServiceBusTriggerConfig extends BaseTriggerConfig {
  readonly type: 'serviceBus';
  readonly queueName?: string;
  readonly topicName?: string;
  readonly subscriptionName?: string;
  readonly connection: string;
  readonly maxConcurrentCalls?: number;
  readonly autoComplete?: boolean;
  readonly maxAutoLockRenewalDuration?: Duration;
}

/**
 * Cosmos DB trigger configuration.
 */
export interface CosmosTriggerConfig extends BaseTriggerConfig {
  readonly type: 'cosmosDb';
  readonly databaseName: string;
  readonly collectionName: string;
  readonly connection: string;
  readonly leaseCollectionName?: string;
  readonly createLeaseCollectionIfNotExists?: boolean;
  readonly maxItemsPerInvocation?: number;
  readonly feedPollDelay?: Duration;
  readonly preferredLocations?: string[];
}

/**
 * Event Hub trigger configuration.
 */
export interface EventHubTriggerConfig extends BaseTriggerConfig {
  readonly type: 'eventHub';
  readonly eventHubName: string;
  readonly connection: string;
  readonly consumerGroup?: string;
  readonly maxBatchSize?: number;
  readonly prefetchCount?: number;
  readonly batchCheckpointFrequency?: number;
}

/**
 * Blob trigger configuration.
 */
export interface BlobTriggerConfig extends BaseTriggerConfig {
  readonly type: 'blob';
  readonly path: string;
  readonly connection: string;
  readonly pollInterval?: Duration;
  readonly maxDegreeOfParallelism?: number;
}

/**
 * Union type for all trigger configurations.
 */
export type TriggerConfig =
  | HttpTriggerConfig
  | TimerTriggerConfig
  | QueueTriggerConfig
  | ServiceBusTriggerConfig
  | CosmosTriggerConfig
  | EventHubTriggerConfig
  | BlobTriggerConfig;

/**
 * Base binding configuration.
 */
export interface BaseBindingConfig {
  readonly type: string;
  readonly direction: BindingDirection;
  readonly name: string;
}

/**
 * Blob binding configuration.
 */
export interface BlobBindingConfig extends BaseBindingConfig {
  readonly type: 'blob';
  readonly path: string;
  readonly connection: string;
  readonly dataType?: 'binary' | 'string' | 'stream';
}

/**
 * Queue binding configuration.
 */
export interface QueueBindingConfig extends BaseBindingConfig {
  readonly type: 'queue';
  readonly queueName: string;
  readonly connection: string;
}

/**
 * Table binding configuration.
 */
export interface TableBindingConfig extends BaseBindingConfig {
  readonly type: 'table';
  readonly tableName: string;
  readonly partitionKey?: string;
  readonly rowKey?: string;
  readonly connection: string;
  readonly take?: number;
  readonly filter?: string;
}

/**
 * Cosmos DB binding configuration.
 */
export interface CosmosBindingConfig extends BaseBindingConfig {
  readonly type: 'cosmosDb';
  readonly databaseName: string;
  readonly collectionName: string;
  readonly connection: string;
  readonly partitionKey?: string;
  readonly id?: string;
  readonly sqlQuery?: string;
  readonly preferredLocations?: string[];
}

/**
 * SignalR binding configuration.
 */
export interface SignalRBindingConfig extends BaseBindingConfig {
  readonly type: 'signalR';
  readonly hubName: string;
  readonly connection: string;
  readonly userId?: string;
  readonly methods?: string[];
}

/**
 * Union type for all binding configurations.
 */
export type BindingConfig =
  | BlobBindingConfig
  | QueueBindingConfig
  | TableBindingConfig
  | CosmosBindingConfig
  | SignalRBindingConfig;

/**
 * Role assignment configuration.
 */
export interface RoleAssignment {
  readonly scope: string;
  readonly roleDefinitionId: string;
}

/**
 * Role configuration for function.
 */
export interface RoleConfig {
  readonly managedIdentity?: boolean;
  readonly additionalRoleAssignments?: RoleAssignment[];
}

/**
 * Build options configuration.
 */
export interface BuildOptions {
  readonly bundle?: boolean;
  readonly external?: string[];
  readonly packages?: 'bundle' | 'external' | 'auto';
  readonly minify?: boolean;
  readonly treeShaking?: boolean;
  readonly sourcemap?: boolean | 'inline' | 'external';
  readonly target?: string;
  readonly tsconfig?: string;
  readonly typeCheck?: boolean;
  readonly loader?: Record<string, string>;
  readonly assetNames?: string;
  readonly publicPath?: string;
  readonly define?: Record<string, string>;
  readonly inject?: string[];
  readonly cache?: boolean;
  readonly cacheLocation?: string;
}

/**
 * Tracing configuration.
 */
export interface TracingConfig {
  readonly enabled?: boolean;
  readonly samplingRate?: number;
  readonly provider?: 'applicationInsights' | 'openTelemetry' | 'custom';
  readonly customProvider?: string;
  readonly propagators?: string[];
}

/**
 * Logging configuration.
 */
export interface LoggingConfig {
  readonly level?: LogLevel;
  readonly structuredLogging?: boolean;
  readonly includeFunctionExecutionDetails?: boolean;
}

/**
 * Function configuration for defineFunction helper.
 */
export interface FunctionConfig<TEnv extends Record<string, string> = Record<string, string>> {
  readonly timeout?: Duration;
  readonly memorySize?: number;
  readonly environment?: TEnv;
  readonly secrets?: Record<string, string>;
  readonly trigger: TriggerConfig;
  readonly inputBindings?: BindingConfig[];
  readonly outputBindings?: BindingConfig[];
  readonly role?: RoleConfig;
  readonly buildOptions?: BuildOptions;
  readonly tracing?: TracingConfig;
  readonly logging?: LoggingConfig;
}

/**
 * Function definition returned by defineFunction.
 */
export interface FunctionDefinition<TEnv extends Record<string, string> = Record<string, string>> {
  readonly type: 'AzureFunction';
  readonly version: string;
  readonly config: FunctionConfig<TEnv>;
}

/**
 * Retry context for function execution.
 */
export interface RetryContext {
  readonly retryCount: number;
  readonly maxRetryCount: number;
  readonly exception?: Error;
}

/**
 * Trace context for distributed tracing.
 */
export interface TraceContext {
  readonly traceparent?: string;
  readonly tracestate?: string;
  readonly attributes?: Record<string, any>;
}

/**
 * Execution context for function invocation.
 */
export interface ExecutionContext {
  readonly invocationId: string;
  readonly functionName: string;
  readonly functionDirectory: string;
  readonly retryContext?: RetryContext;
}

/**
 * Logger interface for function logging.
 */
export interface Logger {
  (...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  info(...args: any[]): void;
  verbose(...args: any[]): void;
  metric(name: string, value: number, properties?: Record<string, any>): void;
}

/**
 * Binding data type.
 */
export type BindingData = Record<string, any>;

/**
 * Azure Function context provided to all handlers.
 */
export interface AzureFunctionContext {
  readonly invocationId: string;
  readonly executionContext: ExecutionContext;
  readonly bindings: BindingData;
  readonly bindingData: Record<string, any>;
  readonly traceContext: TraceContext;
  readonly log: Logger;
  done: (err?: Error, result?: any) => void;
}

/**
 * Principal information for authenticated requests.
 */
export interface Principal {
  readonly id: string;
  readonly name?: string;
  readonly roles?: string[];
  readonly claims?: Record<string, any>;
}

/**
 * HTTP request interface.
 */
export interface HttpRequest {
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly query: Record<string, string>;
  readonly params: Record<string, string>;
  readonly body: any;
  readonly rawBody: string;
  readonly user?: Principal;
}

/**
 * Cookie interface.
 */
export interface Cookie {
  readonly name: string;
  readonly value: string;
  readonly maxAge?: number;
  readonly expires?: Date;
  readonly path?: string;
  readonly domain?: string;
  readonly secure?: boolean;
  readonly httpOnly?: boolean;
  readonly sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * HTTP response interface.
 */
export interface HttpResponse {
  status?: number;
  body?: any;
  headers?: Record<string, string>;
  cookies?: Cookie[];
  isRaw?: boolean;
}

/**
 * Timer schedule status.
 */
export interface ScheduleStatus {
  readonly last: string;
  readonly next: string;
  readonly lastUpdated: string;
}

/**
 * Timer info for timer triggers.
 */
export interface TimerInfo {
  readonly schedule: ScheduleStatus;
  readonly scheduleStatus: ScheduleStatus;
  readonly isPastDue: boolean;
}

/**
 * Message metadata for Service Bus messages.
 */
export interface MessageMetadata {
  readonly messageId: string;
  readonly sequenceNumber: number;
  readonly deliveryCount: number;
  readonly enqueuedTimeUtc: Date;
  readonly properties?: Record<string, any>;
}

/**
 * HTTP handler function type.
 */
export type HttpHandler = (
  context: AzureFunctionContext,
  req: HttpRequest
) => Promise<HttpResponse> | HttpResponse;

/**
 * Timer handler function type.
 */
export type TimerHandler = (
  context: AzureFunctionContext,
  timer: TimerInfo
) => Promise<void> | void;

/**
 * Queue handler function type.
 */
export type QueueHandler<T = any> = (
  context: AzureFunctionContext,
  message: T
) => Promise<void> | void;

/**
 * Service Bus handler function type.
 */
export type ServiceBusHandler<T = any> = (
  context: AzureFunctionContext,
  message: T,
  metadata?: MessageMetadata
) => Promise<void> | void;

/**
 * Event handler function type.
 */
export type EventHandler<T = any> = (
  context: AzureFunctionContext,
  event: T
) => Promise<void> | void;

/**
 * Generic function handler type.
 */
export type FunctionHandler =
  | HttpHandler
  | TimerHandler
  | QueueHandler
  | ServiceBusHandler
  | EventHandler;
