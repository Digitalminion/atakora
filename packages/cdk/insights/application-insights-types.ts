/**
 * Type definitions for Application Insights constructs.
 *
 * @packageDocumentation
 */

/**
 * Application type for Application Insights.
 */
export enum ApplicationType {
  WEB = 'web',
  OTHER = 'other',
}

/**
 * Request source for Application Insights.
 */
export enum RequestSource {
  REST = 'rest',
  IBIZA_WEB_AI = 'IbizaWebAI CreateComponentExtensionBladeContext',
}

/**
 * Flow type for Application Insights.
 */
export enum FlowType {
  BLUEFIELD = 'Bluefield',
  REDFLAG = 'RedFlag',
}

/**
 * Public network access options.
 */
export enum PublicNetworkAccess {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
}

/**
 * Ingestion mode for Application Insights.
 */
export enum IngestionMode {
  APPLICATION_INSIGHTS = 'ApplicationInsights',
  APPLICATION_INSIGHTS_WITH_DIAGNOSTIC_SETTINGS = 'ApplicationInsightsWithDiagnosticSettings',
  LOG_ANALYTICS = 'LogAnalytics',
}

/**
 * Properties for ArmComponents (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Insights/components ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2020-02-02
 *
 * @example
 * ```typescript
 * const props: ArmComponentsProps = {
 *   name: 'appi-authr-nonprod-eus-00',
 *   location: 'eastus',
 *   kind: 'web',
 *   applicationType: ApplicationType.WEB,
 *   workspaceResourceId: '/subscriptions/.../workspaces/log-...'
 * };
 * ```
 */
export interface ArmComponentsProps {
  /**
   * Name of the Application Insights component.
   *
   * @remarks
   * - Must be unique within the resource group
   * - Can contain alphanumeric, hyphens, underscores, and periods
   */
  readonly name: string;

  /**
   * Azure region where the component will be created.
   *
   * @remarks
   * Examples: 'eastus', 'westus2', 'centralus'
   */
  readonly location: string;

  /**
   * Kind of application that this component refers to.
   *
   * @remarks
   * Common values: 'web', 'ios', 'other', 'store', 'java', 'phone'
   */
  readonly kind: string;

  /**
   * Type of application being monitored.
   */
  readonly applicationType: ApplicationType;

  /**
   * Resource ID of the Log Analytics workspace.
   *
   * @remarks
   * Workspace-based Application Insights is the recommended approach.
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/{workspaceName}`
   */
  readonly workspaceResourceId?: string;

  /**
   * Flow type of the component.
   */
  readonly flowType?: FlowType;

  /**
   * Source of the create request.
   */
  readonly requestSource?: RequestSource | string;

  /**
   * Retention period in days.
   *
   * @remarks
   * Valid values: 30, 60, 90, 120, 180, 270, 365, 550, 730
   */
  readonly retentionInDays?: number;

  /**
   * Percentage of data being sampled for Application Insights telemetry.
   */
  readonly samplingPercentage?: number;

  /**
   * Disable IP masking.
   */
  readonly disableIpMasking?: boolean;

  /**
   * Disable local authentication methods.
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Force customers to create their own storage account for profiler and debugger.
   */
  readonly forceCustomerStorageForProfiler?: boolean;

  /**
   * Public network access for ingestion.
   */
  readonly publicNetworkAccessForIngestion?: PublicNetworkAccess;

  /**
   * Public network access for query.
   */
  readonly publicNetworkAccessForQuery?: PublicNetworkAccess;

  /**
   * Ingestion mode for the component.
   */
  readonly ingestionMode?: IngestionMode;

  /**
   * Tags to apply to the component.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for Components (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const appInsights = new Components(resourceGroup, 'WebApp', {
 *   workspace: logAnalyticsWorkspace
 * });
 *
 * // With custom properties
 * const appInsights = new Components(resourceGroup, 'ApiApp', {
 *   workspace: logAnalyticsWorkspace,
 *   applicationType: ApplicationType.WEB,
 *   retentionInDays: 90,
 *   publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
 *   publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED
 * });
 * ```
 */
export interface ComponentsProps {
  /**
   * Name of the Application Insights component.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context:
   * - Format: `appi-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `appi-digital-minion-authr-main-nonprod-eus-00`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly name?: string;

  /**
   * Azure region where the component will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * Kind of application that this component refers to.
   *
   * @remarks
   * Defaults to 'web'.
   */
  readonly kind?: string;

  /**
   * Type of application being monitored.
   *
   * @remarks
   * Defaults to ApplicationType.WEB.
   */
  readonly applicationType?: ApplicationType;

  /**
   * Log Analytics Workspace resource for workspace-based Application Insights.
   *
   * @remarks
   * This is the recommended approach. If not provided, will attempt to find
   * a workspace in the parent resource group.
   */
  readonly workspace?: ILogAnalyticsWorkspace;

  /**
   * Retention period in days.
   *
   * @remarks
   * Defaults to 90 days.
   */
  readonly retentionInDays?: number;

  /**
   * Percentage of data being sampled for Application Insights telemetry.
   */
  readonly samplingPercentage?: number;

  /**
   * Disable IP masking.
   */
  readonly disableIpMasking?: boolean;

  /**
   * Disable local authentication methods.
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Public network access for ingestion.
   *
   * @remarks
   * Defaults to Enabled.
   */
  readonly publicNetworkAccessForIngestion?: PublicNetworkAccess;

  /**
   * Public network access for query.
   *
   * @remarks
   * Defaults to Enabled.
   */
  readonly publicNetworkAccessForQuery?: PublicNetworkAccess;

  /**
   * Tags to apply to the component.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Reference to a Log Analytics Workspace.
 *
 * @remarks
 * Minimal interface for workspace references.
 */
export interface ILogAnalyticsWorkspace {
  /**
   * Name of the workspace.
   */
  readonly workspaceName: string;

  /**
   * Resource ID of the workspace.
   */
  readonly workspaceId: string;
}

/**
 * Interface for Application Insights reference.
 *
 * @remarks
 * Allows resources to reference Application Insights without depending on the construct class.
 */
export interface IApplicationInsights {
  /**
   * Name of the Application Insights component.
   */
  readonly name: string;

  /**
   * Location of the component.
   */
  readonly location: string;

  /**
   * Resource ID of the component.
   */
  readonly resourceId: string;

  /**
   * Instrumentation key for the component.
   */
  readonly instrumentationKey: string;

  /**
   * Connection string for the component.
   */
  readonly connectionString: string;
}
