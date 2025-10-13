/**
 * Azure Subscription Diagnostic Settings types and interfaces.
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';

/**
 * Log category for subscription-level diagnostic settings.
 */
export const SubscriptionLogCategory = schema.insights.SubscriptionLogCategory;
export type SubscriptionLogCategory = typeof SubscriptionLogCategory[keyof typeof SubscriptionLogCategory];

/**
 * Retention policy for diagnostic logs.
 *
 * @public
 */
export interface RetentionPolicy {
  /**
   * Whether retention policy is enabled.
   */
  readonly enabled: boolean;

  /**
   * Number of days to retain logs.
   *
   * @remarks
   * 0 = infinite retention
   * 1-365 = specific retention period
   */
  readonly days: number;
}

/**
 * Log settings for a specific category.
 *
 * @public
 */
export interface SubscriptionLogSettings {
  /**
   * Log category.
   */
  readonly category: SubscriptionLogCategory | string;

  /**
   * Whether this category is enabled.
   */
  readonly enabled: boolean;

  /**
   * Retention policy for this category.
   *
   * @remarks
   * Only applicable when sending to Storage Account.
   * Log Analytics and Event Hub handle retention separately.
   */
  readonly retentionPolicy?: RetentionPolicy;
}

/**
 * Properties for Subscription Diagnostic Settings construct.
 *
 * @public
 *
 * @example
 * Send to Log Analytics for analysis:
 * ```typescript
 * {
 *   name: 'send-to-log-analytics',
 *   workspaceId: logAnalyticsWorkspace.resourceId,
 *   logs: [
 *     { category: SubscriptionLogCategory.ADMINISTRATIVE, enabled: true },
 *     { category: SubscriptionLogCategory.SECURITY, enabled: true },
 *     { category: SubscriptionLogCategory.POLICY, enabled: true }
 *   ]
 * }
 * ```
 *
 * @example
 * Archive to Storage Account with retention:
 * ```typescript
 * {
 *   name: 'archive-to-storage',
 *   storageAccountId: storageAccount.resourceId,
 *   logs: [
 *     {
 *       category: SubscriptionLogCategory.ADMINISTRATIVE,
 *       enabled: true,
 *       retentionPolicy: { enabled: true, days: 365 }
 *     },
 *     {
 *       category: SubscriptionLogCategory.SECURITY,
 *       enabled: true,
 *       retentionPolicy: { enabled: true, days: 730 } // 2 years
 *     }
 *   ]
 * }
 * ```
 *
 * @example
 * Stream to Event Hub for SIEM:
 * ```typescript
 * {
 *   name: 'stream-to-siem',
 *   eventHubAuthorizationRuleId: eventHub.sendRuleId,
 *   eventHubName: 'security-logs',
 *   logs: [
 *     { category: SubscriptionLogCategory.SECURITY, enabled: true },
 *     { category: SubscriptionLogCategory.POLICY, enabled: true }
 *   ]
 * }
 * ```
 *
 * @example
 * Multi-destination (Log Analytics + Storage):
 * ```typescript
 * // Diagnostic settings can only have ONE destination per setting
 * // Create multiple settings for multiple destinations:
 *
 * // Setting 1: Send to Log Analytics
 * new SubscriptionDiagnosticSettings(stack, 'ToLogAnalytics', {
 *   name: 'send-to-workspace',
 *   workspaceId: workspace.resourceId,
 *   logs: [
 *     { category: SubscriptionLogCategory.ADMINISTRATIVE, enabled: true }
 *   ]
 * });
 *
 * // Setting 2: Archive to Storage
 * new SubscriptionDiagnosticSettings(stack, 'ToStorage', {
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
 */
export interface SubscriptionDiagnosticSettingsProps {
  /**
   * Name of the diagnostic setting.
   *
   * @remarks
   * Must be unique within the subscription.
   */
  readonly name: string;

  /**
   * Log Analytics workspace resource ID.
   *
   * @remarks
   * Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/{workspaceName}
   *
   * At least one destination (workspaceId, storageAccountId, or eventHubAuthorizationRuleId) is required.
   */
  readonly workspaceId?: string;

  /**
   * Storage account resource ID for archival.
   *
   * @remarks
   * Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/{storageAccountName}
   *
   * At least one destination (workspaceId, storageAccountId, or eventHubAuthorizationRuleId) is required.
   */
  readonly storageAccountId?: string;

  /**
   * Event Hub authorization rule ID for streaming.
   *
   * @remarks
   * Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.EventHub/namespaces/{namespaceName}/authorizationRules/{authorizationRuleName}
   *
   * At least one destination (workspaceId, storageAccountId, or eventHubAuthorizationRuleId) is required.
   */
  readonly eventHubAuthorizationRuleId?: string;

  /**
   * Event Hub name.
   *
   * @remarks
   * Required if eventHubAuthorizationRuleId is specified.
   * If not specified, Azure uses the default event hub.
   */
  readonly eventHubName?: string;

  /**
   * Log categories to enable.
   *
   * @remarks
   * At least one log category must be enabled.
   */
  readonly logs: SubscriptionLogSettings[];
}
