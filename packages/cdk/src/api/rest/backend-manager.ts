/**
 * Backend Manager
 *
 * Manages backend service configurations and integrations for REST API operations.
 * Provides factory methods for creating backends from various Azure resources.
 *
 * @see ADR-014 REST API Core Architecture - Section 4.6
 */

import type {
  BackendConfiguration,
  BackendCredentials,
  AzureFunctionBackend,
  AppServiceBackend,
  ContainerAppBackend,
  HttpEndpointBackend,
  ServiceFabricBackend,
  LogicAppBackend,
  LoadBalancingConfig,
  HealthCheckConfig,
  IFunctionApp,
  IWebApp,
  IContainerApp,
} from './backend-types';

/**
 * Backend resource interface (simplified - full definition in ARM package)
 */
export interface IBackend {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly protocol: 'http' | 'https';
  readonly [key: string]: any;
}

/**
 * API Management service interface
 */
export interface IApiManagement {
  readonly id: string;
  readonly name: string;
  readonly gatewayUrl: string;
  readonly [key: string]: any;
}

/**
 * Backend manager for creating and managing backend services
 *
 * @example
 * ```typescript
 * const backendManager = new BackendManager(apiManagement);
 * const backend = backendManager.createBackend({
 *   type: 'azureFunction',
 *   functionApp: myFunctionApp,
 *   functionName: 'GetUser'
 * });
 * ```
 */
export class BackendManager {
  /**
   * Creates a new backend manager
   *
   * @param apiManagement - API Management service instance
   */
  constructor(private readonly apiManagement: IApiManagement) {}

  /**
   * Creates a backend from configuration
   *
   * @param config - Backend configuration
   * @returns Backend resource
   * @throws Error if backend type is not supported
   */
  createBackend(config: BackendConfiguration): IBackend {
    switch (config.type) {
      case 'azureFunction':
        return this.createAzureFunctionBackend(config as AzureFunctionBackend);
      case 'appService':
        return this.createAppServiceBackend(config as AppServiceBackend);
      case 'containerApp':
        return this.createContainerAppBackend(config as ContainerAppBackend);
      case 'httpEndpoint':
        return this.createHttpEndpointBackend(config as HttpEndpointBackend);
      case 'serviceFabric':
        return this.createServiceFabricBackend(config as ServiceFabricBackend);
      case 'logicApp':
        return this.createLogicAppBackend(config as LogicAppBackend);
      default:
        throw new Error(`Unsupported backend type: ${config.type}`);
    }
  }

  /**
   * Creates a backend for Azure Functions
   *
   * @param config - Azure Function backend configuration
   * @returns Backend resource
   */
  private createAzureFunctionBackend(config: AzureFunctionBackend): IBackend {
    const functionUrl = this.buildFunctionUrl(config.functionApp, config.functionName, config.routePrefix);

    return {
      id: `backend-${config.functionApp.name}-${config.functionName}`,
      name: `${config.functionApp.name}-${config.functionName}`,
      url: functionUrl,
      protocol: 'https',
      type: 'azureFunction',
      credentials: config.credentials || this.createManagedIdentityCredentials(),
      timeout: config.timeout || 30000,
      retryPolicy: config.retryPolicy,
      circuitBreaker: config.circuitBreaker,
      healthCheck: config.healthCheck,
      resourceId: config.functionApp.id,
    };
  }

  /**
   * Creates a backend for Azure App Service
   *
   * @param config - App Service backend configuration
   * @returns Backend resource
   */
  private createAppServiceBackend(config: AppServiceBackend): IBackend {
    const hostname = config.hostNameOverride || config.appService.defaultHostName;
    const baseUrl = `https://${hostname}`;
    const fullUrl = config.relativePath ? `${baseUrl}${config.relativePath}` : baseUrl;

    return {
      id: `backend-${config.appService.name}`,
      name: config.appService.name,
      url: fullUrl,
      protocol: 'https',
      type: 'appService',
      credentials: config.credentials || this.createManagedIdentityCredentials(),
      timeout: config.timeout || 30000,
      retryPolicy: config.retryPolicy,
      circuitBreaker: config.circuitBreaker,
      healthCheck: config.healthCheck,
      resourceId: config.appService.id,
    };
  }

  /**
   * Creates a backend for Azure Container Apps
   *
   * @param config - Container App backend configuration
   * @returns Backend resource
   */
  private createContainerAppBackend(config: ContainerAppBackend): IBackend {
    const fqdn = config.containerApp.configuration.ingress.fqdn;
    const port = config.port || config.targetPort || config.containerApp.configuration.ingress.targetPort;
    const url = port && port !== 443 ? `https://${fqdn}:${port}` : `https://${fqdn}`;

    return {
      id: `backend-${config.containerApp.name}`,
      name: config.containerApp.name,
      url,
      protocol: 'https',
      type: 'containerApp',
      credentials: config.credentials,
      timeout: config.timeout || 30000,
      circuitBreaker: config.circuitBreaker,
      healthCheck: config.healthCheck,
      resourceId: config.containerApp.id,
    };
  }

  /**
   * Creates a backend for external HTTP endpoints
   *
   * @param config - HTTP endpoint backend configuration
   * @returns Backend resource
   */
  private createHttpEndpointBackend(config: HttpEndpointBackend): IBackend {
    const url = new URL(config.url);
    const protocol = url.protocol === 'https:' ? 'https' : 'http';

    return {
      id: `backend-http-${this.sanitizeId(config.url)}`,
      name: `http-${url.hostname}`,
      url: config.url,
      protocol,
      type: 'httpEndpoint',
      credentials: config.credentials,
      timeout: config.timeout || 30000,
      preserveHostHeader: config.preserveHostHeader,
      tls: config.tls,
      circuitBreaker: config.circuitBreaker,
      healthCheck: config.healthCheck,
    };
  }

  /**
   * Creates a backend for Service Fabric services
   *
   * @param config - Service Fabric backend configuration
   * @returns Backend resource
   */
  private createServiceFabricBackend(config: ServiceFabricBackend): IBackend {
    return {
      id: `backend-sf-${config.serviceFabricCluster.name}-${config.serviceName}`,
      name: `${config.serviceFabricCluster.name}-${config.serviceName}`,
      url: config.serviceFabricCluster.managementEndpoint,
      protocol: 'https',
      type: 'serviceFabric',
      serviceName: config.serviceName,
      partitionKey: config.partitionKey,
      credentials: config.credentials,
      timeout: config.timeout || 30000,
      circuitBreaker: config.circuitBreaker,
      resourceId: config.serviceFabricCluster.id,
    };
  }

  /**
   * Creates a backend for Logic Apps
   *
   * @param config - Logic App backend configuration
   * @returns Backend resource
   */
  private createLogicAppBackend(config: LogicAppBackend): IBackend {
    const url = config.triggerName
      ? `${config.logicApp.accessEndpoint}/triggers/${config.triggerName}`
      : config.logicApp.accessEndpoint;

    return {
      id: `backend-logic-${config.logicApp.name}`,
      name: config.logicApp.name,
      url,
      protocol: 'https',
      type: 'logicApp',
      credentials: config.credentials,
      timeout: config.timeout || 30000,
      resourceId: config.logicApp.id,
    };
  }

  /**
   * Creates a backend pool for load balancing
   *
   * @param config - Load balancing configuration
   * @returns Array of backend resources
   */
  createBackendPool(config: LoadBalancingConfig): IBackend[] {
    return config.backends
      .filter((member) => member.enabled !== false)
      .map((member) => {
        const backend = this.createBackend(member.backend);
        return {
          ...backend,
          weight: member.weight,
          priority: member.priority,
        };
      });
  }

  /**
   * Builds the Function App URL
   *
   * @param functionApp - Function App resource
   * @param functionName - Name of the function
   * @param routePrefix - Optional route prefix (default: 'api')
   * @returns Complete function URL
   */
  private buildFunctionUrl(
    functionApp: IFunctionApp,
    functionName: string,
    routePrefix?: string
  ): string {
    const defaultHostName = functionApp.defaultHostName;
    const prefix = routePrefix ?? 'api';
    return `https://${defaultHostName}/${prefix}/${functionName}`;
  }

  /**
   * Creates managed identity credentials for Azure resources
   *
   * @param clientId - Optional user-assigned managed identity client ID
   * @returns Managed identity credentials
   */
  private createManagedIdentityCredentials(clientId?: string): BackendCredentials {
    return {
      type: 'managedIdentity',
      managedIdentityClientId: clientId,
    };
  }

  /**
   * Sanitizes a string to create a valid Azure resource ID component
   *
   * @param input - Input string
   * @returns Sanitized string
   */
  private sanitizeId(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  /**
   * Validates backend health check configuration
   *
   * @param config - Health check configuration
   * @returns Validation result
   */
  validateHealthCheck(config: HealthCheckConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.path) {
      errors.push('Health check path is required');
    }

    if (config.interval < 1) {
      errors.push('Health check interval must be at least 1 second');
    }

    if (config.timeout < 1) {
      errors.push('Health check timeout must be at least 1 second');
    }

    if (config.timeout >= config.interval) {
      errors.push('Health check timeout must be less than interval');
    }

    if (config.unhealthyThreshold < 1) {
      errors.push('Unhealthy threshold must be at least 1');
    }

    if (config.healthyThreshold < 1) {
      errors.push('Healthy threshold must be at least 1');
    }

    if (config.expectedStatusCode && (config.expectedStatusCode < 100 || config.expectedStatusCode > 599)) {
      errors.push('Expected status code must be between 100 and 599');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gets the backend URL for a given configuration
   *
   * @param config - Backend configuration
   * @returns Backend URL
   */
  getBackendUrl(config: BackendConfiguration): string {
    switch (config.type) {
      case 'azureFunction': {
        const funcConfig = config as AzureFunctionBackend;
        return this.buildFunctionUrl(funcConfig.functionApp, funcConfig.functionName, funcConfig.routePrefix);
      }
      case 'appService': {
        const appConfig = config as AppServiceBackend;
        const hostname = appConfig.hostNameOverride || appConfig.appService.defaultHostName;
        const baseUrl = `https://${hostname}`;
        return appConfig.relativePath ? `${baseUrl}${appConfig.relativePath}` : baseUrl;
      }
      case 'containerApp': {
        const containerConfig = config as ContainerAppBackend;
        const fqdn = containerConfig.containerApp.configuration.ingress.fqdn;
        return `https://${fqdn}`;
      }
      case 'httpEndpoint': {
        const httpConfig = config as HttpEndpointBackend;
        return httpConfig.url;
      }
      default:
        return config.url || '';
    }
  }
}
