/**
 * Azure Functions Bindings Framework
 *
 * @remarks
 * This module provides type-safe bindings for Azure Functions triggers
 * and input/output bindings. Bindings connect functions to Azure services
 * without requiring explicit connection code.
 *
 * Supported binding types:
 * - HTTP (trigger)
 * - Timer (trigger)
 * - Queue Storage (trigger, input, output)
 * - Blob Storage (trigger, input, output)
 * - Cosmos DB (trigger, input, output)
 * - Service Bus (trigger, input, output)
 * - Event Hubs (trigger, input, output)
 * - Event Grid (trigger)
 * - Table Storage (input, output)
 *
 * @packageDocumentation
 */
/**
 * Base binding configuration
 */
export interface BaseBinding {
    /**
     * Binding type
     */
    readonly type: string;
    /**
     * Binding direction (in, out, inout)
     */
    readonly direction: 'in' | 'out' | 'inout';
    /**
     * Name used to reference binding in function code
     */
    readonly name: string;
}
/**
 * HTTP trigger binding
 */
export interface HttpTriggerBinding extends BaseBinding {
    readonly type: 'httpTrigger';
    readonly direction: 'in';
    /**
     * Allowed HTTP methods
     * @default ['GET', 'POST']
     */
    readonly methods?: readonly ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS')[];
    /**
     * Route template (e.g., 'api/users/{id}')
     */
    readonly route?: string;
    /**
     * Authentication level
     * @default 'function'
     */
    readonly authLevel?: 'anonymous' | 'function' | 'admin';
    /**
     * Enable CORS
     */
    readonly cors?: {
        readonly allowedOrigins: readonly string[];
        readonly allowCredentials?: boolean;
    };
}
/**
 * HTTP output binding (response)
 */
export interface HttpOutputBinding extends BaseBinding {
    readonly type: 'http';
    readonly direction: 'out';
}
/**
 * Timer trigger binding
 */
export interface TimerTriggerBinding extends BaseBinding {
    readonly type: 'timerTrigger';
    readonly direction: 'in';
    /**
     * CRON expression for schedule
     * Format: {second} {minute} {hour} {day} {month} {day-of-week}
     * Example: '0 * /5 * * * *' (every 5 minutes)
     */
    readonly schedule: string;
    /**
     * Run function on startup
     * @default false
     */
    readonly runOnStartup?: boolean;
    /**
     * Use monitor to track missed executions
     * @default true
     */
    readonly useMonitor?: boolean;
}
/**
 * Queue trigger binding
 */
export interface QueueTriggerBinding extends BaseBinding {
    readonly type: 'queueTrigger';
    readonly direction: 'in';
    /**
     * Queue name
     */
    readonly queueName: string;
    /**
     * Storage account connection string or reference
     */
    readonly connection: string;
    /**
     * Number of queue messages to retrieve in parallel
     * @default 16
     */
    readonly batchSize?: number;
    /**
     * Maximum number of dequeue attempts
     * @default 5
     */
    readonly maxDequeueCount?: number;
    /**
     * New batch threshold (percentage)
     * @default 0.2
     */
    readonly newBatchThreshold?: number;
}
/**
 * Queue output binding
 */
export interface QueueOutputBinding extends BaseBinding {
    readonly type: 'queue';
    readonly direction: 'out';
    /**
     * Queue name
     */
    readonly queueName: string;
    /**
     * Storage account connection string or reference
     */
    readonly connection: string;
}
/**
 * Blob trigger binding
 */
export interface BlobTriggerBinding extends BaseBinding {
    readonly type: 'blobTrigger';
    readonly direction: 'in';
    /**
     * Blob path pattern (e.g., 'container/{name}')
     */
    readonly path: string;
    /**
     * Storage account connection string or reference
     */
    readonly connection: string;
    /**
     * Source for blob trigger events
     * @default 'LogsAndContainerScan'
     */
    readonly source?: 'EventGrid' | 'LogsAndContainerScan';
}
/**
 * Blob input binding
 */
export interface BlobInputBinding extends BaseBinding {
    readonly type: 'blob';
    readonly direction: 'in';
    /**
     * Blob path (supports binding expressions)
     */
    readonly path: string;
    /**
     * Storage account connection string or reference
     */
    readonly connection: string;
    /**
     * Data type for blob content
     * @default 'binary'
     */
    readonly dataType?: 'string' | 'binary';
}
/**
 * Blob output binding
 */
export interface BlobOutputBinding extends BaseBinding {
    readonly type: 'blob';
    readonly direction: 'out';
    /**
     * Blob path (supports binding expressions)
     */
    readonly path: string;
    /**
     * Storage account connection string or reference
     */
    readonly connection: string;
}
/**
 * Cosmos DB trigger binding
 */
export interface CosmosDbTriggerBinding extends BaseBinding {
    readonly type: 'cosmosDBTrigger';
    readonly direction: 'in';
    /**
     * Database name
     */
    readonly databaseName: string;
    /**
     * Container/collection name
     */
    readonly containerName: string;
    /**
     * Connection string or reference
     */
    readonly connection: string;
    /**
     * Lease container name
     * @default 'leases'
     */
    readonly leaseContainerName?: string;
    /**
     * Create lease container if it doesn't exist
     * @default false
     */
    readonly createLeaseContainerIfNotExists?: boolean;
    /**
     * Maximum items per invocation
     */
    readonly maxItemsPerInvocation?: number;
    /**
     * Start from beginning of change feed
     * @default false
     */
    readonly startFromBeginning?: boolean;
}
/**
 * Cosmos DB input binding
 */
export interface CosmosDbInputBinding extends BaseBinding {
    readonly type: 'cosmosDB';
    readonly direction: 'in';
    /**
     * Database name
     */
    readonly databaseName: string;
    /**
     * Container/collection name
     */
    readonly containerName: string;
    /**
     * Connection string or reference
     */
    readonly connection: string;
    /**
     * Document ID (supports binding expressions)
     */
    readonly id?: string;
    /**
     * Partition key value
     */
    readonly partitionKey?: string;
    /**
     * SQL query to execute
     */
    readonly sqlQuery?: string;
}
/**
 * Cosmos DB output binding
 */
export interface CosmosDbOutputBinding extends BaseBinding {
    readonly type: 'cosmosDB';
    readonly direction: 'out';
    /**
     * Database name
     */
    readonly databaseName: string;
    /**
     * Container/collection name
     */
    readonly containerName: string;
    /**
     * Connection string or reference
     */
    readonly connection: string;
    /**
     * Create database if it doesn't exist
     * @default false
     */
    readonly createIfNotExists?: boolean;
    /**
     * Partition key for new documents
     */
    readonly partitionKey?: string;
}
/**
 * Service Bus trigger binding
 */
export interface ServiceBusTriggerBinding extends BaseBinding {
    readonly type: 'serviceBusTrigger';
    readonly direction: 'in';
    /**
     * Queue name (if queue trigger)
     */
    readonly queueName?: string;
    /**
     * Topic name (if topic trigger)
     */
    readonly topicName?: string;
    /**
     * Subscription name (required if topic trigger)
     */
    readonly subscriptionName?: string;
    /**
     * Connection string or reference
     */
    readonly connection: string;
    /**
     * Enable auto-complete
     * @default true
     */
    readonly isSessionsEnabled?: boolean;
}
/**
 * Service Bus output binding
 */
export interface ServiceBusOutputBinding extends BaseBinding {
    readonly type: 'serviceBus';
    readonly direction: 'out';
    /**
     * Queue name (if queue output)
     */
    readonly queueName?: string;
    /**
     * Topic name (if topic output)
     */
    readonly topicName?: string;
    /**
     * Connection string or reference
     */
    readonly connection: string;
}
/**
 * Event Hub trigger binding
 */
export interface EventHubTriggerBinding extends BaseBinding {
    readonly type: 'eventHubTrigger';
    readonly direction: 'in';
    /**
     * Event Hub name
     */
    readonly eventHubName: string;
    /**
     * Connection string or reference
     */
    readonly connection: string;
    /**
     * Consumer group
     * @default '$Default'
     */
    readonly consumerGroup?: string;
    /**
     * Cardinality (one or many)
     * @default 'many'
     */
    readonly cardinality?: 'one' | 'many';
}
/**
 * Event Hub output binding
 */
export interface EventHubOutputBinding extends BaseBinding {
    readonly type: 'eventHub';
    readonly direction: 'out';
    /**
     * Event Hub name
     */
    readonly eventHubName: string;
    /**
     * Connection string or reference
     */
    readonly connection: string;
}
/**
 * Event Grid trigger binding
 */
export interface EventGridTriggerBinding extends BaseBinding {
    readonly type: 'eventGridTrigger';
    readonly direction: 'in';
}
/**
 * Table Storage input binding
 */
export interface TableInputBinding extends BaseBinding {
    readonly type: 'table';
    readonly direction: 'in';
    /**
     * Table name
     */
    readonly tableName: string;
    /**
     * Connection string or reference
     */
    readonly connection: string;
    /**
     * Partition key
     */
    readonly partitionKey?: string;
    /**
     * Row key
     */
    readonly rowKey?: string;
    /**
     * Filter expression
     */
    readonly filter?: string;
    /**
     * Maximum rows to return
     */
    readonly take?: number;
}
/**
 * Table Storage output binding
 */
export interface TableOutputBinding extends BaseBinding {
    readonly type: 'table';
    readonly direction: 'out';
    /**
     * Table name
     */
    readonly tableName: string;
    /**
     * Connection string or reference
     */
    readonly connection: string;
}
/**
 * Union type of all trigger bindings
 */
export type TriggerBinding = HttpTriggerBinding | TimerTriggerBinding | QueueTriggerBinding | BlobTriggerBinding | CosmosDbTriggerBinding | ServiceBusTriggerBinding | EventHubTriggerBinding | EventGridTriggerBinding;
/**
 * Union type of all input bindings
 */
export type InputBinding = BlobInputBinding | CosmosDbInputBinding | TableInputBinding;
/**
 * Union type of all output bindings
 */
export type OutputBinding = HttpOutputBinding | QueueOutputBinding | BlobOutputBinding | CosmosDbOutputBinding | ServiceBusOutputBinding | EventHubOutputBinding | TableOutputBinding;
/**
 * Union type of all bindings
 */
export type AnyBinding = TriggerBinding | InputBinding | OutputBinding;
//# sourceMappingURL=index.d.ts.map