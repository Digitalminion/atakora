import { Construct } from '@atakora/cdk';
import type { WorkspacesProps, ILogAnalyticsWorkspace, WorkspaceSku } from './log-analytics-workspace-types';
/**
 * L2 construct for Azure Log Analytics Workspace.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates workspace name using parent naming context
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Sensible defaults for SKU, retention, and quotas
 *
 * **ARM Resource Type**: `Microsoft.OperationalInsights/workspaces`
 * **API Version**: `2023-09-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { LogAnalyticsWorkspace } from '@atakora/lib';
 *
 * const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
 *   retentionInDays: 90,
 *   dailyQuotaGb: 10,
 *   sku: WorkspaceSku.PER_GB_2018
 * });
 * ```
 */
export declare class Workspaces extends Construct implements ILogAnalyticsWorkspace {
    /**
     * Underlying L1 construct.
     */
    private readonly armLogAnalyticsWorkspace;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the workspace.
     */
    readonly workspaceName: string;
    /**
     * Location of the workspace.
     */
    readonly location: string;
    /**
     * Resource group name where the workspace is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the workspace.
     */
    readonly workspaceId: string;
    /**
     * Tags applied to the workspace (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * SKU of the workspace.
     */
    readonly sku: WorkspaceSku;
    /**
     * Retention in days.
     */
    readonly retentionInDays: number;
    /**
     * Creates a new LogAnalyticsWorkspace construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Optional workspace properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     *
     * @example
     * ```typescript
     * const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
     *   retentionInDays: 90,
     *   tags: { purpose: 'monitoring' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props?: WorkspacesProps);
    /**
     * Gets the parent ResourceGroup from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The resource group interface
     * @throws {Error} If parent is not or doesn't contain a ResourceGroup
     */
    private getParentResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroup properties
     */
    private isResourceGroup;
    /**
     * Gets tags from parent construct hierarchy.
     *
     * @param scope - Parent construct
     * @returns Tags object (empty if no tags found)
     */
    private getParentTags;
    /**
     * Resolves the workspace name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Workspace properties
     * @returns Resolved workspace name
     */
    private resolveWorkspaceName;
    /**
     * Gets the SubscriptionStack from the construct tree.
     *
     * @returns SubscriptionStack or undefined if not found
     */
    private getSubscriptionStack;
    /**
     * Converts construct ID to purpose identifier for naming.
     *
     * @param id - Construct ID
     * @returns Purpose string for naming
     */
    private constructIdToPurpose;
}
//# sourceMappingURL=log-analytics-workspace.d.ts.map