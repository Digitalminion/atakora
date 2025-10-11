/**
 * REST API Stack for Azure API Management
 *
 * @remarks
 * Provides high-level constructs for creating REST APIs in Azure API Management.
 * Integrates with the core REST operation definitions from `@atakora/cdk/api/rest`.
 *
 * @packageDocumentation
 */

// Core REST API stack
export { RestApiStack } from './stack';
export type { RestApiStackProps, ApiConfig, ApiOperationConfig } from './stack';

// Factory functions and helpers
export {
  createRestApi,
  createCrudApi,
  createAsyncApi,
  createCatalogApi,
  restApi,
} from './resource';
