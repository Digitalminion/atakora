import { Construct, Resource, DeploymentScope, ValidationResult, ValidationResultBuilder } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmPublicDnsZoneProps } from './public-dns-zone-types';
import { DnsZoneType } from './public-dns-zone-types';

/**
 * L1 construct for Azure Public DNS Zone.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/dnsZones ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/dnsZones`
 * **API Version**: `2023-07-01-preview`
 * **Deployment Scope**: ResourceGroup
 *
 * **CRITICAL CONSTRAINT**: Location MUST be 'global' (not regional)
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * defaults, use the {@link PublicDnsZone} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmPublicDnsZone } from '@atakora/cdk/network';
 *
 * const zone = new ArmPublicDnsZone(resourceGroup, 'MyDnsZone', {
 *   zoneName: 'example.com',
 *   location: 'global'
 * });
 * ```
 */
export class ArmPublicDnsZone extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Network/dnsZones';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-07-01-preview';

  /**
   * Deployment scope for Public DNS Zone.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the Public DNS zone.
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
   * Zone type (Public or Private).
   */
  public readonly zoneType: DnsZoneType;

  /**
   * Tags applied to the Public DNS zone.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/dnsZones/{zoneName}`
   */
  public readonly resourceId: string;

  /**
   * Public DNS zone resource ID (alias for resourceId).
   */
  public readonly zoneId: string;

  constructor(scope: Construct, id: string, props: ArmPublicDnsZoneProps) {
    super(scope, id);

    // Validate props
    this.validateProps(props);

    // Assign required properties
    this.zoneName = props.zoneName;
    this.name = props.zoneName;
    this.location = props.location;
    this.zoneType = props.zoneType ?? DnsZoneType.Public;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/dnsZones/${this.zoneName}`;
    this.zoneId = this.resourceId;
  }

  /**
   * Validates the properties for the Public DNS Zone.
   */
  protected validateProps(props: ArmPublicDnsZoneProps): void {
    // Validate zone name
    if (!props.zoneName || props.zoneName.trim() === '') {
      throw new Error('Public DNS zone name cannot be empty');
    }

    // Validate DNS zone name format
    const dnsNamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!dnsNamePattern.test(props.zoneName)) {
      throw new Error(
        `Invalid DNS zone name '${props.zoneName}'. ` +
          `Zone name must be a valid DNS name (e.g., example.com, subdomain.example.com)`
      );
    }

    // Ensure zone name doesn't end with a dot
    if (props.zoneName.endsWith('.')) {
      throw new Error(
        `DNS zone name '${props.zoneName}' cannot end with a dot. ` +
          `Use 'example.com' instead of 'example.com.'`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // CRITICAL: Public DNS zones MUST use location 'global'
    if (props.location.toLowerCase() !== 'global') {
      throw new Error(
        `Public DNS zone location must be 'global', got '${props.location}'. ` +
          `Public DNS zones are global resources and do not support regional deployment.`
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
   * Converts the Public DNS Zone to an ARM template resource definition.
   */
  public toArmTemplate(): ArmResource {
    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.zoneName,
      location: this.location,
      properties: {
        zoneType: this.zoneType,
      },
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    };
  }
}
