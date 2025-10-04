/**
 * Type definitions for Diagnostic Setting constructs.
 *
 * @packageDocumentation
 */

/**
 * Log category configuration.
 */
export interface LogSettings {
  /**
   * Category name.
   */
  readonly category?: string;

  /**
   * Category group name (alternative to category).
   */
  readonly categoryGroup?: string;

  /**
   * Whether the category is enabled.
   */
  readonly enabled: boolean;

  /**
   * Retention policy.
   */
  readonly retentionPolicy?: {
    readonly enabled: boolean;
    readonly days: number;
  };
}

/**
 * Metric category configuration.
 */
export interface MetricSettings {
  /**
   * Category name (usually 'AllMetrics').
   */
  readonly category: string;

  /**
   * Whether the category is enabled.
   */
  readonly enabled: boolean;

  /**
   * Retention policy.
   */
  readonly retentionPolicy?: {
    readonly enabled: boolean;
    readonly days: number;
  };

  /**
   * Time grain (ISO 8601 duration).
   */
  readonly timeGrain?: string;
}

/**
 * Properties for ArmDiagnosticSetting (L1 construct).
 */
export interface ArmDiagnosticSettingProps {
  /**
   * Name of the diagnostic setting.
   */
  readonly name: string;

  /**
   * Resource ID of the target resource to monitor.
   */
  readonly targetResourceId: string;

  /**
   * Log Analytics workspace resource ID.
   */
  readonly workspaceId?: string;

  /**
   * Storage account resource ID.
   */
  readonly storageAccountId?: string;

  /**
   * Event Hub authorization rule ID.
   */
  readonly eventHubAuthorizationRuleId?: string;

  /**
   * Event Hub name.
   */
  readonly eventHubName?: string;

  /**
   * Log categories to enable.
   */
  readonly logs?: readonly LogSettings[];

  /**
   * Metric categories to enable.
   */
  readonly metrics?: readonly MetricSettings[];

  /**
   * Marketplace partner resource ID.
   */
  readonly marketplacePartnerId?: string;

  /**
   * Whether to use dedicated log analytics cluster.
   */
  readonly logAnalyticsDestinationType?: string;
}

/**
 * Properties for DiagnosticSetting (L2 construct).
 */
export interface DiagnosticSettingProps {
  /**
   * Name of the diagnostic setting.
   */
  readonly name?: string;

  /**
   * Resource ID of the target resource to monitor.
   */
  readonly targetResourceId: string;

  /**
   * Log Analytics workspace to send logs/metrics to.
   */
  readonly workspace?: {
    readonly workspaceId: string;
  };

  /**
   * Storage account to archive logs/metrics to.
   */
  readonly storageAccount?: {
    readonly storageAccountId: string;
  };

  /**
   * Event Hub to stream logs/metrics to.
   */
  readonly eventHub?: {
    readonly authorizationRuleId: string;
    readonly name?: string;
  };

  /**
   * Log categories to enable (simplified).
   * Use 'all' to enable all categories, or specify individual categories.
   */
  readonly logCategories?: readonly string[] | 'all';

  /**
   * Whether to enable all metrics.
   */
  readonly enableAllMetrics?: boolean;

  /**
   * Advanced log settings (overrides logCategories).
   */
  readonly logs?: readonly LogSettings[];

  /**
   * Advanced metric settings.
   */
  readonly metrics?: readonly MetricSettings[];

  /**
   * Retention in days for logs/metrics.
   */
  readonly retentionDays?: number;
}

/**
 * Interface for Diagnostic Setting reference.
 */
export interface IDiagnosticSetting {
  /**
   * Name of the diagnostic setting.
   */
  readonly name: string;

  /**
   * Resource ID.
   */
  readonly resourceId: string;
}
