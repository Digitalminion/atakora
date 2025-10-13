/**
 * API Management Schema Module
 *
 * Central export file for API Management validation schemas.
 *
 * @module @atakora/lib/schema/apimanagement
 */

// Export core enums (TypeScript)
export {
  ApiManagementSkuName,
  VirtualNetworkType,
  HostnameType,
  ApiProtocol,
  ApiType,
  ProductState,
  SubscriptionState,
  PolicyFormat,
} from './core';

// Export GraphQL enums (TypeScript)
export {
  GraphQLResolverType,
} from './graphql';

// Export Logger enums (TypeScript)
export {
  LoggerType,
} from './logger';

// Export GraphQL enums (Zod)
export {
  GraphQLApiTypeEnum,
  GraphQLApiType,
  GraphQLBackendTypeEnum,
  GraphQLBackendType,
  SubscriptionTransportEnum,
  SubscriptionTransport,
  GraphQLTypeKindEnum,
  GraphQLTypeKind,
  GraphQLScalarTypeEnum,
  GraphQLScalarType as GraphQLScalarTypeEnum_Value, // Rename to avoid conflict
  GraphQLOperationTypeEnum,
  GraphQLOperationType,
  DirectiveLocationEnum,
  DirectiveLocation,
  AuthorizationStrategyEnum,
  AuthorizationStrategy,
  AuthorizationTypeEnum,
  AuthorizationType,
  CacheScopeEnum,
  CacheScope,
  AuthenticationProviderTypeEnum,
  AuthenticationProviderType,
  LogLevelEnum,
  LogLevel,
  LogDestinationEnum,
  LogDestination,
  TracingSamplerTypeEnum,
  TracingSamplerType,
  TracingExporterTypeEnum,
  TracingExporterType,
  MetricsDestinationEnum,
  MetricsDestination,
  CustomMetricTypeEnum,
  CustomMetricType,
  RateLimitingStrategyEnum,
  RateLimitingStrategy,
  RateLimitingKeyGeneratorEnum,
  RateLimitingKeyGenerator,
  PlaygroundThemeEnum,
  PlaygroundTheme,
  PlaygroundCursorShapeEnum,
  PlaygroundCursorShape,
  RequestCredentialsEnum,
  RequestCredentials,
  ValidationSeverityEnum,
  ValidationSeverity,
  BackendCredentialTypeEnum,
  BackendCredentialType,
  AzureEnvironmentEnum,
  AzureEnvironment,
  ConsistencyLevelEnum,
  ConsistencyLevel,
  ServiceBusReceiveModeEnum,
  ServiceBusReceiveMode,
  ServiceBusSubQueueTypeEnum,
  ServiceBusSubQueueType,
} from './graphql';

// Export Logger enums (Zod)
export {
  LoggerTypeEnum,
  LoggerTypeZod,
} from './logger';

// Export all Core schemas and types
export * from './core';

// Export all GraphQL schemas and types
export * from './graphql';

// Export all Logger schemas and types
export * from './logger';
