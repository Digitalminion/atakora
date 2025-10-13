import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmComponentsProps, ApplicationType, FlowType, PublicNetworkAccess, IngestionMode } from './application-insights-types';
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
 * auto-naming and defaults, use the {@link Components} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmComponents, ApplicationType } from '@atakora/cdk/insights';
 *
 * const appInsights = new ArmComponents(resourceGroup, 'AppInsights', {
 *   name: 'appi-authr-nonprod-eus-00',
 *   location: 'eastus',
 *   kind: 'web',
 *   applicationType: ApplicationType.WEB,
 *   workspaceResourceId: '/subscriptions/.../workspaces/log-...'
 * });
 * ```
 */
export declare class ArmComponents extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for Application Insights.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the Application Insights component.
     */
    readonly name: string;
    /**
     * Azure region where the component is located.
     */
    readonly location: string;
    /**
     * Kind of application.
     */
    readonly kind: string;
    /**
     * Type of application being monitored.
     */
    readonly applicationType: ApplicationType;
    /**
     * Resource ID of the Log Analytics workspace.
     */
    readonly workspaceResourceId?: string;
    /**
     * Flow type of the component.
     */
    readonly flowType?: FlowType;
    /**
     * Source of the create request.
     */
    readonly requestSource?: string;
    /**
     * Retention period in days.
     */
    readonly retentionInDays?: number;
    /**
     * Sampling percentage.
     */
    readonly samplingPercentage?: number;
    /**
     * Disable IP masking setting.
     */
    readonly disableIpMasking?: boolean;
    /**
     * Disable local auth setting.
     */
    readonly disableLocalAuth?: boolean;
    /**
     * Force customer storage for profiler setting.
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
     * Ingestion mode.
     */
    readonly ingestionMode?: IngestionMode;
    /**
     * Tags applied to the component.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Insights/components/{name}`
     */
    readonly resourceId: string;
    /**
     * Instrumentation key (read-only from Azure).
     *
     * @remarks
     * This is a placeholder. Actual value comes from Azure after deployment.
     */
    readonly instrumentationKey: string;
    /**
     * Connection string (read-only from Azure).
     *
     * @remarks
     * This is a placeholder. Actual value comes from Azure after deployment.
     */
    readonly connectionString: string;
    /**
     * Creates a new ArmComponents construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Application Insights properties
     *
     * @throws {Error} If name is invalid
     * @throws {Error} If location is empty
     * @throws {Error} If required properties are missing
     */
    constructor(scope: Construct, id: string, props: ArmComponentsProps);
    /**
     * Validates Application Insights properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmComponentsProps): void;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     * This will be implemented by Grace's synthesis pipeline.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=application-insights-arm.d.ts.map