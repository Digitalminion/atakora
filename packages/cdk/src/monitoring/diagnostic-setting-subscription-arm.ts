/**
 * Azure Subscription Diagnostic Settings - L1 ARM construct.
 *
 * @packageDocumentation
 */

import { Resource, ArmResource, ResourceProps, Construct } from '@atakora/lib';
import { SubscriptionLogSettings } from './diagnostic-setting-subscription-types';

/**
 * ARM-level properties for subscription diagnostic settings.
 *
 * @internal
 */
export interface SubscriptionDiagnosticSettingsArmProps extends ResourceProps {
  readonly diagnosticSettingName: string;
  readonly workspaceId?: string;
  readonly storageAccountId?: string;
  readonly eventHubAuthorizationRuleId?: string;
  readonly eventHubName?: string;
  readonly logs: SubscriptionLogSettings[];
}

/**
 * L1 ARM construct for Azure Subscription Diagnostic Settings.
 *
 * @remarks
 * Creates Microsoft.Insights/diagnosticSettings resources at subscription scope.
 *
 * **Deployment Scope**: Subscription
 *
 * **ARM Resource Type**: `Microsoft.Insights/diagnosticSettings`
 * **API Version**: `2021-05-01-preview`
 *
 * @internal
 */
export class SubscriptionDiagnosticSettingsArm extends Resource {
  public readonly resourceType = 'Microsoft.Insights/diagnosticSettings';
  public readonly apiVersion = '2021-05-01-preview'; // Latest API for subscription diagnostics
  public readonly name: string;
  public readonly resourceId: string;

  private readonly props: SubscriptionDiagnosticSettingsArmProps;

  constructor(scope: Construct, id: string, props: SubscriptionDiagnosticSettingsArmProps) {
    super(scope, id, props);
    this.validateProps(props);
    this.props = props;

    this.name = props.diagnosticSettingName;

    // Subscription diagnostic settings have a special resource ID format
    this.resourceId = `[concat(subscription().id, '/providers/Microsoft.Insights/diagnosticSettings/', '${this.name}')]`;
  }

  protected validateProps(props: SubscriptionDiagnosticSettingsArmProps): void {
    if (!props.diagnosticSettingName) {
      throw new Error('Subscription diagnostic settings require a name');
    }

    // Validate name length
    if (props.diagnosticSettingName.length > 260) {
      throw new Error(
        `Diagnostic setting name cannot exceed 260 characters (current: ${props.diagnosticSettingName.length})`
      );
    }

    // At least one destination is required
    const hasDestination =
      props.workspaceId || props.storageAccountId || props.eventHubAuthorizationRuleId;
    if (!hasDestination) {
      throw new Error(
        'Subscription diagnostic settings require at least one destination: ' +
          'workspaceId, storageAccountId, or eventHubAuthorizationRuleId'
      );
    }

    // Event Hub name is required if using Event Hub
    if (props.eventHubAuthorizationRuleId && !props.eventHubName) {
      throw new Error(
        'eventHubName is required when eventHubAuthorizationRuleId is specified'
      );
    }

    // At least one log must be enabled
    if (!props.logs || props.logs.length === 0) {
      throw new Error('Subscription diagnostic settings require at least one log category');
    }

    const enabledLogs = props.logs.filter((log) => log.enabled);
    if (enabledLogs.length === 0) {
      throw new Error(
        'Subscription diagnostic settings require at least one enabled log category'
      );
    }

    // Validate each log setting
    for (const log of props.logs) {
      this.validateLogSettings(log);
    }
  }

  /**
   * Validates a single log setting.
   *
   * @param log - Log settings to validate
   * @internal
   */
  private validateLogSettings(log: SubscriptionLogSettings): void {
    if (!log.category) {
      throw new Error('Log setting requires a category');
    }

    // Validate retention policy if specified
    if (log.retentionPolicy) {
      if (log.retentionPolicy.enabled && log.retentionPolicy.days < 0) {
        throw new Error(
          `Log retention days must be >= 0 (current: ${log.retentionPolicy.days})`
        );
      }

      if (log.retentionPolicy.days > 365) {
        throw new Error(
          `Log retention days cannot exceed 365 (current: ${log.retentionPolicy.days})`
        );
      }
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: Record<string, unknown> = {
      logs: this.props.logs.map((log) => this.buildLogObject(log)),
    };

    // Add destinations
    if (this.props.workspaceId) {
      properties.workspaceId = this.props.workspaceId;
    }

    if (this.props.storageAccountId) {
      properties.storageAccountId = this.props.storageAccountId;
    }

    if (this.props.eventHubAuthorizationRuleId) {
      properties.eventHubAuthorizationRuleId = this.props.eventHubAuthorizationRuleId;
    }

    if (this.props.eventHubName) {
      properties.eventHubName = this.props.eventHubName;
    }

    const resource: ArmResource = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      properties,
    };

    return resource;
  }

  /**
   * Builds ARM log object from SubscriptionLogSettings.
   *
   * @param log - Log settings
   * @returns ARM log object
   * @internal
   */
  private buildLogObject(log: SubscriptionLogSettings): Record<string, unknown> {
    const logObj: Record<string, unknown> = {
      category: log.category,
      enabled: log.enabled,
    };

    // Add retention policy if specified
    if (log.retentionPolicy) {
      logObj.retentionPolicy = {
        enabled: log.retentionPolicy.enabled,
        days: log.retentionPolicy.days,
      };
    }

    return logObj;
  }
}
