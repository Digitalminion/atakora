/**
 * Enums for Azure Monitor Insights (Microsoft.Insights).
 *
 * @remarks
 * Curated enums for Azure Monitor resources including metric alerts, autoscale settings, and application insights.
 *
 * **Resource Types**:
 * - Microsoft.Insights/metricAlerts
 * - Microsoft.Insights/autoscalesettings
 * - Microsoft.Insights/components
 *
 * **API Versions**: Various (2018-03-01, 2022-10-01, 2020-02-02)
 *
 * @packageDocumentation
 */

// Metric Alert enums

/**
 * Metric alert criterion type discriminator.
 */
export enum CriterionType {
  STATIC_THRESHOLD = 'StaticThresholdCriterion',
  DYNAMIC_THRESHOLD = 'DynamicThresholdCriterion',
}

/**
 * Operator for metric threshold comparison.
 */
export enum MetricAlertOperator {
  EQUALS = 'Equals',
  NOT_EQUALS = 'NotEquals',
  GREATER_THAN = 'GreaterThan',
  GREATER_THAN_OR_EQUAL = 'GreaterThanOrEqual',
  LESS_THAN = 'LessThan',
  LESS_THAN_OR_EQUAL = 'LessThanOrEqual',
}

/**
 * Time aggregation type for metrics.
 */
export enum TimeAggregation {
  AVERAGE = 'Average',
  MINIMUM = 'Minimum',
  MAXIMUM = 'Maximum',
  TOTAL = 'Total',
  COUNT = 'Count',
}

/**
 * Alert sensitivity for dynamic thresholds.
 */
export enum DynamicThresholdSensitivity {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

// Autoscale Setting enums

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

// Application Insights enums

/**
 * Application type for Application Insights.
 */
export enum ApplicationType {
  WEB = 'web',
  OTHER = 'other',
}

/**
 * Request source for Application Insights.
 */
export enum RequestSource {
  REST = 'rest',
  IBIZA_WEB_AI = 'IbizaWebAI CreateComponentExtensionBladeContext',
}

/**
 * Flow type for Application Insights.
 */
export enum FlowType {
  BLUEFIELD = 'Bluefield',
  REDFLAG = 'RedFlag',
}

/**
 * Public network access options.
 */
export enum PublicNetworkAccess {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
}

/**
 * Ingestion mode for Application Insights.
 */
export enum IngestionMode {
  APPLICATION_INSIGHTS = 'ApplicationInsights',
  APPLICATION_INSIGHTS_WITH_DIAGNOSTIC_SETTINGS = 'ApplicationInsightsWithDiagnosticSettings',
  LOG_ANALYTICS = 'LogAnalytics',
}

// Activity Log Alert enums

/**
 * Activity log alert condition field.
 */
export enum ActivityLogAlertField {
  CATEGORY = 'category',
  RESOURCE_GROUP = 'resourceGroup',
  RESOURCE_ID = 'resourceId',
  RESOURCE_TYPE = 'resourceType',
  RESOURCE_PROVIDER = 'resourceProvider',
  OPERATION_NAME = 'operationName',
  LEVEL = 'level',
  STATUS = 'status',
  SUB_STATUS = 'subStatus',
  CALLER = 'caller',
  RECOMMENDATION_TYPE = 'recommendationType',
  RECOMMENDATION_CATEGORY = 'recommendationCategory',
  RECOMMENDATION_IMPACT = 'recommendationImpact',
}

/**
 * Activity log alert category.
 */
export enum ActivityLogAlertCategory {
  ADMINISTRATIVE = 'Administrative',
  SERVICE_HEALTH = 'ServiceHealth',
  RESOURCE_HEALTH = 'ResourceHealth',
  ALERT = 'Alert',
  AUTOSCALE = 'Autoscale',
  POLICY = 'Policy',
  RECOMMENDATION = 'Recommendation',
  SECURITY = 'Security',
}

/**
 * Activity log alert level.
 */
export enum ActivityLogAlertLevel {
  CRITICAL = 'Critical',
  ERROR = 'Error',
  WARNING = 'Warning',
  INFORMATIONAL = 'Informational',
  VERBOSE = 'Verbose',
}

/**
 * Activity log alert status.
 */
export enum ActivityLogAlertStatus {
  STARTED = 'Started',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
}

/**
 * Service health event types.
 */
export enum ServiceHealthEventType {
  INCIDENT = 'Incident',
  MAINTENANCE = 'Maintenance',
  INFORMATION = 'Information',
  ACTION_REQUIRED = 'ActionRequired',
  SECURITY = 'Security',
}

/**
 * Resource health status.
 */
export enum ResourceHealthStatus {
  AVAILABLE = 'Available',
  UNAVAILABLE = 'Unavailable',
  DEGRADED = 'Degraded',
  UNKNOWN = 'Unknown',
}

// Diagnostic Settings enums

/**
 * Subscription-level log category for diagnostic settings.
 */
export enum SubscriptionLogCategory {
  ADMINISTRATIVE = 'Administrative',
  SECURITY = 'Security',
  SERVICE_HEALTH = 'ServiceHealth',
  ALERT = 'Alert',
  RECOMMENDATION = 'Recommendation',
  POLICY = 'Policy',
  AUTOSCALE = 'Autoscale',
  RESOURCE_HEALTH = 'ResourceHealth',
}
