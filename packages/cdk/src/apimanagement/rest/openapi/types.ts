/**
 * OpenAPI Type Interfaces
 *
 * Re-exports type definitions from @atakora/lib for backward compatibility.
 * The actual type definitions have been moved to the lib package to eliminate circular dependencies.
 *
 * @see @atakora/lib/apimanagement/rest
 */

export type {
  OpenApiVersion,
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
  EncodingObject,
  ValidationResult,
  ValidationError,
  OpenAPIV3,
  OpenAPIV3_1,
} from '@atakora/lib/apimanagement/rest';

export { isReferenceObject, isSchemaObject } from '@atakora/lib/apimanagement/rest';
