import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import { ServiceBusSku, type ArmServiceBusNamespaceProps } from './service-bus-namespace-types';

/**
 * L1 construct for Azure Service Bus Namespace.
 *
 * @remarks
 * Direct mapping to Microsoft.ServiceBus/namespaces ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.ServiceBus/namespaces`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link ServiceBusNamespace} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmServiceBusNamespace, ServiceBusSku } from '@atakora/cdk/servicebus';
 *
 * const namespace = new ArmServiceBusNamespace(resourceGroup, 'Namespace', {
 *   namespaceName: 'sb-myapp-prod',
 *   location: 'eastus',
 *   sku: {
 *     name: ServiceBusSku.STANDARD,
 *     tier: ServiceBusSku.STANDARD
 *   }
 * });
 * ```
 */
export class ArmServiceBusNamespace extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.ServiceBus/namespaces';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2021-11-01';

  /**
   * Deployment scope for Service Bus Namespaces.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the Service Bus namespace.
   */
  public readonly namespaceName: string;

  /**
   * Resource name (same as namespaceName).
   */
  public readonly name: string;

  /**
   * Azure region where the namespace is located.
   */
  public readonly location: string;

  /**
   * SKU configuration.
   */
  public readonly sku: {
    readonly name: ServiceBusSku;
    readonly tier: ServiceBusSku;
    readonly capacity?: number;
  };

  /**
   * Zone redundancy enabled.
   */
  public readonly zoneRedundant?: boolean;

  /**
   * Disable local auth.
   */
  public readonly disableLocalAuth?: boolean;

  /**
   * Minimum TLS version.
   */
  public readonly minimumTlsVersion?: string;

  /**
   * Tags applied to the namespace.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ServiceBus/namespaces/{namespaceName}`
   */
  public readonly resourceId: string;

  /**
   * Service Bus namespace resource ID (alias for resourceId).
   */
  public readonly namespaceId: string;

  /**
   * Creates a new ArmServiceBusNamespace construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Service Bus Namespace properties
   *
   * @throws {Error} If namespaceName is invalid
   * @throws {Error} If location is empty
   */
  constructor(scope: Construct, id: string, props: ArmServiceBusNamespaceProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.namespaceName = props.namespaceName;
    this.name = props.namespaceName;
    this.location = props.location;
    this.sku = props.sku;
    this.zoneRedundant = props.zoneRedundant;
    this.disableLocalAuth = props.disableLocalAuth;
    this.minimumTlsVersion = props.minimumTlsVersion;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ServiceBus/namespaces/${this.namespaceName}`;
    this.namespaceId = this.resourceId;
  }

  /**
   * Validates Service Bus Namespace properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  protected validateProps(props: ArmServiceBusNamespaceProps): void {
    // Validate namespace name
    if (!props.namespaceName || props.namespaceName.trim() === '') {
      throw new Error('Service Bus namespace name cannot be empty');
    }

    if (props.namespaceName.length < 6 || props.namespaceName.length > 50) {
      throw new Error(`Service Bus namespace name must be 6-50 characters (got ${props.namespaceName.length})`);
    }

    // Validate name pattern: alphanumeric and hyphens
    const namePattern = /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    if (!namePattern.test(props.namespaceName)) {
      throw new Error(
        `Service Bus namespace name must start with a letter, end with a letter or number, and contain only letters, numbers, and hyphens. Got: '${props.namespaceName}'`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate zone redundancy (Premium only)
    if (props.zoneRedundant && props.sku.tier !== ServiceBusSku.PREMIUM) {
      throw new Error('Zone redundancy is only available for Premium tier');
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
  public toArmTemplate(): ArmResource {
    const properties: any = {};

    // Add optional properties
    if (this.zoneRedundant !== undefined) {
      properties.zoneRedundant = this.zoneRedundant;
    }

    if (this.disableLocalAuth !== undefined) {
      properties.disableLocalAuth = this.disableLocalAuth;
    }

    if (this.minimumTlsVersion) {
      properties.minimumTlsVersion = this.minimumTlsVersion;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.namespaceName,
      location: this.location,
      sku: this.sku,
      properties,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    } as ArmResource;
  }
}
