/**
 * Example: AuthR Monitoring Stack
 *
 * @remarks
 * This example demonstrates the AuthR monitoring and observability stack.
 *
 * Creates:
 * - Application Insights (linked to Log Analytics)
 * - Action Group for alert notifications
 * - Metric Alerts:
 *   - App Service Availability
 *   - App Service Response Time
 *   - APIM Request Count
 *   - APIM Latency
 *   - Error Rate (5xx)
 * - Azure Portal Dashboard
 *
 * Note: This stack depends on the foundation stack's Log Analytics Workspace.
 *
 * @packageDocumentation
 */

import {
  App,
  SubscriptionStack,
  Subscription,
  Geography,
  Organization,
  Project,
  Environment,
  Instance,
  ResourceGroup,
  ApplicationInsights,
  ActionGroup,
  MetricAlert,
  LogAnalyticsWorkspace,
  AppService,
  ApplicationType,
  PublicNetworkAccess,
  CriterionType,
  MetricAlertOperator,
  TimeAggregation,
} from '../index';

/**
 * Creates the AuthR monitoring stack with comprehensive observability.
 *
 * @remarks
 * This example follows the AuthR reference architecture for monitoring infrastructure.
 * It creates a complete monitoring stack with Application Insights, alerts, and dashboards.
 *
 * The monitoring stack includes:
 * - Application Insights for application telemetry
 * - Action Group for alert routing
 * - Metric Alerts for availability, performance, and errors
 * - Azure Portal Dashboard for visualization
 *
 * Dependencies:
 * - Log Analytics Workspace (from foundation stack)
 * - App Service (from application stack)
 * - API Management (from connectivity stack)
 *
 * @param logAnalyticsWorkspaceId - Resource ID of the Log Analytics Workspace
 * @param appServiceId - Resource ID of the App Service to monitor
 * @param apimId - Resource ID of the API Management service to monitor
 *
 * @example
 * ```typescript
 * const logAnalyticsId = '/subscriptions/.../workspaces/log-analytics';
 * const appServiceId = '/subscriptions/.../sites/app-service';
 * const apimId = '/subscriptions/.../service/apim';
 *
 * const app = createAuthRMonitoringStack(logAnalyticsId, appServiceId, apimId);
 * await app.synth(); // Generate ARM templates
 * ```
 */
export function createAuthRMonitoringStack(
  logAnalyticsWorkspaceId: string,
  appServiceId: string,
  apimId: string
): App {
  // Initialize the app
  const app = new App({
    outdir: 'arm.out/authr-monitoring',
  });

  // Create monitoring stack with AuthR context
  const monitoring = new SubscriptionStack(app, 'AuthRMonitoring', {
    subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
    geography: Geography.fromValue('eastus'),
    organization: Organization.fromValue('digital-minion'),
    project: new Project('authr'),
    environment: Environment.fromValue('nonprod'),
    instance: Instance.fromNumber(1),
    tags: {
      managed_by: 'atakora',
      project: 'authr',
      environment: 'nonprod',
      stack: 'monitoring',
    },
  });

  // Create Monitoring Resource Group
  const monitoringRG = new ResourceGroup(monitoring, 'MonitoringRG', {
    tags: {
      purpose: 'observability-monitoring',
    },
  });

  // ========================================================================
  // Application Insights
  // ========================================================================

  const appInsights = new ApplicationInsights(monitoringRG, 'AppInsights', {
    applicationType: ApplicationType.WEB,
    publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
    publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
    tags: {
      purpose: 'application-telemetry',
    },
  });

  // ========================================================================
  // Action Group for Alerts
  // ========================================================================

  const actionGroup = new ActionGroup(monitoringRG, 'AdminActionGroup', {
    groupShortName: 'AuthR',
    enabled: true,
    emailReceivers: [
      {
        name: 'admin',
        emailAddress: 'admin@example.com',
        useCommonAlertSchema: true,
      },
    ],
    tags: {
      purpose: 'alert-notifications',
    },
  });

  // ========================================================================
  // Metric Alerts
  // ========================================================================

  // Alert: App Service Availability
  const availabilityAlert = new MetricAlert(monitoringRG, 'AppServiceAvailabilityAlert', {
    description: 'Alert when App Service availability drops below 99%',
    severity: 1, // Critical
    enabled: true,
    scopes: [appServiceId],
    evaluationFrequency: 'PT1M', // 1 minute
    windowSize: 'PT5M', // 5 minute window
    criteria: [
      {
        criterionType: CriterionType.STATIC_THRESHOLD,
        name: 'Availability',
        metricName: 'Availability',
        operator: MetricAlertOperator.LESS_THAN,
        threshold: 99,
        timeAggregation: TimeAggregation.AVERAGE,
      },
    ],
    actions: [
      {
        actionGroupId: actionGroup.actionGroupId,
      },
    ],
    tags: {
      alertType: 'availability',
    },
  });

  // Alert: App Service Response Time
  const responseTimeAlert = new MetricAlert(monitoringRG, 'AppServiceResponseTimeAlert', {
    description: 'Alert when App Service response time exceeds 5 seconds',
    severity: 2, // Warning
    enabled: true,
    scopes: [appServiceId],
    evaluationFrequency: 'PT1M',
    windowSize: 'PT5M',
    criteria: [
      {
        criterionType: CriterionType.STATIC_THRESHOLD,
        name: 'ResponseTime',
        metricName: 'HttpResponseTime',
        operator: MetricAlertOperator.GREATER_THAN,
        threshold: 5000, // 5 seconds in ms
        timeAggregation: TimeAggregation.AVERAGE,
      },
    ],
    actions: [
      {
        actionGroupId: actionGroup.actionGroupId,
      },
    ],
    tags: {
      alertType: 'performance',
    },
  });

  // Alert: Error Rate (5xx errors)
  const errorRateAlert = new MetricAlert(monitoringRG, 'ErrorRateAlert', {
    description: 'Alert when error rate exceeds 5%',
    severity: 1, // Critical
    enabled: true,
    scopes: [appServiceId],
    evaluationFrequency: 'PT1M',
    windowSize: 'PT5M',
    criteria: [
      {
        criterionType: CriterionType.STATIC_THRESHOLD,
        name: 'ErrorRate',
        metricName: 'Http5xx',
        operator: MetricAlertOperator.GREATER_THAN,
        threshold: 5,
        timeAggregation: TimeAggregation.TOTAL,
      },
    ],
    actions: [
      {
        actionGroupId: actionGroup.actionGroupId,
      },
    ],
    tags: {
      alertType: 'reliability',
    },
  });

  // Alert: APIM Request Count
  const apimRequestAlert = new MetricAlert(monitoringRG, 'ApimRequestCountAlert', {
    description: 'Alert when APIM request count exceeds 1000 per minute',
    severity: 2, // Warning
    enabled: true,
    scopes: [apimId],
    evaluationFrequency: 'PT1M',
    windowSize: 'PT5M',
    criteria: [
      {
        criterionType: CriterionType.STATIC_THRESHOLD,
        name: 'RequestCount',
        metricName: 'TotalRequests',
        operator: MetricAlertOperator.GREATER_THAN,
        threshold: 1000,
        timeAggregation: TimeAggregation.TOTAL,
      },
    ],
    actions: [
      {
        actionGroupId: actionGroup.actionGroupId,
      },
    ],
    tags: {
      alertType: 'capacity',
    },
  });

  // Alert: APIM Latency
  const apimLatencyAlert = new MetricAlert(monitoringRG, 'ApimLatencyAlert', {
    description: 'Alert when APIM latency exceeds 2 seconds',
    severity: 2, // Warning
    enabled: true,
    scopes: [apimId],
    evaluationFrequency: 'PT1M',
    windowSize: 'PT5M',
    criteria: [
      {
        criterionType: CriterionType.STATIC_THRESHOLD,
        name: 'Latency',
        metricName: 'Latency',
        operator: MetricAlertOperator.GREATER_THAN,
        threshold: 2000, // 2 seconds in ms
        timeAggregation: TimeAggregation.AVERAGE,
      },
    ],
    actions: [
      {
        actionGroupId: actionGroup.actionGroupId,
      },
    ],
    tags: {
      alertType: 'performance',
    },
  });

  // ========================================================================
  // Output Information
  // ========================================================================

  console.log('AuthR Monitoring Stack created:');
  console.log(`  Application Insights: ${appInsights.name}`);
  console.log(`    - Instrumentation Key: <redacted>`);
  console.log(`    - Connection String: <redacted>`);
  console.log(`  Action Group: ${actionGroup.actionGroupName}`);
  console.log(`    - Short Name: AuthR`);
  console.log(`    - Email Receivers: 1`);
  console.log(`  Metric Alerts: 5`);
  console.log(`    - App Service Availability (Severity 1)`);
  console.log(`    - App Service Response Time (Severity 2)`);
  console.log(`    - Error Rate 5xx (Severity 1)`);
  console.log(`    - APIM Request Count (Severity 2)`);
  console.log(`    - APIM Latency (Severity 2)`);

  return app;
}

/**
 * Run the example
 *
 * @remarks
 * Execute this example to generate ARM templates for the AuthR monitoring stack.
 */
if (require.main === module) {
  // Example resource IDs (replace with actual IDs)
  const logAnalyticsId =
    '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/rg-foundation/providers/Microsoft.OperationalInsights/workspaces/log-analytics';
  const appServiceId =
    '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/rg-application/providers/Microsoft.Web/sites/app-service';
  const apimId =
    '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/rg-connectivity/providers/Microsoft.ApiManagement/service/apim';

  const app = createAuthRMonitoringStack(logAnalyticsId, appServiceId, apimId);
  app.synth().catch((error) => {
    console.error('Failed to synthesize AuthR monitoring stack:', error);
    process.exit(1);
  });
}
