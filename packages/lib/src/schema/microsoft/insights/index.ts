/**
 * Azure Monitor Insights (Microsoft.Insights) schema module.
 *
 * @remarks
 * Centralized type definitions and enums for Azure Monitor resources.
 *
 * @packageDocumentation
 */

// Export all enums
export {
  CriterionType,
  MetricAlertOperator,
  TimeAggregation,
  DynamicThresholdSensitivity,
  MetricOperator,
  TimeAggregationType,
  ScaleDirection,
  ScaleType,
  RecurrenceFrequency,
  ApplicationType,
  RequestSource,
  FlowType,
  PublicNetworkAccess,
  IngestionMode,
  ActivityLogAlertField,
  ActivityLogAlertCategory,
  ActivityLogAlertLevel,
  ActivityLogAlertStatus,
  ServiceHealthEventType,
  ResourceHealthStatus,
  SubscriptionLogCategory,
} from './enums';

// Export all types
export type {
  ApplicationInsightsComponentProperties,
  StaticThresholdCriterion,
  DynamicThresholdCriterion,
  MetricDimension,
  MetricAlertCriteria,
  MetricAlertAction,
  MetricTrigger,
  ScaleRuleMetricDimension,
  ScaleAction,
  ScaleRule,
  AutoscaleProfile,
  AutoscaleNotification,
  ActivityLogAlertLeafCondition,
  ActivityLogAlertAllOfCondition,
  ActivityLogAlertActionGroup,
  ActivityLogAlertActionList,
  LogSettings,
  MetricSettings,
  RetentionPolicy,
  DiagnosticSettingsProperties,
  EmailReceiver,
  SmsReceiver,
  WebhookReceiver,
  AzureAppPushReceiver,
  AutomationRunbookReceiver,
  VoiceReceiver,
  LogicAppReceiver,
  AzureFunctionReceiver,
  ArmRoleReceiver,
} from './types';
