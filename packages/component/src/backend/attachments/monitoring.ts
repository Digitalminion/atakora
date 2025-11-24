/**
 * Monitoring Attachment System
 *
 * Provides attachment point logic for monitoring resources including:
 * - Application Insights
 * - Log Analytics workspaces
 * - Alerts and alert rules
 * - Metrics
 *
 * @module @atakora/component/backend/attachments/monitoring
 */

/**
 * Application Insights configuration
 */
export interface AppInsightsConfig {
  /**
   * Application Insights name
   */
  readonly name?: string;

  /**
   * Sampling percentage (0-100)
   */
  readonly samplingPercentage: number;

  /**
   * Log retention in days
   */
  readonly retentionDays: number;

  /**
   * Enable live metrics stream
   */
  readonly enableLiveMetrics?: boolean;

  /**
   * Enable profiler
   */
  readonly enableProfiler?: boolean;

  /**
   * Enable snapshot debugger
   */
  readonly enableSnapshot?: boolean;

  /**
   * Application type
   */
  readonly applicationType?: 'web' | 'other';

  /**
   * Disable IP masking (for debugging)
   */
  readonly disableIpMasking?: boolean;

  /**
   * Custom properties to track
   */
  readonly customProperties?: Record<string, string>;

  /**
   * Tags
   */
  readonly tags?: Record<string, string>;
}

/**
 * Log Analytics workspace configuration
 */
export interface LogAnalyticsConfig {
  /**
   * Workspace name
   */
  readonly name?: string;

  /**
   * Workspace SKU
   */
  readonly sku: 'Free' | 'PerGB2018' | 'PerNode' | 'Premium' | 'Standalone' | 'Standard';

  /**
   * Log retention in days (30-730 for paid SKUs, 7 for Free)
   */
  readonly retentionDays: number;

  /**
   * Daily quota in GB (for PerGB2018 SKU)
   */
  readonly dailyQuotaGb?: number;

  /**
   * Enable log access using resource or workspace permissions
   */
  readonly resourceAccessMode?: 'workspace' | 'resource';

  /**
   * Data sources to enable
   */
  readonly dataSources?: ReadonlyArray<DataSourceType>;

  /**
   * Tags
   */
  readonly tags?: Record<string, string>;
}

/**
 * Data source types for Log Analytics
 */
export type DataSourceType =
  | 'AzureActivityLog'
  | 'AzureDiagnostics'
  | 'PerformanceCounter'
  | 'WindowsEvent'
  | 'Syslog'
  | 'IISLog'
  | 'CustomLog';

/**
 * Alert configuration
 */
export interface AlertsConfig {
  /**
   * Enable alerts
   */
  readonly enabled: boolean;

  /**
   * Response time alert thresholds
   */
  readonly responseTime?: AlertThreshold;

  /**
   * Error rate alert thresholds
   */
  readonly errorRate?: AlertThreshold;

  /**
   * Availability alert thresholds
   */
  readonly availability?: AlertThreshold;

  /**
   * CPU usage alert thresholds
   */
  readonly cpuUsage?: AlertThreshold;

  /**
   * Memory usage alert thresholds
   */
  readonly memoryUsage?: AlertThreshold;

  /**
   * Request rate alert thresholds
   */
  readonly requestRate?: AlertThreshold;

  /**
   * Custom metric alerts
   */
  readonly customAlerts?: ReadonlyArray<CustomAlertConfig>;

  /**
   * Action groups for alert notifications
   */
  readonly actionGroups?: ReadonlyArray<ActionGroupConfig>;
}

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  /**
   * Warning threshold
   */
  readonly warning?: number;

  /**
   * Critical threshold
   */
  readonly critical: number;

  /**
   * Time window in minutes
   */
  readonly windowMinutes?: number;

  /**
   * Evaluation frequency in minutes
   */
  readonly frequencyMinutes?: number;

  /**
   * Number of violations before triggering
   */
  readonly threshold?: number;
}

/**
 * Custom alert configuration
 */
export interface CustomAlertConfig {
  /**
   * Alert name
   */
  readonly name: string;

  /**
   * Alert description
   */
  readonly description?: string;

  /**
   * Metric name
   */
  readonly metricName: string;

  /**
   * Metric namespace
   */
  readonly metricNamespace?: string;

  /**
   * Alert severity (0-4, 0 is most severe)
   */
  readonly severity: 0 | 1 | 2 | 3 | 4;

  /**
   * Threshold configuration
   */
  readonly threshold: AlertThreshold;

  /**
   * Operator for comparison
   */
  readonly operator:
    | 'GreaterThan'
    | 'LessThan'
    | 'GreaterThanOrEqual'
    | 'LessThanOrEqual'
    | 'Equals'
    | 'NotEquals';

  /**
   * Aggregation type
   */
  readonly aggregation?: 'Average' | 'Minimum' | 'Maximum' | 'Total' | 'Count';
}

/**
 * Action group configuration for alert notifications
 */
export interface ActionGroupConfig {
  /**
   * Action group name
   */
  readonly name: string;

  /**
   * Short name (12 chars max)
   */
  readonly shortName: string;

  /**
   * Email receivers
   */
  readonly emailReceivers?: ReadonlyArray<EmailReceiver>;

  /**
   * SMS receivers
   */
  readonly smsReceivers?: ReadonlyArray<SmsReceiver>;

  /**
   * Webhook receivers
   */
  readonly webhookReceivers?: ReadonlyArray<WebhookReceiver>;

  /**
   * Azure Function receivers
   */
  readonly azureFunctionReceivers?: ReadonlyArray<AzureFunctionReceiver>;

  /**
   * Logic App receivers
   */
  readonly logicAppReceivers?: ReadonlyArray<LogicAppReceiver>;
}

/**
 * Email receiver configuration
 */
export interface EmailReceiver {
  /**
   * Receiver name
   */
  readonly name: string;

  /**
   * Email address
   */
  readonly emailAddress: string;

  /**
   * Use common alert schema
   */
  readonly useCommonAlertSchema?: boolean;
}

/**
 * SMS receiver configuration
 */
export interface SmsReceiver {
  /**
   * Receiver name
   */
  readonly name: string;

  /**
   * Country code (e.g., '1' for US)
   */
  readonly countryCode: string;

  /**
   * Phone number
   */
  readonly phoneNumber: string;
}

/**
 * Webhook receiver configuration
 */
export interface WebhookReceiver {
  /**
   * Receiver name
   */
  readonly name: string;

  /**
   * Webhook URL
   */
  readonly serviceUri: string;

  /**
   * Use common alert schema
   */
  readonly useCommonAlertSchema?: boolean;

  /**
   * Use Azure AD authentication
   */
  readonly useAadAuth?: boolean;

  /**
   * Azure AD tenant ID (if using AAD auth)
   */
  readonly tenantId?: string;
}

/**
 * Azure Function receiver configuration
 */
export interface AzureFunctionReceiver {
  /**
   * Receiver name
   */
  readonly name: string;

  /**
   * Function App resource ID
   */
  readonly functionAppResourceId: string;

  /**
   * Function name
   */
  readonly functionName: string;

  /**
   * HTTP trigger URL
   */
  readonly httpTriggerUrl: string;

  /**
   * Use common alert schema
   */
  readonly useCommonAlertSchema?: boolean;
}

/**
 * Logic App receiver configuration
 */
export interface LogicAppReceiver {
  /**
   * Receiver name
   */
  readonly name: string;

  /**
   * Logic App resource ID
   */
  readonly resourceId: string;

  /**
   * Callback URL
   */
  readonly callbackUrl: string;

  /**
   * Use common alert schema
   */
  readonly useCommonAlertSchema?: boolean;
}

/**
 * Monitoring attachment validation error
 */
export class MonitoringAttachmentError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'MonitoringAttachmentError';
  }
}

/**
 * Validate Application Insights configuration.
 *
 * @param config - App Insights configuration
 * @returns Validation errors (empty if valid)
 *
 * @example
 * ```typescript
 * const config: AppInsightsConfig = {
 *   name: 'my-app-insights',
 *   samplingPercentage: 100,
 *   retentionDays: 90
 * };
 *
 * const errors = validateAppInsightsConfig(config);
 * if (errors.length > 0) {
 *   console.error('Invalid config:', errors);
 * }
 * ```
 */
export function validateAppInsightsConfig(config: AppInsightsConfig): string[] {
  const errors: string[] = [];

  // Validate sampling percentage
  if (config.samplingPercentage < 0 || config.samplingPercentage > 100) {
    errors.push('Sampling percentage must be between 0 and 100');
  }

  // Validate retention days
  if (config.retentionDays < 30 || config.retentionDays > 730) {
    errors.push('Retention days must be between 30 and 730');
  }

  // Validate name
  if (config.name) {
    if (config.name.length < 1 || config.name.length > 255) {
      errors.push('Application Insights name must be between 1 and 255 characters');
    }
  }

  return errors;
}

/**
 * Validate Log Analytics workspace configuration.
 *
 * @param config - Log Analytics configuration
 * @returns Validation errors (empty if valid)
 */
export function validateLogAnalyticsConfig(config: LogAnalyticsConfig): string[] {
  const errors: string[] = [];

  // Validate retention days based on SKU
  if (config.sku === 'Free') {
    if (config.retentionDays !== 7) {
      errors.push('Free SKU only supports 7 days retention');
    }
  } else {
    if (config.retentionDays < 30 || config.retentionDays > 730) {
      errors.push('Paid SKU retention must be between 30 and 730 days');
    }
  }

  // Validate daily quota
  if (config.dailyQuotaGb !== undefined) {
    if (config.sku !== 'PerGB2018') {
      errors.push('Daily quota is only supported for PerGB2018 SKU');
    }

    if (config.dailyQuotaGb < 0) {
      errors.push('Daily quota must be non-negative');
    }
  }

  // Validate name
  if (config.name) {
    if (config.name.length < 4 || config.name.length > 63) {
      errors.push('Workspace name must be between 4 and 63 characters');
    }

    if (!/^[a-zA-Z0-9-]+$/.test(config.name)) {
      errors.push('Workspace name must contain only letters, numbers, and hyphens');
    }
  }

  return errors;
}

/**
 * Validate alerts configuration.
 *
 * @param config - Alerts configuration
 * @returns Validation errors (empty if valid)
 */
export function validateAlertsConfig(config: AlertsConfig): string[] {
  const errors: string[] = [];

  if (!config.enabled) {
    return errors; // Skip validation if alerts disabled
  }

  // Validate threshold configurations
  const thresholds = [
    { name: 'responseTime', config: config.responseTime },
    { name: 'errorRate', config: config.errorRate },
    { name: 'availability', config: config.availability },
    { name: 'cpuUsage', config: config.cpuUsage },
    { name: 'memoryUsage', config: config.memoryUsage },
    { name: 'requestRate', config: config.requestRate },
  ];

  for (const { name, config: threshold } of thresholds) {
    if (threshold) {
      const thresholdErrors = validateAlertThreshold(threshold);
      errors.push(...thresholdErrors.map((e) => `${name}: ${e}`));
    }
  }

  // Validate custom alerts
  if (config.customAlerts) {
    for (const alert of config.customAlerts) {
      if (!alert.name) {
        errors.push('Custom alert must have a name');
      }

      if (!alert.metricName) {
        errors.push(`Custom alert "${alert.name}" must specify a metric name`);
      }

      if (alert.severity < 0 || alert.severity > 4) {
        errors.push(`Custom alert "${alert.name}" severity must be between 0 and 4`);
      }

      const thresholdErrors = validateAlertThreshold(alert.threshold);
      errors.push(...thresholdErrors.map((e) => `Custom alert "${alert.name}": ${e}`));
    }
  }

  // Validate action groups
  if (config.actionGroups) {
    for (const group of config.actionGroups) {
      if (!group.name) {
        errors.push('Action group must have a name');
      }

      if (!group.shortName) {
        errors.push(`Action group "${group.name}" must have a short name`);
      }

      if (group.shortName && group.shortName.length > 12) {
        errors.push(`Action group "${group.name}" short name must be 12 characters or less`);
      }

      // Ensure at least one receiver type
      const hasReceivers =
        (group.emailReceivers && group.emailReceivers.length > 0) ||
        (group.smsReceivers && group.smsReceivers.length > 0) ||
        (group.webhookReceivers && group.webhookReceivers.length > 0) ||
        (group.azureFunctionReceivers && group.azureFunctionReceivers.length > 0) ||
        (group.logicAppReceivers && group.logicAppReceivers.length > 0);

      if (!hasReceivers) {
        errors.push(`Action group "${group.name}" must have at least one receiver`);
      }
    }
  }

  return errors;
}

/**
 * Validate alert threshold configuration.
 *
 * @param threshold - Threshold configuration
 * @returns Validation errors (empty if valid)
 */
function validateAlertThreshold(threshold: AlertThreshold): string[] {
  const errors: string[] = [];

  if (threshold.critical === undefined) {
    errors.push('Critical threshold is required');
  }

  if (threshold.warning !== undefined && threshold.critical !== undefined) {
    if (threshold.warning >= threshold.critical) {
      errors.push('Warning threshold must be less than critical threshold');
    }
  }

  if (threshold.windowMinutes !== undefined && threshold.windowMinutes < 1) {
    errors.push('Window minutes must be at least 1');
  }

  if (threshold.frequencyMinutes !== undefined && threshold.frequencyMinutes < 1) {
    errors.push('Frequency minutes must be at least 1');
  }

  if (threshold.frequencyMinutes !== undefined && threshold.windowMinutes !== undefined) {
    if (threshold.frequencyMinutes > threshold.windowMinutes) {
      errors.push('Frequency cannot be greater than window');
    }
  }

  if (threshold.threshold !== undefined && threshold.threshold < 1) {
    errors.push('Threshold count must be at least 1');
  }

  return errors;
}

/**
 * Create default Application Insights configuration for environment.
 *
 * @param env - Environment type
 * @param overrides - Configuration overrides
 * @returns App Insights configuration
 */
export function createDefaultAppInsightsConfig(
  env: 'development' | 'staging' | 'production',
  overrides?: Partial<AppInsightsConfig>
): AppInsightsConfig {
  let baseConfig: AppInsightsConfig;

  if (env === 'development') {
    baseConfig = {
      samplingPercentage: 10, // Sample 10% in dev
      retentionDays: 30,
      enableLiveMetrics: false,
      enableProfiler: false,
      enableSnapshot: false,
      applicationType: 'web',
    };
  } else if (env === 'staging') {
    baseConfig = {
      samplingPercentage: 100,
      retentionDays: 30,
      enableLiveMetrics: true,
      enableProfiler: false,
      enableSnapshot: false,
      applicationType: 'web',
    };
  } else {
    // production
    baseConfig = {
      samplingPercentage: 100,
      retentionDays: 90,
      enableLiveMetrics: true,
      enableProfiler: true,
      enableSnapshot: true,
      applicationType: 'web',
    };
  }

  return {
    ...baseConfig,
    ...overrides,
  };
}

/**
 * Create default Log Analytics configuration for environment.
 *
 * @param env - Environment type
 * @param overrides - Configuration overrides
 * @returns Log Analytics configuration
 */
export function createDefaultLogAnalyticsConfig(
  env: 'development' | 'staging' | 'production',
  overrides?: Partial<LogAnalyticsConfig>
): LogAnalyticsConfig {
  let baseConfig: LogAnalyticsConfig;

  if (env === 'development') {
    baseConfig = {
      sku: 'PerGB2018',
      retentionDays: 30,
      resourceAccessMode: 'workspace',
    };
  } else if (env === 'staging') {
    baseConfig = {
      sku: 'PerGB2018',
      retentionDays: 30,
      resourceAccessMode: 'resource',
      dataSources: ['AzureActivityLog', 'AzureDiagnostics'],
    };
  } else {
    // production
    baseConfig = {
      sku: 'PerGB2018',
      retentionDays: 90,
      resourceAccessMode: 'resource',
      dataSources: ['AzureActivityLog', 'AzureDiagnostics', 'PerformanceCounter'],
    };
  }

  return {
    ...baseConfig,
    ...overrides,
  };
}

/**
 * Create default alerts configuration for environment.
 *
 * @param env - Environment type
 * @param overrides - Configuration overrides
 * @returns Alerts configuration
 */
export function createDefaultAlertsConfig(
  env: 'development' | 'staging' | 'production',
  overrides?: Partial<AlertsConfig>
): AlertsConfig {
  let baseConfig: AlertsConfig;

  if (env === 'development') {
    baseConfig = {
      enabled: false,
    };
  } else if (env === 'staging') {
    baseConfig = {
      enabled: true,
      responseTime: {
        warning: 1500,
        critical: 3000,
        windowMinutes: 5,
        frequencyMinutes: 1,
      },
      errorRate: {
        warning: 2,
        critical: 5,
        windowMinutes: 5,
        frequencyMinutes: 1,
      },
      availability: {
        critical: 99.0,
        windowMinutes: 5,
        frequencyMinutes: 1,
      },
    };
  } else {
    // production
    baseConfig = {
      enabled: true,
      responseTime: {
        warning: 1000,
        critical: 3000,
        windowMinutes: 5,
        frequencyMinutes: 1,
      },
      errorRate: {
        warning: 1,
        critical: 5,
        windowMinutes: 5,
        frequencyMinutes: 1,
      },
      availability: {
        warning: 99.9,
        critical: 99.5,
        windowMinutes: 5,
        frequencyMinutes: 1,
      },
      cpuUsage: {
        warning: 70,
        critical: 90,
        windowMinutes: 5,
        frequencyMinutes: 1,
      },
      memoryUsage: {
        warning: 70,
        critical: 90,
        windowMinutes: 5,
        frequencyMinutes: 1,
      },
    };
  }

  return {
    ...baseConfig,
    ...overrides,
  };
}

// ============================================================================
// Monitoring Builder API (Stub Implementation)
// ============================================================================

/**
 * TODO: Full implementation of monitoring builder API
 * This is a stub to allow example code to compile.
 */

/**
 * Monitoring builder stub
 * @internal
 */
export interface MonitoringResourceBuilder {
  when(condition: boolean, callback: (builder: this) => any): this;
  _build(): any;
  // Allow any method for fluent API
  [key: string]: any;
}

class MonitoringResourceBuilderImpl implements MonitoringResourceBuilder {
  private config: any = {};

  constructor() {
    // Return a proxy that accepts any method call
    return new Proxy(this, {
      get(target, prop: string) {
        if (prop === '_build') {
          return () => target.config;
        }
        if (prop === 'when') {
          return (condition: boolean, callback: (builder: any) => any) => {
            if (condition) callback(target);
            return target;
          };
        }
        // Any other method call returns the builder for chaining
        return (...args: any[]) => {
          target.config[prop] = args;
          return target;
        };
      },
    }) as any;
  }

  when(condition: boolean, callback: (builder: any) => any): this {
    if (condition) callback(this);
    return this;
  }

  _build(): any {
    return this.config;
  }

  [key: string]: any;
}

/**
 * Logs namespace
 */
export const logs = {
  /**
   * Create a Log Analytics workspace builder (stub)
   */
  instance(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },

  /**
   * Create a workspace builder (stub)
   */
  workspace(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },

  /**
   * Create query pack builder (stub)
   */
  queryPack(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },

  /**
   * Create alerts builder (stub)
   */
  alerts(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },

  /**
   * Create diagnostics builder (stub)
   */
  diagnostics(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },

  /**
   * Create metrics builder (stub)
   */
  metrics(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },

  /**
   * Create tracing builder (stub)
   */
  tracing(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },
};

/**
 * Insights namespace
 */
export const insights = {
  /**
   * Create Application Insights instance builder (stub)
   */
  instance(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },

  /**
   * Create alerts builder (stub)
   */
  alerts(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },

  /**
   * Create diagnostics builder (stub)
   */
  diagnostics(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },

  /**
   * Create metrics builder (stub)
   */
  metrics(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },

  /**
   * Create tracing builder (stub)
   */
  tracing(): MonitoringResourceBuilder {
    return new MonitoringResourceBuilderImpl();
  },
};

/**
 * Define monitoring configuration
 *
 * @param configs - Monitoring configuration
 * @returns Monitoring configuration
 */
export function defineMonitoring(configs: Record<string, any>): any {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(configs)) {
    if (value && typeof value === 'object' && '_build' in value) {
      result[key] = value._build();
    } else {
      result[key] = value;
    }
  }
  return result;
}
