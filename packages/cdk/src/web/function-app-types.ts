/**
 * Type definitions for Azure Functions constructs.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';
import type { IServerFarm } from './server-farm-types';
import type { ManagedServiceIdentity } from '@atakora/lib';

/**
 * Function runtime for Azure Functions.
 */
export const FunctionRuntime = schema.web.FunctionRuntime;
export type FunctionRuntime = typeof FunctionRuntime[keyof typeof FunctionRuntime];

/**
 * Authentication level for HTTP triggers.
 */
export const AuthLevel = schema.web.AuthLevel;
export type AuthLevel = typeof AuthLevel[keyof typeof AuthLevel];

/**
 * HTTP methods.
 */
export const HttpMethod = schema.web.HttpMethod;
export type HttpMethod = typeof HttpMethod[keyof typeof HttpMethod];

/**
 * FTPS state for the Function App.
 */
export const FtpsState = schema.web.FtpsState;
export type FtpsState = typeof FtpsState[keyof typeof FtpsState];

/**
 * Minimum TLS version.
 */
export const MinTlsVersion = schema.web.MinTlsVersion;
export type MinTlsVersion = typeof MinTlsVersion[keyof typeof MinTlsVersion];

/**
 * CORS configuration.
 */
export interface CorsSettings {
  /**
   * List of allowed origins.
   */
  readonly allowedOrigins?: string[];

  /**
   * Whether to support credentials.
   */
  readonly supportCredentials?: boolean;
}

/**
 * Name-value pair for app settings.
 */
export interface NameValuePair {
  /**
   * Setting name.
   */
  readonly name: string;

  /**
   * Setting value.
   */
  readonly value: string;
}

/**
 * HTTP trigger configuration.
 */
export interface HttpTriggerConfig {
  readonly type: 'http';

  /**
   * API route template.
   *
   * @remarks
   * Example: 'api/users/{userId}'
   */
  readonly route?: string;

  /**
   * Allowed HTTP methods.
   *
   * @remarks
   * Defaults to all methods if not specified.
   */
  readonly methods?: HttpMethod[];

  /**
   * Authentication level.
   *
   * @remarks
   * Defaults to AuthLevel.FUNCTION.
   */
  readonly authLevel?: AuthLevel;

  /**
   * Webhook type.
   */
  readonly webHookType?: string;
}

/**
 * Timer trigger configuration.
 */
export interface TimerTriggerConfig {
  readonly type: 'timer';

  /**
   * CRON expression or TimeSpan format.
   *
   * @remarks
   * CRON format: second minute hour day month day-of-week
   * Example: '0 *\/5 * * * *' (every 5 minutes)
   *
   * TimeSpan format: hh:mm:ss
   * Example: '00:05:00' (every 5 minutes)
   */
  readonly schedule: string;

  /**
   * Run on startup.
   *
   * @remarks
   * If true, function runs immediately when deployed.
   * Defaults to false.
   */
  readonly runOnStartup?: boolean;

  /**
   * Use monitor for schedule status.
   *
   * @remarks
   * Defaults to true.
   */
  readonly useMonitor?: boolean;
}

/**
 * Queue trigger configuration.
 */
export interface QueueTriggerConfig {
  readonly type: 'queue';

  /**
   * Queue name to monitor.
   */
  readonly queueName: string;

  /**
   * Storage account connection string app setting name.
   *
   * @remarks
   * Defaults to 'AzureWebJobsStorage'.
   */
  readonly connection?: string;
}

/**
 * Blob trigger configuration.
 */
export interface BlobTriggerConfig {
  readonly type: 'blob';

  /**
   * Blob path pattern to monitor.
   *
   * @remarks
   * Example: 'samples-workitems/{name}' or 'container/path/{name}.{ext}'
   */
  readonly path: string;

  /**
   * Storage account connection string app setting name.
   *
   * @remarks
   * Defaults to 'AzureWebJobsStorage'.
   */
  readonly connection?: string;

  /**
   * Data type for the blob content.
   *
   * @remarks
   * - 'binary': Buffer
   * - 'string': string
   * Defaults to 'binary'.
   */
  readonly dataType?: 'binary' | 'string';
}

/**
 * Service Bus Queue trigger configuration.
 */
export interface ServiceBusQueueTriggerConfig {
  readonly type: 'serviceBusQueue';

  /**
   * Queue name to monitor.
   */
  readonly queueName: string;

  /**
   * Service Bus connection string app setting name.
   *
   * @remarks
   * Defaults to 'AzureWebJobsServiceBus'.
   */
  readonly connection?: string;

  /**
   * Enable session support for ordered processing.
   */
  readonly isSessionsEnabled?: boolean;
}

/**
 * Service Bus Topic trigger configuration.
 */
export interface ServiceBusTopicTriggerConfig {
  readonly type: 'serviceBusTopic';

  /**
   * Topic name to monitor.
   */
  readonly topicName: string;

  /**
   * Subscription name.
   */
  readonly subscriptionName: string;

  /**
   * Service Bus connection string app setting name.
   *
   * @remarks
   * Defaults to 'AzureWebJobsServiceBus'.
   */
  readonly connection?: string;

  /**
   * Enable session support for ordered processing.
   */
  readonly isSessionsEnabled?: boolean;
}

/**
 * Event Hub trigger configuration.
 */
export interface EventHubTriggerConfig {
  readonly type: 'eventHub';

  /**
   * Event Hub name.
   */
  readonly eventHubName: string;

  /**
   * Event Hub connection string app setting name.
   */
  readonly connection: string;

  /**
   * Consumer group name.
   *
   * @remarks
   * Defaults to '$Default'.
   */
  readonly consumerGroup?: string;

  /**
   * Cardinality of the batch.
   *
   * @remarks
   * - 'one': Process one event at a time
   * - 'many': Process batch of events
   * Defaults to 'many'.
   */
  readonly cardinality?: 'one' | 'many';
}

/**
 * Cosmos DB trigger configuration.
 */
export interface CosmosDBTriggerConfig {
  readonly type: 'cosmosDB';

  /**
   * Cosmos DB database name.
   */
  readonly databaseName: string;

  /**
   * Collection (container) name to monitor.
   */
  readonly collectionName: string;

  /**
   * Cosmos DB connection string app setting name.
   */
  readonly connection: string;

  /**
   * Lease collection name.
   *
   * @remarks
   * Used to store change feed lease state.
   * Defaults to 'leases'.
   */
  readonly leaseCollectionName?: string;

  /**
   * Create lease collection if it doesn't exist.
   *
   * @remarks
   * Defaults to false.
   */
  readonly createLeaseCollectionIfNotExists?: boolean;

  /**
   * Preferred locations for geo-replicated accounts.
   */
  readonly preferredLocations?: string;

  /**
   * Start from the beginning of the change feed.
   *
   * @remarks
   * Defaults to false (starts from current time).
   */
  readonly startFromBeginning?: boolean;
}

/**
 * Event Grid trigger configuration.
 */
export interface EventGridTriggerConfig {
  readonly type: 'eventGrid';

  /**
   * Subscription topic filter.
   *
   * @remarks
   * Optional filter for the Event Grid topic.
   */
  readonly topicFilter?: string;

  /**
   * Subscription subject filter.
   *
   * @remarks
   * Optional filter for event subjects.
   */
  readonly subjectFilter?: string;
}

/**
 * IoT Hub trigger configuration.
 */
export interface IoTHubTriggerConfig {
  readonly type: 'iotHub';

  /**
   * Event Hub-compatible name.
   *
   * @remarks
   * The name of the Event Hub-compatible endpoint.
   */
  readonly path: string;

  /**
   * IoT Hub connection string app setting name.
   */
  readonly connection: string;

  /**
   * Consumer group name.
   *
   * @remarks
   * Defaults to '$Default'.
   */
  readonly consumerGroup?: string;

  /**
   * Cardinality of the batch.
   *
   * @remarks
   * - 'one': Process one message at a time
   * - 'many': Process batch of messages
   * Defaults to 'many'.
   */
  readonly cardinality?: 'one' | 'many';
}

/**
 * SignalR trigger configuration.
 */
export interface SignalRTriggerConfig {
  readonly type: 'signalR';

  /**
   * Hub name.
   */
  readonly hubName: string;

  /**
   * Event category.
   *
   * @remarks
   * - 'connections': Connection lifecycle events
   * - 'messages': Message events
   */
  readonly category: 'connections' | 'messages';

  /**
   * Event name to trigger on.
   */
  readonly event: string;

  /**
   * SignalR connection string app setting name.
   *
   * @remarks
   * Defaults to 'AzureSignalRConnectionString'.
   */
  readonly connection?: string;
}

/**
 * Kafka trigger configuration.
 */
export interface KafkaTriggerConfig {
  readonly type: 'kafka';

  /**
   * Kafka topic name.
   */
  readonly topic: string;

  /**
   * Kafka broker list.
   */
  readonly brokerList: string;

  /**
   * Consumer group ID.
   */
  readonly consumerGroup?: string;

  /**
   * Protocol for communication.
   *
   * @remarks
   * Examples: 'plaintext', 'ssl', 'sasl_plaintext', 'sasl_ssl'
   * Defaults to 'plaintext'.
   */
  readonly protocol?: string;

  /**
   * Authentication mode for SASL.
   */
  readonly authenticationMode?: string;

  /**
   * Username for SASL authentication.
   */
  readonly username?: string;

  /**
   * Password app setting name for SASL authentication.
   */
  readonly password?: string;
}

/**
 * RabbitMQ trigger configuration.
 */
export interface RabbitMQTriggerConfig {
  readonly type: 'rabbitMQ';

  /**
   * Queue name to monitor.
   */
  readonly queueName: string;

  /**
   * RabbitMQ connection string app setting name.
   */
  readonly connection: string;

  /**
   * Host name for the RabbitMQ server.
   *
   * @remarks
   * Optional if connection string is provided.
   */
  readonly hostName?: string;

  /**
   * Port number for the RabbitMQ server.
   */
  readonly port?: number;
}

/**
 * Redis Stream trigger configuration.
 */
export interface RedisStreamTriggerConfig {
  readonly type: 'redisStream';

  /**
   * Redis connection string app setting name.
   */
  readonly connection: string;

  /**
   * Stream key to monitor.
   */
  readonly key: string;

  /**
   * Consumer group name.
   */
  readonly consumerGroup?: string;

  /**
   * Polling interval in milliseconds.
   */
  readonly pollingIntervalInMs?: number;

  /**
   * Maximum batch size.
   */
  readonly maxBatchSize?: number;
}

/**
 * Durable Orchestrator trigger configuration.
 */
export interface DurableOrchestratorTriggerConfig {
  readonly type: 'orchestrationTrigger';

  /**
   * Orchestration name.
   *
   * @remarks
   * Optional, defaults to the function name.
   */
  readonly orchestration?: string;
}

/**
 * Durable Activity trigger configuration.
 */
export interface DurableActivityTriggerConfig {
  readonly type: 'activityTrigger';

  /**
   * Activity name.
   *
   * @remarks
   * Optional, defaults to the function name.
   */
  readonly activity?: string;
}

/**
 * Durable Entity trigger configuration.
 */
export interface DurableEntityTriggerConfig {
  readonly type: 'entityTrigger';

  /**
   * Entity name.
   *
   * @remarks
   * Optional, defaults to the function name.
   */
  readonly entityName?: string;
}

/**
 * Union type for all trigger configurations.
 */
export type TriggerConfig =
  | HttpTriggerConfig
  | TimerTriggerConfig
  | QueueTriggerConfig
  | BlobTriggerConfig
  | ServiceBusQueueTriggerConfig
  | ServiceBusTopicTriggerConfig
  | EventHubTriggerConfig
  | CosmosDBTriggerConfig
  | EventGridTriggerConfig
  | IoTHubTriggerConfig
  | SignalRTriggerConfig
  | KafkaTriggerConfig
  | RabbitMQTriggerConfig
  | RedisStreamTriggerConfig
  | DurableOrchestratorTriggerConfig
  | DurableActivityTriggerConfig
  | DurableEntityTriggerConfig;

/**
 * Function App site configuration.
 */
export interface FunctionAppSiteConfig {
  /**
   * App settings (name-value pairs).
   */
  readonly appSettings?: NameValuePair[];

  /**
   * Always on feature enabled.
   *
   * @remarks
   * Keeps the app loaded even when there's no traffic.
   * Not available in Consumption tier.
   */
  readonly alwaysOn?: boolean;

  /**
   * HTTP 2.0 enabled.
   */
  readonly http20Enabled?: boolean;

  /**
   * FTPS state.
   */
  readonly ftpsState?: FtpsState;

  /**
   * Minimum TLS version.
   */
  readonly minTlsVersion?: MinTlsVersion;

  /**
   * CORS settings.
   */
  readonly cors?: CorsSettings;

  /**
   * VNet route all enabled.
   *
   * @remarks
   * Routes all outbound traffic through the VNet.
   */
  readonly vnetRouteAllEnabled?: boolean;

  /**
   * HTTP logging enabled.
   */
  readonly httpLoggingEnabled?: boolean;

  /**
   * Use 32-bit worker process.
   */
  readonly use32BitWorkerProcess?: boolean;

  /**
   * Web sockets enabled.
   */
  readonly webSocketsEnabled?: boolean;

  /**
   * Health check path.
   */
  readonly healthCheckPath?: string;
}

/**
 * Properties for ArmFunctionApp (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Web/sites ARM resource with kind='functionapp'.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-01-01
 *
 * @example
 * ```typescript
 * const props: ArmFunctionAppProps = {
 *   siteName: 'func-app-001',
 *   location: 'eastus',
 *   serverFarmId: '/subscriptions/.../serverfarms/asp-001',
 *   kind: 'functionapp',
 *   storageAccountConnectionString: 'DefaultEndpointsProtocol=https;...',
 *   runtime: FunctionRuntime.NODE,
 *   runtimeVersion: '18'
 * };
 * ```
 */
export interface ArmFunctionAppProps {
  /**
   * Function App (site) name.
   *
   * @remarks
   * - Must be 2-60 characters
   * - Alphanumeric and hyphens only
   * - Cannot start or end with hyphen
   * - Must be globally unique (for azurewebsites.net domain)
   * - Pattern: ^[a-zA-Z0-9][a-zA-Z0-9-]{0,58}[a-zA-Z0-9]$
   */
  readonly siteName: string;

  /**
   * Azure region where the Function App will be created.
   */
  readonly location: string;

  /**
   * App Service Plan resource ID.
   *
   * @remarks
   * Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/serverfarms/{planName}
   */
  readonly serverFarmId: string;

  /**
   * Kind of Function App.
   *
   * @remarks
   * - 'functionapp' for Windows Function App
   * - 'functionapp,linux' for Linux Function App
   */
  readonly kind: 'functionapp' | 'functionapp,linux';

  /**
   * Storage account connection string.
   *
   * @remarks
   * Required for Azure Functions. Used for storing function metadata and state.
   */
  readonly storageAccountConnectionString: string;

  /**
   * Function runtime.
   *
   * @remarks
   * Determines the language runtime for functions.
   */
  readonly runtime?: FunctionRuntime;

  /**
   * Runtime version.
   *
   * @remarks
   * Version of the runtime (e.g., '18' for Node.js 18).
   */
  readonly runtimeVersion?: string;

  /**
   * Managed service identity.
   */
  readonly identity?: ManagedServiceIdentity;

  /**
   * Site configuration.
   */
  readonly siteConfig?: FunctionAppSiteConfig;

  /**
   * Virtual network subnet ID for VNet integration.
   *
   * @remarks
   * Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}/subnets/{subnetName}
   */
  readonly virtualNetworkSubnetId?: string;

  /**
   * HTTPS only enabled.
   *
   * @remarks
   * Redirects all HTTP traffic to HTTPS.
   * Recommended to be true for production apps.
   */
  readonly httpsOnly?: boolean;

  /**
   * Client affinity enabled.
   */
  readonly clientAffinityEnabled?: boolean;

  /**
   * Key Vault reference identity.
   *
   * @remarks
   * Identity to use for Key Vault references.
   * Can be 'SystemAssigned' or a user-assigned identity resource ID.
   */
  readonly keyVaultReferenceIdentity?: string;

  /**
   * Daily memory time quota.
   *
   * @remarks
   * Only applicable to Consumption plan.
   * Value in MB-seconds.
   */
  readonly dailyMemoryTimeQuota?: number;

  /**
   * Tags to apply to the Function App.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for individual Azure Function (L1 construct).
 *
 * @remarks
 * Maps to Microsoft.Web/sites/functions ARM sub-resource.
 *
 * ARM API Version: 2023-01-01
 */
export interface ArmFunctionProps {
  /**
   * Function name.
   *
   * @remarks
   * Must be unique within the Function App.
   */
  readonly functionName: string;

  /**
   * Trigger configuration.
   */
  readonly trigger: TriggerConfig;

  /**
   * Function code (inline).
   *
   * @remarks
   * For inline deployment, this contains the Base64-encoded function code.
   * Must be less than 4KB when encoded.
   */
  readonly inlineCode?: string;

  /**
   * Package URI.
   *
   * @remarks
   * For external deployment, this points to the function package location.
   * Typically a SAS URL to a zip file in blob storage.
   */
  readonly packageUri?: string;

  /**
   * function.json configuration.
   *
   * @remarks
   * Direct ARM representation of the function configuration.
   */
  readonly config?: Record<string, any>;
}

/**
 * Interface for Function App reference.
 *
 * @remarks
 * Allows resources to reference a Function App without depending on the construct class.
 */
export interface IFunctionApp {
  /**
   * Name of the Function App.
   */
  readonly functionAppName: string;

  /**
   * Location of the Function App.
   */
  readonly location: string;

  /**
   * Resource ID of the Function App.
   */
  readonly functionAppId: string;

  /**
   * Default hostname of the Function App.
   */
  readonly defaultHostName: string;
}

/**
 * Interface for individual Azure Function reference.
 */
export interface IAzureFunction {
  /**
   * Name of the function.
   */
  readonly functionName: string;

  /**
   * Resource ID of the function.
   */
  readonly functionId: string;

  /**
   * Trigger URL (for HTTP triggers).
   */
  readonly triggerUrl?: string;
}
