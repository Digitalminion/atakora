/**
 * Azure Functions support for Atakora CDK.
 *
 * @packageDocumentation
 *
 * @remarks
 * This package provides constructs and utilities for building Azure Functions
 * applications with a type-safe, infrastructure-as-code approach.
 *
 * **Key Features**:
 * - Type-safe function configuration with `defineFunction()`
 * - L2 constructs for Function Apps and individual Functions
 * - Support for multiple trigger types (HTTP, Timer, Queue, etc.)
 * - Input/output bindings for Azure services
 * - Environment variable management with placeholder resolution
 * - Build integration for TypeScript/JavaScript code
 * - Cross-resource references
 *
 * **Usage Pattern**:
 * 1. Define function configuration in `resource.ts` using `defineFunction()`
 * 2. Implement function logic in `handler.ts`
 * 3. Create infrastructure in `app.ts` using `FunctionApp` and `AzureFunction`
 *
 * @example
 * Define function configuration (resource.ts):
 * ```typescript
 * import { defineFunction, AuthLevel } from '@atakora/cdk/functions';
 *
 * export default defineFunction({
 *   trigger: {
 *     type: 'http',
 *     route: 'api/users/{id}',
 *     methods: ['GET', 'POST'],
 *     authLevel: AuthLevel.FUNCTION
 *   },
 *   environment: {
 *     TABLE_NAME: '${COSMOS_TABLE_NAME}'
 *   },
 *   timeout: { seconds: 30 }
 * });
 * ```
 *
 * @example
 * Implement function handler (handler.ts):
 * ```typescript
 * import { HttpHandler, AzureFunctionContext, HttpRequest } from '@atakora/cdk/functions';
 *
 * export const handler: HttpHandler = async (context, req) => {
 *   const tableName = process.env.TABLE_NAME;
 *   const userId = req.params.id;
 *
 *   context.log.info(`Processing request for user: ${userId}`);
 *
 *   return {
 *     status: 200,
 *     body: { userId, tableName }
 *   };
 * };
 * ```
 *
 * @example
 * Create infrastructure (app.ts):
 * ```typescript
 * import { FunctionApp, AzureFunction } from '@atakora/cdk/functions';
 *
 * const functionApp = new FunctionApp(resourceGroup, 'Api', {
 *   plan: appServicePlan,
 *   storageAccount: storage
 * });
 *
 * const apiFunction = new AzureFunction(functionApp, 'UserApi', {
 *   handler: './functions/api/handler.ts',
 *   resource: './functions/api/resource.ts',
 *   environment: {
 *     COSMOS_TABLE_NAME: cosmosDb.tableName
 *   }
 * });
 * ```
 */

// ============================================================================
// Core Types and Enums
// ============================================================================

export {
  FunctionRuntime,
  HttpMethod,
  AuthLevel,
  PackagingStrategy,
  LogLevel,
  DurationFactory,
} from './types';

export type {
  Duration,
  BindingDirection,
  WebhookType,
} from './types';

// ============================================================================
// Trigger Types
// ============================================================================

export type {
  BaseTriggerConfig,
  HttpTriggerConfig,
  TimerTriggerConfig,
  QueueTriggerConfig,
  ServiceBusTriggerConfig,
  CosmosTriggerConfig,
  EventHubTriggerConfig,
  BlobTriggerConfig,
  TriggerConfig,
} from './types';

// ============================================================================
// Binding Types
// ============================================================================

export type {
  BaseBindingConfig,
  BlobBindingConfig,
  QueueBindingConfig,
  TableBindingConfig,
  CosmosBindingConfig,
  SignalRBindingConfig,
  BindingConfig,
} from './types';

// ============================================================================
// Configuration Types
// ============================================================================

export type {
  RoleAssignment,
  RoleConfig,
  BuildOptions,
  TracingConfig,
  LoggingConfig,
  FunctionConfig,
  FunctionDefinition,
} from './types';

// ============================================================================
// Handler Context Types
// ============================================================================

export type {
  RetryContext,
  TraceContext,
  ExecutionContext,
  Logger,
  BindingData,
  AzureFunctionContext,
} from './types';

// ============================================================================
// HTTP Types
// ============================================================================

export type {
  Principal,
  HttpRequest,
  Cookie,
  HttpResponse,
} from './types';

// ============================================================================
// Timer Types
// ============================================================================

export type {
  ScheduleStatus,
  TimerInfo,
} from './types';

// ============================================================================
// Message Types
// ============================================================================

export type {
  MessageMetadata,
} from './types';

// ============================================================================
// Handler Function Types (Basic - from types.ts)
// ============================================================================

export type {
  HttpHandler,
  TimerHandler,
  QueueHandler,
  ServiceBusHandler,
  EventHandler,
  FunctionHandler,
} from './types';

// ============================================================================
// Comprehensive Handler Types (All 18 trigger types)
// ============================================================================

export type {
  // Base handler type
  AzureFunctionHandler,

  // Core triggers (Priority 1)
  BlobHandler,
  ServiceBusQueueHandler,
  ServiceBusTopicHandler,
  EventHubHandler,
  CosmosDBHandler,
  EventGridHandler,

  // IoT & Real-time (Priority 2)
  IoTHubHandler,
  SignalRNegotiateHandler,

  // Third-party (Priority 3)
  KafkaHandler,
  RabbitMQHandler,
  RedisStreamHandler,

  // Durable Functions (Priority 4)
  DurableOrchestratorHandler,
  DurableActivityHandler,
  DurableEntityHandler,

  // Union type
  AnyFunctionHandler,
} from './handlers';

// ============================================================================
// Handler Input/Output Types
// ============================================================================

export type {
  // Queue
  QueueMessage,

  // Blob
  BlobItem,
  BlobProperties,

  // Service Bus
  ServiceBusMessage,

  // Event Hub
  EventHubEvent,

  // Cosmos DB
  CosmosDocument,

  // Event Grid
  EventGridEvent,

  // IoT Hub
  IoTHubMessage,
  IoTHubSystemProperties,

  // SignalR
  SignalRConnectionInfo,

  // Kafka
  KafkaEvent,

  // RabbitMQ
  RabbitMQMessage,
  RabbitMQProperties,

  // Redis
  RedisStreamEntry,

  // Durable Functions
  DurableOrchestrationContext,
  DurableEntityContext,
} from './handlers';

// ============================================================================
// defineFunction Helper
// ============================================================================

export { defineFunction } from './define-function';

// ============================================================================
// Function App Types
// ============================================================================

export {
  ManagedServiceIdentityType,
} from './function-app-types';

export type {
  ManagedServiceIdentity,
  CorsSettings,
  VNetConfiguration,
  FunctionAppSiteConfig,
  FunctionAppRuntime,
  ArmFunctionAppProps,
  FunctionAppProps,
  IFunctionApp,
} from './function-app-types';

// ============================================================================
// Function App Construct
// ============================================================================

export { FunctionApp } from './function-app';

// ============================================================================
// Azure Function Types
// ============================================================================

export type {
  AzureFunctionProps,
  IAzureFunction,
  IResourceReference,
} from './azure-function-types';

// ============================================================================
// Azure Function Construct
// ============================================================================

export { AzureFunction } from './azure-function';
