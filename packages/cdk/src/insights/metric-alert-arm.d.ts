import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmMetricAlertsProps } from './metric-alert-types';
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
 * import { ArmMetricAlert } from '@atakora/cdk/insights';
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
export declare class ArmMetricAlerts extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for metric alerts.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the metric alert.
     */
    readonly name: string;
    /**
     * Azure region where the alert is located.
     */
    readonly location: string;
    /**
     * Description of the alert.
     */
    readonly description?: string;
    /**
     * Severity of the alert.
     */
    readonly severity: number;
    /**
     * Whether the alert is enabled.
     */
    readonly enabled: boolean;
    /**
     * Resource IDs to monitor.
     */
    readonly scopes: readonly string[];
    /**
     * Evaluation frequency.
     */
    readonly evaluationFrequency: string;
    /**
     * Window size for evaluation.
     */
    readonly windowSize: string;
    /**
     * Target resource type.
     */
    readonly targetResourceType?: string;
    /**
     * Target resource region.
     */
    readonly targetResourceRegion?: string;
    /**
     * Alert criteria.
     */
    readonly criteria: any;
    /**
     * Actions to take.
     */
    readonly actions?: readonly any[];
    /**
     * Auto-mitigate setting.
     */
    readonly autoMitigate?: boolean;
    /**
     * Tags applied to the alert.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     */
    readonly resourceId: string;
    /**
     * Creates a new ArmMetricAlert construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Metric alert properties
     */
    constructor(scope: Construct, id: string, props: ArmMetricAlertsProps);
    /**
     * Validates metric alert properties against ARM constraints.
     */
    protected validateProps(props: ArmMetricAlertsProps): void;
    /**
     * Generates ARM template representation of this resource.
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=metric-alert-arm.d.ts.map