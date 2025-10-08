import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmActionGroupProps } from './types';

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
 * import { ArmActionGroup } from '@atakora/lib';
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
export class ArmActionGroup extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Insights/actionGroups';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-01-01';

  /**
   * Deployment scope for action groups.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the action group.
   */
  public readonly actionGroupName: string;

  /**
   * Resource name (same as actionGroupName).
   */
  public readonly name: string;

  /**
   * Azure region where the action group is located.
   */
  public readonly location: string;

  /**
   * Short name of the action group.
   */
  public readonly groupShortName: string;

  /**
   * Whether the action group is enabled.
   */
  public readonly enabled: boolean;

  /**
   * Email receivers.
   */
  public readonly emailReceivers?: readonly any[];

  /**
   * SMS receivers.
   */
  public readonly smsReceivers?: readonly any[];

  /**
   * Webhook receivers.
   */
  public readonly webhookReceivers?: readonly any[];

  /**
   * Azure App push receivers.
   */
  public readonly azureAppPushReceivers?: readonly any[];

  /**
   * Automation runbook receivers.
   */
  public readonly automationRunbookReceivers?: readonly any[];

  /**
   * Voice receivers.
   */
  public readonly voiceReceivers?: readonly any[];

  /**
   * Logic App receivers.
   */
  public readonly logicAppReceivers?: readonly any[];

  /**
   * Azure Function receivers.
   */
  public readonly azureFunctionReceivers?: readonly any[];

  /**
   * ARM role receivers.
   */
  public readonly armRoleReceivers?: readonly any[];

  /**
   * Event Hub receivers.
   */
  public readonly eventHubReceivers?: readonly any[];

  /**
   * Tags applied to the action group.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Insights/actionGroups/{actionGroupName}`
   */
  public readonly resourceId: string;

  /**
   * Action group resource ID (alias for resourceId).
   */
  public readonly actionGroupId: string;

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
  constructor(scope: Construct, id: string, props: ArmActionGroupProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.actionGroupName = props.actionGroupName;
    this.name = props.actionGroupName;
    this.location = props.location;
    this.groupShortName = props.groupShortName;
    this.enabled = props.enabled ?? true;
    this.emailReceivers = props.emailReceivers;
    this.smsReceivers = props.smsReceivers;
    this.webhookReceivers = props.webhookReceivers;
    this.azureAppPushReceivers = props.azureAppPushReceivers;
    this.automationRunbookReceivers = props.automationRunbookReceivers;
    this.voiceReceivers = props.voiceReceivers;
    this.logicAppReceivers = props.logicAppReceivers;
    this.azureFunctionReceivers = props.azureFunctionReceivers;
    this.armRoleReceivers = props.armRoleReceivers;
    this.eventHubReceivers = props.eventHubReceivers;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Insights/actionGroups/${this.actionGroupName}`;
    this.actionGroupId = this.resourceId;
  }

  /**
   * Validates action group properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmActionGroupProps): void {
    // Validate action group name
    if (!props.actionGroupName || props.actionGroupName.trim() === '') {
      throw new Error('Action group name cannot be empty');
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate group short name
    if (!props.groupShortName || props.groupShortName.trim() === '') {
      throw new Error('Group short name cannot be empty');
    }

    if (props.groupShortName.length > 12) {
      throw new Error(
        `Group short name must be 12 characters or less (got ${props.groupShortName.length})`
      );
    }

    // Validate at least one receiver is configured
    const hasReceivers =
      (props.emailReceivers && props.emailReceivers.length > 0) ||
      (props.smsReceivers && props.smsReceivers.length > 0) ||
      (props.webhookReceivers && props.webhookReceivers.length > 0) ||
      (props.azureAppPushReceivers && props.azureAppPushReceivers.length > 0) ||
      (props.automationRunbookReceivers && props.automationRunbookReceivers.length > 0) ||
      (props.voiceReceivers && props.voiceReceivers.length > 0) ||
      (props.logicAppReceivers && props.logicAppReceivers.length > 0) ||
      (props.azureFunctionReceivers && props.azureFunctionReceivers.length > 0) ||
      (props.armRoleReceivers && props.armRoleReceivers.length > 0) ||
      (props.eventHubReceivers && props.eventHubReceivers.length > 0);

    if (!hasReceivers) {
      throw new Error('At least one receiver must be configured');
    }
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   * This will be implemented by Grace's synthesis pipeline.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): object {
    const properties: any = {
      groupShortName: this.groupShortName,
      enabled: this.enabled,
      emailReceivers: this.emailReceivers ?? [],
      smsReceivers: this.smsReceivers ?? [],
      webhookReceivers: this.webhookReceivers ?? [],
      itsmReceivers: [],
      azureAppPushReceivers: this.azureAppPushReceivers ?? [],
      automationRunbookReceivers: this.automationRunbookReceivers ?? [],
      voiceReceivers: this.voiceReceivers ?? [],
      logicAppReceivers: this.logicAppReceivers ?? [],
      azureFunctionReceivers: this.azureFunctionReceivers ?? [],
      armRoleReceivers: this.armRoleReceivers ?? [],
    };

    // Add Event Hub receivers if available (newer API versions)
    if (this.eventHubReceivers && this.eventHubReceivers.length > 0) {
      properties.eventHubReceivers = this.eventHubReceivers;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.actionGroupName,
      location: this.location,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      properties,
    };
  }
}
