import { Construct } from '@atakora/lib';
import { constructIdToPurpose as utilConstructIdToPurpose } from '@atakora/lib';
import type { SubscriptionStack } from '@atakora/lib';
import { ArmResourceGroups } from './resource-group-arm';
import type { ResourceGroupsProps, IResourceGroup } from './resource-group-types';

/**
 * L2 construct for Azure Resource Group.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates resource group name using stack naming context
 * - Defaults location to parent stack's geography
 * - Merges tags with parent stack tags
 * - Validates against Azure constraints
 *
 * **ARM Resource Type**: `Microsoft.Resources/resourceGroups`
 * **API Version**: `2025-04-01`
 * **Deployment Scope**: Subscription
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { ResourceGroup } from '@atakora/lib';
 *
 * // Creates resource group with auto-generated name:
 * // "rg-{org}-{project}-datarg-{env}-{geo}-{instance}"
 * const rg = new ResourceGroup(subscriptionStack, 'DataRG');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const rg = new ResourceGroup(subscriptionStack, 'DataRG', {
 *   resourceGroupName: 'my-custom-rg-name',
 *   location: 'westus2',
 *   tags: {
 *     costCenter: '1234',
 *     owner: 'platform-team'
 *   }
 * });
 * ```
 *
 * @example
 * Used as parent for other resources:
 * ```typescript
 * const rg = new ResourceGroup(stack, 'NetworkRG');
 *
 * // Other resources can be created within this resource group
 * const vnet = new VirtualNetwork(rg, 'MainVNet', {
 *   addressSpace: '10.0.0.0/16'
 * });
 * ```
 */
export class ResourceGroups extends Construct implements IResourceGroup {
  /**
   * Underlying L1 construct.
   */
  private readonly armResourceGroup: ArmResourceGroups;

  /**
   * Parent subscription stack.
   */
  private readonly subscriptionStack: SubscriptionStack;

  /**
   * Name of the resource group.
   */
  public readonly resourceGroupName: string;

  /**
   * Location of the resource group.
   */
  public readonly location: string;

  /**
   * Tags applied to the resource group (merged with stack tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * Creates a new ResourceGroup construct.
   *
   * @param scope - Parent construct (must be a SubscriptionStack)
   * @param id - Unique identifier for this construct
   * @param props - Optional resource group properties
   *
   * @throws {Error} If scope is not a SubscriptionStack
   *
   * @example
   * ```typescript
   * const rg = new ResourceGroup(subscriptionStack, 'DataRG', {
   *   tags: { purpose: 'data-storage' }
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props?: ResourceGroupsProps) {
    super(scope, id);

    // Validate parent is a SubscriptionStack
    this.subscriptionStack = this.getParentSubscriptionStack(scope);

    // Auto-generate or use provided resource group name
    this.resourceGroupName = this.resolveResourceGroupName(id, props);

    // Default location to stack's geography or use provided
    this.location = props?.location ?? this.subscriptionStack.location;

    // Merge tags with parent stack
    this.tags = {
      ...this.subscriptionStack.tags,
      ...props?.tags,
    };

    // Create underlying L1 resource
    // Pass the parent scope (which should be the SubscriptionStack)
    // This allows the synthesizer to find the stack via tree traversal
    this.armResourceGroup = new ArmResourceGroups(scope, `${id}-Resource`, {
      resourceGroupName: this.resourceGroupName,
      location: this.location,
      tags: this.tags,
    });
  }

  /**
   * Gets the parent SubscriptionStack from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The subscription stack
   * @throws {Error} If parent is not a SubscriptionStack
   */
  private getParentSubscriptionStack(scope: Construct): SubscriptionStack {
    // Walk up the construct tree to find SubscriptionStack
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current is a SubscriptionStack
      // We use duck typing to check for the required properties
      if (this.isSubscriptionStack(current)) {
        return current as SubscriptionStack;
      }
      current = current.node.scope;
    }

    throw new Error(
      'ResourceGroup must be created within a SubscriptionStack. ' +
        'Ensure the parent scope is a SubscriptionStack or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct is a SubscriptionStack using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has SubscriptionStack properties
   */
  private isSubscriptionStack(construct: any): construct is SubscriptionStack {
    return (
      construct &&
      typeof construct.generateResourceName === 'function' &&
      typeof construct.location === 'string' &&
      typeof construct.tags === 'object'
    );
  }

  /**
   * Resolves the resource group name from props or auto-generates it.
   *
   * @param id - Construct ID
   * @param props - Resource group properties
   * @returns Resolved resource group name
   */
  private resolveResourceGroupName(id: string, props?: ResourceGroupsProps): string {
    // If name provided explicitly, use it
    if (props?.resourceGroupName) {
      return props.resourceGroupName;
    }

    // Auto-generate name using stack's naming context
    // Convert construct ID to purpose (e.g., 'DataRG' -> 'datarg')
    const purpose = this.constructIdToPurpose(id);

    return this.subscriptionStack.generateResourceName('rg', purpose);
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   *
   * @remarks
   * Converts PascalCase/camelCase IDs to lowercase.
   * Examples:
   * - 'DataRG' -> 'datarg'
   * - 'NetworkRG' -> 'networkrg'
   * - 'data-rg' -> 'data-rg'
   */
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }
}
