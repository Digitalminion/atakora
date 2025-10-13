/**
 * OpenAPI Integration Module
 *
 * Provides OpenAPI 3.0.x and 3.1.0 import/export capabilities for REST API operations.
 * This module enables seamless integration with existing OpenAPI specifications and
 * allows exporting Atakora REST operations to standard OpenAPI format.
 *
 * @see ADR-014 REST API Core Architecture - Section 3: OpenAPI Integration
 * @see docs/design/architecture/openapi-library-evaluation.md - Felix's library evaluation
 *
 * @example Import OpenAPI specification
 * ```typescript
 * import { OpenApiImporter } from '@atakora/cdk/api/rest/openapi';
 *
 * // From YAML file
 * const importer = await OpenApiImporter.fromFile('./openapi.yaml');
 * const result = await importer.import();
 *
 * // Use imported operations
 * for (const operation of result.operations) {
 *   api.addOperation(operation);
 * }
 * ```
 *
 * @example Export to OpenAPI specification
 * ```typescript
 * import { OpenApiExporter } from '@atakora/cdk/api/rest/openapi';
 *
 * // Export operations to OpenAPI
 * const exporter = new OpenApiExporter(operations, {
 *   title: 'My API',
 *   version: '1.0.0'
 * });
 *
 * // Write to file
 * await exporter.writeToFile('./openapi.yaml', 'yaml');
 * ```
 *
 * @packageDocumentation
 */

// Export type definitions (excluding types already exported from main index via operation.ts)
export type {
  OpenApiDefinition,
  OpenApiInfo,
  OpenApiContact,
  OpenApiLicense,
  OpenApiServer,
  OpenApiPaths,
  OpenApiPathItem,
  OpenApiOperation,
  OpenApiComponents,
  OpenApiTag,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  ResponsesObject,
  MediaTypeObject,
  SchemaObject,
  HeaderObject,
  ExampleObject,
  LinkObject,
  CallbackObject,
  SecuritySchemeObject,
  OAuthFlowsObject,
  OAuthFlowObject,
  DiscriminatorObject,
  XmlObject,
  ReferenceObject,
  ValidationResult,
  ValidationError,
  OpenApiVersion,
  EncodingObject,
} from './types';

// Export type guards
export { isReferenceObject, isSchemaObject } from './types';

// Export re-exported openapi-types
export type { OpenAPIV3, OpenAPIV3_1 } from './types';

// Export importer
export {
  OpenApiImporter,
  OpenApiValidationError,
  type OpenApiImportResult,
  type OpenApiImporterOptions,
} from './importer';

// Export exporter
export {
  OpenApiExporter,
  type OpenApiExporterOptions,
} from './exporter';
