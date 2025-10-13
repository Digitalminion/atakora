/**
 * Type definitions for Autoscale Setting constructs.
 *
 * @packageDocumentation
 */
import { schema } from '@atakora/lib';
/**
 * Metric trigger operator.
 */
export declare const MetricOperator: typeof schema.insights.MetricOperator;
export type MetricOperator = typeof MetricOperator[keyof typeof MetricOperator];
/**
 * Time aggregation type.
 */
export declare const TimeAggregationType: typeof schema.insights.TimeAggregationType;
export type TimeAggregationType = typeof TimeAggregationType[keyof typeof TimeAggregationType];
/**
 * Scale direction.
 */
export declare const ScaleDirection: typeof schema.insights.ScaleDirection;
export type ScaleDirection = typeof ScaleDirection[keyof typeof ScaleDirection];
/**
 * Scale type.
 */
export declare const ScaleType: typeof schema.insights.ScaleType;
export type ScaleType = typeof ScaleType[keyof typeof ScaleType];
/**
 * Recurrence frequency.
 */
export declare const RecurrenceFrequency: typeof schema.insights.RecurrenceFrequency;
export type RecurrenceFrequency = typeof RecurrenceFrequency[keyof typeof RecurrenceFrequency];
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
export interface ArmAutoscaleSettingsProps {
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
export interface AutoscaleSettingsProps {
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
//# sourceMappingURL=autoscale-setting-types.d.ts.map