import { Construct, Resource } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmDiagnosticSettingsProps } from './diagnostic-setting-types';
/**
 * L1 construct for Azure Diagnostic Setting.
 *
 * @remarks
 * Direct mapping to Microsoft.Insights/diagnosticSettings ARM resource.
 * Diagnostic settings are extension resources that can be applied to any Azure resource.
 *
 * **ARM Resource Type**: `Microsoft.Insights/diagnosticSettings`
 * **API Version**: `2021-05-01-preview`
 * **Deployment Scope**: Extension (applies to any resource)
 *
 * @example
 * ```typescript
 * const diagnostic = new ArmDiagnosticSetting(scope, 'Diagnostic', {
 *   name: 'send-to-workspace',
 *   targetResourceId: appService.resourceId,
 *   workspaceId: workspace.workspaceId,
 *   logs: [
 *     { category: 'AppServiceHTTPLogs', enabled: true },
 *     { category: 'AppServiceConsoleLogs', enabled: true }
 *   ],
 *   metrics: [
 *     { category: 'AllMetrics', enabled: true }
 *   ]
 * });
 * ```
 */
export declare class ArmDiagnosticSettings extends Resource {
    readonly resourceType: string;
    readonly apiVersion: string;
    readonly scope: string;
    readonly name: string;
    readonly targetResourceId: string;
    readonly workspaceId?: string;
    readonly storageAccountId?: string;
    readonly eventHubAuthorizationRuleId?: string;
    readonly eventHubName?: string;
    readonly logs?: readonly any[];
    readonly metrics?: readonly any[];
    readonly marketplacePartnerId?: string;
    readonly logAnalyticsDestinationType?: string;
    readonly resourceId: string;
    constructor(scope: Construct, id: string, props: ArmDiagnosticSettingsProps);
    protected validateProps(props: ArmDiagnosticSettingsProps): void;
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=diagnostic-setting-arm.d.ts.map