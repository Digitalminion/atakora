import { Construct } from '@atakora/cdk';
import type { IService } from '../core/types';
import { RestApiStack, type ApiConfig } from './stack';

/**
 * Creates a REST API infrastructure stack with the specified API configurations.
 *
 * @remarks
 * This is a convenience factory function that creates a RestApiStack with
 * type-safe REST operation definitions.
 *
 * Common REST API patterns:
 * - CRUD APIs (Create, Read, Update, Delete)
 * - Async request-response APIs
 * - Read-only catalog APIs
 * - Admin APIs with restricted access
 *
 * @param scope - Parent scope (SubscriptionStack or ResourceGroupStack)
 * @param apiManagementService - API Management service instance
 * @param apiConfigs - Array of API configurations with operations
 * @returns Configured RestApiStack instance
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { createRestApi } from '@atakora/cdk/apimanagement/rest';
 * import { get, post } from '@atakora/cdk/apimanagement/rest';
 *
 * const getUserOp = get('/users/{id}')
 *   .operationId('getUser')
 *   .summary('Get user')
 *   .responses({ 200: { description: 'User found' } })
 *   .build();
 *
 * const apiStack = createRestApi(scope, apim, [
 *   {
 *     displayName: 'User API',
 *     path: 'api',
 *     serviceUrl: 'https://backend.azurewebsites.net',
 *     operations: [{ operation: getUserOp }]
 *   }
 * ]);
 * ```
 *
 * @example
 * Multiple APIs:
 * ```typescript
 * const apiStack = createRestApi(scope, apim, [
 *   {
 *     displayName: 'Public API',
 *     path: 'api/v1',
 *     serviceUrl: 'https://public.azurewebsites.net',
 *     operations: [{ operation: listUsersOp }, { operation: getUserOp }]
 *   },
 *   {
 *     displayName: 'Admin API',
 *     path: 'admin',
 *     serviceUrl: 'https://admin.azurewebsites.net',
 *     operations: [{ operation: createUserOp }, { operation: deleteUserOp }]
 *   }
 * ]);
 * ```
 */
export function createRestApi(
  scope: Construct,
  apiManagementService: IService,
  apiConfigs: ApiConfig[]
): RestApiStack {
  const apiStack = new RestApiStack(scope, 'RestApiStack', {
    apiManagementService,
    apis: apiConfigs,
  });

  return apiStack;
}

/**
 * Creates a standard CRUD API with common resource operations.
 *
 * @remarks
 * This is a helper for creating a typical CRUD API pattern.
 * Expects operations to follow the convention:
 * - list{Resource}: GET /{resources}
 * - get{Resource}: GET /{resources}/{id}
 * - create{Resource}: POST /{resources}
 * - update{Resource}: PUT /{resources}/{id}
 * - delete{Resource}: DELETE /{resources}/{id}
 *
 * @param scope - Parent scope
 * @param apiManagementService - API Management service
 * @param config - API configuration with CRUD operations
 * @returns Configured RestApiStack with CRUD operations
 *
 * @example
 * ```typescript
 * import { createCrudApi } from '@atakora/cdk/apimanagement/rest';
 * import { get, post, put, del } from '@atakora/cdk/apimanagement/rest';
 *
 * const apiStack = createCrudApi(scope, apim, {
 *   displayName: 'User Management API',
 *   path: 'api/users',
 *   serviceUrl: 'https://backend.azurewebsites.net',
 *   operations: [
 *     { operation: listUsersOp },
 *     { operation: getUserOp },
 *     { operation: createUserOp },
 *     { operation: updateUserOp },
 *     { operation: deleteUserOp }
 *   ]
 * });
 * ```
 */
export function createCrudApi(
  scope: Construct,
  apiManagementService: IService,
  config: ApiConfig
): RestApiStack {
  return createRestApi(scope, apiManagementService, [config]);
}

/**
 * Creates an async request-response API pattern.
 *
 * @remarks
 * This helper creates an API that follows the async request-response pattern:
 * 1. POST /{resource} - Returns 202 Accepted with location header
 * 2. GET /{resource}/{id} - Returns 200 OK (completed) or 202 Accepted (processing)
 * 3. DELETE /{resource}/{id} - Cancels or deletes the resource
 *
 * Common for long-running operations like:
 * - Search requests
 * - Report generation
 * - Batch processing
 * - ML model inference
 *
 * @param scope - Parent scope
 * @param apiManagementService - API Management service
 * @param config - API configuration with async operations
 * @returns Configured RestApiStack with async pattern
 *
 * @example
 * ```typescript
 * import { createAsyncApi } from '@atakora/cdk/apimanagement/rest';
 * import { get, post, del } from '@atakora/cdk/apimanagement/rest';
 *
 * const apiStack = createAsyncApi(scope, apim, {
 *   displayName: 'Search API',
 *   path: 'api/searches',
 *   serviceUrl: 'https://backend.azurewebsites.net',
 *   operations: [
 *     { operation: createSearchOp },  // POST /searches - 202 Accepted
 *     { operation: getSearchOp },     // GET /searches/{id} - 200 or 202
 *     { operation: deleteSearchOp }   // DELETE /searches/{id}
 *   ]
 * });
 * ```
 */
export function createAsyncApi(
  scope: Construct,
  apiManagementService: IService,
  config: ApiConfig
): RestApiStack {
  return createRestApi(scope, apiManagementService, [config]);
}

/**
 * Creates a read-only catalog or reference data API.
 *
 * @remarks
 * This helper creates an API with only GET operations for read-only access.
 * Common for:
 * - Product catalogs
 * - Reference data
 * - Public documentation
 * - Lookup tables
 *
 * @param scope - Parent scope
 * @param apiManagementService - API Management service
 * @param config - API configuration with read-only operations
 * @returns Configured RestApiStack with read-only operations
 *
 * @example
 * ```typescript
 * import { createCatalogApi } from '@atakora/cdk/apimanagement/rest';
 * import { get } from '@atakora/cdk/apimanagement/rest';
 *
 * const apiStack = createCatalogApi(scope, apim, {
 *   displayName: 'Product Catalog',
 *   path: 'api/catalog',
 *   serviceUrl: 'https://catalog.azurewebsites.net',
 *   operations: [
 *     { operation: listProductsOp },
 *     { operation: getProductOp },
 *     { operation: searchProductsOp }
 *   ]
 * });
 * ```
 */
export function createCatalogApi(
  scope: Construct,
  apiManagementService: IService,
  config: ApiConfig
): RestApiStack {
  return createRestApi(scope, apiManagementService, [config]);
}

/**
 * Export shorthand alias for use in infrastructure code.
 *
 * @remarks
 * This will be imported like:
 * ```typescript
 * import { restApi } from '@atakora/cdk/apimanagement/rest';
 * const apiStack = restApi(scope, apim, [...]);
 * ```
 */
export { createRestApi as restApi };
