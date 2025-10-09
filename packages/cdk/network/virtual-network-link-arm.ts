import { Construct } from '@atakora/lib';
import { Resource } from '@atakora/lib';
import { DeploymentScope } from '@atakora/lib';
import { ValidationResult, ValidationResultBuilder, ArmResource } from '@atakora/lib';
import type { ArmVirtualNetworkLinkProps, IVirtualNetworkLink } from './virtual-network-link-types';

/**
 * L1 construct for Azure Private DNS Zone Virtual Network Link.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/privateDnsZones/virtualNetworkLinks ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/privateDnsZones/virtualNetworkLinks`
 * **API Version**: `2024-06-01`
 * **Deployment Scope**: ResourceGroup
 *
 * **CRITICAL CONSTRAINT**: Location MUST be 'global' (not regional)
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * defaults, use the {@link VirtualNetworkLink} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmVirtualNetworkLink } from '@atakora/lib';
 *
 * const link = new ArmVirtualNetworkLink(resourceGroup, 'VNetLink', {
 *   privateDnsZoneName: 'privatelink.blob.core.windows.net',
 *   linkName: 'vnet-link',
 *   location: 'global',
 *   virtualNetworkId: '/subscriptions/.../virtualNetworks/my-vnet',
 *   registrationEnabled: false
 * });
 * ```
 */
export class ArmVirtualNetworkLink extends Resource implements IVirtualNetworkLink {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Network/privateDnsZones/virtualNetworkLinks';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-06-01';

  /**
   * Deployment scope for Virtual Network Link.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the parent Private DNS zone.
   */
  public readonly privateDnsZoneName: string;

  /**
   * Name of the virtual network link.
   */
  public readonly linkName: string;

  /**
   * Resource name (same as linkName).
   */
  public readonly name: string;

  /**
   * Azure region (always 'global').
   */
  public readonly location: string;

  /**
   * Virtual network resource ID.
   */
  public readonly virtualNetworkId: string;

  /**
   * Whether auto-registration is enabled.
   */
  public readonly registrationEnabled: boolean;

  /**
   * Tags applied to the virtual network link.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/privateDnsZones/{zoneName}/virtualNetworkLinks/{linkName}`
   */
  public readonly resourceId: string;

  /**
   * Virtual network link resource ID (alias for resourceId).
   */
  public readonly linkId: string;

  constructor(scope: Construct, id: string, props: ArmVirtualNetworkLinkProps) {
    super(scope, id);

    // Validate props
    this.validateProps(props);

    // Assign required properties
    this.privateDnsZoneName = props.privateDnsZoneName;
    this.linkName = props.linkName;
    this.name = props.linkName;
    this.location = props.location;
    this.virtualNetworkId = props.virtualNetworkId;
    this.registrationEnabled = props.registrationEnabled ?? false;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/privateDnsZones/${this.privateDnsZoneName}/virtualNetworkLinks/${this.linkName}`;
    this.linkId = this.resourceId;
  }

  /**
   * Validates the properties for the Virtual Network Link.
   */
  private validateProps(props: ArmVirtualNetworkLinkProps): void {
    // Validate Private DNS zone name
    if (!props.privateDnsZoneName || props.privateDnsZoneName.trim() === '') {
      throw new Error('Private DNS zone name cannot be empty');
    }

    // Validate link name
    if (!props.linkName || props.linkName.trim() === '') {
      throw new Error('Virtual network link name cannot be empty');
    }

    // Validate link name pattern
    const linkNamePattern = /^[a-zA-Z0-9][-a-zA-Z0-9]{0,78}[a-zA-Z0-9]$/;
    if (!linkNamePattern.test(props.linkName)) {
      throw new Error(
        `Virtual network link name must match pattern: ^[a-zA-Z0-9][-a-zA-Z0-9]{0,78}[a-zA-Z0-9]$. ` +
          `Got: '${props.linkName}'`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // CRITICAL: Virtual network links MUST use location 'global'
    if (props.location.toLowerCase() !== 'global') {
      throw new Error(
        `Virtual network link location must be 'global', got '${props.location}'. ` +
          `Virtual network links are global resources and do not support regional deployment.`
      );
    }

    // Validate virtual network ID
    if (!props.virtualNetworkId || props.virtualNetworkId.trim() === '') {
      throw new Error('Virtual network ID cannot be empty');
    }

    // Basic validation that it looks like a resource ID
    if (!props.virtualNetworkId.includes('/virtualNetworks/')) {
      throw new Error(
        `Virtual network ID must be a valid resource ID containing '/virtualNetworks/'. ` +
          `Got: '${props.virtualNetworkId}'`
      );
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
   * Converts the Virtual Network Link to an ARM template resource definition.
   */
  public toArmTemplate(): ArmResource {
    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.privateDnsZoneName}/${this.linkName}`,
      location: this.location,
      properties: {
        virtualNetwork: {
          id: this.virtualNetworkId,
        },
        registrationEnabled: this.registrationEnabled,
      },
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    };
  }
}
