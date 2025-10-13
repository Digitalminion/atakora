/**
 * GraphQL API Management Enums
 *
 * Enums for GraphQL API configuration and resolver setup.
 *
 * @module @atakora/lib/schema/apimanagement/graphql
 */

import { z } from 'zod';

/**
 * GraphQL resolver type enum (TypeScript version).
 */
export enum GraphQLResolverType {
  HTTP = 'http',
  AZURE_FUNCTION = 'azureFunction',
  COSMOS_DB = 'cosmosDb',
  SQL = 'sql',
  CUSTOM = 'custom',
}

// ============================================================================
// GraphQL Schema Enums (Zod)
// ============================================================================

/**
 * GraphQL API type enum
 */
export const GraphQLApiTypeEnum = z.enum([
  'graphql',
  'graphql-passthrough',
  'graphql-synthetic'
]);

export type GraphQLApiType = z.infer<typeof GraphQLApiTypeEnum>;

/**
 * GraphQL backend type enum
 */
export const GraphQLBackendTypeEnum = z.enum([
  'synthetic',
  'passthrough',
  'azureFunction',
  'appService',
  'custom'
]);

export type GraphQLBackendType = z.infer<typeof GraphQLBackendTypeEnum>;

/**
 * Subscription transport enum
 */
export const SubscriptionTransportEnum = z.enum([
  'websocket',
  'sse',
  'signalr',
  'eventgrid',
  'servicebus'
]);

export type SubscriptionTransport = z.infer<typeof SubscriptionTransportEnum>;

/**
 * GraphQL type kind enum
 */
export const GraphQLTypeKindEnum = z.enum([
  'SCALAR',
  'OBJECT',
  'INTERFACE',
  'UNION',
  'ENUM',
  'INPUT_OBJECT',
  'LIST',
  'NON_NULL'
]);

export type GraphQLTypeKind = z.infer<typeof GraphQLTypeKindEnum>;

/**
 * GraphQL scalar type enum
 */
export const GraphQLScalarTypeEnum = z.enum([
  'ID',
  'String',
  'Int',
  'Float',
  'Boolean',
  'DateTime',
  'Date',
  'Time',
  'JSON',
  'JSONObject',
  'UUID',
  'Email',
  'URL',
  'PhoneNumber',
  'PostalCode',
  'BigInt',
  'Long',
  'Byte'
]);

export type GraphQLScalarType = z.infer<typeof GraphQLScalarTypeEnum>;

/**
 * GraphQL operation type enum
 */
export const GraphQLOperationTypeEnum = z.enum([
  'query',
  'mutation',
  'subscription'
]);

export type GraphQLOperationType = z.infer<typeof GraphQLOperationTypeEnum>;

/**
 * Directive location enum
 */
export const DirectiveLocationEnum = z.enum([
  // Executable directive locations
  'QUERY',
  'MUTATION',
  'SUBSCRIPTION',
  'FIELD',
  'FRAGMENT_DEFINITION',
  'FRAGMENT_SPREAD',
  'INLINE_FRAGMENT',
  'VARIABLE_DEFINITION',
  // Type system directive locations
  'SCHEMA',
  'SCALAR',
  'OBJECT',
  'FIELD_DEFINITION',
  'ARGUMENT_DEFINITION',
  'INTERFACE',
  'UNION',
  'ENUM',
  'ENUM_VALUE',
  'INPUT_OBJECT',
  'INPUT_FIELD_DEFINITION'
]);

export type DirectiveLocation = z.infer<typeof DirectiveLocationEnum>;

/**
 * Authorization strategy enum
 */
export const AuthorizationStrategyEnum = z.enum([
  'any',
  'all',
  'custom'
]);

export type AuthorizationStrategy = z.infer<typeof AuthorizationStrategyEnum>;

/**
 * Authorization type enum
 */
export const AuthorizationTypeEnum = z.enum([
  'role',
  'claim',
  'attribute',
  'policy',
  'custom'
]);

export type AuthorizationType = z.infer<typeof AuthorizationTypeEnum>;

/**
 * Cache scope enum
 */
export const CacheScopeEnum = z.enum([
  'private',
  'public'
]);

export type CacheScope = z.infer<typeof CacheScopeEnum>;

/**
 * Authentication provider type enum
 */
export const AuthenticationProviderTypeEnum = z.enum([
  'azuread',
  'oauth2',
  'jwt',
  'apikey',
  'custom'
]);

export type AuthenticationProviderType = z.infer<typeof AuthenticationProviderTypeEnum>;

/**
 * Log level enum
 */
export const LogLevelEnum = z.enum([
  'debug',
  'info',
  'warn',
  'error'
]);

export type LogLevel = z.infer<typeof LogLevelEnum>;

/**
 * Log destination enum
 */
export const LogDestinationEnum = z.enum([
  'console',
  'applicationInsights',
  'logAnalytics',
  'eventHub',
  'storageAccount'
]);

export type LogDestination = z.infer<typeof LogDestinationEnum>;

/**
 * Tracing sampler type enum
 */
export const TracingSamplerTypeEnum = z.enum([
  'always',
  'never',
  'probability',
  'rateLimiting'
]);

export type TracingSamplerType = z.infer<typeof TracingSamplerTypeEnum>;

/**
 * Tracing exporter type enum
 */
export const TracingExporterTypeEnum = z.enum([
  'applicationInsights',
  'zipkin',
  'jaeger',
  'otlp'
]);

export type TracingExporterType = z.infer<typeof TracingExporterTypeEnum>;

/**
 * Metrics destination enum
 */
export const MetricsDestinationEnum = z.enum([
  'applicationInsights',
  'prometheus',
  'statsd',
  'cloudWatch'
]);

export type MetricsDestination = z.infer<typeof MetricsDestinationEnum>;

/**
 * Custom metric type enum
 */
export const CustomMetricTypeEnum = z.enum([
  'counter',
  'gauge',
  'histogram'
]);

export type CustomMetricType = z.infer<typeof CustomMetricTypeEnum>;

/**
 * Rate limiting strategy enum
 */
export const RateLimitingStrategyEnum = z.enum([
  'fixedWindow',
  'slidingWindow',
  'tokenBucket'
]);

export type RateLimitingStrategy = z.infer<typeof RateLimitingStrategyEnum>;

/**
 * Rate limiting key generator enum
 */
export const RateLimitingKeyGeneratorEnum = z.enum([
  'ip',
  'user',
  'apiKey',
  'custom'
]);

export type RateLimitingKeyGenerator = z.infer<typeof RateLimitingKeyGeneratorEnum>;

/**
 * Playground theme enum
 */
export const PlaygroundThemeEnum = z.enum([
  'dark',
  'light'
]);

export type PlaygroundTheme = z.infer<typeof PlaygroundThemeEnum>;

/**
 * Playground cursor shape enum
 */
export const PlaygroundCursorShapeEnum = z.enum([
  'line',
  'block',
  'underline'
]);

export type PlaygroundCursorShape = z.infer<typeof PlaygroundCursorShapeEnum>;

/**
 * Request credentials enum
 */
export const RequestCredentialsEnum = z.enum([
  'omit',
  'include',
  'same-origin'
]);

export type RequestCredentials = z.infer<typeof RequestCredentialsEnum>;

/**
 * Validation severity enum
 */
export const ValidationSeverityEnum = z.enum([
  'error',
  'warning'
]);

export type ValidationSeverity = z.infer<typeof ValidationSeverityEnum>;

/**
 * Backend credential type enum
 */
export const BackendCredentialTypeEnum = z.enum([
  'none',
  'apiKey',
  'oauth2',
  'managedIdentity'
]);

export type BackendCredentialType = z.infer<typeof BackendCredentialTypeEnum>;

/**
 * Azure environment enum
 */
export const AzureEnvironmentEnum = z.enum([
  'AzureCloud',
  'AzureUSGovernment',
  'AzureChinaCloud',
  'AzureGermanCloud'
]);

export type AzureEnvironment = z.infer<typeof AzureEnvironmentEnum>;

/**
 * Cosmos DB consistency level enum
 */
export const ConsistencyLevelEnum = z.enum([
  'Strong',
  'BoundedStaleness',
  'Session',
  'ConsistentPrefix',
  'Eventual'
]);

export type ConsistencyLevel = z.infer<typeof ConsistencyLevelEnum>;

/**
 * Service Bus receive mode enum
 */
export const ServiceBusReceiveModeEnum = z.enum([
  'peekLock',
  'receiveAndDelete'
]);

export type ServiceBusReceiveMode = z.infer<typeof ServiceBusReceiveModeEnum>;

/**
 * Service Bus sub-queue type enum
 */
export const ServiceBusSubQueueTypeEnum = z.enum([
  'deadLetter',
  'transferDeadLetter'
]);

export type ServiceBusSubQueueType = z.infer<typeof ServiceBusSubQueueTypeEnum>;
