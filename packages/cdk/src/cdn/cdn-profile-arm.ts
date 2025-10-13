/**
 * L1 ARM construct for Azure CDN Profile.
 *
 * @packageDocumentation
 */

import { Construct, Resource, DeploymentScope, ValidationResult, ValidationResultBuilder } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmCdnProfilesProps, CdnSku } from './cdn-profile-types';

/**
 * L1 construct for Azure CDN Profile.
 *
 * @remarks
 * Direct mapping to Microsoft.Cdn/profiles ARM resource.
 *
 * **ARM Resource Type**: `Microsoft.Cdn/profiles`
 * **API Version**: `2024-02-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * ```typescript
 * import { ArmCdnProfiles, CdnSkuName } from '@atakora/cdk/cdn';
 *
 * const profile = new ArmCdnProfiles(resourceGroup, 'CdnProfile', {
 *   profileName: 'my-cdn-profile',
 *   location: 'global',
 *   sku: {
 *     name: CdnSkuName.STANDARD_MICROSOFT
 *   }
 * });
 * ```
 */
export class ArmCdnProfiles extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Cdn/profiles';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2024-02-01';

  /**
   * Deployment scope.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * CDN profile name.
   */
  public readonly profileName: string;

  /**
   * Resource name (same as profileName).
   */
  public readonly name: string;

  /**
   * Azure region.
   */
  public readonly location: string;

  /**
   * CDN SKU configuration.
   */
  public readonly sku: CdnSku;

  /**
   * Tags applied to the profile.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * CDN profile resource ID (alias for resourceId).
   */
  public readonly profileId: string;

  constructor(scope: Construct, id: string, props: ArmCdnProfilesProps) {
    super(scope, id);

    this.validateProps(props);

    this.profileName = props.profileName;
    this.name = props.profileName;
    this.location = props.location;
    this.sku = props.sku;
    this.tags = props.tags ?? {};

    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Cdn/profiles/${this.profileName}`;
    this.profileId = this.resourceId;
  }

  /**
   * Validates CDN profile properties.
   */
  protected validateProps(props: ArmCdnProfilesProps): void {
    if (!props.profileName || props.profileName.trim() === '') {
      throw new Error('CDN profile name cannot be empty');
    }

    if (props.profileName.length < 1 || props.profileName.length > 260) {
      throw new Error(`CDN profile name must be 1-260 characters (got ${props.profileName.length})`);
    }

    // Validate name pattern: alphanumeric and hyphens, cannot start/end with hyphen
    const namePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    if (!namePattern.test(props.profileName)) {
      throw new Error(
        `CDN profile name must be alphanumeric with hyphens, cannot start/end with hyphen (got: ${props.profileName})`
      );
    }

    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    if (!props.sku || !props.sku.name) {
      throw new Error('SKU must be provided');
    }
  }

  /**
   * Validates ARM template structure.
   */
  public validateArmStructure(): ValidationResult {
    const builder = new ValidationResultBuilder();
    const armTemplate = this.toArmTemplate() as any;

    if (!armTemplate.type) {
      builder.addError('ARM template missing type field', '', '', 'armTemplate.type');
    }

    if (!armTemplate.apiVersion) {
      builder.addError('ARM template missing apiVersion field', '', '', 'armTemplate.apiVersion');
    }

    if (!armTemplate.name) {
      builder.addError('ARM template missing name field', '', '', 'armTemplate.name');
    }

    if (armTemplate.sku && !armTemplate.sku.name) {
      builder.addError('SKU missing name property', '', '', 'armTemplate.sku.name');
    }

    return builder.build();
  }

  /**
   * Generates ARM template representation.
   */
  public toArmTemplate(): ArmResource {
    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.profileName,
      location: this.location,
      sku: {
        name: this.sku.name,
      },
      properties: {},
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    } as ArmResource;
  }
}
