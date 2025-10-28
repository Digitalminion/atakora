# Azure Functions API Design Specification

## Overview

This document provides the complete TypeScript API design for Azure Functions support in Atakora. The design prioritizes type safety, developer experience, and extensibility while maintaining consistency with existing Atakora patterns.

## defineFunction() Helper API

### Function Definition Helper

```typescript
// Helper function for defining Azure Functions with type-safe configuration
export function defineFunction<TEnv extends Record<string, string> = {}>(
  config: FunctionConfig<TEnv>
): FunctionDefinition<TEnv> {
  return {
    type: 'AzureFunction',
    version: '1.0',
    config: {
      ...config,
      // Ensure defaults
      timeout: config.timeout ?? Duration.minutes(5),
      memorySize: config.memorySize ?? 512,
      environment: config.environment ?? {} as TEnv,
    },
  };
}

// Main configuration interface
export interface FunctionConfig<TEnv extends Record<string, string> = {}> {
  // Runtime configuration
  readonly timeout?: Duration;
  readonly memorySize?: number; // MB, only for Premium/Dedicated

  // Environment variables with placeholder support
  readonly environment?: TEnv;

  // Secret references from Key Vault
  readonly secrets?: Record<string, string>; // key: secretName

  // Trigger configuration (required)
  readonly trigger: TriggerConfig;

  // Additional bindings
  readonly inputBindings?: BindingConfig[];
  readonly outputBindings?: BindingConfig[];

  // IAM/Role configuration
  readonly role?: RoleConfig;

  // Build configuration
  readonly buildOptions?: BuildOptions;

  // Observability
  readonly tracing?: TracingConfig;
  readonly logging?: LoggingConfig;
}

// Function definition returned by defineFunction
export interface FunctionDefinition<TEnv extends Record<string, string> = {}> {
  readonly type: 'AzureFunction';
  readonly version: string;
  readonly config: Required<FunctionConfig<TEnv>>;
}

// Role configuration
export interface RoleConfig {
  readonly managedIdentity?: boolean;
  readonly additionalRoleAssignments?: RoleAssignment[];
}

export interface RoleAssignment {
  readonly scope: string; // Resource ID or scope
  readonly roleDefinitionId: string; // Built-in or custom role
}
```

### Type-Safe Environment Variables

```typescript
// Ensure compile-time type safety between resource.ts and app.ts
export type EnvironmentPlaceholders<T extends Record<string, string>> = {
  [K in keyof T]: `\${${string}}` | string;
};

// Example usage in resource.ts
export interface MyFunctionEnv {
  readonly TABLE_NAME: string;
  readonly API_ENDPOINT: string;
  readonly MAX_RETRIES: string;
}

// In resource.ts - placeholders
const functionDef = defineFunction<MyFunctionEnv>({
  environment: {
    TABLE_NAME: '${COSMOS_TABLE_NAME}',
    API_ENDPOINT: '${API_GATEWAY_URL}',
    MAX_RETRIES: '3', // Literal value
  },
  trigger: { type: 'http' },
});

// In app.ts - actual values provided
const myFunction = new AzureFunction(functionApp, 'MyFunction', {
  handler: './functions/myFunc/handler.ts',
  resource: './functions/myFunc/resource.ts',
  environment: {
    COSMOS_TABLE_NAME: cosmosDb.tableName,
    API_GATEWAY_URL: apiGateway.endpoint,
    // MAX_RETRIES uses literal from resource.ts
  },
});

// TypeScript compiler ensures all placeholders are resolved
```

### Handler Context Types

```typescript
// Azure Function context provided to all handlers
export interface AzureFunctionContext {
  readonly invocationId: string;
  readonly executionContext: ExecutionContext;
  readonly bindings: BindingData;
  readonly bindingData: Record<string, any>;
  readonly traceContext: TraceContext;
  readonly log: Logger;
  done: (err?: Error, result?: any) => void;
}

export interface ExecutionContext {
  readonly invocationId: string;
  readonly functionName: string;
  readonly functionDirectory: string;
  readonly retryContext?: RetryContext;
}

export interface BindingData {
  // Strongly typed based on bindings
  readonly [key: string]: any;
}

export interface Logger {
  (...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  info(...args: any[]): void;
  verbose(...args: any[]): void;
  metric(name: string, value: number, properties?: Record<string, any>): void;
}

// Handler types for different triggers
export type HttpHandler = (
  context: AzureFunctionContext,
  req: HttpRequest
) => Promise<HttpResponse> | HttpResponse;

export type TimerHandler = (
  context: AzureFunctionContext,
  timer: TimerInfo
) => Promise<void> | void;

export type QueueHandler<T = any> = (
  context: AzureFunctionContext,
  message: T
) => Promise<void> | void;

export type ServiceBusHandler<T = any> = (
  context: AzureFunctionContext,
  message: T,
  metadata?: MessageMetadata
) => Promise<void> | void;
```

## Core Interfaces

### Function App (Container)

```typescript
// L1 Construct - Direct ARM mapping
interface ArmFunctionAppProps {
  readonly siteName: string;
  readonly location: string;
  readonly serverFarmId: string;
  readonly kind: 'functionapp' | 'functionapp,linux';
  readonly storageAccountConnectionString: string;
  readonly runtime?: FunctionAppRuntime;
  readonly runtimeVersion?: string;
  readonly identity?: ManagedServiceIdentity;
  readonly siteConfig?: FunctionAppSiteConfig;
  readonly virtualNetworkSubnetId?: string;
  readonly tags?: Record<string, string>;
}

// L2 Construct - Developer-friendly
interface FunctionAppProps {
  readonly functionAppName?: string;  // Auto-generated if not provided
  readonly plan: IAppServicePlan;      // Reference to plan
  readonly storageAccount: IStorageAccount; // Required for Functions
  readonly runtime?: FunctionRuntime;  // Default: 'node'
  readonly runtimeVersion?: string;    // Default: '18'
  readonly location?: string;          // Default: from ResourceGroup
  readonly environment?: Record<string, string>;
  readonly identity?: ManagedServiceIdentity;
  readonly vnetConfig?: VNetConfiguration;
  readonly tags?: Record<string, string>;

  // Function-specific settings
  readonly dailyMemoryTimeQuota?: number;  // Consumption plan limit
  readonly preWarmedInstanceCount?: number; // Premium plan
  readonly maximumElasticWorkerCount?: number;
  readonly functionTimeout?: Duration;      // Global timeout
  readonly healthCheckPath?: string;
  readonly cors?: CorsSettings;
}

interface IFunctionApp {
  readonly functionAppName: string;
  readonly functionAppId: string;
  readonly defaultHostName: string;
  readonly location: string;
  readonly identity?: ManagedServiceIdentity;
  readonly connectionString: string;

  // Methods
  addFunction(id: string, props: AzureFunctionProps): AzureFunction;
  addApplicationSetting(key: string, value: string): void;
  enableVNetIntegration(subnetId: string): void;
}
```

### Azure Function (Individual Function)

```typescript
// Main Function Props - Updated for handler.ts + resource.ts pattern
interface AzureFunctionProps {
  // Required - paths to function files
  readonly handler: string;           // Path to handler.ts file
  readonly resource?: string;         // Path to resource.ts file (optional for backward compat)

  // If resource is not provided, inline configuration can be used
  readonly inlineConfig?: FunctionConfig;

  // Optional Configuration
  readonly functionName?: string;     // Auto-generated if not provided

  // Environment variable overrides (merged with resource.ts values)
  readonly environment?: Record<string, string | IResourceReference>;

  // Build configuration overrides
  readonly buildOptions?: BuildOptions;
}

// Function Interface
interface IAzureFunction {
  readonly functionName: string;
  readonly functionId: string;
  readonly triggerUrl?: string;    // For HTTP triggers
  readonly functionKey?: string;   // For secured functions

  // Methods
  grantInvoke(principal: IPrincipal): void;
  addInputBinding(binding: FunctionBinding): void;
  addOutputBinding(binding: FunctionBinding): void;
  addSecret(key: string, secret: IKeyVaultSecret): void;
}
```

### Trigger Definitions

```typescript
// Base trigger type
interface BaseTrigger {
  readonly type: string;
  readonly name?: string;  // Binding name, auto-generated if not provided
}

// HTTP Trigger
interface HttpTrigger extends BaseTrigger {
  readonly type: 'http';
  readonly route?: string;           // API route template
  readonly methods?: HttpMethod[];   // GET, POST, etc.
  readonly authLevel?: AuthLevel;    // anonymous, function, admin
  readonly webhookType?: WebhookType; // For webhook scenarios
}

// Timer Trigger
interface TimerTrigger extends BaseTrigger {
  readonly type: 'timer';
  readonly schedule: string;         // CRON expression or TimeSpan
  readonly runOnStartup?: boolean;   // Run immediately on deploy
  readonly useMonitor?: boolean;     // Track schedule status
}

// Queue Trigger
interface QueueTrigger extends BaseTrigger {
  readonly type: 'queue';
  readonly queueName: string;
  readonly connection: string | IStorageAccount;
  readonly batchSize?: number;       // Messages to process in parallel
  readonly visibilityTimeout?: Duration;
  readonly maxDequeueCount?: number;
}

// Service Bus Trigger
interface ServiceBusTrigger extends BaseTrigger {
  readonly type: 'serviceBus';
  readonly queueName?: string;       // Either queue or topic
  readonly topicName?: string;
  readonly subscriptionName?: string;
  readonly connection: string | IServiceBusNamespace;
  readonly maxConcurrentCalls?: number;
  readonly autoComplete?: boolean;
  readonly maxAutoLockRenewalDuration?: Duration;
}

// Cosmos DB Trigger
interface CosmosTrigger extends BaseTrigger {
  readonly type: 'cosmosDb';
  readonly databaseName: string;
  readonly collectionName: string;
  readonly connection: string | ICosmosAccount;
  readonly leaseCollectionName?: string;
  readonly createLeaseCollectionIfNotExists?: boolean;
  readonly maxItemsPerInvocation?: number;
  readonly feedPollDelay?: Duration;
  readonly preferredLocations?: string[];
}

// Event Hub Trigger
interface EventHubTrigger extends BaseTrigger {
  readonly type: 'eventHub';
  readonly eventHubName: string;
  readonly connection: string | IEventHubNamespace;
  readonly consumerGroup?: string;   // Default: $Default
  readonly maxBatchSize?: number;
  readonly prefetchCount?: number;
  readonly batchCheckpointFrequency?: number;
}

// Blob Trigger
interface BlobTrigger extends BaseTrigger {
  readonly type: 'blob';
  readonly path: string;              // Container/blob pattern
  readonly connection: string | IStorageAccount;
  readonly pollInterval?: Duration;
  readonly maxDegreeOfParallelism?: number;
}

// Union type for all triggers
type FunctionTrigger =
  | HttpTrigger
  | TimerTrigger
  | QueueTrigger
  | ServiceBusTrigger
  | CosmosTrigger
  | EventHubTrigger
  | BlobTrigger;
```

### Bindings

```typescript
// Input/Output Bindings
interface FunctionBinding {
  readonly type: BindingType;
  readonly direction: 'in' | 'out';
  readonly name: string;
}

// Blob Binding
interface BlobBinding extends FunctionBinding {
  readonly type: 'blob';
  readonly path: string;
  readonly connection: string | IStorageAccount;
  readonly dataType?: 'binary' | 'string' | 'stream';
}

// Queue Binding
interface QueueBinding extends FunctionBinding {
  readonly type: 'queue';
  readonly queueName: string;
  readonly connection: string | IStorageAccount;
}

// Table Binding
interface TableBinding extends FunctionBinding {
  readonly type: 'table';
  readonly tableName: string;
  readonly partitionKey?: string;
  readonly rowKey?: string;
  readonly connection: string | IStorageAccount;
  readonly take?: number;
  readonly filter?: string;
}

// Cosmos DB Binding
interface CosmosBinding extends FunctionBinding {
  readonly type: 'cosmosDb';
  readonly databaseName: string;
  readonly collectionName: string;
  readonly connection: string | ICosmosAccount;
  readonly partitionKey?: string;
  readonly id?: string;              // For single document operations
  readonly sqlQuery?: string;        // For queries
  readonly preferredLocations?: string[];
}

// SignalR Binding
interface SignalRBinding extends FunctionBinding {
  readonly type: 'signalR';
  readonly hubName: string;
  readonly connection: string | ISignalRService;
  readonly userId?: string;
  readonly methods?: string[];       // For output: methods to invoke
}
```

### Build Configuration

```typescript
interface BuildOptions {
  // Bundling
  readonly bundle?: boolean;         // Default: true
  readonly external?: string[];      // Packages to exclude from bundle
  readonly packages?: 'bundle' | 'external' | 'auto'; // Default: 'auto'

  // Optimization
  readonly minify?: boolean;         // Default: true in prod
  readonly treeShaking?: boolean;    // Default: true
  readonly sourcemap?: boolean | 'inline' | 'external'; // Default: 'external'
  readonly target?: string;          // ES target, default: 'node18'

  // TypeScript
  readonly tsconfig?: string;        // Path to tsconfig
  readonly typeCheck?: boolean;      // Run tsc for type checking

  // Assets
  readonly loader?: Record<string, string>; // File loaders
  readonly assetNames?: string;      // Asset naming pattern
  readonly publicPath?: string;      // Public URL path

  // Environment
  readonly define?: Record<string, string>; // Build-time constants
  readonly inject?: string[];        // Auto-import modules

  // Caching
  readonly cache?: boolean;          // Enable build cache
  readonly cacheLocation?: string;   // Cache directory
}
```

### Handler Types

```typescript
// Context object provided to all functions
interface Context {
  readonly invocationId: string;
  readonly executionContext: ExecutionContext;
  readonly bindings: Record<string, any>;
  readonly bindingData: Record<string, any>;
  readonly traceContext: TraceContext;
  log: Logger;
  done: (err?: Error, result?: any) => void;
}

interface ExecutionContext {
  readonly invocationId: string;
  readonly functionName: string;
  readonly functionDirectory: string;
  readonly retryContext?: RetryContext;
}

interface RetryContext {
  readonly retryCount: number;
  readonly maxRetryCount: number;
  readonly exception?: Error;
}

interface TraceContext {
  readonly traceparent?: string;
  readonly tracestate?: string;
  readonly attributes?: Record<string, any>;
}

interface Logger {
  (...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  info(...args: any[]): void;
  verbose(...args: any[]): void;
  metric(name: string, value: number, properties?: Record<string, any>): void;
}

// HTTP Request/Response
interface HttpRequest {
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly query: Record<string, string>;
  readonly params: Record<string, string>;
  readonly body: any;
  readonly rawBody: string;
  readonly user?: Principal;
}

interface HttpResponse {
  status?: number;
  body?: any;
  headers?: Record<string, string>;
  cookies?: Cookie[];
  isRaw?: boolean;
}

// Handler function types
type HttpHandler = (context: Context, req: HttpRequest) => Promise<HttpResponse> | HttpResponse;
type TimerHandler = (context: Context, timer: TimerInfo) => Promise<void> | void;
type QueueHandler<T = any> = (context: Context, message: T) => Promise<void> | void;
type EventHandler<T = any> = (context: Context, event: T) => Promise<void> | void;

// Timer info
interface TimerInfo {
  readonly schedule: ScheduleStatus;
  readonly scheduleStatus: ScheduleStatus;
  readonly isPastDue: boolean;
}

interface ScheduleStatus {
  readonly last: string;
  readonly next: string;
  readonly lastUpdated: string;
}
```

### Runtime Configuration

```typescript
enum FunctionRuntime {
  NODE = 'node',
  PYTHON = 'python',
  DOTNET = 'dotnet',
  JAVA = 'java',
  POWERSHELL = 'powershell',
  CUSTOM = 'custom'
}

interface FunctionAppRuntime {
  readonly name: FunctionRuntime;
  readonly version: string;
  readonly isLinux?: boolean;
  readonly customHandler?: CustomHandlerConfig;
}

interface CustomHandlerConfig {
  readonly description?: string;
  readonly defaultExecutablePath?: string;
  readonly arguments?: string[];
  readonly workingDirectory?: string;
  readonly enableForwardingHttpRequest?: boolean;
}
```

### Observability

```typescript
interface TracingConfig {
  readonly enabled?: boolean;
  readonly samplingRate?: number;    // 0.0 to 1.0
  readonly provider?: 'applicationInsights' | 'openTelemetry' | 'custom';
  readonly customProvider?: string;  // Module to import
  readonly propagators?: string[];   // Trace propagation formats
}

interface LoggingConfig {
  readonly level?: LogLevel;
  readonly applicationInsights?: ApplicationInsightsConfig;
  readonly customSink?: string;      // Module for custom logging
  readonly structuredLogging?: boolean;
  readonly includeFunctionExecutionDetails?: boolean;
}

interface MetricsConfig {
  readonly enabled?: boolean;
  readonly customMetrics?: CustomMetric[];
  readonly performanceCounters?: boolean;
  readonly liveMetrics?: boolean;
}

interface CustomMetric {
  readonly name: string;
  readonly aggregation?: 'sum' | 'average' | 'min' | 'max';
  readonly dimensions?: string[];
}

enum LogLevel {
  TRACE = 'Trace',
  DEBUG = 'Debug',
  INFORMATION = 'Information',
  WARNING = 'Warning',
  ERROR = 'Error',
  CRITICAL = 'Critical',
  NONE = 'None'
}
```

### Security

```typescript
enum AuthLevel {
  ANONYMOUS = 'anonymous',
  FUNCTION = 'function',
  ADMIN = 'admin'
}

interface FunctionKey {
  readonly name: string;
  readonly value?: string;           // Auto-generated if not provided
  readonly type: 'function' | 'master';
}

interface CorsSettings {
  readonly allowedOrigins: string[];
  readonly allowCredentials?: boolean;
  readonly allowedHeaders?: string[];
  readonly exposedHeaders?: string[];
  readonly maxAge?: number;
}
```

### Resource References

```typescript
// Generic resource reference
interface IResourceReference {
  readonly resourceId: string;
  readonly resourceType: string;
  readonly resourceName: string;
}

// Helper to create ARM expressions
class ArmReference {
  static resourceId(type: string, name: string): string {
    return `[resourceId('${type}', '${name}')]`;
  }

  static reference(resourceId: string, apiVersion?: string): string {
    const version = apiVersion ? `, '${apiVersion}'` : '';
    return `[reference(${resourceId}${version})]`;
  }

  static listKeys(resourceId: string, apiVersion: string): string {
    return `[listKeys(${resourceId}, '${apiVersion}')]`;
  }

  static concat(...args: string[]): string {
    return `[concat(${args.join(', ')})]`;
  }
}
```

## Usage Examples

### Basic HTTP Function with handler.ts + resource.ts

**File: functions/api/resource.ts**
```typescript
import { defineFunction } from '@atakora/functions';

export interface ApiEnv {
  readonly DATABASE_URL: string;
  readonly API_KEY: string;
}

export default defineFunction<ApiEnv>({
  trigger: {
    type: 'http',
    route: 'api/users/{userId}',
    methods: ['GET', 'POST'],
    authLevel: AuthLevel.FUNCTION
  },
  environment: {
    DATABASE_URL: '${COSMOS_ENDPOINT}',
    API_KEY: '${API_SECRET_KEY}'
  },
  timeout: Duration.seconds(30),
  role: {
    managedIdentity: true
  }
});
```

**File: functions/api/handler.ts**
```typescript
import { HttpHandler, AzureFunctionContext, HttpRequest, HttpResponse } from '@atakora/functions';

export const handler: HttpHandler = async (
  context: AzureFunctionContext,
  req: HttpRequest
): Promise<HttpResponse> => {
  const { DATABASE_URL, API_KEY } = process.env;
  const userId = req.params.userId;

  context.log.info(`Processing request for user: ${userId}`);

  // Function logic here

  return {
    status: 200,
    body: { userId, message: 'Success' }
  };
};
```

**File: app.ts**
```typescript
const functionApp = new FunctionApp(resourceGroup, 'MyFunctions', {
  plan: consumptionPlan,
  storageAccount: storage,
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '18'
});

// Function automatically discovers resource.ts configuration
const apiFunction = new AzureFunction(functionApp, 'ApiEndpoint', {
  handler: './functions/api/handler.ts',
  resource: './functions/api/resource.ts',
  environment: {
    COSMOS_ENDPOINT: cosmosDb.endpoint,
    API_SECRET_KEY: keyVault.secret('api-key')
  }
});
```

### Timer Function with Cosmos Output

**File: functions/cleanup/resource.ts**
```typescript
import { defineFunction } from '@atakora/functions';

export default defineFunction({
  trigger: {
    type: 'timer',
    schedule: '0 0 2 * * *',  // 2 AM daily
    runOnStartup: false
  },
  outputBindings: [{
    type: 'cosmosDb',
    direction: 'out',
    name: 'deletedItems',
    databaseName: 'audit',
    collectionName: 'deletions',
    connection: '${COSMOS_CONNECTION}'
  }],
  timeout: Duration.minutes(10)
});
```

**File: functions/cleanup/handler.ts**
```typescript
import { TimerHandler, AzureFunctionContext, TimerInfo } from '@atakora/functions';

export const handler: TimerHandler = async (
  context: AzureFunctionContext,
  timer: TimerInfo
): Promise<void> => {
  context.log.info('Cleanup function triggered', {
    isPastDue: timer.isPastDue,
    nextRun: timer.scheduleStatus.next
  });

  const deletedItems = [];
  // Cleanup logic here

  // Output binding automatically handles Cosmos write
  context.bindings.deletedItems = deletedItems;
};
```

**File: app.ts**
```typescript
const cleanupFunction = new AzureFunction(functionApp, 'Cleanup', {
  handler: './functions/cleanup/handler.ts',
  resource: './functions/cleanup/resource.ts',
  environment: {
    COSMOS_CONNECTION: cosmosDb.connectionString
  }
});
```

### Queue Processing Function

**File: functions/orders/resource.ts**
```typescript
import { defineFunction } from '@atakora/functions';

export interface OrderEnv {
  readonly MAX_RETRIES: string;
  readonly NOTIFICATION_ENABLED: string;
}

export default defineFunction<OrderEnv>({
  trigger: {
    type: 'queue',
    queueName: 'orders',
    connection: '${STORAGE_CONNECTION}',
    batchSize: 10,
    maxDequeueCount: 3
  },
  inputBindings: [{
    type: 'table',
    direction: 'in',
    name: 'inventory',
    tableName: 'inventory',
    connection: '${STORAGE_CONNECTION}'
  }],
  outputBindings: [{
    type: 'serviceBus',
    direction: 'out',
    name: 'notifications',
    queueName: 'order-notifications',
    connection: '${SERVICE_BUS_CONNECTION}'
  }],
  environment: {
    MAX_RETRIES: '3',
    NOTIFICATION_ENABLED: '${NOTIFICATION_FLAG}'
  }
});
```

**File: functions/orders/handler.ts**
```typescript
import { QueueHandler, AzureFunctionContext } from '@atakora/functions';

interface OrderMessage {
  orderId: string;
  items: string[];
  customerId: string;
}

export const handler: QueueHandler<OrderMessage> = async (
  context: AzureFunctionContext,
  message: OrderMessage
): Promise<void> => {
  const inventory = context.bindings.inventory;

  context.log.info('Processing order', { orderId: message.orderId });

  // Process order logic
  const notification = {
    orderId: message.orderId,
    status: 'processed'
  };

  // Output to Service Bus
  if (process.env.NOTIFICATION_ENABLED === 'true') {
    context.bindings.notifications = notification;
  }
};
```

**File: app.ts**
```typescript
const orderProcessor = new AzureFunction(functionApp, 'OrderProcessor', {
  handler: './functions/orders/handler.ts',
  resource: './functions/orders/resource.ts',
  environment: {
    STORAGE_CONNECTION: storage.connectionString,
    SERVICE_BUS_CONNECTION: serviceBus.connectionString,
    NOTIFICATION_FLAG: 'true'
  }
});
```

## Extension Points

The API is designed with several extension points for future enhancements:

1. **Custom Triggers**: Extend `BaseTrigger` for new trigger types
2. **Custom Bindings**: Implement `FunctionBinding` for new binding types
3. **Build Plugins**: Hook into `BuildOptions` for custom build steps
4. **Runtime Extensions**: Add new `FunctionRuntime` values
5. **Observability Providers**: Custom tracing and logging providers

## Type Safety Guarantees

1. **Trigger-Handler Matching**: Handler type must match trigger type
2. **Resource References**: Type-safe references prevent invalid ARM expressions
3. **Environment Variables**: Distinguish between strings and resource references
4. **Binding Validation**: Input/output bindings validated at compile time
5. **Configuration Validation**: Build options validated against target runtime

## Migration Path

For users migrating from Azure Functions Core Tools:

```typescript
// Before (function.json)
{
  "bindings": [{
    "type": "httpTrigger",
    "direction": "in",
    "name": "req"
  }]
}

// After (Atakora)
new AzureFunction(app, 'HttpFunc', {
  handler: './handler.ts',
  trigger: {
    type: 'http',
    authLevel: AuthLevel.ANONYMOUS
  }
});
```

## Government Cloud Considerations

All interfaces support Government cloud endpoints through environment-aware defaults:

```typescript
interface GovCloudConfig {
  readonly usGovernment?: boolean;
  readonly endpoints?: {
    readonly managementEndpoint?: string;
    readonly resourceManagerEndpoint?: string;
    readonly activeDirectoryEndpoint?: string;
    readonly storageEndpointSuffix?: string;
  };
}
```

## Next Steps

1. Implement L1 constructs mapping directly to ARM resources
2. Build L2 constructs with developer-friendly APIs
3. Create build pipeline integration
4. Add comprehensive type guards and validators
5. Write extensive unit and integration tests