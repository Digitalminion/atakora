import { Construct } from '@atakora/cdk';
import type { ResourceGroupsProps, IResourceGroup } from './resource-group-types';
/**
 * L2 construct for Azure Resource Group.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates resource group name using stack naming context
 * - Defaults location to parent stack's geography
 * - Merges tags with parent stack tags
 * - Validates against Azure constraints
 *
 * **ARM Resource Type**: `Microsoft.Resources/resourceGroups`
 * **API Version**: `2025-04-01`
 * **Deployment Scope**: Subscription
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { ResourceGroup } from '@atakora/lib';
 *
 * // Creates resource group with auto-generated name:
 * // "rg-{org}-{project}-datarg-{env}-{geo}-{instance}"
 * const rg = new ResourceGroup(subscriptionStack, 'DataRG');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const rg = new ResourceGroup(subscriptionStack, 'DataRG', {
 *   resourceGroupName: 'my-custom-rg-name',
 *   location: 'westus2',
 *   tags: {
 *     costCenter: '1234',
 *     owner: 'platform-team'
 *   }
 * });
 * ```
 *
 * @example
 * Used as parent for other resources:
 * ```typescript
 * const rg = new ResourceGroup(stack, 'NetworkRG');
 *
 * // Other resources can be created within this resource group
 * const vnet = new VirtualNetwork(rg, 'MainVNet', {
 *   addressSpace: '10.0.0.0/16'
 * });
 * ```
 */
export declare class ResourceGroups extends Construct implements IResourceGroup {
    /**
     * Underlying L1 construct.
     */
    private readonly armResourceGroup;
    /**
     * Parent subscription stack.
     */
    private readonly subscriptionStack;
    /**
     * Name of the resource group.
     */
    readonly resourceGroupName: string;
    /**
     * Location of the resource group.
     */
    readonly location: string;
    /**
     * Tags applied to the resource group (merged with stack tags).
     */
    readonly tags: Record<string, string>;
    /**
     * Creates a new ResourceGroup construct.
     *
     * @param scope - Parent construct (must be a SubscriptionStack)
     * @param id - Unique identifier for this construct
     * @param props - Optional resource group properties
     *
     * @throws {Error} If scope is not a SubscriptionStack
     *
     * @example
     * ```typescript
     * const rg = new ResourceGroup(subscriptionStack, 'DataRG', {
     *   tags: { purpose: 'data-storage' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props?: ResourceGroupsProps);
    /**
     * Gets the parent SubscriptionStack from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The subscription stack
     * @throws {Error} If parent is not a SubscriptionStack
     */
    private getParentSubscriptionStack;
    /**
     * Checks if a construct is a SubscriptionStack using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has SubscriptionStack properties
     */
    private isSubscriptionStack;
    /**
     * Resolves the resource group name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Resource group properties
     * @returns Resolved resource group name
     */
    private resolveResourceGroupName;
    /**
     * Converts construct ID to purpose identifier for naming.
     *
     * @param id - Construct ID
     * @returns Purpose string for naming
     *
     * @remarks
     * Converts PascalCase/camelCase IDs to lowercase.
     * Examples:
     * - 'DataRG' -> 'datarg'
     * - 'NetworkRG' -> 'networkrg'
     * - 'data-rg' -> 'data-rg'
     */
    private constructIdToPurpose;
}
//# sourceMappingURL=resource-group.d.ts.map