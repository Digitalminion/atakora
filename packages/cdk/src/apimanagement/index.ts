/**
 * Microsoft.ApiManagement resources for Azure CDK.
 *
 * This module provides constructs for Azure API Management services, APIs, products, and policies.
 *
 * @packageDocumentation
 */

export * from './core/types';
export * from './core/arm';
export * from './core/service';
export * from './core/api';
export * from './core/product';
export * from './core/subscription';
export * from './core/policy';
export * from './logger/types';
export * from './logger/arm';

// REST API Stack exports (high-level orchestration)
export { RestApiStack } from './rest/stack';
export type { RestApiStackProps, ApiConfig, ApiOperationConfig } from './rest/stack';
export {
  createRestApi,
  createCrudApi,
  createAsyncApi,
  createCatalogApi,
  restApi,
} from './rest/resource';

// GraphQL API exports
export * from './graphql/types';
export * from './graphql/api';

// GraphQL Resolver Builder exports
export { GraphQLResolverBuilder } from './graphql/resolver-builder';
export type {
  DataSourceConfig,
  CrudOperationConfig,
  ResolverGenerationOptions,
  GeneratedResolverMetadata,
} from './graphql/resolver-builder';
