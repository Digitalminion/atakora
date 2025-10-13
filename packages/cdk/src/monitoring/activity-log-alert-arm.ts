/**
 * Azure Activity Log Alert - L1 ARM construct.
 *
 * @packageDocumentation
 */

import { Resource, ArmResource, ResourceProps, Construct } from '@atakora/lib';
import { ActivityLogAlertCondition, ActivityLogAlertAction } from './activity-log-alert-types';

/**
 * ARM-level properties for activity log alerts.
 *
 * @internal
 */
export interface ActivityLogAlertArmProps extends ResourceProps {
  readonly activityLogAlertName: string;
  readonly description?: string;
  readonly enabled?: boolean;
  readonly scopes: string[];
  readonly conditions: ActivityLogAlertCondition[];
  readonly actions: ActivityLogAlertAction[];
  readonly location?: string;
}

/**
 * L1 ARM construct for Azure Activity Log Alerts.
 *
 * @remarks
 * Creates Microsoft.Insights/activityLogAlerts resources at subscription scope.
 *
 * **Deployment Scope**: Subscription
 *
 * **ARM Resource Type**: `Microsoft.Insights/activityLogAlerts`
 * **API Version**: `2020-10-01`
 *
 * @internal
 */
export class ActivityLogAlertArm extends Resource {
  public readonly resourceType = 'Microsoft.Insights/activityLogAlerts';
  public readonly apiVersion = '2020-10-01'; // Latest stable API
  public readonly name: string;
  public readonly resourceId: string;

  private readonly props: ActivityLogAlertArmProps;

  constructor(scope: Construct, id: string, props: ActivityLogAlertArmProps) {
    super(scope, id, props);
    this.validateProps(props);
    this.props = props;

    this.name = props.activityLogAlertName;

    // Activity log alerts are subscription-scoped
    this.resourceId = `[concat(subscription().id, '/providers/Microsoft.Insights/activityLogAlerts/', '${this.name}')]`;
  }

  protected validateProps(props: ActivityLogAlertArmProps): void {
    if (!props.activityLogAlertName) {
      throw new Error('Activity log alert requires a name');
    }

    // Validate name length (Azure limit)
    if (props.activityLogAlertName.length > 260) {
      throw new Error(
        `Activity log alert name cannot exceed 260 characters (current: ${props.activityLogAlertName.length})`
      );
    }

    // Validate scopes
    if (!props.scopes || props.scopes.length === 0) {
      throw new Error('Activity log alert requires at least one scope');
    }

    // Validate conditions
    if (!props.conditions || props.conditions.length === 0) {
      throw new Error('Activity log alert requires at least one condition');
    }

    // Category is required as first condition
    const categoryCondition = props.conditions.find((c) => c.field === 'category');
    if (!categoryCondition) {
      throw new Error(
        'Activity log alert requires a condition with field="category"'
      );
    }

    // Validate each condition
    for (const condition of props.conditions) {
      this.validateCondition(condition);
    }

    // Validate actions
    if (!props.actions || props.actions.length === 0) {
      throw new Error('Activity log alert requires at least one action');
    }

    // Validate description length
    if (props.description && props.description.length > 1024) {
      throw new Error(
        `Activity log alert description cannot exceed 1024 characters (current: ${props.description.length})`
      );
    }
  }

  /**
   * Validates a single condition.
   *
   * @param condition - Condition to validate
   * @internal
   */
  private validateCondition(condition: ActivityLogAlertCondition): void {
    if (!condition.field) {
      throw new Error('Activity log alert condition requires a field');
    }

    // Must have either equals or containsAny, but not both
    const hasEquals = condition.equals !== undefined;
    const hasContainsAny = condition.containsAny !== undefined && condition.containsAny.length > 0;

    if (!hasEquals && !hasContainsAny) {
      throw new Error(
        `Activity log alert condition for field "${condition.field}" must have either "equals" or "containsAny"`
      );
    }

    if (hasEquals && hasContainsAny) {
      throw new Error(
        `Activity log alert condition for field "${condition.field}" cannot have both "equals" and "containsAny"`
      );
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: Record<string, unknown> = {
      scopes: this.props.scopes,
      condition: {
        allOf: this.props.conditions.map((c) => this.buildConditionObject(c)),
      },
      actions: {
        actionGroups: this.props.actions.map((a) => this.buildActionObject(a)),
      },
      enabled: this.props.enabled !== undefined ? this.props.enabled : true,
    };

    // Add description if specified
    if (this.props.description) {
      properties.description = this.props.description;
    }

    const resource: ArmResource = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      location: this.props.location || 'Global',
      properties,
    };

    return resource;
  }

  /**
   * Builds ARM condition object from ActivityLogAlertCondition.
   *
   * @param condition - Activity log alert condition
   * @returns ARM condition object
   * @internal
   */
  private buildConditionObject(condition: ActivityLogAlertCondition): Record<string, unknown> {
    const conditionObj: Record<string, unknown> = {
      field: condition.field,
    };

    if (condition.equals !== undefined) {
      conditionObj.equals = condition.equals;
    }

    if (condition.containsAny !== undefined) {
      conditionObj.containsAny = condition.containsAny;
    }

    return conditionObj;
  }

  /**
   * Builds ARM action object from ActivityLogAlertAction.
   *
   * @param action - Activity log alert action
   * @returns ARM action object
   * @internal
   */
  private buildActionObject(action: ActivityLogAlertAction): Record<string, unknown> {
    const actionObj: Record<string, unknown> = {
      actionGroupId: action.actionGroupId,
    };

    if (action.webhookProperties) {
      actionObj.webhookProperties = action.webhookProperties;
    }

    return actionObj;
  }
}
