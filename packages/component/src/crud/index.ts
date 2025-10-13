/**
 * CRUD API Components
 *
 * @remarks
 * Production-ready CRUD API infrastructure pattern that automatically provisions:
 * - Cosmos DB for data storage
 * - Azure Functions for CRUD operations
 * - Managed Identity and RBAC configuration
 * - Optional API Management integration
 * - Optional Application Insights monitoring
 *
 * @packageDocumentation
 */

export { CrudApi } from './crud-api';
export type {
  CrudApiProps,
  CrudSchema,
  CrudFieldSchema,
  CrudOperation,
} from './types';

// Export function generation utilities (for advanced users)
export {
  generateCrudFunctions,
  generateDeploymentManifest,
} from './function-generator';
export type {
  FunctionGeneratorConfig,
  GeneratedFunction,
  GeneratedFunctionApp,
} from './function-generator';
