import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmAppServicePlan } from './arm-app-service-plan';
import type {
  AppServicePlanProps,
  IAppServicePlan,
  AppServicePlanSkuName,
  AppServicePlanSkuTier,
  AppServicePlanKind,
} from './types';

/**
 * L2 construct for Azure App Service Plan.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates App Service Plan name
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Defaults to Linux plan with B1 SKU
 * - Auto-detects Linux vs Windows from kind or reserved prop
 *
 * **ARM Resource Type**: `Microsoft.Web/serverfarms`
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { AppServicePlan } from '@atakora/lib';
 *
 * const plan = new AppServicePlan(resourceGroup, 'ApiPlan');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const plan = new AppServicePlan(resourceGroup, 'ApiPlan', {
 *   sku: AppServicePlanSkuName.S1,
 *   kind: AppServicePlanKind.LINUX,
 *   capacity: 2
 * });
 * ```
 */
export class AppServicePlan extends Construct implements IAppServicePlan {
  /**
   * Underlying L1 construct.
   */
  private readonly armAppServicePlan: ArmAppServicePlan;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the App Service Plan.
   */
  public readonly planName: string;

  /**
   * Location of the App Service Plan.
   */
  public readonly location: string;

  /**
   * Resource group name where the App Service Plan is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the App Service Plan.
   */
  public readonly planId: string;

  /**
   * Tags applied to the App Service Plan (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * SKU name.
   */
  public readonly sku: AppServicePlanSkuName;

  /**
   * SKU tier.
   */
  public readonly tier: AppServicePlanSkuTier;

  /**
   * Kind of App Service Plan.
   */
  public readonly kind: AppServicePlanKind;

  /**
   * Reserved flag (true for Linux).
   */
  public readonly reserved: boolean;

  /**
   * Instance capacity.
   */
  public readonly capacity: number;

  /**
   * Creates a new AppServicePlan construct.
   *
   * @param scope - Parent construct (must be or contain a ResourceGroup)
   * @param id - Unique identifier for this construct
   * @param props - Optional App Service Plan properties
   *
   * @throws {Error} If scope does not contain a ResourceGroup
   *
   * @example
   * ```typescript
   * const plan = new AppServicePlan(resourceGroup, 'ApiPlan', {
   *   sku: AppServicePlanSkuName.S1,
   *   tags: { purpose: 'api-hosting' }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props?: AppServicePlanProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided plan name
    this.planName = this.resolvePlanName(id, props);

    // Default location to resource group's location or use provided
    this.location = props?.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Default SKU to B1 and tier to Basic
    this.sku = props?.sku ?? ('B1' as AppServicePlanSkuName);
    this.tier = this.inferTierFromSku(this.sku);

    // Default kind to Linux
    this.kind = props?.kind ?? ('linux' as AppServicePlanKind);

    // Auto-detect reserved flag from kind or use provided value
    this.reserved = this.resolveReservedFlag(this.kind, props?.reserved);

    // Default capacity to 1
    this.capacity = props?.capacity ?? 1;

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Create underlying L1 resource
    this.armAppServicePlan = new ArmAppServicePlan(scope, `${id}-Resource`, {
      planName: this.planName,
      location: this.location,
      sku: {
        name: this.sku,
        tier: this.tier,
        capacity: this.capacity,
      },
      kind: this.kind,
      reserved: this.reserved,
      zoneRedundant: props?.zoneRedundant,
      tags: this.tags,
    });

    // Get resource ID from L1
    this.planId = this.armAppServicePlan.planId;
  }

  /**
   * Creates an App Service Plan reference from an existing plan ID.
   *
   * @param scope - Parent construct
   * @param id - Unique identifier for this reference
   * @param planId - Resource ID of the existing App Service Plan
   * @returns App Service Plan reference
   *
   * @example
   * ```typescript
   * const plan = AppServicePlan.fromPlanId(
   *   resourceGroup,
   *   'ExistingPlan',
   *   '/subscriptions/.../resourceGroups/.../providers/Microsoft.Web/serverfarms/asp-existing'
   * );
   * ```
   */
  public static fromPlanId(
    scope: Construct,
    id: string,
    planId: string
  ): IAppServicePlan {
    // Extract plan name from resource ID
    const planNameMatch = planId.match(/\/serverfarms\/([^/]+)$/);
    if (!planNameMatch) {
      throw new Error(`Invalid App Service Plan resource ID: ${planId}`);
    }

    const planName = planNameMatch[1];

    // Extract location from parent resource group if available
    let location = 'unknown';
    let current: Construct | undefined = scope;
    while (current) {
      if ((current as any).location) {
        location = (current as any).location;
        break;
      }
      current = current.node.scope;
    }

    return {
      planName,
      location,
      planId,
    };
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
      'AppServicePlan must be created within or under a ResourceGroup. ' +
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
   * Resolves the App Service Plan name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - App Service Plan properties
   * @returns Resolved plan name
   */
  private resolvePlanName(id: string, props?: AppServicePlanProps): string {
    // If name provided explicitly, use it
    if (props?.planName) {
      return props.planName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      const rawName = subscriptionStack.generateResourceName('asp', purpose);

      // Ensure name doesn't exceed 40 characters
      return rawName.substring(0, 40);
    }

    // Fallback: construct a basic name from ID (ensure max 40 chars)
    const fallbackName = `asp-${id.toLowerCase()}`;
    return fallbackName.substring(0, 40);
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
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }

  /**
   * Infers the SKU tier from the SKU name.
   *
   * @param skuName - SKU name
   * @returns Corresponding tier
   */
  private inferTierFromSku(skuName: AppServicePlanSkuName): AppServicePlanSkuTier {
    const skuStr = skuName.toString();

    if (skuStr === 'F1') return 'Free' as AppServicePlanSkuTier;
    if (skuStr.startsWith('B')) return 'Basic' as AppServicePlanSkuTier;
    if (skuStr.startsWith('S')) return 'Standard' as AppServicePlanSkuTier;
    if (skuStr.startsWith('P') && skuStr.includes('v3'))
      return 'PremiumV3' as AppServicePlanSkuTier;
    if (skuStr.startsWith('P') && skuStr.includes('v2'))
      return 'PremiumV2' as AppServicePlanSkuTier;
    if (skuStr.startsWith('P')) return 'Premium' as AppServicePlanSkuTier;

    // Default to Basic
    return 'Basic' as AppServicePlanSkuTier;
  }

  /**
   * Resolves the reserved flag based on kind and explicit value.
   *
   * @param kind - App Service Plan kind
   * @param explicitReserved - Explicitly provided reserved value
   * @returns Resolved reserved flag
   */
  private resolveReservedFlag(
    kind: AppServicePlanKind,
    explicitReserved?: boolean
  ): boolean {
    // If explicitly provided, use that
    if (explicitReserved !== undefined) {
      return explicitReserved;
    }

    // Auto-detect from kind
    return kind === ('linux' as AppServicePlanKind);
  }
}
