import { Construct } from '@atakora/cdk';
import type { ComponentsProps, IApplicationInsights, ApplicationType } from './application-insights-types';
/**
 * Azure Application Insights component for application performance monitoring and telemetry.
 *
 * Application Insights provides comprehensive application performance monitoring (APM),
 * distributed tracing, and telemetry collection for web applications, APIs, and services.
 * This construct creates a workspace-based Application Insights component that stores
 * telemetry data in a Log Analytics workspace, enabling unified querying and long-term
 * retention of application logs and metrics.
 *
 * **Why This Exists**:
 * Application Insights is essential for observability in production applications. It provides
 * real-time monitoring of request rates, response times, failure rates, and custom telemetry.
 * The workspace-based approach (introduced in 2020) unifies application telemetry with
 * infrastructure logs, enabling powerful cross-resource queries and simplified data governance.
 *
 * **How It Fits In**:
 * Application Insights integrates with:
 * - Log Analytics Workspaces: Required for workspace-based architecture
 * - Action Groups: For alerting based on application metrics
 * - App Service / Functions: Automatic telemetry collection via instrumentation
 * - Diagnostic Settings: Enabling export to Event Hubs or Storage
 *
 * **Design Decisions**:
 * - Workspace-based mode is enforced (required parameter) for best practices
 * - Defaults to 90-day retention balancing cost and troubleshooting needs
 * - Public network access enabled by default for flexibility (can be disabled for security)
 * - Auto-naming prevents resource name conflicts across deployments
 *
 * **Performance Considerations**:
 * - Sampling can reduce ingestion costs but may miss low-frequency events
 * - Retention beyond 90 days incurs additional costs
 * - Disable IP masking only when compliance requires logging IP addresses
 *
 * **Government vs Commercial Cloud**:
 * - Both clouds support Application Insights with identical functionality
 * - Gov cloud endpoints: https://monitor.azure.us (vs https://monitor.azure.com)
 * - Data sovereignty: Gov cloud data stays within US government datacenters
 * - Compliance: Gov cloud meets FedRAMP, DoD IL5, and CJIS requirements
 *
 * **ARM Resource Type**: `Microsoft.Insights/components`
 * **API Version**: `2020-02-02`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Basic web application monitoring with automatic naming:
 * ```typescript
 * import { Components } from '@atakora/cdk/insights';
 * import { Workspaces } from '@atakora/cdk/operationalinsights';
 *
 * // Create Log Analytics workspace first
 * const workspace = new Workspaces(resourceGroup, 'Monitoring', {
 *   retentionInDays: 30
 * });
 *
 * // Create Application Insights component
 * const appInsights = new Components(resourceGroup, 'WebApp', {
 *   workspace: workspace,
 *   applicationType: ApplicationType.WEB
 * });
 *
 * // Use instrumentation key in App Service
 * webApp.addAppSetting('APPINSIGHTS_INSTRUMENTATIONKEY', appInsights.instrumentationKey);
 * ```
 *
 * @example
 * High-security configuration with disabled public access:
 * ```typescript
 * const appInsights = new Components(resourceGroup, 'ApiApp', {
 *   workspace: logAnalyticsWorkspace,
 *   applicationType: ApplicationType.WEB,
 *   retentionInDays: 90,
 *   // Disable public network access for enhanced security
 *   publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
 *   publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
 *   // Disable IP masking for audit requirements
 *   disableIpMasking: false,
 *   // Use connection string (recommended over instrumentation key)
 *   disableLocalAuth: false
 * });
 *
 * // Private endpoint configuration required when public access disabled
 * // See: https://docs.microsoft.com/azure/azure-monitor/app/private-link
 * ```
 *
 * @example
 * Cost-optimized configuration with sampling:
 * ```typescript
 * const appInsights = new Components(resourceGroup, 'DevApp', {
 *   workspace: logAnalyticsWorkspace,
 *   retentionInDays: 30,
 *   // Sample 20% of telemetry to reduce costs
 *   samplingPercentage: 20,
 *   tags: { environment: 'development', costCenter: 'eng' }
 * });
 * ```
 *
 * @see {@link https://docs.microsoft.com/azure/azure-monitor/app/app-insights-overview | Application Insights Documentation}
 * @see {@link https://docs.microsoft.com/azure/azure-monitor/app/create-workspace-resource | Workspace-based Application Insights}
 * @see {@link https://docs.microsoft.com/azure/azure-monitor/app/sampling | Telemetry Sampling}
 */
export declare class Components extends Construct implements IApplicationInsights {
    /**
     * Underlying L1 construct.
     */
    private readonly armComponents;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the Application Insights component.
     */
    readonly name: string;
    /**
     * Location of the component.
     */
    readonly location: string;
    /**
     * Resource group name where the component is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the component.
     */
    readonly resourceId: string;
    /**
     * Tags applied to the component (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * Application type.
     */
    readonly applicationType: ApplicationType;
    /**
     * Instrumentation key for the component.
     */
    readonly instrumentationKey: string;
    /**
     * Connection string for the component.
     */
    readonly connectionString: string;
    /**
     * Creates a new Components construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Optional Application Insights properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     * @throws {Error} If workspace is not provided
     *
     * @example
     * ```typescript
     * const appInsights = new Components(resourceGroup, 'WebApp', {
     *   workspace: logAnalyticsWorkspace,
     *   retentionInDays: 90,
     *   tags: { purpose: 'web-monitoring' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props: ComponentsProps);
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
     * Resolves the component name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Application Insights properties
     * @returns Resolved component name
     */
    private resolveComponentName;
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
     * @returns Purpose string for naming, or undefined if ID matches resource type
     *
     * @remarks
     * Uses the shared utility to strip stack prefixes and resource type names
     * to avoid duplication (e.g., "AppInsights" shouldn't become "appi-appinsights-...")
     */
    private constructIdToPurpose;
    /**
     * Imports an existing Application Insights component by resource ID.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for this construct
     * @param componentId - Resource ID of the existing Application Insights component
     * @returns Application Insights reference
     *
     * @example
     * ```typescript
     * const appInsights = Components.fromResourceId(
     *   this,
     *   'ExistingAppInsights',
     *   '/subscriptions/.../components/appi-existing'
     * );
     * ```
     */
    static fromResourceId(scope: Construct, id: string, componentId: string): IApplicationInsights;
}
//# sourceMappingURL=application-insights.d.ts.map