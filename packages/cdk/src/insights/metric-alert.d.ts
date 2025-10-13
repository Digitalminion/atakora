import { Construct } from '@atakora/cdk';
import type { MetricAlertsProps, IMetricAlert } from './metric-alert-types';
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
export declare class MetricAlerts extends Construct implements IMetricAlert {
    /**
     * Underlying L1 construct.
     */
    private readonly armMetricAlert;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the metric alert.
     */
    readonly name: string;
    /**
     * Location of the metric alert.
     */
    readonly location: string;
    /**
     * Resource group name where the alert is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the metric alert.
     */
    readonly resourceId: string;
    /**
     * Tags applied to the alert (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * Severity of the alert (0-4).
     */
    readonly severity: number;
    /**
     * Whether the alert is enabled.
     */
    readonly enabled: boolean;
    /**
     * How often the metric alert is evaluated (ISO 8601 duration).
     */
    readonly evaluationFrequency: string;
    /**
     * Evaluation time window size (ISO 8601 duration).
     */
    readonly windowSize: string;
    /**
     * Creates a new MetricAlert construct.
     */
    constructor(scope: Construct, id: string, props: MetricAlertsProps);
    /**
     * Builds alert criteria from props.
     */
    private buildCriteria;
    /**
     * Gets the parent ResourceGroup from the construct tree.
     */
    private getParentResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface.
     */
    private isResourceGroup;
    /**
     * Gets tags from parent construct hierarchy.
     */
    private getParentTags;
    /**
     * Resolves the alert name from props or auto-generates it.
     */
    private resolveAlertName;
    /**
     * Gets the SubscriptionStack from the construct tree.
     */
    private getSubscriptionStack;
    /**
     * Converts construct ID to purpose identifier for naming.
     */
    private constructIdToPurpose;
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
    static fromMetricAlertId(scope: Construct, id: string, metricAlertId: string): IMetricAlert;
}
//# sourceMappingURL=metric-alert.d.ts.map