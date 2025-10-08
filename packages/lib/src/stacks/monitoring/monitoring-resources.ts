/**
 * Monitoring resource type definitions
 *
 * @remarks
 * This module defines interfaces for monitoring resources used in the AuthR stack.
 *
 * @packageDocumentation
 */

import type { IApplicationInsights } from '../../resources/application-insights/types';
import type { IActionGroup } from '../../resources/action-group/types';
import type { IMetricAlert } from '../../resources/metric-alert/types';

/**
 * Complete monitoring infrastructure for AuthR
 */
export interface IMonitoringInfrastructure {
  /**
   * Application Insights component
   */
  readonly applicationInsights: IApplicationInsights;

  /**
   * Alert action group
   */
  readonly actionGroup: IActionGroup;

  /**
   * App Service availability alert
   */
  readonly appServiceAvailabilityAlert?: IMetricAlert;

  /**
   * App Service response time alert
   */
  readonly appServiceResponseTimeAlert?: IMetricAlert;

  /**
   * API Management availability alert
   */
  readonly apiManagementAvailabilityAlert?: IMetricAlert;
}

/**
 * Monitoring alert severity levels
 */
export enum AlertSeverity {
  /**
   * Critical - immediate action required
   */
  CRITICAL = 0,

  /**
   * Error - significant impact
   */
  ERROR = 1,

  /**
   * Warning - potential issue
   */
  WARNING = 2,

  /**
   * Informational - for awareness
   */
  INFORMATIONAL = 3,

  /**
   * Verbose - detailed diagnostics
   */
  VERBOSE = 4,
}

/**
 * Common alert thresholds for AuthR monitoring
 */
export const AlertThresholds = {
  /**
   * Availability threshold (percentage)
   */
  AVAILABILITY: 99,

  /**
   * Response time threshold (milliseconds)
   */
  RESPONSE_TIME: 2000,

  /**
   * Error rate threshold (percentage)
   */
  ERROR_RATE: 5,

  /**
   * CPU usage threshold (percentage)
   */
  CPU_USAGE: 80,

  /**
   * Memory usage threshold (percentage)
   */
  MEMORY_USAGE: 85,
} as const;

/**
 * Alert evaluation windows
 */
export const EvaluationWindows = {
  /**
   * 1 minute window
   */
  ONE_MINUTE: 'PT1M',

  /**
   * 5 minute window
   */
  FIVE_MINUTES: 'PT5M',

  /**
   * 15 minute window
   */
  FIFTEEN_MINUTES: 'PT15M',

  /**
   * 30 minute window
   */
  THIRTY_MINUTES: 'PT30M',

  /**
   * 1 hour window
   */
  ONE_HOUR: 'PT1H',
} as const;
