import { Construct, constructIdToPurpose as utilConstructIdToPurpose } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { ArmComponents } from './application-insights-arm';
import type {
  ComponentsProps,
  IApplicationInsights,
  ApplicationType,
  FlowType,
  PublicNetworkAccess,
  ILogAnalyticsWorkspace,
} from './application-insights-types';

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
export class Components extends Construct implements IApplicationInsights {
  /**
   * Underlying L1 construct.
   */
  private readonly armComponents: ArmComponents;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the Application Insights component.
   */
  public readonly name: string;

  /**
   * Location of the component.
   */
  public readonly location: string;

  /**
   * Resource group name where the component is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the component.
   */
  public readonly resourceId: string;

  /**
   * Tags applied to the component (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * Application type.
   */
  public readonly applicationType: ApplicationType;

  /**
   * Instrumentation key for the component.
   */
  public readonly instrumentationKey: string;

  /**
   * Connection string for the component.
   */
  public readonly connectionString: string;

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
  constructor(scope: Construct, id: string, props: ComponentsProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided component name
    this.name = this.resolveComponentName(id, props);

    // Default location to resource group's location or use provided
    this.location = props?.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Default application type to WEB
    this.applicationType = props?.applicationType ?? ('web' as ApplicationType);

    // Merge tags with parent (get tags from parent construct if available)
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Validate workspace is provided
    if (!props?.workspace) {
      throw new Error(
        'Workspace-based Application Insights is recommended. Please provide a workspace in props.'
      );
    }

    // Create underlying L1 resource
    this.armComponents = new ArmComponents(scope, `${id}Component`, {
      name: this.name,
      location: this.location,
      kind: props?.kind ?? 'web',
      applicationType: this.applicationType,
      workspaceResourceId: props.workspace.workspaceId,
      flowType: 'RedFlag' as FlowType,
      requestSource: 'rest',
      retentionInDays: props?.retentionInDays ?? 90,
      samplingPercentage: props?.samplingPercentage,
      disableIpMasking: props?.disableIpMasking,
      disableLocalAuth: props?.disableLocalAuth,
      publicNetworkAccessForIngestion:
        props?.publicNetworkAccessForIngestion ?? ('Enabled' as PublicNetworkAccess),
      publicNetworkAccessForQuery:
        props?.publicNetworkAccessForQuery ?? ('Enabled' as PublicNetworkAccess),
      tags: this.tags,
    });

    // Get resource ID and outputs from L1
    this.resourceId = this.armComponents.resourceId;
    this.instrumentationKey = this.armComponents.instrumentationKey;
    this.connectionString = this.armComponents.connectionString;
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'Application Insights must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  /**
   * Resolves the component name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Application Insights properties
   * @returns Resolved component name
   */
  private resolveComponentName(id: string, props?: ComponentsProps): string {
    // If name provided explicitly, use it
    if (props?.name) {
      return props.name;
    }

    // Auto-generate name using parent's naming context
    // We need to get the SubscriptionStack for naming
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('appi', purpose);
    }

    // Fallback: construct a basic name from ID
    return `appi-${id.toLowerCase()}`;
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

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
  private constructIdToPurpose(id: string): string | undefined {
    return utilConstructIdToPurpose(id, 'appi', ['applicationinsights', 'appinsights']);
  }

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
  public static fromResourceId(
    scope: Construct,
    id: string,
    componentId: string
  ): IApplicationInsights {
    // Parse resource ID to extract component name
    const parts = componentId.split('/');
    const componentName = parts[parts.length - 1];

    return {
      name: componentName,
      location: 'unknown', // Cannot determine from resource ID alone
      resourceId: componentId,
      instrumentationKey: `reference('${componentId}', '2020-02-02').InstrumentationKey`,
      connectionString: `reference('${componentId}', '2020-02-02').ConnectionString`,
    };
  }
}
