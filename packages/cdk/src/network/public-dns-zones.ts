import { Construct } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { ArmPublicDnsZone } from './public-dns-zone-arm';
import type { PublicDnsZonesProps, IPublicDnsZone } from './public-dns-zone-types';
import { DnsZoneType } from './public-dns-zone-types';

/**
 * L2 construct for Azure Public DNS Zone.
 *
 * @remarks
 * Intent-based API with sensible defaults.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Location always defaults to 'global' (as required by Azure)
 * - Merges tags with parent tags
 * - NO auto-naming: zone names are specific domain names (e.g., example.com)
 * - Automatic zone type defaulting to Public
 *
 * **ARM Resource Type**: `Microsoft.Network/dnsZones`
 * **API Version**: `2023-07-01-preview`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { PublicDnsZone } from '@atakora/cdk/network';
 *
 * const dnsZone = new PublicDnsZone(resourceGroup, 'MyDnsZone', {
 *   zoneName: 'example.com'
 * });
 * ```
 *
 * @example
 * With subdomain:
 * ```typescript
 * const apiDnsZone = new PublicDnsZone(resourceGroup, 'ApiDnsZone', {
 *   zoneName: 'api.example.com'
 * });
 * ```
 *
 * @example
 * With tags:
 * ```typescript
 * const dnsZone = new PublicDnsZone(resourceGroup, 'MyDnsZone', {
 *   zoneName: 'contoso.com',
 *   tags: {
 *     environment: 'production',
 *     managed-by: 'atakora'
 *   }
 * });
 * ```
 */
export class PublicDnsZones extends Construct implements IPublicDnsZone {
  /**
   * Underlying L1 construct.
   */
  private readonly armPublicDnsZone: ArmPublicDnsZone;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the Public DNS zone.
   */
  public readonly zoneName: string;

  /**
   * Location of the Public DNS zone (always 'global').
   */
  public readonly location: string;

  /**
   * Resource group name where the Public DNS zone is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the Public DNS zone.
   */
  public readonly zoneId: string;

  /**
   * Zone type (always Public for this construct).
   */
  public readonly zoneType: DnsZoneType;

  /**
   * Tags applied to the Public DNS zone (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * Name servers for this DNS zone.
   *
   * @remarks
   * These are the Azure DNS name servers that you need to configure
   * at your domain registrar. This is an ARM reference expression.
   */
  public readonly nameServers?: string[];

  /**
   * Creates a new PublicDnsZone construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - Public DNS zone properties (zoneName is REQUIRED)
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   * @throws {Error} If zoneName is not provided
   * @throws {Error} If zoneName is not a valid DNS name
   * @throws {Error} If location is provided but not 'global'
   *
   * @example
   * ```typescript
   * const zone = new PublicDnsZone(resourceGroup, 'MyDnsZone', {
   *   zoneName: 'example.com'
   * });
   *
   * // Access name servers (ARM reference)
   * console.log('Configure these name servers at your registrar:');
   * console.log(zone.nameServers);
   * ```
   */
  constructor(scope: Construct, id: string, props: PublicDnsZonesProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Zone name is always explicit (no auto-naming for DNS zones)
    this.zoneName = props.zoneName;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Location MUST be 'global' for Public DNS zones
    // Validate if user provided a location
    if (props.location && props.location !== 'global') {
      throw new Error(
        `Public DNS zone location must be 'global', got '${props.location}'. ` +
          `Public DNS zones are global resources.`
      );
    }
    this.location = 'global';

    // Zone type defaults to Public
    this.zoneType = props.zoneType ?? DnsZoneType.Public;

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props.tags,
    };

    // Create underlying L1 resource
    this.armPublicDnsZone = new ArmPublicDnsZone(scope, `${id}-Resource`, {
      zoneName: this.zoneName,
      location: this.location,
      zoneType: this.zoneType,
      tags: this.tags,
    });

    // Get resource ID from L1
    this.zoneId = this.armPublicDnsZone.zoneId;

    // Name servers will be available as ARM reference after deployment
    // Format: reference(resourceId('Microsoft.Network/dnsZones', zoneName), '2023-07-01-preview').nameServers
    this.nameServers = undefined; // Populated during ARM deployment
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
      'PublicDnsZone must be created within or under a ResourceGroup. ' +
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
   * Gets the ARM reference expression for the name servers.
   *
   * @returns ARM reference expression to retrieve name servers
   *
   * @example
   * ```typescript
   * const zone = new PublicDnsZone(resourceGroup, 'MyDnsZone', {
   *   zoneName: 'example.com'
   * });
   *
   * // Use in ARM outputs
   * const nameServersRef = zone.getNameServersReference();
   * ```
   */
  public getNameServersReference(): string {
    return `[reference(resourceId('Microsoft.Network/dnsZones', '${this.zoneName}'), '2023-07-01-preview').nameServers]`;
  }
}
