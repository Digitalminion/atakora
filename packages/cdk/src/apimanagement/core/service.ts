import { Construct, constructIdToPurpose as utilConstructIdToPurpose } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { IGrantable, IGrantResult, WellKnownRoleIds } from '@atakora/lib';
import { ArmService } from './arm';
import type {
  ServiceProps,
  IService,
  ApiManagementSkuName,
  VirtualNetworkType,
  HostnameConfiguration,
  AdditionalLocation,
} from './types';

/**
 * L2 construct for Azure API Management.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates API Management service name from naming context
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Secure defaults: Disables legacy TLS protocols, enables system identity
 * - SKU defaults: Developer for non-prod, Premium for prod (based on environment)
 *
 * **ARM Resource Type**: `Microsoft.ApiManagement/service`
 * **API Version**: `2024-05-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { ApiManagement } from '@atakora/lib';
 *
 * const apim = new ApiManagement(resourceGroup, 'Gateway', {
 *   publisherName: 'Avient AuthR',
 *   publisherEmail: 'admin@avient.com'
 * });
 * ```
 *
 * @example
 * With VNet integration:
 * ```typescript
 * const apim = new ApiManagement(resourceGroup, 'Gateway', {
 *   publisherName: 'Avient AuthR',
 *   publisherEmail: 'admin@avient.com',
 *   sku: ApiManagementSkuName.PREMIUM,
 *   capacity: 2,
 *   virtualNetworkType: VirtualNetworkType.EXTERNAL,
 *   subnetId: subnet.subnetId
 * });
 * ```
 *
 * @example
 * Multi-region Premium deployment:
 * ```typescript
 * const apim = new ApiManagement(resourceGroup, 'Gateway', {
 *   publisherName: 'Avient AuthR',
 *   publisherEmail: 'admin@avient.com',
 *   sku: ApiManagementSkuName.PREMIUM,
 *   capacity: 2,
 *   additionalLocations: [
 *     {
 *       location: 'westus2',
 *       sku: { name: ApiManagementSkuName.PREMIUM, capacity: 1 }
 *     }
 *   ]
 * });
 * ```
 */
export class Service extends Construct implements IService {
  /**
   * Counter for generating unique grant IDs
   */
  private grantCounter = 0;

  /**
   * Underlying L1 construct.
   */
  private readonly armApiManagement: ArmService;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the API Management service.
   */
  public readonly serviceName: string;

  /**
   * Location of the API Management service.
   */
  public readonly location: string;

  /**
   * Resource group name where the API Management service is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the API Management service.
   */
  public readonly apiManagementId: string;

  /**
   * ARM resource ID (required for grant methods).
   */
  public readonly resourceId: string;

  /**
   * Gateway URL.
   */
  public readonly gatewayUrl: string;

  /**
   * Management API URL.
   */
  public readonly managementUrl: string;

  /**
   * Tags applied to the API Management service (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * SKU name.
   */
  public readonly sku: ApiManagementSkuName;

  /**
   * Capacity/scale units.
   */
  public readonly capacity: number;

  /**
   * Creates a new ApiManagement construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - API Management service properties (publisherName and publisherEmail required)
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   * @throws {Error} If publisherName or publisherEmail is not provided
   *
   * @example
   * ```typescript
   * const apim = new ApiManagement(resourceGroup, 'Gateway', {
   *   publisherName: 'Avient AuthR',
   *   publisherEmail: 'admin@avient.com',
   *   sku: ApiManagementSkuName.PREMIUM,
   *   tags: { purpose: 'api-gateway' }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: ServiceProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided service name
    this.serviceName = this.resolveServiceName(id, props);

    // Default location to resource group's location or use provided
    this.location = props.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Determine SKU based on environment context or use provided
    this.sku = this.resolveSku(props);

    // Determine capacity based on SKU
    this.capacity = this.resolveCapacity(this.sku, props);

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props.tags,
    };

    // Resolve notification sender email
    const notificationSenderEmail =
      props.notificationSenderEmail ?? this.generateNotificationEmail(props.publisherEmail);

    // Build custom properties for security (disable legacy TLS)
    const customProperties = this.buildSecurityProperties(props);

    // Create underlying L1 resource
    this.armApiManagement = new ArmService(scope, `${id}-Resource`, {
      serviceName: this.serviceName,
      location: this.location,
      sku: {
        name: this.sku,
        capacity: this.capacity,
      },
      publisherName: props.publisherName,
      publisherEmail: props.publisherEmail,
      identity:
        props.enableSystemIdentity !== false
          ? {
              type: 'SystemAssigned',
            }
          : undefined,
      properties: {
        notificationSenderEmail,
        hostnameConfigurations: props.hostnameConfigurations,
        virtualNetworkType: props.virtualNetworkType,
        virtualNetworkConfiguration: props.subnetId
          ? {
              subnetResourceId: props.subnetId,
            }
          : undefined,
        additionalLocations: props.additionalLocations,
        customProperties,
        publicNetworkAccess: props.publicNetworkAccess ?? 'Enabled',
      },
      tags: this.tags,
    });

    // Get computed properties from L1
    this.apiManagementId = this.armApiManagement.apiManagementId;
    this.resourceId = this.apiManagementId; // Alias for grant methods
    this.gatewayUrl = this.armApiManagement.gatewayUrl;
    this.managementUrl = this.armApiManagement.managementUrl;
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'ApiManagement must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  /**
   * Resolves the API Management service name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - API Management properties
   * @returns Resolved service name
   *
   * @remarks
   * API Management service names must:
   * - Be 1-50 characters
   * - Start with a letter
   * - End with alphanumeric
   * - Contain only letters, numbers, and hyphens
   * - Be globally unique across Azure
   */
  private resolveServiceName(id: string, props: ServiceProps): string {
    // If name provided explicitly, use it
    if (props.serviceName) {
      return props.serviceName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('apim', purpose);
    }

    // Fallback: construct a basic name from ID
    return `apim-${id.toLowerCase()}`;
  }

  /**
   * Resolves the SKU based on environment context or props.
   *
   * @param props - API Management properties
   * @returns Resolved SKU name
   *
   * @remarks
   * Defaults to Developer for non-prod, Premium for prod (based on environment context).
   */
  private resolveSku(props: ServiceProps): ApiManagementSkuName {
    // If SKU provided explicitly, use it
    if (props.sku) {
      return props.sku;
    }

    // Try to determine from environment context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack && (subscriptionStack as any).environment) {
      const env = (subscriptionStack as any).environment;
      if (env === 'prod' || env === 'production') {
        return 'Premium' as ApiManagementSkuName;
      }
    }

    // Default to Developer for non-prod
    return 'Developer' as ApiManagementSkuName;
  }

  /**
   * Resolves the capacity based on SKU and props.
   *
   * @param sku - SKU name
   * @param props - API Management properties
   * @returns Resolved capacity
   */
  private resolveCapacity(sku: ApiManagementSkuName, props: ServiceProps): number {
    // If capacity provided explicitly, use it
    if (props.capacity) {
      return props.capacity;
    }

    // Default capacity based on SKU
    if (sku === 'Premium') {
      return 2; // Default 2 units for Premium for HA
    }

    return 1; // Default 1 unit for all other SKUs
  }

  /**
   * Generates notification sender email from publisher email domain.
   *
   * @param publisherEmail - Publisher email
   * @returns Notification sender email
   */
  private generateNotificationEmail(publisherEmail: string): string {
    const domain = publisherEmail.split('@')[1];
    return `noreply@${domain}`;
  }

  /**
   * Builds custom properties for security settings.
   *
   * @param props - API Management properties
   * @returns Custom properties object
   */
  private buildSecurityProperties(props: ServiceProps): Record<string, string> | undefined {
    // If disableLegacyTls is explicitly false, don't set custom properties
    if (props.disableLegacyTls === false) {
      return undefined;
    }

    // Default: disable TLS 1.0, 1.1, and SSL 3.0 for security
    return {
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls10': 'false',
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls11': 'false',
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Ssl30': 'false',
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls10': 'false',
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls11': 'false',
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Ssl30': 'false',
    };
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }

  // ============================================================
  // Grant Methods
  // ============================================================

  /**
   * Grant full management access to the API Management service and APIs.
   *
   * @remarks
   * Provides complete control over the API Management service including API definitions,
   * policies, backends, products, and subscriptions.
   *
   * **Permissions**:
   * - Manage service configuration
   * - Create, update, delete APIs
   * - Manage policies and backends
   * - Configure products and subscriptions
   *
   * **Common Use Cases**:
   * - API administrators
   * - DevOps automation accounts
   * - Full lifecycle management
   *
   * @param grantable - Identity to grant permissions to
   * @returns Grant result with the created role assignment
   *
   * @example
   * Grant a managed identity full API management access:
   * ```typescript
   * const apim = new Service(resourceGroup, 'Gateway', {
   *   publisherName: 'Avient',
   *   publisherEmail: 'admin@avient.com'
   * });
   *
   * const identity = new UserAssignedIdentity(resourceGroup, 'DevOps');
   * apim.grantServiceContributor(identity);
   * ```
   */
  public grantServiceContributor(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.API_MANAGEMENT_SERVICE_CONTRIBUTOR,
      `Full management access to ${this.serviceName}`
    );
  }

  /**
   * Grant service management access without API definition permissions.
   *
   * @remarks
   * Allows managing the service infrastructure (scaling, networking, certificates)
   * without the ability to create or modify APIs.
   *
   * **Permissions**:
   * - Manage service configuration
   * - Scale service
   * - Configure networking and VPN
   * - Manage certificates
   *
   * **Limitations**:
   * - Cannot create or modify APIs
   * - Cannot manage policies
   * - Cannot manage subscriptions
   *
   * **Common Use Cases**:
   * - Infrastructure operators
   * - Automated scaling systems
   * - Network administrators
   *
   * @param grantable - Identity to grant permissions to
   * @returns Grant result with the created role assignment
   *
   * @example
   * Grant infrastructure team operator access:
   * ```typescript
   * const infraTeam = UserAssignedIdentity.fromId(stack, 'InfraTeam', 'team-identity-id');
   * apim.grantServiceOperator(infraTeam);
   * ```
   */
  public grantServiceOperator(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.API_MANAGEMENT_SERVICE_OPERATOR,
      `Service operations access to ${this.serviceName}`
    );
  }

  /**
   * Grant read-only access to the API Management service.
   *
   * @remarks
   * Provides view-only access to service configuration, APIs, policies, and metrics.
   *
   * **Permissions**:
   * - View service configuration
   * - View APIs and operations
   * - View policies and backends
   * - View products and subscriptions
   * - Read metrics and diagnostics
   *
   * **Common Use Cases**:
   * - Monitoring systems
   * - Auditing and compliance
   * - Read-only dashboards
   * - Documentation generation
   *
   * @param grantable - Identity to grant permissions to
   * @returns Grant result with the created role assignment
   *
   * @example
   * Grant monitoring system read access:
   * ```typescript
   * const monitor = new VirtualMachine(stack, 'Monitor', {});
   * apim.grantServiceReader(monitor);
   * ```
   */
  public grantServiceReader(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.API_MANAGEMENT_SERVICE_READER,
      `Read access to ${this.serviceName}`
    );
  }

  /**
   * Grant developer portal content editor permissions.
   *
   * @remarks
   * Allows editing and publishing developer portal content and customizations.
   *
   * **Permissions**:
   * - Edit portal content
   * - Customize portal appearance
   * - Publish portal changes
   * - Manage portal templates
   *
   * **Common Use Cases**:
   * - Developer portal administrators
   * - Content managers
   * - Marketing teams customizing portal
   *
   * @param grantable - Identity to grant permissions to
   * @returns Grant result with the created role assignment
   *
   * @example
   * Grant content team portal editing access:
   * ```typescript
   * const contentTeam = UserAssignedIdentity.fromId(stack, 'Content', 'content-identity-id');
   * apim.grantDeveloperPortalEditor(contentTeam);
   * ```
   */
  public grantDeveloperPortalEditor(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.API_MANAGEMENT_DEVELOPER_PORTAL_CONTENT_EDITOR,
      `Developer portal editing access to ${this.serviceName}`
    );
  }

  /**
   * Internal helper to create role assignments for grant methods.
   * Uses composition pattern instead of extending GrantableResource.
   */
  protected grant(
    grantable: IGrantable,
    roleDefinitionId: string,
    description?: string
  ): IGrantResult {
    // Use require to avoid circular dependency issues
    const RoleAssignment = require('@atakora/lib/authorization').RoleAssignment;
    const GrantResult = require('@atakora/lib/authorization').GrantResult;

    const roleAssignment = new RoleAssignment(this, `Grant${this.grantCounter++}`, {
      scope: this.resourceId,
      roleDefinitionId,
      principalId: grantable.principalId,
      principalType: grantable.principalType,
      tenantId: grantable.tenantId,
      description
    });

    return new GrantResult(roleAssignment, roleDefinitionId, grantable, this.resourceId);
  }
}
