/**
 * Type definitions for Log Analytics Workspace constructs.
 *
 * @packageDocumentation
 */

/**
 * SKU name for Log Analytics Workspace.
 */
export enum WorkspaceSku {
  FREE = 'Free',
  STANDARD = 'Standard',
  PREMIUM = 'Premium',
  PER_NODE = 'PerNode',
  PER_GB_2018 = 'PerGB2018',
  STANDALONE = 'Standalone',
  CAPACITY_RESERVATION = 'CapacityReservation',
  LA_CLUSTER = 'LACluster',
}

/**
 * Network access type for workspace operations.
 */
export enum PublicNetworkAccess {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
}

/**
 * SKU configuration for the workspace.
 */
export interface WorkspaceSkuConfig {
  /**
   * Name of the SKU.
   */
  readonly name: WorkspaceSku;

  /**
   * Capacity reservation level in GB.
   *
   * @remarks
   * Only applicable when sku is CapacityReservation.
   */
  readonly capacityReservationLevel?: number;
}

/**
 * Workspace capping (daily quota) configuration.
 */
export interface WorkspaceCapping {
  /**
   * The workspace daily quota for ingestion in GB.
   *
   * @remarks
   * -1 means unlimited (default).
   */
  readonly dailyQuotaGb?: number;
}

/**
 * Properties for ArmLogAnalyticsWorkspace (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.OperationalInsights/workspaces ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-09-01
 *
 * @example
 * ```typescript
 * const props: ArmLogAnalyticsWorkspaceProps = {
 *   workspaceName: 'log-analytics-prod-001',
 *   location: 'eastus',
 *   sku: {
 *     name: WorkspaceSku.PER_GB_2018
 *   },
 *   retentionInDays: 30
 * };
 * ```
 */
export interface ArmLogAnalyticsWorkspaceProps {
  /**
   * Name of the workspace.
   *
   * @remarks
   * - Must be 4-63 characters
   * - Start and end with alphanumeric
   * - Can contain hyphens
   * - Pattern: ^[A-Za-z0-9][A-Za-z0-9-]+[A-Za-z0-9]$
   */
  readonly workspaceName: string;

  /**
   * Azure region where the workspace will be created.
   *
   * @remarks
   * Examples: 'eastus', 'westus2', 'centralus'
   */
  readonly location: string;

  /**
   * SKU of the workspace.
   *
   * @remarks
   * Common choices: PerGB2018 (pay-as-you-go), CapacityReservation
   */
  readonly sku: WorkspaceSkuConfig;

  /**
   * Workspace data retention in days.
   *
   * @remarks
   * Allowed values are per pricing plan.
   * Common values: 30, 60, 90, 120, 180, 270, 365, 550, 730
   */
  readonly retentionInDays?: number;

  /**
   * Daily volume cap for ingestion.
   */
  readonly workspaceCapping?: WorkspaceCapping;

  /**
   * Network access type for accessing Log Analytics ingestion.
   */
  readonly publicNetworkAccessForIngestion?: PublicNetworkAccess;

  /**
   * Network access type for accessing Log Analytics query.
   */
  readonly publicNetworkAccessForQuery?: PublicNetworkAccess;

  /**
   * Disable Non-AAD based Auth.
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Tags to apply to the workspace.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for LogAnalyticsWorkspace (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace');
 *
 * // With custom properties
 * const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
 *   retentionInDays: 90,
 *   dailyQuotaGb: 10,
 *   sku: WorkspaceSku.PER_GB_2018
 * });
 * ```
 */
export interface LogAnalyticsWorkspaceProps {
  /**
   * Name of the workspace.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context:
   * - Format: `log-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `log-digital-minion-authr-main-nonprod-eus-00`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly workspaceName?: string;

  /**
   * Azure region where the workspace will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * SKU name for the workspace.
   *
   * @remarks
   * Defaults to PerGB2018 (pay-as-you-go pricing).
   */
  readonly sku?: WorkspaceSku;

  /**
   * Workspace data retention in days.
   *
   * @remarks
   * Defaults to 30 days.
   */
  readonly retentionInDays?: number;

  /**
   * The workspace daily quota for ingestion in GB.
   *
   * @remarks
   * Defaults to unlimited (-1).
   */
  readonly dailyQuotaGb?: number;

  /**
   * Network access type for accessing Log Analytics ingestion.
   */
  readonly publicNetworkAccessForIngestion?: PublicNetworkAccess;

  /**
   * Network access type for accessing Log Analytics query.
   */
  readonly publicNetworkAccessForQuery?: PublicNetworkAccess;

  /**
   * Disable Non-AAD based Auth.
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Tags to apply to the workspace.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for Log Analytics Workspace reference.
 *
 * @remarks
 * Allows resources to reference a workspace without depending on the construct class.
 */
export interface ILogAnalyticsWorkspace {
  /**
   * Name of the workspace.
   */
  readonly workspaceName: string;

  /**
   * Location of the workspace.
   */
  readonly location: string;

  /**
   * Resource ID of the workspace.
   */
  readonly workspaceId: string;
}
