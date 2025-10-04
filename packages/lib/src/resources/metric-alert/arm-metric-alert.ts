import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmMetricAlertProps } from './types';

/**
 * L1 construct for Azure Metric Alert.
 *
 * @remarks
 * Direct mapping to Microsoft.Insights/metricAlerts ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Insights/metricAlerts`
 * **API Version**: `2018-03-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link MetricAlert} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmMetricAlert } from '@azure-arm-priv/lib';
 *
 * const alert = new ArmMetricAlert(resourceGroup, 'Alert', {
 *   name: 'alert-cpu-high',
 *   location: 'Global',
 *   description: 'Alert when CPU exceeds 80%',
 *   severity: 2,
 *   enabled: true,
 *   scopes: [appServiceId],
 *   evaluationFrequency: 'PT1M',
 *   windowSize: 'PT5M',
 *   criteria: {...},
 *   actions: [{...}]
 * });
 * ```
 */
export class ArmMetricAlert extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Insights/metricAlerts';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2018-03-01';

  /**
   * Deployment scope for metric alerts.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the metric alert.
   */
  public readonly name: string;

  /**
   * Azure region where the alert is located.
   */
  public readonly location: string;

  /**
   * Description of the alert.
   */
  public readonly description?: string;

  /**
   * Severity of the alert.
   */
  public readonly severity: number;

  /**
   * Whether the alert is enabled.
   */
  public readonly enabled: boolean;

  /**
   * Resource IDs to monitor.
   */
  public readonly scopes: readonly string[];

  /**
   * Evaluation frequency.
   */
  public readonly evaluationFrequency: string;

  /**
   * Window size for evaluation.
   */
  public readonly windowSize: string;

  /**
   * Target resource type.
   */
  public readonly targetResourceType?: string;

  /**
   * Target resource region.
   */
  public readonly targetResourceRegion?: string;

  /**
   * Alert criteria.
   */
  public readonly criteria: any;

  /**
   * Actions to take.
   */
  public readonly actions?: readonly any[];

  /**
   * Auto-mitigate setting.
   */
  public readonly autoMitigate?: boolean;

  /**
   * Tags applied to the alert.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   */
  public readonly resourceId: string;

  /**
   * Creates a new ArmMetricAlert construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Metric alert properties
   */
  constructor(
    scope: Construct,
    id: string,
    props: ArmMetricAlertProps
  ) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.name = props.name;
    this.location = props.location;
    this.description = props.description;
    this.severity = props.severity;
    this.enabled = props.enabled;
    this.scopes = props.scopes;
    this.evaluationFrequency = props.evaluationFrequency;
    this.windowSize = props.windowSize;
    this.targetResourceType = props.targetResourceType;
    this.targetResourceRegion = props.targetResourceRegion;
    this.criteria = props.criteria;
    this.actions = props.actions;
    this.autoMitigate = props.autoMitigate;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Insights/metricAlerts/${this.name}`;
  }

  /**
   * Validates metric alert properties against ARM constraints.
   */
  private validateProps(props: ArmMetricAlertProps): void {
    if (!props.name || props.name.trim() === '') {
      throw new Error('Metric alert name cannot be empty');
    }

    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    if (props.severity < 0 || props.severity > 4) {
      throw new Error(`Severity must be between 0 and 4 (got ${props.severity})`);
    }

    if (!props.scopes || props.scopes.length === 0) {
      throw new Error('At least one scope must be provided');
    }
  }

  /**
   * Generates ARM template representation of this resource.
   */
  public toArmTemplate(): object {
    const properties: any = {
      description: this.description,
      severity: this.severity,
      enabled: this.enabled,
      scopes: this.scopes,
      evaluationFrequency: this.evaluationFrequency,
      windowSize: this.windowSize,
      criteria: this.criteria,
    };

    if (this.targetResourceType) {
      properties.targetResourceType = this.targetResourceType;
    }

    if (this.targetResourceRegion) {
      properties.targetResourceRegion = this.targetResourceRegion;
    }

    if (this.actions && this.actions.length > 0) {
      properties.actions = this.actions;
    }

    if (this.autoMitigate !== undefined) {
      properties.autoMitigate = this.autoMitigate;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      location: this.location,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      properties,
    };
  }
}
