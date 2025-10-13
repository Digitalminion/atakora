/**
 * Sample REST operations for testing.
 *
 * These fixtures provide realistic operation examples covering various scenarios:
 * - Basic CRUD operations
 * - Paginated endpoints
 * - Filtered and sorted endpoints
 * - Versioned endpoints
 * - Cached endpoints
 * - Authenticated endpoints
 * - Rate-limited endpoints
 */

import type { IRestOperation } from '../utils';

// ============================================================================
// Basic CRUD Operations
// ============================================================================

/**
 * Basic GET operation - retrieve a single user by ID.
 */
export const getUserOperation: IRestOperation = {
  method: 'GET',
  path: '/users/{userId}',
  operationId: 'getUser',
  summary: 'Get user by ID',
  description: 'Retrieves a single user by their unique identifier',
  tags: ['users'],
};

/**
 * Basic POST operation - create a new user.
 */
export const createUserOperation: IRestOperation = {
  method: 'POST',
  path: '/users',
  operationId: 'createUser',
  summary: 'Create new user',
  description: 'Creates a new user with the provided data',
  tags: ['users'],
};

/**
 * Basic PUT operation - update existing user.
 */
export const updateUserOperation: IRestOperation = {
  method: 'PUT',
  path: '/users/{userId}',
  operationId: 'updateUser',
  summary: 'Update user',
  description: 'Updates an existing user with new data',
  tags: ['users'],
};

/**
 * Basic DELETE operation - delete a user.
 */
export const deleteUserOperation: IRestOperation = {
  method: 'DELETE',
  path: '/users/{userId}',
  operationId: 'deleteUser',
  summary: 'Delete user',
  description: 'Deletes a user by their unique identifier',
  tags: ['users'],
};

/**
 * PATCH operation - partially update a user.
 */
export const patchUserOperation: IRestOperation = {
  method: 'PATCH',
  path: '/users/{userId}',
  operationId: 'patchUser',
  summary: 'Partially update user',
  description: 'Updates specific fields of a user',
  tags: ['users'],
};

// ============================================================================
// Paginated Operations
// ============================================================================

/**
 * List operation with offset pagination.
 */
export const listUsersOffsetOperation: IRestOperation = {
  method: 'GET',
  path: '/users',
  operationId: 'listUsersOffset',
  summary: 'List users with offset pagination',
  description: 'Returns a paginated list of users using offset and limit',
  tags: ['users', 'pagination'],
};

/**
 * List operation with cursor pagination.
 */
export const listUsersCursorOperation: IRestOperation = {
  method: 'GET',
  path: '/users/cursor',
  operationId: 'listUsersCursor',
  summary: 'List users with cursor pagination',
  description: 'Returns a paginated list of users using cursor-based pagination',
  tags: ['users', 'pagination'],
};

/**
 * List operation with page-based pagination.
 */
export const listUsersPageOperation: IRestOperation = {
  method: 'GET',
  path: '/users/pages',
  operationId: 'listUsersPage',
  summary: 'List users with page-based pagination',
  description: 'Returns a paginated list of users using page number and size',
  tags: ['users', 'pagination'],
};

// ============================================================================
// Filtered and Sorted Operations
// ============================================================================

/**
 * Search operation with RSQL filtering.
 */
export const searchUsersRsqlOperation: IRestOperation = {
  method: 'GET',
  path: '/users/search',
  operationId: 'searchUsersRsql',
  summary: 'Search users with RSQL filter',
  description: 'Search users using RSQL filter syntax (e.g., name==John;age>25)',
  tags: ['users', 'search', 'filtering'],
};

/**
 * Search operation with OData filtering.
 */
export const searchUsersODataOperation: IRestOperation = {
  method: 'GET',
  path: '/users/odata',
  operationId: 'searchUsersOData',
  summary: 'Search users with OData filter',
  description: 'Search users using OData filter syntax (e.g., name eq "John" and age gt 25)',
  tags: ['users', 'search', 'filtering'],
};

/**
 * Sorted list operation.
 */
export const listUsersSortedOperation: IRestOperation = {
  method: 'GET',
  path: '/users/sorted',
  operationId: 'listUsersSorted',
  summary: 'List users with sorting',
  description: 'Returns a sorted list of users (e.g., sort=createdAt:desc,name:asc)',
  tags: ['users', 'sorting'],
};

/**
 * Field selection operation.
 */
export const getUserFieldsOperation: IRestOperation = {
  method: 'GET',
  path: '/users/fields',
  operationId: 'getUserFields',
  summary: 'Get user with field selection',
  description: 'Returns user with only specified fields (e.g., fields=id,name,email)',
  tags: ['users', 'field-selection'],
};

// ============================================================================
// Versioned Operations
// ============================================================================

/**
 * Path-versioned operation.
 */
export const getUserV1Operation: IRestOperation = {
  method: 'GET',
  path: '/v1/users/{userId}',
  operationId: 'getUserV1',
  summary: 'Get user (version 1)',
  description: 'Retrieves user using path-based versioning',
  tags: ['users', 'versioning'],
};

/**
 * Path-versioned operation v2.
 */
export const getUserV2Operation: IRestOperation = {
  method: 'GET',
  path: '/v2/users/{userId}',
  operationId: 'getUserV2',
  summary: 'Get user (version 2)',
  description: 'Retrieves user with enhanced response structure',
  tags: ['users', 'versioning'],
};

/**
 * Header-versioned operation.
 */
export const getUserHeaderVersionedOperation: IRestOperation = {
  method: 'GET',
  path: '/users/{userId}',
  operationId: 'getUserHeaderVersioned',
  summary: 'Get user with header versioning',
  description: 'Retrieves user using Api-Version header',
  tags: ['users', 'versioning'],
};

/**
 * Deprecated operation.
 */
export const getUserDeprecatedOperation: IRestOperation = {
  method: 'GET',
  path: '/users/legacy/{userId}',
  operationId: 'getUserLegacy',
  summary: 'Get user (deprecated)',
  description: 'DEPRECATED: Use /users/{userId} instead',
  tags: ['users', 'deprecated'],
};

// ============================================================================
// Cached Operations
// ============================================================================

/**
 * ETag cached operation.
 */
export const getCachedUserOperation: IRestOperation = {
  method: 'GET',
  path: '/users/{userId}/cached',
  operationId: 'getCachedUser',
  summary: 'Get cached user with ETag',
  description: 'Retrieves user with ETag-based caching support',
  tags: ['users', 'caching'],
};

/**
 * Last-Modified cached operation.
 */
export const getCachedUserLastModifiedOperation: IRestOperation = {
  method: 'GET',
  path: '/users/{userId}/last-modified',
  operationId: 'getCachedUserLastModified',
  summary: 'Get cached user with Last-Modified',
  description: 'Retrieves user with Last-Modified-based caching support',
  tags: ['users', 'caching'],
};

// ============================================================================
// Authenticated Operations
// ============================================================================

/**
 * OAuth 2.0 protected operation.
 */
export const getProtectedResourceOperation: IRestOperation = {
  method: 'GET',
  path: '/protected/resource',
  operationId: 'getProtectedResource',
  summary: 'Get protected resource',
  description: 'Requires OAuth 2.0 Bearer token authentication',
  tags: ['protected', 'auth'],
};

/**
 * Azure AD protected operation.
 */
export const getAzureAdProtectedOperation: IRestOperation = {
  method: 'GET',
  path: '/azure/protected',
  operationId: 'getAzureAdProtected',
  summary: 'Get Azure AD protected resource',
  description: 'Requires Azure AD authentication',
  tags: ['protected', 'auth', 'azure-ad'],
};

/**
 * API Key protected operation.
 */
export const getApiKeyProtectedOperation: IRestOperation = {
  method: 'GET',
  path: '/api-key/protected',
  operationId: 'getApiKeyProtected',
  summary: 'Get API key protected resource',
  description: 'Requires API key in header or query parameter',
  tags: ['protected', 'auth', 'api-key'],
};

// ============================================================================
// Authorized Operations (RBAC/ABAC)
// ============================================================================

/**
 * Role-based access control operation.
 */
export const getAdminResourceOperation: IRestOperation = {
  method: 'GET',
  path: '/admin/resource',
  operationId: 'getAdminResource',
  summary: 'Get admin resource',
  description: 'Requires "admin" role',
  tags: ['admin', 'authz', 'rbac'],
};

/**
 * Attribute-based access control operation.
 */
export const getAttributeProtectedOperation: IRestOperation = {
  method: 'GET',
  path: '/abac/resource',
  operationId: 'getAttributeProtected',
  summary: 'Get attribute-protected resource',
  description: 'Access based on user attributes',
  tags: ['protected', 'authz', 'abac'],
};

// ============================================================================
// Rate-Limited Operations
// ============================================================================

/**
 * Rate-limited POST operation.
 */
export const createRateLimitedOperation: IRestOperation = {
  method: 'POST',
  path: '/rate-limited',
  operationId: 'createRateLimited',
  summary: 'Create resource (rate-limited)',
  description: 'Subject to rate limiting (100 requests per minute)',
  tags: ['rate-limiting'],
};

/**
 * Quota-limited operation.
 */
export const createQuotaLimitedOperation: IRestOperation = {
  method: 'POST',
  path: '/quota-limited',
  operationId: 'createQuotaLimited',
  summary: 'Create resource (quota-limited)',
  description: 'Subject to monthly quota (10,000 requests per month)',
  tags: ['quota'],
};

// ============================================================================
// Validated Operations
// ============================================================================

/**
 * Schema-validated POST operation.
 */
export const createValidatedUserOperation: IRestOperation = {
  method: 'POST',
  path: '/users/validated',
  operationId: 'createValidatedUser',
  summary: 'Create validated user',
  description: 'Creates user with strict JSON Schema validation',
  tags: ['users', 'validation'],
};

/**
 * Content-type restricted operation.
 */
export const createJsonOnlyOperation: IRestOperation = {
  method: 'POST',
  path: '/json-only',
  operationId: 'createJsonOnly',
  summary: 'Create resource (JSON only)',
  description: 'Only accepts application/json content type',
  tags: ['validation', 'content-type'],
};

// ============================================================================
// Batch and Bulk Operations
// ============================================================================

/**
 * Batch create operation.
 */
export const batchCreateUsersOperation: IRestOperation = {
  method: 'POST',
  path: '/users/batch',
  operationId: 'batchCreateUsers',
  summary: 'Batch create users',
  description: 'Creates multiple users in a single request',
  tags: ['users', 'batch'],
};

/**
 * Bulk update operation.
 */
export const bulkUpdateUsersOperation: IRestOperation = {
  method: 'PATCH',
  path: '/users/bulk',
  operationId: 'bulkUpdateUsers',
  summary: 'Bulk update users',
  description: 'Updates multiple users in a single request',
  tags: ['users', 'bulk'],
};

// ============================================================================
// File Upload Operations
// ============================================================================

/**
 * File upload operation.
 */
export const uploadFileOperation: IRestOperation = {
  method: 'POST',
  path: '/files/upload',
  operationId: 'uploadFile',
  summary: 'Upload file',
  description: 'Uploads a file using multipart/form-data',
  tags: ['files', 'upload'],
};

/**
 * Multiple file upload operation.
 */
export const uploadMultipleFilesOperation: IRestOperation = {
  method: 'POST',
  path: '/files/upload/multiple',
  operationId: 'uploadMultipleFiles',
  summary: 'Upload multiple files',
  description: 'Uploads multiple files in a single request',
  tags: ['files', 'upload', 'batch'],
};

// ============================================================================
// Webhook Operations
// ============================================================================

/**
 * Webhook callback operation.
 */
export const webhookCallbackOperation: IRestOperation = {
  method: 'POST',
  path: '/webhooks/callback',
  operationId: 'webhookCallback',
  summary: 'Webhook callback',
  description: 'Receives webhook callbacks from external services',
  tags: ['webhooks'],
};

// ============================================================================
// Export Collections
// ============================================================================

/**
 * All sample operations grouped by category.
 */
export const sampleOperations = {
  crud: {
    getUser: getUserOperation,
    createUser: createUserOperation,
    updateUser: updateUserOperation,
    deleteUser: deleteUserOperation,
    patchUser: patchUserOperation,
  },
  pagination: {
    offset: listUsersOffsetOperation,
    cursor: listUsersCursorOperation,
    page: listUsersPageOperation,
  },
  filtering: {
    rsql: searchUsersRsqlOperation,
    odata: searchUsersODataOperation,
    sorted: listUsersSortedOperation,
    fields: getUserFieldsOperation,
  },
  versioning: {
    v1: getUserV1Operation,
    v2: getUserV2Operation,
    header: getUserHeaderVersionedOperation,
    deprecated: getUserDeprecatedOperation,
  },
  caching: {
    etag: getCachedUserOperation,
    lastModified: getCachedUserLastModifiedOperation,
  },
  authentication: {
    oauth2: getProtectedResourceOperation,
    azureAd: getAzureAdProtectedOperation,
    apiKey: getApiKeyProtectedOperation,
  },
  authorization: {
    rbac: getAdminResourceOperation,
    abac: getAttributeProtectedOperation,
  },
  rateLimiting: {
    rateLimited: createRateLimitedOperation,
    quotaLimited: createQuotaLimitedOperation,
  },
  validation: {
    validated: createValidatedUserOperation,
    jsonOnly: createJsonOnlyOperation,
  },
  batch: {
    batchCreate: batchCreateUsersOperation,
    bulkUpdate: bulkUpdateUsersOperation,
  },
  files: {
    single: uploadFileOperation,
    multiple: uploadMultipleFilesOperation,
  },
  webhooks: {
    callback: webhookCallbackOperation,
  },
};

/**
 * Array of all sample operations for iteration.
 */
export const allSampleOperations: IRestOperation[] = [
  // CRUD
  getUserOperation,
  createUserOperation,
  updateUserOperation,
  deleteUserOperation,
  patchUserOperation,

  // Pagination
  listUsersOffsetOperation,
  listUsersCursorOperation,
  listUsersPageOperation,

  // Filtering
  searchUsersRsqlOperation,
  searchUsersODataOperation,
  listUsersSortedOperation,
  getUserFieldsOperation,

  // Versioning
  getUserV1Operation,
  getUserV2Operation,
  getUserHeaderVersionedOperation,
  getUserDeprecatedOperation,

  // Caching
  getCachedUserOperation,
  getCachedUserLastModifiedOperation,

  // Authentication
  getProtectedResourceOperation,
  getAzureAdProtectedOperation,
  getApiKeyProtectedOperation,

  // Authorization
  getAdminResourceOperation,
  getAttributeProtectedOperation,

  // Rate Limiting
  createRateLimitedOperation,
  createQuotaLimitedOperation,

  // Validation
  createValidatedUserOperation,
  createJsonOnlyOperation,

  // Batch
  batchCreateUsersOperation,
  bulkUpdateUsersOperation,

  // Files
  uploadFileOperation,
  uploadMultipleFilesOperation,

  // Webhooks
  webhookCallbackOperation,
];

export default sampleOperations;
