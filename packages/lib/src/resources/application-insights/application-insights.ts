import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmApplicationInsights } from './arm-application-insights';
import type {
  ApplicationInsightsProps,
  IApplicationInsights,
  ApplicationType,
  FlowType,
  PublicNetworkAccess,
  ILogAnalyticsWorkspace,
} from './types';

/**
 * L2 construct for Azure Application Insights.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates component name using parent naming context
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Sensible defaults for application type, retention, and network access
 * - Workspace-based Application Insights (recommended)
 *
 * **ARM Resource Type**: `Microsoft.Insights/components`
 * **API Version**: `2020-02-02`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { ApplicationInsights } from '@atakora/lib';
 *
 * const appInsights = new ApplicationInsights(resourceGroup, 'WebApp', {
 *   workspace: logAnalyticsWorkspace
 * });
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const appInsights = new ApplicationInsights(resourceGroup, 'ApiApp', {
 *   workspace: logAnalyticsWorkspace,
 *   applicationType: ApplicationType.WEB,
 *   retentionInDays: 90,
 *   publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
 *   publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED
 * });
 * ```
 */
export class ApplicationInsights extends Construct implements IApplicationInsights {
  /**
   * Underlying L1 construct.
   */
  private readonly armApplicationInsights: ArmApplicationInsights;

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
   * Creates a new ApplicationInsights construct.
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
   * const appInsights = new ApplicationInsights(resourceGroup, 'WebApp', {
   *   workspace: logAnalyticsWorkspace,
   *   retentionInDays: 90,
   *   tags: { purpose: 'web-monitoring' }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props: ApplicationInsightsProps) {
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
    this.armApplicationInsights = new ArmApplicationInsights(scope, `${id}-Resource`, {
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
    this.resourceId = this.armApplicationInsights.resourceId;
    this.instrumentationKey = this.armApplicationInsights.instrumentationKey;
    this.connectionString = this.armApplicationInsights.connectionString;
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
      'ApplicationInsights must be created within or under a ResourceGroup. ' +
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
  private resolveComponentName(id: string, props?: ApplicationInsightsProps): string {
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
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
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
   * const appInsights = ApplicationInsights.fromResourceId(
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
