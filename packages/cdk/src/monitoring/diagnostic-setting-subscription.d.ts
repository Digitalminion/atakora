/**
 * Azure Subscription Diagnostic Settings - L2 construct.
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/lib';
import { SubscriptionDiagnosticSettingsProps } from './diagnostic-setting-subscription-types';
/**
 * L2 construct for Azure Subscription Diagnostic Settings.
 *
 * @remarks
 * Sends subscription activity logs to Log Analytics, Storage Account, or Event Hub
 * for long-term retention, analysis, and compliance.
 *
 * **Activity Logs vs Diagnostic Settings**:
 * - **Activity Logs**: Management operations (create/delete/update resources)
 * - **Diagnostic Settings**: Where to send those logs (destination configuration)
 *
 * **Activity Log Alerts vs Diagnostic Settings**:
 * - **Activity Log Alerts**: Real-time notifications on specific events
 * - **Diagnostic Settings**: Store ALL activity logs for later analysis
 *
 * **Use Cases**:
 * - **Compliance**: Retain logs for 90+ days for auditing
 * - **SIEM Integration**: Stream logs to external security tools
 * - **Cost Analysis**: Export for custom cost reporting
 * - **Security Investigation**: Historical logs for incident response
 * - **Operational Analytics**: Analyze deployment patterns
 *
 * **Log Categories**:
 * - **Administrative**: Resource CRUD operations
 * - **Security**: Security alerts and events
 * - **ServiceHealth**: Azure service incidents
 * - **Alert**: Metric/log alerts fired/resolved
 * - **Recommendation**: Azure Advisor recommendations
 * - **Policy**: Policy evaluation results
 * - **Autoscale**: Scale operations
 * - **ResourceHealth**: Resource availability changes
 *
 * **Destinations**:
 * - **Log Analytics**: Query with KQL, create dashboards, alerting
 * - **Storage Account**: Low-cost archival, compliance retention
 * - **Event Hub**: Stream to SIEM (Splunk, QRadar, etc.)
 *
 * @public
 *
 * @example
 * Send all logs to Log Analytics for analysis:
 * ```typescript
 * import { SubscriptionDiagnosticSettings, SubscriptionLogCategory } from '@atakora/cdk/monitoring';
 *
 * new SubscriptionDiagnosticSettings(subscriptionStack, 'ActivityLogs', {
 *   name: 'send-to-log-analytics',
 *   workspaceId: logAnalyticsWorkspace.resourceId,
 *   logs: [
 *     { category: SubscriptionLogCategory.ADMINISTRATIVE, enabled: true },
 *     { category: SubscriptionLogCategory.SECURITY, enabled: true },
 *     { category: SubscriptionLogCategory.SERVICE_HEALTH, enabled: true },
 *     { category: SubscriptionLogCategory.ALERT, enabled: true },
 *     { category: SubscriptionLogCategory.POLICY, enabled: true }
 *   ]
 * });
 * ```
 *
 * @example
 * Archive to storage for compliance (1 year retention):
 * ```typescript
 * new SubscriptionDiagnosticSettings(subscriptionStack, 'ActivityLogsArchive', {
 *   name: 'archive-to-storage',
 *   storageAccountId: archiveStorage.resourceId,
 *   logs: [
 *     {
 *       category: SubscriptionLogCategory.ADMINISTRATIVE,
 *       enabled: true,
 *       retentionPolicy: { enabled: true, days: 365 }
 *     },
 *     {
 *       category: SubscriptionLogCategory.SECURITY,
 *       enabled: true,
 *       retentionPolicy: { enabled: true, days: 365 }
 *     }
 *   ]
 * });
 * ```
 *
 * @example
 * Stream security logs to SIEM via Event Hub:
 * ```typescript
 * new SubscriptionDiagnosticSettings(subscriptionStack, 'ToSIEM', {
 *   name: 'stream-to-siem',
 *   eventHubAuthorizationRuleId: eventHub.sendRuleId,
 *   eventHubName: 'security-logs',
 *   logs: [
 *     { category: SubscriptionLogCategory.SECURITY, enabled: true },
 *     { category: SubscriptionLogCategory.POLICY, enabled: true },
 *     { category: SubscriptionLogCategory.ADMINISTRATIVE, enabled: true }
 *   ]
 * });
 * ```
 *
 * @example
 * Multiple destinations (requires multiple diagnostic settings):
 * ```typescript
 * // Log Analytics for real-time queries
 * new SubscriptionDiagnosticSettings(subscriptionStack, 'ToWorkspace', {
 *   name: 'send-to-workspace',
 *   workspaceId: workspace.resourceId,
 *   logs: [
 *     { category: SubscriptionLogCategory.ADMINISTRATIVE, enabled: true },
 *     { category: SubscriptionLogCategory.SECURITY, enabled: true }
 *   ]
 * });
 *
 * // Storage for long-term archival
 * new SubscriptionDiagnosticSettings(subscriptionStack, 'ToArchive', {
 *   name: 'archive-to-storage',
 *   storageAccountId: storage.resourceId,
 *   logs: [
 *     {
 *       category: SubscriptionLogCategory.ADMINISTRATIVE,
 *       enabled: true,
 *       retentionPolicy: { enabled: true, days: 365 }
 *     }
 *   ]
 * });
 * ```
 *
 * @example
 * Compliance configuration (7 years retention):
 * ```typescript
 * // Note: Storage Account retention is limited to 365 days
 * // For longer retention, use Log Analytics workspace retention settings
 *
 * new SubscriptionDiagnosticSettings(subscriptionStack, 'Compliance', {
 *   name: 'compliance-archive',
 *   storageAccountId: complianceStorage.resourceId,
 *   logs: [
 *     {
 *       category: SubscriptionLogCategory.ADMINISTRATIVE,
 *       enabled: true,
 *       retentionPolicy: { enabled: true, days: 365 } // Max in diagnostic settings
 *     },
 *     {
 *       category: SubscriptionLogCategory.SECURITY,
 *       enabled: true,
 *       retentionPolicy: { enabled: true, days: 365 }
 *     },
 *     {
 *       category: SubscriptionLogCategory.POLICY,
 *       enabled: true,
 *       retentionPolicy: { enabled: true, days: 365 }
 *     }
 *   ]
 * });
 *
 * // For 7+ year retention, configure storage lifecycle management
 * // to move logs to Archive tier and set object-level retention
 * ```
 */
export declare class SubscriptionDiagnosticSettings extends Construct {
    /**
     * Underlying L1 construct.
     * @internal
     */
    private readonly armDiagnosticSettings;
    /**
     * Diagnostic setting name.
     */
    readonly settingName: string;
    /**
     * Resource ID of the diagnostic setting.
     */
    readonly settingId: string;
    /**
     * Creates a new SubscriptionDiagnosticSettings.
     *
     * @param scope - Parent construct (must be SubscriptionStack)
     * @param id - Unique construct ID
     * @param props - Diagnostic settings properties
     *
     * @throws {Error} If scope is not a SubscriptionStack
     * @throws {Error} If no destination is specified
     * @throws {Error} If no log categories are enabled
     */
    constructor(scope: Construct, id: string, props: SubscriptionDiagnosticSettingsProps);
    /**
     * Validates that the parent scope is a SubscriptionStack.
     *
     * @param scope - Parent construct
     * @throws {Error} If parent is not a SubscriptionStack
     * @internal
     */
    private validateParentScope;
    /**
     * Checks if a construct is a SubscriptionStack using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has SubscriptionStack properties
     * @internal
     */
    private isSubscriptionStack;
}
//# sourceMappingURL=diagnostic-setting-subscription.d.ts.map