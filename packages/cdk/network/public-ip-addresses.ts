import { Construct, constructIdToPurpose as utilConstructIdToPurpose } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { ArmPublicIpAddress } from './public-ip-address-arm';
import type {
  PublicIPAddressesProps,
  IPublicIpAddress,
  PublicIPAddressSku,
  PublicIPAllocationMethod,
  IpVersion,
} from './public-ip-address-types';

/**
 * L2 construct for Azure Public IP Address.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates public IP address name if not provided
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Secure defaults: Standard SKU with Static allocation
 *
 * **ARM Resource Type**: `Microsoft.Network/publicIPAddresses`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { PublicIpAddress } from '@atakora/cdk/network';
 *
 * const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
 *   sku: PublicIPAddressSku.BASIC,
 *   publicIPAllocationMethod: PublicIPAllocationMethod.DYNAMIC,
 *   domainNameLabel: 'myapp'
 * });
 * ```
 */
export class PublicIPAddresses extends Construct implements IPublicIpAddress {
  /**
   * Underlying L1 construct.
   */
  private readonly armPublicIpAddress: ArmPublicIpAddress;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the public IP address.
   */
  public readonly publicIpAddressName: string;

  /**
   * Location of the public IP address.
   */
  public readonly location: string;

  /**
   * Resource group name where the public IP address is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the public IP address.
   */
  public readonly publicIpAddressId: string;

  /**
   * Tags applied to the public IP address (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * SKU name.
   */
  public readonly sku: PublicIPAddressSku;

  /**
   * IP address allocation method.
   */
  public readonly publicIPAllocationMethod: PublicIPAllocationMethod;

  /**
   * IP address version.
   */
  public readonly ipVersion: IpVersion;

  /**
   * Domain name label.
   */
  public readonly domainNameLabel?: string;

  /**
   * Idle timeout in minutes.
   */
  public readonly idleTimeoutInMinutes: number;

  /**
   * Creates a reference to an existing public IP address.
   *
   * @param publicIpId - Full ARM resource ID of the public IP address
   * @returns Public IP address reference
   *
   * @example
   * ```typescript
   * const publicIp = PublicIpAddress.fromPublicIpId(
   *   '/subscriptions/12345/resourceGroups/rg-app/providers/Microsoft.Network/publicIPAddresses/pip-app-001'
   * );
   * ```
   */
  public static fromPublicIpId(publicIpId: string): IPublicIpAddress {
    // Parse the resource ID to extract name and location
    const parts = publicIpId.split('/');
    const nameIndex = parts.indexOf('publicIPAddresses') + 1;
    const rgIndex = parts.indexOf('resourceGroups') + 1;

    if (nameIndex === 0 || nameIndex >= parts.length) {
      throw new Error(`Invalid public IP address ID: ${publicIpId}`);
    }

    const name = parts[nameIndex];
    const resourceGroupName = rgIndex > 0 && rgIndex < parts.length ? parts[rgIndex] : '';

    return {
      publicIpAddressName: name,
      location: '', // Location not available from ID
      publicIpAddressId: publicIpId,
    };
  }

  /**
   * Creates a new PublicIpAddress construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - Optional public IP address properties
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   *
   * @example
   * ```typescript
   * const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
   *   sku: PublicIPAddressSku.STANDARD,
   *   domainNameLabel: 'myapp',
   *   tags: { purpose: 'frontend' }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props?: PublicIPAddressesProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided public IP address name
    this.publicIpAddressName = this.resolvePublicIpAddressName(id, props);

    // Default location to resource group's location or use provided
    this.location = props?.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Default SKU to Standard
    this.sku = props?.sku ?? ('Standard' as PublicIPAddressSku);

    // Default allocation method to Static
    this.publicIPAllocationMethod =
      props?.publicIPAllocationMethod ?? ('Static' as PublicIPAllocationMethod);

    // Default IP version to IPv4
    this.ipVersion = props?.ipVersion ?? ('IPv4' as IpVersion);

    // Default idle timeout to 4 minutes
    this.idleTimeoutInMinutes = props?.idleTimeoutInMinutes ?? 4;

    // Set domain name label if provided
    this.domainNameLabel = props?.domainNameLabel;

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Create underlying L1 resource
    this.armPublicIpAddress = new ArmPublicIpAddress(scope, `${id}PublicIpAddress`, {
      publicIpAddressName: this.publicIpAddressName,
      location: this.location,
      sku: { name: this.sku },
      properties: {
        publicIPAllocationMethod: this.publicIPAllocationMethod,
        ipVersion: this.ipVersion,
        domainNameLabel: this.domainNameLabel,
        idleTimeoutInMinutes: this.idleTimeoutInMinutes,
      },
      tags: this.tags,
    });

    // Get resource ID from L1
    this.publicIpAddressId = this.armPublicIpAddress.publicIpAddressId;
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
      'PublicIpAddress must be created within or under a ResourceGroup. ' +
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
   * Resolves the public IP address name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Public IP address properties
   * @returns Resolved public IP address name
   *
   * @remarks
   * Public IP address names follow the pattern:
   * - pip-{org}-{project}-{purpose}-{env}-{geo}-{instance}
   * - Example: pip-dp-authr-app-np-eus-01
   */
  private resolvePublicIpAddressName(id: string, props?: PublicIPAddressesProps): string {
    // If name provided explicitly, use it
    if (props?.publicIpAddressName) {
      return props.publicIpAddressName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('pip', purpose);
    }

    // Fallback: construct a basic name from ID
    return `pip-${id.toLowerCase()}`;
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string | undefined {
    return utilConstructIdToPurpose(id, 'publicip', ['pip', 'publicipaddress']);
  }
}
