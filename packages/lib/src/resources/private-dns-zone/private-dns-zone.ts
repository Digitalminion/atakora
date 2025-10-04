import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmPrivateDnsZone } from './arm-private-dns-zone';
import type { PrivateDnsZoneProps, IPrivateDnsZone } from './types';

/**
 * L2 construct for Azure Private DNS Zone.
 *
 * @remarks
 * Intent-based API with sensible defaults.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Location always defaults to 'global' (as required by Azure)
 * - Merges tags with parent tags
 * - NO auto-naming: zone names are specific (e.g., privatelink.blob.core.windows.net)
 *
 * **ARM Resource Type**: `Microsoft.Network/privateDnsZones`
 * **API Version**: `2024-06-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { PrivateDnsZone } from '@azure-arm-priv/lib';
 *
 * const blobDnsZone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
 *   zoneName: 'privatelink.blob.core.windows.net'
 * });
 * ```
 *
 * @example
 * With tags:
 * ```typescript
 * const vaultDnsZone = new PrivateDnsZone(resourceGroup, 'VaultDnsZone', {
 *   zoneName: 'privatelink.vaultcore.azure.net',
 *   tags: { purpose: 'key-vault-connectivity' }
 * });
 * ```
 */
export class PrivateDnsZone extends Construct implements IPrivateDnsZone {
  /**
   * Underlying L1 construct.
   */
  private readonly armPrivateDnsZone: ArmPrivateDnsZone;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the Private DNS zone.
   */
  public readonly zoneName: string;

  /**
   * Location of the Private DNS zone (always 'global').
   */
  public readonly location: string;

  /**
   * Resource group name where the Private DNS zone is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the Private DNS zone.
   */
  public readonly zoneId: string;

  /**
   * Tags applied to the Private DNS zone (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * Creates a new PrivateDnsZone construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - Private DNS zone properties (zoneName is REQUIRED)
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   * @throws {Error} If zoneName is not provided
   * @throws {Error} If location is provided but not 'global'
   *
   * @example
   * ```typescript
   * const zone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
   *   zoneName: 'privatelink.blob.core.windows.net'
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: PrivateDnsZoneProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Zone name is always explicit (no auto-naming for DNS zones)
    this.zoneName = props.zoneName;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Location MUST be 'global' for Private DNS zones
    // Validate if user provided a location
    if (props.location && props.location !== 'global') {
      throw new Error(
        `Private DNS zone location must be 'global', got '${props.location}'. ` +
        `Private DNS zones are global resources.`
      );
    }
    this.location = 'global';

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props.tags,
    };

    // Create underlying L1 resource
    this.armPrivateDnsZone = new ArmPrivateDnsZone(scope, `${id}-Resource`, {
      zoneName: this.zoneName,
      location: this.location,
      tags: this.tags,
    });

    // Get resource ID from L1
    this.zoneId = this.armPrivateDnsZone.zoneId;
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
      'PrivateDnsZone must be created within or under a ResourceGroup. ' +
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
}
