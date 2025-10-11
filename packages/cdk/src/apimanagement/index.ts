/**
 * Microsoft.ApiManagement resources for Azure CDK.
 *
 * This module provides constructs for Azure API Management services, APIs, products, and policies.
 *
 * @packageDocumentation
 */

export * from './api-management-types';
export * from './api-management-arm';
export * from './api-management';
export * from './api';
export * from './product';
export * from './subscription';
export * from './policy';

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
