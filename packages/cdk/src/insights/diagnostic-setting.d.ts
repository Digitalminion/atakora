import { Construct } from '@atakora/cdk';
import type { DiagnosticSettingsProps, IDiagnosticSetting } from './diagnostic-setting-types';
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
export declare class DiagnosticSettings extends Construct implements IDiagnosticSetting {
    private readonly armDiagnosticSetting;
    readonly name: string;
    readonly resourceId: string;
    constructor(scope: Construct, id: string, props: DiagnosticSettingsProps);
    private buildLogSettings;
    private buildMetricSettings;
    /**
     * Creates a diagnostic setting reference from an existing resource.
     */
    static fromDiagnosticSettingId(scope: Construct, id: string, diagnosticSettingId: string): IDiagnosticSetting;
}
//# sourceMappingURL=diagnostic-setting.d.ts.map