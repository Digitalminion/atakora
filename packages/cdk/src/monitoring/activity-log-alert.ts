/**
 * Azure Activity Log Alert - L2 construct.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/lib';
import { ActivityLogAlertArm } from './activity-log-alert-arm';
import { ActivityLogAlertProps } from './activity-log-alert-types';

/**
 * L2 construct for Azure Activity Log Alerts.
 *
 * @remarks
 * Creates alerts based on Azure Activity Log events (management operations).
 *
 * **Activity Log vs Metric Alerts**:
 * - **Activity Log**: Alerts on management operations (create/delete/update resources)
 * - **Metric Alerts**: Alerts on performance metrics (CPU, memory, etc.)
 *
 * **Common Use Cases**:
 * - Alert when VMs are deleted or created
 * - Monitor policy violations
 * - Track security events
 * - Service health incidents
 * - Resource health status changes
 * - Cost management operations
 * - RBAC role assignments
 *
 * **Alert Categories**:
 * - **Administrative**: Resource creation, deletion, configuration changes
 * - **ServiceHealth**: Azure service incidents and maintenance
 * - **ResourceHealth**: Resource availability status
 * - **Alert**: Metric alert fired/resolved
 * - **Autoscale**: Autoscale operations
 * - **Policy**: Policy evaluation results
 * - **Security**: Security alerts from Azure Security Center
 *
 * @public
 *
 * @example
 * Alert on VM deletion:
 * ```typescript
 * import { ActivityLogAlert, ActivityLogAlertField, ActivityLogAlertCategory } from '@atakora/cdk/monitoring';
 * import { ActionGroups } from '@atakora/cdk/insights';
 *
 * const actionGroup = new ActionGroups(resourceGroupStack, 'Alerts', {
 *   groupShortName: 'Ops',
 *   emailReceivers: [{ name: 'OpsTeam', emailAddress: 'ops@example.com' }]
 * });
 *
 * const vmDeletionAlert = new ActivityLogAlert(subscriptionStack, 'VMDeletionAlert', {
 *   description: 'Alert when any virtual machine is deleted',
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
 *       equals: 'Succeeded'
 *     }
 *   ],
 *   actions: [{ actionGroupId: actionGroup.resourceId }]
 * });
 * ```
 *
 * @example
 * Alert on service health incidents:
 * ```typescript
 * const serviceHealthAlert = new ActivityLogAlert(subscriptionStack, 'ServiceHealthAlert', {
 *   description: 'Alert on Azure service health incidents affecting our subscription',
 *   scopes: ['[subscription().id]'],
 *   conditions: [
 *     {
 *       field: ActivityLogAlertField.CATEGORY,
 *       equals: ActivityLogAlertCategory.SERVICE_HEALTH
 *     },
 *     {
 *       field: 'properties.incidentType',
 *       equals: 'Incident'
 *     }
 *   ],
 *   actions: [{ actionGroupId: actionGroup.resourceId }]
 * });
 * ```
 *
 * @example
 * Alert on resource health degradation:
 * ```typescript
 * const resourceHealthAlert = new ActivityLogAlert(subscriptionStack, 'ResourceHealthAlert', {
 *   description: 'Alert when resources become unavailable or degraded',
 *   scopes: ['[subscription().id]'],
 *   conditions: [
 *     {
 *       field: ActivityLogAlertField.CATEGORY,
 *       equals: ActivityLogAlertCategory.RESOURCE_HEALTH
 *     },
 *     {
 *       field: 'properties.currentHealthStatus',
 *       containsAny: ['Unavailable', 'Degraded']
 *     }
 *   ],
 *   actions: [{ actionGroupId: actionGroup.resourceId }]
 * });
 * ```
 *
 * @example
 * Alert on policy violations:
 * ```typescript
 * const policyViolationAlert = new ActivityLogAlert(subscriptionStack, 'PolicyViolationAlert', {
 *   description: 'Alert when Azure Policy denies a resource deployment',
 *   scopes: ['[subscription().id]'],
 *   conditions: [
 *     {
 *       field: ActivityLogAlertField.CATEGORY,
 *       equals: ActivityLogAlertCategory.POLICY
 *     },
 *     {
 *       field: ActivityLogAlertField.LEVEL,
 *       equals: 'Error'
 *     }
 *   ],
 *   actions: [{ actionGroupId: actionGroup.resourceId }]
 * });
 * ```
 *
 * @example
 * Alert on security events:
 * ```typescript
 * const securityAlert = new ActivityLogAlert(subscriptionStack, 'SecurityAlert', {
 *   description: 'Alert on security events from Azure Security Center',
 *   scopes: ['[subscription().id]'],
 *   conditions: [
 *     {
 *       field: ActivityLogAlertField.CATEGORY,
 *       equals: ActivityLogAlertCategory.SECURITY
 *     },
 *     {
 *       field: ActivityLogAlertField.LEVEL,
 *       containsAny: ['Critical', 'Error', 'Warning']
 *     }
 *   ],
 *   actions: [{ actionGroupId: actionGroup.resourceId }]
 * });
 * ```
 *
 * @example
 * Alert on cost management operations:
 * ```typescript
 * const budgetExceededAlert = new ActivityLogAlert(subscriptionStack, 'BudgetExceededAlert', {
 *   description: 'Alert when budget threshold is exceeded',
 *   scopes: ['[subscription().id]'],
 *   conditions: [
 *     {
 *       field: ActivityLogAlertField.CATEGORY,
 *       equals: ActivityLogAlertCategory.ADMINISTRATIVE
 *     },
 *     {
 *       field: ActivityLogAlertField.OPERATION_NAME,
 *       equals: 'Microsoft.CostManagement/budgets/write'
 *     }
 *   ],
 *   actions: [{ actionGroupId: actionGroup.resourceId }]
 * });
 * ```
 *
 * @example
 * Alert on network security group changes:
 * ```typescript
 * const nsgChangeAlert = new ActivityLogAlert(subscriptionStack, 'NSGChangeAlert', {
 *   description: 'Alert when Network Security Group rules are modified',
 *   scopes: ['[subscription().id]'],
 *   conditions: [
 *     {
 *       field: ActivityLogAlertField.CATEGORY,
 *       equals: ActivityLogAlertCategory.ADMINISTRATIVE
 *     },
 *     {
 *       field: ActivityLogAlertField.RESOURCE_TYPE,
 *       equals: 'Microsoft.Network/networkSecurityGroups'
 *     },
 *     {
 *       field: ActivityLogAlertField.OPERATION_NAME,
 *       containsAny: [
 *         'Microsoft.Network/networkSecurityGroups/write',
 *         'Microsoft.Network/networkSecurityGroups/delete',
 *         'Microsoft.Network/networkSecurityGroups/securityRules/write',
 *         'Microsoft.Network/networkSecurityGroups/securityRules/delete'
 *       ]
 *     }
 *   ],
 *   actions: [{ actionGroupId: actionGroup.resourceId }]
 * });
 * ```
 */
export class ActivityLogAlert extends Construct {
  /**
   * Underlying L1 construct.
   * @internal
   */
  private readonly armAlert: ActivityLogAlertArm;

  /**
   * Alert name.
   */
  public readonly alertName: string;

  /**
   * Resource ID of the alert.
   */
  public readonly alertId: string;

  /**
   * Creates a new ActivityLogAlert.
   *
   * @param scope - Parent construct (must be SubscriptionStack)
   * @param id - Unique construct ID
   * @param props - Activity log alert properties
   *
   * @throws {Error} If scope is not a SubscriptionStack
   */
  constructor(scope: Construct, id: string, props: ActivityLogAlertProps) {
    super(scope, id);

    // Validate parent is SubscriptionStack
    this.validateParentScope(scope);

    // Generate alert name from construct ID
    this.alertName = this.generateAlertName(id);

    // Create underlying L1 resource
    this.armAlert = new ActivityLogAlertArm(this, 'Resource', {
      activityLogAlertName: this.alertName,
      description: props.description,
      enabled: props.enabled,
      scopes: props.scopes,
      conditions: props.conditions,
      actions: props.actions,
      location: props.location,
    });

    this.alertId = this.armAlert.resourceId;
  }

  /**
   * Validates that the parent scope is a SubscriptionStack.
   *
   * @param scope - Parent construct
   * @throws {Error} If parent is not a SubscriptionStack
   * @internal
   */
  private validateParentScope(scope: Construct): void {
    // Walk up the tree to find SubscriptionStack
    let current: Construct | undefined = scope;
    let foundSubscriptionStack = false;

    while (current) {
      // Duck-type check for SubscriptionStack
      if (this.isSubscriptionStack(current)) {
        foundSubscriptionStack = true;
        break;
      }
      current = current.node.scope;
    }

    if (!foundSubscriptionStack) {
      throw new Error(
        `ActivityLogAlert '${this.node.id}' must be created within a SubscriptionStack. ` +
          'Activity log alerts are subscription-scoped resources.'
      );
    }
  }

  /**
   * Checks if a construct is a SubscriptionStack using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has SubscriptionStack properties
   * @internal
   */
  private isSubscriptionStack(construct: any): boolean {
    return (
      construct &&
      typeof construct.subscriptionId === 'string' &&
      construct.scope === 'subscription'
    );
  }

  /**
   * Generates an alert name from construct ID.
   *
   * @param id - Construct ID
   * @returns Alert name
   * @internal
   */
  private generateAlertName(id: string): string {
    // Convert PascalCase/camelCase to kebab-case and limit length
    const kebabCase = id
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Azure activity log alert names have a 260 character limit
    return kebabCase.substring(0, 260);
  }
}
