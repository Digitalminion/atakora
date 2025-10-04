import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type {
  ArmApiManagementProps,
  ApiManagementSku,
  ApiManagementIdentity,
  HostnameConfiguration,
  VirtualNetworkType,
  VirtualNetworkConfiguration,
  AdditionalLocation,
} from './types';

/**
 * L1 construct for Azure API Management.
 *
 * @remarks
 * Direct mapping to Microsoft.ApiManagement/service ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.ApiManagement/service`
 * **API Version**: `2024-05-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link ApiManagement} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmApiManagement, ApiManagementSkuName } from '@azure-arm-priv/lib';
 *
 * const apim = new ArmApiManagement(resourceGroup, 'APIM', {
 *   serviceName: 'apim-colorai-nonprod',
 *   location: 'eastus',
 *   sku: {
 *     name: ApiManagementSkuName.DEVELOPER,
 *     capacity: 1
 *   },
 *   publisherName: 'Avient ColorAI',
 *   publisherEmail: 'admin@avient.com',
 *   identity: {
 *     type: 'SystemAssigned'
 *   }
 * });
 * ```
 *
 * @example
 * With VNet integration:
 * ```typescript
 * const apim = new ArmApiManagement(resourceGroup, 'APIM', {
 *   serviceName: 'apim-colorai-prod',
 *   location: 'eastus',
 *   sku: {
 *     name: ApiManagementSkuName.PREMIUM,
 *     capacity: 2
 *   },
 *   publisherName: 'Avient ColorAI',
 *   publisherEmail: 'admin@avient.com',
 *   identity: {
 *     type: 'SystemAssigned'
 *   },
 *   properties: {
 *     virtualNetworkType: VirtualNetworkType.EXTERNAL,
 *     virtualNetworkConfiguration: {
 *       subnetResourceId: subnet.subnetId
 *     }
 *   }
 * });
 * ```
 */
export class ArmApiManagement extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.ApiManagement/service';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-05-01';

  /**
   * Deployment scope for API Management.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the API Management service.
   */
  public readonly serviceName: string;

  /**
   * Resource name (same as serviceName).
   */
  public readonly name: string;

  /**
   * Azure region where the API Management service is located.
   */
  public readonly location: string;

  /**
   * SKU configuration.
   */
  public readonly sku: ApiManagementSku;

  /**
   * Publisher name.
   */
  public readonly publisherName: string;

  /**
   * Publisher email.
   */
  public readonly publisherEmail: string;

  /**
   * Managed identity configuration.
   */
  public readonly identity?: ApiManagementIdentity;

  /**
   * Notification sender email.
   */
  public readonly notificationSenderEmail?: string;

  /**
   * Hostname configurations.
   */
  public readonly hostnameConfigurations?: readonly HostnameConfiguration[];

  /**
   * Virtual network type.
   */
  public readonly virtualNetworkType?: VirtualNetworkType;

  /**
   * Virtual network configuration.
   */
  public readonly virtualNetworkConfiguration?: VirtualNetworkConfiguration;

  /**
   * Additional locations for multi-region deployment.
   */
  public readonly additionalLocations?: readonly AdditionalLocation[];

  /**
   * Custom properties for security and protocol settings.
   */
  public readonly customProperties?: Record<string, string>;

  /**
   * Enable client certificate on gateway.
   */
  public readonly enableClientCertificate?: boolean;

  /**
   * Disable gateway.
   */
  public readonly disableGateway?: boolean;

  /**
   * Public network access setting.
   */
  public readonly publicNetworkAccess?: 'Enabled' | 'Disabled';

  /**
   * Restore from soft-deleted service.
   */
  public readonly restore?: boolean;

  /**
   * Tags applied to the API Management service.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ApiManagement/service/{serviceName}`
   */
  public readonly resourceId: string;

  /**
   * API Management service resource ID (alias for resourceId).
   */
  public readonly apiManagementId: string;

  /**
   * Gateway URL (computed after deployment).
   *
   * @remarks
   * Format: `https://{serviceName}.azure-api.net`
   */
  public readonly gatewayUrl: string;

  /**
   * Management API URL (computed after deployment).
   *
   * @remarks
   * Format: `https://{serviceName}.management.azure-api.net`
   */
  public readonly managementUrl: string;

  /**
   * Creates a new ArmApiManagement construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - API Management service properties
   *
   * @throws {Error} If serviceName is invalid
   * @throws {Error} If location is empty
   * @throws {Error} If SKU, publisherName, or publisherEmail is not provided
   */
  constructor(scope: Construct, id: string, props: ArmApiManagementProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.serviceName = props.serviceName;
    this.name = props.serviceName;
    this.location = props.location;
    this.sku = props.sku;
    this.publisherName = props.publisherName;
    this.publisherEmail = props.publisherEmail;
    this.identity = props.identity;
    this.notificationSenderEmail = props.properties?.notificationSenderEmail;
    this.hostnameConfigurations = props.properties?.hostnameConfigurations;
    this.virtualNetworkType = props.properties?.virtualNetworkType;
    this.virtualNetworkConfiguration = props.properties?.virtualNetworkConfiguration;
    this.additionalLocations = props.properties?.additionalLocations;
    this.customProperties = props.properties?.customProperties;
    this.enableClientCertificate = props.properties?.enableClientCertificate;
    this.disableGateway = props.properties?.disableGateway;
    this.publicNetworkAccess = props.properties?.publicNetworkAccess;
    this.restore = props.properties?.restore;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ApiManagement/service/${this.serviceName}`;
    this.apiManagementId = this.resourceId;

    // Compute URLs (these will be available after deployment)
    this.gatewayUrl = `https://${this.serviceName}.azure-api.net`;
    this.managementUrl = `https://${this.serviceName}.management.azure-api.net`;
  }

  /**
   * Validates API Management properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmApiManagementProps): void {
    // Validate service name
    if (!props.serviceName || props.serviceName.trim() === '') {
      throw new Error('API Management service name cannot be empty');
    }

    if (props.serviceName.length < 1 || props.serviceName.length > 50) {
      throw new Error(
        `API Management service name must be 1-50 characters (got ${props.serviceName.length})`
      );
    }

    // Validate name pattern: ^[a-zA-Z][a-zA-Z0-9-]{0,48}[a-zA-Z0-9]$
    const namePattern = /^[a-zA-Z][a-zA-Z0-9-]{0,48}[a-zA-Z0-9]$/;
    if (!namePattern.test(props.serviceName)) {
      throw new Error(
        `API Management service name must start with a letter, end with alphanumeric, and contain only letters, numbers, and hyphens (got: ${props.serviceName})`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate SKU
    if (!props.sku || !props.sku.name) {
      throw new Error('SKU must be provided');
    }

    if (!props.sku.capacity || props.sku.capacity < 1) {
      throw new Error('SKU capacity must be at least 1');
    }

    // Validate publisher name
    if (!props.publisherName || props.publisherName.trim() === '') {
      throw new Error('Publisher name must be provided');
    }

    // Validate publisher email
    if (!props.publisherEmail || props.publisherEmail.trim() === '') {
      throw new Error('Publisher email must be provided');
    }

    // Basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(props.publisherEmail)) {
      throw new Error(`Publisher email must be a valid email address (got: ${props.publisherEmail})`);
    }

    // Validate VNet configuration if provided
    if (
      props.properties?.virtualNetworkType &&
      props.properties.virtualNetworkType !== 'None' &&
      !props.properties.virtualNetworkConfiguration?.subnetResourceId
    ) {
      throw new Error(
        'Virtual network configuration with subnet resource ID is required when virtualNetworkType is External or Internal'
      );
    }
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   * This will be implemented by Grace's synthesis pipeline.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): object {
    const properties: any = {
      publisherName: this.publisherName,
      publisherEmail: this.publisherEmail,
    };

    // Add optional properties
    if (this.notificationSenderEmail) {
      properties.notificationSenderEmail = this.notificationSenderEmail;
    }

    if (this.hostnameConfigurations && this.hostnameConfigurations.length > 0) {
      properties.hostnameConfigurations = this.hostnameConfigurations.map((config) => ({
        type: config.type,
        hostName: config.hostName,
        ...(config.defaultSslBinding !== undefined && {
          defaultSslBinding: config.defaultSslBinding,
        }),
        ...(config.negotiateClientCertificate !== undefined && {
          negotiateClientCertificate: config.negotiateClientCertificate,
        }),
        ...(config.keyVaultId && { keyVaultId: config.keyVaultId }),
        ...(config.certificatePassword && { certificatePassword: config.certificatePassword }),
      }));
    }

    if (this.virtualNetworkType) {
      properties.virtualNetworkType = this.virtualNetworkType;
    }

    if (this.virtualNetworkConfiguration) {
      properties.virtualNetworkConfiguration = {
        subnetResourceId: this.virtualNetworkConfiguration.subnetResourceId,
      };
    }

    if (this.additionalLocations && this.additionalLocations.length > 0) {
      properties.additionalLocations = this.additionalLocations.map((location) => ({
        location: location.location,
        sku: {
          name: location.sku.name,
          capacity: location.sku.capacity,
        },
        ...(location.virtualNetworkConfiguration && {
          virtualNetworkConfiguration: {
            subnetResourceId: location.virtualNetworkConfiguration.subnetResourceId,
          },
        }),
        ...(location.publicIpAddressId && { publicIpAddressId: location.publicIpAddressId }),
      }));
    }

    if (this.customProperties) {
      properties.customProperties = this.customProperties;
    }

    if (this.enableClientCertificate !== undefined) {
      properties.enableClientCertificate = this.enableClientCertificate;
    }

    if (this.disableGateway !== undefined) {
      properties.disableGateway = this.disableGateway;
    }

    if (this.publicNetworkAccess) {
      properties.publicNetworkAccess = this.publicNetworkAccess;
    }

    if (this.restore !== undefined) {
      properties.restore = this.restore;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.serviceName,
      location: this.location,
      ...(this.sku && {
        sku: {
          name: this.sku.name,
          capacity: this.sku.capacity,
        },
      }),
      ...(this.identity && { identity: this.identity }),
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    };
  }
}
