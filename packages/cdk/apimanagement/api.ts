import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type {
  ArmApiManagementApiProps,
  ApiManagementApiProps,
  IService,
  IServiceApi,
  SubscriptionKeyParameterNames,
} from './api-management-types';
import { ApiProtocol, ApiType } from './api-management-types';

/**
 * L1 construct for API Management API.
 *
 * @remarks
 * Direct mapping to Microsoft.ApiManagement/service/apis ARM resource.
 * This is a child resource of API Management service.
 *
 * **ARM Resource Type**: `Microsoft.ApiManagement/service/apis`
 * **API Version**: `2024-05-01`
 * **Deployment Scope**: ResourceGroup (as child resource)
 *
 * @example
 * ```typescript
 * const api = new ArmApiManagementApi(apimService, 'BackendAPI', {
 *   apiManagementService: apimService,
 *   apiName: 'authr-api',
 *   properties: {
 *     displayName: 'AuthR Backend API',
 *     path: 'api',
 *     serviceUrl: 'https://backend.azurewebsites.net',
 *     protocols: [ApiProtocol.HTTPS]
 *   }
 * });
 * ```
 */
export class ArmApiManagementApi extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.ApiManagement/service/apis';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-05-01';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Parent API Management service.
   */
  public readonly apiManagementService: IService;

  /**
   * API name.
   */
  public readonly apiName: string;

  /**
   * Resource name (same as apiName).
   */
  public readonly name: string;

  /**
   * Display name.
   */
  public readonly displayName: string;

  /**
   * Description.
   */
  public readonly description?: string;

  /**
   * Backend service URL.
   */
  public readonly serviceUrl?: string;

  /**
   * API path.
   */
  public readonly path: string;

  /**
   * Protocols.
   */
  public readonly protocols?: readonly ApiProtocol[];

  /**
   * API type.
   */
  public readonly type?: ApiType;

  /**
   * Subscription required.
   */
  public readonly subscriptionRequired?: boolean;

  /**
   * Subscription key parameter names.
   */
  public readonly subscriptionKeyParameterNames?: SubscriptionKeyParameterNames;

  /**
   * API version string.
   */
  public readonly apiVersionStr?: string;

  /**
   * API version set ID.
   */
  public readonly apiVersionSetId?: string;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * API ID (alias for resourceId).
   */
  public readonly apiId: string;

  constructor(scope: Construct, id: string, props: ArmApiManagementApiProps) {
    super(scope, id);

    this.validateProps(props);

    this.apiManagementService = props.apiManagementService;
    this.apiName = props.apiName;
    this.name = props.apiName;
    this.displayName = props.properties.displayName;
    this.description = props.properties.description;
    this.serviceUrl = props.properties.serviceUrl;
    this.path = props.properties.path;
    this.protocols = props.properties.protocols;
    this.type = props.properties.type;
    this.subscriptionRequired = props.properties.subscriptionRequired;
    this.subscriptionKeyParameterNames = props.properties.subscriptionKeyParameterNames;
    this.apiVersionStr = props.properties.apiVersion;
    this.apiVersionSetId = props.properties.apiVersionSetId;

    this.resourceId = `${this.apiManagementService.apiManagementId}/apis/${this.apiName}`;
    this.apiId = this.resourceId;
  }

  protected validateProps(props: ArmApiManagementApiProps): void {
    if (!props.apiName || props.apiName.trim() === '') {
      throw new Error('API name cannot be empty');
    }

    if (!props.properties.displayName || props.properties.displayName.trim() === '') {
      throw new Error('Display name cannot be empty');
    }

    if (!props.properties.path || props.properties.path.trim() === '') {
      throw new Error('Path cannot be empty');
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: any = {
      displayName: this.displayName,
      path: this.path,
    };

    if (this.description) {
      properties.description = this.description;
    }

    if (this.serviceUrl) {
      properties.serviceUrl = this.serviceUrl;
    }

    if (this.protocols && this.protocols.length > 0) {
      properties.protocols = [...this.protocols];
    }

    if (this.type) {
      properties.type = this.type;
    }

    if (this.subscriptionRequired !== undefined) {
      properties.subscriptionRequired = this.subscriptionRequired;
    }

    if (this.subscriptionKeyParameterNames) {
      properties.subscriptionKeyParameterNames = {
        ...(this.subscriptionKeyParameterNames.header && {
          header: this.subscriptionKeyParameterNames.header,
        }),
        ...(this.subscriptionKeyParameterNames.query && {
          query: this.subscriptionKeyParameterNames.query,
        }),
      };
    }

    if (this.apiVersionStr) {
      properties.apiVersion = this.apiVersionStr;
    }

    if (this.apiVersionSetId) {
      properties.apiVersionSetId = this.apiVersionSetId;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.apiManagementService.serviceName}/${this.apiName}`,
      properties,
      dependsOn: [this.apiManagementService.apiManagementId],
    } as ArmResource;
  }
}

/**
 * L2 construct for API Management API.
 *
 * @remarks
 * Intent-based API with sensible defaults.
 *
 * @example
 * ```typescript
 * const api = new ApiManagementApi(apimService, 'BackendAPI', {
 *   apiManagementService: apimService,
 *   displayName: 'AuthR Backend API',
 *   serviceUrl: 'https://backend.azurewebsites.net'
 * });
 * ```
 */
export class ApiManagementApi extends Construct implements IServiceApi {
  private readonly armApi: ArmApiManagementApi;

  public readonly apiName: string;
  public readonly path: string;
  public readonly apiId: string;

  constructor(scope: Construct, id: string, props: ApiManagementApiProps) {
    super(scope, id);

    this.apiName = props.apiName ?? this.sanitizeApiName(id);
    this.path = props.path ?? this.apiName;

    this.armApi = new ArmApiManagementApi(scope, `${id}-Resource`, {
      apiManagementService: props.apiManagementService,
      apiName: this.apiName,
      properties: {
        displayName: props.displayName,
        description: props.description,
        serviceUrl: props.serviceUrl,
        path: this.path,
        protocols: props.protocols ?? [ApiProtocol.HTTPS],
        type: props.type ?? ApiType.HTTP,
        subscriptionRequired: props.subscriptionRequired ?? true,
        subscriptionKeyParameterNames: props.subscriptionKeyParameterNames ?? {
          header: 'Ocp-Apim-Subscription-Key',
          query: 'subscription-key',
        },
      },
    });

    this.apiId = this.armApi.apiId;
  }

  private sanitizeApiName(id: string): string {
    return id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
}
