/**
 * REST API Type Definitions
 *
 * Core type definitions for REST API operations following OpenAPI 3.0/3.1 specifications.
 * These types are used by both the CDK constructs and the synthesis layer.
 *
 * @packageDocumentation
 */
export type { HttpMethod, IRestOperation, PathParameterDefinition, QueryParameterDefinition, HeaderParameterDefinition, ParameterSchema, ParameterExample, RequestBodyDefinition, ContentTypeDefinition, MediaTypeSchema, MediaTypeExample, EncodingDefinition, JsonSchema, DiscriminatorDefinition, XmlDefinition, ResponseDefinition, ResponseSchema, HeaderDefinition, LinkDefinition, ErrorResponse, BackendConfiguration, SecurityRequirement, OperationPolicies, IPolicy, ExternalDocumentation, ServerConfiguration, ServerVariable, } from './operation';
export type { BackendType, BackendCredentialType, AzureFunctionBackend, AppServiceBackend, ContainerAppBackend, HttpEndpointBackend, ServiceFabricBackend, LogicAppBackend, BackendCredentials, NoneCredentials, BasicCredentials, ClientCertificateCredentials, ManagedIdentityCredentials, ApiKeyCredentials, TlsConfiguration, RetryPolicy, CircuitBreakerConfig, HealthCheckConfig, LoadBalancingConfig, LoadBalancingStrategy, BackendPoolMember, StickySessionConfig, IFunctionApp, IWebApp, IContainerApp, IServiceFabricCluster, ILogicApp, } from './backend-types';
export type { OpenApiVersion, OpenApiDefinition, OpenApiInfo, OpenApiContact, OpenApiLicense, OpenApiServer, OpenApiPaths, OpenApiPathItem, OpenApiOperation, OpenApiComponents, OpenApiTag, ParameterObject, RequestBodyObject, ResponseObject, ResponsesObject, MediaTypeObject, SchemaObject, HeaderObject, ExampleObject, LinkObject, CallbackObject, SecuritySchemeObject, OAuthFlowsObject, OAuthFlowObject, DiscriminatorObject, XmlObject, ReferenceObject, EncodingObject, ValidationResult, ValidationError, OpenAPIV3, OpenAPIV3_1, } from './openapi/types';
export { isReferenceObject, isSchemaObject } from './openapi/types';
//# sourceMappingURL=index.d.ts.map