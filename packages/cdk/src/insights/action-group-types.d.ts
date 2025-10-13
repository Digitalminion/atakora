/**
 * Type definitions for Action Group constructs.
 *
 * @packageDocumentation
 */
/**
 * Email receiver configuration.
 */
export interface EmailReceiver {
    /**
     * Name of the email receiver.
     */
    readonly name: string;
    /**
     * Email address of the receiver.
     */
    readonly emailAddress: string;
    /**
     * Use common alert schema for email.
     *
     * @remarks
     * Defaults to true for standardized alert format.
     */
    readonly useCommonAlertSchema?: boolean;
}
/**
 * SMS receiver configuration.
 */
export interface SmsReceiver {
    /**
     * Name of the SMS receiver.
     */
    readonly name: string;
    /**
     * Country code of the receiver.
     *
     * @remarks
     * Example: '1' for US, '44' for UK
     */
    readonly countryCode: string;
    /**
     * Phone number of the receiver.
     */
    readonly phoneNumber: string;
}
/**
 * Webhook receiver configuration.
 */
export interface WebhookReceiver {
    /**
     * Name of the webhook receiver.
     */
    readonly name: string;
    /**
     * Service URI for the webhook.
     */
    readonly serviceUri: string;
    /**
     * Use common alert schema for webhook.
     */
    readonly useCommonAlertSchema?: boolean;
    /**
     * Use AAD authentication for webhook.
     */
    readonly useAadAuth?: boolean;
    /**
     * Object ID for AAD auth.
     */
    readonly objectId?: string;
    /**
     * Identifier URI for AAD auth.
     */
    readonly identifierUri?: string;
    /**
     * Tenant ID for AAD auth.
     */
    readonly tenantId?: string;
}
/**
 * Azure App push receiver configuration.
 */
export interface AzureAppPushReceiver {
    /**
     * Name of the receiver.
     */
    readonly name: string;
    /**
     * Email address associated with the Azure mobile app account.
     */
    readonly emailAddress: string;
}
/**
 * Automation runbook receiver configuration.
 */
export interface AutomationRunbookReceiver {
    /**
     * Name of the receiver.
     */
    readonly name: string;
    /**
     * Automation account ID.
     */
    readonly automationAccountId: string;
    /**
     * Runbook name.
     */
    readonly runbookName: string;
    /**
     * Webhook resource ID.
     */
    readonly webhookResourceId: string;
    /**
     * Use common alert schema.
     */
    readonly useCommonAlertSchema?: boolean;
    /**
     * Is global runbook.
     */
    readonly isGlobalRunbook: boolean;
    /**
     * Service URI for the webhook.
     */
    readonly serviceUri?: string;
}
/**
 * Voice receiver configuration.
 */
export interface VoiceReceiver {
    /**
     * Name of the voice receiver.
     */
    readonly name: string;
    /**
     * Country code.
     */
    readonly countryCode: string;
    /**
     * Phone number.
     */
    readonly phoneNumber: string;
}
/**
 * Logic App receiver configuration.
 */
export interface LogicAppReceiver {
    /**
     * Name of the receiver.
     */
    readonly name: string;
    /**
     * Logic app resource ID.
     */
    readonly resourceId: string;
    /**
     * Callback URL.
     */
    readonly callbackUrl: string;
    /**
     * Use common alert schema.
     */
    readonly useCommonAlertSchema?: boolean;
}
/**
 * Azure Function receiver configuration.
 */
export interface AzureFunctionReceiver {
    /**
     * Name of the receiver.
     */
    readonly name: string;
    /**
     * Function app resource ID.
     */
    readonly functionAppResourceId: string;
    /**
     * Function name.
     */
    readonly functionName: string;
    /**
     * HTTP trigger URL.
     */
    readonly httpTriggerUrl: string;
    /**
     * Use common alert schema.
     */
    readonly useCommonAlertSchema?: boolean;
}
/**
 * ARM role receiver configuration.
 */
export interface ArmRoleReceiver {
    /**
     * Name of the receiver.
     */
    readonly name: string;
    /**
     * Azure role ID.
     */
    readonly roleId: string;
    /**
     * Use common alert schema.
     */
    readonly useCommonAlertSchema?: boolean;
}
/**
 * Event Hub receiver configuration.
 */
export interface EventHubReceiver {
    /**
     * Name of the receiver.
     */
    readonly name: string;
    /**
     * Event Hub namespace.
     */
    readonly eventHubNameSpace: string;
    /**
     * Event Hub name.
     */
    readonly eventHubName: string;
    /**
     * Use common alert schema.
     */
    readonly useCommonAlertSchema?: boolean;
    /**
     * Subscription ID.
     */
    readonly subscriptionId: string;
    /**
     * Tenant ID.
     */
    readonly tenantId?: string;
}
/**
 * Properties for ArmActionGroup (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Insights/actionGroups ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-01-01
 *
 * @example
 * ```typescript
 * const props: ArmActionGroupsProps = {
 *   actionGroupName: 'ag-alerts-prod',
 *   location: 'Global',
 *   groupShortName: 'alerts',
 *   enabled: true,
 *   emailReceivers: [
 *     { name: 'admin', emailAddress: 'admin@example.com', useCommonAlertSchema: true }
 *   ]
 * };
 * ```
 */
export interface ArmActionGroupsProps {
    /**
     * Name of the action group.
     */
    readonly actionGroupName: string;
    /**
     * Azure region where the action group will be created.
     *
     * @remarks
     * Action groups are typically created as 'Global'.
     */
    readonly location: string;
    /**
     * Short name of the action group.
     *
     * @remarks
     * Must be 12 characters or less. Used in SMS and email notifications.
     */
    readonly groupShortName: string;
    /**
     * Whether the action group is enabled.
     */
    readonly enabled?: boolean;
    /**
     * Email receivers for the action group.
     */
    readonly emailReceivers?: readonly EmailReceiver[];
    /**
     * SMS receivers for the action group.
     */
    readonly smsReceivers?: readonly SmsReceiver[];
    /**
     * Webhook receivers for the action group.
     */
    readonly webhookReceivers?: readonly WebhookReceiver[];
    /**
     * Azure App push receivers.
     */
    readonly azureAppPushReceivers?: readonly AzureAppPushReceiver[];
    /**
     * Automation runbook receivers.
     */
    readonly automationRunbookReceivers?: readonly AutomationRunbookReceiver[];
    /**
     * Voice receivers.
     */
    readonly voiceReceivers?: readonly VoiceReceiver[];
    /**
     * Logic App receivers.
     */
    readonly logicAppReceivers?: readonly LogicAppReceiver[];
    /**
     * Azure Function receivers.
     */
    readonly azureFunctionReceivers?: readonly AzureFunctionReceiver[];
    /**
     * ARM role receivers.
     */
    readonly armRoleReceivers?: readonly ArmRoleReceiver[];
    /**
     * Event Hub receivers.
     */
    readonly eventHubReceivers?: readonly EventHubReceiver[];
    /**
     * Tags to apply to the action group.
     */
    readonly tags?: Record<string, string>;
}
/**
 * Properties for ActionGroup (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage with email
 * const actionGroup = new ActionGroup(resourceGroup, 'Alerts', {
 *   groupShortName: 'alerts',
 *   emailReceivers: [
 *     { name: 'admin', emailAddress: 'admin@example.com' }
 *   ]
 * });
 *
 * // With multiple receiver types
 * const actionGroup = new ActionGroup(resourceGroup, 'Alerts', {
 *   groupShortName: 'ops',
 *   emailReceivers: [
 *     { name: 'ops-team', emailAddress: 'ops@example.com', useCommonAlertSchema: true }
 *   ],
 *   smsReceivers: [
 *     { name: 'on-call', countryCode: '1', phoneNumber: '5551234567' }
 *   ]
 * });
 * ```
 */
export interface ActionGroupsProps {
    /**
     * Name of the action group.
     *
     * @remarks
     * If not provided, will be auto-generated using the stack's naming context.
     */
    readonly actionGroupName?: string;
    /**
     * Azure region where the action group will be created.
     *
     * @remarks
     * Defaults to 'Global' as action groups are global resources.
     */
    readonly location?: string;
    /**
     * Short name of the action group (required).
     *
     * @remarks
     * Must be 12 characters or less. Used in SMS and email notifications.
     */
    readonly groupShortName: string;
    /**
     * Whether the action group is enabled.
     *
     * @remarks
     * Defaults to true.
     */
    readonly enabled?: boolean;
    /**
     * Email receivers for the action group.
     */
    readonly emailReceivers?: readonly EmailReceiver[];
    /**
     * SMS receivers for the action group.
     */
    readonly smsReceivers?: readonly SmsReceiver[];
    /**
     * Webhook receivers for the action group.
     */
    readonly webhookReceivers?: readonly WebhookReceiver[];
    /**
     * Azure App push receivers.
     */
    readonly azureAppPushReceivers?: readonly AzureAppPushReceiver[];
    /**
     * Automation runbook receivers.
     */
    readonly automationRunbookReceivers?: readonly AutomationRunbookReceiver[];
    /**
     * Voice receivers.
     */
    readonly voiceReceivers?: readonly VoiceReceiver[];
    /**
     * Logic App receivers.
     */
    readonly logicAppReceivers?: readonly LogicAppReceiver[];
    /**
     * Azure Function receivers.
     */
    readonly azureFunctionReceivers?: readonly AzureFunctionReceiver[];
    /**
     * ARM role receivers.
     */
    readonly armRoleReceivers?: readonly ArmRoleReceiver[];
    /**
     * Event Hub receivers.
     */
    readonly eventHubReceivers?: readonly EventHubReceiver[];
    /**
     * Tags to apply to the action group.
     *
     * @remarks
     * These tags will be merged with the parent's tags.
     */
    readonly tags?: Record<string, string>;
}
/**
 * Interface for Action Group reference.
 *
 * @remarks
 * Allows resources to reference an action group without depending on the construct class.
 */
export interface IActionGroup {
    /**
     * Name of the action group.
     */
    readonly actionGroupName: string;
    /**
     * Resource ID of the action group.
     */
    readonly actionGroupId: string;
}
//# sourceMappingURL=action-group-types.d.ts.map