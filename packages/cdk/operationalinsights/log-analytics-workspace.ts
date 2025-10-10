import { Construct, constructIdToPurpose as utilConstructIdToPurpose } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { ArmWorkspaces } from './log-analytics-workspace-arm';
import type {
  WorkspacesProps,
  ILogAnalyticsWorkspace,
  WorkspaceSku,
  WorkspaceSkuConfig,
} from './log-analytics-workspace-types';

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
export class Workspaces extends Construct implements ILogAnalyticsWorkspace {
  /**
   * Underlying L1 construct.
   */
  private readonly armLogAnalyticsWorkspace: ArmWorkspaces;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the workspace.
   */
  public readonly workspaceName: string;

  /**
   * Location of the workspace.
   */
  public readonly location: string;

  /**
   * Resource group name where the workspace is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the workspace.
   */
  public readonly workspaceId: string;

  /**
   * Tags applied to the workspace (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * SKU of the workspace.
   */
  public readonly sku: WorkspaceSku;

  /**
   * Retention in days.
   */
  public readonly retentionInDays: number;

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
  constructor(scope: Construct, id: string, props?: WorkspacesProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided workspace name
    this.workspaceName = this.resolveWorkspaceName(id, props);

    // Default location to resource group's location or use provided
    this.location = props?.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Default SKU to PerGB2018
    this.sku = props?.sku ?? ('PerGB2018' as WorkspaceSku);

    // Default retention to 30 days
    this.retentionInDays = props?.retentionInDays ?? 30;

    // Merge tags with parent (get tags from parent construct if available)
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Build SKU config
    const skuConfig: WorkspaceSkuConfig = {
      name: this.sku,
    };

    // Create underlying L1 resource
    this.armLogAnalyticsWorkspace = new ArmWorkspaces(scope, `${id}-Resource`, {
      workspaceName: this.workspaceName,
      location: this.location,
      sku: skuConfig,
      retentionInDays: this.retentionInDays,
      workspaceCapping:
        props?.dailyQuotaGb !== undefined ? { dailyQuotaGb: props.dailyQuotaGb } : undefined,
      publicNetworkAccessForIngestion: props?.publicNetworkAccessForIngestion,
      publicNetworkAccessForQuery: props?.publicNetworkAccessForQuery,
      disableLocalAuth: props?.disableLocalAuth,
      tags: this.tags,
    });

    // Get resource ID from L1
    this.workspaceId = this.armLogAnalyticsWorkspace.workspaceId;
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
      'LogAnalyticsWorkspace must be created within or under a ResourceGroup. ' +
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
   * Resolves the workspace name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Workspace properties
   * @returns Resolved workspace name
   */
  private resolveWorkspaceName(id: string, props?: WorkspacesProps): string {
    // If name provided explicitly, use it
    if (props?.workspaceName) {
      return props.workspaceName;
    }

    // Auto-generate name using parent's naming context
    // We need to get the SubscriptionStack for naming
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('log', purpose);
    }

    // Fallback: construct a basic name from ID
    return `log-${id.toLowerCase()}`;
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
  private constructIdToPurpose(id: string): string | undefined {
    return utilConstructIdToPurpose(id, 'log', ['loganalytics', 'logs', 'workspace', 'law']);
  }
}
