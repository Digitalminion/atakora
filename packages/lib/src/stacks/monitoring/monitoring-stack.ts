/**
 * AuthR Monitoring Stack
 *
 * @remarks
 * This stack creates comprehensive monitoring and observability infrastructure
 * following the AuthR reference architecture.
 *
 * **Components**:
 * - Application Insights (web app monitoring)
 * - Action Groups (alert notifications)
 * - Metric Alerts (availability, performance, errors)
 *
 * **Dependencies**:
 * - Foundation Stack (Log Analytics Workspace)
 * - Application Stack (App Service resources)
 * - Connectivity Stack (API Management)
 *
 * @packageDocumentation
 */

import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../../resources/resource-group/types';
import type { ILogAnalyticsWorkspace } from '../../resources/log-analytics-workspace/types';
import type { IAppService } from '../../resources/app-service/types';
import type { IApiManagement } from '../../resources/api-management/types';
import {
  ApplicationInsights,
  ActionGroup,
  MetricAlert,
  ApplicationType,
  MetricAlertOperator,
  TimeAggregation,
  CriterionType,
  PublicNetworkAccess,
} from '../../resources';

/**
 * Properties for Monitoring Stack
 */
export interface MonitoringStackProps {
  /**
   * Resource group for monitoring resources
   */
  readonly resourceGroup: IResourceGroup;

  /**
   * Log Analytics Workspace from foundation stack
   */
  readonly logAnalyticsWorkspace: ILogAnalyticsWorkspace;

  /**
   * App Service to monitor
   */
  readonly appService: IAppService;

  /**
   * API Management to monitor (optional)
   */
  readonly apiManagement?: IApiManagement;

  /**
   * Admin email for alert notifications
   */
  readonly adminEmail: string;

  /**
   * Custom tags for monitoring resources
   */
  readonly tags?: Record<string, string>;
}

/**
 * AuthR Monitoring Stack construct
 *
 * @remarks
 * Creates a complete monitoring solution with:
 * - Application Insights linked to Log Analytics
 * - Action Group for alert notifications
 * - Metric alerts for availability and performance
 *
 * @example
 * ```typescript
 * const monitoringStack = new MonitoringStack(app, 'Monitoring', {
 *   resourceGroup: monitoringRG,
 *   logAnalyticsWorkspace: logWorkspace,
 *   appService: webApp,
 *   adminEmail: 'admin@example.com'
 * });
 * ```
 */
export class MonitoringStack extends Construct {
  /**
   * Application Insights component
   */
  public readonly applicationInsights: ApplicationInsights;

  /**
   * Action Group for alerts
   */
  public readonly actionGroup: ActionGroup;

  /**
   * App Service availability alert
   */
  public readonly appServiceAvailabilityAlert?: MetricAlert;

  /**
   * App Service response time alert
   */
  public readonly appServiceResponseTimeAlert?: MetricAlert;

  /**
   * Creates a new Monitoring Stack
   *
   * @param scope - Parent construct
   * @param id - Construct ID
   * @param props - Monitoring stack properties
   */
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id);

    // ============================================================================
    // Application Insights (linked to Log Analytics)
    // ============================================================================

    this.applicationInsights = new ApplicationInsights(this, 'AppInsights', {
      applicationType: ApplicationType.WEB,
      workspace: props.logAnalyticsWorkspace,
      publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
      publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
      tags: {
        ...props.tags,
        tier: 'monitoring',
      },
    });

    // ============================================================================
    // Action Group (alert notifications)
    // ============================================================================

    this.actionGroup = new ActionGroup(this, 'AlertActionGroup', {
      groupShortName: 'AuthR',
      emailReceivers: [
        {
          name: 'admin',
          emailAddress: props.adminEmail,
          useCommonAlertSchema: true,
        },
      ],
      tags: {
        ...props.tags,
        tier: 'monitoring',
      },
    });

    // ============================================================================
    // Metric Alerts (App Service)
    // ============================================================================

    // Alert: App Service Availability
    this.appServiceAvailabilityAlert = new MetricAlert(this, 'AppAvailabilityAlert', {
      scopes: [props.appService.siteId],
      description: 'Alert when App Service availability drops below 99%',
      severity: 1,
      enabled: true,
      evaluationFrequency: 'PT1M',
      windowSize: 'PT5M',
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
          actionGroupId: this.actionGroup.actionGroupId,
        },
      ],
      tags: {
        ...props.tags,
        alert_type: 'availability',
      },
    });

    // Alert: App Service Response Time
    this.appServiceResponseTimeAlert = new MetricAlert(this, 'AppResponseTimeAlert', {
      scopes: [props.appService.siteId],
      description: 'Alert when App Service average response time exceeds 2 seconds',
      severity: 2,
      enabled: true,
      evaluationFrequency: 'PT5M',
      windowSize: 'PT15M',
      criteria: [
        {
          criterionType: CriterionType.STATIC_THRESHOLD,
          name: 'ResponseTime',
          metricName: 'AverageResponseTime',
          operator: MetricAlertOperator.GREATER_THAN,
          threshold: 2000, // milliseconds
          timeAggregation: TimeAggregation.AVERAGE,
        },
      ],
      actions: [
        {
          actionGroupId: this.actionGroup.actionGroupId,
        },
      ],
      tags: {
        ...props.tags,
        alert_type: 'performance',
      },
    });

    // API Management alerts (if provided)
    if (props.apiManagement) {
      new MetricAlert(this, 'ApimAvailabilityAlert', {
        scopes: [props.apiManagement.apiManagementId],
        description: 'Alert when API Management availability drops below 99%',
        severity: 1,
        enabled: true,
        evaluationFrequency: 'PT1M',
        windowSize: 'PT5M',
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
            actionGroupId: this.actionGroup.actionGroupId,
          },
        ],
        tags: {
          ...props.tags,
          alert_type: 'availability',
          service: 'apim',
        },
      });
    }
  }

  /**
   * Get Application Insights instrumentation key
   */
  public get instrumentationKey(): string {
    return this.applicationInsights.instrumentationKey;
  }

  /**
   * Get Application Insights connection string
   */
  public get connectionString(): string {
    return this.applicationInsights.connectionString;
  }
}
