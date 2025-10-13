/**
 * Backend Configuration Types
 *
 * Defines backend service types for REST API operations in Azure API Management.
 * Supports Azure Functions, App Service, Container Apps, and external HTTP endpoints.
 *
 * @see ADR-014 REST API Core Architecture - Section 4
 */
/**
 * Backend service types supported by Azure API Management
 */
export type BackendType = 'azureFunction' | 'appService' | 'containerApp' | 'httpEndpoint' | 'serviceFabric' | 'logicApp';
/**
 * Backend credential types for authentication
 */
export type BackendCredentialType = 'none' | 'basic' | 'clientCertificate' | 'managedIdentity' | 'apiKey';
/**
 * Base backend configuration interface
 */
export interface BackendConfiguration {
    readonly type: BackendType;
    readonly url?: string;
    readonly credentials?: BackendCredentials;
    readonly timeout?: number;
    readonly retryPolicy?: RetryPolicy;
    readonly circuitBreaker?: CircuitBreakerConfig;
    readonly healthCheck?: HealthCheckConfig;
    readonly loadBalancing?: LoadBalancingConfig;
}
/**
 * Azure Function backend configuration
 *
 * @example
 * ```typescript
 * const backend: AzureFunctionBackend = {
 *   type: 'azureFunction',
 *   functionApp: myFunctionApp,
 *   functionName: 'GetUser',
 *   authLevel: 'function'
 * };
 * ```
 */
export interface AzureFunctionBackend extends BackendConfiguration {
    readonly type: 'azureFunction';
    readonly functionApp: IFunctionApp;
    readonly functionName: string;
    readonly authLevel?: 'anonymous' | 'function' | 'admin';
    readonly routePrefix?: string;
}
/**
 * Azure App Service backend configuration
 *
 * @example
 * ```typescript
 * const backend: AppServiceBackend = {
 *   type: 'appService',
 *   appService: myWebApp,
 *   relativePath: '/api/users'
 * };
 * ```
 */
export interface AppServiceBackend extends BackendConfiguration {
    readonly type: 'appService';
    readonly appService: IWebApp;
    readonly relativePath?: string;
    readonly hostNameOverride?: string;
}
/**
 * Azure Container App backend configuration
 *
 * @example
 * ```typescript
 * const backend: ContainerAppBackend = {
 *   type: 'containerApp',
 *   containerApp: myContainerApp,
 *   port: 8080
 * };
 * ```
 */
export interface ContainerAppBackend extends BackendConfiguration {
    readonly type: 'containerApp';
    readonly containerApp: IContainerApp;
    readonly port?: number;
    readonly targetPort?: number;
}
/**
 * External HTTP endpoint backend configuration
 *
 * @example
 * ```typescript
 * const backend: HttpEndpointBackend = {
 *   type: 'httpEndpoint',
 *   url: 'https://api.example.com',
 *   preserveHostHeader: true,
 *   credentials: { type: 'apiKey', header: 'X-API-Key', value: 'secret' }
 * };
 * ```
 */
export interface HttpEndpointBackend extends BackendConfiguration {
    readonly type: 'httpEndpoint';
    readonly url: string;
    readonly preserveHostHeader?: boolean;
    readonly tls?: TlsConfiguration;
}
/**
 * Service Fabric backend configuration
 */
export interface ServiceFabricBackend extends BackendConfiguration {
    readonly type: 'serviceFabric';
    readonly serviceFabricCluster: IServiceFabricCluster;
    readonly serviceName: string;
    readonly partitionKey?: string;
}
/**
 * Logic App backend configuration
 */
export interface LogicAppBackend extends BackendConfiguration {
    readonly type: 'logicApp';
    readonly logicApp: ILogicApp;
    readonly triggerName?: string;
}
/**
 * Backend credentials configuration
 */
export interface BackendCredentials {
    readonly type: BackendCredentialType;
    readonly username?: string;
    readonly password?: string;
    readonly certificate?: string;
    readonly certificateThumbprint?: string;
    readonly header?: string;
    readonly value?: string;
    readonly query?: string;
    readonly managedIdentityClientId?: string;
}
/**
 * None credentials (no authentication)
 */
export interface NoneCredentials extends BackendCredentials {
    readonly type: 'none';
}
/**
 * Basic authentication credentials
 */
export interface BasicCredentials extends BackendCredentials {
    readonly type: 'basic';
    readonly username: string;
    readonly password: string;
}
/**
 * Client certificate credentials
 */
export interface ClientCertificateCredentials extends BackendCredentials {
    readonly type: 'clientCertificate';
    readonly certificate: string;
    readonly certificateThumbprint?: string;
    readonly password?: string;
}
/**
 * Managed identity credentials for Azure resources
 */
export interface ManagedIdentityCredentials extends BackendCredentials {
    readonly type: 'managedIdentity';
    readonly managedIdentityClientId?: string;
}
/**
 * API key credentials
 */
export interface ApiKeyCredentials extends BackendCredentials {
    readonly type: 'apiKey';
    readonly header?: string;
    readonly query?: string;
    readonly value: string;
}
/**
 * TLS configuration for HTTPS backends
 */
export interface TlsConfiguration {
    readonly validateCertificateChain?: boolean;
    readonly validateCertificateName?: boolean;
    readonly clientCertificate?: string;
    readonly clientCertificateThumbprint?: string;
}
/**
 * Retry policy for failed backend requests
 *
 * @example
 * ```typescript
 * const retryPolicy: RetryPolicy = {
 *   maxAttempts: 3,
 *   interval: 1000,
 *   backoffMultiplier: 2,
 *   maxInterval: 10000,
 *   retryOn: [500, 502, 503, 504]
 * };
 * ```
 */
export interface RetryPolicy {
    readonly maxAttempts: number;
    readonly interval: number;
    readonly backoffMultiplier?: number;
    readonly maxInterval?: number;
    readonly retryOn?: readonly number[];
    readonly retryCondition?: string;
}
/**
 * Circuit breaker configuration for fault tolerance
 *
 * @example
 * ```typescript
 * const circuitBreaker: CircuitBreakerConfig = {
 *   enabled: true,
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   timeout: 60000,
 *   halfOpenRequests: 3
 * };
 * ```
 */
export interface CircuitBreakerConfig {
    readonly enabled: boolean;
    readonly failureThreshold: number;
    readonly successThreshold: number;
    readonly timeout: number;
    readonly halfOpenRequests?: number;
}
/**
 * Health check configuration for backend monitoring
 *
 * @example
 * ```typescript
 * const healthCheck: HealthCheckConfig = {
 *   enabled: true,
 *   path: '/health',
 *   interval: 30,
 *   timeout: 5,
 *   unhealthyThreshold: 3,
 *   healthyThreshold: 2,
 *   expectedStatusCode: 200
 * };
 * ```
 */
export interface HealthCheckConfig {
    readonly enabled: boolean;
    readonly path: string;
    readonly interval: number;
    readonly timeout: number;
    readonly unhealthyThreshold: number;
    readonly healthyThreshold: number;
    readonly protocol?: 'http' | 'https' | 'tcp';
    readonly port?: number;
    readonly expectedStatusCode?: number;
    readonly expectedBody?: string;
    readonly headers?: Record<string, string>;
}
/**
 * Load balancing configuration for multiple backend instances
 */
export interface LoadBalancingConfig {
    readonly strategy: LoadBalancingStrategy;
    readonly backends: readonly BackendPoolMember[];
    readonly stickySession?: StickySessionConfig;
}
/**
 * Load balancing strategies
 */
export type LoadBalancingStrategy = 'roundRobin' | 'leastConnections' | 'weighted' | 'ipHash' | 'random';
/**
 * Backend pool member for load balancing
 */
export interface BackendPoolMember {
    readonly backend: BackendConfiguration;
    readonly weight?: number;
    readonly priority?: number;
    readonly enabled?: boolean;
}
/**
 * Sticky session configuration for session affinity
 */
export interface StickySessionConfig {
    readonly enabled: boolean;
    readonly cookieName?: string;
    readonly duration?: number;
    readonly mode?: 'cookie' | 'ipHash';
}
/**
 * Interface references for backend resources
 * These would be imported from respective resource packages
 */
export interface IFunctionApp {
    readonly id: string;
    readonly name: string;
    readonly defaultHostName: string;
    readonly [key: string]: any;
}
export interface IWebApp {
    readonly id: string;
    readonly name: string;
    readonly defaultHostName: string;
    readonly [key: string]: any;
}
export interface IContainerApp {
    readonly id: string;
    readonly name: string;
    readonly configuration: {
        readonly ingress: {
            readonly fqdn: string;
            readonly targetPort: number;
        };
    };
    readonly [key: string]: any;
}
export interface IServiceFabricCluster {
    readonly id: string;
    readonly name: string;
    readonly managementEndpoint: string;
    readonly [key: string]: any;
}
export interface ILogicApp {
    readonly id: string;
    readonly name: string;
    readonly accessEndpoint: string;
    readonly [key: string]: any;
}
//# sourceMappingURL=backend-types.d.ts.map