import { Construct, Resource } from '@atakora/lib';
import { DeploymentScope } from '@atakora/lib';
import type { ArmResource } from '@atakora/lib/src/core/resource';
import type {
  ArmApiManagementPolicyProps,
  ApiManagementPolicyProps,
  IService,
  IServiceApi,
  IServicePolicy,
} from './api-management-types';
import { PolicyFormat } from './api-management-types';

/**
 * L1 construct for API Management Policy.
 *
 * @remarks
 * Direct mapping to Microsoft.ApiManagement/service/policies or
 * Microsoft.ApiManagement/service/apis/policies ARM resource.
 * This is a child resource of either API Management service (global policy)
 * or API Management API (API-specific policy).
 *
 * **ARM Resource Type**: `Microsoft.ApiManagement/service/policies` or
 * `Microsoft.ApiManagement/service/apis/policies`
 * **API Version**: `2024-05-01`
 * **Deployment Scope**: ResourceGroup (as child resource)
 *
 * @example
 * Global policy:
 * ```typescript
 * const globalPolicy = new ArmApiManagementPolicy(apimService, 'GlobalPolicy', {
 *   parent: apimService,
 *   properties: {
 *     value: '<policies>...</policies>',
 *     format: PolicyFormat.XML
 *   }
 * });
 * ```
 *
 * @example
 * API-specific policy:
 * ```typescript
 * const apiPolicy = new ArmApiManagementPolicy(api, 'APIPolicy', {
 *   parent: api,
 *   properties: {
 *     value: '<policies>...</policies>',
 *     format: PolicyFormat.XML
 *   }
 * });
 * ```
 */
export class ArmApiManagementPolicy extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string;

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-05-01';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Parent resource.
   */
  public readonly parent: IService | IServiceApi;

  /**
   * Policy content (XML).
   */
  public readonly policyXml: string;

  /**
   * Policy format.
   */
  public readonly format: PolicyFormat;

  /**
   * Resource name (always 'policy').
   */
  public readonly name: string = 'policy';

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * Policy ID (alias for resourceId).
   */
  public readonly policyId: string;

  /**
   * Whether this is an API-level policy.
   */
  private readonly isApiPolicy: boolean;

  constructor(scope: Construct, id: string, props: ArmApiManagementPolicyProps) {
    super(scope, id);

    this.validateProps(props);

    this.parent = props.parent;
    this.policyXml = props.properties.value;
    this.format = props.properties.format ?? ('xml' as PolicyFormat);

    // Determine if this is an API-level policy or global policy
    this.isApiPolicy = this.isApiManagementApi(props.parent);

    // Set resource type based on parent
    this.resourceType = this.isApiPolicy
      ? 'Microsoft.ApiManagement/service/apis/policies'
      : 'Microsoft.ApiManagement/service/policies';

    // Build resource ID
    if (this.isApiPolicy) {
      const apiParent = props.parent as IServiceApi;
      this.resourceId = `${apiParent.apiId}/policies/policy`;
    } else {
      const serviceParent = props.parent as IService;
      this.resourceId = `${serviceParent.apiManagementId}/policies/policy`;
    }

    this.policyId = this.resourceId;
  }

  protected validateProps(props: ArmApiManagementPolicyProps): void {
    if (!props.properties.value || props.properties.value.trim() === '') {
      throw new Error('Policy XML content cannot be empty');
    }
  }

  /**
   * Type guard to check if parent is IServiceApi.
   */
  private isApiManagementApi(parent: any): parent is IServiceApi {
    return (
      parent &&
      typeof parent.apiName === 'string' &&
      typeof parent.path === 'string' &&
      typeof parent.apiId === 'string'
    );
  }

  public toArmTemplate(): ArmResource {
    const properties: any = {
      value: this.policyXml,
      format: this.format,
    };

    if (this.isApiPolicy) {
      const apiParent = this.parent as IServiceApi;
      return {
        type: this.resourceType,
        apiVersion: this.apiVersion,
        name: `${this.getServiceNameFromApi(apiParent)}/${apiParent.apiName}/policy`,
        properties,
        dependsOn: [apiParent.apiId],
      } as ArmResource;
    } else {
      const serviceParent = this.parent as IService;
      return {
        type: this.resourceType,
        apiVersion: this.apiVersion,
        name: `${serviceParent.serviceName}/policy`,
        properties,
        dependsOn: [serviceParent.apiManagementId],
      } as ArmResource;
    }
  }

  /**
   * Extract service name from API resource ID.
   */
  private getServiceNameFromApi(api: IServiceApi): string {
    // API ID format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ApiManagement/service/{serviceName}/apis/{apiName}
    const parts = api.apiId.split('/');
    const serviceIndex = parts.indexOf('service');
    if (serviceIndex !== -1 && serviceIndex + 1 < parts.length) {
      return parts[serviceIndex + 1];
    }
    throw new Error('Could not extract service name from API ID');
  }
}

/**
 * L2 construct for API Management Policy.
 *
 * @remarks
 * Intent-based API with sensible defaults.
 *
 * @example
 * Global policy:
 * ```typescript
 * const globalPolicy = new ApiManagementPolicy(apimService, 'GlobalPolicy', {
 *   parent: apimService,
 *   policyXml: `
 *     <policies>
 *       <inbound>
 *         <rate-limit calls="100" renewal-period="60" />
 *       </inbound>
 *       <backend>
 *         <forward-request />
 *       </backend>
 *       <outbound />
 *       <on-error />
 *     </policies>
 *   `
 * });
 * ```
 *
 * @example
 * API-specific policy:
 * ```typescript
 * const apiPolicy = new ApiManagementPolicy(api, 'APIPolicy', {
 *   parent: api,
 *   policyXml: `
 *     <policies>
 *       <inbound>
 *         <set-backend-service base-url="https://backend.example.com" />
 *       </inbound>
 *       <backend>
 *         <forward-request />
 *       </backend>
 *       <outbound />
 *       <on-error />
 *     </policies>
 *   `
 * });
 * ```
 */
export class ApiManagementPolicy extends Construct implements IServicePolicy {
  private readonly armPolicy: ArmApiManagementPolicy;

  public readonly policyXml: string;
  public readonly policyId: string;

  constructor(scope: Construct, id: string, props: ApiManagementPolicyProps) {
    super(scope, id);

    this.policyXml = props.policyXml;

    this.armPolicy = new ArmApiManagementPolicy(scope, `${id}-Resource`, {
      parent: props.parent,
      properties: {
        value: props.policyXml,
        format: props.format ?? ('xml' as PolicyFormat),
      },
    });

    this.policyId = this.armPolicy.policyId;
  }
}
