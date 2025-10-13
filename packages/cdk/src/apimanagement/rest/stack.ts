import { Construct } from '@atakora/cdk';
import type { IService } from '../core/types';
import { ApiManagementApi } from '../core/api';
import type { IRestOperation } from './operation';

/**
 * Configuration for a single API operation.
 */
export interface ApiOperationConfig {
  /**
   * REST operation definition.
   */
  operation: IRestOperation;

  /**
   * Backend configuration override for this operation.
   * If not provided, uses the API-level backend configuration.
   */
  backendUrl?: string;
}

/**
 * Configuration for an API.
 */
export interface ApiConfig {
  /**
   * Display name for the API.
   */
  displayName: string;

  /**
   * Description of the API.
   */
  description?: string;

  /**
   * Base path for the API (e.g., 'api', 'v1', 'backend').
   */
  path: string;

  /**
   * Backend service URL for all operations in this API.
   */
  serviceUrl: string;

  /**
   * Operations for this API.
   */
  operations: ApiOperationConfig[];

  /**
   * API version string.
   */
  apiVersion?: string;
}

/**
 * Properties for RestApiStack.
 */
export interface RestApiStackProps {
  /**
   * Parent API Management service.
   */
  apiManagementService: IService;

  /**
   * API configurations.
   */
  apis: ApiConfig[];
}

/**
 * REST API Stack
 *
 * @remarks
 * Orchestrates the creation of REST APIs and operations within an API Management service.
 * Provides a high-level abstraction for managing REST API infrastructure with type-safe operation definitions.
 *
 * Features:
 * - Automatic API creation from REST operation definitions
 * - Type-safe operation configuration
 * - Multiple API management
 * - Operation lookup by ID
 * - Deployment configuration export
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { RestApiStack } from '@atakora/cdk/apimanagement/rest';
 * import { get, post } from '@atakora/cdk/apimanagement/rest';
 *
 * const getUserOp = get('/users/{id}')
 *   .operationId('getUser')
 *   .summary('Get user by ID')
 *   .pathParams<{ id: string }>({ schema: { type: 'object', properties: { id: { type: 'string' } } } })
 *   .responses({ 200: { description: 'User found' } })
 *   .build();
 *
 * const apiStack = new RestApiStack(resourceGroup, 'RestAPI', {
 *   apiManagementService: apim,
 *   apis: [
 *     {
 *       displayName: 'User API',
 *       path: 'api',
 *       serviceUrl: 'https://backend.azurewebsites.net',
 *       operations: [
 *         { operation: getUserOp }
 *       ]
 *     }
 *   ]
 * });
 *
 * // Get a specific operation
 * const userOp = apiStack.getOperation('getUser');
 * ```
 *
 * @example
 * Multiple APIs:
 * ```typescript
 * const apiStack = new RestApiStack(resourceGroup, 'RestAPI', {
 *   apiManagementService: apim,
 *   apis: [
 *     {
 *       displayName: 'Public API',
 *       path: 'api/v1',
 *       serviceUrl: 'https://public-backend.azurewebsites.net',
 *       operations: [
 *         { operation: listUsersOp },
 *         { operation: getUserOp }
 *       ]
 *     },
 *     {
 *       displayName: 'Admin API',
 *       path: 'admin',
 *       serviceUrl: 'https://admin-backend.azurewebsites.net',
 *       operations: [
 *         { operation: createUserOp },
 *         { operation: deleteUserOp }
 *       ]
 *     }
 *   ]
 * });
 * ```
 */
export class RestApiStack {
  /**
   * The API Management service.
   */
  public readonly apiManagementService: IService;

  /**
   * Map of APIs by display name.
   */
  public readonly apis: Map<string, ApiManagementApi> = new Map();

  /**
   * Map of operations by operation ID.
   */
  public readonly operations: Map<string, ApiOperationConfig> = new Map();

  /**
   * Map of operations by API name.
   */
  private readonly operationsByApi: Map<string, ApiOperationConfig[]> = new Map();

  /**
   * Creates a new RestApiStack.
   *
   * @param scope - Parent construct
   * @param id - Unique identifier for this stack
   * @param props - REST API stack properties
   *
   * @example
   * ```typescript
   * const apiStack = new RestApiStack(resourceGroup, 'RestAPI', {
   *   apiManagementService: apim,
   *   apis: [
   *     {
   *       displayName: 'Backend API',
   *       path: 'api',
   *       serviceUrl: 'https://backend.azurewebsites.net',
   *       operations: []
   *     }
   *   ]
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: RestApiStackProps) {
    this.apiManagementService = props.apiManagementService;

    // Create APIs
    props.apis.forEach((apiConfig, index) => {
      const api = new ApiManagementApi(scope, `${id}-${this.sanitizeName(apiConfig.displayName)}`, {
        apiManagementService: props.apiManagementService,
        displayName: apiConfig.displayName,
        description: apiConfig.description,
        path: apiConfig.path,
        serviceUrl: apiConfig.serviceUrl,
      });

      this.apis.set(apiConfig.displayName, api);

      // Store operations for this API
      this.operationsByApi.set(apiConfig.displayName, apiConfig.operations);

      // Index operations by operation ID
      apiConfig.operations.forEach((opConfig) => {
        if (opConfig.operation.operationId) {
          this.operations.set(opConfig.operation.operationId, opConfig);
        }
      });
    });
  }

  /**
   * Get an API by display name.
   *
   * @param name - API display name
   * @returns The API if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const userApi = apiStack.getApi('User API');
   * if (userApi) {
   *   console.log('API Path:', userApi.path);
   * }
   * ```
   */
  public getApi(name: string): ApiManagementApi | undefined {
    return this.apis.get(name);
  }

  /**
   * Get an operation by operation ID.
   *
   * @param operationId - Operation ID from the REST operation definition
   * @returns The operation configuration if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const getUserOp = apiStack.getOperation('getUser');
   * if (getUserOp) {
   *   console.log('Operation:', getUserOp.operation.summary);
   * }
   * ```
   */
  public getOperation(operationId: string): ApiOperationConfig | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Get all operations for a specific API.
   *
   * @param apiName - API display name
   * @returns Array of operation configurations for the API
   *
   * @example
   * ```typescript
   * const userApiOps = apiStack.getOperationsByApi('User API');
   * console.log(`Found ${userApiOps.length} operations`);
   * ```
   */
  public getOperationsByApi(apiName: string): ApiOperationConfig[] {
    return this.operationsByApi.get(apiName) || [];
  }

  /**
   * Get all API names.
   *
   * @returns Array of API display names
   *
   * @example
   * ```typescript
   * const apiNames = apiStack.getApiNames();
   * console.log('Available APIs:', apiNames);
   * ```
   */
  public getApiNames(): string[] {
    return Array.from(this.apis.keys());
  }

  /**
   * Get all operation IDs.
   *
   * @returns Array of operation IDs
   *
   * @example
   * ```typescript
   * const operationIds = apiStack.getOperationIds();
   * console.log('Available operations:', operationIds);
   * ```
   */
  public getOperationIds(): string[] {
    return Array.from(this.operations.keys());
  }

  /**
   * Get the full deployed configuration (matches infrastructure output structure).
   *
   * @returns Deployment configuration object
   *
   * @example
   * ```typescript
   * const config = apiStack.getDeployedConfig();
   * console.log('API infrastructure:', config);
   * ```
   */
  public getDeployedConfig() {
    return {
      apiManagementService: {
        name: this.apiManagementService.serviceName,
        id: this.apiManagementService.apiManagementId,
        gatewayUrl: this.apiManagementService.gatewayUrl,
        managementUrl: this.apiManagementService.managementUrl,
      },
      apis: Array.from(this.apis.entries()).map(([name, api]) => ({
        name,
        apiName: api.apiName,
        path: api.path,
        apiId: api.apiId,
        operations: this.getOperationsByApi(name).map((opConfig) => ({
          operationId: opConfig.operation.operationId,
          method: opConfig.operation.method,
          path: opConfig.operation.path,
          summary: opConfig.operation.summary,
          backendUrl: opConfig.backendUrl,
        })),
      })),
      totalOperations: this.operations.size,
    };
  }

  /**
   * Sanitizes a name for use in construct IDs.
   *
   * @param name - Name to sanitize
   * @returns Sanitized name
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
