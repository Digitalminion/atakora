import { Construct } from '@atakora/cdk';
import type { ServerFarmsProps, IServerFarm, ServerFarmSkuName, ServerFarmSkuTier, ServerFarmKind } from './server-farm-types';
/**
 * L2 construct for Azure App Service Plan (Server Farm).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates Server Farm name
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
 * import { ServerFarms } from '@atakora/cdk/web';
 *
 * const plan = new ServerFarms(resourceGroup, 'ApiPlan');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const plan = new ServerFarms(resourceGroup, 'ApiPlan', {
 *   sku: ServerFarmSkuName.S1,
 *   kind: ServerFarmKind.LINUX,
 *   capacity: 2
 * });
 * ```
 */
export declare class ServerFarms extends Construct implements IServerFarm {
    /**
     * Underlying L1 construct.
     */
    private readonly armServerFarms;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the Server Farm.
     */
    readonly planName: string;
    /**
     * Location of the Server Farm.
     */
    readonly location: string;
    /**
     * Resource group name where the Server Farm is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the Server Farm.
     */
    readonly planId: string;
    /**
     * Tags applied to the Server Farm (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * SKU name.
     */
    readonly sku: ServerFarmSkuName;
    /**
     * SKU tier.
     */
    readonly tier: ServerFarmSkuTier;
    /**
     * Kind of Server Farm.
     */
    readonly kind: ServerFarmKind;
    /**
     * Reserved flag (true for Linux).
     */
    readonly reserved: boolean;
    /**
     * Instance capacity.
     */
    readonly capacity: number;
    /**
     * Creates a new ServerFarms construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Optional Server Farm properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     *
     * @example
     * ```typescript
     * const plan = new ServerFarms(resourceGroup, 'ApiPlan', {
     *   sku: ServerFarmSkuName.S1,
     *   tags: { purpose: 'api-hosting' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props?: ServerFarmsProps);
    /**
     * Creates a Server Farm reference from an existing plan ID.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for this reference
     * @param planId - Resource ID of the existing Server Farm
     * @returns Server Farm reference
     *
     * @example
     * ```typescript
     * const plan = ServerFarms.fromPlanId(
     *   resourceGroup,
     *   'ExistingPlan',
     *   '/subscriptions/.../resourceGroups/.../providers/Microsoft.Web/serverfarms/asp-existing'
     * );
     * ```
     */
    static fromPlanId(scope: Construct, id: string, planId: string): IServerFarm;
    /**
     * Gets the parent ResourceGroup from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The resource group interface
     * @throws {Error} If parent is not or doesn't contain a ResourceGroup
     */
    private getParentResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroup properties
     */
    private isResourceGroup;
    /**
     * Gets tags from parent construct hierarchy.
     *
     * @param scope - Parent construct
     * @returns Tags object (empty if no tags found)
     */
    private getParentTags;
    /**
     * Resolves the Server Farm name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Server Farm properties
     * @returns Resolved plan name
     */
    private resolvePlanName;
    /**
     * Gets the SubscriptionStack from the construct tree.
     *
     * @returns SubscriptionStack or undefined if not found
     */
    private getSubscriptionStack;
    /**
     * Converts construct ID to purpose identifier for naming.
     *
     * @param id - Construct ID
     * @returns Purpose string for naming
     */
    private constructIdToPurpose;
    /**
     * Infers the SKU tier from the SKU name.
     *
     * @param skuName - SKU name
     * @returns Corresponding tier
     */
    private inferTierFromSku;
    /**
     * Resolves the reserved flag based on kind and explicit value.
     *
     * @param kind - Server Farm kind
     * @param explicitReserved - Explicitly provided reserved value
     * @returns Resolved reserved flag
     */
    private resolveReservedFlag;
}
//# sourceMappingURL=server-farms.d.ts.map