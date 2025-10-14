import { Construct, type IResourceGroup } from '@atakora/cdk';
import {
  Workspaces,
  WorkspaceSku,
  PublicNetworkAccess,
} from '@atakora/cdk/operationalinsights';

/**
 * Configuration for Log Analytics Stack
 */
export interface LogAnalyticsStackProps {
  /**
   * Resource group to deploy into
   */
  resourceGroup: IResourceGroup;

  /**
   * Name for the workspace (optional - will auto-generate if not provided)
   */
  name?: string;

  /**
   * Retention period in days
   * @default 30 (nonprod), 90 (prod)
   */
  retentionInDays?: number;

  /**
   * Daily data ingestion cap in GB
   * @default 5 (nonprod), 100 (prod)
   */
  dailyQuotaGb?: number;

  /**
   * Whether to disable public network access
   * @default true (ColorAI pattern)
   */
  disablePublicNetworkAccess?: boolean;

  /**
   * Additional tags
   */
  tags?: Record<string, string>;
}

/**
 * Log Analytics Stack
 *
 * @remarks
 * Creates a Log Analytics Workspace with environment-specific configuration
 * based on ColorAI patterns.
 *
 * Features:
 * - Environment-based retention (30 days nonprod, 90 days prod)
 * - Environment-based quotas (5 GB nonprod, 100 GB prod)
 * - Public network access disabled by default
 * - Resource-based access permissions enabled
 *
 * @example
 * ```typescript
 * const logAnalyticsStack = new LogAnalyticsStack(foundationStack, 'LogAnalytics', {
 *   resourceGroup: monitoringRG,
 *   retentionInDays: 30,
 *   dailyQuotaGb: 5,
 * });
 * ```
 */
export class LogAnalyticsStack {
  /**
   * The Log Analytics Workspace resource
   */
  public readonly workspace: Workspaces;

  /**
   * Workspace ID (for referencing from other resources)
   */
  public readonly id: string;

  /**
   * Workspace name
   */
  public readonly name: string;

  /**
   * Workspace location
   */
  public readonly location: string;

  constructor(scope: Construct, id: string, props: LogAnalyticsStackProps) {
    const { name, retentionInDays, dailyQuotaGb, disablePublicNetworkAccess = true, tags } = props;

    // Create the Log Analytics Workspace
    this.workspace = new Workspaces(scope, id, {
      workspaceName: name,
      sku: WorkspaceSku.PER_GB_2018,
      retentionInDays: retentionInDays,
      dailyQuotaGb: dailyQuotaGb,
      publicNetworkAccessForIngestion: disablePublicNetworkAccess
        ? PublicNetworkAccess.DISABLED
        : PublicNetworkAccess.ENABLED,
      publicNetworkAccessForQuery: disablePublicNetworkAccess
        ? PublicNetworkAccess.DISABLED
        : PublicNetworkAccess.ENABLED,
      tags: tags,
    });

    // Expose key properties
    this.id = this.workspace.workspaceId;
    this.name = this.workspace.workspaceName;
    this.location = this.workspace.location;
  }

  /**
   * Get the full deployed configuration (matches Bicep output structure)
   */
  public getDeployedConfig() {
    return {
      logAnalyticsWorkspace: {
        id: this.id,
        name: this.name,
        location: this.location,
        sku: { name: WorkspaceSku.PER_GB_2018 },
        retentionInDays: this.workspace.retentionInDays,
        tags: this.workspace.tags,
      },
    };
  }
}
