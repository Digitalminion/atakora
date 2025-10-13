/**
 * Type definitions for Azure Monitor Insights (Microsoft.Insights).
 *
 * @remarks
 * Complete type definitions for Azure Monitor resources.
 *
 * **Resource Types**:
 * - Microsoft.Insights/components (Application Insights)
 * - Microsoft.Insights/metricAlerts
 * - Microsoft.Insights/activityLogAlerts
 * - Microsoft.Insights/autoscalesettings
 * - Microsoft.Insights/diagnosticSettings
 *
 * **API Versions**: Various (2018-03-01, 2022-10-01, 2020-02-02)
 *
 * @packageDocumentation
 */

import type {
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

// Application Insights (Components) Types

/**
 * Application Insights component properties.
 */
export interface ApplicationInsightsComponentProperties {
  /**
   * Application type.
   */
  readonly applicationType: ApplicationType;

  /**
   * Flow type.
   */
  readonly flowType?: FlowType;

  /**
   * Request source.
   */
  readonly requestSource?: RequestSource;

  /**
   * Instrumentation key (output only).
   */
  readonly instrumentationKey?: string;

  /**
   * Connection string (output only).
   */
  readonly connectionString?: string;

  /**
   * Application ID (output only).
   */
  readonly appId?: string;

  /**
   * Log Analytics workspace resource ID.
   *
   * @remarks
   * Required for workspace-based Application Insights.
   */
  readonly workspaceResourceId?: string;

  /**
   * Retention in days.
   *
   * @remarks
   * Values: 30, 60, 90, 120, 180, 270, 365, 550, 730
   */
  readonly retentionInDays?: number;

  /**
   * Sampling percentage.
   *
   * @remarks
   * Values: 0-100
   */
  readonly samplingPercentage?: number;

  /**
   * Disable IP masking.
   */
  readonly disableIpMasking?: boolean;

  /**
   * Immmediate purge data on 30 days.
   */
  readonly immediatePurgeDataOn30Days?: boolean;

  /**
   * Public network access for ingestion.
   */
  readonly publicNetworkAccessForIngestion?: PublicNetworkAccess;

  /**
   * Public network access for query.
   */
  readonly publicNetworkAccessForQuery?: PublicNetworkAccess;

  /**
   * Ingestion mode.
   */
  readonly ingestionMode?: IngestionMode;

  /**
   * Disable local auth.
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Force customer storage for profiler.
   */
  readonly forceCustomerStorageForProfiler?: boolean;
}

// Metric Alert Types

/**
 * Static threshold criterion.
 */
export interface StaticThresholdCriterion {
  /**
   * Criterion type.
   */
  readonly criterionType: 'StaticThresholdCriterion';

  /**
   * Name of the criterion.
   */
  readonly name: string;

  /**
   * Metric namespace.
   */
  readonly metricNamespace?: string;

  /**
   * Metric name.
   */
  readonly metricName: string;

  /**
   * Dimensions for the metric.
   */
  readonly dimensions?: MetricDimension[];

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
   * Skip metric validation.
   */
  readonly skipMetricValidation?: boolean;
}

/**
 * Dynamic threshold criterion.
 */
export interface DynamicThresholdCriterion {
  /**
   * Criterion type.
   */
  readonly criterionType: 'DynamicThresholdCriterion';

  /**
   * Name of the criterion.
   */
  readonly name: string;

  /**
   * Metric namespace.
   */
  readonly metricNamespace?: string;

  /**
   * Metric name.
   */
  readonly metricName: string;

  /**
   * Dimensions for the metric.
   */
  readonly dimensions?: MetricDimension[];

  /**
   * Operator for threshold comparison.
   */
  readonly operator: MetricAlertOperator;

  /**
   * Alert sensitivity.
   */
  readonly alertSensitivity: DynamicThresholdSensitivity;

  /**
   * Number of aggregated lookback points.
   */
  readonly failingPeriods: {
    /**
     * Number of violations to trigger an alert.
     */
    readonly numberOfEvaluationPeriods: number;

    /**
     * Minimum number of violations required.
     */
    readonly minFailingPeriodsToAlert: number;
  };

  /**
   * Ignore data before this date.
   */
  readonly ignoreDataBefore?: string;

  /**
   * Time aggregation type.
   */
  readonly timeAggregation: TimeAggregation;

  /**
   * Skip metric validation.
   */
  readonly skipMetricValidation?: boolean;
}

/**
 * Metric dimension.
 */
export interface MetricDimension {
  /**
   * Dimension name.
   */
  readonly name: string;

  /**
   * Operator.
   *
   * @remarks
   * Values: 'Include' | 'Exclude'
   */
  readonly operator: 'Include' | 'Exclude';

  /**
   * Dimension values.
   */
  readonly values: string[];
}

/**
 * Metric alert criteria.
 */
export interface MetricAlertCriteria {
  /**
   * Type discriminator.
   *
   * @remarks
   * Values: 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria' | 'Microsoft.Azure.Monitor.MultipleResourceMultipleMetricCriteria' | 'Microsoft.Azure.Monitor.WebtestLocationAvailabilityCriteria'
   */
  readonly 'odata.type': string;

  /**
   * Criteria (for single resource).
   */
  readonly allOf?: (StaticThresholdCriterion | DynamicThresholdCriterion)[];
}

/**
 * Metric alert action.
 */
export interface MetricAlertAction {
  /**
   * Action group resource ID.
   */
  readonly actionGroupId: string;

  /**
   * Webhook properties.
   */
  readonly webHookProperties?: Record<string, string>;
}

// Autoscale Setting Types

/**
 * Metric trigger for autoscale.
 */
export interface MetricTrigger {
  /**
   * Metric name.
   */
  readonly metricName: string;

  /**
   * Metric namespace.
   */
  readonly metricNamespace?: string;

  /**
   * Metric resource URI.
   */
  readonly metricResourceUri: string;

  /**
   * Time grain (aggregation window).
   */
  readonly timeGrain: string;

  /**
   * Statistic type.
   *
   * @remarks
   * Values: 'Average' | 'Min' | 'Max' | 'Sum' | 'Count'
   */
  readonly statistic: string;

  /**
   * Time window for evaluation.
   */
  readonly timeWindow: string;

  /**
   * Time aggregation type.
   */
  readonly timeAggregation: TimeAggregationType;

  /**
   * Operator for comparison.
   */
  readonly operator: MetricOperator;

  /**
   * Threshold value.
   */
  readonly threshold: number;

  /**
   * Dimensions.
   */
  readonly dimensions?: ScaleRuleMetricDimension[];

  /**
   * Divide per instance.
   */
  readonly dividePerInstance?: boolean;
}

/**
 * Scale rule metric dimension.
 */
export interface ScaleRuleMetricDimension {
  /**
   * Dimension name.
   */
  readonly DimensionName: string;

  /**
   * Operator.
   *
   * @remarks
   * Values: 'Equals' | 'NotEquals'
   */
  readonly Operator: 'Equals' | 'NotEquals';

  /**
   * Dimension values.
   */
  readonly Values: string[];
}

/**
 * Scale action for autoscale.
 */
export interface ScaleAction {
  /**
   * Scale direction.
   */
  readonly direction: ScaleDirection;

  /**
   * Scale type.
   */
  readonly type: ScaleType;

  /**
   * Value to scale by or to.
   */
  readonly value?: string;

  /**
   * Cooldown time.
   *
   * @remarks
   * Time to wait after scaling before allowing another scale operation.
   */
  readonly cooldown: string;
}

/**
 * Scale rule.
 */
export interface ScaleRule {
  /**
   * Metric trigger.
   */
  readonly metricTrigger: MetricTrigger;

  /**
   * Scale action.
   */
  readonly scaleAction: ScaleAction;
}

/**
 * Autoscale profile.
 */
export interface AutoscaleProfile {
  /**
   * Profile name.
   */
  readonly name: string;

  /**
   * Capacity configuration.
   */
  readonly capacity: {
    /**
     * Minimum instance count.
     */
    readonly minimum: string;

    /**
     * Maximum instance count.
     */
    readonly maximum: string;

    /**
     * Default instance count.
     */
    readonly default: string;
  };

  /**
   * Scale rules.
   */
  readonly rules: ScaleRule[];

  /**
   * Fixed date schedule.
   */
  readonly fixedDate?: {
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
  };

  /**
   * Recurrence schedule.
   */
  readonly recurrence?: {
    /**
     * Frequency.
     */
    readonly frequency: RecurrenceFrequency;

    /**
     * Schedule.
     */
    readonly schedule: {
      /**
       * Time zone.
       */
      readonly timeZone: string;

      /**
       * Days of the week.
       */
      readonly days: string[];

      /**
       * Hours.
       */
      readonly hours: number[];

      /**
       * Minutes.
       */
      readonly minutes: number[];
    };
  };
}

/**
 * Autoscale notification.
 */
export interface AutoscaleNotification {
  /**
   * Operation.
   *
   * @remarks
   * Values: 'Scale'
   */
  readonly operation: 'Scale';

  /**
   * Email notification.
   */
  readonly email?: {
    /**
     * Send to subscription administrator.
     */
    readonly sendToSubscriptionAdministrator?: boolean;

    /**
     * Send to subscription co-administrators.
     */
    readonly sendToSubscriptionCoAdministrators?: boolean;

    /**
     * Custom email addresses.
     */
    readonly customEmails?: string[];
  };

  /**
   * Webhooks.
   */
  readonly webhooks?: Array<{
    /**
     * Service URI.
     */
    readonly serviceUri?: string;

    /**
     * Webhook properties.
     */
    readonly properties?: Record<string, string>;
  }>;
}

// Activity Log Alert Types

/**
 * Activity log alert condition.
 */
export interface ActivityLogAlertLeafCondition {
  /**
   * Field name.
   */
  readonly field: ActivityLogAlertField | string;

  /**
   * Field value to match.
   */
  readonly equals?: string;

  /**
   * Contains match (for certain fields).
   */
  readonly containsAny?: string[];
}

/**
 * Activity log alert all conditions.
 */
export interface ActivityLogAlertAllOfCondition {
  /**
   * All conditions must match.
   */
  readonly allOf: ActivityLogAlertLeafCondition[];
}

/**
 * Activity log alert action group.
 */
export interface ActivityLogAlertActionGroup {
  /**
   * Action group resource ID.
   */
  readonly actionGroupId: string;

  /**
   * Webhook properties.
   */
  readonly webhookProperties?: Record<string, string>;
}

/**
 * Activity log alert actions.
 */
export interface ActivityLogAlertActionList {
  /**
   * Action groups.
   */
  readonly actionGroups: ActivityLogAlertActionGroup[];
}

// Diagnostic Settings Types

/**
 * Log settings for diagnostic settings.
 */
export interface LogSettings {
  /**
   * Log category.
   */
  readonly category?: string;

  /**
   * Log category group.
   */
  readonly categoryGroup?: string;

  /**
   * Enabled.
   */
  readonly enabled: boolean;

  /**
   * Retention policy.
   */
  readonly retentionPolicy?: RetentionPolicy;
}

/**
 * Metric settings for diagnostic settings.
 */
export interface MetricSettings {
  /**
   * Metric category.
   */
  readonly category?: string;

  /**
   * Enabled.
   */
  readonly enabled: boolean;

  /**
   * Retention policy.
   */
  readonly retentionPolicy?: RetentionPolicy;

  /**
   * Time grain.
   */
  readonly timeGrain?: string;
}

/**
 * Retention policy.
 */
export interface RetentionPolicy {
  /**
   * Enabled.
   */
  readonly enabled: boolean;

  /**
   * Retention days.
   */
  readonly days: number;
}

/**
 * Diagnostic settings properties.
 */
export interface DiagnosticSettingsProperties {
  /**
   * Storage account resource ID.
   */
  readonly storageAccountId?: string;

  /**
   * Service Bus rule resource ID.
   */
  readonly serviceBusRuleId?: string;

  /**
   * Event Hub authorization rule resource ID.
   */
  readonly eventHubAuthorizationRuleId?: string;

  /**
   * Event Hub name.
   */
  readonly eventHubName?: string;

  /**
   * Log Analytics workspace resource ID.
   */
  readonly workspaceId?: string;

  /**
   * Log settings.
   */
  readonly logs?: LogSettings[];

  /**
   * Metric settings.
   */
  readonly metrics?: MetricSettings[];

  /**
   * Log Analytics destination type.
   *
   * @remarks
   * Values: null | 'Dedicated' | 'AzureDiagnostics'
   */
  readonly logAnalyticsDestinationType?: string;
}

// Action Group Types

/**
 * Email receiver.
 */
export interface EmailReceiver {
  /**
   * Receiver name.
   */
  readonly name: string;

  /**
   * Email address.
   */
  readonly emailAddress: string;

  /**
   * Use common alert schema.
   */
  readonly useCommonAlertSchema?: boolean;
}

/**
 * SMS receiver.
 */
export interface SmsReceiver {
  /**
   * Receiver name.
   */
  readonly name: string;

  /**
   * Country code.
   */
  readonly countryCode: string;

  /**
   * Phone number.
   */
  readonly phoneNumber: string;
}

/**
 * Webhook receiver.
 */
export interface WebhookReceiver {
  /**
   * Receiver name.
   */
  readonly name: string;

  /**
   * Service URI.
   */
  readonly serviceUri: string;

  /**
   * Use common alert schema.
   */
  readonly useCommonAlertSchema?: boolean;

  /**
   * Use Azure AD authentication.
   */
  readonly useAadAuth?: boolean;

  /**
   * Object ID for Azure AD authentication.
   */
  readonly objectId?: string;

  /**
   * Identifier URI for Azure AD authentication.
   */
  readonly identifierUri?: string;

  /**
   * Tenant ID for Azure AD authentication.
   */
  readonly tenantId?: string;
}

/**
 * Azure app push receiver.
 */
export interface AzureAppPushReceiver {
  /**
   * Receiver name.
   */
  readonly name: string;

  /**
   * Email address.
   */
  readonly emailAddress: string;
}

/**
 * Automation runbook receiver.
 */
export interface AutomationRunbookReceiver {
  /**
   * Receiver name.
   */
  readonly name: string;

  /**
   * Automation account resource ID.
   */
  readonly automationAccountId: string;

  /**
   * Runbook name.
   */
  readonly runbookName: string;

  /**
   * Webhook resource ID.
   */
  readonly webhookResourceId: string;

  /**
   * Is global runbook.
   */
  readonly isGlobalRunbook: boolean;

  /**
   * Service URI.
   */
  readonly serviceUri?: string;

  /**
   * Use common alert schema.
   */
  readonly useCommonAlertSchema?: boolean;
}

/**
 * Voice receiver.
 */
export interface VoiceReceiver {
  /**
   * Receiver name.
   */
  readonly name: string;

  /**
   * Country code.
   */
  readonly countryCode: string;

  /**
   * Phone number.
   */
  readonly phoneNumber: string;
}

/**
 * Logic app receiver.
 */
export interface LogicAppReceiver {
  /**
   * Receiver name.
   */
  readonly name: string;

  /**
   * Logic app resource ID.
   */
  readonly resourceId: string;

  /**
   * Callback URL.
   */
  readonly callbackUrl: string;

  /**
   * Use common alert schema.
   */
  readonly useCommonAlertSchema?: boolean;
}

/**
 * Azure Function receiver.
 */
export interface AzureFunctionReceiver {
  /**
   * Receiver name.
   */
  readonly name: string;

  /**
   * Function app resource ID.
   */
  readonly functionAppResourceId: string;

  /**
   * Function name.
   */
  readonly functionName: string;

  /**
   * HTTP trigger URL.
   */
  readonly httpTriggerUrl: string;

  /**
   * Use common alert schema.
   */
  readonly useCommonAlertSchema?: boolean;
}

/**
 * ARM role receiver.
 */
export interface ArmRoleReceiver {
  /**
   * Receiver name.
   */
  readonly name: string;

  /**
   * Role ID.
   */
  readonly roleId: string;

  /**
   * Use common alert schema.
   */
  readonly useCommonAlertSchema?: boolean;
}
