import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmLogAnalyticsWorkspaceProps } from './types';

/**
 * L1 construct for Azure Log Analytics Workspace.
 *
 * @remarks
 * Direct mapping to Microsoft.OperationalInsights/workspaces ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.OperationalInsights/workspaces`
 * **API Version**: `2023-09-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link LogAnalyticsWorkspace} L2 construct instead.
 *
 * @example
 * Basic usage:
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
 */
export class ArmLogAnalyticsWorkspace extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.OperationalInsights/workspaces';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-09-01';

  /**
   * Deployment scope for workspaces.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the workspace.
   */
  public readonly workspaceName: string;

  /**
   * Resource name (same as workspaceName).
   */
  public readonly name: string;

  /**
   * Azure region where the workspace is located.
   */
  public readonly location: string;

  /**
   * SKU configuration.
   */
  public readonly sku: {
    readonly name: string;
    readonly capacityReservationLevel?: number;
  };

  /**
   * Retention in days.
   */
  public readonly retentionInDays?: number;

  /**
   * Workspace capping configuration.
   */
  public readonly workspaceCapping?: {
    readonly dailyQuotaGb?: number;
  };

  /**
   * Public network access for ingestion.
   */
  public readonly publicNetworkAccessForIngestion?: string;

  /**
   * Public network access for query.
   */
  public readonly publicNetworkAccessForQuery?: string;

  /**
   * Disable local auth setting.
   */
  public readonly disableLocalAuth?: boolean;

  /**
   * Tags applied to the workspace.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/{workspaceName}`
   */
  public readonly resourceId: string;

  /**
   * Workspace resource ID (alias for resourceId).
   */
  public readonly workspaceId: string;

  /**
   * Creates a new ArmLogAnalyticsWorkspace construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Workspace properties
   *
   * @throws {Error} If workspaceName is invalid
   * @throws {Error} If location is empty
   * @throws {Error} If SKU is not provided
   */
  constructor(
    scope: Construct,
    id: string,
    props: ArmLogAnalyticsWorkspaceProps
  ) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.workspaceName = props.workspaceName;
    this.name = props.workspaceName;
    this.location = props.location;
    this.sku = {
      name: props.sku.name,
      capacityReservationLevel: props.sku.capacityReservationLevel,
    };
    this.retentionInDays = props.retentionInDays;
    this.workspaceCapping = props.workspaceCapping;
    this.publicNetworkAccessForIngestion = props.publicNetworkAccessForIngestion;
    this.publicNetworkAccessForQuery = props.publicNetworkAccessForQuery;
    this.disableLocalAuth = props.disableLocalAuth;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/${this.workspaceName}`;
    this.workspaceId = this.resourceId;
  }

  /**
   * Validates workspace properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmLogAnalyticsWorkspaceProps): void {
    // Validate workspace name
    if (!props.workspaceName || props.workspaceName.trim() === '') {
      throw new Error('Workspace name cannot be empty');
    }

    if (props.workspaceName.length < 4 || props.workspaceName.length > 63) {
      throw new Error(
        `Workspace name must be 4-63 characters (got ${props.workspaceName.length})`
      );
    }

    // Validate name pattern: ^[A-Za-z0-9][A-Za-z0-9-]+[A-Za-z0-9]$
    const namePattern = /^[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9]$|^[A-Za-z0-9]{4}$/;
    if (!namePattern.test(props.workspaceName)) {
      throw new Error(
        `Workspace name must start and end with alphanumeric characters, ` +
        `and can contain hyphens in between (got: ${props.workspaceName})`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate SKU
    if (!props.sku || !props.sku.name) {
      throw new Error('SKU must be provided');
    }

    // Validate retention days if provided
    if (props.retentionInDays !== undefined) {
      if (props.retentionInDays < 7 || props.retentionInDays > 730) {
        throw new Error(
          `Retention in days must be between 7 and 730 (got ${props.retentionInDays})`
        );
      }
    }

    // Validate daily quota if provided
    if (props.workspaceCapping?.dailyQuotaGb !== undefined) {
      if (props.workspaceCapping.dailyQuotaGb < -1) {
        throw new Error(
          `Daily quota GB must be -1 (unlimited) or a positive number (got ${props.workspaceCapping.dailyQuotaGb})`
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
      sku: {
        name: this.sku.name,
        ...(this.sku.capacityReservationLevel && {
          capacityReservationLevel: this.sku.capacityReservationLevel,
        }),
      },
    };

    // Optional properties
    if (this.retentionInDays !== undefined) {
      properties.retentionInDays = this.retentionInDays;
    }

    if (this.workspaceCapping?.dailyQuotaGb !== undefined) {
      properties.workspaceCapping = {
        dailyQuotaGb: this.workspaceCapping.dailyQuotaGb,
      };
    }

    if (this.publicNetworkAccessForIngestion) {
      properties.publicNetworkAccessForIngestion = this.publicNetworkAccessForIngestion;
    }

    if (this.publicNetworkAccessForQuery) {
      properties.publicNetworkAccessForQuery = this.publicNetworkAccessForQuery;
    }

    const features: any = {};
    if (this.disableLocalAuth !== undefined) {
      features.disableLocalAuth = this.disableLocalAuth;
    }

    if (Object.keys(features).length > 0) {
      properties.features = features;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.workspaceName,
      location: this.location,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      properties,
    };
  }
}
