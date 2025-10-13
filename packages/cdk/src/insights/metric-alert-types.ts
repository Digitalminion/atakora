import type { IActionGroup } from './action-group-types';
import { schema } from '@atakora/lib';

/**
 * Type definitions for Metric Alert constructs.
 *
 * @packageDocumentation
 */

// Re-export enums from @atakora/lib schema
export import CriterionType = schema.insights.CriterionType;
export import MetricAlertOperator = schema.insights.MetricAlertOperator;

/**
 * Time aggregation type for metrics.
 */
export const TimeAggregation = schema.insights.TimeAggregation;
export type TimeAggregation = typeof TimeAggregation[keyof typeof TimeAggregation];

/**
 * Alert sensitivity for dynamic thresholds.
 */
export const DynamicThresholdSensitivity = schema.insights.DynamicThresholdSensitivity;
export type DynamicThresholdSensitivity = typeof DynamicThresholdSensitivity[keyof typeof DynamicThresholdSensitivity];

/**
 * Metric dimension for filtering.
 */
export interface MetricDimension {
  /**
   * Name of the dimension.
   */
  readonly name: string;

  /**
   * Operator for dimension filtering.
   */
  readonly operator: 'Include' | 'Exclude';

  /**
   * Values to include or exclude.
   */
  readonly values: readonly string[];
}

/**
 * Static threshold criterion for metric alerts.
 */
export interface StaticThresholdCriterion {
  /**
   * Type of criterion.
   */
  readonly criterionType: CriterionType.STATIC_THRESHOLD;

  /**
   * Name of the criterion.
   */
  readonly name: string;

  /**
   * Metric name to alert on.
   */
  readonly metricName: string;

  /**
   * Metric namespace (optional).
   */
  readonly metricNamespace?: string;

  /**
   * Operator for threshold comparison.
   */
  readonly operator: MetricAlertOperator;

  /**
   * Threshold value.
   */
  readonly threshold: number;

  /**
   * Time aggregation type.
   */
  readonly timeAggregation: TimeAggregation;

  /**
   * Dimensions to filter the metric.
   */
  readonly dimensions?: readonly MetricDimension[];

  /**
   * Skip metric validation.
   */
  readonly skipMetricValidation?: boolean;
}

/**
 * Dynamic threshold criterion for metric alerts.
 */
export interface DynamicThresholdCriterion {
  /**
   * Type of criterion.
   */
  readonly criterionType: CriterionType.DYNAMIC_THRESHOLD;

  /**
   * Name of the criterion.
   */
  readonly name: string;

  /**
   * Metric name to alert on.
   */
  readonly metricName: string;

  /**
   * Metric namespace (optional).
   */
  readonly metricNamespace?: string;

  /**
   * Operator for threshold comparison.
   */
  readonly operator:
    | MetricAlertOperator.GREATER_THAN
    | MetricAlertOperator.LESS_THAN
    | MetricAlertOperator.GREATER_THAN_OR_EQUAL
    | MetricAlertOperator.LESS_THAN_OR_EQUAL;

  /**
   * Alert sensitivity.
   */
  readonly alertSensitivity: DynamicThresholdSensitivity;

  /**
   * Time aggregation type.
   */
  readonly timeAggregation: TimeAggregation;

  /**
   * Number of violations to trigger alert.
   */
  readonly failingPeriods: {
    readonly numberOfEvaluationPeriods: number;
    readonly minFailingPeriodsToAlert: number;
  };

  /**
   * Dimensions to filter the metric.
   */
  readonly dimensions?: readonly MetricDimension[];

  /**
   * Skip metric validation.
   */
  readonly skipMetricValidation?: boolean;
}

/**
 * Metric alert criterion (union type).
 */
export type MetricAlertCriterion = StaticThresholdCriterion | DynamicThresholdCriterion;

/**
 * Action to take when alert fires.
 */
export interface MetricAlertAction {
  /**
   * Action group resource ID.
   */
  readonly actionGroupId: string;

  /**
   * Webhook properties for the action.
   */
  readonly webHookProperties?: Record<string, string>;
}

/**
 * Properties for ArmMetricAlert (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Insights/metricAlerts ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2018-03-01
 *
 * @example
 * ```typescript
 * const props: ArmMetricAlertsProps = {
 *   name: 'alert-cpu-high',
 *   location: 'Global',
 *   description: 'Alert when CPU exceeds 80%',
 *   severity: 2,
 *   enabled: true,
 *   scopes: ['/subscriptions/.../resourceGroups/.../providers/.../resources/...'],
 *   evaluationFrequency: 'PT1M',
 *   windowSize: 'PT5M',
 *   criteria: {
 *     'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
 *     allOf: [...]
 *   },
 *   actions: [{ actionGroupId: '...' }]
 * };
 * ```
 */
export interface ArmMetricAlertsProps {
  /**
   * Name of the metric alert.
   */
  readonly name: string;

  /**
   * Azure region for the alert rule.
   *
   * @remarks
   * Metric alerts are typically created as 'Global'.
   */
  readonly location: string;

  /**
   * Description of the alert.
   */
  readonly description?: string;

  /**
   * Severity of the alert (0-4).
   *
   * @remarks
   * - 0: Critical
   * - 1: Error
   * - 2: Warning
   * - 3: Informational
   * - 4: Verbose
   */
  readonly severity: number;

  /**
   * Whether the alert is enabled.
   */
  readonly enabled: boolean;

  /**
   * Resource IDs to monitor.
   */
  readonly scopes: readonly string[];

  /**
   * How often the metric alert is evaluated.
   *
   * @remarks
   * ISO 8601 duration format (e.g., 'PT1M', 'PT5M', 'PT15M', 'PT30M', 'PT1H')
   */
  readonly evaluationFrequency: string;

  /**
   * Period of time used to monitor alert activity.
   *
   * @remarks
   * ISO 8601 duration format (e.g., 'PT1M', 'PT5M', 'PT15M', 'PT30M', 'PT1H', 'PT6H', 'PT12H', 'P1D')
   */
  readonly windowSize: string;

  /**
   * Target resource type for the alert.
   */
  readonly targetResourceType?: string;

  /**
   * Target resource region for the alert.
   */
  readonly targetResourceRegion?: string;

  /**
   * Alert criteria.
   */
  readonly criteria: {
    readonly 'odata.type': string;
    readonly allOf: readonly MetricAlertCriterion[];
  };

  /**
   * Actions to take when alert fires.
   */
  readonly actions?: readonly MetricAlertAction[];

  /**
   * Whether to auto-mitigate the alert.
   */
  readonly autoMitigate?: boolean;

  /**
   * Tags to apply to the alert.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for MetricAlert (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Simple CPU alert
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
export interface MetricAlertsProps {
  /**
   * Name of the metric alert.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   */
  readonly name?: string;

  /**
   * Azure region for the alert rule.
   *
   * @remarks
   * Defaults to 'Global' as metric alerts are global resources.
   */
  readonly location?: string;

  /**
   * Description of the alert.
   */
  readonly description?: string;

  /**
   * Severity of the alert (0-4).
   *
   * @remarks
   * - 0: Critical
   * - 1: Error
   * - 2: Warning (default)
   * - 3: Informational
   * - 4: Verbose
   */
  readonly severity?: number;

  /**
   * Whether the alert is enabled.
   *
   * @remarks
   * Defaults to true.
   */
  readonly enabled?: boolean;

  /**
   * Resource IDs to monitor.
   */
  readonly scopes: readonly string[];

  /**
   * How often the metric alert is evaluated.
   *
   * @remarks
   * Defaults to 'PT1M' (1 minute).
   */
  readonly evaluationFrequency?: string;

  /**
   * Period of time used to monitor alert activity.
   *
   * @remarks
   * Defaults to 'PT5M' (5 minutes).
   */
  readonly windowSize?: string;

  /**
   * Metric name to alert on (simplified interface).
   *
   * @remarks
   * For simple alerts with a single metric.
   */
  readonly metricName?: string;

  /**
   * Operator for threshold comparison (simplified interface).
   */
  readonly operator?: MetricAlertOperator;

  /**
   * Threshold value (simplified interface).
   */
  readonly threshold?: number;

  /**
   * Time aggregation type (simplified interface).
   */
  readonly timeAggregation?: TimeAggregation;

  /**
   * Alert criteria (advanced interface).
   *
   * @remarks
   * For complex alerts with multiple metrics. If provided, metricName/operator/threshold are ignored.
   */
  readonly criteria?: readonly MetricAlertCriterion[];

  /**
   * Actions to take when alert fires.
   */
  readonly actions?: readonly MetricAlertAction[];

  /**
   * Whether to auto-mitigate the alert.
   *
   * @remarks
   * Defaults to true.
   */
  readonly autoMitigate?: boolean;

  /**
   * Tags to apply to the alert.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Metric Alert reference.
 *
 * @remarks
 * Allows resources to reference a metric alert without depending on the construct class.
 */
export interface IMetricAlert {
  /**
   * Name of the metric alert.
   */
  readonly name: string;

  /**
   * Resource ID of the metric alert.
   */
  readonly resourceId: string;
}
