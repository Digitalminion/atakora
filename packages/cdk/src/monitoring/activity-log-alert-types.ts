/**
 * Azure Activity Log Alert types and interfaces.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * Activity log alert condition field.
 */
export const ActivityLogAlertField = schema.insights.ActivityLogAlertField;
export type ActivityLogAlertField = typeof ActivityLogAlertField[keyof typeof ActivityLogAlertField];

/**
 * Activity log alert category.
 */
export const ActivityLogAlertCategory = schema.insights.ActivityLogAlertCategory;
export type ActivityLogAlertCategory = typeof ActivityLogAlertCategory[keyof typeof ActivityLogAlertCategory];

/**
 * Activity log alert level.
 */
export const ActivityLogAlertLevel = schema.insights.ActivityLogAlertLevel;
export type ActivityLogAlertLevel = typeof ActivityLogAlertLevel[keyof typeof ActivityLogAlertLevel];

/**
 * Activity log alert status.
 */
export const ActivityLogAlertStatus = schema.insights.ActivityLogAlertStatus;
export type ActivityLogAlertStatus = typeof ActivityLogAlertStatus[keyof typeof ActivityLogAlertStatus];

/**
 * Service health event types.
 */
export const ServiceHealthEventType = schema.insights.ServiceHealthEventType;
export type ServiceHealthEventType = typeof ServiceHealthEventType[keyof typeof ServiceHealthEventType];

/**
 * Resource health status.
 */
export const ResourceHealthStatus = schema.insights.ResourceHealthStatus;
export type ResourceHealthStatus = typeof ResourceHealthStatus[keyof typeof ResourceHealthStatus];

/**
 * Activity log alert condition.
 *
 * @remarks
 * Conditions are evaluated using AND logic (all must match).
 * Use "anyOf" for containsAny to match any value in an array.
 *
 * @public
 */
export interface ActivityLogAlertCondition {
  /**
   * Field to evaluate.
   */
  readonly field: ActivityLogAlertField | string;

  /**
   * Value to match (exact match).
   *
   * @remarks
   * Use either "equals" or "containsAny", not both.
   */
  readonly equals?: string;

  /**
   * Array of values to match (any match).
   *
   * @remarks
   * Use either "equals" or "containsAny", not both.
   */
  readonly containsAny?: string[];
}

/**
 * Activity log alert scope.
 *
 * @remarks
 * Scope determines which resources trigger the alert.
 * Can be subscription-wide or scoped to specific resource groups/resources.
 *
 * @public
 */
export interface ActivityLogAlertScope {
  /**
   * Subscription IDs to monitor.
   *
   * @remarks
   * If not specified, uses the subscription where the alert is deployed.
   * Format: /subscriptions/{subscriptionId}
   */
  readonly subscriptions?: string[];

  /**
   * Resource groups to monitor.
   *
   * @remarks
   * Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}
   */
  readonly resourceGroups?: string[];

  /**
   * Specific resource IDs to monitor.
   *
   * @remarks
   * Full resource IDs.
   */
  readonly resources?: string[];
}

/**
 * Activity log alert action.
 *
 * @public
 */
export interface ActivityLogAlertAction {
  /**
   * Action group resource ID.
   *
   * @remarks
   * Reference to an Action Group that defines notification channels.
   */
  readonly actionGroupId: string;

  /**
   * Webhook properties passed to the action group.
   *
   * @remarks
   * Optional key-value pairs sent with the alert notification.
   */
  readonly webhookProperties?: Record<string, string>;
}

/**
 * Properties for Activity Log Alert construct.
 *
 * @public
 *
 * @example
 * Alert on VM deletion:
 * ```typescript
 * {
 *   description: 'Alert when any VM is deleted',
 *   enabled: true,
 *   scopes: ['[subscription().id]'],
 *   conditions: [
 *     {
 *       field: ActivityLogAlertField.CATEGORY,
 *       equals: ActivityLogAlertCategory.ADMINISTRATIVE
 *     },
 *     {
 *       field: ActivityLogAlertField.OPERATION_NAME,
 *       equals: 'Microsoft.Compute/virtualMachines/delete'
 *     },
 *     {
 *       field: ActivityLogAlertField.STATUS,
 *       equals: ActivityLogAlertStatus.SUCCEEDED
 *     }
 *   ],
 *   actions: [
 *     {
 *       actionGroupId: actionGroup.resourceId
 *     }
 *   ]
 * }
 * ```
 *
 * @example
 * Alert on service health incidents:
 * ```typescript
 * {
 *   description: 'Alert on Azure service health incidents',
 *   enabled: true,
 *   scopes: ['[subscription().id]'],
 *   conditions: [
 *     {
 *       field: ActivityLogAlertField.CATEGORY,
 *       equals: ActivityLogAlertCategory.SERVICE_HEALTH
 *     },
 *     {
 *       field: 'properties.incidentType',
 *       equals: ServiceHealthEventType.INCIDENT
 *     }
 *   ],
 *   actions: [
 *     {
 *       actionGroupId: actionGroup.resourceId
 *     }
 *   ]
 * }
 * ```
 */
export interface ActivityLogAlertProps {
  /**
   * Description of the alert.
   */
  readonly description?: string;

  /**
   * Whether the alert is enabled.
   *
   * @remarks
   * Default: true
   */
  readonly enabled?: boolean;

  /**
   * Scopes for the alert.
   *
   * @remarks
   * Resource IDs to monitor. Typically subscription IDs.
   * Use ['[subscription().id]'] for current subscription.
   */
  readonly scopes: string[];

  /**
   * Alert conditions (all must match).
   */
  readonly conditions: ActivityLogAlertCondition[];

  /**
   * Actions to take when alert fires.
   */
  readonly actions: ActivityLogAlertAction[];

  /**
   * Location for the alert resource.
   *
   * @remarks
   * Default: 'Global'
   * Activity log alerts are global but must specify a location.
   */
  readonly location?: string;
}
