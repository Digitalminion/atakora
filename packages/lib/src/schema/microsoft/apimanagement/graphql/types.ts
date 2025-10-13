/**
 * API Management GraphQL Schema Types
 *
 * Zod validation schemas for GraphQL API configuration.
 *
 * @module @atakora/lib/schema/apimanagement/graphql
 */

import { z } from 'zod';
import * as enums from './enums';

/**
 * GraphQL field type schema
 */
export const GraphQLFieldTypeSchema: z.ZodType<any> = z.object({
  kind: enums.GraphQLTypeKindEnum,
  name: z.string().optional(),
  ofType: z.lazy(() => GraphQLFieldTypeSchema).optional(),
  nullable: z.boolean().optional()
});

/**
 * GraphQL directive usage schema
 */
export const GraphQLDirectiveUsageSchema = z.object({
  name: z.string(),
  args: z.record(z.any()).optional()
});

/**
 * GraphQL argument schema
 */
export const GraphQLArgumentSchema = z.object({
  type: GraphQLFieldTypeSchema,
  description: z.string().optional(),
  defaultValue: z.any().optional(),
  deprecated: z.union([z.boolean(), z.string()]).optional(),
  directives: z.array(GraphQLDirectiveUsageSchema).optional()
});

/**
 * Authorization rule schema
 */
export const AuthorizationRuleSchema = z.object({
  type: enums.AuthorizationTypeEnum,
  config: z.union([
    z.object({
      roles: z.array(z.string()),
      requireAll: z.boolean().optional()
    }),
    z.object({
      claims: z.record(z.any()),
      match: z.enum(['exact', 'contains', 'regex']).optional()
    }),
    z.object({
      attributes: z.array(z.object({
        subject: z.string(),
        operator: z.enum(['eq', 'ne', 'in', 'nin', 'gt', 'lt']),
        value: z.any()
      })),
      combinator: z.enum(['AND', 'OR']).optional()
    }),
    z.object({
      policyId: z.string(),
      parameters: z.record(z.any()).optional()
    }),
    z.object({
      handler: z.any() // Function type
    })
  ])
});

/**
 * Field authorization schema
 */
export const FieldAuthorizationSchema = z.object({
  strategy: enums.AuthorizationStrategyEnum,
  rules: z.array(AuthorizationRuleSchema),
  errorMessage: z.string().optional(),
  errorCode: z.string().optional()
});

/**
 * Field caching strategy schema
 */
export const FieldCachingStrategySchema = z.object({
  ttl: z.number().positive(),
  scope: enums.CacheScopeEnum,
  key: z.function().optional(),
  tags: z.array(z.string()).optional(),
  vary: z.array(z.string()).optional()
});

/**
 * GraphQL field schema
 */
export const GraphQLFieldSchema = z.object({
  name: z.string(),
  type: GraphQLFieldTypeSchema,
  description: z.string().optional(),
  deprecated: z.union([z.boolean(), z.string()]).optional(),
  args: z.record(GraphQLArgumentSchema).optional(),
  resolve: z.function().optional(),
  subscribe: z.object({
    subscribe: z.function(),
    resolve: z.function().optional()
  }).optional(),
  authorization: FieldAuthorizationSchema.optional(),
  caching: FieldCachingStrategySchema.optional(),
  complexity: z.function().optional(),
  directives: z.array(GraphQLDirectiveUsageSchema).optional()
});

/**
 * GraphQL object type schema
 */
export const GraphQLObjectTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  fields: z.record(GraphQLFieldSchema),
  interfaces: z.array(z.string()).optional(),
  directives: z.array(GraphQLDirectiveUsageSchema).optional()
});

/**
 * GraphQL input field schema
 */
export const GraphQLInputFieldSchema = z.object({
  type: GraphQLFieldTypeSchema,
  description: z.string().optional(),
  defaultValue: z.any().optional(),
  directives: z.array(GraphQLDirectiveUsageSchema).optional()
});

/**
 * GraphQL input object type schema
 */
export const GraphQLInputObjectTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  fields: z.record(GraphQLInputFieldSchema),
  directives: z.array(GraphQLDirectiveUsageSchema).optional()
});

/**
 * GraphQL enum value schema
 */
export const GraphQLEnumValueSchema = z.object({
  value: z.any().optional(),
  description: z.string().optional(),
  deprecated: z.union([z.boolean(), z.string()]).optional(),
  directives: z.array(GraphQLDirectiveUsageSchema).optional()
});

/**
 * GraphQL enum type schema
 */
export const GraphQLEnumTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  values: z.record(GraphQLEnumValueSchema),
  directives: z.array(GraphQLDirectiveUsageSchema).optional()
});

/**
 * GraphQL interface type schema
 */
export const GraphQLInterfaceTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  fields: z.record(GraphQLFieldSchema),
  interfaces: z.array(z.string()).optional(),
  directives: z.array(GraphQLDirectiveUsageSchema).optional(),
  resolveType: z.function().optional()
});

/**
 * GraphQL union type schema
 */
export const GraphQLUnionTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  types: z.array(z.string()),
  directives: z.array(GraphQLDirectiveUsageSchema).optional(),
  resolveType: z.function().optional()
});

/**
 * GraphQL scalar type schema
 */
export const GraphQLScalarTypeSchema = z.object({
  kind: z.literal('SCALAR'),
  name: z.string(),
  description: z.string().optional(),
  serialize: z.function().optional(),
  parseValue: z.function().optional(),
  parseLiteral: z.function().optional(),
  directives: z.array(GraphQLDirectiveUsageSchema).optional()
});

/**
 * GraphQL directive schema
 */
export const GraphQLDirectiveSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  locations: z.array(enums.DirectiveLocationEnum),
  args: z.record(GraphQLInputFieldSchema).optional(),
  isRepeatable: z.boolean().optional()
});

/**
 * GraphQL schema definition
 */
export const GraphQLSchemaSchema = z.object({
  query: GraphQLObjectTypeSchema.optional(),
  mutation: GraphQLObjectTypeSchema.optional(),
  subscription: GraphQLObjectTypeSchema.optional(),
  types: z.array(
    z.union([
      GraphQLObjectTypeSchema,
      GraphQLInputObjectTypeSchema,
      GraphQLEnumTypeSchema,
      GraphQLInterfaceTypeSchema,
      GraphQLUnionTypeSchema,
      GraphQLScalarTypeSchema
    ])
  ).optional(),
  directives: z.array(GraphQLDirectiveSchema).optional(),
  description: z.string().optional()
});

/**
 * Backend credentials schema
 */
export const BackendCredentialsSchema = z.object({
  type: enums.BackendCredentialTypeEnum,
  apiKey: z.string().optional(),
  oauth2: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    tokenUrl: z.string(),
    scope: z.string().optional()
  }).optional()
});

/**
 * GraphQL backend configuration schema
 */
export const GraphQLBackendConfigSchema = z.object({
  type: enums.GraphQLBackendTypeEnum,
  url: z.string().url().optional(),
  credentials: BackendCredentialsSchema.optional(),
  headers: z.record(z.string()).optional()
});

/**
 * Introspection configuration schema
 */
export const IntrospectionConfigSchema = z.object({
  enabled: z.boolean(),
  allowedEnvironments: z.array(z.string()).optional(),
  allowedRoles: z.array(z.string()).optional(),
  hiddenTypes: z.array(z.string()).optional(),
  hiddenFields: z.record(z.array(z.string())).optional()
});

/**
 * Playground settings schema
 */
export const PlaygroundSettingsSchema = z.object({
  'editor.theme': enums.PlaygroundThemeEnum.optional(),
  'editor.cursorShape': enums.PlaygroundCursorShapeEnum.optional(),
  'editor.reuseHeaders': z.boolean().optional(),
  'editor.fontSize': z.number().positive().optional(),
  'request.credentials': enums.RequestCredentialsEnum.optional()
});

/**
 * Playground configuration schema
 */
export const PlaygroundConfigSchema = z.object({
  enabled: z.boolean(),
  path: z.string().optional(),
  settings: PlaygroundSettingsSchema.optional()
});

/**
 * Subscription connection options schema
 */
export const SubscriptionConnectionOptionsSchema = z.object({
  keepAlive: z.number().positive().optional(),
  connectionTimeout: z.number().positive().optional(),
  maxConnections: z.number().positive().optional(),
  authentication: z.boolean().optional()
});

/**
 * Subscription configuration schema
 */
export const SubscriptionConfigSchema = z.object({
  enabled: z.boolean(),
  transport: enums.SubscriptionTransportEnum,
  path: z.string().optional(),
  connectionOptions: SubscriptionConnectionOptionsSchema.optional()
});

/**
 * Complexity configuration schema
 */
export const ComplexityConfigSchema = z.object({
  enabled: z.boolean(),
  maxComplexity: z.number().positive(),
  scalarCost: z.number().positive().optional(),
  objectCost: z.number().positive().optional(),
  listFactor: z.number().positive().optional(),
  introspectionCost: z.number().positive().optional(),
  depthLimit: z.number().positive().optional()
});

/**
 * Validation rule schema
 */
export const ValidationRuleSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  severity: enums.ValidationSeverityEnum.optional(),
  options: z.record(z.any()).optional()
});

/**
 * Validation configuration schema
 */
export const ValidationConfigSchema = z.object({
  enabled: z.boolean(),
  maxDepth: z.number().positive().optional(),
  maxAliases: z.number().positive().optional(),
  maxDirectives: z.number().positive().optional(),
  rules: z.array(ValidationRuleSchema).optional()
});

/**
 * CORS configuration schema
 */
export const CorsConfigSchema = z.object({
  enabled: z.boolean(),
  allowedOrigins: z.array(z.string()),
  allowedMethods: z.array(z.string()).optional(),
  allowedHeaders: z.array(z.string()).optional(),
  exposedHeaders: z.array(z.string()).optional(),
  credentials: z.boolean().optional(),
  maxAge: z.number().positive().optional()
});

/**
 * Authentication provider configuration schema
 */
export const AuthenticationProviderSchema = z.object({
  name: z.string(),
  type: enums.AuthenticationProviderTypeEnum,
  config: z.union([
    z.object({
      tenantId: z.string(),
      clientId: z.string(),
      audience: z.string().optional(),
      issuer: z.string().optional()
    }),
    z.object({
      authorizationUrl: z.string().url(),
      tokenUrl: z.string().url(),
      clientId: z.string(),
      clientSecret: z.string().optional(),
      scope: z.string().optional()
    }),
    z.object({
      secret: z.string().optional(),
      publicKey: z.string().optional(),
      algorithm: z.string().optional(),
      issuer: z.string().optional(),
      audience: z.string().optional()
    }),
    z.object({
      header: z.string().optional(),
      query: z.string().optional(),
      cookie: z.string().optional()
    }),
    z.object({
      handler: z.string(),
      options: z.record(z.any()).optional()
    })
  ])
});

/**
 * Authentication configuration schema
 */
export const AuthenticationConfigSchema = z.object({
  required: z.boolean(),
  providers: z.array(AuthenticationProviderSchema),
  defaultProvider: z.string().optional(),
  anonymousAllowed: z.boolean().optional()
});

/**
 * Redis configuration schema
 */
export const RedisConfigSchema = z.object({
  host: z.string(),
  port: z.number().positive().optional(),
  password: z.string().optional(),
  database: z.number().nonnegative().optional(),
  tls: z.boolean().optional(),
  keyPrefix: z.string().optional()
});

/**
 * In-memory cache configuration schema
 */
export const InMemoryCacheConfigSchema = z.object({
  maxSize: z.number().positive().optional(),
  maxItems: z.number().positive().optional(),
  ttl: z.number().positive().optional()
});

/**
 * Global caching configuration schema
 */
export const GlobalCachingConfigSchema = z.object({
  enabled: z.boolean(),
  defaultTtl: z.number().positive().optional(),
  redis: RedisConfigSchema.optional(),
  inMemory: InMemoryCacheConfigSchema.optional()
});

/**
 * Rate limiting configuration schema
 */
export const RateLimitingConfigSchema = z.object({
  enabled: z.boolean(),
  strategy: enums.RateLimitingStrategyEnum,
  limit: z.number().positive(),
  window: z.number().positive(),
  keyGenerator: enums.RateLimitingKeyGeneratorEnum.optional(),
  customKeyGenerator: z.string().optional(),
  redis: RedisConfigSchema.optional()
});

/**
 * Logging configuration schema
 */
export const LoggingConfigSchema = z.object({
  enabled: z.boolean(),
  level: enums.LogLevelEnum.optional(),
  includeVariables: z.boolean().optional(),
  includeResults: z.boolean().optional(),
  sanitize: z.array(z.string()).optional(),
  destination: enums.LogDestinationEnum.optional()
});

/**
 * Tracing sampler schema
 */
export const TracingSamplerSchema = z.object({
  type: enums.TracingSamplerTypeEnum,
  probability: z.number().min(0).max(1).optional(),
  rate: z.number().positive().optional()
});

/**
 * Tracing exporter schema
 */
export const TracingExporterSchema = z.object({
  type: enums.TracingExporterTypeEnum,
  endpoint: z.string().url().optional(),
  headers: z.record(z.string()).optional()
});

/**
 * Tracing configuration schema
 */
export const TracingConfigSchema = z.object({
  enabled: z.boolean(),
  sampler: TracingSamplerSchema.optional(),
  exporter: TracingExporterSchema.optional(),
  includeVariables: z.boolean().optional(),
  includeResults: z.boolean().optional()
});

/**
 * Custom metric schema
 */
export const CustomMetricSchema = z.object({
  name: z.string(),
  type: enums.CustomMetricTypeEnum,
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
});

/**
 * Metrics configuration schema
 */
export const MetricsConfigSchema = z.object({
  enabled: z.boolean(),
  includeOperationMetrics: z.boolean().optional(),
  includeFieldMetrics: z.boolean().optional(),
  includeErrorMetrics: z.boolean().optional(),
  customMetrics: z.array(CustomMetricSchema).optional(),
  destination: enums.MetricsDestinationEnum.optional()
});

/**
 * GraphQL API configuration schema
 */
export const GraphQLApiConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  schema: z.union([GraphQLSchemaSchema, z.string()]),
  path: z.string().optional(),
  backend: GraphQLBackendConfigSchema.optional(),
  introspection: IntrospectionConfigSchema.optional(),
  playground: PlaygroundConfigSchema.optional(),
  subscriptions: SubscriptionConfigSchema.optional(),
  complexity: ComplexityConfigSchema.optional(),
  validation: ValidationConfigSchema.optional(),
  cors: CorsConfigSchema.optional(),
  authentication: AuthenticationConfigSchema.optional(),
  caching: GlobalCachingConfigSchema.optional(),
  timeout: z.number().positive().optional(),
  rateLimiting: RateLimitingConfigSchema.optional(),
  logging: LoggingConfigSchema.optional(),
  tracing: TracingConfigSchema.optional(),
  metrics: MetricsConfigSchema.optional()
});

/**
 * Type exports
 */
export type GraphQLFieldType = z.infer<typeof GraphQLFieldTypeSchema>;
export type GraphQLDirectiveUsage = z.infer<typeof GraphQLDirectiveUsageSchema>;
export type GraphQLArgument = z.infer<typeof GraphQLArgumentSchema>;
export type AuthorizationRule = z.infer<typeof AuthorizationRuleSchema>;
export type FieldAuthorization = z.infer<typeof FieldAuthorizationSchema>;
export type FieldCachingStrategy = z.infer<typeof FieldCachingStrategySchema>;
export type GraphQLField = z.infer<typeof GraphQLFieldSchema>;
export type GraphQLObjectType = z.infer<typeof GraphQLObjectTypeSchema>;
export type GraphQLInputField = z.infer<typeof GraphQLInputFieldSchema>;
export type GraphQLInputObjectType = z.infer<typeof GraphQLInputObjectTypeSchema>;
export type GraphQLEnumValue = z.infer<typeof GraphQLEnumValueSchema>;
export type GraphQLEnumType = z.infer<typeof GraphQLEnumTypeSchema>;
export type GraphQLInterfaceType = z.infer<typeof GraphQLInterfaceTypeSchema>;
export type GraphQLUnionType = z.infer<typeof GraphQLUnionTypeSchema>;
export type GraphQLScalarTypeDefinition = z.infer<typeof GraphQLScalarTypeSchema>;
export type GraphQLDirective = z.infer<typeof GraphQLDirectiveSchema>;
export type GraphQLSchema = z.infer<typeof GraphQLSchemaSchema>;
export type BackendCredentials = z.infer<typeof BackendCredentialsSchema>;
export type GraphQLBackendConfig = z.infer<typeof GraphQLBackendConfigSchema>;
export type IntrospectionConfig = z.infer<typeof IntrospectionConfigSchema>;
export type PlaygroundSettings = z.infer<typeof PlaygroundSettingsSchema>;
export type PlaygroundConfig = z.infer<typeof PlaygroundConfigSchema>;
export type SubscriptionConnectionOptions = z.infer<typeof SubscriptionConnectionOptionsSchema>;
export type SubscriptionConfig = z.infer<typeof SubscriptionConfigSchema>;
export type ComplexityConfig = z.infer<typeof ComplexityConfigSchema>;
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;
export type CorsConfig = z.infer<typeof CorsConfigSchema>;
export type AuthenticationProvider = z.infer<typeof AuthenticationProviderSchema>;
export type AuthenticationConfig = z.infer<typeof AuthenticationConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type InMemoryCacheConfig = z.infer<typeof InMemoryCacheConfigSchema>;
export type GlobalCachingConfig = z.infer<typeof GlobalCachingConfigSchema>;
export type RateLimitingConfig = z.infer<typeof RateLimitingConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type TracingSampler = z.infer<typeof TracingSamplerSchema>;
export type TracingExporter = z.infer<typeof TracingExporterSchema>;
export type TracingConfig = z.infer<typeof TracingConfigSchema>;
export type CustomMetric = z.infer<typeof CustomMetricSchema>;
export type MetricsConfig = z.infer<typeof MetricsConfigSchema>;
export type GraphQLApiConfig = z.infer<typeof GraphQLApiConfigSchema>;
