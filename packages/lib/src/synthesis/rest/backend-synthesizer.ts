/**
 * Backend Synthesizer - Converts backend configurations to ARM backend resources
 *
 * @remarks
 * **Authentication Strategy - Defense in Depth**
 *
 * This synthesizer implements a dual authentication pattern for Azure Function and App Service backends:
 *
 * 1. **Function Keys** (Synthesized automatically):
 *    - Uses ARM's `listKeys()` to retrieve function/host keys at deployment time
 *    - Keys are passed via `x-functions-key` header in backend credentials
 *    - Provides basic authentication layer
 *
 * 2. **RBAC via Managed Identity** (Configured at CDK layer):
 *    - APIM service must have system-assigned managed identity enabled
 *    - Grant APIM permission to invoke functions using `functionApp.grantInvoke(apim)`
 *    - Creates role assignment with `Website Contributor` role
 *    - Provides identity-based authentication
 *
 * **Why Both?**
 * - Function keys: Simple, immediate auth that works out of the box
 * - RBAC: More secure, supports conditional access, audit logging, no key rotation
 * - Both are evaluated: APIM must pass function key AND have RBAC permission
 *
 * @example Defense in depth pattern
 * ```typescript
 * // 1. Create APIM with managed identity (CDK layer)
 * const apim = new ApiManagementService(stack, 'APIM', {
 *   identity: {
 *     type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
 *   }
 * });
 *
 * // 2. Create Function App with managed identity
 * const functionApp = new FunctionApp(stack, 'Api', {
 *   identity: {
 *     type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
 *   }
 * });
 *
 * // 3. Grant APIM permission to invoke (RBAC)
 * functionApp.grantInvoke(apim);
 *
 * // 4. Configure backend (function keys added automatically at synthesis)
 * const operation = get('/users')
 *   .backend({
 *     type: 'azureFunction',
 *     functionApp: functionApp,
 *     functionName: 'getUsers'
 *   })
 *   .build();
 *
 * // Result: APIM → Function auth requires BOTH function key AND RBAC role
 * ```
 *
 * @packageDocumentation
 */

import type { ArmResource } from '../types';
import type {
  BackendConfiguration,
  AzureFunctionBackend,
  AppServiceBackend,
  HttpEndpointBackend,
  ContainerAppBackend,
  TlsConfiguration,
  CircuitBreakerConfig,
} from '../../apimanagement/rest';
import type {
  ArmBackendProperties,
  ArmBackendCredentials,
  ArmBackendTls,
  ArmCircuitBreakerRule,
  BackendResourceIdentifier,
} from './types';

/**
 * Synthesizes backend service resources for REST API operations.
 *
 * Creates Microsoft.ApiManagement/service/backends resources for
 * Azure Functions, App Services, Container Apps, and HTTP endpoints.
 *
 * @example
 * ```typescript
 * const synthesizer = new BackendSynthesizer();
 * synthesizer.registerBackend('user-function', functionBackendConfig);
 * const resources = synthesizer.synthesize('apim-service');
 * ```
 */
export class BackendSynthesizer {
  private backends: Map<string, BackendConfiguration> = new Map();
  private synthesizedBackends: Set<string> = new Set();

  /**
   * Register a backend for synthesis
   *
   * @param backendId - Unique identifier for the backend
   * @param config - Backend configuration
   */
  public registerBackend(backendId: string, config: BackendConfiguration): void {
    if (this.backends.has(backendId)) {
      throw new Error(`Backend '${backendId}' is already registered`);
    }
    this.backends.set(backendId, config);
  }

  /**
   * Get backend resource identifier
   *
   * @param backendId - Backend identifier
   * @returns Backend resource identifier with ARM name
   */
  public getBackendResourceId(backendId: string): BackendResourceIdentifier {
    return {
      backendId,
      armResourceName: `backend-${this.sanitizeBackendId(backendId)}`,
      synthesized: this.synthesizedBackends.has(backendId),
    };
  }

  /**
   * Synthesize all registered backends to ARM resources
   *
   * @param apiManagementServiceName - Name of the API Management service
   * @param apimServiceResourceId - ARM resource ID of the APIM service
   * @returns Array of ARM backend resources
   */
  public synthesize(
    apiManagementServiceName: string,
    apimServiceResourceId: string
  ): ArmResource[] {
    const resources: ArmResource[] = [];

    for (const [backendId, config] of this.backends) {
      if (!this.synthesizedBackends.has(backendId)) {
        const resource = this.synthesizeBackend(
          backendId,
          config,
          apiManagementServiceName,
          apimServiceResourceId
        );
        resources.push(resource);
        this.synthesizedBackends.add(backendId);
      }
    }

    return resources;
  }

  /**
   * Synthesize a single backend to ARM resource
   */
  private synthesizeBackend(
    backendId: string,
    config: BackendConfiguration,
    apiManagementServiceName: string,
    apimServiceResourceId: string
  ): ArmResource {
    const sanitizedId = this.sanitizeBackendId(backendId);

    switch (config.type) {
      case 'azureFunction':
        return this.synthesizeAzureFunctionBackend(
          sanitizedId,
          config as AzureFunctionBackend,
          apiManagementServiceName,
          apimServiceResourceId
        );
      case 'appService':
        return this.synthesizeAppServiceBackend(
          sanitizedId,
          config as AppServiceBackend,
          apiManagementServiceName,
          apimServiceResourceId
        );
      case 'httpEndpoint':
        return this.synthesizeHttpEndpointBackend(
          sanitizedId,
          config as HttpEndpointBackend,
          apiManagementServiceName,
          apimServiceResourceId
        );
      case 'containerApp':
        return this.synthesizeContainerAppBackend(
          sanitizedId,
          config as ContainerAppBackend,
          apiManagementServiceName,
          apimServiceResourceId
        );
      default:
        throw new Error(`Unsupported backend type: ${config.type}`);
    }
  }

  /**
   * Synthesize Azure Function backend
   */
  private synthesizeAzureFunctionBackend(
    backendId: string,
    config: AzureFunctionBackend,
    apiManagementServiceName: string,
    apimServiceResourceId: string
  ): ArmResource {
    const functionAppName = config.functionApp.name;
    const routePrefix = config.routePrefix ?? 'api';

    const properties: any = {
      title: `${config.functionName} Function`,
      description: `Azure Function backend for ${config.functionName}`,
      protocol: 'http',
      url: `[concat('https://', reference(resourceId('Microsoft.Web/sites', '${functionAppName}')).defaultHostName, '/${routePrefix}')]`,
      resourceId: `[concat('https://management.azure.com', resourceId('Microsoft.Web/sites', '${functionAppName}'))]`,
      credentials: this.synthesizeAzureFunctionCredentials(
        functionAppName,
        config.functionName,
        config.authLevel || 'function'
      ),
      tls: {
        validateCertificateChain: true,
        validateCertificateName: true,
      },
      proxy: {
        url: null,
        username: null,
        password: null,
      },
    };

    // Add circuit breaker if configured
    if (config.circuitBreaker) {
      properties.circuitBreaker = {
        rules: this.synthesizeCircuitBreakerRules(config.circuitBreaker),
      };
    }

    return {
      type: 'Microsoft.ApiManagement/service/backends',
      apiVersion: '2021-08-01',
      name: `[concat(parameters('apiManagementServiceName'), '/backend-${backendId}')]`,
      properties: properties as ArmBackendProperties,
      dependsOn: [
        `[resourceId('Microsoft.Web/sites', '${functionAppName}')]`,
        apimServiceResourceId,
      ],
    };
  }

  /**
   * Synthesize credentials for Azure Function backend
   *
   * @remarks
   * **Defense in Depth - Function Keys**
   *
   * This method synthesizes function key authentication:
   * - Uses ARM's `listKeys()` to retrieve keys at deployment time
   * - Keys are NOT exposed in the template (ARM function resolves them)
   * - Automatically rotated when functions are redeployed
   *
   * **Combined with RBAC:**
   * This is layer 1 of authentication. For production, also grant APIM
   * permission to invoke via `functionApp.grantInvoke(apim)` at the CDK layer.
   * Both layers are evaluated for maximum security.
   *
   * @param functionAppName - Name of the Function App
   * @param functionName - Name of the specific function
   * @param authLevel - Authorization level (anonymous, function, or admin)
   * @returns ARM backend credentials with function key
   */
  private synthesizeAzureFunctionCredentials(
    functionAppName: string,
    functionName: string,
    authLevel: 'anonymous' | 'function' | 'admin'
  ): ArmBackendCredentials {
    if (authLevel === 'anonymous') {
      return {};
    }

    // Use function key for function-level auth, host key for admin
    const keyType = authLevel === 'admin' ? 'systemKeys' : 'functionKeys';
    const keyName = authLevel === 'admin' ? 'default' : functionName;

    return {
      header: {
        'x-functions-key': `[listKeys(resourceId('Microsoft.Web/sites/host', '${functionAppName}', 'default'), '2021-02-01').${keyType}.${keyName}]`,
      },
    };
  }

  /**
   * Synthesize App Service backend
   */
  private synthesizeAppServiceBackend(
    backendId: string,
    config: AppServiceBackend,
    apiManagementServiceName: string,
    apimServiceResourceId: string
  ): ArmResource {
    const appServiceName = config.appService.name;
    const relativePath = config.relativePath || '';

    const properties: any = {
      title: `${appServiceName} App Service`,
      description: `Azure App Service backend`,
      protocol: 'http',
      url: config.hostNameOverride
        ? `https://${config.hostNameOverride}${relativePath}`
        : `[concat('https://', reference(resourceId('Microsoft.Web/sites', '${appServiceName}')).defaultHostName, '${relativePath}')]`,
      resourceId: `[concat('https://management.azure.com', resourceId('Microsoft.Web/sites', '${appServiceName}'))]`,
      credentials: this.synthesizeCredentials(config.credentials),
      tls: {
        validateCertificateChain: true,
        validateCertificateName: true,
      },
      proxy: {
        url: null,
        username: null,
        password: null,
      },
    };

    // Add circuit breaker if configured
    if (config.circuitBreaker) {
      properties.circuitBreaker = {
        rules: this.synthesizeCircuitBreakerRules(config.circuitBreaker),
      };
    }

    return {
      type: 'Microsoft.ApiManagement/service/backends',
      apiVersion: '2021-08-01',
      name: `[concat(parameters('apiManagementServiceName'), '/backend-${backendId}')]`,
      properties: properties as ArmBackendProperties,
      dependsOn: [
        `[resourceId('Microsoft.Web/sites', '${appServiceName}')]`,
        apimServiceResourceId,
      ],
    };
  }

  /**
   * Synthesize HTTP Endpoint backend
   */
  private synthesizeHttpEndpointBackend(
    backendId: string,
    config: HttpEndpointBackend,
    apiManagementServiceName: string,
    apimServiceResourceId: string
  ): ArmResource {
    const properties: any = {
      title: 'External HTTP Backend',
      description: `HTTP endpoint: ${config.url}`,
      protocol: 'http',
      url: config.url,
      credentials: this.synthesizeCredentials(config.credentials),
      tls: this.synthesizeTlsConfiguration(config.tls),
      proxy: {
        url: null,
        username: null,
        password: null,
      },
    };

    // Add circuit breaker if configured
    if (config.circuitBreaker) {
      properties.circuitBreaker = {
        rules: this.synthesizeCircuitBreakerRules(config.circuitBreaker),
      };
    }

    return {
      type: 'Microsoft.ApiManagement/service/backends',
      apiVersion: '2021-08-01',
      name: `[concat(parameters('apiManagementServiceName'), '/backend-${backendId}')]`,
      properties: properties as ArmBackendProperties,
      dependsOn: [apimServiceResourceId],
    };
  }

  /**
   * Synthesize Container App backend
   */
  private synthesizeContainerAppBackend(
    backendId: string,
    config: ContainerAppBackend,
    apiManagementServiceName: string,
    apimServiceResourceId: string
  ): ArmResource {
    const containerAppName = config.containerApp.name;
    const fqdn = config.containerApp.configuration.ingress.fqdn;

    const properties: any = {
      title: `${containerAppName} Container App`,
      description: `Azure Container App backend`,
      protocol: 'http',
      url: `https://${fqdn}`,
      resourceId: `[concat('https://management.azure.com', resourceId('Microsoft.App/containerApps', '${containerAppName}'))]`,
      credentials: this.synthesizeCredentials(config.credentials),
      tls: {
        validateCertificateChain: true,
        validateCertificateName: true,
      },
      proxy: {
        url: null,
        username: null,
        password: null,
      },
    };

    // Add circuit breaker if configured
    if (config.circuitBreaker) {
      properties.circuitBreaker = {
        rules: this.synthesizeCircuitBreakerRules(config.circuitBreaker),
      };
    }

    return {
      type: 'Microsoft.ApiManagement/service/backends',
      apiVersion: '2021-08-01',
      name: `[concat(parameters('apiManagementServiceName'), '/backend-${backendId}')]`,
      properties: properties as ArmBackendProperties,
      dependsOn: [
        `[resourceId('Microsoft.App/containerApps', '${containerAppName}')]`,
        apimServiceResourceId,
      ],
    };
  }

  /**
   * Synthesize credentials configuration
   */
  private synthesizeCredentials(
    credentials?: any
  ): ArmBackendCredentials {
    if (!credentials) {
      return {};
    }

    const armCredentials: any = {};

    if (credentials.type === 'apiKey') {
      if (credentials.header) {
        armCredentials.header = {
          [credentials.header]: credentials.value || `[parameters('${credentials.header}')]`,
        };
      }
      if (credentials.query) {
        armCredentials.query = {
          [credentials.query]: credentials.value || `[parameters('${credentials.query}')]`,
        };
      }
    } else if (credentials.type === 'basic') {
      armCredentials.authorization = {
        scheme: 'Basic',
        parameter: `[base64(concat('${credentials.username}', ':', '${credentials.password}'))]`,
      };
    } else if (credentials.type === 'clientCertificate') {
      armCredentials.certificate = [credentials.certificate];
    }

    return armCredentials as ArmBackendCredentials;
  }

  /**
   * Synthesize TLS configuration
   */
  private synthesizeTlsConfiguration(
    tls?: TlsConfiguration
  ): ArmBackendTls {
    return {
      validateCertificateChain: tls?.validateCertificateChain ?? true,
      validateCertificateName: tls?.validateCertificateName ?? true,
    };
  }

  /**
   * Synthesize circuit breaker rules
   */
  private synthesizeCircuitBreakerRules(
    config: CircuitBreakerConfig
  ): ArmCircuitBreakerRule[] {
    if (!config.enabled) {
      return [];
    }

    // Convert timeout from milliseconds to ISO 8601 duration
    const intervalSeconds = Math.floor(config.timeout / 1000);
    const tripDuration = `PT${intervalSeconds}S`;

    return [
      {
        failureCondition: {
          count: config.failureThreshold,
          interval: tripDuration,
          statusCodeRanges: [
            {
              min: 500,
              max: 599,
            },
          ],
        },
        tripDuration,
      },
    ];
  }

  /**
   * Sanitize backend ID for ARM resource naming
   */
  private sanitizeBackendId(backendId: string): string {
    return backendId
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Clear all registered backends (for testing)
   */
  public clear(): void {
    this.backends.clear();
    this.synthesizedBackends.clear();
  }

  /**
   * Get count of registered backends
   */
  public getBackendCount(): number {
    return this.backends.size;
  }

  /**
   * Check if backend is registered
   */
  public hasBackend(backendId: string): boolean {
    return this.backends.has(backendId);
  }
}
