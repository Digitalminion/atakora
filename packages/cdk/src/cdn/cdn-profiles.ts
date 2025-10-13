/**
 * L2 construct for Azure CDN Profile.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { ArmCdnProfiles } from './cdn-profile-arm';
import type { CdnProfilesProps, ICdnProfile, CdnSkuName, CdnSku } from './cdn-profile-types';

/**
 * L2 construct for Azure CDN Profile.
 *
 * @remarks
 * Intent-based API with sensible defaults.
 *
 * @example
 * ```typescript
 * import { CdnProfiles } from '@atakora/cdk/cdn';
 *
 * // Minimal usage
 * const profile = new CdnProfiles(resourceGroup, 'MyCdn');
 *
 * // With custom SKU
 * const profile = new CdnProfiles(resourceGroup, 'MyCdn', {
 *   sku: CdnSkuName.PREMIUM_VERIZON
 * });
 * ```
 */
export class CdnProfiles extends Construct implements ICdnProfile {
  /**
   * Underlying L1 construct.
   */
  private readonly armCdnProfile: ArmCdnProfiles;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * CDN profile name.
   */
  public readonly profileName: string;

  /**
   * CDN profile resource ID.
   */
  public readonly profileId: string;

  /**
   * Location of the CDN profile.
   */
  public readonly location: string;

  /**
   * CDN SKU.
   */
  public readonly sku: CdnSku;

  /**
   * Resource group name.
   */
  public readonly resourceGroupName: string;

  /**
   * Tags applied to the profile.
   */
  public readonly tags: Record<string, string>;

  constructor(scope: Construct, id: string, props?: CdnProfilesProps) {
    super(scope, id);

    this.parentResourceGroup = this.getParentResourceGroup(scope);
    this.profileName = this.resolveCdnProfileName(id, props);
    this.location = props?.location ?? 'global'; // CDN profiles are typically global
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Default to Standard Microsoft CDN
    const skuName = props?.sku ?? ('Standard_Microsoft' as CdnSkuName);
    this.sku = { name: skuName };

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Create underlying L1 resource
    this.armCdnProfile = new ArmCdnProfiles(scope, `${id}CdnProfile`, {
      profileName: this.profileName,
      location: this.location,
      sku: this.sku,
      tags: this.tags,
    });

    this.profileId = this.armCdnProfile.profileId;
  }

  /**
   * Gets the parent ResourceGroup.
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    let current: Construct | undefined = scope;

    while (current) {
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'CdnProfiles must be created within or under a ResourceGroup'
    );
  }

  /**
   * Checks if construct is a ResourceGroup.
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  /**
   * Gets tags from parent.
   */
  private getParentTags(scope: Construct): Record<string, string> {
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  /**
   * Resolves CDN profile name.
   */
  private resolveCdnProfileName(id: string, props?: CdnProfilesProps): string {
    if (props?.profileName) {
      return props.profileName;
    }

    // Auto-generate name
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = id.toLowerCase();
      return subscriptionStack.generateResourceName('cdn', purpose);
    }

    // Fallback
    return `cdn-${id.toLowerCase()}`;
  }

  /**
   * Gets the SubscriptionStack.
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      if (
        current &&
        typeof (current as any).generateResourceName === 'function'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }
}
