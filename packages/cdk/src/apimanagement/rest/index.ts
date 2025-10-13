/**
 * REST API Stack for Azure API Management
 *
 * @remarks
 * Provides high-level constructs for creating REST APIs in Azure API Management.
 * Includes type-safe REST API operation definitions with OpenAPI 3.0/3.1 compatibility,
 * fluent builders, backend integration, and full TypeScript type inference.
 *
 * @see ADR-014 REST API Core Architecture
 * @packageDocumentation
 */

// Core operation interfaces and types
export type {
  HttpMethod,
  IRestOperation,
  PathParameterDefinition,
  QueryParameterDefinition,
  HeaderParameterDefinition,
  ParameterSchema,
  ParameterExample,
  RequestBodyDefinition,
  ContentTypeDefinition,
  MediaTypeSchema,
  MediaTypeExample,
  EncodingDefinition,
  JsonSchema,
  DiscriminatorDefinition,
  XmlDefinition,
  ResponseDefinition,
  ResponseSchema,
  HeaderDefinition,
  LinkDefinition,
  ErrorResponse,
  BackendConfiguration,
  SecurityRequirement,
  OperationPolicies,
  IPolicy,
  ExternalDocumentation,
  ServerConfiguration,
  ServerVariable,
} from './operation';

// Operation builder
export { RestOperationBuilder } from './builder';

// HTTP method helpers
export { get, post, put, patch, del, head, options, trace } from './helpers';

// Backend configuration types
export type {
  BackendType,
  BackendCredentialType,
  AzureFunctionBackend,
  AppServiceBackend,
  ContainerAppBackend,
  HttpEndpointBackend,
  ServiceFabricBackend,
  LogicAppBackend,
  BackendCredentials,
  NoneCredentials,
  BasicCredentials,
  ClientCertificateCredentials,
  ManagedIdentityCredentials,
  ApiKeyCredentials,
  TlsConfiguration,
  RetryPolicy,
  CircuitBreakerConfig,
  HealthCheckConfig,
  LoadBalancingConfig,
  LoadBalancingStrategy,
  BackendPoolMember,
  StickySessionConfig,
  IFunctionApp,
  IWebApp,
  IContainerApp,
  IServiceFabricCluster,
  ILogicApp,
} from './backend-types';

// Backend manager
export { BackendManager } from './backend-manager';
export type { IBackend, IApiManagement } from './backend-manager';

// OpenAPI integration (Phase 2)
export {
  OpenApiImporter,
  OpenApiExporter,
  OpenApiValidationError,
  isReferenceObject,
  isSchemaObject,
} from './openapi';

export type {
  // OpenAPI core types
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
  OpenApiVersion,
  // OpenAPI object types
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
  EncodingObject,
  // Validation types
  ValidationResult,
  ValidationError,
  // Import/Export types
  OpenApiImportResult,
  OpenApiImporterOptions,
  OpenApiExporterOptions,
  // Re-exports from openapi-types
  OpenAPIV3,
  OpenAPIV3_1,
} from './openapi';

// Advanced features (Phase 4)
export {
  // Version Management
  ApiVersionManager,
  VersionDeprecationManager,
  VersionFormatValidator,
  // Pagination
  offsetPagination,
  cursorPagination,
  pagePagination,
  LinkHeaderBuilder,
  // Filtering, Sorting, Field Selection
  FilterParser,
  FilteringHelper,
  SortingHelper,
  FieldSelectionHelper,
  sorting,
  fieldSelection,
} from './advanced';

export type {
  // Version Management
  ApiVersioningConfig,
  VersioningStrategy,
  VersionFormat,
  DeprecatedVersion,
  VersionConfig,
  PathVersioningConfig,
  HeaderVersioningConfig,
  QueryVersioningConfig,
  ContentVersioningConfig,
  // Pagination
  PaginationStrategy,
  PaginationConfig,
  BasePaginationParams,
  OffsetPaginationParams,
  CursorPaginationParams,
  PagePaginationParams,
  PaginationMetadata,
  OffsetPaginationMetadata,
  CursorPaginationMetadata,
  PagePaginationMetadata,
  PaginatedResponse,
  OffsetPaginationConfig,
  CursorPaginationConfig,
  PagePaginationConfig,
  PaginationHelper,
  // Filtering, Sorting, Field Selection
  FilterSyntax,
  FilterOperator,
  FilteringConfig,
  SortingConfig,
  SortField,
  FieldSelectionConfig,
  FilterExpression,
  FilterValidationResult,
  SortValidationResult,
  FieldSelectionValidationResult,
} from './advanced';

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
