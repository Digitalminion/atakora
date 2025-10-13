import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmWorkspacesProps } from './log-analytics-workspace-types';
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
export declare class ArmWorkspaces extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for workspaces.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the workspace.
     */
    readonly workspaceName: string;
    /**
     * Resource name (same as workspaceName).
     */
    readonly name: string;
    /**
     * Azure region where the workspace is located.
     */
    readonly location: string;
    /**
     * SKU configuration.
     */
    readonly sku: {
        readonly name: string;
        readonly capacityReservationLevel?: number;
    };
    /**
     * Retention in days.
     */
    readonly retentionInDays?: number;
    /**
     * Workspace capping configuration.
     */
    readonly workspaceCapping?: {
        readonly dailyQuotaGb?: number;
    };
    /**
     * Public network access for ingestion.
     */
    readonly publicNetworkAccessForIngestion?: string;
    /**
     * Public network access for query.
     */
    readonly publicNetworkAccessForQuery?: string;
    /**
     * Disable local auth setting.
     */
    readonly disableLocalAuth?: boolean;
    /**
     * Tags applied to the workspace.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/{workspaceName}`
     */
    readonly resourceId: string;
    /**
     * Workspace resource ID (alias for resourceId).
     */
    readonly workspaceId: string;
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
    constructor(scope: Construct, id: string, props: ArmWorkspacesProps);
    /**
     * Validates workspace properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmWorkspacesProps): void;
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
//# sourceMappingURL=log-analytics-workspace-arm.d.ts.map