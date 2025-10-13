/**
 * Type definitions for Azure Log Analytics (Microsoft.OperationalInsights).
 *
 * @remarks
 * Complete type definitions extracted from Microsoft.OperationalInsights Azure ARM schema.
 *
 * **Resource Type**: Microsoft.OperationalInsights/workspaces
 * **API Version**: 2023-09-01
 * **Generated**: 2025-10-13
 * **Source**: https://learn.microsoft.com/en-us/azure/templates/microsoft.operationalinsights/2023-09-01/workspaces
 *
 * @packageDocumentation
 */

import type { WorkspaceSku, PublicNetworkAccess } from './enums';

/**
 * SKU configuration for Log Analytics workspace.
 *
 * @remarks
 * Defines the pricing tier and capacity reservation settings for the workspace.
 */
export interface WorkspaceSkuDef {
  /**
   * SKU name for the workspace.
   *
   * @remarks
   * - Free: Limited features and 500MB/day ingestion limit
   * - Standard: Legacy pricing tier
   * - Premium: Legacy pricing tier
   * - PerNode: Per-node pricing
   * - PerGB2018: Pay-as-you-go per GB pricing (recommended)
   * - Standalone: Legacy tier
   * - CapacityReservation: Commitment-based pricing with capacity reservation
   * - LACluster: Dedicated cluster pricing
   */
  readonly name: WorkspaceSku;

  /**
   * Capacity reservation level in GB per day.
   *
   * @remarks
   * Only applicable when sku is CapacityReservation.
   * Valid values: 100, 200, 300, 400, 500, 1000, 2000, 5000
   *
   * @example 1000
   */
  readonly capacityReservationLevel?: number;
}

/**
 * Workspace capping configuration for daily ingestion quota.
 *
 * @remarks
 * Controls the maximum amount of data that can be ingested per day.
 */
export interface WorkspaceCapping {
  /**
   * Daily ingestion quota in GB.
   *
   * @remarks
   * - Minimum: 0.023 GB (about 23 MB)
   * - -1 means unlimited (default)
   * - When quota is exceeded, data ingestion stops until the next day
   *
   * @example 10
   */
  readonly dailyQuotaGb?: number;
}

/**
 * Advanced workspace features and capabilities.
 *
 * @remarks
 * Optional features that can be enabled or disabled for the workspace.
 */
export interface WorkspaceFeatures {
  /**
   * Resource ID of the dedicated Log Analytics cluster.
   *
   * @remarks
   * Links this workspace to a dedicated cluster for enhanced security and scale.
   *
   * @example '/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.OperationalInsights/clusters/{cluster-name}'
   */
  readonly clusterResourceId?: string;

  /**
   * Disable local authentication methods.
   *
   * @remarks
   * When true, only Azure Active Directory authentication is allowed.
   * Workspace keys are disabled.
   *
   * @default false
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Enable data export from the workspace.
   *
   * @remarks
   * Allows continuous export of ingested data to storage accounts or event hubs.
   *
   * @default false
   */
  readonly enableDataExport?: boolean;

  /**
   * Enable log access using only resource permissions.
   *
   * @remarks
   * When enabled, access is controlled entirely through Azure RBAC.
   * Users must have permissions on the resource to query its logs.
   *
   * @default false
   */
  readonly enableLogAccessUsingOnlyResourcePermissions?: boolean;

  /**
   * Enable immediate purge of data after 30 days.
   *
   * @remarks
   * When enabled, data is immediately and permanently deleted after 30 days.
   * This is required for certain compliance scenarios (GDPR, etc.).
   *
   * @default false
   */
  readonly immediatePurgeDataOn30Days?: boolean;
}

/**
 * User-assigned managed identity configuration.
 */
export interface UserAssignedIdentity {
  /**
   * Client ID of the user-assigned identity.
   *
   * @remarks
   * Read-only property populated by Azure.
   */
  readonly clientId?: string;

  /**
   * Principal ID of the user-assigned identity.
   *
   * @remarks
   * Read-only property populated by Azure.
   */
  readonly principalId?: string;
}

/**
 * Managed identity configuration for the workspace.
 *
 * @remarks
 * Allows the workspace to authenticate to other Azure services.
 */
export interface WorkspaceIdentity {
  /**
   * Type of managed identity.
   *
   * @remarks
   * - None: No managed identity
   * - SystemAssigned: Azure creates and manages the identity lifecycle
   * - UserAssigned: You provide existing managed identity resources
   */
  readonly type: 'None' | 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned';

  /**
   * User-assigned managed identities.
   *
   * @remarks
   * Map of identity resource IDs to their properties.
   * Required when type includes UserAssigned.
   *
   * @example
   * {
   *   '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/{name}': {}
   * }
   */
  readonly userAssignedIdentities?: Record<string, UserAssignedIdentity>;
}

/**
 * Properties for Microsoft.OperationalInsights/workspaces resource.
 *
 * @remarks
 * Complete set of configurable properties for a Log Analytics workspace.
 */
export interface WorkspaceProperties {
  /**
   * Default data collection rule resource ID.
   *
   * @remarks
   * Specifies the default DCR for data collection from this workspace.
   *
   * @example '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/dataCollectionRules/{dcr}'
   */
  readonly defaultDataCollectionRuleResourceId?: string;

  /**
   * Advanced workspace features configuration.
   */
  readonly features?: WorkspaceFeatures;

  /**
   * Force Customer-Managed Key (CMK) encryption for queries.
   *
   * @remarks
   * When true, all queries must use CMK encryption.
   * Requires the workspace to be linked to a dedicated cluster.
   *
   * @default false
   */
  readonly forceCmkForQuery?: boolean;

  /**
   * Network access for data ingestion.
   *
   * @remarks
   * Controls whether data can be ingested from public networks.
   * - Enabled: Allow public ingestion
   * - Disabled: Require private link for ingestion
   *
   * @default 'Enabled'
   */
  readonly publicNetworkAccessForIngestion?: PublicNetworkAccess;

  /**
   * Network access for queries.
   *
   * @remarks
   * Controls whether queries can be executed from public networks.
   * - Enabled: Allow public queries
   * - Disabled: Require private link for queries
   *
   * @default 'Enabled'
   */
  readonly publicNetworkAccessForQuery?: PublicNetworkAccess;

  /**
   * Data retention period in days.
   *
   * @remarks
   * Constraints vary by SKU:
   * - Free: 7 days (fixed)
   * - All paid SKUs: 30-730 days
   * - With dedicated cluster: 30-4383 days (12 years)
   *
   * First 31 days are included in SKU pricing.
   * Additional retention incurs separate charges.
   *
   * @example 90
   */
  readonly retentionInDays?: number;

  /**
   * Workspace SKU configuration.
   *
   * @remarks
   * Defines the pricing tier and capacity settings.
   */
  readonly sku: WorkspaceSkuDef;

  /**
   * Daily data ingestion cap configuration.
   *
   * @remarks
   * Optional quota to prevent unexpected costs from excessive ingestion.
   */
  readonly workspaceCapping?: WorkspaceCapping;
}
