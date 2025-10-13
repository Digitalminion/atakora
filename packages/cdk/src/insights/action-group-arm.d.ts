import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmActionGroupsProps } from './action-group-types';
/**
 * L1 construct for Azure Action Group.
 *
 * @remarks
 * Direct mapping to Microsoft.Insights/actionGroups ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Insights/actionGroups`
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link ActionGroup} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmActionGroup } from '@atakora/cdk/insights';
 *
 * const actionGroup = new ArmActionGroup(resourceGroup, 'ActionGroup', {
 *   actionGroupName: 'ag-alerts-prod',
 *   location: 'Global',
 *   groupShortName: 'alerts',
 *   enabled: true,
 *   emailReceivers: [
 *     { name: 'admin', emailAddress: 'admin@example.com', useCommonAlertSchema: true }
 *   ]
 * });
 * ```
 */
export declare class ArmActionGroups extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for action groups.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the action group.
     */
    readonly actionGroupName: string;
    /**
     * Resource name (same as actionGroupName).
     */
    readonly name: string;
    /**
     * Azure region where the action group is located.
     */
    readonly location: string;
    /**
     * Short name of the action group.
     */
    readonly groupShortName: string;
    /**
     * Whether the action group is enabled.
     */
    readonly enabled: boolean;
    /**
     * Email receivers.
     */
    readonly emailReceivers?: readonly any[];
    /**
     * SMS receivers.
     */
    readonly smsReceivers?: readonly any[];
    /**
     * Webhook receivers.
     */
    readonly webhookReceivers?: readonly any[];
    /**
     * Azure App push receivers.
     */
    readonly azureAppPushReceivers?: readonly any[];
    /**
     * Automation runbook receivers.
     */
    readonly automationRunbookReceivers?: readonly any[];
    /**
     * Voice receivers.
     */
    readonly voiceReceivers?: readonly any[];
    /**
     * Logic App receivers.
     */
    readonly logicAppReceivers?: readonly any[];
    /**
     * Azure Function receivers.
     */
    readonly azureFunctionReceivers?: readonly any[];
    /**
     * ARM role receivers.
     */
    readonly armRoleReceivers?: readonly any[];
    /**
     * Event Hub receivers.
     */
    readonly eventHubReceivers?: readonly any[];
    /**
     * Tags applied to the action group.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Insights/actionGroups/{actionGroupName}`
     */
    readonly resourceId: string;
    /**
     * Action group resource ID (alias for resourceId).
     */
    readonly actionGroupId: string;
    /**
     * Creates a new ArmActionGroup construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Action group properties
     *
     * @throws {Error} If actionGroupName is invalid
     * @throws {Error} If groupShortName exceeds 12 characters
     * @throws {Error} If location is empty
     */
    constructor(scope: Construct, id: string, props: ArmActionGroupsProps);
    /**
     * Validates action group properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmActionGroupsProps): void;
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
//# sourceMappingURL=action-group-arm.d.ts.map