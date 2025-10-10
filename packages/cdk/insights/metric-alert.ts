import { Construct } from '@atakora/lib';
import type { IResourceGroup } from '@atakora/lib';
import { ArmMetricAlerts } from './metric-alert-arm';
import type { MetricAlertsProps, IMetricAlert, MetricAlertCriterion } from './metric-alert-types';
import { CriterionType } from './metric-alert-types';

/**
 * L2 construct for Azure Metric Alert.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides both simplified and advanced interfaces for metric alerts.
 *
 * **ARM Resource Type**: `Microsoft.Insights/metricAlerts`
 * **API Version**: `2018-03-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Simple alert with single metric:
 * ```typescript
 * const alert = new MetricAlert(resourceGroup, 'CpuAlert', {
 *   description: 'Alert when CPU exceeds 80%',
 *   severity: 2,
 *   scopes: [appService.resourceId],
 *   metricName: 'CpuPercentage',
 *   operator: MetricAlertOperator.GREATER_THAN,
 *   threshold: 80,
 *   timeAggregation: TimeAggregation.AVERAGE,
 *   actions: [{ actionGroupId: actionGroup.actionGroupId }]
 * });
 * ```
 */
export class MetricAlerts extends Construct implements IMetricAlert {
  /**
   * Underlying L1 construct.
   */
  private readonly armMetricAlert: ArmMetricAlerts;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the metric alert.
   */
  public readonly name: string;

  /**
   * Location of the metric alert.
   */
  public readonly location: string;

  /**
   * Resource group name where the alert is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the metric alert.
   */
  public readonly resourceId: string;

  /**
   * Tags applied to the alert (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * Severity of the alert (0-4).
   */
  public readonly severity: number;

  /**
   * Whether the alert is enabled.
   */
  public readonly enabled: boolean;

  /**
   * How often the metric alert is evaluated (ISO 8601 duration).
   */
  public readonly evaluationFrequency: string;

  /**
   * Evaluation time window size (ISO 8601 duration).
   */
  public readonly windowSize: string;

  /**
   * Creates a new MetricAlert construct.
   */
  constructor(scope: Construct, id: string, props: MetricAlertsProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided alert name
    this.name = this.resolveAlertName(id, props);

    // Default location to Global (metric alerts are global resources)
    this.location = props?.location ?? 'Global';

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Set alert properties
    this.severity = props.severity ?? 2;
    this.enabled = props.enabled ?? true;
    this.evaluationFrequency = props.evaluationFrequency ?? 'PT1M';
    this.windowSize = props.windowSize ?? 'PT5M';

    // Build criteria
    const criteria = this.buildCriteria(props);

    // Create underlying L1 resource
    this.armMetricAlert = new ArmMetricAlerts(scope, `${id}-Resource`, {
      name: this.name,
      location: this.location,
      description: props.description,
      severity: this.severity,
      enabled: this.enabled,
      scopes: props.scopes,
      evaluationFrequency: this.evaluationFrequency,
      windowSize: this.windowSize,
      criteria,
      actions: props.actions,
      autoMitigate: props.autoMitigate ?? true,
      tags: this.tags,
    });

    // Get resource ID from L1
    this.resourceId = this.armMetricAlert.resourceId;
  }

  /**
   * Builds alert criteria from props.
   */
  private buildCriteria(props: MetricAlertsProps): any {
    // If advanced criteria provided, use it
    if (props.criteria && props.criteria.length > 0) {
      return {
        'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
        allOf: props.criteria,
      };
    }

    // Build simple criteria from metricName/operator/threshold
    if (
      props.metricName &&
      props.operator !== undefined &&
      props.threshold !== undefined &&
      props.timeAggregation
    ) {
      const criterion: MetricAlertCriterion = {
        criterionType: CriterionType.STATIC_THRESHOLD,
        name: props.metricName,
        metricName: props.metricName,
        operator: props.operator,
        threshold: props.threshold,
        timeAggregation: props.timeAggregation,
      };

      return {
        'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
        allOf: [criterion],
      };
    }

    throw new Error(
      'Either criteria or (metricName + operator + threshold + timeAggregation) must be provided'
    );
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    let current: Construct | undefined = scope;

    while (current) {
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'MetricAlert must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface.
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
   */
  private getParentTags(scope: Construct): Record<string, string> {
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  /**
   * Resolves the alert name from props or auto-generates it.
   */
  private resolveAlertName(id: string, props?: MetricAlertsProps): string {
    if (props?.name) {
      return props.name;
    }

    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('alert', purpose);
    }

    return `alert-${id.toLowerCase()}`;
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
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
   */
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }

  /**
   * Creates a reference to an existing metric alert by resource ID.
   *
   * @param scope - Parent construct
   * @param id - Construct ID
   * @param metricAlertId - Full Azure resource ID of the metric alert
   * @returns Metric alert interface
   *
   * @example
   * ```typescript
   * const alert = MetricAlert.fromMetricAlertId(
   *   scope,
   *   'ExistingAlert',
   *   '/subscriptions/.../resourceGroups/.../providers/Microsoft.Insights/metricAlerts/my-alert'
   * );
   * ```
   */
  public static fromMetricAlertId(
    scope: Construct,
    id: string,
    metricAlertId: string
  ): IMetricAlert {
    // Parse resource ID to extract metric alert name
    const parts = metricAlertId.split('/');
    const name = parts[parts.length - 1];

    return {
      name,
      resourceId: metricAlertId,
    };
  }
}
