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
export declare class SubscriptionDiagnosticSettingsArm extends Resource {
    readonly resourceType = "Microsoft.Insights/diagnosticSettings";
    readonly apiVersion = "2021-05-01-preview";
    readonly name: string;
    readonly resourceId: string;
    private readonly props;
    constructor(scope: Construct, id: string, props: SubscriptionDiagnosticSettingsArmProps);
    protected validateProps(props: SubscriptionDiagnosticSettingsArmProps): void;
    /**
     * Validates a single log setting.
     *
     * @param log - Log settings to validate
     * @internal
     */
    private validateLogSettings;
    toArmTemplate(): ArmResource;
    /**
     * Builds ARM log object from SubscriptionLogSettings.
     *
     * @param log - Log settings
     * @returns ARM log object
     * @internal
     */
    private buildLogObject;
}
//# sourceMappingURL=diagnostic-setting-subscription-arm.d.ts.map