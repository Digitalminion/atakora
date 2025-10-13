/**
 * Backend Configuration Types
 *
 * Re-exports type definitions from @atakora/lib for backward compatibility.
 * The actual type definitions have been moved to the lib package to eliminate circular dependencies.
 *
 * @see @atakora/lib/apimanagement/rest
 */

export type {
  BackendType,
  BackendConfiguration,
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
} from '@atakora/lib/apimanagement/rest';
