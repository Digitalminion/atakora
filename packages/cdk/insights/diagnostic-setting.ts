import { Construct } from '@atakora/lib';
import { ArmDiagnosticSettings } from './arm-diagnostic-setting';
import type {
  DiagnosticSettingsProps,
  IDiagnosticSetting,
  LogSettings,
  MetricSettings,
} from './diagnostic-setting-types';

/**
 * L2 construct for Azure Diagnostic Setting.
 *
 * @remarks
 * Simplified interface for configuring diagnostic settings on Azure resources.
 * Diagnostic settings enable sending logs and metrics to Log Analytics, Storage, or Event Hubs.
 *
 * @example
 * Simple usage with Log Analytics:
 * ```typescript
 * const diagnostic = new DiagnosticSetting(scope, 'Diagnostic', {
 *   targetResourceId: appService.resourceId,
 *   workspace: { workspaceId: workspace.workspaceId },
 *   logCategories: 'all',
 *   enableAllMetrics: true
 * });
 * ```
 *
 * @example
 * With specific categories:
 * ```typescript
 * const diagnostic = new DiagnosticSetting(scope, 'Diagnostic', {
 *   targetResourceId: appService.resourceId,
 *   workspace: { workspaceId: workspace.workspaceId },
 *   logCategories: ['AppServiceHTTPLogs', 'AppServiceConsoleLogs'],
 *   enableAllMetrics: true,
 *   retentionDays: 30
 * });
 * ```
 */
export class DiagnosticSettings extends Construct implements IDiagnosticSetting {
  private readonly armDiagnosticSetting: ArmDiagnosticSettings;

  public readonly name: string;
  public readonly resourceId: string;

  constructor(scope: Construct, id: string, props: DiagnosticSettingsProps) {
    super(scope, id);

    this.name = props.name ?? 'diagnostics';

    // Build log and metric settings
    const logs = this.buildLogSettings(props);
    const metrics = this.buildMetricSettings(props);

    this.armDiagnosticSetting = new ArmDiagnosticSettings(scope, `${id}-Resource`, {
      name: this.name,
      targetResourceId: props.targetResourceId,
      workspaceId: props.workspace?.workspaceId,
      storageAccountId: props.storageAccount?.storageAccountId,
      eventHubAuthorizationRuleId: props.eventHub?.authorizationRuleId,
      eventHubName: props.eventHub?.name,
      logs,
      metrics,
      logAnalyticsDestinationType: props.workspace ? 'Dedicated' : undefined,
    });

    this.resourceId = this.armDiagnosticSetting.resourceId;
  }

  private buildLogSettings(props: DiagnosticSettingsProps): LogSettings[] | undefined {
    // If advanced logs provided, use them
    if (props.logs && props.logs.length > 0) {
      return [...props.logs];
    }

    // If simple logCategories provided
    if (props.logCategories) {
      if (props.logCategories === 'all') {
        // Enable all log categories using category group
        return [
          {
            categoryGroup: 'allLogs',
            enabled: true,
            retentionPolicy: props.retentionDays
              ? {
                  enabled: true,
                  days: props.retentionDays,
                }
              : undefined,
          },
        ];
      }

      // Enable specific categories
      return props.logCategories.map((category) => ({
        category,
        enabled: true,
        retentionPolicy: props.retentionDays
          ? {
              enabled: true,
              days: props.retentionDays,
            }
          : undefined,
      }));
    }

    return undefined;
  }

  private buildMetricSettings(props: DiagnosticSettingsProps): MetricSettings[] | undefined {
    // If advanced metrics provided, use them
    if (props.metrics && props.metrics.length > 0) {
      return [...props.metrics];
    }

    // If enableAllMetrics is true
    if (props.enableAllMetrics) {
      return [
        {
          category: 'AllMetrics',
          enabled: true,
          retentionPolicy: props.retentionDays
            ? {
                enabled: true,
                days: props.retentionDays,
              }
            : undefined,
        },
      ];
    }

    return undefined;
  }

  /**
   * Creates a diagnostic setting reference from an existing resource.
   */
  public static fromDiagnosticSettingId(
    scope: Construct,
    id: string,
    diagnosticSettingId: string
  ): IDiagnosticSetting {
    const parts = diagnosticSettingId.split('/');
    const name = parts[parts.length - 1];

    return {
      name,
      resourceId: diagnosticSettingId,
    };
  }
}
