import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmDiagnosticSettingProps } from './types';

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
export class ArmDiagnosticSetting extends Resource {
  public readonly resourceType: string = 'Microsoft.Insights/diagnosticSettings';
  public readonly apiVersion: string = '2021-05-01-preview';
  public readonly scope: string = 'extension';

  public readonly name: string;
  public readonly targetResourceId: string;
  public readonly workspaceId?: string;
  public readonly storageAccountId?: string;
  public readonly eventHubAuthorizationRuleId?: string;
  public readonly eventHubName?: string;
  public readonly logs?: readonly any[];
  public readonly metrics?: readonly any[];
  public readonly marketplacePartnerId?: string;
  public readonly logAnalyticsDestinationType?: string;
  public readonly resourceId: string;

  constructor(
    scope: Construct,
    id: string,
    props: ArmDiagnosticSettingProps
  ) {
    super(scope, id);

    this.validateProps(props);

    this.name = props.name;
    this.targetResourceId = props.targetResourceId;
    this.workspaceId = props.workspaceId;
    this.storageAccountId = props.storageAccountId;
    this.eventHubAuthorizationRuleId = props.eventHubAuthorizationRuleId;
    this.eventHubName = props.eventHubName;
    this.logs = props.logs;
    this.metrics = props.metrics;
    this.marketplacePartnerId = props.marketplacePartnerId;
    this.logAnalyticsDestinationType = props.logAnalyticsDestinationType;

    // Diagnostic settings are extension resources
    this.resourceId = `${this.targetResourceId}/providers/Microsoft.Insights/diagnosticSettings/${this.name}`;
  }

  private validateProps(props: ArmDiagnosticSettingProps): void {
    if (!props.name || props.name.trim() === '') {
      throw new Error('Diagnostic setting name cannot be empty');
    }

    if (!props.targetResourceId || props.targetResourceId.trim() === '') {
      throw new Error('Target resource ID cannot be empty');
    }

    // Must have at least one destination
    const hasDestination =
      props.workspaceId ||
      props.storageAccountId ||
      props.eventHubAuthorizationRuleId ||
      props.marketplacePartnerId;

    if (!hasDestination) {
      throw new Error(
        'At least one destination must be provided (workspace, storage account, event hub, or marketplace partner)'
      );
    }

    // Must have at least one log or metric enabled
    const hasLogs = props.logs && props.logs.length > 0;
    const hasMetrics = props.metrics && props.metrics.length > 0;

    if (!hasLogs && !hasMetrics) {
      throw new Error('At least one log or metric category must be enabled');
    }
  }

  public toArmTemplate(): object {
    const properties: any = {};

    if (this.workspaceId) {
      properties.workspaceId = this.workspaceId;
    }

    if (this.storageAccountId) {
      properties.storageAccountId = this.storageAccountId;
    }

    if (this.eventHubAuthorizationRuleId) {
      properties.eventHubAuthorizationRuleId = this.eventHubAuthorizationRuleId;
    }

    if (this.eventHubName) {
      properties.eventHubName = this.eventHubName;
    }

    if (this.logs) {
      properties.logs = this.logs;
    }

    if (this.metrics) {
      properties.metrics = this.metrics;
    }

    if (this.marketplacePartnerId) {
      properties.marketplacePartnerId = this.marketplacePartnerId;
    }

    if (this.logAnalyticsDestinationType) {
      properties.logAnalyticsDestinationType = this.logAnalyticsDestinationType;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      scope: this.targetResourceId,
      name: this.name,
      properties,
    };
  }
}
