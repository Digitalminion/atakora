/**
 * Function Customization API
 *
 * @remarks
 * Provides API for customizing function handlers beyond the defaults.
 * Functions are defined in schema using f.model(), this API allows
 * implementing custom business logic, performance tuning, and monitoring.
 *
 * ## Default Behavior (without customization)
 *
 * Functions defined with f.model() automatically get:
 * - POST /api/functions/{function-name} endpoint
 * - Azure Function with HTTP trigger
 * - Input/output schema validation
 * - Basic handler that echoes input
 * - 256MB memory, 30s timeout
 * - Standard Application Insights monitoring
 *
 * ## Customization API
 *
 * Use configureFunction() to override defaults:
 * - Custom handlers (business logic)
 * - Performance tuning (memory, timeout)
 * - Additional bindings (storage, queues, etc.)
 * - Environment variables
 * - Monitoring and alerts
 *
 * @example
 * ```typescript
 * import { defineFunctions, configureFunction } from '@atakora/component/functions';
 * import { minutes, greaterThan } from '@atakora/component/common';
 *
 * export const func = defineFunctions({
 *   GenerateReport: configureFunction('GenerateReport')
 *     .memory(1024)
 *     .timeout(minutes(10))
 *     .withHandler(async (context, input) => {
 *       const dataset = await context.database.datasets.get(input.datasetId);
 *       const reportUrl = await generateReport(dataset);
 *       return { reportUrl, status: 'completed' };
 *     })
 *     .monitoring(alerts =>
 *       alerts.onExecutionTime(greaterThan(minutes(8))).warn()
 *     ),
 * });
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Public API
// ============================================================================

export { defineFunctions, type FunctionConfigs } from './define-functions';
export {
  configureFunction,
  FunctionConfigurationBuilder,
  AlertBuilder,
} from './configure-function';
export { MonitoringBuilder, AlertRuleBuilder } from './monitoring';
export {
  createFunctionContext,
  createAnonymousUserContext,
  createUserContextFromToken,
  createExecutionContext,
} from './context';
export {
  createBlobOperations,
  initializeStorageClient,
  StorageError,
  type StorageConfig,
} from './storage-client';
export {
  createModelOperations,
  CosmosConnectionPool,
  DatabaseError,
  NotFoundError,
  ConfigurationError,
  type ModelOperationsOptions,
} from './database-client';

// ============================================================================
// Handler Utilities
// ============================================================================

export {
  ValidationError as HandlerValidationError,
  validateField as validateHandlerField,
  validateObject,
  validationRules,
  successResponse,
  errorResponse,
  withErrorHandler,
  getCorsHeaders,
  hasRole,
  requireAuth,
  requireRole,
  withRetry,
  paginate,
  type ApiResponse,
  type CorsOptions,
  type RetryOptions,
  type PaginationOptions,
  type PaginatedResponse,
} from './handler-utilities';

// ============================================================================
// Service Registry
// ============================================================================

export {
  singleton,
  createServiceRegistry,
  hasService,
  getAvailableServices,
} from './service-registry';
export type {
  ServiceFactory,
  ServiceFactoryContext,
  ServiceDefinition,
  ServiceLifecycle,
  ServiceMetadata,
  ServiceConfig,
  RegisteredServices,
} from './service-registry-types';
export {
  ServiceNotFoundError,
  ServiceInstantiationError,
  CircularDependencyError,
} from './service-registry-types';

// ============================================================================
// Common Services
// ============================================================================

export * from './services';

// ============================================================================
// Middleware
// ============================================================================

export {
  createAuthMiddleware,
  requireAuthentication,
  requireRoles,
  optionalAuthentication,
  extractToken,
  AuthenticationError,
  AuthorizationError,
} from './middleware';

export type {
  TokenExtractionConfig,
  AuthorizationConfig,
  AuthMiddlewareConfig,
  AuthenticatedContext,
  AuthenticatedHandler,
  AuthErrorResponse,
} from './middleware';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  FunctionConfig,
  FunctionHandler,
  FunctionContext,
  DatabaseClient,
  ModelOperations,
  StorageClient,
  ServiceRegistry,
  BlobOperations,
  FileOperations,
  UploadOptions,
  BindingConfig,
  StorageBinding,
  QueueBinding,
  EventBinding,
  ServiceBusBinding,
  EnvironmentConfig,
  MonitoringConfig,
  AlertRule,
  AlertAction,
  ExecutionContext,
  Logger,
} from './types';
