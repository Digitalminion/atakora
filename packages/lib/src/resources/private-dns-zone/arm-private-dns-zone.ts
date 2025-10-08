import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmPrivateDnsZoneProps } from './types';

/**
 * L1 construct for Azure Private DNS Zone.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/privateDnsZones ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/privateDnsZones`
 * **API Version**: `2024-06-01`
 * **Deployment Scope**: ResourceGroup
 *
 * **CRITICAL CONSTRAINT**: Location MUST be 'global' (not regional)
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * defaults, use the {@link PrivateDnsZone} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmPrivateDnsZone } from '@atakora/lib';
 *
 * const zone = new ArmPrivateDnsZone(resourceGroup, 'BlobDnsZone', {
 *   zoneName: 'privatelink.blob.core.windows.net',
 *   location: 'global'
 * });
 * ```
 */
export class ArmPrivateDnsZone extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Network/privateDnsZones';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-06-01';

  /**
   * Deployment scope for Private DNS Zone.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the Private DNS zone.
   */
  public readonly zoneName: string;

  /**
   * Resource name (same as zoneName).
   */
  public readonly name: string;

  /**
   * Azure region (always 'global').
   */
  public readonly location: string;

  /**
   * Tags applied to the Private DNS zone.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/privateDnsZones/{zoneName}`
   */
  public readonly resourceId: string;

  /**
   * Private DNS zone resource ID (alias for resourceId).
   */
  public readonly zoneId: string;

  constructor(scope: Construct, id: string, props: ArmPrivateDnsZoneProps) {
    super(scope, id);

    // Validate props
    this.validateProps(props);

    // Assign required properties
    this.zoneName = props.zoneName;
    this.name = props.zoneName;
    this.location = props.location;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/privateDnsZones/${this.zoneName}`;
    this.zoneId = this.resourceId;
  }

  /**
   * Validates the properties for the Private DNS Zone.
   */
  private validateProps(props: ArmPrivateDnsZoneProps): void {
    // Validate zone name
    if (!props.zoneName || props.zoneName.trim() === '') {
      throw new Error('Private DNS zone name cannot be empty');
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // CRITICAL: Private DNS zones MUST use location 'global'
    if (props.location.toLowerCase() !== 'global') {
      throw new Error(
        `Private DNS zone location must be 'global', got '${props.location}'. ` +
          `Private DNS zones are global resources and do not support regional deployment.`
      );
    }
  }

  /**
   * Converts the Private DNS Zone to an ARM template resource definition.
   */
  public toArmTemplate(): Record<string, unknown> {
    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.zoneName,
      location: this.location,
      properties: {},
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    };
  }
}
