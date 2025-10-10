/**
 * OpenAPI synthesis module for Atakora.
 *
 * This module provides comprehensive OpenAPI 3.0/3.1 processing including:
 * - Type generation from schemas
 * - Runtime validation with AJV
 * - Reference resolution
 * - Azure extension support
 *
 * @module @atakora/lib/synthesis/openapi
 */

// Types and interfaces
export * from './types';

// Reference resolution
export { ReferenceResolver, isReference, getReferenceName } from './reference-resolver';

// Schema validation
export {
  OpenApiSchemaValidator,
  extractConstraints,
  type ValidatorOptions,
} from './schema-validator';

// Type generation
export { TypeGenerator } from './type-generator';

// Azure extensions
export {
  AzureExtensionsHandler,
  azureExtensions,
  hasAzureExtensions,
  extractAllAzureExtensions,
  type AzureMsPaths,
  type AzureMsEnumExtension,
  type AzureMsPageable,
  type AzureMsMutability,
  type AzureMsParameterLocation,
} from './azure-extensions';
