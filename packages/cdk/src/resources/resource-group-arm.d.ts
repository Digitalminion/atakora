import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmResourceGroupsProps } from './resource-group-types';
/**
 * L1 construct for Azure Resource Group.
 *
 * @remarks
 * Direct mapping to Microsoft.Resources/resourceGroups ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Resources/resourceGroups`
 * **API Version**: `2025-04-01`
 * **Deployment Scope**: Subscription
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link ResourceGroup} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmResourceGroup } from '@atakora/lib';
 *
 * const rg = new ArmResourceGroup(stack, 'DataRG', {
 *   resourceGroupName: 'rg-digital-minion-authr-data-nonprod-eastus-01',
 *   location: 'eastus',
 *   tags: {
 *     environment: 'nonprod',
 *     project: 'authr'
 *   }
 * });
 * ```
 *
 * @example
 * Minimal required properties:
 * ```typescript
 * const rg = new ArmResourceGroup(stack, 'MinimalRG', {
 *   resourceGroupName: 'my-resource-group',
 *   location: 'eastus'
 * });
 * ```
 */
export declare class ArmResourceGroups extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for resource groups.
     */
    readonly scope: DeploymentScope.Subscription;
    /**
     * Name of the resource group.
     */
    readonly resourceGroupName: string;
    /**
     * Resource name (same as resourceGroupName for resource groups).
     */
    readonly name: string;
    /**
     * Azure region where the resource group is located.
     */
    readonly location: string;
    /**
     * Tags applied to the resource group.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}`
     */
    readonly resourceId: string;
    /**
     * Creates a new ArmResourceGroup construct.
     *
     * @param scope - Parent construct (typically a SubscriptionStack)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Resource group properties
     *
     * @throws {Error} If resourceGroupName is empty or exceeds 90 characters
     * @throws {Error} If location is empty
     * @throws {Error} If resourceGroupName contains invalid characters
     */
    constructor(scope: Construct, id: string, props: ArmResourceGroupsProps);
    /**
     * Validates resource group properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmResourceGroupsProps): void;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     * This will be implemented by Grace's synthesis pipeline.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=resource-group-arm.d.ts.map