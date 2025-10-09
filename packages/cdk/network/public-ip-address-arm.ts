import { Construct } from '@atakora/lib';
import { Resource } from '@atakora/lib';
import { DeploymentScope } from '@atakora/lib';
import { ValidationResult, ValidationResultBuilder, ArmResource } from '@atakora/lib';
import type {
  ArmPublicIpAddressProps,
  PublicIPAddressSkuConfig,
  PublicIPAllocationMethod,
  IpVersion,
  PublicIPAddressSku,
} from './public-ip-address-types';

/**
 * L1 construct for Azure Public IP Address.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/publicIPAddresses ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/publicIPAddresses`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link PublicIpAddress} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmPublicIpAddress, PublicIPAddressSku, PublicIPAllocationMethod } from '@atakora/lib';
 *
 * const publicIp = new ArmPublicIpAddress(resourceGroup, 'PublicIp', {
 *   publicIpAddressName: 'pip-myapp-001',
 *   location: 'eastus',
 *   sku: { name: PublicIPAddressSku.STANDARD },
 *   properties: {
 *     publicIPAllocationMethod: PublicIPAllocationMethod.STATIC
 *   }
 * });
 * ```
 */
export class ArmPublicIpAddress extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Network/publicIPAddresses';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-11-01';

  /**
   * Deployment scope for public IP addresses.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the public IP address.
   */
  public readonly publicIpAddressName: string;

  /**
   * Resource name (same as publicIpAddressName).
   */
  public readonly name: string;

  /**
   * Azure region where the public IP address is located.
   */
  public readonly location: string;

  /**
   * SKU configuration.
   */
  public readonly sku: PublicIPAddressSkuConfig;

  /**
   * IP address allocation method.
   */
  public readonly publicIPAllocationMethod: PublicIPAllocationMethod;

  /**
   * IP address version.
   */
  public readonly ipVersion?: IpVersion;

  /**
   * Domain name label.
   */
  public readonly domainNameLabel?: string;

  /**
   * Idle timeout in minutes.
   */
  public readonly idleTimeoutInMinutes?: number;

  /**
   * Tags applied to the public IP address.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/publicIPAddresses/{publicIpAddressName}`
   */
  public readonly resourceId: string;

  /**
   * Public IP address resource ID (alias for resourceId).
   */
  public readonly publicIpAddressId: string;

  /**
   * Creates a new ArmPublicIpAddress construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Public IP address properties
   *
   * @throws {Error} If publicIpAddressName is invalid
   * @throws {Error} If location is empty
   * @throws {Error} If SKU is not provided
   * @throws {Error} If Standard SKU is used with Dynamic allocation
   * @throws {Error} If idleTimeoutInMinutes is outside valid range
   */
  constructor(scope: Construct, id: string, props: ArmPublicIpAddressProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.publicIpAddressName = props.publicIpAddressName;
    this.name = props.publicIpAddressName;
    this.location = props.location;
    this.sku = props.sku;
    this.publicIPAllocationMethod = props.properties?.publicIPAllocationMethod!;
    this.ipVersion = props.properties?.ipVersion;
    this.domainNameLabel = props.properties?.domainNameLabel;
    this.idleTimeoutInMinutes = props.properties?.idleTimeoutInMinutes;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/publicIPAddresses/${this.publicIpAddressName}`;
    this.publicIpAddressId = this.resourceId;
  }

  /**
   * Validates public IP address properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmPublicIpAddressProps): void {
    // Validate public IP address name
    if (!props.publicIpAddressName || props.publicIpAddressName.trim() === '') {
      throw new Error('Public IP address name cannot be empty');
    }

    if (props.publicIpAddressName.length < 1 || props.publicIpAddressName.length > 80) {
      throw new Error(
        `Public IP address name must be 1-80 characters (got ${props.publicIpAddressName.length})`
      );
    }

    // Validate name pattern
    // Single character: must be alphanumeric
    // 2+ characters: must start with alphanumeric, end with alphanumeric or underscore, contain only alphanumeric, periods, underscores, hyphens
    const namePattern = /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,78}[a-zA-Z0-9_])?$/;
    if (!namePattern.test(props.publicIpAddressName)) {
      throw new Error(
        `Public IP address name must start with alphanumeric, end with alphanumeric or underscore, and contain only alphanumeric characters, periods, underscores, and hyphens (got: ${props.publicIpAddressName})`
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

    // Validate properties
    if (!props.properties || !props.properties.publicIPAllocationMethod) {
      throw new Error('Public IP allocation method must be provided');
    }

    // Validate Standard SKU requires Static allocation
    if (
      props.sku.name === ('Standard' as PublicIPAddressSku) &&
      props.properties.publicIPAllocationMethod === ('Dynamic' as PublicIPAllocationMethod)
    ) {
      throw new Error('Standard SKU requires Static allocation method');
    }

    // Validate idleTimeoutInMinutes range (4-30)
    if (props.properties.idleTimeoutInMinutes !== undefined) {
      if (props.properties.idleTimeoutInMinutes < 4 || props.properties.idleTimeoutInMinutes > 30) {
        throw new Error(
          `Idle timeout must be between 4 and 30 minutes (got ${props.properties.idleTimeoutInMinutes})`
        );
      }
    }

    // Validate domain name label if provided
    if (props.properties.domainNameLabel) {
      const label = props.properties.domainNameLabel;
      if (label.length < 3 || label.length > 63) {
        throw new Error(`Domain name label must be 3-63 characters (got ${label.length})`);
      }

      // Pattern: must start with letter, end with letter or number, contain only lowercase letters, numbers, and hyphens
      const labelPattern = /^[a-z][a-z0-9-]{1,61}[a-z0-9]$/;
      if (!labelPattern.test(label)) {
        throw new Error(
          `Domain name label must start with a letter, end with a letter or number, and contain only lowercase letters, numbers, and hyphens (got: ${label})`
        );
      }
    }
  }
  /**
   * Validates the ARM structure of this resource.
   *
   * @remarks
   * Called during synthesis to validate the ARM template structure.
   * Ensures all required properties are present and properly formatted.
   *
   * @returns Validation result with any errors or warnings
   */
  public validateArmStructure(): ValidationResult {
    const builder = new ValidationResultBuilder();
    // Basic ARM structure validation - constructor already validates props
    return builder.build();
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
    const properties: any = {
      publicIPAllocationMethod: this.publicIPAllocationMethod,
    };

    // Add optional properties
    if (this.ipVersion) {
      properties.publicIPAddressVersion = this.ipVersion;
    }

    if (this.domainNameLabel) {
      properties.dnsSettings = {
        domainNameLabel: this.domainNameLabel,
      };
    }

    if (this.idleTimeoutInMinutes !== undefined) {
      properties.idleTimeoutInMinutes = this.idleTimeoutInMinutes;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.publicIpAddressName,
      location: this.location,
      sku: {
        name: this.sku.name,
      },
      properties: properties,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    };
  }
}
