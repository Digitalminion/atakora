import { Construct } from '@atakora/cdk';
import type { ActionGroupsProps, IActionGroup } from './action-group-types';
/**
 * L2 construct for Azure Action Group.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates action group name using parent naming context
 * - Defaults location to 'Global' (action groups are global resources)
 * - Merges tags with parent tags
 * - Sensible defaults for enabled state
 * - Support for multiple receiver types
 *
 * **ARM Resource Type**: `Microsoft.Insights/actionGroups`
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage:
 * ```typescript
 * import { ActionGroup } from '@atakora/cdk/insights';
 *
 * const actionGroup = new ActionGroup(resourceGroup, 'Alerts', {
 *   groupShortName: 'alerts',
 *   emailReceivers: [
 *     { name: 'admin', emailAddress: 'admin@example.com' }
 *   ]
 * });
 * ```
 *
 * @example
 * With multiple receiver types:
 * ```typescript
 * const actionGroup = new ActionGroup(resourceGroup, 'Alerts', {
 *   groupShortName: 'ops',
 *   emailReceivers: [
 *     { name: 'ops-team', emailAddress: 'ops@example.com', useCommonAlertSchema: true }
 *   ],
 *   smsReceivers: [
 *     { name: 'on-call', countryCode: '1', phoneNumber: '5551234567' }
 *   ],
 *   webhookReceivers: [
 *     { name: 'slack', serviceUri: 'https://hooks.slack.com/...', useCommonAlertSchema: true }
 *   ]
 * });
 * ```
 */
export declare class ActionGroups extends Construct implements IActionGroup {
    /**
     * Underlying L1 construct.
     */
    private readonly armActionGroup;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the action group.
     */
    readonly actionGroupName: string;
    /**
     * Location of the action group.
     */
    readonly location: string;
    /**
     * Resource group name where the action group is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the action group.
     */
    readonly actionGroupId: string;
    /**
     * Tags applied to the action group (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * Short name of the action group.
     */
    readonly groupShortName: string;
    /**
     * Creates a new ActionGroup construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Action group properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     * @throws {Error} If groupShortName is not provided
     *
     * @example
     * ```typescript
     * const actionGroup = new ActionGroup(resourceGroup, 'Alerts', {
     *   groupShortName: 'alerts',
     *   emailReceivers: [
     *     { name: 'admin', emailAddress: 'admin@example.com', useCommonAlertSchema: true }
     *   ],
     *   tags: { purpose: 'monitoring' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props: ActionGroupsProps);
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
     * Resolves the action group name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Action group properties
     * @returns Resolved action group name
     */
    private resolveActionGroupName;
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
     * Imports an existing Action Group by resource ID.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for this construct
     * @param actionGroupId - Resource ID of the existing action group
     * @returns Action Group reference
     *
     * @example
     * ```typescript
     * const actionGroup = ActionGroup.fromActionGroupId(
     *   this,
     *   'ExistingActionGroup',
     *   '/subscriptions/.../actionGroups/ag-existing'
     * );
     * ```
     */
    static fromActionGroupId(scope: Construct, id: string, actionGroupId: string): IActionGroup;
}
//# sourceMappingURL=action-group.d.ts.map