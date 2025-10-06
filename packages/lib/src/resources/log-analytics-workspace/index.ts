/**
 * Azure Log Analytics Workspace constructs.
 *
 * @remarks
 * Provides both L1 (ARM direct mapping) and L2 (intent-based) constructs
 * for creating Azure Log Analytics workspaces.
 *
 * **Resource Type**: Microsoft.OperationalInsights/workspaces
 * **API Version**: 2023-09-01
 * **Deployment Scope**: ResourceGroup
 *
 * @packageDocumentation
 *
 * @example
 * L1 usage (explicit control):
 * ```typescript
 * import { ArmLogAnalyticsWorkspace, WorkspaceSku } from '@atakora/lib';
 *
 * const workspace = new ArmLogAnalyticsWorkspace(resourceGroup, 'Workspace', {
 *   workspaceName: 'log-analytics-prod-001',
 *   location: 'eastus',
 *   sku: {
 *     name: WorkspaceSku.PER_GB_2018
 *   },
 *   retentionInDays: 30
 * });
 * ```
 *
 * @example
 * L2 usage (auto-generation):
 * ```typescript
 * import { LogAnalyticsWorkspace } from '@atakora/lib';
 *
 * const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
 *   retentionInDays: 90,
 *   dailyQuotaGb: 10
 * });
 * ```
 */

// L1 construct (ARM direct mapping)
export { ArmLogAnalyticsWorkspace } from './arm-log-analytics-workspace';

// L2 construct (intent-based)
export { LogAnalyticsWorkspace } from './log-analytics-workspace';

// Type definitions
export type {
  ArmLogAnalyticsWorkspaceProps,
  LogAnalyticsWorkspaceProps,
  ILogAnalyticsWorkspace,
  WorkspaceSkuConfig,
  WorkspaceCapping,
} from './types';

// Enums
export { WorkspaceSku, PublicNetworkAccess } from './types';
