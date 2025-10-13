/**
 * GraphQL Operation and Field Types
 *
 * Defines type-safe GraphQL operation interfaces for queries, mutations, and subscriptions.
 * Provides configuration for fields, arguments, and resolvers.
 *
 * @see ADR-011 GraphQL Resolver Architecture
 */

import type { ResolverFunction, SubscriptionResolver, FieldAuthorization, FieldCachingStrategy, ComplexityCalculator } from './resolver-types';

/**
 * GraphQL operation types
 */
export type OperationType = 'query' | 'mutation' | 'subscription';

/**
 * Core GraphQL field definition
 *
 * @template TSource - Type of parent object
 * @template TContext - Type of resolver context
 * @template TArgs - Type of field arguments
 * @template TReturn - Type of field return value
 */
export interface IGraphQLField<TSource = any, TContext = any, TArgs = any, TReturn = any> {
  readonly name: string;
  readonly type: GraphQLFieldType;
  readonly description?: string;
  readonly deprecated?: boolean | string;

  // Arguments
  readonly args?: GraphQLArguments<TArgs>;

  // Resolver
  readonly resolve?: ResolverFunction<TSource, TContext, TArgs, TReturn>;
  readonly subscribe?: SubscriptionResolver<TSource, TContext, TArgs, TReturn>;

  // Advanced features
  readonly authorization?: FieldAuthorization;
  readonly caching?: FieldCachingStrategy;
  readonly complexity?: ComplexityCalculator;
  readonly directives?: readonly GraphQLDirectiveUsage[];
}

/**
 * GraphQL field type definition
 */
export interface GraphQLFieldType {
  readonly kind: GraphQLTypeKind;
  readonly name?: string;
  readonly ofType?: GraphQLFieldType;
  readonly nullable?: boolean;
}

/**
 * GraphQL type kinds
 */
export type GraphQLTypeKind =
  | 'SCALAR'
  | 'OBJECT'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'INPUT_OBJECT'
  | 'LIST'
  | 'NON_NULL';

/**
 * GraphQL scalar types
 */
export type GraphQLScalarType =
  | 'ID'
  | 'String'
  | 'Int'
  | 'Float'
  | 'Boolean'
  | 'DateTime'
  | 'Date'
  | 'Time'
  | 'JSON'
  | 'JSONObject'
  | 'UUID'
  | 'Email'
  | 'URL'
  | 'PhoneNumber'
  | 'PostalCode'
  | 'BigInt'
  | 'Long'
  | 'Byte';

/**
 * GraphQL arguments definition
 *
 * @template TArgs - Type of arguments object
 */
export type GraphQLArguments<TArgs = any> = {
  readonly [K in keyof TArgs]: GraphQLArgument<TArgs[K]>;
};

/**
 * GraphQL argument definition
 *
 * @template T - Type of the argument value
 */
export interface GraphQLArgument<T = any> {
  readonly type: GraphQLFieldType;
  readonly description?: string;
  readonly defaultValue?: T;
  readonly deprecated?: boolean | string;
  readonly directives?: readonly GraphQLDirectiveUsage[];
}

/**
 * GraphQL directive usage
 */
export interface GraphQLDirectiveUsage {
  readonly name: string;
  readonly args?: Record<string, any>;
}

/**
 * GraphQL object type definition
 */
export interface IGraphQLObjectType<TSource = any, TContext = any> {
  readonly name: string;
  readonly description?: string;
  readonly fields: GraphQLFieldMap<TSource, TContext>;
  readonly interfaces?: readonly string[];
  readonly directives?: readonly GraphQLDirectiveUsage[];
}

/**
 * GraphQL field map
 */
export type GraphQLFieldMap<TSource = any, TContext = any> = {
  readonly [fieldName: string]: IGraphQLField<TSource, TContext, any, any>;
};

/**
 * GraphQL input object type definition
 */
export interface IGraphQLInputObjectType {
  readonly name: string;
  readonly description?: string;
  readonly fields: GraphQLInputFieldMap;
  readonly directives?: readonly GraphQLDirectiveUsage[];
}

/**
 * GraphQL input field map
 */
export type GraphQLInputFieldMap = {
  readonly [fieldName: string]: GraphQLInputField;
};

/**
 * GraphQL input field definition
 */
export interface GraphQLInputField {
  readonly type: GraphQLFieldType;
  readonly description?: string;
  readonly defaultValue?: any;
  readonly directives?: readonly GraphQLDirectiveUsage[];
}

/**
 * GraphQL enum type definition
 */
export interface IGraphQLEnumType {
  readonly name: string;
  readonly description?: string;
  readonly values: GraphQLEnumValueMap;
  readonly directives?: readonly GraphQLDirectiveUsage[];
}

/**
 * GraphQL enum value map
 */
export type GraphQLEnumValueMap = {
  readonly [valueName: string]: GraphQLEnumValue;
};

/**
 * GraphQL enum value definition
 */
export interface GraphQLEnumValue {
  readonly value?: any;
  readonly description?: string;
  readonly deprecated?: boolean | string;
  readonly directives?: readonly GraphQLDirectiveUsage[];
}

/**
 * GraphQL interface type definition
 */
export interface IGraphQLInterfaceType<TSource = any, TContext = any> {
  readonly name: string;
  readonly description?: string;
  readonly fields: GraphQLFieldMap<TSource, TContext>;
  readonly interfaces?: readonly string[];
  readonly directives?: readonly GraphQLDirectiveUsage[];
  readonly resolveType?: ResolveTypeFn<TSource, TContext>;
}

/**
 * GraphQL union type definition
 */
export interface IGraphQLUnionType<TSource = any, TContext = any> {
  readonly name: string;
  readonly description?: string;
  readonly types: readonly string[];
  readonly directives?: readonly GraphQLDirectiveUsage[];
  readonly resolveType?: ResolveTypeFn<TSource, TContext>;
}

/**
 * Resolve type function for interfaces and unions
 */
export type ResolveTypeFn<TSource = any, TContext = any> = (
  value: TSource,
  context: TContext,
  info: any
) => string | Promise<string>;

/**
 * GraphQL schema definition
 */
export interface IGraphQLSchema {
  readonly query?: IGraphQLObjectType;
  readonly mutation?: IGraphQLObjectType;
  readonly subscription?: IGraphQLObjectType;
  readonly types?: readonly GraphQLTypeDefinition[];
  readonly directives?: readonly IGraphQLDirective[];
  readonly description?: string;
}

/**
 * GraphQL type definition (discriminated union)
 */
export type GraphQLTypeDefinition =
  | IGraphQLObjectType
  | IGraphQLInputObjectType
  | IGraphQLEnumType
  | IGraphQLInterfaceType
  | IGraphQLUnionType
  | IGraphQLScalarType;

/**
 * GraphQL scalar type definition
 */
export interface IGraphQLScalarType {
  readonly kind: 'SCALAR';
  readonly name: string;
  readonly description?: string;
  readonly serialize?: (value: any) => any;
  readonly parseValue?: (value: any) => any;
  readonly parseLiteral?: (ast: any) => any;
  readonly directives?: readonly GraphQLDirectiveUsage[];
}

/**
 * GraphQL directive definition
 */
export interface IGraphQLDirective {
  readonly name: string;
  readonly description?: string;
  readonly locations: readonly DirectiveLocation[];
  readonly args?: GraphQLInputFieldMap;
  readonly isRepeatable?: boolean;
}

/**
 * GraphQL directive locations
 */
export type DirectiveLocation =
  // Executable directive locations
  | 'QUERY'
  | 'MUTATION'
  | 'SUBSCRIPTION'
  | 'FIELD'
  | 'FRAGMENT_DEFINITION'
  | 'FRAGMENT_SPREAD'
  | 'INLINE_FRAGMENT'
  | 'VARIABLE_DEFINITION'
  // Type system directive locations
  | 'SCHEMA'
  | 'SCALAR'
  | 'OBJECT'
  | 'FIELD_DEFINITION'
  | 'ARGUMENT_DEFINITION'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'ENUM_VALUE'
  | 'INPUT_OBJECT'
  | 'INPUT_FIELD_DEFINITION';

/**
 * GraphQL API configuration
 */
export interface GraphQLApiConfig {
  readonly name: string;
  readonly description?: string;
  readonly schema: IGraphQLSchema | string;
  readonly path?: string; // API path (default: /graphql)

  // Backend configuration
  readonly backend?: GraphQLBackendConfig;

  // Advanced features
  readonly introspection?: IntrospectionConfig;
  readonly playground?: PlaygroundConfig;
  readonly subscriptions?: SubscriptionConfig;
  readonly complexity?: ComplexityConfig;
  readonly validation?: ValidationConfig;
  readonly cors?: CorsConfig;
  readonly authentication?: AuthenticationConfig;

  // Performance
  readonly caching?: GlobalCachingConfig;
  readonly timeout?: number; // milliseconds
  readonly rateLimiting?: RateLimitingConfig;

  // Observability
  readonly logging?: LoggingConfig;
  readonly tracing?: TracingConfig;
  readonly metrics?: MetricsConfig;
}

/**
 * GraphQL backend configuration
 */
export interface GraphQLBackendConfig {
  readonly type: GraphQLBackendType;
  readonly url?: string;
  readonly credentials?: BackendCredentials;
  readonly headers?: Record<string, string>;
}

/**
 * GraphQL backend types
 */
export type GraphQLBackendType =
  | 'synthetic'      // Execute resolvers in API Management
  | 'passthrough'    // Proxy to backend GraphQL service
  | 'azureFunction'  // Azure Functions backend
  | 'appService'     // App Service backend
  | 'custom';        // Custom HTTP endpoint

/**
 * Backend credentials
 */
export interface BackendCredentials {
  readonly type: 'none' | 'apiKey' | 'oauth2' | 'managedIdentity';
  readonly apiKey?: string;
  readonly oauth2?: OAuth2Credentials;
}

/**
 * OAuth2 credentials
 */
export interface OAuth2Credentials {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly tokenUrl: string;
  readonly scope?: string;
}

/**
 * Introspection configuration
 */
export interface IntrospectionConfig {
  readonly enabled: boolean;
  readonly allowedEnvironments?: readonly string[];
  readonly allowedRoles?: readonly string[];
  readonly hiddenTypes?: readonly string[];
  readonly hiddenFields?: Record<string, readonly string[]>;
}

/**
 * GraphQL Playground configuration
 */
export interface PlaygroundConfig {
  readonly enabled: boolean;
  readonly path?: string; // Playground path (default: /graphql/playground)
  readonly settings?: PlaygroundSettings;
}

/**
 * Playground settings
 */
export interface PlaygroundSettings {
  readonly 'editor.theme'?: 'dark' | 'light';
  readonly 'editor.cursorShape'?: 'line' | 'block' | 'underline';
  readonly 'editor.reuseHeaders'?: boolean;
  readonly 'editor.fontSize'?: number;
  readonly 'request.credentials'?: 'omit' | 'include' | 'same-origin';
}

/**
 * Subscription configuration
 */
export interface SubscriptionConfig {
  readonly enabled: boolean;
  readonly transport: SubscriptionTransport;
  readonly path?: string; // Subscriptions path (default: /graphql/subscriptions)
  readonly connectionOptions?: SubscriptionConnectionOptions;
}

/**
 * Subscription transport types
 */
export type SubscriptionTransport =
  | 'websocket'       // WebSocket transport
  | 'sse'             // Server-Sent Events
  | 'signalr'         // Azure SignalR Service
  | 'eventgrid'       // Azure Event Grid
  | 'servicebus';     // Azure Service Bus

/**
 * Subscription connection options
 */
export interface SubscriptionConnectionOptions {
  readonly keepAlive?: number; // milliseconds
  readonly connectionTimeout?: number; // milliseconds
  readonly maxConnections?: number;
  readonly authentication?: boolean;
}

/**
 * Query complexity configuration
 */
export interface ComplexityConfig {
  readonly enabled: boolean;
  readonly maxComplexity: number;
  readonly scalarCost?: number;
  readonly objectCost?: number;
  readonly listFactor?: number;
  readonly introspectionCost?: number;
  readonly depthLimit?: number;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  readonly enabled: boolean;
  readonly maxDepth?: number;
  readonly maxAliases?: number;
  readonly maxDirectives?: number;
  readonly rules?: readonly ValidationRule[];
}

/**
 * Validation rule
 */
export interface ValidationRule {
  readonly name: string;
  readonly enabled: boolean;
  readonly severity?: 'error' | 'warning';
  readonly options?: Record<string, any>;
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  readonly enabled: boolean;
  readonly allowedOrigins: readonly string[];
  readonly allowedMethods?: readonly string[];
  readonly allowedHeaders?: readonly string[];
  readonly exposedHeaders?: readonly string[];
  readonly credentials?: boolean;
  readonly maxAge?: number; // seconds
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  readonly required: boolean;
  readonly providers: readonly AuthenticationProvider[];
  readonly defaultProvider?: string;
  readonly anonymousAllowed?: boolean;
}

/**
 * Authentication provider configuration
 */
export interface AuthenticationProvider {
  readonly name: string;
  readonly type: 'azuread' | 'oauth2' | 'jwt' | 'apikey' | 'custom';
  readonly config: AuthenticationProviderConfig;
}

/**
 * Authentication provider config (discriminated union)
 */
export type AuthenticationProviderConfig =
  | AzureADAuthConfig
  | OAuth2AuthConfig
  | JwtAuthConfig
  | ApiKeyAuthConfig
  | CustomAuthConfig;

/**
 * Azure AD authentication configuration
 */
export interface AzureADAuthConfig {
  readonly tenantId: string;
  readonly clientId: string;
  readonly audience?: string;
  readonly issuer?: string;
}

/**
 * OAuth2 authentication configuration
 */
export interface OAuth2AuthConfig {
  readonly authorizationUrl: string;
  readonly tokenUrl: string;
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly scope?: string;
}

/**
 * JWT authentication configuration
 */
export interface JwtAuthConfig {
  readonly secret?: string;
  readonly publicKey?: string;
  readonly algorithm?: string;
  readonly issuer?: string;
  readonly audience?: string;
}

/**
 * API key authentication configuration
 */
export interface ApiKeyAuthConfig {
  readonly header?: string;
  readonly query?: string;
  readonly cookie?: string;
}

/**
 * Custom authentication configuration
 */
export interface CustomAuthConfig {
  readonly handler: string; // Function name or URL
  readonly options?: Record<string, any>;
}

/**
 * Global caching configuration
 */
export interface GlobalCachingConfig {
  readonly enabled: boolean;
  readonly defaultTtl?: number; // seconds
  readonly redis?: RedisConfig;
  readonly inMemory?: InMemoryCacheConfig;
}

/**
 * Redis configuration
 */
export interface RedisConfig {
  readonly host: string;
  readonly port?: number;
  readonly password?: string;
  readonly database?: number;
  readonly tls?: boolean;
  readonly keyPrefix?: string;
}

/**
 * In-memory cache configuration
 */
export interface InMemoryCacheConfig {
  readonly maxSize?: number; // bytes
  readonly maxItems?: number;
  readonly ttl?: number; // seconds
}

/**
 * Rate limiting configuration
 */
export interface RateLimitingConfig {
  readonly enabled: boolean;
  readonly strategy: 'fixedWindow' | 'slidingWindow' | 'tokenBucket';
  readonly limit: number; // requests
  readonly window: number; // seconds
  readonly keyGenerator?: 'ip' | 'user' | 'apiKey' | 'custom';
  readonly customKeyGenerator?: string; // Function name
  readonly redis?: RedisConfig;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  readonly enabled: boolean;
  readonly level?: 'debug' | 'info' | 'warn' | 'error';
  readonly includeVariables?: boolean;
  readonly includeResults?: boolean;
  readonly sanitize?: readonly string[]; // Fields to sanitize
  readonly destination?: LogDestination;
}

/**
 * Log destination
 */
export type LogDestination =
  | 'console'
  | 'applicationInsights'
  | 'logAnalytics'
  | 'eventHub'
  | 'storageAccount';

/**
 * Tracing configuration
 */
export interface TracingConfig {
  readonly enabled: boolean;
  readonly sampler?: TracingSampler;
  readonly exporter?: TracingExporter;
  readonly includeVariables?: boolean;
  readonly includeResults?: boolean;
}

/**
 * Tracing sampler
 */
export interface TracingSampler {
  readonly type: 'always' | 'never' | 'probability' | 'rateLimiting';
  readonly probability?: number; // 0.0 to 1.0
  readonly rate?: number; // traces per second
}

/**
 * Tracing exporter
 */
export interface TracingExporter {
  readonly type: 'applicationInsights' | 'zipkin' | 'jaeger' | 'otlp';
  readonly endpoint?: string;
  readonly headers?: Record<string, string>;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  readonly enabled: boolean;
  readonly includeOperationMetrics?: boolean;
  readonly includeFieldMetrics?: boolean;
  readonly includeErrorMetrics?: boolean;
  readonly customMetrics?: readonly CustomMetric[];
  readonly destination?: MetricsDestination;
}

/**
 * Custom metric definition
 */
export interface CustomMetric {
  readonly name: string;
  readonly type: 'counter' | 'gauge' | 'histogram';
  readonly description?: string;
  readonly tags?: readonly string[];
}

/**
 * Metrics destination
 */
export type MetricsDestination =
  | 'applicationInsights'
  | 'prometheus'
  | 'statsd'
  | 'cloudWatch';
