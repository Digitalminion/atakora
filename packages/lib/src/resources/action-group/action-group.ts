import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmActionGroup } from './arm-action-group';
import type {
  ActionGroupProps,
  IActionGroup,
} from './types';

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
 * import { ActionGroup } from '@atakora/lib';
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
export class ActionGroup extends Construct implements IActionGroup {
  /**
   * Underlying L1 construct.
   */
  private readonly armActionGroup: ArmActionGroup;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the action group.
   */
  public readonly actionGroupName: string;

  /**
   * Location of the action group.
   */
  public readonly location: string;

  /**
   * Resource group name where the action group is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the action group.
   */
  public readonly actionGroupId: string;

  /**
   * Tags applied to the action group (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * Short name of the action group.
   */
  public readonly groupShortName: string;

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
  constructor(
    scope: Construct,
    id: string,
    props: ActionGroupProps
  ) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided action group name
    this.actionGroupName = this.resolveActionGroupName(id, props);

    // Default location to Global (action groups are global resources)
    this.location = props?.location ?? 'Global';

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Set group short name (required)
    this.groupShortName = props.groupShortName;

    // Merge tags with parent (get tags from parent construct if available)
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Create underlying L1 resource
    this.armActionGroup = new ArmActionGroup(scope, `${id}-Resource`, {
      actionGroupName: this.actionGroupName,
      location: this.location,
      groupShortName: this.groupShortName,
      enabled: props?.enabled ?? true,
      emailReceivers: props?.emailReceivers,
      smsReceivers: props?.smsReceivers,
      webhookReceivers: props?.webhookReceivers,
      azureAppPushReceivers: props?.azureAppPushReceivers,
      automationRunbookReceivers: props?.automationRunbookReceivers,
      voiceReceivers: props?.voiceReceivers,
      logicAppReceivers: props?.logicAppReceivers,
      azureFunctionReceivers: props?.azureFunctionReceivers,
      armRoleReceivers: props?.armRoleReceivers,
      eventHubReceivers: props?.eventHubReceivers,
      tags: this.tags,
    });

    // Get resource ID from L1
    this.actionGroupId = this.armActionGroup.actionGroupId;
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
      'ActionGroup must be created within or under a ResourceGroup. ' +
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
   * Resolves the action group name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Action group properties
   * @returns Resolved action group name
   */
  private resolveActionGroupName(
    id: string,
    props?: ActionGroupProps
  ): string {
    // If name provided explicitly, use it
    if (props?.actionGroupName) {
      return props.actionGroupName;
    }

    // Auto-generate name using parent's naming context
    // We need to get the SubscriptionStack for naming
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('ag', purpose);
    }

    // Fallback: construct a basic name from ID
    return `ag-${id.toLowerCase()}`;
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
  public static fromActionGroupId(
    scope: Construct,
    id: string,
    actionGroupId: string
  ): IActionGroup {
    // Parse resource ID to extract action group name
    const parts = actionGroupId.split('/');
    const actionGroupName = parts[parts.length - 1];

    return {
      actionGroupName,
      actionGroupId,
    };
  }
}
