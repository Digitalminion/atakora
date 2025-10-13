/**
 * GraphQL API Types for Azure API Management
 *
 * Type definitions for GraphQL API resources in Azure API Management.
 *
 * @module @atakora/cdk/apimanagement
 */

import { schema } from '@atakora/lib';
import type { IService } from '../core/types';
import type { ApiProtocol } from '../core/types';

/**
 * GraphQL API type enum
 */
export enum GraphQLApiType {
  /**
   * Pass-through GraphQL API (proxy to backend GraphQL server)
   */
  GRAPHQL = 'graphql',

  /**
   * Synthetic GraphQL API (resolvers executed in API Management)
   */
  GRAPHQL_SYNTHETIC = 'graphql-synthetic'
}

/**
 * GraphQL resolver type enum
 */
export const GraphQLResolverType = schema.apimanagement.GraphQLResolverType;
export type GraphQLResolverType = typeof GraphQLResolverType[keyof typeof GraphQLResolverType];

/**
 * ARM properties for GraphQL API
 */
export interface ArmGraphQLApiProperties {
  /**
   * Display name of the API
   */
  readonly displayName: string;

  /**
   * Description of the API
   */
  readonly description?: string;

  /**
   * API path (URL suffix)
   */
  readonly path: string;

  /**
   * GraphQL schema (SDL format)
   */
  readonly graphQLSchema?: string;

  /**
   * GraphQL API type
   */
  readonly type: GraphQLApiType;

  /**
   * Backend service URL (for pass-through mode)
   */
  readonly serviceUrl?: string;

  /**
   * Supported protocols
   */
  readonly protocols?: readonly ApiProtocol[];

  /**
   * Subscription required
   */
  readonly subscriptionRequired?: boolean;

  /**
   * API version
   */
  readonly apiVersion?: string;

  /**
   * API version set ID
   */
  readonly apiVersionSetId?: string;
}

/**
 * ARM GraphQL API properties
 */
export interface ArmGraphQLApiProps {
  /**
   * Parent API Management service
   */
  readonly apiManagementService: IService;

  /**
   * GraphQL API name
   */
  readonly apiName: string;

  /**
   * GraphQL API properties
   */
  readonly properties: ArmGraphQLApiProperties;
}

/**
 * L2 GraphQL API properties
 */
export interface GraphQLApiProps {
  /**
   * Parent API Management service
   */
  readonly apiManagementService: IService;

  /**
   * GraphQL API name (optional - defaults to sanitized construct ID)
   */
  readonly apiName?: string;

  /**
   * Display name of the API
   */
  readonly displayName: string;

  /**
   * Description of the API
   */
  readonly description?: string;

  /**
   * API path (URL suffix, optional - defaults to apiName)
   */
  readonly path?: string;

  /**
   * GraphQL schema (SDL format or schema object)
   */
  readonly schema: string | GraphQLSchemaDefinition;

  /**
   * GraphQL API type (optional - defaults to GRAPHQL_SYNTHETIC)
   */
  readonly type?: GraphQLApiType;

  /**
   * Backend service URL (for pass-through mode)
   */
  readonly serviceUrl?: string;

  /**
   * Supported protocols (optional - defaults to HTTPS only)
   */
  readonly protocols?: readonly ApiProtocol[];

  /**
   * Subscription required (optional - defaults to true)
   */
  readonly subscriptionRequired?: boolean;

  /**
   * API version
   */
  readonly apiVersion?: string;

  /**
   * API version set ID
   */
  readonly apiVersionSetId?: string;
}

/**
 * GraphQL schema definition (programmatic schema)
 */
export interface GraphQLSchemaDefinition {
  /**
   * GraphQL schema in SDL format
   */
  readonly sdl?: string;

  /**
   * Query type definition
   */
  readonly query?: GraphQLObjectTypeDefinition;

  /**
   * Mutation type definition
   */
  readonly mutation?: GraphQLObjectTypeDefinition;

  /**
   * Subscription type definition
   */
  readonly subscription?: GraphQLObjectTypeDefinition;

  /**
   * Additional type definitions
   */
  readonly types?: readonly GraphQLTypeDefinition[];

  /**
   * Directive definitions
   */
  readonly directives?: readonly GraphQLDirectiveDefinition[];
}

/**
 * GraphQL object type definition
 */
export interface GraphQLObjectTypeDefinition {
  /**
   * Type name
   */
  readonly name: string;

  /**
   * Description
   */
  readonly description?: string;

  /**
   * Field definitions
   */
  readonly fields: Record<string, GraphQLFieldDefinition>;

  /**
   * Implemented interfaces
   */
  readonly interfaces?: readonly string[];
}

/**
 * GraphQL field definition
 */
export interface GraphQLFieldDefinition {
  /**
   * Field type
   */
  readonly type: string;

  /**
   * Description
   */
  readonly description?: string;

  /**
   * Arguments
   */
  readonly args?: Record<string, GraphQLArgumentDefinition>;

  /**
   * Field resolver configuration
   */
  readonly resolver?: GraphQLFieldResolver;

  /**
   * Deprecation reason
   */
  readonly deprecationReason?: string;
}

/**
 * GraphQL argument definition
 */
export interface GraphQLArgumentDefinition {
  /**
   * Argument type
   */
  readonly type: string;

  /**
   * Description
   */
  readonly description?: string;

  /**
   * Default value
   */
  readonly defaultValue?: any;
}

/**
 * GraphQL field resolver
 */
export interface GraphQLFieldResolver {
  /**
   * Resolver type
   */
  readonly type: GraphQLResolverType;

  /**
   * Resolver configuration
   */
  readonly config: GraphQLResolverConfig;
}

/**
 * GraphQL resolver configuration (discriminated union)
 */
export type GraphQLResolverConfig =
  | HttpResolverConfig
  | AzureFunctionResolverConfig
  | CosmosDbResolverConfig
  | SqlResolverConfig
  | CustomResolverConfig;

/**
 * HTTP resolver configuration
 */
export interface HttpResolverConfig {
  /**
   * HTTP endpoint URL
   */
  readonly url: string;

  /**
   * HTTP method
   */
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /**
   * Request headers
   */
  readonly headers?: Record<string, string>;

  /**
   * Request body template
   */
  readonly body?: string;

  /**
   * Response transformation
   */
  readonly responseTransform?: string;
}

/**
 * Azure Function resolver configuration
 */
export interface AzureFunctionResolverConfig {
  /**
   * Function App resource ID
   */
  readonly functionAppId: string;

  /**
   * Function name
   */
  readonly functionName: string;

  /**
   * Function key (optional - uses managed identity if not provided)
   */
  readonly functionKey?: string;

  /**
   * Request transformation
   */
  readonly requestTransform?: string;

  /**
   * Response transformation
   */
  readonly responseTransform?: string;
}

/**
 * Cosmos DB resolver configuration
 */
export interface CosmosDbResolverConfig {
  /**
   * Cosmos DB account endpoint
   */
  readonly accountEndpoint: string;

  /**
   * Database name
   */
  readonly databaseName: string;

  /**
   * Container name
   */
  readonly containerName: string;

  /**
   * Query template
   */
  readonly query: string;

  /**
   * Partition key path
   */
  readonly partitionKeyPath?: string;
}

/**
 * SQL Database resolver configuration
 */
export interface SqlResolverConfig {
  /**
   * SQL Server endpoint
   */
  readonly serverEndpoint: string;

  /**
   * Database name
   */
  readonly databaseName: string;

  /**
   * SQL query template
   */
  readonly query: string;

  /**
   * Connection string key in Key Vault
   */
  readonly connectionStringKeyVaultRef?: string;
}

/**
 * Custom resolver configuration
 */
export interface CustomResolverConfig {
  /**
   * Custom resolver handler
   */
  readonly handler: string;

  /**
   * Custom configuration
   */
  readonly config?: Record<string, any>;
}

/**
 * GraphQL type definition (discriminated union)
 */
export type GraphQLTypeDefinition =
  | GraphQLObjectTypeDefinition
  | GraphQLInputTypeDefinition
  | GraphQLEnumTypeDefinition
  | GraphQLUnionTypeDefinition
  | GraphQLInterfaceTypeDefinition;

/**
 * GraphQL input type definition
 */
export interface GraphQLInputTypeDefinition {
  readonly kind: 'INPUT_OBJECT';
  readonly name: string;
  readonly description?: string;
  readonly fields: Record<string, GraphQLInputFieldDefinition>;
}

/**
 * GraphQL input field definition
 */
export interface GraphQLInputFieldDefinition {
  readonly type: string;
  readonly description?: string;
  readonly defaultValue?: any;
}

/**
 * GraphQL enum type definition
 */
export interface GraphQLEnumTypeDefinition {
  readonly kind: 'ENUM';
  readonly name: string;
  readonly description?: string;
  readonly values: Record<string, GraphQLEnumValueDefinition>;
}

/**
 * GraphQL enum value definition
 */
export interface GraphQLEnumValueDefinition {
  readonly value?: string;
  readonly description?: string;
  readonly deprecationReason?: string;
}

/**
 * GraphQL union type definition
 */
export interface GraphQLUnionTypeDefinition {
  readonly kind: 'UNION';
  readonly name: string;
  readonly description?: string;
  readonly types: readonly string[];
}

/**
 * GraphQL interface type definition
 */
export interface GraphQLInterfaceTypeDefinition {
  readonly kind: 'INTERFACE';
  readonly name: string;
  readonly description?: string;
  readonly fields: Record<string, GraphQLFieldDefinition>;
  readonly interfaces?: readonly string[];
}

/**
 * GraphQL directive definition
 */
export interface GraphQLDirectiveDefinition {
  readonly name: string;
  readonly description?: string;
  readonly locations: readonly DirectiveLocation[];
  readonly args?: Record<string, GraphQLArgumentDefinition>;
  readonly repeatable?: boolean;
}

/**
 * GraphQL directive locations
 */
export type DirectiveLocation =
  | 'QUERY'
  | 'MUTATION'
  | 'SUBSCRIPTION'
  | 'FIELD'
  | 'FRAGMENT_DEFINITION'
  | 'FRAGMENT_SPREAD'
  | 'INLINE_FRAGMENT'
  | 'VARIABLE_DEFINITION'
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
 * GraphQL API interface
 */
export interface IGraphQLApi {
  /**
   * API name
   */
  readonly apiName: string;

  /**
   * API path
   */
  readonly path: string;

  /**
   * API resource ID
   */
  readonly apiId: string;

  /**
   * GraphQL schema in SDL format
   */
  readonly graphQLSchema?: string;
}
