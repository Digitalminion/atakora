/**
 * Type definitions for Autoscale Setting constructs.
 *
 * @packageDocumentation
 */

/**
 * Metric trigger operator.
 */
export enum MetricOperator {
  EQUALS = 'Equals',
  NOT_EQUALS = 'NotEquals',
  GREATER_THAN = 'GreaterThan',
  GREATER_THAN_OR_EQUAL = 'GreaterThanOrEqual',
  LESS_THAN = 'LessThan',
  LESS_THAN_OR_EQUAL = 'LessThanOrEqual',
}

/**
 * Time aggregation type.
 */
export enum TimeAggregationType {
  AVERAGE = 'Average',
  MINIMUM = 'Minimum',
  MAXIMUM = 'Maximum',
  TOTAL = 'Total',
  COUNT = 'Count',
  LAST = 'Last',
}

/**
 * Scale direction.
 */
export enum ScaleDirection {
  INCREASE = 'Increase',
  DECREASE = 'Decrease',
}

/**
 * Scale type.
 */
export enum ScaleType {
  CHANGE_COUNT = 'ChangeCount',
  PERCENT_CHANGE_COUNT = 'PercentChangeCount',
  EXACT_COUNT = 'ExactCount',
  SERVICE_ALLOWED_NEXT_VALUE = 'ServiceAllowedNextValue',
}

/**
 * Recurrence frequency.
 */
export enum RecurrenceFrequency {
  NONE = 'None',
  SECOND = 'Second',
  MINUTE = 'Minute',
  HOUR = 'Hour',
  DAY = 'Day',
  WEEK = 'Week',
  MONTH = 'Month',
  YEAR = 'Year',
}

/**
 * Metric trigger for autoscale.
 */
export interface MetricTrigger {
  /**
   * Resource ID of the metric source.
   */
  readonly metricResourceId: string;

  /**
   * Name of the metric.
   */
  readonly metricName: string;

  /**
   * Namespace of the metric.
   */
  readonly metricNamespace?: string;

  /**
   * Time grain for metric evaluation.
   */
  readonly timeGrain: string;

  /**
   * Statistic type.
   */
  readonly statistic: TimeAggregationType;

  /**
   * Time window for metric evaluation.
   */
  readonly timeWindow: string;

  /**
   * Time aggregation type.
   */
  readonly timeAggregation: TimeAggregationType;

  /**
   * Operator for threshold comparison.
   */
  readonly operator: MetricOperator;

  /**
   * Threshold value.
   */
  readonly threshold: number;

  /**
   * Dimensions for the metric.
   */
  readonly dimensions?: readonly {
    readonly DimensionName: string;
    readonly Operator: 'Equals' | 'NotEquals';
    readonly Values: readonly string[];
  }[];

  /**
   * Whether to divide per instance.
   */
  readonly dividePerInstance?: boolean;
}

/**
 * Scale action configuration.
 */
export interface ScaleAction {
  /**
   * Direction to scale.
   */
  readonly direction: ScaleDirection;

  /**
   * Type of scale action.
   */
  readonly type: ScaleType;

  /**
   * Value to scale by.
   */
  readonly value: string;

  /**
   * Cooldown period after scaling.
   */
  readonly cooldown: string;
}

/**
 * Autoscale rule combining trigger and action.
 */
export interface AutoscaleRule {
  /**
   * Metric trigger for this rule.
   */
  readonly metricTrigger: MetricTrigger;

  /**
   * Scale action to take.
   */
  readonly scaleAction: ScaleAction;
}

/**
 * Time window for schedule-based scaling.
 */
export interface TimeWindow {
  /**
   * Time zone for the schedule.
   */
  readonly timeZone?: string;

  /**
   * Start time.
   */
  readonly start: string;

  /**
   * End time.
   */
  readonly end: string;
}

/**
 * Recurrence pattern for schedule-based scaling.
 */
export interface Recurrence {
  /**
   * Frequency of recurrence.
   */
  readonly frequency: RecurrenceFrequency;

  /**
   * Schedule for recurrence.
   */
  readonly schedule: {
    readonly timeZone: string;
    readonly days: readonly string[];
    readonly hours: readonly number[];
    readonly minutes: readonly number[];
  };
}

/**
 * Fixed date schedule.
 */
export interface FixedDate {
  /**
   * Time zone.
   */
  readonly timeZone?: string;

  /**
   * Start time.
   */
  readonly start: string;

  /**
   * End time.
   */
  readonly end: string;
}

/**
 * Autoscale profile.
 */
export interface AutoscaleProfile {
  /**
   * Name of the profile.
   */
  readonly name: string;

  /**
   * Capacity configuration.
   */
  readonly capacity: {
    readonly minimum: string;
    readonly maximum: string;
    readonly default: string;
  };

  /**
   * Autoscale rules for this profile.
   */
  readonly rules: readonly AutoscaleRule[];

  /**
   * Fixed date schedule.
   */
  readonly fixedDate?: FixedDate;

  /**
   * Recurrence schedule.
   */
  readonly recurrence?: Recurrence;
}

/**
 * Autoscale notification.
 */
export interface AutoscaleNotification {
  /**
   * Operation type for notification.
   */
  readonly operation: 'Scale';

  /**
   * Email notification settings.
   */
  readonly email?: {
    readonly sendToSubscriptionAdministrator?: boolean;
    readonly sendToSubscriptionCoAdministrators?: boolean;
    readonly customEmails?: readonly string[];
  };

  /**
   * Webhooks to call.
   */
  readonly webhooks?: readonly {
    readonly serviceUri: string;
    readonly properties?: Record<string, string>;
  }[];
}

/**
 * Properties for ArmAutoscaleSetting (L1 construct).
 */
export interface ArmAutoscaleSettingProps {
  /**
   * Name of the autoscale setting.
   */
  readonly name: string;

  /**
   * Azure region.
   */
  readonly location: string;

  /**
   * Resource ID of the target resource.
   */
  readonly targetResourceId: string;

  /**
   * Whether autoscale is enabled.
   */
  readonly enabled?: boolean;

  /**
   * Autoscale profiles.
   */
  readonly profiles: readonly AutoscaleProfile[];

  /**
   * Notifications configuration.
   */
  readonly notifications?: readonly AutoscaleNotification[];

  /**
   * Tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for AutoscaleSetting (L2 construct).
 */
export interface AutoscaleSettingProps {
  /**
   * Name of the autoscale setting.
   */
  readonly name?: string;

  /**
   * Azure region.
   */
  readonly location?: string;

  /**
   * Resource ID of the target resource.
   */
  readonly targetResourceId: string;

  /**
   * Whether autoscale is enabled.
   */
  readonly enabled?: boolean;

  /**
   * Minimum instance count.
   */
  readonly minInstances?: number;

  /**
   * Maximum instance count.
   */
  readonly maxInstances?: number;

  /**
   * Default instance count.
   */
  readonly defaultInstances?: number;

  /**
   * Autoscale profiles (advanced).
   */
  readonly profiles?: readonly AutoscaleProfile[];

  /**
   * Autoscale rules for default profile (simplified).
   */
  readonly rules?: readonly AutoscaleRule[];

  /**
   * Notifications configuration.
   */
  readonly notifications?: readonly AutoscaleNotification[];

  /**
   * Tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Autoscale Setting reference.
 */
export interface IAutoscaleSetting {
  /**
   * Name of the autoscale setting.
   */
  readonly name: string;

  /**
   * Resource ID.
   */
  readonly resourceId: string;
}
