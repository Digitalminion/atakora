import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmApplicationInsightsProps, ApplicationType, FlowType, PublicNetworkAccess, IngestionMode } from './types';

/**
 * L1 construct for Azure Application Insights.
 *
 * @remarks
 * Direct mapping to Microsoft.Insights/components ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Insights/components`
 * **API Version**: `2020-02-02`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link ApplicationInsights} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmApplicationInsights, ApplicationType } from '@atakora/lib';
 *
 * const appInsights = new ArmApplicationInsights(resourceGroup, 'AppInsights', {
 *   name: 'appi-colorai-nonprod-eus-01',
 *   location: 'eastus',
 *   kind: 'web',
 *   applicationType: ApplicationType.WEB,
 *   workspaceResourceId: '/subscriptions/.../workspaces/log-...'
 * });
 * ```
 */
export class ArmApplicationInsights extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Insights/components';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2020-02-02';

  /**
   * Deployment scope for Application Insights.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the Application Insights component.
   */
  public readonly name: string;

  /**
   * Azure region where the component is located.
   */
  public readonly location: string;

  /**
   * Kind of application.
   */
  public readonly kind: string;

  /**
   * Type of application being monitored.
   */
  public readonly applicationType: ApplicationType;

  /**
   * Resource ID of the Log Analytics workspace.
   */
  public readonly workspaceResourceId?: string;

  /**
   * Flow type of the component.
   */
  public readonly flowType?: FlowType;

  /**
   * Source of the create request.
   */
  public readonly requestSource?: string;

  /**
   * Retention period in days.
   */
  public readonly retentionInDays?: number;

  /**
   * Sampling percentage.
   */
  public readonly samplingPercentage?: number;

  /**
   * Disable IP masking setting.
   */
  public readonly disableIpMasking?: boolean;

  /**
   * Disable local auth setting.
   */
  public readonly disableLocalAuth?: boolean;

  /**
   * Force customer storage for profiler setting.
   */
  public readonly forceCustomerStorageForProfiler?: boolean;

  /**
   * Public network access for ingestion.
   */
  public readonly publicNetworkAccessForIngestion?: PublicNetworkAccess;

  /**
   * Public network access for query.
   */
  public readonly publicNetworkAccessForQuery?: PublicNetworkAccess;

  /**
   * Ingestion mode.
   */
  public readonly ingestionMode?: IngestionMode;

  /**
   * Tags applied to the component.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Insights/components/{name}`
   */
  public readonly resourceId: string;

  /**
   * Instrumentation key (read-only from Azure).
   *
   * @remarks
   * This is a placeholder. Actual value comes from Azure after deployment.
   */
  public readonly instrumentationKey: string;

  /**
   * Connection string (read-only from Azure).
   *
   * @remarks
   * This is a placeholder. Actual value comes from Azure after deployment.
   */
  public readonly connectionString: string;

  /**
   * Creates a new ArmApplicationInsights construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Application Insights properties
   *
   * @throws {Error} If name is invalid
   * @throws {Error} If location is empty
   * @throws {Error} If required properties are missing
   */
  constructor(
    scope: Construct,
    id: string,
    props: ArmApplicationInsightsProps
  ) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.name = props.name;
    this.location = props.location;
    this.kind = props.kind;
    this.applicationType = props.applicationType;
    this.workspaceResourceId = props.workspaceResourceId;
    this.flowType = props.flowType;
    this.requestSource = props.requestSource;
    this.retentionInDays = props.retentionInDays;
    this.samplingPercentage = props.samplingPercentage;
    this.disableIpMasking = props.disableIpMasking;
    this.disableLocalAuth = props.disableLocalAuth;
    this.forceCustomerStorageForProfiler = props.forceCustomerStorageForProfiler;
    this.publicNetworkAccessForIngestion = props.publicNetworkAccessForIngestion;
    this.publicNetworkAccessForQuery = props.publicNetworkAccessForQuery;
    this.ingestionMode = props.ingestionMode;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Insights/components/${this.name}`;

    // Placeholder values for outputs (actual values come from Azure)
    this.instrumentationKey = `reference(${this.resourceId}, '${this.apiVersion}').InstrumentationKey`;
    this.connectionString = `reference(${this.resourceId}, '${this.apiVersion}').ConnectionString`;
  }

  /**
   * Validates Application Insights properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmApplicationInsightsProps): void {
    // Validate name
    if (!props.name || props.name.trim() === '') {
      throw new Error('Application Insights component name cannot be empty');
    }

    if (props.name.length > 260) {
      throw new Error(
        `Application Insights component name must not exceed 260 characters (got ${props.name.length})`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate kind
    if (!props.kind || props.kind.trim() === '') {
      throw new Error('Kind cannot be empty');
    }

    // Validate application type
    if (!props.applicationType) {
      throw new Error('Application type must be provided');
    }

    // Validate retention days if provided
    if (props.retentionInDays !== undefined) {
      const validRetentions = [30, 60, 90, 120, 180, 270, 365, 550, 730];
      if (!validRetentions.includes(props.retentionInDays)) {
        throw new Error(
          `Retention in days must be one of ${validRetentions.join(', ')} (got ${props.retentionInDays})`
        );
      }
    }

    // Validate sampling percentage if provided
    if (props.samplingPercentage !== undefined) {
      if (props.samplingPercentage < 0 || props.samplingPercentage > 100) {
        throw new Error(
          `Sampling percentage must be between 0 and 100 (got ${props.samplingPercentage})`
        );
      }
    }
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   * This will be implemented by Grace's synthesis pipeline.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): object {
    const properties: any = {
      Application_Type: this.applicationType,
    };

    // Add workspace resource ID if provided (workspace-based)
    if (this.workspaceResourceId) {
      properties.WorkspaceResourceId = this.workspaceResourceId;
    }

    // Optional properties
    if (this.flowType) {
      properties.Flow_Type = this.flowType;
    }

    if (this.requestSource) {
      properties.Request_Source = this.requestSource;
    }

    if (this.retentionInDays !== undefined) {
      properties.RetentionInDays = this.retentionInDays;
    }

    if (this.samplingPercentage !== undefined) {
      properties.SamplingPercentage = this.samplingPercentage;
    }

    if (this.disableIpMasking !== undefined) {
      properties.DisableIpMasking = this.disableIpMasking;
    }

    if (this.disableLocalAuth !== undefined) {
      properties.DisableLocalAuth = this.disableLocalAuth;
    }

    if (this.forceCustomerStorageForProfiler !== undefined) {
      properties.ForceCustomerStorageForProfiler = this.forceCustomerStorageForProfiler;
    }

    if (this.publicNetworkAccessForIngestion) {
      properties.publicNetworkAccessForIngestion = this.publicNetworkAccessForIngestion;
    }

    if (this.publicNetworkAccessForQuery) {
      properties.publicNetworkAccessForQuery = this.publicNetworkAccessForQuery;
    }

    if (this.ingestionMode) {
      properties.IngestionMode = this.ingestionMode;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      location: this.location,
      kind: this.kind,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      properties,
    };
  }
}
